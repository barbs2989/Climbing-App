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
const written = new Set([...payloadLit.matchAll(/([a-z_]+)\s*:/g)].map(m => m[1]));

// nested inside the photos jsonb, not top-level columns
["caption", "url"].forEach(k => written.delete(k));
// derived on both sides rather than round-tripped — see #405's rationale
const DERIVED = new Set(["discipline", "car_to_car_minutes"]);

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
console.log("\nclimb-log hydration: ok");
