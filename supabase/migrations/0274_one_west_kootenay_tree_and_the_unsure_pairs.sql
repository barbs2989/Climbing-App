-- 0274: one West Kootenay tree, and the six area pairs 0261 left unsure — settled from the source.
--
-- Asked 2026-10-08: "do your online research for the rest" (the pairs 0261 held back, under the owner's
-- "fold into 1 area, i don't want duplicates"). Read against Mountain Project, pair by pair:
--   * WEST KOOTENAY. The source has three parallel trees under the region: the roped crags by town, a
--     boulder tree and a two-climb ice tree. The import split the TOWN tree across our "West Kootenay
--     Boulders" and "West Kootenay Ice", so Nelson, Castlegar and Slocan Valley each stood twice, and
--     "Ice" held 134 rock routes. One tree now: each town once, straight under West Kootenay (the 2 ice
--     climbs in their places, Glade and Slocan Valley); both buckets go once empty. Arrow Lake's boulders
--     and walls share one lakeshore (RFW boulders 40 m from RFW Wall): one Arrow Lake, under Castlegar as
--     the source files it. Ymir's boulders "sit among the routes of the Ymir Swimming Hole crag" (Central
--     Park "under the largest cliffs") and Poison River's share the Poison River Bluffs' rail-trail
--     parking (the "big cliff beside the road" is the turn-back mark; 19.4 km up Highway 6 from 3A), so
--     each goes inside its crag. NOT merged: Grohman Narrows' boulders (beside Highway 3A) and its box
--     canyon (across the river, by the Taghum bridge and a logging road), 2.7 km apart; "Valhalla"
--     boulders (49.45 N, off the Norns Creek road) and the Valhalla Mountains (40 km north).
--   * OLYMPIA, WA: the bare "Olympia" (Easy Left, Iceman Traverse) stood on the EXACT coordinate of
--     Thomas W. Huntamer Park (Easy Middle) — one spot entered twice. Folded into the park.
--   * CASCADE CANYON, WY: the bouldering is a talus field on the Cascade Canyon trail itself — nested,
--     with the canyon's own climbs in "Cascade Canyon Routes" (an area holds climbs OR sub-areas).
--   * DIFFERENT places, left as they are: Jobs Peak (the summit) / Jobs Peak Bouldering (the range foot
--     on the Nevada side, 4 km off); Pine Mountain, GA (Bartow County) / Pine Mountain Boulders (Harris
--     County, 190 km south); Big Water's desert towers / Big Water Boulders (a boulder field 2-3 km off);
--     Lightning Bolt Boulder / Dynamic Blocks (two boulders the source lists apart).
-- Pins the source contradicts, moved to where its directions put them and flagged APPROXIMATE (the area
-- screen says so): Poison River's 4 boulders (they stood 5.6 km off, near Winlaw), Central Park (1.4 km
-- south of its cliffs), Cascade Canyon Bouldering (it stood in upper Avalanche Canyon, 4 km south).
-- Climbs: Shawshank's "8.  5.12?" is the source's #8 under its old name — it is now "Current Project -
-- newly bolted" (same number, same 5.12), which we also hold: merged, blanks filled. West Cat Daddy's
-- "7. Project" is V8-9 at the source (ours V7-8): the higher kept. grade_num follows lib/grade.js for those
-- and for two keepers an earlier fold re-graded without it (Unknown Shores V7-8 stored 7, 752 rows store
-- 8; Spaceballs 5.11a stored 10.75, 7,771 store 11.25). The 42 climbs that keep a topo number keep it:
-- the source names none of them (projects, "Unnamed", five problems really called "Slab").
-- No climb is deleted but the Shawshank copy; no contribution, log, objective or list points at it.
-- ABORTS if the live tree no longer matches what was read. Rollback: scripts/data/west-kootenay-and-unsure-pairs-rollback.json.

begin;

create temp table m_reparent(id text primary key, from_parent text not null, to_parent text not null) on commit drop;
insert into m_reparent values
  ('bc_castlegar', 'bc_west_kootenay_boulders', 'bc_west_kootenay'),
  ('bc_nelson', 'bc_west_kootenay_boulders', 'bc_west_kootenay'),
  ('bc_slocan_valley', 'bc_west_kootenay_boulders', 'bc_west_kootenay'),
  ('bc_kootenay_lake', 'bc_west_kootenay_ice', 'bc_west_kootenay'),
  ('bc_rossland', 'bc_west_kootenay_ice', 'bc_west_kootenay'),
  ('bc_trail', 'bc_west_kootenay_ice', 'bc_west_kootenay'),
  ('bc_glade', 'bc_west_kootenay_ice', 'bc_west_kootenay'),
  ('bc_bealby', 'bc_west_kootenay_boulders', 'bc_west_kootenay'),
  ('bc_brilliant_boulders', 'bc_west_kootenay_boulders', 'bc_west_kootenay'),
  ('bc_grohman_narrows', 'bc_west_kootenay_boulders', 'bc_west_kootenay'),
  ('bc_kokanee_lake', 'bc_west_kootenay_boulders', 'bc_west_kootenay'),
  ('bc_ladybird_creek', 'bc_west_kootenay_boulders', 'bc_west_kootenay'),
  ('bc_salmo_river_ranch', 'bc_west_kootenay_boulders', 'bc_west_kootenay'),
  ('bc_valhalla', 'bc_west_kootenay_boulders', 'bc_west_kootenay'),
  ('bc_waterloo_eddy', 'bc_west_kootenay_boulders', 'bc_west_kootenay'),
  ('bc_arrow_lake', 'bc_west_kootenay_boulders', 'bc_castlegar'),
  ('bc_big_horn_wall', 'bc_arrow_lake_2', 'bc_arrow_lake'),
  ('bc_cat_walls', 'bc_arrow_lake_2', 'bc_arrow_lake'),
  ('bc_chips_crag', 'bc_arrow_lake_2', 'bc_arrow_lake'),
  ('bc_ketamux', 'bc_arrow_lake_2', 'bc_arrow_lake'),
  ('bc_odocoileous_wall', 'bc_arrow_lake_2', 'bc_arrow_lake'),
  ('bc_ovis_wall', 'bc_arrow_lake_2', 'bc_arrow_lake'),
  ('bc_raspberry_wall', 'bc_arrow_lake_2', 'bc_arrow_lake'),
  ('bc_rfw_wall', 'bc_arrow_lake_2', 'bc_arrow_lake'),
  ('bc_roadside_wall', 'bc_arrow_lake_2', 'bc_arrow_lake'),
  ('bc_tulip_falls', 'bc_arrow_lake_2', 'bc_arrow_lake'),
  ('bc_wapiti_wall', 'bc_arrow_lake_2', 'bc_arrow_lake'),
  ('bc_waterfall_walls', 'bc_arrow_lake_2', 'bc_arrow_lake'),
  ('bc_zebra_wall', 'bc_arrow_lake_2', 'bc_arrow_lake'),
  ('bc_chatham_street', 'bc_nelson_2', 'bc_nelson'),
  ('bc_grohman_narrows_2', 'bc_nelson_2', 'bc_nelson'),
  ('bc_hall_siding', 'bc_nelson_2', 'bc_nelson'),
  ('bc_high_country_bluff', 'bc_nelson_2', 'bc_nelson'),
  ('bc_kootenay_crag', 'bc_nelson_2', 'bc_nelson'),
  ('bc_paradise', 'bc_nelson_2', 'bc_nelson'),
  ('bc_pulpit_rock', 'bc_nelson_2', 'bc_nelson'),
  ('bc_riverside_crag', 'bc_nelson_2', 'bc_nelson'),
  ('bc_champion_crag', 'bc_castlegar_2', 'bc_castlegar'),
  ('bc_helheim', 'bc_slocan_valley_2', 'bc_slocan_valley'),
  ('bc_enterprise_falls', 'bc_slocan_valley_2', 'bc_slocan_valley'),
  ('bc_central_park', 'bc_ymir', 'bc_ymir_swimming_hole'),
  ('bc_dark_side_of_desire', 'bc_poison_river', 'bc_poison_river_bluffs'),
  ('bc_desire', 'bc_poison_river', 'bc_poison_river_bluffs'),
  ('bc_face_of_desire', 'bc_poison_river', 'bc_poison_river_bluffs'),
  ('bc_i_miss_you_babe', 'bc_poison_river', 'bc_poison_river_bluffs'),
  ('wy_cascade_canyon_bouldering', 'wy_grand_teton_national_park', 'wy_cascade_canyon');

create temp table m_drop_area(id text primary key, into_area text not null) on commit drop;
insert into m_drop_area values
  ('bc_nelson_2', 'bc_nelson'),
  ('bc_castlegar_2', 'bc_castlegar'),
  ('bc_slocan_valley_2', 'bc_slocan_valley'),
  ('bc_arrow_lake_2', 'bc_arrow_lake'),
  ('bc_ymir', 'bc_ymir_swimming_hole'),
  ('bc_poison_river', 'bc_poison_river_bluffs'),
  ('bc_west_kootenay_boulders', 'bc_west_kootenay'),
  ('bc_west_kootenay_ice', 'bc_west_kootenay'),
  ('wa_olympia', 'wa_thomas_w_huntamer_park');

create temp table m_move(id text primary key, from_area text not null, to_area text not null) on commit drop;
insert into m_move values
  ('wa_easy_left', 'wa_olympia', 'wa_thomas_w_huntamer_park'),
  ('wa_iceman_traverse', 'wa_olympia', 'wa_thomas_w_huntamer_park'),
  ('wy_attritus', 'wy_cascade_canyon', 'wy_cascade_canyon_routes'),
  ('wy_bat_attack_crack', 'wy_cascade_canyon', 'wy_cascade_canyon_routes'),
  ('wy_baxter_s_pinnacle_north_face', 'wy_cascade_canyon', 'wy_cascade_canyon_routes'),
  ('wy_baxter_s_pinnacle_south_ridge', 'wy_cascade_canyon', 'wy_cascade_canyon_routes'),
  ('wy_blobular_oscillations', 'wy_cascade_canyon', 'wy_cascade_canyon_routes'),
  ('wy_cascade_canyon_chilly_dogs', 'wy_cascade_canyon', 'wy_cascade_canyon_routes'),
  ('wy_cascade_canyon_hot_dogs', 'wy_cascade_canyon', 'wy_cascade_canyon_routes'),
  ('wy_cascade_canyon_seizure_disorder', 'wy_cascade_canyon', 'wy_cascade_canyon_routes'),
  ('wy_cascade_canyon_teewinot_north_gullies_left', 'wy_cascade_canyon', 'wy_cascade_canyon_routes'),
  ('wy_guide_s_wall', 'wy_cascade_canyon', 'wy_cascade_canyon_routes'),
  ('wy_lower_highway_to_heaven', 'wy_cascade_canyon', 'wy_cascade_canyon_routes'),
  ('wy_no_perches_necessary', 'wy_cascade_canyon', 'wy_cascade_canyon_routes'),
  ('wy_symmetry_crag_4_trinity_buttress', 'wy_cascade_canyon', 'wy_cascade_canyon_routes'),
  ('wy_the_snake', 'wy_cascade_canyon', 'wy_cascade_canyon_routes'),
  ('wy_vieux_guide', 'wy_cascade_canyon', 'wy_cascade_canyon_routes');

create temp table m_pin(id text primary key, from_lat double precision, from_lng double precision, to_lat double precision, to_lng double precision) on commit drop;
insert into m_pin values
  ('bc_dark_side_of_desire', 49.59855, -117.56568, 49.57226, -117.63247),
  ('bc_desire', 49.59821, -117.56557, 49.57226, -117.63247),
  ('bc_face_of_desire', 49.59867, -117.56512, 49.57226, -117.63247),
  ('bc_i_miss_you_babe', 49.59859, -117.56609, 49.57226, -117.63247),
  ('bc_central_park', 49.26751, -117.20611, 49.27804, -117.2078),
  ('wy_cascade_canyon_bouldering', 43.7407, -110.80299, 43.7628, -110.746);

create temp table m_grade(id text primary key, from_grade text, from_num numeric, to_grade text, to_num numeric) on commit drop;
insert into m_grade values
  ('ut_7_project', 'V7-8', 8, 'V8-9', 9),
  ('az_3_broken_symmetry_unknown_shores', 'V7-8', 7, 'V7-8', 8),
  ('ok_spaceballs', '5.11a', 10.75, '5.11a', 11.25);

create temp table m_merge(keep text not null, drop_id text primary key) on commit drop;
insert into m_merge values ('mi_shawshank_8_current_project_newly_bolted', 'mi_8_5_12');

-- climbs under each region before anything moves (only the Shawshank copy may leave)
create temp table m_before on commit drop as
  select a.id, (select count(*) from routes r join areas d on d.id = r.area_id where d.path <@ a.path) n
    from areas a where a.id in ('bc_west_kootenay', 'wa_olympics', 'wy_grand_teton_national_park', 'mi_shawshank');

do $$ declare n int; begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog: nothing to fold.
  select count(*) into n from areas where id in (select id from m_drop_area);
  if n = 0 then raise notice '0274: no catalog, nothing to fold'; return; end if;
  if n <> 9 then raise exception '0274: expected 9 copy areas, found %', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.from_parent;
  if n <> 46 then raise exception '0274: % of 46 sub-areas are where the plan found them', n; end if;
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.from_area;
  if n <> 17 then raise exception '0274: % of 17 climbs are where the plan found them', n; end if;
  select count(*) into n from m_pin m join areas a on a.id = m.id and abs(a.lat - m.from_lat) < 1e-6 and abs(a.lng - m.from_lng) < 1e-6;
  if n <> 6 then raise exception '0274: % of 6 pins are as read', n; end if;
  select count(*) into n from m_grade m join routes r on r.id = m.id and r.grade = m.from_grade and r.grade_num = m.from_num;
  if n <> 3 then raise exception '0274: % of 3 grades are as read', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep and k.area_id = 'mi_shawshank' and k.grade = '5.12'
    join routes o on o.id = m.drop_id and o.area_id = 'mi_shawshank' and o.grade = '5.12' and o.name = '8.  5.12?';
  if n <> 1 then raise exception '0274: the Shawshank pair is not as read'; end if;
  if exists (select 1 from areas where id = 'wy_cascade_canyon_routes') then raise exception '0274: Cascade Canyon Routes already exists'; end if;
  -- every sub-area and climb of a copy is accounted for
  select count(*) into n from areas a join m_drop_area d on d.id = a.parent_id
   where a.id not in (select id from m_reparent) and a.id not in (select id from m_drop_area);
  if n > 0 then raise exception '0274: % sub-areas of a copy are not in the plan', n; end if;
  select count(*) into n from routes r join m_drop_area d on d.id = r.area_id where r.id not in (select id from m_move);
  if n > 0 then raise exception '0274: % climbs on a copy are not in the plan', n; end if;
  -- refuse to cascade-delete anybody's data
  select (select count(*) from contributions where route_id in (select drop_id from m_merge))
       + (select count(*) from topo_lines where route_id in (select drop_id from m_merge))
       + (select count(*) from gps_submissions where route_id in (select drop_id from m_merge))
       + (select count(*) from content_reports where route_id in (select drop_id from m_merge))
       + (select count(*) from route_base_checkins where route_id in (select drop_id from m_merge))
       + (select count(*) from objectives where route_id in (select drop_id from m_merge))
       + (select count(*) from hazard_votes where route_id in (select drop_id from m_merge))
       + (select count(*) from climb_logs where route_id in (select drop_id from m_merge))
       + (select count(*) from crew_listings where route_id in (select drop_id from m_merge))
       + (select count(*) from user_itineraries where route_id in (select drop_id from m_merge))
       + (select count(*) from crews where route_id in (select drop_id from m_merge))
       + (select count(*) from user_lists where route_ids && (select array_agg(drop_id) from m_merge))
    into n;
  if n > 0 then raise exception '0274: % climber rows point at the climb this deletes — stop and repoint them', n; end if;
end $$;

-- 1. Shawshank #8: the keeper fills each BLANK column from its old-named copy, which goes
update routes k set
  discipline = case when nullif(btrim(k.discipline), '') is null then o.discipline else k.discipline end,
  grade = case when nullif(btrim(k.grade), '') is null then o.grade else k.grade end,
  grade_system = case when nullif(btrim(k.grade_system), '') is null then o.grade_system else k.grade_system end,
  grade_num = case when k.grade_num is null then o.grade_num else k.grade_num end,
  pitches = case when coalesce(k.pitches, 0) = 0 then o.pitches else k.pitches end,
  length_m = case when k.length_m is null then o.length_m else k.length_m end,
  stars = case when k.stars is null then o.stars else k.stars end,
  fa = case when nullif(btrim(k.fa), '') is null then o.fa else k.fa end,
  lat = case when k.lat is null then o.lat else k.lat end,
  lng = case when k.lng is null then o.lng else k.lng end,
  aspect = case when nullif(btrim(k.aspect), '') is null then o.aspect else k.aspect end,
  season = case when nullif(btrim(k.season), '') is null then o.season else k.season end,
  description = case when nullif(btrim(k.description), '') is null then o.description else k.description end,
  gear = case when (k.gear is null or k.gear in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.gear else k.gear end,
  hazards = case when coalesce(cardinality(k.hazards), 0) = 0 then o.hazards else k.hazards end,
  verif = case when (k.verif is null or k.verif in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.verif else k.verif end,
  overview = case when nullif(btrim(k.overview), '') is null then o.overview else k.overview end,
  beta = case when nullif(btrim(k.beta), '') is null then o.beta else k.beta end,
  turnaround = case when nullif(btrim(k.turnaround), '') is null then o.turnaround else k.turnaround end,
  auto_generated = case when k.auto_generated is null then o.auto_generated else k.auto_generated end,
  alpine_grade = case when nullif(btrim(k.alpine_grade), '') is null then o.alpine_grade else k.alpine_grade end,
  rock_grade = case when nullif(btrim(k.rock_grade), '') is null then o.rock_grade else k.rock_grade end,
  ice_grade = case when nullif(btrim(k.ice_grade), '') is null then o.ice_grade else k.ice_grade end,
  gain_ft = case when k.gain_ft is null then o.gain_ft else k.gain_ft end,
  loss_ft = case when k.loss_ft is null then o.loss_ft else k.loss_ft end,
  dist_km = case when k.dist_km is null then o.dist_km else k.dist_km end,
  max_angle = case when k.max_angle is null then o.max_angle else k.max_angle end,
  rappels = case when nullif(btrim(k.rappels), '') is null then o.rappels else k.rappels end,
  commitment = case when nullif(btrim(k.commitment), '') is null then o.commitment else k.commitment end,
  face = case when nullif(btrim(k.face), '') is null then o.face else k.face end,
  permit = case when nullif(btrim(k.permit), '') is null then o.permit else k.permit end,
  comms = case when nullif(btrim(k.comms), '') is null then o.comms else k.comms end,
  descent = case when nullif(btrim(k.descent), '') is null then o.descent else k.descent end,
  obj_haz = case when (k.obj_haz is null or k.obj_haz in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.obj_haz else k.obj_haz end,
  waypoints = case when (k.waypoints is null or k.waypoints in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.waypoints else k.waypoints end,
  gpx = case when (k.gpx is null or k.gpx in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.gpx else k.gpx end,
  elev_pts = case when (k.elev_pts is null or k.elev_pts in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.elev_pts else k.elev_pts end,
  disciplines = case when (k.disciplines is null or k.disciplines in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.disciplines else k.disciplines end,
  timing = case when (k.timing is null or k.timing in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.timing else k.timing end,
  detailed_rack = case when nullif(btrim(k.detailed_rack), '') is null then o.detailed_rack else k.detailed_rack end,
  what_to_bring = case when (k.what_to_bring is null or k.what_to_bring in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.what_to_bring else k.what_to_bring end,
  pro_tips = case when (k.pro_tips is null or k.pro_tips in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.pro_tips else k.pro_tips end,
  watch_out = case when (k.watch_out is null or k.watch_out in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.watch_out else k.watch_out end,
  pro_needs = case when nullif(btrim(k.pro_needs), '') is null then o.pro_needs else k.pro_needs end,
  best_season = case when nullif(btrim(k.best_season), '') is null then o.best_season else k.best_season end,
  high_point_ft = case when k.high_point_ft is null then o.high_point_ft else k.high_point_ft end,
  aid_grade = case when nullif(btrim(k.aid_grade), '') is null then o.aid_grade else k.aid_grade end,
  approach = case when nullif(btrim(k.approach), '') is null then o.approach else k.approach end,
  descent_text = case when nullif(btrim(k.descent_text), '') is null then o.descent_text else k.descent_text end,
  bail = case when nullif(btrim(k.bail), '') is null then o.bail else k.bail end,
  pitch_detail = case when (k.pitch_detail is null or k.pitch_detail in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.pitch_detail else k.pitch_detail end,
  itinerary = case when (k.itinerary is null or k.itinerary in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.itinerary else k.itinerary end,
  access = case when (k.access is null or k.access in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.access else k.access end,
  road = case when (k.road is null or k.road in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.road else k.road end,
  climate = case when (k.climate is null or k.climate in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.climate else k.climate end,
  emergency = case when (k.emergency is null or k.emergency in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.emergency else k.emergency end,
  lists = case when coalesce(cardinality(k.lists), 0) = 0 then o.lists else k.lists end,
  crowds = case when (k.crowds is null or k.crowds in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.crowds else k.crowds end,
  partner_requirements = case when (k.partner_requirements is null or k.partner_requirements in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.partner_requirements else k.partner_requirements end,
  seasonal_guidance = case when (k.seasonal_guidance is null or k.seasonal_guidance in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.seasonal_guidance else k.seasonal_guidance end,
  seasonal_hazards = case when (k.seasonal_hazards is null or k.seasonal_hazards in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.seasonal_hazards else k.seasonal_hazards end,
  data_quality = case when (k.data_quality is null or k.data_quality in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.data_quality else k.data_quality end,
  difficulty = case when (k.difficulty is null or k.difficulty in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.difficulty else k.difficulty end,
  approach_logistics = case when (k.approach_logistics is null or k.approach_logistics in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.approach_logistics else k.approach_logistics end,
  sling_rack = case when (k.sling_rack is null or k.sling_rack in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.sling_rack else k.sling_rack end,
  alpine_draws = case when k.alpine_draws is null then o.alpine_draws else k.alpine_draws end,
  rope_type = case when nullif(btrim(k.rope_type), '') is null then o.rope_type else k.rope_type end,
  rope_length_m = case when k.rope_length_m is null then o.rope_length_m else k.rope_length_m end,
  rope_note = case when nullif(btrim(k.rope_note), '') is null then o.rope_note else k.rope_note end,
  ascender = case when nullif(btrim(k.ascender), '') is null then o.ascender else k.ascender end,
  corrections = case when nullif(btrim(k.corrections), '') is null then o.corrections else k.corrections end,
  gear_confidence = case when nullif(btrim(k.gear_confidence), '') is null then o.gear_confidence else k.gear_confidence end,
  rappel_detail = case when (k.rappel_detail is null or k.rappel_detail in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.rappel_detail else k.rappel_detail end,
  rappel_count_note = case when nullif(btrim(k.rappel_count_note), '') is null then o.rappel_count_note else k.rappel_count_note end,
  rack = case when coalesce(cardinality(k.rack), 0) = 0 then o.rack else k.rack end,
  features = case when coalesce(cardinality(k.features), 0) = 0 then o.features else k.features end,
  classic = case when k.classic is null then o.classic else k.classic end,
  gear_bucket = case when (k.gear_bucket is null or k.gear_bucket in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.gear_bucket else k.gear_bucket end,
  assumed_gear = case when (k.assumed_gear is null or k.assumed_gear in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.assumed_gear else k.assumed_gear end,
  gps_contributor_name = case when nullif(btrim(k.gps_contributor_name), '') is null then o.gps_contributor_name else k.gps_contributor_name end,
  outing_shape = case when nullif(btrim(k.outing_shape), '') is null then o.outing_shape else k.outing_shape end,
  approach_variants = case when (k.approach_variants is null or k.approach_variants in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.approach_variants else k.approach_variants end,
  climbing_route = case when (k.climbing_route is null or k.climbing_route in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.climbing_route else k.climbing_route end,
  bivy = case when (k.bivy is null or k.bivy in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.bivy else k.bivy end,
  prot_rating = case when nullif(btrim(k.prot_rating), '') is null then o.prot_rating else k.prot_rating end,
  start_type = case when nullif(btrim(k.start_type), '') is null then o.start_type else k.start_type end,
  landing = case when nullif(btrim(k.landing), '') is null then o.landing else k.landing end,
  pads = case when k.pads is null then o.pads else k.pads end,
  rock = case when nullif(btrim(k.rock), '') is null then o.rock else k.rock end,
  crux = case when nullif(btrim(k.crux), '') is null then o.crux else k.crux end,
  access_checked_at = case when k.access_checked_at is null then o.access_checked_at else k.access_checked_at end,
  ice_grade_num = case when k.ice_grade_num is null then o.ice_grade_num else k.ice_grade_num end,
  mixed_grade_num = case when k.mixed_grade_num is null then o.mixed_grade_num else k.mixed_grade_num end,
  aid_grade_num = case when k.aid_grade_num is null then o.aid_grade_num else k.aid_grade_num end,
  bolts = case when k.bolts is null then o.bolts else k.bolts end,
  guide_stars = case when k.guide_stars is null then o.guide_stars else k.guide_stars end,
  alt_names = case when coalesce(cardinality(k.alt_names), 0) = 0 then o.alt_names else k.alt_names end,
  variations = case when (k.variations is null or k.variations in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.variations else k.variations end,
  ffa = case when nullif(btrim(k.ffa), '') is null then o.ffa else k.ffa end,
  fwa = case when nullif(btrim(k.fwa), '') is null then o.fwa else k.fwa end,
  anchor = case when nullif(btrim(k.anchor), '') is null then o.anchor else k.anchor end,
  location = case when nullif(btrim(k.location), '') is null then o.location else k.location end,
  snow_grade_num = case when k.snow_grade_num is null then o.snow_grade_num else k.snow_grade_num end,
  rack_items = case when (k.rack_items is null or k.rack_items in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.rack_items else k.rack_items end,
  sun = case when nullif(btrim(k.sun), '') is null then o.sun else k.sun end,
  wet = case when nullif(btrim(k.wet), '') is null then o.wet else k.wet end,
  rock_quality = case when nullif(btrim(k.rock_quality), '') is null then o.rock_quality else k.rock_quality end,
  fixed_gear = case when nullif(btrim(k.fixed_gear), '') is null then o.fixed_gear else k.fixed_gear end
from m_merge m join routes o on o.id = m.drop_id
where k.id = m.keep;
delete from routes o using m_merge m where o.id = m.drop_id and exists (select 1 from routes k where k.id = m.keep);

-- 2. grades: the higher one, and grade_num as lib/grade.js derives it
update routes r set grade = m.to_grade, grade_num = m.to_num
  from m_grade m where r.id = m.id and r.grade = m.from_grade and r.grade_num = m.from_num;

-- 3. Cascade Canyon lists its climbs flat: they move first into "Cascade Canyon Routes" (BESIDE it, so no
--    area ever holds climbs AND sub-areas), then it and the bouldering go inside the canyon.
insert into areas (id, name, parent_id, lat, lng)
  select 'wy_cascade_canyon_routes', 'Cascade Canyon Routes', 'wy_grand_teton_national_park', 43.7628, -110.746
   where exists (select 1 from routes where area_id = 'wy_cascade_canyon');
-- Every moved climb and area stays at the place it was filed at, and every pair was READ; a section that
-- shares its crag's name key ("Poison River" / "Poison River Bluffs") would read as its own duplicate.
set local catalog.allow_duplicate = 'on';
update routes r set area_id = m.to_area from m_move m where r.id = m.id and r.area_id = m.from_area;
update areas a set parent_id = 'wy_cascade_canyon' where a.id = 'wy_cascade_canyon_routes' and a.parent_id = 'wy_grand_teton_national_park';
update areas a set parent_id = m.to_parent from m_reparent m where a.id = m.id and a.parent_id = m.from_parent;
set local catalog.allow_duplicate = 'off';

-- 4. a climber's photo or note on a COPY (contributions and topos CASCADE on an area delete) moves to its keeper
update topos t set area_id = d.into_area from m_drop_area d where t.area_id = d.id;
update contributions c set area_id = d.into_area from m_drop_area d where c.area_id = d.id;
do $$ declare n int; begin
  select (select count(*) from topos where area_id in (select id from m_drop_area))
       + (select count(*) from contributions where area_id in (select id from m_drop_area)) into n;
  if n > 0 then raise exception '0274: % climber rows still point at a copy', n; end if;
end $$;

-- 5. the keeper fills its blank columns from each copy, then the copies go, children first
update areas k set
  elevation = case when k.elevation is null then o.elevation else k.elevation end,
  avy_zone = case when nullif(btrim(k.avy_zone), '') is null then o.avy_zone else k.avy_zone end,
  blurb = case when nullif(btrim(k.blurb), '') is null then o.blurb else k.blurb end,
  elevation_ft = case when k.elevation_ft is null then o.elevation_ft else k.elevation_ft end,
  prominence_ft = case when k.prominence_ft is null then o.prominence_ft else k.prominence_ft end,
  parent_peak = case when nullif(btrim(k.parent_peak), '') is null then o.parent_peak else k.parent_peak end,
  approach = case when nullif(btrim(k.approach), '') is null then o.approach else k.approach end,
  approach_min = case when k.approach_min is null then o.approach_min else k.approach_min end,
  aspect = case when nullif(btrim(k.aspect), '') is null then o.aspect else k.aspect end,
  lat = case when k.lat is null or k.lng is null then o.lat else k.lat end,
  lng = case when k.lat is null or k.lng is null then o.lng else k.lng end,
  coords_approx = case when k.lat is null or k.lng is null then o.coords_approx else k.coords_approx end,
  rock = case when nullif(btrim(k.rock), '') is null then o.rock else k.rock end,
  rock_basis = case when nullif(btrim(k.rock), '') is null then o.rock_basis else k.rock_basis end,
  parking_name = case when k.parking_lat is null then o.parking_name else k.parking_name end,
  parking_lng = case when k.parking_lat is null then o.parking_lng else k.parking_lng end,
  parking_lat = case when k.parking_lat is null then o.parking_lat else k.parking_lat end
from m_drop_area d join areas o on o.id = d.id
where k.id = d.into_area;
do $$ declare n int; begin
  loop
    delete from areas a using m_drop_area d
     where a.id = d.id
       and not exists (select 1 from routes where area_id = a.id)
       and not exists (select 1 from areas s where s.parent_id = a.id);
    get diagnostics n = row_count;
    exit when n = 0;
  end loop;
end $$;

-- 6. pins the source contradicts: where its directions put them, flagged approximate
update areas a set lat = m.to_lat, lng = m.to_lng, coords_approx = true
  from m_pin m where a.id = m.id and abs(a.lat - m.from_lat) < 1e-6 and abs(a.lng - m.from_lng) < 1e-6;

-- 7. path is set per row by trg_areas_set_path and does NOT cascade (0221, 0233)
do $$ declare n int; begin
  loop
    update areas c set path = p.path || text2ltree(c.id) from areas p
     where c.parent_id = p.id and c.path is distinct from p.path || text2ltree(c.id);
    get diagnostics n = row_count;
    exit when n = 0;
  end loop;
end $$;

-- every area under a touched region, and every ancestor of one
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in (
  select distinct a.id from areas a join areas t on a.path @> t.path
   where t.id in (select id from areas s where exists (select 1 from areas root
     where root.id in ('bc_west_kootenay', 'wy_cascade_canyon', 'wa_thomas_w_huntamer_park', 'mi_shawshank') and s.path <@ root.path)));

do $$ declare n int; begin
  -- the empty preview database: nothing was there to fold
  if not exists (select 1 from m_before) then return; end if;
  if not exists (select 1 from m_before where id = 'bc_west_kootenay') then return; end if;
  select count(*) into n from areas where id in (select id from m_drop_area);
  if n > 0 then raise exception '0274: % copy areas were not emptied', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.to_parent;
  if n <> 46 then raise exception '0274: % of 46 sub-areas re-parented', n; end if;
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.to_area;
  if n <> 17 then raise exception '0274: % of 17 climbs moved', n; end if;
  select count(*) into n from areas where id = 'wy_cascade_canyon_routes' and parent_id = 'wy_cascade_canyon' and route_count = 15;
  if n <> 1 then raise exception '0274: Cascade Canyon Routes is not in place holding its 15 climbs'; end if;
  select count(*) into n from m_pin m join areas a on a.id = m.id and a.lat = m.to_lat and a.lng = m.to_lng and a.coords_approx;
  if n <> 6 then raise exception '0274: % of 6 pins moved', n; end if;
  select count(*) into n from m_grade m join routes r on r.id = m.id and r.grade = m.to_grade and r.grade_num = m.to_num;
  if n <> 3 then raise exception '0274: % of 3 grades set', n; end if;
  if exists (select 1 from routes where id in (select drop_id from m_merge)) then raise exception '0274: the Shawshank copy survived'; end if;
  -- nothing left any region but the Shawshank copy
  select count(*) into n from m_before b join areas a on a.id = b.id
   where a.route_count <> b.n - case when b.id = 'mi_shawshank' then 1 else 0 end;
  if n > 0 then raise exception '0274: % regions changed their climb count', n; end if;
end $$;

commit;
