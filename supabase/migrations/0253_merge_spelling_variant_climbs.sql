-- 0253: merge the climbs stored twice under two spellings of one name, and delete the rows the
-- source itself marked for deletion.
--
-- Asked: "ok do all of those" (2026-10-07), after 0251 folded the areas — under the standing rule "fold
-- into 1 area, same for everything else, i don't want duplicates". 0251 left spelling variants alone.
--
-- Found: every pair of climbs ON ONE AREA whose names differ by a typo or by spacing/punctuation only,
-- same discipline and same base grade (2,775 candidates), then READ pair by pair. Merged here only
-- the 179 read as one climb: "Lizard / Lizzard With a View", "Manhattan / Manhatten Project",
-- "Anti Matter / Antimatter" — typically one row carries the FA and the other a description.
-- NOT merged: pairs that read as two climbs ("The Last / The Lost Gardener"), the UNSURE ones, and
-- names where the grade or a mark IS the difference ("The 5.7 Corner" / "The 5.7+ Corner",
-- "Barbie's [--]" / "Barbie's [-]"). Placeholders ("Unnamed", "Project") with different grades are
-- different climbs and were never candidates.
--
--   * 179 pairs: the row holding more is kept; it fills each BLANK column from the other (0221's rule),
--     takes the other's grade only where it extends its own ("5.13-" -> "5.13- PG13"), the other row
--     is deleted, and 69 keepers then take the right spelling.
--   * 8 rows deleted outright: six named "to be deleted" / "duplicate please delete" by the source
--     (Flight of the Monarch and Dizzy Curtain have their real row beside them; the others are bare
--     stubs), and two "_delete" rows whose FA reads "DEBUG Test".
-- Read 2026-10-07: no contribution, log, topo, list or any other climber row points at any of them.
-- ABORTS if one does now, or if a row is no longer what the plan read.

begin;

create temp table m_merge(keep text not null, drop_id text primary key, from_name text not null, to_name text not null, grade text) on commit drop;
insert into m_merge values
  ('ak_glak_s_place_and_tree_fort_somethin_fishy', 'ak_something_fishy', 'Somethin'' Fishy', 'Something Fishy', null),
  ('al_eddie_area_palmar_reflex', 'al_palmer_reflex', 'Palmar Reflex', 'Palmar Reflex', null),
  ('al_crazy_house_the_nurse_ratched', 'al_nurse_ratchet', 'Nurse Ratched', 'Nurse Ratched', null),
  ('al_turtle_rock_area_panty_shields_boulder_contraband', 'al_countraband', 'Contraband', 'Contraband', null),
  ('ar_warm_up_boulder_memento', 'ar_momento', 'Memento', 'Memento', null),
  ('ar_north_forty_routes_tattooed_lady_direct', 'ar_tattoed_lady_direct', 'Tattooed Lady Direct', 'Tattooed Lady Direct', null),
  ('ar_loaf_boulder_quiet_time', 'ar_quite_time', 'Quiet Time', 'Quiet Time', null),
  ('ar_south_side_albino_rhino_wall_eminent_front', 'ar_eminence_front', 'Eminent Front', 'Eminence Front', null),
  ('ar_street_fighter_wall_hadouken', 'ar_hadoyken', 'Hadouken', 'Hadouken', null),
  ('az_mouse_wall_the_mighty_minnie_mouse', 'az_mighty_minne_mouse', 'Mighty Minnie Mouse', 'Mighty Minnie Mouse', null),
  ('az_tall_wall_too_far_north_for_the_migrating_munchkin', 'az_to_far_north_for_the_migrating_munchkin', 'Too Far North For The Migrating Munchkin', 'Too Far North For The Migrating Munchkin', null),
  ('az_forgotten_wall_control_tower_up_the_creek_wall_abandonment_issues', 'az_abandonement_issues', 'Abandonment Issues', 'Abandonment Issues', null),
  ('az_eden_adams_rib', 'az_adam_rib', 'Adams Rib', 'Adams Rib', null),
  ('az_overlook_the_the_gridle', 'az_the_girdle', 'The Gridle', 'The Girdle', null),
  ('az_approach_dome_better_than_whacking', 'az_better_then_whacking', 'Better Than Whacking', 'Better Than Whacking', null),
  ('az_turret_rock_and_environs_caterpillar_corner', 'az_caterpiller_corner', 'Caterpillar Corner', 'Caterpillar Corner', null),
  ('az_tiger_wall_area_red_dragon', 'az_red_draon', 'Red Dragon', 'Red Dragon', null),
  ('az_chef_kiss_chef_s_kiss', 'az_chef_kiss', 'Chef''s Kiss', 'Chef''s Kiss', null),
  ('az_totem_proto_area_the_fruits_of_optimism', 'az_the_fruits_of_optomisim', 'The Fruits of Optimism', 'The Fruits of Optimism', null),
  ('az_sean_s_wall_evensung', 'az_evensong', 'Evensung', 'Evensong', null),
  ('az_hedgerow_ironwood', 'az_iornwood', 'Ironwood', 'Ironwood', null),
  ('ca_1_space_domes_battle_star_galactica', 'ca_battle_star_galactia', 'Battle Star Galactica', 'Battle Star Galactica', null),
  ('ca_2_local_s_block_lob_locals_only_brah', 'ca_lob_locals_only_braj', 'LOB (Locals Only, Brah)', 'LOB (Locals Only, Brah)', null),
  ('ca_2_southwest_face_jolly_roger', 'ca_jolly_rodger', 'Jolly Roger', 'Jolly Roger', null),
  ('ca_long_s_folly_abnur_bear_is_everywhere', 'ca_abner_bear_is_everywhere', 'Abnur Bear is Everywhere', 'Abner Bear is Everywhere', null),
  ('ca_social_platform_ned_guy_s_proud_pearl_necklace', 'ca_ned_guys_s_proud_pearl_necklace', 'Ned Guy''s Proud Pearl Necklace', 'Ned Guy''s Proud Pearl Necklace', null),
  ('ca_west_face_center_flintstone_slab_blanketty_blank', 'ca_blankety_blank', 'Blanketty Blank', 'Blankety Blank', null),
  ('ca_anger_management_cliffs_micro_aggression', 'ca_micro_agression', 'Micro Aggression', 'Micro Aggression', null),
  ('ca_west_face_6_expresso', 'ca_espresso_2', 'Expresso', 'Espresso', null),
  ('ca_beetle_buttress_beetle_bailey', 'ca_beatle_baily', 'Beetle Bailey', 'Beetle Bailey', null),
  ('ca_wild_wild_west_the_high_plains_direct', 'ca_high_planes_direct', 'High Plains Direct', 'High Plains Direct', null),
  ('ca_wild_wild_west_the_high_plains_drifter', 'ca_high_planes_drifter', 'High Plains Drifter', 'High Plains Drifter', null),
  ('ca_too_proud_to_boulder', 'ca_to_proud_to_boulder', 'Too Proud to Boulder', 'Too Proud to Boulder', null),
  ('ca_hidden_slab_schadenfreude', 'ca_schandenfreude', 'Schadenfreude', 'Schadenfreude', null),
  ('ca_west_face_7_curse_of_consciousness', 'ca_curse_of_consiousness', 'Curse of Consciousness', 'Curse of Consciousness', null),
  ('ca_valle_de_duck_chaise_lounge', 'ca_chase_lounge', 'Chaise Lounge', 'Chaise Lounge', null),
  ('ca_west_face_left_side_swedish_variation', 'ca_sweedish_variation', 'Swedish Variation', 'Swedish Variation', null),
  ('ca_f_limp_dick_fellatio', 'ca_fallatio_2', 'Fellatio', 'Fellatio', null),
  ('ca_far_right_the_the_libertarian', 'ca_the_liberarian', 'The Libertarian', 'The Libertarian', null),
  ('ca_vanishing_point_boulder_flight_of_osiris', 'ca_flight_of_osirus', 'Flight of Osiris', 'Flight of Osiris', null),
  ('ca_lizzie_boulder_not_so_thin_lizzy', 'ca_not_so_thin_lizzie', 'Not So Thin Lizzy', 'Not So Thin Lizzy', null),
  ('co_far_side_lizard_with_a_view', 'co_lizzard_with_a_view', 'Lizard With a View', 'Lizard With a View', null),
  ('co_redgarden_s_buttress_archer_mclenahan', 'co_archer_mclanahan', 'Archer McLenahan', 'Archer McLanahan', null),
  ('co_in_between_egg_upper_eggs_scoop_aka_pac_man', 'co_scoop_aka_pack_man', 'Scoop aka Pac-man', 'Scoop aka Pac-man', null),
  ('co_balance_boulder_2_circadian_rhythm_submited_as_cyrcadian_rythym', 'co_circadian_rythym_submited_as_cyrcadian_rythym', 'Circadian Rhythm (submited as Cyrcadian Rythym)', 'Circadian Rhythm', null),
  ('co_punchbowl_the_punchbowl_arch_right_arch_of_cave', 'co_punchbown_arch_right_arch_of_cave', 'Punchbowl Arch (Right Arch of Cave)', 'Punchbowl Arch (Right Arch of Cave)', null),
  ('co_pioneer_point_gilligan_s_way_home', 'co_giligan_s_way_home', 'Gilligan''s Way Home', 'Gilligan''s Way Home', null),
  ('co_bucksnort_slab_bushes_of_beelzebub', 'co_bushes_of_baelzebub', 'Bushes of Beelzebub', 'Bushes of Beelzebub', null),
  ('co_bucksnort_slab_good_vibrations', 'co_good_virbrations', 'Good Vibrations', 'Good Vibrations', null),
  ('co_bucksnort_slab_gumby_groove', 'co_gumbi_groove', 'Gumby Groove', 'Gumby Groove', null),
  ('co_irishman_s_temple_la_veuve_noire', 'co_le_veuve_noire', 'La Veuve Noire', 'La Veuve Noire', null),
  ('ct_rattlesnake_cliff_franny_and_zooey', 'ct_franny_and_zoey', 'Franny and Zooey', 'Franny and Zooey', null),
  ('ga_grape_ape_jabber_jaw', 'ga_jaber_jaw', 'Jabber Jaw', 'Jabber Jaw', null),
  ('id_west_buttress_south_squench', 'id_sqench', 'Squench', 'Squench', null),
  ('id_building_blocks_west_vice_grips', 'id_vise_grips', 'Vice Grips', 'Vise Grips', null),
  ('id_solstice_wings_for_mary', 'id_wings_for_marry', 'Wings for Mary', 'Wings for Mary', null),
  ('id_crack_house_the_mountin_mahogany', 'id_mountain_mahogany', 'Mountin'' Mahogany', 'Mountain Mahogany', null),
  ('id_marmot_boulder_hole_punch', 'id_hole_puch', 'Hole Punch', 'Hole Punch', null),
  ('id_lost_arrow_spire_forcash_riches', 'id_forkash_riches', 'Forcash & Riches', 'Forkash & Riches', null),
  ('il_f_the_promised_land_jared_s_route', 'il_jarred_s_route', 'Jared’s Route', 'Jared’s Route', null),
  ('il_f_the_promised_land_salamander', 'il_salemander', 'Salamander', 'Salamander', null),
  ('il_f_the_basement_obed_simulator_c', 'il_obed_simulater_c', 'Obed Simulator C', 'Obed Simulator C', null),
  ('il_c_applejack_wall_manhattan_project', 'il_manhatten_project', 'Manhattan Project', 'Manhattan Project', null),
  ('ky_4_madness_cave_pushin_up_daisies', 'ky_pushing_up_daisies', 'Pushin'' Up Daisies', 'Pushing Up Daisies', null),
  ('ky_chocolate_factory_toxicondendron', 'ky_toxicodendron', 'Toxicondendron', 'Toxicodendron', null),
  ('ky_primortal_nonsence', 'ky_coyote_cliff_primortal_nonscence', 'Primortal Nonsence', 'Primortal Nonscence', null),
  ('ky_adena_wall_the_bushwack_payoff', 'ky_the_bushwhack_payoff', 'The Bushwack Payoff', 'The Bushwhack Payoff', null),
  ('ky_bald_rock_cove_bieber_beatdown', 'ky_bebber_beatdown', 'Bieber Beatdown', 'Bieber Beatdown', null),
  ('ky_real_deep_end_lichening_bolt', 'ky_lichenimg_bolt', 'Lichening Bolt', 'Lichening Bolt', null),
  ('ky_knuckles_ironfist_panda_knuckle_grip', 'ky_knucke_grip', 'Knuckle Grip', 'Knuckle Grip', null),
  ('ky_sanctuary_the_buddha_slept', 'ky_budda_slept', 'Buddha Slept', 'Buddha Slept', null),
  ('ky_shire_the_team_wilander', 'ky_team_wilder', 'Team Wilander', 'Team Wilander', null),
  ('md_norris_s_nipple', 'md_norris_nipple', 'Norris''s Nipple', 'Norris''s Nipple', null),
  ('me_tower_buttress_and_face_layback', 'me_lyback', 'Layback', 'Layback', null),
  ('mi_pinnacle_area_the_the_pinnacle', 'mi_the_pinacle', 'The Pinnacle', 'The Pinnacle', null),
  ('mt_blow_hard_wall_pissin_in_the_wind', 'mt_pissing_in_the_wind', 'Pissin'' in the Wind', 'Pissing In the Wind', null),
  ('nc_warmup_boulder_sexual_chocolate', 'nc_sexual_choclate', 'Sexual Chocolate', 'Sexual Chocolate', null),
  ('nc_cave_the_2_blonde_svengali', 'nc_blond_svengali', 'Blonde Svengali', 'Blonde Svengali', null),
  ('nh_01_the_cosmic_crag_sidereal_motion', 'nh_siderial_motion', 'Sidereal Motion', 'Sidereal Motion', null),
  ('nh_new_wave_weevil_knievel', 'nh_weevil_knievil', 'Weevil Knievel', 'Weevil Knievel', null),
  ('nh_rand_mountain_dike_route', 'nh_dyke_route', 'Dike Route', 'Dike Route', null),
  ('nh_nest_the_kestrel', 'nh_kestral', 'Kestrel', 'Kestrel', null),
  ('nm_bush_shark_area_westeron_wynde', 'nm_westron_wynde', 'Westeron Wynde', 'Westron Wynde', null),
  ('nv_the_secret_13_wall_herbivore_dyno_soar', 'nv_herbivour_dyno_soar', 'Herbivore Dyno-soar', 'Herbivore Dyno-soar', null),
  ('nv_south_breezeway_dome_dike_stretcher', 'nv_dyke_stretcher', 'Dike Stretcher', 'Dike Stretcher', null),
  ('nv_playground_aka_the_mall_the_country_bumpkin', 'nv_country_bumkin', 'Country Bumpkin', 'Country Bumpkin', null),
  ('nv_playground_aka_the_mall_the_electric_orange_peeler', 'nv_electric_orange_pealer', 'Electric Orange Peeler', 'Electric Orange Peeler', null),
  ('ny_j_the_yellow_wall_and_the_seasons_fillipina', 'ny_filipina', 'Fillipina', 'Filipina', null),
  ('ny_m_crevice_right_and_psycho_wall_crack_of_resplendent_delights', 'ny_crack_of_respendent_delights', 'Crack of Resplendent Delights', 'Crack of Resplendent Delights', null),
  ('ny_phoenicia_sportsman_s_wall_neither', 'ny_niether', 'Neither', 'Neither', null),
  ('ny_fern_cliff_synchrony_traverse', 'ny_syncrony_traverse', 'Synchrony Traverse', 'Synchrony Traverse', null),
  ('oh_isle_of_many_faces_aztic_walk', 'oh_aztec_walk', 'Aztic Walk', 'Aztec Walk', null),
  ('oh_harmony_wall_top_rope_trad_area_green_dragon', 'oh_green_dargon', 'Green Dragon', 'Green Dragon', null),
  ('or_q_mesa_verde_wall_minas_morgul', 'or_minus_morgul', 'Minas Morgul', 'Minas Morgul', null),
  ('or_port_orford_bouldering_rip_sriracha', 'or_port_orford_bouldering_rip_siracha', 'RIP Sriracha', 'RIP Sriracha', null),
  ('or_singer_slab_grandpa_dave_on_the_edge', 'or_gandpa_dave_on_the_edge', 'Grandpa Dave on the Edge', 'Grandpa Dave on the Edge', null),
  ('pa_glen_echo_gully_traevers', 'pa_gully_travers', 'Gully Traevers', 'Gully Travers', null),
  ('sd_falling_rock_drainage_flat_liner', 'sd_flat_linner', 'Flat Liner', 'Flat Liner', null),
  ('tn_predator_wall_scarlet_begonia', 'tn_scarlete_begonia', 'Scarlet Begonia', 'Scarlet Begonia', null),
  ('tx_warm_up_roof_juvenile_offender', 'tx_juvinile_offender', 'Juvenile Offender', 'Juvenile Offender', null),
  ('tx_between_tobacco_chewing_gut_chomping_kinfolk_from_hell', 'tx_tobacco_chewing_gut_chompong_kinfolk_from_hell', 'Tobacco-chewing Gut-chomping Kinfolk from Hell', 'Tobacco-chewing Gut-chomping Kinfolk from Hell', null),
  ('tx_centex_sportsman_cave_chossbuckler_open_project', 'tx_chossbuckler_openprxject', 'Chossbuckler [open project]', 'Chossbuckler [open project]', null),
  ('ut_hobbit_caves_calcaneus', 'ut_calcaneous', 'Calcaneus', 'Calcaneus', null),
  ('ut_cragganmore_laphroaig', 'ut_laphroig', 'Laphroaig', 'Laphroaig', null),
  ('ut_cragganmore_loch_dhu', 'ut_loch_du', 'Loch Dhu', 'Loch Dhu', null),
  ('ut_wasatch_resort_the_der_untergriff', 'ut_der_undergriff', 'Der Untergriff', 'Der Untergriff', null),
  ('ut_fucoidal_quartzite_saturday_mourning', 'ut_satuday_mourning', 'Saturday Mourning', 'Saturday Mourning', null),
  ('ut_blacksmith_left_zurinskas_left', 'ut_zurinfkas_left', 'Zurinskas Left', 'Zurinskas Left', null),
  ('ut_pipe_dream_the_la_confianza', 'ut_la_confienza', 'La Confianza', 'La Confianza', null),
  ('ut_pipe_dream_the_squeal_like_a_pig', 'ut_squeel_like_a_pig', 'Squeal Like a Pig', 'Squeal Like a Pig', null),
  ('ut_device_ignitor_boulder_device_igniter_middle', 'ut_device_ignitor_middle', 'Device Igniter Middle', 'Device Igniter Middle', null),
  ('ut_device_ignitor_boulder_device_igniter_right', 'ut_device_ignitor_right', 'Device Igniter Right', 'Device Igniter Right', null),
  ('va_angry_birds', 'va_angry_brids', 'Angry birds', 'Angry birds', null),
  ('va_hidden_cracks_right_sector_chicadee_corner', 'va_hidden_cracks_right_sector_chickadee_corner', 'Chicadee Corner', 'Chickadee Corner', null),
  ('wa_la_vida_locamotive', 'wa_deception_wall_la_vida_locomotive', 'La Vida Locamotive', 'La Vida Locomotive', null),
  ('wa_a_turtle_to_far', 'wa_b_the_black_sea_a_turtle_too_far', 'A Turtle to Far', 'A Turtle too Far', null),
  ('wa_elvis_pharmacist', 'wa_c_king_pins_elvis_s_pharmacist', 'Elvis'' Pharmacist', 'Elvis''s Pharmacist', null),
  ('wa_madsen_s_buttress_visor_chimney', 'wa_viser_chimney', 'Visor Chimney', 'Visor Chimney', null),
  ('wa_heironymous_bosch', 'wa_c_the_country_hieronymus_bosch', 'Heironymous Bosch', 'Hieronymus Bosch', null),
  ('wa_empty_martry_breeding_room', 'wa_valley_view_west_empty_martyr_breeding_room', 'Empty Martry Breeding Room', 'Empty Martyr Breeding Room', null),
  ('wa_feeling_stabby', 'wa_crowbar_crag_feelin_stabby', 'Feeling Stabby', 'Feeling Stabby', null),
  ('wi_south_faces_awesome_arete', 'wi_awsome_arete', 'Awesome Arete', 'Awesome Arete', null),
  ('wv_02_mechanical_sensei_boulder_flight_of_the_defibrillator', 'wv_flight_of_the_defibrilator', 'Flight of the Defibrillator', 'Flight of the Defibrillator', null),
  ('wv_1_tan_wall_covert_ops', 'wv_covert_opps', 'Covert Ops', 'Covert Ops', null),
  ('wv_5_sunkist_wall_arachnophobia', 'wv_arachniphobia', 'Arachnophobia', 'Arachnophobia', null),
  ('wv_mellifluous', 'wv_a_fern_point_mellifluus', 'Mellifluous', 'Mellifluous', null),
  ('wv_junkyard_wall_andropov_s_cold', 'wv_antropov_s_cold', 'Andropov''s Cold', 'Andropov''s Cold', null),
  ('wv_junkyard_wall_jumpin_jack_flash', 'wv_jumping_jack_flash', 'Jumpin'' Jack Flash', 'Jumping Jack Flash', null),
  ('wv_satisfaction_wall_the_lickety_split', 'wv_lickty_split', 'Lickety Split', 'Lickety Split', null),
  ('wv_circus_wall_lyin_and_stealin', 'wv_ly_n_and_stealin', 'Lyin'' and Stealin''', 'Lyin'' and Stealin''', null),
  ('wv_storm_slab_summer_storm', 'wv_sumer_storm', 'Summer storm', 'Summer storm', null),
  ('wy_blue_corner_and_crazy_horse', 'wy_and_crazy_hourse', 'And Crazy Horse', 'And Crazy Horse', null),
  ('wy_back_forty_the_psychedelic_milk_painter', 'wy_psychedellic_milk_painter', 'Psychedelic Milk Painter', 'Psychedelic Milk Painter', null),
  ('wy_old_easy_cincinnati_sua_slide', 'wy_cincinatti_sua_slide', 'Cincinnati Sua Slide', 'Cincinnati Sua Slide', null),
  ('az_black_roof_antimatter', 'az_anti_matter', 'Antimatter', 'Anti Matter', null),
  ('az_rockin_roll_wall_the_brighter_than_creations_dark', 'az_brighter_than_creation_s_dark', 'Brighter Than Creations Dark', 'brighter than creation,s dark', null),
  ('ca_jailhouse_rock_2_jailbreak', 'ca_jail_break', 'Jailbreak', 'Jail Break', null),
  ('ca_ship_wrecked', 'ca_shipwrecked', 'Ship wrecked', 'Ship wrecked', null),
  ('ca_vd_very_direct_wall_followers_folly', 'ca_follower_s_folly', 'Followers Folly', 'Followers Folly', null),
  ('ca_snickers_north_face_knight_shift', 'ca_knightshift', 'Knight Shift', 'Knightshift', null),
  ('ca_puppy_dome_horseshoes_and_handgrenades', 'ca_horseshoes_and_hand_grenades_2', 'Horseshoes and Handgrenades', 'Horseshoes and Hand Grenades', null),
  ('ca_cove_the_3_gutterball', 'ca_gutter_ball_2', 'Gutterball', 'Gutter Ball', null),
  ('ca_demon_dome_rosemary_s_baby', 'ca_rosemary_s_baby', 'Rosemary''s Baby', 'Rosemarys Baby', null),
  ('co_07_back_to_the_future_suede_head', 'co_suedehead', 'Suede Head', 'Suede Head', null),
  ('co_bob_s_rock_toprope_slab', 'co_top_rope_slab', 'Toprope Slab', 'Top Rope Slab', null),
  ('co_south_rim_routes_crystalvision', 'co_crystal_vision', 'Crystalvision', 'Crystal Vision', null),
  ('co_freight_train_boulder_the_the_classic_warm_up', 'co_the_classic_warmup', 'The Classic Warm-up', 'The Classic Warmup', null),
  ('co_warm_up_boulder_the_warm_up_traverse', 'co_warmup_traverse_2', 'Warm-up Traverse', 'Warmup Traverse', null),
  ('ct_7_north_end_disneyworld', 'ct_disney_world', 'Disneyworld', 'Disney World', null),
  ('ga_firewoman_area_firewoman', 'ga_fire_woman', 'Firewoman', 'Fire Woman', null),
  ('id_upper_breadloaves_west_tel_aviv', 'id_telaviv', 'Tel Aviv', 'Telaviv', null),
  ('ky_the_gallery_stucconu', 'ky_stucco_nu', 'Stucconu', 'Stucco Nu', null),
  ('ky_pistol_ridge_bitch_mobile', 'ky_bitchmobile', 'Bitch mobile', 'Bitchmobile', null),
  ('ky_graining_fork_nature_preserve_a_k_a_roadside_crag_crazyfingers', 'ky_crazy_fingers', 'Crazyfingers', 'Crazy Fingers', null),
  ('ky_dark_side_the_swingline', 'ky_swing_line', 'Swingline', 'Swing Line', null),
  ('ky_corner_pocket_geller_s_spoon', 'ky_geller_s_spoon', 'Geller''s Spoon', 'Geller"s Spoon', null),
  ('ky_chickenhead_better_than_no_head', 'ky_dip_wall_chicken_head_better_than_no_head', 'Chickenhead Better Than No Head', 'Chickenhead Better Than No Head', '5.10a R'),
  ('ma_battleship_rock_lifeboat', 'ma_life_boat', 'Lifeboat', 'Life boat', null),
  ('me_right_end_block_buster', 'me_blockbuster', 'Block Buster', 'Blockbuster', null),
  ('mn_arrowhead_left', 'mn_arrow_head_left', 'Arrowhead Left', 'Arrow Head Left', null),
  ('mt_06_hold_up_bluffs_south_night_flyer', 'mt_nightflyer', 'Night Flyer', 'Nightflyer', null),
  ('mt_gregory_the_girl_in_between', 'mt_the_girl_inbetween', 'The Girl In Between', 'The Girl Inbetween', null),
  ('nc_north_side_extracrimpy_chicken', 'nc_extra_crimpy_chicken', 'Extracrimpy Chicken', 'Extra Crimpy Chicken', null),
  ('nv_tuna_and_chips_wall_water_streak', 'nv_waterstreak', 'Water Streak', 'Water Streak', null),
  ('nv_jackrabbit_buttress_myster_z', 'nv_mysterz', 'Myster Z', 'MysterZ', null),
  ('ny_boxcar_area_boxcar_arete', 'ny_box_car_arete', 'Boxcar Arete', 'Box Car Arete', null),
  ('pa_prow_area_chet_s_children', 'pa_chet_s_children', 'Chet''s Children', 'Chets Children', null),
  ('pa_warm_up_boulder_typical_birdsboro', 'pa_typical_birds_boro', 'Typical Birdsboro', 'Typical birds boro', null),
  ('tx_dead_cats_scott_s_pelotas', 'tx_scott_s_pelotas', 'Scott''s Pelotas', 'Scotts Pelotas', null),
  ('tx_zoey_s_wall_maggie_s_farm', 'tx_maggie_s_farm', 'Maggie''s Farm', 'Maggies Farm', null),
  ('ut_cat_wall_cats_in_the_dog_house', 'ut_cat_s_in_the_doghouse', 'Cats in the Dog House', 'Cat''s in the Doghouse', null),
  ('ut_cat_wall_cat_skills', 'ut_catskills', 'Cat Skills', 'Catskills', null),
  ('ut_pipe_dream_the_pipe_dream', 'ut_pipedream', 'Pipe Dream', 'PipeDream', null),
  ('wv_05_headless_wall_mo_verd', 'wv_mo_verde', 'Mo'' Verdé', 'Mo''Verde', null),
  ('wv_07_french_wall_vivre_l_amour', 'wv_vivre_l_amour', 'Vivre l''Amour', 'Vivre l"Amour', null),
  ('wv_2_bridge_buttress_dog_fight', 'wv_dogfight', 'Dog Fight', 'Dogfight', null),
  ('wv_coliseum_the_superpod', 'wv_super_pod', 'Superpod', 'Super Pod', null),
  ('wy_back_forty_the_pbr_celebration', 'wy_p_b_r_celebration', 'PBR Celebration', 'P.B.R. Celebration', null),
  ('wy_big_kahuna_pillar_the_el_dorado_coral_club', 'wy_the_eldorado_coral_club', 'The El Dorado Coral Club', 'The Eldorado Coral Club', null);

create temp table m_delete(id text primary key, name text not null) on commit drop;
insert into m_delete values
  ('co_far_side_flight_of_the_monarch_to_be_deleted', 'Flight of the Monarch (to be deleted)'),
  ('co_scottish_gullies_dizzy_curtain_duplication_to_be_deleted', 'Dizzy Curtain - duplication - to be deleted'),
  ('co_sonic_youth_to_be_deleted', 'Sonic Youth -  to be deleted'),
  ('wy_old_easy_to_be_deleted_submitted_as_the_whisper_seep', 'To be deleted - submitted as The Whisper Seep'),
  ('id_duplicate_please_delete', 'duplicate please delete'),
  ('ut_to_be_deleted_unnamed_19', 'To Be Deleted (Unnamed 19)'),
  ('al_delete', '_delete'),
  ('al_delete_2', '_delete');

do $$ declare n int; begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog: nothing to merge.
  select count(*) into n from routes where id in (select keep from m_merge);
  if n = 0 then raise notice '0253: no catalog, nothing to merge'; return; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep and k.name = m.from_name
    join routes o on o.id = m.drop_id and o.area_id = k.area_id;
  if n <> 179 then raise exception '0253: % of 179 pairs are still as the plan read them', n; end if;
  select count(*) into n from m_delete d join routes r on r.id = d.id and r.name = d.name;
  if n <> 8 then raise exception '0253: % of 8 rows to delete are still as the plan read them', n; end if;
  -- refuse to cascade-delete anybody's data
  select (select count(*) from contributions where route_id in (select drop_id from m_merge union all select id from m_delete))
       + (select count(*) from topo_lines where route_id in (select drop_id from m_merge union all select id from m_delete))
       + (select count(*) from gps_submissions where route_id in (select drop_id from m_merge union all select id from m_delete))
       + (select count(*) from content_reports where route_id in (select drop_id from m_merge union all select id from m_delete))
       + (select count(*) from route_base_checkins where route_id in (select drop_id from m_merge union all select id from m_delete))
       + (select count(*) from objectives where route_id in (select drop_id from m_merge union all select id from m_delete))
       + (select count(*) from hazard_votes where route_id in (select drop_id from m_merge union all select id from m_delete))
       + (select count(*) from climb_logs where route_id in (select drop_id from m_merge union all select id from m_delete))
       + (select count(*) from crew_listings where route_id in (select drop_id from m_merge union all select id from m_delete))
       + (select count(*) from user_itineraries where route_id in (select drop_id from m_merge union all select id from m_delete))
       + (select count(*) from crews where route_id in (select drop_id from m_merge union all select id from m_delete))
       + (select count(*) from user_lists where route_ids && (select array_agg(id) from (select drop_id from m_merge union all select id from m_delete) g(id)))
    into n;
  if n > 0 then raise exception '0253: % climber rows point at a row this deletes — stop and repoint them', n; end if;
end $$;

-- 1. the keeper fills its blank columns from the other spelling, which then goes
update routes k set
  grade = coalesce(m.grade, case when nullif(btrim(k.grade), '') is null then o.grade else k.grade end),
  discipline = case when nullif(btrim(k.discipline), '') is null then o.discipline else k.discipline end,
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

-- 2. the keeper takes the right spelling (its twin is gone, so refuse_duplicate_route has nothing to match)
update routes k set name = m.to_name from m_merge m
 where k.id = m.keep and k.name = m.from_name and m.to_name <> m.from_name;

-- 3. the rows the source marked for deletion
delete from routes r using m_delete d where r.id = d.id and r.name = d.name;

do $$ declare n int; begin
  if not exists (select 1 from routes where id in (select keep from m_merge)) then return; end if;
  select count(*) into n from routes where id in (select drop_id from m_merge union all select id from m_delete);
  if n > 0 then raise exception '0253: % rows meant to go survived', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep and k.name = m.to_name;
  if n <> 179 then raise exception '0253: % of 179 keepers carry the right name', n; end if;
end $$;

commit;
