#!/usr/bin/env node
// check:overlay-scroll — no scrollable region inside an overlay may chain its scroll to the
// page behind it.
//
// Why. An overlay is `position:fixed` over a document that is still scrollable — the Crew
// tab is ~5,600px. With the default `overscroll-behavior: auto`, a drag that reaches the end
// of the overlay's own scroll does not stop: the browser hands the rest of the gesture to
// the nearest scrollable ancestor, which is the page underneath. The sheet then sits still
// while the background moves. Reported as "the sheet is sticky and won't scroll down".
// Measured on the Past crews sheet: 851px of viewport over 968px of content — 117px of
// travel — against a 5,615px page behind it.
//
// #684 fixed that sheet and the trip report; #702 swept the 23 other overlays that are
// THEMSELVES the scroller. Neither could reach the remaining shape: an overlay that does not
// scroll wrapping an inner pane that does. That nesting is invisible to a regex over style
// literals — the `position:"fixed"` and the `overflowY:"auto"` sit in different JSX
// elements, often hundreds of characters apart — so this check runs the real app and asks
// the browser.
//
// WHAT IT CANNOT SEE, stated plainly: an element is only flagged when it is ACTUALLY
// scrollable in the walked state (scrollHeight > clientHeight). A pane that would overflow
// with more data than the demo has is not flagged. This finds real chaining on real content,
// not every theoretical case.
//
// Not in `npm run build` — browser automation is too slow and flaky to gate a build, same
// reasoning as check:ui and check:zero.

import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { overlayStates, NEEDS_EXTRA_STATE, assertKnownOverlays } from "./lib/overlay-scaffold.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const PORT = 5250;
const log = (s) => console.log(s);
const fails = [];
const fail = (where, msg) => fails.push(`${where}: ${msg}`);

const overlays = overlayStates(fs.readFileSync(ROOT + "ClimbMatch.jsx", "utf8")).map((s) => s.name);
if (!overlays.length) { console.error("discovered no overlays — the discovery regex has drifted"); process.exit(1); }
assertKnownOverlays(overlays, fail);

async function waitForServer(url, tries = 120) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
async function claimPort(start) {
  for (let p = start; p < start + 40; p++) {
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
log(`starting dev server on ${port} with the overlay-scroll config...`);
// detached so the whole process group can be killed: npx spawns vite as a CHILD, and killing
// only the npx pid leaves a server squatting the port for every later run.
const server = spawn(
  "npx",
  ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } }
);
let died = false;
server.on("exit", () => { died = true; });
let stopped = false;
const stopServer = () => {
  if (stopped) return;
  stopped = true;
  try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} }
};
process.on("exit", stopServer);
process.on("SIGINT", () => { stopServer(); process.exit(130); });
process.on("SIGTERM", () => { stopServer(); process.exit(143); });
process.on("uncaughtException", (e) => { console.error(e); stopServer(); process.exit(1); });
if (!(await waitForServer(base)) || died) {
  console.error(died ? "the dev server exited during startup — port taken, or the scaffold failed to apply" : "dev server never came up");
  stopServer(); process.exit(1);
}
await fetch(base + "ClimbMatch.jsx").catch(() => {});

let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
} catch (e) {
  console.error("could not launch Google Chrome: " + String(e.message).split("\n")[0]);
  console.error("playwright-core downloads no browser of its own — install Chrome, or run this on a runner image that has it.");
  stopServer(); process.exit(1);
}
// A narrow, short viewport is the point: it is where panes actually overflow, and it is the
// phone shape this app is built for. A desktop viewport hides most of what we are looking for.
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(30000);
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));

// Every scrollable element inside a fixed overlay, and whether its scroll is contained.
// Reported from the browser rather than inferred from source: the overlay and the pane that
// scrolls are usually different elements, and only layout knows which one actually overflows.
const scan = () => page.evaluate(() => {
  const isOverlayRoot = (el) => {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed") return false;
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    // big enough to be a sheet or a full-screen modal, not a toast or a badge
    return r.width >= innerWidth * 0.5 && r.height >= innerHeight * 0.25;
  };
  const roots = [...document.querySelectorAll("div")].filter(isOverlayRoot)
    // keep only outermost: a fixed child of a fixed overlay is reported under its parent
    .filter((el, _i, all) => !all.some((o) => o !== el && o.contains(el)));
  const out = [];
  for (const root of roots) {
    const label = root.getAttribute("aria-label") || root.getAttribute("role") || "(unlabelled)";
    for (const el of [root, ...root.querySelectorAll("*")]) {
      const cs = getComputedStyle(el);
      if (cs.overflowY !== "auto" && cs.overflowY !== "scroll") continue;
      // Two ways to qualify. Overflowing RIGHT NOW is the proven case. A pane with a bounded
      // height is the latent one: it is not overflowing with the demo's data, but it will the
      // moment a real account has more, and then it chains exactly the same way. Requiring
      // current overflow would make coverage a function of how much seed data happens to
      // exist, which is not an invariant anybody can rely on.
      const overflowing = el.scrollHeight > el.clientHeight + 1;
      const bounded = cs.maxHeight !== "none" || el === root;
      if (!overflowing && !bounded) continue;
      const ob = cs.overscrollBehaviorY;
      out.push({
        overlay: label,
        self: el === root,
        contained: ob === "contain" || ob === "none",
        overscroll: ob,
        px: el.scrollHeight - el.clientHeight,
        overflowing,
        tag: el.tagName.toLowerCase(),
        // A failure that does not say WHERE sends the reader hunting through a
        // 40,000-character line. The inline style is the only stable locator in a
        // codebase with no classes -- it greps straight back to the JSX.
        hint: (el.getAttribute("aria-label") ? `aria-label="${el.getAttribute("aria-label")}" ` : "")
              + (el.getAttribute("style") || "").slice(0, 110),
      });
    }
  }
  return { roots: roots.length, scrollers: out, pageScrollable: document.scrollingElement.scrollHeight > innerHeight + 1 };
});

const load = async (qs, settle) => {
  await page.goto(base + qs, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(settle);
};

const TABS = ["me", "today", "crew", "logbook", "routes", "discover"];
const seen = new Map();       // overlay name -> finding rows
const notReached = [];
let checkedOverlays = 0, checkedScrollers = 0, noPayload = 0;

// Warm once so the first real navigation is not paying for the module graph.
await load("?zt=today", 2500);

// THE FALSE-PASS GUARD. Vite reports a throwing transform as a per-request internal error
// and keeps serving, so a lost anchor does NOT stop the run — it produces a blank app in
// which no overlay mounts, every one lands in `notReached`, and the check exits 0 having
// verified nothing. Injection-tested: breaking the anchor used to pass. Assert the app is
// actually on screen before believing anything below.
//
// NOTE ON WHY THE NAV IS NOT ENOUGH: index.html paints a boot placeholder that MIRRORS the
// real nav (that is what check:boot exists to keep in sync), so `Climbs`/`Logbook` are on
// screen before React mounts and stay there if it never does. During the injection test the
// blank app reported `nav present: true` at 58 characters of text. The character count is
// what actually separates the shell from the app; the nav check only rules out a 404.
const booted = await page.evaluate(() => {
  const t = document.body.innerText || "";
  return { chars: t.length, hasNav: /Climbs/.test(t) && /Logbook/.test(t) };
});
if (!booted.hasNav || booted.chars < 200) {
  console.error(`the app did not render (${booted.chars} chars of text, nav ${booted.hasNav ? "present" : "MISSING"}).`);
  console.error("Nothing below was actually checked. The usual cause is the scaffold failing to apply —");
  console.error("look for 'ANCHOR LOST' or a pre-transform error in the vite output above.");
  await browser.close(); stopServer(); process.exit(1);
}

for (const name of overlays) {
  if (NEEDS_EXTRA_STATE[name]) {
    log(`  ${name}`.padEnd(26) + "skipped — " + NEEDS_EXTRA_STATE[name]);
    continue;
  }
  let landed = null, empty = null;
  for (const t of TABS) {
    await load(`?zt=${t}&z=${name}`, 2200);
    // A payload that resolved empty in the seeded demo (no groups or events — both sit
    // behind DEMO_FILLERS, which is permanently false) mounts nothing, and would otherwise
    // be counted against the opener as if the scaffold were broken.
    const d = await page.evaluate((n) => (window.__overlayNoPayload || {})[n], name);
    if (d) { empty = d; break; }
    const r = await scan();
    if (r.roots > 0) { landed = { tab: t, ...r }; break; }
  }
  if (empty) {
    log(`  ${name}`.padEnd(26) + "skipped — nothing to open it about in the demo: " + empty);
    noPayload++;
    continue;
  }
  if (!landed) { notReached.push(name); continue; }
  checkedOverlays++;
  checkedScrollers += landed.scrollers.length;
  const bad = landed.scrollers.filter((s) => !s.contained);
  if (!bad.length) {
    log(`  ${name}`.padEnd(26) + `ok  (${landed.tab}, ${landed.scrollers.length} scroller(s))`);
    continue;
  }
  seen.set(name, bad);
  for (const b of bad) {
    const what = b.self ? "the overlay itself" : `an inner <${b.tag}> pane`;
    const how = b.overflowing
      ? `scrolls ${b.px}px past its box`
      : "has a bounded height and will scroll as soon as it fills";
    fail(name, `${what} ${how}, with overscroll-behavior-y: ${b.overscroll} — the drag chains to the page behind it. Add overscrollBehavior:"contain".\n      locator: ${b.hint}`);
  }
  log(`  ${name}`.padEnd(26) + `FAIL (${landed.tab}) — ${bad.length} uncontained scroller(s)`);
}

if (pageErrors.length) fail("page", `uncaught error(s): ${[...new Set(pageErrors)].join(" | ")}`);

// Second half of the same guard: the app can boot while the OPENER half of the scaffold is
// broken, in which case every overlay renders as a bare tab. A handful legitimately do not
// mount (named below); most of them not mounting means the walk verified nothing.
const expected = overlays.filter((n) => !NEEDS_EXTRA_STATE[n]).length - noPayload;
if (checkedOverlays < Math.ceil(expected * 0.6)) {
  fail("scaffold", `only ${checkedOverlays} of ${expected} openable overlays mounted — the opener is not working, so most of this run checked nothing`);
}

await browser.close();
stopServer();

// Say what was NOT covered rather than letting the summary imply full coverage.
if (notReached.length) {
  log(`\n  ${notReached.length} overlay(s) never mounted on any tab, so nothing was checked for them: ${notReached.join(", ")}`);
  log("  (check:zero owns the assertion that an overlay mounts at all — this check only reports it.)");
}

if (!fails.length) {
  log(`\ncheck:overlay-scroll: ok — ${checkedScrollers} scrollable region(s) across ${checkedOverlays} overlay(s), all contained.\n`);
  process.exit(0);
}
console.error(`\ncheck:overlay-scroll: ${fails.length} region(s) that would scroll the page behind them:\n`);
for (const f of fails) console.error("  " + f);
console.error("");
process.exit(1);
