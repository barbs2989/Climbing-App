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
// Not wired into `npm run build`, and not in CI, for the same reason check:ui is not:
// browser automation is too slow and flaky to sit in front of a production deploy, and
// the repo depends on playwright-core, which ships no browser for a runner to drive.
// Run it by hand before merging anything that touches the render tree.
//
// That is a real limitation, not a preference. A guard nobody runs is a guard you do
// not have -- so if this starts getting skipped, the fix is a browser in CI, not a
// weaker check.
//
// The zero state is forced by scripts/zero-state.config.mjs, which replays the app's
// OWN sign-in reset in memory. It does not edit source and it never ships.

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
};

// Controls that must NOT be offered at zero, because acting on them produces or shares
// something blank. Also whole-line matches.
const FORBIDDEN_LANDMARKS = {
  // #674: Instagram / Copy link / Share… on a year of all zeros.
  "modal:recapOpen": ["Share your year", "Instagram"],
};

const log = (...a) => console.log(...a);
const fails = [];
const fail = (screen, msg) => fails.push(`${screen}: ${msg}`);

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

const port = await claimPort(PORT);
if (port === null) { console.error(`no free port in ${PORT}-${PORT + 39}`); process.exit(1); }
if (port !== PORT) log(`port ${PORT} is in use by another process — using ${port} instead`);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
log(`starting dev server on ${port} with the zero-state config...`);
const server = spawn(
  "npx",
  ["vite", "--config", "scripts/zero-state.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } }
);
let died = false;
server.on("exit", () => { died = true; });
if (!(await waitForServer(base)) || died) {
  console.error(died ? "the dev server exited during startup — port taken, or the scaffold failed to apply" : "dev server never came up");
  server.kill(); process.exit(1);
}
await fetch(base + "ClimbMatch.jsx").catch(() => {});

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
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

async function load(qs, settle) {
  await page.goto(base + qs, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__zeroReady === true, null, { timeout: 60000 }).catch(() => {});
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

// 1. Every main tab, empty.
for (const t of TABS) {
  const lines = await load(`?zt=${t}`, 2600);
  dump["tab:" + t] = lines;
  log(`  tab:${t}`.padEnd(24) + String(lines.join("\n").length).padStart(6) + " chars");
  assertScreen("tab:" + t, lines);
}

// 2. Every overlay the app declares. The list comes from the source via the scaffold,
//    so a modal added later is walked without being registered here.
const overlays = await page.evaluate(() => window.__zeroOverlays || []);
if (!overlays.length) {
  fail("scaffold", "no overlay states were discovered — the scaffold did not run, and nothing below was actually checked");
} else {
  log(`\n  ${overlays.length} overlay states discovered\n`);
}
for (const name of overlays) {
  const lines = await load(`?zt=me&z=${name}`, 3400);
  dump["modal:" + name] = lines;
  log(`  modal:${name}`.padEnd(24) + String(lines.join("\n").length).padStart(6) + " chars");
  assertScreen("modal:" + name, lines);
}

if (pageErrors.length) fail("page", `uncaught error(s): ${[...new Set(pageErrors)].join(" | ")}`);

if (DUMP) { fs.writeFileSync(DUMP, JSON.stringify(dump, null, 1)); log(`\nwrote ${DUMP}`); }

await browser.close();
server.kill();

if (!fails.length) {
  log(`\ncheck:zero: ok — ${TABS.length} tabs and ${overlays.length} overlays hold up with every count at zero.\n`);
  process.exit(0);
}
console.error(`\ncheck:zero: ${fails.length} problem(s) a brand-new account would see:\n`);
for (const f of fails) console.error("  " + f);
console.error("");
process.exit(1);
