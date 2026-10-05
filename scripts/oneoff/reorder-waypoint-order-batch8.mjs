// Batch 8 of waypoint reordering — permutation only, contract in scripts/lib/reorder-waypoints.mjs.
// Companion to fix-waypoint-order-batch8.mjs (pins cleared, moved and copied).
//
// TWO SHAPES:
//   * STORED ORDER != DRAWN ORDER on four routes the app CAN sort (every pin has distMi). The
//     screen was already right; audit:waypoint-order listed them as "the app reorders at render
//     time". Writing the order the app already draws changes nothing a climber sees, and makes
//     every other reader of the column (scripts, exports, audits) agree with the screen.
//   * wa_boston_peak_west_face: found by the one-pin-move measurement in the batch-8 header. Its
//     approach climbs the Cascade Pass trail to ~6,400 ft BEFORE traversing to the face, so the
//     "angle point (~6,400 ft)" pin precedes the route start.
//
// Dry run by default. Pass --apply to write.
import { runReorder } from "../lib/reorder-waypoints.mjs";

const EDITS = [
  { id: "wa_little_tahoma_east_shoulder", order: [6,0,1,2,3,4,7,5],
    why: "stored order is not the order the app already draws (it sorts by distMi): trailhead first, 7.8 mi junction after the 7.54 mi summit — the stored list now matches the screen",
    expect: ["Water|Fryingpan Creek crossing", "Campsite|Summerland", "Junction|Toe of Fryingpan Glacier", "Junction|Whitman Notch", "Hazard|Whitman Glacier bergschrund", "Junction|East shoulder saddle", "Trailhead|Fryingpan Creek / Summerland Trailhead", "Summit|Little Tahoma Peak"] },
  { id: "wa_mount_mccausland_n_route", order: [0,1,3,2,4,5],
    why: "stored 2.8 before 2.7; matches the order the app already draws",
    expect: ["Trailhead|Smithbrook Trailhead", "Junction|PCT Junction", "Water|Lake Valhalla", "Junction|McCausland Climber's Path Turnoff", "Hazard|Braided Boot Path / Snow Patches", "Summit|Mount McCausland Summit"] },
  { id: "wa_mount_olympus_west_ridge", order: [0,2,3,1],
    why: "summit stored second at 19.68 mi ahead of the 17.45 / 18.43 pins; matches the order the app already draws",
    expect: ["Trailhead|Hoh River Trailhead (Hoh Rain Forest Visitor Center)", "Summit|Mount Olympus (West Peak)", "Campsite|Snow Dome high camp", "Junction|West Ridge moat (gain ridge)"] },
  { id: "wa_south_twin_sister_scramble", order: [1,0],
    why: "summit stored before the trailhead; matches the order the app already draws",
    expect: ["Summit|South Twin Sister Summit", "Trailhead|Middle Fork Nooksack Gate/Bridge"] },
  { id: "wa_boston_peak_west_face", order: [0,2,1,3],
    why: "approach text: up the Cascade Pass trail to the highest switchback (~6,400 ft), angle up, drop into Soldier Boy and traverse to the face — the 6,400 ft angle point comes BEFORE the route start",
    expect: ["Trailhead|Eldorado Creek trailhead (Cascade River Road mile 20)", "route start|West Face route start", "approach|Winter approach angle point (~6,400 ft)", "Summit|Boston Peak Summit"] },
];

process.exit(await runReorder(EDITS, { apply: process.argv.includes("--apply") }));
