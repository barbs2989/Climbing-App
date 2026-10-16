-- 0261: one place, one area — a parallel tree's COPY of a crag folds into it; a crag's own BOULDERING
-- or ICE section NESTS inside it ("Trapps Bouldering" now under "The Trapps").
--
-- Asked: "keep going" (2026-10-07) under "fold into 1 area, same for everything else, i don't want
-- duplicates". Two classes left after 0256 and 0259 (#2265):
--   * check:area-duplicates' unlisted pairs under DIFFERENT parents (red daily since 2026-10-05, most exposed
--     by the sort-label renames): a parallel tree's copy ("Camp 4 Boulders" under Yosemite Valley Bouldering
--     beside "Camp 4 Area"; "Mt. Willard (Ice)" beside "Mt. Willard"; Mount Blanca's ice routes on a second
--     "Mount Blanca" 93 km off Blanca Peak) — FOLDED, 0221's rule; a copy whose shape differs (a flat list
--     beside one with walls) nests instead. Generic face names on different formations ("Main Face", "North
--     Face", 0.6-2.8 km, nothing shared) read as DIFFERENT and listed in the guard's baseline.
--   * a crag beside its own discipline section under ONE parent ("The Trapps" 508 / "Trapps Bouldering" 260).
--     The owner, asked 2026-10-07: "Nest it" — the section moves INSIDE the crag, its own name kept (#2265
--     retired bare "Bouldering" names). Where the crag lists its climbs flat, they move first into
--     "<Crag> Routes" (24 such, #2265's naming), since an area holds climbs OR sub-areas. Where both are
--     flat lists the problems join the crag's list; an EMPTY twin is deleted. Bouldering-vs-ice sub-areas of
--     one mountain (neither is the crag itself) and 6 unsure pairs are left as they are.
-- Every pair READ (job fold3/verdicts.json, each with its evidence; 5 more read after 0259 moved them).
--   * 52 sections nested; 19 climbs filed in BOTH the crag and its section merged (same name, same
--     grade; the copy beside its boulder kept). No contribution, log, photo, topo or list on any deleted one.
--   * 435 climbs moved, 119 sub-areas re-parented, 39 copies deleted, children first.
-- ABORTS if climber data points at a climb deleted, or if the live tree no longer matches the plan.
-- Plan: the job's fold3/plan.mjs (log reviewed); rollback: scripts/data/area-discipline-nests-rollback.json.

begin;

create temp table m_merge(keep text not null, drop_id text primary key, grade text, disc text) on commit drop;
insert into m_merge values
  ('ar_jonah_2', 'ar_jonah', null, null),
  ('co_atomic_test_site', 'co_atomic_energy_bouldering_atomic_test_site', null, null),
  ('co_mushroom_cloud', 'co_atomic_energy_bouldering_mushroom_cloud', null, null),
  ('co_pick_pocket_3', 'co_atomic_energy_bouldering_pick_pocket', null, null),
  ('co_pocket_change_3', 'co_atomic_energy_bouldering_pocket_change', null, null),
  ('co_rancho_deluxe', 'co_atomic_energy_bouldering_rancho_deluxe', null, null),
  ('co_finger_fusion', 'co_atomic_energy_bouldering_finger_fusion', null, null),
  ('co_china_syndrome', 'co_atomic_energy_bouldering_china_syndrome', null, null),
  ('co_the_dome_frozen_black_plague', 'co_dome_the_5_frozen_black_plague', null, null),
  ('tx_show_stopper_2', 'tx_show_stopper', null, null),
  ('tx_dab_factor_2', 'tx_dab_factor', null, null),
  ('tx_fear_factor_2', 'tx_fear_factor', null, null),
  ('tx_two_on_the_vine_2', 'tx_two_on_the_vine', null, null),
  ('tx_md_20_20_3', 'tx_md_20_20_2', null, null),
  ('tx_free_parking_2', 'tx_free_parking', null, null),
  ('tx_vine_ripe_2', 'tx_vine_ripe', null, null),
  ('tx_sun_ripe_2', 'tx_sun_ripe', null, null),
  ('tx_upper_deck_2', 'tx_upper_deck', null, null),
  ('wy_hueco_simulator', 'wy_hueco_simulator_boulder_2_hueco_simulator', null, null);

create temp table m_route_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
-- (m_route_rename: none in this plan)

create temp table m_move(id text primary key, from_area text not null, to_area text not null, bypass boolean not null) on commit drop;
insert into m_move values
  ('ca_penthouse_cracks', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_bobcat_crack', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_oak_tree_flake', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_bay_tree_crack', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_swan_slab_chimney', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_ugly_duckling_3', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_funge_on_munge', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_hanging_flake', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_grant_s_crack', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_bobby_s_lobby', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_v_crack_2', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_goat_for_it', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_oak_tree_crack', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_unknown_arete_4', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_lena_s_lieback', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_pin_scar_seams', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_penelope_s_problem', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_swan_slab_squeeze', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_claude_s_delight', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_aid_route', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_patio_cracks_center', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_swan_slab_gully', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_a_swan_slab_into_the_wild', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_unnamed_thin_crack', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_seamilicious', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_west_slabs', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_unnamed_face_7', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_5_6_chimney_above_grant_s', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_patio_cracks_right', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_patio_cracks_left', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_a_swan_slab_when_the_going_gets_thin_i_pound_in_a_pin', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_a_swan_slab_jl_jesus_loves_or_just_lettuce', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_a_swan_slab_psychopath', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_a_swan_slab_yose_university', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ca_a_swan_slab_cosmic_dance_of_the_flying_manzanitta', 'ca_a_swan_slab', 'ca_a_swan_slab_routes', false),
  ('ny_village_idiot', 'ny_golden_wall_area', 'ny_s_the_golden_wall', false),
  ('ny_mad_lion', 'ny_golden_wall_area', 'ny_s_the_golden_wall', false),
  ('ny_golden_wall_area_piranha_head_soup', 'ny_golden_wall_area', 'ny_s_the_golden_wall', false),
  ('or_lets_face_it', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_peking', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_bay_of_pigs', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_papillion', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_flex', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_sole_survivor', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_breakdown_in_paradise', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_dirty_pinkos', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_orgasmophoria', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_super_slab', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_pop_art', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_amphetamine_grip', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_moscow', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_i_almost_died', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_ride_the_lightning', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_phantasmagoria', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_commie_pinkos', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_a_stroke_of_brilliance', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_dances_with_clams', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_animal_farm', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_gulag_archipelago', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_titanium_jag', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_chairman_mao_s_little_red_book', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_fingers_of_fate', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_straight_outta_peking', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_bill_s_flake', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_finger_puppet', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_burma_buttress', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_havana', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_chouinard_s_crack_1st_half_pitch_of_peking', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_u_red_wall_incognito', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_u_red_wall_iron_curtain', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('or_u_red_wall_helter_skelter_direct', 'or_u_red_wall', 'or_u_red_wall_routes', false),
  ('qc_l_aiguille_boulders_traverse_de_l_aiguille', 'qc_l_aiguille_boulders', 'qc_b_l_aiguille', false),
  ('qc_l_aiguille_boulders_traverse_d_ob_lix', 'qc_l_aiguille_boulders', 'qc_b_l_aiguille', false),
  ('qc_l_aiguille_boulders_ob_lix', 'qc_l_aiguille_boulders', 'qc_b_l_aiguille', false),
  ('wi_the_nipple', 'wi_old_sandstone_boulders', 'wi_1_old_sandstone', false),
  ('wi_pebbles', 'wi_new_sandstone_bouldering', 'wi_2_new_sandstone_area', false),
  ('wi_show_me_your_houses', 'wi_new_sandstone_bouldering', 'wi_2_new_sandstone_area', false),
  ('wi_streak_dyno', 'wi_new_sandstone_bouldering', 'wi_2_new_sandstone_area', false),
  ('wi_the_most_to_say', 'wi_new_sandstone_bouldering', 'wi_2_new_sandstone_area', false),
  ('wi_project_3', 'wi_new_sandstone_bouldering', 'wi_2_new_sandstone_area', false),
  ('wi_k_mart_starter_pack', 'wi_new_sandstone_bouldering', 'wi_2_new_sandstone_area', false),
  ('wi_bad_corner', 'wi_new_sandstone_bouldering', 'wi_2_new_sandstone_area', false),
  ('wi_unknown_v2', 'wi_new_sandstone_bouldering', 'wi_2_new_sandstone_area', false),
  ('wi_golden_face', 'wi_new_sandstone_bouldering', 'wi_2_new_sandstone_area', false),
  ('wi_where_s_the_flavor', 'wi_new_sandstone_bouldering', 'wi_2_new_sandstone_area', false),
  ('ak_present_tentse', 'ak_sky_pilot', 'ak_sky_pilot_routes', false),
  ('ak_turecki', 'ak_sky_pilot', 'ak_sky_pilot_routes', false),
  ('ak_sky_pilot_2_captain_hook', 'ak_sky_pilot', 'ak_sky_pilot_routes', false),
  ('ak_sky_pilot_2_auto_pilot', 'ak_sky_pilot', 'ak_sky_pilot_routes', false),
  ('ak_catalyst_2', 'ak_sky_pilot', 'ak_sky_pilot_routes', false),
  ('ak_herbalistic_vision', 'ak_sky_pilot', 'ak_sky_pilot_routes', false),
  ('ak_sky_pilot', 'ak_sky_pilot', 'ak_sky_pilot_routes', false),
  ('ak_remote_control', 'ak_sky_pilot', 'ak_sky_pilot_routes', false),
  ('ak_euthanasia_corner', 'ak_sky_pilot', 'ak_sky_pilot_routes', false),
  ('ak_left_ramp', 'ak_sky_pilot', 'ak_sky_pilot_routes', false),
  ('ak_copilot', 'ak_sky_pilot', 'ak_sky_pilot_routes', false),
  ('ak_project_5_13_2', 'ak_sky_pilot', 'ak_sky_pilot_routes', false),
  ('ak_20_20', 'ak_sky_pilot', 'ak_sky_pilot_routes', false),
  ('ar_candy_mountain_boulders_phatboi_arete', 'ar_candy_mountain_boulders', 'ar_candy_mountain', false),
  ('ar_rock_candy_left', 'ar_candy_mountain_boulders', 'ar_candy_mountain', false),
  ('ar_rock_candy_right', 'ar_candy_mountain_boulders', 'ar_candy_mountain', false),
  ('ar_lumberjack_6_pack', 'ar_candy_mountain_boulders', 'ar_candy_mountain', false),
  ('ar_horizontal_highway', 'ar_candy_mountain_boulders', 'ar_candy_mountain', false),
  ('ar_sugar_high', 'ar_candy_mountain_boulders', 'ar_candy_mountain', false),
  ('ar_warmup_cracks', 'ar_candy_mountain_boulders', 'ar_candy_mountain', false),
  ('ar_patient_pupil', 'ar_candy_mountain_boulders', 'ar_candy_mountain', false),
  ('ar_seeping_eye_sockets', 'ar_candy_mountain_boulders', 'ar_candy_mountain', false),
  ('ar_charlie_the_unicorn', 'ar_candy_mountain_boulders', 'ar_candy_mountain', false),
  ('ar_fizzy_lift', 'ar_candy_mountain_boulders', 'ar_candy_mountain', false),
  ('ar_africa_strong', 'ar_candy_mountain_boulders', 'ar_candy_mountain', false),
  ('ar_booster_seat', 'ar_candy_mountain_boulders', 'ar_candy_mountain', false),
  ('ar_taste_the_rainbow', 'ar_candy_mountain_boulders', 'ar_candy_mountain', false),
  ('ar_sex_boulder_bouldering_neutronica', 'ar_sex_boulder_bouldering', 'ar_sex_boulder_the', false),
  ('ar_sex_boulder_bouldering_project', 'ar_sex_boulder_bouldering', 'ar_sex_boulder_the', false),
  ('ar_sex_boulder_bouldering_tatiana', 'ar_sex_boulder_bouldering', 'ar_sex_boulder_the', false),
  ('ar_ab_lounge_direct', 'ar_sex_boulder_bouldering', 'ar_sex_boulder_the', false),
  ('ar_electralica', 'ar_sex_boulder_bouldering', 'ar_sex_boulder_the', false),
  ('ar_turd_patsy', 'ar_sex_boulder_bouldering', 'ar_sex_boulder_the', false),
  ('ar_rusty_leg', 'ar_sex_boulder_bouldering', 'ar_sex_boulder_the', false),
  ('ar_pro_ho', 'ar_sex_boulder_bouldering', 'ar_sex_boulder_the', false),
  ('ar_ab_lounge', 'ar_sex_boulder_bouldering', 'ar_sex_boulder_the', false),
  ('ar_a_dream_come_true', 'ar_sex_boulder_bouldering', 'ar_sex_boulder_the', false),
  ('ca_cub_scout', 'ca_boy_scout_wall_bouldering', 'ca_boy_scout_wall_2', false),
  ('ca_and_i_m_okay', 'ca_crystal_lake_boulders', 'ca_crystal_lake_crag', false),
  ('ca_salacious_crumb', 'ca_crystal_lake_boulders', 'ca_crystal_lake_crag', false),
  ('ca_tusken_raider', 'ca_crystal_lake_boulders', 'ca_crystal_lake_crag', false),
  ('ca_carbonite', 'ca_crystal_lake_boulders', 'ca_crystal_lake_crag', false),
  ('ca_blood_pact', 'ca_crystal_lake_boulders', 'ca_crystal_lake_crag', false),
  ('ca_tk421', 'ca_crystal_lake_boulders', 'ca_crystal_lake_crag', false),
  ('ca_sanjuro', 'ca_crystal_lake_boulders', 'ca_crystal_lake_crag', false),
  ('ca_zip_zap_rap', 'ca_crystal_lake_boulders', 'ca_crystal_lake_crag', false),
  ('ca_manny_boffins', 'ca_crystal_lake_boulders', 'ca_crystal_lake_crag', false),
  ('ca_the_fett_arete', 'ca_crystal_lake_boulders', 'ca_crystal_lake_crag', false),
  ('ca_kawabatake', 'ca_crystal_lake_boulders', 'ca_crystal_lake_crag', false),
  ('ca_muto_ryu', 'ca_crystal_lake_boulders', 'ca_crystal_lake_crag', false),
  ('ca_seams_legit', 'ca_crystal_lake_boulders', 'ca_crystal_lake_crag', false),
  ('ca_trench_run', 'ca_crystal_lake_boulders', 'ca_crystal_lake_crag', false),
  ('ca_crystal_range_traverse', 'ca_desolation_wilderness', 'ca_desolation_wilderness_routes', false),
  ('ca_the_chute', 'ca_tenaja_falls', 'ca_tenaja_falls_routes', false),
  ('ca_corte_la_mano', 'ca_tenaja_falls', 'ca_tenaja_falls_routes', false),
  ('ca_el_vaquero', 'ca_tenaja_falls', 'ca_tenaja_falls_routes', false),
  ('ca_the_triplets_of_terror', 'ca_tenaja_falls', 'ca_tenaja_falls_routes', false),
  ('ca_stop_n_go', 'ca_tenaja_falls', 'ca_tenaja_falls_routes', false),
  ('co_the_manhattan_project', 'co_atomic_energy_bouldering', 'co_atomic_energy_crag', false),
  ('co_atomic_energy_bouldering_coyote_corner', 'co_atomic_energy_bouldering', 'co_atomic_energy_crag', true),
  ('co_atomic_energy_bouldering_joy_stick', 'co_atomic_energy_bouldering', 'co_atomic_energy_crag', false),
  ('co_atomic_energy_bouldering_fried_chicken', 'co_atomic_energy_bouldering', 'co_atomic_energy_crag', false),
  ('co_atomic_energy_bouldering_dietary_supplement', 'co_atomic_energy_bouldering', 'co_atomic_energy_crag', false),
  ('co_atomic_energy_bouldering_fire_storm', 'co_atomic_energy_bouldering', 'co_atomic_energy_crag', false),
  ('co_atomic_energy_bouldering_fail_safe', 'co_atomic_energy_bouldering', 'co_atomic_energy_crag', false),
  ('co_atomic_energy_bouldering_guns_or_butter', 'co_atomic_energy_bouldering', 'co_atomic_energy_crag', false),
  ('co_atomic_energy_bouldering_covert_action', 'co_atomic_energy_bouldering', 'co_atomic_energy_crag', false),
  ('co_dogs_in_space', 'co_campsite_10_bouldering_area', 'co_campsite_10', false),
  ('co_georgetown_arete_g_t_a', 'co_curve_block', 'co_curve_block_routes', false),
  ('co_curve_block_gold_in_shadow', 'co_curve_block', 'co_curve_block_routes', false),
  ('co_project_17', 'co_curve_block', 'co_curve_block_routes', false),
  ('co_every_which_way_but_loose_2', 'co_curve_block', 'co_curve_block_routes', false),
  ('co_signs_of_life_2', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_cozyhang', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_cozyhang_alt_finish', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_east_face_farthest_right', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_the_owl_direct', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_cozyhang_10a_variation', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_dome_the_2_yiddie_lover', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_dome_the_2_dogs_three_different_ones', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_the_dome_frozen_black_plague', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_east_slab', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_direct', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_cozy_dyno', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_prelude_to_king_kong', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_groove', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_the_owl', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_pinnacle_2', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_black_plague', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_super_squeeze', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_left_edge', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_the_umph_slot', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_pussy_cat', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_east_face_far_right', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_gorilla_s_delight', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_cozyhang_out', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_east_of_the_sun', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_familiar_face', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_dome_girdle', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_east_slab_east', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_cozy_overhang', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_e_of_east_slab_east', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_evening_stroll_2', 'co_dome_the_2', 'co_dome_the_2_routes', false),
  ('co_monkey_skull_boulders_idrowoman', 'co_monkey_skull_boulders', 'co_monkey_skull_the', false),
  ('co_monkey_skull_boulders_the_hatchet', 'co_monkey_skull_boulders', 'co_monkey_skull_the', false),
  ('ma_revolver_reach', 'ma_hangover_the', 'ma_hangover_the_routes', false),
  ('ma_salt', 'ma_hangover_the', 'ma_hangover_the_routes', false),
  ('ma_certain_fate', 'ma_hangover_the', 'ma_hangover_the_routes', false),
  ('ma_hangover_the_secrets', 'ma_hangover_the', 'ma_hangover_the_routes', false),
  ('ma_hangover_the_academy_fight', 'ma_hangover_the', 'ma_hangover_the_routes', false),
  ('ma_unknown_3_2', 'ma_rafe_s_chasm_bouldering', 'ma_rafe_s_chasm', false),
  ('ma_unknown_4', 'ma_rafe_s_chasm_bouldering', 'ma_rafe_s_chasm', false),
  ('ma_unknown_2_2', 'ma_rafe_s_chasm_bouldering', 'ma_rafe_s_chasm', false),
  ('ma_unknown_problem_1', 'ma_rafe_s_chasm_bouldering', 'ma_rafe_s_chasm', false),
  ('md_i_don_t_care_about_names', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_dirty_hooker', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_x_cubed', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_skippy_s_flapjack', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_dime_drop', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_crimp_lock_and_pop_it', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_x_squared', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_biception', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_back_alley_chris_cringle', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_y_equals_x', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_fruit_cake', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_tetris', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_finger_fillet', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_bad_irish_accent', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_wreck_tangle', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_critter_cracks', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_dirt_burglar', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_escape_from_alcatrez', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_happy_cat', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_ramped_up', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_slinky_and_the_slime_mold', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_slot_party', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_turbo_thrush', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_green_toast', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_crescent_glide', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_davis_special', 'md_balcony_rock_boulders', 'md_balcony_rock', false),
  ('md_the_sherpa_connection', 'md_white_rocks', 'md_white_rocks_routes', false),
  ('md_sugar_spice', 'md_white_rocks', 'md_white_rocks_routes', false),
  ('md_dogs_of_war', 'md_white_rocks', 'md_white_rocks_routes', false),
  ('md_where_eagles_dare', 'md_white_rocks', 'md_white_rocks_routes', false),
  ('md_green_thumb', 'md_white_rocks', 'md_white_rocks_routes', false),
  ('md_lucifer', 'md_white_rocks', 'md_white_rocks_routes', false),
  ('md_thumbthing_else', 'md_white_rocks', 'md_white_rocks_routes', false),
  ('md_hubble', 'md_white_rocks', 'md_white_rocks_routes', false),
  ('md_phasers_on_stun', 'md_white_rocks', 'md_white_rocks_routes', false),
  ('md_luciifer_direct', 'md_white_rocks', 'md_white_rocks_routes', false),
  ('md_force_ten_direct_finish', 'md_white_rocks', 'md_white_rocks_routes', false),
  ('md_force_ten', 'md_white_rocks', 'md_white_rocks_routes', false),
  ('md_gap_of_rohan', 'md_white_rocks', 'md_white_rocks_routes', false),
  ('md_climber_sensitivity_training_wall', 'md_white_rocks', 'md_white_rocks_routes', false),
  ('nd_that_s_da_beta_ble', 'nd_sentinel_butte', 'nd_sentinel_butte_routes', false),
  ('nd_american_black_eagle', 'nd_sentinel_butte', 'nd_sentinel_butte_routes', false),
  ('nd_hell_s_heaven', 'nd_sentinel_butte', 'nd_sentinel_butte_routes', false),
  ('nd_the_great_roof', 'nd_sentinel_butte', 'nd_sentinel_butte_routes', false),
  ('nd_powerline_crack', 'nd_sentinel_butte', 'nd_sentinel_butte_routes', false),
  ('nd_volkswagen_crack', 'nd_sentinel_butte', 'nd_sentinel_butte_routes', false),
  ('nd_unnamed_5_8', 'nd_sentinel_butte', 'nd_sentinel_butte_routes', false),
  ('nd_unknown_5_8', 'nd_sentinel_butte', 'nd_sentinel_butte_routes', false),
  ('nd_frodosynthesis', 'nd_square_butte_bouldering', 'nd_square_butte', false),
  ('nd_there_and_crack_again', 'nd_square_butte_bouldering', 'nd_square_butte', false),
  ('nh_oh_hell', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_squeeze_play', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_the_crucible', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_curiosity', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_devil_s_in_the_details', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_the_immaculate_constriction', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_oh_god', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_crossroads', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_dubuko', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_strong_john_s_shelf', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_homebase_aka_bring_your_monkey_along', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_bowltender_to_the_b_team', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_the_pretty_flake', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_the_edge_3', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_devil_s_den_2_the_arch', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_devil_s_den_2_unnamed_5', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_book_o_fools', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_sympathy_for_the_devil', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_devil_s_den_2_morning_after', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_devil_s_den_2_never_yield', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_el_rayo_x', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_easier_said_than_done', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_maximum_heat', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_speckman_s_originally_named_speckman_s_first_aid_climb', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_friend_of_the_devil_2', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_exorcist', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_bates_route', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_heat_wave', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_lycra_sanction', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_devil_s_den_2_dying_to_tan', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nh_devil_s_den_2_wedge', 'nh_devil_s_den_2', 'nh_devil_s_den_2_routes', false),
  ('nm_mr_personality', 'nm_questa_dome_bouldering', 'nm_questa_dome_2', false),
  ('nv_sport_wall_ice_mixed_white_lines', 'nv_sport_wall_ice_mixed', 'nv_sport_wall', false),
  ('ok_gum_shoe', 'ok_01_backside_boulders', 'ok_02_backside', false),
  ('ok_pulp_gription', 'ok_01_backside_boulders', 'ok_02_backside', false),
  ('ok_w_boulder', 'ok_01_backside_boulders', 'ok_02_backside', false),
  ('ok_you_slip_you_slide', 'ok_01_backside_boulders', 'ok_02_backside', false),
  ('ok_01_backside_boulders_ally_boulder', 'ok_01_backside_boulders', 'ok_02_backside', false),
  ('ok_01_backside_boulders_marxism', 'ok_01_backside_boulders', 'ok_02_backside', false),
  ('ok_01_backside_boulders_magic_mushroom', 'ok_01_backside_boulders', 'ok_02_backside', false),
  ('ok_01_backside_boulders_majestic_mushroom', 'ok_01_backside_boulders', 'ok_02_backside', false),
  ('ok_superpseudomasochisticexpeealodochous', 'ok_pear_and_apple', 'ok_pear_and_apple_routes', false),
  ('ok_too_steep_for_sheep', 'ok_pear_and_apple', 'ok_pear_and_apple_routes', false),
  ('ok_the_commanche', 'ok_pear_and_apple', 'ok_pear_and_apple_routes', false),
  ('ok_science_friction', 'ok_pear_and_apple', 'ok_pear_and_apple_routes', false),
  ('ok_a_free_pear_and_apple', 'ok_pear_and_apple', 'ok_pear_and_apple_routes', false),
  ('ok_a_farewell_to_arms', 'ok_pear_and_apple', 'ok_pear_and_apple_routes', false),
  ('ok_unknown_pear_and_apple_route', 'ok_pear_and_apple', 'ok_pear_and_apple_routes', false),
  ('ok_pear_and_apple_route', 'ok_pear_and_apple', 'ok_pear_and_apple_routes', false),
  ('pa_simplicity', 'pa_brown_rocks_bouldering', 'pa_brown_rocks_2', false),
  ('pa_marriage_license', 'pa_rim_rock', 'pa_rim_rock_routes', false),
  ('pa_girlish_figure', 'pa_rim_rock', 'pa_rim_rock_routes', false),
  ('pa_slippery_when_wet_2', 'pa_rim_rock', 'pa_rim_rock_routes', false),
  ('pa_stepping_stones', 'pa_rim_rock', 'pa_rim_rock_routes', false),
  ('pa_billboard', 'pa_rim_rock', 'pa_rim_rock_routes', false),
  ('pa_the_nose', 'pa_rim_rock', 'pa_rim_rock_routes', false),
  ('pa_rumple_stoneskin', 'pa_rim_rock', 'pa_rim_rock_routes', false),
  ('pa_leap_of_faith_3', 'pa_rim_rock', 'pa_rim_rock_routes', false),
  ('sd_pearl_necklace', 'sd_delicacy_wall', 'sd_delicacy_wall_routes', false),
  ('sd_fur_burger', 'sd_delicacy_wall', 'sd_delicacy_wall_routes', false),
  ('sd_fine_china', 'sd_delicacy_wall', 'sd_delicacy_wall_routes', false),
  ('sd_truffle_shuffle', 'sd_delicacy_wall', 'sd_delicacy_wall_routes', false),
  ('sd_the_whole_enchilada', 'sd_delicacy_wall', 'sd_delicacy_wall_routes', false),
  ('sd_bearded_clam', 'sd_delicacy_wall', 'sd_delicacy_wall_routes', false),
  ('sd_monkey_brain_stew', 'sd_delicacy_wall', 'sd_delicacy_wall_routes', false),
  ('sd_eat_em_and_smile', 'sd_delicacy_wall', 'sd_delicacy_wall_routes', false),
  ('sd_chewy_and_gooey', 'sd_delicacy_wall', 'sd_delicacy_wall_routes', false),
  ('sd_speck', 'sd_delicacy_wall', 'sd_delicacy_wall_routes', false),
  ('sd_canyon_caviar', 'sd_delicacy_wall', 'sd_delicacy_wall_routes', false),
  ('sd_delicacy_wall_kicking_the_bucket', 'sd_delicacy_wall', 'sd_delicacy_wall_routes', false),
  ('sd_delicacy_wall_foie_gras', 'sd_delicacy_wall', 'sd_delicacy_wall_routes', false),
  ('sd_delicacy_wall_rocky_mountain_oyster', 'sd_delicacy_wall', 'sd_delicacy_wall_routes', false),
  ('sd_stitching_the_seam', 'sd_needles_eye_bouldering', 'sd_needle_s_eye', false),
  ('sd_raw_edge', 'sd_needles_eye_bouldering', 'sd_needle_s_eye', false),
  ('sd_five_point_palm_exploding_heart', 'sd_needles_eye_bouldering', 'sd_needle_s_eye', false),
  ('sd_flamingo_drinker', 'sd_oltons_shoulder', 'sd_oltons_shoulder_routes', false),
  ('sd_olton_s_bulge', 'sd_oltons_shoulder', 'sd_oltons_shoulder_routes', false),
  ('sd_olton_s_shoulder_1936_original_route', 'sd_oltons_shoulder', 'sd_oltons_shoulder_routes', false),
  ('sd_flesh_for_lulu', 'sd_oval_office_the', 'sd_oval_office_the_routes', false),
  ('sd_squeeze_to_please', 'sd_oval_office_the', 'sd_oval_office_the_routes', false),
  ('sd_kate', 'sd_oval_office_the', 'sd_oval_office_the_routes', false),
  ('sd_executive_branch', 'sd_oval_office_the', 'sd_oval_office_the_routes', false),
  ('sd_just_say_no', 'sd_oval_office_the', 'sd_oval_office_the_routes', false),
  ('sd_air_force_2_0', 'sd_oval_office_the', 'sd_oval_office_the_routes', false),
  ('sd_air_force_one', 'sd_oval_office_the', 'sd_oval_office_the_routes', false),
  ('sd_the_first_lady', 'sd_profile', 'sd_profile_routes', false),
  ('sd_rash_act', 'sd_reardon_s_rock', 'sd_reardon_s_rock_routes', false),
  ('sd_cool_cats_and_kittens', 'sd_reardon_s_rock', 'sd_reardon_s_rock_routes', false),
  ('sd_the_shredder', 'sd_reardon_s_rock', 'sd_reardon_s_rock_routes', false),
  ('sd_birds', 'sd_reardon_s_rock', 'sd_reardon_s_rock_routes', false),
  ('sd_flowers_and_trees', 'sd_reardon_s_rock', 'sd_reardon_s_rock_routes', false),
  ('sd_pump_and_circumstance', 'sd_turtle_dome', 'sd_turtle_dome_routes', false),
  ('sd_finding_my_religion', 'sd_turtle_dome', 'sd_turtle_dome_routes', false),
  ('sd_losing_my_religion', 'sd_turtle_dome', 'sd_turtle_dome_routes', false),
  ('sd_balding_bob_ain_t_so_bold', 'sd_turtle_dome', 'sd_turtle_dome_routes', false),
  ('sd_slappin_ze_bass', 'sd_turtle_dome', 'sd_turtle_dome_routes', false),
  ('sd_juniper_tree', 'sd_turtle_dome', 'sd_turtle_dome_routes', false),
  ('sd_edge_of_da_light', 'sd_turtle_dome', 'sd_turtle_dome_routes', false),
  ('sd_in_search_of_the_holy_rail', 'sd_turtle_dome', 'sd_turtle_dome_routes', false),
  ('sd_big_tyme_arete', 'sd_turtle_dome', 'sd_turtle_dome_routes', false),
  ('sd_the_roof_2', 'sd_turtle_dome', 'sd_turtle_dome_routes', false),
  ('sd_road_to_nowhere_2', 'sd_turtle_dome', 'sd_turtle_dome_routes', false),
  ('tx_dihedral_boulders_blunt', 'tx_dihedral_boulders', 'tx_dihedral_the', false),
  ('tx_dihedral_boulders_soul_sinker', 'tx_dihedral_boulders', 'tx_dihedral_the', false),
  ('tx_dihedral_boulders_mochi', 'tx_dihedral_boulders', 'tx_dihedral_the', false),
  ('tx_dihedral_boulders_shorties', 'tx_dihedral_boulders', 'tx_dihedral_the', false),
  ('tx_dihedral_boulders_battle_cry', 'tx_dihedral_boulders', 'tx_dihedral_the', false),
  ('tx_gadiator', 'tx_grapevine_hills', 'tx_grapevine_hills_routes', false),
  ('tx_crowd_pleaser', 'tx_grapevine_hills', 'tx_grapevine_hills_routes', false),
  ('tx_mine_shaft', 'tx_grapevine_hills', 'tx_grapevine_hills_routes', false),
  ('tx_unripe', 'tx_grapevine_hills', 'tx_grapevine_hills_routes', false),
  ('tx_thin_line', 'tx_grapevine_hills', 'tx_grapevine_hills_routes', false),
  ('tx_intersection', 'tx_grapevine_hills', 'tx_grapevine_hills_routes', false),
  ('tx_fun_factor', 'tx_grapevine_hills', 'tx_grapevine_hills_routes', false),
  ('tx_ladrone', 'tx_urban_assault', 'tx_urban_assault_routes', false),
  ('tx_medicine_man', 'tx_urban_assault', 'tx_urban_assault_routes', false),
  ('tx_cell_block', 'tx_urban_assault', 'tx_urban_assault_routes', false),
  ('tx_starfish', 'tx_urban_assault', 'tx_urban_assault_routes', false),
  ('tx_plate_techtonics', 'tx_urban_assault', 'tx_urban_assault_routes', false),
  ('tx_urban_assault', 'tx_urban_assault', 'tx_urban_assault_routes', false),
  ('tx_closed_spelioantics', 'tx_urban_assault', 'tx_urban_assault_routes', false),
  ('tx_masada', 'tx_urban_assault', 'tx_urban_assault_routes', false),
  ('tx_buzzards_breath', 'tx_urban_assault', 'tx_urban_assault_routes', false),
  ('tx_urban_assault_mah_jong', 'tx_urban_assault', 'tx_urban_assault_routes', false),
  ('tx_urban_assault_manchild', 'tx_urban_assault', 'tx_urban_assault_routes', false),
  ('tx_urban_assault_fake_techtonics', 'tx_urban_assault', 'tx_urban_assault_routes', false),
  ('ut_unknown_aka_blood_diamond', 'ut_lake_point_crag', 'ut_lake_point_crag_routes', false),
  ('ut_tweedle_dumb', 'ut_lake_point_crag', 'ut_lake_point_crag_routes', false),
  ('ut_tweedle_dee', 'ut_lake_point_crag', 'ut_lake_point_crag_routes', false),
  ('ut_unknown_aka_blue_blood', 'ut_lake_point_crag', 'ut_lake_point_crag_routes', false),
  ('ut_unknown_aka_fault_line', 'ut_lake_point_crag', 'ut_lake_point_crag_routes', false),
  ('ut_unknown_aka_fearless', 'ut_lake_point_crag', 'ut_lake_point_crag_routes', false),
  ('ut_unknown_aka_cavern_conundrum', 'ut_lake_point_crag', 'ut_lake_point_crag_routes', false),
  ('ut_unknown_aka_nightmare_cracks', 'ut_lake_point_crag', 'ut_lake_point_crag_routes', false),
  ('ut_unknown_aka_the_red_left', 'ut_lake_point_crag', 'ut_lake_point_crag_routes', false),
  ('ut_unknown_aka_the_red_right', 'ut_lake_point_crag', 'ut_lake_point_crag_routes', false),
  ('ut_white_trash', 'ut_lake_point_crag', 'ut_lake_point_crag_routes', false),
  ('ut_assaulted_crackers_sit_start', 'ut_little_mill_boulders', 'ut_little_mill_area', false),
  ('ut_unknown_121', 'ut_little_mill_boulders', 'ut_little_mill_area', false),
  ('ut_assaulted_crackers_stand_start', 'ut_little_mill_boulders', 'ut_little_mill_area', false),
  ('ut_boulder_2_2', 'ut_little_mill_boulders', 'ut_little_mill_area', false),
  ('ut_boulder_1_2', 'ut_little_mill_boulders', 'ut_little_mill_area', false),
  ('ut_stern', 'ut_moon_lake_boulders', 'ut_moon_lake', false),
  ('ut_short_arete', 'ut_moon_lake_boulders', 'ut_moon_lake', false),
  ('ut_rip', 'ut_moon_lake_boulders', 'ut_moon_lake', false),
  ('ut_face', 'ut_moon_lake_boulders', 'ut_moon_lake', false),
  ('ut_chris_s_roof', 'ut_moon_lake_boulders', 'ut_moon_lake', false),
  ('ut_bow', 'ut_moon_lake_boulders', 'ut_moon_lake', false),
  ('ut_port', 'ut_moon_lake_boulders', 'ut_moon_lake', false),
  ('ut_dirty', 'ut_moon_lake_boulders', 'ut_moon_lake', false),
  ('ut_right_arete_3', 'ut_moon_lake_boulders', 'ut_moon_lake', false),
  ('ut_tower_of_terror', 'ut_moon_lake_boulders', 'ut_moon_lake', false),
  ('ut_lite_not_solid', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_taco_terror', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_mrs_renfro_s_revenge', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_burgerdier_general', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_krga', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_anchors_from_hell', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_bring_your_friends', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_pinching_fat', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_pickles_and_milk', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_potluck', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_hidden_surprise', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_old_bushmills', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_unnamed_sport_climb_1', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_unnamed_sport_climb_2', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_unnamed_5_7_2', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_unnamed_5_8_sport', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_pine_canyon_pinky', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_pine_canyon_lieutenant_legg', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_pine_canyon_unknown', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_pine_canyon_unnamed_route', 'ut_pine_canyon', 'ut_pine_canyon_routes', false),
  ('ut_bee_true', 'ut_smithfield_dry_canyon_2', 'ut_smithfield_dry_canyon_2_routes', false),
  ('ut_diabetics_are_sweet', 'ut_smithfield_dry_canyon_2', 'ut_smithfield_dry_canyon_2_routes', false),
  ('ut_bloom_and_breathe', 'ut_smithfield_dry_canyon_2', 'ut_smithfield_dry_canyon_2_routes', false),
  ('ut_cache_valley_crack', 'ut_smithfield_dry_canyon_2', 'ut_smithfield_dry_canyon_2_routes', false),
  ('ut_parallelogram', 'ut_smithfield_dry_canyon_2', 'ut_smithfield_dry_canyon_2_routes', false),
  ('ut_the_fall_of_mann', 'ut_smithfield_dry_canyon_2', 'ut_smithfield_dry_canyon_2_routes', false),
  ('ut_bizarre_garb', 'ut_smithfield_dry_canyon_2', 'ut_smithfield_dry_canyon_2_routes', false),
  ('ut_choss_wasp', 'ut_smithfield_dry_canyon_2', 'ut_smithfield_dry_canyon_2_routes', false),
  ('va_roulette_ar_te', 'va_atkins_wall_bouldering', 'va_atkins_wall_2', false),
  ('va_the_cherry_on_top', 'va_summit_boulders', 'va_summit_crags', false),
  ('va_the_cherry_on_top_sit_start', 'va_summit_boulders', 'va_summit_crags', false),
  ('va_nervous_sister', 'va_summit_boulders', 'va_summit_crags', false),
  ('va_summit_boulders_one_big_bite', 'va_summit_boulders', 'va_summit_crags', false),
  ('va_summit_boulders_living_on_the_edge', 'va_summit_boulders', 'va_summit_crags', false),
  ('va_summit_boulders_unsent_offwidth_project_good_luck', 'va_summit_boulders', 'va_summit_crags', false);

create temp table m_reparent(id text primary key, from_area text not null, to_area text not null) on commit drop;
insert into m_reparent values
  ('ca_lower_cathedral_boulders', 'ca_yosemite_valley_bouldering', 'ca_7_lower_cathedral_area'),
  ('ca_slab_city_boulders_climbs', 'ca_slab_city_boulders', 'ca_a_slab_city'),
  ('ca_swan_slab_boulders', 'ca_yosemite_valley_bouldering', 'ca_a_swan_slab'),
  ('ca_6_degree_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_arizona_avenue_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_bachar_cracker_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_bear_hug_mantle_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_big_columbia_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_blue_suede_shoes_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_bruce_lee_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_cocaine_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_cocaine_corner_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_cove_area_the', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_energy_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_finger_crack_boulder_2', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_glass_house_area', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_glass_pyramid_the', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_goodrich_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_hammerhead_pinball_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_higgins_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_hobo_roof_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_honor_among_thieves_area', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_kauk_slab', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_king_cobra_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_kor_problem_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_little_columbia_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_manual_labor_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_pratt_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_pratt_mantel_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_rebirthing_boulder_the', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_shiver_me_timbers_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_shiver_warmup_boulders', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_shrink_boulder_the', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_swamp_things_boulders_alcove_area', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_thriller_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_titanic_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_torque_spanner_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_wine_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_wine_warmup_boulder', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_yabo_s_knife', 'ca_camp_4_boulders', 'ca_d_camp_4_area'),
  ('ca_bogart_boulder', 'ca_cathedral_boulders_2', 'ca_p_cathedral_area'),
  ('ca_get_it_up_boulder', 'ca_cathedral_boulders_2', 'ca_p_cathedral_area'),
  ('ca_hex_boulder_the', 'ca_cathedral_boulders_2', 'ca_p_cathedral_area'),
  ('ca_king_boulder_the', 'ca_cathedral_boulders_2', 'ca_p_cathedral_area'),
  ('ca_spire_boulder', 'ca_cathedral_boulders_2', 'ca_p_cathedral_area'),
  ('ca_teva_boulder', 'ca_cathedral_boulders_2', 'ca_p_cathedral_area'),
  ('ca_trail_boulder_2', 'ca_cathedral_boulders_2', 'ca_p_cathedral_area'),
  ('ca_walk_in_the_park_boulder', 'ca_cathedral_boulders_2', 'ca_p_cathedral_area'),
  ('ca_yeah_boulder', 'ca_cathedral_boulders_2', 'ca_p_cathedral_area'),
  ('co_narrows_redstone_mcclure_pass', 'co_redstone', 'co_redstone_area'),
  ('co_the_man_cave', 'co_redstone', 'co_redstone_area'),
  ('il_b_superball_slab_boulder', 'il_a_devils_standtable', 'il_b_devils_standtable_area'),
  ('il_c_amphitheater_boulders', 'il_a_devils_standtable', 'il_b_devils_standtable_area'),
  ('il_d_sloper_slab', 'il_a_devils_standtable', 'il_b_devils_standtable_area'),
  ('il_e_waterfall_roof', 'il_a_devils_standtable', 'il_b_devils_standtable_area'),
  ('il_f_gill_wall', 'il_a_devils_standtable', 'il_b_devils_standtable_area'),
  ('il_g_higher_education_area', 'il_a_devils_standtable', 'il_b_devils_standtable_area'),
  ('mo_crocodile_rock_and_the_nubbin', 'mo_main_bluff_boulders_the', 'mo_a_main_bluff'),
  ('mo_matt_damon_wall', 'mo_main_bluff_boulders_the', 'mo_a_main_bluff'),
  ('mo_princess_bride_boulders', 'mo_main_bluff_boulders_the', 'mo_a_main_bluff'),
  ('mo_warm_up_boulder', 'mo_main_bluff_boulders_the', 'mo_a_main_bluff'),
  ('nh_1_south_buttress_ice_climbs', 'nh_whitehorse_ice_climbs', 'nh_2_south_buttress'),
  ('ny_high_electricity_boulder', 'ny_swath_boulders', 'ny_b_the_swath'),
  ('ny_tombstone_boulder', 'ny_swath_boulders', 'ny_b_the_swath'),
  ('ny_whetstone_wall', 'ny_swath_boulders', 'ny_b_the_swath'),
  ('ny_beard_and_hinterlands', 'ny_east_end_bouldering', 'ny_p_east_end'),
  ('or_red_wall_boulders', 'or_smith_rock_bouldering', 'or_u_red_wall'),
  ('wa_banks_lake_ice_climbing', 'wa_central_region', 'wa_banks_lake'),
  ('wi_box_canyon', 'wi_g_dodge_ice', 'wi_1_box_canyon_boulders'),
  ('ak_diamond_south_boulders', 'ak_archangel_bouldering', 'ak_diamond_south'),
  ('ak_sky_pilot_bouldering', 'ak_sky_pilot_areas', 'ak_sky_pilot'),
  ('ar_area_51_bouldering', 'ar_bigfoot_hollow', 'ar_area_51'),
  ('az_oak_flat_bouldering', 'az_queen_creek_canyon', 'az_oak_flat'),
  ('ca_slab_city_boulders', 'ca_riverside_quarry', 'ca_a_slab_city'),
  ('ca_castle_rock_boulders', 'ca_castle_rock_area_2', 'ca_castle_rock_3'),
  ('ca_desolation_wilderness_bouldering', 'ca_highway_50_corridor', 'ca_desolation_wilderness'),
  ('ca_foreplay_bouldering', 'ca_fairview_mountain', 'ca_foreplay_area'),
  ('ca_meadow_boulders', 'ca_fairview_mountain_bouldering', 'ca_meadow_bouldering'),
  ('ca_southern_canyon_boulders', 'ca_new_jack_city', 'ca_southern_canyon_crags'),
  ('ca_sugarloaf_bouldering', 'ca_sugarloaf_area', 'ca_sugarloaf'),
  ('ca_tenaja_falls_boulders', 'ca_santa_ana_mountains', 'ca_tenaja_falls'),
  ('co_curve_block_boulders', 'co_georgetown', 'co_curve_block'),
  ('co_dome_bouldering', 'co_boulder_canyon', 'co_dome_the_2'),
  ('id_castle_rocks_bouldering', 'id_castle_rocks', 'id_castle_rocks_2'),
  ('id_dierkes_lake_bouldering', 'id_twin_falls_and_the_snake_river_canyon', 'id_dierkes_lake'),
  ('ma_the_hangover_area_boulders', 'ma_hemlock_pool_at_middlesex_fells', 'ma_hangover_the'),
  ('ma_mount_ann_boulders', 'ma_north_side', 'ma_mt_ann'),
  ('md_white_rocks_bouldering', 'md_sugarloaf_mountain', 'md_white_rocks'),
  ('me_bear_mountain_cliff_boulders', 'me_a_western_mountains', 'me_bear_mountain_cliff'),
  ('nc_wash_rock_boulders', 'nc_latta_nature_preserve', 'nc_wash_rock'),
  ('nd_sentinel_butte_bouldering', 'north_dakota', 'nd_sentinel_butte'),
  ('nh_devil_s_den_bouldering', 'nh_pawtuckaway', 'nh_devil_s_den_2'),
  ('nh_main_cliff_boulders', 'nh_goodwill_conservation_land_aka_richardson_pond', 'nh_main_cliff_the_3'),
  ('nh_yellowjacket_boulders', 'nh_yellowjacket_area', 'nh_yellowjacket_crags'),
  ('ny_near_trapps_bouldering', 'ny_the_gunks', 'ny_near_trapps_the'),
  ('ny_peterskill_bouldering', 'ny_the_gunks', 'ny_peterskill'),
  ('ny_trapps_bouldering', 'ny_the_gunks', 'ny_the_trapps'),
  ('ok_pear_and_apple_bouldering', 'ok_charon_s_gardens', 'ok_pear_and_apple'),
  ('pa_rim_rock_bouldering', 'pa_northwest_the', 'pa_rim_rock'),
  ('sd_1st_pigtail_bridge_boulders', 'sd_iron_mountain', 'sd_1st_pigtail_bridge'),
  ('sd_delicacy_wall_bouldering', 'sd_shadowlands', 'sd_delicacy_wall'),
  ('sd_oltons_shoulder_bouldering', 'sd_olton_s_shoulder', 'sd_oltons_shoulder'),
  ('sd_oval_office_boulders_the', 'sd_visitor_center_the', 'sd_oval_office_the'),
  ('sd_profile_boulders', 'sd_visitor_center_the', 'sd_profile'),
  ('sd_reardon_s_rock_boulders', 'sd_visitor_center_the', 'sd_reardon_s_rock'),
  ('sd_turtle_dome_boulders', 'sd_iron_mountain', 'sd_turtle_dome'),
  ('tx_grapevine_hills_bouldering', 'tx_big_bend_national_park', 'tx_grapevine_hills'),
  ('tx_sorenson_point_bouldering', 'tx_palo_duro_canyon_state_park', 'tx_sorenson_point'),
  ('tx_urban_assault_bouldering', 'tx_barton_creek_greenbelt', 'tx_urban_assault'),
  ('tx_wimberley_boulders', 'texas', 'tx_wimberley'),
  ('ut_lake_point_boulders', 'ut_oquirrh_mountains', 'ut_lake_point_crag'),
  ('ut_pine_canyon_bouldering', 'ut_lower_buckhorn', 'ut_pine_canyon'),
  ('ut_smithfield_dry_canyon_bouldering', 'ut_smithfield_dry_canyon', 'ut_smithfield_dry_canyon_2'),
  ('wa_camp_brown_boulder', 'wa_middle_fork_boulders', 'wa_middle_fork_bouldering'),
  ('wa_garfield_ledges', 'wa_middle_fork_boulders', 'wa_middle_fork_bouldering'),
  ('wa_mothership_boulder', 'wa_middle_fork_boulders', 'wa_middle_fork_bouldering'),
  ('wa_quartz_mountain_boulders', 'wa_middle_fork_boulders', 'wa_middle_fork_bouldering'),
  ('wa_spork_boulder', 'wa_middle_fork_boulders', 'wa_middle_fork_bouldering'),
  ('wy_cedar_mountain_boulders', 'wy_cody', 'wy_cedar_mountain');

create temp table m_drop_area(id text primary key, into_area text not null, ord int not null) on commit drop;
insert into m_drop_area values
  ('ca_camp_4_boulders', 'ca_d_camp_4_area', 0),
  ('ca_cathedral_boulders_2', 'ca_p_cathedral_area', 1),
  ('co_redstone', 'co_redstone_area', 2),
  ('il_a_devils_standtable', 'il_b_devils_standtable_area', 3),
  ('mo_main_bluff_boulders_the', 'mo_a_main_bluff', 4),
  ('ny_swath_boulders', 'ny_b_the_swath', 5),
  ('ny_east_end_bouldering', 'ny_p_east_end', 6),
  ('ny_golden_wall_area', 'ny_s_the_golden_wall', 7),
  ('qc_l_aiguille_boulders', 'qc_b_l_aiguille', 8),
  ('wi_old_sandstone_boulders', 'wi_1_old_sandstone', 9),
  ('wi_new_sandstone_bouldering', 'wi_2_new_sandstone_area', 10),
  ('ar_candy_mountain_boulders', 'ar_candy_mountain', 11),
  ('ar_sex_boulder_bouldering', 'ar_sex_boulder_the', 12),
  ('az_hualapai_park_bouldering', 'az_hualapai_mountain_park', 13),
  ('ca_boy_scout_wall_bouldering', 'ca_boy_scout_wall_2', 14),
  ('ca_crystal_lake_boulders', 'ca_crystal_lake_crag', 15),
  ('ca_swallow_rock_2', 'ca_swallow_rock_boulders', 16),
  ('co_atomic_energy_bouldering', 'co_atomic_energy_crag', 17),
  ('co_campsite_10_bouldering_area', 'co_campsite_10', 18),
  ('co_monkey_skull_boulders', 'co_monkey_skull_the', 19),
  ('ma_rafe_s_chasm_bouldering', 'ma_rafe_s_chasm', 20),
  ('md_acre_bouldering_the', 'md_the_acre', 21),
  ('md_balcony_rock_boulders', 'md_balcony_rock', 22),
  ('md_bloede_dam_crag', 'md_bloede_dam_boulders', 23),
  ('mt_sagebrush_point_crag', 'mt_sagebrush_point_boulders', 24),
  ('mt_sweathouse_creek_boulders', 'mt_sweathouse_creek_crags', 25),
  ('nd_square_butte_bouldering', 'nd_square_butte', 26),
  ('nm_questa_dome_bouldering', 'nm_questa_dome_2', 27),
  ('nv_sport_wall_ice_mixed', 'nv_sport_wall', 28),
  ('ok_01_backside_boulders', 'ok_02_backside', 29),
  ('pa_brown_rocks_bouldering', 'pa_brown_rocks_2', 30),
  ('sd_needles_eye_bouldering', 'sd_needle_s_eye', 31),
  ('tx_dihedral_boulders', 'tx_dihedral_the', 32),
  ('ut_little_mill_boulders', 'ut_little_mill_area', 33),
  ('ut_moon_lake_boulders', 'ut_moon_lake', 34),
  ('va_atkins_wall_bouldering', 'va_atkins_wall_2', 35),
  ('va_summit_boulders', 'va_summit_crags', 36),
  ('wa_middle_fork_boulders', 'wa_middle_fork_bouldering', 37),
  ('wv_fern_point_boulders', 'wv_fern_point', 38);

create temp table m_rename(id text primary key, from_name text not null, to_name text not null, bypass boolean not null) on commit drop;
-- (m_rename: none in this plan)

create temp table m_new_area(id text primary key, name text not null, parent_id text not null, final_parent text not null, area_type text, region text, lat double precision, lng double precision) on commit drop;
insert into m_new_area values
  ('ca_a_swan_slab_routes', 'Swan Slab Routes', 'ca_e_yosemite_falls_area', 'ca_a_swan_slab', null, null, 37.74499, -119.5999),
  ('or_u_red_wall_routes', 'Red Wall Routes', 'or_smith_rock', 'or_u_red_wall', null, null, 44.3696, -121.13916),
  ('ak_sky_pilot_routes', 'Sky Pilot Routes', 'ak_sky_pilot_areas', 'ak_sky_pilot', null, null, 61.0037, -149.66983),
  ('ca_desolation_wilderness_routes', 'Desolation Wilderness Routes', 'ca_highway_50_corridor', 'ca_desolation_wilderness', null, null, 38.87409, -120.1465),
  ('ca_tenaja_falls_routes', 'Tenaja Falls Routes', 'ca_santa_ana_mountains', 'ca_tenaja_falls', null, null, 33.5561, -117.3981),
  ('co_curve_block_routes', 'Curve Block Routes', 'co_georgetown', 'co_curve_block', null, null, 39.68095, -105.70238),
  ('co_dome_the_2_routes', 'The Dome Routes', 'co_boulder_canyon', 'co_dome_the_2', null, null, 40.0139, -105.30787),
  ('ma_hangover_the_routes', 'The Hangover Routes', 'ma_hemlock_pool_at_middlesex_fells', 'ma_hangover_the', null, null, 42.44416, -71.08943),
  ('md_white_rocks_routes', 'White Rocks Routes', 'md_sugarloaf_mountain', 'md_white_rocks', null, null, 39.28417, -77.39831),
  ('nd_sentinel_butte_routes', 'Sentinel Butte Routes', 'north_dakota', 'nd_sentinel_butte', null, null, 46.8784, -103.8363),
  ('nh_devil_s_den_2_routes', 'Devil''s Den Routes', 'nh_pawtuckaway', 'nh_devil_s_den_2', null, null, 43.12241, -71.1867),
  ('ok_pear_and_apple_routes', 'Pear and Apple Routes', 'ok_charon_s_gardens', 'ok_pear_and_apple', null, null, 34.7209, -98.7301),
  ('pa_rim_rock_routes', 'Rim Rock Routes', 'pa_northwest_the', 'pa_rim_rock', null, null, 41.8434, -78.9465),
  ('sd_delicacy_wall_routes', 'Delicacy Wall Routes', 'sd_shadowlands', 'sd_delicacy_wall', null, null, 44.28338, -103.89865),
  ('sd_oltons_shoulder_routes', 'Oltons Shoulder Routes', 'sd_olton_s_shoulder', 'sd_oltons_shoulder', null, null, 43.88249, -103.46723),
  ('sd_oval_office_the_routes', 'The Oval Office Routes', 'sd_visitor_center_the', 'sd_oval_office_the', null, null, 43.87415, -103.45599),
  ('sd_profile_routes', 'Profile Routes', 'sd_visitor_center_the', 'sd_profile', null, null, 43.87671, -103.45965),
  ('sd_reardon_s_rock_routes', 'Reardon''s Rock Routes', 'sd_visitor_center_the', 'sd_reardon_s_rock', null, null, 43.87555, -103.45798),
  ('sd_turtle_dome_routes', 'Turtle Dome Routes', 'sd_iron_mountain', 'sd_turtle_dome', null, null, 43.86252, -103.44379),
  ('tx_grapevine_hills_routes', 'Grapevine Hills Routes', 'tx_big_bend_national_park', 'tx_grapevine_hills', null, null, 29.4108, -103.20457),
  ('tx_urban_assault_routes', 'Urban Assault Routes', 'tx_barton_creek_greenbelt', 'tx_urban_assault', null, null, 30.2473, -97.7908),
  ('ut_lake_point_crag_routes', 'Lake Point Crag Routes', 'ut_oquirrh_mountains', 'ut_lake_point_crag', null, null, 40.7001, -112.2556),
  ('ut_pine_canyon_routes', 'Pine Canyon Routes', 'ut_lower_buckhorn', 'ut_pine_canyon', null, null, 39.10913, -110.66231),
  ('ut_smithfield_dry_canyon_2_routes', 'Smithfield Dry Canyon Routes', 'ut_smithfield_dry_canyon', 'ut_smithfield_dry_canyon_2', null, null, 41.832, -111.76858);

create temp table m_rename_first(id text primary key, from_name text not null, to_name text not null) on commit drop;
-- (m_rename_first: none in this plan)

-- every ancestor of every touched area, read BEFORE anything moves (old and new ancestors both)
create temp table m_recount on commit drop as
  select distinct a.id from areas a join areas t on a.path @> t.path
   where t.id in ('ca_camp_4_boulders', 'ca_d_camp_4_area', 'ca_cathedral_boulders_2', 'ca_p_cathedral_area', 'co_redstone', 'co_redstone_area', 'il_a_devils_standtable', 'il_b_devils_standtable_area', 'mo_main_bluff_boulders_the', 'mo_a_main_bluff', 'ny_swath_boulders', 'ny_b_the_swath', 'ny_east_end_bouldering', 'ny_p_east_end', 'ny_golden_wall_area', 'ny_s_the_golden_wall', 'qc_l_aiguille_boulders', 'qc_b_l_aiguille', 'wi_old_sandstone_boulders', 'wi_1_old_sandstone', 'wi_new_sandstone_bouldering', 'wi_2_new_sandstone_area', 'ar_candy_mountain_boulders', 'ar_candy_mountain', 'ar_sex_boulder_bouldering', 'ar_sex_boulder_the', 'az_hualapai_park_bouldering', 'az_hualapai_mountain_park', 'ca_boy_scout_wall_bouldering', 'ca_boy_scout_wall_2', 'ca_crystal_lake_boulders', 'ca_crystal_lake_crag', 'ca_swallow_rock_2', 'ca_swallow_rock_boulders', 'co_atomic_energy_bouldering', 'co_atomic_energy_crag', 'co_campsite_10_bouldering_area', 'co_campsite_10', 'co_monkey_skull_boulders', 'co_monkey_skull_the', 'ma_rafe_s_chasm_bouldering', 'ma_rafe_s_chasm', 'md_acre_bouldering_the', 'md_the_acre', 'md_balcony_rock_boulders', 'md_balcony_rock', 'md_bloede_dam_crag', 'md_bloede_dam_boulders', 'mt_sagebrush_point_crag', 'mt_sagebrush_point_boulders', 'mt_sweathouse_creek_boulders', 'mt_sweathouse_creek_crags', 'nd_square_butte_bouldering', 'nd_square_butte', 'nm_questa_dome_bouldering', 'nm_questa_dome_2', 'nv_sport_wall_ice_mixed', 'nv_sport_wall', 'ok_01_backside_boulders', 'ok_02_backside', 'pa_brown_rocks_bouldering', 'pa_brown_rocks_2', 'sd_needles_eye_bouldering', 'sd_needle_s_eye', 'tx_dihedral_boulders', 'tx_dihedral_the', 'ut_little_mill_boulders', 'ut_little_mill_area', 'ut_moon_lake_boulders', 'ut_moon_lake', 'va_atkins_wall_bouldering', 'va_atkins_wall_2', 'va_summit_boulders', 'va_summit_crags', 'wa_middle_fork_boulders', 'wa_middle_fork_bouldering', 'wv_fern_point_boulders', 'wv_fern_point', 'ca_yosemite_valley_bouldering', 'ca_7_lower_cathedral_area', 'ca_slab_city_boulders', 'ca_a_slab_city', 'ca_a_swan_slab', 'nh_whitehorse_ice_climbs', 'nh_2_south_buttress', 'or_smith_rock_bouldering', 'or_u_red_wall', 'wa_central_region', 'wa_banks_lake', 'wi_g_dodge_ice', 'wi_1_box_canyon_boulders', 'ak_archangel_bouldering', 'ak_diamond_south', 'ak_sky_pilot_areas', 'ak_sky_pilot', 'ar_bigfoot_hollow', 'ar_area_51', 'az_queen_creek_canyon', 'az_oak_flat', 'ca_riverside_quarry', 'ca_castle_rock_area_2', 'ca_castle_rock_3', 'ca_highway_50_corridor', 'ca_desolation_wilderness', 'ca_fairview_mountain', 'ca_foreplay_area', 'ca_fairview_mountain_bouldering', 'ca_meadow_bouldering', 'ca_new_jack_city', 'ca_southern_canyon_crags', 'ca_sugarloaf_area', 'ca_sugarloaf', 'ca_santa_ana_mountains', 'ca_tenaja_falls', 'co_georgetown', 'co_curve_block', 'co_boulder_canyon', 'co_dome_the_2', 'id_castle_rocks', 'id_castle_rocks_2', 'id_twin_falls_and_the_snake_river_canyon', 'id_dierkes_lake', 'ma_hemlock_pool_at_middlesex_fells', 'ma_hangover_the', 'ma_north_side', 'ma_mt_ann', 'md_sugarloaf_mountain', 'md_white_rocks', 'me_a_western_mountains', 'me_bear_mountain_cliff', 'nc_latta_nature_preserve', 'nc_wash_rock', 'north_dakota', 'nd_sentinel_butte', 'nh_pawtuckaway', 'nh_devil_s_den_2', 'nh_goodwill_conservation_land_aka_richardson_pond', 'nh_main_cliff_the_3', 'nh_yellowjacket_area', 'nh_yellowjacket_crags', 'ny_the_gunks', 'ny_near_trapps_the', 'ny_peterskill', 'ny_the_trapps', 'ok_charon_s_gardens', 'ok_pear_and_apple', 'pa_northwest_the', 'pa_rim_rock', 'sd_iron_mountain', 'sd_1st_pigtail_bridge', 'sd_shadowlands', 'sd_delicacy_wall', 'sd_olton_s_shoulder', 'sd_oltons_shoulder', 'sd_visitor_center_the', 'sd_oval_office_the', 'sd_profile', 'sd_reardon_s_rock', 'sd_turtle_dome', 'tx_big_bend_national_park', 'tx_grapevine_hills', 'tx_palo_duro_canyon_state_park', 'tx_sorenson_point', 'tx_barton_creek_greenbelt', 'tx_urban_assault', 'texas', 'tx_wimberley', 'ut_oquirrh_mountains', 'ut_lake_point_crag', 'ut_lower_buckhorn', 'ut_pine_canyon', 'ut_smithfield_dry_canyon', 'ut_smithfield_dry_canyon_2', 'wy_cody', 'wy_cedar_mountain');

do $$ declare n int; begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog: nothing to fold.
  select count(*) into n from areas where id in (select id from m_drop_area);
  if n = 0 then raise notice '0261: no catalog, nothing to fold'; return; end if;
  if n <> 39 then raise exception '0261: expected 39 copy areas, found %', n; end if;
  -- the tree must still be the one the plan read
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.from_area;
  if n <> 436 then raise exception '0261: % of 436 climbs are where the plan found them', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep join routes o on o.id = m.drop_id;
  if n <> 19 then raise exception '0261: % of 19 merge pairs still exist', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.from_area;
  if n <> 119 then raise exception '0261: % of 119 sub-areas are where the plan found them', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.from_name;
  if n <> 0 then raise exception '0261: % of 0 renames still carry the planned name', n; end if;
  select count(*) into n from m_rename_first m join areas a on a.id = m.id and a.name = m.from_name;
  if n <> 0 then raise exception '0261: % of 0 Other Climbs renames still carry the planned name', n; end if;
  select count(*) into n from areas where id in (select id from m_new_area);
  if n > 0 then raise exception '0261: % of the new Routes areas already exist', n; end if;
  -- every climb on a copy is accounted for
  select count(*) into n from routes r join m_drop_area d on d.id = r.area_id
   where r.id not in (select id from m_move) and r.id not in (select drop_id from m_merge);
  if n > 0 then raise exception '0261: % climbs on a copy are not in the plan', n; end if;
  select count(*) into n from areas a join m_drop_area d on d.id = a.parent_id
   where a.id not in (select id from m_reparent) and a.id not in (select id from m_drop_area);
  if n > 0 then raise exception '0261: % sub-areas of a copy are not in the plan', n; end if;
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
  if n > 0 then raise exception '0261: % climber rows point at a row this deletes — stop and repoint them', n; end if;
end $$;

-- 1. climbs stored on both sides
update routes k set
  grade = coalesce(m.grade, case when nullif(btrim(k.grade), '') is null then o.grade else k.grade end),
  discipline = coalesce(m.disc, case when nullif(btrim(k.discipline), '') is null then o.discipline else k.discipline end),
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
delete from routes o using m_merge m
 where o.id = m.drop_id and exists (select 1 from routes k where k.id = m.keep);
-- a keeper that carried the topo number its twin did not takes the clean name (the twin is gone)
update routes r set name = m.to_name from m_route_rename m where r.id = m.id and r.name = m.from_name;

-- 2. an area holds climbs OR sub-areas, never both (routes_require_leaf, areas_leaf_xor). In 0 groups one
--    member lists its climbs flat and the other has sub-areas: the one WITH sub-areas is the place, and the
--    flat climbs sit under it as "Other Climbs" (0221's name), renamed before the tree moves. (0261 plans
--    none: such a pair NESTS instead, step 3, and #2265 retired "Other Climbs".)
update areas a set name = m.to_name from m_rename_first m where a.id = m.id and a.name = m.from_name;

-- 3. a crag that lists its climbs flat gets "<Crag> Routes" (BESIDE it first, so no area ever holds climbs
--    AND sub-areas); its climbs move in; then the Routes area and the section go INSIDE the crag.
insert into areas (id, name, parent_id, area_type, region, lat, lng)
  select m.id, m.name, m.parent_id, m.area_type, m.region, m.lat, m.lng from m_new_area m
   where exists (select 1 from areas p where p.id = m.parent_id);   -- an EMPTY database has no crag to add one to
insert into m_recount select id from m_new_area;
-- Every moved climb goes to the SAME place it was filed at, so refuse_duplicate_route can only meet the
-- climb's own twin (merged above) or the 1 rows marked bypass (a DIFFERENT climb with that name).
-- A nested section often shares its crag's name key ("Smugglers Notch Ice" under "Smugglers' Notch"), and
-- refuse_duplicate_area would read its own crag as the duplicate. Every pair was read; bypassed here only.
set local catalog.allow_duplicate = 'on';
update routes r set area_id = m.to_area from m_move m where r.id = m.id and r.area_id = m.from_area;
update areas a set parent_id = m.final_parent from m_new_area m where a.id = m.id and a.parent_id = m.parent_id;
update areas a set parent_id = m.to_area from m_reparent m where a.id = m.id and a.parent_id = m.from_area;
set local catalog.allow_duplicate = 'off';

-- 4. a climber's photo or note on a COPY (contributions and topos CASCADE on an area delete) moves to
--    its keeper (none on any copy when read, 2026-10-07; kept so one added since is not deleted).
update topos t set area_id = d.into_area from m_drop_area d where t.area_id = d.id;
update contributions c set area_id = d.into_area from m_drop_area d where c.area_id = d.id;
do $$ declare n int; begin
  select (select count(*) from topos where area_id in (select id from m_drop_area))
       + (select count(*) from contributions where area_id in (select id from m_drop_area)) into n;
  if n > 0 then raise exception '0261: % climber rows still point at a copy', n; end if;
end $$;

-- 5. the keeper fills its blank columns from each copy, then the copies go, children first
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

-- 6. the keepers take the one name ("Pawn, The" -> "The Pawn"), now that their copies are gone. Every
--    rename keeps its catalog_key ("The" and "Ice" are stop words), so it can match nothing the old name did
--    not already match — "The Apron" under "Apron Crags" matches its own PARENT. Bypassed for that reason.
update areas a set name = m.to_name from m_rename m where a.id = m.id and a.name = m.from_name and not m.bypass;
set local catalog.allow_duplicate = 'on';
update areas a set name = m.to_name from m_rename m where a.id = m.id and a.name = m.from_name and m.bypass;
set local catalog.allow_duplicate = 'off';

-- 7. path is set per row by trg_areas_set_path and does NOT cascade (0221, 0233)
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
  if n > 0 then raise exception '0261: % copy areas were not emptied', n; end if;
  select count(*) into n from routes where id in (select drop_id from m_merge);
  if n > 0 then raise exception '0261: % merged climbs survived', n; end if;
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.to_area;
  if n <> 436 then raise exception '0261: % of 436 climbs moved', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.to_name;
  if n <> 0 then raise exception '0261: % of 0 renames landed', n; end if;
  select count(*) into n from m_new_area m join areas a on a.id = m.id and a.parent_id = m.final_parent and a.route_count > 0;
  if n <> 24 then raise exception '0261: % of 24 Routes areas are in place, holding their climbs', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.to_area;
  if n <> 119 then raise exception '0261: % of 119 sub-areas re-parented', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.to_name;
  if n <> 0 then raise exception '0261: % of 0 climb renames landed', n; end if;
end $$;

commit;
