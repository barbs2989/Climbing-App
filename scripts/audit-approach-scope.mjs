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
// The duplication half needs its own pair, because its healthy output is a NUMBER and a broken
// detector prints a number too. `dup` copies an approach sentence verbatim into climbing_route
// and the count must rise; `nodup` replaces climbing_route with prose about something else
// entirely and the count must fall to zero. Without the second case a detector that simply
// returned "every sentence" would pass the first.
if (INJECT === "dup") candidates = candidates.slice(0, 5).map(r => {
  const first = sentences(r.approach)[0];
  return first ? { ...r, climbing_route: [{ n: 1, label: "injected", notes: first }] } : r;
});
if (INJECT === "nodup") candidates = candidates.map(r => (Array.isArray(r.climbing_route) && r.climbing_route.length)
  ? { ...r, climbing_route: [{ n: 1, label: "injected", notes: "Park in the paved lot beside the visitor centre and buy a coffee before starting the drive home." }] }
  : r);

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

// --- Was the text MOVED, or only COPIED? --------------------------------------------------
//
// The re-homing pass was specified as "re-home, never research", which means the source column
// should have been trimmed. Nothing ever checked that it was, and it mostly was not: measured
// on WA, 163 of 240 routes carrying both columns repeat at least one approach sentence inside
// climbing_route, 303 sentences in all and many verbatim. (An earlier probe said 429; its
// sentence splitter broke guidebook prose at abbreviations — "(Pk. 8165)" counted as two
// sentences — and the count here, from this file's own splitter, is the right one.) Confirmed
// ON SCREEN rather than
// inferred from the columns — the Planner tab renders APPROACH and CLIMBING ROUTE together, so
// a reader is told the same thing twice in two sections they are meant to distinguish.
//
// Similarity rather than string equality, because the pass was allowed to rewrite prose freely
// and only pinned specifics. A paraphrase is still a duplicate to a reader.
const STOP = new Set(("the a an and or of to in on at from for with by is are was were be been " +
  "this that these those it its as up down out over under into onto then than but if you your " +
  "we they he she which where when while about above below after before around near").split(" "));
const contentWords = t => String(t).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
  .filter(w => w.length > 3 && !STOP.has(w));
// 0.6 is deliberately high. Both columns describe the same mountain, so a shared "summit",
// "gully" and "snow" is expected and is NOT duplication.
const DUP_SIM = 0.6;
const jaccard = (a, b) => {
  const A = new Set(contentWords(a)), B = new Set(contentWords(b));
  if (A.size < 4 || B.size < 4) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return hit / new Set([...A, ...B]).size;
};
const crProse = r => [].concat(r.climbing_route || [])
  .map(v => (v && typeof v === "object") ? [v.label, v.notes].filter(Boolean).join(". ") : String(v))
  .join("\n");
const _dupCache = new Map();
function dupCount(r) {
  if (_dupCache.has(r.id)) return _dupCache.get(r.id);
  const ap = sentences(r.approach), cr = sentences(crProse(r));
  let n = 0;
  if (ap.length && cr.length) for (const a of ap) if (cr.some(b => jaccard(a, b) >= DUP_SIM)) n++;
  _dupCache.set(r.id, n);
  return n;
}

const unp = findings.filter(f => f.unpitched);
console.log(`\nscanned ${scoped.length} routes in scope "${STATE}" · ${candidates.length} have an approach worth reading`);
// The old line here said every unpitched finding's text "has nowhere else to live today",
// which was true when this was written and is now false for most of them: the climbing_route
// backfill has run. Following that advice would re-home text that is ALREADY re-homed and
// produce a third copy. An audit that gives a confident instruction it has no evidence for is
// the check:field-renders failure — it told an author to delete correct bookkeeping during an
// outage — so the two populations are counted separately and each is told what to actually do.
const homeless = unp.filter(f => !f.already);
const rehomed = findings.filter(f => f.already);
console.log(`${findings.length} carry climbing description inside the approach.`);
console.log(`  ${homeless.length} unpitched with NO climbing_route yet — that text has nowhere else to live, so MOVE it.`);
console.log(`  ${rehomed.length} already have climbing_route populated — for these the question is whether the approach was TRIMMED, not where the text should go.\n`);

for (const f of findings.slice(0, LIMIT)) {
  const tag = f.unpitched ? "UNPITCHED" : "pitched";
  const dup = f.already ? dupCount(f.r) : 0;
  const note = !f.already ? "  ·  no climbing_route yet — MOVE"
    : dup ? `  ·  climbing_route set AND ${dup} approach sentence(s) repeat inside it — TRIM the approach`
      : "  ·  climbing_route set, no repeated sentences — read before touching";
  console.log(`── ${f.r.name}  (${f.r.id})  [${f.r.discipline || "?"}, ${tag}]  score=${f.score} ${Math.round(f.ratio * 100)}% of sentences${note}`);
  for (const fl of f.flagged.slice(0, 3)) console.log(`     "${fl.s.slice(0, 170)}${fl.s.length > 170 ? "…" : ""}"`);
  console.log("");
}
if (findings.length > LIMIT) console.log(`… ${findings.length - LIMIT} more (raise --limit)\n`);

const dupRoutes = findings.filter(f => f.already && dupCount(f.r) > 0);
const dupTotal = dupRoutes.reduce((a, f) => a + dupCount(f.r), 0);
console.log(`\nduplication: ${dupRoutes.length} of the ${rehomed.length} re-homed routes still repeat approach prose inside climbing_route (${dupTotal} sentences).`);
console.log("The Planner tab renders both sections, so those routes state the same thing twice.");
console.log("\nReport only — nothing was changed. Read each route before moving OR trimming text:");
console.log("which copy is wrong is a per-sentence judgement, and some of the repeated prose is");
console.log("genuine approach content wrongly copied INTO climbing_route rather than the reverse.");
// Injection cases:
//   --inject=clean  every approach replaced with pure walking prose -> must report 0 findings
//   --inject=dirty  a climbing sentence appended to 3 approaches    -> those 3 must be flagged
//   --inject=dup    an approach sentence copied into climbing_route -> duplication must RISE
//   --inject=nodup  climbing_route replaced with unrelated prose    -> duplication must be 0
// The last two are a pair on purpose: `dup` alone would be passed by a detector that called
// every sentence a duplicate, which is the failure this repo keeps meeting from the other
// side — a proxy wide enough to be satisfied by anything reports a clean sweep either way.
process.exit(0);
