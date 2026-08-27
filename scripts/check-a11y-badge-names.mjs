#!/usr/bin/env node
// check:a11y-badges — a badge count glued into a control's own accessible name.
//
// The defect, as a screen reader hears it. The Crew sub-tab bar rendered
//
//   <button>{label}{count ? <span>{count}</span> : null}</button>
//
// so Chrome computed the button's name as "Friends2" — one token, no separator between the
// word and the number. Sighted users see a pill sitting 6px to the right of the label,
// because the gap is CSS margin; the accessibility tree has no margins, so the two strings
// are simply concatenated. #740 fixed that one bar with an aria-label. It could not answer
// the obvious next question — IS THERE ANOTHER ONE? — and that is what this exists to ask.
//
//   npm run check:a11y-badges
//   npm run check:a11y-badges -- --dump out.json
//
// Why not just regex the accessible names for a digit stuck to a letter. Because this is a
// climbing app: "5.10a", "V4", "WI3", "M6", "Class 4", "P2" are everywhere and every one of
// them is a correct name. A string scan returns a haystack. THE DEFECT IS STRUCTURAL, not
// lexical — the digit and the word come from DIFFERENT DOM NODES and are concatenated by the
// name algorithm. A grade is one authored string in one text node; a badge is a separate
// element. So this walks each control's descendant text nodes, finds a letter→digit (or
// digit→letter) transition that happens ACROSS a node boundary, and only then asks Chrome
// what it computed. That distinction is the entire check: it is why "5.10a" is not a
// finding and why "Friends2" is.
//
// Confirmation is by MEASUREMENT, never by markup. A candidate is only reported if the name
// Chrome actually computed still holds the two fragments glued together. That is what makes
// an aria-label fix — which changes no structure at all — read as fixed here, and it is why
// the check cannot be satisfied by rearranging JSX that Chrome ignores.
//
// Runs against the POPULATED demo, not the zero state. A badge is rendered by
// `count ? <span>…` — at zero there is no badge, no glue, and nothing to find. check:zero's
// config would make this check vacuous.
//
// What it does NOT cover, stated plainly:
//   - Clickable <div>s. React's onClick leaves no attribute in the DOM, so no selector can
//     find them. They are also not controls to a screen reader (no role, so no computed
//     control name), which is a DIFFERENT defect — see scripts/audit-a11y.mjs.
//   - Names glued by something other than a word character on both sides — an icon's alt
//     text, say, or two fragments separated by punctuation (which is a real separator).
//   - THE selArea-GATED PANELS ON THE CLIMBS TAB, measured rather than assumed. `AreaLatest`,
//     `ClassicClimbs` and `GettingThere` all render as `selArea && …`, and `selArea` starts
//     null, so they are not screens-with-no-findings — they are not screens. This is NOT
//     hypothetical: `AreaLatest` carries the SAME glued-name defect this check exists for
//     (a climber's name welded to their ascent outcome), it was fixed in the same commit that
//     widened the needle, and reverting that fix is MISSED by a full 63-screen run.
//     Reaching it was attempted and does not work by setting `selArea` alone: an opener that
//     called `setSelArea` put the area in state (verified — it selected "Kings Peak") and the
//     Climbs tab still rendered 979 characters with no report rows, because that tab drives its
//     own browse navigation. Closing this needs that navigation driven, not one setter called;
//     see scripts/oneoff/probe-area-latest-reachable.mjs for the measurement, and case
//     `arealatest` in scripts/oneoff/inject-glued-name-cases.mjs, which pins the gap so that
//     it fails as STALE if the coverage ever arrives.
// The route detail screen IS covered, on all six sub-tabs. It used to be excluded here as
// "reached by clicking a card, not by URL", which stopped being true when the shared scaffold
// gained `?zr=1` — that calls the app's own openRoute() from inside the opener, which is how
// check:overflow already walks it. The exclusion outlived its reason by months, and the one
// defect this widening found was ON that screen: an exemption is a claim about reachability,
// and this one was stale rather than wrong when written.
//   - Names glued by something other than a number (an icon's alt text, say).
// A pass means: across six tabs and every overlay the app declares, no control a screen
// reader can reach announces a count welded to its label.

import { NEEDS_EXTRA_STATE, assertKnownOverlays } from "./lib/overlay-scaffold.mjs";
import { settledText } from "./lib/render-settle.mjs";
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const argOf = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const DUMP = argOf("--dump");
const PORT = 5290;
const TABS = ["today", "routes", "discover", "crew", "logbook", "ranks", "me"];

// --only=route walks JUST the route detail screen, for the injection suite: the full sweep is 65
// screens and an injection needs two runs of it. It REDUCES COVERAGE, so it can never print the
// normal verdict -- a flag that makes a partial run look complete is exactly the false pass every
// guard in this file is built to refuse. Not for CI, and the build does not pass it.
const ONLY = (process.argv.find((x) => x.startsWith("--only=")) || "").slice(7);
if (ONLY && ONLY !== "route") {
  console.error(`--only=${ONLY} is not a thing; the only reduced walk is --only=route`);
  process.exit(1);
}
const CHROME_ONLY = 90; // the wordmark + nav labels, and nothing else

const log = (...a) => console.log(...a);
const fails = [];
const fail = (screen, msg) => fails.push(`${screen}: ${msg}`);

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

// Several jobs run in this repo at once, and a squatter on a hardcoded port can serve a
// DIFFERENT checkout that passes or fails for its own reasons.
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
if (port !== PORT) log(`port ${PORT} is in use by another process — using ${port} instead`);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
log(`starting dev server on ${port}...`);
// detached puts vite in its own process group. `npx` spawns vite as a CHILD, so killing only
// the npx pid leaves the real server listening — a leaked dev server then squats the port
// for every later run and can answer for a DIFFERENT checkout. Kill the group.
const server = spawn(
  "npx",
  ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
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
  stopServer();
  process.exit(1);
}
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(30000);

// page.accessibility is GONE from this playwright-core — `page.accessibility.snapshot()` is
// undefined, not merely deprecated. Chrome's own protocol is the only way to read a computed
// name here, and it is the better source anyway: it is the same tree the screen reader gets.
const cdp = await page.context().newCDPSession(page);
await cdp.send("Accessibility.enable");
await cdp.send("DOM.enable");

// SECTION 2 — the same defect OFF a control, which section 1 cannot see.
//
// Section 1 judges by the CONTROL NAME Chrome computed, which is the right instrument and the
// reason it is trustworthy: an aria-label fix changes no structure at all and correctly reads as
// fixed. It is also why it is scoped to controls -- a plain <div> has no computed name, so a
// widened selector would find candidates and drop every one at the confirm step.
//
// That scope let a real defect through. The route page's conditions list rendered
// {pat.label}{pat.when ? <span style={{marginLeft:7}}>...</span> : null} as
// "Best windowmid-Jul to early Sep", on a plain heading div. Same shape as #740, invisible here.
//
// THE INSTRUMENT IS innerText, AND THE OBVIOUS ALTERNATIVE WAS TESTED AND REJECTED. The tempting
// judgement is the AX tree StaticText nodes, on the theory that Chrome merges adjacent inline
// text into one. Measured on four synthetic shapes, Accessibility.getPartialAXTree with
// fetchRelatives returned NO StaticText at all for both inline cases -- the two that matter.
// innerText separates all four correctly, because it is computed from LAYOUT, which is the same
// thing that decides whether a separator exists:
//
//   inline + margin   "Best windowmid-Jul"      <- glued
//   flex row          "Best window\nmid-Jul"
//   inline + space    "Best window mid-Jul"
//   block child       "Best window\nmid-Jul"
//
// THREE FILTERS, EVERY ONE OF THEM A FALSE POSITIVE THIS SCAN ACTUALLY PRODUCED:
//
//   not rendered  A display:none GRANDPARENT is missed by checking the parent's display, and
//                 inside one innerText falls back to textContent -- which carries no separators,
//                 so EVERY boundary in the subtree looks glued. All three findings of one early
//                 run were the seed area browser, dead under USE_DB, with zero-area rects.
//   local text    A body-wide includes() matches a short numeric needle like "31" somewhere else
//                 on a busy page. The nearest common ancestor is the smallest rendered text that
//                 must contain both fragments.
//   visual gap    The app wordmark is two spans, "Climb" and "Match", flush against each other.
//                 A screen reader says "ClimbMatch", which is exactly what the eye reads. The
//                 defect is a gap the eye GETS and the accessibility tree does not, so contiguous
//                 fragments are correct and must not be reported.
//
// No backticks anywhere in this literal: one ends the string. Same trap check:selected-state
// records, and it bit again while this was being written.
// A REAL FUNCTION, NOT A TEMPLATE STRING, and that is a bug fix rather than a preference. As a
// template literal this body read `/\w/`, which JS evaluates to `/w/` -- a regex matching the
// LETTER w. The scan therefore matched almost nothing and reported a clean app; the injection is
// what caught it, since the guard was green either way. A template literal also cannot contain a
// backtick, the trap check:selected-state records and which bit here too. page.evaluate takes a
// function, exactly as findCandidates above does, and neither hazard exists.
const scanOffControl = () => page.evaluate(() => {
  const CTRL = "button,summary,select,a[href],[role=button],[role=tab],[role=link],[role=menuitem],[role=checkbox],[role=switch],[role=option]";
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const parts = [];
  let n;
  while ((n = w.nextNode())) {
    if (!n.textContent || !n.parentElement) continue;
    parts.push({ t: n.textContent, owner: n.parentElement, node: n });
  }
  let examined = 0;
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].owner === parts[i - 1].owner) continue;
    examined++;
    const prev = parts[i - 1].t, cur = parts[i].t;
    // \w on BOTH sides, never "no whitespace": punctuation is a genuine separator, so a chip
    // that starts with a tick, arrow or star announces fine and must not be reported.
    if (!/\w/.test(prev.slice(-1)) || !/\w/.test(cur.slice(0, 1))) continue;
    const needle = (prev.match(/\w+$/) || [""])[0] + (cur.match(/^\w+/) || [""])[0];
    if (needle.length < 2) continue;
    const el = parts[i].owner;
    if (el.closest(CTRL) || parts[i - 1].owner.closest(CTRL)) continue;
    const rr = (node) => { const r = document.createRange(); r.selectNodeContents(node); return r.getBoundingClientRect(); };
    let gap = 0, sameLine = false;
    try {
      const ra = rr(parts[i - 1].node), rb = rr(parts[i].node);
      // NOT RENDERED means nothing is announced, and it is a false positive this scan actually
      // produced: a display:none GRANDPARENT is missed by checking the parent's display, and
      // inside one innerText falls back to textContent -- which carries no separators, so every
      // boundary in the subtree looks glued. All three findings of one early run were the seed
      // area browser, dead under USE_DB, with zero-area rects.
      if ((!ra.width && !ra.height) || (!rb.width && !rb.height)) continue;
      sameLine = Math.abs(ra.bottom - rb.bottom) <= 4;
      gap = rb.left - ra.right;
    } catch { continue; }
    // EXCLUDE ONLY THE VISUALLY CONTIGUOUS CASE. Requiring a shared visual line MISSED the real
    // defect at 390px, where the chip WRAPS -- and a soft inline wrap puts no separator into
    // innerText (measured: the wrapped case still reads "Best windowlate spring to fall"). A
    // block child does get a newline and is already excluded by the text test below. The only
    // thing to excuse is the app wordmark: "Climb" and "Match", flush, announced as the eye reads.
    if (sameLine && gap < 2) continue;
    // LOCAL, NOT body-wide. A body-wide includes() matches a short numeric needle like "31"
    // elsewhere on a busy page, reporting fragments layout had actually separated.
    let anc = parts[i - 1].owner;
    while (anc && !anc.contains(el)) anc = anc.parentElement;
    if (!anc || !(anc.innerText || "").includes(needle)) continue;
    out.push({
      needle, gap: Math.round(gap), sameLine,
      before: prev.slice(-26), after: cur.slice(0, 26),
      tag: el.tagName.toLowerCase(),
      style: (el.getAttribute("style") || "").replace(/\s+/g, " ").slice(0, 70),
      ctx: (anc.textContent || "").trim().replace(/\s+/g, " ").slice(0, 70),
    });
  }
  return { out, examined };
});

// Find controls whose visible text is assembled from more than one node, with a letter/digit
// transition exactly at a node boundary. This runs in the page and only MARKS candidates —
// it deliberately does not judge them. Judgement needs the computed name, which only Chrome
// can supply, and doing it here would be the markup-inference mistake this check exists to
// avoid.
const findCandidates = () => page.evaluate(() => {
  // Real controls only. A bare <div onClick> is invisible to every selector (React attaches
  // no attribute) AND has no role, so a screen reader never computes a control name for it.
  const SEL = "button,summary,select,a[href],[role=button],[role=tab],[role=link],[role=menuitem],[role=checkbox],[role=switch],[role=option]";
  const out = [];
  let idx = 0;
  for (const el of document.querySelectorAll(SEL)) {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") continue;
    if (!r.width && !r.height) continue;
    // Descendant text nodes in document order, each tagged with the element that owns it.
    // Two fragments under the SAME element came from one authored string and cannot be the
    // label-plus-badge shape; a boundary between different elements is the whole signal.
    const parts = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (!n.textContent || !n.parentElement) continue;
      const ps = getComputedStyle(n.parentElement);
      if (ps.display === "none" || ps.visibility === "hidden") continue;
      parts.push({ t: n.textContent, owner: n.parentElement });
    }
    let hit = null;
    for (let i = 1; i < parts.length && !hit; i++) {
      if (parts[i].owner === parts[i - 1].owner) continue;
      const prev = parts[i - 1].t, cur = parts[i].t;
      const a = prev.slice(-1), b = cur.slice(0, 1);
      // Whitespace on either side means the name already reads as two tokens — fine.
      //
      // A word character on BOTH sides, whatever their classes. The original rule was
      // letter<->digit only, because #740 was a count welded to a label. The route page's
      // "Recently climbed" rows are the same defect with a WORD on the right instead of a
      // number — "Nathan Barber" and "Attempt" are separate elements held apart by
      // `marginLeft:7`, and the accessibility tree has no margins, so Chrome announced
      // "Nathan BarberAttempt". Narrowing to digits let that shape through for as long as
      // this check has existed.
      //
      // Punctuation between the two fragments is a genuine separator and must NOT be
      // flagged: "Alex Torres" + "✓ Summited" announces as "Alex Torres✓ Summited", where
      // the ✓ keeps the two words apart. That is why this tests \w on both sides rather
      // than "no whitespace at the boundary" — measured against the live app, the looser
      // rule reports correct rows.
      let needle = null;
      if (/\w/.test(a) && /\w/.test(b)) needle = (prev.match(/\w+$/) || [""])[0] + (cur.match(/^\w+/) || [""])[0];
      if (needle && needle.length > 1) hit = { needle, before: prev.slice(-24), after: cur.slice(0, 24) };
    }
    if (!hit) continue;
    el.setAttribute("data-a11yprobe", String(idx));
    out.push({ probe: idx, tag: el.tagName.toLowerCase(), role: el.getAttribute("role") || "", text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60), ...hit });
    idx++;
  }
  return out;
});

// Ask Chrome what it actually computed, then keep only the candidates where the two
// fragments are STILL welded together in that name. An aria-label (the #740 fix) changes no
// structure whatsoever, so this measurement is the only thing that can tell fixed from
// broken.
async function confirm(cands) {
  const confirmed = [];
  const doc = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  for (const c of cands) {
    let name = null;
    try {
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: `[data-a11yprobe="${c.probe}"]` });
      if (!nodeId) continue;
      const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
      const ax = (nodes || []).find((x) => x.name && x.name.value != null);
      if (!ax) continue;
      // An ignored node is not exposed to assistive tech at all — a different problem, and
      // not one this check can honestly claim to be measuring.
      if (ax.ignored) continue;
      name = String(ax.name.value);
    } catch { continue; }
    if (name && name.includes(c.needle)) confirmed.push({ ...c, name });
  }
  return confirmed;
}

async function load(qs, settle, expectContent) {
  if (died) {
    console.error("\nthe dev server exited part-way through the walk — every screen after that");
    console.error("point would be empty, so nothing below was actually checked.");
    stopServer();
    process.exit(1);
  }
  await page.goto(base + qs, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__overlaysReady === true, null, { timeout: 60000 }).catch(() => {});
  if (expectContent) await settledText(page, { min: CHROME_ONLY, timeout: 45000 });
  await page.waitForTimeout(settle);
}

// A blank app is the failure mode that makes this whole family of checks lie: every screen
// finds zero candidates and the run exits 0 having verified nothing. check:overlay-scroll
// learned this the hard way — vite reports a throwing transform as a per-request internal
// error and keeps serving, so the app was blank and the check passed. Watch the detail:
// index.html's boot placeholder MIRRORS the real nav, so "the nav is present" proves
// nothing. Only content beyond the shell does.
async function assertAppIsUp() {
  const txt = await page.innerText("body").catch(() => "");
  if (txt.replace(/\s+/g, " ").trim().length <= CHROME_ONLY) {
    console.error(`\nthe app rendered only its shell (${txt.trim().length} chars) — the scaffold did not apply,`);
    console.error("or the bundle failed to compile. Every screen below would find no controls at all,");
    console.error("so a green result here would mean nothing. Stopping.");
    stopServer();
    process.exit(1);
  }
}

log("warming the dev server...");
await load("?zt=today", 1500, true);
await assertAppIsUp();

const found = new Map(); // needle+tag -> {…, screens:Set}
const dump = {};
let screensWalked = 0;
let controlsScanned = 0;

const foundOff = new Map();
let boundariesExamined = 0;

async function sweep(label) {
  const cands = await findCandidates();
  controlsScanned += cands.length;
  const confirmed = await confirm(cands);
  const off = await scanOffControl();
  boundariesExamined += off.examined;
  for (const h of off.out) {
    const key = h.needle + "|" + h.style;
    if (!foundOff.has(key)) foundOff.set(key, { ...h, screens: new Set() });
    foundOff.get(key).screens.add(label);
  }
  screensWalked++;
  // Record the candidates too, not just the hits. A dump of "0 confirmed" tells you nothing
  // about whether the scan was looking at anything; the candidate list is how you check that
  // by eye, and it is what turns a green run into evidence.
  dump[label] = {
    candidates: cands.map((c) => ({ tag: c.tag, text: c.text, needle: c.needle })),
    confirmed: confirmed.map((c) => ({ name: c.name, tag: c.tag, text: c.text })),
  };
  for (const c of confirmed) {
    const key = c.tag + "|" + c.name;
    if (!found.has(key)) found.set(key, { ...c, screens: new Set() });
    found.get(key).screens.add(label);
  }
  const mark = confirmed.length ? `  ${confirmed.length} glued` : "";
  log(`  ${label}`.padEnd(30) + String(cands.length).padStart(3) + " candidate(s)" + mark);
  return confirmed.length;
}

// 1. Every main tab.
for (const t of ONLY ? [] : TABS) {
  await load(`?zt=${t}`, 2200, true);
  await sweep("tab:" + t);
}

// 1b. The route detail screen, on every sub-tab. Navigated rather than driven: `?zr=1` calls
//     the app's own openRoute() from inside the opener, so no slow list or moved row can
//     defeat it. Wait on __routeOpen as WELL as on the text settling — `load` returns on
//     __overlaysReady, which says nothing about whether the navigation has happened, and
//     tying the two together is what check:overflow's first CI run got wrong.
await load("?zr=1", 2200, true);
const routeOpen = await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 20000 }).then(() => true).catch(() => false);
if (!routeOpen) {
  // A failure, not a note. While this was a UI drill-in it could miss for reasons that were
  // nobody's fault; `?zr=1` can only fail if the opener or the route page is broken.
  fail("route detail", "?zr=1 never set window.__routeOpen, so the richest screen in the app went unmeasured");
} else {
  await sweep("route:overview");
  // Sub-tab names collide with the bottom nav, and a global text match silently leaves the
  // route page — so skip anything inside fixed/sticky chrome. Same helper shape as
  // check:overflow, which already learned this.
  const tapSub = async (name) => {
    const ok = await page.evaluate((n) => {
      const hit = [...document.querySelectorAll("button,div,span,a")]
        .filter((e) => (e.innerText || "").trim() === n)
        .filter((e) => { for (let p = e; p; p = p.parentElement) { const q = getComputedStyle(p).position; if (q === "fixed" || q === "sticky") return false; } return true; });
      if (!hit.length) return false;
      hit[0].click();
      return true;
    }, name);
    if (ok) await settledText(page, { min: CHROME_ONLY, timeout: 45000 }).catch(() => {});
    return ok;
  };
  // "Reports" is "Send Reports" on a crag-only route, and Plan is content-gated, so a
  // sub-tab that is legitimately absent is reported rather than failed.
  for (const sub of ["Reports", "Photos", "Partners", "Plan", "Safety"]) {
    if (!(await tapSub(sub))) { log(`  route:${sub}`.padEnd(30) + "  sub-tab not present on this route"); continue; }
    await sweep("route:" + sub);
  }
}

// 2. Every overlay the app declares. Discovered from source via the shared scaffold, so a
//    modal added tomorrow is swept without anyone registering it here.
const overlays = ONLY ? [] : await page.evaluate(() => window.__overlays || []);
if (!overlays.length && !ONLY) {
  fail("scaffold", "no overlay states were discovered — the scaffold did not run, and nothing below was actually checked");
} else if (!ONLY) {
  log(`\n  ${overlays.length} overlay states discovered\n`);
}
if (!ONLY) assertKnownOverlays(overlays, fail);
// Some overlays are scoped to one screen, so opening them from the wrong tab renders
// nothing and the sweep would scan a bare tab and call it clean. Take the first tab where
// the overlay actually adds text — the same approach check:zero settled on.
const OVERLAY_TABS = ["me", "today", "crew", "logbook", "routes", "discover", "ranks"];
// Compare LINE SETS, not text length — the same test check:zero uses. Length is the wrong
// question: an overlay that replaces the tab's content rather than adding to it can leave
// the total the same or SHORTER, and a length test then reports a perfectly good modal as
// never mounted and silently drops it from the sweep. That is how coverage rots quietly.
const lines = () => page.evaluate(() => (document.body.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean));
const tabLines = {};
for (const t of ONLY ? [] : OVERLAY_TABS) {
  await load(`?zt=${t}`, 1200, true);
  tabLines[t] = new Set(await lines());
}
let opened = 0;
for (const name of overlays) {
  if (NEEDS_EXTRA_STATE[name]) {
    log(`  modal:${name}`.padEnd(30) + "  skipped — " + NEEDS_EXTRA_STATE[name]);
    continue;
  }
  let landed = false;
  for (const t of OVERLAY_TABS) {
    await load(`?zt=${t}&z=${name}`, 2600);
    const ls = await lines();
    if (ls.some((l) => !tabLines[t].has(l))) { landed = true; break; }
  }
  if (!landed) {
    // check:zero already fails on an overlay that mounts nowhere, and it is the guard that
    // owns that question. Repeating the failure here would just make one defect turn two
    // checks red; say it and move on, but do not count it as swept.
    log(`  modal:${name}`.padEnd(30) + "  did not mount on any tab — NOT swept (check:zero owns this)");
    continue;
  }
  opened++;
  await sweep("modal:" + name);
}

if (DUMP) { fs.writeFileSync(DUMP, JSON.stringify(dump, null, 1)); log(`\nwrote ${DUMP}`); }

await browser.close();
stopServer();

// Scanning nothing is not a pass. If no control anywhere produced even a CANDIDATE, the
// likeliest explanation is that the selector or the walker broke, not that the app suddenly
// has no multi-node controls. This is the counter that catches "injection logged, nothing
// moved".
if (!controlsScanned && !fails.length) {
  console.error("\ncheck:a11y-badges: scanned " + screensWalked + " screens and found NO candidate controls at all.");
  console.error("Every control in this app is assembled from multiple nodes, so zero candidates means the");
  console.error("scan is broken, not that the app is clean. Refusing to report a pass.\n");
  process.exit(1);
}

// Section 2 scans BOUNDARIES, not controls, so it needs its own floor: this app assembles text
// from many nodes on every screen, and zero boundaries examined means the walker broke rather
// than that the app is one big text node.
if (!boundariesExamined && !fails.length) {
  console.error("\ncheck:a11y-badges: section 2 examined NO cross-element text boundaries at all across " + screensWalked + " screens.");
  console.error("That is a broken walker, not a clean app. Refusing to report a pass.\n");
  process.exit(1);
}

if (foundOff.size) {
  console.error(`\ncheck:a11y-badges: ${foundOff.size} place(s) OFF a control read as one welded token:\n`);
  for (const f of foundOff.values()) {
    console.error(`  <${f.tag} style="${f.style}">  reads as ${JSON.stringify(f.needle)}  (a ${f.gap}px gap the a11y tree does not have)`);
    console.error(`      glued at ${JSON.stringify(f.before)} + ${JSON.stringify(f.after)}`);
    console.error(`      in: ${JSON.stringify(f.ctx)}`);
    console.error(`      seen on: ${[...f.screens].join(", ")}`);
  }
  console.error(`
These are not controls, so no aria-label applies -- there is no name to fix. Put a real
separator into the TEXT, or let layout supply one:

  {label}{" "}{cond ? <span style={{marginLeft:7}}>{value}</span> : null}

A margin is not a separator. Only a character in the text, or a block/flex boundary that makes
the browser insert one, changes what is read out.
`);
  process.exit(1);
}

if (found.size) {
  console.error(`\ncheck:a11y-badges: ${found.size} control(s) announce two fragments welded into one token:\n`);
  for (const f of found.values()) {
    console.error(`  <${f.tag}${f.role ? ` role=${f.role}` : ""}>  announced as ${JSON.stringify(f.name)}`);
    console.error(`      visible text ${JSON.stringify(f.text)}`);
    console.error(`      glued at ${JSON.stringify(f.before)} + ${JSON.stringify(f.after)}`);
    console.error(`      seen on: ${[...f.screens].join(", ")}`);
  }
  console.error(`
A screen reader reads the name as one token — "Friends2", not "Friends, 2"; or
"Nathan BarberAttempt", not "Nathan Barber, Attempt". The visible gap is CSS margin or a
flex gap, and the accessibility tree has neither.

Give the control an explicit name that separates them, the way #740 did:

  aria-label={count ? label + ", " + count : label}

Build that label FROM the same expression the chip renders, not from a restatement of it —
otherwise the announced name and the visible text drift apart the next time one is edited.

Restructuring the JSX will not help: the name algorithm concatenates descendant text either
way. Only an explicit name changes what is announced.
`);
  process.exit(1);
}

if (fails.length) {
  console.error(`\ncheck:a11y-badges: ${fails.length} problem(s):\n`);
  for (const f of fails) console.error("  " + f);
  console.error("");
  process.exit(1);
}

if (ONLY) {
  log(`\ncheck:a11y-badges: PARTIAL RUN (--only=${ONLY}) — ${screensWalked} screen(s) only, tabs and overlays SKIPPED.`);
  log(`  section 1: ${controlsScanned} control(s); section 2: ${boundariesExamined} boundar(ies). No findings.`);
  log("  This is not a pass. Run without --only before believing the app is clean.\n");
  process.exit(0);
}
log(`\ncheck:a11y-badges: ok — ${screensWalked} screens (${TABS.length} tabs, ${opened} overlays).`);
log(`  section 1: ${controlsScanned} multi-node control(s) scanned, none announce a glued name.`);
// Say what section 2 covered. A verdict naming only section 1 would leave the next reader
// unable to tell from the output that the off-control scan exists at all -- which is how a
// coverage hole gets rediscovered rather than read.
log(`  section 2: ${boundariesExamined} cross-element text boundar(ies) examined, none read as one welded token.\n`);
process.exit(0);

// INJECTION — scripts/oneoff/inject-glued-offcontrol-case.mjs, and re-run it after ANY change to
// section 2. It removes the {" "} from RouteDetail's conditions list, which is the tree that
// really shipped "Best windowmid-Jul to early Sep", and drives this guard with --only=route.
//
// SECTION 2 SHIPPED BROKEN AND EVERY SIGNAL SAID OTHERWISE. Its first version was a template
// literal, and inside one `\w` is an escape that collapses to a literal "w" -- so the needle
// regex was /w/ and the scan matched almost nothing. It reported a clean app across 65 screens.
// Nothing looked wrong: the guard was green before the widening and after it, the fail-closed
// floor was satisfied (it counts boundaries EXAMINED, which is a real number whether or not the
// needle logic works), and "0 findings" was the expected answer. Only the injection against a
// defect that had genuinely shipped told the truth.
//
// Two consequences worth keeping. The scan is a FUNCTION passed to page.evaluate, as
// findCandidates is, so neither the escaping trap nor the backtick trap can return. And a floor
// that counts work done is not evidence that the work was correct -- the same lesson
// check:dup-attrs records for its element counter.
