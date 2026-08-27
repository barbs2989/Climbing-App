// Can a real climber get DIRECTIONS to an area?
//
// Until now: no. The only area-level directions link in the app is inside `GettingThere`, which is
// gated on the seed-only `selArea` and so has never rendered in production (deploy.yml ships
// VITE_USE_DB=true). RouteDetail has three, but those are trailhead-level — a different question
// from "where is this crag".
//
// Drives the REAL DbAreaBrowser rather than injecting state: this link lives on the area page, and
// the area page is reached by drilling in. That drill-down is what four earlier attempts in this
// repo failed at, so every step is asserted and a failure says which step.
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 5310;
const log = (s) => console.log(s);

async function claimPort(start) {
  for (let p = start; p < start + 40; p++) {
    const free = await new Promise((res) => {
      const s = net.createServer();
      s.once("error", () => res(false));
      s.once("listening", () => s.close(() => res(true)));
      s.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  return null;
}
async function waitForServer(url, ms = 180000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  return false;
}

const port = await claimPort(PORT);
if (port === null) { console.error("no free port"); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;
log(`starting dev server on ${port}...`);
const server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
let died = false; server.on("exit", () => { died = true; });
let stopped = false;
const stop = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stop); process.on("SIGINT", () => { stop(); process.exit(130); });
process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
if (!(await waitForServer(base)) || died) { console.error("dev server never came up"); stop(); process.exit(1); }

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) { console.error("could not launch Chrome: " + String(e.message).split("\n")[0]); stop(); process.exit(1); }
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });

const settle = async (ms = 12000) => {
  let last = "", stable = 0; const end = Date.now() + ms;
  while (Date.now() < end && stable < 3) {
    await new Promise((r) => setTimeout(r, 400));
    const t = await page.evaluate(() => document.body.innerText || "");
    if (t === last) stable++; else { stable = 0; last = t; }
  }
  return last;
};

const fails = [];
const ok = (c, m) => { log(`  ${c ? "ok  " : "FAIL"} ${m}`); if (!c) fails.push(m); };

await page.goto(base, { waitUntil: "domcontentloaded", timeout: 120000 });
await settle();
// Climbs tab, then drill: country -> state -> first area with routes.
await page.getByRole("button", { name: /^Climbs(,|$)/ }).first().click({ timeout: 15000 }).catch(() => {});
await settle();

// WAIT FOR THE LAZY CHUNK, do not settle and hope. DbAreaBrowser is `lazy(() => import(...))` and
// on a cold dev server the tab shows "Loading climbs…" while vite compiles it — a fixed settle
// captures that and reports zero selects, which reads as "the browser is not there" rather than
// "it has not arrived yet". Third time this trap has cost a run in one session; assert the wait
// separately so a compile timeout can never be mistaken for a missing control.
const browserUp = await page.waitForFunction(
  () => document.querySelectorAll("select").length > 0, undefined, { timeout: 120000 },
).then(() => true).catch(() => false);
ok(browserUp, "the lazy DbAreaBrowser chunk compiled and rendered its pickers");
await settle();

// The DB browser uses <select>s for country/state. Choosing by label is what the app offers.
const selects = page.locator("select");
const nSel = await selects.count();
ok(nSel > 0, `the DB area browser is on screen (${nSel} select(s) — the seed browser has a different one)`);
// Select by VALUE, resolved from the live options. The country label is
// "United States — 205,532 climbs", not "United States", so an exact-label match silently selects
// nothing and every step after it measures the country picker.
const pick = async (idx, re) => {
  const opts = await page.evaluate((i) => {
    const s = document.querySelectorAll("select")[i];
    return s ? [...s.options].map((o) => ({ v: o.value, l: o.label })) : [];
  }, idx);
  const hit = opts.find((o) => re.test(o.l) && o.v);
  if (!hit) return null;
  await page.locator("select").nth(idx).selectOption(hit.v).catch(() => {});
  await settle();
  return hit.l;
};
const gotCountry = nSel > 0 ? await pick(0, /united states/i) : null;
ok(!!gotCountry, `chose a country from the live options (${gotCountry || "none matched"})`);
const gotState = (await page.locator("select").count()) > 1 ? await pick(1, /^Colorado$/i) : null;
ok(!!gotState, `chose a state (${gotState || "none matched"})`);

// Drill until an area page appears — identified by its own "All areas" button, which only
// AreaPage renders. Bounded, and each hop clicks the first area row.
// The row is tagged in the page and then clicked by that tag, because a bare
// `[role=button]` containing a digit ALSO matches the bottom nav's badge counts ("Crew 1") — and
// a global match does not miss, it navigates somewhere else and returns true, which is the
// collision `scripts/lib/tap-by-text.mjs` exists to filter. Anything under a fixed/sticky
// ancestor is chrome, not an area row.
// An area row is identified by its own COUNT SUFFIX — "Boulder\n5130 climbs →". Measured, not
// guessed: a diagnostic dump showed 81 role=button elements and ALL of them non-chrome (the nav is
// not fixed/sticky here, so filtering on position finds nothing), with the sub-tab buttons "Areas"
// and "Routes" sitting first. "N climbs" is what separates a place from a control.
async function tagFirstAreaRow() {
  return page.evaluate(() => {
    document.querySelectorAll("[data-probe-row]").forEach((n) => n.removeAttribute("data-probe-row"));
    const rows = [...document.querySelectorAll("[role='button']")]
      .filter((el) => /\d[\d,]*\s+climbs?/i.test(el.innerText || ""));
    if (!rows.length) return false;
    rows[0].setAttribute("data-probe-row", "1");
    return true;
  });
}

// AreaPage is identified by its OWN action row ("View map" + "Objectives"), never by "All areas" —
// that string is already on screen at STATE level, so it would report an area page one level early
// and the Directions assertion would then fail for the wrong reason.
// Drill until the DIRECTIONS LINK appears, not until the first area page. The state page is also
// an AreaPage, and stopping there asserted "Directions to Colorado" — a state centroid, which is
// exactly the case the link is now gated against. Drilling to where the feature applies is what
// makes this test about the feature rather than about the first screen that looks right.
const onArea = () => page.getByRole("button", { name: /^View map$/ }).count().then((n) => n > 0);
const hasDir = () => page.locator('a[href^="https://www.google.com/maps/dir/"]').count().then((n) => n > 0);
let onAreaPage = false, hops = 0;
for (; hops < 8; hops++) {
  if (await hasDir()) break;
  if (!(await tagFirstAreaRow())) break;
  await page.locator("[data-probe-row]").first().click({ timeout: 8000 }).catch(() => {});
  await settle();
}
onAreaPage = await onArea();
log(`  (drilled ${hops} level(s) from the state page)`);
ok(onAreaPage, "drilled through to an AREA PAGE (its 'All areas' control is present)");

// The assertion this probe exists for.
const dir = page.locator('a[href^="https://www.google.com/maps/dir/"]');
const count = await dir.count();
ok(count > 0, "a Directions link is on the area page");
if (count > 0) {
  const href = await dir.first().getAttribute("href");
  ok(/destination=-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(href || ""), `its destination is a real coordinate pair (${(href || "").slice(-34)})`);
  const label = await dir.first().getAttribute("aria-label");
  ok(/^Directions to .+/.test(label || ""), `it is named for a screen reader (${label})`);
  // Not a country/state/region centroid. The first passing run of this probe said
  // "Directions to Colorado", which is what prompted the area_type gate.
  ok(!/^Directions to (Colorado|United States)$/.test(label || ""), "it is not offering directions to a whole state or country");
  ok((await dir.first().getAttribute("rel") || "").includes("noopener"), "it opens externally with rel=noopener");
}

log("");
await browser.close(); stop();
if (fails.length) { console.error(`\nprobe-area-directions: ${fails.length} assertion(s) failed`); process.exit(1); }
log("ok — a climber can get directions to an area from the area page.");
