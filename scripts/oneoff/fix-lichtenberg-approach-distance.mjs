// The dist_km batch, and it is ONE row rather than forty.
//
// 40 internal dist_km verdicts sit in the resolved backlog, and CLAUDE.md is explicit that this
// column must never be normalised in bulk because it holds two conventions at once. So before
// writing anything, the question asked was not "is the column wrong" but "does the error REACH
// A SCREEN". RouteDetail's reader settles it:
//
//   effDistKm = route => { const totMi = itinTotalMi(route);
//                          if (!totMi) return route && route.distKm;
//                          return effDistIsWholeTrip(route) ? totMi*1.60934 : (totMi*1.60934)/2; }
//
// dist_km is IGNORED entirely whenever the row carries itinerary day-miles. Measured across the
// 40: THIRTY-EIGHT carry them, so the page already shows a correctly halved one-way figure and a
// repair would change nothing a climber sees while performing exactly the bulk normalisation the
// rule forbids. TWO do not. Of those two, wa_vanishing_point's dist_km is the RIGHT half — its
// defect is a waypoint 1.2 mi past the documented turn-off and a synthetic gpx, a different class.
//
// That leaves this one, and it errs in the dangerous direction.
//
// wa_lichtenberg_mountain_west_face_west_rib stores 4.2 km = 2.61 mi. Its own waypoint ladder is
// Smithbrook Trailhead 0 mi -> Lichtenberg Boulders 2.5 mi -> Lake Valhalla 3.5 mi, and the row
// carries NO itinerary day-miles, so effDistKm hands 4.2 straight to the planner. 2.61 mi matches
// no rung; it sits just past the intermediate boulder field, short of the objective.
//
// 3.5 mi (5.63 km) is not a floor being passed off as a measurement - it is the right SEMANTIC
// value. dist_km is the APPROACH distance (a summit waypoint's cumulative distMi includes the
// climbing, which is why the two are not interchangeable), and this row's own Lake Valhalla
// waypoint is described as "below the west face" - the base of the climb.
//
// Understating an approach is the #641 direction: dist_km drives scarfHrs, so Est. summit and
// Est. return both read optimistically, which is an affirmative answer to "am I down before
// dark" built on a number the row's own pins contradict.
//
// Dry run by default; --hashes prints the constant; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

// 3.5 mi x 1.60934 km/mi = 5.6327 km
const REPAIRS = [
  { kind: "set", route: "wa_lichtenberg_mountain_west_face_west_rib", path: "dist_km",
    expect: "2912aa729c973b7d", value: 5.63,
    why: "4.2 km (2.61 mi) matches no rung on the row's own ladder and understates the approach, which makes the planner optimistic; the furthest recorded rung, at the base of the west face, is 3.5 mi" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
