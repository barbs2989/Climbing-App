// Batch 5 of the summit-before-approach reordering: 12 routes, read individually.
// Contract in scripts/lib/reorder-waypoints.mjs — permutation-only, `expect` refuses a moved row.
//
// GIBRALTAR LEDGES AND CURTIS RIDGE ARE THE PAIR TO REMEMBER, and they sit on the same mountain.
// Both trail a Rainier high camp after the summit. Gibraltar's Camp Muir is the APPROACH camp its
// own approach walks to from Paradise, so it moves. Curtis Ridge's Camp Schurman is the DESCENT —
// that route tops out near the Winthrop/Emmons basin and goes over the summit to reach it — so it
// was left alone in batch 4. Identical shape, opposite answer, and only the prose separates them.
//
// TWO LARGER REARRANGEMENTS, both of which reduce to "move the pins that are plainly out of place
// and leave every other pin's relative order untouched":
//   * Burgner-Stanley — the approach pins already run 4.75 -> 9.5 mi in order; only the summit and
//     the south-face base are misplaced. The base goes before the P5 chockstone (a pitch on the
//     climb) and the summit after it, leaving the north-face rappel trailing, where a descent pin
//     belongs.
//   * Ptarmigan Traverse — everything between runs 3.6 -> 24 mi in order already. Only the
//     trailhead (listed LAST, with no distance) and Dome Peak (listed FIRST) are wrong, so the fix
//     is exactly: trailhead to the front, summit to the back.
//
// Dry run by default. Pass --apply to write.
import { runReorder } from "../lib/reorder-waypoints.mjs";

const EDITS = [
  // --- two pins, trailhead second ---
  { id: "wa_mount_rainier_fuhrer_thumb", order: [1, 0], why: "two pins, and the trailhead is listed second",
    expect: ["Summit|Columbia Crest", "Trailhead|Paradise"] },
  { id: "wa_mount_stuart_the_gendarme", order: [1, 0], why: "two pins, and the trailhead is listed second",
    expect: ["Summit|Mount Stuart summit", "Trailhead|Stuart Lake Trailhead"] },
  { id: "wa_mount_terror_stoddard_buttress", order: [1, 0], why: "two pins, and the trailhead is listed second",
    expect: ["Summit|Mount Terror summit", "Trailhead|Goodell Creek"] },
  { id: "wa_mount_terror_west_ridge", order: [1, 0], why: "two pins, and the trailhead is listed second",
    expect: ["Summit|Mount Terror summit", "Trailhead|Goodell Creek"] },
  { id: "wa_needle_peak_north_ridge", order: [1, 0], why: "two pins, and the trailhead is listed second",
    expect: ["Summit|Needle Peak Summit", "Trailhead|High Bridge"] },

  // --- one more Dikes sport route ---
  { id: "wa_notta_slab", order: [0, 2, 1], why: "the wall the route starts on cannot follow the topout",
    expect: ["Trailhead|Middle Point Ridge Trailhead", "Topout|Megadike North", "Junction|Megadike North wall"] },

  // --- an approach feature the route's own prose reaches before the top ---
  { id: "wa_mount_rainier_gibraltar_ledges", order: [0, 2, 1],
    why: "Camp Muir is the APPROACH high camp — the route walks Paradise -> Skyline Trail -> Muir Snowfield -> Camp Muir. Contrast Curtis Ridge, where Camp Schurman is the descent and was left alone",
    expect: ["Trailhead|Paradise", "Summit|Columbia Crest", "Campsite|Camp Muir"] },
  { id: "wa_mount_stone_putvin", order: [0, 2, 1],
    why: "the route is NAMED \"Putvin Trail / Lake of the Angels Scramble\" — the lake is on the way up",
    expect: ["Trailhead|Putvin Trailhead", "Summit|Mount Stone", "Campsite|Lake of the Angels"] },
  { id: "wa_prusik_peak_der_sportsman", order: [0, 2, 1],
    why: "the south face base is where the climbing starts, so it precedes the summit",
    expect: ["Trailhead|Stuart Lake Trailhead", "Summit|Prusik Peak Summit", "Campsite|Prusik Peak south face base"] },
  { id: "wa_mount_stuart_ice_cliff_glacier", order: [0, 3, 2, 1],
    why: "the approach leaves the Stuart Lake trail at a climbers' path and reaches the base bivy, so both precede the summit and the junction comes first",
    expect: ["Trailhead|Stuart Lake Trailhead", "Summit|Mount Stuart Summit",
             "Campsite|Ice Cliff Glacier base bivy", "Junction|Climbers"] },

  // --- the two larger rearrangements ---
  { id: "wa_prusik_peak_south_face_burgner_stanley", order: [0, 2, 3, 4, 5, 8, 6, 1, 7],
    why: "the approach pins already run 4.75 -> 9.5 mi in order; only the summit and the south-face base are misplaced. Base before the P5 chockstone, summit after it, north-face rappel left trailing as a descent pin should be",
    expect: ["Trailhead|Stuart Lake Trailhead", "Summit|Prusik Peak Summit", "Water|Colchuck Lake",
             "Hazard|Aasgard Pass", "Water|Lake Viviane", "Junction|Gnome Tarn",
             "Hazard|Chockstone squeeze", "Hazard|North face rappel descent", "Campsite|Prusik Peak south face base"] },
  { id: "wa_ptarmigan_traverse", order: [10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0],
    why: "everything between already runs 3.6 -> 24 mi in order; only the trailhead (listed LAST) and Dome Peak (listed FIRST) are wrong. Trailhead to the front, summit to the back, nothing else touched",
    expect: ["Summit|Dome Peak", "Junction|Cascade Pass", "Junction|Cache Col", "Campsite|Kool-Aid Lake",
             "Hazard|Red Ledges", "Campsite|Yang-Yang Lakes", "Junction|Spider-Formidable Col",
             "Campsite|White Rock Lakes", "Junction|Spire Point", "Campsite|Cub Lake",
             "Trailhead|Cascade Pass Trailhead"] },
];

process.exit(await runReorder(EDITS, { apply: process.argv.includes("--apply") }));
