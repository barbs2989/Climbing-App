// Build owner-decision inputs for the other half's leftover items (wa-contradictions-rest/handoffs.md and
// wa-contradictions-pass2/notes.md, minus the routes the "wa routes data validation" session holds and minus pins,
// which go through apply-pins). Each: {id, name, area_id, prior_findings, earlier_research, row, siblings}.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const A = new URL("../../../audits", import.meta.url).pathname;
const I = {
  // camp cards (bivy)
  wa_mount_angeles_standard: "bivy note says 'close to 1,000 ft in under a mile' on the Switchback Trail; sourced figure is 700 ft in 0.6 mi.",
  wa_mount_duckabush_standard: "Marmot Lake camp card says 1.1 mi above Upper Duckabush; trail is ~3.5 mi. The area record's elevation_ft 6,232 should be 6,254. The approach still names sources ('per NPS', 'in the regional climbers guide').",
  wa_monument_peak_pasayten_scramble: "bivy[0].permit claims a parking pass; the land manager and a trail database say no fee / no Northwest Forest Pass at this trailhead.",
  wa_mount_arriva_scramble: "bivy[1] has the dogs rule at Easy Pass wrong; access.rules is correct.",
  wa_east_twin_needle_south_route: "Camp card says Crescent Creek Basin is north of the crest (it is south). ALSO: grade/FA/face/beta are the 2003 east arete (II 5.10a); overview/itinerary/pro tips describe a 5.7 line from the Eye Col. Decide which climb the row is.",
  wa_mount_larrabee_south_ridge: "permit column now says no wilderness permit required (sourced); bivy[0] and bivy[1] still say a self-issue permit is needed (the Mount Baker Wilderness has only a voluntary climbing register).",
  wa_hadley_peak_cougar_divide: "bivy[0] says the route goes 'east' to Hadley; route fields now say south then southeast.",
  wa_hadley_peak_skyline_divide: "gain_ft 2,818 is below the rise between its own trailhead and summit pins (3,265 ft); no source stated the right total in pass 1.",
  // discipline
  wa_clast_from_the_past: "discipline is trad, but its own gear fields describe a sport route; two sources say sport.",
  wa_sidewinder_4: "discipline should be sport (same crag as Clast from the Past; research found it bolted).",
  wa_lefty: "discipline trad, but the listing and every protection field say sport (2 sources).",
  wa_friction_therapy: "discipline trad, but the listing and every protection field say sport (2 sources).",
  wa_on_the_prowl: "discipline trad vs sport.",
  wa_iceman: "discipline sport vs should-be trad. (Its pins are handled separately; do not touch waypoint coordinates.)",
  // mixed / identity
  wa_mount_mathias_scramble: "Mixes a Hoh out-and-back with a Sol Duc traverse; choose one line (list any pin that must move under pin_followups).",
  wa_mount_fairchild_standard: "itinerary/timing describe the Whiskey Bend / Long Ridge / Fitzhenry approach; the rest of the row is Sol Duc. Needs an itinerary rewrite; Appleton Pass pins may need moving (pin_followups).",
  wa_mount_dana_scramble: "The 6-day itinerary and timing use the Sol Duc trailhead; the rest of the row uses Whiskey Bend. Pass 1 found no source describing a Dana approach to rewrite from.",
  wa_lost_peak_pasayten_scramble: "Mixes a Monument Creek out-and-back, a 5-day Robinson Creek loop and a Pistol Pass line; the peak has two real routes (SW slope Cl3, NW ridge Cl2). Rewrite around one.",
  wa_mount_ballard_south: "Mixes the south slopes from Mill Creek with the East Ridge from Slate Creek (beta/breakdown/face/rack are the East Ridge). Rewrite or split.",
  wa_mount_rainier_kautz_glacier: "'Kautz Headwall' names both the Kautz route's ice chute and a separate ski line; decide which this row is. Kautz chute/headwall lengths vary by year; state them as a seasonal range if two sources support it.",
  wa_mount_claywood_standard: "Mixes three approach lines (Hayden Pass, Dose Meadows/Lost Pass, Obstruction Pt/Grand Pass); the Grand Pass-to-summit prose heads the wrong direction. Rewrite around one line.",
  wa_gilbert_peak_meade_glacier: "Mixes the Klickton Divide ridge line (no glacier) with the true Meade Glacier line; decide which line the row is.",
  wa_pernod_spire_standard: "Mixed from three routes (approach = Direct West Face, itinerary = South Face, rappel_detail = South Face descent); face/aspect NE are right per the 1952 first ascent. Its beta credits a guidebook (no-sources rule).",
  wa_little_sister_south_couloir: "pitch_detail, ice_grade, max_angle and hazards[0] describe the 2007 traverse crux near South Twin, not this line; pass 1 found no replacements.",
  wa_himmelhorn_southeast_route: "No source names a 'Southeast Route' or gives it Grade IV 5.8; the 1961 first ascent was class 4 via a ledge onto the north face; notes now say it faces NW. Identity review.",
  wa_half_moon_southwest_slopes: "Row is framed as a Class 3-4 scramble; sources say Half Moon has no easy route (easiest line class 5+). Needs re-authoring.",
  wa_mount_hardy_snow_scramble: "Breakdown/beta follow the short Swamp Creek south ridge; the rest of the row is the long Rainy Pass / Methow Pass approach. Pick one line or split.",
  wa_ottohorn_west_ridge: "name/overview/hazards describe the 2017 West Ridge (to 5.9); most other fields describe the 1961 east ridge. Decide which climb the row is.",
  wa_lexington_tower_south_face: "This 'South Face' is Concord Tower's South Face (2 sources).",
  wa_liberty_bell_east_face: "No evidence a 4-pitch 5.6 'East Face' exists on Liberty Bell; the row's own corrections note says its facts came from Lexington Tower. Identity review.",
  wa_skookum_peak_twinsisters_scramble: "The row mixes a Class 3-4 scramble with the 5.4 north ridge; both lines exist. Split, or pick one and rewrite the other fields.",
  wa_old_snowy_mountain_r1: "Summit scramble is the NW ridge (3 sources; beta/approach patched); name 'South Ridge / PCT approach' should be renamed.",
  wa_inner_constance_standard: "Name says 'via Crystal Pass', but every content field describes a different approach.",
  wa_mount_adams_wilson_glacier_headwall: "No source describes a 'Wilson Glacier Headwall' on Adams; 'Wilson Headwall' is a Rainier route and the row's rope_note may be copied from it. Identity review.",
  wa_goat_mountain_south_ridge: "grade Class 2 vs Class 2-3/4; pass 2 had 2 sources but neither page was actually read, and it lowers a safety-relevant grade. Re-research. (If this is not the Goat Mountain near Hadley/Baker, say so.)",
  wa_mount_carrie_se_route: "Climbs the southwest ridge; check name/aspect/face now agree with content (name may already be fixed).",
  wa_ives_peak_r1: "Route line is the NW ridge + south face (2 sources; beta/face patched); name 'Northeast Slopes' and aspect NE still say otherwise. Its beta names a website as its source (remove).",
  wa_whistler_mountain_scramble: "aspect/face now SW / 'South Ridge / Southwest Slope' (2 sources); name still says 'Southeast Slopes'. (Its trailhead pin is handled separately.)",
  // totals / area records
  wa_silver_star_ne_ridge: "Check: Silver Star East Ridge gain 4,400 is below the trailhead-to-summit rise; sources disagreed. Find two sources for the total, else leave.",
  wa_silver_star_glacier: "gain 4,000 is below the trailhead-to-summit rise; sources disagreed. Find two sources for the total, else leave.",
  wa_the_rake_traverse_route: "Summit-day gain 1,600 ft is impossible from the ~6,050 ft camp to the 7,869 ft summit; no source stated day or total gain in pass 1. Never compute a figure; only set one two sources state.",
  wa_mount_hopper_standard: "The park trail-conditions page (14 Sep 2026) lists the Home Sweet Home trail closed as well as Staircase-First Divide, so every trail approach is currently closed. State the closure plainly where the approach/access text says the trail is open.",
  wa_vasiliki_ridge_standard: "Vasiliki Tower summit 7,663 ft is below its own col; sources give 7,940 / 7,920 / lidar ~8,060. Use the ground (USGS elevation service at the summit pin) plus sources.",
  wa_plan_9_from_outer_space: "Summit waypoint now 7,840 ft (matches high_point_ft); the Junction pin at the same coordinate still reads 7,337, and the area's elevation_ft may too.",
  wa_ridge_traverse_from_east_fury: "Routes now use 8,322 ft for East Fury; check whether the area record's elevation_ft still says 8,356 and fix it with an area_set op.",
  wa_mount_stone_lake_of_angels: "approach and climbing_route[3] name a guidebook as their source (no-sources rule).",
  wa_mount_seattle_south: "Mount Seattle Elwha itinerary omits the Madison Falls road walk (check which Mount Seattle row carries the Elwha itinerary).",
  wa_big_kangaroo_kearney_thomas: "First-ascent party: beta says 'Jeff and Bill Thomas'; one source says Kearney + Jeff Thomas.",
  wa_free_mojo: "Two sources give a 2.5 mi one-way approach, but the row's own itinerary says 5.2-5.5 mi round trip; dist_km was left alone. Settle which is right and make the fields agree.",
  wa_boving_roofs: "Two sources give a 2.5 mi one-way approach, but the row's own itinerary says 5.2-5.5 mi round trip; dist_km was left alone. Settle which is right and make the fields agree.",
  wa_dolphin_chimney: "Two sources give a 2.5 mi one-way approach, but the row's own itinerary says 5.2-5.5 mi round trip; dist_km was left alone. Settle which is right and make the fields agree.",
  wa_mount_adams_north_ridge: "Itinerary day 2 says 4 mi, but two sources give ~17 mi round trip on a 4.1 mi each-way approach; no source states the day figure. Also Killen Creek parking pass: the land manager's trail page lists no pass; others say Northwest Forest Pass (camp cards) — settle with the ranger district's page if possible.",
  wa_firearms: "Dikes (FR-64 / Middle Point): siblings were set to 'no pass needed' (fee list + tourism page); this row still carries the pass in access (check rendered fields; do not edit access._raw).",
  wa_moe: "Dikes (FR-64 / Middle Point): siblings were set to 'no pass needed'; this row still carries the pass (check rendered fields; do not edit access._raw).",
  wa_internal_combustion: "Dikes (FR-64 / Middle Point): siblings were set to 'no pass needed'; this row still carries the pass (check rendered fields; do not edit access._raw).",
};
const researchFor = id => {
  const hits = [];
  for (const dir of [`${A}/wa-contradictions-rest/research/out`, `${A}/wa-contradictions-pass2/research/out`]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) { let j; try { j = JSON.parse(fs.readFileSync(`${dir}/${f}`)); } catch { continue; }
      for (const r of j.results || []) if ((r.id || r.route_id) === id) hits.push({ file: f, fact: r.fact, status: r.status || r.verdict, correct_value: r.correct_value, evidence: r.evidence, sources: r.sources }); }
  }
  return hits.slice(0, 25);
};
const out = [];
for (const [id, text] of Object.entries(I)) {
  const [row] = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=eq.${id}`, { headers: headers(key) })).json();
  if (!row) { console.log("missing", id); continue; }
  const sib = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,grade&area_id=eq.${row.area_id}&id=neq.${id}`, { headers: headers(key) })).json();
  const [area] = await (await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,parent_id,elevation_ft,lat,lng&id=eq.${row.area_id}`, { headers: headers(key) })).json();
  const { gpx, name_search, ...rest } = row;
  out.push({ id, name: row.name, area, prior_findings: text, earlier_research: researchFor(id), siblings: sib, row: rest });
}
fs.mkdirSync(`${A}/route-leftovers/owner/in`, { recursive: true }); fs.mkdirSync(`${A}/route-leftovers/owner/out`, { recursive: true });
const N = 5; for (let i = 0; i * N < out.length; i++) fs.writeFileSync(`${A}/route-leftovers/owner/in/o${String(i + 1).padStart(2, "0")}.json`, JSON.stringify(out.slice(i * N, i * N + N), null, 1));
console.log(out.length, "routes ->", Math.ceil(out.length / N), "files");
