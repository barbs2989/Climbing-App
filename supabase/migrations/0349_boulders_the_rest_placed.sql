-- 0349: the rest of the catch-all climbs 0320 left waiting, placed by the same strict test, with three more rules
-- from what 0320 got wrong (0324):
--   * a chain that begins at the STATE is unsure and waits (0320's Temp HP40 bin and second Coney Rock Preserve);
--   * a name is tested for "generic" WITH its ancestors ("CT Bouldering" beside Connecticut), and a generic LEVEL
--     inside a chain ("Bouldering", "Top Rope") is stepped over, its children filed on its parent; a generic HOME waits;
--   * when several areas of ours could be the home, the ONE inside the list's own crag is taken; otherwise it waits.
-- Also: the 591 climbs whose name the source lists once but which several areas of ours share; each kept only when
-- its home sits inside the list's crag within 3 km.
-- Every new area was read against every area within 3 km (9 were the same place and were dropped), and EVERY move,
-- not a sample, was checked against the climb's live source page; a move whose page now says otherwise was dropped
-- (the crawl can be stale: Crimpfest has moved to A Block).
-- 0 climbs merged, 364 moved, 11 lists deleted.
-- No contribution, log, photo, topo, list or report on any climb this deletes; a moved climb keeps its id.
-- ABORTS if climber data points at a climb deleted, or if the live tree no longer matches the plan.
-- Plan: the job's fold24/ (decide.mjs, near.mjs, drop-read.json, live-all.mjs, live-drops.json); rollback:
-- scripts/data/boulders-rest-rollback.json.

begin;

create temp table m_merge(keep text not null, drop_id text primary key, grade text, grade_num numeric, disc text) on commit drop;
-- (m_merge: none in this plan)

create temp table m_route_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
-- (m_route_rename: none in this plan)

create temp table m_move(id text primary key, from_area text not null, to_area text not null, bypass boolean not null) on commit drop;
insert into m_move values
  ('me_all_seriousness_aside', 'me_eagle_bluff_climbs', 'me_04_main_face', false),
  ('me_amber_waves_of_grain', 'me_eagle_bluff_climbs', 'me_04_main_face', false),
  ('me_delirious', 'me_eagle_bluff_climbs', 'me_04_main_face', false),
  ('me_eagle_direct', 'me_eagle_bluff_climbs', 'me_04_main_face', false),
  ('me_element_115', 'me_eagle_bluff_climbs', 'me_04_main_face', false),
  ('me_longitudinal_wave', 'me_eagle_bluff_climbs', 'me_04_main_face', false),
  ('me_no_rest_for_the_wicked', 'me_eagle_bluff_climbs', 'me_04_main_face', false),
  ('me_reckless_abandon', 'me_eagle_bluff_climbs', 'me_04_main_face', false),
  ('me_route_awakening', 'me_eagle_bluff_climbs', 'me_04_main_face', false),
  ('me_slice_of_the_gunks', 'me_eagle_bluff_climbs', 'me_08_right_end', false),
  ('me_walk_on_the_mild_side', 'me_eagle_bluff_climbs', 'me_04_main_face', false),
  ('me_wave_guide', 'me_eagle_bluff_climbs', 'me_04_main_face', false),
  ('me_wheaties', 'me_eagle_bluff_climbs', 'me_04_main_face', false),
  ('me_where_eagles_dare', 'me_eagle_bluff_climbs', 'me_04_main_face', false),
  ('tn_ship_s_ahoy', 'tn_north_clear_creek_2', 'tn_the_dihedrals', false),
  ('tn_under_the_gun', 'tn_north_clear_creek_2', 'tn_the_dihedrals', false),
  ('or_warmup_boulder_left', 'or_main_forest_climbs', 'or_d_warm_up_boulder', false),
  ('or_warmup_boulder_right', 'or_main_forest_climbs', 'or_d_warm_up_boulder', false),
  ('az_crusade', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_divine_vessel', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_felicity', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_hoarse_platitudes', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_holy_hand_grenade', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_homeostasis', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_homeostasis_extension', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_homo_faber', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_i_m_not_dead_yet', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_i_w_s', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_magnum_opus', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_mantis', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_merely_a_flesh_wound', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_mesquiter', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_planned_obsolescence', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_raven_nation', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_swamp_king', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_sweaty_guilty', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_the_honeycomb', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_the_inquisition', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_the_other_side', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_the_serf', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_top_shelf', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_total_depravity', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_voyager_one', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_weasel_squeezer', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('az_who_s_there', 'az_grail_the_climbs', 'az_south_wall_3', false),
  ('ca_beke_s_wild_ride', 'ca_limbo_area_climbs', 'ca_trailside', false),
  ('ca_mighty_monger', 'ca_limbo_area_climbs', 'ca_trailside', false),
  ('ca_mission_obscurity', 'ca_limbo_area_climbs', 'ca_trailside', false),
  ('ca_turkey_chute', 'ca_limbo_area_climbs', 'ca_trailside', false),
  ('ca_vawter_s_dihedral', 'ca_limbo_area_climbs', 'ca_trailside', false),
  ('ca_volume_i', 'ca_limbo_area_climbs', 'ca_trailside', false),
  ('vt_black_streak', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_bless_the_rains', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_boneless_chicken', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_bum_cakes', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_captain_planet', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_chicken_wing_slab', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_chris_s_corner', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_empty_clip', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_falcons_fury', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_just_for_goobs', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_ledge_connector', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_lycanthropy', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_marshfield_corners', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_my_lucky_bun_day', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_proud_and_free', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_requiem_for_a_dreamer', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_solipsism', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_storm_king', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_the_deadline', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_the_swarm', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_wasp_flake', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_wee_bitty_arachnid', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('vt_where_the_sidewalk_ends', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', false),
  ('or_legal_system', 'or_bonzi_boulders', 'or_wave_boulder_2', false),
  ('wy_dunce_dance_revolution', 'wy_joint_the_climbs', 'wy_the_terrace', false),
  ('wa_alimony_blues', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_b_s_knees', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_clay_pigeon', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_eyeliner', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_hip_fracture', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_irish_spring', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_join_the_club', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_lipstick', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_nosferatu', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_outsourced', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_phobics_of_tradgedy', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_pickles_for_pod', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_pocket_full_of_dragons', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_ragged_old_flag', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_rainshadow_crack_dallas_memorial_route', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_red_panda', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_right_on', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_scrub_tech', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_slippter_crack', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_snugglefuk', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_sweet_and_sour', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_the_missing_lynx', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_the_poop_deck', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_worth_the_wait', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('wa_xin', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', false),
  ('ca_a_florida_man', 'ca_mayhem_cove_climbs', 'ca_right_side_8', false),
  ('ca_black_rain', 'ca_mayhem_cove_climbs', 'ca_right_side_8', false),
  ('ca_cajun_hell', 'ca_mayhem_cove_climbs', 'ca_right_side_8', false),
  ('ca_car_jacker', 'ca_mayhem_cove_climbs', 'ca_left_side_7', false),
  ('ca_cubic_zarconia', 'ca_mayhem_cove_climbs', 'ca_right_side_8', false),
  ('ca_disturbing_the_priest', 'ca_mayhem_cove_climbs', 'ca_right_side_8', false),
  ('ca_drinkin_white_lightning', 'ca_mayhem_cove_climbs', 'ca_right_side_8', false),
  ('ca_dwi', 'ca_mayhem_cove_climbs', 'ca_left_side_7', false),
  ('ca_gator_bait', 'ca_mayhem_cove_climbs', 'ca_right_side_8', false),
  ('ca_huntin_gator', 'ca_mayhem_cove_climbs', 'ca_right_side_8', false),
  ('ca_india_ink', 'ca_mayhem_cove_climbs', 'ca_left_side_7', false),
  ('ca_jumbolia', 'ca_mayhem_cove_climbs', 'ca_right_side_8', false),
  ('ca_kyle_s_face', 'ca_mayhem_cove_climbs', 'ca_right_side_8', false),
  ('ca_malice_in_chains', 'ca_mayhem_cove_climbs', 'ca_left_side_7', false),
  ('ca_mutilated_corpses', 'ca_mayhem_cove_climbs', 'ca_left_side_7', false),
  ('ca_physical_evidence', 'ca_mayhem_cove_climbs', 'ca_left_side_7', false),
  ('ca_psycho_ii', 'ca_mayhem_cove_climbs', 'ca_right_side_8', false),
  ('ca_skullduggery', 'ca_mayhem_cove_climbs', 'ca_right_side_8', false),
  ('ca_slander', 'ca_mayhem_cove_climbs', 'ca_right_side_8', false),
  ('ca_the_coroner', 'ca_mayhem_cove_climbs', 'ca_left_side_7', false),
  ('ca_the_guillotine_direct', 'ca_mayhem_cove_climbs', 'ca_right_side_8', false),
  ('ca_verbal_abuse', 'ca_mayhem_cove_climbs', 'ca_right_side_8', false),
  ('co_archaeopteryx', 'co_seal_rock_climbs', 'co_north_side_3', false),
  ('co_love_wins', 'co_seal_rock_climbs', 'co_north_side_3', false),
  ('co_nattiq', 'co_seal_rock_climbs', 'co_north_side_3', false),
  ('co_sea_bird', 'co_seal_rock_climbs', 'co_north_side_3', false),
  ('co_storm_bird', 'co_seal_rock_climbs', 'co_north_side_3', false),
  ('co_the_hinge', 'co_seal_rock_climbs', 'co_north_side_3', false),
  ('co_the_perfect_storm', 'co_seal_rock_climbs', 'co_north_side_3', false),
  ('co_the_stoop', 'co_seal_rock_climbs', 'co_north_side_3', false),
  ('co_the_yellow_door', 'co_seal_rock_climbs', 'co_north_side_3', false),
  ('az_chummers_class', 'az_2_middle_area', 'az_3_south_end', false),
  ('az_electric_shitstorm', 'az_2_middle_area', 'az_3_south_end', false),
  ('az_final_countdown', 'az_2_middle_area', 'az_3_south_end', false),
  ('az_old_walley', 'az_2_middle_area', 'az_3_south_end', false),
  ('az_pez_photo_enforcement_zone', 'az_2_middle_area', 'az_3_south_end', false),
  ('az_sunny_side', 'az_2_middle_area', 'az_3_south_end', false),
  ('az_the_creature', 'az_2_middle_area', 'az_3_south_end', false),
  ('az_the_whistle_stop', 'az_2_middle_area', 'az_3_south_end', false),
  ('ca_afterburner', 'ca_k_public_sanitation_wall_climbs', 'ca_upper_tier_12', false),
  ('ca_afterburner_variation', 'ca_k_public_sanitation_wall_climbs', 'ca_upper_tier_12', false),
  ('ca_best_bet_arete', 'ca_k_public_sanitation_wall_climbs', 'ca_lower_tier_12', false),
  ('ca_carpet_bagger', 'ca_k_public_sanitation_wall_climbs', 'ca_lower_tier_12', false),
  ('ca_final_cut', 'ca_k_public_sanitation_wall_climbs', 'ca_lower_tier_12', false),
  ('ca_higher_than_you', 'ca_k_public_sanitation_wall_climbs', 'ca_upper_tier_12', false),
  ('ca_retrobolted_and_super_fun', 'ca_k_public_sanitation_wall_climbs', 'ca_upper_tier_12', false),
  ('ca_sanitary_engineer', 'ca_k_public_sanitation_wall_climbs', 'ca_upper_tier_12', false),
  ('ca_solid_waste', 'ca_k_public_sanitation_wall_climbs', 'ca_upper_tier_12', false),
  ('ca_temple_of_doom', 'ca_k_public_sanitation_wall_climbs', 'ca_upper_tier_12', false),
  ('ca_total_way_ist', 'ca_k_public_sanitation_wall_climbs', 'ca_upper_tier_12', false),
  ('ca_tucker_s_proud_rock_climb', 'ca_k_public_sanitation_wall_climbs', 'ca_upper_tier_12', false),
  ('ca_waste_not_whip_not', 'ca_k_public_sanitation_wall_climbs', 'ca_upper_tier_12', false),
  ('ca_wide_thing', 'ca_k_public_sanitation_wall_climbs', 'ca_lower_tier_12', false),
  ('ca_all_that_glitters_is_not_golden', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_andromeda_strain', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_big_bad_bitch', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_bitch_bitch', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_bolder_face', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_dance_on_a_dragon_s_back', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_ditch_witch', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_hurricane_hugo', 'ca_afpa_rock_climbs', 'ca_north_face_20', false),
  ('ca_mcdonald_wilson', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_request_chimney', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_sand_witch', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_spaghetti_sauce_sunset', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_stakeout', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_the_terminal_man', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_two_our_surprise', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_which_bitch', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_which_witch', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_witchy_woman', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('ca_zsa_zsa_goes_to_jail', 'ca_afpa_rock_climbs', 'ca_south_face_20', false),
  ('wa_5_7ish_project_3', 'wa_cliff_drive_climbs', 'wa_main_wall_13', false),
  ('wa_black_lava_flows', 'wa_cliff_drive_climbs', 'wa_main_wall_13', false),
  ('wa_bum_camp', 'wa_cliff_drive_climbs', 'wa_main_wall_13', false),
  ('wa_cave_of_ashes', 'wa_cliff_drive_climbs', 'wa_main_wall_13', false),
  ('wa_cinco_nueve', 'wa_cliff_drive_climbs', 'wa_main_wall_13', false),
  ('wa_hobo_surprise', 'wa_cliff_drive_climbs', 'wa_main_wall_13', false),
  ('wa_in_search_of_frozen_magma', 'wa_cliff_drive_climbs', 'wa_main_wall_13', false),
  ('wa_little_green_bean_pillar', 'wa_cliff_drive_climbs', 'wa_main_wall_13', false),
  ('wa_secrets_of_giants', 'wa_cliff_drive_climbs', 'wa_main_wall_13', false),
  ('wa_seven_up', 'wa_cliff_drive_climbs', 'wa_main_wall_13', false),
  ('wa_skipping_stones', 'wa_cliff_drive_climbs', 'wa_main_wall_13', false),
  ('wa_so_far_gone', 'wa_cliff_drive_climbs', 'wa_main_wall_13', false),
  ('wa_tenacious', 'wa_cliff_drive_climbs', 'wa_main_wall_13', false),
  ('wa_the_basaltic_lava', 'wa_cliff_drive_climbs', 'wa_main_wall_13', false),
  ('wa_volcanoes_rise_again', 'wa_cliff_drive_climbs', 'wa_main_wall_13', false),
  ('az_dope_smoker', 'az_parking_area_bouldering_climbs', 'az_the_egg', false),
  ('az_the_yoker', 'az_parking_area_bouldering_climbs', 'az_the_egg', false),
  ('az_baradur', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('az_bender_axen', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('az_black_magic_woman', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('az_black_quacker', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('az_charadras', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('az_chiboni', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('az_chicken_sh_t_sandwich', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('az_helm_s_deep', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('az_lude', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('az_main_gate', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('az_not_so_easy_arch', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('az_quick_death', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('az_rotissima_bueno', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('az_storm_crow', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('az_the_corner', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('az_the_other_way', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('az_voodoo_child_direct_start', 'az_rappel_rock_2_climbs', 'az_south_face_3', false),
  ('nh_boulder_6_and_tipsy', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_closer_to_the_sun_on_pelton_bldr', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_cutlass_crack_on_pelton_bldr', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_field_loss_on_pelton_bldr', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_in_the_black', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_innies_outies_on_pelton_bldr', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_lion_king_on_ice_on_pelton_bldr', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_man_of_fire_on_pelton_boulder', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_marmaduke_on_pelton_bldr', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_moose_ball_ar_te_on_the_prow', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_more_photos_of_the_prow', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_over_current_on_pelton_bldr', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_phase_loss_on_pelton_bldr', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_photo_s_of_boulder_3', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_photos_of_boulder_4', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_photos_of_boulders_1_2', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_photos_of_pelton_boulder_boulder_5', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_short_circuit_on_the_prow', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('nh_triangle_face', 'nh_07_beyond_lurp_boulders', 'nh_07_main_cliff_boulders', false),
  ('oh_milk_money', 'oh_kiedaisch_point_climbs', 'oh_south_wall_3', false),
  ('oh_ohanna', 'oh_kiedaisch_point_climbs', 'oh_south_wall_3', false),
  ('oh_rainy_day', 'oh_kiedaisch_point_climbs', 'oh_south_wall_3', false),
  ('oh_violation', 'oh_kiedaisch_point_climbs', 'oh_south_wall_3', false),
  ('az_enter_sandman', 'az_insomnia_canyon_climbs', 'az_left_side', false),
  ('az_the_jamaican_bobsled_team', 'az_insomnia_canyon_climbs', 'az_left_side', false),
  ('az_dark_ages', 'az_south_castle_tower', 'az_south_face_2', false),
  ('az_gillotine_left', 'az_south_castle_tower', 'az_south_face_2', false),
  ('az_gillotine_right', 'az_south_castle_tower', 'az_south_face_2', false),
  ('az_henchman', 'az_south_castle_tower', 'az_south_face_2', false),
  ('az_jester', 'az_south_castle_tower', 'az_south_face_2', false),
  ('az_mid_evil_times', 'az_south_castle_tower', 'az_south_face_2', false),
  ('az_mrs_robinson', 'az_south_castle_tower', 'az_south_face_2', false),
  ('az_royalty', 'az_south_castle_tower', 'az_south_face_2', false),
  ('ny_clinger_crack', 'ny_rock_city_state_forest_climbs', 'ny_highball_boulder_2', false),
  ('me_cell_block_d', 'me_main_wall', 'me_main_face_2', false),
  ('me_it_ain_t_pretty_being_easy', 'me_main_wall', 'me_main_face_2', false),
  ('me_shagg_it', 'me_main_wall', 'me_main_face_2', false),
  ('me_shagg_zag', 'me_main_wall', 'me_main_face_2', false),
  ('me_shaggadelic', 'me_main_wall', 'me_main_face_2', false),
  ('me_shaggin_wagon', 'me_main_wall', 'me_main_face_2', false),
  ('me_tight_rope', 'me_main_wall', 'me_main_face_2', false),
  ('me_two_shaved_heads', 'me_main_wall', 'me_main_face_2', false),
  ('me_unitard', 'me_main_wall', 'me_main_face_2', false),
  ('me_what_about_bob', 'me_main_wall', 'me_main_face_2', false),
  ('me_when_the_fat_lady_sings', 'me_main_wall', 'me_main_face_2', false),
  ('pa_blue_velvet_america', 'pa_nay_aug_park_climbs', 'pa_main_wall_9', false),
  ('pa_corrupted_brow', 'pa_nay_aug_park_climbs', 'pa_main_wall_9', false),
  ('pa_hard_very_scranton', 'pa_nay_aug_park_climbs', 'pa_main_wall_9', false),
  ('pa_hope', 'pa_nay_aug_park_climbs', 'pa_main_wall_9', false),
  ('pa_leaving_buenos_aires', 'pa_nay_aug_park_climbs', 'pa_main_wall_9', false),
  ('pa_mini_prow', 'pa_nay_aug_park_climbs', 'pa_main_wall_9', false),
  ('pa_punctured_beauty', 'pa_nay_aug_park_climbs', 'pa_main_wall_9', false),
  ('pa_to_have_and_two_hold', 'pa_nay_aug_park_climbs', 'pa_main_wall_9', false),
  ('pa_tree_house_traverse', 'pa_nay_aug_park_climbs', 'pa_main_wall_9', false),
  ('pa_try_not', 'pa_nay_aug_park_climbs', 'pa_main_wall_9', false),
  ('az_apapacho', 'az_exit_gorge', 'az_upper_wall_3', false),
  ('az_crown_dancer', 'az_exit_gorge', 'az_upper_wall_3', false),
  ('az_electra_glide', 'az_exit_gorge', 'az_upper_wall_3', false),
  ('az_frog_leg_squimney', 'az_exit_gorge', 'az_upper_wall_3', false),
  ('az_hornet_swarm', 'az_exit_gorge', 'az_upper_wall_3', false),
  ('az_nefertiti', 'az_exit_gorge', 'az_upper_wall_3', false),
  ('az_phoenix_five_six', 'az_exit_gorge', 'az_lower_wall_2', false),
  ('ca_aggrieved_monkey', 'ca_pinnacle_rock', 'ca_main_formation_2', false),
  ('ca_bucket_prow', 'ca_pinnacle_rock', 'ca_main_formation_2', false),
  ('ca_full_remillard_traverse', 'ca_pinnacle_rock', 'ca_main_formation_2', false),
  ('ca_reachy_face_climb', 'ca_pinnacle_rock', 'ca_main_formation_2', false),
  ('ca_remillard_traverse', 'ca_pinnacle_rock', 'ca_main_formation_2', false),
  ('nh_bound_by_blood', 'nh_eagle_cliff_climbs', 'nh_01_main_wall', false),
  ('nh_farewell_angelina', 'nh_eagle_cliff_climbs', 'nh_01_main_wall', false),
  ('nh_pin_it_p1', 'nh_eagle_cliff_climbs', 'nh_01_main_wall', false),
  ('nh_pin_it_to_win_it', 'nh_eagle_cliff_climbs', 'nh_01_main_wall', false),
  ('nh_stoned_fingers_p1', 'nh_eagle_cliff_climbs', 'nh_01_main_wall', false),
  ('nh_super_best_bubs', 'nh_eagle_cliff_climbs', 'nh_01_main_wall', false),
  ('nh_the_late_show', 'nh_eagle_cliff_climbs', 'nh_01_main_wall', false),
  ('nh_w_nderbub', 'nh_eagle_cliff_climbs', 'nh_01_main_wall', false),
  ('wa_hangman', 'wa_shangri_la_climbs', 'wa_a_upper_tier', false),
  ('ny_azurite', 'ny_azure_mountain', 'ny_main_face_2', false),
  ('ny_chalk_full_o_nuts', 'ny_azure_mountain', 'ny_main_face_2', false),
  ('ny_chasing_the_scream', 'ny_azure_mountain', 'ny_main_face_2', false),
  ('ny_coffee_shop_panorama', 'ny_azure_mountain', 'ny_main_face_2', false),
  ('ny_paul_and_tom_s_morning_show', 'ny_azure_mountain', 'ny_main_face_2', false),
  ('ny_planet_claire', 'ny_azure_mountain', 'ny_main_face_2', false),
  ('ny_tangled_up_in_azure', 'ny_azure_mountain', 'ny_main_face_2', false),
  ('wv_cumulonimbus', 'wv_jekyll_and_hyde_area_climbs', 'wv_popcorn_boulder_2', false),
  ('wv_cumulonimbus_sit_project', 'wv_jekyll_and_hyde_area_climbs', 'wv_popcorn_boulder_2', false),
  ('wv_popcorn', 'wv_jekyll_and_hyde_area_climbs', 'wv_popcorn_boulder_2', false),
  ('wv_turn_for_the_worst', 'wv_jekyll_and_hyde_area_climbs', 'wv_popcorn_boulder_2', false),
  ('wa_suck_in_a_rut', 'wa_spire_rock_climbs', 'wa_north_wall_3', false),
  ('wa_the_waterworks', 'wa_spire_rock_climbs', 'wa_south_wall_3', false),
  ('wa_tipsy_turvy', 'wa_spire_rock_climbs', 'wa_north_wall_3', false),
  ('wy_moonscape', 'wy_moonstone_the', 'wy_upper_tier_3', false),
  ('ca_c85_arete', 'ca_campground_boulder_1', 'ca_campground_boulders_3', false),
  ('ca_erik_s_picnic', 'ca_campground_boulder_1', 'ca_campground_boulders_3', false),
  ('ca_g23_arete', 'ca_campground_boulder_1', 'ca_campground_boulders_3', false),
  ('ca_jedi_jake', 'ca_campground_boulder_1', 'ca_campground_boulders_3', false),
  ('ca_jedi_monkey', 'ca_campground_boulder_1', 'ca_campground_boulders_3', false),
  ('ca_thug_monkey', 'ca_campground_boulder_1', 'ca_campground_boulders_3', false),
  ('ca_wood_deliverer', 'ca_campground_boulder_1', 'ca_campground_boulders_3', false),
  ('co_bushes_bush', 'co_sandstone_front_of_canyon_climbs', 'co_upper_tier_7', false),
  ('co_crowns_crows_and_tiaras', 'co_sandstone_front_of_canyon_climbs', 'co_upper_tier_7', false),
  ('co_mandy_s_climb', 'co_sandstone_front_of_canyon_climbs', 'co_upper_tier_7', false),
  ('co_top_rope_route', 'co_sandstone_front_of_canyon_climbs', 'co_lower_tier_7', false),
  ('or_chaitanya', 'or_l_wall_of_shadows', 'or_left_side_2', false),
  ('or_hair_shirt', 'or_l_wall_of_shadows', 'or_right_side_2', false),
  ('or_hang_loose', 'or_l_wall_of_shadows', 'or_right_side_2', false),
  ('or_pressure_drop', 'or_l_wall_of_shadows', 'or_left_side_2', false),
  ('or_pressure_rise', 'or_l_wall_of_shadows', 'or_left_side_2', false),
  ('or_tete_gulley', 'or_l_wall_of_shadows', 'or_left_side_2', false),
  ('wa_aces_high', 'wa_ice_box_climbs', 'wa_main_wall_12', false),
  ('wa_blm', 'wa_ice_box_climbs', 'wa_main_wall_12', false),
  ('wa_essential_business', 'wa_ice_box_climbs', 'wa_upper_tier_4', false),
  ('wa_gymnastics_plus', 'wa_ice_box_climbs', 'wa_main_wall_12', false),
  ('wa_righties_need_not_apply', 'wa_ice_box_climbs', 'wa_main_wall_12', false),
  ('wa_thunder_frogs', 'wa_ice_box_climbs', 'wa_main_wall_12', false),
  ('ca_post_modern_retro_classic', 'ca_cold_springs_dome_climbs', 'ca_northwest_face_6', false),
  ('ca_judge_dredd', 'ca_main_rock', 'ca_main_wall_4', false),
  ('ca_jury_duty', 'ca_main_rock', 'ca_main_wall_4', false),
  ('ca_pseudo_bohemian_hitchiking_youth', 'ca_main_rock', 'ca_main_wall_4', false),
  ('ca_no_power', 'ca_unknown_boulder_near_parking_lot_and_river', 'ca_river_boulder', false),
  ('ca_rolling_blackouts', 'ca_unknown_boulder_near_parking_lot_and_river', 'ca_river_boulder', false),
  ('ca_watchtower_ne_face', 'ca_tower_peak', 'ca_the_watchtower_3', false),
  ('ca_watchtower_north_face', 'ca_tower_peak', 'ca_the_watchtower_3', false),
  ('ca_where_there_is_a_wall_there_is_a_way', 'ca_tower_peak', 'ca_the_watchtower_3', false),
  ('ca_where_there_is_a_will_there_is_a_way', 'ca_tower_peak', 'ca_the_watchtower_3', false),
  ('co_air_force_one', 'co_blodgett_peak_climbs', 'co_east_face_7', false),
  ('co_broken_ambience', 'co_blodgett_peak_climbs', 'co_east_face_7', false),
  ('co_erratic_warm_up_slab', 'co_blodgett_peak_climbs', 'co_east_face_7', false),
  ('co_raining_tearer', 'co_blodgett_peak_climbs', 'co_east_face_7', false),
  ('wa_chimnastics', 'wa_judith_pond_west', 'wa_west_wall_3', false),
  ('wa_painted_harlot', 'wa_judith_pond_west', 'wa_west_wall_3', false),
  ('wa_sage_advice', 'wa_judith_pond_west', 'wa_west_wall_3', false),
  ('wa_schooled', 'wa_judith_pond_west', 'wa_west_wall_3', false),
  ('wa_unk', 'wa_judith_pond_west', 'wa_west_wall_3', false),
  ('wv_beached_whale', 'wv_roundhouse_area_climbs', 'wv_whale_boulder', false),
  ('wv_stupid_human_tricks_aka_whale_s_belly', 'wv_roundhouse_area_climbs', 'wv_whale_boulder', false),
  ('az_double_stuffed', 'az_beaver_wall_at_papago', 'az_beaver_wall_2', false),
  ('az_high_maintenance', 'az_beaver_wall_at_papago', 'az_beaver_wall_2', false),
  ('az_porter_and_dax_go_to_papago', 'az_beaver_wall_at_papago', 'az_beaver_wall_2', false),
  ('az_black_quartzite', 'az_miyazaki_climbs', 'az_north_side_3', false),
  ('az_cable_what_cable', 'az_elephant_head_climbs', 'az_west_face_3', false),
  ('az_number_1', 'az_river_bend_right', 'az_eden_2', false),
  ('az_number_2', 'az_river_bend_right', 'az_eden_2', false),
  ('az_number_5', 'az_river_bend_right', 'az_eden_2', false),
  ('az_number_6', 'az_river_bend_right', 'az_eden_2', false),
  ('me_diesel', 'me_main_wall_linkups', 'me_main_face_2', false),
  ('me_short_bob', 'me_main_wall_linkups', 'me_main_face_2', false),
  ('me_short_shagg', 'me_main_wall_linkups', 'me_main_face_2', false),
  ('ca_little_roof', 'ca_red_slab', 'ca_red_wall_2', false),
  ('ca_red_slab', 'ca_red_slab', 'ca_red_wall_2', false),
  ('ca_glory_road', 'ca_glory_dome_climbs', 'ca_north_face_19', false),
  ('ca_no_guts_no_glory', 'ca_glory_dome_climbs', 'ca_north_face_19', false),
  ('ny_almost_rectum', 'ny_beaver_brook_climbs', 'ny_main_face_5', false),
  ('ny_old_guy_shootin_powder', 'ny_beaver_brook_climbs', 'ny_main_face_5', false),
  ('ny_save_a_tree_eat_a_beaver', 'ny_beaver_brook_climbs', 'ny_main_face_5', false),
  ('wv_icebox', 'wv_rocky_ridge', 'wv_main_area_3', false),
  ('wv_morphosaurus_rex', 'wv_rocky_ridge', 'wv_main_area_3', false),
  ('wv_take_us_with_you', 'wv_rocky_ridge', 'wv_main_area_3', false);

create temp table m_reparent(id text primary key, from_area text not null, to_area text not null) on commit drop;
-- (m_reparent: none in this plan)

create temp table m_drop_area(id text primary key, into_area text not null, ord int not null) on commit drop;
insert into m_drop_area values
  ('ca_limbo_area_climbs', 'ca_limbo_area', 0),
  ('wy_joint_the_climbs', 'wy_joint_the', 1),
  ('wa_cliff_drive_climbs', 'wa_cliff_drive', 2),
  ('nh_07_beyond_lurp_boulders', 'nh_sundown_bouldering', 3),
  ('pa_nay_aug_park_climbs', 'pa_nay_aug_park', 4),
  ('az_exit_gorge', 'az_christopher_creek_gorge', 5),
  ('ca_campground_boulder_1', 'ca_tuolumne_bouldering', 6),
  ('az_miyazaki_climbs', 'az_miyazaki', 7),
  ('az_river_bend_right', 'az_promised_land_the', 8),
  ('ny_beaver_brook_climbs', 'ny_beaver_brook', 9),
  ('wv_rocky_ridge', 'wv_dolly_sods_region', 10);

create temp table m_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
-- (m_rename: none in this plan)

create temp table m_new_area(id text primary key, name text not null, parent_id text not null, final_parent text not null, area_type text, region text, lat double precision, lng double precision) on commit drop;
insert into m_new_area values
  ('co_upper_tier_7', 'Upper Tier', 'co_sandstone_front_of_canyon', 'co_sandstone_front_of_canyon', 'crag', null, 40.79076, -108.73992),
  ('ca_northwest_face_6', 'Northwest Face', 'ca_cold_springs_dome', 'ca_cold_springs_dome', 'crag', null, 34.47509, -119.6746),
  ('ca_main_wall_4', 'Main Wall', 'ca_dry_creek_sea_crag', 'ca_dry_creek_sea_crag', 'crag', null, 38.47533, -123.16979),
  ('ny_main_face_5', 'Main Face', 'ny_beaver_brook', 'ny_beaver_brook', 'crag', null, 44.36494, -73.80958);

create temp table m_pin(id text primary key, lat double precision not null, lng double precision not null, approx boolean not null, from_lat double precision, from_lng double precision) on commit drop;
-- (m_pin: none in this plan)

create temp table m_lift(id text primary key, from_parent text not null, to_parent text not null) on commit drop;
-- (m_lift: none in this plan)

create temp table m_retype(id text primary key, from_type text not null, to_type text not null) on commit drop;
-- (m_retype: none in this plan)

create temp table m_junk(id text primary key, area_id text not null, name text not null) on commit drop;
-- (m_junk: none in this plan)

-- every ancestor of every touched area, read BEFORE anything moves (old and new ancestors both)
-- (each label of an area's path IS an ancestor's id: read off the path, not a self-join on @>, which took ~90 s
--  for 1,063 areas — 0296's first timing)
create temp table m_recount on commit drop as
  select distinct x.id from areas t, unnest(string_to_array(ltree2text(t.path), '.')) as x(id)
   where t.id in ('ca_limbo_area_climbs', 'ca_limbo_area', 'wy_joint_the_climbs', 'wy_joint_the', 'wa_cliff_drive_climbs', 'wa_cliff_drive', 'nh_07_beyond_lurp_boulders', 'nh_sundown_bouldering', 'pa_nay_aug_park_climbs', 'pa_nay_aug_park', 'az_exit_gorge', 'az_christopher_creek_gorge', 'ca_campground_boulder_1', 'ca_tuolumne_bouldering', 'az_miyazaki_climbs', 'az_miyazaki', 'az_river_bend_right', 'az_promised_land_the', 'ny_beaver_brook_climbs', 'ny_beaver_brook', 'wv_rocky_ridge', 'wv_dolly_sods_region', 'me_eagle_bluff_climbs', 'me_04_main_face', 'me_08_right_end', 'tn_north_clear_creek_2', 'tn_the_dihedrals', 'or_main_forest_climbs', 'or_d_warm_up_boulder', 'az_grail_the_climbs', 'az_south_wall_3', 'ca_trailside', 'vt_marshfield_ledge_climbs', 'vt_main_cliff_4', 'or_bonzi_boulders', 'or_wave_boulder_2', 'wy_the_terrace', 'wa_7_mile_rock_climbs', 'wa_main_wall_3', 'ca_mayhem_cove_climbs', 'ca_right_side_8', 'ca_left_side_7', 'co_seal_rock_climbs', 'co_north_side_3', 'az_2_middle_area', 'az_3_south_end', 'ca_k_public_sanitation_wall_climbs', 'ca_upper_tier_12', 'ca_lower_tier_12', 'ca_afpa_rock_climbs', 'ca_south_face_20', 'ca_north_face_20', 'wa_main_wall_13', 'az_parking_area_bouldering_climbs', 'az_the_egg', 'az_rappel_rock_2_climbs', 'az_south_face_3', 'nh_07_main_cliff_boulders', 'oh_kiedaisch_point_climbs', 'oh_south_wall_3', 'az_insomnia_canyon_climbs', 'az_left_side', 'az_south_castle_tower', 'az_south_face_2', 'ny_rock_city_state_forest_climbs', 'ny_highball_boulder_2', 'me_main_wall', 'me_main_face_2', 'pa_main_wall_9', 'az_upper_wall_3', 'az_lower_wall_2', 'ca_pinnacle_rock', 'ca_main_formation_2', 'nh_eagle_cliff_climbs', 'nh_01_main_wall', 'wa_shangri_la_climbs', 'wa_a_upper_tier', 'ny_azure_mountain', 'ny_main_face_2', 'wv_jekyll_and_hyde_area_climbs', 'wv_popcorn_boulder_2', 'wa_spire_rock_climbs', 'wa_north_wall_3', 'wa_south_wall_3', 'wy_moonstone_the', 'wy_upper_tier_3', 'ca_campground_boulders_3', 'co_sandstone_front_of_canyon_climbs', 'co_upper_tier_7', 'co_lower_tier_7', 'or_l_wall_of_shadows', 'or_left_side_2', 'or_right_side_2', 'wa_ice_box_climbs', 'wa_main_wall_12', 'wa_upper_tier_4', 'ca_cold_springs_dome_climbs', 'ca_northwest_face_6', 'ca_main_rock', 'ca_main_wall_4', 'ca_unknown_boulder_near_parking_lot_and_river', 'ca_river_boulder', 'ca_tower_peak', 'ca_the_watchtower_3', 'co_blodgett_peak_climbs', 'co_east_face_7', 'wa_judith_pond_west', 'wa_west_wall_3', 'wv_roundhouse_area_climbs', 'wv_whale_boulder', 'az_beaver_wall_at_papago', 'az_beaver_wall_2', 'az_north_side_3', 'az_elephant_head_climbs', 'az_west_face_3', 'az_eden_2', 'me_main_wall_linkups', 'ca_red_slab', 'ca_red_wall_2', 'ca_glory_dome_climbs', 'ca_north_face_19', 'ny_main_face_5', 'wv_main_area_3');

do $$ declare n int; begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog: nothing to fold.
  select count(*) into n from areas where id in (select id from m_drop_area);
  if n = 0 then raise notice '0349: no catalog, nothing to fold'; return; end if;
  if n <> 11 then raise exception '0349: expected 11 copy areas, found %', n; end if;
  -- the tree must still be the one the plan read
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.from_area;
  if n <> 364 then raise exception '0349: % of 364 climbs are where the plan found them', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep join routes o on o.id = m.drop_id;
  if n <> 0 then raise exception '0349: % of 0 merge pairs still exist', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.from_area;
  if n <> 0 then raise exception '0349: % of 0 sub-areas are where the plan found them', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.from_name;
  if n <> 0 then raise exception '0349: % of 0 renames still carry the planned name', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.from_name;
  if n <> 0 then raise exception '0349: % of 0 climb renames still carry the planned name', n; end if;
  select count(*) into n from areas where id in (select id from m_new_area);
  if n > 0 then raise exception '0349: % of the new areas already exist', n; end if;
  select count(*) into n from m_pin m join areas a on a.id = m.id
   where a.lat is not distinct from m.from_lat and a.lng is not distinct from m.from_lng;
  if n <> 0 then raise exception '0349: % of 0 pins are where the plan read them', n; end if;
  select count(*) into n from m_junk j join routes r on r.id = j.id and r.area_id = j.area_id and r.name = j.name;
  if n <> 0 then raise exception '0349: % of 0 junk rows are where they were read', n; end if;
  select count(*) into n from m_lift l join areas a on a.id = l.id and a.parent_id = l.from_parent where l.id in (select id from m_drop_area);
  if n <> 0 then raise exception '0349: % of 0 placeholders to lift are where the plan read them (and are deleted)', n; end if;
  select count(*) into n from m_retype t join areas a on a.id = t.id and a.area_type = t.from_type;
  if n <> 0 then raise exception '0349: % of 0 areas to retype have the type the plan read', n; end if;
  -- every climb on a copy is accounted for
  select count(*) into n from routes r join m_drop_area d on d.id = r.area_id
   where r.id not in (select id from m_move) and r.id not in (select drop_id from m_merge) and r.id not in (select id from m_junk);
  if n > 0 then raise exception '0349: % climbs on a copy are not in the plan', n; end if;
  select count(*) into n from areas a join m_drop_area d on d.id = a.parent_id
   where a.id not in (select id from m_reparent) and a.id not in (select id from m_drop_area);
  if n > 0 then raise exception '0349: % sub-areas of a copy are not in the plan', n; end if;
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
  if n > 0 then raise exception '0349: % climber rows point at a row this deletes — stop and repoint them', n; end if;
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
  if n > 0 then raise exception '0349: % climber rows still point at a copy', n; end if;
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

-- one pass over the climbs, each counted toward every id on its area's path (0296: the per-area <@ subquery
-- re-scanned whole states for every ancestor of 1,063 touched areas)
update areas a set route_count = coalesce(c.n, 0)
  from m_recount m left join (
    select x.id, count(*) as n from routes r join areas ra on ra.id = r.area_id
      cross join lateral unnest(string_to_array(ltree2text(ra.path), '.')) as x(id)
     where x.id in (select id from m_recount) group by x.id) c on c.id = m.id
 where a.id = m.id and a.route_count is distinct from coalesce(c.n, 0);

do $$ declare n int; begin
  -- the empty preview database: nothing was there to fold
  if not exists (select 1 from routes where id in (select keep from m_merge)) then return; end if;
  select count(*) into n from areas where id in (select id from m_drop_area);
  if n > 0 then raise exception '0349: % copy areas were not emptied', n; end if;
  select count(*) into n from routes where id in (select drop_id from m_merge union select id from m_junk);
  if n > 0 then raise exception '0349: % merged or junk climbs survived', n; end if;
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.to_area;
  if n <> 364 then raise exception '0349: % of 364 climbs moved', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.to_name;
  if n <> 0 then raise exception '0349: % of 0 renames landed', n; end if;
  select count(*) into n from m_new_area m join areas a on a.id = m.id and a.parent_id = m.final_parent and a.route_count > 0;
  if n <> 4 then raise exception '0349: % of 4 new areas are in place, holding their climbs', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.to_area;
  if n <> 0 then raise exception '0349: % of 0 sub-areas re-parented', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.to_name;
  if n <> 0 then raise exception '0349: % of 0 climb renames landed', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep where m.grade is not null and (k.grade <> m.grade or k.grade_num is distinct from m.grade_num);
  if n > 0 then raise exception '0349: % merged grades or grade_nums did not land', n; end if;
  select count(*) into n from m_pin m join areas a on a.id = m.id and a.lat = m.lat and a.lng = m.lng and a.coords_approx = m.approx;
  if n <> 0 then raise exception '0349: % of 0 pins landed', n; end if;
  select count(*) into n from m_retype t join areas a on a.id = t.id and a.area_type = t.to_type;
  if n <> 0 then raise exception '0349: % of 0 retypes landed', n; end if;
  -- no area holds climbs AND sub-areas
  select count(*) into n from areas a where a.id in (select id from m_recount)
     and exists (select 1 from routes r where r.area_id = a.id) and exists (select 1 from areas s where s.parent_id = a.id);
  if n > 0 then raise exception '0349: % areas hold climbs and sub-areas', n; end if;
end $$;

commit;
