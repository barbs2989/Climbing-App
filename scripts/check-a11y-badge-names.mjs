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
//   - The route detail screen. It is reached by clicking a card, not by URL, and the shared
//     scaffold only opens tabs and overlays. Its sub-tab bar carries no counts today.
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
const TABS = ["today", "routes", "discover", "crew", "logbook", "me"];
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
      let needle = null;
      if (/[A-Za-z]/.test(a) && /[0-9]/.test(b)) needle = (prev.match(/[A-Za-z]+$/) || [""])[0] + (cur.match(/^[0-9]+/) || [""])[0];
      else if (/[0-9]/.test(a) && /[A-Za-z]/.test(b)) needle = (prev.match(/[0-9]+$/) || [""])[0] + (cur.match(/^[A-Za-z]+/) || [""])[0];
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

async function sweep(label) {
  const cands = await findCandidates();
  controlsScanned += cands.length;
  const confirmed = await confirm(cands);
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
for (const t of TABS) {
  await load(`?zt=${t}`, 2200, true);
  await sweep("tab:" + t);
}

// 2. Every overlay the app declares. Discovered from source via the shared scaffold, so a
//    modal added tomorrow is swept without anyone registering it here.
const overlays = await page.evaluate(() => window.__overlays || []);
if (!overlays.length) {
  fail("scaffold", "no overlay states were discovered — the scaffold did not run, and nothing below was actually checked");
} else {
  log(`\n  ${overlays.length} overlay states discovered\n`);
}
assertKnownOverlays(overlays, fail);
// Some overlays are scoped to one screen, so opening them from the wrong tab renders
// nothing and the sweep would scan a bare tab and call it clean. Take the first tab where
// the overlay actually adds text — the same approach check:zero settled on.
const OVERLAY_TABS = ["me", "today", "crew", "logbook", "routes", "discover"];
// Compare LINE SETS, not text length — the same test check:zero uses. Length is the wrong
// question: an overlay that replaces the tab's content rather than adding to it can leave
// the total the same or SHORTER, and a length test then reports a perfectly good modal as
// never mounted and silently drops it from the sweep. That is how coverage rots quietly.
const lines = () => page.evaluate(() => (document.body.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean));
const tabLines = {};
for (const t of OVERLAY_TABS) {
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

if (found.size) {
  console.error(`\ncheck:a11y-badges: ${found.size} control(s) announce a count welded to their label:\n`);
  for (const f of found.values()) {
    console.error(`  <${f.tag}${f.role ? ` role=${f.role}` : ""}>  announced as ${JSON.stringify(f.name)}`);
    console.error(`      visible text ${JSON.stringify(f.text)}`);
    console.error(`      glued at ${JSON.stringify(f.before)} + ${JSON.stringify(f.after)}`);
    console.error(`      seen on: ${[...f.screens].join(", ")}`);
  }
  console.error(`
A screen reader reads the name as one token — "Friends2", not "Friends, 2". The visible gap
is CSS margin, and the accessibility tree has no margins.

Give the control an explicit name that separates them, the way #740 did:

  aria-label={count ? label + ", " + count : label}

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

log(`\ncheck:a11y-badges: ok — ${screensWalked} screens (${TABS.length} tabs, ${opened} overlays), ${controlsScanned} multi-node control(s) scanned, none announce a glued count.\n`);
process.exit(0);
