-- 0284: the sort labels the first pass could not see, and the places and climbs a source id proves were filed twice.
--
-- Asked: "keep going" (2026-10-14), after 0281/0283 closed the duplicate pairs the name-based guards can see.
--   * SORT LABELS, unspaced or by region (scripts/lib/area-sort-prefix.mjs, widened): "1.The Left Wall",
--     "A.Trad Dad Boulder", "1-Upper Wall", Devil's Lake's "7.2.1 - Birthday Rocks", and the region codes the source
--     sorts Missouri and New Hampshire by ("EM: Amidon", "CM: Capen Park", "WM: Crawford Notch"). Not labels, kept:
--     "5-Mile Boulders", "12-Bar Boulder", "7-11 Crag", "5.10 Wall", Safe Harbor's trail mileages ("1.0 Spectator Wall").
--     Six labels hid a sibling twin ("1.The Left Wall" beside "The Left Wall"); those fold instead.
--   * CLIMBS, one source route id held twice on one wall: the source's renames imported under both names ("Silt and
--     Bone" / "Silt and Stone", "Slim Harpo" / "De Sable"), spellings ("He Bro" / "HeBro", "Snap Dragon" / "Snapdragon"),
--     and placeholders of the SAME grade. Placeholders whose grades differ stay two (owner rule); so do a rock and an
--     ice line, a route and a boulder problem, and "5.7" / "5.7+" / "5.7-" lines named by their grade.
--   * PLACES filed twice under two spellings or by an old and a current crawl, each read against the source's own
--     area tree: "Coal Pit" / "Coalpit Buttress", "Pywiak" / "Pywiack Dome", "Haimovi" / "Hiamovi Tower", empty twins
--     ("Elmer Fudd's Wok"), DeMoisy Peak and Steamboat Pass pinned 75 and 49 km off, four parallel parents (Q'Emiln
--     Park, Gunpowder Falls - Hereford Area, The Ribcage, Red River Gorge's Zoo, which the source now files as CLOSED;
--     its parking does not travel). Each keeper takes the source's current name.
-- Two copies of one climb that drift in grade keep the HIGHER (owner rule; lib/grade.js ranks); grade_num follows.
-- 80 climbs merged (8 take a grade), 170 moved, 67 copy areas deleted (and Blue River Bend's emptied
-- parent, step 5c), 10 sub-areas re-parented, 1 section nested, 190 areas renamed, 1 pin set.
-- No contribution, log, photo, topo, list or report on any climb this deletes.
-- ABORTS if climber data points at a climb deleted, or if the live tree no longer matches the plan.
-- Plan: the job's fold10/ (mk-twins.mjs, twins-decide.mjs, mk-extra.mjs); rollback: scripts/data/source-id-twins-rollback.json.

begin;

create temp table m_merge(keep text not null, drop_id text primary key, grade text, grade_num numeric, disc text) on commit drop;
insert into m_merge values
  ('ar_3_emerald_wall_silt_and_stone', 'ar_3_emerald_wall_silt_and_bone', null, null, null),
  ('ar_main_street_slim_harpo', 'ar_main_street_de_sable', null, null, null),
  ('ar_main_street_free4all', 'ar_main_street_stark_7', null, null, null),
  ('ar_main_street_pop_up_camper', 'ar_main_street_stark_3', null, null, null),
  ('az_globulars_gypsy_mothman', 'az_globulars_pointless_bickering', null, null, null),
  ('az_west_side_2_hebro', 'az_he_bro', null, null, null),
  ('az_southpark', 'az_south_park_south_park', null, null, null),
  ('az_southern_wall_idiocracy', 'az_southern_wall_black_lines_matter', null, null, null),
  ('co_lincoln_lake_dreamsnatcher', 'co_dream_snatcher', null, null, null),
  ('co_light_sentence', 'co_light_sentence_2', 'V4', 4, null),
  ('id_shady_side_16_degal_s_nose', 'id_16_degal_s_nose', '5.12b', 12.5, null),
  ('il_b_texas_revolution_boulder_tex_mex', 'il_texmex', 'V3-', 3, null),
  ('il_f_the_doors_snapdragon', 'il_snap_dragon', '5.13c', 13.75, null),
  ('ky_south_park_big_gay_al_s_big_gay_boat_ride', 'ky_big_gay_al_s_big_gay_boatride', null, null, null),
  ('ky_left_flank_hen_ry', 'ky_henry', null, null, null),
  ('ky_volunteer_wall_the_wal_martification_of_trad', 'ky_the_walmartification_of_trad', null, null, null),
  ('ny_h_the_arrow_wall_cck_crack_n_up', 'ny_crack_n_up', null, null, null),
  ('ri_dance_hall_boulder_wallflower', 'ri_wall_flower', null, null, null),
  ('sd_dam_back_side_the_ev_arete', 'sd_evarete', null, null, null),
  ('tn_08_jimmywood_miss_scarlet_aka_reunions', 'tn_miss_scarlet', null, null, null),
  ('ut_charlie_s_arete', 'ut_charlie_s_arete_2', null, null, null),
  ('ut_the_thumb_area_the_summit_pitch_aka_east_face', 'ut_the_summit_pitch', null, null, null),
  ('wa_fun_forest_e_ticket', 'wa_fun_forest_eticket', null, null, null),
  ('wa_g_m_m_wall_hang_over_hang', 'wa_hang_overhang', null, null, null),
  ('wy_lower_psychoactive_star_fucker', 'wy_starfucker', null, null, null),
  ('wa_dog_park_boulders_heel_deal', 'wa_dog_park_boulders_heel_peel', null, null, null),
  ('az_5_jolly_roger_unknown', 'az_unknown_57', null, null, null),
  ('ca_c_chiquito_dome_unnamed_5_9', 'ca_unnamed_5_9_3', null, null, null),
  ('ca_unnamed_v1_5', 'ca_unnamed_v1_6', null, null, null),
  ('co_a_west_side_unknown_5_11c', 'co_unknown_5_11c', null, null, null),
  ('co_a_west_side_unnamed', 'co_unnamed_2', null, null, null),
  ('ct_1_parking_lot_wall_unknown_5_5', 'ct_unknown_5_5', null, null, null),
  ('ky_d_park_wall_2nd_level_unnamed_5_11c', 'ky_unnamed_5_11c', null, null, null),
  ('ky_front_porch_wall_unknown', 'ky_un_known', null, null, null),
  ('mo_project', 'mo_project_2', null, null, null),
  ('nh_slabs_unknown', 'nh_unknown_5', null, null, null),
  ('nm_c_the_grotto_unnamed', 'nm_unnamed_13', null, null, null),
  ('or_unnamed', 'or_warrior_wall_unnamed', null, null, null),
  ('pa_unnamed_v0_4', 'pa_unnamed_v0_3', null, null, null),
  ('wa_f_new_millennium_wall_unknown', 'wa_unknown_5', null, null, null),
  ('wy_4_house_wall_unknown', 'wy_unknown_6', null, null, null),
  ('ca_3_left_of_peapod_unknown', 'ca_unknown_98', null, null, null),
  ('co_03_main_wall_open_project', 'co_open_project_5', null, null, null),
  ('co_unknown_101', 'co_unknown_102', null, null, null),
  ('nm_a_cattle_call_wall_area_unnamed_2', 'nm_unnamed_2_2', null, null, null),
  ('tx_5_warrior_wall_unknown', 'tx_unknown_2', null, null, null),
  ('wa_chockstone_route', 'wa_north_early_winter_spire_chockstone_route', '5.7', 7, null),
  ('wa_news_nw_corner', 'wa_north_early_winter_spire_northwest_corner_a_k_a_boving_pollack_route', null, null, null),
  ('wa_wildcat_wall_colonnade', 'wa_colonade', null, null, null),
  ('nv_randy_s_corner_2', 'nv_randy_s_corner', null, null, null),
  ('ca_soul_calibur_boulder_soul_calibur', 'ca_soul_caliber', null, null, null),
  ('ca_hemingway_boulder_1_hemingway_block', 'ca_hemmingway_block', null, null, null),
  ('ca_pywiack_dome_unreliable_narrator', 'ca_unreliable_narrator', null, null, null),
  ('ut_blue_grama_cliff_blue_grama', 'ut_blue_gramma', null, null, null),
  ('ut_blue_grama_cliff_closed_dawn_of_an_age', 'ut_dawn_of_an_age_2', null, null, null),
  ('ut_blue_grama_cliff_closed_moon_goddess_revenge', 'ut_moon_goddess_revenge', null, null, null),
  ('ut_blue_grama_cliff_unnamed_far_right_side_big_hands_to_ow_bulge', 'ut_unnamed_far_right_side_big_hands_to_ow_bulge', null, null, null),
  ('ut_blue_grama_cliff_unnamed_5_10_flake', 'ut_unnamed_5_10_flake', null, null, null),
  ('ut_blue_grama_cliff_unnamed_5_11', 'ut_unnamed_5_11_5', null, null, null),
  ('az_saguaro_corners_saguaro', 'az_sahuaro', null, null, null),
  ('wa_early_winter_couloir', 'wa_north_early_winter_spire_early_winter_couloir', null, null, null),
  ('ut_chossagonia', 'ut_butt_crack_spire_chossagonia', '5.9 A1 R', 1, null),
  ('ut_demoisy_peak_2_on_the_fly', 'ut_on_the_fly', null, null, null),
  ('ut_demoisy_peak_2_lone_tree', 'ut_lone_tree', null, null, null),
  ('az_direct_tyrant_var', 'az_the_left_wall_direct_tyrant_var', null, null, null),
  ('ut_house_of_cards', 'ut_coalpit_buttress_house_of_cards', '5.11 A0 PG13', 11, null),
  ('ut_direct_north_face', 'ut_coalpit_buttress_direct_north_face', '5.8 A2-', 2, null),
  ('wa_wildcat_wall_unknown', 'wa_unknown_21', null, null, null),
  ('ky_the_old_zoo_closed_jailbird', 'ky_jail_bird', null, null, null),
  ('ca_the_winged_horse_aka_the_springbok_the_winged_horse', 'ca_the_winged_horse', null, null, null),
  ('ut_steamboat_pass_2_through_the_never', 'ut_through_the_never', null, null, null),
  ('ut_steamboat_pass_2_starboard', 'ut_starboard', null, null, null),
  ('ak_mt_frances_scratch_and_sniff', 'ak_scratch_and_sniff', null, null, null),
  ('ut_unknown_far_left_aka_benny_s_junk_yard', 'ut_blue_grama_cliff_unknown_far_left_aka_benny_s_junk_yard', null, null, null),
  ('ut_unnamed_ii_fingers_through_fists', 'ut_blue_grama_cliff_unnamed_ii_fingers_through_fists', null, null, null),
  ('ut_unnamed_10_steep_thin_hands_dihedral_to_pod', 'ut_blue_grama_cliff_unnamed_10_steep_thin_hands_dihedral_to_pod', null, null, null),
  ('ut_unnamed_11_shares_bg_anchor', 'ut_blue_grama_cliff_unnamed_11_shares_bg_anchor', null, null, null),
  ('co_hiamovi_tower_ladybug_direct', 'co_ladybug_direct', null, null, null),
  ('co_mt_blue_sky_formerly_mount_evans_north_face_the_snave_direct', 'co_the_snave_direct', null, null, null),
  ('mo_em_washington_state_park_project', 'mo_project_3', null, null, null);

create temp table m_route_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
-- (m_route_rename: none in this plan)

create temp table m_move(id text primary key, from_area text not null, to_area text not null, bypass boolean not null) on commit drop;
insert into m_move values
  ('wa_north_early_winter_spire_vulcan_death_grip', 'wa_north_early_winter_spire', 'wa_north_early_winters_spire', false),
  ('wa_north_early_winter_spire_christianson_roskelley', 'wa_north_early_winter_spire', 'wa_north_early_winters_spire', false),
  ('wa_north_early_winter_spire_constantino_whitelaw', 'wa_north_early_winter_spire', 'wa_north_early_winters_spire', false),
  ('wa_north_early_winter_spire_twitch_of_the_death_nerve', 'wa_north_early_winter_spire', 'wa_north_early_winters_spire', false),
  ('ut_the_onceler', 'ut_sherpa_boulder', 'ut_sherpa_boulders', false),
  ('ut_a_sculpted_beauty', 'ut_sherpa_boulder', 'ut_sherpa_boulders', false),
  ('ut_sherpa_hop', 'ut_sherpa_boulder', 'ut_sherpa_boulders', false),
  ('ca_chili_pepper_unnamed_v0', 'ca_chili_pepper', 'ca_chile_pepper', false),
  ('ut_holy', 'ut_grist_mill', 'ut_grit_mill', false),
  ('wa_bit_my_pit', 'wa_noelder', 'wa_nolder', false),
  ('wa_project_5', 'wa_noelder', 'wa_nolder', false),
  ('nm_slab_sacrilege', 'nm_out_of_darkness_slabs', 'nm_out_of_darkness_slab', false),
  ('nm_out_of_darkness', 'nm_out_of_darkness_slabs', 'nm_out_of_darkness_slab', false),
  ('nm_january_sun', 'nm_out_of_darkness_slabs', 'nm_out_of_darkness_slab', false),
  ('wi_4_doorway_rocks_minor_mass_chen_s_traverse', 'wi_4_doorway_rocks_minor_mass', 'wi_5_4_doorway_rocks_minor_mass', false),
  ('wi_5_red_rock_potholes_the_cleft_offwidth', 'wi_5_red_rock_potholes', 'wi_5_5_red_rock_potholes', false),
  ('wi_5_red_rock_potholes_the_cleft_diagonal_crack', 'wi_5_red_rock_potholes', 'wi_5_5_red_rock_potholes', false),
  ('ut_coalpit_buttress_gladiator', 'ut_coalpit_buttress', 'ut_coal_pit_buttress', false),
  ('ut_coalpit_buttress_the_sherminator', 'ut_coalpit_buttress', 'ut_coal_pit_buttress', false),
  ('ut_coalpit_buttress_nanook_of_the_north', 'ut_coalpit_buttress', 'ut_coal_pit_buttress', false),
  ('ut_coalpit_buttress_lick_your_flint', 'ut_coalpit_buttress', 'ut_coal_pit_buttress', false),
  ('ut_coalpit_buttress_fist_of_the_north_star', 'ut_coalpit_buttress', 'ut_coal_pit_buttress', false),
  ('ut_coalpit_buttress_man_on_the_moon', 'ut_coalpit_buttress', 'ut_coal_pit_buttress', false),
  ('ut_coalpit_buttress_the_show_must_go_on', 'ut_coalpit_buttress', 'ut_coal_pit_buttress', false),
  ('ut_coalpit_buttress_mission_to_mars', 'ut_coalpit_buttress', 'ut_coal_pit_buttress', false),
  ('wa_keel_hauled', 'wa_wild_cat_wall', 'wa_wildcat_wall', false),
  ('wa_mark_s_crack_left', 'wa_wild_cat_wall', 'wa_wildcat_wall', false),
  ('wa_rock_the_red_bago', 'wa_wild_cat_wall', 'wa_wildcat_wall', false),
  ('wa_street_walking_cheetah', 'wa_wild_cat_wall', 'wa_wildcat_wall', false),
  ('wa_wild_confusion', 'wa_wild_cat_wall', 'wa_wildcat_wall', false),
  ('wa_rhythm_and_sorrow', 'wa_wild_cat_wall', 'wa_wildcat_wall', false),
  ('wa_thundercats', 'wa_wild_cat_wall', 'wa_wildcat_wall', false),
  ('wa_fire_stone', 'wa_wild_cat_wall', 'wa_wildcat_wall', false),
  ('wa_wildcat_crack', 'wa_wild_cat_wall', 'wa_wildcat_wall', false),
  ('az_little_bighorn_wall_i_have_friends_everywhere', 'az_little_bighorn_wall', 'az_little_big_horn_wall', false),
  ('az_little_bighorn_wall_unexpected_cheddah', 'az_little_bighorn_wall', 'az_little_big_horn_wall', false),
  ('ky_skin_the_cat', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_animal_husbandry', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_put_me_in_the_zoo', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_eye_of_the_liger', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_chimp', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_edgehog', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_live_action', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_zoolander', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_zoology', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_zookeeper', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_open_project_3', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_armadillo_2', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_geezers_go_sport', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_scar_tissue', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_one_brick_shy', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_on_beyond_zebra', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_aviary', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_lynx_jinx', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_cannonball', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_hippocrite', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_monkey_in_the_middle', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', false),
  ('ky_the_peyote_pup', 'ky_the_new_zoo', 'ky_the_new_zoo_closed', false),
  ('ky_barrel_full_of_monkeys', 'ky_the_new_zoo', 'ky_the_new_zoo_closed', false),
  ('ky_sendex_147', 'ky_the_new_zoo', 'ky_the_new_zoo_closed', false),
  ('ky_hippopotomoose', 'ky_the_new_zoo', 'ky_the_new_zoo_closed', false),
  ('ky_speedy_gonzalez', 'ky_the_new_zoo', 'ky_the_new_zoo_closed', false),
  ('ky_honey_badger', 'ky_the_new_zoo', 'ky_the_new_zoo_closed', false),
  ('ky_irony_of_a_twisted_fate', 'ky_the_new_zoo', 'ky_the_new_zoo_closed', false),
  ('ky_sidewinder', 'ky_the_new_zoo', 'ky_the_new_zoo_closed', false),
  ('ky_bababooey', 'ky_the_new_zoo', 'ky_the_new_zoo_closed', false),
  ('ky_sparkling_jackass', 'ky_the_new_zoo', 'ky_the_new_zoo_closed', false),
  ('ky_here_comes_the_beep_beep', 'ky_bird_cage_sector', 'ky_bird_cage_sector_closed', false),
  ('ky_dirty_bird', 'ky_bird_cage_sector', 'ky_bird_cage_sector_closed', false),
  ('ky_eager_beaver', 'ky_bird_cage_sector', 'ky_bird_cage_sector_closed', false),
  ('ky_bumpin_with_bulldog', 'ky_bird_cage_sector', 'ky_bird_cage_sector_closed', false),
  ('ky_crimpin_ain_t_easy', 'ky_bird_cage_sector', 'ky_bird_cage_sector_closed', false),
  ('ky_can_of_biscuits', 'ky_bird_cage_sector', 'ky_bird_cage_sector_closed', false),
  ('ky_sons_of_perdition', 'ky_bird_cage_sector', 'ky_bird_cage_sector_closed', false),
  ('ky_action_potential', 'ky_bird_cage_sector', 'ky_bird_cage_sector_closed', false),
  ('ky_goblins_in_my_mind', 'ky_bird_cage_sector', 'ky_bird_cage_sector_closed', false),
  ('ky_botanical_gardens', 'ky_bird_cage_sector', 'ky_bird_cage_sector_closed', false),
  ('ky_snake_charmer', 'ky_bird_cage_sector', 'ky_bird_cage_sector_closed', false),
  ('ky_romance_explosion', 'ky_bird_cage_sector', 'ky_bird_cage_sector_closed', false),
  ('ky_gunner', 'ky_bird_cage_sector', 'ky_bird_cage_sector_closed', false),
  ('ky_lone_coyote', 'ky_bird_cage_sector', 'ky_bird_cage_sector_closed', false),
  ('nv_dihedral_slab', 'nv_front_boulder_wall', 'nv_front_bouldering_wall', false),
  ('nv_dynamic_unbalance', 'nv_front_boulder_wall', 'nv_front_bouldering_wall', false),
  ('nv_keyhole_dihedral', 'nv_front_boulder_wall', 'nv_front_bouldering_wall', false),
  ('nv_straight_up', 'nv_front_boulder_wall', 'nv_front_bouldering_wall', false),
  ('nv_randy_s_corner_2', 'nv_front_boulder_wall', 'nv_front_bouldering_wall', false),
  ('nv_f_a_t_r_fuckin_a_that_s_rad', 'nv_front_boulder_wall', 'nv_front_bouldering_wall', false),
  ('nv_turtle_jim', 'nv_front_boulder_wall', 'nv_front_bouldering_wall', false),
  ('ca_the_river_styx', 'ca_soul_caliber_boulder', 'ca_soul_calibur_boulder', false),
  ('co_thunder_2', 'co_sunshower_cliffs', 'co_sunshower_cliff', false),
  ('co_two_face_2', 'co_sunshower_cliffs', 'co_sunshower_cliff', false),
  ('pa_scarlet_lady_boulders_cfl', 'pa_scarlet_lady_boulders', 'pa_scarlet_lady_boulder', false),
  ('pa_scarlet_lady_boulders_space_station', 'pa_scarlet_lady_boulders', 'pa_scarlet_lady_boulder', false),
  ('pa_scarlet_lady_boulders_esa', 'pa_scarlet_lady_boulders', 'pa_scarlet_lady_boulder', false),
  ('ca_anthony_slab_maximus', 'ca_anthony_slab', 'ca_anthony_slabs', false),
  ('ca_silver_surfer', 'ca_super_heros_wall', 'ca_super_heroes_wall', false),
  ('ca_g_a_c', 'ca_super_heros_wall', 'ca_super_heroes_wall', false),
  ('ca_mighty_mouse_2', 'ca_super_heros_wall', 'ca_super_heroes_wall', false),
  ('ca_chilkoot_sam', 'ca_super_heros_wall', 'ca_super_heroes_wall', false),
  ('ca_yosemite_sam_2', 'ca_super_heros_wall', 'ca_super_heroes_wall', false),
  ('ca_super_chicken_3', 'ca_super_heros_wall', 'ca_super_heroes_wall', false),
  ('ca_baba_louie', 'ca_super_heros_wall', 'ca_super_heroes_wall', false),
  ('ca_underdog', 'ca_super_heros_wall', 'ca_super_heroes_wall', false),
  ('ca_elmer_fudd_2', 'ca_super_heros_wall', 'ca_super_heroes_wall', false),
  ('ca_s_is_for_super', 'ca_super_heros_wall', 'ca_super_heroes_wall', false),
  ('ca_captain_kangaroo', 'ca_super_heros_wall', 'ca_super_heroes_wall', false),
  ('ca_mr_magoo_2', 'ca_super_heros_wall', 'ca_super_heroes_wall', false),
  ('ca_pennyroyal_arches_disorderly_conduct', 'ca_pennyroyal_arches', 'ca_penny_royal_arches', false),
  ('ca_pennyroyal_arches_resisting_arrest', 'ca_pennyroyal_arches', 'ca_penny_royal_arches', false),
  ('ca_pennyroyal_arches_whippersnapper', 'ca_pennyroyal_arches', 'ca_penny_royal_arches', false),
  ('ky_a_north_end_snake_eyes', 'ky_a_north_end', 'ky_northend', false),
  ('ca_pywiack_dome_unreliable_narrator', 'ca_pywiack_dome', 'ca_pywiak_dome', false),
  ('ca_pywiack_dome_unknown_5_6_aka_happy_wanderer', 'ca_pywiack_dome', 'ca_pywiak_dome', false),
  ('ca_pywiack_dome_golden_bars', 'ca_pywiack_dome', 'ca_pywiak_dome', false),
  ('ca_pywiack_dome_yebo_yes', 'ca_pywiack_dome', 'ca_pywiak_dome', false),
  ('ca_pywiack_dome_pirouette_roof', 'ca_pywiack_dome', 'ca_pywiak_dome', false),
  ('ca_pywiack_dome_skin_walker', 'ca_pywiack_dome', 'ca_pywiak_dome', false),
  ('ca_pywiack_dome_boa', 'ca_pywiack_dome', 'ca_pywiak_dome', false),
  ('ca_pywiack_dome_clash_of_the_titans', 'ca_pywiack_dome', 'ca_pywiak_dome', false),
  ('ca_pywiack_dome_rising_sun', 'ca_pywiack_dome', 'ca_pywiak_dome', false),
  ('ca_adios_yahoos', 'ca_springbok_the', 'ca_the_winged_horse_aka_the_springbok', false),
  ('ak_southwest_ridge', 'ak_mt_francis', 'ak_mt_frances', false),
  ('az_saguaro_corners_saguaro', 'az_saguaro_corners', 'az_sahuaro_corners', false),
  ('az_saguaro_corners_saguaro_blossom', 'az_saguaro_corners', 'az_sahuaro_corners', false),
  ('az_saguaro_corners_unknown', 'az_saguaro_corners', 'az_sahuaro_corners', false),
  ('ca_stomp_the_yard', 'ca_miess_boulders', 'ca_meiss_boulders', false),
  ('ca_gideon', 'ca_miess_boulders', 'ca_meiss_boulders', false),
  ('ca_oceanside_boulder_fish_are_friends', 'ca_oceanside_boulder', 'ca_oceanside_boulders', false),
  ('ca_oceanside_boulder_baby_shark', 'ca_oceanside_boulder', 'ca_oceanside_boulders', false),
  ('ca_oceanside_boulder_momma_shark', 'ca_oceanside_boulder', 'ca_oceanside_boulders', false),
  ('ca_oceanside_boulder_spray_lord', 'ca_oceanside_boulder', 'ca_oceanside_boulders', false),
  ('id_ankle_breaker', 'id_damn_boulders', 'id_dam_boulders', false),
  ('id_el_luchador', 'id_damn_boulders', 'id_dam_boulders', false),
  ('ut_blue_grama_cliff_unnamed_9_aka_mexican_unicorn', 'ut_blue_grama_cliff', 'ut_blue_gramma_cliff', false),
  ('ut_blue_grama_cliff_unnamed_far_right_side_big_hands_to_ow_bulge', 'ut_blue_grama_cliff', 'ut_blue_gramma_cliff', false),
  ('ut_blue_grama_cliff_closed_dawn_of_an_age', 'ut_blue_grama_cliff', 'ut_blue_gramma_cliff', false),
  ('ut_blue_grama_cliff_unnamed_5_10_flake', 'ut_blue_grama_cliff', 'ut_blue_gramma_cliff', false),
  ('ut_blue_grama_cliff_closed_moon_goddess_revenge', 'ut_blue_grama_cliff', 'ut_blue_gramma_cliff', false),
  ('ut_blue_grama_cliff_unnamed_5_11', 'ut_blue_grama_cliff', 'ut_blue_gramma_cliff', false),
  ('ut_blue_grama_cliff_blue_grama', 'ut_blue_grama_cliff', 'ut_blue_gramma_cliff', false),
  ('vt_old_celler', 'vt_south_trail_boulders', 'vt_south_trail_boulder', false),
  ('wa_east_face_9', 'wa_jaberwocky_tower', 'wa_jabberwocky_tower', false),
  ('md_honey_gogo_pg', 'md_honey_gogo_boulder', 'md_honey_go_go_boulder', false),
  ('ia_ship_rock_beckoning_spirit', 'ia_ship_rock', 'ia_shiprock', false),
  ('ia_ship_rock_our_bodies_are_poetry', 'ia_ship_rock', 'ia_shiprock', false),
  ('co_southeast_buttress_2', 'co_haimovi_tower', 'co_hiamovi_tower', false),
  ('mo_wicked_googily', 'mo_washington_state_park', 'mo_em_washington_state_park', false),
  ('mo_gonna_leave_you', 'mo_washington_state_park', 'mo_em_washington_state_park', false),
  ('mo_rifle', 'mo_washington_state_park', 'mo_em_washington_state_park', false),
  ('mo_another_project', 'mo_washington_state_park', 'mo_em_washington_state_park', false),
  ('mo_screamin_eagle', 'mo_washington_state_park', 'mo_em_washington_state_park', false),
  ('mo_dandelion', 'mo_washington_state_park', 'mo_em_washington_state_park', false),
  ('mo_wasbenator', 'mo_washington_state_park', 'mo_em_washington_state_park', false),
  ('mo_hand_in_my_pocket', 'mo_washington_state_park', 'mo_em_washington_state_park', false),
  ('mo_perfect_dark', 'mo_washington_state_park', 'mo_em_washington_state_park', false),
  ('mo_abandoned_project', 'mo_washington_state_park', 'mo_em_washington_state_park', false),
  ('mo_tangerine', 'mo_washington_state_park', 'mo_em_washington_state_park', false),
  ('mo_slabby_seconds', 'mo_washington_state_park', 'mo_em_washington_state_park', false),
  ('ga_low_rider_traverse', 'ga_cherokee_bluff', 'ga_cherokee_bluffs', false),
  ('ga_ez_trav', 'ga_cherokee_bluff', 'ga_cherokee_bluffs', false),
  ('ga_slip_n_slide', 'ga_cherokee_bluff', 'ga_cherokee_bluffs', false),
  ('ga_turbo_charger', 'ga_cherokee_bluff', 'ga_cherokee_bluffs', false),
  ('ga_low_rider', 'ga_cherokee_bluff', 'ga_cherokee_bluffs', false),
  ('ga_slabbass_direct', 'ga_cherokee_bluff', 'ga_cherokee_bluffs', false),
  ('ga_left_ear', 'ga_cherokee_bluff', 'ga_cherokee_bluffs', false),
  ('mo_kawabunga_crack', 'mo_kawagunga_buttress', 'mo_kawabunga_buttress', false),
  ('nh_albany_slab_rock_slingin_syrup', 'nh_albany_slab_rock', 'nh_albany_slabs_rock', false),
  ('nh_albany_slab_rock_mahalloway', 'nh_albany_slab_rock', 'nh_albany_slabs_rock', false),
  ('ny_side_pull_warmups', 'ny_van_courtland_park', 'ny_van_cortland_park', false),
  ('tx_the_witch', 'tx_narnia_boulder', 'tx_gnarnia_boulder', false);

create temp table m_reparent(id text primary key, from_area text not null, to_area text not null) on commit drop;
insert into m_reparent values
  ('ut_mt_olympus', 'ut_wasatch_alpine_areas', 'ut_mount_olympus'),
  ('id_dam_boulders', 'id_q_emiln_park', 'id_q_emilin_park'),
  ('id_project_wall', 'id_q_emiln_park', 'id_q_emilin_park'),
  ('id_schoolhouse_rock', 'id_q_emiln_park', 'id_q_emilin_park'),
  ('id_the_alley', 'id_q_emiln_park', 'id_q_emilin_park'),
  ('id_two_boulders', 'id_q_emiln_park', 'id_q_emilin_park'),
  ('md_hereford_bouldering', 'md_gunpowder_falls_hereford_area', 'md_big_gunpowder_falls_hereford_area'),
  ('md_honey_go_go_boulder', 'md_gunpowder_falls_hereford_area', 'md_big_gunpowder_falls_hereford_area'),
  ('md_stranger_things', 'md_gunpowder_falls_hereford_area', 'md_big_gunpowder_falls_hereford_area'),
  ('nm_out_of_darkness_slab', 'nm_the_ribcage', 'nm_lower_domingo_baca_slabs_aka_the_ribcage');

create temp table m_drop_area(id text primary key, into_area text not null, ord int not null) on commit drop;
insert into m_drop_area values
  ('ca_tier_1', 'ca_east_face_16', 0),
  ('ca_tier_2', 'ca_east_face_16', 1),
  ('ca_eastface', 'ca_east_face_16', 2),
  ('ca_southside', 'ca_quasi_cliff', 3),
  ('ca_toes_the', 'ca_quasi_cliff', 4),
  ('ca_quasi_cliffs', 'ca_quasi_cliff', 5),
  ('wa_north_early_winter_spire', 'wa_north_early_winters_spire', 6),
  ('ut_butt_crack_spire', 'ut_butt_crack_butte', 7),
  ('ut_sherpa_boulder', 'ut_sherpa_boulders', 8),
  ('va_frackalachia_boulders', 'va_crackalachia_boulder', 9),
  ('ut_demoisy_peak', 'ut_demoisy_peak_2', 10),
  ('ca_chili_pepper', 'ca_chile_pepper', 11),
  ('ca_poser_boulder', 'ca_prosser_boulder', 12),
  ('ca_poster_boulder', 'ca_prosser_boulder', 13),
  ('ut_grist_mill', 'ut_grit_mill', 14),
  ('wa_noelder', 'wa_nolder', 15),
  ('nm_out_of_darkness_slabs', 'nm_out_of_darkness_slab', 16),
  ('ca_bat_walls', 'ca_bat_wall_2', 17),
  ('az_the_left_wall', 'az_1_the_left_wall', 18),
  ('wi_4_doorway_rocks_minor_mass', 'wi_5_4_doorway_rocks_minor_mass', 19),
  ('wi_5_red_rock_potholes', 'wi_5_5_red_rock_potholes', 20),
  ('ut_coalpit_buttress', 'ut_coal_pit_buttress', 21),
  ('wa_wild_cat_wall', 'wa_wildcat_wall', 22),
  ('tx_trail_side_boulders', 'tx_trailside_boulders', 23),
  ('az_little_bighorn_wall', 'az_little_big_horn_wall', 24),
  ('ky_the_old_zoo', 'ky_the_old_zoo_closed', 25),
  ('ky_the_new_zoo', 'ky_the_new_zoo_closed', 26),
  ('ky_bird_cage_sector', 'ky_bird_cage_sector_closed', 27),
  ('nv_front_boulder_wall', 'nv_front_bouldering_wall', 28),
  ('ca_soul_caliber_boulder', 'ca_soul_calibur_boulder', 29),
  ('co_sunshower_cliffs', 'co_sunshower_cliff', 30),
  ('pa_scarlet_lady_boulders', 'pa_scarlet_lady_boulder', 31),
  ('ca_anthony_slab', 'ca_anthony_slabs', 32),
  ('ca_super_heros_wall', 'ca_super_heroes_wall', 33),
  ('ca_hemmingway_boulder_1', 'ca_hemingway_boulder_1', 34),
  ('ca_pennyroyal_arches', 'ca_penny_royal_arches', 35),
  ('ky_a_north_end', 'ky_northend', 36),
  ('ca_pywiack_dome', 'ca_pywiak_dome', 37),
  ('ca_springbok_the', 'ca_the_winged_horse_aka_the_springbok', 38),
  ('ut_steamboat_pass', 'ut_steamboat_pass_2', 39),
  ('co_elmer_fudd_s_wok', 'co_elmer_fudd_s_wock', 40),
  ('nh_3_yukon_gold_butress', 'nh_3_yukon_gold_buttress', 41),
  ('ak_mt_francis', 'ak_mt_frances', 42),
  ('az_saguaro_corners', 'az_sahuaro_corners', 43),
  ('ca_miess_boulders', 'ca_meiss_boulders', 44),
  ('ca_oceanside_boulder', 'ca_oceanside_boulders', 45),
  ('id_damn_boulders', 'id_dam_boulders', 46),
  ('ut_blue_grama_cliff', 'ut_blue_gramma_cliff', 47),
  ('vt_south_trail_boulders', 'vt_south_trail_boulder', 48),
  ('wa_jaberwocky_tower', 'wa_jabberwocky_tower', 49),
  ('md_honey_gogo_boulder', 'md_honey_go_go_boulder', 50),
  ('ia_ship_rock', 'ia_shiprock', 51),
  ('co_haimovi_tower', 'co_hiamovi_tower', 52),
  ('co_mount_evans_north_face', 'co_mt_blue_sky_formerly_mount_evans_north_face', 53),
  ('mo_washington_state_park', 'mo_em_washington_state_park', 54),
  ('ga_cherokee_bluff', 'ga_cherokee_bluffs', 55),
  ('mo_kawagunga_buttress', 'mo_kawabunga_buttress', 56),
  ('nh_albany_slab_rock', 'nh_albany_slabs_rock', 57),
  ('ny_van_courtland_park', 'ny_van_cortland_park', 58),
  ('tx_narnia_boulder', 'tx_gnarnia_boulder', 59),
  ('mo_hickory_canyons_natural_area', 'mo_em_hickory_canyons_natural_area', 60),
  ('mo_highway_160', 'mo_sw_highway_160', 61),
  ('mo_raven_rocks', 'mo_wm_raven_rocks', 62),
  ('ky_the_zoo', 'ky_the_zoo_closed', 63),
  ('id_q_emiln_park', 'id_q_emilin_park', 64),
  ('md_gunpowder_falls_hereford_area', 'md_big_gunpowder_falls_hereford_area', 65),
  ('nm_the_ribcage', 'nm_lower_domingo_baca_slabs_aka_the_ribcage', 66);

create temp table m_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
insert into m_rename values
  ('az_1_the_left_wall', '1.The Left Wall', 'The Left Wall'),
  ('az_1_upper_wall', '1-Upper Wall', 'Upper Wall'),
  ('az_2_5_west_pinnacle', '2.5 - West Pinnacle', 'West Pinnacle'),
  ('az_2_lower_wall', '2-Lower Wall', 'Lower Wall'),
  ('az_3_palisade_west', '3-Palisade West', 'Palisade West'),
  ('ca_0_bachar', '0-Bachar', 'Bachar'),
  ('ca_1_croft', '1-Croft', 'Croft'),
  ('ca_1_farquhar', '1-Farquhar', 'Farquhar'),
  ('ca_1_first_tier', '1-First Tier', 'First Tier'),
  ('ca_1_handegg', '1-Handegg', 'Handegg'),
  ('ca_2_gerstenegg', '2-Gerstenegg', 'Gerstenegg'),
  ('ca_2_robinson', '2-Robinson', 'Robinson'),
  ('ca_2_rowell', '2-Rowell', 'Rowell'),
  ('ca_2_second_tier', '2-Second Tier', 'Second Tier'),
  ('ca_3_dawson', '3-Dawson', 'Dawson'),
  ('ca_3_eldorado', '3-Eldorado', 'Eldorado'),
  ('ca_3_talsky', '3-Talsky', 'Talsky'),
  ('ca_3_third_tier', '3-Third Tier', 'Third Tier'),
  ('ca_4_clyde', '4-Clyde', 'Clyde'),
  ('ca_4_search_and_rescue', '4-Search And Rescue', 'Search And Rescue'),
  ('ca_4_west_tier', '4-West Tier', 'West Tier'),
  ('ca_5_brower', '5-Brower', 'Brower'),
  ('ca_5_erb', '5-Erb', 'Erb'),
  ('ca_6_5_winter_prime_area', '6.5 - Winter Prime Area', 'Winter Prime Area'),
  ('ca_6_franosch', '6-Franosch', 'Franosch'),
  ('ca_6_sharma', '6-Sharma', 'Sharma'),
  ('ca_7_5_top_rope_wall', '7.5 - Top Rope Wall', 'Top Rope Wall'),
  ('ca_7_hill', '7-Hill', 'Hill'),
  ('ca_7_lewis', '7-Lewis', 'Lewis'),
  ('ca_8_5_red_pillar_area', '8.5 - Red Pillar Area', 'Red Pillar Area'),
  ('ca_8_dostie', '8-Dostie', 'Dostie'),
  ('ca_8_moynier', '8-Moynier', 'Moynier'),
  ('ca_9_chouinard', '9-Chouinard', 'Chouinard'),
  ('ca_9_secor', '9-Secor', 'Secor'),
  ('mo_bouldering', 'EM: Rockwoods Reservation Bouldering', 'Rockwoods Reservation Bouldering'),
  ('mo_cm_andromeda', 'CM: Andromeda', 'Andromeda'),
  ('mo_cm_bald_ridge_boulders', 'CM: Bald Ridge Boulders', 'Bald Ridge Boulders'),
  ('mo_cm_boulder_ridge_haha_tonka_sp', 'CM: Boulder Ridge-Haha Tonka SP', 'Boulder Ridge-Haha Tonka SP'),
  ('mo_cm_capen_park', 'CM: Capen Park', 'Capen Park'),
  ('mo_cm_cedar_creek', 'CM: Cedar Creek', 'Cedar Creek'),
  ('mo_cm_columbia_area_bouldering', 'CM: Columbia Area Bouldering', 'Columbia Area Bouldering'),
  ('mo_cm_deadwood_boulder', 'CM: Deadwood Boulder', 'Deadwood Boulder'),
  ('mo_cm_devils_elbow', 'CM: Devils Elbow', 'Devils Elbow'),
  ('mo_cm_henley_forgotten_wall', 'CM: Henley, Forgotten Wall', 'Henley, Forgotten Wall'),
  ('mo_cm_hermann_roadside_park', 'CM: Hermann Roadside Park', 'Hermann Roadside Park'),
  ('mo_cm_jacktar_hollow', 'CM: Jacktar Hollow', 'Jacktar Hollow'),
  ('mo_cm_kaintuck_natural_bridge', 'CM: Kaintuck Natural Bridge', 'Kaintuck Natural Bridge'),
  ('mo_cm_paddy_creek_wilderness', 'CM: Paddy Creek Wilderness', 'Paddy Creek Wilderness'),
  ('mo_cm_panther_bluff', 'CM: Panther Bluff', 'Panther Bluff'),
  ('mo_cm_pinnacles_youth_park', 'CM: Pinnacles Youth Park', 'Pinnacles Youth Park'),
  ('mo_cm_providence', 'CM: Providence', 'Providence'),
  ('mo_cm_reform_rock', 'CM: Reform Rock', 'Reform Rock'),
  ('mo_cm_rocheport', 'CM: Rocheport', 'Rocheport'),
  ('mo_cm_roubidoux_spring', 'CM: Roubidoux spring', 'Roubidoux spring'),
  ('mo_cm_rudimentary_recall_boulder', 'CM: Rudimentary Recall Boulder', 'Rudimentary Recall Boulder'),
  ('mo_cm_scheuler_s_ferry', 'CM: Scheuler''s Ferry', 'Scheuler''s Ferry'),
  ('mo_cm_the_little_piney_caves', 'CM: The Little Piney Caves', 'The Little Piney Caves'),
  ('mo_cm_ward_s_bluff', 'CM: Ward’s Bluff', 'Ward’s Bluff'),
  ('mo_cm_wilton', 'CM: Wilton', 'Wilton'),
  ('mo_cm_windermere_wall_dws', 'CM: Windermere Wall DWS', 'Windermere Wall DWS'),
  ('mo_em_al_foster_boulder', 'EM: Al Foster Boulder', 'Al Foster Boulder'),
  ('mo_em_amidon', 'EM: Amidon', 'Amidon'),
  ('mo_em_astral_valley', 'EM: Astral Valley', 'Astral Valley'),
  ('mo_em_boogaboo_bouldering', 'EM: Boogaboo Bouldering', 'Boogaboo Bouldering'),
  ('mo_em_chubb_trail_crag', 'EM: Chubb Trail Crag', 'Chubb Trail Crag'),
  ('mo_em_crane_lake', 'EM: Crane Lake', 'Crane Lake'),
  ('mo_em_creve_coeur_park', 'EM: Creve Coeur Park', 'Creve Coeur Park'),
  ('mo_em_dutzow_boulders', 'EM: Dutzow - Boulders', 'Dutzow - Boulders'),
  ('mo_em_dutzow_utopia', 'EM: Dutzow - Utopia', 'Dutzow - Utopia'),
  ('mo_em_elephant_rocks_sp', 'EM: Elephant Rocks SP', 'Elephant Rocks SP'),
  ('mo_em_fort_belle_fontaine', 'EM: Fort Belle Fontaine', 'Fort Belle Fontaine'),
  ('mo_em_franz_park_retaining_wall', 'EM: Franz Park Retaining Wall', 'Franz Park Retaining Wall'),
  ('mo_em_frisco_boulder', 'EM: Frisco Boulder', 'Frisco Boulder'),
  ('mo_em_hickory_canyons_natural_area', 'EM: Hickory Canyons Natural Area', 'Hickory Canyons Natural Area'),
  ('mo_em_james_mcdonnell_county_park', 'EM: James McDonnell County Park', 'James McDonnell County Park'),
  ('mo_em_johnson_shut_ins', 'EM: Johnson Shut-Ins', 'Johnson Shut-Ins'),
  ('mo_em_ketcherside_mountain', 'EM: Ketcherside Mountain', 'Ketcherside Mountain'),
  ('mo_em_kirkwood_boulders', 'EM: Kirkwood Boulders', 'Kirkwood Boulders'),
  ('mo_em_mammoth_cave', 'EM: Mammoth Cave', 'Mammoth Cave'),
  ('mo_em_marshall_avenue_trailhead', 'EM: Marshall Avenue Trailhead', 'Marshall Avenue Trailhead'),
  ('mo_em_millstream_gardens', 'EM: Millstream Gardens', 'Millstream Gardens'),
  ('mo_em_robinson_bluff', 'EM: Robinson Bluff', 'Robinson Bluff'),
  ('mo_em_rockwoods_reservation', 'EM: Rockwoods Reservation', 'Rockwoods Reservation'),
  ('mo_em_sage_mountain_recreation_area', 'EM: Sage Mountain Recreation Area', 'Sage Mountain Recreation Area'),
  ('mo_em_shepherd_mountain', 'EM: Shepherd Mountain', 'Shepherd Mountain'),
  ('mo_em_silver_mines', 'EM: Silver Mines', 'Silver Mines'),
  ('mo_em_slu_south_campus', 'EM: SLU South Campus', 'SLU South Campus'),
  ('mo_em_st_francois_state_park', 'EM: St. Francois State Park', 'St. Francois State Park'),
  ('mo_em_sunset_park', 'EM: Sunset Park', 'Sunset Park'),
  ('mo_em_the_off_sets', 'EM: The Off-Sets', 'The Off-Sets'),
  ('mo_em_washington_state_park', 'EM: Washington State Park', 'Washington State Park'),
  ('mo_em_zombie_wall', 'EM: Zombie Wall', 'Zombie Wall'),
  ('mo_nm_ranacker_conservation_area', 'NM: Ranacker Conservation Area', 'Ranacker Conservation Area'),
  ('mo_nm_the_petrichor_pit', 'NM: The Petrichor Pit', 'The Petrichor Pit'),
  ('mo_sw_busiek_state_forrest', 'SW: Busiek State Forrest', 'Busiek State Forrest'),
  ('mo_sw_drury_mincy_conservation_area', 'SW: Drury-Mincy Conservation Area', 'Drury-Mincy Conservation Area'),
  ('mo_sw_fair_grove', 'SW: Fair Grove', 'Fair Grove'),
  ('mo_sw_fort_lost_in_the_woods', 'SW: Fort Lost in the Woods', 'Fort Lost in the Woods'),
  ('mo_sw_highway_160', 'SW: Highway 160', 'Highway 160'),
  ('mo_sw_jericho_boulder', 'SW: Jericho Boulder', 'Jericho Boulder'),
  ('mo_sw_morse_park_neosho', 'SW: Morse Park, Neosho', 'Morse Park, Neosho'),
  ('mo_sw_peter_s_branch', 'SW: Peter''s Branch', 'Peter''s Branch'),
  ('mo_sw_shoal_creek_area', 'SW: Shoal Creek Area', 'Shoal Creek Area'),
  ('mo_sw_toothpick_ridge', 'SW: Toothpick Ridge', 'Toothpick Ridge'),
  ('mo_wm_69_mile_marker', 'WM: 69 Mile Marker', '69 Mile Marker'),
  ('mo_wm_berkley_riverfront', 'WM: Berkley Riverfront', 'Berkley Riverfront'),
  ('mo_wm_blue_river_bend', 'WM: Blue River Bend', 'Blue River Bend'),
  ('mo_wm_cave_hollow', 'WM: Cave Hollow', 'Cave Hollow'),
  ('mo_wm_cliff_drive', 'WM: Cliff Drive', 'Cliff Drive'),
  ('mo_wm_crown_cliffs', 'WM: Crown Cliffs', 'Crown Cliffs'),
  ('mo_wm_eagle_view_bluff', 'WM: Eagle View Bluff', 'Eagle View Bluff'),
  ('mo_wm_hospital_hill', 'WM: Hospital Hill', 'Hospital Hill'),
  ('mo_wm_lake_jacomo', 'WM: Lake Jacomo', 'Lake Jacomo'),
  ('mo_wm_monegaw_springs', 'WM: Monegaw Springs', 'Monegaw Springs'),
  ('mo_wm_raven_rocks', 'WM: Raven Rocks', 'Raven Rocks'),
  ('mo_wm_reed_s_bluff', 'WM: Reed''s Bluff', 'Reed''s Bluff'),
  ('mo_wm_shadow_rock_park_dws', 'WM: Shadow Rock Park DWS', 'Shadow Rock Park DWS'),
  ('mo_wm_swope_blue_river_limestone', 'WM: Swope & Blue River Limestone', 'Swope & Blue River Limestone'),
  ('mo_wm_the_dump', 'WM: The Dump', 'The Dump'),
  ('mo_wm_the_quarry', 'WM: The Quarry', 'The Quarry'),
  ('mo_wm_trapper_s_camp', 'WM: Trapper''s Camp', 'Trapper''s Camp'),
  ('mo_wm_warsaw', 'WM: Warsaw', 'Warsaw'),
  ('mo_wm_wornall_wall', 'WM: Wornall Wall', 'Wornall Wall'),
  ('mo_xm_closed_areas', 'XM: Closed Areas', 'Closed Areas'),
  ('mo_zm_indoor_walls', 'ZM: Indoor Walls', 'Indoor Walls'),
  ('mt_a_trad_dad_boulder', 'A.Trad Dad Boulder', 'Trad Dad Boulder'),
  ('mt_b_fuck_carson_boulder', 'B.Fuck Carson Boulder', 'Fuck Carson Boulder'),
  ('mt_c_warm_up_area', 'C.Warm-up Area', 'Warm-up Area'),
  ('mt_d_baso_bleau_boulders', 'D.Baso-Bleau Boulders', 'Baso-Bleau Boulders'),
  ('mt_g_bosch_drill_boulder', 'G.Bosch Drill Boulder', 'Bosch Drill Boulder'),
  ('mt_h_rail_boulder', 'H.Rail Boulder', 'Rail Boulder'),
  ('nh_01_entrance_boulder', '01.Entrance Boulder', 'Entrance Boulder'),
  ('nh_02_dna_boulders', '02.DNA Boulders', 'DNA Boulders'),
  ('nh_04_alcove_boulder', '04.Alcove Boulder', 'Alcove Boulder'),
  ('nh_04_upper_face_upper_tier', '04.Upper Face / Upper Tier', 'Upper Face / Upper Tier'),
  ('nh_05_marble_boulder', '05.Marble Boulder', 'Marble Boulder'),
  ('nh_06_split_boulder', '06.Split Boulder', 'Split Boulder'),
  ('nh_07_cave_boulder', '07.Cave Boulder', 'Cave Boulder'),
  ('nh_4_clean_slate_roof_and_scarred_rock', '4.Clean Slate Roof and Scarred Rock', 'Clean Slate Roof and Scarred Rock'),
  ('nh_wm_albany_area', 'WM: Albany Area', 'Albany Area'),
  ('nh_wm_bartlett_jackson_area', 'WM: Bartlett / Jackson Area', 'Bartlett / Jackson Area'),
  ('nh_wm_crawford_notch', 'WM: Crawford Notch', 'Crawford Notch'),
  ('nh_wm_evans_notch', 'WM: Evans Notch', 'Evans Notch'),
  ('nh_wm_franconia_notch', 'WM: Franconia Notch', 'Franconia Notch'),
  ('nh_wm_kancamagus_central', 'WM: Kancamagus (Central)', 'Kancamagus (Central)'),
  ('nh_wm_kancamagus_eastern', 'WM: Kancamagus (Eastern)', 'Kancamagus (Eastern)'),
  ('nh_wm_kinsman_notch', 'WM: Kinsman Notch', 'Kinsman Notch'),
  ('nh_wm_lincoln_area', 'WM: Lincoln Area', 'Lincoln Area'),
  ('nh_wm_lincoln_woodstock_area', 'WM: Lincoln/Woodstock Area', 'Lincoln/Woodstock Area'),
  ('nh_wm_north_conway', 'WM: North Conway', 'North Conway'),
  ('nh_wm_oliverian_notch', 'WM: Oliverian Notch', 'Oliverian Notch'),
  ('nh_wm_pinkham_presidentials', 'WM: Pinkham / Presidentials', 'Pinkham / Presidentials'),
  ('nh_wm_waterville_valley', 'WM: Waterville Valley', 'Waterville Valley'),
  ('nh_wm_zealand_valley', 'WM: Zealand Valley', 'Zealand Valley'),
  ('ny_6_god_jam_buttress', '6.God Jam Buttress', 'God Jam Buttress'),
  ('qc_b_secteur_du_centre', 'b.Secteur du centre', 'Secteur du centre'),
  ('qc_d_la_source_enchant_e', 'D.La source enchantée', 'La source enchantée'),
  ('qc_d2_renaissance', 'D2.Renaissance', 'Renaissance'),
  ('ut_2_busted_chitty_area', '2.Busted Chitty Area', 'Busted Chitty Area'),
  ('ut_3_uranus_area', '3.Uranus Area', 'Uranus Area'),
  ('wi_5_1_ramsay_s_pinnacle', '5.1 - Ramsay''s Pinnacle', 'Ramsay''s Pinnacle'),
  ('wi_5_2_devils_doorway', '5.2 - Devils Doorway', 'Devils Doorway'),
  ('wi_5_3_doorway_rocks_major_mass', '5.3 - Doorway Rocks - Major Mass', 'Doorway Rocks - Major Mass'),
  ('wi_5_4_doorway_rocks_minor_mass', '5.4 - Doorway Rocks - Minor Mass', 'Doorway Rocks - Minor Mass'),
  ('wi_5_5_red_rock_potholes', '5.5 - Red Rock - Potholes', 'Red Rock - Potholes'),
  ('wi_7_1_1_railroad_amphitheater', '7.1.1 - Railroad Amphitheater', 'Railroad Amphitheater'),
  ('wi_7_1_2_waterfall_wall', '7.1.2 - Waterfall Wall', 'Waterfall Wall'),
  ('wi_7_1_3_the_turret', '7.1.3 - The Turret', 'The Turret'),
  ('wi_7_2_1_birthday_rocks', '7.2.1 - Birthday Rocks', 'Birthday Rocks'),
  ('wi_7_2_2_the_dick', '7.2.2 - The Dick', 'The Dick'),
  ('wi_7_2_3_lothar_s_ledges', '7.2.3 - Lothar''s Ledges', 'Lothar''s Ledges'),
  ('wi_7_3_horse_rampart', '7.3 - Horse Rampart', 'Horse Rampart'),
  ('wi_7_4_pony_barricade', '7.4 - Pony Barricade', 'Pony Barricade'),
  ('ut_coal_pit_buttress', 'Coal Pit Buttress', 'Coalpit Buttress'),
  ('ca_penny_royal_arches', 'Penny Royal Arches', 'Pennyroyal Arches'),
  ('ky_northend', 'Northend', 'North End'),
  ('az_little_big_horn_wall', 'Little Big Horn Wall', 'Little Bighorn Wall'),
  ('ca_pywiak_dome', 'Pywiak Dome', 'Pywiack Dome'),
  ('ut_butt_crack_butte', 'Butt Crack Butte', 'Butt Crack Spire'),
  ('ca_chile_pepper', 'Chile Pepper', 'Chili Pepper'),
  ('nh_albany_slabs_rock', 'Albany Slabs Rock', 'Albany Slab Rock'),
  ('pa_scarlet_lady_boulder', 'Scarlet Lady Boulder', 'Scarlet Lady Boulders'),
  ('az_sahuaro_corners', 'Sahuaro Corners', 'Saguaro Corners'),
  ('ca_anthony_slabs', 'Anthony Slabs', 'Anthony Slab'),
  ('ca_oceanside_boulders', 'Oceanside Boulders', 'Oceanside Boulder'),
  ('ut_blue_gramma_cliff', 'Blue Gramma Cliff', 'Blue Grama Cliff'),
  ('id_q_emilin_park', 'Q''Emilin Park', 'Q''Emiln Park'),
  ('md_big_gunpowder_falls_hereford_area', 'Big Gunpowder Falls - Hereford Area', 'Gunpowder Falls - Hereford Area'),
  ('nm_lower_domingo_baca_slabs_aka_the_ribcage', 'Lower Domingo Baca Slabs (AKA: The Ribcage)', 'The Ribcage'),
  ('ut_mt_olympus', 'Mt Olympus', 'Mount Olympus Couloirs');

create temp table m_new_area(id text primary key, name text not null, parent_id text not null, final_parent text not null, area_type text, region text, lat double precision, lng double precision) on commit drop;
-- (m_new_area: none in this plan)

create temp table m_pin(id text primary key, lat double precision not null, lng double precision not null, approx boolean not null, from_lat double precision, from_lng double precision) on commit drop;
insert into m_pin values
  ('az_little_big_horn_wall', 32.35421, -110.89363, false, 32.35575, -110.8935);

create temp table m_junk(id text primary key, area_id text not null, name text not null) on commit drop;
-- (m_junk: none in this plan)

-- every ancestor of every touched area, read BEFORE anything moves (old and new ancestors both)
create temp table m_recount on commit drop as
  select distinct a.id from areas a join areas t on a.path @> t.path
   where t.id in ('ca_tier_1', 'ca_east_face_16', 'ca_tier_2', 'ca_eastface', 'ca_southside', 'ca_quasi_cliff', 'ca_toes_the', 'ca_quasi_cliffs', 'wa_north_early_winter_spire', 'wa_north_early_winters_spire', 'ut_butt_crack_spire', 'ut_butt_crack_butte', 'ut_sherpa_boulder', 'ut_sherpa_boulders', 'va_frackalachia_boulders', 'va_crackalachia_boulder', 'ut_demoisy_peak', 'ut_demoisy_peak_2', 'ca_chili_pepper', 'ca_chile_pepper', 'ca_poser_boulder', 'ca_prosser_boulder', 'ca_poster_boulder', 'ut_grist_mill', 'ut_grit_mill', 'wa_noelder', 'wa_nolder', 'nm_out_of_darkness_slabs', 'nm_out_of_darkness_slab', 'ca_bat_walls', 'ca_bat_wall_2', 'az_the_left_wall', 'az_1_the_left_wall', 'wi_4_doorway_rocks_minor_mass', 'wi_5_4_doorway_rocks_minor_mass', 'wi_5_red_rock_potholes', 'wi_5_5_red_rock_potholes', 'ut_coalpit_buttress', 'ut_coal_pit_buttress', 'wa_wild_cat_wall', 'wa_wildcat_wall', 'tx_trail_side_boulders', 'tx_trailside_boulders', 'az_little_bighorn_wall', 'az_little_big_horn_wall', 'ky_the_old_zoo', 'ky_the_old_zoo_closed', 'ky_the_new_zoo', 'ky_the_new_zoo_closed', 'ky_bird_cage_sector', 'ky_bird_cage_sector_closed', 'nv_front_boulder_wall', 'nv_front_bouldering_wall', 'ca_soul_caliber_boulder', 'ca_soul_calibur_boulder', 'co_sunshower_cliffs', 'co_sunshower_cliff', 'pa_scarlet_lady_boulders', 'pa_scarlet_lady_boulder', 'ca_anthony_slab', 'ca_anthony_slabs', 'ca_super_heros_wall', 'ca_super_heroes_wall', 'ca_hemmingway_boulder_1', 'ca_hemingway_boulder_1', 'ca_pennyroyal_arches', 'ca_penny_royal_arches', 'ky_a_north_end', 'ky_northend', 'ca_pywiack_dome', 'ca_pywiak_dome', 'ca_springbok_the', 'ca_the_winged_horse_aka_the_springbok', 'ut_steamboat_pass', 'ut_steamboat_pass_2', 'co_elmer_fudd_s_wok', 'co_elmer_fudd_s_wock', 'nh_3_yukon_gold_butress', 'nh_3_yukon_gold_buttress', 'ak_mt_francis', 'ak_mt_frances', 'az_saguaro_corners', 'az_sahuaro_corners', 'ca_miess_boulders', 'ca_meiss_boulders', 'ca_oceanside_boulder', 'ca_oceanside_boulders', 'id_damn_boulders', 'id_dam_boulders', 'ut_blue_grama_cliff', 'ut_blue_gramma_cliff', 'vt_south_trail_boulders', 'vt_south_trail_boulder', 'wa_jaberwocky_tower', 'wa_jabberwocky_tower', 'md_honey_gogo_boulder', 'md_honey_go_go_boulder', 'ia_ship_rock', 'ia_shiprock', 'co_haimovi_tower', 'co_hiamovi_tower', 'co_mount_evans_north_face', 'co_mt_blue_sky_formerly_mount_evans_north_face', 'mo_washington_state_park', 'mo_em_washington_state_park', 'ga_cherokee_bluff', 'ga_cherokee_bluffs', 'mo_kawagunga_buttress', 'mo_kawabunga_buttress', 'nh_albany_slab_rock', 'nh_albany_slabs_rock', 'ny_van_courtland_park', 'ny_van_cortland_park', 'tx_narnia_boulder', 'tx_gnarnia_boulder', 'mo_hickory_canyons_natural_area', 'mo_em_hickory_canyons_natural_area', 'mo_highway_160', 'mo_sw_highway_160', 'mo_raven_rocks', 'mo_wm_raven_rocks', 'ky_the_zoo', 'ky_the_zoo_closed', 'id_q_emiln_park', 'id_q_emilin_park', 'md_gunpowder_falls_hereford_area', 'md_big_gunpowder_falls_hereford_area', 'nm_the_ribcage', 'nm_lower_domingo_baca_slabs_aka_the_ribcage', 'ut_wasatch_alpine_areas', 'ut_mount_olympus', 'ar_3_emerald_wall', 'ar_main_street', 'az_globulars', 'az_west_side_2', 'az_south_park', 'az_southern_wall', 'co_lincoln_lake', 'co_buena_boulder_the', 'id_shady_side', 'il_b_texas_revolution_boulder', 'il_f_the_doors', 'ky_south_park', 'ky_left_flank', 'ky_volunteer_wall', 'ny_h_the_arrow_wall_cck', 'ri_dance_hall_boulder', 'sd_dam_back_side', 'tn_jimmywood', 'ut_hidden_forest', 'ut_thumb_area_the', 'wa_fun_forest', 'wa_m_m_wall', 'wy_lower_psychoactive', 'wa_dog_park_boulders', 'az_3_jolly_roger', 'ca_chiquito_dome', 'ca_peanut_boulder', 'co_west_side', 'ct_parking_lot_wall', 'ky_park_wall_2nd_level', 'ky_front_porch_wall', 'mo_wm_the_dump', 'nh_slabs', 'nm_grotto_the', 'or_warrior_wall', 'pa_nadja', 'wa_new_millennium_wall', 'wy_house_wall', 'ca_left_of_peapod', 'co_main_wall_9', 'co_unknown', 'nm_cattle_call_wall_area', 'tx_warrior_wall');

do $$ declare n int; begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog: nothing to fold.
  select count(*) into n from areas where id in (select id from m_drop_area);
  if n = 0 then raise notice '0284: no catalog, nothing to fold'; return; end if;
  if n <> 67 then raise exception '0284: expected 67 copy areas, found %', n; end if;
  -- the tree must still be the one the plan read
  select count(*) into n from areas where id = 'mo_wm_blue_river_bend' and parent_id = 'mo_blue_river_bend';
  if n <> 1 then raise exception '0284: Blue River Bend is not where the plan read it'; end if;
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.from_area;
  if n <> 170 then raise exception '0284: % of 170 climbs are where the plan found them', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep join routes o on o.id = m.drop_id;
  if n <> 80 then raise exception '0284: % of 80 merge pairs still exist', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.from_area;
  if n <> 10 then raise exception '0284: % of 10 sub-areas are where the plan found them', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.from_name;
  if n <> 190 then raise exception '0284: % of 190 renames still carry the planned name', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.from_name;
  if n <> 0 then raise exception '0284: % of 0 climb renames still carry the planned name', n; end if;
  select count(*) into n from areas where id in (select id from m_new_area);
  if n > 0 then raise exception '0284: % of the new areas already exist', n; end if;
  select count(*) into n from m_pin m join areas a on a.id = m.id
   where a.lat is not distinct from m.from_lat and a.lng is not distinct from m.from_lng;
  if n <> 1 then raise exception '0284: % of 1 pins are where the plan read them', n; end if;
  select count(*) into n from m_junk j join routes r on r.id = j.id and r.area_id = j.area_id and r.name = j.name;
  if n <> 0 then raise exception '0284: % of 0 junk rows are where they were read', n; end if;
  -- every climb on a copy is accounted for
  select count(*) into n from routes r join m_drop_area d on d.id = r.area_id
   where r.id not in (select id from m_move) and r.id not in (select drop_id from m_merge);
  if n > 0 then raise exception '0284: % climbs on a copy are not in the plan', n; end if;
  select count(*) into n from areas a join m_drop_area d on d.id = a.parent_id
   where a.id not in (select id from m_reparent) and a.id not in (select id from m_drop_area);
  if n > 0 then raise exception '0284: % sub-areas of a copy are not in the plan', n; end if;
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
  if n > 0 then raise exception '0284: % climber rows point at a row this deletes — stop and repoint them', n; end if;
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
  if n > 0 then raise exception '0284: % climber rows still point at a copy', n; end if;
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
  parking_lat = case when (k.parking_lat is null or k.parking_lng is null) and o.id not in ('ky_the_zoo', 'ky_the_old_zoo', 'ky_the_new_zoo', 'ky_bird_cage_sector') then o.parking_lat else k.parking_lat end,
  parking_lng = case when (k.parking_lat is null or k.parking_lng is null) and o.id not in ('ky_the_zoo', 'ky_the_old_zoo', 'ky_the_new_zoo', 'ky_bird_cage_sector') then o.parking_lng else k.parking_lng end,
  parking_name = case when (k.parking_lat is null or k.parking_lng is null) and o.id not in ('ky_the_zoo', 'ky_the_old_zoo', 'ky_the_new_zoo', 'ky_bird_cage_sector') then o.parking_name else k.parking_name end,
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

-- 5c. Blue River Bend's one child is the parent's own name under the region label ("WM: Blue River Bend") and holds
--     all five climbs: the child takes the parent's place under Swope & Blue River Limestone, and the emptied parent
--     goes (its own climber rows, if any, follow the child first). Bypassed for the one statement in which the child
--     stands beside the same-named parent it replaces.
update contributions set area_id = 'mo_wm_blue_river_bend' where area_id = 'mo_blue_river_bend';
update topos set area_id = 'mo_wm_blue_river_bend' where area_id = 'mo_blue_river_bend';
set local catalog.allow_duplicate = 'on';
update areas set parent_id = 'mo_wm_swope_blue_river_limestone' where id = 'mo_wm_blue_river_bend' and parent_id = 'mo_blue_river_bend';
set local catalog.allow_duplicate = 'off';
delete from areas a where a.id = 'mo_blue_river_bend' and a.parent_id = 'mo_wm_swope_blue_river_limestone'
   and not exists (select 1 from routes r where r.area_id = a.id) and not exists (select 1 from areas c where c.parent_id = a.id);

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
  if n > 0 then raise exception '0284: % copy areas were not emptied', n; end if;
  select count(*) into n from routes where id in (select drop_id from m_merge union select id from m_junk);
  if n > 0 then raise exception '0284: % merged or junk climbs survived', n; end if;
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.to_area;
  if n <> 170 then raise exception '0284: % of 170 climbs moved', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.to_name;
  if n <> 190 then raise exception '0284: % of 190 renames landed', n; end if;
  select count(*) into n from m_new_area m join areas a on a.id = m.id and a.parent_id = m.final_parent and a.route_count > 0;
  if n <> 0 then raise exception '0284: % of 0 new areas are in place, holding their climbs', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.to_area;
  if n <> 10 then raise exception '0284: % of 10 sub-areas re-parented', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.to_name;
  if n <> 0 then raise exception '0284: % of 0 climb renames landed', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep where m.grade is not null and (k.grade <> m.grade or k.grade_num is distinct from m.grade_num);
  if n > 0 then raise exception '0284: % merged grades or grade_nums did not land', n; end if;
  select count(*) into n from m_pin m join areas a on a.id = m.id and a.lat = m.lat and a.lng = m.lng and a.coords_approx = m.approx;
  if n <> 1 then raise exception '0284: % of 1 pins landed', n; end if;
  -- no area holds climbs AND sub-areas
  select count(*) into n from areas a where a.id in (select id from m_recount)
     and exists (select 1 from routes r where r.area_id = a.id) and exists (select 1 from areas s where s.parent_id = a.id);
  if n > 0 then raise exception '0284: % areas hold climbs and sub-areas', n; end if;
  select count(*) into n from areas where id = 'mo_blue_river_bend';
  if n > 0 then raise exception '0284: Blue River Bend''s emptied parent survived'; end if;
  select count(*) into n from areas where id = 'mo_wm_blue_river_bend' and parent_id = 'mo_wm_swope_blue_river_limestone' and name = 'Blue River Bend';
  if n <> 1 then raise exception '0284: Blue River Bend did not take its parent''s place'; end if;
end $$;

commit;
