// Batch 4 of the summit-before-approach reordering: 7 routes, read individually.
// Contract in scripts/lib/reorder-waypoints.mjs — permutation-only, `expect` refuses a moved row.
//
// READ AND LEFT ALONE IN THIS PASS:
//   * wa_mount_rainier_curtis_ridge — Camp Schurman trails the summit and BELONGS there: the route
//     tops out near the Winthrop/Emmons basin and its descent "continue[s] over the summit area and
//     down the Emmons-Winthrop Glacier route to Camp Schurman". The approach uses Glacier Basin
//     instead. Correct as stored.
//
// THE LAGO ENTRY IS THE SHAPE TO COPY when a list has pins on BOTH sides of the summit. Fred's Lake
// and the Shellrock Basin camp are approach; Mount Carru is not — the descent says "many parties
// traverse instead to the Lago-Carru col to tag Mount Carru before returning to camp". So the
// summit moves past two pins and stops before the third, and every pin's position relative to its
// neighbours on the same side is preserved. Moving the summit rather than the approach pins is what
// keeps that true without needing to know which of Fred's Lake or Shellrock comes first.
//
// Dry run by default. Pass --apply to write.
import { runReorder } from "../lib/reorder-waypoints.mjs";

const EDITS = [
  { id: "wa_mount_daniel_daniel_glacier", order: [0, 2, 1],
    why: "Peggys Pond is on the approach from Tucquala Meadows, not past the top",
    expect: ["Trailhead|Tucquala Meadows Trailhead", "Summit|Mount Daniel", "Junction|Peggys Pond"] },
  { id: "wa_mount_deception_standard", order: [0, 2, 1],
    why: "the route is NAMED \"Standard Scramble (Royal Basin)\" and its approach walks the Royal Basin trail",
    expect: ["Trailhead|Upper Dungeness Trailhead", "Summit|Mount Deception", "Campsite|Royal Basin / Royal Lake"] },
  { id: "wa_mount_howard_south_slope", order: [1, 0],
    why: "two pins, and the trailhead is listed second",
    expect: ["Summit|Mount Howard Summit", "Trailhead|Rock Mountain Trailhead"] },
  { id: "wa_mount_logan_r2", order: [0, 2, 1],
    why: "the Douglas Glacier IS this route — it is climbed to reach the summit, so it precedes it",
    expect: ["Trailhead|Easy Pass Trailhead", "Summit|Mount Logan summit", "Hazard|Douglas Glacier"] },
  { id: "wa_mount_olympus_blue_glacier", order: [0, 1, 3, 2],
    why: "Snow Dome sits on the Blue Glacier between Glacier Meadows (17.5 mi) and the summit (22 mi)",
    expect: ["Trailhead|Hoh River Ranger Station", "Campsite|Glacier Meadows", "Summit|Mount Olympus", "Junction|Snow Dome"] },
  { id: "wa_mount_pugh_stujack", order: [0, 2, 3, 1],
    why: "its own descent reverses \"to Stujack Pass, then follow Trail #644 back down past Lake Metan\" — so on the way up it is Metan, then the pass, then the top",
    expect: ["Trailhead|Mt. Pugh Trailhead #644", "Summit|Mount Pugh Summit", "Junction|Lake Metan", "Junction|Stujack Pass"] },
  { id: "wa_mount_lago_south_slope_south_face", order: [0, 2, 3, 1, 4],
    why: "Fred's Lake and the Shellrock camp are approach; Mount Carru is NOT — the descent tags it from the Lago-Carru col. The summit moves past the first two and stops before it",
    expect: ["Trailhead|Robinson Creek Trailhead", "Summit|Mount Lago Summit", "Water|Fred's Lake",
             "Campsite|Shellrock Basin camp area", "Junction|Mount Carru summit"] },
];

process.exit(await runReorder(EDITS, { apply: process.argv.includes("--apply") }));
