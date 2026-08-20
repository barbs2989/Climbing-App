#!/usr/bin/env node
// Walks the app as a BRAND-NEW ACCOUNT sees it: every count zero, every list empty.
//
// Why this exists. check:ui walks the seeded demo -- bookmarks are pre-saved, a crew
// exists, friendReqIn is [5], crewUnread is {crew_seed_tingey:2} -- so every branch
// that only runs when a count is zero is dead ground to it. It also stops one
// interaction in, and it never opens a modal. Four rounds of bugs lived in that gap,
// all of them invisible to a green check:ui:
//
//   #637  Home dropped 3 of 4 tiles and the whole Unfinished business dropdown
//   #654  a catch ledger reading "Last verified catch: · 0 partners confirmed";
//         the demo climber's 950 ft/hr shown as a new user's own pace
//   #662  four Suspense boundaries with fallback={null} -- a blank content area
//   #674  the share card mailing, texting and tweeting the word "undefined"
//
// The pattern in all of them: a section that is correct with data becomes a lie, a
// dangling label, or a dead end at zero.
//
//   npm run check:zero
//   npm run check:zero -- --dump out.json   # per-screen text, for A/B diffing
//
// Runs on every pull request via .github/workflows/zero-state.yml -- its own workflow,
// not a step in build-check.yml and not in deploy.yml, so a browser flake cannot read as
// "the build is broken" or block a deploy. That mirrors how check:ui is treated.
//
// It is NOT in `npm run build`, so a local build will not catch a regression here. Run it
// by hand before merging anything that touches the render tree; CI is the backstop.
//
// playwright-core downloads no browser, so this drives the Google Chrome that ships on
// the ubuntu-latest runner image. If that image ever stops including Chrome, the workflow
// fails on an explicit check rather than inside playwright's launcher.
//
// The zero state is forced by scripts/zero-state.config.mjs, which replays the app's
// OWN sign-in reset in memory. It does not edit source and it never ships.

import { NEEDS_EXTRA_STATE, assertKnownOverlays } from "./lib/overlay-scaffold.mjs";
import { settledText, spinnerCoverage } from "./lib/render-settle.mjs";
import { assertDbReachable } from "./lib/db-preflight.mjs";
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
const PORT = 5230;
const TABS = ["today", "routes", "discover", "crew", "logbook", "me"];

// Text that must never reach a user. The first five mirror check:ui; the rest are the
// shapes that only appear once every field behind them is empty.
const FORBIDDEN = [
  [/\bNaN\b/, "NaN leaked into copy (a number computed from an undefined field)"],
  [/\[object Object\]/, "an object was used where a string/key was expected"],
  [/\bundefined\b/, "the literal 'undefined' rendered as text"],
  [/(^|[\s·:>(])null([\s·:<),.]|$)/, "the literal 'null' rendered as text"],
  [/\bInfinity\b/, "Infinity leaked into copy (a divide-by-zero)"],
  // "Climber — undefined climber · " (#674): the separator survived, the value did not.
  [/·\s*$/m, "a line ends in '·' — a separator was printed for a value that is missing"],
  [/·\s*·/, "two separators in a row — an empty value between them"],
  // "Off shows your username (@) to others." (#674)
  [/\(@\)/, "an empty @handle — the parenthetical was printed with nothing in it"],
  // "Last verified catch: · 0 partners confirmed" (#654)
  [/:\s*·/, "a label with a separator but no value"],
  // "0 total · 0 high-factor · last none logged" (#674)
  [/\blast none\b/, "a 'last X' clause rendered with no X"],
];

// Landmarks that must still be on screen AT ZERO. Matched against whole trimmed lines,
// never substrings -- a substring test passes "RACK" on the strength of "ROUTE TRACK",
// which is how a live section disappears while the check stays green.
const ZERO_LANDMARKS = {
  // #637: these four tiles and the dropdown used to be filtered out when their count
  // was 0, which is exactly when a new user needs them.
  "tab:today": ["Explore climbs", "Find partners", "Find crews", "Unfinished business"],
  // The dropdown has to say what it is empty OF. It used to read "Nothing waiting on you
  // right now", a near-copy of the "Nothing needs you right now" card immediately below it.
  "modal:unfinishedOpen": ["No requests, invites or unread messages."],
};

// Controls that must NOT be offered at zero, because acting on them produces or shares
// something blank. Also whole-line matches.
const FORBIDDEN_LANDMARKS = {
  // #674: a share block on a year of all zeros. Also the near-duplicate empty copy the
  // Unfinished business dropdown used to carry.
  "modal:recapOpen": ["Share your year", "Copy my year", "↗ Share…"],
  "modal:unfinishedOpen": ["Nothing waiting on you right now."],
};

const log = (...a) => console.log(...a);
const fails = [];
const fail = (screen, msg) => fails.push(`${screen}: ${msg}`);

// Browserless and instant, and it runs here because this is the guard CI actually runs on
// every PR: confirm the settle helper's spinner pattern still matches the app's own loading
// strings. It cannot prove coverage of a spinner worded some new way -- see the note in
// render-settle.mjs -- but it does stop SPINNER_RE being narrowed until it matches nothing,
// which would let every guard read a spinner as a settled screen.
try {
  for (const [s, f] of spinnerCoverage(ROOT).uncovered) {
    fail("spinner-coverage", `${JSON.stringify(s)} in ${f} is no longer matched by SPINNER_RE, so a screen showing it reads as settled`);
  }
} catch (e) {
  fail("spinner-coverage", e.message);
}

// Icon NAMES the codebase assigns to a notification's `icon` field. Rendering one of
// these as bare text means an ActionIcon name reached the DOM as a word -- #674, where
// notification rows read "user" and "crews" instead of showing an icon. Derived from
// source so a newly-added icon name is covered without editing this list.
function iconNames() {
  const names = new Set();
  for (const f of ["ClimbMatch.jsx", "ClimbMatchCore.jsx"]) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const m of src.matchAll(/icon:"([a-z][a-z0-9]*)"/g)) names.add(m[1]);
  }
  return names;
}

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

// Same reasoning as check:ui: several jobs run in this repo at once, and a squatter on a
// hardcoded port can serve a DIFFERENT checkout that passes or fails for its own reasons.
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

// This walk asserts that no screen is STILL LOADING, so an unreachable catalog fails it by
// definition — and the failure it printed during the 2026-08-13 outage was
// `2 problem(s) a brand-new account would see: still showing a loading state after 45s`.
// The symptom is honest; the attribution is not. No brand-new account would see that, the
// database was down. Ask first, so the run says which of the two it is.
await assertDbReachable({ label: "check:zero" });
const port = await claimPort(PORT);
if (port === null) { console.error(`no free port in ${PORT}-${PORT + 39}`); process.exit(1); }
if (port !== PORT) log(`port ${PORT} is in use by another process — using ${port} instead`);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
log(`starting dev server on ${port} with the zero-state config...`);
// detached puts vite in its own process group. `npx` spawns vite as a CHILD, so killing
// only the npx pid leaves the real server listening -- a leaked dev server then squats the
// port for every later run, and (worse) can answer for a DIFFERENT checkout. Kill the group.
const server = spawn(
  "npx",
  ["vite", "--config", "scripts/zero-state.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
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
// Any exit path -- assertion failure, thrown error, Ctrl-C -- must still release the port.
process.on("exit", stopServer);
process.on("SIGINT", () => { stopServer(); process.exit(130); });
process.on("SIGTERM", () => { stopServer(); process.exit(143); });
process.on("uncaughtException", (e) => { console.error(e); stopServer(); process.exit(1); });
if (!(await waitForServer(base)) || died) {
  console.error(died ? "the dev server exited during startup — port taken, or the scaffold failed to apply" : "dev server never came up");
  stopServer(); process.exit(1);
}
await fetch(base + "ClimbMatch.jsx").catch(() => {});

// playwright-core ships no browser, so a missing Chrome is a setup problem, not a bug in
// the app. Say which it is instead of surfacing a launcher stack trace.
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
// The first navigation compiles a ~1.5MB module. Playwright's 30s default is not enough
// for that on a loaded machine or a cold CI runner, and the timeout surfaces as a thrown
// TimeoutError -- which reads as a broken app rather than a slow one.
page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(30000);
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));

// No de-duplication. Collapsing repeated text nodes turns "You're #5 of 5" into
// "You're #5 of" and reports the app as broken when the extractor is.
//
// An element whose children are ALL text is emitted as one line, not one line per node.
// `(@{ME.username})` with an empty username is two adjacent text nodes, "(@" and ")" --
// split across lines, no pattern can see the empty parenthetical that a user reads as
// "(@)". Joining at the element boundary is what the user actually sees on one line.
const visibleText = () => page.evaluate(() => {
  const out = [];
  const walk = (n) => {
    if (n.nodeType === 3) { const t = n.textContent.trim(); if (t) out.push(t); return; }
    if (n.nodeType !== 1) return;
    const st = getComputedStyle(n);
    if (st.display === "none" || st.visibility === "hidden") return;
    const kids = [...n.childNodes];
    if (kids.length > 1 && kids.every((c) => c.nodeType === 3)) {
      const t = kids.map((c) => c.textContent).join("").trim();
      if (t) out.push(t);
      return;
    }
    for (const c of kids) walk(c);
  };
  walk(document.body);
  return out;
});

// `__zeroReady` fires when App mounts, which is BEFORE lazy children resolve and before a
// cold dev server has finished compiling the screen. On the first navigations of a run
// that gap is wide enough that only the nav bar has rendered -- which reads as "the screen
// blanked" when it was still loading. Where content is expected, wait for it.
const CHROME_ONLY = 90; // the wordmark + seven nav labels, and nothing else

async function load(qs, settle, expectContent) {
  // If vite dies mid-walk, every remaining screen renders as the bare shell and this check
  // would report a pile of blank-screen failures against code that is fine. Say what
  // actually happened instead, and stop -- nothing after this point is evidence.
  if (died) {
    console.error("\nthe dev server exited part-way through the walk — every result after that point");
    console.error("would be an empty page, so nothing below was actually checked.");
    stopServer();
    process.exit(1);
  }
  // 120s, not the 30s default: the Climbs tab lazily imports DbAreaBrowser, and the dev
  // server compiles that chunk on the first request for it. The ClimbMatch.jsx warm-up
  // above does not cover lazy children, so a cold, loaded machine blows the default and
  // the run dies on ?zt=routes before checking anything. (Belt and braces with
  // setDefaultNavigationTimeout above -- this one survives someone resetting the default.)
  await page.goto(base + qs, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__overlaysReady === true, null, { timeout: 60000 }).catch(() => {});
  if (expectContent) {
    // Length alone is not enough: a Suspense fallback ("Loading climbs…") clears the
    // length bar while the screen is still empty, so the walk would check the spinner and
    // report the tab green. The Climbs tab is lazy AND waits on a DB round trip.
    //
    // This check had the right idea first and the other two guards have now been brought
    // onto it, so the definition of "settled" lives in one place. Two things came back the
    // other way: it also waits for the text to stop CHANGING, which catches a screen that
    // is slow rather than spinning, and the pattern gained a word boundary -- the local
    // one matched "Downloading…", a button label, and would have waited it out as though
    // the page were still loading.
    await settledText(page, { min: CHROME_ONLY, timeout: 45000 });
  }
  await page.waitForTimeout(settle);
  return await visibleText();
}

const ICONS = iconNames();
const dump = {};

function assertScreen(label, lines) {
  const text = lines.join("\n");
  if (lines.length === 0) { fail(label, "rendered no visible text at all"); return; }
  for (const [re, why] of FORBIDDEN) {
    const m = text.match(re);
    if (m) fail(label, `${why} — ${JSON.stringify((m[0] || "").slice(0, 60))}`);
  }
  const bare = lines.filter((l) => ICONS.has(l));
  if (bare.length) fail(label, `an icon name rendered as text: ${JSON.stringify([...new Set(bare)])}`);
  for (const want of ZERO_LANDMARKS[label] || []) {
    if (!lines.includes(want)) fail(label, `landmark missing at zero: ${JSON.stringify(want)}`);
  }
  for (const nope of FORBIDDEN_LANDMARKS[label] || []) {
    if (lines.includes(nope)) fail(label, `offered at zero when there is nothing behind it: ${JSON.stringify(nope)}`);
  }
}

// A first navigation against a cold dev server pays for compiling the whole module graph.
// Do that once, unmeasured, so the first tab in the walk is not the one that absorbs it.
log("warming the dev server...");
await load("?zt=today", 1500, true);

// 1. Every main tab, empty.
for (const t of TABS) {
  const lines = await load(`?zt=${t}`, 2600, true);
  dump["tab:" + t] = lines;
  const n = lines.join("\n").length;
  log(`  tab:${t}`.padEnd(24) + String(n).padStart(6) + " chars");
  // A tab that renders the nav bar and nothing else is the blank-screen bug (#662), and
  // without this it would show up only as a small number nobody reads.
  if (n <= CHROME_ONLY) fail("tab:" + t, `rendered only the nav bar (${n} chars) — the content area was empty`);
  // Still spinning after 45s is the #658 shape: a screen that never admits it is stuck.
  if (lines.some((l) => /^Loading[\s.…]/i.test(l))) fail("tab:" + t, `still showing a loading state after 45s: ${JSON.stringify(lines.find((l) => /^Loading[\s.…]/i.test(l)))}`);
  assertScreen("tab:" + t, lines);
}

// 2. Every overlay the app declares. The list comes from the source via the scaffold,
//    so a modal added later is walked without being registered here.
const overlays = await page.evaluate(() => window.__overlays || []);
if (!overlays.length) {
  fail("scaffold", "no overlay states were discovered — the scaffold did not run, and nothing below was actually checked");
} else {
  log(`\n  ${overlays.length} overlay states discovered\n`);
}
// Most overlays are rendered from a global modal stack and appear on any tab, but some are
// scoped to one screen -- the Unfinished business dropdown only exists on Home. Opening
// those from the wrong tab renders nothing, and the walk would then check the bare tab and
// report it green. So: take the first tab where the overlay actually ADDS something.
//
// An overlay that adds nothing on ANY tab is a FAILURE, not a note. Logging and carrying on
// is how areaTreeOpen, crewListOpen, unfinishedOpen and alertsOpen came to be counted as
// walked without ever mounting -- including the Unfinished business dropdown, i.e. the
// thing #637 broke. Overlays that genuinely cannot be reached by flag alone are exempt BY
// NAME in NEEDS_EXTRA_STATE, each recording its real gate, and a name there that stops
// being an overlay fails, so the exemption list cannot rot in silence.
const _maskDigits = (l) => String(l).replace(/\d+/g, "#");
const OVERLAY_TABS = ["me", "today", "crew", "logbook", "routes", "discover"];
assertKnownOverlays(overlays, fail);
const noPayload = new Set();
for (const name of overlays) {
  if (NEEDS_EXTRA_STATE[name]) {
    log(`  modal:${name}`.padEnd(24) + "   skipped — " + NEEDS_EXTRA_STATE[name]);
    continue;
  }
  let landed = null, empty = null, threw = null;
  for (const t of OVERLAY_TABS) {
    const lines = await load(`?zt=${t}&z=${name}`, 3400);
    // Ask the opener what happened before judging the screen. A modal that resolves an id
    // against an empty list renders nothing on every tab, and is indistinguishable from a
    // broken one by looking at the page — a brand-new account has no crew to invite anyone
    // to, and that is correct behaviour, not a defect.
    const d = await page.evaluate((n) => ({
      np: (window.__overlayNoPayload || {})[n], er: (window.__overlayOpenErrors || {})[n],
    }), name);
    if (d.er) { threw = d.er; break; }
    if (d.np) { empty = d.np; break; }
    // Mask digits, for the reason render-settle.mjs already states: it "absorbs a clock and a
    // CountUp without absorbing a section that appeared". Raw line sets do NOT survive an
    // animated counter. The Profile tab's Trust score is a <CountUp/>, so between the closed
    // baseline and this capture it can land on a different number -- one differing line, "19",
    // is enough to declare the overlay mounted HERE and `break` before ever trying the tab that
    // owns it. Measured on main @ ebd16d9: `modal:unfinishedOpen` was captured on the Profile
    // tab and failed for a landmark that lives on Home, and the ONLY novel line was "19".
    // `landed.lines` keeps the RAW text, so landmark assertions still read real content.
    const before = new Set((dump["tab:" + t] || []).map(_maskDigits));
    if (lines.some((l) => !before.has(_maskDigits(l)))) { landed = { tab: t, lines }; break; }
  }
  if (threw) {
    fail("modal:" + name, `the opener threw while building its payload: ${threw}`);
    continue;
  }
  if (empty) {
    noPayload.add(name);
    log(`  modal:${name}`.padEnd(24) + "   skipped — nothing to open it about at zero: " + empty);
    continue;
  }
  if (!landed) {
    fail("modal:" + name, `added nothing on any of ${OVERLAY_TABS.length} tabs — it never rendered, so it is unverified`);
    continue;
  }
  dump["modal:" + name] = landed.lines;
  log(`  modal:${name}`.padEnd(24) + String(landed.lines.join("\n").length).padStart(6) + ` chars  (${landed.tab})`);
  assertScreen("modal:" + name, landed.lines);
}

if (pageErrors.length) fail("page", `uncaught error(s): ${[...new Set(pageErrors)].join(" | ")}`);

if (DUMP) { fs.writeFileSync(DUMP, JSON.stringify(dump, null, 1)); log(`\nwrote ${DUMP}`); }

await browser.close();
stopServer();

if (!fails.length) {
  const _skipped=overlays.filter((n)=>NEEDS_EXTRA_STATE[n]||noPayload.has(n)).length;
  // Say how many were actually opened, not how many exist. Counting the skipped ones as
  // walked is the same overstatement that let four unopened overlays read as checked.
  log(`\ncheck:zero: ok — ${TABS.length} tabs and ${overlays.length-_skipped} overlays hold up with every count at zero${_skipped?` (${_skipped} skipped, gated on state the opener cannot set)`:""}.\n`);
  process.exit(0);
}
console.error(`\ncheck:zero: ${fails.length} problem(s) a brand-new account would see:\n`);
for (const f of fails) console.error("  " + f);
console.error("");
process.exit(1);
