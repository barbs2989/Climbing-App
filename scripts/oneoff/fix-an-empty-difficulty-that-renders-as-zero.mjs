// One route stores `difficulty` as an EMPTY OBJECT, and the panel that reads it guards on
// `if(!d) return null` — so `{}` sails through, because `{}` is truthy.
//
// wa_mount_fury_east_mongo_ridge is the row. Grade VI, 5.10, 25 pitches, 1,219 m, 10,000 ft of
// gain, 38.6 km of approach, `commitment` VI (the top of the NCCS scale), `alpine_grade` TD+,
// crowds.solitudeRating 5, and an overview reading "The biggest, most sustained alpine rock ridge
// in the Cascades... soloed by Wayne Wallace over four days in August 2006".
//
// Its DIFFICULTY BREAKDOWN renders Physical 0/5, Technical 0/5, Exposure 0/5, Commitment 0/5,
// Route-finding 0/5 — measured, ten "0/5" readings on the tab — under the panel's own promise of
// "A 1-5 read on what makes this hard", with a paragraph beneath each axis explaining what that
// axis MEANS. So it does not read as missing data. It reads as a route that is trivial on all
// five counts, on one of the most serious alpine objectives in Washington.
//
// AND IT PAINTS GREEN. `dv()` opens `const b = d[k] || 0` and the bar colour is
// `cur>=4?C.red : cur>=3?C.amber : C.green`, so 0 takes the green branch — the most reassuring
// colour on the panel, for the least information. This is the fail-open coercion this catalog
// keeps meeting: 0 is not a value on a 1-5 scale, it is the absence of one wearing a number.
//
// THE REPAIR IS null, NOT A SET OF SCORES. Filling five axes would mean inventing five judgements
// nothing in the row supports. `null` is falsy, so `!d` fires and the panel disappears outright:
// no false scores and no invented ones. Proven both ways by
// scripts/oneoff/probe-empty-difficulty-renders-all-zeros.mjs, which renders the real RouteDetail
// over this row's own shape — 11 assertions, including that a POPULATED difficulty still renders
// its panel and its real numbers, so the repair is not a regression for the other 8,028 rows.
//
// SCOPE: this is a class of ONE, measured rather than assumed. Across all 8,029 WA rows carrying a
// difficulty object, exactly one is empty and none stores a literal 0 on any axis.
//
// THE SAME ROW HOLDS THREE MORE EMPTY OBJECTS — `timing`, `approach_logistics` and `data_quality`
// — and they are deliberately NOT touched. Each falls through its reader to the same behaviour a
// null would produce (`(route.timing||{}).totalHrs` is undefined either way; `trailheadPoint()`
// reads absent coordinates and moves on; `data_quality` is mapped by lib/db.js and read by
// nothing). Clearing them is churn against a nonzero risk. Only the one that reaches a screen as
// a false claim is repaired.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  { kind: "set", route: "wa_mount_fury_east_mongo_ridge", path: "difficulty",
    expect: "44136fa355b3678a", value: null,
    why: "an empty object renders DIFFICULTY BREAKDOWN as a green 0/5 on all five axes, on a Grade VI, 25-pitch, 38.6 km route whose own commitment grade is VI" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,difficulty,commitment,alpine_grade,grade,pitches,gain_ft,dist_km",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
