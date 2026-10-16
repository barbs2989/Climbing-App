-- 0276: one place, one area — the same-named places check:area-duplicates cannot pair, READ and folded.
--
-- Asked: "merging might be a good idea now" (2026-10-08), under "fold into 1 area, same for everything else,
-- i don't want duplicates". check:area-duplicates pairs only same-named areas that BOTH carry a coordinate
-- and climbs and sit < 3 km apart. Measured outside that reach: 900 same-named pairs inside one region (an
-- empty copy, a copy with no pin, or 3-25 km apart); 386 not already listed were READ pair by pair (four
-- readers, then a web pass on the 11 they could not settle; every call re-read here). Most were not single
-- pairs but PARALLEL TREES — one place imported twice under two parents. 23 folded from the top
-- (Grand Canyon / Grand Canyon National Park, Mount Charleston Ice / Winter, Olympic / Olympic Peninsula
-- Bouldering, Widgi Creek / Boulders, Mt. Evans / Mt. Blue Sky Bouldering, Wyalusing, Frenchman Coulee,
-- Seattle, Wayne's World, Banks Lake / Northrup Canyon, Castle Rock / Castle Rock and Sanborn, Tum Tum /
-- Tumtum, Sandia Mountains / (West Side), Wine Country / Northeast Bay, La Madre Range / Area, Dumplingtown /
-- Dumplington Hill), and the region copies one level down (Utah's San Juan and Grand County copies of
-- Indian Creek, Potash Road, Blanding, La Sal...; Montana's Kalispell / Bozeman / Butte Area copies of Stone
-- Hill, Glacier, Gallatin, Hyalite...).
--
-- The fold is 0251/0261's: a climb the keeper already holds (same name, same discipline family, same base
-- grade) MERGES — the keeper fills its blanks from the copy; any other climb MOVES; a child the keeper has
-- (by name, or the ONE same-named area deeper in it: "Bright Angel Walls" under "Canyons") folds in turn;
-- any other child is RE-PARENTED; the copy is DELETED. Children first, parallel trees last.
--   * 162 climbs merged (22 take a grade: the HIGHER one, owner rule, or the copy's when it only
--     extends the keeper's — "5.9" -> "5.9 PG13"; grade_num from lib/grade.js). 49 were READ as one climb under
--     two names: Peanut 1-3 = "No Nuts Needed (aka Peanut 1)"...; Carlton Peak's numbered "9"-"28" = their
--     named "(aka #N)" twins; JCVD / Van Damme; X Crack (The Kid?); Bolt Gun; and 20 climbs The VC's Main Wall
--     lists that Falling Rock's "Main Wall" also held (Mountain Project files them at The VC; 12 more of
--     them that only Falling Rock held move there; Falling Rock keeps its own 16).
--   * 77 climbs moved, 282 sub-areas re-parented, 205 copies deleted. No contribution, log, photo,
--     topo, list or report on any climb this deletes; a photo or note on a deleted AREA moves to its keeper.
--   * 12 copies NEST instead (a flat list beside a place with sub-areas, its climbs not in the place, or a
--     discipline section): named for what they hold, never the place's name again ("La Bleue" inside "La
--     Bleue" -> "La Bleue Bouldering"); 2 crags that listed their climbs flat first get their own child.
--   * 1 junk row deleted: "Ariel map of route locations", a "climb" that is the source's map image.
-- LEFT, read: 2 still unsure (Boulder N / Pimp Juice, Lake of the Woods); Grohman Narrows x2 and Klettergarten /
-- Gilly Monsters (two places each); Joshua Tree's Pinto Basin bouldering (its sub-areas do not line up); the
-- empty "Cone, The" (0.85 km, a different sub-area); and every pair read as DIFFERENT (named faces, generic
-- names on different formations). A second pass — same names in one STATE under different regions, which
-- this one could not see (Minnesota's two Duluth trees) — is the next migration.
-- ABORTS if climber data points at a climb deleted, or if the live tree no longer matches the plan.
-- Plan: the job's fold4/plan.mjs + its verdict files; rollback: scripts/data/same-name-folds-rollback.json.

begin;

create temp table m_merge(keep text not null, drop_id text primary key, grade text, grade_num numeric, disc text) on commit drop;
insert into m_merge values
  ('az_peanut_1', 'az_behind_sweet_rock_peanut_rock_no_nuts_needed_aka_peanut_1', null, null, null),
  ('az_peanut_2', 'az_behind_sweet_rock_peanut_rock_peanut_butter_aka_peanut_2', null, null, null),
  ('az_peanut_3', 'az_behind_sweet_rock_peanut_rock_more_like_a_potato_aka_peanut_3', null, null, null),
  ('mn_south_buttress_aka_higher_education_wall_all_nighter_aka_9', 'mn_9', null, null, null),
  ('mn_south_buttress_aka_higher_education_wall_setting_the_curve_aka_10', 'mn_10', null, null, null),
  ('mn_south_buttress_aka_higher_education_wall_group_project_aka_11', 'mn_11', null, null, null),
  ('mn_south_buttress_aka_higher_education_wall_publish_or_perish_aka_12', 'mn_12', null, null, null),
  ('mn_south_buttress_aka_higher_education_wall_plagiarism_aka_13', 'mn_13', null, null, null),
  ('mn_south_buttress_aka_higher_education_wall_office_hours_aka_14', 'mn_14', null, null, null),
  ('mn_south_buttress_aka_higher_education_wall_cram_aka_15', 'mn_15', null, null, null),
  ('mn_south_buttress_aka_higher_education_wall_citation_needed_aka_16', 'mn_16', null, null, null),
  ('mn_south_buttress_aka_higher_education_wall_midterm_aka_17', 'mn_17', null, null, null),
  ('mn_south_buttress_aka_higher_education_wall_final_aka_18', 'mn_18', null, null, null),
  ('mn_south_face_aka_adulting_area_overeducated_aka_19', 'mn_19', null, null, null),
  ('mn_south_face_aka_adulting_area_mortgage_aka_20_and_21', 'mn_20', null, null, null),
  ('mn_south_face_aka_adulting_area_aches_pains_aka_23', 'mn_23', null, null, null),
  ('mn_south_face_aka_adulting_area_rugrats_aka_25', 'mn_25', null, null, null),
  ('mn_south_face_aka_adulting_area_landline_aka_26', 'mn_26', null, null, null),
  ('mn_south_face_aka_adulting_area_older_than_dirt_aka_28', 'mn_28', null, null, null),
  ('ca_jcvd_jean_claud_van_dam', 'ca_jcvd_jean_claud_van_damme_boulder_jcvd_jean_claud_van_damme', null, null, null),
  ('co_x_crack', 'co_x_crack_boulder_the_kid_boulder_x_crack_the_kid', null, null, null),
  ('wa_stallone_s_bolt_gun', 'wa_little_matterhorn_rock_kid_rock_bolt_gun', null, null, null),
  ('sd_hot_cock', 'sd_main_wall_hot_cock', null, null, null),
  ('sd_mogo_chaji', 'sd_main_wall_mogo_chaji', null, null, null),
  ('sd_man_china', 'sd_main_wall_man_china', null, null, null),
  ('sd_map_of_japan', 'sd_main_wall_map_of_japan', null, null, null),
  ('sd_me_so_corny', 'sd_main_wall_me_so_corny', null, null, null),
  ('sd_bluecelee', 'sd_main_wall_bluecelee', null, null, null),
  ('sd_hung_shui', 'sd_main_wall_hung_shui', null, null, null),
  ('sd_i_speak_crussian', 'sd_main_wall_i_speak_crussian', null, null, null),
  ('sd_ralph_matchio', 'sd_main_wall_ralph_matchio', null, null, null),
  ('sd_billy_cranks', 'sd_main_wall_billy_cranks', null, null, null),
  ('sd_foot_fist_way', 'sd_main_wall_foot_fist_way', null, null, null),
  ('sd_steep_cheap', 'sd_main_wall_steep_cheap', null, null, null),
  ('sd_huck_norris', 'sd_main_wall_huck_norris', null, null, null),
  ('sd_kancho', 'sd_main_wall_kancho', null, null, null),
  ('sd_ninja_please', 'sd_main_wall_ninja_please', null, null, null),
  ('sd_ho_chi_minh_rail', 'sd_main_wall_ho_chi_minh_rail', null, null, null),
  ('sd_thin_red_line', 'sd_main_wall_thin_red_line', null, null, null),
  ('sd_tokyo_drift', 'sd_main_wall_tokyo_drift', null, null, null),
  ('sd_babushka_boy', 'sd_main_wall_babushka_boy', null, null, null),
  ('sd_thin_red_line_variation', 'sd_main_wall_thin_red_line_variation', null, null, null),
  ('ut_split_pinnacle', 'ut_unsorted_routes_split_pinnacle', null, null, null),
  ('ut_arch_route', 'ut_unsorted_routes_arch_route', null, null, null),
  ('ut_the_event_horizon', 'ut_unsorted_routes_the_event_horizon', '5.13c', 13.75, null),
  ('ut_giulia', 'ut_unsorted_routes_giulia', null, null, null),
  ('ut_clementine_corner', 'ut_clementine_corner_crag_clementine_corner', null, null, null),
  ('ca_crimps_of_bel_air', 'ca_bel_air_boulder_crimps_of_bel_air', 'V6-7 R', 7, null),
  ('co_grotto_sector_trout_fishing_in_america', 'co_trout_fishing_in_america', null, null, null),
  ('or_vader_s_helmet_boulder_2_the_ewok', 'or_the_ewok', null, null, null),
  ('or_vader_s_helmet_boulder_2_r2d2', 'or_r2d2', null, null, null),
  ('mt_lakeside_walls_2_flame', 'mt_flame', null, null, null),
  ('mt_lakeside_walls_2_the_arborist', 'mt_the_arborist', null, null, null),
  ('mt_lakeside_walls_2_keeper_of_the_flame', 'mt_keeper_of_the_flame', '5.10b', 10.5, null),
  ('mt_lakeside_walls_2_ben_parsons_memorial_route', 'mt_ben_parson_s_memorial_route', '5.10b/c', 10.5, null),
  ('or_the_brain_boulder_corpus_callosum', 'or_corpus_callosum', null, null, null),
  ('or_the_brain_boulder_the_brain_escape', 'or_the_brain_escape', null, null, null),
  ('or_the_brain_boulder_brain_freeze', 'or_brain_freeze', null, null, null),
  ('or_the_brain_boulder_ziggy', 'or_ziggy', null, null, null),
  ('or_the_brain_boulder_butt_hurt', 'or_butt_hurt', null, null, null),
  ('or_the_brain_boulder_the_brain', 'or_the_brain', null, null, null),
  ('or_the_brain_boulder_left_hemisphere', 'or_left_hemisphere', null, null, null),
  ('or_cranky_locals_wall_2_cranky_crack_right', 'or_cranky_crack_right', null, null, null),
  ('va_forgot', 'va_afterthought_boulder_2_forgot', null, null, null),
  ('va_afterthought_arete', 'va_afterthought_boulder_2_afterthought_arete', null, null, null),
  ('va_the_stork', 'va_dumbo_boulder_2_the_stork', null, null, null),
  ('va_pink_elephants_fly', 'va_dumbo_boulder_2_pink_elephants_fly', null, null, null),
  ('va_timothy_q', 'va_dumbo_boulder_2_timothy_q', null, null, null),
  ('va_dumbo', 'va_dumbo_boulder_2_dumbo', null, null, null),
  ('va_false_alarm', 'va_shade_boulder_3_false_alarm', null, null, null),
  ('va_walk_the_line', 'va_shade_boulder_3_walk_the_line', null, null, null),
  ('va_security', 'va_shade_boulder_3_security', null, null, null),
  ('va_running_man', 'va_shade_boulder_3_running_man', null, null, null),
  ('va_shade_arete', 'va_shade_boulder_3_shade_arete', null, null, null),
  ('va_walking_deer', 'va_shade_boulder_3_walking_deer', null, null, null),
  ('va_happy_days', 'va_shade_boulder_3_happy_days', null, null, null),
  ('va_bullseye', 'va_shade_boulder_3_bullseye', null, null, null),
  ('va_rapscallion', 'va_shade_boulder_3_rapscallion', null, null, null),
  ('va_dark_days', 'va_shade_boulder_3_dark_days', null, null, null),
  ('wa_the_chopping_block_northeast_ridge', 'wa_the_chopping_block_pinnacle_peak_northeast_ridge', null, null, null),
  ('ut_everett_ruess_memorial_boulder_closed_butt_rocker_closed', 'ut_butt_rocker', null, null, null),
  ('ut_everett_ruess_memorial_boulder_closed_lithic_scatter_closed', 'ut_lithic_scatter', null, null, null),
  ('ut_everett_ruess_memorial_boulder_closed_shakey_flake_closed', 'ut_shakey_flake', null, null, null),
  ('ut_everett_ruess_memorial_boulder_closed_everett_ruess_memorial_face_problem_closed', 'ut_everett_ruess_memorial_face_problem', null, null, null),
  ('az_ruskie_buisness', 'az_crumblin_wall_2_ruskie_buisness', null, null, null),
  ('az_the_urge_to_purge', 'az_crumblin_wall_2_the_urge_to_purge', null, null, null),
  ('az_kaibab_crack', 'az_crumblin_wall_2_kaibab_crack', null, null, null),
  ('az_sunset_wage', 'az_crumblin_wall_2_sunset_wage', null, null, null),
  ('az_warren_piece', 'az_crumblin_wall_2_warren_piece', '5.12b/c PG13', 12.5, null),
  ('az_beetle_of_the_bulge', 'az_flailing_wall_2_beetle_of_the_bulge', null, null, null),
  ('az_arm_and_hammer', 'az_flailing_wall_2_arm_and_hammer', null, null, null),
  ('az_cleanliness', 'az_medivac_wall_3_cleanliness', null, null, null),
  ('az_billy_crystal', 'az_medivac_wall_3_billy_crystal', null, null, null),
  ('az_godliness', 'az_medivac_wall_3_godliness', null, null, null),
  ('az_loch_ness', 'az_medivac_wall_3_loch_ness', null, null, null),
  ('ut_northeast_ridge', 'ut_zeus_2_northeast_ridge', '5.7 A0', 0, null),
  ('ut_sisyphus', 'ut_zeus_2_sisyphus', '5.11 R', 11, null),
  ('wa_cobblestone_wall_2_speaking_spanish', 'wa_speaking_spanish', null, null, null),
  ('wa_cobblestone_wall_2_cobl_wobl', 'wa_cobl_wobl', null, null, null),
  ('wa_cobblestone_wall_2_mean_streak', 'wa_mean_streak', null, null, null),
  ('wa_cobblestone_wall_2_warts', 'wa_warts_2', null, null, null),
  ('ca_tex_mex', 'ca_pangea_wall_tex_mex', '5.9 C0', 0, null),
  ('ca_point_break', 'ca_pangea_wall_point_break', '5.8 C0', 0, null),
  ('ca_peregrine', 'ca_pangea_wall_peregrine', '5.7 C0', 0, null),
  ('ut_cultural_respect_wall_2_unknown_11', 'ut_unknown_11_3', null, null, null),
  ('ut_cultural_respect_wall_2_freemont_haunting', 'ut_freemont_haunting', null, null, null),
  ('ut_election_wall_2_chota_boy', 'ut_chota_boy', null, null, null),
  ('ut_election_wall_2_the_dangling_chad', 'ut_the_dangling_chad', null, null, null),
  ('ut_election_wall_2_spiderpig_of_the_desert', 'ut_spiderpig_of_the_desert', null, null, null),
  ('ut_election_wall_2_unnamed', 'ut_unnamed_17', null, null, null),
  ('ut_election_wall_2_imagine', 'ut_imagine', null, null, null),
  ('ut_election_wall_2_crooked_as_they_come', 'ut_crooked_as_they_come', null, null, null),
  ('ut_election_wall_2_stairway_to_heaven', 'ut_stairway_to_heaven', null, null, null),
  ('ut_election_wall_2_100_yourself', 'ut_100_yourself', null, null, null),
  ('ut_election_wall_2_far_right', 'ut_far_right', null, null, null),
  ('ut_election_wall_2_the_far_left', 'ut_the_far_left', null, null, null),
  ('ut_election_wall_2_the_campaigner', 'ut_the_campaigner', null, null, null),
  ('ut_election_wall_2_emmanator', 'ut_emmanator', null, null, null),
  ('ut_election_wall_2_two_party_system', 'ut_two_party_system', null, null, null),
  ('ut_election_wall_2_in_and_out', 'ut_in_and_out', null, null, null),
  ('ut_easy_ramp_2', 'ut_king_s_hand_2_easy_ramp', '5.6 PG13', 6, null),
  ('ut_teabag', 'ut_king_s_hand_2_teabag', '5.8 PG13', 8, null),
  ('ut_king_s_hand_left', 'ut_king_s_hand_2_king_s_hand_left', '5.9 X', 9, null),
  ('ut_konichiwa', 'ut_king_s_hand_2_konichiwa', '5.9 PG13', 9, null),
  ('ut_moonglue', 'ut_king_s_hand_2_moonglue', '5.9 PG13', 9, null),
  ('ut_king_s_hand_right', 'ut_king_s_hand_2_king_s_hand_right', '5.10a PG13', 10.25, null),
  ('ut_unknown_crack_2', 'ut_king_s_hand_2_unknown_crack', null, null, null),
  ('ut_sic_fun_ramp', 'ut_king_s_hand_2_sic_fun_ramp', '5.10+ PG13', 10, null),
  ('wa_anchor_rock_2_excelsior', 'wa_excelsior', null, null, null),
  ('wa_anchor_rock_2_top_out_cop_out', 'wa_top_out_cop_out', null, null, null),
  ('wa_anchor_rock_2_odb_left', 'wa_odb_left', null, null, null),
  ('wa_cranium_boulder_2_cranium_cracker', 'wa_cranium_cracker', null, null, null),
  ('wa_the_olympic_boulder_olympic_new_sit', 'wa_olympic_new_sit', null, null, null),
  ('wa_roadside_boulder_3_kelly_s_fly', 'wa_kelly_s_fly', null, null, null),
  ('wa_roadside_boulder_3_horse_fly', 'wa_horse_fly', null, null, null),
  ('wa_5_10a', 'wa_little_matterhorn_rock_kid_rock_5_10a', null, null, null),
  ('nh_unknown_v2', 'nh_corridor_block_unknown_v2', null, null, null),
  ('ak_davey_jones', 'ak_davey_jones_2', 'V8-9', 9, null),
  ('ak_black_beard', 'ak_black_beard_2', null, null, null),
  ('az_jamfest_2_0', 'az_bass_camp_2_jamfest_2_0', null, null, null),
  ('az_megs_love_and_the_party_boat', 'az_bass_camp_2_megs_love_and_the_party_boat', null, null, null),
  ('az_pursuit_of_happiness', 'az_bass_camp_2_pursuit_of_happiness', null, null, null),
  ('az_vermillion_cliffs_2_tooth_rock_matter_in_motion', 'az_vermillion_cliffs_tooth_rock_matter_in_motion', null, null, null),
  ('co_water_tower_sector_opportunity_cost', 'co_opportunity_cost', null, null, null),
  ('co_laying_in_wait', 'co_laying_in_wait_boulder_2_laying_in_wait', null, null, null),
  ('ut_regular_route_5', 'ut_devil_s_golf_ball_aka_the_bulbous_head_regular_route', '5.10b C1', 1, null),
  ('ut_25_foot_ronald', 'ut_topus_boulder_2_25_foot_ronald', null, null, null),
  ('ut_bottle_o_fun', 'ut_topus_boulder_2_bottle_o_fun', null, null, null),
  ('ut_charlotte_s_web', 'ut_topus_boulder_2_charlotte_s_web', 'V1', 1, null),
  ('ut_topus_arete', 'ut_topus_boulder_2_topus_arete', null, null, null),
  ('ut_topus_left', 'ut_topus_boulder_2_topus_left', null, null, null),
  ('ut_kangaroo_meat', 'ut_topus_boulder_2_kangaroo_meat', 'V8-', 8, null),
  ('ut_tic_tac_toe', 'ut_topus_boulder_2_tic_tac_toe', null, null, null),
  ('nh_unknown_ship_s_prow', 'nh_45_to_life_area_unknown_ship_s_prow', null, null, null),
  ('ut_release_the_cracklin', 'ut_bookend_butte_release_the_cracklin', '5.8 A2+', 2, null),
  ('az_doghouse_direct_aka_doggy_style', 'az_angels_gate_2_dog_house_direct_aka_doggy_style', null, null, null),
  ('co_gateway_arete', 'co_gateway_boulder_3_gateway_arete', null, null, null),
  ('co_the_horn_arete', 'co_gateway_boulder_3_the_horn_arete', null, null, null),
  ('co_black_tornado', 'co_gateway_boulder_3_black_tornado', null, null, null),
  ('co_gateway_face', 'co_gateway_boulder_3_gateway_face', null, null, null),
  ('co_gateway', 'co_gateway_boulder_3_gateway', null, null, null),
  ('co_downtrail_face', 'co_gateway_boulder_3_downtrail_face', null, null, null);

create temp table m_route_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
insert into m_route_rename values
  ('az_peanut_1', 'Peanut 1', 'No Nuts Needed (aka Peanut 1)'),
  ('az_peanut_2', 'Peanut 2', 'Peanut Butter (aka Peanut 2)'),
  ('az_peanut_3', 'Peanut 3', 'More Like a Potato (aka Peanut 3)'),
  ('ca_jcvd_jean_claud_van_dam', 'JCVD (Jean Claud Van Dam)', 'JCVD (Jean Claud Van Damme)');

create temp table m_move(id text primary key, from_area text not null, to_area text not null, bypass boolean not null) on commit drop;
insert into m_move values
  ('sd_main_wall_hot_love', 'sd_main_wall', 'sd_main_wall_china_and_victor_charlie_walls_the', false),
  ('sd_main_wall_the_main_wall', 'sd_main_wall', 'sd_main_wall_china_and_victor_charlie_walls_the', false),
  ('sd_main_wall_buckets_overhead', 'sd_main_wall', 'sd_main_wall_china_and_victor_charlie_walls_the', false),
  ('sd_main_wall_crouching_tiger_hidden_pocket', 'sd_main_wall', 'sd_main_wall_china_and_victor_charlie_walls_the', false),
  ('sd_main_wall_throat_cobra', 'sd_main_wall', 'sd_main_wall_china_and_victor_charlie_walls_the', false),
  ('sd_main_wall_crackie_chan', 'sd_main_wall', 'sd_main_wall_china_and_victor_charlie_walls_the', false),
  ('sd_main_wall_karaoke_kitten', 'sd_main_wall', 'sd_main_wall_china_and_victor_charlie_walls_the', false),
  ('sd_main_wall_secret_asian_man', 'sd_main_wall', 'sd_main_wall_china_and_victor_charlie_walls_the', false),
  ('sd_main_wall_gojira', 'sd_main_wall', 'sd_main_wall_china_and_victor_charlie_walls_the', false),
  ('sd_main_wall_tune_in_tokyo', 'sd_main_wall', 'sd_main_wall_china_and_victor_charlie_walls_the', false),
  ('sd_main_wall_girivic', 'sd_main_wall', 'sd_main_wall_china_and_victor_charlie_walls_the', false),
  ('sd_main_wall_kabuki_mask', 'sd_main_wall', 'sd_main_wall_china_and_victor_charlie_walls_the', false),
  ('or_bobo_fett', 'or_vader_s_helmet_boulder', 'or_vader_s_helmet_boulder_2', false),
  ('mt_rocky_and_bullwinkle', 'mt_tip_toe_area', 'mt_09_tip_toe_area_tanman_buttress', false),
  ('ca_finger_traverse', 'ca_roadside_boulder_7', 'ca_roadside_baloney_boulder', false),
  ('ca_tafoni_baloney', 'ca_roadside_boulder_7', 'ca_roadside_baloney_boulder', false),
  ('wa_unknown_14', 'wa_cobblestone_wall', 'wa_cobblestone_wall_2', false),
  ('ca_poker', 'ca_wild_wild_western_pinnacles_aka_orange_rocks', 'ca_wild_wild_western_pinnacles_aka_orange_rocks_routes', false),
  ('ca_mid_life_crisis', 'ca_wild_wild_western_pinnacles_aka_orange_rocks', 'ca_wild_wild_western_pinnacles_aka_orange_rocks_routes', false),
  ('ca_harlot_s_slot_pete_s_5_12b', 'ca_wild_wild_western_pinnacles_aka_orange_rocks', 'ca_wild_wild_western_pinnacles_aka_orange_rocks_routes', false),
  ('ca_wild_wild_western_pinnacles_aka_orange_rocks_magnificent_7', 'ca_wild_wild_western_pinnacles_aka_orange_rocks', 'ca_wild_wild_western_pinnacles_aka_orange_rocks_routes', false),
  ('ca_gold_rush_high_noon', 'ca_wild_wild_western_pinnacles_aka_orange_rocks', 'ca_wild_wild_western_pinnacles_aka_orange_rocks_routes', false),
  ('ca_10a_short_crack', 'ca_mickey_s_wall_north_side_3', 'ca_mickey_s_wall_north_side', false),
  ('ca_5_11_tr_3', 'ca_mickey_s_wall_north_side_3', 'ca_mickey_s_wall_north_side', false),
  ('wa_julies_roof', 'wa_ca_dihedral_wall', 'wa_dihedral_wall', false),
  ('wa_cup_and_saucer', 'wa_ca_dihedral_wall', 'wa_dihedral_wall', false),
  ('wa_the_defoliator_instigator', 'wa_ca_dihedral_wall', 'wa_dihedral_wall', false),
  ('wa_the_terminator', 'wa_ca_dihedral_wall', 'wa_dihedral_wall', false),
  ('wa_gogum', 'wa_ca_dihedral_wall', 'wa_dihedral_wall', false),
  ('ut_king_s_hand_2_turtle_on_a_trampoline', 'ut_king_s_hand_2', 'ut_king_s_hand', false),
  ('ak_lower_tee_harbor_cliff_galaga_69', 'ak_lower_tee_harbor_cliff', 'ak_lower_tee_harbor_cliff_aka_sci_fi_wall', false),
  ('ca_main_rock_aka_scary_boulder_not_so_scary_traverse', 'ca_main_rock_aka_scary_boulder', 'ca_main_rock_3', false),
  ('ut_left_rambo_aka_gasp_wall_rfc', 'ut_left_rambo_aka_gasp_wall', 'ut_left_rambo', false),
  ('ut_left_rambo_aka_gasp_wall_hong_this', 'ut_left_rambo_aka_gasp_wall', 'ut_left_rambo', false),
  ('wa_little_matterhorn_rock_kid_rock_5_3', 'wa_little_matterhorn_rock_kid_rock', 'wa_little_matterhorn_rock', false),
  ('wa_little_matterhorn_rock_kid_rock_5_5_s_tr', 'wa_little_matterhorn_rock_kid_rock', 'wa_little_matterhorn_rock', false),
  ('wa_little_matterhorn_rock_kid_rock_5_8', 'wa_little_matterhorn_rock_kid_rock', 'wa_little_matterhorn_rock', false),
  ('wa_little_matterhorn_rock_kid_rock_eagle_scout_route', 'wa_little_matterhorn_rock_kid_rock', 'wa_little_matterhorn_rock', false),
  ('wa_little_matterhorn_rock_kid_rock_west_side_route', 'wa_little_matterhorn_rock_kid_rock', 'wa_little_matterhorn_rock', false),
  ('wa_little_matterhorn_rock_kid_rock_capa_ferro', 'wa_little_matterhorn_rock_kid_rock', 'wa_little_matterhorn_rock', false),
  ('wa_mount_olympus_2_north_ridge_via_blue_glacier', 'wa_mount_olympus_2', 'wa_mount_olympus', false),
  ('nh_corridor_block_phlebotomy', 'nh_corridor_block', 'nh_left_end_the_2', false),
  ('nh_left_end_proper_endoscopy', 'nh_left_end_proper', 'nh_left_end_the_2', false),
  ('nh_left_end_proper_direct_fatality_left', 'nh_left_end_proper', 'nh_left_end_the_2', false),
  ('nh_left_end_proper_crystal_ball', 'nh_left_end_proper', 'nh_left_end_the_2', false),
  ('nh_left_end_proper_fatal_flaw_left', 'nh_left_end_proper', 'nh_left_end_the_2', false),
  ('nh_left_end_proper_direct_fatality', 'nh_left_end_proper', 'nh_left_end_the_2', false),
  ('nh_left_end_proper_fatal_flaw', 'nh_left_end_proper', 'nh_left_end_the_2', false),
  ('wy_hueco_simulator', 'wy_hueco_simulator_boulder', 'wy_hueco_simulator_boulder_2', false),
  ('mn_16_5', 'mn_south_buttress', 'mn_south_buttress_aka_higher_education_wall', false),
  ('or_0_valhalla_project', 'or_0_valhalla', 'or_valhalla', false),
  ('wi_summit_tunnel_route', 'wi_shiprock_a_k_a_sh_trock', 'wi_shiprock', false),
  ('ab_stanley_headwall_sinus_gully', 'ab_stanley_headwall', 'ab_stanley_headwall_routes', false),
  ('ab_stanley_headwall_general_malaise', 'ab_stanley_headwall', 'ab_stanley_headwall_routes', false),
  ('ab_stanley_headwall_man_yoga', 'ab_stanley_headwall', 'ab_stanley_headwall_routes', false),
  ('ab_stanley_headwall_suffer_machine', 'ab_stanley_headwall', 'ab_stanley_headwall_routes', false),
  ('ab_stanley_headwall_fiasco', 'ab_stanley_headwall', 'ab_stanley_headwall_routes', false),
  ('ab_stanley_headwall_nemesis', 'ab_stanley_headwall', 'ab_stanley_headwall_routes', false),
  ('ab_stanley_headwall_french_reality', 'ab_stanley_headwall', 'ab_stanley_headwall_routes', false),
  ('ab_stanley_headwall_rhamnusia', 'ab_stanley_headwall', 'ab_stanley_headwall_routes', false),
  ('ab_stanley_headwall_the_day_after_les_vacances_de_monsieur_hulot', 'ab_stanley_headwall', 'ab_stanley_headwall_routes', false),
  ('ab_stanley_headwall_dawn_of_the_dead', 'ab_stanley_headwall', 'ab_stanley_headwall_routes', false),
  ('ab_stanley_headwall_nightmare_on_wolf_street', 'ab_stanley_headwall', 'ab_stanley_headwall_routes', false),
  ('mt_st_mary_falls_trail_2_grandpa_corner', 'mt_st_mary_falls_trail_2', 'mt_st_mary_falls_trail', false),
  ('ok_the_crag_black_hawk_up', 'ok_the_crag', 'ok_crag_the', false),
  ('ok_the_crag_dak', 'ok_the_crag', 'ok_crag_the', false),
  ('ok_the_crag_the_fella', 'ok_the_crag', 'ok_crag_the', false),
  ('ok_the_crag_the_kreaper', 'ok_the_crag', 'ok_crag_the', false),
  ('ok_the_crag_founders_club', 'ok_the_crag', 'ok_crag_the', false),
  ('ok_the_crag_forks_over_knives', 'ok_the_crag', 'ok_crag_the', false),
  ('tn_roll_deep', 'tn_mountain_the', 'tn_the_mountain', false),
  ('tn_trash_foxy', 'tn_mountain_the', 'tn_the_mountain', false),
  ('wa_sehome_arboretum_old_moss_ladder', 'wa_sehome_arboretum_old', 'wa_sehome_arboretum_climbs', false),
  ('wa_sehome_arboretum_old_see_eye_a', 'wa_sehome_arboretum_old', 'wa_sehome_arboretum_climbs', false),
  ('wa_sehome_arboretum_old_hug_it_out', 'wa_sehome_arboretum_old', 'wa_sehome_arboretum_climbs', false),
  ('ut_bookend_butte_i_don_t_feel_tardy', 'ut_bookend_butte', 'ut_cracklin_butte', false),
  ('ut_bookend_butte_nice_new_outfit', 'ut_bookend_butte', 'ut_cracklin_butte', false);

create temp table m_reparent(id text primary key, from_area text not null, to_area text not null) on commit drop;
insert into m_reparent values
  ('ca_wild_wild_western_pinnacles', 'ca_bishop_peak_bouldering', 'ca_wild_wild_western_pinnacles_aka_orange_rocks'),
  ('ut_upper_grey_cliffs_2', 'ut_the_grey_cliffs_private_property', 'ut_grey_cliffs_the_2'),
  ('wa_prenuptial_obligation_boulder', 'wa_garfield_ledges', 'wa_garfield_ledges_2'),
  ('ut_unsorted_routes', 'ut_entrance_corridor_2', 'ut_entrance_corridor'),
  ('ny_cove_boulders', 'ny_f_lake_george_region', 'ny_cove_boulders_rogers_rock_campground'),
  ('qc_la_bleue', 'qc_val_david_bouldering', 'qc_la_bleue_2'),
  ('qc_mont_king', 'qc_val_david_bouldering', 'qc_mont_king_3'),
  ('mt_across_the_river', 'mt_greek_creek_and_surroundings_2', 'mt_greek_creek_and_surroundings'),
  ('mt_across_the_street', 'mt_greek_creek_and_surroundings_2', 'mt_greek_creek_and_surroundings'),
  ('ut_mind_goblin_tower', 'ut_little_valley_4', 'ut_little_valley_2'),
  ('ut_alcove_left', 'ut_little_valley', 'ut_little_valley_2'),
  ('ut_alcove_right', 'ut_little_valley', 'ut_little_valley_2'),
  ('ut_bride_the', 'ut_little_valley', 'ut_little_valley_2'),
  ('ut_bull_canyon', 'ut_little_valley', 'ut_little_valley_2'),
  ('ut_dry_fork_of_bull_canyon', 'ut_little_valley', 'ut_little_valley_2'),
  ('ut_frankenstein', 'ut_little_valley', 'ut_little_valley_2'),
  ('ut_gemini_bridges_road', 'ut_little_valley', 'ut_little_valley_2'),
  ('ut_gooney_bird_the', 'ut_little_valley', 'ut_little_valley_2'),
  ('ut_groom_the', 'ut_little_valley', 'ut_little_valley_2'),
  ('ut_little_valley_routes', 'ut_little_valley', 'ut_little_valley_2'),
  ('ut_mollymawk_tower', 'ut_little_valley', 'ut_little_valley_2'),
  ('ut_pinky_tower', 'ut_little_valley', 'ut_little_valley_2'),
  ('ut_shabazz_palace', 'ut_little_valley', 'ut_little_valley_2'),
  ('ut_whisky_caps_the', 'ut_little_valley', 'ut_little_valley_2'),
  ('wa_d_dog_house', 'wa_sunshine_s_lower_cliffs_2', 'wa_sunshine_s_lower_cliffs'),
  ('wa_broken_obelisk_2', 'wa_university_of_washington_campus_and_surrounding_areas_2', 'wa_university_of_washington_campus_and_surrounding_areas'),
  ('wv_bendable_boulder', 'wv_greenbrier_triangle_boulders_the', 'wv_greenbrier_boulders'),
  ('wv_block_party_area', 'wv_greenbrier_triangle_boulders_the', 'wv_greenbrier_boulders'),
  ('wv_caterpillar_boulder', 'wv_greenbrier_triangle_boulders_the', 'wv_greenbrier_boulders'),
  ('wv_dihedral_boulder', 'wv_greenbrier_triangle_boulders_the', 'wv_greenbrier_boulders'),
  ('wv_pup_trailer', 'wv_greenbrier_triangle_boulders_the', 'wv_greenbrier_boulders'),
  ('wv_sassafras_boulder_the', 'wv_greenbrier_triangle_boulders_the', 'wv_greenbrier_boulders'),
  ('wv_second_life_boulder', 'wv_greenbrier_triangle_boulders_the', 'wv_greenbrier_boulders'),
  ('wv_tractor_trailer_boulder', 'wv_greenbrier_triangle_boulders_the', 'wv_greenbrier_boulders'),
  ('wi_big_sand_cave', 'wi_sand_cave_trail_ice_2', 'wi_sand_cave_trail_ice'),
  ('wi_sand_cave_bridge', 'wi_sand_cave_trail_ice_2', 'wi_sand_cave_trail_ice'),
  ('wy_devries_crack', 'wy_maze_area_the', 'wy_the_maze_area'),
  ('co_homestead_the', 'co_glenwood_canyon', 'co_the_homestead_a_k_a_cascade_creek'),
  ('mt_bighorn_buttress', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_canadian_roadcut', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_carwash_the', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_dihedral_wall', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_enchanted_neighborhood', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_firecrack_wall', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_hold_up_bluffs_north', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_hold_up_bluffs_south', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_lizard_slabs', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_loners_wall', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_mario_land_boulders', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_mikey_s_mussel_beach', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_north_of_northwest_wall', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_playland', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_room_with_a_view', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_route_37_the_road_cuts', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_science_lab', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_south_stone_bikini_area', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('mt_sutton_creek', 'mt_stone_hill', 'mt_stone_hill_2'),
  ('ut_altitude_wall', 'ut_indian_creek_2', 'ut_indian_creek'),
  ('ut_blue_grama_cliff', 'ut_indian_creek_2', 'ut_indian_creek'),
  ('ut_circus_wall_2', 'ut_indian_creek_2', 'ut_indian_creek'),
  ('ut_cultural_respect_wall_2', 'ut_indian_creek_2', 'ut_indian_creek'),
  ('ut_election_wall_2', 'ut_indian_creek_2', 'ut_indian_creek'),
  ('ut_far_side_2', 'ut_indian_creek_2', 'ut_indian_creek'),
  ('ut_fist_fight', 'ut_indian_creek_2', 'ut_indian_creek'),
  ('ut_hamburger_rock', 'ut_indian_creek_2', 'ut_indian_creek'),
  ('ut_lockhart_basin_3', 'ut_indian_creek_2', 'ut_indian_creek'),
  ('ut_new_wave', 'ut_indian_creek_2', 'ut_indian_creek'),
  ('ut_prickly_pear', 'ut_indian_creek_2', 'ut_indian_creek'),
  ('ut_south_six_shooter_peak', 'ut_indian_creek_2', 'ut_indian_creek'),
  ('ut_the_prow_2', 'ut_indian_creek_2', 'ut_indian_creek'),
  ('ut_wall_mart', 'ut_indian_creek_2', 'ut_indian_creek'),
  ('ut_dabneyland', 'ut_island_in_the_sky_3', 'ut_island_in_the_sky'),
  ('ut_lyn_s_tower', 'ut_island_in_the_sky_3', 'ut_island_in_the_sky'),
  ('ut_soda_springs_basin', 'ut_island_in_the_sky_3', 'ut_island_in_the_sky'),
  ('ab_stanley_headwall_rock', 'ab_radium_highway_93_south', 'ab_stanley_headwall'),
  ('ca_down_under', 'ca_mount_st_helena_2', 'ca_mount_st_helena'),
  ('ca_near_side', 'ca_mount_st_helena_2', 'ca_mount_st_helena'),
  ('ca_the_palisades', 'ca_mount_st_helena_2', 'ca_mount_st_helena'),
  ('ca_hearn_gulch', 'ca_salt_point_state_park_2', 'ca_salt_point_state_park'),
  ('ca_ocean_cove', 'ca_salt_point_state_park_2', 'ca_salt_point_state_park'),
  ('ca_south_sentinel_precipice', 'ca_salt_point_state_park_2', 'ca_salt_point_state_park'),
  ('ca_the_obelisk', 'ca_salt_point_state_park_2', 'ca_salt_point_state_park'),
  ('ca_carmet_beach', 'ca_sonoma_coast_state_park_2', 'ca_sonoma_coast_state_park'),
  ('ca_cwm_du_aka_black_couloir', 'ca_sonoma_coast_state_park_2', 'ca_sonoma_coast_state_park'),
  ('ca_dry_creek_sea_crag', 'ca_sonoma_coast_state_park_2', 'ca_sonoma_coast_state_park'),
  ('ca_jenner_beach', 'ca_sonoma_coast_state_park_2', 'ca_sonoma_coast_state_park'),
  ('mt_blodgett_ice_and_mixed', 'mt_blodgett_canyon_2', 'mt_blodgett_canyon'),
  ('mt_kootenai_buttress', 'mt_blodgett_canyon_2', 'mt_blodgett_canyon'),
  ('mt_apikuni_falls_trail', 'mt_glacier_national_park_2', 'mt_glacier_national_park'),
  ('mt_comeau_pass_area', 'mt_glacier_national_park_2', 'mt_glacier_national_park'),
  ('mt_palm_springs_buttress', 'mt_glacier_national_park_2', 'mt_glacier_national_park'),
  ('mt_redrock_falls', 'mt_glacier_national_park_2', 'mt_glacier_national_park'),
  ('mt_reynolds_mountain', 'mt_glacier_national_park_2', 'mt_glacier_national_park'),
  ('mt_2_pumpelly_pillar', 'mt_two_medicine_lake_area', 'mt_two_medicine_lake'),
  ('mt_endless_summer_wall', 'mt_point_of_rocks', 'mt_point_of_rocks_2'),
  ('mt_mouse_house', 'mt_point_of_rocks', 'mt_point_of_rocks_2'),
  ('mt_october_wall', 'mt_point_of_rocks', 'mt_point_of_rocks_2'),
  ('mt_quarry_the', 'mt_point_of_rocks', 'mt_point_of_rocks_2'),
  ('mt_rat_castle', 'mt_point_of_rocks', 'mt_point_of_rocks_2'),
  ('mt_south_point_of_rocks', 'mt_point_of_rocks', 'mt_point_of_rocks_2'),
  ('mt_stillwater_canyon_mt_marston_rd', 'mt_point_of_rocks', 'mt_point_of_rocks_2'),
  ('mt_sunset_boulders', 'mt_point_of_rocks', 'mt_point_of_rocks_2'),
  ('mt_hidden_lake', 'mt_big_belt_mountains_2', 'mt_big_belt_mountains'),
  ('mt_meagher_bluffs', 'mt_big_belt_mountains_2', 'mt_big_belt_mountains'),
  ('mt_north_fork', 'mt_big_sky_area_2', 'mt_big_sky_area'),
  ('mt_arrowhead_bowl_no_name_bowl', 'mt_bridger_range_2', 'mt_bridger_range'),
  ('mt_pomp_buttress', 'mt_bridger_range_2', 'mt_bridger_range'),
  ('mt_ross_pass', 'mt_bridger_range_2', 'mt_bridger_range'),
  ('mt_sacajawea_peak', 'mt_bridger_range_2', 'mt_bridger_range'),
  ('mt_sypes_canyon', 'mt_bridger_range_2', 'mt_bridger_range'),
  ('mt_the_great_wave', 'mt_bridger_range_2', 'mt_bridger_range'),
  ('mt_retirement_crags', 'mt_gallatin_canyon_2', 'mt_gallatin_canyon'),
  ('mt_3_mile', 'mt_homestake_pass_2', 'mt_homestake_pass'),
  ('mt_little_fire_canyon', 'mt_homestake_pass_2', 'mt_homestake_pass'),
  ('mt_lucky_strike_boulders', 'mt_homestake_pass_2', 'mt_homestake_pass'),
  ('mt_mackey_rock', 'mt_homestake_pass_2', 'mt_homestake_pass'),
  ('mt_balcony', 'mt_hyalite_canyon_2', 'mt_hyalite_canyon'),
  ('mt_devils_dong', 'mt_hyalite_canyon_2', 'mt_hyalite_canyon'),
  ('mt_haunda_accord', 'mt_hyalite_canyon_2', 'mt_hyalite_canyon'),
  ('mt_hyalite_peak_boulders', 'mt_hyalite_canyon_2', 'mt_hyalite_canyon'),
  ('mt_shrooms', 'mt_hyalite_canyon_2', 'mt_hyalite_canyon'),
  ('mt_solus_boulder', 'mt_hyalite_canyon_2', 'mt_hyalite_canyon'),
  ('mt_the_slabith', 'mt_hyalite_canyon_2', 'mt_hyalite_canyon'),
  ('mt_california_corner', 'mt_madison_river_area_2', 'mt_madison_river_area'),
  ('mt_fantasy_towers', 'mt_madison_river_area_2', 'mt_madison_river_area'),
  ('mt_hollowtop_mountain_bouldering', 'mt_tobacco_root_mountains_2', 'mt_tobacco_root_mountains'),
  ('mt_leggat_boulders', 'mt_tobacco_root_mountains_2', 'mt_tobacco_root_mountains'),
  ('mt_lost_cabin_lake_buttress', 'mt_tobacco_root_mountains_2', 'mt_tobacco_root_mountains'),
  ('nv_area_51', 'nv_la_madre_north_2', 'nv_la_madre_north'),
  ('nv_btown', 'nv_la_madre_north_2', 'nv_la_madre_north'),
  ('nv_test_site', 'nv_la_madre_north_2', 'nv_la_madre_north'),
  ('nm_cc_couloir_ridge', 'nm_chimney_canyon_2', 'nm_chimney_canyon'),
  ('nm_sentinel_east', 'nm_chimney_canyon_2', 'nm_chimney_canyon'),
  ('nm_waterfall_canyon_2', 'nm_juan_tabo_canyon_2', 'nm_juan_tabo_canyon'),
  ('nm_oofda_boulder', 'nm_three_gun_tres_pistolas_2', 'nm_three_gun_tres_pistolas'),
  ('nm_the_doorman', 'nm_three_gun_tres_pistolas_2', 'nm_three_gun_tres_pistolas'),
  ('nm_warm_up_boulder_2', 'nm_three_gun_tres_pistolas_2', 'nm_three_gun_tres_pistolas'),
  ('nc_abandonment_boulder', 'nc_moore_s_wall_bouldering_2', 'nc_moore_s_wall_bouldering'),
  ('oh_morgan_s_knob_boulders_fka_diving_board_boulders', 'oh_salt_fork_state_park', 'oh_morgan_s_knob_boulders'),
  ('ut_behind_the_rocks_boulders', 'ut_191_south_2', 'ut_191_south'),
  ('ut_needles_overlook', 'ut_191_south_2', 'ut_191_south'),
  ('ut_the_pocket_walls', 'ut_191_south_2', 'ut_191_south'),
  ('ut_not_notch_canyon', 'ut_blanding_2', 'ut_blanding'),
  ('ut_notch_canyon', 'ut_blanding_2', 'ut_blanding'),
  ('ut_prospector_canyon', 'ut_blanding_2', 'ut_blanding'),
  ('ut_tin_wall', 'ut_blanding_2', 'ut_blanding'),
  ('ut_leo_s_tower', 'ut_comb_ridge_2', 'ut_comb_ridge'),
  ('ut_behind_cam_s_back', 'ut_kane_springs_canyon_2', 'ut_kane_springs_canyon'),
  ('ut_cam_s_little_bro', 'ut_kane_springs_canyon_2', 'ut_kane_springs_canyon'),
  ('ut_oh_chute', 'ut_kane_springs_canyon_2', 'ut_kane_springs_canyon'),
  ('ut_dakota_boulders', 'ut_la_sal_mountains_2', 'ut_la_sal_mountains'),
  ('ut_gold_knob_slabs', 'ut_la_sal_mountains_2', 'ut_la_sal_mountains'),
  ('ut_pinhook_boulders', 'ut_la_sal_mountains_2', 'ut_la_sal_mountains'),
  ('ut_bighorn_tower', 'ut_labyrinth_canyon_2', 'ut_labyrinth_canyon'),
  ('ut_hey_joe_canyon', 'ut_labyrinth_canyon_2', 'ut_labyrinth_canyon'),
  ('ut_mr_shmikle_s_magic_pickle', 'ut_labyrinth_canyon_2', 'ut_labyrinth_canyon'),
  ('ut_oak_bottom', 'ut_labyrinth_canyon_2', 'ut_labyrinth_canyon'),
  ('ut_moonshine_tower', 'ut_lockhart_basin_2', 'ut_lockhart_basin'),
  ('ut_soulshine_tower', 'ut_lockhart_basin_2', 'ut_lockhart_basin'),
  ('ut_tattletail_tower', 'ut_lockhart_basin_2', 'ut_lockhart_basin'),
  ('ut_the_hatchling', 'ut_lockhart_basin_2', 'ut_lockhart_basin'),
  ('ut_voodoo_lady', 'ut_lockhart_basin_2', 'ut_lockhart_basin'),
  ('ut_bear_claw_boulder', 'ut_river_road_2', 'ut_river_road'),
  ('ut_grandstaff_canyon', 'ut_river_road_2', 'ut_river_road'),
  ('ut_sand_flats_boulders', 'ut_sand_flats_2', 'ut_sand_flats'),
  ('ut_313_huecos', 'ut_state_highway_313_2', 'ut_state_highway_313'),
  ('ut_muley_point', 'ut_valley_of_the_gods_2', 'ut_valley_of_the_gods'),
  ('wa_simple_peace_wall', 'wa_echo_basin_2', 'wa_echo_basin'),
  ('wa_the_chosshole', 'wa_echo_basin_2', 'wa_echo_basin'),
  ('wa_ice_climbing_in_winter_2', 'wa_frenchman_coulee_vantage', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_hidden_slot', 'wa_burge_north_hidden_canyon_tonasket', 'wa_burge_north_hidden_canyon'),
  ('wa_one_hand_clapping_wall', 'wa_burge_north_hidden_canyon_tonasket', 'wa_burge_north_hidden_canyon'),
  ('wa_shattered_wall', 'wa_burge_north_hidden_canyon_tonasket', 'wa_burge_north_hidden_canyon'),
  ('wa_sjw_wall', 'wa_burge_north_hidden_canyon_tonasket', 'wa_burge_north_hidden_canyon'),
  ('wa_wu_wei_wall', 'wa_burge_north_hidden_canyon_tonasket', 'wa_burge_north_hidden_canyon'),
  ('wa_ad_agenda_dysphoria_wall', 'wa_sjw_social_justice_warrior_wall', 'wa_sjw_wall'),
  ('wi_sand_cave_trail_ice', 'wi_wyalusing_state_park_ice', 'wi_wyalusing_state_park_ice_2'),
  ('ab_grotto_canyon_ice_climbing_routes', 'ab_bow_valley', 'ab_grotto_canyon'),
  ('id_abandon_mountain_basin', 'id_the_selkirk_crest_american', 'id_selkirk_crest_the'),
  ('id_beehive_dome', 'id_the_selkirk_crest_american', 'id_selkirk_crest_the'),
  ('id_beehive_lake_area', 'id_the_selkirk_crest_american', 'id_selkirk_crest_the'),
  ('id_lion_creek_drainage', 'id_the_selkirk_crest_american', 'id_selkirk_crest_the'),
  ('id_peak_7171', 'id_the_selkirk_crest_american', 'id_selkirk_crest_the'),
  ('id_siwashing_wall', 'id_the_selkirk_crest_american', 'id_selkirk_crest_the'),
  ('ky_hell_s_kitchen', 'ky_mfrp_miller_fork_recreational_preserve', 'ky_miller_fork_recreational_preserve_mfrp'),
  ('ky_monster_wall', 'ky_mfrp_miller_fork_recreational_preserve', 'ky_miller_fork_recreational_preserve_mfrp'),
  ('ky_neverland', 'ky_mfrp_miller_fork_recreational_preserve', 'ky_miller_fork_recreational_preserve_mfrp'),
  ('ky_outer_space', 'ky_mfrp_miller_fork_recreational_preserve', 'ky_miller_fork_recreational_preserve_mfrp'),
  ('ky_rando_crag', 'ky_mfrp_miller_fork_recreational_preserve', 'ky_miller_fork_recreational_preserve_mfrp'),
  ('ky_coal_bank_hollow', 'ky_pmrp_pendergrass_murray_recreational_preserve', 'ky_pendergrass_murray_recreational_preserve_pmrp'),
  ('ky_flat_hollow', 'ky_pmrp_pendergrass_murray_recreational_preserve', 'ky_pendergrass_murray_recreational_preserve_pmrp'),
  ('ky_hellcat_crag', 'ky_southern_region_crags_misc', 'ky_southern_region_crags_miscellaneous'),
  ('me_bradbury_mountain_state_park', 'me_c_greater_portland', 'me_bradbury_mountain_state_park_closed_to_climbing_oct_17'),
  ('nh_hillside_aka_summit_boulder_area', 'nh_pawtuckaway', 'nh_hillside'),
  ('nv_echo_falls_2', 'nv_echo_falls_area_2', 'nv_echo_falls_area_3'),
  ('nv_palantine_wall_first_tier', 'nv_echo_falls_area_2', 'nv_echo_falls_area_3'),
  ('nv_palantine_wall_second_tier', 'nv_echo_falls_area_2', 'nv_echo_falls_area_3'),
  ('ca_sport_boulder_e_face', 'ca_b_thurman_flat_sport_boulder', 'ca_sport_boulder'),
  ('ca_sport_boulder_nw_face', 'ca_b_thurman_flat_sport_boulder', 'ca_sport_boulder'),
  ('nv_foot_boulder', 'nv_big_ass_rocks', 'nv_big_ass_rocks_knob_hill_bouldering'),
  ('nv_frustration_boulder', 'nv_big_ass_rocks', 'nv_big_ass_rocks_knob_hill_bouldering'),
  ('nv_the_toad', 'nv_big_ass_rocks', 'nv_big_ass_rocks_knob_hill_bouldering'),
  ('ca_a_rock', 'ca_indian_rock_bouldering_area', 'ca_sanborn_county_park_indian_rock_side'),
  ('ca_nature_boulders_area', 'ca_indian_rock_bouldering_area', 'ca_sanborn_county_park_indian_rock_side'),
  ('ca_roadside_baloney_boulder', 'ca_indian_rock_bouldering_area', 'ca_sanborn_county_park_indian_rock_side'),
  ('ca_atomic_mushroom_boulder', 'ca_castle_and_sanborn_area_bouldering', 'ca_castle_rock_area_bouldering'),
  ('ca_muffins_and_waterfall_boulders', 'ca_castle_and_sanborn_area_bouldering', 'ca_castle_rock_area_bouldering'),
  ('az_comanche_ridge_nw_ridge_of_comanche_point', 'az_grand_canyon', 'az_grand_canyon_national_park'),
  ('az_south_kaibab_cragging', 'az_grand_canyon', 'az_grand_canyon_national_park'),
  ('az_the_holy_buttress', 'az_grand_canyon', 'az_grand_canyon_national_park'),
  ('wa_jefferson_lake_2', 'wa_olympic_peninsula_bouldering', 'wa_olympic_bouldering'),
  ('wa_rialto_beach', 'wa_olympic_peninsula_bouldering', 'wa_olympic_bouldering'),
  ('or_b_central_widgi', 'or_widgi_boulders', 'or_widgi_creek'),
  ('or_c_widgi_right', 'or_widgi_boulders', 'or_widgi_creek'),
  ('co_area_c', 'co_mt_blue_sky_formerly_mount_evans_bouldering', 'co_mt_evans_bouldering'),
  ('co_area_d', 'co_mt_blue_sky_formerly_mount_evans_bouldering', 'co_mt_evans_bouldering'),
  ('co_echo_boulders', 'co_mt_blue_sky_formerly_mount_evans_bouldering', 'co_mt_evans_bouldering'),
  ('wa_agathla_tower', 'wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_ball_s_wall', 'wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_boot_camp', 'wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_cryptic_crag', 'wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_dungeon_the', 'wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_green_wall', 'wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_middle_east_s_lower_cliffs', 'wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_middle_east_wall', 'wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_north_rim', 'wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_postal_wall', 'wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_sanctuary_the', 'wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_shady_lady_wall', 'wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_sunset_park', 'wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_the_corona_crest', 'wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_the_gallery', 'wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_zig_zag_wall', 'wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage'),
  ('wa_duvall', 'wa_greater_seattle_including_the_eastside', 'wa_seattle_and_seattle_eastside'),
  ('wa_edmonds_and_richmond_beach', 'wa_greater_seattle_including_the_eastside', 'wa_seattle_and_seattle_eastside'),
  ('wa_issaquah', 'wa_greater_seattle_including_the_eastside', 'wa_seattle_and_seattle_eastside'),
  ('wa_kenmore_bothell_woodinville', 'wa_greater_seattle_including_the_eastside', 'wa_seattle_and_seattle_eastside'),
  ('wa_lynnwood_and_mountlake_terrace', 'wa_greater_seattle_including_the_eastside', 'wa_seattle_and_seattle_eastside'),
  ('wa_seattle', 'wa_greater_seattle_including_the_eastside', 'wa_seattle_and_seattle_eastside'),
  ('wa_wayne_s_world', 'wa_wayne_s_world_dry_tooling', 'wa_public_land_for_sale_wayne_s_world'),
  ('wa_absent_minded_professor', 'wa_banks_lake_northrup_canyon', 'wa_banks_lake'),
  ('wa_banks_lake_east_shore_south_ice_climbing', 'wa_banks_lake_northrup_canyon', 'wa_banks_lake'),
  ('wa_bastion_the', 'wa_banks_lake_northrup_canyon', 'wa_banks_lake'),
  ('wa_gibralter_rocks', 'wa_banks_lake_northrup_canyon', 'wa_banks_lake'),
  ('wa_golf_course_crags', 'wa_banks_lake_northrup_canyon', 'wa_banks_lake'),
  ('wa_jones_bay', 'wa_banks_lake_northrup_canyon', 'wa_banks_lake'),
  ('wa_ladds_creek_ice_climbing_area', 'wa_banks_lake_northrup_canyon', 'wa_banks_lake'),
  ('wa_orange_wall', 'wa_banks_lake_northrup_canyon', 'wa_banks_lake'),
  ('wa_picnic_table_rock', 'wa_banks_lake_northrup_canyon', 'wa_banks_lake'),
  ('wa_post_modern_wall', 'wa_banks_lake_northrup_canyon', 'wa_banks_lake'),
  ('wa_prime_cut_area', 'wa_banks_lake_northrup_canyon', 'wa_banks_lake'),
  ('wa_roadside_rock', 'wa_banks_lake_northrup_canyon', 'wa_banks_lake'),
  ('wa_steamboat_rock_state_park', 'wa_banks_lake_northrup_canyon', 'wa_banks_lake'),
  ('ca_western_addition_area', 'ca_castle_rock_and_sanborn_area', 'ca_castle_rock_area'),
  ('wa_banana_split_dome_west_upper_ledge', 'wa_tumtum', 'wa_tum_tum'),
  ('wa_buena_vista', 'wa_tumtum', 'wa_tum_tum'),
  ('wa_curve_wall', 'wa_tumtum', 'wa_tum_tum'),
  ('wa_infinity_wall', 'wa_tumtum', 'wa_tum_tum'),
  ('wa_margo_wall', 'wa_tumtum', 'wa_tum_tum'),
  ('wa_shangri_la_wall', 'wa_tumtum', 'wa_tum_tum'),
  ('wa_wave_wall', 'wa_tumtum', 'wa_tum_tum'),
  ('nm_ca_on_del_agua', 'nm_sandia_mountains_west_side', 'nm_sandia_mountains'),
  ('nm_domingo_baca_canyon_upper', 'nm_sandia_mountains_west_side', 'nm_sandia_mountains'),
  ('nm_chimney_falls', 'nm_la_cueva_canyon_lower_2', 'nm_la_cueva_canyon_lower'),
  ('nm_nova_canyon', 'nm_sandia_mountains_west_side', 'nm_sandia_mountains'),
  ('nm_south_sandia_peak', 'nm_sandia_mountains_west_side', 'nm_sandia_mountains'),
  ('ca_barefoot_boulders', 'ca_wine_country_northeast_bay', 'ca_wine_country'),
  ('ca_hunter_s_hill_boulder_1', 'ca_wine_country_northeast_bay', 'ca_wine_country'),
  ('ca_mt_konocti', 'ca_wine_country_northeast_bay', 'ca_wine_country'),
  ('ca_the_flat_rocks', 'ca_wine_country_northeast_bay', 'ca_wine_country'),
  ('nv_cheyenne_mountain', 'nv_la_madre_area', 'nv_la_madre_range'),
  ('nv_crustacean_crag', 'nv_la_madre_area', 'nv_la_madre_range'),
  ('nv_la_madre_bouldering', 'nv_la_madre_area', 'nv_la_madre_range'),
  ('nh_big_boulder_the', 'nh_dumplington_hill_the_dump', 'nh_06_the_big_boulder_area'),
  ('nh_bruisemasters_block', 'nh_dumplington_hill_the_dump', 'nh_dumplingtown_hill_the_dump'),
  ('nh_dump_face_the', 'nh_dumplington_hill_the_dump', 'nh_dumplingtown_hill_the_dump'),
  ('nh_krazy_krags', 'nh_dumplington_hill_the_dump', 'nh_dumplingtown_hill_the_dump'),
  ('nh_left_end_the_2', 'nh_dumplington_hill_the_dump', 'nh_dumplingtown_hill_the_dump'),
  ('nh_main_cliff_the_4', 'nh_dumplington_hill_the_dump', 'nh_dumplingtown_hill_the_dump'),
  ('nh_main_cliff_the_roofs', 'nh_dumplington_hill_the_dump', 'nh_dumplingtown_hill_the_dump'),
  ('nh_quarry_the', 'nh_dumplington_hill_the_dump', 'nh_dumplingtown_hill_the_dump'),
  ('nh_station', 'nh_dumplington_hill_the_dump', 'nh_dumplingtown_hill_the_dump');

create temp table m_drop_area(id text primary key, into_area text not null, ord int not null) on commit drop;
insert into m_drop_area values
  ('or_vader_s_helmet_boulder', 'or_vader_s_helmet_boulder_2', 0),
  ('mt_tip_toe_area', 'mt_09_tip_toe_area_tanman_buttress', 1),
  ('mt_lakeside_walls', 'mt_lakeside_walls_2', 2),
  ('or_brain_boulder_the', 'or_the_brain_boulder', 3),
  ('or_cranky_locals_wall', 'or_cranky_locals_wall_2', 4),
  ('or_widgi_right', 'or_c_widgi_right', 5),
  ('va_afterthought_boulder_2', 'va_afterthought_boulder', 6),
  ('va_dumbo_boulder_2', 'va_dumbo_boulder', 7),
  ('va_shade_boulder_3', 'va_shade_boulder', 8),
  ('wa_the_chopping_block_pinnacle_peak', 'wa_the_chopping_block', 9),
  ('az_turtle_cove', 'az_turtle_cove_2', 10),
  ('ca_whitney_cave_2', 'ca_whitney_cave', 11),
  ('nv_avalanche_falls', 'nv_avalanche_falls_2', 12),
  ('nv_echo_falls', 'nv_echo_falls_2', 13),
  ('nv_lost_falls', 'nv_lost_falls_2', 14),
  ('nv_mary_jane_falls', 'nv_mary_jane_falls_2', 15),
  ('nv_vegas_hose_monster', 'nv_vegas_hose_monster_2', 16),
  ('ut_upper_grey_cliffs', 'ut_upper_grey_cliffs_2', 17),
  ('wa_dark_side', 'wa_dark_side_2', 18),
  ('wa_excellent_adventure_wall', 'wa_excellent_adventure_wall_2', 19),
  ('wa_garden_wall_2', 'wa_garden_wall', 20),
  ('ca_roadside_boulder_7', 'ca_roadside_baloney_boulder', 21),
  ('ut_everett_ruess_memorial_boulder', 'ut_everett_ruess_memorial_boulder_closed', 22),
  ('az_crumblin_wall_2', 'az_crumblin_wall', 23),
  ('az_flailing_wall_2', 'az_flailing_wall', 24),
  ('az_medivac_wall_3', 'az_medivac_wall', 25),
  ('az_medivac_wall_2', 'az_medivac_wall', 26),
  ('ut_zeus_2', 'ut_zeus', 27),
  ('va_center_darkside_2', 'va_center_darkside', 28),
  ('wa_cobblestone_wall', 'wa_cobblestone_wall_2', 29),
  ('ca_the_galapagos', 'ca_galapagos_the', 30),
  ('ca_a_elephant_head', 'ca_elephant_head_hyperion_slab_the', 31),
  ('ca_matts_boulders', 'ca_matts_boulders_aka_the_nest', 32),
  ('ca_new_sub_area_2', 'ca_malarkey_rock', 33),
  ('ca_malarkey_rock_2', 'ca_malarkey_rock', 34),
  ('co_split_rock_2', 'co_split_rock', 35),
  ('nv_above_big_falls', 'nv_above_big_falls_2', 36),
  ('nv_echo_falls_area', 'nv_echo_falls_area_3', 37),
  ('nv_little_falls', 'nv_little_falls_2', 38),
  ('nv_mary_jane_falls_area', 'nv_mary_jane_falls_area_2', 39),
  ('nv_toad_the', 'nv_the_toad', 40),
  ('ut_box_canyon_ice_climbs_the', 'ut_the_box_canyon_ice_climbs', 41),
  ('wa_broken_obelisk', 'wa_broken_obelisk_2', 42),
  ('wa_1_upper_cheeks', 'wa_upper_cheeks', 43),
  ('wa_hamilton_boulders_2', 'wa_hamilton_boulders', 44),
  ('ca_mickey_s_wall_north_side_3', 'ca_mickey_s_wall_north_side', 45),
  ('wa_ca_dihedral_wall', 'wa_dihedral_wall', 46),
  ('ut_the_grey_cliffs_private_property', 'ut_grey_cliffs_the_2', 47),
  ('wa_garfield_ledges', 'wa_garfield_ledges_2', 48),
  ('az_bright_angel_walls_2', 'az_bright_angel_walls', 49),
  ('ca_pangea_wall', 'ca_pangea_wall_or_pangaea_wall', 50),
  ('ut_cultural_respect_wall', 'ut_cultural_respect_wall_2', 51),
  ('ut_election_wall', 'ut_election_wall_2', 52),
  ('ut_clementine_corner_crag', 'ut_entrance_corridor', 53),
  ('ut_entrance_corridor_2', 'ut_entrance_corridor', 54),
  ('ut_taylor_canyon_2', 'ut_taylor_canyon', 55),
  ('ut_king_s_hand_2', 'ut_king_s_hand', 56),
  ('ut_wall_street_north_2', 'ut_wall_street_north', 57),
  ('va_darkside_2', 'va_darkside', 58),
  ('wa_anchor_rock', 'wa_anchor_rock_2', 59),
  ('wa_cranium_boulder', 'wa_cranium_boulder_2', 60),
  ('wa_olympic_boulder_the', 'wa_the_olympic_boulder', 61),
  ('wa_roadside_boulder', 'wa_roadside_boulder_3', 62),
  ('ak_purinton_creek', 'ak_purinton_creek_2', 63),
  ('ca_the_lion_s_den', 'ca_lion_s_den_the', 64),
  ('ca_lion_s_den_2', 'ca_lion_s_den_the', 65),
  ('ma_airation_alcove_trash_pit_2', 'ma_airation_alcove_trash_pit', 66),
  ('ma_down_under_bouldering_slab', 'ma_down_under', 67),
  ('ma_down_under_2', 'ma_down_under', 68),
  ('nm_waterfall_canyon', 'nm_waterfall_canyon_2', 69),
  ('ny_honey_pot_the_2', 'ny_honey_pot_the', 70),
  ('or_cline_falls_bouldering_2', 'or_cline_falls_bouldering', 71),
  ('ut_middle_fork_ice_climbs_the', 'ut_the_middle_fork_ice_climbs', 72),
  ('ut_little_valley_3', 'ut_little_valley_4', 73),
  ('ut_tuhinga_tower', 'ut_tuhinga_tower_2', 74),
  ('va_upper_falls_area_ice', 'va_upper_falls_area_ice_2', 75),
  ('wa_fuggs_falls', 'wa_fuggs_falls_2', 76),
  ('wa_powerhouse_area_2', 'wa_powerhouse_area', 77),
  ('wa_cougar_mountain', 'wa_cougar_mountain_2', 78),
  ('wi_county_highway_x_gullies', 'wi_county_highway_x_gullies_2', 79),
  ('wi_long_valley', 'wi_long_valley_2', 80),
  ('wi_mississippi_ridge_south_main_flow_ice', 'wi_mississippi_ridge_south_main_flow_ice_2', 81),
  ('wi_quarry_the', 'wi_the_quarry', 82),
  ('wi_spook_hill_gully', 'wi_spook_hill_gully_2', 83),
  ('ak_lower_tee_harbor_cliff', 'ak_lower_tee_harbor_cliff_aka_sci_fi_wall', 84),
  ('az_behind_sweet_rock_peanut_rock', 'az_behind_sweet_rock', 85),
  ('ca_main_rock_aka_scary_boulder', 'ca_main_rock_3', 86),
  ('ca_jcvd_jean_claud_van_damme_boulder', 'ca_jcvd_jean_claud_van_dam_boulder', 87),
  ('co_x_crack_boulder_the_kid_boulder', 'co_x_crack_boulder', 88),
  ('ut_left_rambo_aka_gasp_wall', 'ut_left_rambo', 89),
  ('wa_little_matterhorn_rock_kid_rock', 'wa_little_matterhorn_rock', 90),
  ('wa_mount_olympus_2', 'wa_mount_olympus', 91),
  ('mt_greek_creek_and_surroundings_2', 'mt_greek_creek_and_surroundings', 92),
  ('nh_corridor_block', 'nh_left_end_the_2', 93),
  ('nh_left_end_proper', 'nh_left_end_the_2', 94),
  ('nh_01_the_left_end', 'nh_left_end_the_2', 95),
  ('ut_little_valley_4', 'ut_little_valley', 96),
  ('ut_little_valley', 'ut_little_valley_2', 97),
  ('wa_sunshine_s_lower_cliffs_2', 'wa_sunshine_s_lower_cliffs', 98),
  ('wa_university_of_washington_campus_and_surrounding_areas_2', 'wa_university_of_washington_campus_and_surrounding_areas', 99),
  ('wv_greenbrier_triangle_boulders_the', 'wv_greenbrier_boulders', 100),
  ('wi_sand_cave_trail_ice_2', 'wi_sand_cave_trail_ice', 101),
  ('wy_hueco_simulator_boulder', 'wy_hueco_simulator_boulder_2', 102),
  ('wy_maze_area_the', 'wy_the_maze_area', 103),
  ('ak_boulder_point_bloc', 'ak_boulder_point', 104),
  ('ak_boulder_point_2', 'ak_boulder_point', 105),
  ('az_bass_camp_2', 'az_bass_camp', 106),
  ('az_colorado_river_2', 'az_colorado_river', 107),
  ('az_vermillion_cliffs', 'az_vermillion_cliffs_2', 108),
  ('co_laying_in_wait_boulder_2', 'co_laying_in_wait_boulder', 109),
  ('mt_stone_hill', 'mt_stone_hill_2', 110),
  ('ut_devil_s_golf_ball_aka_the_bulbous_head', 'ut_devil_s_golf_ball', 111),
  ('ut_indian_creek_2', 'ut_indian_creek', 112),
  ('ut_island_in_the_sky_3', 'ut_island_in_the_sky', 113),
  ('ut_potash_road_2', 'ut_potash_road', 114),
  ('ut_topus_boulder_2', 'ut_topus_boulder', 115),
  ('ut_topus_mountain_2', 'ut_topus_mountain', 116),
  ('wa_3_glazers_boulder', 'wa_3_glazers_boulder_2', 117),
  ('wa_jefferson_lake', 'wa_jefferson_lake_2', 118),
  ('ak_portage', 'ak_portage_2', 119),
  ('ak_seward_highway', 'ak_seward_highway_2', 120),
  ('ak_snow_river', 'ak_snow_river_2', 121),
  ('ma_corps_wall_closed_to_climbing', 'ma_corps_wall', 122),
  ('mo_3_north_end_boulders', 'mo_k_north_end_boulders', 123),
  ('ut_bluff_2', 'ut_bluff', 124),
  ('wa_devils_punch_bowl_area', 'wa_devils_punch_bowl_area_2', 125),
  ('wa_ice_climbing_in_winter', 'wa_ice_climbing_in_winter_2', 126),
  ('wy_sphinx_the_2', 'wy_sphinx_the', 127),
  ('mn_south_buttress', 'mn_south_buttress_aka_higher_education_wall', 128),
  ('mn_south_face', 'mn_south_face_aka_adulting_area', 129),
  ('or_0_valhalla', 'or_valhalla', 130),
  ('wi_shiprock_a_k_a_sh_trock', 'wi_shiprock', 131),
  ('ca_mount_st_helena_2', 'ca_mount_st_helena', 132),
  ('ca_salt_point_state_park_2', 'ca_salt_point_state_park', 133),
  ('ca_sonoma_coast_state_park_2', 'ca_sonoma_coast_state_park', 134),
  ('mt_blodgett_canyon_2', 'mt_blodgett_canyon', 135),
  ('mt_st_mary_falls_trail_2', 'mt_st_mary_falls_trail', 136),
  ('mt_two_medicine_lake_area', 'mt_two_medicine_lake', 137),
  ('mt_glacier_national_park_2', 'mt_glacier_national_park', 138),
  ('mt_point_of_rocks', 'mt_point_of_rocks_2', 139),
  ('mt_big_belt_mountains_2', 'mt_big_belt_mountains', 140),
  ('mt_big_sky_area_2', 'mt_big_sky_area', 141),
  ('mt_bridger_range_2', 'mt_bridger_range', 142),
  ('mt_gallatin_canyon_2', 'mt_gallatin_canyon', 143),
  ('mt_homestake_pass_2', 'mt_homestake_pass', 144),
  ('mt_hyalite_canyon_2', 'mt_hyalite_canyon', 145),
  ('mt_madison_river_area_2', 'mt_madison_river_area', 146),
  ('mt_tobacco_root_mountains_2', 'mt_tobacco_root_mountains', 147),
  ('nv_la_madre_north_2', 'nv_la_madre_north', 148),
  ('nv_the_moon_aka_knob_hill', 'nv_moon_aka_knob_hill_the', 149),
  ('nm_chimney_canyon_2', 'nm_chimney_canyon', 150),
  ('nm_juan_tabo_canyon_2', 'nm_juan_tabo_canyon', 151),
  ('nm_three_gun_tres_pistolas_2', 'nm_three_gun_tres_pistolas', 152),
  ('nc_moore_s_wall_bouldering_2', 'nc_moore_s_wall_bouldering', 153),
  ('ut_191_south_2', 'ut_191_south', 154),
  ('ut_blanding_2', 'ut_blanding', 155),
  ('ut_comb_ridge_2', 'ut_comb_ridge', 156),
  ('ut_kane_springs_canyon_2', 'ut_kane_springs_canyon', 157),
  ('ut_la_sal_mountains_2', 'ut_la_sal_mountains', 158),
  ('ut_labyrinth_canyon_2', 'ut_labyrinth_canyon', 159),
  ('ut_lockhart_basin_2', 'ut_lockhart_basin', 160),
  ('ut_river_road_2', 'ut_river_road', 161),
  ('ut_sand_flats_2', 'ut_sand_flats', 162),
  ('ut_state_highway_313_2', 'ut_state_highway_313', 163),
  ('ut_valley_of_the_gods_2', 'ut_valley_of_the_gods', 164),
  ('wa_echo_basin_2', 'wa_echo_basin', 165),
  ('wa_frenchman_coulee_vantage', 'wa_frenchman_coulee', 166),
  ('wa_burge_north_hidden_canyon_tonasket', 'wa_burge_north_hidden_canyon', 167),
  ('wa_sjw_social_justice_warrior_wall', 'wa_sjw_wall', 168),
  ('wi_wyalusing_state_park_ice', 'wi_wyalusing_state_park_ice_2', 169),
  ('nh_band_m', 'nh_band_m_re_opened', 170),
  ('ny_n_country_rd_boulder', 'ny_n_country_rd_boulder_aka_billboard_rock', 171),
  ('ok_the_crag', 'ok_crag_the', 172),
  ('tn_mountain_the', 'tn_the_mountain', 173),
  ('id_the_selkirk_crest_american', 'id_selkirk_crest_the', 174),
  ('ky_mfrp_miller_fork_recreational_preserve', 'ky_miller_fork_recreational_preserve_mfrp', 175),
  ('ky_pmrp_pendergrass_murray_recreational_preserve', 'ky_pendergrass_murray_recreational_preserve_pmrp', 176),
  ('ky_southern_region_crags_misc', 'ky_southern_region_crags_miscellaneous', 177),
  ('nv_echo_falls_area_2', 'nv_echo_falls_area_3', 178),
  ('ca_b_thurman_flat_sport_boulder', 'ca_sport_boulder', 179),
  ('nv_big_ass_rocks', 'nv_big_ass_rocks_knob_hill_bouldering', 180),
  ('wa_sehome_arboretum_old', 'wa_sehome_arboretum_climbs', 181),
  ('ca_indian_rock_bouldering_area', 'ca_sanborn_county_park_indian_rock_side', 182),
  ('ca_bel_air_boulder', 'ca_castle_rock_area_bouldering', 183),
  ('ca_castle_and_sanborn_area_bouldering', 'ca_castle_rock_area_bouldering', 184),
  ('ut_bookend_butte', 'ut_cracklin_butte', 185),
  ('az_angels_gate_2', 'az_angels_gate', 186),
  ('az_grand_canyon', 'az_grand_canyon_national_park', 187),
  ('nv_mount_charleston_ice', 'nv_mount_charleston_winter', 188),
  ('wa_olympic_peninsula_bouldering', 'wa_olympic_bouldering', 189),
  ('or_widgi_boulders', 'or_widgi_creek', 190),
  ('co_gateway_boulder_3', 'co_gateway_boulder', 191),
  ('co_mt_blue_sky_formerly_mount_evans_bouldering', 'co_mt_evans_bouldering', 192),
  ('wi_wyalusing_ice', 'wi_wyalusing_state_park', 193),
  ('wa_frenchman_coulee', 'wa_frenchman_coulee_aka_vantage', 194),
  ('wa_greater_seattle_including_the_eastside', 'wa_seattle_and_seattle_eastside', 195),
  ('wa_wayne_s_world_dry_tooling', 'wa_public_land_for_sale_wayne_s_world', 196),
  ('wa_banks_lake_northrup_canyon', 'wa_banks_lake', 197),
  ('ca_castle_rock_and_sanborn_area', 'ca_castle_rock_area', 198),
  ('wa_tumtum', 'wa_tum_tum', 199),
  ('nm_la_cueva_canyon_lower_2', 'nm_la_cueva_canyon_lower', 200),
  ('nm_sandia_mountains_west_side', 'nm_sandia_mountains', 201),
  ('ca_wine_country_northeast_bay', 'ca_wine_country', 202),
  ('nv_la_madre_area', 'nv_la_madre_range', 203),
  ('nh_dumplington_hill_the_dump', 'nh_dumplingtown_hill_the_dump', 204);

create temp table m_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
insert into m_rename values
  ('ca_wild_wild_western_pinnacles', 'Wild, Wild Western Pinnacles', 'Wild, Wild Western Pinnacles Bouldering'),
  ('ny_cove_boulders', 'Cove Boulders', 'Cove Boulders Routes'),
  ('qc_la_bleue', 'La Bleue', 'La Bleue Bouldering'),
  ('qc_mont_king', 'Mont-King', 'Mont-King Bouldering'),
  ('co_homestead_the', 'Homestead, The', 'The Homestead Routes'),
  ('oh_morgan_s_knob_boulders_fka_diving_board_boulders', 'Morgan''s Knob Boulders (FKA Diving Board Boulders)', 'Morgan''s Knob Boulders Routes'),
  ('me_bradbury_mountain_state_park', 'Bradbury Mountain State Park', 'Bradbury Mountain State Park Ice'),
  ('nh_hillside_aka_summit_boulder_area', 'Hillside (aka Summit Boulder Area)', 'Hillside Routes'),
  ('qc_mont_king_2', 'Mont-King', 'Mont-King Ice'),
  ('co_mt_evans_bouldering', 'Mt. Evans Bouldering', 'Mt. Blue Sky (formerly Mount Evans) Bouldering'),
  ('ca_jcvd_jean_claud_van_dam_boulder', 'JCVD (Jean Claud Van Dam) boulder', 'JCVD (Jean Claud Van Damme) Boulder'),
  ('wa_wayne_s_world', 'Wayne’s World', 'Wayne’s World Routes'),
  ('nh_big_boulder_the', 'Big Boulder, The', 'The Big Boulder');

create temp table m_new_area(id text primary key, name text not null, parent_id text not null, final_parent text not null, area_type text, region text, lat double precision, lng double precision) on commit drop;
insert into m_new_area values
  ('ca_wild_wild_western_pinnacles_aka_orange_rocks_routes', 'Wild, Wild Western Pinnacles Routes', 'ca_bishop_peak', 'ca_wild_wild_western_pinnacles_aka_orange_rocks', 'crag', 'California', 35.29991, -120.6929),
  ('ab_stanley_headwall_routes', 'Stanley Headwall Ice', 'ab_radium_highway_93_south', 'ab_stanley_headwall', 'crag', 'Alberta', 51.18569, -116.05394);

create temp table m_junk(id text primary key, area_id text not null, name text not null) on commit drop;
insert into m_junk values
  ('mi_ariel_map_of_route_locations', 'mi_main_wall', 'Ariel map of route locations');

-- every ancestor of every touched area, read BEFORE anything moves (old and new ancestors both)
create temp table m_recount on commit drop as
  select distinct a.id from areas a join areas t on a.path @> t.path
   where t.id in ('or_vader_s_helmet_boulder', 'or_vader_s_helmet_boulder_2', 'mt_tip_toe_area', 'mt_09_tip_toe_area_tanman_buttress', 'mt_lakeside_walls', 'mt_lakeside_walls_2', 'or_brain_boulder_the', 'or_the_brain_boulder', 'or_cranky_locals_wall', 'or_cranky_locals_wall_2', 'or_widgi_right', 'or_c_widgi_right', 'va_afterthought_boulder_2', 'va_afterthought_boulder', 'va_dumbo_boulder_2', 'va_dumbo_boulder', 'va_shade_boulder_3', 'va_shade_boulder', 'wa_the_chopping_block_pinnacle_peak', 'wa_the_chopping_block', 'az_turtle_cove', 'az_turtle_cove_2', 'ca_whitney_cave_2', 'ca_whitney_cave', 'nv_avalanche_falls', 'nv_avalanche_falls_2', 'nv_echo_falls', 'nv_echo_falls_2', 'nv_lost_falls', 'nv_lost_falls_2', 'nv_mary_jane_falls', 'nv_mary_jane_falls_2', 'nv_vegas_hose_monster', 'nv_vegas_hose_monster_2', 'ut_upper_grey_cliffs', 'ut_upper_grey_cliffs_2', 'wa_dark_side', 'wa_dark_side_2', 'wa_excellent_adventure_wall', 'wa_excellent_adventure_wall_2', 'wa_garden_wall_2', 'wa_garden_wall', 'ca_roadside_boulder_7', 'ca_roadside_baloney_boulder', 'ut_everett_ruess_memorial_boulder', 'ut_everett_ruess_memorial_boulder_closed', 'az_crumblin_wall_2', 'az_crumblin_wall', 'az_flailing_wall_2', 'az_flailing_wall', 'az_medivac_wall_3', 'az_medivac_wall', 'az_medivac_wall_2', 'ut_zeus_2', 'ut_zeus', 'va_center_darkside_2', 'va_center_darkside', 'wa_cobblestone_wall', 'wa_cobblestone_wall_2', 'ca_the_galapagos', 'ca_galapagos_the', 'ca_a_elephant_head', 'ca_elephant_head_hyperion_slab_the', 'ca_matts_boulders', 'ca_matts_boulders_aka_the_nest', 'ca_new_sub_area_2', 'ca_malarkey_rock', 'ca_malarkey_rock_2', 'co_split_rock_2', 'co_split_rock', 'nv_above_big_falls', 'nv_above_big_falls_2', 'nv_echo_falls_area', 'nv_echo_falls_area_3', 'nv_little_falls', 'nv_little_falls_2', 'nv_mary_jane_falls_area', 'nv_mary_jane_falls_area_2', 'nv_toad_the', 'nv_the_toad', 'ut_box_canyon_ice_climbs_the', 'ut_the_box_canyon_ice_climbs', 'wa_broken_obelisk', 'wa_broken_obelisk_2', 'wa_1_upper_cheeks', 'wa_upper_cheeks', 'wa_hamilton_boulders_2', 'wa_hamilton_boulders', 'ca_mickey_s_wall_north_side_3', 'ca_mickey_s_wall_north_side', 'wa_ca_dihedral_wall', 'wa_dihedral_wall', 'ut_the_grey_cliffs_private_property', 'ut_grey_cliffs_the_2', 'wa_garfield_ledges', 'wa_garfield_ledges_2', 'az_bright_angel_walls_2', 'az_bright_angel_walls', 'ca_pangea_wall', 'ca_pangea_wall_or_pangaea_wall', 'ut_cultural_respect_wall', 'ut_cultural_respect_wall_2', 'ut_election_wall', 'ut_election_wall_2', 'ut_clementine_corner_crag', 'ut_entrance_corridor', 'ut_entrance_corridor_2', 'ut_taylor_canyon_2', 'ut_taylor_canyon', 'ut_king_s_hand_2', 'ut_king_s_hand', 'ut_wall_street_north_2', 'ut_wall_street_north', 'va_darkside_2', 'va_darkside', 'wa_anchor_rock', 'wa_anchor_rock_2', 'wa_cranium_boulder', 'wa_cranium_boulder_2', 'wa_olympic_boulder_the', 'wa_the_olympic_boulder', 'wa_roadside_boulder', 'wa_roadside_boulder_3', 'ak_purinton_creek', 'ak_purinton_creek_2', 'ca_the_lion_s_den', 'ca_lion_s_den_the', 'ca_lion_s_den_2', 'ma_airation_alcove_trash_pit_2', 'ma_airation_alcove_trash_pit', 'ma_down_under_bouldering_slab', 'ma_down_under', 'ma_down_under_2', 'nm_waterfall_canyon', 'nm_waterfall_canyon_2', 'ny_honey_pot_the_2', 'ny_honey_pot_the', 'or_cline_falls_bouldering_2', 'or_cline_falls_bouldering', 'ut_middle_fork_ice_climbs_the', 'ut_the_middle_fork_ice_climbs', 'ut_little_valley_3', 'ut_little_valley_4', 'ut_tuhinga_tower', 'ut_tuhinga_tower_2', 'va_upper_falls_area_ice', 'va_upper_falls_area_ice_2', 'wa_fuggs_falls', 'wa_fuggs_falls_2', 'wa_powerhouse_area_2', 'wa_powerhouse_area', 'wa_cougar_mountain', 'wa_cougar_mountain_2', 'wi_county_highway_x_gullies', 'wi_county_highway_x_gullies_2', 'wi_long_valley', 'wi_long_valley_2', 'wi_mississippi_ridge_south_main_flow_ice', 'wi_mississippi_ridge_south_main_flow_ice_2', 'wi_quarry_the', 'wi_the_quarry', 'wi_spook_hill_gully', 'wi_spook_hill_gully_2', 'ak_lower_tee_harbor_cliff', 'ak_lower_tee_harbor_cliff_aka_sci_fi_wall', 'az_behind_sweet_rock_peanut_rock', 'az_behind_sweet_rock', 'ca_main_rock_aka_scary_boulder', 'ca_main_rock_3', 'ca_jcvd_jean_claud_van_damme_boulder', 'ca_jcvd_jean_claud_van_dam_boulder', 'co_x_crack_boulder_the_kid_boulder', 'co_x_crack_boulder', 'ut_left_rambo_aka_gasp_wall', 'ut_left_rambo', 'wa_little_matterhorn_rock_kid_rock', 'wa_little_matterhorn_rock', 'wa_mount_olympus_2', 'wa_mount_olympus', 'mt_greek_creek_and_surroundings_2', 'mt_greek_creek_and_surroundings', 'nh_corridor_block', 'nh_left_end_the_2', 'nh_left_end_proper', 'nh_01_the_left_end', 'ut_little_valley', 'ut_little_valley_2', 'wa_sunshine_s_lower_cliffs_2', 'wa_sunshine_s_lower_cliffs', 'wa_university_of_washington_campus_and_surrounding_areas_2', 'wa_university_of_washington_campus_and_surrounding_areas', 'wv_greenbrier_triangle_boulders_the', 'wv_greenbrier_boulders', 'wi_sand_cave_trail_ice_2', 'wi_sand_cave_trail_ice', 'wy_hueco_simulator_boulder', 'wy_hueco_simulator_boulder_2', 'wy_maze_area_the', 'wy_the_maze_area', 'ak_boulder_point_bloc', 'ak_boulder_point', 'ak_boulder_point_2', 'az_bass_camp_2', 'az_bass_camp', 'az_colorado_river_2', 'az_colorado_river', 'az_vermillion_cliffs', 'az_vermillion_cliffs_2', 'co_laying_in_wait_boulder_2', 'co_laying_in_wait_boulder', 'mt_stone_hill', 'mt_stone_hill_2', 'ut_devil_s_golf_ball_aka_the_bulbous_head', 'ut_devil_s_golf_ball', 'ut_indian_creek_2', 'ut_indian_creek', 'ut_island_in_the_sky_3', 'ut_island_in_the_sky', 'ut_potash_road_2', 'ut_potash_road', 'ut_topus_boulder_2', 'ut_topus_boulder', 'ut_topus_mountain_2', 'ut_topus_mountain', 'wa_3_glazers_boulder', 'wa_3_glazers_boulder_2', 'wa_jefferson_lake', 'wa_jefferson_lake_2', 'ak_portage', 'ak_portage_2', 'ak_seward_highway', 'ak_seward_highway_2', 'ak_snow_river', 'ak_snow_river_2', 'ma_corps_wall_closed_to_climbing', 'ma_corps_wall', 'mo_3_north_end_boulders', 'mo_k_north_end_boulders', 'ut_bluff_2', 'ut_bluff', 'wa_devils_punch_bowl_area', 'wa_devils_punch_bowl_area_2', 'wa_ice_climbing_in_winter', 'wa_ice_climbing_in_winter_2', 'wy_sphinx_the_2', 'wy_sphinx_the', 'mn_south_buttress', 'mn_south_buttress_aka_higher_education_wall', 'mn_south_face', 'mn_south_face_aka_adulting_area', 'or_0_valhalla', 'or_valhalla', 'wi_shiprock_a_k_a_sh_trock', 'wi_shiprock', 'ca_mount_st_helena_2', 'ca_mount_st_helena', 'ca_salt_point_state_park_2', 'ca_salt_point_state_park', 'ca_sonoma_coast_state_park_2', 'ca_sonoma_coast_state_park', 'mt_blodgett_canyon_2', 'mt_blodgett_canyon', 'mt_st_mary_falls_trail_2', 'mt_st_mary_falls_trail', 'mt_two_medicine_lake_area', 'mt_two_medicine_lake', 'mt_glacier_national_park_2', 'mt_glacier_national_park', 'mt_point_of_rocks', 'mt_point_of_rocks_2', 'mt_big_belt_mountains_2', 'mt_big_belt_mountains', 'mt_big_sky_area_2', 'mt_big_sky_area', 'mt_bridger_range_2', 'mt_bridger_range', 'mt_gallatin_canyon_2', 'mt_gallatin_canyon', 'mt_homestake_pass_2', 'mt_homestake_pass', 'mt_hyalite_canyon_2', 'mt_hyalite_canyon', 'mt_madison_river_area_2', 'mt_madison_river_area', 'mt_tobacco_root_mountains_2', 'mt_tobacco_root_mountains', 'nv_la_madre_north_2', 'nv_la_madre_north', 'nv_the_moon_aka_knob_hill', 'nv_moon_aka_knob_hill_the', 'nm_chimney_canyon_2', 'nm_chimney_canyon', 'nm_juan_tabo_canyon_2', 'nm_juan_tabo_canyon', 'nm_three_gun_tres_pistolas_2', 'nm_three_gun_tres_pistolas', 'nc_moore_s_wall_bouldering_2', 'nc_moore_s_wall_bouldering', 'ut_191_south_2', 'ut_191_south', 'ut_blanding_2', 'ut_blanding', 'ut_comb_ridge_2', 'ut_comb_ridge', 'ut_kane_springs_canyon_2', 'ut_kane_springs_canyon', 'ut_la_sal_mountains_2', 'ut_la_sal_mountains', 'ut_labyrinth_canyon_2', 'ut_labyrinth_canyon', 'ut_lockhart_basin_2', 'ut_lockhart_basin', 'ut_river_road_2', 'ut_river_road', 'ut_sand_flats_2', 'ut_sand_flats', 'ut_state_highway_313_2', 'ut_state_highway_313', 'ut_valley_of_the_gods_2', 'ut_valley_of_the_gods', 'wa_echo_basin_2', 'wa_echo_basin', 'wa_frenchman_coulee_vantage', 'wa_frenchman_coulee', 'wa_burge_north_hidden_canyon_tonasket', 'wa_burge_north_hidden_canyon', 'wa_sjw_social_justice_warrior_wall', 'wa_sjw_wall', 'wi_wyalusing_state_park_ice', 'wi_wyalusing_state_park_ice_2', 'nh_band_m', 'nh_band_m_re_opened', 'ny_n_country_rd_boulder', 'ny_n_country_rd_boulder_aka_billboard_rock', 'ok_the_crag', 'ok_crag_the', 'tn_mountain_the', 'tn_the_mountain', 'id_the_selkirk_crest_american', 'id_selkirk_crest_the', 'ky_mfrp_miller_fork_recreational_preserve', 'ky_miller_fork_recreational_preserve_mfrp', 'ky_pmrp_pendergrass_murray_recreational_preserve', 'ky_pendergrass_murray_recreational_preserve_pmrp', 'ky_southern_region_crags_misc', 'ky_southern_region_crags_miscellaneous', 'nv_echo_falls_area_2', 'ca_b_thurman_flat_sport_boulder', 'ca_sport_boulder', 'nv_big_ass_rocks', 'nv_big_ass_rocks_knob_hill_bouldering', 'wa_sehome_arboretum_old', 'wa_sehome_arboretum_climbs', 'ca_indian_rock_bouldering_area', 'ca_sanborn_county_park_indian_rock_side', 'ca_bel_air_boulder', 'ca_castle_rock_area_bouldering', 'ca_castle_and_sanborn_area_bouldering', 'ut_bookend_butte', 'ut_cracklin_butte', 'az_angels_gate_2', 'az_angels_gate', 'az_grand_canyon', 'az_grand_canyon_national_park', 'nv_mount_charleston_ice', 'nv_mount_charleston_winter', 'wa_olympic_peninsula_bouldering', 'wa_olympic_bouldering', 'or_widgi_boulders', 'or_widgi_creek', 'co_gateway_boulder_3', 'co_gateway_boulder', 'co_mt_blue_sky_formerly_mount_evans_bouldering', 'co_mt_evans_bouldering', 'wi_wyalusing_ice', 'wi_wyalusing_state_park', 'wa_frenchman_coulee_aka_vantage', 'wa_greater_seattle_including_the_eastside', 'wa_seattle_and_seattle_eastside', 'wa_wayne_s_world_dry_tooling', 'wa_public_land_for_sale_wayne_s_world', 'wa_banks_lake_northrup_canyon', 'wa_banks_lake', 'ca_castle_rock_and_sanborn_area', 'ca_castle_rock_area', 'wa_tumtum', 'wa_tum_tum', 'nm_la_cueva_canyon_lower_2', 'nm_la_cueva_canyon_lower', 'nm_sandia_mountains_west_side', 'nm_sandia_mountains', 'ca_wine_country_northeast_bay', 'ca_wine_country', 'nv_la_madre_area', 'nv_la_madre_range', 'nh_dumplington_hill_the_dump', 'nh_dumplingtown_hill_the_dump', 'ca_bishop_peak_bouldering', 'ca_wild_wild_western_pinnacles_aka_orange_rocks', 'ny_f_lake_george_region', 'ny_cove_boulders_rogers_rock_campground', 'qc_val_david_bouldering', 'qc_la_bleue_2', 'qc_mont_king_3', 'co_glenwood_canyon', 'co_the_homestead_a_k_a_cascade_creek', 'ab_radium_highway_93_south', 'ab_stanley_headwall', 'oh_salt_fork_state_park', 'oh_morgan_s_knob_boulders', 'ab_bow_valley', 'ab_grotto_canyon', 'me_c_greater_portland', 'me_bradbury_mountain_state_park_closed_to_climbing_oct_17', 'nh_pawtuckaway', 'nh_hillside', 'nh_06_the_big_boulder_area', 'sd_main_wall', 'sd_main_wall_china_and_victor_charlie_walls_the', 'ca_wild_wild_western_pinnacles_aka_orange_rocks_routes', 'ab_stanley_headwall_routes', 'ut_new_sub_area_1', 'ut_unsorted_routes', 'ut_blue_gramma_cliff', 'ca_summit_rock_climbs', 'co_grotto_sector', 'co_homestead_the', 'co_water_tower_sector', 'nh_hillside_aka_summit_boulder_area', 'nh_45_to_life_area', 'az_the_doghouse', 'mi_main_wall');

do $$ declare n int; begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog: nothing to fold.
  select count(*) into n from areas where id in (select id from m_drop_area);
  if n = 0 then raise notice '0276: no catalog, nothing to fold'; return; end if;
  if n <> 205 then raise exception '0276: expected 205 copy areas, found %', n; end if;
  -- the tree must still be the one the plan read
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.from_area;
  if n <> 77 then raise exception '0276: % of 77 climbs are where the plan found them', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep join routes o on o.id = m.drop_id;
  if n <> 162 then raise exception '0276: % of 162 merge pairs still exist', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.from_area;
  if n <> 282 then raise exception '0276: % of 282 sub-areas are where the plan found them', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.from_name;
  if n <> 13 then raise exception '0276: % of 13 renames still carry the planned name', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.from_name;
  if n <> 4 then raise exception '0276: % of 4 climb renames still carry the planned name', n; end if;
  select count(*) into n from areas where id in (select id from m_new_area);
  if n > 0 then raise exception '0276: % of the new areas already exist', n; end if;
  select count(*) into n from m_junk j join routes r on r.id = j.id and r.area_id = j.area_id and r.name = j.name;
  if n <> 1 then raise exception '0276: % of 1 junk rows are where they were read', n; end if;
  -- every climb on a copy is accounted for
  select count(*) into n from routes r join m_drop_area d on d.id = r.area_id
   where r.id not in (select id from m_move) and r.id not in (select drop_id from m_merge);
  if n > 0 then raise exception '0276: % climbs on a copy are not in the plan', n; end if;
  select count(*) into n from areas a join m_drop_area d on d.id = a.parent_id
   where a.id not in (select id from m_reparent) and a.id not in (select id from m_drop_area);
  if n > 0 then raise exception '0276: % sub-areas of a copy are not in the plan', n; end if;
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
  if n > 0 then raise exception '0276: % climber rows point at a row this deletes — stop and repoint them', n; end if;
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
  if n > 0 then raise exception '0276: % climber rows still point at a copy', n; end if;
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
  parking_lat = case when k.parking_lat is null or k.parking_lng is null then o.parking_lat else k.parking_lat end,
  parking_lng = case when k.parking_lat is null or k.parking_lng is null then o.parking_lng else k.parking_lng end,
  parking_name = case when k.parking_lat is null or k.parking_lng is null then o.parking_name else k.parking_name end,
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

-- 5. names, now that the copies are gone: a nested section is named for what it holds, never its place's
--    name over again ("La Bleue" inside "La Bleue" -> "La Bleue Bouldering"). Each was read; bypassed
--    because a section's key is its crag's.
set local catalog.allow_duplicate = 'on';
update areas a set name = m.to_name from m_rename m where a.id = m.id and a.name = m.from_name;
set local catalog.allow_duplicate = 'off';

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
  if n > 0 then raise exception '0276: % copy areas were not emptied', n; end if;
  select count(*) into n from routes where id in (select drop_id from m_merge union select id from m_junk);
  if n > 0 then raise exception '0276: % merged or junk climbs survived', n; end if;
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.to_area;
  if n <> 77 then raise exception '0276: % of 77 climbs moved', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.to_name;
  if n <> 13 then raise exception '0276: % of 13 renames landed', n; end if;
  select count(*) into n from m_new_area m join areas a on a.id = m.id and a.parent_id = m.final_parent and a.route_count > 0;
  if n <> 2 then raise exception '0276: % of 2 new areas are in place, holding their climbs', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.to_area;
  if n <> 282 then raise exception '0276: % of 282 sub-areas re-parented', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.to_name;
  if n <> 4 then raise exception '0276: % of 4 climb renames landed', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep where m.grade is not null and (k.grade <> m.grade or k.grade_num is distinct from m.grade_num);
  if n > 0 then raise exception '0276: % merged grades or grade_nums did not land', n; end if;
  -- no area holds climbs AND sub-areas
  select count(*) into n from areas a where a.id in (select id from m_recount)
     and exists (select 1 from routes r where r.area_id = a.id) and exists (select 1 from areas s where s.parent_id = a.id);
  if n > 0 then raise exception '0276: % areas hold climbs and sub-areas', n; end if;
end $$;

commit;
