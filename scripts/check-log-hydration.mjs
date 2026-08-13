// check:log — guards the climb-log read path against silently dropping fields.
//
// syncLogToDb writes ~20 columns to climb_logs and useUserLogs selects "*", so
// every field comes back from Supabase. The hydration then decides what the app
// actually sees. When it mapped only 7 of them, a user could log a climb with
// beta, gear notes, FA credit, car-to-car timings, a GPX track and a day-by-day
// itinerary, watch it render, reload — and find it gone, while the data sat
// intact in the database. Nothing errored. It just quietly stopped existing.
//
// That regressed once *after* being fixed: #405 restored the fields, then #414
// (a crew fix branched from an older main) reverted them in a rebase of the same
// dense line region. CI was green throughout and no check noticed. Re-landed in
// #428. This exists so a third round can't happen quietly.
//
// The write path is the source of truth for what SHOULD survive: this reads the
// real payload literal out of syncLogToDb, so adding a column there without
// mapping it back fails the check rather than silently losing it.
import { readFileSync } from "node:fs";

// The app is split across ClimbMatch.jsx (App) and ClimbMatchCore.jsx (helpers,
// seed data, presentational components); markers may live in either. Core is
// optional so this also works on pre-split checkouts.
const readOpt = (u) => { try { return readFileSync(u, "utf8"); } catch { return ""; } };
const SRC = readFileSync(new URL("../ClimbMatch.jsx", import.meta.url), "utf8") +
  "\n" + readOpt(new URL("../ClimbMatchCore.jsx", import.meta.url));
const fail = m => { console.error("check:log FAILED — " + m); process.exit(1); };

// ---- what the write path persists -------------------------------------------
const pi = SRC.indexOf("var payload={");
if (pi < 0) fail("could not find syncLogToDb's payload literal.");
let depth = 0, pEnd = SRC.indexOf("{", pi);
for (let k = pEnd; k < SRC.length; k++) {
  if (SRC[k] === "{") depth++;
  else if (SRC[k] === "}" && --depth === 0) { pEnd = k + 1; break; }
}
const payloadLit = SRC.slice(SRC.indexOf("{", pi), pEnd);

// Column names are the keys at depth 1 of the payload literal, and nothing else.
//
// This was `payloadLit.matchAll(/([a-z_]+)\s*:/g)` over the raw slice, which cannot tell a
// column from any other `word:` in range. Two ways that misreports, both live rather than
// hypothetical: a ternary inside a column's own value expression — `isNaN(n)?null:n` — is
// read as a column called `null`, and a key nested inside a value (`{url:u,caption:null}` in
// the photos map) is read as a top-level column, which is why `caption`/`url` had to be
// deleted again by hand afterwards. Both failures point the SAME direction: they invent
// columns, so they can only ever produce a false FAILURE, never a false pass. That is the
// safe direction for a guard to be wrong in, and it is why this went unnoticed — but a
// guard that cries wolf gets exemptions bolted onto it until it stops meaning anything, and
// the exemption list is where a real dropped column would eventually get parked.
//
// So: one stateful pass tracking strings, template literals, comments and nesting depth,
// collecting an identifier followed by `:` only while depth === 1. Comments are skipped
// rather than stripped, because prose in a payload comment ("belayed_by: the catcher") is
// exactly the shape being matched.
function depth1Keys(src) {
  const keys = new Set();
  let depth = 0, i = 0, quote = null;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (quote) {
      if (c === "\\") { i += 2; continue; }
      if (c === quote) quote = null;
      i++; continue;
    }
    if (c === "/" && n === "/") { const nl = src.indexOf("\n", i); i = nl < 0 ? src.length : nl; continue; }
    if (c === "/" && n === "*") { const end = src.indexOf("*/", i + 2); i = end < 0 ? src.length : end + 2; continue; }
    if (c === '"' || c === "'" || c === "`") { quote = c; i++; continue; }
    if (c === "{" || c === "(" || c === "[") { depth++; i++; continue; }
    if (c === "}" || c === ")" || c === "]") { depth--; i++; continue; }
    if (depth === 1 && /[a-z_]/.test(c)) {
      let j = i; while (j < src.length && /[a-z0-9_]/.test(src[j])) j++;
      let k = j; while (k < src.length && /\s/.test(src[k])) k++;
      if (src[k] === ":") keys.add(src.slice(i, j));
      i = j; continue;
    }
    i++;
  }
  return keys;
}
const written = depth1Keys(payloadLit);

// derived on both sides rather than round-tripped — see #405's rationale.
// caught_fall is `tickType === "Fell" && !!caughtBy`: both of its inputs ARE hydrated
// (tick_type and belayed_by), so re-reading the boolean would be reading back a value the
// app recomputes anyway — and a stored `true` disagreeing with a hydrated tickType is a
// contradiction the read path would have to arbitrate. It is written for consumers OTHER
// than this app (the catch ledger, and anything querying "was a fall caught here").
//
// car_to_car_minutes WAS here, on the same "derived on both sides" reasoning, and that was
// the one entry the reasoning did not hold for. Nothing re-derived it on read: the only
// place carToCar is computed from the three legs is the LogAscent form, while you type. So
// the total showed until you reloaded and then vanished — and RouteDetail's separate
// hydration of the same rows DID read the column, so it stayed on screen for every other
// climber. An exemption is a claim about the code, and this one had quietly stopped being
// true; it is now a real round-trip and the exemption is gone so it cannot lapse again.
const DERIVED = new Set(["discipline", "caught_fall"]);

// ---- what the read path maps back -------------------------------------------
const hi = SRC.indexOf("var item={_dbId:row.id");
if (hi < 0) fail("could not find the climb-log hydration block (var item={_dbId:row.id...).");
const hEnd = SRC.indexOf("};", hi) + 2;
const hydration = SRC.slice(hi, hEnd);
const readBack = new Set([...hydration.matchAll(/row\.([a-z_]+)/g)].map(m => m[1]));

const dropped = [...written].filter(c => !readBack.has(c) && !DERIVED.has(c)).sort();

console.log(`  write path persists : ${written.size} columns`);
console.log(`  read path maps back : ${readBack.size}`);
console.log(`  derived, exempt     : ${[...DERIVED].join(", ")}`);

if (dropped.length) {
  console.error(`\ncheck:log FAILED — ${dropped.length} column(s) written to climb_logs but never read back:\n`);
  dropped.forEach(c => console.error("  - " + c));
  console.error("\nThese persist correctly and then vanish on reload — the worst kind of");
  console.error("data loss, because nothing errors and the row is still in the database.");
  console.error("Map them in the hydration (var item={_dbId:row.id...}), or add them to");
  console.error("DERIVED in this script if they are genuinely recomputed on read.");
  process.exit(1);
}
console.log(`  ok    every persisted column is mapped back`);

// ---- the mirror case: read back but never written ---------------------------
//
// The check above is one-directional: it catches a column that is written and
// then dropped on read. It is blind to the inverse — hydration that maps a
// column the write path never populates. That reads as a working feature in the
// code and is silent data loss in practice: the field is mapped, so it looks
// handled, and it is always empty because nothing ever put a value there.
//
// Four columns are in that state today. They are NOT oversights and adding them
// to the payload would not work: partners is uuid[] and belayed_by/crew_id are
// uuid, while the app holds partner NAMES ("Maya Chen") and has no profile ids
// to resolve them against. They are blocked on partner tagging resolving real
// profiles, so they are recorded here rather than silently tolerated. Remove an
// entry when its write path lands; do not add to this list to make a new failure
// go away.
const UNWRITTEN_OK = new Map([
  ["partners",   "uuid[]; app holds partner names, needs profile-id resolution"],
  ["belayed_by", "uuid; same — catch credit has no profile id to point at"],
  ["crew_id",    "uuid; log<->crew link is never set on save"],
  ["gpx_track",  "written only via contribute, never by the log save path"],
]);
const readNotWritten = [...readBack]
  .filter(c => !written.has(c) && !["id", "user_id", "route_id", "created_at", "updated_at"].includes(c))
  .sort();
const unexpected = readNotWritten.filter(c => !UNWRITTEN_OK.has(c));
const known = readNotWritten.filter(c => UNWRITTEN_OK.has(c));
if (known.length) {
  console.log(`  known unwritten     : ${known.length} (${known.join(", ")})`);
}
if (unexpected.length) {
  console.error(`\ncheck:log FAILED — ${unexpected.length} column(s) hydrated but never written:\n`);
  unexpected.forEach(c => console.error("  - " + c));
  console.error("\nThe read path maps these, so the feature looks wired up, but the write");
  console.error("path never sets them — they are permanently empty and nothing errors.");
  console.error("Either write them in syncLogToDb's payload, drop them from the hydration,");
  console.error("or record them in UNWRITTEN_OK with the reason they cannot be written yet.");
  process.exit(1);
}

// ---- the fields most expensive to lose must be present by name --------------
const CRITICAL = [
  ["beta", "beta"], ["gear_beta", "gearBeta"], ["itinerary", "itinerary"],
  ["gpx_track", "gpxTrack"], ["fa_ascent", "faAscent"], ["approach_minutes", "cond.approachMin"],
];
const missing = CRITICAL.filter(([col]) => !hydration.includes("row." + col));
if (missing.length) {
  console.error("\ncheck:log FAILED — user-authored trip content is not hydrated:\n");
  missing.forEach(([col, as]) => console.error(`  - ${col}  (should surface as ${as})`));
  process.exit(1);
}
console.log("  ok    trip beta, gear, itinerary, GPX, FA and timings all hydrated");

// ---- the SECOND hydration ---------------------------------------------------
//
// Everything above reads ClimbMatch.jsx. That is one of TWO hydrations of this table, and
// until #861 this script could not see the other one at all — RouteDetail.jsx was not even
// in its sources.
//
//   ClimbMatch.jsx   builds `logs`     -> your own logbook
//   RouteDetail.jsx  builds `dbReports` -> the same rows as a route's `activity`
//
// A route's `activity` dedupes route.activity -> myReports -> dbReports by _dbId, so YOUR
// row arrives via myReports carrying the full ClimbMatch shape. Every other climber's row
// exists only as dbReports. So a column this hydration drops is a fact that is on screen
// for its author and nobody else — and both shapes are opened into the SAME components
// (ReportStats, TripReport).
//
// That had happened twice over: #843 (car_to_car_minutes, the mirror direction) and #861,
// where faAscent and developed were dropped, so buildConsensus could only ever credit a
// First Ascent to yourself.
const RD_SRC = readFileSync(new URL("../RouteDetail.jsx", import.meta.url), "utf8");
const rdAnchor = "return _tripRows.map(function(r){";
const rdStart = RD_SRC.indexOf(rdAnchor);
if (rdStart < 0) fail("ANCHOR LOST — could not find RouteDetail's climb_logs hydration (" + rdAnchor + ").");
let rdDepth = 0, rdEnd = RD_SRC.length;
for (let k = RD_SRC.indexOf("{", rdStart + rdAnchor.length - 1); k < RD_SRC.length; k++) {
  if (RD_SRC[k] === "{") rdDepth++;
  else if (RD_SRC[k] === "}" && --rdDepth === 0) { rdEnd = k + 1; break; }
}
const rdHydration = RD_SRC.slice(rdStart, rdEnd);
const rdRead = new Set([...rdHydration.matchAll(/\br\.([a-z_]+)/g)].map(m => m[1]));

// Fails closed: an anchor that still matches but a body that reads almost nothing means the
// brace walk went wrong, and every comparison below would pass vacuously.
if (rdRead.size < 10) fail(`RouteDetail's hydration parsed to only ${rdRead.size} column reads — the scan is broken, not the app.`);

// Columns this hydration may legitimately skip. Each reason is MEASURED, not assumed — the
// question is always "what on the route page consumes it?", never "does it feel relevant?".
//
// Scope note, learned when the staleness rule below fired on its own first run: `written`
// comes from the depth-1 keys of the payload LITERAL, so the three columns syncLogToDb
// appends conditionally afterwards (`payload.partners=`, `belayed_by`, `gpx_track`) are not
// in it and need no entry here. They are already tracked by UNWRITTEN_OK above. Two of them
// are still worth knowing about, because they look like obvious things to hydrate and are
// not:
//   partners    — matchClimber does CLIMBERS.find(c=>c.name===nm&&ascent.partnerIds.includes(c.id))
//                 against seed INTEGER ids. Feeding it uuids takes that branch and returns
//                 null for EVERY partner, which is worse than the name fallback it uses
//                 today. The class check:crew-member-readers exists for.
//   gpx_track   — TripReport's Download GPX uses the ROUTE's track, gpxDownload(r); nothing
//                 reads a report's own track on this surface.
const ROUTE_THIN = new Map([
  ["trip_report_visibility", "RLS (0081) decides which rows come back; the page never re-filters"],
  ["crew_id", "the log<->crew link is never set on save, and a report card is not crew-scoped"],
]);
const rdDropped = [...written]
  .filter(c => !rdRead.has(c) && !DERIVED.has(c) && !ROUTE_THIN.has(c))
  .sort();

// A stale exemption is a description of code that has moved on, so it fails too — the same
// standard NEEDS_EXTRA_STATE and check:field-renders' KNOWN map are held to.
const staleThin = [...ROUTE_THIN.keys()].filter(c => rdRead.has(c) || !written.has(c));

console.log(`  2nd hydration reads : ${rdRead.size} columns (RouteDetail)`);
console.log(`  route-thin, exempt  : ${ROUTE_THIN.size}`);

if (rdDropped.length) {
  console.error(`\ncheck:log FAILED — ${rdDropped.length} column(s) the ROUTE-PAGE hydration drops:\n`);
  rdDropped.forEach(c => console.error("  - " + c));
  console.error("\nThese survive into your own logbook and not onto the route page, so the");
  console.error("fact is on screen for its author and for nobody else. Both shapes are opened");
  console.error("into the same components. Map them in RouteDetail's _tripRows.map, or record");
  console.error("them in ROUTE_THIN with the reader you checked for and did not find.");
  process.exit(1);
}
if (staleThin.length) {
  console.error(`\ncheck:log FAILED — ${staleThin.length} stale ROUTE_THIN entr(y/ies):\n`);
  staleThin.forEach(c => console.error(`  - ${c}  (${rdRead.has(c) ? "now IS read there" : "no longer written at all"})`));
  console.error("\nAn exemption is a claim about the code. Delete it rather than let it rot.");
  process.exit(1);
}
console.log("  ok    the route-page hydration drops nothing a reader wants");

console.log("\nclimb-log hydration: ok");

// ---- injection cases, re-run these after touching depth1Keys ----------------
//
// The key extractor was a bare regex until 2026-08-09 and is now a stateful scan, so the
// cases that matter are the ones where "looks like a key" and "is a key" disagree. Verified
// by feeding each literal to depth1Keys directly:
//
//   1. {a_col:1,b_col:2}                                   -> a_col, b_col   (baseline)
//   2. {party_size:(function(){return x?null:y;})()}        -> party_size     (was: + "null")
//   3. {photos:list.map(function(u){return {url:u,caption:null};})}
//                                                          -> photos         (was: + url, caption,
//                                                             which is why both were deleted by hand)
//   4. {/* belayed_by: the catcher */real_col:1}            -> real_col       (prose in a comment)
//   5. {\n// mud: dropped before\nreal_col:1}               -> real_col       (line comment)
//   6. {notes:"snow: continuous",other:2}                   -> notes, other   (colon in a string)
//   7. {notes:`level: high`,other:2}                        -> notes, other   (template literal)
//   8. {tags:[{k:1},{j:2}],top:3}                           -> tags, top      (array of objects)
//
// And end-to-end, against the real app: deleting `if(row.temp_f!=null)o.tempF=row.temp_f;`
// from the hydration must fail this script NAMING temp_f — a run that fails for any other
// reason is not a catch.
//
// Equivalence was checked before the swap rather than argued: run both the old regex and
// depth1Keys over the payload literal as it stood at 3dbae26 and the sets are identical
// (27 keys, no difference either way). The new scan removes false columns only.
//
// ---- injection cases for the SECOND-hydration section (#861) ----------------
//
//   1. revert the #861 fix (delete fa/faAscent/developed/itinerary/sunVote/sunNote from
//      RouteDetail's literal)          -> FAILS, naming 5 columns
//   2. delete ONE column (`stars`) from RouteDetail's literal
//                                      -> FAILS, naming stars   (a NEW regression, not the
//                                         one the section was written for)
//   3. rename the callback param, breaking the anchor
//                                      -> FAILS with ANCHOR LOST, never passes over a body
//                                         it could not find
//   4. add a ROUTE_THIN entry for a column that IS read there
//                                      -> FAILS as a stale exemption
//
// Case 2 is the one that took two attempts, and the lesson is the usual one: `stars:r.stars,`
// occurs TWICE in RouteDetail.jsx and the first hit is unrelated, so a bare .replace() edited
// the wrong line and the run passed. It reported "edit landed: false" rather than "guard
// missed", which is the only reason it was not written up as a hole in the guard. Prove the
// injection landed before believing what the guard says about it.
