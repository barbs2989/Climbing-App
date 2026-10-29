#!/usr/bin/env node
// check:overlay-fullscreen — on a phone, a popup is a PAGE: it covers the whole screen, the app
// behind it does not show through anywhere, and scrolling the popup never scrolls the app behind.
//
// Why. Owner, 2026-10-24: "When a page pops up, I would like it to fill the whole screen. Like an
// actual page on itself cause this will eventually translate to an actual website." #2692 and #2728
// made it so with two CSS rules in index.html that key on the backdrop's inline align-items. Those
// rules reach only the markup shapes they name, so a popup drawn any other way (a card positioned
// by top/left, a panel without role="dialog", a new shape) still floats over the dimmed app, and
// nothing said so. This walk is what proves the rules reach each popup.
//
// HOW. Opens every overlay the shared scaffold can open (the same opener check:pinned-dismiss uses)
// at 390x844, takes the TOPMOST layer, and samples a 3x7 grid of points. Each point must land on
// an OPAQUE element inside that layer. A point that hits the app behind it, or only the layer's
// dimmed backdrop, is a hole: the popup is a card, not a page. Then it wheels 2,000px inside the
// popup and asks whether the app BEHIND it moved (owner: "You shouldn't be able to scroll on anything
// in the background when a page pops up") -- tested directly, not inferred from CSS.
//
// EXEMPT, by the same opt-outs index.html honours: data-sheet="menu" (a short ⋯ action menu stays
// a bottom sheet, as iOS and Material draw one), data-sheet="alert" (a yes/no confirm stays a small
// centred box) and data-sheet="viewer" (a photo viewer is already a black full-screen lightbox).
//
// WHAT IT CANNOT SEE: popups the scaffold cannot open (listed as skipped, with why), and the
// desktop layout, where lib/wideLayout.js draws a centred window on purpose.
//
// Not in `npm run build` -- browser automation is too slow to gate a build, same as check:zero.
// --only a,b re-walks named overlays after a fix.

import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { assertQuietBox } from "./lib/quiet-box.mjs";
import { overlayStates, NEEDS_EXTRA_STATE, assertKnownOverlays, buildRouteDetailOpener, routeDetailSource } from "./lib/overlay-scaffold.mjs";

assertQuietBox("check:overlay-fullscreen");
const ROOT = new URL("..", import.meta.url).pathname;
const PORT = 5250;
const log = (s) => console.log(s);
const fails = [];
const fail = (where, msg) => fails.push(`${where}: ${msg}`);

const appOverlays = overlayStates(fs.readFileSync(ROOT + "ClimbMatch.jsx", "utf8")).map((s) => s.name);
if (!appOverlays.length) { console.error("discovered no overlays — the discovery regex has drifted"); process.exit(1); }
// Bookkeeping is asserted against App's list only: NEEDS_EXTRA_STATE and OVERLAY_PAYLOADS
// describe App's overlays, and RouteDetail's are opened by a different mechanism entirely.
assertKnownOverlays(appOverlays, fail);
// RouteDetail's own modals, opened by the second injected opener. Walked here too, because a
// pane that chains its scroll does so wherever it lives.
const allOverlays = appOverlays.concat(buildRouteDetailOpener(routeDetailSource(), "check:overlay-fullscreen").names);
// --only a,b: walk just these (a re-check after a fix, not a verdict on the app).
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1].split(",") : null;
const overlays = ONLY ? allOverlays.filter((n) => ONLY.includes(n)) : allOverlays;

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
// A phone: where popups fill the screen (index.html) and where a lost ✕ costs the most.
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(30000);
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));

// Does the TOPMOST popup cover the screen as a page, or does the app show through around it?
const scan = () => page.evaluate(() => {
  const isOverlayRoot = (el) => {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed") return false;
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width >= innerWidth * 0.5 && r.height >= innerHeight * 0.25;
  };
  // The TOPMOST layer only, as check:pinned-dismiss: a nested layer comes after the one holding it.
  const roots = [...document.querySelectorAll("div")].filter(isOverlayRoot).slice(-1);
  const alpha = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return c === "transparent" ? 0 : 1; const p = m[1].split(/[ ,/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };
  const opaque = (el) => { const cs = getComputedStyle(el); return alpha(cs.backgroundColor) >= 0.9 || cs.backgroundImage !== "none" || /^(IMG|CANVAS|VIDEO)$/i.test(el.tagName); };
  const out = [];
  for (const root of roots) {
    const dlg = root.closest("[role=dialog]") || root.querySelector("[role=dialog]") || root;
    const label = dlg.getAttribute("aria-label") || root.getAttribute("aria-label") || "(unlabelled)";
    const sheet = dlg.getAttribute("data-sheet") || root.getAttribute("data-sheet") || "";
    const xs = [4, innerWidth / 2, innerWidth - 4];
    const ys = [4, 0.17, 0.33, 0.5, 0.67, 0.83].map((f) => (f < 1 ? f * innerHeight : f)).concat([innerHeight - 4]);
    const holes = [];
    for (const y of ys) for (const x of xs) {
      const hit = document.elementFromPoint(x, y);
      let ok = false;
      if (hit && root.contains(hit)) for (let el = hit; el && el !== root.parentElement; el = el.parentElement) { if (opaque(el)) { ok = true; break; } }
      if (!ok) holes.push(`${Math.round(x)},${Math.round(y)} ${hit && !root.contains(hit) ? "app behind" : "backdrop"}`);
    }
    const panel = [...root.children].sort((a, b) => b.offsetHeight - a.offsetHeight)[0] || root;
    const r = panel.getBoundingClientRect();
    out.push({ overlay: label, sheet, holes, panel: `${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)}`, style: (root.getAttribute("style") || "").slice(0, 160) });
  }
  return { roots: roots.length, rows: out };
});

const load = async (qs, settle) => {
  await page.goto(base + qs, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(settle);
};

const TABS = ["me", "today", "crew", "logbook", "routes", "discover", "ranks", "groups"];
const notReached = [];        // changed NOTHING on any tab — a real failure to open
const notFixed = [];          // opened, but is not a fixed overlay — out of this guard's subject
let checkedOverlays = 0, pages = 0, noPayload = 0;
const exempt = [];

// Warm once so the first real navigation is not paying for the module graph.
await load("?zt=today", 2500);

/* A BARE reading of each tab, so "this overlay changed nothing" can be told from "this overlay is
   not a fixed sheet". SEVEN navigations for the whole run, not one per overlay — a per-overlay
   baseline would double a walk that already opens 51 modals across 7 tabs.
   Recorded even if a tab fails to render: a null baseline makes the comparison below fall through
   to the old behaviour for that tab rather than inventing a verdict from a missing number. */
const baseChars = {};
for (const t of TABS) {
  await load(`?zt=${t}`, 2200);
  const n = await page.evaluate(() => (document.body.innerText || "").replace(/\d/g, "").length);
  baseChars[t] = n > 0 ? n : null;
}

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

// CALIBRATION. The same wheel over the same 3000px, with NO popup open, must move the app --
// otherwise "nothing behind it scrolled" below is vacuous (a headless wheel that reaches nothing,
// a tab too short to scroll) and every popup would pass the scroll half for free.
let wheelMoves = null;
for (const t of TABS) {
  await load(`?zt=${t}`, 2200);
  await page.evaluate(() => { const a = document.getElementById("appscroll"); if (a) { const s = document.createElement("div"); s.style.cssText = "height:3000px"; a.appendChild(s); } });
  const y0 = await page.evaluate(() => scrollY);
  await page.mouse.move(195, 422);
  for (let i = 0; i < 5; i++) await page.mouse.wheel(0, 400);
  await page.waitForTimeout(250);
  if ((await page.evaluate(() => scrollY)) > y0) { wheelMoves = t; break; }
}
if (!wheelMoves) fail("calibration", "a 2,000px wheel moved the app on NO tab with no popup open, so the background-scroll test proves nothing -- the app's scroller is no longer the document, or the wheel never lands");

for (const name of overlays) {
  if (NEEDS_EXTRA_STATE[name]) {
    log(`  ${name}`.padEnd(26) + "skipped — " + NEEDS_EXTRA_STATE[name]);
    continue;
  }
  let landed = null, empty = null, opened = null;
  for (const t of TABS) {
    await load(`?zt=${t}&z=${name}`, 2200);
    // A payload that resolved empty in the seeded demo (no groups or events — both sit
    // behind DEMO_FILLERS, which is permanently false) mounts nothing, and would otherwise
    // be counted against the opener as if the scaffold were broken.
    const d = await page.evaluate((n) => (window.__overlayNoPayload || {})[n], name);
    if (d) { empty = d; break; }
    const r = await scan();
    if (r.roots > 0) { landed = { tab: t, ...r }; break; }
    /* NO QUALIFYING ROOT IS NOT "IT NEVER MOUNTED", and reporting it as such put four permanent
       residents in that bucket. `isOverlayRoot` demands a VISIBLE position:fixed div at least
       half the viewport wide and a quarter tall — correct for this guard, whose subject is a
       pane that chains its scroll to the page behind a sheet. An INLINE dropdown satisfies none
       of it and has no page behind it to chain to.
       Measured against the baseline below: trustOpen (+461 chars), unfinishedOpen (+236),
       alertsOpen (+752) and legal (+868) all OPEN and have ZERO fixed elements between them.
       check:zero mounts all four. So the old line said "never mounted" about overlays that
       demonstrably mount, and handed them to a guard that already confirms them.
       The cost was not the wording. A bucket that always holds four is a bucket where a FIFTH —
       an overlay that genuinely stopped opening — arrives unnoticed. Separating the two is what
       makes an empty `notReached` mean something. */
    if (baseChars[t] != null) {
      /* DIGITS ARE MASKED ON BOTH SIDES, and the first version of this did not do it — it
         reported `unfinishedOpen (me, +1 chars)` and `alertsOpen (me, +1 chars)`, latching onto
         a ONE-CHARACTER difference as proof a modal had opened. It had not: those two open on
         `today` at +236 and +752, and the +1 on `me` is a clock or a count moving by a digit.
         render-settle.mjs masks digits for exactly this reason, and a verdict built on unmasked
         text is a verdict a ticking number can fabricate.
         The LARGEST delta across tabs wins rather than the first non-zero, so the tab reported
         is the one where the thing actually opened. */
      const chars = await page.evaluate(() => (document.body.innerText || "").replace(/\d/g, "").length);
      const delta = chars - baseChars[t];
      if (delta !== 0 && (!opened || Math.abs(delta) > Math.abs(opened.delta))) opened = { tab: t, delta };
    }
  }
  if (empty) {
    log(`  ${name}`.padEnd(26) + "skipped — nothing to open it about in the demo: " + empty);
    noPayload++;
    continue;
  }
  if (!landed) {
    if (opened) notFixed.push(`${name} (${opened.tab}, ${opened.delta >= 0 ? "+" : ""}${opened.delta} chars)`);
    else notReached.push(name);
    continue;
  }
  checkedOverlays++;
  const x = landed.rows[0];
  if (x.sheet) { exempt.push(`${name} (${x.sheet})`); log(`  ${name}`.padEnd(26) + `--  (${landed.tab}; data-sheet="${x.sheet}", exempt)`); continue; }
  if (!x.holes.length) {
    // ...and the app behind it stays put while you scroll the popup. Wheel far past the end of
    // whatever the popup holds (2,000px of it, at the centre and at the top edge, where a header
    // that does not scroll sits), then ask whether the page behind moved. What would move is
    // #appscroll's position on screen: the DOCUMENT is the app's scroller (lib/dialogA11y.js).
    // LATENT, as check:pinned-dismiss: 3000px is added to the page behind first, so the verdict does
    // not depend on whether the demo's tab happens to be long enough to scroll.
    await page.evaluate(() => { const a = document.getElementById("appscroll"); if (a) { const s = document.createElement("div"); s.style.cssText = "height:3000px"; a.appendChild(s); } });
    const behind = () => page.evaluate(() => { const a = document.getElementById("appscroll"); return { top: a ? Math.round(a.getBoundingClientRect().top) : null, y: Math.round(scrollY) }; });
    const before = await behind();
    for (const [px, py] of [[195, 422], [195, 30]]) { await page.mouse.move(px, py); for (let i = 0; i < 5; i++) await page.mouse.wheel(0, 400); }
    await page.waitForTimeout(250);
    const after = await behind();
    if (before.top !== after.top || before.y !== after.y) {
      fail(name, `scrolling inside "${x.overlay}" moved the app BEHIND it (#appscroll top ${before.top} -> ${after.top}, window ${before.y} -> ${after.y}) -- lib/dialogA11y.js's page lock did not hold for this popup.`);
      log(`  ${name}`.padEnd(26) + `FAIL (${landed.tab}; background scrolls)`);
      continue;
    }
    pages++; log(`  ${name}`.padEnd(26) + `ok  (${landed.tab}; covers the screen, nothing behind it scrolls)`); continue;
  }
  fail(name, `"${x.overlay}" leaves ${x.holes.length} of 21 sample points showing the app behind it (${x.holes.slice(0, 4).join("; ")}) -- panel ${x.panel}. index.html's full-screen rules key on a role="dialog" backdrop with inline align-items center / flex-start / flex-end; this one is drawn another way.\n      backdrop: ${x.style}`);
  log(`  ${name}`.padEnd(26) + `FAIL (${landed.tab})`);
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
if (notFixed.length) {
  log(`\n  ${notFixed.length} overlay(s) OPENED but are not fixed sheets, so this guard has no subject for them:`);
  for (const n of notFixed) log(`    ${n}`);
  log(`  (An inline dropdown or a screen of its own is not a popup layered over the app.)`);
}
if (notReached.length) {
  log(`\n  ${notReached.length} overlay(s) changed NOTHING on any tab, so nothing was checked for them: ${notReached.join(", ")}`);
  log("  (check:zero owns the assertion that an overlay mounts at all — this check only reports it.)");
}

if (exempt.length) log(`\n  ${exempt.length} overlay(s) opt out by design (menu / alert / viewer): ${exempt.join(", ")}`);

if (!fails.length) {
  log(`\ncheck:overlay-fullscreen: ok — ${pages} of ${checkedOverlays} overlay(s) cover the whole phone screen as a page and hold the app behind still; ${exempt.length} opt out by design.\n`);
  process.exit(0);
}
console.error(`\ncheck:overlay-fullscreen: ${fails.length} popup(s) that float over the app instead of filling the screen, or let the app behind them scroll:\n`);
for (const f of fails) console.error("  " + f);
console.error("");
process.exit(1);
