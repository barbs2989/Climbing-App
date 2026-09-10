// Two rows that disagree with themselves about their own high point — settled from inside the row,
// with no DEM and no external source.
//
// THAT MATTERS HERE MORE THAN USUAL, because most of the high_point_ft verdicts in this backlog are
// NOT usable. Four of the eight say some version of "USGS 3DEP reads X, which lands within 0 ft of
// the competing figure X, so the ground favours the rival" — where the competing figure IS the DEM
// reading. That is the instrument agreeing with itself, and acting on it would have reverted the
// Lincoln Peak repair this sweep already made. The two below need none of that.
//
// -------------------------------------------------------------------------------------------------
// wa_little_mac_spire_southwest_route — high_point_ft says 7,736; the row's OWN summit waypoint says
// 7,680 in BOTH spellings (elev and elevFt). Nothing else in the row says 7,736 except one itinerary
// line, which is repaired with it. high_point_ft is copied from the waypoint rather than typed.
//
// -------------------------------------------------------------------------------------------------
// wa_kololo_peaks_standard — the row names the WRONG SUMMIT as its high point, three records to one.
//
//   summit waypoint   "Kololo Peaks (west summit)", elev 8,240
//   high_point_ft     8,240
//   pitch_detail      "the higher west/main summit"
//   beta              "...between the east summit (8,243 ft, true high point) and west summit (8,220 ft)"
//
// So beta is the outlier and it is the field that tells a party which of two bumps to stand on. Its
// two itinerary echoes — "Climb Kololo Peaks' true (east) summit, 8,243 ft" and "High point,
// 8,243 ft" — go with it.
//
// THE REPLACEMENT NUMBERS COME FROM THE ROW, NOT FROM A MEASUREMENT. 8,240 is what the summit pin and
// high_point_ft already store. The east summit's height is deliberately NOT restated: the row's own
// two records for it disagree (beta's 8,220 against pitch_detail's "near 8,160+ ft"), and picking
// between them would be inventing the more precise of two guesses. Saying it is lower is the part
// that is established.
//
// A NOTE ON THE STAGING, since it is the reason this is one script rather than three. The engine
// stages by (route, column), and a second repair to the SAME path would declare a hash computed
// against the pre-edit value and be refused as moved — which is what happened on Mount Constance
// earlier in this sweep. But each repair reads at its OWN path, so edits to DIFFERENT leaves of one
// jsonb column compose fine. beta, itinerary.days.1.objective and
// itinerary.days.1.schedule.3.detail are three distinct paths.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  { kind: "copy", route: "wa_little_mac_spire_southwest_route", path: "high_point_ft",
    expect: "775e18068d6e30a3", from: "waypoints.7.elev",
    why: "7,736 against the row's own summit waypoint, which says 7,680 in both spellings" },
  { kind: "edit", route: "wa_little_mac_spire_southwest_route",
    path: "itinerary.days.1.schedule.3.detail", expect: "ae6ccc29d92dd868", count: 1,
    find: "7,736 ft high point",
    repl: "7,680 ft high point",
    why: "the only other place the row repeats the figure its own summit pin contradicts" },

  { kind: "edit", route: "wa_kololo_peaks_standard", path: "beta", expect: "f0ee2178a8efeee8", count: 1,
    find: "between the east summit (8,243 ft, true high point) and west summit (8,220 ft).",
    repl: "between the west summit (8,240 ft, the true high point) and the slightly lower east summit.",
    why: "beta names the east bump as the high point against the pin, high_point_ft and pitch_detail" },
  { kind: "edit", route: "wa_kololo_peaks_standard",
    path: "itinerary.days.1.objective", expect: "975816523686c22e", count: 1,
    find: "true (east) summit, 8,243 ft",
    repl: "true (west) summit, 8,240 ft",
    why: "the day's objective sends a party to the wrong one of two summits" },
  { kind: "edit", route: "wa_kololo_peaks_standard",
    path: "itinerary.days.1.schedule.3.detail", expect: "3470585a72fef098", count: 1,
    find: "High point, 8,243 ft",
    repl: "High point, 8,240 ft",
    why: "the same figure in the day's schedule" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,high_point_ft,waypoints,beta,itinerary",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
