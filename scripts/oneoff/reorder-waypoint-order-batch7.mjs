// Batch 7 of waypoint reordering: the residue `audit:waypoint-order` reported after #2057, plus a
// class that audit did not measure at all. Contract in scripts/lib/reorder-waypoints.mjs —
// permutation-only, `expect` refuses a row that has moved since this was written.
//
// THREE SHAPES, each read route by route:
//
//   * TRAILHEAD NOT FIRST. The audit asked only "is anything AFTER the summit"; it never asked
//     where the START is. 22 routes the app cannot sort list their trailhead somewhere other than
//     first, almost all as [...approach pins in walking order..., Trailhead, Summit] — trailhead
//     and summit appended to a list whose distMi already ascend. Only the trailhead moves (plus one
//     evident swap each on Bulls Tooth and Slippery Slab Tower). Two are REFUSED and left for
//     research: wa_mount_meany_standard (its pins walk the Elwha from Hayes River; its trailhead
//     pin is North Fork Quinault) and wa_the_devils_club (pins walk Depot Creek; trailhead pin is
//     Ross Dam). Moving a contradicting trailhead to the front would put a wrong start first.
//   * THE WALL AFTER ITS TOPOUT on single-pitch crag routes (Dikes x3, Pinto Rock x3, Tooth and
//     Claw) — the same fix #1588/#1590 applied to the other Dikes routes.
//   * APPROACH PINS AFTER THE SUMMIT that the route's own approach prose places before it
//     (True Grit, Fish & Whistle, Jötnar, The Mole, Amphitheater x3, Smears/Jugs).
//
// wa_smears_jugs_and_rock_roll is named in reorder-waypoints-by-distance.mjs as "two approaches
// spliced together". Read: it is ONE approach (Snow Lakes TH -> Snow Lakes 6 mi -> Lake Viviane
// 9.3 mi) with the trailhead stored fifth; the 0.2 mi "topout" that made the sort look like a
// splice is a pin whose own note says it reuses the campsite coordinate (cleared separately, in
// fix-waypoint-order-batch7-pins.mjs).
//
// Dry run by default. Pass --apply to write.
import { runReorder } from "../lib/reorder-waypoints.mjs";

const EDITS = [
  { id: "wa_argonaut_peak_east_ridge", order: [1,0,2],
    why: "trailhead appended after the approach pin; a trailhead is where the walk starts",
    expect: ["Junction|East end of ridge", "Trailhead|Beverly Turnpike Trailhead (#1391)", "Summit|Argonaut Peak summit (true/west summit)"] },
  { id: "wa_cannon_mountain_south_slopes", order: [2,0,1,3],
    why: "trailhead appended after the approach pins; a trailhead is where the walk starts",
    expect: ["Water|Perfection Lake", "Junction|Prusik Pass", "Trailhead|Snow Lakes Trailhead", "Summit|Cannon Mountain summit"] },
  { id: "wa_guye_peak_improbable_traverse", order: [2,0,1,3],
    why: "trailhead appended after the 0.3/0.4 mi pins; a trailhead is where the walk starts",
    expect: ["landmark|Talus cone base / climbing start", "landmark|Lunch Ledge belay (~300 ft on route)", "Trailhead|Alpental Ski Area / Snow Lake Trailhead parking lot", "Summit|Guye Peak summit (south summit, has the summit register; traver"] },
  { id: "wa_kendall_peak_cliff_north_face", order: [1,0],
    why: "two pins, and the trailhead is listed second",
    expect: ["base|Kendall Cliff (North Face base)", "Trailhead|PCT North Trailhead"] },
  { id: "wa_little_sister_north_face", order: [1,0],
    why: "two pins, and the trailhead is listed second",
    expect: ["route_reference|Little Sister North Face (reference point)", "Trailhead|Elbow Lake Trailhead (Trail #697, FR-38)"] },
  { id: "wa_little_sister_west_face", order: [1,0],
    why: "two pins, and the trailhead is listed second",
    expect: ["route_reference|Little Sister West Face (reference point)", "Trailhead|Elbow Lake Trailhead (Trail #697, FR-38)"] },
  { id: "wa_snoqualmie_mountain_the_snostril", order: [1,0],
    why: "two pins, and the trailhead is listed second",
    expect: ["route|The Snostril (NW Face)", "Trailhead|Alpental / Snow Lake Trailhead (I-90 Exit 52)"] },
  { id: "wa_mount_constance_finger_traverse", order: [1,0,2],
    why: "trailhead listed after Lake Constance, which is 3,900 ft above it",
    expect: ["Campsite|Lake Constance", "Trailhead|Dosewallips Road washout parking", "Summit|Mount Constance (true/main summit)"] },
  { id: "wa_mount_constance_north_chimney", order: [1,0,2],
    why: "trailhead listed after Lake Constance, which is 3,900 ft above it",
    expect: ["Campsite|Lake Constance", "Trailhead|Dosewallips Road washout parking", "Summit|Mount Constance (true/main summit)"] },
  { id: "wa_mount_constance_terrible_traverse", order: [1,0,2],
    why: "trailhead listed after Lake Constance, which is 3,900 ft above it",
    expect: ["Campsite|Lake Constance", "Trailhead|Dosewallips Road washout parking", "Summit|Mount Constance (true/main summit)"] },
  { id: "wa_mount_constance_west_arete", order: [1,0,2],
    why: "trailhead listed after Lake Constance, which is 3,900 ft above it",
    expect: ["Campsite|Lake Constance", "Trailhead|Dosewallips Road washout parking", "Summit|Mount Constance (true/main summit)"] },
  { id: "wa_scramble_route", order: [1,0,2],
    why: "trailhead listed after Eagle Peak Saddle at 3.5 mi",
    expect: ["Junction|Eagle Peak Saddle", "Trailhead|Eagle Peak Trailhead (Longmire, Nisqually Suspension Bridge)", "Summit|Eagle Peak"] },
  { id: "wa_phantom_peak_south_route", order: [5,0,1,2,3,4,6],
    why: "trailhead appended after the approach pins; a trailhead is where the walk starts",
    expect: ["Campsite|Luna Camp", "Hazard|Luna Creek bushwhack", "Campsite|Crooked Thumb Glacier moraine high camp", "Junction|Southwest buttress saddle", "Hazard|Bergschrund on the summit snow finger", "Trailhead|Hannegan Pass Trailhead (end of Ruth Creek Rd / FR-32), via ", "Summit|Phantom Peak summit (Southwest/South Route, Class 4, easiest ro"] },
  { id: "wa_tailgunner_peak_w_route", order: [6,0,1,2,3,4,5,7],
    why: "trailhead appended after pins at 0.3-3 mi; a trailhead is where the walk starts",
    expect: ["Junction|Barclay Creek crossing / leave trail", "Junction|Rocky knob on climbers' path", "Hazard|Waterfall ravine", "Junction|Brushy cliff-band weakness", "Junction|Tailgunner Pass", "Hazard|West ridge gendarmes / cornice headwall", "Trailhead|Barclay Lake Trailhead (FR-6024)", "Summit|Tailgunner summit (Peak 5842)"] },
  { id: "wa_whistler_mountain_scramble", order: [4,0,1,2,3,5],
    why: "trailhead appended after pins at 0.5-1.7 mi; a trailhead is where the walk starts",
    expect: ["Junction|Meadow rising traverse", "Junction|South ridge gain point", "Junction|6,800 ft ridge/gully split", "Hazard|Summit ridge scramble band", "Trailhead|Rainy Pass Trailhead (PCT North parking lot, SR-20)", "Summit|Whistler Mountain summit"] },
  { id: "wa_white_mountain_olympics_scramble", order: [5,0,1,2,3,4,6],
    why: "trailhead appended after pins at 7.6-17.5 mi; a trailhead is where the walk starts",
    expect: ["Junction|Dose Forks", "Campsite|Diamond Meadows Camp", "Campsite|Honeymoon Meadows Camp", "Junction|Anderson Pass", "Hazard|Heather/scree slopes below the summit ridge", "Trailhead|Dosewallips Road end (closed-road parking)", "Summit|White Mountain Summit"] },
  { id: "wa_mount_ballard_south", order: [7,0,1,2,3,4,5,6,8],
    why: "trailhead appended after pins at 5.7-15 mi; ONLY the trailhead moves — Harts Pass keeps its slot",
    expect: ["Water|Mill Creek ford", "Junction|Mill Creek Trail junction", "Hazard|Overgrown Mill Creek Trail", "Campsite|Azurite Mine", "Campsite|Azurite–Ballard basin", "Hazard|South-face brush and gully route-finding", "Pass|Harts Pass", "Trailhead|Canyon Creek Trailhead", "Summit|Mount Ballard summit (south/true peak)"] },
  { id: "wa_bulls_tooth_standard", order: [2,1,0,3],
    why: "trailhead appended last; Josephine Lake (2.3 km from the trailhead) is passed before Doelle Lakes (6.6 km)",
    expect: ["Junction|Doelle Lakes", "Waypoint|Josephine Lake", "Trailhead|PCT Trailhead at Stevens Pass (Hwy 2)", "Summit|Bulls Tooth Summit"] },
  { id: "wa_slippery_slab_tower_ne_face", order: [5,0,1,2,4,3,6],
    why: "trailhead appended after pins at 4.7-7 mi; the route START cannot follow its own topout",
    expect: ["Water|Surprise Lake", "Junction|Trap Pass", "Junction|Base of Slippery Slab Tower", "Topout|Slippery Slab Tower NE Face Topout", "Route|Slippery Slab Tower NE Face (start)", "Trailhead|Tunnel Creek Trailhead", "Summit|Slippery Slab Tower"] },
  { id: "wa_true_grit_2", order: [0,3,4,1,2],
    why: "the ledge-traverse junction and the route start (0.3 mi) sat after the topout and summit; the approach crosses the ledge to the start, then climbs",
    expect: ["Trailhead|Sunrise Mine Trailhead", "Topout|Vesper Peak north face", "Summit|Vesper Peak summit", "Junction|Cairned pass toward Copper Lake / start of ledge traverse", "Route start|North Face ledge-access notch (True Grit start)"] },
  { id: "wa_fish_whistle", order: [0,3,4,1,2],
    why: "the ledge-traverse junction and the route start (0.3 mi) sat after the topout and summit; the approach crosses the ledge to the start, then climbs",
    expect: ["Trailhead|Sunrise Mine Trailhead", "Topout|Vesper Peak north face", "Summit|Vesper Peak summit", "Junction|Cairned pass toward Copper Lake / start of ledge traverse", "Route start|North Face ledge-access notch (near True Grit; Fish & Whis"] },
  { id: "wa_j_tnar", order: [0,2,3,4,1,5],
    why: "the wall topout sat second, ahead of Lake Serene (3.6 mi) and the base cirque its own approach reaches first",
    expect: ["Trailhead|Lake Serene Trailhead (Mount Index Rd / Trail 1068)", "Topout|Jötunheim Wall Topout (Middle Peak)", "Junction|Lake Serene", "Base|Jötunheim (North Norwegian Buttress base cirque)", "Feature|North Norwegian Buttress", "Summit|Middle Peak (Mount Index)"] },
  { id: "wa_smears_jugs_and_rock_roll", order: [4,0,1,2,3,5],
    why: "trailhead stored fifth, after Snow Lakes (6 mi) and Lake Viviane (9.3 mi); it is where the 9-mile walk starts",
    expect: ["Water|Snow Lakes", "Campsite|Viviane Campsite (Lake Viviane)", "Topout|Base of Prusik Peak south face (approximate)", "Crag|Viviane Campsite (route base)", "Trailhead|Snow Lakes Trailhead (Trail #1553)", "Summit|Viviane Campsite crag"] },
  { id: "wa_north_face_of_the_mole", order: [0,2,1,3],
    why: "the approach-area pin sat after the topout",
    expect: ["Trailhead|Icicle Creek Road roadside parking (Hook Creek Drainage)", "Topout|The Mole (Edward Peak) North Face topout", "Approach|Hook Creek Drainage / Mole approach area", "Summit|Edward Peak summit (The Mole)"] },
  { id: "wa_firearms", order: [0,2,1,3],
    why: "the wall the route starts on cannot follow the topout (same fix as the other Dikes routes, #1588/#1590)",
    expect: ["Trailhead|Middle Point Trailhead (FR 64)", "Topout|Minidike", "Junction|Minidike wall (Firearms)", "Summit|Minidike"] },
  { id: "wa_internal_combustion", order: [0,2,1,3],
    why: "the wall the route starts on cannot follow the topout (same fix as the other Dikes routes, #1588/#1590)",
    expect: ["Trailhead|Middle Point Trailhead (FR 64)", "Topout|Minidike", "Junction|Minidike wall (Internal Combustion)", "Summit|Minidike"] },
  { id: "wa_just_for_fun", order: [0,2,1,3],
    why: "the wall the route starts on cannot follow the topout (same fix as the other Dikes routes, #1588/#1590)",
    expect: ["Trailhead|Middle Point Trailhead (FR 64)", "Topout|Minidike", "Junction|Minidike wall (Just For Fun)", "Summit|Minidike"] },
  { id: "wa_clast_from_the_past", order: [0,2,1,3],
    why: "the North Side wall the route starts on cannot follow the topout",
    expect: ["Trailhead|Pinto Rock Pullout (North Side)", "Topout|Pinto Rock topout (approximate)", "Junction|North Side wall (GPS pin)", "Summit|Pinto Rock"] },
  { id: "wa_sidewinder_4", order: [0,2,1,3],
    why: "the North Side wall the route starts on cannot follow the topout",
    expect: ["Trailhead|Pinto Rock Pullout (North Side)", "Topout|Pinto Rock topout (approximate)", "Junction|North Side wall (GPS pin)", "Summit|Pinto Rock"] },
  { id: "wa_top_gun", order: [0,2,1,3],
    why: "the North Side wall the route starts on cannot follow the topout",
    expect: ["Trailhead|Pinto Rock Pullout (North Side)", "Topout|Pinto Rock topout (approximate)", "Junction|North Side wall (GPS pin)", "Summit|Pinto Rock"] },
  { id: "wa_tooth_and_claw", order: [0,2,1,3],
    why: "the route marker cannot follow the topout",
    expect: ["Trailhead|SR-20 Hairpin / Pond Pullout (east of Washington Pass)", "Topout|Lexington Tower East Shoulder (topout)", "Junction|Lexington Tower / Tooth and Claw (marker)", "Summit|Lexington Tower summit"] },
  { id: "wa_amphitheater_mountain_middle_finger_buttress_left_side", order: [0,4,3,2,1],
    why: "summit stored second, before the buttress the route climbs (move-the-summit form; the buttress pins share one coordinate)",
    expect: ["Trailhead|Andrews Creek Trailhead", "Summit|Amphitheater Mountain summit", "Topout|Middle Finger Buttress area, above Upper Cathedral Lake", "Junction|Middle Finger Buttress", "Climbing area|Middle Finger Buttress area (Amphitheatre Mtn routes)"] },
  { id: "wa_amphitheater_mountain_middle_finger_buttress_right_side", order: [0,4,3,2,1],
    why: "summit stored second, before the buttress the route climbs (move-the-summit form; the buttress pins share one coordinate)",
    expect: ["Trailhead|Andrews Creek Trailhead", "Summit|Amphitheater Mountain summit", "Topout|Middle Finger Buttress area, above Upper Cathedral Lake", "Junction|Middle Finger Buttress", "Climbing area|Middle Finger Buttress area (Amphitheatre Mtn routes)"] },
  { id: "wa_amphitheater_mountain_pilgrimage_to_mecca", order: [0,4,3,2,1],
    why: "summit stored second, before the buttress the route climbs (move-the-summit form; the buttress pins share one coordinate)",
    expect: ["Trailhead|Andrews Creek Trailhead", "Summit|Amphitheater Mountain summit", "Topout|Ka'aba Buttress / Pilgrimage to Mecca base area", "Junction|Ka'aba Buttress / Amphitheatre climbing area", "Climbing area|Ka'aba Buttress / Amphitheatre Mountain routes area"] },
];

process.exit(await runReorder(EDITS, { apply: process.argv.includes("--apply") }));
