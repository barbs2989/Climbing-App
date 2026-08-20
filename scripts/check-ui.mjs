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
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { settledText, spinnerCoverage, looksLikeSpinner } from "./lib/render-settle.mjs";
import { assertDbReachable, probeDbLatency } from "./lib/db-preflight.mjs";
import { tapByName as tapByNameOn } from "./lib/tap-by-name.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const argOf = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
const PORT = 5190;
const URL_ARG = argOf("--url");
const SNAPSHOT = argOf("--snapshot");
// The sample route must exist in whichever catalog the dev server will actually
// serve. With DB creds the app searches Supabase; without them (worktrees, CI,
// fresh clones) it searches the seed ROUTES, where no DB route name exists — so
// mirror lib/supabase.js's USE_DB gate against the same env files vite loads.
const envFile = (f) => { try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { return ""; } };
const envText = envFile(".env") + "\n" + envFile(".env.local");
const envVal = (k) => process.env[k] ?? (envText.match(new RegExp("^\\s*" + k + "\\s*=\\s*(\\S+)", "m")) || [])[1];
const USE_DB = envVal("VITE_USE_DB") === "true" && !!envVal("VITE_SUPABASE_URL") && !!envVal("VITE_SUPABASE_ANON_KEY");
// Local env describes the dev server this script SPAWNS. It says nothing about an app
// served from somewhere else, so with --url the sample is resolved from the running app
// instead (see the probe below). Checking production picked the seed-only "West Slabs",
// failed to open it, and reported "could not open the sample route" -- which reads as a
// broken deploy when nothing is wrong.
let ROUTE = argOf("--route") || (USE_DB ? "North Ridge (Complete)" : "West Slabs");
let STATE = argOf("--state") || (USE_DB ? "Washington" : "Utah");

// A screen with less text than this rendered nothing useful -- the blank-screen signal.
// "Crew:Groups" is legitimately the shortest screen in the app: the demo has joined no
// groups, so it is a heading, one explanatory line and two CTAs -- a correct and complete
// empty state, measured at 353 chars. The floor is set just under that rather than at the
// 400 default, which would fail a working screen. It stays a real floor: the nav chrome
// alone is ~90 chars, so a blank content area still trips it.
const MIN_CHARS = { default: 400, "route:Photos": 120, Home: 300, "Crew:Groups": 300 };

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
  // The Year in Climbing banner is the ONLY opener of that modal, and until #713 it was
  // gated on MY_CLIMBS.length — a constant DEMO_FILLERS empties — so the whole modal was
  // unreachable and nothing said so. check:dead-flag-gates catches a re-gating onto a dead
  // constant; this catches the banner simply disappearing. Built from the current year
  // because the label carries it, so this does not rot every January.
  Profile: [`Your ${new Date().getFullYear()} Year in Climbing`],
  // The Crew sub-views, unreachable to this check until #740/#755 named their buttons.
  //
  // "PEOPLE YOU'VE CLIMBED WITH" is the surface #713 revived: it used to map over
  // MY_CLIMBS, a constant that DEMO_FILLERS empties, so it could never render and nobody
  // noticed. It now derives from the user's real `logs`, and until now NOTHING rendered it
  // in a guard -- check:dead-flag-gates proves the constant is not dead, which is a
  // different question from whether the section reaches a screen. Uppercase and with a
  // curly apostrophe because innerText returns the CSS-transformed text, not the source
  // string.
  "Crew:Friends": ["PEOPLE YOU’VE CLIMBED WITH", "FRIENDS’ RECENT ACTIVITY"],
  // Descriptive lines rather than counts: "CREW INVITES (1)" moves with the seed data and
  // would rot into a false failure the first time somebody adds an invite.
  "Crew:Groups": ["Standing communities with their own calendar, events, and members. Search, join, or start your own."],
  "Crew:Requests": ["Friend requests, crew invites, and group activity waiting on you."],
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

// Cheap, browserless, and runs before anything is spawned: confirm the spinner pattern the
// settle helper uses still matches the app's own loading strings. It cannot prove coverage
// of a spinner worded some new way -- see the note in render-settle.mjs -- but it does stop
// SPINNER_RE being narrowed until it silently matches nothing.
try {
  // ROOT, not cwd. The tool check:field-renders replaced measured a different worktree
  // than the one you ran it in; a scan that resolves its own sources relative to the
  // script cannot drift that way.
  const cov = spinnerCoverage(ROOT);
  if (cov.uncovered.length) {
    for (const [s, f] of cov.uncovered) fail("spinner-coverage", `${JSON.stringify(s)} in ${f} is no longer matched by SPINNER_RE, so a screen showing it reads as settled`);
  }
} catch (e) {
  fail("spinner-coverage", `${e.message}`);
}

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

// Claim a port we can actually bind, rather than assuming 5190 is ours.
//
// This check used to spawn vite with --strictPort on a hardcoded 5190 and then poll
// the URL until *something* answered. When another process already held the port,
// vite exited and the poll was satisfied by the squatter -- so the run silently drove
// a different checkout. That is how it happened: a leaked dev server from a parallel
// background job's worktree, running with .env present, served its own branch in DB
// mode while this check believed it was testing seed data here. It failed on a route
// name that only differs between the two catalogs ("West Slabs" vs "The West Slabs"),
// which reads as a real defect and is not one.
//
// A false failure is the benign half. The same squatter can serve a page that passes,
// and then the check reports green for code it never loaded.
//
// Several jobs run in this repo at once, so refusing to start on a busy port would
// just move the problem. Take the next free one instead.
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

// Ask the database one cheap question before spawning anything. This walk opens a DB route
// BY NAME, so with the catalog unreachable it cannot succeed — and what it printed during the
// 2026-08-13 outage was `could not choose a country — "United States" was not among the
// options`, which reads as a broken area picker. Six minutes to produce a message pointing at
// the wrong thing. Naming the real cause in twenty seconds is the whole gain.
//
// Skipped with --url on purpose: local env describes the server this script SPAWNS and says
// nothing about an app served from somewhere else, exactly as the sample-route note above
// records. Aborting a production check on the strength of a local dotfile would be its own
// false failure.
if (!URL_ARG) await assertDbReachable({ label: "check:ui" });
let server = null;
let base = URL_ARG;
if (!base) {
  const port = await claimPort(PORT);
  if (port === null) { console.error(`no free port in ${PORT}-${PORT + 39}`); process.exit(1); }
  if (port !== PORT) log(`port ${PORT} is in use by another process — using ${port} instead`);
  base = `http://127.0.0.1:${port}/Climbing-App/`;
  log(`starting dev server on ${port}...`);
  // VITE_DEMO_AUTOLOGIN keeps the demo gate open for this harness. Without it the real
  // account gate blocks every screen and the check can only ever report the login form.
  server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
  // --strictPort means vite exits rather than sliding to another port. If it dies,
  // whatever answers our URL is not ours, so treat its exit as fatal instead of
  // letting waitForServer be satisfied by a stranger.
  let died = false;
  server.on("exit", () => { died = true; });
  if (!(await waitForServer(base)) || died) {
    console.error(died ? "the dev server exited during startup — port taken, or vite failed to boot" : "dev server never came up");
    server.kill(); process.exit(1);
  }
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
  // Prefer a real control whose visible label is exactly this text; only then fall
  // back to a text node. Matching text alone can land on a wrapping element that
  // ignores the click -- "Log a climb" looked completely dead that way, while the
  // <button> beside it opened the picker fine.
  const hitControl = await page.evaluate(({ t, idx }) => {
    const els = [...document.querySelectorAll('button,[role="button"],a,select,summary')]
      .filter((e) => (e.textContent || "").trim() === t);
    if (!els[idx]) return false;
    els[idx].click();
    return true;
  }, { t: text, idx: i });
  if (hitControl) { await page.waitForTimeout(1600); return true; }
  const els = await page.$$(`text="${text}"`);
  if (!els[i]) return false;
  await els[i].click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1600);
  return true;
};

// Click a control by its ACCESSIBLE NAME instead of its text content. The implementation, and
// the six failed attempts that produced its anchoring rule, moved to scripts/lib/tap-by-name.mjs
// when check:outage needed the same handle on the same bar -- one implementation, so the two
// guards cannot drift on how a Crew sub-tab is reached.
const tapByName = (label) => tapByNameOn(page, label);

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
    await waitForApp(60000);
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
  // Wait out any async data fetch so we assert on the screen, not its spinner -- and out of
  // a screen that is merely slow, which the old two-literal poll did not cover at all.
  // See scripts/lib/render-settle.mjs.
  const text = await settledText(page, { min: 30, timeout: 45000 });
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

// A fixed sleep after goto is not always enough: on a cold or heavily loaded
// machine (several parallel jobs each running their own vite), the first
// transform can outlast it, and tap() fails fast with no retry — so a page that
// is still blank at the first tap reports every screen "unreachable" within
// seconds, twelve failures deep, when the real story is one line: the app never
// rendered. Poll for the bottom nav before any phase proceeds, and say that one
// line if it never shows.
async function waitForApp(timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const up = await page.evaluate(() =>
      [...document.querySelectorAll('button,[role="button"]')].some((e) => (e.textContent || "").trim() === "Home")
    ).catch(() => false);
    if (up) return true;
    await page.waitForTimeout(1000);
  }
  return false;
}

try {
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
  if (!(await waitForApp(120000))) { console.error("the app never rendered its nav bar — nothing below can be checked"); if (server) server.kill(); process.exit(1); }
  await page.waitForTimeout(2500);

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
  await waitForApp(60000);
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
  await waitForApp(60000);
  await page.waitForTimeout(3000);

  await tap("Climbs");
  await settledText(page, { min: 30, timeout: 45000 });
  // Ask the app which catalog it is actually serving, rather than inferring it from
  // local env that does not apply to a remote target. The DB picker lists plain
  // "Washington"; the seed one lists "Utah · 10 climbs".
  // The area picker asks for a COUNTRY before it will offer a state, now that the catalog
  // holds more than one. `document.querySelector("select")` used to be the state picker and is
  // now the country one, so choosing a country has to happen first — and both selects are
  // addressed by accessible name rather than by document order, so a third control appearing
  // above them cannot silently redirect this again. The country select is absent entirely when
  // only one country exists, which is not an error: the app skips a step it cannot offer.
  const pickInSelect = (namePrefix, label) => page.evaluate(({ namePrefix, label }) => {
    const sel = [...document.querySelectorAll("select")]
      .find((x) => (x.getAttribute("aria-label") || "").startsWith(namePrefix));
    if (!sel) return "no-select";
    const opt = [...sel.options].find((o) => o.label === label || o.label.startsWith(label + " ") || o.label.startsWith(label + " —"));
    if (!opt) return "no-option";
    sel.value = opt.value;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    return "ok";
  }, { namePrefix, label });

  const countryPick = await pickInSelect("Select a country", "United States");
  if (countryPick === "no-option") {
    fail("route", `could not choose a country — "United States" was not among the options`);
  }
  if (countryPick === "ok") await settledText(page, { min: 30, timeout: 45000 });

  let catalog = USE_DB ? "DB" : "seed";
  if (URL_ARG && !(argOf("--route") && argOf("--state"))) {
    const opts = await page.evaluate(() => {
      const sel = [...document.querySelectorAll("select")]
        .find((x) => (x.getAttribute("aria-label") || "").startsWith("Select a state"))
        || document.querySelector("select");
      return sel ? [...sel.options].map((o) => o.label) : [];
    });
    if (opts.length) {
      const dbBacked = opts.some((o) => /^Washington\b/.test(o));
      catalog = dbBacked ? "DB" : "seed";
      if (!argOf("--state")) STATE = dbBacked ? "Washington" : "Utah";
      if (!argOf("--route")) ROUTE = dbBacked ? "North Ridge (Complete)" : "West Slabs";
    }
  }
  log(`route detail (${catalog} catalog, sample: ${ROUTE}):`);
  // The seed state picker labels its options "Utah · 10 climbs" while the DB one
  // uses plain "Washington" — match by prefix so both drill in, and dispatch a real
  // change event so React's controlled select actually updates.
  const statePick = await pickInSelect("Select a state", STATE);
  if (statePick !== "ok") {
    fail("route", `could not choose "${STATE}" in the area picker (${statePick}) — the country step above it may not have applied`);
  }
  // These were the last two flat waits in this file; every other step settles on the text
  // having stopped changing (see render-settle.mjs). Settling is strictly more adaptive than
  // 3000ms — it tolerates a slow list without tolerating a missing one, since a list that
  // never renders still fails at the tap below.
  //
  // Be precise about what this does NOT claim. On 2026-08-09 this step went red on a
  // comment-only PR and green on re-run with no change, and the fix for that flake is
  // UNPROVEN: scripts/oneoff/test-checkui-route-nav-under-slow-db.mjs replays this exact
  // sequence under an injected per-request delay and the old timing opened the route anyway
  // at both 6s and 12s. So do not read this as "the flake is fixed" and stop looking.
  //
  // It recurred on 2026-08-12 (PR #840, a change confined to SuggestFix, which this walk never
  // opens) — red in CI, green locally on the identical commit with all 20 screens passing, then
  // green on re-run. Twice now the cost has been an author proving a red was not theirs, which
  // is why the retry below exists. The retry addresses the COST, not the cause: the cause is
  // still unknown and this comment stays until somebody reproduces it.
  //
  // Two things that injection did establish, both of which correct the obvious story:
  //   - The search box here does NOT issue a name=ilike query. Four /rest/v1/routes requests
  //     were delayed per attempt and ZERO were name searches, so this filters client-side
  //     over an already-loaded list. Search latency was never the exposure.
  //   - The network-bound step is the list load after the state change, and the delayed
  //     requests land during the settled Climbs step above, which absorbs them.
  // Cold cost, measured the same day, for whoever picks this up: a first request from a
  // fresh page costs 3.8–6.4s and it is connection setup, not the query — a trivial
  // routes?limit=1 cost 3845ms cold against 320ms warm, with novel search terms 184–428ms.
  //
  // The floor before each settle is load-bearing: settledText samples the DOM, and a request
  // that has not been issued yet looks perfectly stable.
  await page.waitForTimeout(800);
  await settledText(page, { min: 30, timeout: 45000 });
  await tap("Routes");
  // BOUNDED RETRY, and deliberately not a longer timeout. The 2026-08-09 investigation could
  // not reproduce this under an injected slow DB at 6s or 12s, so the exposure is not a wait
  // that is merely too short, and a bigger number would be a guess dressed as a fix. A retry
  // buys the one thing that is safe to buy without knowing the cause: if the row genuinely is
  // not there, every attempt fails and the run still goes red with the same three-way message
  // below. Nothing is weakened — only the cost of an intermittent miss is removed.
  //
  // It re-reads the input and re-types each pass rather than just tapping again, because the
  // hypothesis this addresses is that the LIST was not ready: the search filters client-side
  // over an already-loaded list (measured — zero name queries go out), so a re-filter against
  // a list that has since arrived is the operation that can newly succeed. `fill("")` first,
  // or React's controlled input keeps the previous value and the second fill is a no-op.
  //
  // A retry that succeeds is PRINTED, never silent. Absorbing it quietly would turn a
  // measurable flake into an invisible one, and the next person to see this go red would have
  // no idea it had been happening — the same rule this file follows for anything it drops.
  let input = null, openedOn = 0;
  for (let attempt = 1; attempt <= 3 && !openedOn; attempt++) {
    if (attempt > 1) await settledText(page, { min: 30, timeout: 45000 });
    input = await page.$('input[type="text"], input:not([type])');
    if (input) {
      await input.fill("");
      await input.fill(ROUTE);
      await page.waitForTimeout(800);
      await settledText(page, { min: 30, timeout: 45000 });
    }
    if (await tap(ROUTE)) openedOn = attempt;
  }
  if (openedOn > 1) console.log(`  note: sample route opened on attempt ${openedOn} of 3 — the route list was not ready on the first pass`);
  if (!openedOn) {
    // In CI nobody is watching the browser, so this failure has to say which of the
    // two very different causes it is. The sample route is pinned by name against the
    // live DB catalog, so a rename or a delete there turns this red on a PR whose
    // author changed nothing -- and that reads identically to a broken route list
    // unless the message separates them.
    // Ask the app, rather than guessing from body length: DbAreaBrowser renders
    // "No routes match." for a search with no hits, and the seed browser renders
    // "No climbs match this filter."
    const listed = await page.innerText("body").catch(() => "");
    const empty = /No routes match\.|No climbs match this filter\./i.test(listed);
    // Fourth cause, and the one that was being reported as the third: the list never
    // POPULATED. A still-spinning list and a slow database both leave the page with no rows
    // and no empty state, which is exactly the shape the "not missing data" branch below
    // then blamed on the route list. On 2026-08-13 that message sent this session hunting
    // through DbAreaBrowser while Postgres was taking seconds per query — the route opened
    // fine, on the same commit, once the database recovered.
    //
    // So: ask the app whether it is still loading, and ask the DATABASE how it is doing,
    // rather than inferring either. assertDbReachable ran before the walk and only proves
    // the project was alive THEN; a degraded project passes it and fails here. Skipped under
    // --url, where local env describes a different deployment than the one being walked.
    const spinning = looksLikeSpinner(listed);
    const db = URL_ARG ? { state: "skipped" } : await probeDbLatency();
    const dbSlow = db.state === "error" || (db.state === "ok" && db.ms > 2000);
    const dbNote = db.state === "ok" ? `the database answered in ${db.ms}ms`
      : db.state === "error" ? `the database did not answer (${db.err})`
      : "the database was not probed (--url)";
    // Third cause, and it used to hide inside the second: no text input was found at all,
    // so nothing was ever typed and the tap was looking through an unfiltered list. That is
    // a different repair from a broken list, and the message must not conflate them.
    fail("route", `could not open the sample route ${JSON.stringify(ROUTE)} in the ${STATE} ${catalog} catalog`
      + (!input
        ? ` — no search box was found on the Routes view, so the name was never typed. Check the route list rendered before this step, not the search itself.`
        : empty
        ? ` — the list rendered and said it has no match, so the row was probably renamed or deleted. This check pins the name; pass --route to point it elsewhere.`
        : spinning
        ? ` — the list is STILL LOADING, so the row was never on screen to tap. ${dbNote}. This is the data not arriving, not the route list.`
        : dbSlow
        ? ` — the list rendered neither rows nor an empty state, and ${dbNote}. Treat this as a slow database rather than a broken list: re-run once it is answering in well under a second, and only investigate the list if it fails again on a healthy project.`
        : ` — the list reported no empty search, is not still loading, and ${dbNote}. That leaves the route list or the search box.`));
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
    // PITCH-BY-PITCH lives on Plan, not Overview — it moved there with PROTECTION and the
    // rappels so the tab that describes the approach and the descent also describes the
    // climbing between them. Tapping the wrong tab here does not fail loudly on its own:
    // it finds no "more" control and reports the render path as unchecked, which is the
    // message that caught this. Plan is absent on a route with no plan content, so fall
    // back to Overview rather than assuming the tab is there.
    if (!(await tap("Plan"))) await tap("Overview");
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

  // ---- named interaction flows -------------------------------------------
  // sweepInteractive above asks "does this control do ANYTHING?". These ask the
  // stronger question: "does it do the RIGHT thing?" -- a filter must actually
  // narrow, a count must agree with its own footer, sub-tabs must render different
  // content. That gap is where #405 (15 climb-log fields dropped on reload) and
  // #411 (a crew reporting Ready with no partner confirmed) both lived: the
  // controls worked, the resulting state was wrong.
  log("flows:");
  const flow = async (name, fn) => {
    pageErrors.length = 0;
    try { await fn(); log(`  ${name}: ok`); }
    catch (e) { fail("flow:" + name, e.message.slice(0, 200)); log(`  ${name}: FAILED`); }
    for (const e of pageErrors) fail("flow:" + name, `uncaught page error: ${e}`);
  };
  const countOf = async (re) => { const m = (await page.innerText("body")).match(re); return m ? Number(m[1].replace(/,/g, "")) : null; };
  const FOUND = /([\d,]+)\s+climbers found/;
  // Mirrors the app's own threshold for showing the "Showing X of N" paging footer
  // (ClimbMatch.jsx: `filtered.length>40`). Kept as a named constant so the coupling
  // is visible if that number ever changes.
  const PAGED_OVER = 40;

  await flow("partners-count-self-consistent", async () => {
    await tap("Partners");
    const found = await countOf(FOUND);
    if (found == null) throw new Error("no 'N climbers found' count on the Partners tab");
    const m = (await page.innerText("body")).match(/Showing\s+([\d,]+)\s+of\s+([\d,]+)/);
    // The app renders that footer only when the match list exceeds PAGED_OVER
    // ("filtered.length>40"), so its absence on a short list is correct, not a bug.
    // Partner matching keys off availability overlap, so the count moves with the
    // calendar -- prod showed 5 climbers on 2026-07-30 and no footer, which failed
    // this check for the wrong reason. Turn the absence into its own assertion
    // instead: with more than PAGED_OVER matches the footer MUST be there.
    if (!m) {
      if (found > PAGED_OVER) throw new Error(`${found} climbers found but no "Showing X of N" footer — the paging footer is missing above ${PAGED_OVER}`);
      return;   // short list, no footer expected — nothing left to cross-check
    }    const shown = Number(m[1].replace(/,/g, "")), total = Number(m[2].replace(/,/g, ""));
    if (shown > total) throw new Error(`"Showing ${shown} of ${total}" is impossible`);
    if (total !== found) throw new Error(`header says ${found} climbers found but the footer says "of ${total}"`);
    if (shown === 0 && total > 0) throw new Error(`${total} climbers found but none are shown`);
  });

  await flow("partners-mode-switch", async () => {
    await tap("Partners");
    const before = await page.innerText("body");
    if (!(await tap("Join a crew"))) throw new Error("the 'Join a crew' mode button is not present");
    const after = await page.innerText("body");
    if (after === before) throw new Error("switching to 'Join a crew' left the screen byte-identical");
  });

  await flow("logbook-subtabs-switch", async () => {
    await tap("Logbook");
    const seen = {};
    for (const sub of ["Objectives", "Completed", "Challenges", "Areas"]) {
      if (!(await tap(sub))) throw new Error(`the Logbook sub-tab ${JSON.stringify(sub)} is not present`);
      const t = await page.innerText("body");
      const twin = Object.keys(seen).find((k) => seen[k] === t);
      if (twin) throw new Error(`sub-tab ${sub} is byte-identical to ${twin} -- it did not switch`);
      seen[sub] = t;
      for (const [re, why] of FORBIDDEN) { const mm = t.match(re); if (mm) throw new Error(`${sub}: ${why} -- found ${JSON.stringify(mm[0])}`); }
    }
  });

  // The Crew tab's four sub-views were UNREACHABLE to this check until #740/#755 named
  // their buttons -- see tapByName above. That is four screens of a six-tab app that no
  // render guard had ever opened, and it is where #569 (a populated crew reading "You + 0
  // climbers") and #688 lived.
  await flow("crew-subviews-switch", async () => {
    await tap("Crew");
    // Only three are captured. `crewView` defaults to "crews", so the Crews sub-view IS the
    // Crew screen already captured in the main walk -- capturing it again would be a
    // byte-identical twin and fail for being correct. That equality is worth asserting
    // rather than dodging, so it becomes the round-trip check at the end.
    for (const sub of ["Friends", "Groups", "Requests"]) {
      if (!(await tapByName(sub))) throw new Error(`the Crew sub-tab ${JSON.stringify(sub)} is not present, or has lost its aria-label`);
      // capture() settles the screen, records it into --snapshot, and applies the same
      // min-length / FORBIDDEN / LANDMARKS / identical-twin rules every other screen gets.
      // The twin check is global, so a sub-view that silently renders another screen fails
      // here even if it differs from its three siblings.
      await capture("Crew:" + sub);
    }
    if (!(await tapByName("Crews"))) throw new Error("the Crew sub-tab \"Crews\" is not present, or has lost its aria-label");
    const back = await settledText(page, { min: 30, timeout: 45000 });
    if (screens.Crew && back !== screens.Crew) {
      throw new Error("returning to the Crews sub-tab did not restore the Crew screen -- the bar navigates one way only");
    }
  });

  await flow("log-a-climb-picker-opens", async () => {
    await tap("Logbook");
    // Flows share one browser and React keeps sub-tab state, so reset to the view
    // that owns this control -- the previous flow leaves the Logbook on "Areas",
    // where "Log a climb" legitimately does not render.
    await tap("Objectives");
    const before = await page.innerText("body");
    if (!(await tap("Log a climb"))) throw new Error("the 'Log a climb' button is not present");
    const after = await page.innerText("body");
    if (after === before) throw new Error("'Log a climb' changed nothing -- the picker did not open");
    if (!/Pick a state|Log a past climb/i.test(after)) throw new Error("the picker opened but offers no way to choose a climb");
  });

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
