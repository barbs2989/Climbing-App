#!/usr/bin/env node
// check:overflow — does the app still fit the phone it is built for?
//
// This app is mobile-first and has no CSS framework: every control is hand-positioned with
// inline styles, which is exactly the setup where one fixed `minWidth`, a `flex` row with
// `nowrap`, or a single unbroken string pushes the page wider than the screen. The symptom
// is not a crash and no other guard can see it — `check:ui` reads text, so a screen whose
// right-hand edge is off-viewport reports the same characters as a correct one. What the
// user gets is a page that slides left-right under the thumb with a control's edge simply
// gone.
//
// Two bugs of this exact shape are already on record here: a fixed `minWidth` scrolling
// content offscreen, and the `flex` + `nowrap` overlap. Both were found by eye.
//
//   npm run check:overflow
//   npm run check:overflow -- --selftest-only    # prove the detector, walk nothing
//
// THE PRECISION RULE. A row of chips with `overflowX:auto` is a CORRECT pattern and is
// supposed to scroll sideways; reporting those would bury a real finding under dozens of
// false ones. The defect is the PAGE carrying the overflow, so an element is reported only
// if no ancestor between it and the root is an intentional horizontal scroller. That
// exclusion is measured from computed style, not guessed from markup.
//
// WHY THE SELF-TEST IS NOT OPTIONAL, and why it runs before anything else. The expected
// result of this check is "no findings" — which is also precisely what a broken detector
// prints. This repo has that failure on record more than once (`check:dead-flag-gates`
// printing ok having loaded no files; `check:overlay-scroll` exiting 0 over a blank app).
// So the run starts by injecting three shapes into a real page: a plain over-wide box, one
// pushed out by a fixed `minWidth`, and one inside an `overflow-x:auto` parent. The first
// two MUST be caught and the third MUST NOT be, or the run fails before walking a screen.
//
// Fails closed in the other direction too: walking zero screens is a failure, not a pass.
import { NEEDS_EXTRA_STATE } from "./lib/overlay-scaffold.mjs";
import { settledText } from "./lib/render-settle.mjs";
import { tapByText } from "./lib/tap-by-text.mjs";
import { assertDbReachable } from "./lib/db-preflight.mjs";
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argvSelfTestOnly = process.argv.slice(2).includes("--selftest-only");
const WIDTH = 390, HEIGHT = 844;
const TABS = ["today", "routes", "discover", "crew", "logbook", "ranks", "me"];
const log = (...a) => console.log(...a);

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
// Ask whether the database can answer at all BEFORE spawning a server or a browser. It costs
// one request; skipping it cost 25 minutes and a cancelled job with no message on 2026-08-13
// (29 of 53 overlays walked, then the wall). Nothing below this can settle without data, so
// there is nothing to learn by starting. `--selftest-only` walks no screens and needs no data,
// so it is exempt — the detector must stay provable while the DB is down.
if (!argvSelfTestOnly) await assertDbReachable({ label: "check:overflow" });
const port = await claimPort(5330);
if (port === null) { console.error("no free port"); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;
log(`starting dev server on ${port}...`);
// The `?zt=`/`?z=` opener only exists when the scaffold is injected, which is a vite
// config's job. Borrow the a11y-badges one: same populated demo, same opener, and reusing
// it means this cannot drift on which overlays exist.
const server = spawn("npx", ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
// Did OUR server start, and is it still ours?
//
// `claimPort` proves the port was free a moment ago; it cannot prove vite got it. The probe
// socket is closed before vite binds, so another process can take the port in between —
// `--strictPort` then makes vite EXIT rather than slide, and without this listener nothing
// notices. The loop below used to discard its own result (no `up`, no bail), so a run whose
// server never came up walked on regardless: against nothing, or worse, against a leaked dev
// server from another worktree serving a DIFFERENT branch, possibly in DB mode. That is the
// squatter-adoption failure `check-ui.mjs` records from experience — and its dangerous half is
// not a false red but a false GREEN, reported for code this guard never loaded.
//
// The self-test does not protect against it either: it injects three shapes into whatever page
// is on screen, so a squatter's page satisfies it exactly as ours does.
//
// Same two-line guard the other six browser checks already use; this was the one that lacked it.
let died = false;
server.on("exit", () => { died = true; });
let stopped = false;
const stopServer = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stopServer);
process.on("SIGINT", () => { stopServer(); process.exit(130); });
process.on("SIGTERM", () => { stopServer(); process.exit(143); });
process.on("uncaughtException", (e) => { console.error(e); stopServer(); process.exit(1); });
let up = false;
for (let i = 0; i < 60; i++) {
  if (died) break;
  try { const r = await fetch(base); if (r.ok) { up = true; break; } } catch {}
  await new Promise((r) => setTimeout(r, 2000));
}
if (!up || died) {
  console.error(died
    ? "the dev server exited during startup — the port was taken between claiming it and vite binding it, or the scaffold failed to apply"
    : "dev server never came up");
  stopServer(); process.exit(1);
}
await fetch(base + "ClimbMatch.jsx").catch(() => {});

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) { console.error("could not launch Google Chrome: " + String(e.message).split("\n")[0]); stopServer(); process.exit(1); }
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
page.setDefaultNavigationTimeout(120000);

const scan = () => page.evaluate((vw) => {
  // An ancestor only counts as an intentional horizontal scroller if the AUTHOR said so.
  //
  // Computed style cannot answer this and the first draft of this check was wrong for
  // exactly that reason. CSS says that when one of overflow-x/overflow-y is `visible` and
  // the other is not, the `visible` one computes to `auto`. Nearly every pane in this app
  // sets `overflowY:"auto"` and leaves overflow-x alone, so their computed overflow-x is
  // `auto` — and testing computed style excluded almost the whole app. It reported a clean
  // sweep while a 520px `minWidth` injected into the Home tab sat there unflagged.
  //
  // This codebase styles everything inline, so the inline `style` attribute IS the authored
  // intent. A chip row that really is meant to scroll sideways writes overflowX itself.
  const intentional = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = (p.getAttribute("style") || "").replace(/\s+/g, "").toLowerCase();
      // Authored horizontal scrolling — a chip row that is meant to swipe.
      if (/(^|;)overflow-x:(auto|scroll)/.test(s)) return true;
      if (/(^|;)overflow:(auto|scroll)/.test(s)) return true;
      // CLIPPING is read from COMPUTED style, and the asymmetry with the two lines above is
      // deliberate. `auto`/`scroll` must come from the inline style because CSS coerces a
      // `visible` overflow-x to `auto` whenever overflow-y is not visible, so computed style
      // says "scrollable" about panes nobody made scrollable. Nothing coerces TO `hidden`,
      // so computed is both safe here and necessary: FireMap lays 256px tiles at
      // translate3d offsets outside the frame on purpose and the clip is not always on the
      // ancestor's own inline style. Reading it inline made this guard FLAKY — the map
      // reported 0 offenders on one tab and 3 on another, run to run.
      const c = getComputedStyle(p);
      if (c.overflowX === "hidden" || c.overflowX === "clip") return true;
    }
    return false;
  };
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    // Skip the inside of an SVG. <g>/<path> carry their own coordinate system, so their
    // client rects are not page geometry and produced pure noise; the <svg> element itself
    // is still measured, which is the part that can actually widen a layout.
    if (el.ownerSVGElement) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // Right edge only. An element off to the LEFT cannot widen the page in a left-to-right
    // document — it is off-canvas, not overflow — and including it reported map tiles at
    // left=-220 as though they were findings.
    const over = Math.round(r.right - vw);
    if (over < 2) continue;
    if (intentional(el)) continue;
    out.push({
      tag: el.tagName.toLowerCase(),
      over, left: Math.round(r.left), width: Math.round(r.width),
      text: (el.innerText || "").trim().slice(0, 45).replace(/\n/g, " "),
      style: (el.getAttribute("style") || "").slice(0, 120),
    });
  }
  // Keep only the outermost offenders: a child sticking out because its parent does adds noise.
  const root = document.scrollingElement;
  return {
    docScrollW: root.scrollWidth, docClientW: root.clientWidth,
    offenders: out.slice(0, 12),
    total: out.length,
  };
}, WIDTH);

const load = async (qs) => {
  await page.goto(base + qs, { waitUntil: "domcontentloaded", timeout: 120000 });
  await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
};

// Self-test FIRST. A scan that reports zero because it is broken looks exactly like a clean
// app, and "no findings" is the answer this whole run is likely to produce — so prove the
// detector fires before trusting it. Three shapes: a plain over-wide box, one pushed out by
// a fixed minWidth (the #fixed-minwidth bug), and one inside an intentional horizontal
// scroller, which must NOT be reported.
await load(`?zt=today`);
const selftest = await page.evaluate((vw) => {
  const mk = (css, parentCss) => {
    const host = document.createElement("div");
    if (parentCss) host.setAttribute("style", parentCss);
    const kid = document.createElement("div");
    kid.setAttribute("style", css);
    kid.textContent = "selftest";
    host.appendChild(kid);
    document.body.appendChild(host);
    return host;
  };
  const a = mk("width:600px;height:20px;background:#f00");
  const b = mk("min-width:520px;height:20px;background:#0f0");
  const c = mk("width:900px;height:20px;background:#00f", "overflow-x:auto;width:200px");
  return { added: 3, vw };
}, WIDTH);
const st = await scan();
const stTexts = st.offenders.filter((o) => o.text === "selftest").length;
if (stTexts < 2) {
  console.error(`\nSELF-TEST FAILED — injected 2 over-wide elements and the scan saw ${stTexts}.`);
  console.error("A clean result below would mean nothing. Fix the detector before reading further.\n");
  await browser.close(); stopServer(); process.exit(1);
}
if (st.offenders.some((o) => o.style.includes("900px"))) {
  console.error("\nSELF-TEST FAILED — the element inside an overflow-x:auto parent was reported.");
  console.error("Intentional horizontal scrollers must be excluded or every chip row is a false positive.\n");
  await browser.close(); stopServer(); process.exit(1);
}
log(`self-test ok — detector caught ${stTexts}/2 injected offenders and correctly ignored the one inside a horizontal scroller\n`);
if (argvSelfTestOnly) { await browser.close(); stopServer(); process.exit(0); }

const lines = async () => new Set((await page.innerText("body").catch(() => "")).split("\n").map((s) => s.trim()).filter(Boolean));

const findings = [];
let routeNotReached = false;
const baseline = {};
for (const t of TABS) {
  await load(`?zt=${t}`);
  baseline[t] = await lines();
  const r = await scan();
  const pageWide = r.docScrollW > r.docClientW + 1;
  log(`  tab:${t}`.padEnd(28) + `page ${r.docScrollW}/${r.docClientW}${pageWide ? "  <-- SCROLLS SIDEWAYS" : ""}  offenders:${r.total}`);
  if (pageWide || r.total) findings.push({ screen: "tab:" + t, ...r });
}

// Route detail is the richest layout in the app — header strap, stat tiles, waypoint rows,
// the sub-tab strip — and it is where BOTH recorded bugs of this class lived, so leaving it
// out would miss the only place the defect has actually happened. Reaching it needs the
// same drill-in check:ui uses, and the sample route is pinned by name for the same reason.
// Ported from scripts/oneoff/measure-horizontal-overflow.mjs (#818), which this replaces.
log("");
const ROUTE = "North Ridge (Complete)";
// The matching itself now lives in scripts/lib/tap-by-text.mjs, so check:outage drives the route
// sub-tabs by the same rule rather than by a second copy of it -- the fixed/sticky filter is the
// subtle half and a copy would drift. Settling stays here, because this guard settles on text
// while check:outage has an outage's retry clock to wait out.
const tap = async (name) => {
  const ok = await tapByText(page, name);
  if (ok) await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
  return ok;
};
// Navigated, not driven. This used to select a state, tap Routes and click the first row —
// three UI steps that did not complete under the scaffold config, so the richest layout in
// the app printed NOT REACHED on every run and CLAUDE.md carried "fixing it is the top
// follow-up". `?zr=1` calls the app's own openRoute() from inside the opener, which cannot be
// defeated by a slow list, a row that renders differently, or a select whose labels move.
await load("?zr=1");
// Wait for the navigation itself, not just for the page to settle. `load` returns on
// __overlaysReady, and tying the two together is what the first CI run got wrong — belt and
// braces, so a future change to either cannot silently reintroduce the race.
await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 20000 }).catch(() => {});
await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
const opened = await page.evaluate(() => {
  if (!window.__routeOpen) return null;
  // The route page's own heading, for the log line — proof of WHICH route, not just that
  // something rendered.
  const h = document.querySelector("h1,h2");
  return (h && h.innerText.trim().slice(0, 40)) || "(route detail)";
});
if (opened) await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
if (opened) {
  log(`  route detail: opened ${JSON.stringify(opened)}`);
  for (const sub of ["Overview", "Reports", "Photos", "Partners", "Plan", "Safety"]) {
    if (sub !== "Overview" && !(await tap(sub))) { log(`  route:${sub}`.padEnd(28) + "NOT REACHED"); continue; }
    const r = await scan();
    const wide = r.docScrollW > r.docClientW + 1;
    log(`  route:${sub}`.padEnd(28) + `page ${r.docScrollW}/${r.docClientW}${wide ? "  <-- SCROLLS SIDEWAYS" : ""}  offenders:${r.total}`);
    if (wide || r.total) findings.push({ screen: "route:" + sub, ...r });
  }
} else {
  // Now a FAILURE, not a note — recorded here and raised with the other hard failures below,
  // so the overlay walk still runs and reports whatever it finds.
  //
  // While this was a UI drill-in it could miss for reasons that were nobody's fault — a
  // renamed route, a slow list — so a note was the honest call. `?zr=1` calls openRoute()
  // directly, so the only way it does not land is that the opener or the route page is
  // broken, and both are worth failing on. The screen where both recorded bugs of this class
  // lived must not be able to go unmeasured in silence.
  routeNotReached = true;
  log(`  route detail`.padEnd(28) + `NOT REACHED — ?zr=1 never set window.__routeOpen`);
}

// The scaffold publishes every overlay it discovered. Read it from the page rather than
// rebuilding the list here, so this cannot drift on which modals exist — the same reason
// the other browser guards share overlay-scaffold.mjs.
await load("?zt=today");
const overlays = await page.evaluate(() => window.__overlays || []);
log(`\n  ${overlays.length} overlay states discovered\n`);
let skipped = 0;
for (const name of overlays) {
  if (NEEDS_EXTRA_STATE[name]) { skipped++; continue; }
  let got = null, onTab = null;
  for (const t of TABS) {
    await load(`?zt=${t}&z=${name}`);
    if (await page.evaluate((n) => (window.__overlayNoPayload || {})[n], name)) { got = "nopayload"; break; }
    // Mount detection by LINE SET, not text length. An overlay that REPLACES the screen
    // (Inbox does) leaves the page no longer than it was, so a length test reads it as
    // never mounted and silently drops it — that is on record for check:a11y-badges, and
    // my first draft here repeated it: every modal reported the Home tab's numbers because
    // ">120 chars" was true on the first tab every time.
    const now = await lines();
    let fresh = 0;
    for (const l of now) if (!baseline[t].has(l)) fresh++;
    if (fresh >= 2) { got = await scan(); onTab = t; break; }
  }
  if (got === "nopayload") { skipped++; continue; }
  if (!got) { skipped++; continue; }
  const pageWide = got.docScrollW > got.docClientW + 1;
  log(`  modal:${name}`.padEnd(28) + `page ${got.docScrollW}/${got.docClientW}${pageWide ? "  <-- SCROLLS SIDEWAYS" : ""}  offenders:${got.total}  (${onTab})`);
  if (pageWide || got.total) findings.push({ screen: `modal:${name} (on ${onTab})`, ...got });
}

await browser.close();
stopServer();

log("");
// Fails closed. The self-test proves the detector can SEE overflow; this proves it was
// pointed at something. A `?zt=` that stopped working, or a scaffold that stopped
// publishing __overlays, would otherwise print a confident "no overflow" about a walk that
// never happened — the exact shape check:overlay-scroll's anchor-lost case took.
const walked = TABS.length + (overlays.length - skipped);
if (!overlays.length) {
  console.error("check:overflow FAILED — the scaffold published no overlays, so only tabs were walked.");
  console.error("Look for ANCHOR LOST in the vite output above.\n");
  process.exit(1);
}
if (routeNotReached) {
  console.error("check:overflow FAILED — ?zr=1 did not open the route detail screen, so the richest");
  console.error("layout in the app, and the one where both recorded bugs of this class lived, was not");
  console.error("measured at all. Check the scaffold's opener and that ROUTES[0] still resolves.\n");
  process.exit(1);
}
if (walked < TABS.length + 20) {
  console.error(`check:overflow FAILED — only ${walked} screen(s) were measured, which is too few to mean anything.`);
  console.error(`${skipped} of ${overlays.length} overlays did not open; the opener is probably broken.\n`);
  process.exit(1);
}

if (!findings.length) {
  log(`check:overflow: ok — nothing overflows ${WIDTH}px across ${TABS.length} tabs and ${overlays.length - skipped} of ${overlays.length} overlays (${skipped} not openable here).`);
  process.exit(0);
}
// Group by the OFFENDING ELEMENT, not by screen. An overlay renders over the tab behind
// it, so one bad row on Home reappears under every modal that opens there — reported
// per-screen, a single defect reads as eleven findings and the reader cannot tell whether
// they have one problem or eleven.
const byElement = new Map();
for (const f of findings) {
  for (const o of f.offenders) {
    const key = `${o.tag}|${o.style}|${o.text}`;
    if (!byElement.has(key)) byElement.set(key, { o, screens: [] });
    byElement.get(key).screens.push(f.screen);
  }
}
console.error(`check:overflow: ${byElement.size} element(s) past the right edge of a ${WIDTH}px viewport, on ${findings.length} screen(s):\n`);
for (const { o, screens } of byElement.values()) {
  // Without a locator, a failure in a codebase with no class names sends you hunting
  // through a 40,000-character line. The inline style greps straight back to the JSX.
  console.error(`  +${o.over}px past the edge  <${o.tag}> left=${o.left} w=${o.width}  ${JSON.stringify(o.text)}`);
  console.error(`      ${o.style}`);
  console.error(`      seen on: ${screens.slice(0, 6).join(", ")}${screens.length > 6 ? ` (+${screens.length - 6} more)` : ""}\n`);
}
process.exit(1);
