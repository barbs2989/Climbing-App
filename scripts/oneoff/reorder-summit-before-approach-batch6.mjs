// Batch 6 of the summit-before-approach reordering: 14 routes. This completes the read of all 81.
// Contract in scripts/lib/reorder-waypoints.mjs — permutation-only, `expect` refuses a moved row.
//
// READ AND LEFT ALONE IN THIS PASS:
//   * wa_soviet_route — the trailing Hazard is the DESCENT: "from the Southwest Peak, traverse the
//     Northeast Ridge to the West Peak". Correctly after the summit.
//   * wa_this_my_friend — the trailing "Aasgard Pass" is plausibly the descent rejoining the trail,
//     and the approach already has its own "Aasgard Pass trail (south shore)" pin at 4.2 mi. Which
//     of the two it is decides where it goes, and the row does not say.
//   * wa_roan_wall_center_stage, wa_roan_wall_stage_right, wa_waterfall_buttress — same shape as
//     wa_flight_of_the_falcon in batch 2: the "Topout" is named "Waterfall Basin (base of ...)",
//     i.e. the BASE mistyped as a topout, with the same basin again behind it. A type and
//     duplication question; reordering would not fix it and would hide it.
//
// FOUR HERE USE THE MOVE-THE-SUMMIT FORM because a trailing pin's exact slot is not knowable:
// tepeh_towers (a glacier-to-rock crossing "below the towers" — at or just before the base, the
// row does not say which) and west_face_2 (whose two trailing camps are the SAME col spelled two
// ways). Moving only the summit puts every out-of-place pin ahead of it without needing an opinion
// about their order among themselves.
//
// Dry run by default. Pass --apply to write.
import { runReorder } from "../lib/reorder-waypoints.mjs";

const EDITS = [
  // --- two pins, trailhead second ---
  { id: "wa_sherman_peak_baker_squak_glacier", order: [1, 0], why: "two pins, and the trailhead is listed second",
    expect: ["Summit|Sherman Peak summit", "Trailhead|Schriebers Meadow"] },
  { id: "wa_sherpa_balanced_rock_ne_couloir", order: [1, 0], why: "two pins, and the trailhead is listed second",
    expect: ["Summit|Sherpa Peak / Balanced Rock summit", "Trailhead|Stuart Lake Trailhead"] },
  { id: "wa_sloan_peak_r1", order: [1, 0], why: "two pins, and the trailhead is listed second",
    expect: ["Summit|Sloan Peak summit", "Trailhead|Bedal Creek Trailhead"] },
  { id: "wa_spider_mountain_north_face", order: [1, 0], why: "two pins, and the trailhead is listed second",
    expect: ["Summit|Spider Mountain summit", "Trailhead|Cascade Pass Trailhead"] },
  { id: "wa_sw_ridge", order: [1, 0], why: "two pins, and the trailhead is listed second",
    expect: ["Summit|Middle Gunsight summit", "Trailhead|High Bridge"] },

  // --- the last Dikes sport route ---
  { id: "wa_red_zinger", order: [0, 2, 1], why: "the wall the route starts on cannot follow the topout",
    expect: ["Trailhead|Middle Point Ridge Trailhead", "Topout|Megadike North", "Junction|Megadike North wall"] },

  // --- an approach feature the route's own prose reaches before the top ---
  { id: "wa_red_mountain_snoqualmie_standard", order: [0, 2, 1],
    why: "Red Pass is on the PCT approach this route starts on",
    expect: ["Trailhead|PCT North Trailhead", "Summit|Red Mountain Summit", "Junction|Red Pass"] },
  { id: "wa_sloan_peak_corkscrew", order: [0, 2, 1],
    why: "the climbers' trail turnoff is where the approach leaves the Bedal Creek trail",
    expect: ["Trailhead|Bedal Creek / Bedal Basin Trailhead", "Summit|Sloan Peak Summit", "Junction|Climber"] },
  { id: "wa_stanley_burgner", order: [0, 1, 3, 2],
    why: "the south face base sits between Gnome Tarn (8 mi) and the summit (9 mi) — the only gap it can occupy",
    expect: ["Trailhead|Stuart Lake Trailhead", "Junction|Gnome Tarn", "Summit|Prusik Peak", "Campsite|Prusik Peak south face base"] },

  // --- two trailing pins whose ORDER is settled by the route itself ---
  { id: "wa_south_ridge_2", order: [0, 2, 3, 1],
    why: "both Access Creek crossings are approach features, and they are alternates of each other so their relative order is kept",
    expect: ["Trailhead|Ross Dam Trail", "Summit|Luna Peak summit", "Junction|Access Creek crossing", "Junction|Access Creek crossing"] },
  { id: "wa_three_fingers_south_peak_lookout", order: [0, 2, 3, 1],
    why: "the approach walks Tupso Pass -> Saddle Lake -> Goat Flats -> Tin Can Gap -> the lookout, in that order",
    expect: ["Trailhead|Three Fingers / Goat Flats Trailhead", "Summit|Three Fingers South Peak", "Junction|Goat Flat", "Junction|Tin Can Gap"] },
  { id: "wa_west_craggy_peak_standard_route", order: [0, 2, 3, 1],
    why: "the approach walks the Copper Glance trail past the creek crossing (1.6 mi) to the basin camp, then up",
    expect: ["Trailhead|Copper Glance Trailhead", "Summit|West Craggy Peak summit", "Water|Copper Glance Creek crossing", "Campsite|Copper Glance Basin camp"] },

  // --- move-the-summit only: a trailing pin's exact slot is not knowable ---
  { id: "wa_tepeh_towers", order: [0, 1, 2, 4, 3],
    why: "the glacier-to-rock crossing is \"below Tepeh Towers\" so it precedes the top, but whether it sits at or just before the base is not stated — moving only the summit needs no view on that",
    expect: ["Trailhead|Eldorado Creek", "Campsite|Eldorado (East Ridge) camp", "Junction|Base of Tepeh Towers",
             "Summit|Tepeh Towers", "Approach|Glacier-to-rock crossing"] },
  { id: "wa_west_face_2", order: [0, 2, 3, 4, 1],
    why: "both camps are approach; the last two are the SAME col spelled two ways (Chikamin-Dome / Dome-Chickamin), so moving only the summit avoids taking a view on a duplicate",
    expect: ["Trailhead|Downey Creek Trailhead", "Summit|North Peak Summit", "Campsite|Bachelor Flats",
             "Campsite|Chikamin-Dome Col", "Junction|Dome-Chickamin Col"] },
];

process.exit(await runReorder(EDITS, { apply: process.argv.includes("--apply") }));
