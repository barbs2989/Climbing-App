#!/usr/bin/env node
// measure-target-size — how big is every control the app DRAWS? (owner note 2026-10-29: "the
// overall near me friends and by area boxes should be bigger. Find other places where the box is
// too small on the app").
//
// Walks what check:overflow walks (every tab, the route page's sub-tabs, every scaffold overlay)
// at 390px and records each visible button, link, select, input and role'd control drawn under
// 32px tall or 24px wide, grouped by its inline style so each group greps back to one JSX site.
// A measurement, not a guard: it prints nothing red and never fails.
//
//   OUT=small.json node scripts/oneoff/measure-target-size.mjs
//
// 2026-10-29: 404 small targets in 90 style groups (66 of them buttons) before the box-button
// rule in index.html; 148 after (19 button groups, none of them a box: text links, switches,
// map overlays). Harness copied from scripts/check-horizontal-overflow.mjs; its DB preflight is
// dropped because the populated scaffold renders from seed.
import { NEEDS_EXTRA_STATE } from "../lib/overlay-scaffold.mjs";
import { settledText } from "../lib/render-settle.mjs";
import { tapByText } from "../lib/tap-by-text.mjs";
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argvSelfTestOnly = process.argv.slice(2).includes("--selftest-only");
const widthArg = process.argv.indexOf("--width");
const WIDTH = widthArg > 0 ? Number(process.argv[widthArg + 1]) : 390;
if (!Number.isInteger(WIDTH) || WIDTH < 320) { console.error("--width takes a whole number of pixels, 320 or more"); process.exit(1); }
const HEIGHT = WIDTH >= 1024 ? 900 : 844;
const TABS = ["today", "routes", "discover", "crew", "logbook", "ranks", "me", "groups"];
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
  const out = [];
  const sel = 'button,[role="button"],[role="tab"],[role="switch"],[role="checkbox"],[role="radio"],a[href],select,input:not([type="hidden"])';
  for (const el of document.querySelectorAll(sel)) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.height >= 32 && r.width >= 24) continue;
    const name = (el.getAttribute("aria-label") || el.innerText || el.value || "").trim().slice(0, 50).replace(/\n/g, " ");
    out.push({ tag: el.tagName.toLowerCase(), h: Math.round(r.height), w: Math.round(r.width), pressed: el.getAttribute("aria-pressed") || el.getAttribute("aria-current") || el.getAttribute("aria-checked") || "", text: name, style: (el.getAttribute("style") || "").slice(0, 160) });
  }
  const root = document.scrollingElement;
  return { docScrollW: root.scrollWidth, docClientW: root.clientWidth, offenders: out, total: out.length };
}, WIDTH);

// Wait for the OPENER, then for the text. In that order, and the first half is not optional.
//
// The scaffold's opener fires on a timer — 1200ms after App mounts for `?z=`, 900ms for
// `?zr=1` — and sets `window.__overlaysReady` once it has run. settledText() only waits for
// the text to stop changing, and a tab that renders fully on mount is stable for its three
// samples (~800ms) BEFORE that timer fires. This load used to settle and return right
// there: the guard then read the bare tab, found no fresh lines, and moved on to the next
// tab, where the same race was run again. On a fast laptop 5 of 33 overlay loads lost it
// (measured 2026-10-25); on a CI runner most of them did, and the run failed with "59 of 74
// overlays did not open" while finding nothing wrong with the layout — red on main and on
// unrelated branches about half the time, with a different set of overlays missing each run.
// Every other browser guard waits on this flag; this one never had.
//
// Returns false when the opener never ran, so the caller can say WHICH overlays that was
// rather than folding a dead opener into "did not open".
const load = async (qs) => {
  await page.goto(base + qs, { waitUntil: "domcontentloaded", timeout: 120000 });
  const ready = await page.waitForFunction(() => window.__overlaysReady === true, null, { timeout: 30000 }).then(() => true, () => false);
  await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
  return ready;
};

// Self-test FIRST. A scan that reports zero because it is broken looks exactly like a clean
// app, and "no findings" is the answer this whole run is likely to produce — so prove the
// detector fires before trusting it. Three shapes: a plain over-wide box, one pushed out by
// a fixed minWidth (the #fixed-minwidth bug), and one inside an intentional horizontal
// scroller, which must NOT be reported.
if (argvSelfTestOnly) { await browser.close(); stopServer(); process.exit(0); }

// Digits masked, as settledText masks them: "3 min ago" on one load and "4 min ago" on the
// next is the same line, not a sign that something mounted.
const lines = async () => new Set((await page.innerText("body").catch(() => "")).split("\n").map((s) => s.trim().replace(/\d/g, "#")).filter(Boolean));
const freshLines = (now, base) => { let n = 0; for (const l of now) if (!base.has(l)) n++; return n; };
let staleBaselines = 0;

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
  // An OPEN pitch is its own layout (owner note 2026-10-25: belay/anchor/gear boxes, the pitch
  // photo button, clamped comments) and renders only after a tap, so the closed Plan scan above
  // never measured it — and the pinned sample has no pitch rows. `zrp=1` makes the scaffold open
  // a seed route that HAS pitch detail; open its first pitch on Plan and measure again.
  await load("?zr=1&zrp=1");
  await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 20000 }).catch(() => {});
  await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
  const onPlan = await tap("Plan");
  const expanded = onPlan && await page.evaluate(() => {
    const b = document.querySelector('[data-kind="pitch"] [aria-expanded="false"]');
    if (!b) return false;
    b.click();
    return true;
  });
  if (!expanded) {
    log(`  route:Plan (pitch open)`.padEnd(28) + (onPlan ? "no pitch row reached" : "Plan NOT REACHED"));
  } else {
    await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
    const p = await scan();
    const pWide = p.docScrollW > p.docClientW + 1;
    log(`  route:Plan (pitch open)`.padEnd(28) + `page ${p.docScrollW}/${p.docClientW}${pWide ? "  <-- SCROLLS SIDEWAYS" : ""}  offenders:${p.total}`);
    if (pWide || p.total) findings.push({ screen: "route:Plan (pitch open)", ...p });
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
const notOpened = [], neverRan = [];
for (const name of overlays) {
  if (NEEDS_EXTRA_STATE[name]) { skipped++; continue; }
  let got = null, onTab = null, ran = false;
  for (const t of TABS) {
    if (await load(`?zt=${t}&z=${name}`)) ran = true;
    if (await page.evaluate((n) => (window.__overlayNoPayload || {})[n], name)) { got = "nopayload"; break; }
    // Mount detection by LINE SET, not text length. An overlay that REPLACES the screen
    // (Inbox does) leaves the page no longer than it was, so a length test reads it as
    // never mounted and silently drops it — that is on record for check:a11y-badges, and
    // my first draft here repeated it: every modal reported the Home tab's numbers because
    // ">120 chars" was true on the first tab every time.
    const now = await lines();
    if (freshLines(now, baseline[t]) < 2) continue;
    // ...against a baseline taken NOW, not at the start of the run. The bare tab DRIFTS over a
    // run: measured 2026-10-25 with every opener disabled, the Home tab grew enough new lines
    // part-way through the walk that 48 of 74 overlays "opened" on it and the run passed. A
    // walk that cannot tell a dead opener from a live one measured nothing, so a fresh read is
    // only believed once the bare tab, reloaded beside it, still lacks those lines.
    const scanned = await scan();
    await load(`?zt=${t}`);
    baseline[t] = await lines();
    if (freshLines(now, baseline[t]) >= 2) { got = scanned; onTab = t; break; }
    staleBaselines++;
  }
  if (got === "nopayload") { skipped++; continue; }
  if (!got) { skipped++; (ran ? notOpened : neverRan).push(name); continue; }
  const pageWide = got.docScrollW > got.docClientW + 1;
  log(`  modal:${name}`.padEnd(28) + `page ${got.docScrollW}/${got.docClientW}${pageWide ? "  <-- SCROLLS SIDEWAYS" : ""}  offenders:${got.total}  (${onTab})`);
  if (pageWide || got.total) findings.push({ screen: `modal:${name} (on ${onTab})`, ...got });
}

await browser.close();
stopServer();

const byElement = new Map();
for (const f of findings) for (const o of f.offenders) { const key = `${o.tag}|${o.style}|${o.text}`; if (!byElement.has(key)) byElement.set(key, { ...o, screens: [] }); byElement.get(key).screens.push(f.screen); }
const fs = await import("node:fs");
fs.writeFileSync(process.env.OUT || "target-size.json", JSON.stringify([...byElement.values()], null, 1));
log(`walked ${TABS.length} tabs + ${overlays.length - skipped} overlays; ${byElement.size} small targets`);
process.exit(0);
