// Does Leaflet actually PAINT the derived trailhead marker, and does it look derived?
//
// probe-derived-trailhead-marker.mjs proves the LOGIC by extracting the block and running it against
// a stub Leaflet, and says plainly that it does not prove the pixels. This closes that gap: a real
// dev server, real Chrome, real Leaflet.
//
// GETTING TO THE MAP IS THE HARD PART, and six earlier attempts failed on it. What they got wrong:
//   * `tapByName(page,"Plan")` — that helper matches an AUTHORED aria-label, and this button has
//     only `aria-current`. Right helper for the Crew bar it was written for, wrong tool here.
//   * skipping controls with a fixed/sticky ancestor — a rule copied from check:overflow, where it
//     exists because sub-tab names collide with the BOTTOM NAV. Applied here it excludes the very
//     bar we want.
// Read from the source instead: RouteDetail renders the bar as
//   [["overview","Overview"],["planner","Plan"],...].map(x => <button onClick={()=>setTab(x[0])}>)
// so it is a plain <button> whose text is exactly "Plan". Click that, and nothing cleverer.
//
// `showPlan` is CONTENT-GATED, so a route with no plan content has no Plan tab at all — asserted
// below rather than assumed, because that case is indistinguishable from a failed click.
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { TH_NAME } from "../derived-trailhead.config.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 5310;

async function waitForServer(url) {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(4000) }); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}
async function claimPort(start, span = 40) {
  for (let p = start; p < start + span; p++) {
    const free = await new Promise((resolve) => {
      const probe = net.createServer();
      probe.once("error", () => resolve(false));
      probe.once("listening", () => probe.close(() => resolve(true)));
      probe.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  return null;
}

const port = await claimPort(PORT);
if (port === null) { console.error(`no free port in ${PORT}-${PORT + 39}`); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;
console.log(`starting dev server on ${port} with a derived trailhead injected onto ROUTES[0]...`);
const server = spawn(
  "npx",
  ["vite", "--config", "scripts/derived-trailhead.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } }
);
let died = false;
server.on("exit", () => { died = true; });
let stopped = false;
const stopServer = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stopServer);
process.on("SIGINT", () => { stopServer(); process.exit(130); });
process.on("SIGTERM", () => { stopServer(); process.exit(143); });
process.on("uncaughtException", (e) => { console.error(e); stopServer(); process.exit(1); });
if (!(await waitForServer(base)) || died) {
  console.error(died ? "the dev server exited during startup — port taken, or the scaffold failed to apply" : "dev server never came up");
  stopServer(); process.exit(1);
}

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) { console.error("could not launch Google Chrome: " + String(e.message).split("\n")[0]); stopServer(); process.exit(1); }
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(30000);
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const die = (m) => { console.log("  FAIL  " + m + "\n\nNothing below was checked."); stopServer(); process.exit(1); };

await page.goto(base + "?zr=1", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 40000 }).catch(() => {});
if (!(await page.evaluate(() => window.__routeOpen === true))) die("?zr=1 never opened a route");
ok("?zr=1 opened the route detail screen");

// RouteDetail is a lazy chunk; the sub-tab bar does not exist the instant __routeOpen flips.
await page.waitForFunction(
  () => [...document.querySelectorAll("button")].some(b => b.textContent.trim() === "Plan"),
  null, { timeout: 40000 },
).catch(() => {});

const planned = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(x => x.textContent.trim() === "Plan");
  if (!b) return false;
  b.click();
  return true;
});
// A missing Plan tab is `showPlan` being false, NOT a failed click — and the two need opposite
// repairs, so they must not report alike.
if (!planned) die("no <button> with text \"Plan\" — either showPlan is false for this route (the tab is content-gated) or the sub-tab bar has been rebuilt");
ok("clicked the Plan sub-tab");

// Leaflet is loaded on demand by loadLeaflet(); window.L appearing is the real signal that the map
// mounted at all. Counting markers first cannot distinguish "no map" from "map with no markers".
await page.waitForFunction(() => typeof window.L !== "undefined", null, { timeout: 45000 }).catch(() => {});
if (!(await page.evaluate(() => typeof window.L !== "undefined"))) {
  die("Leaflet never loaded (window.L undefined) — GPXMap did not mount even on the Planner tab");
}
ok("Leaflet loaded — GPXMap mounted");

await page.waitForSelector(".leaflet-marker-icon", { timeout: 45000 }).catch(() => {});
let prev = -1;
for (let i = 0; i < 24; i++) {
  const n = await page.locator(".leaflet-marker-icon").count();
  if (n === prev && n > 0) break;
  prev = n;
  await page.waitForTimeout(500);
}

const markers = await page.evaluate(() => [...document.querySelectorAll(".leaflet-marker-icon")].map(el => {
  const inner = el.firstElementChild;
  return { style: inner ? inner.getAttribute("style") || "" : "", text: (inner ? inner.textContent : el.textContent || "").trim() };
}));
console.log(`\n  leaflet markers painted: ${markers.length}`);
if (!markers.length) fail("no marker was painted — the map mounted but drew nothing");
else ok(`the map painted ${markers.length} marker(s)`);

// wpDivIcon builds DERIVED as hollow+dashed and RECORDED as solid. Both must be present, or the
// distinction this whole shape exists for is unobservable.
const dashed = markers.filter(m => /border:[^;]*dashed/.test(m.style));
const solid = markers.filter(m => /border:[^;]*solid/.test(m.style));
if (dashed.length === 1) ok("exactly one marker is drawn DERIVED (hollow, dashed)");
else fail(`expected exactly 1 dashed marker, found ${dashed.length}`);
if (solid.length >= 1) ok(`${solid.length} recorded marker(s) drawn solid — the two are visually distinct`);
else fail("no solid marker, so the derived one cannot be shown to differ from a recorded pin");

// Not a bare coloured dot. This is the specific defect #1194 removed everywhere else and the reason
// #1208 asked for wpDivIcon here.
const glyph = dashed[0] && dashed[0].text;
if (glyph === "◈") ok("the derived marker carries the Trailhead glyph ◈, so the legend explains it");
else fail(`the derived marker's glyph is ${JSON.stringify(glyph)}, expected "◈" — a colour-only dot is the defect this shape avoids`);

// …and it must not have become an N+1st row in the WAYPOINTS list.
//
// SCOPED TO THE PANEL, not the page. `approachLogistics.trailhead` is ALSO what TrailheadCard
// renders on this very tab, so a whole-page search reports correct behaviour as a leak — the
// count-inside-the-section rule this repo has already paid for twice. The question is only whether
// the derived point became a waypoint ROW.
const where = await page.evaluate((n) => {
  const txt = document.body.innerText;
  if (!txt.includes(n)) return { anywhere: false, inList: false, sections: [] };
  // Slice from the WAYPOINTS heading to the next all-caps heading.
  const i = txt.indexOf("WAYPOINTS");
  let slice = "";
  if (i >= 0) {
    const rest = txt.slice(i + "WAYPOINTS".length);
    const m = rest.match(/\n[A-Z][A-Z &’'\-]{4,}\n/);
    slice = m ? rest.slice(0, m.index) : rest;
  }
  // Which sections mention it, for the report.
  const sections = txt.split(/\n(?=[A-Z][A-Z &’'\-]{4,}\n)/).filter(s => s.includes(n))
    .map(s => s.split("\n")[0].slice(0, 40));
  return { anywhere: true, inList: slice.includes(n), sections };
}, TH_NAME);
if (!where.inList) {
  ok("the derived point is NOT a row in the WAYPOINTS list" +
     (where.anywhere ? ` (it does appear under ${JSON.stringify(where.sections)}, which is TrailheadCard rendering the same approach_logistics value — expected)` : ""));
} else fail(`"${TH_NAME}" is a row in the WAYPOINTS list — the derived point leaked into it`);

if (pageErrors.length) fail(`uncaught page error(s): ${pageErrors.slice(0, 2).join(" | ")}`);
else ok("no uncaught page errors");

console.log(failures ? `\n${failures} assertion(s) failed.` : `\nok — Leaflet paints the derived trailhead: hollow, dashed, carrying its glyph, and not in the waypoint list.`);
stopServer();
await browser.close().catch(() => {});
process.exit(failures ? 1 : 0);
