-- 0300: the places the source WITHHOLDS for access, withdrawn; South West Overhang back to the source's grade.
--
-- Asked: "do what you recommend based on online research" / "do what you recommend" (2026-10-15), after 0297
-- left these for the owner. Each is a place the source keeps out of view on purpose:
--   Washington's closed crags, filed under initials ("2C (Placeholder)", "ZZ Holding Spot for Temporarily
--   Closed Areas", "SG (Placeholder)"); the Rumney Pound's boulders (private and town land, closed by the owner
--   since 2020; the source keeps them only "for history ... Don't climb here"); Bunyan Mountain, Monson MA
--   ("please respect the landowner's request to not use the area"); a Maine spire on hotel land named in disguise.
-- Every deleted row is kept whole in scripts/data/closed-places-rollback.json, to restore if access reopens.
-- Kept: "Pound (closed), The" (the source's public page for it), and Pickledish (shown by the source with a
-- closure banner, not withheld).
-- South West Overhang: V3-4 came from a copy filed on the wrong boulder (0297 merged it); the source grades the
-- one problem V1+. The keep-the-higher rule is for old guidebooks graded low, not a misfiled copy's grade.
-- 227 climbs and 43 areas withdrawn.
-- No contribution, log, photo, topo, list or report on any climb this deletes (ABORTS otherwise).
-- Plan: the job's fold18/decide.mjs.

begin;

create temp table m_merge(keep text not null, drop_id text primary key, grade text, grade_num numeric, disc text) on commit drop;
-- (m_merge: none in this plan)

create temp table m_route_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
-- (m_route_rename: none in this plan)

create temp table m_move(id text primary key, from_area text not null, to_area text not null, bypass boolean not null) on commit drop;
-- (m_move: none in this plan)

create temp table m_reparent(id text primary key, from_area text not null, to_area text not null) on commit drop;
-- (m_reparent: none in this plan)

create temp table m_drop_area(id text primary key, into_area text not null, ord int not null) on commit drop;
insert into m_drop_area values
  ('wa_2c_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 0),
  ('wa_ar_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 1),
  ('wa_bb_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 2),
  ('wa_bp_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 3),
  ('wa_by_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 4),
  ('wa_circle_of_circles', 'wa_zz_holding_spot_for_temporarily_closed_areas', 5),
  ('wa_ec_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 6),
  ('wa_ef_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 7),
  ('wa_g_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 8),
  ('wa_gb_s_f_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 9),
  ('wa_gw_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 10),
  ('wa_mini_mart', 'wa_zz_holding_spot_for_temporarily_closed_areas', 11),
  ('wa_moose', 'wa_zz_holding_spot_for_temporarily_closed_areas', 12),
  ('wa_mt_crags_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 13),
  ('wa_rc_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 14),
  ('wa_rs_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 15),
  ('wa_sd_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 16),
  ('wa_suc_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 17),
  ('wa_to_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 18),
  ('wa_tt_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 19),
  ('wa_zz_holding_spot_for_temporarily_closed_areas', 'wa_southeast_corner', 20),
  ('wa_sg_placeholder', 'wa_bridge_creek_area', 21),
  ('nh_ancients_the', 'nh_saved_pound_info', 22),
  ('nh_axis_boulder', 'nh_saved_pound_info', 23),
  ('nh_barn_door_boulder', 'nh_saved_pound_info', 24),
  ('nh_edcl_boulder', 'nh_saved_pound_info', 25),
  ('nh_hill_side', 'nh_saved_pound_info', 26),
  ('nh_munchkin_land', 'nh_saved_pound_info', 27),
  ('nh_pound_crack_boulder', 'nh_saved_pound_info', 28),
  ('nh_prow_wow_boulder', 'nh_saved_pound_info', 29),
  ('nh_ship_s_prow_boulder', 'nh_saved_pound_info', 30),
  ('nh_skip_and_sandy_boulder', 'nh_saved_pound_info', 31),
  ('nh_smoke_and_mirrors_boulder', 'nh_saved_pound_info', 32),
  ('nh_stone_wall_boulder', 'nh_saved_pound_info', 33),
  ('nh_saved_pound_info', 'nh_zztemp_holding', 34),
  ('nh_zztemp_holding', 'new_hampshire', 35),
  ('ma_main_face_4', 'ma_bunyan_mountain', 36),
  ('ma_upper_left_tier', 'ma_bunyan_mountain', 37),
  ('ma_bunyan_mountain', 'ma_holding_area', 38),
  ('ma_bunyan_mountain_south_face', 'ma_holding_area', 39),
  ('ma_holding_area', 'ma_eastern_ma', 40),
  ('me_rockporxxt_harboxxr_hotel', 'me_zzz_area_for_holding_whole_areas', 41),
  ('me_zzz_area_for_holding_whole_areas', 'maine', 42);

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
insert into m_junk values
  ('wa_2c_placeholder_2c_1', 'wa_2c_placeholder', '2C #1'),
  ('wa_2c_placeholder_2c_10', 'wa_2c_placeholder', '2C #10'),
  ('wa_2c_placeholder_2c_11', 'wa_2c_placeholder', '2C #11'),
  ('wa_2c_placeholder_2c_2', 'wa_2c_placeholder', '2C #2'),
  ('wa_2c_placeholder_2c_3', 'wa_2c_placeholder', '2C #3'),
  ('wa_2c_placeholder_2c_4', 'wa_2c_placeholder', '2C #4'),
  ('wa_2c_placeholder_2c_5', 'wa_2c_placeholder', '2C #5'),
  ('wa_2c_placeholder_2c_6', 'wa_2c_placeholder', '2C #6'),
  ('wa_2c_placeholder_2c_7', 'wa_2c_placeholder', '2C #7'),
  ('wa_2c_placeholder_2c_8', 'wa_2c_placeholder', '2C #8'),
  ('wa_2c_placeholder_2c_9', 'wa_2c_placeholder', '2C #9'),
  ('wa_ar_placeholder_ar_1', 'wa_ar_placeholder', 'AR #1'),
  ('wa_ar_placeholder_ar_2', 'wa_ar_placeholder', 'AR #2'),
  ('wa_ar_placeholder_ar_3', 'wa_ar_placeholder', 'AR #3'),
  ('wa_ar_placeholder_ar_4', 'wa_ar_placeholder', 'AR #4'),
  ('wa_bb_placeholder_buy_one_get_one', 'wa_bb_placeholder', 'Buy One Get One'),
  ('wa_bb_placeholder_door_1', 'wa_bb_placeholder', 'Door #1'),
  ('wa_bb_placeholder_everything_must_go', 'wa_bb_placeholder', 'Everything Must Go'),
  ('wa_bb_placeholder_fire_sale', 'wa_bb_placeholder', 'Fire Sale'),
  ('wa_bb_placeholder_five_finger_discount', 'wa_bb_placeholder', 'Five Finger Discount'),
  ('wa_bb_placeholder_swap_meet', 'wa_bb_placeholder', 'Swap Meet'),
  ('wa_bp_placeholder_bp_1', 'wa_bp_placeholder', 'BP #1'),
  ('wa_bp_placeholder_bp_2', 'wa_bp_placeholder', 'BP #2'),
  ('wa_bp_placeholder_bp_3', 'wa_bp_placeholder', 'BP #3'),
  ('wa_bp_placeholder_bp_4', 'wa_bp_placeholder', 'BP #4'),
  ('wa_bp_placeholder_bp_5', 'wa_bp_placeholder', 'BP #5'),
  ('wa_bp_placeholder_bp_6', 'wa_bp_placeholder', 'BP #6'),
  ('wa_bp_placeholder_bp_7', 'wa_bp_placeholder', 'BP #7'),
  ('wa_by_placeholder_by_1', 'wa_by_placeholder', 'BY #1'),
  ('wa_circle_of_circles_coc_left', 'wa_circle_of_circles', 'CoC Left'),
  ('wa_circle_of_circles_coc_middle', 'wa_circle_of_circles', 'CoC Middle'),
  ('wa_circle_of_circles_coc_right', 'wa_circle_of_circles', 'CoC Right'),
  ('wa_ec_placeholder_a_cry_for_elk', 'wa_ec_placeholder', 'A Cry For Elk'),
  ('wa_ec_placeholder_buck_naked_project', 'wa_ec_placeholder', 'Buck Naked [Project]'),
  ('wa_ec_placeholder_finnish_line', 'wa_ec_placeholder', 'Finnish Line'),
  ('wa_ec_placeholder_game_boy', 'wa_ec_placeholder', 'Game Boy'),
  ('wa_ec_placeholder_going_stag', 'wa_ec_placeholder', 'Going Stag'),
  ('wa_ec_placeholder_headbanger_s_ball', 'wa_ec_placeholder', 'Headbanger''s Ball'),
  ('wa_ec_placeholder_herd_immunity', 'wa_ec_placeholder', 'Herd Immunity'),
  ('wa_ec_placeholder_hoof_hearted', 'wa_ec_placeholder', 'Hoof Hearted'),
  ('wa_ec_placeholder_mystery_meat', 'wa_ec_placeholder', 'Mystery Meat'),
  ('wa_ec_placeholder_stag_party', 'wa_ec_placeholder', 'Stag Party'),
  ('wa_ec_placeholder_tartare_for_now', 'wa_ec_placeholder', 'Tartare For Now'),
  ('wa_ef_placeholder_czech_engine_light', 'wa_ef_placeholder', 'Czech Engine Light'),
  ('wa_ef_placeholder_ef_1', 'wa_ef_placeholder', 'EF #1'),
  ('wa_ef_placeholder_ef_2', 'wa_ef_placeholder', 'EF #2'),
  ('wa_ef_placeholder_ef_3', 'wa_ef_placeholder', 'EF #3'),
  ('wa_ef_placeholder_ef_4', 'wa_ef_placeholder', 'EF #4'),
  ('wa_ef_placeholder_ef_5', 'wa_ef_placeholder', 'EF #5'),
  ('wa_ef_placeholder_ef_6', 'wa_ef_placeholder', 'EF #6'),
  ('wa_ef_placeholder_ef_7', 'wa_ef_placeholder', 'EF #7'),
  ('wa_ef_placeholder_ef_8', 'wa_ef_placeholder', 'EF #8'),
  ('wa_g_placeholder_g_1', 'wa_g_placeholder', 'G #1'),
  ('wa_g_placeholder_g_2', 'wa_g_placeholder', 'G #2'),
  ('wa_gb_s_f_placeholder_gbf_3', 'wa_gb_s_f_placeholder', 'GBF #3'),
  ('wa_gb_s_f_placeholder_gbf_4', 'wa_gb_s_f_placeholder', 'GBF #4'),
  ('wa_gb_s_f_placeholder_gbf_5', 'wa_gb_s_f_placeholder', 'GBF #5'),
  ('wa_gb_s_f_placeholder_gbf_6', 'wa_gb_s_f_placeholder', 'GBF #6'),
  ('wa_gb_s_f_placeholder_gbf_7', 'wa_gb_s_f_placeholder', 'GBF #7'),
  ('wa_gw_placeholder_green_beans', 'wa_gw_placeholder', 'Green Beans'),
  ('wa_gw_placeholder_green_day', 'wa_gw_placeholder', 'Green Day'),
  ('wa_gw_placeholder_green_new_deal', 'wa_gw_placeholder', 'Green New Deal'),
  ('wa_gw_placeholder_green_thumb', 'wa_gw_placeholder', 'Green Thumb'),
  ('wa_gw_placeholder_greenback', 'wa_gw_placeholder', 'Greenback'),
  ('wa_gw_placeholder_greenhorn', 'wa_gw_placeholder', 'Greenhorn'),
  ('wa_gw_placeholder_sundial', 'wa_gw_placeholder', 'Sundial'),
  ('wa_gw_placeholder_sundial_direct', 'wa_gw_placeholder', 'Sundial Direct'),
  ('wa_gw_placeholder_tipsy_gypsy', 'wa_gw_placeholder', 'Tipsy Gypsy'),
  ('wa_gw_placeholder_toy_box', 'wa_gw_placeholder', 'Toy Box'),
  ('wa_gw_placeholder_toy_story', 'wa_gw_placeholder', 'Toy Story'),
  ('wa_mini_mart_big_gulp', 'wa_mini_mart', 'Big Gulp'),
  ('wa_mini_mart_corner_store', 'wa_mini_mart', 'Corner Store'),
  ('wa_mini_mart_lamp_food', 'wa_mini_mart', 'Lamp Food'),
  ('wa_moose_moose_left', 'wa_moose', 'Moose Left'),
  ('wa_moose_moose_middle', 'wa_moose', 'Moose Middle'),
  ('wa_mt_crags_placeholder_dialed_in', 'wa_mt_crags_placeholder', 'Dialed In'),
  ('wa_mt_crags_placeholder_final_fist', 'wa_mt_crags_placeholder', 'Final Fist'),
  ('wa_mt_crags_placeholder_split_lip', 'wa_mt_crags_placeholder', 'Split Lip'),
  ('wa_rc_placeholder_5_5_crack', 'wa_rc_placeholder', '5.5 Crack'),
  ('wa_rc_placeholder_5_6_crack_up_top', 'wa_rc_placeholder', '5.6 Crack Up Top'),
  ('wa_rc_placeholder_bump', 'wa_rc_placeholder', 'Bump'),
  ('wa_rs_placeholder_let_it_bleed', 'wa_rs_placeholder', 'Let It Bleed'),
  ('wa_rs_placeholder_pbj_5_10a', 'wa_rs_placeholder', 'PBJ 5.10a'),
  ('wa_rs_placeholder_pbj_5_6', 'wa_rs_placeholder', 'PBJ 5.6(?)'),
  ('wa_rs_placeholder_rs_1', 'wa_rs_placeholder', 'RS #1'),
  ('wa_rs_placeholder_rs_2', 'wa_rs_placeholder', 'RS #2'),
  ('wa_rs_placeholder_rs_3', 'wa_rs_placeholder', 'RS #3'),
  ('wa_rs_placeholder_sticky_fingers', 'wa_rs_placeholder', 'Sticky Fingers'),
  ('wa_sd_placeholder_cloak_dagger', 'wa_sd_placeholder', 'Cloak & Dagger'),
  ('wa_sd_placeholder_sausage_fingers', 'wa_sd_placeholder', 'Sausage Fingers'),
  ('wa_sd_placeholder_sew_it_seams', 'wa_sd_placeholder', 'Sew It Seams'),
  ('wa_suc_placeholder_moss_o_menos', 'wa_suc_placeholder', 'Moss o Menos'),
  ('wa_suc_placeholder_seeing_stars', 'wa_suc_placeholder', 'Seeing Stars'),
  ('wa_suc_placeholder_surf_s_up', 'wa_suc_placeholder', 'Surf''s Up'),
  ('wa_to_placeholder_to_1', 'wa_to_placeholder', 'TO #1'),
  ('wa_to_placeholder_to_2', 'wa_to_placeholder', 'TO #2'),
  ('wa_to_placeholder_to_3', 'wa_to_placeholder', 'TO #3'),
  ('wa_to_placeholder_to_4', 'wa_to_placeholder', 'TO #4'),
  ('wa_to_placeholder_to_5', 'wa_to_placeholder', 'TO #5'),
  ('wa_to_placeholder_to_6', 'wa_to_placeholder', 'TO #6'),
  ('wa_to_placeholder_to_7', 'wa_to_placeholder', 'TO #7'),
  ('wa_to_placeholder_to_8', 'wa_to_placeholder', 'TO #8'),
  ('wa_tt_placeholder_frogger', 'wa_tt_placeholder', 'Frogger'),
  ('wa_tt_placeholder_microdose', 'wa_tt_placeholder', 'Microdose'),
  ('wa_tt_placeholder_tiny_ten', 'wa_tt_placeholder', 'Tiny Ten'),
  ('wa_sg_placeholder_aggro_culture', 'wa_sg_placeholder', 'Aggro Culture'),
  ('wa_sg_placeholder_rabble_rouser', 'wa_sg_placeholder', 'Rabble Rouser'),
  ('wa_sg_placeholder_surly_man', 'wa_sg_placeholder', 'Surly Man'),
  ('nh_a_cheval', 'nh_barn_door_boulder', 'A Cheval'),
  ('nh_ahab_calling', 'nh_barn_door_boulder', 'Ahab Calling'),
  ('nh_axe_wound', 'nh_axis_boulder', 'Axe Wound'),
  ('nh_b_b_b_beginner', 'nh_ship_s_prow_boulder', 'B-B-B-Beginner'),
  ('nh_b_boy_stance', 'nh_pound_crack_boulder', 'B-Boy Stance'),
  ('nh_backstage_passes', 'nh_stone_wall_boulder', 'Backstage Passes'),
  ('nh_bad_ladder', 'nh_barn_door_boulder', 'Bad Ladder'),
  ('nh_bang_boom', 'nh_ship_s_prow_boulder', 'Bang Boom'),
  ('nh_barn_door', 'nh_barn_door_boulder', 'Barn Door'),
  ('nh_barn_door_direct_direct', 'nh_barn_door_boulder', 'Barn Door Direct Direct'),
  ('nh_beware_of_the_blot', 'nh_pound_crack_boulder', 'Beware of the Blot'),
  ('nh_bucket_loader', 'nh_barn_door_boulder', 'Bucket Loader'),
  ('nh_captain_condor', 'nh_barn_door_boulder', 'Captain Condor'),
  ('nh_clam_a_rama', 'nh_axis_boulder', 'Clam-a-Rama'),
  ('nh_closet_braiding_beads', 'nh_stone_wall_boulder', 'Closet Braiding Beads'),
  ('nh_cranium', 'nh_stone_wall_boulder', 'Cranium'),
  ('nh_crimp_ladder', 'nh_barn_door_boulder', 'Crimp Ladder'),
  ('nh_crystal_face', 'nh_edcl_boulder', 'Crystal Face'),
  ('nh_dancing_bears', 'nh_munchkin_land', 'Dancing Bears'),
  ('nh_deacon_variation', 'nh_skip_and_sandy_boulder', 'Deacon Variation'),
  ('nh_dog_tracks', 'nh_barn_door_boulder', 'Dog Tracks'),
  ('nh_dr_doom', 'nh_prow_wow_boulder', 'Dr. Doom'),
  ('nh_easy_rollin', 'nh_barn_door_boulder', 'Easy Rollin'''),
  ('nh_edcl', 'nh_edcl_boulder', 'EDCL'),
  ('nh_empire_of_dirt', 'nh_skip_and_sandy_boulder', 'Empire of Dirt'),
  ('nh_eye_of_the_storm', 'nh_hill_side', 'Eye of the Storm'),
  ('nh_flyboy', 'nh_barn_door_boulder', 'Flyboy'),
  ('nh_front_and_center', 'nh_stone_wall_boulder', 'Front and Center'),
  ('nh_garnet_snatcher', 'nh_edcl_boulder', 'Garnet Snatcher'),
  ('nh_gary_s_fortune', 'nh_munchkin_land', 'Gary''s Fortune'),
  ('nh_gatsby', 'nh_barn_door_boulder', 'Gatsby'),
  ('nh_ginseng_for_genius', 'nh_barn_door_boulder', 'Ginseng for Genius'),
  ('nh_hardman_dentist', 'nh_pound_crack_boulder', 'Hardman Dentist'),
  ('nh_hemlock_crack', 'nh_barn_door_boulder', 'Hemlock Crack'),
  ('nh_high_voltage', 'nh_edcl_boulder', 'High Voltage'),
  ('nh_horse_shoe_squares', 'nh_barn_door_boulder', 'Horse Shoe Squares'),
  ('nh_if_only_i_was_taller', 'nh_axis_boulder', 'If Only I was Taller'),
  ('nh_in_the_fastlane', 'nh_edcl_boulder', 'In The Fastlane'),
  ('nh_katmai_disaster', 'nh_hill_side', 'Katmai Disaster'),
  ('nh_kraken', 'nh_ship_s_prow_boulder', 'Kraken'),
  ('nh_lazy_man_s_dyno', 'nh_barn_door_boulder', 'Lazy Man''s Dyno'),
  ('nh_ledge_line', 'nh_barn_door_boulder', 'Ledge Line'),
  ('nh_limbic', 'nh_pound_crack_boulder', 'Limbic'),
  ('nh_little_boy_stand', 'nh_pound_crack_boulder', 'Little Boy Stand'),
  ('nh_loomit', 'nh_pound_crack_boulder', 'Loomit'),
  ('nh_lost_in_translation', 'nh_barn_door_boulder', 'Lost in Translation'),
  ('nh_minty_floss', 'nh_barn_door_boulder', 'Minty Floss'),
  ('nh_morbid_obesity', 'nh_axis_boulder', 'Morbid Obesity'),
  ('nh_nature_boy', 'nh_ancients_the', 'Nature Boy'),
  ('nh_novocain_stain', 'nh_smoke_and_mirrors_boulder', 'Novocain Stain'),
  ('nh_odd_future', 'nh_pound_crack_boulder', 'Odd Future'),
  ('nh_opie', 'nh_stone_wall_boulder', 'Opie'),
  ('nh_pickles_and_prune_juice', 'nh_pound_crack_boulder', 'Pickles and Prune Juice'),
  ('nh_pine_tree_crack_3', 'nh_barn_door_boulder', 'Pine Tree Crack'),
  ('nh_plaque_face', 'nh_pound_crack_boulder', 'Plaque Face'),
  ('nh_pop_top', 'nh_ship_s_prow_boulder', 'Pop Top'),
  ('nh_port_face', 'nh_ship_s_prow_boulder', 'Port Face'),
  ('nh_pound_back', 'nh_pound_crack_boulder', 'Pound Back'),
  ('nh_pound_back_sds', 'nh_pound_crack_boulder', 'Pound Back SDS'),
  ('nh_pound_crack_closed', 'nh_pound_crack_boulder', 'Pound Crack (Closed)'),
  ('nh_pound_for_pound', 'nh_barn_door_boulder', 'Pound for Pound'),
  ('nh_power_of_one', 'nh_pound_crack_boulder', 'Power of One'),
  ('nh_prow_wow', 'nh_prow_wow_boulder', 'Prow Wow'),
  ('nh_quincy_market', 'nh_stone_wall_boulder', 'Quincy Market'),
  ('nh_randy_moss', 'nh_barn_door_boulder', 'Randy Moss'),
  ('nh_re_fresh', 'nh_stone_wall_boulder', 'Re-Fresh'),
  ('nh_reflection_terminal', 'nh_stone_wall_boulder', 'Reflection Terminal'),
  ('nh_reverse_underdog', 'nh_barn_door_boulder', 'Reverse Underdog'),
  ('nh_savak', 'nh_barn_door_boulder', 'Savak'),
  ('nh_sherman_s_march', 'nh_edcl_boulder', 'Sherman''s March'),
  ('nh_ship_s_prow', 'nh_ship_s_prow_boulder', 'Ship''s Prow'),
  ('nh_short_layback', 'nh_prow_wow_boulder', 'Short Layback'),
  ('nh_skip_and_sandy', 'nh_skip_and_sandy_boulder', 'Skip and Sandy'),
  ('nh_slabmaster', 'nh_barn_door_boulder', 'Slabmaster'),
  ('nh_slippery_corner', 'nh_barn_door_boulder', 'Slippery Corner'),
  ('nh_smoke_and_mirrors', 'nh_smoke_and_mirrors_boulder', 'Smoke and Mirrors'),
  ('nh_spicy_house', 'nh_barn_door_boulder', 'Spicy House'),
  ('nh_standard', 'nh_edcl_boulder', 'Standard'),
  ('nh_starboy', 'nh_barn_door_boulder', 'Starboy'),
  ('nh_stone_market', 'nh_stone_wall_boulder', 'Stone Market'),
  ('nh_stone_wall', 'nh_stone_wall_boulder', 'Stone Wall'),
  ('nh_super_chalk', 'nh_stone_wall_boulder', 'Super Chalk'),
  ('nh_temptation', 'nh_prow_wow_boulder', 'Temptation'),
  ('nh_the_arete_4', 'nh_edcl_boulder', 'The Arete'),
  ('nh_the_barn_ladder', 'nh_barn_door_boulder', 'The Barn Ladder'),
  ('nh_the_birth_of_the_blot', 'nh_pound_crack_boulder', 'The Birth of the Blot'),
  ('nh_the_blot', 'nh_pound_crack_boulder', 'The Blot'),
  ('nh_the_corner_2', 'nh_edcl_boulder', 'The Corner'),
  ('nh_the_devastating_reverend_tom', 'nh_skip_and_sandy_boulder', 'The Devastating Reverend Tom'),
  ('nh_the_flakes', 'nh_edcl_boulder', 'The Flakes'),
  ('nh_the_krystle_method', 'nh_ship_s_prow_boulder', 'The Krystle Method'),
  ('nh_the_little_boy', 'nh_pound_crack_boulder', 'The Little Boy'),
  ('nh_the_meek', 'nh_prow_wow_boulder', 'The Meek'),
  ('nh_the_oracle', 'nh_barn_door_boulder', 'The Oracle'),
  ('nh_the_return_of_the_blot', 'nh_pound_crack_boulder', 'The Return of The Blot'),
  ('nh_the_thwart', 'nh_pound_crack_boulder', 'The Thwart'),
  ('nh_the_whale_s_tail', 'nh_barn_door_boulder', 'The Whale''s Tail'),
  ('nh_thuggish_ancestory', 'nh_ship_s_prow_boulder', 'Thuggish Ancestory'),
  ('nh_tronic', 'nh_edcl_boulder', 'Tronic'),
  ('nh_tweekers', 'nh_skip_and_sandy_boulder', 'Tweekers'),
  ('nh_under_wicked_skies', 'nh_skip_and_sandy_boulder', 'Under Wicked Skies'),
  ('nh_underdog_2', 'nh_barn_door_boulder', 'Underdog'),
  ('nh_west_end', 'nh_pound_crack_boulder', 'West End'),
  ('nh_whale_calling_condor', 'nh_barn_door_boulder', 'Whale Calling Condor'),
  ('nh_where_the_red_fern_grows', 'nh_hill_side', 'Where the Red Fern Grows'),
  ('nh_wicked_deacon', 'nh_skip_and_sandy_boulder', 'Wicked Deacon'),
  ('nh_wicked_traverse', 'nh_stone_wall_boulder', 'Wicked Traverse'),
  ('nh_worse_ladder', 'nh_barn_door_boulder', 'Worse Ladder'),
  ('ma_big_corner', 'ma_main_face_4', 'Big Corner'),
  ('ma_blade_runner_2', 'ma_main_face_4', 'Blade Runner'),
  ('ma_bunyan_crack', 'ma_upper_left_tier', 'Bunyan Crack'),
  ('ma_castor', 'ma_main_face_4', 'Castor'),
  ('ma_crack_in_the_box', 'ma_main_face_4', 'Crack In The Box'),
  ('ma_eyeless_in_gaza', 'ma_main_face_4', 'Eyeless in Gaza'),
  ('ma_left_hook_2', 'ma_upper_left_tier', 'Left Hook'),
  ('ma_main_face_4_power_fingers', 'ma_main_face_4', 'Power Fingers'),
  ('ma_serpent_crack', 'ma_main_face_4', 'Serpent Crack'),
  ('ma_the_blue_ox', 'ma_bunyan_mountain_south_face', 'The Blue Ox'),
  ('me_rockporxxt_harboxxr_hotel_wood_spire', 'me_rockporxxt_harboxxr_hotel', 'Wood Spire');

-- every ancestor of every touched area, read BEFORE anything moves (old and new ancestors both)
-- (each label of an area's path IS an ancestor's id: read off the path, not a self-join on @>, which took ~90 s
--  for 1,063 areas — 0296's first timing)
create temp table m_recount on commit drop as
  select distinct x.id from areas t, unnest(string_to_array(ltree2text(t.path), '.')) as x(id)
   where t.id in ('wa_2c_placeholder', 'wa_zz_holding_spot_for_temporarily_closed_areas', 'wa_ar_placeholder', 'wa_bb_placeholder', 'wa_bp_placeholder', 'wa_by_placeholder', 'wa_circle_of_circles', 'wa_ec_placeholder', 'wa_ef_placeholder', 'wa_g_placeholder', 'wa_gb_s_f_placeholder', 'wa_gw_placeholder', 'wa_mini_mart', 'wa_moose', 'wa_mt_crags_placeholder', 'wa_rc_placeholder', 'wa_rs_placeholder', 'wa_sd_placeholder', 'wa_suc_placeholder', 'wa_to_placeholder', 'wa_tt_placeholder', 'wa_southeast_corner', 'wa_sg_placeholder', 'wa_bridge_creek_area', 'nh_ancients_the', 'nh_saved_pound_info', 'nh_axis_boulder', 'nh_barn_door_boulder', 'nh_edcl_boulder', 'nh_hill_side', 'nh_munchkin_land', 'nh_pound_crack_boulder', 'nh_prow_wow_boulder', 'nh_ship_s_prow_boulder', 'nh_skip_and_sandy_boulder', 'nh_smoke_and_mirrors_boulder', 'nh_stone_wall_boulder', 'nh_zztemp_holding', 'new_hampshire', 'ma_main_face_4', 'ma_bunyan_mountain', 'ma_upper_left_tier', 'ma_holding_area', 'ma_bunyan_mountain_south_face', 'ma_eastern_ma', 'me_rockporxxt_harboxxr_hotel', 'me_zzz_area_for_holding_whole_areas', 'maine');

do $$ declare n int; begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog: nothing to fold.
  select count(*) into n from areas where id in (select id from m_drop_area);
  if n = 0 then raise notice '0300: no catalog, nothing to fold'; return; end if;
  if n <> 43 then raise exception '0300: expected 43 copy areas, found %', n; end if;
  -- the tree must still be the one the plan read
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.from_area;
  if n <> 0 then raise exception '0300: % of 0 climbs are where the plan found them', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep join routes o on o.id = m.drop_id;
  if n <> 0 then raise exception '0300: % of 0 merge pairs still exist', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.from_area;
  if n <> 0 then raise exception '0300: % of 0 sub-areas are where the plan found them', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.from_name;
  if n <> 0 then raise exception '0300: % of 0 renames still carry the planned name', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.from_name;
  if n <> 0 then raise exception '0300: % of 0 climb renames still carry the planned name', n; end if;
  select count(*) into n from areas where id in (select id from m_new_area);
  if n > 0 then raise exception '0300: % of the new areas already exist', n; end if;
  select count(*) into n from m_pin m join areas a on a.id = m.id
   where a.lat is not distinct from m.from_lat and a.lng is not distinct from m.from_lng;
  if n <> 0 then raise exception '0300: % of 0 pins are where the plan read them', n; end if;
  select count(*) into n from m_junk j join routes r on r.id = j.id and r.area_id = j.area_id and r.name = j.name;
  if n <> 227 then raise exception '0300: % of 227 junk rows are where they were read', n; end if;
  select count(*) into n from m_lift l join areas a on a.id = l.id and a.parent_id = l.from_parent where l.id in (select id from m_drop_area);
  if n <> 0 then raise exception '0300: % of 0 placeholders to lift are where the plan read them (and are deleted)', n; end if;
  select count(*) into n from m_retype t join areas a on a.id = t.id and a.area_type = t.from_type;
  if n <> 0 then raise exception '0300: % of 0 areas to retype have the type the plan read', n; end if;
  -- every climb on a copy is accounted for
  select count(*) into n from routes r join m_drop_area d on d.id = r.area_id
   where r.id not in (select id from m_move) and r.id not in (select drop_id from m_merge) and r.id not in (select id from m_junk);
  if n > 0 then raise exception '0300: % climbs on a copy are not in the plan', n; end if;
  select count(*) into n from areas a join m_drop_area d on d.id = a.parent_id
   where a.id not in (select id from m_reparent) and a.id not in (select id from m_drop_area);
  if n > 0 then raise exception '0300: % sub-areas of a copy are not in the plan', n; end if;
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
  if n > 0 then raise exception '0300: % climber rows point at a row this deletes — stop and repoint them', n; end if;
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
  if n > 0 then raise exception '0300: % climber rows still point at a copy', n; end if;
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
  if n > 0 then raise exception '0300: % copy areas were not emptied', n; end if;
  select count(*) into n from routes where id in (select drop_id from m_merge union select id from m_junk);
  if n > 0 then raise exception '0300: % merged or junk climbs survived', n; end if;
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.to_area;
  if n <> 0 then raise exception '0300: % of 0 climbs moved', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.to_name;
  if n <> 0 then raise exception '0300: % of 0 renames landed', n; end if;
  select count(*) into n from m_new_area m join areas a on a.id = m.id and a.parent_id = m.final_parent and a.route_count > 0;
  if n <> 0 then raise exception '0300: % of 0 new areas are in place, holding their climbs', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.to_area;
  if n <> 0 then raise exception '0300: % of 0 sub-areas re-parented', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.to_name;
  if n <> 0 then raise exception '0300: % of 0 climb renames landed', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep where m.grade is not null and (k.grade <> m.grade or k.grade_num is distinct from m.grade_num);
  if n > 0 then raise exception '0300: % merged grades or grade_nums did not land', n; end if;
  select count(*) into n from m_pin m join areas a on a.id = m.id and a.lat = m.lat and a.lng = m.lng and a.coords_approx = m.approx;
  if n <> 0 then raise exception '0300: % of 0 pins landed', n; end if;
  select count(*) into n from m_retype t join areas a on a.id = t.id and a.area_type = t.to_type;
  if n <> 0 then raise exception '0300: % of 0 retypes landed', n; end if;
  -- no area holds climbs AND sub-areas
  select count(*) into n from areas a where a.id in (select id from m_recount)
     and exists (select 1 from routes r where r.area_id = a.id) and exists (select 1 from areas s where s.parent_id = a.id);
  if n > 0 then raise exception '0300: % areas hold climbs and sub-areas', n; end if;
end $$;

-- South West Overhang: the source's grade (V1+), not the misfiled copy's V3-4 that 0297 kept
do $$ declare n int; begin
  if not exists (select 1 from routes where id = 'ny_south_west_overhang') then return; end if;   -- empty preview database
  update routes set grade = 'V1+', grade_num = 1 where id = 'ny_south_west_overhang' and grade = 'V3-4';
  get diagnostics n = row_count;
  if n <> 1 then raise exception '0300: South West Overhang is not at the V3-4 the plan read (% updated)', n; end if;
end $$;

commit;
