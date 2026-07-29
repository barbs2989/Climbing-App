#!/usr/bin/env node
// Drives the real app in a real browser and asserts things that must be true on
// every screen. Complements scripts/check-undefined-refs.mjs: that one catches
// unbound identifiers at build time, this one catches what only shows up once
// React actually renders.
//
// Why this exists. There is no test suite here, and the failure mode this repo
// keeps shipping is not a build error -- it is a screen that renders wrong or
// not at all:
//
//   PR #317  require("react") in lib/db.js            -> whole app blank
//   PR #359  PitchTable read App-scoped `comments`    -> blank on pitch expand
//   PR #362  hash-derived count over an undefined `n` -> "verified by NaN"
//   PR #365  a missing sibling grade                  -> the literal text "null"
//   PR #382  chatWith object used as a state key      -> "[object Object]"
//
// Each of those is caught by one of the invariants below.
//
// Deliberately NOT a stored text baseline. Route content changes daily as the
// catalog is enriched, so a byte-diff baseline would fail constantly and get
// ignored. These are invariants instead: they hold no matter what the data says.
//
//   npm run check:ui                  # spawn a dev server, check, exit 1 on failure
//   npm run check:ui -- --url <url>   # check an already-running server or prod
//   npm run check:ui -- --snapshot a.json   # also dump per-screen text, for A/B
//
// The --snapshot mode is how you prove a refactor is behaviour-neutral: dump
// before, dump after, diff the two files. Expect the clock inside ASPECT & SUN
// to differ between runs; nothing else should.

import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const argOf = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
const PORT = 5190;
const URL_ARG = argOf("--url");
const SNAPSHOT = argOf("--snapshot");
const ROUTE = argOf("--route") || "North Ridge (Complete)";
const STATE = argOf("--state") || "Washington";

// A screen with less text than this rendered nothing useful -- the blank-screen signal.
const MIN_CHARS = { default: 400, "route:Photos": 120, Home: 300 };

// Text that should never reach a user. Tuned to the bugs above; each entry is a
// regex plus a note on the shape it catches.
const FORBIDDEN = [
  [/\bNaN\b/, "NaN leaked into copy (a number computed from an undefined field)"],
  [/\[object Object\]/, "an object was used where a string/key was expected"],
  [/\bundefined\b/, "the literal 'undefined' rendered as text"],
  [/(^|[\s·:>(])null([\s·:<),.]|$)/, "the literal 'null' rendered as text"],
  [/\bInfinity\b/, "Infinity leaked into copy (a divide-by-zero)"],
];

// Landmarks that must be present, so a section quietly vanishing is a failure and
// not a silent pass. This is the check that catches deleting live code you believed
// was dead.
//
// Matched against whole trimmed LINES, never as substrings. A substring test here
// passes "RACK" on the strength of "ROUTE TRACK", which is precisely how a section
// disappears while the check stays green.
const LANDMARKS = {
  "route:Overview": ["Overview"],
  "route:Plan": ["GETTING THERE", "APPROACH", "ASPECT & SUN", "RACK"],
};

// Disclosure affordances: controls that reveal more of the screen they are on.
// Safe to click blind -- they add content, they never submit, send or delete.
//
// Everything above only ever sees a screen in its DEFAULT state, which is where
// this repo's bugs are NOT. Collapsed Home is ~570 chars; all three defects found
// in the Home audit (#381) lived inside these accordions or in a click handler:
//
//   #371  clicking a name in the activity feed -> onViewProfile is not defined
//   #377  crew chat "load older messages"      -> invalid hook call in onClick
//   #381  alerts list capped at 8 silently, feed count overstated 5.5x
//
// A handler that throws does NOT unmount React, so the app never blanks and the
// control just silently does nothing. capture() already asserts on pageErrors,
// so clicking a control and capturing is what turns that silence into a failure.
const DISCLOSURE = [
  /^\d+ updates?\s*[▾▸]?$/,     // "11 updates ▾"  (activity feed)
  /^Alerts( · \d+ new)?\s*[▾▸]?$/,
  /^Unfinished business( · \d+)?\s*[▾▸]?$/,
  /^View all \d+ \w+$/,                   // "View all 14 alerts"
  /^View \d+ more suggestions?$/,
  /^Suggested climbs( · \d+)?\s*[▾▸]?$/,
  /^\d+ (updates|reports|climbs)\s*[▾▸]$/,
];

// How many disclosures to exercise per screen. Bounds runtime; the screen is
// re-entered before each one so a control that navigates away cannot poison the
// rest of the sweep.
const MAX_DISCLOSURES = 4;

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

let server = null;
let base = URL_ARG;
if (!base) {
  base = `http://127.0.0.1:${PORT}/Climbing-App/`;
  log(`starting dev server on ${PORT}...`);
  server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "ignore" });
  if (!(await waitForServer(base))) { console.error("dev server never came up"); server.kill(); process.exit(1); }
  // First request compiles a ~1.5MB module; give it room before the browser asks.
  await fetch(base + "ClimbMatch.jsx").catch(() => {});
}
log(`checking ${base}`);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));

// Exact text, never a substring. Playwright's bare `text=Safety` also matches the
// phrase "safety-critical" inside a paragraph, and `text=Plan` matches a route
// titled "Plan 9 from Outer Space" -- in both cases the click "succeeds", the tab
// never opens, and the previous screen gets captured a second time. The
// identical-screen rule below is what surfaced this; the quoting is the fix.
const tap = async (text, i = 0) => {
  const els = await page.$$(`text="${text}"`);
  if (!els[i]) return false;
  await els[i].click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1600);
  return true;
};

// Leaf elements whose trimmed text matches a DISCLOSURE pattern, in DOM order.
//
// Requires the element or a near ancestor to be genuinely interactive. Without
// that, a plain caption matching one of the patterns gets clicked, changes
// nothing because it was never clickable, and is reported as a dead control.
const findDisclosures = () => page.evaluate((pats) => {
  const clickable = (el) => {
    for (let e = el, i = 0; e && i < 3; e = e.parentElement, i++) {
      if (e.tagName === "BUTTON" || getComputedStyle(e).cursor === "pointer") return true;
    }
    return false;
  };
  const res = [];
  for (const el of document.querySelectorAll("div,span,button,b")) {
    if (el.children.length !== 0) continue;
    const t = (el.textContent || "").trim();
    if (!t || t.length > 60) continue;
    if (!pats.some((p) => new RegExp(p).test(t))) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (!clickable(el)) continue;
    res.push(t);
  }
  return res;
}, DISCLOSURE.map((r) => r.source));

// Click by text, scrolling first and dispatching in-page.
//
// Do NOT click by viewport coordinate here: most of these controls sit below the
// fold on a 390x900 phone viewport, and a coordinate click then lands on whatever
// happens to be at that position -- or nothing. That reads back as "the control
// changed nothing", i.e. a working toggle reported as dead.
const clickText = (text) => page.evaluate((text) => {
  const el = [...document.querySelectorAll("div,span,button,b")]
    .find((e) => e.children.length === 0 && (e.textContent || "").trim() === text);
  if (!el) return false;
  el.scrollIntoView({ block: "center" });
  el.click();
  return true;
}, text);

// Names in a feed are rendered as <b> with cursor:pointer. Tapping one opens a
// profile -- the interaction that was dead for who knows how long in #371.
const tapAName = () => page.evaluate(() => {
  const b = [...document.querySelectorAll("b")].find((e) =>
    e.children.length === 0 && getComputedStyle(e).cursor === "pointer" && (e.textContent || "").trim().length > 1);
  if (!b) return null;
  const t = (b.textContent || "").trim();
  b.click();
  return t;
});

const screens = {};

// Expand each disclosure on `tab` and assert the revealed content is sane. Two
// invariants beyond the per-screen ones: the click must not raise an uncaught
// error, and it must actually change what is rendered -- a disclosure that
// changes nothing is a dead control, which is this repo's signature failure.
// Identified by TEXT, never by index. Accordion state is React state on App and
// survives tab switches, so the candidate list changes as the sweep opens things;
// indexing into a re-queried list clicks the wrong control and then reports a
// perfectly good toggle as dead.
async function sweepInteractive(tab) {
  const done = [];
  for (let i = 0; i < MAX_DISCLOSURES; i++) {
    // Start from a pristine reload every time. Some of these controls open a
    // modal, and an undismissed overlay swallows every later click -- which
    // reports working toggles as dead AND leaves the app wedged for the phases
    // after this one. A reload is the only reset that is actually total.
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
    await page.waitForTimeout(2500);
    await tap(tab);
    // Replay what we already opened, so disclosures nested inside another one
    // (e.g. "View all N alerts", which only exists once Alerts is expanded)
    // are still reachable from a clean start.
    for (const label of done) {
      if (await clickText(label)) await page.waitForTimeout(1200);
    }
    const target = (await findDisclosures()).find((t) => !done.includes(t));
    if (!target) return;
    done.push(target);
    const before = await page.innerText("body");
    pageErrors.length = 0;
    if (!(await clickText(target))) continue;
    await page.waitForTimeout(1800);
    const label = target.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
    const after = await page.innerText("body");
    if (after.trim() === before.trim()) {
      fail(`${tab}:${label}`, `tapping ${JSON.stringify(target)} changed nothing — the control is dead`);
      continue;
    }
    await capture(`${tab}:${label}`);
  }
}

async function capture(name) {
  pageErrors.length = 0;
  await page.waitForTimeout(900);
  // Wait out any async data fetch so we assert on the screen, not its spinner.
  for (let i = 0; i < 25; i++) {
    if (!/Loading climbs|Loading…/.test(await page.innerText("body"))) break;
    await page.waitForTimeout(1500);
  }
  const text = await page.innerText("body");
  screens[name] = text;
  const min = MIN_CHARS[name] ?? MIN_CHARS.default;
  if (text.length < min) fail(name, `rendered only ${text.length} chars (min ${min}) — blank or broken screen`);
  for (const [re, why] of FORBIDDEN) { const m = text.match(re); if (m) fail(name, `${why} — found ${JSON.stringify(m[0])}`); }
  const lines = new Set(text.split("\n").map((l) => l.trim()));
  for (const want of LANDMARKS[name] || []) { if (!lines.has(want)) fail(name, `expected section ${JSON.stringify(want)} is missing`); }
  for (const e of pageErrors) fail(name, `uncaught page error: ${e}`);
  const twin = Object.keys(screens).find((k) => k !== name && screens[k] === text);
  if (twin) fail(name, `identical to ${twin} — navigation did not happen, so this screen is unverified`);
  log(`  ${name}: ${text.length} chars`);
}

try {
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForTimeout(3500);

  log("main tabs:");
  for (const tab of ["Home", "Climbs", "Partners", "Crew", "Logbook", "Ranks", "Profile"]) {
    if (!(await tap(tab))) { fail(tab, "tab is not reachable"); continue; }
    await capture(tab);
  }

  // Everything above checked default state. This walks one interaction deep,
  // where the last three sessions' worth of real bugs actually were.
  log("interactive state:");
  for (const tab of ["Home", "Crew", "Logbook", "Ranks", "Profile"]) {
    await sweepInteractive(tab);
  }

  // Tapping a person's name in the Home activity feed: dead from #371 until it
  // was found by a static scan, because a throwing handler is invisible.
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForTimeout(2500);
  await tap("Home");
  const feed = (await findDisclosures()).find((t) => /updates?/.test(t));
  if (feed) {
    await clickText(feed);
    await page.waitForTimeout(1600);
    pageErrors.length = 0;
    const who = await tapAName();
    if (!who) {
      log("  (no tappable name in the activity feed — profile-open path unchecked)");
    } else {
      await page.waitForTimeout(1600);
      await capture(`Home:profile-of-${who.split(" ")[0]}`);
    }
  }

  // The sweep above deliberately opens things. Reload so the route phase starts
  // from a known state rather than inheriting an open modal.
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForTimeout(3000);

  log("route detail:");
  await tap("Climbs");
  for (let i = 0; i < 25; i++) { if (!/Loading climbs/.test(await page.innerText("body"))) break; await page.waitForTimeout(1500); }
  const sel = await page.$("select");
  if (sel) { await sel.selectOption({ label: STATE }).catch(() => {}); await page.waitForTimeout(3000); }
  await tap("Routes");
  const input = await page.$('input[type="text"], input:not([type])');
  if (input) { await input.fill(ROUTE); await page.waitForTimeout(3000); }
  if (!(await tap(ROUTE))) {
    fail("route", `could not open the sample route ${JSON.stringify(ROUTE)}`);
  } else {
    await page.waitForTimeout(2500);
    // If the route page threw during render, React unmounts the tree and every
    // sub-tab tap below quietly finds nothing. Name that failure for what it is.
    const opened = await page.innerText("body");
    if (opened.length < MIN_CHARS.default) {
      fail("route", `the route page blanked after opening (${opened.length} chars) — a component threw during render`);
      for (const e of pageErrors) fail("route", `uncaught page error: ${e}`);
    }
    for (const sub of ["Overview", "Plan", "Safety", "Photos"]) {
      if (!(await tap(sub))) continue;   // not every route exposes every sub-tab
      await capture("route:" + sub);
    }
    // Expanding a pitch is its own render path, and the one that blanked in #359.
    await tap("Overview");
    await page.waitForTimeout(1500);
    const expanded = await page.evaluate(() => {
      let t = null;
      document.querySelectorAll("div,span").forEach((e) => { if (!t && e.children.length === 0 && /^.?\s*more$/.test((e.textContent || "").trim())) t = e; });
      if (!t) return false;
      (t.parentElement || t).click();
      return true;
    });
    if (expanded) { await page.waitForTimeout(2000); await capture("route:pitch-expanded"); }
    else fail("route:pitch-expanded", `no expandable pitch found on ${JSON.stringify(ROUTE)} — the pitch-expand render path went unchecked`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}

if (SNAPSHOT) { fs.writeFileSync(SNAPSHOT, JSON.stringify(screens, null, 1)); log(`\nwrote ${SNAPSHOT} (${Object.keys(screens).length} screens)`); }

if (!fails.length) { log(`\nAll ${Object.keys(screens).length} screens OK.\n`); process.exit(0); }
console.error(`\n${fails.length} UI check failure(s):\n`);
for (const f of fails) console.error("  " + f);
console.error("");
process.exit(1);
