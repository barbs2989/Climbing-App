#!/usr/bin/env node
// audit:approach-scope — does a route's `approach` text keep going past the base of the climb?
//
// The approach column is meant to answer one question: how do I get from the car to the start
// of the climbing. On routes with no pitch table there was nowhere else to put a description
// of the climbing itself, so it went here — and the result is prose that walks you to the base
// and then, without any change of voice, keeps going to the summit. A party reading it cannot
// tell where the walking stops, which is exactly the failure this audit exists to find.
//
// Migration 0120 adds `climbing_route` as the place that content belongs. This reports which
// routes have text to move; it never moves anything.
//
// REPORT-ONLY, like audit:area-parents. The exit code says "things to look at", never "these
// are bugs" — the call on any individual sentence is a judgement about that route's terrain,
// and the detector cannot make it. Confirm each hit by reading the route before editing it.
//
// Read-only, anon key. Fails closed on an empty read: zero routes would make every approach
// look clean, so a false pass is this guard's realistic failure mode.

import { selectAll } from "./lib/supabase-env.mjs";

const args = process.argv.slice(2);
// Accept BOTH `--flag value` and `--flag=value`. The first draft handled only the spaced
// form, so `--inject=clean` silently parsed as "no injection" and the injection test reported
// a full set of findings that looked exactly like a real run — the fault out of frame, with
// the tell being that the injection "ran" and the counter never moved.
const argOf = (n, d) => {
  const eq = args.find(a => a.startsWith(n + "="));
  if (eq) return eq.slice(n.length + 1);
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const LIMIT = parseInt(argOf("--limit", "40"), 10);
const STATE = argOf("--state", "wa").toLowerCase();
const INJECT = argOf("--inject", null);

// Vocabulary of the CLIMB, not the walk. Split into two strengths because they carry very
// different weight: a bare "class 3" in an approach is often legitimately describing the
// approach itself (a class 3 gully IS how you reach some bases), while "belay", "pitch" and
// "rappel" essentially never describe walking.
const STRONG = [
  /\bbelay(?:s|ed|ing)?\b/i, /\bpitch(?:es)?\b/i, /\brappel|\brap\b|\babseil/i,
  /\bcrux\b/i, /\bsimul-?climb/i, /\bplace(?:d|s)? (?:pro|gear|a cam|a nut)\b/i,
  /\bsummit block\b/i, /\bcrest\b.*\bclimb/i, /\bfollow the (?:ridge|arete) to the summit\b/i,
  /\b5\.\d+[a-d]?\b/, /\bWI\s?\d/i, /\bM\d\b/, /\bA[1-5]\b/,
];
const WEAK = [
  /\bclass\s*[45]\b/i, /\bexposed\b/i, /\bscrambl/i, /\bdownclimb/i,
  /\broped? up\b/i, /\bgendarme/i, /\bknife-?edge\b/i, /\bto the (?:true )?summit\b/i,
];

// Sentence split that does not break on decimals — "5.9" and "1.2 miles" are everywhere in
// climbing prose, and a naive /[.!?]/ split shreds exactly the sentences this audit is about.
function sentences(text) {
  return String(text || "")
    .split(/(?<=[.!?])\s+(?=[A-Z(])/)
    .map(s => s.trim())
    .filter(Boolean);
}

function scoreSentence(s) {
  let strong = 0, weak = 0; const hits = [];
  for (const re of STRONG) if (re.test(s)) { strong++; hits.push(re.source.slice(0, 22)); }
  for (const re of WEAK) if (re.test(s)) { weak++; hits.push(re.source.slice(0, 22)); }
  return { strong, weak, hits };
}

// `climbing_route` only exists once 0120 has been applied. Ask for it, and fall back to the
// column list without it rather than dying — this audit is most useful BEFORE the migration
// runs, which is exactly when that column is missing.
const COLS = "id,name,area_id,discipline,pitches,approach";
let rows = await selectAll("routes", COLS + ",climbing_route", "", { pageSize: 1000 }).catch(() => null);
if (!rows) {
  console.log("note: routes.climbing_route not present yet (migration 0120 unapplied) — reporting without it.\n");
  rows = await selectAll("routes", COLS, "", { pageSize: 1000 })
    .catch(e => { console.error("read failed:", e.message); process.exit(1); });
}

if (!rows.length) {
  console.error("FAIL — read 0 routes. Refusing to report a clean sweep on an empty read.");
  process.exit(1);
}

const scoped = rows.filter(r => {
  const id = String(r.id || "");
  return STATE === "all" || id.startsWith(STATE + "_") || (STATE === "wa" && /^(stuart|colchuck|dragontail)_/.test(id));
});

// Only routes that have an approach AND no pitch table — a pitched route already has a home
// for its climbing description, so approach prose there is a different (smaller) problem.
const UNPITCHED = new Set(["mountaineering", "scrambling", "hiking", "scramble", "hike", "glacier", "snow"]);
let candidates = scoped.filter(r => r.approach && String(r.approach).trim().length > 80);

if (INJECT === "clean") candidates = candidates.map(r => ({ ...r, approach: "Walk the trail from the parking lot for two miles to the basin." }));
if (INJECT === "dirty") candidates = candidates.slice(0, 3).map(r => ({ ...r, approach: r.approach + " From the notch, climb the first pitch at 5.6 and belay on the crest." }));

const findings = [];
for (const r of candidates) {
  const ss = sentences(r.approach);
  const flagged = [];
  ss.forEach((s, i) => {
    const { strong, weak, hits } = scoreSentence(s);
    // A sentence counts if it names the climb outright, or stacks two softer signals. One
    // weak token alone is not enough: "class 3 gully" really can be the approach.
    if (strong >= 1 || weak >= 2) flagged.push({ i, s, strong, weak, hits });
  });
  if (!flagged.length) continue;
  const unpitched = UNPITCHED.has(String(r.discipline || "")) || !r.pitches;
  const already = Array.isArray(r.climbing_route) && r.climbing_route.length;
  findings.push({
    r, flagged, unpitched, already,
    // Rank by how much of the approach is actually about climbing, not by raw count — a long
    // approach with one stray clause matters far less than a short one that is mostly climb.
    ratio: flagged.length / ss.length,
    score: flagged.reduce((a, f) => a + f.strong * 2 + f.weak, 0),
  });
}

findings.sort((a, b) => (b.unpitched - a.unpitched) || (b.score - a.score));

const unp = findings.filter(f => f.unpitched);
console.log(`\nscanned ${scoped.length} routes in scope "${STATE}" · ${candidates.length} have an approach worth reading`);
console.log(`${findings.length} carry climbing description inside the approach — ${unp.length} of them have NO pitch table, so that text has nowhere else to live today.\n`);

for (const f of findings.slice(0, LIMIT)) {
  const tag = f.unpitched ? "UNPITCHED" : "pitched";
  console.log(`── ${f.r.name}  (${f.r.id})  [${f.r.discipline || "?"}, ${tag}]  score=${f.score} ${Math.round(f.ratio * 100)}% of sentences${f.already ? "  ·  climbing_route ALREADY set" : ""}`);
  for (const fl of f.flagged.slice(0, 3)) console.log(`     "${fl.s.slice(0, 170)}${fl.s.length > 170 ? "…" : ""}"`);
  console.log("");
}
if (findings.length > LIMIT) console.log(`… ${findings.length - LIMIT} more (raise --limit)\n`);

console.log("Report only — nothing was changed. Read each route before moving text into climbing_route.");
// Injection cases:
//   --inject=clean  every approach replaced with pure walking prose -> must report 0 findings
//   --inject=dirty  a climbing sentence appended to 3 approaches    -> those 3 must be flagged
process.exit(0);
