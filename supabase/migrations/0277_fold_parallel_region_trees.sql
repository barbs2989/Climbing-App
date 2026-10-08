-- 0277: one place, one area — the parallel REGION trees 0276's sweep could not see.
--
-- 0276 paired same-named areas only inside one level-3 region, so a place imported twice under two
-- top-level regions of a state never met its copy (docs/guards/database-and-history.md). Measured across
-- whole states: 861 more same-named pairs; 337 worth a reader (shared climbs, an empty side, under 3 km)
-- were READ (four readers; every merge call re-read here; the 4 unsure settled from the sheet or left).
-- Nearly every SAME was a second import of a whole region, folded from the top:
--   * California: "Eastern Sierra" (414 climbs, no pins) into "Sierra Eastside" (6,624) — its Bishop,
--     Buttermilks, Pine Creek, Lone Pine, Mammoth, June Lake and Lee Vining copies; "Southern-Western Sierra"
--     (343) into "Western Sierra" (1,499), its highway grouping nodes dissolved so Shuteye Ridge, Fresno
--     Dome, Courtright... meet their twins; Ebbets Pass Highway (4) and Denver South's top-level copies.
--   * Alaska: "South Central Alaska" into "Anchorage & South Central Alaska", and its ice tree (the climbs
--     our ice section held only as EMPTY copies: Valdez, Hunter Creek, Eklutna...) into that section,
--     renamed "... Ice and Alpine"; O'Malley Peak once (the rock copy's pin sat on Ptarmigan Peak).
--   * Yakima ("South-Central & Yakima"), Duluth ("Duluth Area" into "Duluth Area (Rock and Ice)": Casket
--     Quarry's 30 ice climbs into its empty twin's place, North Hartley = Hartley), Bangor, Jemez, Sage
--     Mountain, New River Gorge, Wyoming's Laramie Area copies of Vedauwoo, Curt Gowdy and Snowy Range.
--   * Palo Duro Canyon State Park: the keeper takes its copy's "{PROHIBITED}" — the source's current name,
--     its page warning that climbing is prohibited (as 0276 kept "(CLOSED)" on Everett Ruess).
-- The copies again share few climb NAMES with their keepers (Eastern Sierra 26 of 414): two imports, two
-- halves of one place. Same fold as 0276 (children first, parallel trees last; 19 trees and groups):
--   * 104 climbs merged (17 take a grade: the HIGHER one, or the copy's that only extends the keeper's;
--     grade_num from lib/grade.js); 39 moved; 246 sub-areas re-parented; 156 copies deleted;
--     4 flat copies nested, named for what they hold; 5 areas renamed.
--   * No contribution, log, photo, topo, list or report on any climb this deletes.
-- LEFT, read: every pair read DIFFERENT (generic names in different towns and parks); High Bluffs / (North);
-- Lewis Creek's two Upper Falls; Keystone Canyon's Tunnel Wall rock routes beside the same lines climbed as
-- winter mixed (two climbs, two disciplines); Owens Gorge's and Great Falls Basin's "Black Ice".
-- ABORTS if climber data points at a climb deleted, or if the live tree no longer matches the plan.
-- Plan: the job's fold5/plan.mjs + its verdict files; rollback: scripts/data/region-tree-folds-rollback.json.

begin;

create temp table m_merge(keep text not null, drop_id text primary key, grade text, grade_num numeric, disc text) on commit drop;
insert into m_merge values
  ('ca_hot_springs_hot_spring_into_action', 'ca_kern_canyon_mbc_hot_spring_into_action', 'V1 PG13', 1, null),
  ('wa_the_honeycomb_buttress_honeycombs', 'wa_lava_wall_deadheads_honeycombs', null, null, null),
  ('wa_the_honeycomb_buttress_land_down_under', 'wa_lava_wall_deadheads_land_down_under', '5.11c PG13', 11.75, null),
  ('ak_crankcase_traverse', 'ak_lower_pivot_point_2_crankcase_traverse', '5.11+ V5', 5, null),
  ('ak_dave_s_toe_jam', 'ak_lower_pivot_point_2_dave_s_toe_jam', '5.11 V5', 5, null),
  ('ak_burnt_tree_traverse', 'ak_lower_pivot_point_2_burnt_tree_traverse', null, null, null),
  ('ak_hu', 'ak_lower_pivot_point_2_hu', '5.12d V7', 7, null),
  ('ak_crybaby', 'ak_lower_pivot_point_2_crybaby', null, null, null),
  ('ak_waltzy', 'ak_lower_pivot_point_2_waltzy', null, null, null),
  ('ak_off_ramp', 'ak_lower_pivot_point_2_off_ramp', null, null, null),
  ('ak_pivot_point', 'ak_lower_pivot_point_2_pivot_point', null, null, null),
  ('ak_all_for_naught', 'ak_lower_pivot_point_2_all_for_naught', null, null, null),
  ('ak_grunt_maker', 'ak_lower_pivot_point_2_grunt_maker', null, null, null),
  ('ak_naught_for_all', 'ak_lower_pivot_point_2_naught_for_all', null, null, null),
  ('ak_linear_equation', 'ak_lower_pivot_point_2_linear_equation', null, null, null),
  ('ak_trickster', 'ak_lower_pivot_point_2_trickster', null, null, null),
  ('ak_dangle_whack', 'ak_lower_pivot_point_2_dangle_whack', null, null, null),
  ('ak_sat_nam', 'ak_lower_pivot_point_2_sat_nam', null, null, null),
  ('ak_project_5_14', 'ak_lower_pivot_point_2_project_5_14', null, null, null),
  ('ca_jimmy_walker', 'ca_south_buttress_6_jimmy_walker', '5.7 PG13', 7, null),
  ('ca_walker_texas_ranger', 'ca_south_buttress_6_walker_texas_ranger', '5.8', 8, null),
  ('ca_walker_burger', 'ca_south_buttress_6_walker_burger', null, null, null),
  ('ca_luke_skywalker', 'ca_south_buttress_6_luke_skywalker', '5.10c', 10.75, null),
  ('ca_maggie_walker', 'ca_south_buttress_6_maggie_walker', null, null, null),
  ('ca_spirit_rock_2_whoop_dee_do', 'ca_whoop_dee_do', null, null, null),
  ('ca_spirit_rock_2_whine_and_spirits', 'ca_whine_and_spirits', null, null, null),
  ('ca_spirit_rock_2_high_spirits', 'ca_high_spirits', null, null, null),
  ('ca_spirit_rock_2_staircase_arete', 'ca_staircase_arete', null, null, null),
  ('ca_spirit_rock_2_hocus_pocus', 'ca_hocus_pocus_2', null, null, null),
  ('mn_lucy_s_ladder', 'mn_south_hartley_riverside_2_lucy_s_ladder', null, null, null),
  ('mn_pb_j', 'mn_south_hartley_riverside_2_pb_j', null, null, null),
  ('mn_sassafrass', 'mn_south_hartley_riverside_2_sassafrass', null, null, null),
  ('mn_reveling_the_beauty', 'mn_south_hartley_riverside_2_reveling_the_beauty', '5.8- V0 R', 0, null),
  ('mn_over_the_river_and_through_the_woods', 'mn_south_hartley_riverside_2_over_the_river_and_through_the_woods', null, null, null),
  ('mn_disappointment', 'mn_south_hartley_riverside_2_disappointment', null, null, null),
  ('mn_jinkies', 'mn_south_hartley_riverside_2_jinkies', null, null, null),
  ('mn_moss_man', 'mn_south_hartley_riverside_2_moss_man', null, null, null),
  ('mn_rotten_carcass', 'mn_south_hartley_riverside_2_rotten_carcass', null, null, null),
  ('mn_skeeter_snack', 'mn_south_hartley_riverside_2_skeeter_snack', null, null, null),
  ('mn_gitchigumi_groupie', 'mn_south_hartley_riverside_2_gitchigumi_groupie', null, null, null),
  ('mn_oblivious', 'mn_south_hartley_riverside_2_oblivious', null, null, null),
  ('mn_checkmate', 'mn_south_hartley_riverside_2_checkmate', null, null, null),
  ('wa_the_honeycomb_buttress_the_apiary', 'wa_the_apiary', null, null, null),
  ('wa_the_honeycomb_buttress_anaphylactic_shock', 'wa_anaphylactic_shock', null, null, null),
  ('ak_the_diamond_route', 'ak_upper_long_lake_2_the_diamond_route', null, null, null),
  ('ak_cache_money', 'ak_upper_long_lake_2_cache_money', null, null, null),
  ('ak_step_sister', 'ak_upper_long_lake_2_step_sister', null, null, null),
  ('ak_poser', 'ak_upper_long_lake_2_poser', null, null, null),
  ('ak_cavitation_crack', 'ak_upper_long_lake_2_cavitation_crack', null, null, null),
  ('ak_cavitation', 'ak_upper_long_lake_2_cavitation', null, null, null),
  ('ak_the_thirty_4_and_seven_center_hang', 'ak_upper_long_lake_2_the_thirty_4_and_seven_center_hang', null, null, null),
  ('ak_step_mother', 'ak_upper_long_lake_2_step_mother', null, null, null),
  ('ak_the_thirty_4_and_seven_backside_pimp_and_crimp', 'ak_upper_long_lake_2_the_thirty_4_and_seven_backside_pimp_and_crimp', null, null, null),
  ('ak_lonesome_tears', 'ak_upper_long_lake_2_lonesome_tears', null, null, null),
  ('ak_bear_cave', 'ak_upper_long_lake_2_bear_cave', null, null, null),
  ('ak_loco_cooky', 'ak_upper_long_lake_2_loco_cooky', null, null, null),
  ('ak_denali_hwy', 'ak_upper_long_lake_2_denali_hwy', null, null, null),
  ('ak_cachao', 'ak_upper_long_lake_2_cachao', null, null, null),
  ('ak_sweet_tooth', 'ak_upper_long_lake_2_sweet_tooth', null, null, null),
  ('ak_30_4_year_olds', 'ak_upper_long_lake_2_30_4_year_olds', null, null, null),
  ('ak_30_7_year_olds', 'ak_upper_long_lake_2_30_7_year_olds', null, null, null),
  ('ak_tok_cutoff', 'ak_upper_long_lake_2_tok_cutoff', null, null, null),
  ('ak_backside_grind', 'ak_upper_long_lake_2_backside_grind', null, null, null),
  ('ak_point_hope', 'ak_upper_long_lake_2_point_hope', null, null, null),
  ('wy_aspen_grove_boulders_2_houses_of_the_holy', 'wy_houses_of_the_holy', null, null, null),
  ('wy_aspen_grove_boulders_2_nobody_s_fault_but_mine', 'wy_nobody_s_fault_but_mine', null, null, null),
  ('wy_aspen_grove_boulders_2_wrist_rocket', 'wy_wrist_rocket', null, null, null),
  ('wy_aspen_grove_boulders_2_reservoir_dogs', 'wy_reservoir_dogs', null, null, null),
  ('wy_aspen_grove_boulders_2_aspen_arete', 'wy_aspen_arete', null, null, null),
  ('ca_first_communion', 'ca_dome_of_the_immaculate_conception_aka_notre_dome_2_first_communion', null, null, null),
  ('il_lip_traverse', 'il_oriole_boulder_2_lip_traverse', null, null, null),
  ('il_the_oriole', 'il_oriole_boulder_2_the_oriole', null, null, null),
  ('il_life_on_mars_high_start', 'il_oriole_boulder_2_life_on_mars_high_start', null, null, null),
  ('il_unknown_7', 'il_oriole_boulder_2_unknown', null, null, null),
  ('il_the_gobbler', 'il_oriole_boulder_2_the_gobbler', null, null, null),
  ('il_life_on_mars', 'il_oriole_boulder_2_life_on_mars', null, null, null),
  ('il_chuck_norris', 'il_oriole_boulder_2_chuck_norris', null, null, null),
  ('mn_black_tomahawk', 'mn_split_boulder_2_black_tomahawk', null, null, null),
  ('mn_tric_troc', 'mn_split_boulder_2_tric_troc', null, null, null),
  ('mn_pyramids_of_you', 'mn_piedmont_boulders_2_pyramids_of_you', null, null, null),
  ('mn_escaping_from_jail', 'mn_piedmont_boulders_2_escaping_from_jail', null, null, null),
  ('mn_warchild_pulled_one_off', 'mn_piedmont_boulders_2_warchild_pulled_one_off', null, null, null),
  ('mn_shasky_right', 'mn_piedmont_boulders_2_shasky_right', null, null, null),
  ('mn_ditch', 'mn_piedmont_boulders_2_ditch', null, null, null),
  ('mn_tim_shasky', 'mn_piedmont_boulders_2_tim_shasky', 'V2', 2, null),
  ('mn_leesa_lives', 'mn_piedmont_boulders_2_leesa_lives', null, null, null),
  ('mn_flying_direct', 'mn_piedmont_boulders_2_flying_direct', null, null, null),
  ('mn_oh_goddamn', 'mn_piedmont_boulders_2_oh_goddamn', 'V2', 2, null),
  ('mn_tribute_to_the_turd', 'mn_piedmont_boulders_2_tribute_to_the_turd', null, null, null),
  ('mn_arete_problem', 'mn_piedmont_boulders_2_arete_problem', null, null, null),
  ('mn_leap_of_faith', 'mn_piedmont_boulders_2_leap_of_faith', null, null, null),
  ('mn_the_flying_wiese', 'mn_piedmont_boulders_2_the_flying_wiese', null, null, null),
  ('mn_jebus_jive', 'mn_piedmont_boulders_2_jebus_jive', 'V5', 5, null),
  ('ak_west_ridge_3', 'ak_mount_yukla_2_west_ridge', '5.8 Mod. Snow', 8, null),
  ('mn_nex_cado', 'mn_north_hartley_nex_cado', 'V5 R', 5, null),
  ('mn_of_mice_and_men', 'mn_north_hartley_of_mice_and_men', null, null, null),
  ('mn_deer_run', 'mn_north_hartley_deer_run', 'V-easy PG13', -1, null),
  ('mn_ditry_harry', 'mn_north_hartley_ditry_harry', 'V-easy PG13', -1, null),
  ('mn_dudeus_maximus', 'mn_north_hartley_dudeus_maximus', null, null, null),
  ('mn_the_high_road', 'mn_north_hartley_the_high_road', null, null, null),
  ('mn_black_from_the_back', 'mn_north_hartley_black_from_the_back', null, null, null),
  ('mn_ghetto_coolade', 'mn_north_hartley_ghetto_coolade', null, null, null),
  ('mn_aiden_s_great_escape', 'mn_north_hartley_aiden_s_great_escape', null, null, null),
  ('mn_easy_on_the_eyes', 'mn_north_hartley_easy_on_the_eyes', '5.12a V4 PG13', 4, null);

create temp table m_route_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
-- (m_route_rename: none in this plan)

create temp table m_move(id text primary key, from_area text not null, to_area text not null, bypass boolean not null) on commit drop;
insert into m_move values
  ('ak_lower_pivot_point_2_jay_rowe_mixed_traverse', 'ak_lower_pivot_point_2', 'ak_lower_pivot_point', false),
  ('nh_enchanted_forest_autumn_enchantress', 'nh_enchanted_forest', 'nh_enchanted_forest_sub_area', false),
  ('nh_enchanted_forest_forbidden_forest_aka_the_pickle', 'nh_enchanted_forest', 'nh_enchanted_forest_sub_area', false),
  ('wy_the_mouth_of_the_clark_s_fork_powder_puff', 'wy_the_mouth_of_the_clark_s_fork', 'wy_mouth_the', false),
  ('wy_the_mouth_of_the_clark_s_fork_the_east_face', 'wy_the_mouth_of_the_clark_s_fork', 'wy_mouth_the', false),
  ('wy_the_mouth_of_the_clark_s_fork_almost_forever', 'wy_the_mouth_of_the_clark_s_fork', 'wy_mouth_the', false),
  ('wy_the_mouth_of_the_clark_s_fork_high_plains_hoedown', 'wy_the_mouth_of_the_clark_s_fork', 'wy_mouth_the', false),
  ('wy_the_mouth_of_the_clark_s_fork_milky_way', 'wy_the_mouth_of_the_clark_s_fork', 'wy_mouth_the', false),
  ('il_oriole_boulder_2_growman_s_dihedral', 'il_oriole_boulder_2', 'il_oriole_boulder', false),
  ('il_oriole_boulder_2_jason_and_jeremy_s', 'il_oriole_boulder_2', 'il_oriole_boulder', false),
  ('il_oriole_boulder_2_stone_temple_pilots', 'il_oriole_boulder_2', 'il_oriole_boulder', false),
  ('il_oriole_boulder_2_kung_fu_hustle', 'il_oriole_boulder_2', 'il_oriole_boulder', false),
  ('mn_contivance', 'mn_stillwater_ice_stillwater', 'mn_stillwater_ice', false),
  ('mo_left_side_of_cave_heel_above_the_land', 'mo_left_side_of_cave', 'mo_dragon_s_lair_the', false),
  ('mo_right_side_of_cave_the_herbivore_draco', 'mo_right_side_of_cave', 'mo_dragon_s_lair_the', false),
  ('mo_right_side_of_cave_fus_ro_dah', 'mo_right_side_of_cave', 'mo_dragon_s_lair_the', false),
  ('mn_piedmont_boulders_2_ptsd', 'mn_piedmont_boulders_2', 'mn_piedmont_boulders', false),
  ('mn_louisville_swamp_boulder_easy_bee', 'mn_louisville_swamp_boulder', 'mn_louisville_swamp_boulder_s_w_twin_cities_metro_near_sha', false),
  ('mn_louisville_swamp_boulder_the_rail', 'mn_louisville_swamp_boulder', 'mn_louisville_swamp_boulder_s_w_twin_cities_metro_near_sha', false),
  ('mn_louisville_swamp_boulder_swamp_thing', 'mn_louisville_swamp_boulder', 'mn_louisville_swamp_boulder_s_w_twin_cities_metro_near_sha', false),
  ('mn_louisville_swamp_boulder_arise_from_the_swamp_direct', 'mn_louisville_swamp_boulder', 'mn_louisville_swamp_boulder_s_w_twin_cities_metro_near_sha', false),
  ('mn_louisville_swamp_boulder_west_unnamed_best_coast', 'mn_louisville_swamp_boulder', 'mn_louisville_swamp_boulder_s_w_twin_cities_metro_near_sha', false),
  ('mn_louisville_swamp_boulder_chinook_west_face_unnamed', 'mn_louisville_swamp_boulder', 'mn_louisville_swamp_boulder_s_w_twin_cities_metro_near_sha', false),
  ('mn_louisville_swamp_boulder_undertime_slopper', 'mn_louisville_swamp_boulder', 'mn_louisville_swamp_boulder_s_w_twin_cities_metro_near_sha', false),
  ('mn_louisville_swamp_boulder_hydrophyte_north_face_unnamed_tnf', 'mn_louisville_swamp_boulder', 'mn_louisville_swamp_boulder_s_w_twin_cities_metro_near_sha', false),
  ('mn_louisville_swamp_boulder_cave_all_day', 'mn_louisville_swamp_boulder', 'mn_louisville_swamp_boulder_s_w_twin_cities_metro_near_sha', false),
  ('mn_louisville_swamp_boulder_west_side_traverse_low', 'mn_louisville_swamp_boulder', 'mn_louisville_swamp_boulder_s_w_twin_cities_metro_near_sha', false),
  ('mn_louisville_swamp_boulder_even_more_pain', 'mn_louisville_swamp_boulder', 'mn_louisville_swamp_boulder_s_w_twin_cities_metro_near_sha', false),
  ('ak_caribou_creek_2_night_moves', 'ak_caribou_creek_2', 'ak_caribou_creek', false),
  ('ak_caribou_creek_2_kid_s_corner', 'ak_caribou_creek_2', 'ak_caribou_creek', false),
  ('ak_caribou_creek_2_the_abomination_of_sublimation', 'ak_caribou_creek_2', 'ak_caribou_creek', false),
  ('ak_caribou_creek_2_std', 'ak_caribou_creek_2', 'ak_caribou_creek', false),
  ('ak_caribou_creek_2_china_wear', 'ak_caribou_creek_2', 'ak_caribou_creek', false),
  ('ak_caribou_creek_2_kantellia_falls', 'ak_caribou_creek_2', 'ak_caribou_creek', false),
  ('ak_caribou_creek_2_robopick', 'ak_caribou_creek_2', 'ak_caribou_creek', false),
  ('ak_caribou_creek_2_double_take', 'ak_caribou_creek_2', 'ak_caribou_creek', false),
  ('ak_caribou_creek_2_landslide', 'ak_caribou_creek_2', 'ak_caribou_creek', false),
  ('ak_mount_yukla_2_gank_d_and_slayed', 'ak_mount_yukla_2', 'ak_mount_yukla', false),
  ('ak_nw_ridge', 'ak_o_malley_peak_2', 'ak_o_malley_peak_3', false);

create temp table m_reparent(id text primary key, from_area text not null, to_area text not null) on commit drop;
insert into m_reparent values
  ('ca_amphitheater_3', 'ca_1_high_eagle', 'ca_high_eagle'),
  ('ca_upper_tier_7', 'ca_light_colored_cliffs_2', 'ca_light_colored_cliffs'),
  ('ak_27_mile_pk_2', 'ak_thompson_pass_2', 'ak_thompson_pass'),
  ('ak_3_pigs_2', 'ak_thompson_pass_2', 'ak_thompson_pass'),
  ('ca_alabama_dome_east_side', 'ca_alabama_hills_south_2', 'ca_alabama_hills_south'),
  ('ca_area_of_light', 'ca_alabama_hills_south_2', 'ca_alabama_hills_south'),
  ('ca_arizona_tower', 'ca_alabama_hills_south_2', 'ca_alabama_hills_south'),
  ('ca_beyond_the_gate', 'ca_alabama_hills_south_2', 'ca_alabama_hills_south'),
  ('ca_diaz_dome', 'ca_alabama_hills_south_2', 'ca_alabama_hills_south'),
  ('ca_happy_hour_boulder', 'ca_alabama_hills_south_2', 'ca_alabama_hills_south'),
  ('ca_rattlesnake_mountain', 'ca_alabama_hills_south_2', 'ca_alabama_hills_south'),
  ('ca_the_castle', 'ca_alabama_hills_south_2', 'ca_alabama_hills_south'),
  ('ca_the_dixie_tower', 'ca_alabama_hills_south_2', 'ca_alabama_hills_south'),
  ('ca_turtle_tank_formation', 'ca_alabama_hills_south_2', 'ca_alabama_hills_south'),
  ('ca_jabba_2', 'ca_buttermilk_crags_2', 'ca_buttermilk_crags'),
  ('ca_candlelight_wall', 'ca_whitney_portal', 'ca_candlelight_wall_2'),
  ('ca_ukraine_dome', 'ca_fresno_dome_2', 'ca_fresno_dome'),
  ('ca_light_colored_cliffs', 'ca_narrows_right', 'ca_narrows_right_2'),
  ('ca_camp_edison_bouldering', 'ca_shaver_lake_bouldering_2', 'ca_shaver_lake_bouldering'),
  ('ca_dorabelle_picnic_area_2', 'ca_shaver_lake_bouldering_2', 'ca_shaver_lake_bouldering'),
  ('ca_george_lake_nw', 'ca_shaver_lake_bouldering_2', 'ca_shaver_lake_bouldering'),
  ('ca_snow_plow_boulders', 'ca_shaver_lake_bouldering_2', 'ca_shaver_lake_bouldering'),
  ('ca_aces_boulder', 'ca_spicer_reservoir_2', 'ca_spicer_reservoir'),
  ('ca_on_the_water', 'ca_spicer_reservoir_2', 'ca_spicer_reservoir'),
  ('ca_spicer_sport_crag', 'ca_spicer_reservoir_2', 'ca_spicer_reservoir'),
  ('wy_owsley_wall', 'wy_upper_blair_2', 'wy_upper_blair'),
  ('ak_amphitheater_the', 'ak_hunter_creek', 'ak_hunter_creek_2'),
  ('wa_seduction_zone_the', 'wa_tectonic_lounge_the', 'wa_the_tectonic_lounge'),
  ('ak_montana_peak', 'ak_mint_area_2', 'ak_mint_area'),
  ('ak_eye_of_sauron', 'ak_reed_lakes_bouldering_and_climbing_2', 'ak_reed_lakes_bouldering_and_climbing'),
  ('ak_good_hope_towers', 'ak_reed_lakes_bouldering_and_climbing_2', 'ak_reed_lakes_bouldering_and_climbing'),
  ('ak_shwall', 'ak_valdez', 'ak_valdez_2'),
  ('ak_thompson_pass', 'ak_valdez', 'ak_valdez_2'),
  ('ca_tuttle_creek_area', 'ca_alabama_hills_2', 'ca_alabama_hills'),
  ('ca_hobart_creek', 'ca_bear_valley_2', 'ca_bear_valley'),
  ('ca_sapps_hill', 'ca_bear_valley_2', 'ca_bear_valley'),
  ('ca_tamarack_boulders', 'ca_bear_valley_2', 'ca_bear_valley'),
  ('ca_blackcap_basin_area', 'ca_courtright_reservoir_2', 'ca_courtright_reservoir'),
  ('ca_courtright_reservoir_area_bouldering', 'ca_courtright_reservoir_2', 'ca_courtright_reservoir'),
  ('ca_eagle_peak_4', 'ca_courtright_reservoir_2', 'ca_courtright_reservoir'),
  ('ca_dana_plateau', 'ca_lee_vining_canyon_tioga_road', 'ca_dana_plateau_2'),
  ('ca_the_banded_cliffs', 'ca_domeland_wilderness_2', 'ca_domeland_wilderness'),
  ('ca_white_dome', 'ca_domeland_wilderness_2', 'ca_domeland_wilderness'),
  ('ca_chouinards_2', 'ca_lee_vining_ice_and_mixed_2', 'ca_lee_vining_ice_and_mixed'),
  ('ca_heel_toe_wall_2', 'ca_lee_vining_ice_and_mixed_2', 'ca_lee_vining_ice_and_mixed'),
  ('ca_main_wall_26', 'ca_lee_vining_ice_and_mixed_2', 'ca_lee_vining_ice_and_mixed'),
  ('ca_narrows_left_2', 'ca_lee_vining_ice_and_mixed_2', 'ca_lee_vining_ice_and_mixed'),
  ('ca_narrows_right_2', 'ca_lee_vining_ice_and_mixed_2', 'ca_lee_vining_ice_and_mixed'),
  ('ca_angel_falls', 'ca_lewis_creek_2', 'ca_lewis_creek'),
  ('ca_camp_convict', 'ca_lower_kern_river_canyon_2', 'ca_lower_kern_river_canyon'),
  ('ca_coalescence_boulders', 'ca_lower_kern_river_canyon_2', 'ca_lower_kern_river_canyon'),
  ('ca_combat_boulders', 'ca_lower_kern_river_canyon_2', 'ca_lower_kern_river_canyon'),
  ('ca_hot_springs', 'ca_lower_kern_river_canyon_2', 'ca_lower_kern_river_canyon'),
  ('ca_witchking_boulder', 'ca_lower_kern_river_canyon_2', 'ca_lower_kern_river_canyon'),
  ('ca_wushu_sector', 'ca_lower_kern_river_canyon_2', 'ca_lower_kern_river_canyon'),
  ('ca_garlic_dome', 'ca_patterson_bluff_2', 'ca_patterson_bluff'),
  ('ca_patterson_right', 'ca_patterson_bluff_2', 'ca_patterson_bluff'),
  ('ca_brownstone_mine', 'ca_pine_creek_canyon_2', 'ca_pine_creek_canyon'),
  ('ca_passover_wall', 'ca_pine_creek_canyon_2', 'ca_pine_creek_canyon'),
  ('ca_pine_creek_mine_wall', 'ca_pine_creek_canyon_2', 'ca_pine_creek_canyon'),
  ('ca_quartz_bandito_buttress', 'ca_pine_creek_canyon_2', 'ca_pine_creek_canyon'),
  ('ca_sound_of_silence_wall', 'ca_pine_creek_canyon_2', 'ca_pine_creek_canyon'),
  ('ca_the_sticks_lower_tier', 'ca_pine_creek_canyon_2', 'ca_pine_creek_canyon'),
  ('ca_the_sticks_upper_tier', 'ca_pine_creek_canyon_2', 'ca_pine_creek_canyon'),
  ('ca_crank_face', 'ca_rock_creek_2', 'ca_rock_creek'),
  ('ca_the_back_stage', 'ca_rock_creek_2', 'ca_rock_creek'),
  ('ca_hungry_packer_lake_boulders', 'ca_sabrina_basin_bouldering_2', 'ca_sabrina_basin_bouldering'),
  ('ca_lake_side_rock', 'ca_sabrina_basin_bouldering_2', 'ca_sabrina_basin_bouldering'),
  ('ca_granite_mountain_area', 'ca_sagehen_summit_area_2', 'ca_sagehen_summit_area'),
  ('ca_round_mountain_area_owens_gorge_rd', 'ca_sherwin_plateau_2', 'ca_sherwin_plateau'),
  ('ca_paradise_dome', 'ca_a_chilkoot_lake_area', 'ca_chilkoot_lake'),
  ('ca_secret_wall', 'ca_a_chilkoot_lake_area', 'ca_chilkoot_lake'),
  ('ca_trailside_wall', 'ca_a_chilkoot_lake_area', 'ca_chilkoot_lake'),
  ('ca_unapologetic_statement_dome', 'ca_a_lost_eagle_area', 'ca_lost_eagle'),
  ('ca_classic_rock_crag', 'ca_silver_lake_3', 'ca_silver_lake'),
  ('ca_western_wall', 'ca_silver_lake_3', 'ca_silver_lake'),
  ('ca_aid_boulder_2', 'ca_squarenail_2', 'ca_squarenail'),
  ('ca_fish_slough_boulders', 'ca_volcanic_tablelands_happy_sad_boulders_2', 'ca_volcanic_tablelands_happy_sad_boulders'),
  ('ca_1_whitney_portal_bouldering', 'ca_whitney_portal_2', 'ca_whitney_portal'),
  ('ca_candlelight_wall_2', 'ca_whitney_portal_2', 'ca_whitney_portal'),
  ('ca_family_campground', 'ca_whitney_portal_2', 'ca_whitney_portal_family_campground'),
  ('ca_solstice_celebration_house_of_the_rising_sun', 'ca_whitney_portal_2', 'ca_whitney_portal'),
  ('ca_camp_6_wall', 'ca_wishon_reservoir_2', 'ca_wishon_reservoir'),
  ('ca_campsites_12_15', 'ca_wishon_reservoir_2', 'ca_wishon_reservoir'),
  ('ca_falcon_breast_rock', 'ca_wishon_reservoir_2', 'ca_wishon_reservoir'),
  ('co_the_boundary_area', 'co_castlewood_canyon_sp_2', 'co_castlewood_canyon_sp'),
  ('co_turkey_trot', 'co_castlewood_canyon_sp_2', 'co_castlewood_canyon_sp'),
  ('mn_bogberry_spur', 'mn_tomahawk_road_2', 'mn_tomahawk_road'),
  ('mn_gatekeeper_s_nightmare', 'mn_tomahawk_road_2', 'mn_tomahawk_road'),
  ('wa_bumping_boulder', 'wa_tieton_river_2', 'wa_tieton_river'),
  ('wa_constellation_boulders', 'wa_tieton_river_2', 'wa_tieton_river'),
  ('wa_dirty_boulders', 'wa_tieton_river_2', 'wa_tieton_river'),
  ('wa_lily_pad_wall', 'wa_tieton_river_2', 'wa_tieton_river'),
  ('wa_riverside_boulder_2', 'wa_tieton_river_2', 'wa_tieton_river'),
  ('wa_sleepy_hollow_boulders', 'wa_tieton_river_2', 'wa_tieton_river'),
  ('wa_socket_boulder', 'wa_tieton_river_2', 'wa_tieton_river'),
  ('wa_the_pluto_boulder', 'wa_tieton_river_2', 'wa_tieton_river'),
  ('wa_the_tectonic_lounge', 'wa_tieton_river_2', 'wa_tieton_river'),
  ('wa_wildcat_creek', 'wa_tieton_river_2', 'wa_tieton_river'),
  ('wy_aspen_grove_boulders_2', 'wy_curt_gowdy_state_park_2', 'wy_curt_gowdy_state_park'),
  ('md_dam_the', 'md_prettyboy_reservoir', 'md_prettyboy_reservoir_2'),
  ('md_fin_the_2', 'md_prettyboy_reservoir', 'md_prettyboy_reservoir_2'),
  ('nh_greeley_ponds', 'nh_wm_waterville_valley', 'nh_6_greeley_ponds_mad_river_notch_2'),
  ('ak_new_harbor', 'ak_valdez_area_rock_2', 'ak_valdez_area_rock'),
  ('ca_cowboy_cliffs', 'ca_bishop_area_2', 'ca_bishop_area'),
  ('ca_keough_hot_springs_area', 'ca_bishop_area_2', 'ca_bishop_area'),
  ('ca_wilkerson', 'ca_bishop_area_2', 'ca_bishop_area'),
  ('ca_milky_way_meadows', 'ca_eastern_hills_2', 'ca_eastern_hills'),
  ('ca_natural_bridge_bouldering', 'ca_ebbets_pass_highway_4_2', 'ca_ebbets_pass_highway_4'),
  ('ca_power_line_boulders', 'ca_ebbets_pass_highway_4_2', 'ca_ebbets_pass_highway_4'),
  ('ca_raymond_peak', 'ca_ebbets_pass_highway_4_2', 'ca_ebbets_pass_highway_4'),
  ('ca_union_reservoir', 'ca_ebbets_pass_highway_4_2', 'ca_ebbets_pass_highway_4'),
  ('ca_hawk_rocks', 'ca_june_lake_area_2', 'ca_june_lake_area'),
  ('ca_horsetail_falls_2', 'ca_june_lake_area_2', 'ca_june_lake_area'),
  ('ca_roadside_ice_2', 'ca_june_lake_area_2', 'ca_june_lake_area'),
  ('ca_tatum_falls_2', 'ca_june_lake_area_2', 'ca_june_lake_area'),
  ('ca_triple_cracks', 'ca_june_lake_area_2', 'ca_june_lake_area'),
  ('ca_big_bender_crag', 'ca_lee_vining_canyon_tioga_road_2', 'ca_lee_vining_canyon_tioga_road'),
  ('ca_dana_plateau_2', 'ca_lee_vining_canyon_tioga_road_2', 'ca_lee_vining_canyon_tioga_road'),
  ('ca_grungy_wonderland', 'ca_lee_vining_canyon_tioga_road_2', 'ca_lee_vining_canyon_tioga_road'),
  ('ca_mount_dana_2', 'ca_lee_vining_canyon_tioga_road_2', 'ca_lee_vining_canyon_tioga_road'),
  ('ca_sap_cliff', 'ca_lee_vining_canyon_tioga_road_2', 'ca_lee_vining_canyon_tioga_road'),
  ('ca_tioga_dome', 'ca_lee_vining_canyon_tioga_road_2', 'ca_lee_vining_canyon_tioga_road'),
  ('ca_hogback_canyon', 'ca_lone_pine_area_2', 'ca_lone_pine_area'),
  ('ca_horseshoe_meadows', 'ca_lone_pine_area_2', 'ca_lone_pine_area'),
  ('ca_the_haystack', 'ca_lone_pine_area_2', 'ca_lone_pine_area'),
  ('ca_deer_lakes_basin', 'ca_mammoth_lakes_area_2', 'ca_mammoth_lakes_area'),
  ('ca_gladys_lake_2', 'ca_mammoth_lakes_area_2', 'ca_mammoth_lakes_area'),
  ('ca_hot_creek_geological_site', 'ca_mammoth_lakes_area_2', 'ca_mammoth_lakes_area'),
  ('ca_minaret_summit_loop_boulder', 'ca_mammoth_lakes_area_2', 'ca_mammoth_lakes_area'),
  ('ca_mountain_view_wall', 'ca_mammoth_lakes_area_2', 'ca_mammoth_lakes_area'),
  ('ca_selden_pass', 'ca_mammoth_lakes_area_2', 'ca_mammoth_lakes_area'),
  ('ca_sherwin_rock_chute', 'ca_mammoth_lakes_area_2', 'ca_mammoth_lakes_area'),
  ('ca_sky_perch', 'ca_mammoth_lakes_area_2', 'ca_mammoth_lakes_area'),
  ('ca_splitter_pillar', 'ca_mammoth_lakes_area_2', 'ca_mammoth_lakes_area'),
  ('ca_gem_stones', 'ca_marble_mountain_2', 'ca_marble_mountain'),
  ('ca_pct_rock', 'ca_marble_mountain_2', 'ca_marble_mountain'),
  ('co_i_can_t_believe_it_s_not_the_buttermilks', 'co_denver_south_2', 'co_denver_south'),
  ('co_lost_canyon_ranch', 'co_denver_south_2', 'co_denver_south'),
  ('co_parker_rec_center', 'co_denver_south_2', 'co_denver_south'),
  ('co_the_litterbox', 'co_denver_south_2', 'co_denver_south'),
  ('co_village_greens_park_boulders', 'co_denver_south_2', 'co_denver_south'),
  ('co_wildcat_mountain', 'co_denver_south_2', 'co_denver_south'),
  ('id_riggins_bouldering_and_dws', 'id_riggins_2', 'id_riggins'),
  ('me_mt_waldo_quarry_ice_mixed', 'me_prospect_mountain_2', 'me_prospect_mountain'),
  ('me_uppers_2', 'me_prospect_mountain_2', 'me_prospect_mountain'),
  ('mn_derby_wall', 'mn_ely_s_peak_2', 'mn_ely_s_peak_bouldering'),
  ('mn_ely_s_peak_tunnel_drytooling', 'mn_ely_s_peak_2', 'mn_ely_s_peak_bouldering'),
  ('mn_nordeast_bluff', 'mn_ely_s_peak_2', 'mn_ely_s_peak_bouldering'),
  ('mn_pine_slabs', 'mn_ely_s_peak_2', 'mn_ely_s_peak_bouldering'),
  ('mn_tunnel_bluff', 'mn_ely_s_peak_2', 'mn_ely_s_peak_bouldering'),
  ('mn_wiese_s_spire_area', 'mn_ely_s_peak_2', 'mn_ely_s_peak_bouldering'),
  ('nh_russell_bouldering', 'nh_russell_crags_in_merriam_woods', 'nh_russell_crags'),
  ('nh_the_imaginarium', 'nh_russell_crags_in_merriam_woods', 'nh_russell_crags'),
  ('wv_brooklyn_campground_boulder', 'wv_new_river_gorge_proper_2', 'wv_new_river_gorge_proper'),
  ('wv_treasure_planet', 'wv_new_river_gorge_proper_2', 'wv_new_river_gorge_proper'),
  ('wv_upper_teay_s_boulders', 'wv_new_river_gorge_proper_2', 'wv_new_river_gorge_proper'),
  ('wy_routt', 'wy_snowy_range_2', 'wy_snowy_range'),
  ('wy_stateline', 'wy_snowy_range_2', 'wy_snowy_range'),
  ('wy_cch_dome', 'wy_vedauwoo_2', 'wy_vedauwoo'),
  ('wy_death_crotch', 'wy_vedauwoo_2', 'wy_vedauwoo'),
  ('wy_entrance_boulders_north', 'wy_vedauwoo_2', 'wy_vedauwoo'),
  ('wy_jungle_51', 'wy_vedauwoo_2', 'wy_vedauwoo'),
  ('wy_mrc_complex_ice_mixed_climbing_2', 'wy_vedauwoo_2', 'wy_vedauwoo'),
  ('wy_slacker_rocks', 'wy_vedauwoo_2', 'wy_vedauwoo'),
  ('wy_south_branch_crow_creek', 'wy_vedauwoo_2', 'wy_vedauwoo'),
  ('wy_tash_s_lookout', 'wy_vedauwoo_2', 'wy_vedauwoo'),
  ('wy_the_drug_den_aka_upper_green_canyon', 'wy_vedauwoo_2', 'wy_vedauwoo'),
  ('wy_the_quarry', 'wy_vedauwoo_2', 'wy_vedauwoo'),
  ('wy_vedauwoo_bouldering', 'wy_vedauwoo_2', 'wy_vedauwoo'),
  ('mn_casket_quarry_ice_mixed', 'mn_duluth_area', 'mn_duluth_area_rock_and_ice'),
  ('mn_chester_park', 'mn_duluth_area', 'mn_duluth_area_rock_and_ice'),
  ('mn_ice_other_than_casket_2', 'mn_duluth_area', 'mn_duluth_area_rock_and_ice'),
  ('mn_middle_earth', 'mn_duluth_area', 'mn_duluth_area_rock_and_ice'),
  ('mn_upstream_boulders', 'mn_duluth_area', 'mn_duluth_area_rock_and_ice'),
  ('mn_zoo_boulders', 'mn_duluth_area', 'mn_duluth_area_rock_and_ice'),
  ('ny_poison_ivy_wall', 'ny_west_point_closed_illegal', 'ny_west_point_cadets_only_closed_to_civilians'),
  ('ca_lundy_canyon_2', 'ca_northern_area', 'ca_sierra_eastside'),
  ('ca_mono_diggins', 'ca_northern_area', 'ca_sierra_eastside'),
  ('ca_great_falls_basin', 'ca_southern_area', 'ca_sierra_eastside'),
  ('ca_trona_pinnacles', 'ca_southern_area', 'ca_sierra_eastside'),
  ('ca_revis_mountain', 'ca_hwy_41_fresno_dome_shuteye_ridge', 'ca_western_sierra'),
  ('ca_whisky_falls', 'ca_hwy_41_fresno_dome_shuteye_ridge', 'ca_western_sierra'),
  ('ca_shaver_lake_area', 'ca_hwy_168_tollhouse_shaver_lake_courtright', 'ca_western_sierra'),
  ('ca_bat_rock', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_bohna_peak', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_brewery_the', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_burnt_granola', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_camp_3_campground_boulders', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_gleason_rock', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_keyesville', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_lamont_pinnacles', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_neanderthal_wall', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_parker_bluff', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_roadkill_crag', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_sawmill_road', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_schaffer_buttress_aka_the_wall_of_silence', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_scodie_spire', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_sherman_pass_road', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_split_mountain_2', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_the_fortress_5', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ca_the_rincon', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra'),
  ('ak_beer_climbs_2', 'ak_south_central_alaska_ice_and_alpine', 'ak_anchorage_south_central_alaska_ice'),
  ('ak_eklutna_canyon_2', 'ak_south_central_alaska_ice_and_alpine', 'ak_anchorage_south_central_alaska_ice'),
  ('ak_hunter_creek_2', 'ak_south_central_alaska_ice_and_alpine', 'ak_anchorage_south_central_alaska_ice'),
  ('ak_knik_gorge_2', 'ak_south_central_alaska_ice_and_alpine', 'ak_anchorage_south_central_alaska_ice'),
  ('ak_matanuska_glacier_2', 'ak_south_central_alaska_ice_and_alpine', 'ak_anchorage_south_central_alaska_ice'),
  ('ak_metal_creek_carpenter_creek_friday_creek_2', 'ak_south_central_alaska_ice_and_alpine', 'ak_anchorage_south_central_alaska_ice'),
  ('ak_nantina_point_2', 'ak_south_central_alaska_ice_and_alpine', 'ak_anchorage_south_central_alaska_ice'),
  ('ak_north_fork_eagle_river_ice_and_mixed', 'ak_south_central_alaska_ice_and_alpine', 'ak_anchorage_south_central_alaska_ice'),
  ('ak_o_malley_peak_3', 'ak_south_central_alaska_ice_and_alpine', 'ak_anchorage_south_central_alaska_ice'),
  ('ak_ptarmigan_peak_ice_and_winter_alpine', 'ak_south_central_alaska_ice_and_alpine', 'ak_anchorage_south_central_alaska_ice'),
  ('ak_seward_highway_ice_mixed', 'ak_south_central_alaska_ice_and_alpine', 'ak_anchorage_south_central_alaska_ice'),
  ('ak_skwetna', 'ak_south_central_alaska_ice_and_alpine', 'ak_anchorage_south_central_alaska_ice'),
  ('ak_south_yuyanq_ch_ex', 'ak_south_central_alaska_ice_and_alpine', 'ak_anchorage_south_central_alaska_ice'),
  ('ak_valdez_2', 'ak_south_central_alaska_ice_and_alpine', 'ak_anchorage_south_central_alaska_ice'),
  ('ak_mat_su_valley_bouldering_and_rock', 'ak_south_central_alaska', 'ak_anchorage_south_central_alaska'),
  ('ak_hot_dog_wall', 'ak_seward_highway_3', 'ak_seward_highway_2'),
  ('wa_mount_aix', 'wa_south_central_yakima', 'wa_southeast_cascades_yakima'),
  ('wa_the_motherlode', 'wa_strobach_mountain_ice', 'wa_strobach_mountain'),
  ('wa_the_hillside', 'wa_south_central_yakima', 'wa_southeast_cascades_yakima'),
  ('wa_umtanum_creek_falls_ice', 'wa_south_central_yakima', 'wa_southeast_cascades_yakima'),
  ('wa_white_pass_ice', 'wa_south_central_yakima', 'wa_southeast_cascades_yakima'),
  ('me_bangor_area_buildering', 'me_h_greater_bangor', 'me_h_bangor_area'),
  ('me_bangor_bouldering', 'me_h_greater_bangor', 'me_h_bangor_area'),
  ('me_prospect_mountain', 'me_h_greater_bangor', 'me_h_bangor_area'),
  ('nm_arrakis', 'nm_jemez_area', 'nm_jemez_mountains_and_jemez_valley'),
  ('nm_church_falls_2', 'nm_jemez_area', 'nm_jemez_mountains_and_jemez_valley'),
  ('nm_fs_376', 'nm_jemez_area', 'nm_jemez_mountains_and_jemez_valley'),
  ('nm_san_antonio_campground', 'nm_jemez_area', 'nm_jemez_mountains_and_jemez_valley'),
  ('tx_cactus_valley', 'tx_palo_duro_canyon_state_park_prohibited', 'tx_palo_duro_canyon_state_park'),
  ('tx_pdc_ice_2', 'tx_palo_duro_canyon_state_park_prohibited', 'tx_palo_duro_canyon_state_park'),
  ('tx_rock_garden_trail', 'tx_palo_duro_canyon_state_park_prohibited', 'tx_palo_duro_canyon_state_park'),
  ('tx_rylander_fortress_cliff_trail', 'tx_palo_duro_canyon_state_park_prohibited', 'tx_palo_duro_canyon_state_park'),
  ('mo_dragon_s_lair_the', 'mo_em_sage_mountain_recreation_area_missouri', 'mo_em_sage_mountain_recreation_area'),
  ('mo_moss_fairy_landing', 'mo_em_sage_mountain_recreation_area_missouri', 'mo_em_sage_mountain_recreation_area'),
  ('mo_passage_the', 'mo_em_sage_mountain_recreation_area_missouri', 'mo_em_sage_mountain_recreation_area'),
  ('mo_rabit_ear_boulder', 'mo_em_sage_mountain_recreation_area_missouri', 'mo_em_sage_mountain_recreation_area'),
  ('mo_rasberry_ridge', 'mo_em_sage_mountain_recreation_area_missouri', 'mo_em_sage_mountain_recreation_area'),
  ('mo_rune_boulder_aka_bandit_cove', 'mo_em_sage_mountain_recreation_area_missouri', 'mo_em_sage_mountain_recreation_area'),
  ('mo_side_mission_boulder', 'mo_em_sage_mountain_recreation_area_missouri', 'mo_em_sage_mountain_recreation_area'),
  ('mo_spice_boulder', 'mo_em_sage_mountain_recreation_area_missouri', 'mo_em_sage_mountain_recreation_area'),
  ('mo_village_the', 'mo_em_sage_mountain_recreation_area_missouri', 'mo_em_sage_mountain_recreation_area'),
  ('mo_watchman_s_cliff', 'mo_em_sage_mountain_recreation_area_missouri', 'mo_em_sage_mountain_recreation_area'),
  ('mo_wizard_s_pointe', 'mo_em_sage_mountain_recreation_area_missouri', 'mo_em_sage_mountain_recreation_area'),
  ('wv_kanawha_falls', 'wv_the_new_river_gorge_region', 'wv_new_river_gorge_the');

create temp table m_drop_area(id text primary key, into_area text not null, ord int not null) on commit drop;
insert into m_drop_area values
  ('ca_upper_tier', 'ca_upper_tier_7', 0),
  ('ak_27_mile_pk', 'ak_27_mile_pk_2', 1),
  ('ak_3_pigs', 'ak_3_pigs_2', 2),
  ('ca_dark_colored_cliffs', 'ca_dark_colored_cliffs_2', 3),
  ('ca_1_high_eagle', 'ca_high_eagle', 4),
  ('ca_light_colored_cliffs_2', 'ca_light_colored_cliffs', 5),
  ('ak_lower_pivot_point_2', 'ak_lower_pivot_point', 6),
  ('ca_south_buttress_6', 'ca_south_buttress', 7),
  ('ca_spirit_rock', 'ca_spirit_rock_2', 8),
  ('mn_south_hartley_riverside_2', 'mn_south_hartley_riverside', 9),
  ('wa_honeycomb_buttress_the', 'wa_the_honeycomb_buttress', 10),
  ('ak_bear_creek', 'ak_bear_creek_2', 11),
  ('ak_east_fork', 'ak_east_fork_2', 12),
  ('ak_heiden_canyon_zone', 'ak_heiden_canyon_zone_2', 13),
  ('ak_hole_in_the_wall', 'ak_hole_in_the_wall_2', 14),
  ('ak_ice_cream_cone_mountain_skybuster_peak', 'ak_ice_cream_cone_mountain_skybuster_peak_2', 15),
  ('ak_keystone_canyon_tunnel_wall', 'ak_keystone_canyon_tunnel_wall_2', 16),
  ('ak_lower_hunter', 'ak_lower_hunter_2', 17),
  ('ak_mineral_creek_ice_climbs', 'ak_mineral_creek_ice_climbs_2', 18),
  ('ak_sheep_creek', 'ak_sheep_creek_2', 19),
  ('ak_snowslide_gulch', 'ak_snowslide_gulch_2', 20),
  ('ak_solomon_gulch', 'ak_solomon_gulch_2', 21),
  ('ak_west_fork', 'ak_west_fork_2', 22),
  ('ca_chouinards', 'ca_chouinards_2', 23),
  ('ca_heel_toe_wall', 'ca_heel_toe_wall_2', 24),
  ('ca_lundy_canyon_ice', 'ca_lundy_canyon_ice_2', 25),
  ('ca_main_wall_4', 'ca_main_wall_26', 26),
  ('ca_narrows_left', 'ca_narrows_left_2', 27),
  ('ca_rancheria_falls_ice_climb', 'ca_rancheria_falls_ice_climb_2', 28),
  ('ca_roadside_ice_center', 'ca_roadside_ice_center_2', 29),
  ('ca_roadside_ice_left_side_main_flow', 'ca_roadside_ice_left_side_main_flow_2', 30),
  ('ca_c_shuteye_creek_area', 'ca_shuteye_creek_area', 31),
  ('ak_thompson_pass_2', 'ak_thompson_pass', 32),
  ('ca_alabama_hills_south_2', 'ca_alabama_hills_south', 33),
  ('ca_buttermilk_crags_2', 'ca_buttermilk_crags', 34),
  ('ca_fresno_dome_2', 'ca_fresno_dome', 35),
  ('ca_narrows_right', 'ca_narrows_right_2', 36),
  ('ca_shaver_lake_bouldering_2', 'ca_shaver_lake_bouldering', 37),
  ('ca_spicer_reservoir_2', 'ca_spicer_reservoir', 38),
  ('wy_upper_blair_2', 'wy_upper_blair', 39),
  ('ak_upper_long_lake_2', 'ak_upper_long_lake', 40),
  ('ak_long_lake', 'ak_long_lake_revised', 41),
  ('ak_pivot_point_2', 'ak_pivot_point', 42),
  ('ca_walker_river_canyon_2', 'ca_walker_river_canyon', 43),
  ('wy_aspen_grove_boulders', 'wy_aspen_grove_boulders_2', 44),
  ('ak_beer_climbs', 'ak_beer_climbs_2', 45),
  ('ak_eklutna_canyon', 'ak_eklutna_canyon_2', 46),
  ('ak_hunter_creek', 'ak_hunter_creek_2', 47),
  ('ak_knik_gorge', 'ak_knik_gorge_2', 48),
  ('ak_matanuska_glacier', 'ak_matanuska_glacier_2', 49),
  ('ak_metal_creek_carpenter_creek_friday_creek', 'ak_metal_creek_carpenter_creek_friday_creek_2', 50),
  ('ak_nantina_point', 'ak_nantina_point_2', 51),
  ('ak_o_malley_peak', 'ak_o_malley_peak_3', 52),
  ('ca_gladys_lake', 'ca_gladys_lake_2', 53),
  ('ca_horsetail_falls', 'ca_horsetail_falls_2', 54),
  ('ca_lundy_canyon', 'ca_lundy_canyon_2', 55),
  ('ca_mount_dana', 'ca_mount_dana_2', 56),
  ('ca_roadside_ice', 'ca_roadside_ice_2', 57),
  ('ca_tatum_falls', 'ca_tatum_falls_2', 58),
  ('me_uppers', 'me_uppers_2', 59),
  ('wa_motherlode_the', 'wa_the_motherlode', 60),
  ('wa_tectonic_lounge_the', 'wa_the_tectonic_lounge', 61),
  ('wy_mrc_complex_ice_mixed_climbing', 'wy_mrc_complex_ice_mixed_climbing_2', 62),
  ('nh_enchanted_forest', 'nh_enchanted_forest_sub_area', 63),
  ('wy_the_mouth_of_the_clark_s_fork', 'wy_mouth_the', 64),
  ('ak_mint_area_2', 'ak_mint_area', 65),
  ('ak_reed_lakes_bouldering_and_climbing_2', 'ak_reed_lakes_bouldering_and_climbing', 66),
  ('ak_keystone_canyon', 'ak_keystone_canyon_2', 67),
  ('ak_valdez', 'ak_valdez_2', 68),
  ('ca_alabama_hills_2', 'ca_alabama_hills', 69),
  ('ca_bear_valley_2', 'ca_bear_valley', 70),
  ('ca_buttermilk_country_2', 'ca_buttermilk_country', 71),
  ('ca_dome_of_the_immaculate_conception_aka_notre_dome_2', 'ca_dome_of_the_immaculate_conception_aka_notre_dome', 72),
  ('ca_courtright_reservoir_2', 'ca_courtright_reservoir', 73),
  ('ca_domeland_wilderness_2', 'ca_domeland_wilderness', 74),
  ('ca_fresno_dome_wamello_area_2', 'ca_fresno_dome_wamello_area', 75),
  ('ca_lee_vining_ice_and_mixed_2', 'ca_lee_vining_ice_and_mixed', 76),
  ('ca_lewis_creek_2', 'ca_lewis_creek', 77),
  ('ca_lower_kern_river_canyon_2', 'ca_lower_kern_river_canyon', 78),
  ('ca_patterson_bluff_2', 'ca_patterson_bluff', 79),
  ('ca_pine_creek_canyon_2', 'ca_pine_creek_canyon', 80),
  ('ca_rock_creek_2', 'ca_rock_creek', 81),
  ('ca_sabrina_basin_bouldering_2', 'ca_sabrina_basin_bouldering', 82),
  ('ca_sagehen_summit_area_2', 'ca_sagehen_summit_area', 83),
  ('ca_sherwin_plateau_2', 'ca_sherwin_plateau', 84),
  ('ca_a_chilkoot_lake_area', 'ca_chilkoot_lake', 85),
  ('ca_a_high_eagle_and_queen_s_throne_area', 'ca_shuteye_ridge', 86),
  ('ca_a_lost_eagle_area', 'ca_lost_eagle', 87),
  ('ca_shuteye_ridge_2', 'ca_shuteye_ridge', 88),
  ('ca_silver_lake_3', 'ca_silver_lake', 89),
  ('ca_squarenail_2', 'ca_squarenail', 90),
  ('ca_volcanic_tablelands_happy_sad_boulders_2', 'ca_volcanic_tablelands_happy_sad_boulders', 91),
  ('ca_whitney_portal_2', 'ca_whitney_portal', 92),
  ('ca_wishon_reservoir_2', 'ca_wishon_reservoir', 93),
  ('co_castlewood_canyon_sp_2', 'co_castlewood_canyon_sp', 94),
  ('wy_blair_overview_2', 'wy_blair_overview', 95),
  ('il_oriole_boulder_2', 'il_oriole_boulder', 96),
  ('il_the_roost', 'il_roost_the', 97),
  ('mn_split_boulder_2', 'mn_split_boulder', 98),
  ('mn_tomahawk_road_2', 'mn_tomahawk_road', 99),
  ('wa_tieton_river_2', 'wa_tieton_river', 100),
  ('wy_curt_gowdy_state_park_2', 'wy_curt_gowdy_state_park', 101),
  ('md_prettyboy_reservoir', 'md_prettyboy_reservoir_2', 102),
  ('mn_ice_other_than_casket', 'mn_ice_other_than_casket_2', 103),
  ('mn_silver_creek_tunnel_ice', 'mn_silver_creek_tunnel_ice_2', 104),
  ('nm_church_falls', 'nm_church_falls_2', 105),
  ('nm_questa_ice_climbing', 'nm_questa_ice_climbing_2', 106),
  ('tx_pdc_ice', 'tx_pdc_ice_2', 107),
  ('mn_stillwater_ice_stillwater', 'mn_stillwater_ice', 108),
  ('ak_hatcher_pass_2', 'ak_hatcher_pass', 109),
  ('ak_valdez_area_rock_2', 'ak_valdez_area_rock', 110),
  ('ca_bishop_area_2', 'ca_bishop_area', 111),
  ('ca_eastern_hills_2', 'ca_eastern_hills', 112),
  ('ca_ebbets_pass_highway_4_2', 'ca_ebbets_pass_highway_4', 113),
  ('ca_june_lake_area_2', 'ca_june_lake_area', 114),
  ('ca_lee_vining_canyon_tioga_road_2', 'ca_lee_vining_canyon_tioga_road', 115),
  ('ca_lone_pine_area_2', 'ca_lone_pine_area', 116),
  ('ca_mammoth_lakes_area_2', 'ca_mammoth_lakes_area', 117),
  ('ca_marble_mountain_2', 'ca_marble_mountain', 118),
  ('co_denver_south_2', 'co_denver_south', 119),
  ('id_riggins_2', 'id_riggins', 120),
  ('me_prospect_mountain_2', 'me_prospect_mountain', 121),
  ('mn_ely_s_peak_2', 'mn_ely_s_peak_bouldering', 122),
  ('mo_left_side_of_cave', 'mo_dragon_s_lair_the', 123),
  ('mo_right_side_of_cave', 'mo_dragon_s_lair_the', 124),
  ('mo_dragon_s_lair_cave', 'mo_dragon_s_lair_the', 125),
  ('nh_russell_crags_in_merriam_woods', 'nh_russell_crags', 126),
  ('wv_new_river_gorge_proper_2', 'wv_new_river_gorge_proper', 127),
  ('wy_snowy_range_2', 'wy_snowy_range', 128),
  ('wy_vedauwoo_2', 'wy_vedauwoo', 129),
  ('mn_piedmont_boulders_2', 'mn_piedmont_boulders', 130),
  ('mn_duluth_area', 'mn_duluth_area_rock_and_ice', 131),
  ('ny_west_point_closed_illegal', 'ny_west_point_cadets_only_closed_to_civilians', 132),
  ('mn_louisville_swamp_boulder', 'mn_louisville_swamp_boulder_s_w_twin_cities_metro_near_sha', 133),
  ('ca_northern_area', 'ca_sierra_eastside', 134),
  ('ca_southern_area', 'ca_sierra_eastside', 135),
  ('ca_hwy_41_fresno_dome_shuteye_ridge', 'ca_western_sierra', 136),
  ('ca_hwy_168_tollhouse_shaver_lake_courtright', 'ca_western_sierra', 137),
  ('ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ca_western_sierra', 138),
  ('ak_caribou_creek_2', 'ak_caribou_creek', 139),
  ('ak_mount_yukla_2', 'ak_mount_yukla', 140),
  ('ak_south_central_alaska_ice_and_alpine', 'ak_anchorage_south_central_alaska_ice', 141),
  ('mn_casket_quarry_ice', 'mn_casket_quarry_ice_mixed', 142),
  ('mn_north_hartley', 'mn_hartley', 143),
  ('ak_o_malley_peak_2', 'ak_o_malley_peak_3', 144),
  ('ca_eastern_sierra', 'ca_sierra_eastside', 145),
  ('ca_southern_western_sierra', 'ca_western_sierra', 146),
  ('ak_seward_highway_3', 'ak_seward_highway_2', 147),
  ('ak_south_central_alaska', 'ak_anchorage_south_central_alaska', 148),
  ('wa_strobach_mountain_ice', 'wa_strobach_mountain', 149),
  ('wa_south_central_yakima', 'wa_southeast_cascades_yakima', 150),
  ('me_h_greater_bangor', 'me_h_bangor_area', 151),
  ('nm_jemez_area', 'nm_jemez_mountains_and_jemez_valley', 152),
  ('tx_palo_duro_canyon_state_park_prohibited', 'tx_palo_duro_canyon_state_park', 153),
  ('mo_em_sage_mountain_recreation_area_missouri', 'mo_em_sage_mountain_recreation_area', 154),
  ('wv_the_new_river_gorge_region', 'wv_new_river_gorge_the', 155);

create temp table m_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
insert into m_rename values
  ('ca_candlelight_wall', 'Candlelight Wall', 'Candlelight Wall Routes'),
  ('ca_dana_plateau', 'Dana Plateau', 'Dana Plateau Routes'),
  ('nh_greeley_ponds', 'Greeley Ponds', 'Greeley Ponds Routes'),
  ('tx_palo_duro_canyon_state_park', 'Palo Duro Canyon State Park', 'Palo Duro Canyon State Park {PROHIBITED}'),
  ('ak_anchorage_south_central_alaska_ice', 'Anchorage & South Central Alaska Ice', 'Anchorage & South Central Alaska Ice and Alpine');

create temp table m_new_area(id text primary key, name text not null, parent_id text not null, final_parent text not null, area_type text, region text, lat double precision, lng double precision) on commit drop;
-- (m_new_area: none in this plan)

create temp table m_junk(id text primary key, area_id text not null, name text not null) on commit drop;
-- (m_junk: none in this plan)

-- every ancestor of every touched area, read BEFORE anything moves (old and new ancestors both)
create temp table m_recount on commit drop as
  select distinct a.id from areas a join areas t on a.path @> t.path
   where t.id in ('ca_upper_tier', 'ca_upper_tier_7', 'ak_27_mile_pk', 'ak_27_mile_pk_2', 'ak_3_pigs', 'ak_3_pigs_2', 'ca_dark_colored_cliffs', 'ca_dark_colored_cliffs_2', 'ca_1_high_eagle', 'ca_high_eagle', 'ca_light_colored_cliffs_2', 'ca_light_colored_cliffs', 'ak_lower_pivot_point_2', 'ak_lower_pivot_point', 'ca_south_buttress_6', 'ca_south_buttress', 'ca_spirit_rock', 'ca_spirit_rock_2', 'mn_south_hartley_riverside_2', 'mn_south_hartley_riverside', 'wa_honeycomb_buttress_the', 'wa_the_honeycomb_buttress', 'ak_bear_creek', 'ak_bear_creek_2', 'ak_east_fork', 'ak_east_fork_2', 'ak_heiden_canyon_zone', 'ak_heiden_canyon_zone_2', 'ak_hole_in_the_wall', 'ak_hole_in_the_wall_2', 'ak_ice_cream_cone_mountain_skybuster_peak', 'ak_ice_cream_cone_mountain_skybuster_peak_2', 'ak_keystone_canyon_tunnel_wall', 'ak_keystone_canyon_tunnel_wall_2', 'ak_lower_hunter', 'ak_lower_hunter_2', 'ak_mineral_creek_ice_climbs', 'ak_mineral_creek_ice_climbs_2', 'ak_sheep_creek', 'ak_sheep_creek_2', 'ak_snowslide_gulch', 'ak_snowslide_gulch_2', 'ak_solomon_gulch', 'ak_solomon_gulch_2', 'ak_west_fork', 'ak_west_fork_2', 'ca_chouinards', 'ca_chouinards_2', 'ca_heel_toe_wall', 'ca_heel_toe_wall_2', 'ca_lundy_canyon_ice', 'ca_lundy_canyon_ice_2', 'ca_main_wall_4', 'ca_main_wall_26', 'ca_narrows_left', 'ca_narrows_left_2', 'ca_rancheria_falls_ice_climb', 'ca_rancheria_falls_ice_climb_2', 'ca_roadside_ice_center', 'ca_roadside_ice_center_2', 'ca_roadside_ice_left_side_main_flow', 'ca_roadside_ice_left_side_main_flow_2', 'ca_c_shuteye_creek_area', 'ca_shuteye_creek_area', 'ak_thompson_pass_2', 'ak_thompson_pass', 'ca_alabama_hills_south_2', 'ca_alabama_hills_south', 'ca_buttermilk_crags_2', 'ca_buttermilk_crags', 'ca_fresno_dome_2', 'ca_fresno_dome', 'ca_narrows_right', 'ca_narrows_right_2', 'ca_shaver_lake_bouldering_2', 'ca_shaver_lake_bouldering', 'ca_spicer_reservoir_2', 'ca_spicer_reservoir', 'wy_upper_blair_2', 'wy_upper_blair', 'ak_upper_long_lake_2', 'ak_upper_long_lake', 'ak_long_lake', 'ak_long_lake_revised', 'ak_pivot_point_2', 'ak_pivot_point', 'ca_walker_river_canyon_2', 'ca_walker_river_canyon', 'wy_aspen_grove_boulders', 'wy_aspen_grove_boulders_2', 'ak_beer_climbs', 'ak_beer_climbs_2', 'ak_eklutna_canyon', 'ak_eklutna_canyon_2', 'ak_hunter_creek', 'ak_hunter_creek_2', 'ak_knik_gorge', 'ak_knik_gorge_2', 'ak_matanuska_glacier', 'ak_matanuska_glacier_2', 'ak_metal_creek_carpenter_creek_friday_creek', 'ak_metal_creek_carpenter_creek_friday_creek_2', 'ak_nantina_point', 'ak_nantina_point_2', 'ak_o_malley_peak', 'ak_o_malley_peak_3', 'ca_gladys_lake', 'ca_gladys_lake_2', 'ca_horsetail_falls', 'ca_horsetail_falls_2', 'ca_lundy_canyon', 'ca_lundy_canyon_2', 'ca_mount_dana', 'ca_mount_dana_2', 'ca_roadside_ice', 'ca_roadside_ice_2', 'ca_tatum_falls', 'ca_tatum_falls_2', 'me_uppers', 'me_uppers_2', 'wa_motherlode_the', 'wa_the_motherlode', 'wa_tectonic_lounge_the', 'wa_the_tectonic_lounge', 'wy_mrc_complex_ice_mixed_climbing', 'wy_mrc_complex_ice_mixed_climbing_2', 'nh_enchanted_forest', 'nh_enchanted_forest_sub_area', 'wy_the_mouth_of_the_clark_s_fork', 'wy_mouth_the', 'ak_mint_area_2', 'ak_mint_area', 'ak_reed_lakes_bouldering_and_climbing_2', 'ak_reed_lakes_bouldering_and_climbing', 'ak_keystone_canyon', 'ak_keystone_canyon_2', 'ak_valdez', 'ak_valdez_2', 'ca_alabama_hills_2', 'ca_alabama_hills', 'ca_bear_valley_2', 'ca_bear_valley', 'ca_buttermilk_country_2', 'ca_buttermilk_country', 'ca_dome_of_the_immaculate_conception_aka_notre_dome_2', 'ca_dome_of_the_immaculate_conception_aka_notre_dome', 'ca_courtright_reservoir_2', 'ca_courtright_reservoir', 'ca_domeland_wilderness_2', 'ca_domeland_wilderness', 'ca_fresno_dome_wamello_area_2', 'ca_fresno_dome_wamello_area', 'ca_lee_vining_ice_and_mixed_2', 'ca_lee_vining_ice_and_mixed', 'ca_lewis_creek_2', 'ca_lewis_creek', 'ca_lower_kern_river_canyon_2', 'ca_lower_kern_river_canyon', 'ca_patterson_bluff_2', 'ca_patterson_bluff', 'ca_pine_creek_canyon_2', 'ca_pine_creek_canyon', 'ca_rock_creek_2', 'ca_rock_creek', 'ca_sabrina_basin_bouldering_2', 'ca_sabrina_basin_bouldering', 'ca_sagehen_summit_area_2', 'ca_sagehen_summit_area', 'ca_sherwin_plateau_2', 'ca_sherwin_plateau', 'ca_a_chilkoot_lake_area', 'ca_chilkoot_lake', 'ca_a_high_eagle_and_queen_s_throne_area', 'ca_shuteye_ridge', 'ca_a_lost_eagle_area', 'ca_lost_eagle', 'ca_shuteye_ridge_2', 'ca_silver_lake_3', 'ca_silver_lake', 'ca_squarenail_2', 'ca_squarenail', 'ca_volcanic_tablelands_happy_sad_boulders_2', 'ca_volcanic_tablelands_happy_sad_boulders', 'ca_whitney_portal_2', 'ca_whitney_portal', 'ca_wishon_reservoir_2', 'ca_wishon_reservoir', 'co_castlewood_canyon_sp_2', 'co_castlewood_canyon_sp', 'wy_blair_overview_2', 'wy_blair_overview', 'il_oriole_boulder_2', 'il_oriole_boulder', 'il_the_roost', 'il_roost_the', 'mn_split_boulder_2', 'mn_split_boulder', 'mn_tomahawk_road_2', 'mn_tomahawk_road', 'wa_tieton_river_2', 'wa_tieton_river', 'wy_curt_gowdy_state_park_2', 'wy_curt_gowdy_state_park', 'md_prettyboy_reservoir', 'md_prettyboy_reservoir_2', 'mn_ice_other_than_casket', 'mn_ice_other_than_casket_2', 'mn_silver_creek_tunnel_ice', 'mn_silver_creek_tunnel_ice_2', 'nm_church_falls', 'nm_church_falls_2', 'nm_questa_ice_climbing', 'nm_questa_ice_climbing_2', 'tx_pdc_ice', 'tx_pdc_ice_2', 'mn_stillwater_ice_stillwater', 'mn_stillwater_ice', 'ak_hatcher_pass_2', 'ak_hatcher_pass', 'ak_valdez_area_rock_2', 'ak_valdez_area_rock', 'ca_bishop_area_2', 'ca_bishop_area', 'ca_eastern_hills_2', 'ca_eastern_hills', 'ca_ebbets_pass_highway_4_2', 'ca_ebbets_pass_highway_4', 'ca_june_lake_area_2', 'ca_june_lake_area', 'ca_lee_vining_canyon_tioga_road_2', 'ca_lee_vining_canyon_tioga_road', 'ca_lone_pine_area_2', 'ca_lone_pine_area', 'ca_mammoth_lakes_area_2', 'ca_mammoth_lakes_area', 'ca_marble_mountain_2', 'ca_marble_mountain', 'co_denver_south_2', 'co_denver_south', 'id_riggins_2', 'id_riggins', 'me_prospect_mountain_2', 'me_prospect_mountain', 'mn_ely_s_peak_2', 'mn_ely_s_peak_bouldering', 'mo_left_side_of_cave', 'mo_dragon_s_lair_the', 'mo_right_side_of_cave', 'mo_dragon_s_lair_cave', 'nh_russell_crags_in_merriam_woods', 'nh_russell_crags', 'wv_new_river_gorge_proper_2', 'wv_new_river_gorge_proper', 'wy_snowy_range_2', 'wy_snowy_range', 'wy_vedauwoo_2', 'wy_vedauwoo', 'mn_piedmont_boulders_2', 'mn_piedmont_boulders', 'mn_duluth_area', 'mn_duluth_area_rock_and_ice', 'ny_west_point_closed_illegal', 'ny_west_point_cadets_only_closed_to_civilians', 'mn_louisville_swamp_boulder', 'mn_louisville_swamp_boulder_s_w_twin_cities_metro_near_sha', 'ca_northern_area', 'ca_sierra_eastside', 'ca_southern_area', 'ca_hwy_41_fresno_dome_shuteye_ridge', 'ca_western_sierra', 'ca_hwy_168_tollhouse_shaver_lake_courtright', 'ca_southern_sierra_the_needles_kern_river_domelands_etc', 'ak_caribou_creek_2', 'ak_caribou_creek', 'ak_mount_yukla_2', 'ak_mount_yukla', 'ak_south_central_alaska_ice_and_alpine', 'ak_anchorage_south_central_alaska_ice', 'mn_casket_quarry_ice', 'mn_casket_quarry_ice_mixed', 'mn_north_hartley', 'mn_hartley', 'ak_o_malley_peak_2', 'ca_eastern_sierra', 'ca_southern_western_sierra', 'ak_seward_highway_3', 'ak_seward_highway_2', 'ak_south_central_alaska', 'ak_anchorage_south_central_alaska', 'wa_strobach_mountain_ice', 'wa_strobach_mountain', 'wa_south_central_yakima', 'wa_southeast_cascades_yakima', 'me_h_greater_bangor', 'me_h_bangor_area', 'nm_jemez_area', 'nm_jemez_mountains_and_jemez_valley', 'tx_palo_duro_canyon_state_park_prohibited', 'tx_palo_duro_canyon_state_park', 'mo_em_sage_mountain_recreation_area_missouri', 'mo_em_sage_mountain_recreation_area', 'wv_the_new_river_gorge_region', 'wv_new_river_gorge_the', 'ca_candlelight_wall_2', 'ca_dana_plateau_2', 'ca_whitney_portal_family_campground', 'nh_wm_waterville_valley', 'nh_6_greeley_ponds_mad_river_notch_2', 'ca_hot_springs', 'ca_kern_canyon_mbc', 'wa_lava_wall_deadheads');

do $$ declare n int; begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog: nothing to fold.
  select count(*) into n from areas where id in (select id from m_drop_area);
  if n = 0 then raise notice '0277: no catalog, nothing to fold'; return; end if;
  if n <> 156 then raise exception '0277: expected 156 copy areas, found %', n; end if;
  -- the tree must still be the one the plan read
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.from_area;
  if n <> 39 then raise exception '0277: % of 39 climbs are where the plan found them', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep join routes o on o.id = m.drop_id;
  if n <> 104 then raise exception '0277: % of 104 merge pairs still exist', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.from_area;
  if n <> 246 then raise exception '0277: % of 246 sub-areas are where the plan found them', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.from_name;
  if n <> 5 then raise exception '0277: % of 5 renames still carry the planned name', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.from_name;
  if n <> 0 then raise exception '0277: % of 0 climb renames still carry the planned name', n; end if;
  select count(*) into n from areas where id in (select id from m_new_area);
  if n > 0 then raise exception '0277: % of the new areas already exist', n; end if;
  select count(*) into n from m_junk j join routes r on r.id = j.id and r.area_id = j.area_id and r.name = j.name;
  if n <> 0 then raise exception '0277: % of 0 junk rows are where they were read', n; end if;
  -- every climb on a copy is accounted for
  select count(*) into n from routes r join m_drop_area d on d.id = r.area_id
   where r.id not in (select id from m_move) and r.id not in (select drop_id from m_merge);
  if n > 0 then raise exception '0277: % climbs on a copy are not in the plan', n; end if;
  select count(*) into n from areas a join m_drop_area d on d.id = a.parent_id
   where a.id not in (select id from m_reparent) and a.id not in (select id from m_drop_area);
  if n > 0 then raise exception '0277: % sub-areas of a copy are not in the plan', n; end if;
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
  if n > 0 then raise exception '0277: % climber rows point at a row this deletes — stop and repoint them', n; end if;
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
  if n > 0 then raise exception '0277: % climber rows still point at a copy', n; end if;
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
  if n > 0 then raise exception '0277: % copy areas were not emptied', n; end if;
  select count(*) into n from routes where id in (select drop_id from m_merge union select id from m_junk);
  if n > 0 then raise exception '0277: % merged or junk climbs survived', n; end if;
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.to_area;
  if n <> 39 then raise exception '0277: % of 39 climbs moved', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.to_name;
  if n <> 5 then raise exception '0277: % of 5 renames landed', n; end if;
  select count(*) into n from m_new_area m join areas a on a.id = m.id and a.parent_id = m.final_parent and a.route_count > 0;
  if n <> 0 then raise exception '0277: % of 0 new areas are in place, holding their climbs', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.to_area;
  if n <> 246 then raise exception '0277: % of 246 sub-areas re-parented', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.to_name;
  if n <> 0 then raise exception '0277: % of 0 climb renames landed', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep where m.grade is not null and (k.grade <> m.grade or k.grade_num is distinct from m.grade_num);
  if n > 0 then raise exception '0277: % merged grades or grade_nums did not land', n; end if;
  -- no area holds climbs AND sub-areas
  select count(*) into n from areas a where a.id in (select id from m_recount)
     and exists (select 1 from routes r where r.area_id = a.id) and exists (select 1 from areas s where s.parent_id = a.id);
  if n > 0 then raise exception '0277: % areas hold climbs and sub-areas', n; end if;
end $$;

commit;
