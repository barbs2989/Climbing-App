// Three rows that disagree with themselves — one place under two names at two elevations, a
// mileage that contradicts the row's own itinerary, and a district-wide pass rule read as a
// statement about a trailhead the same row says needs no pass.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

// ---------------------------------------------------------------------------------------------
// wa_sherpa_peak_west_ridge stores ONE camp twice, under two names and two elevations: the
// waypoint calls it "Stuart basin bivy" at 6,300 ft, while the row's own bivy entry calls it
// "Sherpa south basin camp" at 6,200 ft. The bivy entry is the correct one on both counts —
// the camp is in the SHERPA south basin, not Stuart's, and 6,200 is what the published record
// and that bivy entry agree on.
//
// The waypoint's COORDINATE is separately suspect (the ground under it disagrees with its
// stated elevation, and the neighbouring Long's Pass pin errs the opposite way, which points at
// hand-dropped pins rather than a systematic offset). It is NOT touched here: no source
// establishes a replacement, and minting one is the defect this catalog already carries 346 of.

// ---------------------------------------------------------------------------------------------
// wa_switchback_mountain_scramble.approach states a round trip of ~16 miles and ~4,800 ft of
// gain. Both contradict the row's own itinerary, which totals 19.0 miles across its two days
// and whose sub-totals sum to the 5,560 ft that gain_ft now holds. The figures trace to a
// published LOOP, not to this out-and-back.

// ---------------------------------------------------------------------------------------------
// wa_nooksack_tower_beckey_route.access.parking_pass is forest-wide boilerplate, and read as a
// statement about THIS trailhead it contradicts two other fields of the same row: access.fees
// says "No pass currently required for parking at the Nooksack Cirque (Ruth Creek) trailhead
// itself" and passRequired says "None confirmed for the Nooksack Cirque trailhead". Scoped
// rather than deleted — the district-wide rule is true and useful for the drive in. The figures
// are left exactly as they stand; they are not what is being corrected.
const NOOK_PARKING = "Northwest Forest Pass is the district-wide requirement at developed trailheads — $30/year or $5/day — but it does not apply at the Nooksack Cirque (Ruth Creek) trailhead itself, where no pass is currently required.";

const REPAIRS = [
  { kind: "set", route: "wa_sherpa_peak_west_ridge", path: "waypoints.2.name",
    expect: "d50696609831ae64", value: "Sherpa south basin camp",
    why: "the row's own bivy entry names this same camp, in the Sherpa basin rather than Stuart's" },
  { kind: "set", route: "wa_sherpa_peak_west_ridge", path: "waypoints.2.elev",
    expect: "defdae444b7e1819", value: 6200,
    why: "the row's own bivy entry for the same camp says 6,200, and so does the published record" },

  { kind: "edit", route: "wa_switchback_mountain_scramble", path: "approach",
    expect: "c8a337ee69be464a",
    find: "Round trip is roughly 16 miles with about 4,800 ft of gain",
    repl: "Round trip is roughly 19 miles with about 5,560 ft of gain",
    count: 1,
    why: "contradicted the row's own itinerary (19.0 mi across two days) and its own gain_ft; the figures are a published loop's" },

  { kind: "set", route: "wa_nooksack_tower_beckey_route", path: "access.parking_pass",
    expect: "14ec5d0225074a15", value: NOOK_PARKING,
    why: "forest-wide boilerplate read as a claim about a trailhead two other fields of the same row say needs no pass" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
