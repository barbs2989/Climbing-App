#!/usr/bin/env node
// check:pinned-dismiss — a popup's ✕ and ← Back stay on the screen however far it is scrolled.
//
// Why. Owner, 2026-10-24: "The x out to close the page and back button need to be sticky when a
// popup page comes up. So users can easily go back or close out the page they are viewing."
// Measured at 390x844 before the fix: the Menu, Privacy, Log a climb (3,124px of travel), Suggest
// a fix (3,634px) and the trip report all lost their ✕ off the top with the demo's own content, the
// sign-in sheet's ✕ sat UNDER the app header (it rendered unportalled inside #appscroll), and ~45
// more lost it the moment they held a screen more than the demo gives them. Eight had pinned their
// header by hand; nothing kept the next one doing it.
//
// The fix is central: lib/dialogA11y.js pinDismiss() makes the header row holding a Close…/Back…
// control sticky in every open popup. This walk is what proves it reaches each one.
//
// HOW. Opens every overlay the shared scaffold can open (the same opener check:overlay-scroll uses),
// finds the TOPMOST layer's first ✕ / ← Back, scrolls every pane that holds it to the bottom, and
// asks two things: is the control inside the viewport, and is it what a tap at its centre hits
// (elementFromPoint) -- the second is how the sign-in sheet was caught, on screen and untappable.
//
// LATENT CASES ARE TESTED, NOT ASSUMED. A popup whose demo content fits has nothing to scroll and
// would pass vacuously -- that was 45 of them. So when no pane holding the control overflows, 3000px
// is appended to the block its header row sits in (what a long list or report does) and the same
// question is asked. Without that, coverage would be a function of how much seed data exists.
//
// The popups no flag alone opens (NEEDS_EXTRA_STATE) are built by EXTRA_STATE_OPENERS via `?zx=`
// and walked after the rest; Compare at 1280px, the only width it renders at.
//
// WHAT IT CANNOT SEE: popups no opener can build (listed as skipped, with why), a popup whose
// only way out is a Cancel/Done (Edit profile's sticky Cancel·Save bar is that shape and is fine),
// and the desktop layout (it walks at phone width; the pinning is the same code at every width).
//
// Not in `npm run build` -- browser automation is too slow to gate a build, same as check:zero.
// --only a,b re-walks named overlays after a fix.

import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { assertQuietBox } from "./lib/quiet-box.mjs";
import { overlayStates, NEEDS_EXTRA_STATE, EXTRA_STATE_OPENERS, assertKnownOverlays, buildRouteDetailOpener, routeDetailSource } from "./lib/overlay-scaffold.mjs";

assertQuietBox("check:pinned-dismiss");
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
const allOverlays = appOverlays.concat(buildRouteDetailOpener(routeDetailSource(), "check:pinned-dismiss").names);
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

// Every popup's way out, measured AFTER every pane holding it is scrolled to its bottom: is the
// ✕ / ← Back still on the screen, and is it the thing a tap there would hit?
const scan = () => page.evaluate(async () => {
  const isOverlayRoot = (el) => {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed") return false;
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width >= innerWidth * 0.5 && r.height >= innerHeight * 0.25;
  };
  // The TOPMOST layer only: a sheet opened over a page (Post options over a group) covers that
  // page's own Back, as it should. Document order puts a nested layer after the one holding it.
  const roots = [...document.querySelectorAll("div")].filter(isOverlayRoot).slice(-1);
  const isDismiss = (b) => {
    const a = (b.getAttribute("aria-label") || "").trim(), t = (b.textContent || "").trim();
    if (/^(remove|delete|dismiss|clear)\b/i.test(a)) return false; // a remove-✕ on a chip closes nothing
    return /^(close|back)\b/i.test(a) || t === "✕" || /^← ?Back\b/.test(t);
  };
  const visible = (b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(b).visibility !== "hidden"; };
  const out = [];
  for (const root of roots) {
    const label = root.getAttribute("aria-label") || root.getAttribute("role") || "(unlabelled)";
    const ctl = [...root.querySelectorAll("button")].filter(isDismiss).filter(visible)[0];
    if (!ctl) { out.push({ overlay: label, noControl: true }); continue; }
    const canScroll = (el) => { const cs = getComputedStyle(el); return cs.overflowY === "auto" || cs.overflowY === "scroll"; };
    // Only a pane that HOLDS the control can carry it away; a list scrolling beside the header cannot.
    let moving = [root, ...root.querySelectorAll("*")].filter((el) => canScroll(el) && el.contains(ctl) && el.scrollHeight > el.clientHeight + 1);
    // LATENT: a popup whose demo content happens to fit still scrolls the moment a real account has
    // more (a long list, a long report). Give the innermost pane that could scroll it 3000px more, so
    // the verdict does not depend on how much seed data exists.
    let spacer = null;
    if (!moving.length) {
      let host = ctl.parentElement;
      while (host && host !== root.parentElement && !canScroll(host)) host = host.parentElement;
      if (host && host !== root.parentElement) {
        // Into the BLOCK the header row sits in, not the pane: a sticky row is held inside its own
        // parent, and that block is what a longer list or report actually lengthens.
        let row = ctl;
        while (row.parentElement && row.parentElement !== host && row.parentElement.offsetHeight <= 120) row = row.parentElement;
        spacer = document.createElement("div");
        spacer.style.cssText = "height:3000px;flex-shrink:0";
        row.parentElement.appendChild(spacer);
        moving = [host];
      }
    }
    for (const s of moving) s.scrollTop = s.scrollHeight;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const r = ctl.getBoundingClientRect();
    const onScreen = r.top >= -1 && r.bottom <= innerHeight + 1;
    const hit = onScreen ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
    const reachable = !!hit && (hit === ctl || ctl.contains(hit));
    const travel = moving.reduce((n, s) => n + s.scrollHeight - s.clientHeight, 0);
    for (const s of moving) s.scrollTop = 0;
    if (spacer) spacer.remove();
    out.push({ overlay: label, scrolls: moving.length > 0, latent: !!spacer, travel, onScreen, reachable, top: Math.round(r.top),
      ctl: (ctl.getAttribute("aria-label") || ctl.textContent || "").trim().slice(0, 30),
      over: hit && !reachable ? (hit.getAttribute("aria-label") || hit.textContent || "").trim().slice(0, 40) + " <" + hit.tagName.toLowerCase() + " " + (hit.getAttribute("style") || "").slice(0, 80) + ">" : "",
      hint: (ctl.parentElement.getAttribute("style") || "").slice(0, 140) });
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
let checkedOverlays = 0, pinned = 0, outside = 0, noPayload = 0;
const noControl = [];

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

for (const name of overlays) {
  if (NEEDS_EXTRA_STATE[name]) {
    if (!EXTRA_STATE_OPENERS[name]) log(`  ${name}`.padEnd(26) + "skipped — " + NEEDS_EXTRA_STATE[name]);
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
  judge(name, landed);
}

function judge(name, landed) {
  checkedOverlays++;
  const rows = landed.rows.filter((x) => !x.noControl);
  if (!rows.length) noControl.push(name);
  const bad = rows.filter((x) => x.scrolls && !(x.onScreen && x.reachable));
  const held = rows.filter((x) => x.scrolls && x.onScreen && x.reachable).length;
  const out = rows.filter((x) => !x.scrolls).length;
  pinned += held; outside += out;
  if (!bad.length) {
    log(`  ${name}`.padEnd(26) + (rows.length ? `ok  (${landed.tab}; ${held ? "stays pinned scrolled to the end" : "its header is outside the pane that scrolls"})` : `--  (${landed.tab}; no ✕ or ← Back to test)`));
    return;
  }
  for (const x of bad) fail(name, `"${x.ctl}" ${x.onScreen ? `is covered by ${x.over}` : `scrolls off the screen (top ${x.top}px)`} once the popup is scrolled ${x.travel}px to its end${x.latent ? " (3000px of content added: what a longer list or report does)" : ""} — lib/dialogA11y.js pinDismiss() did not reach it: a header row taller than 120px, an absolute ✕ over a photo (pin it in a zero-height sticky bar, as the trip report does), or a layer drawn over it.\n      header row: ${x.hint}`);
  log(`  ${name}`.padEnd(26) + `FAIL (${landed.tab})`);
}

// The popups no flag alone opens (NEEDS_EXTRA_STATE), each built by its EXTRA_STATE_OPENERS entry.
// Walked here and nowhere else: the other guards still skip them. One that opens NOTHING fails,
// because the opener is this guard's own and a silent miss would put the row back to "skipped".
for (const name of overlays.filter((n) => EXTRA_STATE_OPENERS[n])) {
  const x = EXTRA_STATE_OPENERS[name];
  if (x.viewport) await page.setViewportSize(x.viewport);
  await load(`?zt=routes&zx=${name}`, 2600);
  const err = await page.evaluate((n) => (window.__overlayOpenErrors || {})[n], name);
  const r = await scan();
  if (x.viewport) await page.setViewportSize({ width: 390, height: 844 });
  if (err || !r.roots) { fail(name, err ? `its opener threw: ${err}` : "its EXTRA_STATE_OPENERS entry opened nothing — the gate it builds has changed"); continue; }
  judge(name, { tab: "routes" + (x.viewport ? ` @${x.viewport.width}px` : ""), ...r });
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
  log(`  (An inline dropdown is not a popup page, and has no header to pin.)`);
}
if (notReached.length) {
  log(`\n  ${notReached.length} overlay(s) changed NOTHING on any tab, so nothing was checked for them: ${notReached.join(", ")}`);
  log("  (check:zero owns the assertion that an overlay mounts at all — this check only reports it.)");
}

if (noControl.length) log(`\n  ${noControl.length} overlay(s) have no ✕ / ← Back at all (a menu, an alert, a stepped flow, a Cancel/Save bar), so nothing here was tested: ${noControl.join(", ")}`);

if (!fails.length) {
  log(`\ncheck:pinned-dismiss: ok — across ${checkedOverlays} overlay(s), ${pinned} ✕/Back stay on screen scrolled to the end, ${outside} sit outside the pane that scrolls.\n`);
  process.exit(0);
}
console.error(`\ncheck:pinned-dismiss: ${fails.length} popup(s) whose way out leaves the screen or cannot be tapped:\n`);
for (const f of fails) console.error("  " + f);
console.error("");
process.exit(1);
