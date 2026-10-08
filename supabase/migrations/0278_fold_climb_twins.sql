-- 0278: one climb, one row — places and climbs filed twice under DIFFERENT names, found by their climbs.
--
-- 0276 and 0277 paired areas by NAME, so a copy its import renamed still hid (Duluth's "North Hartley" held
-- exactly "Hartley"'s problems). Measured the other way: every two areas in one state sharing 3+ distinctive
-- climb names, whatever they are called — 115 pairs, every one READ (two readers; every merge call re-read).
--   * ONE PLACE under two names or two pins — folded: Mission Gorge's two "Main Wall"s (59 of 63 climbs,
--     pins 37 km apart), "East Face of the Elephant Head" / "...Elephant's Head", "Indian Wars Wall" /
--     "Wars Wall", "Hanging Chain (Left Field)" / "Left Field", Crankenstein / War on Rugs Wall (one pin), the
--     Pemberton boulders a second import filed on one placeholder pin (Way Boulder, Rainbow Boulder), "Temp
--     Area 2" (Corps Wall's 7 climbs, 217 km off), Leda Shade Wall, World Wall II, Weston Wall...
--   * ONE CRAG listing the same climbs twice — a wall AND a catch-all list ("Rose Ledge Routes", "T-Wall West",
--     "North End, The Routes", "Winter-Spring (ice, snow, mixed)"): both areas stay; each shared climb is one,
--     the copy on the specific wall or boulder kept. Flagstone's "North Wall" (pin 68 km off) held East Wall's 5
--     and North Bowl's 3: each wall keeps its own, and the emptied list goes.
--   * "Temp HP40", a 98-problem holding list under the Alabama root: its 55 problems Horse Pens 40 files on a
--     boulder merge into that boulder's copy; the 43 others go inside Horse Pens 40 as "Horse Pens 40 Routes".
-- Two copies of one climb drift in grade: the HIGHER is kept (owner rule; lib/grade.js ranks, a "+" outranks
-- none on a tie), or the copy's when it only extends the keeper's; grade_num from lib/grade.js.
--   * 490 climbs merged (29 take a grade); 25 moved; 1 area re-parented; 20 copies deleted;
--     1 area renamed. No contribution, log, photo, topo, list or report on any climb this deletes.
-- LEFT, read: 7 Mile Rock / Coal Mt. Crag's Main Wall (27 climbs on both, 3 km: which crag holds them is not
-- settled); Missouri's Hide and Seek and Hiker's boulders (the copies sit under its "Closed Areas", and a fold
-- could erase a closure); Pot Holes Area / Slicksides Pit (trad routes on one side, boulder problems on the
-- other); Blow-Hard / Main Wall - West End (adjacent walls); Tunnel Wall rock vs winter mixed (two climbs);
-- a placeholder "Unknown 5.9" graded 5.9 and 5.9+ (stays two, owner rule); 6 still unsure; every pair read DIFFERENT.
-- ABORTS if climber data points at a climb deleted, or if the live tree no longer matches the plan.
-- Plan: the job's fold6/plan.mjs + res/p3-verdicts-*.json; rollback: scripts/data/climb-twin-folds-rollback.json.

begin;

create temp table m_merge(keep text not null, drop_id text primary key, grade text, grade_num numeric, disc text) on commit drop;
insert into m_merge values
  ('al_wasp_2', 'al_wasp', null, null, null),
  ('al_lay_it_down_2', 'al_lay_it_down', null, null, null),
  ('al_pearl_necklace_2', 'al_pearl_necklace', null, null, null),
  ('al_cuts_like_a_knife_2', 'al_cuts_like_a_knife', 'V5', 5, null),
  ('al_lawdog_2', 'al_lawdog', null, null, null),
  ('al_sordid_2', 'al_sordid', null, null, null),
  ('al_right_of_tree_2', 'al_right_of_tree', null, null, null),
  ('al_crystal_tips_2', 'al_crystal_tips', null, null, null),
  ('al_orange_slice_2', 'al_orange_slice', null, null, null),
  ('al_eight_ball_2', 'al_eight_ball', null, null, null),
  ('al_turtle_head_left_2', 'al_turtle_head_left', null, null, null),
  ('al_the_slider_boulder_slider_sit_start', 'al_slider_sit_start', null, null, null),
  ('al_supa_coola_area_orca', 'al_orca', null, null, null),
  ('al_great_white_2', 'al_great_white', null, null, null),
  ('al_ticket_home_2', 'al_ticket_home', null, null, null),
  ('al_just_massage_oil_2', 'al_just_massage_oil', null, null, null),
  ('al_vandala_boulder_bump_that', 'al_bump_that', null, null, null),
  ('al_skywalker_2', 'al_skywalker', 'V8-9', 9, null),
  ('al_the_blob_2', 'al_the_blob', null, null, null),
  ('al_sure_thing_2', 'al_sure_thing', null, null, null),
  ('al_lou_ser_2', 'al_lou_ser', null, null, null),
  ('al_god_module_2', 'al_god_module', null, null, null),
  ('al_high_life_2', 'al_high_life', null, null, null),
  ('al_the_slider_boulder_paper_or_plastic', 'al_paper_or_plastic', null, null, null),
  ('al_litz_pocket_problem_2', 'al_litz_pocket_problem', 'V8', 8, null),
  ('al_smile_and_recieve_2', 'al_smile_and_recieve', null, null, null),
  ('al_the_slider_boulder_superslider', 'al_superslider', null, null, null),
  ('al_great_dane_2', 'al_great_dane', 'V11', 11, null),
  ('al_contusion_2', 'al_contusion', null, null, null),
  ('al_slider_2', 'al_slider', null, null, null),
  ('al_orchid_2', 'al_orchid', null, null, null),
  ('al_vip_2', 'al_vip', null, null, null),
  ('al_getcha_some_2', 'al_getcha_some', null, null, null),
  ('al_stage_fright_2', 'al_stage_fright', null, null, null),
  ('al_busu_2', 'al_busu', null, null, null),
  ('al_hp_sauce_2', 'al_hp_sauce', null, null, null),
  ('al_lob_2', 'al_lob', 'V0', 0, null),
  ('al_the_lady_slipper_boulder_classless', 'al_classless', null, null, null),
  ('al_redneck_2', 'al_redneck', null, null, null),
  ('al_honky_tonkin_2', 'al_honky_tonkin', null, null, null),
  ('al_lady_slipper_2', 'al_lady_slipper', null, null, null),
  ('al_whiplash_2', 'al_whiplash', null, null, null),
  ('al_brawn_2', 'al_brawn', null, null, null),
  ('al_never_trust_a_mustache_2', 'al_never_trust_a_mustache', null, null, null),
  ('al_bridge_arete_2', 'al_bridge_arete', 'V2', 2, null),
  ('al_uniball_2', 'al_uniball', null, null, null),
  ('al_the_thief_2', 'al_the_thief', null, null, null),
  ('al_turtle_head_right_2', 'al_turtle_head_right', null, null, null),
  ('al_the_crown_2', 'al_the_crown', null, null, null),
  ('al_supa_coola_area_squeeze_play', 'al_squeeze_play', null, null, null),
  ('al_stretch_armstrong_2', 'al_stretch_armstrong', null, null, null),
  ('al_trick_or_treat_2', 'al_trick_or_treat', null, null, null),
  ('al_merlin_2', 'al_merlin', null, null, null),
  ('al_cadillac_thrills_2', 'al_cadillac_thrills', null, null, null),
  ('al_broadway_2', 'al_broadway', null, null, null),
  ('wa_tin_man_boulder_joe_s_noes', 'wa_joe_s_noes', null, null, null),
  ('wa_tin_man_boulder_spanish_traverse', 'wa_spanish_traverse', null, null, null),
  ('wa_tin_man_boulder_green_zero', 'wa_green_zero', null, null, null),
  ('wa_tin_man_boulder_tin_man', 'wa_tin_man', null, null, null),
  ('wa_tin_man_boulder_the_slot_problem', 'wa_the_slot_problem', null, null, null),
  ('wa_quantum_mechanics_boulder_quantum_mechanics_low', 'wa_quantum_mechanics_low', null, null, null),
  ('wa_quantum_mechanics_boulder_quantum_mechanics', 'wa_quantum_mechanics', null, null, null),
  ('wa_quantum_mechanics_boulder_quantum_theory', 'wa_quantum_theory', null, null, null),
  ('wa_seams_dangerous_boulder_tonya_harding', 'wa_tonya_harding', null, null, null),
  ('wa_seams_dangerous_boulder_seams_dangerous', 'wa_seams_dangerous', null, null, null),
  ('wa_seams_dangerous_boulder_tonya_harding_left', 'wa_tonya_harding_left', null, null, null),
  ('ca_wildcat_point_clementine', 'ca_clementine', null, null, null),
  ('ca_wildcat_point_wildcat', 'ca_wildcat_2', null, null, null),
  ('ca_wildcat_point_smitten_by_kittens', 'ca_smitten_by_kittens', null, null, null),
  ('nc_transfomer_area_megatron', 'nc_megatron', null, null, null),
  ('nc_transfomer_area_optimus_prime', 'nc_optimus_prime', null, null, null),
  ('nc_transfomer_area_optimus_prime_sit', 'nc_optimus_prime_sit', null, null, null),
  ('wa_taller_boulder_taller', 'wa_taller', null, null, null),
  ('wa_taller_boulder_answer_man', 'wa_answer_man', null, null, null),
  ('wa_taller_boulder_crowd_surfing', 'wa_crowd_surfing', null, null, null),
  ('co_sunshine_wall_2_birthday_sex', 'co_birthday_sex', null, null, null),
  ('co_sunshine_wall_2_bric_fund', 'co_bric_fund', null, null, null),
  ('co_sunshine_wall_2_capital_income_builder', 'co_capital_income_builder', null, null, null),
  ('co_sunshine_wall_2_options_trader', 'co_options_trader', null, null, null),
  ('co_sunshine_wall_2_instant_karma', 'co_instant_karma', null, null, null),
  ('co_sunshine_wall_2_jailhouse_booty', 'co_jailhouse_booty', null, null, null),
  ('co_sunshine_wall_2_goonies', 'co_goonies', null, null, null),
  ('co_sunshine_wall_2_watering_hole', 'co_watering_hole', null, null, null),
  ('co_sunshine_wall_2_vaguely_dog_like_creature', 'co_vaguely_dog_like_creature', null, null, null),
  ('co_sunshine_wall_2_basis_points', 'co_basis_points', null, null, null),
  ('co_sunshine_wall_2_angel_fire', 'co_angel_fire', null, null, null),
  ('co_sunshine_wall_2_james_bond', 'co_james_bond', null, null, null),
  ('wa_x_world_wall_ii_flyboys', 'wa_flyboys', null, null, null),
  ('wa_x_world_wall_ii_les_misar_te', 'wa_les_misar_te', null, null, null),
  ('wa_x_world_wall_ii_hollow_hearted', 'wa_hollow_hearted', null, null, null),
  ('wa_x_world_wall_ii_project_clench', 'wa_project_clench', null, null, null),
  ('wa_x_world_wall_ii_bones_brigade', 'wa_bones_brigade', null, null, null),
  ('wa_x_world_wall_ii_thin_wheats', 'wa_thin_wheats', null, null, null),
  ('wa_x_world_wall_ii_drill_sergeant', 'wa_drill_sergeant', null, null, null),
  ('wa_x_world_wall_ii_unsung_heroes', 'wa_unsung_heroes', null, null, null),
  ('wa_x_world_wall_ii_orgasmatron', 'wa_orgasmatron', null, null, null),
  ('wa_x_world_wall_ii_paradise_lost', 'wa_paradise_lost', null, null, null),
  ('ut_horse_cock_tower', 'ut_new_sub_area_1_2_horse_cock_tower', null, null, null),
  ('ut_rumble_strip_2', 'ut_new_sub_area_1_2_rumble_strip', null, null, null),
  ('ut_monk', 'ut_new_sub_area_1_2_monk', null, null, null),
  ('ut_gumby', 'ut_new_sub_area_1_2_gumby', null, null, null),
  ('ut_watch_for_falling_rocks', 'ut_new_sub_area_1_2_watch_for_falling_rocks', '5.9+ X', 9, null),
  ('ut_rock_and_roll_roadie', 'ut_new_sub_area_1_2_rock_and_roll_roadie', null, null, null),
  ('ut_great_outlook', 'ut_new_sub_area_1_2_great_outlook', null, null, null),
  ('ca_shop_roof_vamp', 'ca_vamp', null, null, null),
  ('ca_shop_roof_ketel_one', 'ca_ketel_one', null, null, null),
  ('ca_shop_roof_the_long_goodbye', 'ca_the_long_goodbye', null, null, null),
  ('ca_shop_roof_scarlet_street', 'ca_scarlet_street', null, null, null),
  ('ca_shop_roof_smooth_patrol', 'ca_smooth_patrol', null, null, null),
  ('ca_uphill_boulder_2_shelf_mantle', 'ca_shelf_mantle', null, null, null),
  ('ca_uphill_boulder_2_that_juan', 'ca_that_juan', null, null, null),
  ('ca_uphill_boulder_2_vjuan', 'ca_vjuan', null, null, null),
  ('ca_uphill_boulder_2_uphill_arete', 'ca_uphill_arete', null, null, null),
  ('ca_uphill_boulder_2_nature_nosy', 'ca_nature_nosy', null, null, null),
  ('ma_the_score', 'ma_b_block_the_score', null, null, null),
  ('ma_kool_aid_arete', 'ma_b_block_kool_aid_arete', null, null, null),
  ('ma_a_call_to_duty', 'ma_b_block_a_call_to_duty', null, null, null),
  ('ca_fingerrip', 'ca_fingerrip_2', '5.9+', 9, null),
  ('ca_exit_stage_right_the_l_word', 'ca_exit_stage_right_the_l_word_2', null, null, null),
  ('ca_rock_on_right', 'ca_rock_on_right_2', null, null, null),
  ('ca_chicken_fart', 'ca_chicken_fart_3', null, null, null),
  ('ca_sierra_club_chimney', 'ca_sierra_club_chimney_2', null, null, null),
  ('ca_empathy', 'ca_empathy_2', null, null, null),
  ('ca_main_wall_15_missbegettin', 'ca_missbegettin', null, null, null),
  ('ca_cave_crack_2', 'ca_cave_crack_3', null, null, null),
  ('ca_rectum_roof', 'ca_rectum_roof_2', '5.10c', 10.75, null),
  ('ca_main_wall_15_itwillbegotten', 'ca_itwillbegotten', null, null, null),
  ('ca_master_of_defeet', 'ca_master_of_defeet_2', null, null, null),
  ('ca_crack_of_dust', 'ca_crack_of_dust_2', null, null, null),
  ('ca_quack_of_ducks', 'ca_quack_of_ducks_2', null, null, null),
  ('ca_main_wall_15_acrobat', 'ca_acrobat_2', null, null, null),
  ('ca_mission_impossible_4', 'ca_mission_impossible_5', null, null, null),
  ('ca_caterpillar_3', 'ca_caterpillar_4', null, null, null),
  ('ca_quantum_leap', 'ca_quantum_leap_2', null, null, null),
  ('ca_the_owl', 'ca_the_owl_2', null, null, null),
  ('ca_mission_gorge_traverse', 'ca_mission_gorge_traverse_2', null, null, null),
  ('ca_handyman', 'ca_handyman_2', null, null, null),
  ('ca_never_intended', 'ca_never_intended_2', null, null, null),
  ('ca_yellow_jacket_4', 'ca_yellow_jacket_5', null, null, null),
  ('ca_false_mission_gorge_traverse', 'ca_false_mission_gorge_traverse_2', null, null, null),
  ('ca_general_dynamics', 'ca_general_dynamics_2', null, null, null),
  ('ca_the_perception_of_buzzy_fuzzy_pelt', 'ca_the_perception_of_buzzy_fuzzy_pelt_2', null, null, null),
  ('ca_hangman_s_climb', 'ca_hangman_s_climb_2', null, null, null),
  ('ca_razor_s_edge_2', 'ca_razor_s_edge_3', null, null, null),
  ('ca_knob_job_bypass', 'ca_knob_job_bypass_2', null, null, null),
  ('ca_mickey_finn', 'ca_mickey_finn_2', null, null, null),
  ('ca_lilley_s_delight', 'ca_lilley_s_delight_2', null, null, null),
  ('ca_mariah', 'ca_mariah_2', null, null, null),
  ('ca_main_wall_15_flake_of_rust', 'ca_flake_of_rust', null, null, null),
  ('ca_laundry_chute', 'ca_laundry_chute_2', null, null, null),
  ('ca_the_thumb', 'ca_the_thumb_2', null, null, null),
  ('ca_main_wall_15_plumbline', 'ca_plumbline_2', null, null, null),
  ('ca_nutcracker_2', 'ca_nutcracker_3', '5.9+', 9, null),
  ('ca_prime_directive_2', 'ca_prime_directive_3', null, null, null),
  ('ca_rock_on_2', 'ca_rock_on_3', null, null, null),
  ('ca_main_wall_15_encore', 'ca_encore', null, null, null),
  ('ca_trapeze', 'ca_trapeze_2', null, null, null),
  ('ca_knob_job_3', 'ca_knob_job_4', null, null, null),
  ('ca_the_blocks_direct', 'ca_the_blocks_direct_2', null, null, null),
  ('ca_unnatural_act', 'ca_unnatural_act_2', '5.11d', 12, null),
  ('ca_cornered_3', 'ca_cornered_4', null, null, null),
  ('ca_hidden_wall', 'ca_hidden_wall_2', null, null, null),
  ('ca_wallflower', 'ca_wallflower_2', null, null, null),
  ('ca_intrinsic_value', 'ca_intrinsic_value_2', null, null, null),
  ('ca_one_step_beyond', 'ca_one_step_beyond_3', null, null, null),
  ('ca_absorbine_junior', 'ca_absorbine_junior_2', null, null, null),
  ('ca_left_overture', 'ca_left_overture_2', null, null, null),
  ('ca_main_wall_15_topped_off', 'ca_topped_off', null, null, null),
  ('ca_the_blocks_2', 'ca_the_blocks_3', null, null, null),
  ('ca_exit_stage_left_3', 'ca_exit_stage_left_4', null, null, null),
  ('ca_sympathy', 'ca_sympathy_2', null, null, null),
  ('ca_gallwas_crack', 'ca_gallwas_crack_2', '5.9+', 9, null),
  ('ca_buckwheat', 'ca_buckwheat_2', null, null, null),
  ('ca_the_wasp', 'ca_the_wasp_2', null, null, null),
  ('ca_main_wall_15_high_anxiety', 'ca_high_anxiety_2', null, null, null),
  ('ca_escapade_2', 'ca_escapade_3', null, null, null),
  ('ca_suzie_s_wild_ride', 'ca_suzie_s_wild_ride_2', null, null, null),
  ('ca_obverse_from_the_gap', 'ca_obverse_from_the_gap_2', null, null, null),
  ('co_heaven_wall_journey_s_end', 'co_journey_s_end', null, null, null),
  ('co_heaven_wall_i_like_it_black', 'co_i_like_it_black', null, null, null),
  ('co_heaven_wall_up_your_booty_crack', 'co_up_your_booty_crack', null, null, null),
  ('co_heaven_wall_stairway_to_heaven', 'co_stairway_to_heaven', null, null, null),
  ('co_heaven_wall_quiet_time', 'co_quiet_time', null, null, null),
  ('co_heaven_wall_the_thing_1', 'co_the_thing_1', null, null, null),
  ('co_heaven_wall_la_primera_vez', 'co_la_primera_vez', null, null, null),
  ('co_heaven_wall_under_the_milky_way', 'co_under_the_milky_way', null, null, null),
  ('co_heaven_wall_nyorgai', 'co_nyorgai', null, null, null),
  ('co_heaven_wall_churning_in_the_cheese', 'co_churning_in_the_cheese', null, null, null),
  ('co_heaven_wall_punisher', 'co_punisher', null, null, null),
  ('co_heaven_wall_the_thing_2', 'co_the_thing_2', null, null, null),
  ('co_heaven_wall_king_coral', 'co_king_coral', null, null, null),
  ('co_heaven_wall_aggro_monk', 'co_aggro_monk', null, null, null),
  ('co_heaven_wall_boulder_hypocricy', 'co_boulder_hypocricy', null, null, null),
  ('co_heaven_wall_houses_of_the_holy', 'co_houses_of_the_holy', null, null, null),
  ('ca_east_face_of_the_elephant_head_the_caves_gun_show', 'ca_gun_show', null, null, null),
  ('ca_east_face_of_the_elephant_head_the_caves_44_magnum', 'ca_44_magnum', null, null, null),
  ('ca_east_face_of_the_elephant_head_the_caves_cave_dweller', 'ca_cave_dweller_2', null, null, null),
  ('ca_east_face_of_the_elephant_head_the_caves_honeybee', 'ca_honeybee', null, null, null),
  ('ca_east_face_of_the_elephant_head_the_caves_girls_with_guns', 'ca_girls_with_guns', null, null, null),
  ('ca_east_face_of_the_elephant_head_the_caves_texas_tea', 'ca_texas_tea', '5.10a', 10.25, null),
  ('ca_east_face_of_the_elephant_head_the_caves_the_nose', 'ca_the_nose_3', null, null, null),
  ('ca_east_face_of_the_elephant_head_the_caves_black_gold', 'ca_black_gold_3', null, null, null),
  ('ca_east_face_of_the_elephant_head_the_caves_vasectomy', 'ca_vasectomy', null, null, null),
  ('ca_east_face_of_the_elephant_head_the_caves_tusk', 'ca_tusk', null, null, null),
  ('ca_east_face_of_the_elephant_head_the_caves_the_alamo', 'ca_the_alamo', null, null, null),
  ('ca_east_face_of_the_elephant_head_the_caves_el_diablo_rojo', 'ca_el_diablo_rojo', null, null, null),
  ('ca_east_face_of_the_elephant_head_the_caves_too_many_cooks_in_the_kitchen', 'ca_too_many_cooks_in_the_kitchen', null, null, null),
  ('ca_east_face_of_the_elephant_head_the_caves_soldier_of_fortune', 'ca_soldier_of_fortune_2', '5.12b', 12.5, null),
  ('ca_east_face_of_the_elephant_head_the_caves_38_special', 'ca_38_special', null, null, null),
  ('ca_east_face_of_the_elephant_head_the_caves_brachiation_dance', 'ca_brachiation_dance', null, null, null),
  ('ma_chumbo_farmstrong_area_chumbo_love', 'ma_chumbo_love', null, null, null),
  ('ma_chumbo_farmstrong_area_pommel_horse', 'ma_pommel_horse', null, null, null),
  ('ma_chumbo_farmstrong_area_french_press', 'ma_french_press', null, null, null),
  ('ma_chumbo_farmstrong_area_french_press_sds', 'ma_french_press_sds', null, null, null),
  ('ma_chumbo_farmstrong_area_90_moves_packed_full_of_meat', 'ma_90_moves_packed_full_of_meat', null, null, null),
  ('ma_chumbo_farmstrong_area_the_lip', 'ma_the_lip', null, null, null),
  ('ma_chumbo_farmstrong_area_45_moves_packed_full_of_meat', 'ma_45_moves_packed_full_of_meat', null, null, null),
  ('ma_chumbo_farmstrong_area_paper_guillotine', 'ma_paper_guillotine', null, null, null),
  ('ma_chumbo_farmstrong_area_dunk_it_rat', 'ma_dunk_it_rat', null, null, null),
  ('ma_chumbo_farmstrong_area_chumbo_arete', 'ma_chumbo_arete', null, null, null),
  ('ma_chumbo_farmstrong_area_everything_is_purple', 'ma_everything_is_purple', null, null, null),
  ('ma_chumbo_farmstrong_area_snake_eyes', 'ma_snake_eyes', null, null, null),
  ('co_umbrella_wall_2_under_the_hand', 'co_under_the_hand', null, null, null),
  ('co_umbrella_wall_2_makadon', 'co_makadon', null, null, null),
  ('co_umbrella_wall_2_mono_jono', 'co_mono_jono', null, null, null),
  ('co_umbrella_wall_2_laser_gods', 'co_laser_gods', null, null, null),
  ('co_umbrella_wall_2_black_uhuru', 'co_black_uhuru', null, null, null),
  ('co_umbrella_wall_2_new_and_unknown', 'co_new_and_unknown', null, null, null),
  ('co_umbrella_wall_2_swanktofy_yourself', 'co_swanktofy_yourself', null, null, null),
  ('co_umbrella_wall_2_blo_jo_jono', 'co_blo_jo_jono', null, null, null),
  ('co_umbrella_wall_2_the_function', 'co_the_function', null, null, null),
  ('co_umbrella_wall_2_the_form', 'co_the_form', null, null, null),
  ('co_umbrella_wall_2_the_darrylect_of_dialect', 'co_the_darrylect_of_dialect', null, null, null),
  ('co_umbrella_wall_2_the_lifus_s_farm_tools', 'co_the_lifus_s_farm_tools', null, null, null),
  ('ma_rook_and_bishop_area_bishop', 'ma_bishop', null, null, null),
  ('ma_rook_and_bishop_area_deadpoint', 'ma_deadpoint', null, null, null),
  ('ma_rook_and_bishop_area_en_passant', 'ma_en_passant', null, null, null),
  ('ma_rook_and_bishop_area_rook', 'ma_rook', null, null, null),
  ('ma_rook_and_bishop_area_pawn', 'ma_pawn', null, null, null),
  ('ma_rook_and_bishop_area_angry_man', 'ma_angry_man', null, null, null),
  ('ma_rook_and_bishop_area_a_supposedly_fun_thing_i_ll_never_do_again', 'ma_a_supposedly_fun_thing_i_ll_never_do_again', 'V8', 8, null),
  ('ma_rook_and_bishop_area_rook_direct', 'ma_rook_direct', null, null, null),
  ('ma_rook_and_bishop_area_uppercut', 'ma_uppercut', null, null, null),
  ('tx_elm_hollow_point_everyone_s_hero', 'tx_everyone_s_hero', null, null, null),
  ('tx_elm_hollow_point_farewell_to_texas', 'tx_farewell_to_texas', null, null, null),
  ('tx_elm_hollow_point_o_l_butter_water', 'tx_ol_butter_water', null, null, null),
  ('tx_elm_hollow_point_mantle_overboard', 'tx_mantle_overboard', null, null, null),
  ('tx_elm_hollow_point_off_the_hook', 'tx_off_the_hook', null, null, null),
  ('tx_elm_hollow_point_because_you_climb_too_much', 'tx_because_you_climb_too_much', null, null, null),
  ('tx_elm_hollow_point_prater_shuffle', 'tx_the_prater_shuffle', null, null, null),
  ('vt_bns_boulder_sardines', 'vt_sardines', null, null, null),
  ('vt_bns_boulder_beans_and_sardines', 'vt_beans_and_sardines', null, null, null),
  ('vt_bns_boulder_beans', 'vt_beans', null, null, null),
  ('vt_bns_boulder_the_other_one', 'vt_the_other_one', null, null, null),
  ('vt_bns_boulder_the_easy_one', 'vt_the_easy_one', null, null, null),
  ('wa_snoqualmie_mountain_the_snostril', 'wa_winter_spring_ice_snow_mixed_2_the_snostril', 'WI4+ M5+', 4, null),
  ('wa_snoqualmie_mountain_boogie_wonderland', 'wa_winter_spring_ice_snow_mixed_2_boogie_wonderland', '5.7 M5-', 7, null),
  ('wa_new_york_gully', 'wa_winter_spring_ice_snow_mixed_2_new_york_gully', null, null, null),
  ('az_bird_sanctuary_arete_problem', 'az_arete_problem_3', null, null, null),
  ('az_bird_sanctuary_flyin_brian', 'az_flyin_brian', null, null, null),
  ('az_bird_sanctuary_warmup_boulders', 'az_warmup_boulders', null, null, null),
  ('az_bird_sanctuary_er_ar_te', 'az_er_ar_te', null, null, null),
  ('az_bird_sanctuary_radical_dales', 'az_radical_dales', null, null, null),
  ('az_bird_sanctuary_u_g_b', 'az_u_g_b', null, null, null),
  ('az_cholla_boulders_daisy_if_you_do', 'az_daisy_if_you_do', null, null, null),
  ('az_cholla_boulders_cholla_magnet_direct', 'az_cholla_magnet_direct', null, null, null),
  ('az_cholla_boulders_cholla_magnet', 'az_cholla_magnet', null, null, null),
  ('co_miscellaneous_boulders_3_jack_s_jinx', 'co_jack_s_jinx', null, null, null),
  ('co_miscellaneous_boulders_3_smear_campaign', 'co_smear_campaign', null, null, null),
  ('co_miscellaneous_boulders_3_the_chewie_indirect', 'co_the_chewie_indirect', null, null, null),
  ('sd_wars_wall_ricochet', 'sd_ricochet', null, null, null),
  ('sd_wars_wall_block_and_roll', 'sd_block_and_roll', null, null, null),
  ('sd_wars_wall_where_have_all_the_cowboys_gone', 'sd_where_have_all_the_cowboys_gone', null, null, null),
  ('sd_wars_wall_last_dance', 'sd_last_dance', null, null, null),
  ('sd_wars_wall_battlecry', 'sd_battlecry', null, null, null),
  ('sd_wars_wall_last_of_the_mohicans', 'sd_last_of_the_mohicans', null, null, null),
  ('sd_wars_wall_last_man_standing', 'sd_last_man_standing', null, null, null),
  ('sd_wars_wall_big_air_guitar', 'sd_big_air_guitar', null, null, null),
  ('sd_wars_wall_good_day_for_a_hanging', 'sd_good_day_for_a_hanging', null, null, null),
  ('sd_wars_wall_orphans_of_war', 'sd_orphans_of_war', null, null, null),
  ('sd_wars_wall_blood_brother', 'sd_blood_brother', null, null, null),
  ('sd_wars_wall_leprechaun_cowboy', 'sd_leprechaun_cowboy', null, null, null),
  ('sd_wars_wall_hang_em_high', 'sd_hang_em_high', null, null, null),
  ('nc_hanging_chain_left_field_black_socks', 'nc_black_socks', null, null, null),
  ('nc_hanging_chain_left_field_space_balls', 'nc_space_balls', null, null, null),
  ('nc_hanging_chain_left_field_wild_pitch', 'nc_wild_pitch', null, null, null),
  ('nc_hanging_chain_left_field_spring_training', 'nc_spring_training', null, null, null),
  ('nc_hanging_chain_left_field_pinch_hitter', 'nc_pinch_hitter', null, null, null),
  ('nc_hanging_chain_left_field_blood_root', 'nc_blood_root', null, null, null),
  ('nc_hanging_chain_left_field_huffin_cedar', 'nc_huffin_cedar', null, null, null),
  ('nc_hanging_chain_left_field_knuckle_balls', 'nc_knuckle_balls', null, null, null),
  ('nc_hanging_chain_left_field_catcher_s_mitt', 'nc_catcher_s_mitt', null, null, null),
  ('nc_hanging_chain_left_field_who_s_on_first', 'nc_who_s_on_first', null, null, null),
  ('nc_hanging_chain_left_field_first_base', 'nc_first_base', null, null, null),
  ('nc_hanging_chain_left_field_second_base', 'nc_second_base', null, null, null),
  ('nc_hanging_chain_left_field_stealing_second', 'nc_stealing_second', null, null, null),
  ('tx_dude_where_s_my_hammer_2', 'tx_dude_where_s_my_hammer', null, null, null),
  ('tx_die_hard_2', 'tx_die_hard', null, null, null),
  ('tx_pearl_2', 'tx_pearl', null, null, null),
  ('tx_war_on_rugs_2', 'tx_war_on_rugs', null, null, null),
  ('tx_about_face_2', 'tx_about_face', '5.11c', 11.75, null),
  ('tx_sunday_mass_2', 'tx_sunday_mass', null, null, null),
  ('tx_apprehension_2', 'tx_apprehension', '5.10b', 10.5, null),
  ('tx_teenage_parties_2', 'tx_teenage_parties', '5.11b', 11.5, null),
  ('tx_all_hail_broke_loose_2', 'tx_all_hail_broke_loose', null, null, null),
  ('co_left_wall_not_your_cup_of_certain_tea', 'co_not_your_cup_of_certain_tea', null, null, null),
  ('co_left_wall_memory_lane', 'co_memory_lane', null, null, null),
  ('co_left_wall_rotten_crotch', 'co_rotten_crotch', null, null, null),
  ('co_left_wall_piece_of_cake_submitted_as_almost_certain_ac', 'co_piece_of_cake_submitted_as_almost_certain_ac', null, null, null),
  ('co_left_wall_consolation_prize', 'co_consolation_prize_3', null, null, null),
  ('co_left_wall_arete_crack', 'co_arete_crack_2', null, null, null),
  ('co_left_wall_uncertainty', 'co_uncertainty', null, null, null),
  ('co_left_wall_definitely_certain_dc', 'co_definitely_certain_dc', null, null, null),
  ('co_left_wall_unknown_10', 'co_unknown_10_4', null, null, null),
  ('va_sweet_nothings', 'va_sweet_nothings_2', null, null, null),
  ('va_whale_blubber', 'va_whale_blubber_2', null, null, null),
  ('va_the_eye', 'va_the_eye_2', null, null, null),
  ('va_sweet_mouth', 'va_sweet_mouth_2', null, null, null),
  ('va_whale_s_mouth', 'va_whale_s_mouth_2', null, null, null),
  ('va_short_nothings', 'va_short_nothings_2', null, null, null),
  ('va_whale_crack', 'va_whale_crack_2', null, null, null),
  ('ma_07_buoux_buttress_straight_crack', 'ma_straight_crack', null, null, null),
  ('ma_07_buoux_buttress_jam_boree', 'ma_jam_boree', null, null, null),
  ('ma_07_buoux_buttress_indian_summer_arete', 'ma_indian_summer_arete', null, null, null),
  ('ma_07_buoux_buttress_partners_in_climb', 'ma_partners_in_climb', null, null, null),
  ('ma_07_buoux_buttress_right_twin_crack', 'ma_right_twin_crack', null, null, null),
  ('ma_07_buoux_buttress_trundle_corner', 'ma_trundle_corner', null, null, null),
  ('ma_07_buoux_buttress_king_phillip_s_face', 'ma_king_phillip_s_face', null, null, null),
  ('ma_corps_wall_acheron', 'ma_acheron', null, null, null),
  ('ma_corps_wall_photo_51', 'ma_photo_51', null, null, null),
  ('ma_corps_wall_suspension_of_disbelief', 'ma_suspension_of_disbelief', null, null, null),
  ('ma_corps_wall_eminent_domain', 'ma_eminent_domain_2', null, null, null),
  ('ma_corps_wall_severely_rational', 'ma_severely_rational', null, null, null),
  ('ma_corps_wall_double_standard_right', 'ma_double_standard_right', null, null, null),
  ('ma_corps_wall_double_standard_left', 'ma_double_standard_left', null, null, null),
  ('ma_05_french_king_buttress_devil_s_pitchfork', 'ma_devil_s_pitchfork', null, null, null),
  ('ma_05_french_king_buttress_joe_brown_special', 'ma_joe_brown_special', null, null, null),
  ('ma_05_french_king_buttress_weird_corner', 'ma_weird_corner', null, null, null),
  ('ma_05_french_king_buttress_tale_of_two_cities_aka_whoops', 'ma_tale_of_two_cities_aka_whoops', null, null, null),
  ('ma_05_french_king_buttress_erosion_groove', 'ma_erosion_groove', null, null, null),
  ('or_a_east_wall_membership_expired', 'or_membership_expired', null, null, null),
  ('or_a_east_wall_straight_no_chaser', 'or_straight_no_chaser', null, null, null),
  ('or_a_east_wall_sin_and_redemption', 'or_sin_and_redemption', null, null, null),
  ('or_a_east_wall_fragile_life', 'or_fragile_life', null, null, null),
  ('or_a_east_wall_joy_luck_club', 'or_joy_luck_club', null, null, null),
  ('ma_01_introductory_buttress_red_wall', 'ma_red_wall', null, null, null),
  ('ma_01_introductory_buttress_fat_flake', 'ma_fat_flake', null, null, null),
  ('ma_01_introductory_buttress_hampshire_corner', 'ma_hampshire_corner', null, null, null),
  ('ma_01_introductory_buttress_greeting_crack', 'ma_greeting_crack', null, null, null),
  ('ma_01_introductory_buttress_lonely_crack', 'ma_lonely_crack', null, null, null),
  ('va_72_inch_wheels', 'va_72_inch_wheels_2', null, null, null),
  ('va_the_derailleur', 'va_the_derailleur_2', 'V6', 6, null),
  ('va_biker_crack', 'va_biker_crack_2', null, null, null),
  ('va_biker_ar_te', 'va_biker_ar_te_2', null, null, null),
  ('ky_global_village_bouldering_chalk_is_cheap', 'ky_chalk_is_cheap', null, null, null),
  ('ky_global_village_bouldering_eraser', 'ky_eraser', null, null, null),
  ('ky_global_village_bouldering_lightbulb', 'ky_lightbulb', null, null, null),
  ('ky_global_village_bouldering_cant_get_fooled_again', 'ky_cant_get_fooled_again', null, null, null),
  ('ma_04_amphitheater_short_wall_p_v_t_a', 'ma_p_v_t_a', null, null, null),
  ('ma_04_amphitheater_short_wall_camp_corner', 'ma_camp_corner', null, null, null),
  ('ma_04_amphitheater_short_wall_playland', 'ma_playland', null, null, null),
  ('ma_04_amphitheater_short_wall_playland_direct_finish', 'ma_playland_direct_finish', null, null, null),
  ('ma_04_amphitheater_short_wall_tree_flake', 'ma_tree_flake', null, null, null),
  ('bc_lucky_charms_lucky_charms', 'bc_rainbow_boulder_lucky_charms', null, null, null),
  ('bc_lucky_charms_magically_delicious', 'bc_rainbow_boulder_magically_delicious', null, null, null),
  ('bc_lucky_charms_over_the_rainbow', 'bc_rainbow_boulder_over_the_rainbow', 'V3-4', 4, null),
  ('bc_lucky_charms_jim_s_stag', 'bc_rainbow_boulder_jim_s_stag', null, null, null),
  ('wa_chair_peak_north_face', 'wa_winter_spring_ice_snow_mixed_2_north_face', 'AI2 Steep Snow', 2, null),
  ('wa_chair_peak_northeast_buttress', 'wa_winter_spring_ice_snow_mixed_2_northeast_buttress', '5.4 AI2-3 M1-2 Mod. Snow', 4, null),
  ('wa_chair_peak_southeast_face', 'wa_winter_spring_ice_snow_mixed_2_southeast_face', null, null, null),
  ('bc_my_may_kelly_s_way', 'bc_way_boulder_kelly_s_way', null, null, null),
  ('bc_my_may_mike_s_way', 'bc_way_boulder_mike_s_way', null, null, null),
  ('bc_my_may_brian_s_way', 'bc_way_boulder_brian_s_way', null, null, null),
  ('co_bukowski', 'co_bukowski_2', null, null, null),
  ('co_baby_blue_sedan', 'co_baby_blue_sedan_2', null, null, null),
  ('co_masquerade', 'co_masquerade_2', null, null, null),
  ('co_ironsides_slab_der_kinder', 'co_der_kinder', null, null, null),
  ('co_ironsides_slab_excitable_boy', 'co_excitable_boy', null, null, null),
  ('co_ironsides_slab_keelhauled', 'co_keelhauled_2', null, null, null),
  ('co_right_wall_first_aid', 'co_first_aid', null, null, null),
  ('co_right_wall_low_left_offwidth', 'co_low_left_offwidth', '5.9', 9, null),
  ('co_right_wall_row_right_offwidth', 'co_row_right_offwidth', '5.11', 11, null),
  ('id_mecca_boulder_face_mecca', 'id_face_mecca', null, null, null),
  ('id_mecca_boulder_mecca_traverse', 'id_mecca_traverse', null, null, null),
  ('id_mecca_boulder_mecca_right', 'id_mecca_right', null, null, null),
  ('ma_03_overhang_buttress_sideline', 'ma_sideline', null, null, null),
  ('ma_03_overhang_buttress_lunge_roof_aka_rhino_dyno_or_gunks_roof', 'ma_lunge_roof_aka_rhino_dyno_or_gunks_roof', null, null, null),
  ('ma_03_overhang_buttress_tiger_walk', 'ma_tiger_walk', null, null, null),
  ('or_b_north_bowl_intrigue', 'or_intrigue', null, null, null),
  ('or_b_north_bowl_diamond_slipper', 'or_diamond_slipper', null, null, null),
  ('or_b_north_bowl_dreaming_extrication', 'or_dreaming_extrication', null, null, null),
  ('tn_5_the_wasteland_killer_diller_aka_silver_spurs', 'tn_killer_diller_aka_silver_spurs', null, null, null),
  ('tn_5_the_wasteland_talon', 'tn_talon', null, null, null),
  ('tn_5_the_wasteland_circus_circus', 'tn_circus_circus', null, null, null),
  ('tn_5_the_wasteland_tribal_babysitter', 'tn_tribal_babysitter', null, null, null),
  ('tn_5_the_wasteland_path_of_the_misfits', 'tn_path_of_the_misfits', null, null, null),
  ('tn_5_the_wasteland_elephus_maximus', 'tn_elephus_maximus', null, null, null),
  ('tn_5_the_wasteland_william_the_frig_perry', 'tn_william_the_frig_perry', null, null, null),
  ('tn_5_the_wasteland_the_wood_spirit', 'tn_wood_spirit', null, null, null),
  ('tn_5_the_wasteland_in_sight_of_power', 'tn_in_sight_of_power', null, null, null),
  ('tn_5_the_wasteland_wrectum_wrecker', 'tn_wrectum_wrecker', '5.12c', 12.75, null),
  ('tn_5_the_wasteland_run_with_the_horseman', 'tn_run_with_the_horseman', null, null, null),
  ('tn_5_the_wasteland_hammer_time', 'tn_hammer_time', null, null, null),
  ('tn_5_the_wasteland_steep_eye_for_the_slab_guy', 'tn_steep_eye_for_the_slab_guy', null, null, null),
  ('tn_5_the_wasteland_air_raid', 'tn_air_raid', null, null, null),
  ('tn_5_the_wasteland_a_nice_place_to_come', 'tn_a_nice_place_to_come', null, null, null),
  ('tn_5_the_wasteland_greener_pastures', 'tn_greener_pastures', null, null, null),
  ('tn_5_the_wasteland_superwave', 'tn_superwave', null, null, null),
  ('tn_5_the_wasteland_sole_searcher', 'tn_sole_searcher', null, null, null),
  ('tn_5_the_wasteland_can_t_touch_this', 'tn_can_t_touch_this', null, null, null),
  ('tn_5_the_wasteland_path_of_the_mystics', 'tn_path_of_the_mystics', null, null, null),
  ('tn_5_the_wasteland_where_lizards_go_to_die', 'tn_where_lizards_go_to_die', null, null, null),
  ('tn_5_the_wasteland_the_riff', 'tn_the_riff', null, null, null),
  ('tn_5_the_wasteland_one_slip', 'tn_one_slip', null, null, null),
  ('tn_5_the_wasteland_first_dance', 'tn_first_dance', null, null, null),
  ('tn_the_camp_mace_chain', 'tn_mace_chain', null, null, null),
  ('tn_the_camp_fantastic_voyage', 'tn_fantastic_voyage', null, null, null),
  ('tn_the_camp_brown_smack', 'tn_brown_smack', null, null, null),
  ('tn_the_camp_buff_rubes', 'tn_buff_rubes', null, null, null),
  ('tn_the_camp_buff_rubenesque', 'tn_buff_rubenesque', null, null, null),
  ('tn_the_camp_kaboom', 'tn_kaboom', null, null, null),
  ('tn_the_camp_redneck_direct', 'tn_redneck_direct', null, null, null),
  ('tn_the_camp_suck_boy', 'tn_suck_boy', null, null, null),
  ('tn_the_camp_vine_wall_route_1', 'tn_vine_wall_route_1', null, null, null),
  ('tn_the_camp_plate_lunch', 'tn_plate_lunch', null, null, null),
  ('tn_the_camp_the_steve_mcqueen_memorial', 'tn_the_steve_mcqueen_memorial', null, null, null),
  ('tn_the_camp_unintentional_imposition', 'tn_unintentional_imposition', null, null, null),
  ('tn_the_camp_heavy_hors_d_oeuvres', 'tn_heavy_hors_d_oeuvres', null, null, null),
  ('tn_leda_shade_wall_2_gearshifer', 'tn_gearshifer', null, null, null),
  ('tn_leda_shade_wall_2_tradland_arete', 'tn_tradland_arete', null, null, null),
  ('tn_leda_shade_wall_2_outside_chimney', 'tn_outside_chimney', null, null, null),
  ('tn_leda_shade_wall_2_izzy', 'tn_izzy', null, null, null),
  ('tn_leda_shade_wall_2_flakey', 'tn_flakey', null, null, null),
  ('tn_leda_shade_wall_2_pockets', 'tn_pockets', null, null, null),
  ('tn_leda_shade_wall_2_inside_out_chimney', 'tn_inside_out_chimney', null, null, null),
  ('tn_leda_shade_wall_2_benwha', 'tn_benwha', null, null, null),
  ('tn_leda_shade_wall_2_unnamed', 'tn_unnamed_3', null, null, null),
  ('tn_leda_shade_wall_2_anyone_home', 'tn_anyone_home', null, null, null),
  ('tn_leda_shade_wall_2_exit_stage_left', 'tn_exit_stage_left_2', null, null, null),
  ('tn_leda_shade_wall_2_two_dump_chump', 'tn_two_dump_chump', null, null, null),
  ('mn_mystical_mountain_south_mother_goose', 'mn_mother_goose', null, null, null),
  ('mn_mystical_mountain_south_oz_before_the_wizard', 'mn_oz_before_the_wizard', null, null, null),
  ('mn_mystical_mountain_south_ode_to_a_newt', 'mn_ode_to_a_newt', null, null, null),
  ('mn_mystical_mountain_south_cirith_ungol', 'mn_cirith_ungol', null, null, null),
  ('mn_mystical_mountain_south_old_number_nine', 'mn_old_number_nine', null, null, null),
  ('mn_mystical_mountain_south_sisyphus', 'mn_sisyphus', null, null, null),
  ('mn_mystical_mountain_south_swords_of_zanzibar', 'mn_swords_of_zanzibar', null, null, null),
  ('mn_mystical_mountain_south_advice_from_a_caterpillar', 'mn_advice_from_a_caterpillar', null, null, null),
  ('co_knobs_and_nubbins_2', 'co_knobs_and_nubbins', null, null, null),
  ('co_flakes_and_horns_2', 'co_flakes_and_horns', null, null, null),
  ('co_seams_and_smears_2', 'co_seams_and_smears', null, null, null),
  ('co_jams_and_jugs_2', 'co_jams_and_jugs', null, null, null),
  ('co_blocks_and_locks_2', 'co_blocks_and_locks', null, null, null),
  ('co_chips_and_salsa_3', 'co_chips_and_salsa_2', null, null, null),
  ('co_mt_blue_sky_formerly_mount_evans_mixed_couloirs_the_snave', 'co_the_snave', null, null, null),
  ('co_mt_blue_sky_formerly_mount_evans_mixed_couloirs_the_snave_direct', 'co_the_snave_direct_2', null, null, null),
  ('co_mt_blue_sky_formerly_mount_evans_mixed_couloirs_far_right_dihedral_2nd_apron', 'co_far_right_dihedral_2nd_apron', null, null, null),
  ('co_mt_blue_sky_formerly_mount_evans_mixed_couloirs_tike_s_trike', 'co_tike_s_trike', null, null, null),
  ('ga_netherworld_back_to_the_future', 'ga_back_to_the_future', null, null, null),
  ('ga_netherworld_garden_club', 'ga_garden_club', null, null, null),
  ('ga_netherworld_netherworld_excavation', 'ga_netherworld_excavation', null, null, null),
  ('ga_netherworld_nooner', 'ga_nooner', null, null, null),
  ('co_engineer_pass_crag_texas_wheelchair_massacre', 'co_texas_wheelchair_massacre', null, null, null),
  ('co_engineer_pass_crag_light_line', 'co_light_line', null, null, null),
  ('co_engineer_pass_crag_darkline', 'co_darkline', null, null, null),
  ('tn_6_the_amphitheater_tamper_proof', 'tn_tamper_proof', null, null, null),
  ('tn_6_the_amphitheater_psycho_path', 'tn_psycho_path', null, null, null),
  ('tn_6_the_amphitheater_t_rex', 'tn_t_rex', null, null, null),
  ('tn_6_the_amphitheater_open_casket', 'tn_open_casket', null, null, null),
  ('mn_tuskrat_talus_every_playground_has_bongos', 'mn_gunflint_trail_every_playground_has_bongos', null, null, null),
  ('mn_tuskrat_talus_mike_s_goo_canoe', 'mn_gunflint_trail_mike_s_goo_canoe', null, null, null),
  ('mn_tuskrat_talus_reverse_cowgirl', 'mn_gunflint_trail_reverse_cowgirl', null, null, null),
  ('mn_tuskrat_talus_toeby_mctoebster', 'mn_gunflint_trail_toeby_mctoebster', null, null, null),
  ('mn_tuskrat_talus_pb_j_rocket', 'mn_gunflint_trail_pb_j_rocket', null, null, null),
  ('mn_tuskrat_talus_lego_ninjago', 'mn_gunflint_trail_lego_ninjago', null, null, null),
  ('mn_tuskrat_talus_dairy_queen_diagonal', 'mn_gunflint_trail_dairy_queen_diagonal', null, null, null),
  ('mn_tuskrat_talus_rake_and_haul', 'mn_gunflint_trail_rake_and_haul', null, null, null),
  ('mn_tuskrat_talus_jumpin', 'mn_gunflint_trail_jumpin', null, null, null),
  ('mn_tuskrat_talus_dairy_queen_direct', 'mn_gunflint_trail_dairy_queen_direct', null, null, null),
  ('mn_tuskrat_talus_big_head_reacharound', 'mn_gunflint_trail_big_head_reacharound', null, null, null),
  ('mn_tuskrat_talus_lucky_7', 'mn_gunflint_trail_lucky_7', null, null, null),
  ('mn_tuskrat_talus_the_life_and_times_of_mike_fanning', 'mn_gunflint_trail_the_life_and_times_of_mike_fanning', null, null, null),
  ('mn_tuskrat_talus_big_head_rail', 'mn_gunflint_trail_big_head_rail', null, null, null),
  ('mn_tuskrat_talus_highball_sideways', 'mn_gunflint_trail_highball_sideways', null, null, null),
  ('mn_tuskrat_talus_golden_girls', 'mn_gunflint_trail_golden_girls', null, null, null),
  ('mn_tuskrat_talus_andy_s_crack', 'mn_gunflint_trail_andy_s_crack', null, null, null),
  ('mn_tuskrat_talus_golden_godzilla', 'mn_gunflint_trail_golden_godzilla', null, null, null),
  ('mn_tuskrat_talus_free_solo_sideways', 'mn_gunflint_trail_free_solo_sideways', null, null, null),
  ('mn_tuskrat_talus_one_eyed_willy', 'mn_gunflint_trail_one_eyed_willy', 'V8+ PG13', 8, null),
  ('mn_tuskrat_talus_you_greedy_dirtbag', 'mn_gunflint_trail_you_greedy_dirtbag', 'V9 R', 9, null);

create temp table m_route_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
-- (m_route_rename: none in this plan)

create temp table m_move(id text primary key, from_area text not null, to_area text not null, bypass boolean not null) on commit drop;
insert into m_move values
  ('wa_gray_people_mini_clench', 'wa_world_wall_ii', 'wa_x_world_wall_ii', false),
  ('wa_honorable_discharge', 'wa_world_wall_ii', 'wa_x_world_wall_ii', false),
  ('wa_reformation', 'wa_world_wall_ii', 'wa_x_world_wall_ii', false),
  ('wa_webelo', 'wa_world_wall_ii', 'wa_x_world_wall_ii', false),
  ('wa_scarlett_letter', 'wa_world_wall_ii', 'wa_x_world_wall_ii', false),
  ('wa_don_t_ask_don_t_tell', 'wa_world_wall_ii', 'wa_x_world_wall_ii', false),
  ('wa_the_wetness', 'wa_world_wall_ii', 'wa_x_world_wall_ii', false),
  ('wa_rear_admiral', 'wa_world_wall_ii', 'wa_x_world_wall_ii', false),
  ('wa_black_plague', 'wa_world_wall_ii', 'wa_x_world_wall_ii', false),
  ('wa_the_sickness', 'wa_world_wall_ii', 'wa_x_world_wall_ii', false),
  ('ca_chicken_heart_2', 'ca_main_wall_19', 'ca_main_wall_15', false),
  ('ca_rock_on_left', 'ca_main_wall_19', 'ca_main_wall_15', false),
  ('sd_the_traverse', 'sd_indian_wars_wall', 'sd_wars_wall', false),
  ('sd_the_scalp', 'sd_indian_wars_wall', 'sd_wars_wall', false),
  ('sd_teepee_creeper', 'sd_indian_wars_wall', 'sd_wars_wall', false),
  ('tx_how_to_counter_your_apprehension', 'tx_war_on_rugs_wall', 'tx_crankenstein', false),
  ('tx_grass_attack', 'tx_war_on_rugs_wall', 'tx_crankenstein', false),
  ('tx_nudity', 'tx_war_on_rugs_wall', 'tx_crankenstein', false),
  ('tx_mona_pelagrosa', 'tx_war_on_rugs_wall', 'tx_crankenstein', false),
  ('tx_ant_encounters', 'tx_war_on_rugs_wall', 'tx_crankenstein', false),
  ('tx_t_parties_one_removed', 'tx_war_on_rugs_wall', 'tx_crankenstein', false),
  ('tx_peligrosa_right', 'tx_war_on_rugs_wall', 'tx_crankenstein', false),
  ('tx_war_on_rugs_wall_astroturf', 'tx_war_on_rugs_wall', 'tx_crankenstein', false),
  ('co_falcon_derby', 'co_weston_pass_weston_wall', 'co_weston_wall', false),
  ('co_diamond_couloir', 'co_mt_evans_mixed_couloirs', 'co_mt_blue_sky_formerly_mount_evans_mixed_couloirs', false);

create temp table m_reparent(id text primary key, from_area text not null, to_area text not null) on commit drop;
insert into m_reparent values
  ('al_temp_hp40', 'alabama', 'al_horse_pens_40');

create temp table m_drop_area(id text primary key, into_area text not null, ord int not null) on commit drop;
insert into m_drop_area values
  ('nc_terraces_transfomer_area_the', 'nc_transfomer_area', 0),
  ('wa_answer_man', 'wa_taller_boulder', 1),
  ('wa_world_wall_ii', 'wa_x_world_wall_ii', 2),
  ('ut_new_sub_area_1_2', 'ut_monk_s_hollow', 3),
  ('ca_uphill_nature_nazi', 'ca_uphill_boulder_2', 4),
  ('ma_b_block', 'ma_a_and_b_blocks', 5),
  ('ca_main_wall_19', 'ca_main_wall_15', 6),
  ('ca_east_face_of_the_elephant_s_head_the_caves', 'ca_east_face_of_the_elephant_head_the_caves', 7),
  ('az_east_elden_below_lost_elden', 'az_bird_sanctuary', 8),
  ('sd_indian_wars_wall', 'sd_wars_wall', 9),
  ('nc_left_field', 'nc_hanging_chain_left_field', 10),
  ('tx_war_on_rugs_wall', 'tx_crankenstein', 11),
  ('ma_temp_area_2', 'ma_corps_wall', 12),
  ('bc_rainbow_boulder', 'bc_lucky_charms', 13),
  ('bc_way_boulder', 'bc_my_may', 14),
  ('or_north_wall', 'or_b_north_bowl', 15),
  ('tn_leda_shade_wall', 'tn_leda_shade_wall_2', 16),
  ('co_weston_pass_weston_wall', 'co_weston_wall', 17),
  ('co_mt_evans_mixed_couloirs', 'co_mt_blue_sky_formerly_mount_evans_mixed_couloirs', 18),
  ('co_engineer_pass', 'co_engineer_pass_crag', 19);

create temp table m_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
insert into m_rename values
  ('al_temp_hp40', 'Temp HP40', 'Horse Pens 40 Routes');

create temp table m_new_area(id text primary key, name text not null, parent_id text not null, final_parent text not null, area_type text, region text, lat double precision, lng double precision) on commit drop;
-- (m_new_area: none in this plan)

create temp table m_junk(id text primary key, area_id text not null, name text not null) on commit drop;
-- (m_junk: none in this plan)

-- every ancestor of every touched area, read BEFORE anything moves (old and new ancestors both)
create temp table m_recount on commit drop as
  select distinct a.id from areas a join areas t on a.path @> t.path
   where t.id in ('nc_terraces_transfomer_area_the', 'nc_transfomer_area', 'wa_answer_man', 'wa_taller_boulder', 'wa_world_wall_ii', 'wa_x_world_wall_ii', 'ut_new_sub_area_1_2', 'ut_monk_s_hollow', 'ca_uphill_nature_nazi', 'ca_uphill_boulder_2', 'ma_b_block', 'ma_a_and_b_blocks', 'ca_main_wall_19', 'ca_main_wall_15', 'ca_east_face_of_the_elephant_s_head_the_caves', 'ca_east_face_of_the_elephant_head_the_caves', 'az_east_elden_below_lost_elden', 'az_bird_sanctuary', 'sd_indian_wars_wall', 'sd_wars_wall', 'nc_left_field', 'nc_hanging_chain_left_field', 'tx_war_on_rugs_wall', 'tx_crankenstein', 'ma_temp_area_2', 'ma_corps_wall', 'bc_rainbow_boulder', 'bc_lucky_charms', 'bc_way_boulder', 'bc_my_may', 'or_north_wall', 'or_b_north_bowl', 'tn_leda_shade_wall', 'tn_leda_shade_wall_2', 'co_weston_pass_weston_wall', 'co_weston_wall', 'co_mt_evans_mixed_couloirs', 'co_mt_blue_sky_formerly_mount_evans_mixed_couloirs', 'co_engineer_pass', 'co_engineer_pass_crag', 'alabama', 'al_horse_pens_40', 'al_point_boulders_highlife_boulder', 'al_temp_hp40', 'al_out_of_the_box_area', 'al_slider_boulder_the', 'al_skywalker_area', 'al_flat_roof_boulder', 'al_turtle_rock_big_boulder', 'al_point_boulders_eight_ball_boulder', 'al_turtle_rock_area_turtle_boulder', 'al_supa_coola_area', 'al_hp_canyon', 'al_vandala_boulder', 'al_lady_slipper_boulder_the', 'al_mortal_combat_area_light_post_boulders', 'al_turtle_rock_area_small_stage_boulder', 'al_turtle_rock_natural_boulder', 'al_point_boulders_redneck_boulder', 'al_turtle_rock_area_whiplash_boulders', 'al_roadside_boulders_cadillac_thrills_boulder', 'al_uniball_area', 'al_mulletino_boulder', 'al_point_boulders_crown_boulder', 'wa_tin_man_boulder', 'wa_tin_man_climbs', 'wa_quantum_mechanics_boulder', 'wa_chaos_boulders_climbs', 'wa_seams_dangerous_boulder', 'ca_wildcat_point', 'ca_grand_canyon_of_the_tuolumne_climbs', 'co_sunshine_wall_2', 'co_turtle_rocks_camping_area_climbs', 'ca_shop_roof', 'ca_top_of_the_world', 'co_heaven_wall', 'co_north_end_the_climbs', 'ma_chumbo_farmstrong_area', 'ma_rose_ledge_climbs', 'co_umbrella_wall_2', 'ma_rook_and_bishop_area', 'tx_elm_hollow_point', 'tx_hostility_boulders_aka_ham_creek_park', 'vt_bns_boulder', 'vt_red_light_district_climbs', 'wa_snoqualmie_mountain_climbs', 'wa_winter_spring_ice_snow_mixed_2', 'az_cholla_boulders', 'az_gate_s_pass_climbs', 'co_miscellaneous_boulders_3', 'co_lightner_creek_climbs', 'co_left_wall', 'co_v_mountain_aka_v_rock_climbs', 'va_whale_boulder_the', 'va_james_river_park_system', 'ma_07_buoux_buttress', 'ma_05_french_king_buttress', 'or_a_east_wall', 'ma_01_introductory_buttress', 'va_biker_area_the', 'ky_global_village_bouldering', 'ky_global_village', 'ma_04_amphitheater_short_wall', 'wa_chair_peak', 'co_bukowsi_boulder', 'co_quarry_the_2', 'co_ironsides_slab', 'co_pike_s_peak_2', 'co_right_wall', 'id_mecca_boulder', 'id_taj_mahal_the', 'ma_03_overhang_buttress', 'tn_5_the_wasteland', 'tn_t_wall_west', 'tn_the_camp', 'tn_redacted', 'mn_mystical_mountain_south', 'mn_mystical_mountain_zone', 'ga_netherworld', 'ga_lost_wall_climbs', 'tn_6_the_amphitheater', 'mn_tuskrat_talus', 'mn_gunflint_trail');

do $$ declare n int; begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog: nothing to fold.
  select count(*) into n from areas where id in (select id from m_drop_area);
  if n = 0 then raise notice '0278: no catalog, nothing to fold'; return; end if;
  if n <> 20 then raise exception '0278: expected 20 copy areas, found %', n; end if;
  -- the tree must still be the one the plan read
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.from_area;
  if n <> 25 then raise exception '0278: % of 25 climbs are where the plan found them', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep join routes o on o.id = m.drop_id;
  if n <> 490 then raise exception '0278: % of 490 merge pairs still exist', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.from_area;
  if n <> 1 then raise exception '0278: % of 1 sub-areas are where the plan found them', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.from_name;
  if n <> 1 then raise exception '0278: % of 1 renames still carry the planned name', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.from_name;
  if n <> 0 then raise exception '0278: % of 0 climb renames still carry the planned name', n; end if;
  select count(*) into n from areas where id in (select id from m_new_area);
  if n > 0 then raise exception '0278: % of the new areas already exist', n; end if;
  select count(*) into n from m_junk j join routes r on r.id = j.id and r.area_id = j.area_id and r.name = j.name;
  if n <> 0 then raise exception '0278: % of 0 junk rows are where they were read', n; end if;
  -- every climb on a copy is accounted for
  select count(*) into n from routes r join m_drop_area d on d.id = r.area_id
   where r.id not in (select id from m_move) and r.id not in (select drop_id from m_merge);
  if n > 0 then raise exception '0278: % climbs on a copy are not in the plan', n; end if;
  select count(*) into n from areas a join m_drop_area d on d.id = a.parent_id
   where a.id not in (select id from m_reparent) and a.id not in (select id from m_drop_area);
  if n > 0 then raise exception '0278: % sub-areas of a copy are not in the plan', n; end if;
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
  if n > 0 then raise exception '0278: % climber rows point at a row this deletes — stop and repoint them', n; end if;
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
  if n > 0 then raise exception '0278: % climber rows still point at a copy', n; end if;
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
  if n > 0 then raise exception '0278: % copy areas were not emptied', n; end if;
  select count(*) into n from routes where id in (select drop_id from m_merge union select id from m_junk);
  if n > 0 then raise exception '0278: % merged or junk climbs survived', n; end if;
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.to_area;
  if n <> 25 then raise exception '0278: % of 25 climbs moved', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.to_name;
  if n <> 1 then raise exception '0278: % of 1 renames landed', n; end if;
  select count(*) into n from m_new_area m join areas a on a.id = m.id and a.parent_id = m.final_parent and a.route_count > 0;
  if n <> 0 then raise exception '0278: % of 0 new areas are in place, holding their climbs', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.to_area;
  if n <> 1 then raise exception '0278: % of 1 sub-areas re-parented', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.to_name;
  if n <> 0 then raise exception '0278: % of 0 climb renames landed', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep where m.grade is not null and (k.grade <> m.grade or k.grade_num is distinct from m.grade_num);
  if n > 0 then raise exception '0278: % merged grades or grade_nums did not land', n; end if;
  -- no area holds climbs AND sub-areas
  select count(*) into n from areas a where a.id in (select id from m_recount)
     and exists (select 1 from routes r where r.area_id = a.id) and exists (select 1 from areas s where s.parent_id = a.id);
  if n > 0 then raise exception '0278: % areas hold climbs and sub-areas', n; end if;
end $$;

commit;
