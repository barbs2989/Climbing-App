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

const screens = {};
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
