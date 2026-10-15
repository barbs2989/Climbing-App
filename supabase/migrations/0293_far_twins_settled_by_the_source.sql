-- 0293: the same climb filed on two areas 2 km or more apart, settled by the source.
--
-- Asked: "do what you recommend" (2026-10-14). 0285 compared only areas under 2 km apart; this is the rest of
-- the state-wide pairs that share one or two climb names (3,573). 3,390 are names the source itself lists twice
-- in the state: two climbs, kept. Of the other 183, 49 have different descriptions or FAs: kept. 134 were read
-- (each copy, both areas' standing in the source, and the source's own page for every entry of the name), by two
-- readers and then every ONE again by me: 50 pairs are one climb, the copy filed where the source files it kept
-- (one override: Klawatti Peak's SW Buttress stays on Klawatti Peak, though the source files it under Eldorado).
--   Typical: a catch-all list the source has re-filed onto named boulders ("Forest Hill Park Bouldering",
--   "Chaos Boulders Bouldering", "Pilot Rock Routes", "Oak Flat Bouldering"), a holding pen, or a copy matched
--   to a far area by NAME (Moore's Wall's Pit Area problems copied into Rumbling Bald's "The Pit"; Mount Erie's
--   Summit Wall holding Darrington's 8-pitch Total Soul; Burge Mountain's The Ledge holding Marcus and China Bend).
-- Seven areas the merges empty go with them: one boulder or formation under two names (Phallic Symbol Boulder,
-- Sport Rocks / Flintstonehenge), Chimacum Rock under the source's "Area Closed", and four placeholders or catch-alls.
-- Two copies of one climb that drift in grade keep the HIGHER (owner rule; lib/grade.js ranks; Dishpan Hands takes
-- V8 from its older copy though the source now says V0-1 — flagged to the owner); a grade written out further
-- ("5.10 A2+" / "5.10") keeps the fuller.
-- 68 climbs merged (2 take a grade), 7 areas deleted.
-- No contribution, log, photo, topo, list or report on any climb this deletes.
-- ABORTS if climber data points at a climb deleted, or if the live tree no longer matches the plan.
-- Plan: the job's fold13/ (far3.json, sheets, verdicts) and fold15/decide.mjs; rollback: scripts/data/far-twins-rollback.json.

begin;

create temp table m_merge(keep text not null, drop_id text primary key, grade text, grade_num numeric, disc text) on commit drop;
insert into m_merge values
  ('co_the_crestones_the_prow_kit_carson', 'co_the_prow_kit_carson', null, null, null),
  ('ga_helicopter_area_shot_in_the_dark', 'ga_shot_in_the_dark', null, null, null),
  ('ga_inspired_by_an_idiot', 'ga_inspired_by_an_idiot_2', null, null, null),
  ('ut_the_blood_red_cliffs_blood_tower', 'ut_blood_tower', null, null, null),
  ('az_cam_fam_2', 'az_cam_fam', null, null, null),
  ('az_dishpan_hands_2', 'az_dishpan_hands', 'V8', 8, null),
  ('ny_entrance_boulders_2_around_the_rock_house', 'ny_around_the_rock_house', null, null, null),
  ('ca_phallic_symbol_boulder_above_the_weiner', 'ca_above_the_weiner', null, null, null),
  ('nv_sport_rocks_a_k_a_flinstonehenge_vacation_in_bedrock', 'nv_vacation_in_bedrock', null, null, null),
  ('co_the_crestones_septem_virtutum_anima_mea', 'co_septem_virtutum_anima_mea', null, null, null),
  ('wa_u2_boulder_commander_jerbot', 'wa_commander_jerbot', null, null, null),
  ('ut_east_face_slab_the_eyrie', 'ut_the_eyrie', null, null, null),
  ('ma_technology_boulder_bevel', 'ma_bevel', null, null, null),
  ('wa_klawatti_peak_sw_buttress', 'wa_main_peak_klawatti_peak_sw_buttress', '5.3 Easy Snow', 3, null),
  ('tx_hidden_sea_low_tide', 'tx_low_tide_2', null, null, null),
  ('tx_hidden_sea_the_river_runs_like_hotdog_sauce', 'tx_the_river_runs_like_hotdog_sauce', null, null, null),
  ('mi_jump_the_shark', 'mi_top_of_the_world_jump_the_shark', null, null, null),
  ('mi_sharks_fin', 'mi_top_of_the_world_sharks_fin', null, null, null),
  ('id_beehive_dome_beehive_five', 'id_beehive_five', null, null, null),
  ('wa_winter_spring_ice_snow_mixed_2_east_face_variation', 'wa_east_face_variation', null, null, null),
  ('wa_winter_spring_ice_snow_mixed_2_northeast_slabs', 'wa_the_tooth_r1', null, null, null),
  ('wy_party_dome_sabbath_leap', 'wy_sabbath_leap', null, null, null),
  ('va_nearby_barred_out', 'va_barred_out', null, null, null),
  ('va_nearby_tight_traverse', 'va_tight_traverse', null, null, null),
  ('pa_3_15_sentinel_wall_whiskey_throttle_tr', 'pa_whiskey_throttle_tr', null, null, null),
  ('az_vermillion_cliffs_2_tooth_rock_matter_in_motion', 'az_tooth_rock_matter_in_motion', null, null, null),
  ('ma_stoner', 'ma_stoner_2', null, null, null),
  ('ut_cold_war_crags_the_skeptic', 'ut_the_skeptic', null, null, null),
  ('az_dark_fall_buttress_dark_falls', 'az_dark_falls', null, null, null),
  ('wa_shrimp_traveler_crustacean', 'wa_crustacean', null, null, null),
  ('wa_shrimp_traveler_shrimp_traveler', 'wa_shrimp_traveler', null, null, null),
  ('wa_chaos_cave_senile', 'wa_senile', null, null, null),
  ('wa_compressor_crack_compressor_crack', 'wa_compressor_crack', null, null, null),
  ('ca_peak_8_468_amplitude', 'ca_amplitude', null, null, null),
  ('ca_peak_8_468_deathless_millisecond', 'ca_deathless_millisecond', null, null, null),
  ('ca_peak_8_468_patina_warmup', 'ca_patina_warmup', null, null, null),
  ('wa_meru_boulder_meru', 'wa_meru', null, null, null),
  ('ut_double_spirit_tower_the_crooked_old_man_of_the_swell', 'ut_the_crooked_old_man_of_the_swell', null, null, null),
  ('ut_lower_mill_creek_real_talk', 'ut_real_talk', null, null, null),
  ('co_moons_over_my_hammy_boulder_boobs_on_my_granny', 'co_boobs_on_my_granny', null, null, null),
  ('co_moons_over_my_hammy_boulder_southeast_arete', 'co_southeast_arete_3', null, null, null),
  ('ca_kuna_crest_area_kuna_crest_traverse_mammoth_peak_to_kuna_peak', 'ca_kuna_crest_traverse_mammoth_peak_to_kuna_peak', null, null, null),
  ('ca_heels_please_boulder_heels_please', 'ca_heels_please', null, null, null),
  ('wy_cranner_rock_south_aspect_larry_curly_and_mo', 'wy_larry_curly_and_mo', null, null, null),
  ('wy_cranner_rock_south_aspect_the_five_fourteen_crack', 'wy_the_five_fourteen_crack', null, null, null),
  ('wa_thunder_from_down_under', 'wa_thunder_from_down_under_2', null, null, null),
  ('wa_solaris_boulder_where_the_wild_things_go', 'wa_where_the_wild_things_go_2', null, null, null),
  ('wa_mr_hollow_head_boulder_conscious_sedation', 'wa_conscious_sedation', null, null, null),
  ('co_lower_broadway_snitches_get_stitches', 'co_snitches_get_stitches', null, null, null),
  ('wa_angry_buddha', 'wa_angry_buddha_2', null, null, null),
  ('ky_north_face_apartment_b', 'ky_apartment_b', null, null, null),
  ('ky_north_face_cat_s_crawl', 'ky_cat_s_crawl', null, null, null),
  ('ky_west_face_dale', 'ky_dale', null, null, null),
  ('ky_west_face_the_jump', 'ky_the_jump', null, null, null),
  ('ky_east_face_dan_blocker', 'ky_dan_blocker', null, null, null),
  ('ky_south_face_ladybug_footjam', 'ky_ladybug_footjam', null, null, null),
  ('wa_three_o_clock_rock_big_tree_2000', 'wa_c_summit_wall_big_tree_2000', null, null, null),
  ('wa_three_o_clock_rock_total_soul', 'wa_c_summit_wall_total_soul', null, null, null),
  ('wa_south_wall_2_tumor_boy', 'wa_8_the_ledge_tumor_boy', null, null, null),
  ('wa_main_wall_9_prearranged_illness', 'wa_8_the_ledge_prearranged_illness', null, null, null),
  ('wa_main_wall_9_where_s_my_hero', 'wa_8_the_ledge_where_s_my_hero', null, null, null),
  ('wa_rock_dancer_traverse', 'wa_area_closed_rock_dancer_traverse', null, null, null),
  ('wa_mount_rainier_upper_castle_toprope_wall', 'wa_upper_castle_toprope_wall', null, null, null),
  ('me_on_target', 'me_zztemp_hold_ng_maybe_deleting_on_target', null, null, null),
  ('me_super_wal_mart', 'me_zztemp_hold_ng_maybe_deleting_super_wal_mart', null, null, null),
  ('nc_men_are_from_moore_s', 'nc_pit_the_men_are_from_moore_s', null, null, null),
  ('nc_trashcanistan', 'nc_pit_the_trashcanistan', null, null, null),
  ('ut_cuticle_2', 'ut_cuticle', null, null, null);

create temp table m_route_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
-- (m_route_rename: none in this plan)

create temp table m_move(id text primary key, from_area text not null, to_area text not null, bypass boolean not null) on commit drop;
-- (m_move: none in this plan)

create temp table m_reparent(id text primary key, from_area text not null, to_area text not null) on commit drop;
-- (m_reparent: none in this plan)

create temp table m_drop_area(id text primary key, into_area text not null, ord int not null) on commit drop;
insert into m_drop_area values
  ('ca_boulder_with_phallic_symbol_painted_on_it', 'ca_phallic_symbol_boulder', 0),
  ('nv_flintstonehenge_aka_sport_rocks_wall', 'nv_sport_rocks_a_k_a_flinstonehenge', 1),
  ('wa_impossible_to_find_problems_temp_holding_spot', 'wa_bouldering_in_tumwater_canyon', 2),
  ('ma_hard_lines_boulder_placeholder_name', 'ma_dogtown', 3),
  ('tx_hostility_boulders_aka_ham_creek_park', 'tx_hidden_sea', 4),
  ('ky_pilot_rock_climbs', 'ky_pilot_rock', 5),
  ('wa_area_closed', 'wa_chimacum_rock', 6);

create temp table m_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
-- (m_rename: none in this plan)

create temp table m_new_area(id text primary key, name text not null, parent_id text not null, final_parent text not null, area_type text, region text, lat double precision, lng double precision) on commit drop;
-- (m_new_area: none in this plan)

create temp table m_pin(id text primary key, lat double precision not null, lng double precision not null, approx boolean not null, from_lat double precision, from_lng double precision) on commit drop;
-- (m_pin: none in this plan)

create temp table m_lift(id text primary key, from_parent text not null, to_parent text not null) on commit drop;
-- (m_lift: none in this plan)

create temp table m_retype(id text primary key, from_type text not null, to_type text not null) on commit drop;
-- (m_retype: none in this plan)

create temp table m_junk(id text primary key, area_id text not null, name text not null) on commit drop;
-- (m_junk: none in this plan)

-- every ancestor of every touched area, read BEFORE anything moves (old and new ancestors both)
create temp table m_recount on commit drop as
  select distinct a.id from areas a join areas t on a.path @> t.path
   where t.id in ('ca_boulder_with_phallic_symbol_painted_on_it', 'ca_phallic_symbol_boulder', 'nv_flintstonehenge_aka_sport_rocks_wall', 'nv_sport_rocks_a_k_a_flinstonehenge', 'wa_impossible_to_find_problems_temp_holding_spot', 'wa_bouldering_in_tumwater_canyon', 'ma_hard_lines_boulder_placeholder_name', 'ma_dogtown', 'tx_hostility_boulders_aka_ham_creek_park', 'tx_hidden_sea', 'ky_pilot_rock_climbs', 'ky_pilot_rock', 'wa_area_closed', 'wa_chimacum_rock', 'co_the_crestones', 'co_kit_carson_peak', 'ga_helicopter_area', 'ga_idiot_roof_area_the', 'ut_the_blood_red_cliffs', 'ut_red_canyon_2_climbs', 'az_mine_boulder_the', 'az_oak_flat_bouldering', 'ny_entrance_boulders_2', 'ny_rock_city_state_forest_climbs', 'co_challenger_point', 'wa_u2_boulder', 'ut_east_face_slab', 'ut_generator_ribs', 'ma_technology_boulder', 'wa_klawatti_peak', 'wa_main_peak', 'mi_harlow_lake_road_top_of_the_world_bouldering', 'mi_top_of_the_world', 'id_beehive_dome', 'id_harrison_peak', 'wa_winter_spring_ice_snow_mixed_2', 'wa_the_tooth_climbs', 'wy_party_dome', 'wy_east_l_a', 'va_nearby', 'va_forest_hill_park_climbs', 'pa_3_15_sentinel_wall', 'pa_3_0_euro_wall', 'az_vermillion_cliffs_2', 'az_lee_s_ferry', 'ma_white_boulder_3', 'ma_a_and_b_blocks', 'ut_cold_war_crags', 'ut_other_mill_creek_areas', 'az_dark_fall_buttress', 'az_southern_wall_2', 'wa_shrimp_traveler', 'wa_chaos_boulders_climbs', 'wa_chaos_cave', 'wa_compressor_crack', 'ca_peak_8_468', 'ca_willow_creek_trail', 'wa_meru_boulder', 'wa_tin_man_climbs', 'ut_double_spirit_tower', 'ut_smith_cabin', 'ut_lower_mill_creek', 'co_moons_over_my_hammy_boulder', 'co_lightner_creek_climbs', 'ca_kuna_crest_area', 'ca_lyell_canyon_and_donahue_pass_climbs', 'ca_heels_please_boulder', 'ca_mount_san_antonio_mt_baldy', 'wy_cranner_rock_south_aspect', 'wy_cranner_rock_north_aspect', 'wa_solaris_boulder', 'wa_holding_spot_for_poorly_organized_areas', 'wa_mr_hollow_head_boulder', 'co_lower_broadway', 'co_get_away_wall', 'wa_center_stage_boulder', 'ky_north_face', 'ky_west_face', 'ky_east_face', 'ky_south_face', 'wa_three_o_clock_rock', 'wa_a_summit_wall', 'wa_south_wall_2', 'wa_8_the_ledge', 'wa_main_wall_9', 'wa_mount_rainier', 'wa_upper_castle', 'me_city_of_bangor', 'me_zztemp_hold_ng_maybe_deleting', 'nc_pit_area_the', 'nc_pit_the', 'ut_cuticle', 'ut_red_monster_the');

do $$ declare n int; begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog: nothing to fold.
  select count(*) into n from areas where id in (select id from m_drop_area);
  if n = 0 then raise notice '0293: no catalog, nothing to fold'; return; end if;
  if n <> 7 then raise exception '0293: expected 7 copy areas, found %', n; end if;
  -- the tree must still be the one the plan read
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.from_area;
  if n <> 0 then raise exception '0293: % of 0 climbs are where the plan found them', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep join routes o on o.id = m.drop_id;
  if n <> 68 then raise exception '0293: % of 68 merge pairs still exist', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.from_area;
  if n <> 0 then raise exception '0293: % of 0 sub-areas are where the plan found them', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.from_name;
  if n <> 0 then raise exception '0293: % of 0 renames still carry the planned name', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.from_name;
  if n <> 0 then raise exception '0293: % of 0 climb renames still carry the planned name', n; end if;
  select count(*) into n from areas where id in (select id from m_new_area);
  if n > 0 then raise exception '0293: % of the new areas already exist', n; end if;
  select count(*) into n from m_pin m join areas a on a.id = m.id
   where a.lat is not distinct from m.from_lat and a.lng is not distinct from m.from_lng;
  if n <> 0 then raise exception '0293: % of 0 pins are where the plan read them', n; end if;
  select count(*) into n from m_junk j join routes r on r.id = j.id and r.area_id = j.area_id and r.name = j.name;
  if n <> 0 then raise exception '0293: % of 0 junk rows are where they were read', n; end if;
  select count(*) into n from m_lift l join areas a on a.id = l.id and a.parent_id = l.from_parent where l.id in (select id from m_drop_area);
  if n <> 0 then raise exception '0293: % of 0 placeholders to lift are where the plan read them (and are deleted)', n; end if;
  select count(*) into n from m_retype t join areas a on a.id = t.id and a.area_type = t.from_type;
  if n <> 0 then raise exception '0293: % of 0 areas to retype have the type the plan read', n; end if;
  -- every climb on a copy is accounted for
  select count(*) into n from routes r join m_drop_area d on d.id = r.area_id
   where r.id not in (select id from m_move) and r.id not in (select drop_id from m_merge);
  if n > 0 then raise exception '0293: % climbs on a copy are not in the plan', n; end if;
  select count(*) into n from areas a join m_drop_area d on d.id = a.parent_id
   where a.id not in (select id from m_reparent) and a.id not in (select id from m_drop_area);
  if n > 0 then raise exception '0293: % sub-areas of a copy are not in the plan', n; end if;
  -- refuse to cascade-delete anybody's data
  select (select count(*) from contributions where route_id in (select drop_id from m_merge union select id from m_junk))
       + (select count(*) from topo_lines where route_id in (select drop_id from m_merge union select id from m_junk))
       + (select count(*) from gps_submissions where route_id in (select drop_id from m_merge union select id from m_junk))
       + (select count(*) from content_reports where route_id in (select drop_id from m_merge union select id from m_junk))
       + (select count(*) from route_base_checkins where route_id in (select drop_id from m_merge union select id from m_junk))
       + (select count(*) from objectives where route_id in (select drop_id from m_merge union select id from m_junk))
       + (select count(*) from hazard_votes where route_id in (select drop_id from m_merge union select id from m_junk))
       + (select count(*) from climb_logs where route_id in (select drop_id from m_merge union select id from m_junk))
       + (select count(*) from crew_listings where route_id in (select drop_id from m_merge union select id from m_junk))
       + (select count(*) from user_itineraries where route_id in (select drop_id from m_merge union select id from m_junk))
       + (select count(*) from crews where route_id in (select drop_id from m_merge union select id from m_junk))
       + (select count(*) from user_lists where route_ids && (select array_agg(x) from (select drop_id x from m_merge union select id from m_junk) s))
    into n;
  if n > 0 then raise exception '0293: % climber rows point at a row this deletes — stop and repoint them', n; end if;
end $$;

-- 1. one climb stored twice: the keeper fills its blanks from the copy (its grade only when the copy's
--    is the HIGHER one, read, or extends it), then the copy goes
update routes k set
  grade = coalesce(m.grade, case when nullif(btrim(k.grade), '') is null then o.grade else k.grade end),
  grade_num = case when m.grade is not null then m.grade_num when nullif(btrim(k.grade), '') is null then o.grade_num else k.grade_num end,
  discipline = coalesce(m.disc, case when nullif(btrim(k.discipline), '') is null then o.discipline else k.discipline end),
  grade_system = case when nullif(btrim(k.grade_system), '') is null then o.grade_system else k.grade_system end,
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
delete from routes o using m_merge m
 where o.id = m.drop_id and exists (select 1 from routes k where k.id = m.keep);
delete from routes r using m_junk j where r.id = j.id and r.area_id = j.area_id and r.name = j.name;
-- a keeper takes its twin's real name ("Peanut 1" -> "No Nuts Needed (aka Peanut 1)"); the twin is gone
set local catalog.allow_duplicate = 'on';
update routes r set name = m.to_name from m_route_rename m where r.id = m.id and r.name = m.from_name;
set local catalog.allow_duplicate = 'off';

-- 2. a crag that lists its climbs flat gets "<Crag> Ice" / "<Crag> Routes" (BESIDE it first, so no area
--    ever holds climbs AND sub-areas); its climbs move in; then that area and the section go INSIDE the crag.
-- Every moved climb goes to the place it was filed at, so refuse_duplicate_route can only meet a climb this
-- plan read. A copy's sub-area joins a keeper that may hold a same-keyed area it was READ not to be, and a
-- crag's own section shares its key ("Stanley Headwall Ice": "ice" is a stop word), so refuse_duplicate_area
-- is bypassed here only.
set local catalog.allow_duplicate = 'on';
-- 2a. a placeholder steps out of the area its climbs move INTO (a climb attaches only to a leaf); it is emptied
--     and deleted below like any copy
update areas a set parent_id = l.to_parent from m_lift l where a.id = l.id and a.parent_id = l.from_parent;
insert into areas (id, name, parent_id, area_type, region, lat, lng)
  select m.id, m.name, m.parent_id, m.area_type, m.region, m.lat, m.lng from m_new_area m
   where exists (select 1 from areas p where p.id = m.parent_id);   -- an EMPTY database has no crag to add one to
insert into m_recount select id from m_new_area;
update routes r set area_id = m.to_area from m_move m where r.id = m.id and r.area_id = m.from_area;
update areas a set parent_id = m.final_parent from m_new_area m where a.id = m.id and a.parent_id = m.parent_id;
update areas a set parent_id = m.to_area from m_reparent m where a.id = m.id and a.parent_id = m.from_area;
set local catalog.allow_duplicate = 'off';

-- 3. a climber's photo or note on a COPY (contributions and topos CASCADE on an area delete) moves to its keeper
update topos t set area_id = d.into_area from m_drop_area d where t.area_id = d.id;
update contributions c set area_id = d.into_area from m_drop_area d where c.area_id = d.id;
do $$ declare n int; begin
  select (select count(*) from topos where area_id in (select id from m_drop_area))
       + (select count(*) from contributions where area_id in (select id from m_drop_area)) into n;
  if n > 0 then raise exception '0293: % climber rows still point at a copy', n; end if;
end $$;

-- 4. the keeper fills its blank columns from each copy, then the copies go, children first
update areas k set
  elevation = case when k.elevation is null then o.elevation else k.elevation end,
  avy_zone = case when nullif(btrim(k.avy_zone), '') is null then o.avy_zone else k.avy_zone end,
  blurb = case when nullif(btrim(k.blurb), '') is null then o.blurb else k.blurb end,
  elevation_ft = case when k.elevation_ft is null then o.elevation_ft else k.elevation_ft end,
  prominence_ft = case when k.prominence_ft is null then o.prominence_ft else k.prominence_ft end,
  parent_peak = case when nullif(btrim(k.parent_peak), '') is null then o.parent_peak else k.parent_peak end,
  dominant_discipline = case when nullif(btrim(k.dominant_discipline), '') is null then o.dominant_discipline else k.dominant_discipline end,
  disciplines = case when coalesce(cardinality(k.disciplines), 0) = 0 then o.disciplines else k.disciplines end,
  approach = case when nullif(btrim(k.approach), '') is null then o.approach else k.approach end,
  approach_min = case when k.approach_min is null then o.approach_min else k.approach_min end,
  aspect = case when nullif(btrim(k.aspect), '') is null then o.aspect else k.aspect end,
  lat = case when k.lat is null or k.lng is null then o.lat else k.lat end,
  lng = case when k.lat is null or k.lng is null then o.lng else k.lng end,
  coords_approx = case when k.lat is null or k.lng is null then o.coords_approx else k.coords_approx end,
  parking_lat = case when (k.parking_lat is null or k.parking_lng is null) then o.parking_lat else k.parking_lat end,
  parking_lng = case when (k.parking_lat is null or k.parking_lng is null) then o.parking_lng else k.parking_lng end,
  parking_name = case when (k.parking_lat is null or k.parking_lng is null) then o.parking_name else k.parking_name end,
  rock = case when nullif(btrim(k.rock), '') is null then o.rock else k.rock end,
  rock_basis = case when nullif(btrim(k.rock), '') is null then o.rock_basis else k.rock_basis end
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

-- 5. names, now that the copies are gone: a sort label comes off, a keeper takes the source's current spelling, a
--    nested section is named for what it holds. Each was read, and every twin a stripped name would meet was
--    folded above; bypassed because a renamed keeper still shares its key with the copy it absorbed until commit.
set local catalog.allow_duplicate = 'on';
update areas a set name = m.to_name from m_rename m where a.id = m.id and a.name = m.from_name;
set local catalog.allow_duplicate = 'off';
-- an area that now holds climbs takes the type every other one does
update areas a set area_type = t.to_type from m_retype t where a.id = t.id and a.area_type = t.from_type;

-- 5b. pins READ wrong take the place's pin (an approximate one says so on the area screen)
update areas a set lat = m.lat, lng = m.lng, coords_approx = m.approx from m_pin m
 where a.id = m.id and a.lat is not distinct from m.from_lat and a.lng is not distinct from m.from_lng;

-- 6. path is set per row by trg_areas_set_path and does NOT cascade (0221, 0233)
do $$ declare n int; begin
  loop
    update areas c set path = p.path || text2ltree(c.id) from areas p
     where c.parent_id = p.id and c.path is distinct from p.path || text2ltree(c.id);
    get diagnostics n = row_count;
    exit when n = 0;
  end loop;
end $$;

update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in (select id from m_recount);

do $$ declare n int; begin
  -- the empty preview database: nothing was there to fold
  if not exists (select 1 from routes where id in (select keep from m_merge)) then return; end if;
  select count(*) into n from areas where id in (select id from m_drop_area);
  if n > 0 then raise exception '0293: % copy areas were not emptied', n; end if;
  select count(*) into n from routes where id in (select drop_id from m_merge union select id from m_junk);
  if n > 0 then raise exception '0293: % merged or junk climbs survived', n; end if;
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.to_area;
  if n <> 0 then raise exception '0293: % of 0 climbs moved', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.to_name;
  if n <> 0 then raise exception '0293: % of 0 renames landed', n; end if;
  select count(*) into n from m_new_area m join areas a on a.id = m.id and a.parent_id = m.final_parent and a.route_count > 0;
  if n <> 0 then raise exception '0293: % of 0 new areas are in place, holding their climbs', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.to_area;
  if n <> 0 then raise exception '0293: % of 0 sub-areas re-parented', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.to_name;
  if n <> 0 then raise exception '0293: % of 0 climb renames landed', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep where m.grade is not null and (k.grade <> m.grade or k.grade_num is distinct from m.grade_num);
  if n > 0 then raise exception '0293: % merged grades or grade_nums did not land', n; end if;
  select count(*) into n from m_pin m join areas a on a.id = m.id and a.lat = m.lat and a.lng = m.lng and a.coords_approx = m.approx;
  if n <> 0 then raise exception '0293: % of 0 pins landed', n; end if;
  select count(*) into n from m_retype t join areas a on a.id = t.id and a.area_type = t.to_type;
  if n <> 0 then raise exception '0293: % of 0 retypes landed', n; end if;
  -- no area holds climbs AND sub-areas
  select count(*) into n from areas a where a.id in (select id from m_recount)
     and exists (select 1 from routes r where r.area_id = a.id) and exists (select 1 from areas s where s.parent_id = a.id);
  if n > 0 then raise exception '0293: % areas hold climbs and sub-areas', n; end if;
end $$;

commit;
