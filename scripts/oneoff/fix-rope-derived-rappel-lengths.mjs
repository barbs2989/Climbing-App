// A rope's reach, stored 50 times as a per-station measurement.
//
// MEASURED FIRST, because the size of this is the finding. Across the 147 WA rows carrying a rappel
// table there are 592 stations, 463 of them with a length — and 421 of those 463 (90.9%) land
// EXACTLY on a value a rope produces: 25/30/35/40 m are 50/60/70/80 m ropes doubled, and 50/55/60/70
// are near-full two-rope rappels. 268 stations — 58% of every length in the catalog — are exactly
// 30 m, which is one 60 m rope doubled. Half the rows (74 of 147) state the IDENTICAL length at
// every station. The remainder of the histogram is what real measurements look like: 30.5 (100 ft),
// 23, 26, 32, 33.5 — 42 stations in total.
//
// So this column is largely recording the rack rather than the cliff, and it is the field a party
// rigs from. A stated 30 m on a 60 m rope leaves ZERO margin; if the real station is 32 m the rope
// does not reach. That is the rope-off-the-end shape, which is the worst thing in this dataset to
// get wrong.
//
// THE GATE IS THE ROW'S OWN CONFESSION, AND IT HAD TO BE NARROWED TWICE.
// Sweeping all 74 uniform rows would be wrong: 48 of them carry a note that concedes only the
// COUNT — "Six is the commonly cited/historical rappel count", "Trip reports describe a range of
// about 12-14 total" — which says nothing whatever about the lengths. A first gate keyed on any
// admission word caught 29 rows and would have nulled measured data on that reasoning alone.
// Requiring the admission to be ABOUT a length, in the same clause, gives 18; reading all 18 in
// full gives the 13 below. The five dropped, and why, so nobody re-derives them:
//   wa_mount_shuksan_hanging_glacier   "3 is a representative middle count" — the COUNT, not lengths
//   wa_nooksack_tower_beckey_route     "Cited range is 10-12 rappels TO 30M" — the source gives 30 m
//   wa_a_servant_to_liberty            admits only the FIRST rappel is approximated
//   wa_gunrunner                       admits the count; and its 7 x 55 m stations against a single
//                                      60 m rope is a rope-too-short defect needing its own look
//   wa_liberty_bell_beckey_route       its note holds BETTER data than its table — "the two lower
//                                      rappels are reported at about 25 m each" against a stored 30,
//                                      so the repair there is a correction, not a deletion
//
// THE NOTES ARE REPAIRED IN THE SAME WRITE, and that is not tidiness. check:rappel-lengths exists in
// part because "a table can be corrected while rappel_count_note still states the method that
// produced the wrong value, and the next enrichment pass then re-derives them". Every note below
// names the rope it derived from; left alone, each is a recipe for putting the number back.
//
// NULLED, NEVER HALVED OR RE-ESTIMATED. null is the correct value where no source gives a distance.
// Nothing a party needs is lost: the rope configuration survives in `rappels`, `rope_length_m`,
// `rope_type` and the note, and RappelTable prints "—" for an unknown station and sums only the
// ones it knows.
//
// TWO SEPARATE DEFECTS FOUND ON THE WAY AND DELIBERATELY NOT TOUCHED HERE, so they are not lost:
//   wa_bear_mountain_chilliwack_north_buttress stores `rappels` = "None — 3rd/4th class walk-off
//     descent" while carrying a two-station rappel table. One of those is wrong.
//   wa_mount_mystery_standard stores rope_length_m = 30 while its own note describes "two
//     single-rope (60m) rappels". A 30 m rope doubled reaches 15 m.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  // wa_mount_fury_east_mongo_ridge — 11 station(s), each stating 30 m
  { kind: "set", route: "wa_mount_fury_east_mongo_ridge", path: "rappel_detail.1.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_mount_fury_east_mongo_ridge", path: "rappel_detail.2.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_mount_fury_east_mongo_ridge", path: "rappel_detail.3.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_mount_fury_east_mongo_ridge", path: "rappel_detail.4.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_mount_fury_east_mongo_ridge", path: "rappel_detail.5.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_mount_fury_east_mongo_ridge", path: "rappel_detail.6.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_mount_fury_east_mongo_ridge", path: "rappel_detail.7.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_mount_fury_east_mongo_ridge", path: "rappel_detail.8.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_mount_fury_east_mongo_ridge", path: "rappel_detail.9.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_mount_fury_east_mongo_ridge", path: "rappel_detail.10.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_mount_fury_east_mongo_ridge", path: "rappel_detail.11.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  // wa_forbidden_peak_east_ridge — 5 station(s), each stating 30 m
  { kind: "set", route: "wa_forbidden_peak_east_ridge", path: "rappel_detail.0.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_forbidden_peak_east_ridge", path: "rappel_detail.1.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_forbidden_peak_east_ridge", path: "rappel_detail.2.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_forbidden_peak_east_ridge", path: "rappel_detail.3.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_forbidden_peak_east_ridge", path: "rappel_detail.4.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  // wa_chianti_spire_east_face — 4 station(s), each stating 55 m
  { kind: "set", route: "wa_chianti_spire_east_face", path: "rappel_detail.0.lengthM",
    expect: "02d20bbd7e394ad5", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_chianti_spire_east_face", path: "rappel_detail.1.lengthM",
    expect: "02d20bbd7e394ad5", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_chianti_spire_east_face", path: "rappel_detail.2.lengthM",
    expect: "02d20bbd7e394ad5", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_chianti_spire_east_face", path: "rappel_detail.3.lengthM",
    expect: "02d20bbd7e394ad5", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  // wa_east_face_variation — 4 station(s), each stating 30 m
  { kind: "set", route: "wa_east_face_variation", path: "rappel_detail.0.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_east_face_variation", path: "rappel_detail.1.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_east_face_variation", path: "rappel_detail.2.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_east_face_variation", path: "rappel_detail.3.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  // wa_north_ridge_3 — 4 station(s), each stating 30 m
  { kind: "set", route: "wa_north_ridge_3", path: "rappel_detail.1.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_north_ridge_3", path: "rappel_detail.2.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_north_ridge_3", path: "rappel_detail.3.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_north_ridge_3", path: "rappel_detail.4.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  // wa_big_four_mountain_spindrift_couloir — 3 station(s), each stating 30 m
  { kind: "set", route: "wa_big_four_mountain_spindrift_couloir", path: "rappel_detail.0.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_big_four_mountain_spindrift_couloir", path: "rappel_detail.1.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_big_four_mountain_spindrift_couloir", path: "rappel_detail.2.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  // wa_direct_west_face — 3 station(s), each stating 55 m
  { kind: "set", route: "wa_direct_west_face", path: "rappel_detail.0.lengthM",
    expect: "02d20bbd7e394ad5", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_direct_west_face", path: "rappel_detail.1.lengthM",
    expect: "02d20bbd7e394ad5", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_direct_west_face", path: "rappel_detail.2.lengthM",
    expect: "02d20bbd7e394ad5", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  // wa_johannesburg_mountain_cj_couloir — 3 station(s), each stating 30 m
  { kind: "set", route: "wa_johannesburg_mountain_cj_couloir", path: "rappel_detail.0.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_johannesburg_mountain_cj_couloir", path: "rappel_detail.1.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_johannesburg_mountain_cj_couloir", path: "rappel_detail.2.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  // wa_south_early_winter_spire_direct_east_buttress — 3 station(s), each stating 30 m
  { kind: "set", route: "wa_south_early_winter_spire_direct_east_buttress", path: "rappel_detail.0.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_south_early_winter_spire_direct_east_buttress", path: "rappel_detail.1.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_south_early_winter_spire_direct_east_buttress", path: "rappel_detail.2.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  // wa_southern_man — 3 station(s), each stating 30 m
  { kind: "set", route: "wa_southern_man", path: "rappel_detail.0.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_southern_man", path: "rappel_detail.1.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_southern_man", path: "rappel_detail.2.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  // wa_the_rake_traverse_route — 3 station(s), each stating 30 m
  { kind: "set", route: "wa_the_rake_traverse_route", path: "rappel_detail.0.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_the_rake_traverse_route", path: "rappel_detail.1.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_the_rake_traverse_route", path: "rappel_detail.2.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  // wa_mount_mystery_standard — 2 station(s), each stating 30 m
  { kind: "set", route: "wa_mount_mystery_standard", path: "rappel_detail.0.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_mount_mystery_standard", path: "rappel_detail.1.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  // wa_bear_mountain_chilliwack_north_buttress — 2 station(s), each stating 25 m
  { kind: "set", route: "wa_bear_mountain_chilliwack_north_buttress", path: "rappel_detail.0.lengthM",
    expect: "b7a56873cd771f2c", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },
  { kind: "set", route: "wa_bear_mountain_chilliwack_north_buttress", path: "rappel_detail.1.lengthM",
    expect: "b7a56873cd771f2c", value: null,
    why: "a rope's reach stored as a per-station measurement, on a row whose own note says so" },

  { kind: "edit", route: "wa_mount_fury_east_mongo_ridge", path: "rappel_count_note",
    expect: "f9d9fceda2282a63", count: 1,
    find: "Individual rappel lengths are not recorded and are assumed typical single-rope lengths.",
    repl: "Individual rappel lengths are not recorded, so no per-station length is shown.",
    why: "the note names the rope the lengths were derived from, so it would seed them again" },
  { kind: "edit", route: "wa_forbidden_peak_east_ridge", path: "rappel_count_note",
    expect: "51acd953cea296e6", count: 1,
    find: "Individual lengths aren't stated, estimated from a 60m rope doubled.",
    repl: "Individual lengths aren't stated, so no per-station length is shown.",
    why: "the note names the rope the lengths were derived from, so it would seed them again" },
  { kind: "edit", route: "wa_chianti_spire_east_face", path: "rappel_count_note",
    expect: "e5014454b2ff6e50", count: 1,
    find: "Lengths approximated as near-full double-rope rappels using two 60m ropes; exact per-station lengths aren't given.",
    repl: "Exact per-station lengths aren't given, so none is shown; two 60m ropes are recommended.",
    why: "the note names the rope the lengths were derived from, so it would seed them again" },
  { kind: "edit", route: "wa_east_face_variation", path: "rappel_count_note",
    expect: "499ab27eeb101549", count: 1,
    find: "so lengths below are approximate.",
    repl: "so no per-station length is shown.",
    why: "the note names the rope the lengths were derived from, so it would seed them again" },
  { kind: "edit", route: "wa_north_ridge_3", path: "rappel_count_note",
    expect: "546c7a6bd91738e5", count: 1,
    find: "Lengths for the West Ridge portion are approximated from a single 60m rope.",
    repl: "Per-station lengths are not published, so none is shown.",
    why: "the note names the rope the lengths were derived from, so it would seed them again" },
  { kind: "edit", route: "wa_big_four_mountain_spindrift_couloir", path: "rappel_count_note",
    expect: "1ba6458612c00bbb", count: 1,
    find: "this is an approximate reconstruction (col rap + 3 bowl raps), not a verified topo.",
    repl: "this is an approximate reconstruction of the count (col rap + 3 bowl raps), not a verified topo, and no per-station length is shown.",
    why: "the note names the rope the lengths were derived from, so it would seed them again" },
  { kind: "edit", route: "wa_direct_west_face", path: "rappel_count_note",
    expect: "e36ccbd2fbcd3391", count: 1,
    find: "Individual lengths aren't given in feet/meters; approximated near double-rope (2x60m) capacity since exact per-rap distances aren't documented.",
    repl: "Individual lengths aren't given in feet/meters and exact per-rap distances aren't documented, so no per-station length is shown.",
    why: "the note names the rope the lengths were derived from, so it would seed them again" },
  { kind: "edit", route: "wa_johannesburg_mountain_cj_couloir", path: "rappel_count_note",
    expect: "a07d11aa795a6d75", count: 1,
    find: "The breakdown below is a representative reconstruction using 30m as a typical single-rope-length rappel and should be treated as approximate, not confirmed beta",
    repl: "The breakdown below is a representative reconstruction of the count and should be treated as approximate, not confirmed beta, with no per-station length shown",
    why: "the note names the rope the lengths were derived from, so it would seed them again" },
  { kind: "edit", route: "wa_south_early_winter_spire_direct_east_buttress", path: "rappel_count_note",
    expect: "bc6dbff6170a13a2", count: 1,
    find: "Lengths here are inferred from the single 60 m rope the line was built for, not measured.",
    repl: "Per-station lengths are neither measured nor published, so none is shown.",
    why: "the note names the rope the lengths were derived from, so it would seed them again" },
  { kind: "edit", route: "wa_southern_man", path: "rappel_count_note",
    expect: "26adc15464b6a54b", count: 1,
    find: "per-rap lengths approximated from the stated single 60m rope.",
    repl: "per-rap lengths are not published, so none is shown.",
    why: "the note names the rope the lengths were derived from, so it would seed them again" },
  { kind: "edit", route: "wa_the_rake_traverse_route", path: "rappel_count_note",
    expect: "ddbd43bac4fec9ca", count: 1,
    find: "Treat lengths as approximate.",
    repl: "No per-station length is shown.",
    why: "the note names the rope the lengths were derived from, so it would seed them again" },
  { kind: "edit", route: "wa_mount_mystery_standard", path: "rappel_count_note",
    expect: "eb5bec215a85b39a", count: 1,
    find: "exact per-rappel lengths aren't specified in sources, so lengths below are estimated as roughly half the 60m rope.",
    repl: "exact per-rappel lengths aren't specified in sources, so no per-station length is shown.",
    why: "the note names the rope the lengths were derived from, so it would seed them again" },
  { kind: "edit", route: "wa_bear_mountain_chilliwack_north_buttress", path: "rappel_count_note",
    expect: "7f4efcf0d60f8db3", count: 1,
    find: "; treated as approximate, shorter rappels.",
    repl: ", so no per-station length is shown.",
    why: "the note names the rope the lengths were derived from, so it would seed them again" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,rappel_detail,rappel_count_note",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
