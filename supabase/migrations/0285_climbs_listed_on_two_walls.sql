-- 0285: climbs listed on two walls, settled.
--
-- Asked: "do the rest" (2026-10-14), after 0284: every pair of areas under 2 km apart that share one or two
-- distinctive climb names (266 pairs), each shared climb's two copies set beside the source's entry or entries for
-- that name (its area tree, the newest crawl) and both rows' FA, length, pitches and description, then READ.
--   * ONE climb filed twice: the same FA, length or description, a small grade drift, one copy on a catch-all list —
--     merged into the copy on the wall the source files it under, even where the source itself lists it on both walls
--     (Pentecost on Down Under Wall and Outback Wall, both FA Frisbie/Caughlin 6/94).
--   * TWO climbs, kept: a rock route beside an ice line or a boulder problem of the same name, different FAs, grades far
--     apart, placeholders whose grades differ (owner rule), and every pair a reader could not settle.
--   * PLACES: Rocky Island's North Wall (the source lists the same three climbs twice), Sherwin Island's Cupids Bower
--     (the old crawl's copy: "BA", "Master Degree", "PHD" are the current Bachelor's, Master's, Ph.D.; its uniform 5.9
--     is not a reading, so the current grades stand), Lewis Larus Park's and Capitol Hill's one-climb catch-alls, Pikes
--     Peak's Southeast Face (the Cirque), and Ferne Clyffe State Park listed twice in Illinois (the old "S.P." copy's
--     walls join the park as they are).
-- Two copies of one climb that drift in grade keep the HIGHER (owner rule; lib/grade.js ranks); grade_num follows.
-- 157 climbs merged (39 take a grade), 2 moved, 6 copy areas deleted, 5 sub-areas re-parented.
-- No contribution, log, photo, topo, list or report on any climb this deletes.
-- ABORTS if climber data points at a climb deleted, or if the live tree no longer matches the plan.
-- Plan: the job's fold11/ (sheet-1..4.txt, verdicts-1..4.json, decide.mjs); rollback: scripts/data/two-walls-rollback.json.

begin;

create temp table m_merge(keep text not null, drop_id text primary key, grade text, grade_num numeric, disc text) on commit drop;
insert into m_merge values
  ('ar_pentecost_2', 'ar_pentecost', null, null, null),
  ('ar_crown_of_thorns', 'ar_crown_of_thorns_2', null, null, null),
  ('ar_split_boulder', 'ar_split_boulder_2', null, null, null),
  ('ca_lower_cathedral_west_the_groom_s_variation', 'ca_the_groom_s_variation', '5.10d', 11, null),
  ('co_c_the_time_zone_noah_s_ark_arete', 'co_noah_s_ark_arete_aka_peer_pressure', null, null, null),
  ('co_c_the_time_zone_respecting_the_law', 'co_respecting_the_law_aka_handcrack_corner', null, null, null),
  ('co_white_stallion', 'co_white_stallion_the', null, null, null),
  ('id_todd_s_mole_hill', 'id_east_wall_todd_s_molehill', null, null, null),
  ('ma_digital_age', 'ma_digital_age_2', null, null, null),
  ('ma_fasten_your_seatbelt', 'ma_fasten_your_seatbelt_2', 'V6-', 6, null),
  ('md_center_ring_2', 'md_center_ring', null, null, null),
  ('md_rock_and_roll_2', 'md_rock_and_roll', '5.9', 9, null),
  ('md_rocky_road_2', 'md_rocky_road', null, null, null),
  ('mi_cliff_drive_roped_stoned_cold_liar', 'mi_stoned_cold_liar_aka_old_dirty_bastard', null, null, null),
  ('mn_skeeter_snack_2', 'mn_skeeter_snack', null, null, null),
  ('mo_running_from_voodoo', 'mo_running_from_voodoo_2', null, null, null),
  ('nh_carpet_path', 'nh_carpet_path_2', '5.6', 6, null),
  ('ny_thank_you_cindy', 'ny_thank_you_cindy_2', null, null, null),
  ('tx_get_spanked_2', 'tx_get_spanked', null, null, null),
  ('wa_j_tnar', 'wa_mount_index_north_norwegian_buttress', null, null, null),
  ('al_the_kind_flake', 'al_the_kind_flake_2', null, null, null),
  ('ar_randy_s_crack', 'ar_randy_s_crack_2', null, null, null),
  ('ca_cast_in_stone', 'ca_cast_in_stone_2', null, null, null),
  ('ca_hand_traverse_boulder_rimshot_aka_boy_s_problem_sit', 'ca_rimshot', null, null, null),
  ('ca_hawk_s_lunch', 'ca_hawks_lunch', 'V1+', 1, null),
  ('wa_right_angles_2', 'wa_right_angles', null, null, null),
  ('ca_the_show_goes_on', 'ca_the_show_goes_on_2', null, null, null),
  ('co_a_quark_for_quayle', 'co_a_quark_for_quayle_2', '5.9', 9, null),
  ('co_jump_start_of_faith_2', 'co_jump_start_of_faith', null, null, null),
  ('mn_humping_the_bear_2', 'mn_humping_the_bear', null, null, null),
  ('ca_jackie_s_rack', 'ca_jackie_s_rack_2', null, null, null),
  ('tx_eye_gouger', 'tx_eye_gouger_2', null, null, null),
  ('tx_spud_boy', 'tx_spud_boy_2', null, null, null),
  ('mo_beginner_chimney_2', 'mo_beginner_chimney', '5.5', 5, null),
  ('nv_classic_rock_right_sw_un_break_my_hold', 'nv_unbreak_my_hold', null, null, null),
  ('nv_classic_rock_right_sw_wannabe_my_belayer', 'nv_wanna_be_my_belayer', null, null, null),
  ('ut_rager_s_edge', 'ut_rager_s_edge_2', null, null, null),
  ('wa_full_or_nearly_wall_routes_waterway', 'wa_waterway', '5.7', 7, null),
  ('wy_missiles_for_jesus_2', 'wy_missiles_for_jesus', null, null, null),
  ('bc_the_balcony_sector_de_compressor', 'bc_penthouse_decompressor', null, null, null),
  ('ca_perulmutters_pleasure_2', 'ca_perulmutters_pleasure', null, null, null),
  ('ga_triple_slaps', 'ga_the_triple_slaps', null, null, null),
  ('ny_manticore_dihedral_2', 'ny_manticore_dihedral', null, null, null),
  ('ak_wide_2', 'ak_wide', null, null, null),
  ('az_iron_heart', 'az_ironheart', null, null, null),
  ('ca_intersection_rock_west_and_south_faces_the_waterchute', 'ca_water_chute', null, null, null),
  ('co_mo_s_crack_2', 'co_mo_s_crack', null, null, null),
  ('az_echo_canyon_wall_lost_in_a_world_of_maybe', 'az_lost_in_a_world_of_maybe', '5.10a', 10.25, null),
  ('ca_kipper_snapper_2', 'ca_kipper_snapper', null, null, null),
  ('ca_mad_wife', 'ca_mad_wife_2', null, null, null),
  ('il_scout_slabs_first_climb', 'il_first_climb_aka_psychopath', null, null, null),
  ('nv_backside_left_2', 'nv_backside_left', null, null, null),
  ('wy_upper_tier_3_moonstone_crack_project', 'wy_moonstone_crack_project', '5.13', 13, null),
  ('wy_the_interesting_problem_below', 'wy_the_interesting_problem_below_2', null, null, null),
  ('ca_chicken_fart', 'ca_chicken_fart_2', null, null, null),
  ('ca_chicken_heart_2', 'ca_chicken_heart', null, null, null),
  ('ok_born_again_hard_2', 'ok_born_again_hard', null, null, null),
  ('ok_jimmy_dean_2', 'ok_jimmy_dean', null, null, null),
  ('tx_fun_factor_2', 'tx_fun_factor', 'V3', 3, null),
  ('az_the_camels_nose_aldebran', 'az_aldebran', '5.5', 5, null),
  ('az_the_camels_nose_zinfandel', 'az_zinfandel', '5.3', 3, null),
  ('il_the_munchkin_2', 'il_the_munchkin', null, null, null),
  ('nh_shifty_eyes', 'nh_shifty_eyes_2', null, null, null),
  ('nh_under_toe', 'nh_under_toe_2', null, null, null),
  ('wa_martian_slab_eat_it', 'wa_upper_martian_slab_eatit', null, null, null),
  ('ca_north_east_rib', 'ca_northeast_rib', '5.6', 6, null),
  ('co_assume_the_shuffle_2', 'co_assume_the_shuffle', 'V1', 1, null),
  ('co_gorilla_milk_direct', 'co_gorilla_milk_direct_2', null, null, null),
  ('tx_unripe_2', 'tx_unripe', null, null, null),
  ('nh_06_diesel_boulder_diesel_town', 'nh_dieseltown', 'V8-9', 9, null),
  ('tx_seam_of_death', 'tx_seam_of_death_2', null, null, null),
  ('ca_maximum_relaxum_2', 'ca_maximum_relaxum', null, null, null),
  ('tx_mister_access_2', 'tx_mister_access', null, null, null),
  ('tx_tomahawk_2', 'tx_tomahawk', null, null, null),
  ('md_waining_strength_2', 'md_waining_strength', null, null, null),
  ('wa_d_dana_s_arch_area_the_back_road', 'wa_left_of_earwax_backroad', null, null, null),
  ('al_balance_theory', 'al_balance_theory_2', null, null, null),
  ('ca_death_vomit', 'ca_death_vomit_2', null, null, null),
  ('wa_tarantula_traverse_2', 'wa_tarantula_traverse', null, null, null),
  ('sd_the_guardian', 'sd_guardian', '5.10a', 10.25, null),
  ('sd_guardian_face', 'sd_guardian_face_2', null, null, null),
  ('ar_rightovers', 'ar_rightovers_2', null, null, null),
  ('ca_chesire_for_president_2', 'ca_chesire_for_president', null, null, null),
  ('co_shadow_of_a_hangdog_aka_fat_fingers', 'co_overhang_area_shadow_of_a_hangdog', null, null, null),
  ('tn_dyslexia_2', 'tn_dyslexia', '5.11b', 11.5, null),
  ('tn_what_a_view_2', 'tn_what_a_view', null, null, null),
  ('wa_eddies_overhang', 'wa_eddie_s_overhang', null, null, null),
  ('co_north_overhang', 'co_north_overhang_2', null, null, null),
  ('ga_middle_blocks_rhino_low_aka_fire_in_the_sky', 'ga_rhino_low', null, null, null),
  ('wa_east_gibralter_spic_aka_kraft_dinners', 'wa_spic', null, null, null),
  ('co_mt_blue_sky_formerly_mount_evans_north_face_the_snave_direct', 'co_mt_blue_sky_formerly_mount_evans_mixed_couloirs_the_snave_direct', null, null, null),
  ('az_rjg_2', 'az_rjg_2_2', null, null, null),
  ('wi_el_cielo_2', 'wi_el_cielo', null, null, null),
  ('az_rjg_246_2', 'az_rjg_246', null, null, null),
  ('az_rjg_247_2', 'az_rjg_247', null, null, null),
  ('wa_ho_chi_minh_2', 'wa_ho_chi_minh', null, null, null),
  ('id_distractions_2', 'id_distractions', '5.10b', 10.5, null),
  ('ut_right_side_cragging_kentucky_brown_water', 'ut_kentucky_brown_water', '5.4', 4, null),
  ('ar_pimp_daddy_2000', 'ar_pimp_daddy_2000_2', null, null, null),
  ('ca_ugly_arete', 'ca_phobos_deimos_cliff_ugly_arete', null, null, null),
  ('ma_mormon_hollow_right_side_second_diagonal', 'ma_21_second_diagonal', null, null, null),
  ('ut_chest_full_of_kind_2', 'ut_chest_full_of_kind', null, null, null),
  ('va_coffee_is_my_cologne', 'va_coffee_is_my_cologne_2', 'V4+', 4, null),
  ('va_jurassic_park_ar_te', 'va_jurassic_park_ar_te_2', 'V4+', 4, null),
  ('ri_lost_corner_2', 'ri_lost_corner', 'V0-1', 1, null),
  ('wa_existential_exit', 'wa_existential_exit_2', null, null, null),
  ('al_the_kind_flake', 'al_kind_flake', null, null, null),
  ('pa_cave_wave_2', 'pa_cave_wave', null, null, null),
  ('az_east_face_4_beat_the_drummond_slowly', 'az_rappel_rock_2_climbs_beat_the_drummond_slowly', null, null, null),
  ('az_east_face_4_fractured_fairy_tales', 'az_rappel_rock_2_climbs_fractured_fairy_tales', null, null, null),
  ('nv_arete_left', 'nv_arete_left_2', null, null, null),
  ('nv_arete_right', 'nv_arete_right_2', null, null, null),
  ('nh_7_flume_silver_cascades_crawford_notch_flume_cascade', 'nh_06_trestle_top_of_notch_ice_2_flume_cascade', null, null, null),
  ('tn_bread_and_butter_2', 'tn_bread_and_butter', 'V7', 7, null),
  ('co_no_country_for_old_manhands_boulder_no_country_for_old_manhands', 'co_no_country_for_old_man_hands', null, null, null),
  ('ma_first_burn_2', 'ma_first_burn', null, null, null),
  ('va_keep_your_head_down_2', 'va_keep_your_head_down', null, null, null),
  ('va_over_and_under_2', 'va_over_and_under', null, null, null),
  ('co_feeding_the_beast_aka_beast_food', 'co_feeding_the_beast', '5.12b', 12.5, null),
  ('ar_cactus_joe_2', 'ar_cactus_joe', '5.11c', 11.75, null),
  ('ut_demolition_2', 'ut_demolition', null, null, null),
  ('co_tiara_rado_south_jolly_tower_marital_bliss', 'co_jolly_tower_marital_bliss', '5.8', 8, null),
  ('co_tiara_rado_south_oompah_tower_ethan_putterman_and_the_chocolate_factory', 'co_oompah_tower_ethan_putterman_and_the_chocolate_factory', '5.9', 9, null),
  ('co_the_crestones_merhar_direct', 'co_merhar_direct', null, null, null),
  ('sd_horning_route_2', 'sd_horning_route', null, null, null),
  ('co_southeast_face_aka_the_cirque_southern_circus', 'co_southern_circus', '5.6', 6, null),
  ('or_sappy_boulder_jizz_sap', 'or_jizz_sap', null, null, null),
  ('wa_punk_rock_another_ac_dc_song', 'wa_lower_castle_another_ac_dc_song', null, null, null),
  ('co_monument_canyon_otto_s_ladder', 'co_otto_s_ladder', '5.7', 7, null),
  ('co_monument_canyon_rainbow_tower', 'co_rainbow_tower', '5.9', 9, null),
  ('or_east_side_2_wy_east', 'or_wy_east', 'Easy 5th', 5, null),
  ('nj_chunk_no_captain_chunk_2', 'nj_chunk_no_captain_chunk', null, null, null),
  ('az_tsefnaeb_dome_edge_of_worst_fear', 'az_edge_of_worst_fear', null, null, null),
  ('az_tsefnaeb_dome_tsefnaeb', 'az_tsefnaeb', null, null, null),
  ('co_cali_cave_the_feast_aka_fat_lady', 'co_the_feast_aka_fat_lady', null, null, null),
  ('az_hole_in_the_rock_flapago', 'az_flapago', null, null, null),
  ('or_light_my_fire_2', 'or_light_my_fire', null, null, null),
  ('ut_no_more_tears', 'ut_no_more_tears_2', '5.11', 11, null),
  ('nh_4_mt_webster_winter_ice_mixed_shoestring_buttress', 'nh_shoestring_buttress', '5.5', 5, null),
  ('wa_b_canopy_crag_puget_power', 'wa_world_wall_puget_power', null, null, null),
  ('ma_aa_upper_tier_summer_stroll', 'ma_summer_stroll', null, null, null),
  ('ut_circus_wall_2_the_hitch_hiker_s_thumb', 'ut_the_hitch_hiker_s_thumb', '5.11', 11, null),
  ('ma_zip_line', 'ma_zipline', null, null, null),
  ('nv_scary_make_up_boulder_eyeliner', 'nv_eyeliner', null, null, null),
  ('nv_bear_cave_bear_cave', 'nv_bear_cave', null, null, null),
  ('nv_bear_cave_kung_fu_panda', 'nv_kung_fu_panda', null, null, null),
  ('az_echo_canyon_wall_3_star_nightmare', 'az_3_star_nightmare', null, null, null),
  ('tx_tidal_wave_boulder_lone_star_ar_te', 'tx_lone_star_ar_te', null, null, null),
  ('wa_billy_goat_bluff_space_aliens_stole_my_face', 'wa_clamshell_cave_space_aliens_stole_my_face', '5.9', 9, null),
  ('wa_upper_goat_dome_black_sheets_of_rain', 'wa_clamshell_cave_black_sheets_of_rain', null, null, null),
  ('wa_trinity_lutheran_church_trinity_lutheran_church', 'wa_trinity_lutheran_church', null, null, null),
  ('tn_lower_suck_damn_yankees', 'tn_damn_yankees', null, null, null),
  ('tn_lower_suck_paul_bunyan_traverse', 'tn_paul_bunyan_traverse', null, null, null),
  ('wa_main_peak_tepeh_towers', 'wa_tepeh_towers', null, null, null),
  ('md_bachelor_s', 'md_ba', '5.3', 3, null),
  ('md_master_s', 'md_master_degree', '5.6', 6, null),
  ('md_ph_d_coffin_climb', 'md_phd', '5.9', 9, null);

create temp table m_route_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
-- (m_route_rename: none in this plan)

create temp table m_move(id text primary key, from_area text not null, to_area text not null, bypass boolean not null) on commit drop;
insert into m_move values
  ('md_post_doctorate', 'md_sherwin_island_cupids_bower', 'md_cupids_bower', false),
  ('md_supermang_overhang', 'md_sherwin_island_cupids_bower', 'md_cupids_bower', false);

create temp table m_reparent(id text primary key, from_area text not null, to_area text not null) on commit drop;
insert into m_reparent values
  ('il_45_degree_wall_2', 'il_ferne_clyffe_s_p', 'il_ferne_clyffe_state_park'),
  ('il_assassin_wall', 'il_ferne_clyffe_s_p', 'il_ferne_clyffe_state_park'),
  ('il_hole_the', 'il_ferne_clyffe_s_p', 'il_ferne_clyffe_state_park'),
  ('il_main_wall', 'il_ferne_clyffe_s_p', 'il_ferne_clyffe_state_park'),
  ('il_waterfall_trail', 'il_ferne_clyffe_s_p', 'il_ferne_clyffe_state_park');

create temp table m_drop_area(id text primary key, into_area text not null, ord int not null) on commit drop;
insert into m_drop_area values
  ('md_north_wall_rocky_island', 'md_rocky_island_north_end', 0),
  ('wa_capitol_hill_climbs', 'wa_trinity_lutheran_church', 1),
  ('va_lewis_larus_park_climbs', 'va_redheaded_step_brother', 2),
  ('co_southeast_face_3', 'co_southeast_face_aka_the_cirque', 3),
  ('md_sherwin_island_cupids_bower', 'md_cupids_bower', 4),
  ('il_ferne_clyffe_s_p', 'il_ferne_clyffe_state_park', 5);

create temp table m_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
-- (m_rename: none in this plan)

create temp table m_new_area(id text primary key, name text not null, parent_id text not null, final_parent text not null, area_type text, region text, lat double precision, lng double precision) on commit drop;
-- (m_new_area: none in this plan)

create temp table m_pin(id text primary key, lat double precision not null, lng double precision not null, approx boolean not null, from_lat double precision, from_lng double precision) on commit drop;
-- (m_pin: none in this plan)

create temp table m_junk(id text primary key, area_id text not null, name text not null) on commit drop;
-- (m_junk: none in this plan)

-- every ancestor of every touched area, read BEFORE anything moves (old and new ancestors both)
create temp table m_recount on commit drop as
  select distinct a.id from areas a join areas t on a.path @> t.path
   where t.id in ('md_north_wall_rocky_island', 'md_rocky_island_north_end', 'wa_capitol_hill_climbs', 'wa_trinity_lutheran_church', 'va_lewis_larus_park_climbs', 'va_redheaded_step_brother', 'co_southeast_face_3', 'co_southeast_face_aka_the_cirque', 'md_sherwin_island_cupids_bower', 'md_cupids_bower', 'il_ferne_clyffe_s_p', 'il_ferne_clyffe_state_park', 'ar_down_under_wall', 'ar_outback_wall', 'ar_seed_wall', 'ca_lower_cathedral_west', 'ca_lower_cathedral_rock', 'co_c_the_time_zone', 'co_futurescape_wall_roof_area', 'co_cubicle_crag', 'co_shadowfax', 'id_northeast_wall', 'id_east_wall', 'ma_technology_boulder', 'ma_goose_cove_reservoir_boulders_western_side', 'ma_white_boulder_3', 'ma_central_block_2', 'mi_cliff_drive_roped', 'mi_cliff_dr_keweenaw_county', 'mn_fox_s_den_the', 'mn_south_hartley_riverside', 'mo_walrus_ledge', 'mo_black_snake_area', 'nh_3_grunge_wall', 'nh_echo_crag_ice_climbs', 'ny_left_of_ladder', 'ny_firecamp_wall', 'tx_tailgate_party_wall', 'tx_three_gray_faces', 'wa_j_tunheim', 'wa_north_norwegian_buttress', 'al_point_boulders_highlife_boulder', 'al_point_boulders_crown_boulder', 'ar_wrangler_wall', 'ar_wall_of_calamity', 'ca_negativity_slabs', 'ca_negativity_cave_the', 'ca_hand_traverse_boulder', 'ca_mortar_rock', 'ca_hawks_lunch_boulder', 'ca_parking_lot_boulder_7', 'wa_yosemite_highball_boulder', 'wa_jy_crag', 'ca_main_wall_lower_left', 'ca_main_wall_5', 'co_winterfest_wall', 'co_hot_spot_area', 'co_cloud_shadow', 'co_golf_club_boulder', 'mn_pit_aka_arm_pit_the', 'mn_pit_the', 'ca_cattle_pocket_the', 'ca_tuning_in_tokyo_tower', 'tx_small_potatoes_the', 'tx_big_time_the', 'mo_beginner_chimney_buttress', 'mo_waylayed_buttress', 'nv_classic_rock_right_sw', 'nv_classic_rock_wall_climbs', 'ut_redrum', 'ut_climber_s_choice_wall', 'wa_full_or_nearly_wall_routes', 'wa_central_wall_area', 'wy_east_corner', 'wy_pretzl_wall', 'bc_the_balcony_sector', 'bc_penthouse', 'ca_anti_chrysler_boulder', 'ca_glavnys_gallows', 'ga_police_brutality', 'ga_asphalt_boulders', 'ny_6_the_tower_wall', 'ny_7_sunny_picnics', 'ak_lower_walls', 'ak_upper_center_wall', 'az_sean_s_wall', 'az_co_op_crack_area', 'ca_intersection_rock_west_and_south_faces', 'ca_intersection_rock_climbs', 'co_southwest_tr', 'co_west_side_lower_buttress', 'az_echo_canyon_wall', 'az_camel_s_ear', 'ca_big_kipper_boulder', 'ca_boneless_herring_boulder', 'ca_6_middle_aged_wall', 'ca_main_wall_left', 'il_scout_slabs', 'il_main_wall', 'nv_black_warm_up_boulders', 'nv_warm_up_boulders_main', 'wy_upper_tier_3', 'wy_moonstone_the', 'wy_south_and_east_faces', 'wy_durrance_approach', 'ca_main_wall_15', 'ca_lunch_rock', 'ok_08_the_grunt_chamber', 'ok_09_watch_me_wall', 'tx_factor_boulder', 'tx_grapevine_hills_routes', 'az_the_camels_nose', 'az_western_walls', 'il_f_dynasty_wall', 'il_g_the_munchkin_boulder', 'nh_4_wiessner_route_area', 'nh_3_dedication_area', 'wa_martian_slab', 'wa_upper_martian_slab', 'ca_upper_northeast_buttress', 'ca_b_north_face', 'co_battleship_block', 'co_isolation_block', 'co_grocery_store_walls_the', 'co_grocery_store_wall_bouldering', 'tx_ripe_boulders', 'nh_06_diesel_boulder', 'nh_guide_s_wall_boulders', 'tx_split_rocks', 'tx_lower_balcony', 'ca_death_star_cave', 'ca_cow_skull_boulder', 'tx_warrior_wall', 'tx_weir_dam_sector', 'wa_dana_s_arch_area', 'wa_left_of_earwax', 'al_e_kill_taker', 'al_barn_area', 'ca_tower_two_area', 'ca_playground_area_the_2', 'wa_chickenhead_rock', 'wa_other_rocks', 'sd_guardian_the', 'sd_ered_lithui', 'ar_walls_of_moria', 'ar_arcade_the', 'ca_east_wall_south_end_chesire_for_president_area', 'ca_east_wall_inner_exorcist_area', 'co_mba_buttress', 'co_overhang_area', 'tn_north_clear_creek_2', 'tn_blue_sky_buttress', 'tn_buena_vista', 'tn_high_point', 'wa_eddie_wall', 'co_pebble_boulder', 'co_amphitheater_s_backside', 'ga_middle_blocks', 'ga_zahnd_natural_area_climbs', 'wa_east_gibralter', 'wa_gibralter_rocks_climbs', 'co_mt_blue_sky_formerly_mount_evans_north_face', 'co_mt_blue_sky_formerly_mount_evans_mixed_couloirs', 'az_warm_up', 'az_laser_wall', 'wi_big_red_2', 'wi_dam_boulders_2', 'az_piranha_flats_east', 'az_road_area_2', 'wa_oppression_ledge_area', 'id_block_the', 'id_lower_ledge_area', 'ut_right_side_cragging', 'ut_day_canyon_cragging_routes', 'ar_nasty_wall', 'ar_bleeder_boulder', 'ca_ugly_arete_boulder', 'ca_phobos_deimos_cliff', 'ma_mormon_hollow_right_side', 'ma_mormon_hollow_climbs', 'ut_bioturbation_wall', 'ut_way_rambo', 'va_egg_boulder_the', 'va_james_river_park_system', 'ri_lost_crag', 'ri_poison_ivy_wall', 'wa_purina_crags', 'wa_careno_crag', 'al_temp_hp40', 'pa_cave_the', 'pa_herr_brothers', 'az_east_face_4', 'az_rappel_rock_2_climbs', 'nv_pyramid', 'nv_lava_boulder', 'nh_7_flume_silver_cascades_crawford_notch', 'nh_06_trestle_top_of_notch_ice', 'tn_bread_and_butter_boulders', 'tn_rustoleum_boulder', 'co_no_country_for_old_manhands_boulder', 'co_quarry_the_2', 'ma_pipefitter_boulder', 'ma_queen_s_row_boulders', 'co_lower_animal_world', 'co_coney_island', 'ar_cactus_wall', 'ar_natural_disaster_area', 'ut_fin_wall', 'ut_public_service_wall', 'co_tiara_rado_south', 'co_tiara_rado', 'co_the_crestones', 'co_crestone_needle', 'sd_happiness_is_water', 'sd_journeyman', 'or_sappy_boulder', 'or_main_smith_rock_area', 'wa_punk_rock', 'wa_lower_castle', 'co_monument_canyon', 'co_fruita_canyon', 'co_other_areas', 'or_east_side_2', 'or_south_side', 'nj_entrance_boulders', 'nj_garrett_mountain', 'az_tsefnaeb_dome', 'az_worm_dome_tsef_naeb_and_murray_canyon', 'co_cali_cave', 'co_wicked_cave_the', 'az_hole_in_the_rock', 'az_papago_park_climbs', 'or_fireplace_boulder', 'ut_reptilian_wall', 'ut_first_switchback', 'nh_4_mt_webster_winter_ice_mixed', 'nh_unsorted_crawford_notch_routes', 'wa_b_canopy_crag', 'wa_world_wall', 'ma_aa_upper_tier', 'ma_rose_ledge_climbs', 'ut_circus_wall_2', 'ut_critic_s_choice', 'ma_jeep_boulders', 'ma_boxcar_boulder', 'nv_scary_make_up_boulder', 'nv_mecca_climbs', 'nv_bear_cave', 'az_boulder_canyon', 'tx_tidal_wave_boulder', 'tx_hostility_boulders_aka_ham_creek_park', 'wa_billy_goat_bluff', 'wa_clamshell_cave_climbs', 'wa_upper_goat_dome', 'tn_lower_suck', 'tn_prentice_cooper_bouldering', 'wa_main_peak', 'wa_tepeh_towers');

do $$ declare n int; begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog: nothing to fold.
  select count(*) into n from areas where id in (select id from m_drop_area);
  if n = 0 then raise notice '0285: no catalog, nothing to fold'; return; end if;
  if n <> 6 then raise exception '0285: expected 6 copy areas, found %', n; end if;
  -- the tree must still be the one the plan read
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.from_area;
  if n <> 2 then raise exception '0285: % of 2 climbs are where the plan found them', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep join routes o on o.id = m.drop_id;
  if n <> 157 then raise exception '0285: % of 157 merge pairs still exist', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.from_area;
  if n <> 5 then raise exception '0285: % of 5 sub-areas are where the plan found them', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.from_name;
  if n <> 0 then raise exception '0285: % of 0 renames still carry the planned name', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.from_name;
  if n <> 0 then raise exception '0285: % of 0 climb renames still carry the planned name', n; end if;
  select count(*) into n from areas where id in (select id from m_new_area);
  if n > 0 then raise exception '0285: % of the new areas already exist', n; end if;
  select count(*) into n from m_pin m join areas a on a.id = m.id
   where a.lat is not distinct from m.from_lat and a.lng is not distinct from m.from_lng;
  if n <> 0 then raise exception '0285: % of 0 pins are where the plan read them', n; end if;
  select count(*) into n from m_junk j join routes r on r.id = j.id and r.area_id = j.area_id and r.name = j.name;
  if n <> 0 then raise exception '0285: % of 0 junk rows are where they were read', n; end if;
  -- every climb on a copy is accounted for
  select count(*) into n from routes r join m_drop_area d on d.id = r.area_id
   where r.id not in (select id from m_move) and r.id not in (select drop_id from m_merge);
  if n > 0 then raise exception '0285: % climbs on a copy are not in the plan', n; end if;
  select count(*) into n from areas a join m_drop_area d on d.id = a.parent_id
   where a.id not in (select id from m_reparent) and a.id not in (select id from m_drop_area);
  if n > 0 then raise exception '0285: % sub-areas of a copy are not in the plan', n; end if;
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
  if n > 0 then raise exception '0285: % climber rows point at a row this deletes — stop and repoint them', n; end if;
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
  if n > 0 then raise exception '0285: % climber rows still point at a copy', n; end if;
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
  if n > 0 then raise exception '0285: % copy areas were not emptied', n; end if;
  select count(*) into n from routes where id in (select drop_id from m_merge union select id from m_junk);
  if n > 0 then raise exception '0285: % merged or junk climbs survived', n; end if;
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.to_area;
  if n <> 2 then raise exception '0285: % of 2 climbs moved', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.to_name;
  if n <> 0 then raise exception '0285: % of 0 renames landed', n; end if;
  select count(*) into n from m_new_area m join areas a on a.id = m.id and a.parent_id = m.final_parent and a.route_count > 0;
  if n <> 0 then raise exception '0285: % of 0 new areas are in place, holding their climbs', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.to_area;
  if n <> 5 then raise exception '0285: % of 5 sub-areas re-parented', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.to_name;
  if n <> 0 then raise exception '0285: % of 0 climb renames landed', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep where m.grade is not null and (k.grade <> m.grade or k.grade_num is distinct from m.grade_num);
  if n > 0 then raise exception '0285: % merged grades or grade_nums did not land', n; end if;
  select count(*) into n from m_pin m join areas a on a.id = m.id and a.lat = m.lat and a.lng = m.lng and a.coords_approx = m.approx;
  if n <> 0 then raise exception '0285: % of 0 pins landed', n; end if;
  -- no area holds climbs AND sub-areas
  select count(*) into n from areas a where a.id in (select id from m_recount)
     and exists (select 1 from routes r where r.area_id = a.id) and exists (select 1 from areas s where s.parent_id = a.id);
  if n > 0 then raise exception '0285: % areas hold climbs and sub-areas', n; end if;
end $$;

commit;
