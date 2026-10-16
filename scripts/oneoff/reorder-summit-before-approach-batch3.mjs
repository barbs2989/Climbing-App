// Batch 3 of the summit-before-approach reordering: 11 routes, read individually.
//
// The contract now lives in scripts/lib/reorder-waypoints.mjs rather than being copied a third
// time — see that file for why it is permutation-only and why batches 1 and 2 keep their copies.
//
// WHAT WAS READ AND LEFT ALONE IN THIS PASS:
//   * wa_le_conte_mountain_northern_aspect — Cascade Pass appears TWICE, at 3.7 mi and 3.6 mi, once
//     each side of the summit. A duplication question, not an ordering one.
//   * wa_luna_peak_southeast_slopes — the trailing "Access Creek crossing (larger log jam)" carries
//     no distMi in a 9-pin list where every other pin does. It plausibly sits between the Big
//     Beaver ford (19 mi) and Access Creek Basin (20 mi), and "plausibly" is a guess. Same call as
//     wa_cutthroat_west_ridge in batch 1; being consistent about that matters more than one fix.
//
// Dry run by default. Pass --apply to write.
import { runReorder } from "../lib/reorder-waypoints.mjs";

const EDITS = [
  // --- three more Dikes sport routes: the WALL the climb starts on, listed after the topout ---
  { id: "wa_lady_slipper", order: [0, 2, 1], why: "the wall the route starts on cannot follow the topout",
    expect: ["Trailhead|Middle Point Ridge Trailhead", "Topout|Megadike North", "Junction|Megadike North wall"] },
  { id: "wa_monkey_on_a_woodpile", order: [0, 2, 1], why: "same crag, same shape",
    expect: ["Trailhead|Middle Point Ridge Trailhead", "Topout|Megadike North", "Junction|Megadike North wall"] },
  { id: "wa_morning_thunder", order: [0, 2, 1], why: "same crag, same shape",
    expect: ["Trailhead|Middle Point Ridge Trailhead", "Topout|Megadike North", "Junction|Megadike North wall"] },

  // --- two pins, trailhead second ---
  { id: "wa_lane_peak_r3", order: [1, 0], why: "two pins, and the trailhead is listed second",
    expect: ["Summit|Lane Peak summit", "Trailhead|Narada Falls trailhead"] },
  { id: "wa_lincoln_peak_wilkes_booth", order: [1, 0], why: "two pins, and the trailhead is listed second",
    expect: ["Summit|Lincoln Peak Summit", "Trailhead|Heliotrope Ridge Trailhead"] },
  { id: "wa_little_tahoma_cowlitz_ingraham_glaciers", order: [1, 0], why: "two pins, and the trailhead is listed second",
    expect: ["Summit|Little Tahoma Peak summit", "Trailhead|Paradise (Skyline Trail)"] },

  // --- an approach feature the route's own prose reaches before the top ---
  { id: "wa_mount_adams_wilson_glacier_headwall", order: [0, 2, 1],
    why: "the Wilson Glacier IS the face this route climbs, so it precedes the summit",
    expect: ["Trailhead|South Climb / Cold Springs Trailhead", "Summit|Mount Adams summit", "Junction|Wilson Glacier"] },
  { id: "wa_mount_carrie_se_route", order: [0, 2, 1],
    why: "its descent reverses \"back into Cat Basin, then retrace the long approach trail\" — the basin is on the way up",
    expect: ["Trailhead|Sol Duc Trailhead", "Summit|Mount Carrie", "Campsite|Cat Basin / High Divide"] },
  { id: "wa_mount_cruiser_south_corner", order: [0, 2, 1],
    why: "Needle Pass is the standard approach to Cruiser from the North Fork Skokomish",
    expect: ["Trailhead|Staircase Ranger Station", "Summit|Mount Cruiser", "Junction|Needle Pass"] },

  // --- two trailing pins whose ORDER is settled by the route itself ---
  { id: "wa_mount_anderson_eel_glacier", order: [0, 3, 2, 1],
    why: "the approach walks Dosewallips -> Anderson Pass -> Eel Glacier -> Flypaper Pass -> summit, so both passes precede the top and Anderson comes first",
    expect: ["Trailhead|Dosewallips Road-End", "Summit|Mount Anderson (East Peak)", "Junction|Flypaper Pass", "Junction|Anderson Pass"] },
  { id: "wa_mount_chaval_scramble", order: [0, 2, 3, 1],
    why: "both trailing pins CARRY distances (1.5 and 3 mi) that order them; only the summit lacks one, and it is the far point",
    expect: ["Trailhead|Arrow Creek switchback", "Summit|Mount Chaval Summit", "Hazard|Cliff/gully route-finding crux", "Junction|Base of west face ramp"] },
];

process.exit(await runReorder(EDITS, { apply: process.argv.includes("--apply") }));
