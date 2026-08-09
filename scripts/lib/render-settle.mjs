// When is a screen finished rendering?
//
// Every browser guard in this repo has to answer that before it reads the DOM, and until
// now each answered it differently and by hand:
//
//   check-ui.mjs         poll while /Loading climbs|Loading…/ matches, up to 25 times
//   check-signed-in.mjs  the same two literals, up to 40 times
//   check-zero-state.mjs waitForFunction: length > n && !/Loading[\s.…]/i
//
// Two of those three are wrong, and the bug they share is that they decide "done" from the
// TEXT rather than from whether the text is still changing.
//
// 1. The literal list covers 2 of the app's 13 user-visible spinners. "Loading dashboard…",
//    "Loading forecast…", "Loading topo photos…", "Loading nearby climbs…" and eight more
//    are invisible to it, so those screens are read while still fetching.
//
// 2. Nothing waits for a screen that is merely SLOW rather than spinning. Measured on
//    2026-08-09: check:signed-in captured `inboxOpen` at 48 chars on one run and 117 on the
//    next, same code and same fixture, and passed both — the first read landed between the
//    Inbox header and its friend-chat empty state. That matters more than it sounds. The
//    forbidden-text scan (`undefined`, `NaN`, `[object Object]`) is only as good as the
//    completeness of the text it scans, and a half-captured screen is exactly how a
//    #674-class bug walks past a green run.
//
// So settledText() waits for the text to STOP CHANGING, which is the general property. A
// spinner is just one reason a screen is not done yet.
//
// Why not simply widen the regex to every "…" verb in the app: because "Analyzing…" is a
// TERMINAL state, not a spinner — it is the crew-readiness fallback shown when everyone has
// finished the questionnaire but the team is neither ready nor in discussion. A guard that
// waited for it to clear would burn its whole timeout on a screen that had already finished.
// Same for "Working…" and "Downloading…", which are button labels gated on `busy`. Deciding
// from motion instead of vocabulary sidesteps the whole question.

import fs from "fs";
import path from "path";

// Used ONLY to label a short screen as "still fetching" rather than "blank or broken". It
// never decides when to stop waiting — settledText does that — so a string it misses costs
// a clear error message, not a wrong verdict.
//
// \b before Loading keeps "Downloading…" out: that is a button label on the state-download
// control, not a page load.
export const SPINNER_RE = /\bLoading\b[\s.…]/i;

const SOURCE_FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

// Reads the app's actual "Loading …" strings out of the source. Be precise about what this
// does and does not prove, because the obvious reading of it is circular:
//
//   It does NOT prove SPINNER_RE covers every way the app can say it is busy. The scan
//   looks for strings beginning "Loading", so of course SPINNER_RE matches them — and it
//   cannot see a future spinner worded "Fetching photos…". Nothing static can, which is
//   exactly why settledText() decides from motion instead of vocabulary. A word this misses
//   costs a less precise error message, never a wrong verdict.
//
//   It DOES prove two things worth a run. First, that SPINNER_RE has not been narrowed out
//   from under its callers: tightening it to /\bLoading\b\s/ would silently stop matching
//   the bare "Loading…", and `uncovered` reports that immediately. Second, that the scan
//   read something at all — it throws on an empty read rather than reporting clean
//   coverage of a directory it failed to open, which is how this family of checks usually
//   goes quietly wrong.
export function spinnerCoverage(root = process.cwd()) {
  const files = [...SOURCE_FILES];
  const libDir = path.join(root, "lib");
  if (fs.existsSync(libDir)) {
    for (const f of fs.readdirSync(libDir)) if (/\.jsx?$/.test(f)) files.push(path.join("lib", f));
  }

  const found = new Map();
  let read = 0;
  for (const rel of files) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    const src = fs.readFileSync(abs, "utf8");
    read++;
    // Quoted string literals and bare JSX text nodes. Placeholders are matched too and that
    // is harmless: `placeholder=` never reaches innerText, so it can only ever add an
    // unused entry, never hide a real one.
    const pats = [/"(Loading[^"\n]{0,40}…)"/g, /'(Loading[^'\n]{0,40}…)'/g, />\s*(Loading[^<>{}\n]{0,40}…)\s*</g];
    for (const re of pats) for (const m of src.matchAll(re)) if (!found.has(m[1].trim())) found.set(m[1].trim(), rel);
  }

  if (!read) throw new Error("render-settle: read no source files under " + root + " — the spinner scan verified nothing");
  if (!found.size) throw new Error("render-settle: found no loading strings in " + read + " source files; if the app stopped using them, delete this scan rather than letting it pass vacuously");

  const uncovered = [...found].filter(([s]) => !SPINNER_RE.test(s));
  return { spinners: [...found], uncovered, filesRead: read };
}

// Wait until the rendered text stops changing, then return it.
//
// `stable` consecutive identical samples is the signal. Length alone is not compared —
// two different screens of equal length would read as settled — but the ASPECT & SUN clock
// ticks inside the page, so exact equality would never settle on a route screen. The
// compromise: compare the text with digits masked, which absorbs a clock and a CountUp
// without absorbing a section that appeared.
//
// Returns whatever it has when `timeout` runs out. Callers own the min-length and
// forbidden-text assertions; this only decides WHEN to read.
export async function settledText(page, opts = {}) {
  const { stable = 3, interval = 400, timeout = 45000, min = 0 } = opts;
  const started = Date.now();
  let prev = null;
  let runs = 0;
  let text = "";

  while (Date.now() - started < timeout) {
    text = await page.innerText("body").catch(() => "");
    const norm = text.replace(/\s+/g, " ").trim();
    const fingerprint = norm.replace(/\d/g, "#");

    const ready = norm.length >= min && !SPINNER_RE.test(norm);
    if (ready && prev !== null && fingerprint === prev) {
      if (++runs >= stable - 1) return text;
    } else {
      runs = 0;
    }
    prev = ready ? fingerprint : null;
    await page.waitForTimeout(interval);
  }
  return text;
}

// True when a short screen is short because it is still fetching. Callers use this to pick
// the error message, so that a slow query is not reported as a render fault and sent to
// somebody to go looking for a bug that is not there.
export function looksLikeSpinner(text) {
  return SPINNER_RE.test(String(text || ""));
}
