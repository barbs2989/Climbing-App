// Five routes whose stated HEIGHT is a horizontal distance.
//
// WHAT THE COLUMN MEANS, pinned from the reader rather than assumed: lib/db.js maps length_m to
// routeFt = round(length_m * 3.28084), RouteDetail renders routeFt through uElev() — an ELEVATION
// formatter — and the contribute form labels the field "Height / length". So it is the climb's own
// vertical extent, and routeFt is read in several places, not just one tile.
//
// THE TEST NEEDS NO SOURCE: A CLIMB CANNOT BE TALLER THAN ITS OWN MOUNTAIN. Comparing routeFt against
// the rise from each row's lowest elevation-bearing pin to its own high point, 21 of 568 comparable
// WA rows state a height that exceeds it. On four of those the wrong quantity is identifiable, because
// length_m read as METRES is that row's own dist_km:
//
//   wa_ptarmigan_traverse              48280 m = dist_km 48.3   -> routeFt 158,399 against a 5,320 ft rise
//   wa_mount_ellinor_standard           2575 m = dist_km 2.57   -> routeFt   8,448 against a 2,444 ft rise
//   wa_table_mountain_standard_scramble 2092 m = dist_km 2.1    -> routeFt   6,864 against a   642 ft rise
//   wa_mount_rahm_custer_traverse       1931 m = dist_km 1.9    -> routeFt   6,335
//
// A fifth holds a distance in the other unit: wa_remmel_mountain_southeast_slope stores 3219 m, which
// is 2.00 statute miles to within 0.3 m, and its own pro_tips describe "a short, easy 4-mile round
// trip" from Four Point Lake — two miles each way. Its routeFt of 10,561 ft is nearly double the
// 5,635 ft rise from its own trailhead pin to its own summit, on a route its climbing_route calls "a
// non-technical Class 1-2 talus-and-meadow walk-up".
//
// NULL RATHER THAN A SUBSTITUTE. A walk-up, a scramble and a multi-day traverse have no route height
// to state, and computing one from the pin rise would put a derived number where a measured one
// belongs — the same refusal applied to the rappel lengths and the fabricated pins in this sweep.
//
// THREE MEASUREMENTS ON THE WAY, TWO OF WHICH PRODUCED ARTIFACTS RATHER THAN FINDINGS. Recorded
// because each would have justified a much larger and wrong sweep:
//
//   "length_m is a round number of FEET" — first measured at 9%, which looked like nothing. The test
//     was backwards: 3,000 ft / 3.28084 = 914.4, stored 914, which converts BACK to 2,998.7 ft and
//     fails a round-feet check. Asked the right way round, 593 of 1,087 rows (54.6%) are rounded
//     conversions of round foot figures — and that is CORRECT, not a defect. Guidebooks publish
//     heights in feet. Unlike a rappel length equal to the rope's reach, a route height equal to a
//     published foot figure is just the same number in another unit.
//
//   "the same length_m shared across routes on one peak" — 162 pairs, and reading them shows they are
//     right: five Liberty Bell routes at 1,200 ft, three Dragontail routes at 2,000 ft, three Prusik
//     routes at 600 ft. Routes on one wall share that wall's height.
//
//   "routeFt exceeds what the pitch count can cover" — 75 rows over 80 m per pitch, and unusable,
//     because `pitches` on a mountaineering row is frequently a count of STAGES rather than roped
//     pitches (a defect repaired separately in this sweep). wa_mount_shuksan_fisher_chimneys shows
//     "1,219 m per pitch" only because its single "pitch" is a whole section of the day.
//
// The other 16 rows failing the taller-than-its-mountain test are a reading list: each is impossible,
// but nothing in the row says what the number was meant to be.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  { kind: "set", route: "wa_ptarmigan_traverse", path: "length_m", expect: "37bd88febafc3b1f", value: null,
    why: "48,280 m is this row's own 48.3 km of walking, stored as a 158,399 ft climb" },
  { kind: "set", route: "wa_mount_ellinor_standard", path: "length_m", expect: "e7303ad874c10090", value: null,
    why: "2,575 m is this row's own dist_km 2.57, against a 2,444 ft rise from its own pins" },
  { kind: "set", route: "wa_table_mountain_standard_scramble", path: "length_m", expect: "7fd052bd76eb7147", value: null,
    why: "2,092 m is this row's own dist_km 2.1 — a 6,864 ft climb on a 642 ft hill" },
  { kind: "set", route: "wa_mount_rahm_custer_traverse", path: "length_m", expect: "5c06e46c5e47cfac", value: null,
    why: "1,931 m is this row's own dist_km 1.9" },
  { kind: "set", route: "wa_remmel_mountain_southeast_slope", path: "length_m", expect: "be1dfca7b57921df", value: null,
    why: "3,219 m is exactly 2.00 statute miles — the summit-day walk its own pro_tips describe" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,length_m",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
