-- 0221: fold every same-named AREA pair that is one place into ONE area.
--
-- Asked: "do those" — the ~250 same-named area pairs (same state, <3 km, different parent, both
-- holding climbs) left after 0215 — then "fold into 1 area, same for everything else, i don't
-- want duplicates". Refreshed live: 247 pairs, every one read:
--   * 86 are DIFFERENT features sharing a generic name (the West Face of Daff Dome and of Fairview
--     Dome; a Warm-Up Boulder in two canyons). Not duplicates; left alone.
--   * PART A, 15 pairs, one place stored twice (read one by one):
--     #21   keep ar_southern_cross_wall       drop ar_southern_cross_wall_2   one wall, one climb (Southern Cross, same FA), 80 m apart
--     #52   keep ca_little_stuff_crags_2      drop ca_little_stuff_crags      the copy holds only Short but Sweet, which the keeper has (same FA)
--     #116  keep co_kody_block                drop co_kody_block_2            one block, one problem (Corn on the Knob V2), 260 m apart
--     #58   keep ca_pin_cushion_wall_2        drop ca_pin_cushion_wall        the copy holds only Mild Steel, which the keeper has
--     #218  keep ut_needles_2                 drop ut_needles                 the copy holds only Needles Nirvana (same FA), which the keeper has
--     #219  keep ut_mt_ogden_2                drop ut_mt_ogden                the copy holds only The Gray Slabs (same FA), which the keeper has
--     #176  keep mn_quarry_boulder            drop mn_quarry_boulder_2        all 9 problems of the copy are on the keeper, same coordinate
--     #127  keep co_pike_s_peak_2             drop co_pikes_peak              Front Range › Pikes Peak holds only East Slopes; one peak
--     #136  keep co_torrey_s_peak             drop co_torreys_peak            one peak, 20 m apart (Kelso Ridge / South Slopes)
--     #117  keep co_la_plata                  drop co_la_plata_peak           one peak, 10 m apart
--     #132  keep co_snowdon_peak_2            drop co_snowdon_peak            one San Juans peak; the keeper is filed under the West Needle Mountains
--     #173  keep mn_carlton_peak              drop mn_carlton_peak_2          one peak; the copy's only child (Carlton Boulder) moves under the keeper
--     #214  keep tx_emerald_pools_sector_2    merge dup climbs of tx_emerald_pools_sector    flat copy of the sector: 17 of its 18 climbs are on the walls (same FAs); Unnamed 3 stays
--     #215  keep tx_painted_canyon_sector_2   merge dup climbs of tx_painted_canyon_sector   flat copy: 8 of its 9 climbs are on the walls (same FAs); Picnic (2022) stays
--     #208  keep nc_whiteside_ice             drop nc_starshine_area          Starshine, Junior, Mother Russia stored as ice climbs in both trees; the ice tree keeps them
--   * PART B, the rest (137 Mountain Project PARALLEL DISCIPLINE TREES — a crag's bouldering or ice
--     filed under "*Joshua Tree Bouldering*" / "* NH Ice and Mixed" — plus the held pairs, plus 112
--     pairs the name key missed because MP names the copy "<X> Bouldering" / "<X> Boulders"
--     ("Hidden Valley Area Bouldering" beside "Hidden Valley Area"); 9 such look-alikes are
--     DIFFERENT places and stay (Cathedral Boulders / Cathedral Peak, Kraft Boulders / Kraft Crags,
--     Dark Side Boulders / Flagstaff's Dark Side, Beach Boulders / The Beach 2.2 km off ...): the copy
--     in the discipline tree is FOLDED into the one in the main tree. A same-named wall folds into
--     its twin; anything else moves under the kept area; a moved area whose name would repeat its
--     parent's is renamed "Ice Climbs" / "Bouldering" / "Rock Climbs" / "Other Climbs". Climbs
--     sharing a name across the trees are nearly all DIFFERENT climbs (Thresher 5.10 / WI3, Planet
--     X 5.8 / V6) and are kept both. 541 re-parents, 377 climbs moved, 80 renames, 2 merge,
--     179 folded-away areas deleted once empty. Plan: .scratch/fold.mjs (log reviewed).
--
-- Mechanics:
--   1. 42 climbs stored on both sides: the KEEPER fills each BLANK column from the
--      other row (nothing it holds is overwritten, 0220's rule) and the other row is deleted.
--   2. 5 other climbs move into the keeper area; 1 child area(s) re-parented.
--   3. 13 copy areas are deleted, only once empty.
--   4. route_count recounted on every ancestor of every touched area.
-- The migration ABORTS if any climber data (contributions cascade!) points at a row it deletes.
-- Rollback snapshot: audits/area-pairs-2026-09-26/rollback.json.

begin;

create temp table m_merge(keep text not null, drop_id text primary key) on commit drop;
insert into m_merge values
  ('ar_southern_cross', 'ar_southern_cross_2'),
  ('ca_short_but_sweet_3', 'ca_short_but_sweet_2'),
  ('co_corn_on_the_knob', 'co_corn_on_the_knob_2'),
  ('ca_mild_steel_2', 'ca_mild_steel'),
  ('ut_needles_nirvana_2', 'ut_needles_nirvana'),
  ('ut_the_gray_slabs_2', 'ut_the_gray_slabs'),
  ('mn_slab_of_the_wasp', 'mn_slab_of_the_wasp_2'),
  ('mn_rain_with_a_chance_of_boulders', 'mn_rain_with_a_chance_of_boulders_2'),
  ('mn_david', 'mn_david_2'),
  ('mn_pieta', 'mn_pieta_2'),
  ('mn_perseus', 'mn_perseus_2'),
  ('mn_nike', 'mn_nike_2'),
  ('mn_gaia', 'mn_gaia_2'),
  ('mn_apollo_s_ar_te', 'mn_apollo_s_arete'),
  ('mn_uranus', 'mn_uranus_2'),
  ('tx_half_monty_2', 'tx_half_monty'),
  ('tx_sorry_2', 'tx_sorry'),
  ('tx_butt_crack_2', 'tx_butt_crack'),
  ('tx_the_river_2', 'tx_the_river'),
  ('tx_wally_gator_2', 'tx_wally_gator'),
  ('tx_hi_ho_cherry_o', 'tx_hi_ho_cherrio'),
  ('tx_gator_mcklusky_2', 'tx_gator_mcklusky'),
  ('tx_bass_a_la_pecos_2', 'tx_bass_a_la_pecos'),
  ('tx_candy_land', 'tx_candyland'),
  ('tx_corner_2', 'tx_corner'),
  ('tx_chutes_and_ladders_2', 'tx_chutes_and_ladders'),
  ('tx_crocodile_tears_2', 'tx_crocodile_tears'),
  ('tx_perch_jerk_2', 'tx_perch_jerk'),
  ('tx_gasper_goo_2', 'tx_gasper_goo'),
  ('tx_ten_d_nitis_2', 'tx_ten_d_nitis'),
  ('tx_unnamed_5_10_2', 'tx_unnamed_5_10'),
  ('tx_sugar_2', 'tx_sugar'),
  ('tx_piranha_3', 'tx_piranha_2'),
  ('tx_shake_n_flake_2', 'tx_shake_n_flake'),
  ('tx_rabbit_rodeo_2', 'tx_rabbit_rodeo'),
  ('tx_rockers_2', 'tx_rockers'),
  ('tx_over_under_sideways_down_2', 'tx_over_under_sideways_down'),
  ('tx_turtle_lasso_2', 'tx_turtle_lasso'),
  ('tx_crackalicious_2', 'tx_crackalicious'),
  ('nc_whiteside_ice_junior', 'nc_starshine_area_junior'),
  ('nc_whiteside_ice_mother_russia', 'nc_starshine_area_mother_russia'),
  ('nc_whiteside_ice_starshine', 'nc_starshine_area_starshine'),
  ('co_fourth_flatiron_east_face_aka_the_watercourse', 'co_flatirons_ice_climbing_fourth_flatiron_east_face_aka_the_watercourse'),
  ('ak_19_mile_wall_3_unknown_1', 'ak_19_mile_wall_unknown_1');

create temp table m_move(id text primary key, from_area text not null, to_area text not null) on commit drop;
insert into m_move values
  ('co_pikes_peak_east_slopes', 'co_pikes_peak', 'co_pike_s_peak_2'),
  ('co_torreys_peak_south_slopes', 'co_torreys_peak', 'co_torrey_s_peak'),
  ('co_la_plata_peak_northwest_ridge', 'co_la_plata_peak', 'co_la_plata'),
  ('co_ne_rib', 'co_snowdon_peak', 'co_snowdon_peak_2'),
  ('co_way_juan_nordwand', 'co_snowdon_peak', 'co_snowdon_peak_2');

create temp table m_drop_area(id text primary key) on commit drop;
insert into m_drop_area values ('ar_southern_cross_wall_2'), ('ca_little_stuff_crags'), ('co_kody_block_2'), ('ca_pin_cushion_wall'), ('ut_needles'), ('ut_mt_ogden'), ('mn_quarry_boulder_2'), ('co_pikes_peak'), ('co_torreys_peak'), ('co_la_plata_peak'), ('co_snowdon_peak'), ('mn_carlton_peak_2'), ('nc_starshine_area'), ('co_eldora_2'), ('co_silverton'), ('nh_the_jobsite'), ('nh_parking_lot_wall'), ('nh_orange_crush_crag'), ('nh_rumney_ice_climbs'), ('co_big_meadows_2'), ('nh_north_bald_cap_ice'), ('vt_bone_mountain'), ('co_flatirons_ice_climbing'), ('co_quandary_ice_crag'), ('co_split_rock_area'), ('mn_south_quarry_area_2'), ('tn_asteroid'), ('vt_black_mountain'), ('vt_mount_pisgah'), ('co_almost_a_tunnel_2'), ('co_little_eiger_area_ice'), ('co_clear_creek_canyon_ice'), ('co_elephant_rock_2'), ('co_rifle_mountain_park_2'), ('ct_blue_trail_section_2'), ('ct_webb_mountain_park_2'), ('wi_eau_claire_ice'), ('ca_buck_rock_2'), ('ct_west_rock_state_park_2'), ('mn_mini_fortress'), ('vt_bolton_quarry'), ('al_the_grotto_bouldering'), ('al_grotto_bouldering_the'), ('ca_echo_rock_boulders'), ('ca_echo_cove_bouldering'), ('ca_echo_rock_bouldering'), ('ca_barker_dam_bouldering'), ('ca_central_joshua_tree_bouldering'), ('ca_hidden_valley_campground_bouldering'), ('ca_roadside_rocks_bouldering'), ('ca_real_hidden_valley_bouldering'), ('ca_outback_bouldering'), ('ca_hidden_valley_area_bouldering'), ('ca_hospital_rock_boulders'), ('ca_rattlesnake_canyon_2'), ('ca_group_camp_short_wall_2'), ('ca_group_campsites_road_2'), ('ca_indian_cove_campground_2'), ('ca_indian_cove_bouldering'), ('ca_jimmy_cliff_area'), ('ca_lost_horse_bouldering'), ('ca_trashcan_rock_area'), ('ca_quail_springs_bouldering'), ('ct_mattatuck_state_forest_bouldering'), ('id_ross_park_bouldering'), ('nh_meadows_bouldering_the'), ('ak_19_mile_wall'), ('ca_castle_rock_proper_2'), ('co_arapahoe_peaks_2'), ('il_a_gill_roof'), ('ny_crane_mountain_2'), ('ak_cracked_ice_2'), ('ak_sunshine_ridge_area'), ('az_granite_mountain_2'), ('az_sullivan_s_canyon_2'), ('ca_horseshoe_lake'), ('nv_white_rock_spring_2'), ('ny_loon_lake_mt'), ('ny_upper_washbowl_cliff_ice'), ('ca_rainbow_2'), ('ca_t_j_lake_2'), ('ny_silver_lake_2'), ('vt_bolton_dome_the'), ('vt_revolution_wall_2'), ('az_mt_elden_areas'), ('az_west_clear_creek_2'), ('ca_carson_peak_ice_2'), ('ca_lake_george_2'), ('co_apache_peak_2'), ('co_mchenry_s_peak_2'), ('co_glacier_gorge_2'), ('ct_right_knee_2'), ('ny_starbuck_left_2'), ('ny_starbuck_central_2'), ('ny_starbuck_mountain_2'), ('az_thumb_butte_boulders'), ('az_turkey_flat_boulders'), ('ca_bigcone_and_ladybug_canyons_bouldering'), ('ca_sunlight_rock_2'), ('ca_towers_of_uncertainty_2'), ('ca_virgin_islands_area_2'), ('ca_geology_tour_road_bouldering'), ('ca_loveland_bouldering'), ('ca_malibu_creek_state_park_bouldering'), ('ca_lower_muffins_boulders'), ('ca_muffins_boulders'), ('ca_queen_mountain_bouldering'), ('ca_tenaya_lake_boulders'), ('co_anarchy_wall_boulders'), ('co_diamond_head_bouldering'), ('co_little_eiger_bouldering'), ('co_new_economy_cliff_bouldering'), ('co_new_river_wall_bouldering'), ('co_nomad_s_cave_bouldering'), ('id_owl_rock_bouldering'), ('mi_pinnacle_area_bouldering'), ('mi_presque_isle_bouldering'), ('mi_secret_crag_bouldering'), ('nv_black_velvet_canyon_boulders'), ('nv_moderate_mecca_boulders'), ('nv_calico_basin_boulders'), ('nv_juniper_canyon_boulders'), ('nv_first_waterfall_bouldering'), ('nv_lower_canyon_bouldering'), ('nv_oak_creek_canyon_boulders'), ('nv_pine_creek_canyon_boulders'), ('nv_sandstone_canyon_boulders'), ('nv_wake_up_wall_boulders'), ('nv_sandstone_quarry_boulders'), ('nv_western_fringe_bouldering'), ('sd_positron_bouldering'), ('ut_cone_bouldering_the'), ('vt_upper_west_bouldering'), ('wa_morning_rock_bouldering'), ('wy_sandstone_boulders'), ('ca_hall_of_horrors_area_2'), ('ca_intersection_rock_2'), ('ct_split_boulder'), ('nv_sundial_the_2'), ('sd_veiny_2'), ('wa_clamshell_cave_2'), ('wa_summit_area_2'), ('wi_bird_foot_buttress_2'), ('wi_tree_tower_2'), ('ca_boreal_area_2'), ('ca_reggie_dome_2'), ('mi_sugar_cube_the'), ('wa_barney_s_rubble_2'), ('wi_white_wall_2'), ('az_council_rocks'), ('mn_cube_the_2'), ('ca_planet_x_area_2'), ('ca_talking_heads_area'), ('mi_wetmore_pond'), ('wi_poison_ivy_wall_2'), ('az_watson_lake_bouldering'), ('ar_kindergarten_boulder_bouldering'), ('ca_cap_rock_bouldering'), ('ca_hall_of_horrors_bouldering'), ('ca_north_star_wall_bouldering'), ('ca_love_nest_area_2'), ('ca_planet_x_bouldering'), ('ca_ryan_campground_bouldering'), ('ca_school_rock_bouldering'), ('ca_tombstone_area_bouldering'), ('co_chaos_canyon'), ('co_parking_lot_boulders_the'), ('nv_frigid_air_buttress_boulders'), ('nv_snake_eyes_wall_bouldering'), ('ut_green_adjective_gully_bouldering'), ('wa_carnival_boulders_the'), ('wa_far_side_boulders'), ('az_oasis_the_2'), ('ca_king_dome'), ('az_rappel_rock'), ('mi_bread_loaf_bouldering'), ('mi_flying_frog_bouldering'), ('mi_second_buttress_bouldering'), ('mi_sunset_gully_bouldering'), ('nv_pier_boulders_the'), ('ca_real_hall_of_horrors'), ('ca_central_pinnacles_bouldering'), ('ca_voodoo_garden_bouldering_area'), ('ak_glenn_highway_2'), ('tn_upper_boulders_at_old_wauhatchie_pike'), ('vt_revolution_hills'), ('ca_carson_peak_2'), ('ca_camoflage_forest_and_lake_audrain'), ('nv_keyhole_canyon_bouldering'), ('wa_kettle_valley_bouldering'), ('sd_north_park'), ('az_granite_dells_bouldering');

create temp table m_recount on commit drop as
  select distinct a.id from areas a, areas t
   where t.id in ('ar_southern_cross_wall', 'ar_southern_cross_wall_2', 'ca_little_stuff_crags_2', 'ca_little_stuff_crags', 'co_kody_block', 'co_kody_block_2', 'ca_pin_cushion_wall_2', 'ca_pin_cushion_wall', 'ut_needles_2', 'ut_needles', 'ut_mt_ogden_2', 'ut_mt_ogden', 'mn_quarry_boulder', 'mn_quarry_boulder_2', 'co_pike_s_peak_2', 'co_pikes_peak', 'co_torrey_s_peak', 'co_torreys_peak', 'co_la_plata', 'co_la_plata_peak', 'co_snowdon_peak_2', 'co_snowdon_peak', 'mn_carlton_peak', 'mn_carlton_peak_2', 'tx_emerald_pools_sector_2', 'tx_emerald_pools_sector', 'tx_painted_canyon_sector_2', 'tx_painted_canyon_sector', 'nc_whiteside_ice', 'nc_starshine_area', 'mn_carlton_boulder', 'co_hessie', 'nh_cathedral_ledge_ice_climbs', 'co_us_highway_550_south_of_silverton', 'co_south_mineral_creek_2', 'co_cement_creek_2', 'co_deer_park_creek_falls', 'co_arrastra_gulch', 'co_electric_peak', 'co_maggie_gulch', 'co_minnie_gulch', 'co_cunningham_gulch_2', 'co_eureka', 'nh_polar_caves_closed', 'nh_jobsite_the', 'nh_the_jobsite', 'nh_apocalypse_wall', 'nh_main_cliff_left_venus_wall', 'nh_parking_lot_wall', 'nh_the_parking_lot_wall', 'nh_triple_corners_2', 'nh_orange_crush_crag', 'nh_orange_crush', 'nh_true_summit_ledges_utopia_area', 'nh_upper_darth_vader_aka_hendrix_lee', 'nh_infinity_wall_2', 'nh_beyond_infinity_wall', 'nh_yellowknife_gully', 'nh_summit_cliff_ice_and_mixed', 'nh_roadside_ice', 'ak_purinton_creek_3', 'co_upper_tier_6', 'co_lower_tier_5', 'co_flatirons_2', 'co_longs_peak', 'co_north_cheyenne_canyon', 'nh_humphrey_s_ledge', 'nh_3_yukon_gold_butress', 'nh_3_yukon_gold_buttress', 'nh_2_bald_cap_slabs', 'nh_1_the_motherlode', 'nh_sandwich_notch_ice', 'vt_solstice_slab', 'vt_big_splint_area', 'co_flatirons_ice_climbing', 'co_ophir_area', 'co_quandary_ice_crag', 'co_quandary_peak', 'co_split_rock_area', 'co_split_rock', 'mn_craig_s_cave', 'mn_blank_the', 'tn_asteroid', 'tn_asteroid_2', 'vt_black_mountain_central', 'vt_mount_pisgah', 'vt_pisgah_crag', 'co_almost_a_tunnel_2', 'co_almost_a_tunnel', 'co_bear_creek_2', 'co_coors_ultra_light', 'co_beer_garden_2', 'co_aqueduct_flows', 'co_mayhem_gulch', 'co_blue_moon', 'co_secret_waterfall_aka_windy_saddle_ice_flow', 'co_little_eiger_area_ice', 'co_little_eiger', 'co_m3_crag', 'co_elephant_rock_2', 'co_elephant_rock', 'co_pike_s_peak', 'co_west_side_of_the_canyon', 'ct_old_fish_house_road', 'ct_red_trail_section', 'ct_blue_trail_section_2', 'ct_blue_trail_section', 'nh_iron_mtn', 'wi_eau_claire_ice', 'wi_eau_claire', 'ak_portage_4', 'ca_buck_rock_2', 'ca_buck_rock', 'co_bierstadt_ice', 'co_staunton_state_park_ice', 'ct_toni_harp_bloc', 'ct_wintergreen', 'ct_judges_cave', 'ct_tj_s_bar_and_grill', 'ct_god_s_country', 'mn_no_name_balancing_boulder', 'mn_lover_s_fortress', 'mn_tetris', 'mn_red_green_show', 'mn_trump_boulders', 'nh_echo_crag_ice_climbs', 'vt_schoolyard', 'vt_main_quarry', 'vt_lower_quarry', 'al_the_grotto_bouldering', 'al_grotto', 'al_grotto_bouldering_the', 'ca_cap_rock_bouldering', 'ca_necco_boulder', 'ca_beak_rock', 'ca_big_dike_boulders', 'ca_echo_rock_proper', 'ca_gumdrop_the_2', 'ca_master_cylinder', 'ca_value_boulder', 'ca_classic_thin_crack_boulder', 'ca_arete_boulders', 'ca_big_moe_wall', 'ca_coyote_corner_2', 'ca_igneous_boulder', 'ca_land_of_the_lost_boulder', 'ca_smith_rock_2', 'ca_hall_of_horrors_bouldering', 'ca_lonesome_crowded_west', 'ca_stonehenge_and_fry_boulders', 'ca_planet_x_bouldering', 'ca_yoda_head_boulder', 'ca_gunsmoke_area_2', 'ca_gunsmoke_area', 'ca_indian_wave_boulders', 'ca_barker_dam_boulders', 'ca_alisters_cave', 'ca_crack_a_no_no_area', 'ca_lost_and_found_corridor', 'ca_ryan_campground_bouldering', 'ca_hvcg_bouldering_circuit', 'ca_manx_asteroid_belt_circuit', 'ca_pacifier_and_the_nostril', 'ca_chunky_boulder_and_trance_stone', 'ca_jbmf_boulders', 'ca_pepboys_boulder', 'ca_texas_boulder', 'ca_melon_boulder', 'ca_bullet_proof_boulder', 'ca_turtle_rock_circuit', 'ca_semi_precious_bouldering', 'ca_real_hidden_valley_circuit', 'ca_under_lizzy_boulder', 'ca_yabba_dabba_don_t_boulder', 'ca_cole_boulder', 'ca_gizmo_boulder', 'ca_hobbit_hole_boulder', 'ca_hooker_boulder', 'ca_miledi_rock', 'ca_powell_boulder', 'ca_tilt_o_meter_boulder', 'ca_iron_door_cave_boulder', 'ca_laura_scudder_boulder', 'ca_lizzie_boulder', 'ca_amoeba_boulder', 'ca_family_boulder_2', 'ca_dino_s_egg', 'ca_white_rastafarian_boulder', 'ca_voices_boulder', 'ca_tidal_wave_boulder', 'ca_mutant_boulder', 'ca_without_a_trace_boulder', 'ca_romp_roof', 'ca_scorpion_roof', 'ca_wilson_boulder', 'ca_purina_wall', 'ca_rasta_city', 'ca_chuckawalla_boulder', 'ca_animal_boulder_3', 'ca_false_hueco_boulder', 'ca_dike_boulder_3', 'ca_parking_lot_boulder_the', 'ca_fat_darrell_sandwich', 'ca_cave_boulder_4', 'ca_tuolumne_boulder', 'ca_49_palms_oasis_area', 'ca_group_camp_short_wall_2', 'ca_group_camp_short_wall', 'ca_group_camp_1_boulders', 'ca_western_wilderness_boulders', 'ca_varnished_wall_boulders', 'ca_varnished_wall', 'ca_picnic_boulder', 'ca_feudal_boulder', 'ca_campfire_crag_boulder', 'ca_callous_boulder', 'ca_pixie_boulder', 'ca_lehi_s_wilderness', 'ca_atlantis_boulder_2', 'ca_cheese_boulder', 'ca_yabo_boulder_the', 'ca_lost_horse_mantle_boulder', 'ca_mel_s_diner_boulder', 'ca_blas_beemer_area', 'ca_hemingway_boulders', 'ca_big_bud_boulder', 'ca_penguins_boulder', 'ca_scoop_boulder_2', 'ca_ankle_breaker_rock', 'ca_doctor_boulder_the', 'ca_north_of_jerry_cliff', 'ca_marley_boulder', 'ca_dysfunction_boulder', 'ca_equine_boulder', 'ca_bandulo_block', 'ca_jimmy_cliff_boulder', 'ca_humanitarian_boulder', 'ca_unmentionable_the_2', 'ca_west_entrance_boulder', 'ca_psycho_boulders', 'ca_chocolate_boulders', 'ca_embryo_area', 'ca_lonely_stones_1', 'ca_miledi_boulders', 'ca_outer_rim_the', 'ca_zen_boulder', 'ca_dover_cliffs_boulder', 'ca_trashcan_boulders', 'ca_forgotten_boulders', 'ca_afpa_rock_area', 'ca_afpa_rock', 'ct_diamond_ledge_bouldering', 'ct_diamond_ledge', 'ct_sunset_boulders', 'ct_east_of_naugatuck_river', 'ct_d_d_cave', 'id_aquatic_complex_zoo', 'mn_ely_s_peak_bouldering', 'mn_ely_s_peak', 'nh_hells_kitchen', 'nh_apocalypse_boulder', 'nh_meat_grinder_boulders_the', 'nh_monsters_from_the_id_bouldering', 'nh_monsters_from_the_id', 'nh_newbury_cut_ice_mixed', 'ut_sunshine_wall_boulders', 'ca_castle_rock_proper_2', 'ca_castle_rock_proper', 'ca_potter_s_point_2', 'ca_potter_s_point', 'co_arapahoe_peaks_2', 'co_arapahoe_peaks', 'il_a_gill_roof', 'il_a_gill_roof_area', 'mn_bur_oak_trail_2', 'mn_bur_oak_trail', 'ny_southeast_slopes', 'ny_southwest_slopes', 'ak_cracked_ice_2', 'ak_cracked_ice', 'ak_sunshine_ridge_area', 'ak_sunshine_ridge', 'az_granite_basin_lake', 'az_mint_wash', 'az_serengeti', 'az_gully_boulders_the', 'ca_horseshoe_slabs_boulder', 'ca_dog_boulder', 'co_bambi_s_trail_area', 'co_bambi_s_trail', 'id_checkered_demon_2', 'id_checkered_demon', 'nv_stooge_boulders', 'nv_space_oddity', 'nv_supple_leopard', 'nv_ziggy_stardust', 'ny_loon_lake_mt', 'ny_loon_lake_mtn', 'ny_upper_washbowl_cliff_ice', 'ny_upper_washbowl_cliff', 'ut_the_middle_fork_ice_climbs', 'wi_cox_hollow', 'ca_parking_lot_boulder_3', 'ca_main_boulders_2', 'ca_soda_punk_boulder', 'ca_upper_rainbow', 'ca_double_wide', 'ca_trigantor', 'ca_ginja_ninja', 'ca_sugar_cube', 'ca_t_j_slabs', 'ca_lake_boulder', 'ca_medicine_boulder', 'ca_spoon_boulder', 'ca_killer_wall', 'co_stanley_canyon_ice', 'id_dungeon_the_2', 'id_dungeon_the', 'ny_center_of_progress', 'ny_tsunami_wall', 'ny_potter_mountain', 'vt_interstate_boulder', 'vt_something_chossy_boulder', 'vt_grandma_s_house', 'vt_randy_bobandy', 'vt_shenanigans_boulder_the', 'vt_revolution_wall_2', 'vt_revolution_wall', 'az_skyline_boulders', 'az_dragon_eggz', 'az_pipeline_trail_boulders', 'az_bird_sanctuary', 'az_middle_elden', 'az_west_elden_2', 'az_elden_springs', 'az_solitude_canyon_2', 'az_east_elden_below_lost_elden', 'az_gloria_s', 'az_fatmans_loop', 'az_elysian_boulders', 'az_northern_satellite_area', 'az_main_creek', 'az_southern_satellite_area', 'ca_carson_peak_ice_2', 'ca_carson_peak_ice', 'ca_family_boulders', 'co_apache_peak_2', 'co_apache_peak', 'co_thatchtop_mt_se_aspect', 'co_glacier_creek_drainage_including_black_lake_area', 'co_overflow_and_jewell_lake', 'co_long_s_peak_western_aspect', 'co_mchenry_s_peak_2', 'co_mchenry_s_peak', 'co_chief_s_head_peak', 'ct_right_knee_2', 'ct_right_knee', 'id_elephant_rock_2', 'ny_azure_mountain_2', 'ny_azure_mountain', 'ny_starbuck_left_2', 'ny_starbuck_left', 'ny_starbuck_central_2', 'ny_starbuck_central', 'ny_starbuck_right_2', 'ak_mendenhall_towers_ice_mixed', 'az_outfrumunders', 'az_upper_outfromunder_boulder', 'az_new_outfromunder_boulders', 'az_turkey_flat_boulders', 'az_turkey_flat', 'ca_in_the_beginning', 'ca_drug_dome_boulders', 'ca_drug_dome', 'ca_arete_boulder_2', 'ca_base_layer_boulder', 'ca_sunlight_rock_2', 'ca_sunlight_rock', 'ca_uncertain_boulder', 'ca_uncertain_traverse_boulder', 'ca_stoney_point_boulder', 'ca_cave_rock_3', 'ca_side_kick_boulder', 'ca_scum_bag_boulder', 'ca_pinched_egg_boulder', 'ca_lechlinksi_cracks_area', 'ca_shark_fin_area', 'ca_volcano_area_the', 'ca_volcano_the', 'ca_western_belt', 'ca_lake_audrain_bouldering', 'ca_lake_audrain', 'ca_rosetta_stone_the', 'ca_xenolithic_boulder', 'ca_boulder_2_4', 'ca_lessons_boulder', 'ca_stumbling_blocks_area', 'ca_stumbling_blocks', 'ca_planet_of_the_apes_area', 'ca_ghetto_wall_boulders_the', 'ca_ghetto_wall', 'ca_matts_boulders_aka_the_nest', 'ca_lower_muffins_boulders', 'ca_lower_muffins', 'ca_watchtower_the_5', 'ca_underground_the', 'ca_queen_mountain_base', 'ca_summit_rock_boulders', 'ca_summit_rock', 'ca_tenaya_hillside', 'ca_big_lebowski_area', 'ca_western_wilderness', 'co_almost_asshole_rock_bouldering', 'co_almost_asshole_rock', 'co_anarchy_wall_boulders', 'co_anarchy_wall_2', 'co_asshole_rock_bouldering', 'co_asshole_rock', 'co_da_butts_bouldering', 'co_da_butts', 'co_diamond_head_bouldering', 'co_diamond_head', 'co_little_eiger_bouldering', 'co_new_economy_cliff_bouldering', 'co_new_economy_cliff', 'co_new_river_wall_bouldering', 'co_new_river_wall_the', 'co_nomad_s_cave_bouldering', 'co_nomad_s_cave', 'co_west_ridge_boulders', 'id_nest_boulder_the', 'id_songbird_boulder', 'mi_black_rocks', 'mi_pinnacle_area_bouldering', 'mi_pinnacle_area_the', 'mi_secret_crag_bouldering', 'mi_secret_crag', 'nv_natasha_s_highball_boulder', 'nv_wet_dream_boulder', 'nv_normal_dream', 'nv_twin_towers_2', 'nv_red_dragon_boulder_the', 'nv_creek_boulder', 'nv_in_our_time_boulder', 'nv_fountainhead_the', 'nv_black_boulder', 'nv_bone_daddy_dome_bouldering', 'nv_bone_daddy_dome', 'nv_honeycomb_boulder', 'nv_stone_age_traverse', 'nv_swingers_boulder', 'nv_qq_boulder', 'nv_strategic_arms_boulder', 'nv_moderate_mecca', 'nv_bone_grinder_boulder', 'nv_mr_smiley_boulders', 'nv_biscuits_and_gravy', 'nv_ash_creek_spring_boulders', 'nv_ash_canyon', 'nv_ruby_slipper_area', 'nv_fin_du_monde_drainage', 'nv_friends_boulder_2', 'nv_handcrack_boulder', 'nv_superfly', 'nv_cubicle_the', 'nv_shoulder_boulder', 'nv_streak_sauce', 'nv_jimbo_rocks', 'nv_first_waterfall_bouldering', 'nv_first_waterfall_area', 'nv_front_boulder_wall', 'nv_snake_eyes_corridor_bouldering', 'nv_chicken_leg_bouldering', 'nv_chicken_leg', 'nv_american_boulder', 'nv_areola_boulder', 'nv_cabana_boulder', 'nv_drunken_monkey_boulder', 'nv_get_moist_boulder', 'nv_kissed_boulder', 'nv_galaxy_gully', 'nv_beehive_knoll_area', 'nv_any_port_in_a_storm_area', 'nv_bees_knees_the', 'nv_blood_trails', 'nv_carapace_the', 'nv_desert_serenade', 'nv_get_burnt', 'nv_get_to_da_choppa', 'nv_group_decision_boulder', 'nv_headless_horseman_boulder', 'nv_shiatsu_boulder', 'nv_silly_patch_boulders', 'nv_sundial_the_3', 'nv_tilt_shift_boulder', 'nv_terrace_canyon_boulders', 'nv_stick_gully_boulders', 'nv_stick_gully', 'nv_abutment', 'nv_crack_of_fire', 'nv_crack_of_dawn', 'nv_optimist_the', 'nv_red_roof_inn', 'nv_skeletons_on_the_zahara', 'nv_under_the_desert_sky', 'nv_java_boulder', 'nv_monstro_s_gaping_maw', 'nv_pier_boulders_the', 'nv_propane_tank_boulder_the', 'nv_trophy_crack', 'nv_wake_up_wall_boulders', 'nv_the_wake_up_wall', 'nv_southern_outcrops_bouldering', 'nv_paiute_boulders', 'nv_hillside_boulders', 'sd_positron_bouldering', 'sd_positron', 'ut_cone_bouldering_the', 'ut_cone_area_the', 'vt_boulders_south', 'vt_boulders_north', 'vt_boulders_central', 'wa_roadside_boulders_the', 'wa_talus_boulders', 'wy_nature_center_boulders', 'ca_big_brother_boulders', 'ca_cilley_rock', 'ca_dwarf_the', 'ca_garden_angel_boulder', 'ca_horrors_boulder', 'ca_alien_arete_boulder', 'ca_real_hall_of_horrors_the', 'ca_zarmog', 'ca_intersection_rock_2', 'ca_intersection_rock', 'ct_split_boulder', 'ct_split_boulder_2', 'mi_hogback', 'nv_sundial_the_2', 'nv_sundial_the', 'sd_veiny_2', 'sd_veiny', 'ut_the_box_canyon_ice_climbs', 'wa_clamshell_cave_2', 'wa_clamshell_cave', 'wa_green_wall_2', 'wa_lookout_slabs', 'wi_bird_foot_buttress_2', 'wi_bird_foot_buttress', 'wi_tree_tower_2', 'wi_tree_tower', 'ca_party_bus', 'ca_flying_saucer', 'ca_reggie_dome_2', 'ca_reggie_dome', 'co_buoux_block_area', 'co_buoux_block', 'mi_sugar_cube_the', 'mi_sugar_cube', 'nv_echo_falls_area_2', 'nv_echo_falls_2', 'wa_barney_s_rubble_2', 'wa_barney_s_rubble', 'wi_white_wall_2', 'wi_white_wall', 'ak_monolith_area', 'ak_monolith_the', 'az_entrance_boulders_5', 'az_laundry_basket_the', 'az_the_bean_field', 'az_susurradores', 'az_sweet_rock_2', 'az_sweet_rock', 'ca_cap_rock_3', 'mi_wetmore_pond_2', 'mi_wetmore_pond_3', 'mn_cube_the_2', 'mn_cube_the', 'ca_boulder_crack_rock', 'ca_newton_s_law_boulder', 'ca_ok_corridor', 'ca_planet_x_boulder', 'ca_jerry_s_boulder', 'ca_satellite_boulder', 'ca_sports_challenge_rock_2', 'ca_and_she_was_boulder', 'ca_born_boulder', 'mi_blueberry_boulders_2', 'mi_ar_tection_boulder', 'mi_rock_loop_outcrops', 'mi_man_in_the_chair', 'mi_death_star_boulder', 'wa_castle_rock_3', 'wv_cotton_top', 'wv_cotton_top_2', 'wi_poison_ivy_wall_2', 'wi_poison_ivy_wall', 'az_wasteland_bouldering_the', 'az_wasteland_the', 'az_livin_large_area_3rd_degree_wall', 'az_box_canyon_dome_and_dread_wall', 'az_jetty_the', 'az_leaning_pillar', 'az_giant_steps', 'az_outback_boulder', 'az_basking_lizard_wall', 'az_zen_ledges_the', 'az_cranium_crack_area', 'az_thor_s_chasm', 'az_thor_s_marbles', 'az_thor_s_right', 'az_sanctuary_the', 'az_hot_rock_and_the_gutter', 'ar_kindergarten_boulder_bouldering', 'ar_kindergarten_boulder', 'ca_vibrator_boulder', 'ca_ayatollah_boulder', 'ca_collieherb_boulder', 'ca_four_corners_boulder', 'ca_french_roast_boulder', 'ca_gram_parsons_memorial_boulder', 'ca_hatrack_the', 'ca_parking_lot_boulder_8', 'ca_pumping_monzonite_boulder', 'ca_sandy_wash_corridor', 'ca_powell_pinch_boulder', 'ca_king_dome_area', 'ca_meadows_boulder', 'ca_north_star_wall_bouldering', 'ca_north_star_wall', 'ca_transplants_boulder', 'ca_adolescents_block', 'ca_wood_block_the', 'ca_hang_the', 'ca_sacred_land', 'ca_fidelman_boulder', 'ca_camp_boulder_2', 'ca_chipped_bulge_the', 'ca_facet_boulder_2', 'ca_flight_attendant_rock', 'ca_master_boulder_2', 'ca_matatte_boulder', 'ca_moffat_boulder', 'ca_northern_headstone_boulders', 'ca_powers_boulder_2', 'ca_roof_boulder_3', 'ca_school_rock_4', 'ca_drawing_of_the_three_the', 'ca_tombstone_area_bouldering', 'ca_tombstone', 'co_chaos_creek', 'co_hallett_south_side', 'co_parking_lot_boulders_the', 'co_parking_lot_the', 'mi_hogback_bouldering', 'mt_flying_buttress_boulders', 'mt_flying_buttress', 'nv_frigid_air_buttress_boulders', 'nv_frigid_air_buttress', 'nv_snake_eyes_wall_bouldering', 'nv_snake_eyes_wall', 'ut_green_adjective_gully_bouldering', 'ut_green_adjective_gully', 'wa_carnival_boulders_the', 'wa_carnival_crag', 'wa_rhino_boulders', 'wa_pistol_boulders', 'wa_bow_boulder_the', 'wa_mile_high_club_boulders', 'ca_eastern_rim_2', 'az_field_the', 'ca_rabbit_warren_the', 'az_high_rappel_area_2', 'ca_hungover_wall', 'ca_king_dome_east_face', 'ca_king_dome_west_face', 'ca_volcano_boulder', 'az_rappel_rock_gulley', 'az_crossbones_boulder', 'az_royale_boulder', 'az_skull_boulder', 'az_quartzite_spring_boulder', 'az_trailside_boulder', 'co_east_creek_day_use_bouldering', 'co_east_creek_day_use_climbing', 'co_four_blocks_bouldering', 'co_four_blocks_crag', 'mi_bread_loaf_bouldering', 'mi_bread_loaf', 'mi_flying_frog_bouldering', 'mi_flying_frog_area', 'mi_second_buttress_bouldering', 'mi_second_buttress', 'mi_sunset_gully_bouldering', 'mi_sunset_gully', 'nv_the_pier', 'wa_icicle_buttress_boulders', 'wa_icicle_buttress', 'ca_real_hall_of_horrors', 'ca_overhung_knobs_boulder', 'ca_lost_orbit_bouldering', 'ca_thunder_down_under', 'ca_chip_off_the_old_block', 'ca_deadwood_boulder', 'ca_tortoise_boulder', 'ca_broken_heart_boulder', 'co_eldora_2', 'co_silverton', 'nh_rumney_ice_climbs', 'co_big_meadows_2', 'nh_north_bald_cap_ice', 'vt_bone_mountain', 'mn_south_quarry_area_2', 'vt_black_mountain', 'co_clear_creek_canyon_ice', 'co_rifle_mountain_park_2', 'ct_webb_mountain_park_2', 'ct_west_rock_state_park_2', 'mn_mini_fortress', 'vt_bolton_quarry', 'ca_echo_rock_boulders', 'ca_echo_cove_bouldering', 'ca_echo_rock_bouldering', 'ca_barker_dam_bouldering', 'ca_central_joshua_tree_bouldering', 'ca_hidden_valley_campground_bouldering', 'ca_roadside_rocks_bouldering', 'ca_real_hidden_valley_bouldering', 'ca_outback_bouldering', 'ca_hidden_valley_area_bouldering', 'ca_hospital_rock_boulders', 'ca_rattlesnake_canyon_2', 'ca_group_campsites_road_2', 'ca_indian_cove_campground_2', 'ca_indian_cove_bouldering', 'ca_jimmy_cliff_area', 'ca_lost_horse_bouldering', 'ca_trashcan_rock_area', 'ca_quail_springs_bouldering', 'ct_mattatuck_state_forest_bouldering', 'id_ross_park_bouldering', 'nh_meadows_bouldering_the', 'ak_19_mile_wall', 'ny_crane_mountain_2', 'az_granite_mountain_2', 'az_sullivan_s_canyon_2', 'ca_horseshoe_lake', 'nv_white_rock_spring_2', 'ca_rainbow_2', 'ca_t_j_lake_2', 'ny_silver_lake_2', 'vt_bolton_dome_the', 'az_mt_elden_areas', 'az_west_clear_creek_2', 'ca_lake_george_2', 'co_glacier_gorge_2', 'ny_starbuck_mountain_2', 'az_thumb_butte_boulders', 'ca_bigcone_and_ladybug_canyons_bouldering', 'ca_towers_of_uncertainty_2', 'ca_virgin_islands_area_2', 'ca_geology_tour_road_bouldering', 'ca_loveland_bouldering', 'ca_malibu_creek_state_park_bouldering', 'ca_muffins_boulders', 'ca_queen_mountain_bouldering', 'ca_tenaya_lake_boulders', 'id_owl_rock_bouldering', 'mi_presque_isle_bouldering', 'nv_black_velvet_canyon_boulders', 'nv_moderate_mecca_boulders', 'nv_calico_basin_boulders', 'nv_juniper_canyon_boulders', 'nv_lower_canyon_bouldering', 'nv_oak_creek_canyon_boulders', 'nv_pine_creek_canyon_boulders', 'nv_sandstone_canyon_boulders', 'nv_sandstone_quarry_boulders', 'nv_western_fringe_bouldering', 'vt_upper_west_bouldering', 'wa_morning_rock_bouldering', 'wy_sandstone_boulders', 'ca_hall_of_horrors_area_2', 'wa_summit_area_2', 'ca_boreal_area_2', 'az_council_rocks', 'ca_planet_x_area_2', 'ca_talking_heads_area', 'mi_wetmore_pond', 'az_watson_lake_bouldering', 'ca_love_nest_area_2', 'ca_school_rock_bouldering', 'co_chaos_canyon', 'wa_far_side_boulders', 'az_oasis_the_2', 'ca_king_dome', 'az_rappel_rock', 'ca_central_pinnacles_bouldering', 'ca_voodoo_garden_bouldering_area', 'ak_glenn_highway_2', 'tn_upper_boulders_at_old_wauhatchie_pike', 'vt_revolution_hills', 'ca_carson_peak_2', 'ca_camoflage_forest_and_lake_audrain', 'nv_keyhole_canyon_bouldering', 'wa_kettle_valley_bouldering', 'sd_north_park', 'az_granite_dells_bouldering', 'co_eldora', 'nh_cathedral_ledge_bouldering', 'nh_north_conway_area', 'co_silverton_area', 'co_south_mineral_creek', 'co_cunningham_gulch', 'co_eureka_area', 'nh_rumney', 'nh_triple_corners', 'nh_infinity_wall', 'ak_purinton_creek_2', 'co_big_meadows', 'co_flatirons', 'co_co_ice_mixed', 'co_long_s_peak', 'co_front_range', 'co_north_cheyenne_canyon_2', 'co_colorado_springs_vicinity', 'nh_humphrey_s_ledge_2', 'nh_north_bald_cap', 'nh_sandwich_notch', 'nh_misc', 'nc_whiteside_mountain', 'nc_cashiers_area_ice', 'vt_bone_mountain_2', 'co_ophir', 'co_telluride', 'mn_south_quarry_area', 'vt_black_mountain_2', 'co_bear_creek', 'co_clear_creek_canyon', 'co_colorado_springs', 'co_rifle_mountain_park', 'ct_webb_mountain_park', 'nh_iron_mountain', 'tx_continental_ranch', 'ak_portage_2', 'ak_south_central_alaska_ice_and_alpine', 'co_mt_bierstadt', 'co_staunton_state_park', 'ct_west_rock_state_park', 'mn_mini_fortress_area', 'nh_echo_crag', 'nh_franconia_notch', 'vt_bolton_quarry_2', 'ca_central_joshua_tree', 'ca_echo_rock', 'ca_echo_cove', 'ca_barker_dam_area', 'ca_hidden_valley_campground', 'ca_roadside_rocks_4', 'ca_real_hidden_valley', 'ca_outback_the_2', 'ca_hospital_rock_area', 'ca_rattlesnake_canyon', 'ca_indian_cove', 'ca_group_campsites_road', 'ca_indian_cove_campground', 'ca_lost_horse_area', 'ca_jimmy_cliff', 'ca_quail_springs_area', 'ca_trashcan_rock', 'ct_western_highlands', 'ct_ct_bouldering', 'ct_mattatuck_state_forest', 'id_ross_park', 'mn_duluth_area_rock_and_ice', 'mn_duluth_bouldering', 'nh_the_meadows', 'nh_short_cut_trail', 'nh_newbury_cut_the', 'nh_western_nh', 'ut_sunshine_wall', 'ut_arches_national_park', 'ca_santa_barbara', 'ca_santa_barbara_bouldering', 'mn_bouldering_blue_mounds', 'ny_crane_mountain', 'az_granite_mountain', 'az_sullivan_s_canyon', 'ca_horseshoe_lake_area', 'co_hartman_rocks', 'co_bouldering_areas', 'id_city_of_rocks', 'id_city_of_rocks_bouldering', 'nv_white_rock_spring', 'ut_middle_fork', 'ut_maple_canyon_ice', 'wi_cox_hollow_2', 'wi_g_dodge_ice', 'ca_rainbow', 'ca_t_j_lake', 'co_stanley_canyon', 'ny_silver_lake', 'vt_bolton_dome', 'az_mt_elden_crags', 'az_west_elden', 'az_solitude_canyon', 'az_west_clear_creek', 'ca_lake_george', 'co_glacier_gorge', 'id_elephant_rock', 'ny_k_northern_region', 'ny_c_northwest', 'ny_starbuck_right', 'ak_mendenhall_towers', 'ak_juneau_ice_and_mixed', 'az_thumb_butte', 'ca_bigcone_and_ladybug_canyons', 'ca_tuolumne_meadows', 'ca_tuolumne_bouldering', 'ca_towers_of_uncertainty', 'ca_cave_rock_2', 'ca_virgin_islands_area', 'ca_geology_tour_road', 'ca_south_shore_2', 'ca_loveland', 'ca_malibu_creek_state_park', 'ca_queen_mountain', 'ca_castle_rock_area', 'ca_castle_rock_area_bouldering', 'ca_tenaya_lake_area', 'co_buffalo_creek', 'co_buffalo_creek_bouldering', 'co_west_ridge_the', 'co_eldorado_canyon_bouldering', 'id_owl_rock', 'mi_presque_isle', 'nv_black_velvet_canyon', 'nv_moon_aka_knob_hill_the', 'nv_big_ass_rocks_knob_hill_bouldering', 'nv_calico_basin', 'nv_moderate_mecca_2', 'nv_juniper_canyon', 'nv_lower_canyon', 'nv_oak_creek_canyon', 'nv_pine_creek_canyon', 'nv_sandstone_canyon', 'nv_sandstone_quarry', 'nv_southern_outcrops', 'nv_red_rock_bouldering', 'nv_western_fringe', 'vt_upper_west', 'wa_morning_rock', 'wy_sandstone_the', 'ca_hall_of_horrors_area', 'mi_hogback_mountain', 'mi_marquette_ice', 'ut_box_canyon', 'wa_summit_area', 'ca_boreal_area', 'co_castlewood_canyon_sp', 'co_bouldering_problems', 'nv_echo_falls_area_3', 'nv_kyle_canyon', 'ak_archangel_valley_sport_and_traditional_climbing', 'ak_archangel_bouldering', 'az_council_rocks_2', 'az_west_stronghold', 'az_west_stronghold_bouldering', 'ca_cap_rock_2', 'mi_550_roped', 'ca_planet_x_area', 'ca_sports_challenge_rock', 'ca_talking_heads', 'mi_blueberry_boulders', 'wa_castle_rock_2', 'wa_bouldering_in_tumwater_canyon', 'wv_cotton_hill', 'wv_lower_new_river_gorge_bouldering', 'az_east_stronghold', 'az_east_stronghold_bouldering', 'az_watson_lake', 'ca_hall_of_horrors', 'ca_love_nest_area', 'ca_ryan_campground', 'ca_school_rock', 'co_chaos_canyon_bouldering', 'mi_550_bouldering', 'mt_bear_trap_road_routes', 'mt_bear_trap_road_boulders', 'wa_far_side', 'ca_eastern_rim', 'ca_ice_caves_outer_area', 'az_oasis_the', 'ca_rabbit_warren', 'az_high_rappel_area', 'ca_hungover_wall_2', 'ca_keller_peak_bouldering', 'ca_volcano_boulder_area', 'az_rappel_rock_2', 'co_east_creek_day_use_area', 'co_nine_mile_bouldering', 'co_nine_mile_roped', 'wa_icicle_buttress_and_bob_s_wall', 'wa_bouldering_in_icicle_creek', 'ca_central_pinnacles', 'ca_voodoo_garden')
     and a.path @> t.path;

-- 0. refuse to cascade-delete anybody's data
do $$ declare n int; begin
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
       + (select count(*) from contributions where area_id in (select id from m_drop_area))
       + (select count(*) from topos where area_id in (select id from m_drop_area))
    into n;
  if n > 0 then raise exception '0221: % climber rows point at a row this deletes — stop and repoint them', n; end if;
end $$;

-- 1. merge climbs stored on both sides
update routes k set
  discipline = case when nullif(btrim(k.discipline), '') is null then o.discipline else k.discipline end,
  grade = case when nullif(btrim(k.grade), '') is null then o.grade else k.grade end,
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
  overview = case when nullif(btrim(k.overview), '') is null then o.overview else k.overview end,
  beta = case when nullif(btrim(k.beta), '') is null then o.beta else k.beta end,
  turnaround = case when nullif(btrim(k.turnaround), '') is null then o.turnaround else k.turnaround end,
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
  aid_grade_num = case when k.aid_grade_num is null then o.aid_grade_num else k.aid_grade_num end
from m_merge m join routes o on o.id = m.drop_id
where k.id = m.keep;

delete from routes o using m_merge m
 where o.id = m.drop_id and exists (select 1 from routes k where k.id = m.keep);

-- 2. move the rest, and re-parent
update routes r set area_id = m.to_area from m_move m where r.id = m.id and r.area_id = m.from_area;
update areas set parent_id = 'mn_carlton_peak' where parent_id = 'mn_carlton_peak_2';

-- 3. the copy areas, once empty
delete from areas a using m_drop_area d
 where a.id = d.id
   and not exists (select 1 from routes where area_id = a.id)
   and not exists (select 1 from areas s where s.parent_id = a.id);

-- ── PART B: fold every remaining same-name pair into ONE area ──────────────────────────
-- A climb that shares a name with a DIFFERENT climb (Centerfold 5.4 trad / Centerfold WI3) now
-- sits in the same area as it, which the duplicate trigger would refuse; both are real, so the
-- trigger is bypassed for this transaction only. Renames/re-parents/moves run in planned order.
set local catalog.allow_duplicate = 'on';
update areas set parent_id = 'co_eldora' where id = 'co_hessie';
update areas set parent_id = 'nh_cathedral_ledge_bouldering' where id = 'nh_cathedral_ledge_ice_climbs';
update areas set parent_id = 'co_silverton_area' where id = 'co_us_highway_550_south_of_silverton';
update areas set name = 'South Mineral Creek Ice Climbs' where id = 'co_south_mineral_creek_2' and name = 'South Mineral Creek';
update areas set parent_id = 'co_south_mineral_creek' where id = 'co_south_mineral_creek_2';
update areas set parent_id = 'co_silverton_area' where id = 'co_cement_creek_2';
update areas set parent_id = 'co_silverton_area' where id = 'co_deer_park_creek_falls';
update areas set parent_id = 'co_silverton_area' where id = 'co_arrastra_gulch';
update areas set parent_id = 'co_silverton_area' where id = 'co_electric_peak';
update areas set parent_id = 'co_silverton_area' where id = 'co_maggie_gulch';
update areas set parent_id = 'co_silverton_area' where id = 'co_minnie_gulch';
update areas set name = 'Cunningham Gulch Ice Climbs' where id = 'co_cunningham_gulch_2' and name = 'Cunningham Gulch';
update areas set parent_id = 'co_cunningham_gulch' where id = 'co_cunningham_gulch_2';
update areas set parent_id = 'co_eureka_area' where id = 'co_eureka';
update areas set parent_id = 'nh_rumney' where id = 'nh_polar_caves_closed';
update areas set parent_id = 'nh_rumney' where id = 'nh_jobsite_the';
update routes set area_id = 'nh_jobsite_the' where id = 'nh_the_jobsite_hardly_working' and area_id = 'nh_the_jobsite';
update routes set area_id = 'nh_jobsite_the' where id = 'nh_the_jobsite_the_jobsite' and area_id = 'nh_the_jobsite';
update routes set area_id = 'nh_jobsite_the' where id = 'nh_the_jobsite_give_em_a_break' and area_id = 'nh_the_jobsite';
update areas set parent_id = 'nh_rumney' where id = 'nh_apocalypse_wall';
update areas set parent_id = 'nh_rumney' where id = 'nh_main_cliff_left_venus_wall';
update routes set area_id = 'nh_the_parking_lot_wall' where id = 'nh_parking_lot_wall_centerfold' and area_id = 'nh_parking_lot_wall';
update routes set area_id = 'nh_the_parking_lot_wall' where id = 'nh_parking_lot_wall_scottish_gully' and area_id = 'nh_parking_lot_wall';
update routes set area_id = 'nh_the_parking_lot_wall' where id = 'nh_parking_lot_wall_iced_coffee' and area_id = 'nh_parking_lot_wall';
update routes set area_id = 'nh_the_parking_lot_wall' where id = 'nh_parking_lot_wall_shaelyn_s_way' and area_id = 'nh_parking_lot_wall';
update routes set area_id = 'nh_the_parking_lot_wall' where id = 'nh_parking_lot_wall_percolator' and area_id = 'nh_parking_lot_wall';
update routes set area_id = 'nh_the_parking_lot_wall' where id = 'nh_parking_lot_wall_left_of_meadows_flows_name' and area_id = 'nh_parking_lot_wall';
update routes set area_id = 'nh_the_parking_lot_wall' where id = 'nh_parking_lot_wall_scottish_curtain' and area_id = 'nh_parking_lot_wall';
update routes set area_id = 'nh_the_parking_lot_wall' where id = 'nh_parking_lot_wall_meadows_center_flow' and area_id = 'nh_parking_lot_wall';
update routes set area_id = 'nh_the_parking_lot_wall' where id = 'nh_parking_lot_wall_franky_lee' and area_id = 'nh_parking_lot_wall';
update routes set area_id = 'nh_the_parking_lot_wall' where id = 'nh_parking_lot_wall_barbados' and area_id = 'nh_parking_lot_wall';
update routes set area_id = 'nh_the_parking_lot_wall' where id = 'nh_parking_lot_wall_the_meadow_flows' and area_id = 'nh_parking_lot_wall';
update routes set area_id = 'nh_the_parking_lot_wall' where id = 'nh_the_chimney_3' and area_id = 'nh_parking_lot_wall';
update areas set name = 'Triple Corners Ice Climbs' where id = 'nh_triple_corners_2' and name = 'Triple Corners';
update areas set parent_id = 'nh_triple_corners' where id = 'nh_triple_corners_2';
update routes set area_id = 'nh_orange_crush' where id = 'nh_orange_crush_crag_jaws' and area_id = 'nh_orange_crush_crag';
update areas set parent_id = 'nh_rumney' where id = 'nh_true_summit_ledges_utopia_area';
update areas set parent_id = 'nh_rumney' where id = 'nh_upper_darth_vader_aka_hendrix_lee';
update areas set name = 'Infinity Wall Ice Climbs' where id = 'nh_infinity_wall_2' and name = 'Infinity Wall';
update areas set parent_id = 'nh_infinity_wall' where id = 'nh_infinity_wall_2';
update areas set parent_id = 'nh_rumney' where id = 'nh_beyond_infinity_wall';
update areas set parent_id = 'nh_rumney' where id = 'nh_yellowknife_gully';
update areas set parent_id = 'nh_rumney' where id = 'nh_summit_cliff_ice_and_mixed';
update areas set parent_id = 'nh_rumney' where id = 'nh_roadside_ice';
update areas set name = 'Purinton Creek Ice Climbs' where id = 'ak_purinton_creek_3' and name = 'Purinton Creek';
update areas set parent_id = 'ak_purinton_creek_2' where id = 'ak_purinton_creek_3';
update areas set parent_id = 'co_big_meadows' where id = 'co_upper_tier_6';
update areas set parent_id = 'co_big_meadows' where id = 'co_lower_tier_5';
update areas set name = 'Flatirons Ice Climbs' where id = 'co_flatirons_2' and name = 'Flatirons';
update areas set parent_id = 'co_flatirons' where id = 'co_flatirons_2';
update areas set name = 'Long''s Peak Other Climbs' where id = 'co_longs_peak' and name = 'Longs Peak';
update areas set parent_id = 'co_long_s_peak' where id = 'co_longs_peak';
update areas set name = 'North Cheyenne Canyon Ice Climbs' where id = 'co_north_cheyenne_canyon' and name = 'North Cheyenne Canyon';
update areas set parent_id = 'co_north_cheyenne_canyon_2' where id = 'co_north_cheyenne_canyon';
update areas set name = 'Humphrey''s Ledge Ice Climbs' where id = 'nh_humphrey_s_ledge' and name = 'Humphrey''s Ledge';
update areas set parent_id = 'nh_humphrey_s_ledge_2' where id = 'nh_humphrey_s_ledge';
update areas set parent_id = 'nh_north_bald_cap' where id = 'nh_3_yukon_gold_butress';
update areas set parent_id = 'nh_north_bald_cap' where id = 'nh_3_yukon_gold_buttress';
update areas set parent_id = 'nh_north_bald_cap' where id = 'nh_2_bald_cap_slabs';
update areas set parent_id = 'nh_north_bald_cap' where id = 'nh_1_the_motherlode';
update areas set parent_id = 'nh_sandwich_notch' where id = 'nh_sandwich_notch_ice';
update areas set parent_id = 'nc_whiteside_mountain' where id = 'nc_whiteside_ice';
update areas set parent_id = 'vt_bone_mountain_2' where id = 'vt_solstice_slab';
update areas set parent_id = 'vt_bone_mountain_2' where id = 'vt_big_splint_area';
update routes set area_id = 'co_flatirons_2' where id = 'co_flatirons_ice_climbing_call_the_copps' and area_id = 'co_flatirons_ice_climbing';
update routes set area_id = 'co_flatirons_2' where id = 'co_flatirons_ice_climbing_east_face_gully_aka_silk_road' and area_id = 'co_flatirons_ice_climbing';
update routes set area_id = 'co_flatirons_2' where id = 'co_flatirons_ice_climbing_east_face_left_side_aka_pink_dreams' and area_id = 'co_flatirons_ice_climbing';
update routes set area_id = 'co_flatirons_2' where id = 'co_flatirons_ice_climbing_the_copp_out' and area_id = 'co_flatirons_ice_climbing';
update routes set area_id = 'co_flatirons_2' where id = 'co_flatirons_ice_climbing_flatirons_ice_climbing_4835' and area_id = 'co_flatirons_ice_climbing';
update routes set area_id = 'co_flatirons_2' where id = 'co_flatirons_ice_climbing_mous_ka_tears' and area_id = 'co_flatirons_ice_climbing';
update routes set area_id = 'co_flatirons_2' where id = 'co_flatirons_ice_climbing_off_the_hook' and area_id = 'co_flatirons_ice_climbing';
update areas set parent_id = 'co_ophir' where id = 'co_ophir_area';
update routes set area_id = 'co_quandary_peak' where id = 'co_quandary_ice_crag_trucksicle' and area_id = 'co_quandary_ice_crag';
update routes set area_id = 'co_quandary_peak' where id = 'co_quandary_ice_crag_bourbon_beaver' and area_id = 'co_quandary_ice_crag';
update routes set area_id = 'co_split_rock' where id = 'co_center_route_boulder' and area_id = 'co_split_rock_area';
update areas set parent_id = 'mn_south_quarry_area' where id = 'mn_craig_s_cave';
update areas set parent_id = 'mn_south_quarry_area' where id = 'mn_blank_the';
update routes set area_id = 'tn_asteroid_2' where id = 'tn_galaga' and area_id = 'tn_asteroid';
update routes set area_id = 'tn_asteroid_2' where id = 'tn_one_small_step' and area_id = 'tn_asteroid';
update routes set area_id = 'tn_asteroid_2' where id = 'tn_line_rider' and area_id = 'tn_asteroid';
update areas set parent_id = 'vt_black_mountain_2' where id = 'vt_black_mountain_central';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_the_tablets_right' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_the_tablets_left' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_renormalization' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_float_like_a_butterfly_land_like_a_tomato' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_twenty_below_zero_gully' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_crazy_diamond' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_last_gentleman' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_who_s_who_in_outer_space' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_glass_menagerie' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_plug_and_chug' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_reign_of_terror' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_extensive_homology' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_stormy_monday' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_called_on_account_of_rains' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_mindbender' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_the_promenade' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_china_shop' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_bullwinkle' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_tiny_dancer' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_five_musketeers' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_call_of_the_wild' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_raven_buttress' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_aurora' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_mount_pisgah_the_tablets_center' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_zephyr' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'vt_pisgah_crag' where id = 'vt_shaker_heights' and area_id = 'vt_mount_pisgah';
update routes set area_id = 'co_almost_a_tunnel' where id = 'co_almost_a_boulder' and area_id = 'co_almost_a_tunnel_2';
update areas set name = 'Bear Creek Ice Climbs' where id = 'co_bear_creek_2' and name = 'Bear Creek';
update areas set parent_id = 'co_bear_creek' where id = 'co_bear_creek_2';
update areas set parent_id = 'co_clear_creek_canyon' where id = 'co_coors_ultra_light';
update areas set parent_id = 'co_clear_creek_canyon' where id = 'co_beer_garden_2';
update areas set parent_id = 'co_clear_creek_canyon' where id = 'co_aqueduct_flows';
update areas set parent_id = 'co_clear_creek_canyon' where id = 'co_mayhem_gulch';
update areas set parent_id = 'co_clear_creek_canyon' where id = 'co_blue_moon';
update areas set parent_id = 'co_clear_creek_canyon' where id = 'co_secret_waterfall_aka_windy_saddle_ice_flow';
update routes set area_id = 'co_little_eiger' where id = 'co_little_eiger_area_ice_coors_light_exit_crack' and area_id = 'co_little_eiger_area_ice';
update routes set area_id = 'co_little_eiger' where id = 'co_little_eiger_area_ice_coors_lite' and area_id = 'co_little_eiger_area_ice';
update routes set area_id = 'co_little_eiger' where id = 'co_little_eiger_area_ice_mickey_s_big_mouth' and area_id = 'co_little_eiger_area_ice';
update routes set area_id = 'co_little_eiger' where id = 'co_little_eiger_area_ice_red_stripe' and area_id = 'co_little_eiger_area_ice';
update routes set area_id = 'co_little_eiger' where id = 'co_little_eiger_area_ice_maharaja' and area_id = 'co_little_eiger_area_ice';
update areas set parent_id = 'co_clear_creek_canyon' where id = 'co_m3_crag';
update routes set area_id = 'co_elephant_rock' where id = 'co_southeast_undercling' and area_id = 'co_elephant_rock_2';
update routes set area_id = 'co_elephant_rock' where id = 'co_southwest_corner_6' and area_id = 'co_elephant_rock_2';
update areas set parent_id = 'co_colorado_springs' where id = 'co_pike_s_peak';
update areas set name = 'Pike''s Peak Routes' where id = 'co_pike_s_peak_2' and name = 'Pike''s Peak';
update areas set parent_id = 'co_pike_s_peak' where id = 'co_pike_s_peak_2';
update areas set parent_id = 'co_rifle_mountain_park' where id = 'co_west_side_of_the_canyon';
update areas set parent_id = 'ct_webb_mountain_park' where id = 'ct_old_fish_house_road';
update areas set parent_id = 'ct_webb_mountain_park' where id = 'ct_red_trail_section';
update routes set area_id = 'ct_blue_trail_section' where id = 'ct_arborator' and area_id = 'ct_blue_trail_section_2';
update areas set name = 'Iron Mountain Ice Climbs' where id = 'nh_iron_mtn' and name = 'Iron Mtn';
update areas set parent_id = 'nh_iron_mountain' where id = 'nh_iron_mtn';
update areas set name = 'Emerald Pools Sector Other Climbs' where id = 'tx_emerald_pools_sector' and name = 'Emerald Pools Sector';
update areas set parent_id = 'tx_emerald_pools_sector_2' where id = 'tx_emerald_pools_sector';
update routes set area_id = 'wi_eau_claire' where id = 'wi_eau_claire_ice_water_tool' and area_id = 'wi_eau_claire_ice';
update areas set name = 'Portage Ice Climbs' where id = 'ak_portage_4' and name = 'Portage';
update areas set parent_id = 'ak_portage_2' where id = 'ak_portage_4';
update routes set area_id = 'ca_buck_rock' where id = 'ca_vlad_s_crimps' and area_id = 'ca_buck_rock_2';
update areas set parent_id = 'co_mt_bierstadt' where id = 'co_bierstadt_ice';
update areas set parent_id = 'co_staunton_state_park' where id = 'co_staunton_state_park_ice';
update areas set parent_id = 'ct_west_rock_state_park' where id = 'ct_toni_harp_bloc';
update areas set parent_id = 'ct_west_rock_state_park' where id = 'ct_wintergreen';
update areas set parent_id = 'ct_west_rock_state_park' where id = 'ct_judges_cave';
update areas set parent_id = 'ct_west_rock_state_park' where id = 'ct_tj_s_bar_and_grill';
update areas set parent_id = 'ct_west_rock_state_park' where id = 'ct_god_s_country';
update areas set parent_id = 'mn_mini_fortress_area' where id = 'mn_no_name_balancing_boulder';
update areas set parent_id = 'mn_mini_fortress_area' where id = 'mn_lover_s_fortress';
update areas set parent_id = 'mn_mini_fortress_area' where id = 'mn_tetris';
update areas set parent_id = 'mn_mini_fortress_area' where id = 'mn_red_green_show';
update areas set parent_id = 'mn_mini_fortress_area' where id = 'mn_trump_boulders';
update areas set parent_id = 'nh_echo_crag' where id = 'nh_echo_crag_ice_climbs';
update areas set name = 'Painted Canyon Sector Other Climbs' where id = 'tx_painted_canyon_sector' and name = 'Painted Canyon Sector';
update areas set parent_id = 'tx_painted_canyon_sector_2' where id = 'tx_painted_canyon_sector';
update areas set parent_id = 'vt_bolton_quarry_2' where id = 'vt_schoolyard';
update areas set parent_id = 'vt_bolton_quarry_2' where id = 'vt_main_quarry';
update areas set parent_id = 'vt_bolton_quarry_2' where id = 'vt_lower_quarry';
update routes set area_id = 'al_grotto' where id = 'al_the_grotto_bouldering_trump_hands' and area_id = 'al_the_grotto_bouldering';
update routes set area_id = 'al_grotto' where id = 'al_the_grotto_bouldering_cormany_slab' and area_id = 'al_the_grotto_bouldering';
update routes set area_id = 'al_grotto' where id = 'al_the_grotto_bouldering_a_fin_problem' and area_id = 'al_the_grotto_bouldering';
update routes set area_id = 'al_grotto' where id = 'al_the_grotto_bouldering_switchback' and area_id = 'al_the_grotto_bouldering';
update routes set area_id = 'al_grotto' where id = 'al_the_grotto_bouldering_squatter' and area_id = 'al_the_grotto_bouldering';
update routes set area_id = 'al_grotto' where id = 'al_the_grotto_bouldering_aircraft_carrier' and area_id = 'al_the_grotto_bouldering';
update routes set area_id = 'al_grotto' where id = 'al_that_one_bolt_boulder' and area_id = 'al_grotto_bouldering_the';
update areas set parent_id = 'ca_central_joshua_tree' where id = 'ca_cap_rock_bouldering';
update areas set parent_id = 'ca_echo_rock' where id = 'ca_necco_boulder';
update areas set parent_id = 'ca_echo_rock' where id = 'ca_beak_rock';
update areas set parent_id = 'ca_echo_rock' where id = 'ca_big_dike_boulders';
update areas set parent_id = 'ca_echo_rock' where id = 'ca_echo_rock_proper';
update areas set parent_id = 'ca_echo_rock' where id = 'ca_gumdrop_the_2';
update areas set parent_id = 'ca_echo_rock' where id = 'ca_master_cylinder';
update areas set parent_id = 'ca_echo_rock' where id = 'ca_value_boulder';
update areas set parent_id = 'ca_echo_cove' where id = 'ca_classic_thin_crack_boulder';
update areas set parent_id = 'ca_echo_cove' where id = 'ca_arete_boulders';
update areas set parent_id = 'ca_echo_cove' where id = 'ca_big_moe_wall';
update areas set parent_id = 'ca_echo_cove' where id = 'ca_coyote_corner_2';
update areas set parent_id = 'ca_echo_cove' where id = 'ca_igneous_boulder';
update areas set parent_id = 'ca_echo_cove' where id = 'ca_land_of_the_lost_boulder';
update areas set parent_id = 'ca_echo_cove' where id = 'ca_smith_rock_2';
update areas set parent_id = 'ca_central_joshua_tree' where id = 'ca_hall_of_horrors_bouldering';
update areas set parent_id = 'ca_central_joshua_tree' where id = 'ca_lonesome_crowded_west';
update areas set parent_id = 'ca_central_joshua_tree' where id = 'ca_stonehenge_and_fry_boulders';
update areas set parent_id = 'ca_central_joshua_tree' where id = 'ca_planet_x_bouldering';
update areas set parent_id = 'ca_barker_dam_area' where id = 'ca_yoda_head_boulder';
update areas set parent_id = 'ca_barker_dam_area' where id = 'ca_gunsmoke_area_2';
update areas set name = 'Gunsmoke Area Routes' where id = 'ca_gunsmoke_area' and name = 'Gunsmoke Area';
update areas set parent_id = 'ca_gunsmoke_area_2' where id = 'ca_gunsmoke_area';
update areas set parent_id = 'ca_barker_dam_area' where id = 'ca_indian_wave_boulders';
update areas set parent_id = 'ca_barker_dam_area' where id = 'ca_barker_dam_boulders';
update areas set parent_id = 'ca_barker_dam_area' where id = 'ca_alisters_cave';
update areas set parent_id = 'ca_barker_dam_area' where id = 'ca_crack_a_no_no_area';
update areas set parent_id = 'ca_barker_dam_area' where id = 'ca_lost_and_found_corridor';
update areas set parent_id = 'ca_central_joshua_tree' where id = 'ca_ryan_campground_bouldering';
update areas set parent_id = 'ca_hidden_valley_campground' where id = 'ca_hvcg_bouldering_circuit';
update areas set parent_id = 'ca_hidden_valley_campground' where id = 'ca_manx_asteroid_belt_circuit';
update areas set parent_id = 'ca_roadside_rocks_4' where id = 'ca_pacifier_and_the_nostril';
update areas set parent_id = 'ca_roadside_rocks_4' where id = 'ca_chunky_boulder_and_trance_stone';
update areas set parent_id = 'ca_roadside_rocks_4' where id = 'ca_jbmf_boulders';
update areas set parent_id = 'ca_roadside_rocks_4' where id = 'ca_pepboys_boulder';
update areas set parent_id = 'ca_roadside_rocks_4' where id = 'ca_texas_boulder';
update areas set parent_id = 'ca_roadside_rocks_4' where id = 'ca_melon_boulder';
update areas set parent_id = 'ca_roadside_rocks_4' where id = 'ca_bullet_proof_boulder';
update areas set parent_id = 'ca_real_hidden_valley' where id = 'ca_turtle_rock_circuit';
update areas set parent_id = 'ca_real_hidden_valley' where id = 'ca_semi_precious_bouldering';
update areas set parent_id = 'ca_real_hidden_valley' where id = 'ca_real_hidden_valley_circuit';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_under_lizzy_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_yabba_dabba_don_t_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_cole_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_gizmo_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_hobbit_hole_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_hooker_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_miledi_rock';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_powell_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_tilt_o_meter_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_iron_door_cave_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_laura_scudder_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_lizzie_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_amoeba_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_family_boulder_2';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_dino_s_egg';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_white_rastafarian_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_voices_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_tidal_wave_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_mutant_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_without_a_trace_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_romp_roof';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_scorpion_roof';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_wilson_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_purina_wall';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_rasta_city';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_chuckawalla_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_animal_boulder_3';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_false_hueco_boulder';
update areas set parent_id = 'ca_outback_the_2' where id = 'ca_dike_boulder_3';
update areas set parent_id = 'ca_hospital_rock_area' where id = 'ca_parking_lot_boulder_the';
update areas set parent_id = 'ca_hospital_rock_area' where id = 'ca_fat_darrell_sandwich';
update areas set parent_id = 'ca_hospital_rock_area' where id = 'ca_cave_boulder_4';
update areas set parent_id = 'ca_rattlesnake_canyon' where id = 'ca_tuolumne_boulder';
update areas set parent_id = 'ca_indian_cove' where id = 'ca_49_palms_oasis_area';
update routes set area_id = 'ca_group_camp_short_wall' where id = 'ca_love_crack_2' and area_id = 'ca_group_camp_short_wall_2';
update areas set parent_id = 'ca_group_campsites_road' where id = 'ca_group_camp_1_boulders';
update areas set parent_id = 'ca_indian_cove_campground' where id = 'ca_western_wilderness_boulders';
update areas set parent_id = 'ca_indian_cove_campground' where id = 'ca_varnished_wall_boulders';
update areas set name = 'Varnished Wall' where id = 'ca_varnished_wall_boulders' and name = 'Varnished Wall Boulders';
update areas set name = 'Varnished Wall Routes' where id = 'ca_varnished_wall' and name = 'Varnished Wall';
update areas set parent_id = 'ca_varnished_wall_boulders' where id = 'ca_varnished_wall';
update areas set parent_id = 'ca_indian_cove_campground' where id = 'ca_picnic_boulder';
update areas set parent_id = 'ca_indian_cove_campground' where id = 'ca_feudal_boulder';
update areas set parent_id = 'ca_indian_cove_campground' where id = 'ca_campfire_crag_boulder';
update areas set parent_id = 'ca_indian_cove_campground' where id = 'ca_callous_boulder';
update areas set parent_id = 'ca_indian_cove_campground' where id = 'ca_pixie_boulder';
update areas set parent_id = 'ca_indian_cove' where id = 'ca_lehi_s_wilderness';
update areas set parent_id = 'ca_lost_horse_area' where id = 'ca_atlantis_boulder_2';
update areas set parent_id = 'ca_lost_horse_area' where id = 'ca_cheese_boulder';
update areas set parent_id = 'ca_lost_horse_area' where id = 'ca_yabo_boulder_the';
update areas set parent_id = 'ca_lost_horse_area' where id = 'ca_lost_horse_mantle_boulder';
update areas set parent_id = 'ca_lost_horse_area' where id = 'ca_mel_s_diner_boulder';
update areas set parent_id = 'ca_lost_horse_area' where id = 'ca_blas_beemer_area';
update areas set parent_id = 'ca_lost_horse_area' where id = 'ca_hemingway_boulders';
update areas set parent_id = 'ca_lost_horse_area' where id = 'ca_big_bud_boulder';
update areas set parent_id = 'ca_jimmy_cliff' where id = 'ca_penguins_boulder';
update areas set parent_id = 'ca_jimmy_cliff' where id = 'ca_scoop_boulder_2';
update areas set parent_id = 'ca_jimmy_cliff' where id = 'ca_ankle_breaker_rock';
update areas set parent_id = 'ca_jimmy_cliff' where id = 'ca_doctor_boulder_the';
update areas set parent_id = 'ca_jimmy_cliff' where id = 'ca_north_of_jerry_cliff';
update areas set parent_id = 'ca_jimmy_cliff' where id = 'ca_marley_boulder';
update areas set parent_id = 'ca_jimmy_cliff' where id = 'ca_dysfunction_boulder';
update areas set parent_id = 'ca_jimmy_cliff' where id = 'ca_equine_boulder';
update areas set parent_id = 'ca_jimmy_cliff' where id = 'ca_bandulo_block';
update areas set parent_id = 'ca_jimmy_cliff' where id = 'ca_jimmy_cliff_boulder';
update areas set parent_id = 'ca_jimmy_cliff' where id = 'ca_humanitarian_boulder';
update areas set parent_id = 'ca_jimmy_cliff' where id = 'ca_unmentionable_the_2';
update areas set parent_id = 'ca_quail_springs_area' where id = 'ca_west_entrance_boulder';
update areas set parent_id = 'ca_quail_springs_area' where id = 'ca_psycho_boulders';
update areas set parent_id = 'ca_quail_springs_area' where id = 'ca_chocolate_boulders';
update areas set parent_id = 'ca_quail_springs_area' where id = 'ca_embryo_area';
update areas set parent_id = 'ca_quail_springs_area' where id = 'ca_lonely_stones_1';
update areas set parent_id = 'ca_quail_springs_area' where id = 'ca_miledi_boulders';
update areas set parent_id = 'ca_quail_springs_area' where id = 'ca_outer_rim_the';
update areas set parent_id = 'ca_trashcan_rock' where id = 'ca_zen_boulder';
update areas set parent_id = 'ca_trashcan_rock' where id = 'ca_dover_cliffs_boulder';
update areas set parent_id = 'ca_trashcan_rock' where id = 'ca_trashcan_boulders';
update areas set parent_id = 'ca_trashcan_rock' where id = 'ca_forgotten_boulders';
update areas set parent_id = 'ca_quail_springs_area' where id = 'ca_afpa_rock_area';
update areas set parent_id = 'ca_afpa_rock_area' where id = 'ca_afpa_rock';
update areas set parent_id = 'ct_western_highlands' where id = 'ct_diamond_ledge_bouldering';
update areas set name = 'Diamond Ledge' where id = 'ct_diamond_ledge_bouldering' and name = 'Diamond Ledge Bouldering';
update areas set name = 'Diamond Ledge Routes' where id = 'ct_diamond_ledge' and name = 'Diamond Ledge';
update areas set parent_id = 'ct_diamond_ledge_bouldering' where id = 'ct_diamond_ledge';
update areas set parent_id = 'ct_mattatuck_state_forest' where id = 'ct_sunset_boulders';
update areas set parent_id = 'ct_mattatuck_state_forest' where id = 'ct_east_of_naugatuck_river';
update areas set parent_id = 'ct_mattatuck_state_forest' where id = 'ct_d_d_cave';
update areas set parent_id = 'id_ross_park' where id = 'id_aquatic_complex_zoo';
update areas set parent_id = 'mn_duluth_area_rock_and_ice' where id = 'mn_ely_s_peak_bouldering';
update areas set name = 'Ely''s Peak' where id = 'mn_ely_s_peak_bouldering' and name = 'Ely''s Peak Bouldering';
update areas set name = 'Ely''s Peak Routes' where id = 'mn_ely_s_peak' and name = 'Ely''s Peak';
update areas set parent_id = 'mn_ely_s_peak_bouldering' where id = 'mn_ely_s_peak';
update areas set parent_id = 'nh_the_meadows' where id = 'nh_hells_kitchen';
update areas set parent_id = 'nh_the_meadows' where id = 'nh_apocalypse_boulder';
update areas set parent_id = 'nh_the_meadows' where id = 'nh_meat_grinder_boulders_the';
update areas set parent_id = 'nh_rumney' where id = 'nh_monsters_from_the_id_bouldering';
update areas set name = 'Monsters from the Id' where id = 'nh_monsters_from_the_id_bouldering' and name = 'Monsters From the Id Bouldering';
update areas set name = 'Monsters from the Id Routes' where id = 'nh_monsters_from_the_id' and name = 'Monsters from the Id';
update areas set parent_id = 'nh_monsters_from_the_id_bouldering' where id = 'nh_monsters_from_the_id';
update areas set parent_id = 'nh_newbury_cut_the' where id = 'nh_newbury_cut_ice_mixed';
update areas set parent_id = 'ut_sunshine_wall' where id = 'ut_sunshine_wall_boulders';
update routes set area_id = 'ca_castle_rock_proper' where id = 'ca_between_a_stump_and_a_hard_place' and area_id = 'ca_castle_rock_proper_2';
update routes set area_id = 'ca_castle_rock_proper' where id = 'ca_thunderdumb' and area_id = 'ca_castle_rock_proper_2';
update routes set area_id = 'ca_castle_rock_proper' where id = 'ca_red_rocket' and area_id = 'ca_castle_rock_proper_2';
update routes set area_id = 'ca_castle_rock_proper' where id = 'ca_duct_tape' and area_id = 'ca_castle_rock_proper_2';
update routes set area_id = 'ca_castle_rock_proper' where id = 'ca_waimea_wall' and area_id = 'ca_castle_rock_proper_2';
update routes set area_id = 'ca_castle_rock_proper' where id = 'ca_waimea_wall_right' and area_id = 'ca_castle_rock_proper_2';
update routes set area_id = 'ca_castle_rock_proper' where id = 'ca_the_block' and area_id = 'ca_castle_rock_proper_2';
update routes set area_id = 'ca_castle_rock_proper' where id = 'ca_unknown_v0' and area_id = 'ca_castle_rock_proper_2';
update routes set area_id = 'ca_castle_rock_proper' where id = 'ca_cave_roof' and area_id = 'ca_castle_rock_proper_2';
update routes set area_id = 'ca_castle_rock_proper' where id = 'ca_yabo' and area_id = 'ca_castle_rock_proper_2';
update routes set area_id = 'ca_castle_rock_proper' where id = 'ca_the_project' and area_id = 'ca_castle_rock_proper_2';
update routes set area_id = 'ca_castle_rock_proper' where id = 'ca_north_shore_aka_waimea_arete' and area_id = 'ca_castle_rock_proper_2';
update areas set parent_id = 'ca_santa_barbara' where id = 'ca_potter_s_point_2';
update areas set name = 'Potter''s Point Routes' where id = 'ca_potter_s_point' and name = 'Potter''s Point';
update areas set parent_id = 'ca_potter_s_point_2' where id = 'ca_potter_s_point';
update routes set area_id = 'co_arapahoe_peaks' where id = 'co_arapahoe_peaks_2_skyclogger_couloir' and area_id = 'co_arapahoe_peaks_2';
update routes set area_id = 'co_arapahoe_peaks' where id = 'co_vader_couloir' and area_id = 'co_arapahoe_peaks_2';
update routes set area_id = 'il_a_gill_roof_area' where id = 'il_pinch_me' and area_id = 'il_a_gill_roof';
update routes set area_id = 'il_a_gill_roof_area' where id = 'il_standard_2' and area_id = 'il_a_gill_roof';
update routes set area_id = 'il_a_gill_roof_area' where id = 'il_devils_traverse' and area_id = 'il_a_gill_roof';
update routes set area_id = 'il_a_gill_roof_area' where id = 'il_leashless_angel' and area_id = 'il_a_gill_roof';
update routes set area_id = 'il_a_gill_roof_area' where id = 'il_devil_on_a_leash' and area_id = 'il_a_gill_roof';
update routes set area_id = 'il_a_gill_roof_area' where id = 'il_gill_warm_up' and area_id = 'il_a_gill_roof';
update routes set area_id = 'il_a_gill_roof_area' where id = 'il_gill_roof_traverse' and area_id = 'il_a_gill_roof';
update areas set parent_id = 'mn_south_quarry_area' where id = 'mn_bur_oak_trail_2';
update areas set name = 'Bur Oak Trail Routes' where id = 'mn_bur_oak_trail' and name = 'Bur Oak Trail';
update areas set parent_id = 'mn_bur_oak_trail_2' where id = 'mn_bur_oak_trail';
update areas set parent_id = 'ny_crane_mountain' where id = 'ny_southeast_slopes';
update areas set parent_id = 'ny_crane_mountain' where id = 'ny_southwest_slopes';
update routes set area_id = 'ak_cracked_ice' where id = 'ak_unknown_12' and area_id = 'ak_cracked_ice_2';
update routes set area_id = 'ak_sunshine_ridge' where id = 'ak_sunshine_ridge_area_sunshine_smears' and area_id = 'ak_sunshine_ridge_area';
update routes set area_id = 'ak_sunshine_ridge' where id = 'ak_sunshine_ridge_area_yellow_fever' and area_id = 'ak_sunshine_ridge_area';
update areas set parent_id = 'az_granite_mountain' where id = 'az_granite_basin_lake';
update areas set parent_id = 'az_granite_mountain' where id = 'az_mint_wash';
update areas set parent_id = 'az_granite_mountain' where id = 'az_serengeti';
update areas set parent_id = 'az_sullivan_s_canyon' where id = 'az_gully_boulders_the';
update areas set parent_id = 'ca_horseshoe_lake_area' where id = 'ca_horseshoe_slabs_boulder';
update areas set parent_id = 'ca_horseshoe_lake_area' where id = 'ca_dog_boulder';
update areas set parent_id = 'co_hartman_rocks' where id = 'co_bambi_s_trail_area';
update areas set parent_id = 'co_bambi_s_trail_area' where id = 'co_bambi_s_trail';
update areas set parent_id = 'id_city_of_rocks' where id = 'id_checkered_demon_2';
update areas set name = 'Checkered Demon Routes' where id = 'id_checkered_demon' and name = 'Checkered Demon';
update areas set parent_id = 'id_checkered_demon_2' where id = 'id_checkered_demon';
update areas set parent_id = 'nv_white_rock_spring' where id = 'nv_stooge_boulders';
update areas set parent_id = 'nv_white_rock_spring' where id = 'nv_space_oddity';
update areas set parent_id = 'nv_white_rock_spring' where id = 'nv_supple_leopard';
update areas set parent_id = 'nv_white_rock_spring' where id = 'nv_ziggy_stardust';
update routes set area_id = 'ny_loon_lake_mtn' where id = 'ny_loon_lake_mt_winter_plumage' and area_id = 'ny_loon_lake_mt';
update routes set area_id = 'ny_upper_washbowl_cliff' where id = 'ny_upper_washbowl_cliff_ice_the_apparition' and area_id = 'ny_upper_washbowl_cliff_ice';
update areas set parent_id = 'ut_middle_fork' where id = 'ut_the_middle_fork_ice_climbs';
update areas set name = 'Cox Hollow Ice Climbs' where id = 'wi_cox_hollow' and name = 'Cox Hollow';
update areas set parent_id = 'wi_cox_hollow_2' where id = 'wi_cox_hollow';
update areas set parent_id = 'ca_rainbow' where id = 'ca_parking_lot_boulder_3';
update areas set parent_id = 'ca_rainbow' where id = 'ca_main_boulders_2';
update areas set parent_id = 'ca_rainbow' where id = 'ca_soda_punk_boulder';
update areas set parent_id = 'ca_rainbow' where id = 'ca_upper_rainbow';
update areas set parent_id = 'ca_rainbow' where id = 'ca_double_wide';
update areas set parent_id = 'ca_rainbow' where id = 'ca_trigantor';
update areas set parent_id = 'ca_rainbow' where id = 'ca_ginja_ninja';
update areas set parent_id = 'ca_rainbow' where id = 'ca_sugar_cube';
update areas set parent_id = 'ca_t_j_lake' where id = 'ca_t_j_slabs';
update areas set parent_id = 'ca_t_j_lake' where id = 'ca_lake_boulder';
update areas set parent_id = 'ca_t_j_lake' where id = 'ca_medicine_boulder';
update areas set parent_id = 'ca_t_j_lake' where id = 'ca_spoon_boulder';
update areas set parent_id = 'ca_t_j_lake' where id = 'ca_killer_wall';
update areas set parent_id = 'co_stanley_canyon' where id = 'co_stanley_canyon_ice';
update areas set parent_id = 'id_city_of_rocks' where id = 'id_dungeon_the_2';
update areas set name = 'The Dungeon Routes' where id = 'id_dungeon_the' and name = 'Dungeon, The';
update areas set parent_id = 'id_dungeon_the_2' where id = 'id_dungeon_the';
update areas set parent_id = 'ny_silver_lake' where id = 'ny_center_of_progress';
update areas set parent_id = 'ny_silver_lake' where id = 'ny_tsunami_wall';
update areas set parent_id = 'ny_silver_lake' where id = 'ny_potter_mountain';
update areas set parent_id = 'vt_bolton_dome' where id = 'vt_interstate_boulder';
update areas set parent_id = 'vt_bolton_dome' where id = 'vt_something_chossy_boulder';
update areas set parent_id = 'vt_bolton_dome' where id = 'vt_grandma_s_house';
update areas set parent_id = 'vt_bolton_dome' where id = 'vt_randy_bobandy';
update areas set parent_id = 'vt_bolton_dome' where id = 'vt_shenanigans_boulder_the';
update routes set area_id = 'vt_revolution_wall' where id = 'vt_perspective' and area_id = 'vt_revolution_wall_2';
update routes set area_id = 'vt_revolution_wall' where id = 'vt_piece_of_mind' and area_id = 'vt_revolution_wall_2';
update areas set parent_id = 'az_mt_elden_crags' where id = 'az_skyline_boulders';
update areas set parent_id = 'az_mt_elden_crags' where id = 'az_dragon_eggz';
update areas set parent_id = 'az_mt_elden_crags' where id = 'az_pipeline_trail_boulders';
update areas set parent_id = 'az_mt_elden_crags' where id = 'az_bird_sanctuary';
update areas set parent_id = 'az_mt_elden_crags' where id = 'az_middle_elden';
update areas set name = 'West Elden Bouldering' where id = 'az_west_elden_2' and name = 'West Elden';
update areas set parent_id = 'az_west_elden' where id = 'az_west_elden_2';
update areas set parent_id = 'az_mt_elden_crags' where id = 'az_elden_springs';
update areas set name = 'Solitude Canyon Bouldering' where id = 'az_solitude_canyon_2' and name = 'Solitude Canyon';
update areas set parent_id = 'az_solitude_canyon' where id = 'az_solitude_canyon_2';
update areas set parent_id = 'az_mt_elden_crags' where id = 'az_east_elden_below_lost_elden';
update areas set parent_id = 'az_mt_elden_crags' where id = 'az_gloria_s';
update areas set parent_id = 'az_mt_elden_crags' where id = 'az_fatmans_loop';
update areas set parent_id = 'az_mt_elden_crags' where id = 'az_elysian_boulders';
update areas set parent_id = 'az_west_clear_creek' where id = 'az_northern_satellite_area';
update areas set parent_id = 'az_west_clear_creek' where id = 'az_main_creek';
update areas set parent_id = 'az_west_clear_creek' where id = 'az_southern_satellite_area';
update routes set area_id = 'ca_carson_peak_ice' where id = 'ca_carson_peak_ice_2_carson_peak_gully' and area_id = 'ca_carson_peak_ice_2';
update routes set area_id = 'ca_carson_peak_ice' where id = 'ca_carson_peak_ice_2_robs_ravine' and area_id = 'ca_carson_peak_ice_2';
update routes set area_id = 'ca_carson_peak_ice' where id = 'ca_carson_peak_ice_2_guy' and area_id = 'ca_carson_peak_ice_2';
update routes set area_id = 'ca_carson_peak_ice' where id = 'ca_carson_peak_ice_2_dude_looks_like_a_lady' and area_id = 'ca_carson_peak_ice_2';
update areas set parent_id = 'ca_lake_george' where id = 'ca_family_boulders';
update routes set area_id = 'co_apache_peak' where id = 'co_northwest_face_5' and area_id = 'co_apache_peak_2';
update areas set parent_id = 'co_glacier_gorge' where id = 'co_thatchtop_mt_se_aspect';
update areas set parent_id = 'co_glacier_gorge' where id = 'co_glacier_creek_drainage_including_black_lake_area';
update areas set parent_id = 'co_glacier_gorge' where id = 'co_overflow_and_jewell_lake';
update areas set parent_id = 'co_glacier_gorge' where id = 'co_long_s_peak_western_aspect';
update routes set area_id = 'co_mchenry_s_peak' where id = 'co_mchenry_s_peak_2_right_gully' and area_id = 'co_mchenry_s_peak_2';
update routes set area_id = 'co_mchenry_s_peak' where id = 'co_mchenry_s_peak_2_big_mac_couloir' and area_id = 'co_mchenry_s_peak_2';
update routes set area_id = 'co_mchenry_s_peak' where id = 'co_mchenry_s_peak_2_snow_bench_mchenry_s_peak' and area_id = 'co_mchenry_s_peak_2';
update routes set area_id = 'co_mchenry_s_peak' where id = 'co_mchenry_s_notch_couloir' and area_id = 'co_mchenry_s_peak_2';
update areas set parent_id = 'co_glacier_gorge' where id = 'co_chief_s_head_peak';
update routes set area_id = 'ct_right_knee' where id = 'ct_pick_and_pop' and area_id = 'ct_right_knee_2';
update routes set area_id = 'ct_right_knee' where id = 'ct_hobbomock' and area_id = 'ct_right_knee_2';
update routes set area_id = 'ct_right_knee' where id = 'ct_beaten_path' and area_id = 'ct_right_knee_2';
update routes set area_id = 'ct_right_knee' where id = 'ct_genderqueasy' and area_id = 'ct_right_knee_2';
update routes set area_id = 'ct_right_knee' where id = 'ct_twist_out' and area_id = 'ct_right_knee_2';
update routes set area_id = 'ct_right_knee' where id = 'ct_knee_cap' and area_id = 'ct_right_knee_2';
update routes set area_id = 'ct_right_knee' where id = 'ct_strangest_thing' and area_id = 'ct_right_knee_2';
update routes set area_id = 'ct_right_knee' where id = 'ct_first_things_first' and area_id = 'ct_right_knee_2';
update areas set name = 'Elephant Rock Bouldering' where id = 'id_elephant_rock_2' and name = 'Elephant Rock';
update areas set parent_id = 'id_elephant_rock' where id = 'id_elephant_rock_2';
update areas set parent_id = 'ny_k_northern_region' where id = 'ny_azure_mountain_2';
update areas set name = 'Azure Mountain Routes' where id = 'ny_azure_mountain' and name = 'Azure Mountain';
update areas set parent_id = 'ny_azure_mountain_2' where id = 'ny_azure_mountain';
update routes set area_id = 'ny_starbuck_left' where id = 'ny_starbuck_left_2_cleft_on_the_left' and area_id = 'ny_starbuck_left_2';
update routes set area_id = 'ny_starbuck_left' where id = 'ny_starbuck_left_2_a_corner_on_every_starbuck' and area_id = 'ny_starbuck_left_2';
update routes set area_id = 'ny_starbuck_left' where id = 'ny_starbuck_left_2_new_man_zone' and area_id = 'ny_starbuck_left_2';
update routes set area_id = 'ny_starbuck_central' where id = 'ny_starbuck_central_2_via' and area_id = 'ny_starbuck_central_2';
update routes set area_id = 'ny_starbuck_central' where id = 'ny_starbuck_central_2_breakfast_blend' and area_id = 'ny_starbuck_central_2';
update routes set area_id = 'ny_starbuck_central' where id = 'ny_starbuck_central_2_fare_trade' and area_id = 'ny_starbuck_central_2';
update routes set area_id = 'ny_starbuck_central' where id = 'ny_starbuck_central_2_dancing_goats' and area_id = 'ny_starbuck_central_2';
update routes set area_id = 'ny_starbuck_central' where id = 'ny_starbuck_central_2_candyland' and area_id = 'ny_starbuck_central_2';
update routes set area_id = 'ny_starbuck_central' where id = 'ny_starbuck_central_2_wake_up_call' and area_id = 'ny_starbuck_central_2';
update routes set area_id = 'ny_starbuck_central' where id = 'ny_starbuck_central_2_light_sweet' and area_id = 'ny_starbuck_central_2';
update routes set area_id = 'ny_starbuck_central' where id = 'ny_starbuck_central_2_polish_roast' and area_id = 'ny_starbuck_central_2';
update areas set name = 'Starbuck Right Ice Climbs' where id = 'ny_starbuck_right_2' and name = 'Starbuck Right';
update areas set parent_id = 'ny_starbuck_right' where id = 'ny_starbuck_right_2';
update areas set parent_id = 'ak_mendenhall_towers' where id = 'ak_mendenhall_towers_ice_mixed';
update areas set parent_id = 'az_thumb_butte' where id = 'az_outfrumunders';
update areas set parent_id = 'az_thumb_butte' where id = 'az_upper_outfromunder_boulder';
update areas set parent_id = 'az_thumb_butte' where id = 'az_new_outfromunder_boulders';
update routes set area_id = 'az_turkey_flat' where id = 'az_turkey_flat_boulders_turtle_head' and area_id = 'az_turkey_flat_boulders';
update routes set area_id = 'az_turkey_flat' where id = 'az_turkey_flat_boulders_smelly_feet' and area_id = 'az_turkey_flat_boulders';
update areas set parent_id = 'ca_bigcone_and_ladybug_canyons' where id = 'ca_in_the_beginning';
update areas set parent_id = 'ca_tuolumne_meadows' where id = 'ca_drug_dome_boulders';
update areas set name = 'Drug Dome' where id = 'ca_drug_dome_boulders' and name = 'Drug Dome Boulders';
update areas set name = 'Drug Dome Routes' where id = 'ca_drug_dome' and name = 'Drug Dome';
update areas set parent_id = 'ca_drug_dome_boulders' where id = 'ca_drug_dome';
update areas set parent_id = 'ca_towers_of_uncertainty' where id = 'ca_arete_boulder_2';
update areas set parent_id = 'ca_towers_of_uncertainty' where id = 'ca_base_layer_boulder';
update routes set area_id = 'ca_sunlight_rock' where id = 'ca_sunlight_line_left' and area_id = 'ca_sunlight_rock_2';
update routes set area_id = 'ca_sunlight_rock' where id = 'ca_sunlight_line_center' and area_id = 'ca_sunlight_rock_2';
update routes set area_id = 'ca_sunlight_rock' where id = 'ca_sunlight_line_right' and area_id = 'ca_sunlight_rock_2';
update areas set parent_id = 'ca_towers_of_uncertainty' where id = 'ca_uncertain_boulder';
update areas set parent_id = 'ca_towers_of_uncertainty' where id = 'ca_uncertain_traverse_boulder';
update areas set parent_id = 'ca_towers_of_uncertainty' where id = 'ca_stoney_point_boulder';
update areas set name = 'Cave Rock Bouldering' where id = 'ca_cave_rock_3' and name = 'Cave Rock';
update areas set parent_id = 'ca_cave_rock_2' where id = 'ca_cave_rock_3';
update areas set parent_id = 'ca_towers_of_uncertainty' where id = 'ca_side_kick_boulder';
update areas set parent_id = 'ca_towers_of_uncertainty' where id = 'ca_scum_bag_boulder';
update areas set parent_id = 'ca_towers_of_uncertainty' where id = 'ca_pinched_egg_boulder';
update areas set parent_id = 'ca_virgin_islands_area' where id = 'ca_lechlinksi_cracks_area';
update areas set parent_id = 'ca_virgin_islands_area' where id = 'ca_shark_fin_area';
update areas set parent_id = 'ca_virgin_islands_area' where id = 'ca_volcano_area_the';
update areas set parent_id = 'ca_volcano_area_the' where id = 'ca_volcano_the';
update areas set parent_id = 'ca_geology_tour_road' where id = 'ca_western_belt';
update areas set parent_id = 'ca_south_shore_2' where id = 'ca_lake_audrain_bouldering';
update areas set name = 'Lake Audrain' where id = 'ca_lake_audrain_bouldering' and name = 'Lake Audrain Bouldering';
update areas set name = 'Lake Audrain Other Climbs' where id = 'ca_lake_audrain' and name = 'Lake Audrain';
update areas set parent_id = 'ca_lake_audrain_bouldering' where id = 'ca_lake_audrain';
update areas set parent_id = 'ca_loveland' where id = 'ca_rosetta_stone_the';
update areas set parent_id = 'ca_loveland' where id = 'ca_xenolithic_boulder';
update areas set parent_id = 'ca_loveland' where id = 'ca_boulder_2_4';
update areas set parent_id = 'ca_loveland' where id = 'ca_lessons_boulder';
update areas set parent_id = 'ca_malibu_creek_state_park' where id = 'ca_stumbling_blocks_area';
update areas set parent_id = 'ca_stumbling_blocks_area' where id = 'ca_stumbling_blocks';
update areas set parent_id = 'ca_malibu_creek_state_park' where id = 'ca_planet_of_the_apes_area';
update areas set parent_id = 'ca_malibu_creek_state_park' where id = 'ca_ghetto_wall_boulders_the';
update areas set name = 'Ghetto Wall' where id = 'ca_ghetto_wall_boulders_the' and name = 'Ghetto Wall Boulders, The';
update areas set name = 'Ghetto Wall Routes' where id = 'ca_ghetto_wall' and name = 'Ghetto Wall';
update areas set parent_id = 'ca_ghetto_wall_boulders_the' where id = 'ca_ghetto_wall';
update areas set parent_id = 'ca_malibu_creek_state_park' where id = 'ca_matts_boulders_aka_the_nest';
update routes set area_id = 'ca_lower_muffins' where id = 'ca_pocket_face_stand' and area_id = 'ca_lower_muffins_boulders';
update routes set area_id = 'ca_lower_muffins' where id = 'ca_waterfall_arete' and area_id = 'ca_lower_muffins_boulders';
update areas set parent_id = 'ca_queen_mountain' where id = 'ca_watchtower_the_5';
update areas set parent_id = 'ca_queen_mountain' where id = 'ca_underground_the';
update areas set parent_id = 'ca_queen_mountain' where id = 'ca_queen_mountain_base';
update areas set parent_id = 'ca_castle_rock_area' where id = 'ca_summit_rock_boulders';
update areas set name = 'Summit Rock' where id = 'ca_summit_rock_boulders' and name = 'Summit Rock boulders';
update areas set name = 'Summit Rock Routes' where id = 'ca_summit_rock' and name = 'Summit Rock';
update areas set parent_id = 'ca_summit_rock_boulders' where id = 'ca_summit_rock';
update areas set parent_id = 'ca_tenaya_lake_area' where id = 'ca_tenaya_hillside';
update areas set parent_id = 'ca_tenaya_lake_area' where id = 'ca_big_lebowski_area';
update areas set parent_id = 'ca_indian_cove' where id = 'ca_western_wilderness_boulders';
update areas set name = 'Western Wilderness' where id = 'ca_western_wilderness_boulders' and name = 'Western Wilderness Boulders';
update areas set name = 'Western Wilderness Routes' where id = 'ca_western_wilderness' and name = 'Western Wilderness';
update areas set parent_id = 'ca_western_wilderness_boulders' where id = 'ca_western_wilderness';
update areas set parent_id = 'co_buffalo_creek' where id = 'co_almost_asshole_rock_bouldering';
update areas set name = 'Almost Asshole Rock' where id = 'co_almost_asshole_rock_bouldering' and name = 'Almost Asshole Rock Bouldering';
update areas set name = 'Almost Asshole Rock Routes' where id = 'co_almost_asshole_rock' and name = 'Almost Asshole Rock';
update areas set parent_id = 'co_almost_asshole_rock_bouldering' where id = 'co_almost_asshole_rock';
update routes set area_id = 'co_anarchy_wall_2' where id = 'co_block_boulder' and area_id = 'co_anarchy_wall_boulders';
update areas set parent_id = 'co_buffalo_creek' where id = 'co_asshole_rock_bouldering';
update areas set name = 'Asshole Rock' where id = 'co_asshole_rock_bouldering' and name = 'Asshole Rock Bouldering';
update areas set name = 'Asshole Rock Routes' where id = 'co_asshole_rock' and name = 'Asshole Rock';
update areas set parent_id = 'co_asshole_rock_bouldering' where id = 'co_asshole_rock';
update areas set parent_id = 'co_buffalo_creek' where id = 'co_da_butts_bouldering';
update areas set name = 'Da Butts' where id = 'co_da_butts_bouldering' and name = 'Da Butts Bouldering';
update areas set name = 'Da Butts Routes' where id = 'co_da_butts' and name = 'Da Butts';
update areas set parent_id = 'co_da_butts_bouldering' where id = 'co_da_butts';
update routes set area_id = 'co_diamond_head' where id = 'co_dh_center' and area_id = 'co_diamond_head_bouldering';
update routes set area_id = 'co_diamond_head' where id = 'co_dh_boulder_right_arete' and area_id = 'co_diamond_head_bouldering';
update routes set area_id = 'co_diamond_head' where id = 'co_dh_boulder_left_arete' and area_id = 'co_diamond_head_bouldering';
update routes set area_id = 'co_little_eiger' where id = 'co_fire_face_project' and area_id = 'co_little_eiger_bouldering';
update routes set area_id = 'co_little_eiger' where id = 'co_the_ice_princess' and area_id = 'co_little_eiger_bouldering';
update routes set area_id = 'co_little_eiger' where id = 'co_butterfly_effect_3' and area_id = 'co_little_eiger_bouldering';
update routes set area_id = 'co_little_eiger' where id = 'co_mourning_cloak' and area_id = 'co_little_eiger_bouldering';
update routes set area_id = 'co_little_eiger' where id = 'co_the_animaniac' and area_id = 'co_little_eiger_bouldering';
update routes set area_id = 'co_little_eiger' where id = 'co_smoke_on_the_water_2' and area_id = 'co_little_eiger_bouldering';
update routes set area_id = 'co_little_eiger' where id = 'co_truly_scrumptious_aka_the_animal' and area_id = 'co_little_eiger_bouldering';
update routes set area_id = 'co_little_eiger' where id = 'co_closet_climber' and area_id = 'co_little_eiger_bouldering';
update routes set area_id = 'co_little_eiger' where id = 'co_the_disembowler' and area_id = 'co_little_eiger_bouldering';
update routes set area_id = 'co_little_eiger' where id = 'co_abney_74' and area_id = 'co_little_eiger_bouldering';
update routes set area_id = 'co_little_eiger' where id = 'co_fire_in_the_sky' and area_id = 'co_little_eiger_bouldering';
update routes set area_id = 'co_new_economy_cliff' where id = 'co_a_beautiful_indifference' and area_id = 'co_new_economy_cliff_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_formula_50' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_swamp_traverse' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_dark_waters_traverse' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_formula_500' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_arete_10' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_bitch_strength' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_wet_carrot_aka_under_your_clings' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_than_s_problem' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_formula_50_super_sit' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_rain_drop' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_green_herbs_n_sam' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_deep_sea_angler' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_light_waters' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_aqua_huck' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_break_the_ice' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_aquabats' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_dark_waters' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_dark_waters_stand' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_flash_flood_3' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_fluid_mechanic' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_high_waters' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_mobbin_around' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_red_makes_me_angry' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_infinity' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_new_river_wall_the' where id = 'co_aqua_huck_direct' and area_id = 'co_new_river_wall_bouldering';
update routes set area_id = 'co_nomad_s_cave' where id = 'co_shame_on_knee' and area_id = 'co_nomad_s_cave_bouldering';
update routes set area_id = 'co_nomad_s_cave' where id = 'co_on_the_books' and area_id = 'co_nomad_s_cave_bouldering';
update routes set area_id = 'co_nomad_s_cave' where id = 'co_off_the_books' and area_id = 'co_nomad_s_cave_bouldering';
update routes set area_id = 'co_nomad_s_cave' where id = 'co_sleven' and area_id = 'co_nomad_s_cave_bouldering';
update routes set area_id = 'co_nomad_s_cave' where id = 'co_the_wheel_of_fortune' and area_id = 'co_nomad_s_cave_bouldering';
update routes set area_id = 'co_nomad_s_cave' where id = 'co_catillac' and area_id = 'co_nomad_s_cave_bouldering';
update routes set area_id = 'co_nomad_s_cave' where id = 'co_no_way_home' and area_id = 'co_nomad_s_cave_bouldering';
update routes set area_id = 'co_nomad_s_cave' where id = 'co_nomad_roof' and area_id = 'co_nomad_s_cave_bouldering';
update routes set area_id = 'co_nomad_s_cave' where id = 'co_papa_johnny' and area_id = 'co_nomad_s_cave_bouldering';
update routes set area_id = 'co_nomad_s_cave' where id = 'co_spidey' and area_id = 'co_nomad_s_cave_bouldering';
update routes set area_id = 'co_nomad_s_cave' where id = 'co_above_the_rest' and area_id = 'co_nomad_s_cave_bouldering';
update routes set area_id = 'co_nomad_s_cave' where id = 'co_unknown_left_of_catillac' and area_id = 'co_nomad_s_cave_bouldering';
update routes set area_id = 'co_nomad_s_cave' where id = 'co_drew_s_extension' and area_id = 'co_nomad_s_cave_bouldering';
update routes set area_id = 'co_nomad_s_cave' where id = 'co_nomad_cave_left' and area_id = 'co_nomad_s_cave_bouldering';
update routes set area_id = 'co_nomad_s_cave' where id = 'co_kook_slams_boulder_portion' and area_id = 'co_nomad_s_cave_bouldering';
update areas set parent_id = 'co_west_ridge_the' where id = 'co_west_ridge_boulders';
update areas set parent_id = 'id_owl_rock' where id = 'id_nest_boulder_the';
update areas set parent_id = 'id_owl_rock' where id = 'id_songbird_boulder';
update areas set parent_id = 'mi_presque_isle' where id = 'mi_black_rocks';
update routes set area_id = 'mi_pinnacle_area_the' where id = 'mi_runes_of_the_north' and area_id = 'mi_pinnacle_area_bouldering';
update routes set area_id = 'mi_pinnacle_area_the' where id = 'mi_the_fin' and area_id = 'mi_pinnacle_area_bouldering';
update routes set area_id = 'mi_secret_crag' where id = 'mi_crime_and_punishment' and area_id = 'mi_secret_crag_bouldering';
update areas set parent_id = 'nv_black_velvet_canyon' where id = 'nv_natasha_s_highball_boulder';
update areas set parent_id = 'nv_black_velvet_canyon' where id = 'nv_wet_dream_boulder';
update areas set parent_id = 'nv_black_velvet_canyon' where id = 'nv_normal_dream';
update areas set parent_id = 'nv_black_velvet_canyon' where id = 'nv_twin_towers_2';
update areas set parent_id = 'nv_black_velvet_canyon' where id = 'nv_red_dragon_boulder_the';
update areas set parent_id = 'nv_black_velvet_canyon' where id = 'nv_creek_boulder';
update areas set parent_id = 'nv_black_velvet_canyon' where id = 'nv_in_our_time_boulder';
update areas set parent_id = 'nv_black_velvet_canyon' where id = 'nv_fountainhead_the';
update areas set parent_id = 'nv_black_velvet_canyon' where id = 'nv_black_boulder';
update areas set parent_id = 'nv_moon_aka_knob_hill_the' where id = 'nv_bone_daddy_dome_bouldering';
update areas set name = 'Bone Daddy Dome' where id = 'nv_bone_daddy_dome_bouldering' and name = 'Bone Daddy Dome Bouldering';
update areas set name = 'Bone Daddy Dome Routes' where id = 'nv_bone_daddy_dome' and name = 'Bone Daddy Dome';
update areas set parent_id = 'nv_bone_daddy_dome_bouldering' where id = 'nv_bone_daddy_dome';
update areas set parent_id = 'nv_calico_basin' where id = 'nv_honeycomb_boulder';
update areas set parent_id = 'nv_calico_basin' where id = 'nv_stone_age_traverse';
update areas set parent_id = 'nv_calico_basin' where id = 'nv_swingers_boulder';
update areas set parent_id = 'nv_calico_basin' where id = 'nv_qq_boulder';
update areas set parent_id = 'nv_calico_basin' where id = 'nv_strategic_arms_boulder';
update areas set name = 'Moderate Mecca Bouldering' where id = 'nv_moderate_mecca' and name = 'Moderate Mecca';
update areas set parent_id = 'nv_moderate_mecca_2' where id = 'nv_moderate_mecca';
update areas set parent_id = 'nv_calico_basin' where id = 'nv_bone_grinder_boulder';
update areas set parent_id = 'nv_calico_basin' where id = 'nv_mr_smiley_boulders';
update areas set parent_id = 'nv_calico_basin' where id = 'nv_biscuits_and_gravy';
update areas set parent_id = 'nv_calico_basin' where id = 'nv_ash_creek_spring_boulders';
update areas set parent_id = 'nv_calico_basin' where id = 'nv_ash_canyon';
update areas set parent_id = 'nv_calico_basin' where id = 'nv_ruby_slipper_area';
update areas set parent_id = 'nv_calico_basin' where id = 'nv_fin_du_monde_drainage';
update areas set parent_id = 'nv_moderate_mecca_2' where id = 'nv_friends_boulder_2';
update areas set parent_id = 'nv_moderate_mecca_2' where id = 'nv_handcrack_boulder';
update areas set parent_id = 'nv_juniper_canyon' where id = 'nv_superfly';
update areas set parent_id = 'nv_juniper_canyon' where id = 'nv_cubicle_the';
update areas set parent_id = 'nv_juniper_canyon' where id = 'nv_shoulder_boulder';
update areas set parent_id = 'nv_juniper_canyon' where id = 'nv_streak_sauce';
update areas set parent_id = 'nv_lower_canyon' where id = 'nv_jimbo_rocks';
update routes set area_id = 'nv_first_waterfall_area' where id = 'nv_first_waterfall_bouldering_under_the_rainbow' and area_id = 'nv_first_waterfall_bouldering';
update routes set area_id = 'nv_first_waterfall_area' where id = 'nv_scratcher' and area_id = 'nv_first_waterfall_bouldering';
update areas set parent_id = 'nv_lower_canyon' where id = 'nv_front_boulder_wall';
update areas set parent_id = 'nv_lower_canyon' where id = 'nv_snake_eyes_corridor_bouldering';
update areas set parent_id = 'nv_lower_canyon' where id = 'nv_chicken_leg_bouldering';
update areas set name = 'Chicken Leg' where id = 'nv_chicken_leg_bouldering' and name = 'Chicken Leg Bouldering';
update areas set name = 'Chicken Leg Routes' where id = 'nv_chicken_leg' and name = 'Chicken Leg';
update areas set parent_id = 'nv_chicken_leg_bouldering' where id = 'nv_chicken_leg';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_american_boulder';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_areola_boulder';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_cabana_boulder';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_drunken_monkey_boulder';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_get_moist_boulder';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_kissed_boulder';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_galaxy_gully';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_beehive_knoll_area';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_any_port_in_a_storm_area';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_bees_knees_the';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_blood_trails';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_carapace_the';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_desert_serenade';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_get_burnt';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_get_to_da_choppa';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_group_decision_boulder';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_headless_horseman_boulder';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_shiatsu_boulder';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_silly_patch_boulders';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_sundial_the_3';
update areas set parent_id = 'nv_oak_creek_canyon' where id = 'nv_tilt_shift_boulder';
update areas set parent_id = 'nv_pine_creek_canyon' where id = 'nv_terrace_canyon_boulders';
update areas set parent_id = 'nv_pine_creek_canyon' where id = 'nv_stick_gully_boulders';
update areas set name = 'Stick Gully' where id = 'nv_stick_gully_boulders' and name = 'Stick Gully Boulders';
update areas set name = 'Stick Gully Routes' where id = 'nv_stick_gully' and name = 'Stick Gully';
update areas set parent_id = 'nv_stick_gully_boulders' where id = 'nv_stick_gully';
update areas set parent_id = 'nv_pine_creek_canyon' where id = 'nv_abutment';
update areas set parent_id = 'nv_pine_creek_canyon' where id = 'nv_crack_of_fire';
update areas set parent_id = 'nv_sandstone_canyon' where id = 'nv_crack_of_dawn';
update areas set parent_id = 'nv_sandstone_canyon' where id = 'nv_optimist_the';
update areas set parent_id = 'nv_sandstone_canyon' where id = 'nv_red_roof_inn';
update areas set parent_id = 'nv_sandstone_canyon' where id = 'nv_skeletons_on_the_zahara';
update areas set parent_id = 'nv_sandstone_canyon' where id = 'nv_under_the_desert_sky';
update areas set parent_id = 'nv_sandstone_quarry' where id = 'nv_java_boulder';
update areas set parent_id = 'nv_sandstone_quarry' where id = 'nv_monstro_s_gaping_maw';
update areas set parent_id = 'nv_sandstone_quarry' where id = 'nv_pier_boulders_the';
update areas set parent_id = 'nv_sandstone_quarry' where id = 'nv_propane_tank_boulder_the';
update areas set parent_id = 'nv_sandstone_quarry' where id = 'nv_trophy_crack';
update routes set area_id = 'nv_the_wake_up_wall' where id = 'nv_the_hidden_crack' and area_id = 'nv_wake_up_wall_boulders';
update areas set parent_id = 'nv_southern_outcrops' where id = 'nv_southern_outcrops_bouldering';
update areas set parent_id = 'nv_western_fringe' where id = 'nv_paiute_boulders';
update areas set parent_id = 'nv_western_fringe' where id = 'nv_hillside_boulders';
update routes set area_id = 'sd_positron' where id = 'sd_the_traverse_problem' and area_id = 'sd_positron_bouldering';
update routes set area_id = 'sd_positron' where id = 'sd_lithium_c_t' and area_id = 'sd_positron_bouldering';
update routes set area_id = 'sd_positron' where id = 'sd_madsen_slab' and area_id = 'sd_positron_bouldering';
update routes set area_id = 'sd_positron' where id = 'sd_the_forgotten' and area_id = 'sd_positron_bouldering';
update routes set area_id = 'ut_cone_area_the' where id = 'ut_warm_up_dihedral' and area_id = 'ut_cone_bouldering_the';
update routes set area_id = 'ut_cone_area_the' where id = 'ut_cactus_jack' and area_id = 'ut_cone_bouldering_the';
update routes set area_id = 'ut_cone_area_the' where id = 'ut_tarantulas' and area_id = 'ut_cone_bouldering_the';
update routes set area_id = 'ut_cone_area_the' where id = 'ut_canned_clams' and area_id = 'ut_cone_bouldering_the';
update routes set area_id = 'ut_cone_area_the' where id = 'ut_carrillo_s_crack' and area_id = 'ut_cone_bouldering_the';
update routes set area_id = 'ut_cone_area_the' where id = 'ut_agent_orange_2' and area_id = 'ut_cone_bouldering_the';
update routes set area_id = 'ut_cone_area_the' where id = 'ut_ty_s_traverse' and area_id = 'ut_cone_bouldering_the';
update routes set area_id = 'ut_cone_area_the' where id = 'ut_dave_s_roof' and area_id = 'ut_cone_bouldering_the';
update routes set area_id = 'ut_cone_area_the' where id = 'ut_matt_barley_s_slab' and area_id = 'ut_cone_bouldering_the';
update routes set area_id = 'ut_cone_area_the' where id = 'ut_unnamed_v2' and area_id = 'ut_cone_bouldering_the';
update areas set parent_id = 'vt_upper_west' where id = 'vt_boulders_south';
update areas set parent_id = 'vt_upper_west' where id = 'vt_boulders_north';
update areas set parent_id = 'vt_upper_west' where id = 'vt_boulders_central';
update areas set parent_id = 'wa_morning_rock' where id = 'wa_roadside_boulders_the';
update areas set parent_id = 'wa_morning_rock' where id = 'wa_talus_boulders';
update areas set parent_id = 'wy_sandstone_the' where id = 'wy_nature_center_boulders';
update areas set parent_id = 'ca_hall_of_horrors_area' where id = 'ca_big_brother_boulders';
update areas set parent_id = 'ca_hall_of_horrors_area' where id = 'ca_cilley_rock';
update areas set parent_id = 'ca_hall_of_horrors_area' where id = 'ca_dwarf_the';
update areas set parent_id = 'ca_hall_of_horrors_area' where id = 'ca_garden_angel_boulder';
update areas set parent_id = 'ca_hall_of_horrors_area' where id = 'ca_horrors_boulder';
update areas set parent_id = 'ca_hall_of_horrors_area' where id = 'ca_alien_arete_boulder';
update areas set parent_id = 'ca_hall_of_horrors_area' where id = 'ca_real_hall_of_horrors_the';
update areas set parent_id = 'ca_hall_of_horrors_area' where id = 'ca_zarmog';
update routes set area_id = 'ca_intersection_rock' where id = 'ca_fling' and area_id = 'ca_intersection_rock_2';
update routes set area_id = 'ca_intersection_rock' where id = 'ca_split_end_left' and area_id = 'ca_intersection_rock_2';
update routes set area_id = 'ca_intersection_rock' where id = 'ca_knuckle_cracker' and area_id = 'ca_intersection_rock_2';
update routes set area_id = 'ca_intersection_rock' where id = 'ca_intersection_traverse' and area_id = 'ca_intersection_rock_2';
update routes set area_id = 'ca_intersection_rock' where id = 'ca_augie_problem' and area_id = 'ca_intersection_rock_2';
update routes set area_id = 'ca_intersection_rock' where id = 'ca_the_reider_problem' and area_id = 'ca_intersection_rock_2';
update routes set area_id = 'ct_split_boulder_2' where id = 'ct_no_easy_days' and area_id = 'ct_split_boulder';
update routes set area_id = 'ct_split_boulder_2' where id = 'ct_giant_s_dilemma' and area_id = 'ct_split_boulder';
update routes set area_id = 'ct_split_boulder_2' where id = 'ct_death_before_dishonor' and area_id = 'ct_split_boulder';
update routes set area_id = 'ct_split_boulder_2' where id = 'ct_mj_lnir' and area_id = 'ct_split_boulder';
update routes set area_id = 'ct_split_boulder_2' where id = 'ct_an_ode_to_loki' and area_id = 'ct_split_boulder';
update areas set parent_id = 'mi_hogback_mountain' where id = 'mi_hogback';
update routes set area_id = 'nv_sundial_the' where id = 'nv_showdown' and area_id = 'nv_sundial_the_2';
update routes set area_id = 'nv_sundial_the' where id = 'nv_sundial' and area_id = 'nv_sundial_the_2';
update routes set area_id = 'nv_sundial_the' where id = 'nv_equinox' and area_id = 'nv_sundial_the_2';
update routes set area_id = 'nv_sundial_the' where id = 'nv_high_noon_2' and area_id = 'nv_sundial_the_2';
update routes set area_id = 'sd_veiny' where id = 'sd_just_jugs' and area_id = 'sd_veiny_2';
update routes set area_id = 'sd_veiny' where id = 'sd_tree_grease' and area_id = 'sd_veiny_2';
update routes set area_id = 'sd_veiny' where id = 'sd_fintastic' and area_id = 'sd_veiny_2';
update routes set area_id = 'sd_veiny' where id = 'sd_first_date' and area_id = 'sd_veiny_2';
update areas set parent_id = 'ut_box_canyon' where id = 'ut_the_box_canyon_ice_climbs';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_the_goods' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_tron' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_scram' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_gandalf' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_cleaver_crack' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_rubik_s_arete' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_the_segment' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_crimp_crimp_slap_throw' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_pentaphobia' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_the_cube' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_cube_traverse' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_the_octopus' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_playback' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_shallow' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_terminal_gravity' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_the_hobbit' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_cube_crack' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_elfen_magic' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_greed' and area_id = 'wa_clamshell_cave_2';
update routes set area_id = 'wa_clamshell_cave' where id = 'wa_thimbleberry' and area_id = 'wa_clamshell_cave_2';
update areas set parent_id = 'wa_summit_area' where id = 'wa_green_wall_2';
update areas set parent_id = 'wa_summit_area' where id = 'wa_lookout_slabs';
update routes set area_id = 'wi_bird_foot_buttress' where id = 'wi_neutral' and area_id = 'wi_bird_foot_buttress_2';
update routes set area_id = 'wi_bird_foot_buttress' where id = 'wi_a_glimpse_beyond_the_veil' and area_id = 'wi_bird_foot_buttress_2';
update routes set area_id = 'wi_tree_tower' where id = 'wi_a_quiet_place' and area_id = 'wi_tree_tower_2';
update areas set parent_id = 'ca_boreal_area' where id = 'ca_party_bus';
update areas set parent_id = 'ca_boreal_area' where id = 'ca_flying_saucer';
update routes set area_id = 'ca_reggie_dome' where id = 'ca_bouldering_is_trad' and area_id = 'ca_reggie_dome_2';
update areas set parent_id = 'co_castlewood_canyon_sp' where id = 'co_buoux_block_area';
update areas set parent_id = 'co_buoux_block_area' where id = 'co_buoux_block';
update routes set area_id = 'mi_sugar_cube' where id = 'mi_big_fookin_birds' and area_id = 'mi_sugar_cube_the';
update routes set area_id = 'mi_sugar_cube' where id = 'mi_lost_in_the_sink' and area_id = 'mi_sugar_cube_the';
update routes set area_id = 'mi_sugar_cube' where id = 'mi_broken_candy' and area_id = 'mi_sugar_cube_the';
update routes set area_id = 'mi_sugar_cube' where id = 'mi_ubiquitously_ungainly' and area_id = 'mi_sugar_cube_the';
update routes set area_id = 'mi_sugar_cube' where id = 'mi_the_solitary_fairy' and area_id = 'mi_sugar_cube_the';
update routes set area_id = 'mi_sugar_cube' where id = 'mi_dish_daze' and area_id = 'mi_sugar_cube_the';
update routes set area_id = 'mi_sugar_cube' where id = 'mi_pot_of_gold' and area_id = 'mi_sugar_cube_the';
update routes set area_id = 'mi_sugar_cube' where id = 'mi_broken_candy_sit_start' and area_id = 'mi_sugar_cube_the';
update areas set parent_id = 'nv_echo_falls_area_3' where id = 'nv_echo_falls_area_2';
update areas set parent_id = 'nv_echo_falls_area_2' where id = 'nv_echo_falls_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_rubb_dyno' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_the_fin_3' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_alcove_right' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_alfalfa_or_spanky' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_firebelly' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_alcove_left' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_phatness' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_slice_of_cake_direct' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_ouchies' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_the_rail_2' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_frosting' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_alcove_center' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_fat_lip_3' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_no_strings_attached' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_mad_bush' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_musk' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_slice_of_cake' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_fun_house_stairway' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_alcove_dyno' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_joel_s_jump_start_sandy_man' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_the_shityourpantsinator' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_tree_crack_2' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_rainbow' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_grouchies' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_rimjob' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_slice_of_pie' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wa_barney_s_rubble' where id = 'wa_the_hesitator' and area_id = 'wa_barney_s_rubble_2';
update routes set area_id = 'wi_white_wall' where id = 'wi_young_eggs' and area_id = 'wi_white_wall_2';
update routes set area_id = 'wi_white_wall' where id = 'wi_swivel_sit' and area_id = 'wi_white_wall_2';
update routes set area_id = 'wi_white_wall' where id = 'wi_critters' and area_id = 'wi_white_wall_2';
update routes set area_id = 'wi_white_wall' where id = 'wi_haploid' and area_id = 'wi_white_wall_2';
update routes set area_id = 'wi_white_wall' where id = 'wi_pivotal_project' and area_id = 'wi_white_wall_2';
update routes set area_id = 'wi_white_wall' where id = 'wi_oogenesis' and area_id = 'wi_white_wall_2';
update routes set area_id = 'wi_white_wall' where id = 'wi_surrounded_by_the_lonely' and area_id = 'wi_white_wall_2';
update routes set area_id = 'wi_white_wall' where id = 'wi_pivot_point' and area_id = 'wi_white_wall_2';
update areas set parent_id = 'ak_archangel_valley_sport_and_traditional_climbing' where id = 'ak_monolith_area';
update areas set parent_id = 'ak_monolith_area' where id = 'ak_monolith_the';
update areas set parent_id = 'az_council_rocks_2' where id = 'az_entrance_boulders_5';
update areas set parent_id = 'az_council_rocks_2' where id = 'az_laundry_basket_the';
update areas set parent_id = 'az_council_rocks_2' where id = 'az_the_bean_field';
update areas set parent_id = 'az_council_rocks_2' where id = 'az_susurradores';
update areas set parent_id = 'az_west_stronghold' where id = 'az_sweet_rock_2';
update areas set name = 'Sweet Rock Routes' where id = 'az_sweet_rock' and name = 'Sweet Rock';
update areas set parent_id = 'az_sweet_rock_2' where id = 'az_sweet_rock';
update areas set name = 'Cap Rock Bouldering' where id = 'ca_cap_rock_3' and name = 'Cap Rock';
update areas set parent_id = 'ca_cap_rock_2' where id = 'ca_cap_rock_3';
update areas set parent_id = 'mi_550_roped' where id = 'mi_wetmore_pond_2';
update areas set name = 'Wetmore Pond Other Climbs' where id = 'mi_wetmore_pond_3' and name = 'Wetmore Pond';
update areas set parent_id = 'mi_wetmore_pond_2' where id = 'mi_wetmore_pond_3';
update routes set area_id = 'mn_cube_the' where id = 'mn_sam_s_opus' and area_id = 'mn_cube_the_2';
update areas set parent_id = 'ca_planet_x_area' where id = 'ca_boulder_crack_rock';
update areas set parent_id = 'ca_planet_x_area' where id = 'ca_newton_s_law_boulder';
update areas set parent_id = 'ca_planet_x_area' where id = 'ca_ok_corridor';
update areas set parent_id = 'ca_planet_x_area' where id = 'ca_planet_x_boulder';
update areas set parent_id = 'ca_planet_x_area' where id = 'ca_jerry_s_boulder';
update areas set parent_id = 'ca_planet_x_area' where id = 'ca_satellite_boulder';
update areas set name = 'Sports Challenge Rock Bouldering' where id = 'ca_sports_challenge_rock_2' and name = 'Sports Challenge Rock';
update areas set parent_id = 'ca_sports_challenge_rock' where id = 'ca_sports_challenge_rock_2';
update areas set parent_id = 'ca_talking_heads' where id = 'ca_and_she_was_boulder';
update areas set parent_id = 'ca_talking_heads' where id = 'ca_born_boulder';
update areas set name = 'Blueberry Boulders Ice Climbs' where id = 'mi_blueberry_boulders_2' and name = 'Blueberry boulders';
update areas set parent_id = 'mi_blueberry_boulders' where id = 'mi_blueberry_boulders_2';
update areas set parent_id = 'mi_wetmore_pond_2' where id = 'mi_ar_tection_boulder';
update areas set parent_id = 'mi_wetmore_pond_2' where id = 'mi_rock_loop_outcrops';
update areas set parent_id = 'mi_wetmore_pond_2' where id = 'mi_man_in_the_chair';
update areas set parent_id = 'mi_wetmore_pond_2' where id = 'mi_death_star_boulder';
update areas set name = 'Castle Rock Bouldering' where id = 'wa_castle_rock_3' and name = 'Castle Rock';
update areas set parent_id = 'wa_castle_rock_2' where id = 'wa_castle_rock_3';
update areas set parent_id = 'wv_cotton_hill' where id = 'wv_cotton_top';
update areas set name = 'Cotton Top Routes' where id = 'wv_cotton_top_2' and name = 'Cotton Top';
update areas set parent_id = 'wv_cotton_top' where id = 'wv_cotton_top_2';
update routes set area_id = 'wi_poison_ivy_wall' where id = 'wi_zebra_slab' and area_id = 'wi_poison_ivy_wall_2';
update routes set area_id = 'wi_poison_ivy_wall' where id = 'wi_spelunker' and area_id = 'wi_poison_ivy_wall_2';
update routes set area_id = 'wi_poison_ivy_wall' where id = 'wi_little_pine_tree' and area_id = 'wi_poison_ivy_wall_2';
update routes set area_id = 'wi_poison_ivy_wall' where id = 'wi_perscrutation' and area_id = 'wi_poison_ivy_wall_2';
update routes set area_id = 'wi_poison_ivy_wall' where id = 'wi_inquisition' and area_id = 'wi_poison_ivy_wall_2';
update areas set parent_id = 'az_east_stronghold' where id = 'az_wasteland_bouldering_the';
update areas set name = 'Wasteland, The' where id = 'az_wasteland_bouldering_the' and name = 'Wasteland Bouldering, The';
update areas set name = 'The Wasteland Routes' where id = 'az_wasteland_the' and name = 'Wasteland, The';
update areas set parent_id = 'az_wasteland_bouldering_the' where id = 'az_wasteland_the';
update areas set parent_id = 'az_watson_lake' where id = 'az_livin_large_area_3rd_degree_wall';
update areas set parent_id = 'az_watson_lake' where id = 'az_box_canyon_dome_and_dread_wall';
update areas set parent_id = 'az_watson_lake' where id = 'az_jetty_the';
update areas set parent_id = 'az_watson_lake' where id = 'az_leaning_pillar';
update areas set parent_id = 'az_watson_lake' where id = 'az_giant_steps';
update areas set parent_id = 'az_watson_lake' where id = 'az_outback_boulder';
update areas set parent_id = 'az_watson_lake' where id = 'az_basking_lizard_wall';
update areas set parent_id = 'az_watson_lake' where id = 'az_zen_ledges_the';
update areas set parent_id = 'az_watson_lake' where id = 'az_cranium_crack_area';
update areas set parent_id = 'az_watson_lake' where id = 'az_thor_s_chasm';
update areas set parent_id = 'az_watson_lake' where id = 'az_thor_s_marbles';
update areas set parent_id = 'az_watson_lake' where id = 'az_thor_s_right';
update areas set parent_id = 'az_watson_lake' where id = 'az_sanctuary_the';
update areas set parent_id = 'az_watson_lake' where id = 'az_hot_rock_and_the_gutter';
update routes set area_id = 'ar_kindergarten_boulder' where id = 'ar_kindergarten_boulder_bouldering_kindergarten_arete' and area_id = 'ar_kindergarten_boulder_bouldering';
update routes set area_id = 'ar_kindergarten_boulder' where id = 'ar_static_cling_left' and area_id = 'ar_kindergarten_boulder_bouldering';
update routes set area_id = 'ar_kindergarten_boulder' where id = 'ar_static_cling' and area_id = 'ar_kindergarten_boulder_bouldering';
update routes set area_id = 'ar_kindergarten_boulder' where id = 'ar_kindergarten_traverse' and area_id = 'ar_kindergarten_boulder_bouldering';
update areas set parent_id = 'ca_cap_rock_2' where id = 'ca_vibrator_boulder';
update areas set parent_id = 'ca_cap_rock_2' where id = 'ca_ayatollah_boulder';
update areas set parent_id = 'ca_cap_rock_2' where id = 'ca_collieherb_boulder';
update areas set parent_id = 'ca_cap_rock_2' where id = 'ca_four_corners_boulder';
update areas set parent_id = 'ca_cap_rock_2' where id = 'ca_french_roast_boulder';
update areas set parent_id = 'ca_cap_rock_2' where id = 'ca_gram_parsons_memorial_boulder';
update areas set parent_id = 'ca_cap_rock_2' where id = 'ca_hatrack_the';
update areas set parent_id = 'ca_cap_rock_2' where id = 'ca_parking_lot_boulder_8';
update areas set parent_id = 'ca_cap_rock_2' where id = 'ca_pumping_monzonite_boulder';
update areas set parent_id = 'ca_cap_rock_2' where id = 'ca_sandy_wash_corridor';
update areas set parent_id = 'ca_cap_rock_2' where id = 'ca_powell_pinch_boulder';
update areas set parent_id = 'ca_hall_of_horrors' where id = 'ca_king_dome_area';
update areas set parent_id = 'ca_hall_of_horrors' where id = 'ca_meadows_boulder';
update routes set area_id = 'ca_north_star_wall' where id = 'ca_zoom_town' and area_id = 'ca_north_star_wall_bouldering';
update routes set area_id = 'ca_north_star_wall' where id = 'ca_declinism' and area_id = 'ca_north_star_wall_bouldering';
update routes set area_id = 'ca_north_star_wall' where id = 'ca_nostalgia_bias' and area_id = 'ca_north_star_wall_bouldering';
update areas set parent_id = 'ca_love_nest_area' where id = 'ca_transplants_boulder';
update areas set parent_id = 'ca_love_nest_area' where id = 'ca_adolescents_block';
update areas set parent_id = 'ca_love_nest_area' where id = 'ca_wood_block_the';
update areas set parent_id = 'ca_planet_x_area' where id = 'ca_hang_the';
update areas set parent_id = 'ca_ryan_campground' where id = 'ca_sacred_land';
update areas set parent_id = 'ca_ryan_campground' where id = 'ca_fidelman_boulder';
update areas set parent_id = 'ca_ryan_campground' where id = 'ca_camp_boulder_2';
update areas set parent_id = 'ca_ryan_campground' where id = 'ca_chipped_bulge_the';
update areas set parent_id = 'ca_ryan_campground' where id = 'ca_facet_boulder_2';
update areas set parent_id = 'ca_ryan_campground' where id = 'ca_flight_attendant_rock';
update areas set parent_id = 'ca_ryan_campground' where id = 'ca_master_boulder_2';
update areas set parent_id = 'ca_ryan_campground' where id = 'ca_matatte_boulder';
update areas set parent_id = 'ca_ryan_campground' where id = 'ca_moffat_boulder';
update areas set parent_id = 'ca_ryan_campground' where id = 'ca_northern_headstone_boulders';
update areas set parent_id = 'ca_ryan_campground' where id = 'ca_powers_boulder_2';
update areas set parent_id = 'ca_ryan_campground' where id = 'ca_roof_boulder_3';
update areas set parent_id = 'ca_school_rock' where id = 'ca_school_rock_4';
update areas set parent_id = 'ca_school_rock' where id = 'ca_drawing_of_the_three_the';
update routes set area_id = 'ca_tombstone' where id = 'ca_layback_crack_2' and area_id = 'ca_tombstone_area_bouldering';
update routes set area_id = 'ca_tombstone' where id = 'ca_roadside_slopers' and area_id = 'ca_tombstone_area_bouldering';
update areas set parent_id = 'co_chaos_canyon_bouldering' where id = 'co_chaos_creek';
update areas set parent_id = 'co_chaos_canyon_bouldering' where id = 'co_hallett_south_side';
update routes set area_id = 'co_parking_lot_the' where id = 'co_the_infanta' and area_id = 'co_parking_lot_boulders_the';
update areas set parent_id = 'mi_hogback_mountain' where id = 'mi_hogback_bouldering';
update areas set name = 'Hogback' where id = 'mi_hogback_bouldering' and name = 'Hogback Bouldering';
update areas set name = 'Hogback Ice Climbs' where id = 'mi_hogback' and name = 'Hogback';
update areas set parent_id = 'mi_hogback_bouldering' where id = 'mi_hogback';
update areas set parent_id = 'mt_bear_trap_road_routes' where id = 'mt_flying_buttress_boulders';
update areas set name = 'Flying Buttress' where id = 'mt_flying_buttress_boulders' and name = 'Flying Buttress Boulders';
update areas set name = 'Flying Buttress Routes' where id = 'mt_flying_buttress' and name = 'Flying Buttress';
update areas set parent_id = 'mt_flying_buttress_boulders' where id = 'mt_flying_buttress';
update routes set area_id = 'nv_frigid_air_buttress' where id = 'nv_breaking_the_ice' and area_id = 'nv_frigid_air_buttress_boulders';
update routes set area_id = 'nv_frigid_air_buttress' where id = 'nv_the_force_is_with_you' and area_id = 'nv_frigid_air_buttress_boulders';
update routes set area_id = 'nv_frigid_air_buttress' where id = 'nv_episode_one' and area_id = 'nv_frigid_air_buttress_boulders';
update routes set area_id = 'nv_snake_eyes_wall' where id = 'nv_the_ironcross' and area_id = 'nv_snake_eyes_wall_bouldering';
update routes set area_id = 'nv_snake_eyes_wall' where id = 'nv_snake_eye' and area_id = 'nv_snake_eyes_wall_bouldering';
update routes set area_id = 'ut_green_adjective_gully' where id = 'ut_far_away_horse' and area_id = 'ut_green_adjective_gully_bouldering';
update routes set area_id = 'ut_green_adjective_gully' where id = 'ut_unknown_95' and area_id = 'ut_green_adjective_gully_bouldering';
update routes set area_id = 'ut_green_adjective_gully' where id = 'ut_the_fin_3' and area_id = 'ut_green_adjective_gully_bouldering';
update routes set area_id = 'ut_green_adjective_gully' where id = 'ut_unnamed_21' and area_id = 'ut_green_adjective_gully_bouldering';
update routes set area_id = 'ut_green_adjective_gully' where id = 'ut_scared_to_come_out_of_the_closet' and area_id = 'ut_green_adjective_gully_bouldering';
update routes set area_id = 'ut_green_adjective_gully' where id = 'ut_the_shield_2' and area_id = 'ut_green_adjective_gully_bouldering';
update routes set area_id = 'ut_green_adjective_gully' where id = 'ut_the_red_c' and area_id = 'ut_green_adjective_gully_bouldering';
update routes set area_id = 'ut_green_adjective_gully' where id = 'ut_slab_5' and area_id = 'ut_green_adjective_gully_bouldering';
update routes set area_id = 'ut_green_adjective_gully' where id = 'ut_left_shield_face' and area_id = 'ut_green_adjective_gully_bouldering';
update routes set area_id = 'ut_green_adjective_gully' where id = 'ut_left_arete_shield' and area_id = 'ut_green_adjective_gully_bouldering';
update routes set area_id = 'ut_green_adjective_gully' where id = 'ut_left_start_to_shield' and area_id = 'ut_green_adjective_gully_bouldering';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_unknown_34' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_the_pickle' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_fen_fin' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_the_stem' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_rick_moranis' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_feelin_sappy' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_against_the_wall' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_ferret_brain' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_the_brawl' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_grain_brain_right' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_the_ferret_dyno' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_small_world' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_orange_arete' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_grain_brain' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_mine' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_stefa' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_over_myself' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_the_rib' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_the_campus_problem' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_dutty_rock' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_heeler' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_rib_cage' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_giant_man' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_baby_back' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_dan_akroyd' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_the_ferret' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_butt_surfing' and area_id = 'wa_carnival_boulders_the';
update routes set area_id = 'wa_carnival_crag' where id = 'wa_salsa_slab' and area_id = 'wa_carnival_boulders_the';
update areas set parent_id = 'wa_far_side' where id = 'wa_rhino_boulders';
update areas set parent_id = 'wa_far_side' where id = 'wa_pistol_boulders';
update areas set parent_id = 'wa_far_side' where id = 'wa_bow_boulder_the';
update areas set parent_id = 'wa_far_side' where id = 'wa_mile_high_club_boulders';
update areas set name = 'Eastern Rim Other Climbs' where id = 'ca_eastern_rim_2' and name = 'Eastern Rim';
update areas set parent_id = 'ca_eastern_rim' where id = 'ca_eastern_rim_2';
update areas set parent_id = 'az_oasis_the' where id = 'az_field_the';
update areas set parent_id = 'ca_rabbit_warren' where id = 'ca_rabbit_warren_the';
update areas set name = 'High Rappel Area Bouldering' where id = 'az_high_rappel_area_2' and name = 'High Rappel Area';
update areas set parent_id = 'az_high_rappel_area' where id = 'az_high_rappel_area_2';
update areas set name = 'Hungover Wall Bouldering' where id = 'ca_hungover_wall' and name = 'Hungover Wall';
update areas set parent_id = 'ca_hungover_wall_2' where id = 'ca_hungover_wall';
update areas set parent_id = 'ca_king_dome_area' where id = 'ca_king_dome_east_face';
update areas set parent_id = 'ca_king_dome_area' where id = 'ca_king_dome_west_face';
update areas set parent_id = 'ca_volcano_boulder_area' where id = 'ca_volcano_boulder';
update areas set parent_id = 'az_rappel_rock_2' where id = 'az_rappel_rock_gulley';
update areas set parent_id = 'az_rappel_rock_2' where id = 'az_crossbones_boulder';
update areas set parent_id = 'az_rappel_rock_2' where id = 'az_royale_boulder';
update areas set parent_id = 'az_rappel_rock_2' where id = 'az_skull_boulder';
update areas set parent_id = 'az_rappel_rock_2' where id = 'az_quartzite_spring_boulder';
update areas set parent_id = 'az_rappel_rock_2' where id = 'az_trailside_boulder';
update areas set parent_id = 'co_east_creek_day_use_area' where id = 'co_east_creek_day_use_bouldering';
update areas set name = 'East Creek Day Use Climbing' where id = 'co_east_creek_day_use_bouldering' and name = 'East Creek Day Use Bouldering';
update areas set name = 'East Creek Day Use Climbing Routes' where id = 'co_east_creek_day_use_climbing' and name = 'East Creek Day Use Climbing';
update areas set parent_id = 'co_east_creek_day_use_bouldering' where id = 'co_east_creek_day_use_climbing';
update areas set parent_id = 'co_nine_mile_roped' where id = 'co_four_blocks_bouldering';
update areas set name = 'Four Blocks Crag' where id = 'co_four_blocks_bouldering' and name = 'Four Blocks Bouldering';
update areas set name = 'Four Blocks Crag Routes' where id = 'co_four_blocks_crag' and name = 'Four Blocks Crag';
update areas set parent_id = 'co_four_blocks_bouldering' where id = 'co_four_blocks_crag';
update routes set area_id = 'mi_bread_loaf' where id = 'mi_acer_facer' and area_id = 'mi_bread_loaf_bouldering';
update routes set area_id = 'mi_bread_loaf' where id = 'mi_survival_of_the_fitness' and area_id = 'mi_bread_loaf_bouldering';
update routes set area_id = 'mi_bread_loaf' where id = 'mi_just_another_maple_monday' and area_id = 'mi_bread_loaf_bouldering';
update routes set area_id = 'mi_flying_frog_area' where id = 'mi_wam_up_crack' and area_id = 'mi_flying_frog_bouldering';
update routes set area_id = 'mi_flying_frog_area' where id = 'mi_double_wide' and area_id = 'mi_flying_frog_bouldering';
update routes set area_id = 'mi_second_buttress' where id = 'mi_ham_stack' and area_id = 'mi_second_buttress_bouldering';
update routes set area_id = 'mi_second_buttress' where id = 'mi_pulled_pork' and area_id = 'mi_second_buttress_bouldering';
update routes set area_id = 'mi_second_buttress' where id = 'mi_the_finger_crack' and area_id = 'mi_second_buttress_bouldering';
update routes set area_id = 'mi_second_buttress' where id = 'mi_pig_roast' and area_id = 'mi_second_buttress_bouldering';
update routes set area_id = 'mi_sunset_gully' where id = 'mi_bubblegum_knife_party' and area_id = 'mi_sunset_gully_bouldering';
update routes set area_id = 'mi_sunset_gully' where id = 'mi_garbage_food_for_garbage_people' and area_id = 'mi_sunset_gully_bouldering';
update routes set area_id = 'mi_sunset_gully' where id = 'mi_trash_monger' and area_id = 'mi_sunset_gully_bouldering';
update routes set area_id = 'mi_sunset_gully' where id = 'mi_intrusion' and area_id = 'mi_sunset_gully_bouldering';
update routes set area_id = 'mi_sunset_gully' where id = 'mi_the_rhino' and area_id = 'mi_sunset_gully_bouldering';
update routes set area_id = 'nv_the_pier' where id = 'nv_dope_sloper' and area_id = 'nv_pier_boulders_the';
update routes set area_id = 'nv_the_pier' where id = 'nv_wavestorm' and area_id = 'nv_pier_boulders_the';
update areas set parent_id = 'wa_icicle_buttress_and_bob_s_wall' where id = 'wa_icicle_buttress_boulders';
update areas set name = 'Icicle Buttress' where id = 'wa_icicle_buttress_boulders' and name = 'Icicle Buttress Boulders';
update areas set name = 'Icicle Buttress Routes' where id = 'wa_icicle_buttress' and name = 'Icicle Buttress';
update areas set parent_id = 'wa_icicle_buttress_boulders' where id = 'wa_icicle_buttress';
update routes set area_id = 'ca_real_hall_of_horrors_the' where id = 'ca_route_right_of_the_dumbest_climb_in_the_monument' and area_id = 'ca_real_hall_of_horrors';
update routes set area_id = 'ca_real_hall_of_horrors_the' where id = 'ca_first_eleven' and area_id = 'ca_real_hall_of_horrors';
update areas set parent_id = 'ca_central_pinnacles' where id = 'ca_overhung_knobs_boulder';
update areas set parent_id = 'ca_central_pinnacles' where id = 'ca_lost_orbit_bouldering';
update areas set parent_id = 'ca_voodoo_garden' where id = 'ca_thunder_down_under';
update areas set parent_id = 'ca_voodoo_garden' where id = 'ca_chip_off_the_old_block';
update areas set parent_id = 'ca_voodoo_garden' where id = 'ca_deadwood_boulder';
update areas set parent_id = 'ca_voodoo_garden' where id = 'ca_tortoise_boulder';
update areas set parent_id = 'ca_voodoo_garden' where id = 'ca_broken_heart_boulder';

-- path is set per row by trg_areas_set_path and does NOT cascade: re-derive every descendant
do $$ declare n int; begin
  loop
    update areas c set path = p.path || text2ltree(c.id) from areas p
     where c.parent_id = p.id and c.path is distinct from p.path || text2ltree(c.id);
    get diagnostics n = row_count;
    exit when n = 0;
  end loop;
end $$;

-- folded-away areas, once empty, deepest first
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

insert into m_recount
  select distinct a.id from areas a, areas t
   where t.id in ('co_hessie', 'nh_cathedral_ledge_ice_climbs', 'co_us_highway_550_south_of_silverton', 'co_south_mineral_creek_2', 'co_cement_creek_2', 'co_deer_park_creek_falls', 'co_arrastra_gulch', 'co_electric_peak', 'co_maggie_gulch', 'co_minnie_gulch', 'co_cunningham_gulch_2', 'co_eureka', 'nh_polar_caves_closed', 'nh_jobsite_the', 'nh_the_jobsite', 'nh_apocalypse_wall', 'nh_main_cliff_left_venus_wall', 'nh_parking_lot_wall', 'nh_the_parking_lot_wall', 'nh_triple_corners_2', 'nh_orange_crush_crag', 'nh_orange_crush', 'nh_true_summit_ledges_utopia_area', 'nh_upper_darth_vader_aka_hendrix_lee', 'nh_infinity_wall_2', 'nh_beyond_infinity_wall', 'nh_yellowknife_gully', 'nh_summit_cliff_ice_and_mixed', 'nh_roadside_ice', 'ak_purinton_creek_3', 'co_upper_tier_6', 'co_lower_tier_5', 'co_flatirons_2', 'co_longs_peak', 'co_north_cheyenne_canyon', 'nh_humphrey_s_ledge', 'nh_3_yukon_gold_butress', 'nh_3_yukon_gold_buttress', 'nh_2_bald_cap_slabs', 'nh_1_the_motherlode', 'nh_sandwich_notch_ice', 'nc_whiteside_ice', 'vt_solstice_slab', 'vt_big_splint_area', 'co_flatirons_ice_climbing', 'co_ophir_area', 'co_quandary_ice_crag', 'co_quandary_peak', 'co_split_rock_area', 'co_split_rock', 'mn_craig_s_cave', 'mn_blank_the', 'tn_asteroid', 'tn_asteroid_2', 'vt_black_mountain_central', 'vt_mount_pisgah', 'vt_pisgah_crag', 'co_almost_a_tunnel_2', 'co_almost_a_tunnel', 'co_bear_creek_2', 'co_coors_ultra_light', 'co_beer_garden_2', 'co_aqueduct_flows', 'co_mayhem_gulch', 'co_blue_moon', 'co_secret_waterfall_aka_windy_saddle_ice_flow', 'co_little_eiger_area_ice', 'co_little_eiger', 'co_m3_crag', 'co_elephant_rock_2', 'co_elephant_rock', 'co_pike_s_peak', 'co_pike_s_peak_2', 'co_west_side_of_the_canyon', 'ct_old_fish_house_road', 'ct_red_trail_section', 'ct_blue_trail_section_2', 'ct_blue_trail_section', 'nh_iron_mtn', 'tx_emerald_pools_sector', 'wi_eau_claire_ice', 'wi_eau_claire', 'ak_portage_4', 'ca_buck_rock_2', 'ca_buck_rock', 'co_bierstadt_ice', 'co_staunton_state_park_ice', 'ct_toni_harp_bloc', 'ct_wintergreen', 'ct_judges_cave', 'ct_tj_s_bar_and_grill', 'ct_god_s_country', 'mn_no_name_balancing_boulder', 'mn_lover_s_fortress', 'mn_tetris', 'mn_red_green_show', 'mn_trump_boulders', 'nh_echo_crag_ice_climbs', 'tx_painted_canyon_sector', 'vt_schoolyard', 'vt_main_quarry', 'vt_lower_quarry', 'al_the_grotto_bouldering', 'al_grotto', 'al_grotto_bouldering_the', 'ca_cap_rock_bouldering', 'ca_necco_boulder', 'ca_beak_rock', 'ca_big_dike_boulders', 'ca_echo_rock_proper', 'ca_gumdrop_the_2', 'ca_master_cylinder', 'ca_value_boulder', 'ca_classic_thin_crack_boulder', 'ca_arete_boulders', 'ca_big_moe_wall', 'ca_coyote_corner_2', 'ca_igneous_boulder', 'ca_land_of_the_lost_boulder', 'ca_smith_rock_2', 'ca_hall_of_horrors_bouldering', 'ca_lonesome_crowded_west', 'ca_stonehenge_and_fry_boulders', 'ca_planet_x_bouldering', 'ca_yoda_head_boulder', 'ca_gunsmoke_area_2', 'ca_gunsmoke_area', 'ca_indian_wave_boulders', 'ca_barker_dam_boulders', 'ca_alisters_cave', 'ca_crack_a_no_no_area', 'ca_lost_and_found_corridor', 'ca_ryan_campground_bouldering', 'ca_hvcg_bouldering_circuit', 'ca_manx_asteroid_belt_circuit', 'ca_pacifier_and_the_nostril', 'ca_chunky_boulder_and_trance_stone', 'ca_jbmf_boulders', 'ca_pepboys_boulder', 'ca_texas_boulder', 'ca_melon_boulder', 'ca_bullet_proof_boulder', 'ca_turtle_rock_circuit', 'ca_semi_precious_bouldering', 'ca_real_hidden_valley_circuit', 'ca_under_lizzy_boulder', 'ca_yabba_dabba_don_t_boulder', 'ca_cole_boulder', 'ca_gizmo_boulder', 'ca_hobbit_hole_boulder', 'ca_hooker_boulder', 'ca_miledi_rock', 'ca_powell_boulder', 'ca_tilt_o_meter_boulder', 'ca_iron_door_cave_boulder', 'ca_laura_scudder_boulder', 'ca_lizzie_boulder', 'ca_amoeba_boulder', 'ca_family_boulder_2', 'ca_dino_s_egg', 'ca_white_rastafarian_boulder', 'ca_voices_boulder', 'ca_tidal_wave_boulder', 'ca_mutant_boulder', 'ca_without_a_trace_boulder', 'ca_romp_roof', 'ca_scorpion_roof', 'ca_wilson_boulder', 'ca_purina_wall', 'ca_rasta_city', 'ca_chuckawalla_boulder', 'ca_animal_boulder_3', 'ca_false_hueco_boulder', 'ca_dike_boulder_3', 'ca_parking_lot_boulder_the', 'ca_fat_darrell_sandwich', 'ca_cave_boulder_4', 'ca_tuolumne_boulder', 'ca_49_palms_oasis_area', 'ca_group_camp_short_wall_2', 'ca_group_camp_short_wall', 'ca_group_camp_1_boulders', 'ca_western_wilderness_boulders', 'ca_varnished_wall_boulders', 'ca_varnished_wall', 'ca_picnic_boulder', 'ca_feudal_boulder', 'ca_campfire_crag_boulder', 'ca_callous_boulder', 'ca_pixie_boulder', 'ca_lehi_s_wilderness', 'ca_atlantis_boulder_2', 'ca_cheese_boulder', 'ca_yabo_boulder_the', 'ca_lost_horse_mantle_boulder', 'ca_mel_s_diner_boulder', 'ca_blas_beemer_area', 'ca_hemingway_boulders', 'ca_big_bud_boulder', 'ca_penguins_boulder', 'ca_scoop_boulder_2', 'ca_ankle_breaker_rock', 'ca_doctor_boulder_the', 'ca_north_of_jerry_cliff', 'ca_marley_boulder', 'ca_dysfunction_boulder', 'ca_equine_boulder', 'ca_bandulo_block', 'ca_jimmy_cliff_boulder', 'ca_humanitarian_boulder', 'ca_unmentionable_the_2', 'ca_west_entrance_boulder', 'ca_psycho_boulders', 'ca_chocolate_boulders', 'ca_embryo_area', 'ca_lonely_stones_1', 'ca_miledi_boulders', 'ca_outer_rim_the', 'ca_zen_boulder', 'ca_dover_cliffs_boulder', 'ca_trashcan_boulders', 'ca_forgotten_boulders', 'ca_afpa_rock_area', 'ca_afpa_rock', 'ct_diamond_ledge_bouldering', 'ct_diamond_ledge', 'ct_sunset_boulders', 'ct_east_of_naugatuck_river', 'ct_d_d_cave', 'id_aquatic_complex_zoo', 'mn_ely_s_peak_bouldering', 'mn_ely_s_peak', 'nh_hells_kitchen', 'nh_apocalypse_boulder', 'nh_meat_grinder_boulders_the', 'nh_monsters_from_the_id_bouldering', 'nh_monsters_from_the_id', 'nh_newbury_cut_ice_mixed', 'ut_sunshine_wall_boulders', 'ca_castle_rock_proper_2', 'ca_castle_rock_proper', 'ca_potter_s_point_2', 'ca_potter_s_point', 'co_arapahoe_peaks_2', 'co_arapahoe_peaks', 'il_a_gill_roof', 'il_a_gill_roof_area', 'mn_bur_oak_trail_2', 'mn_bur_oak_trail', 'ny_southeast_slopes', 'ny_southwest_slopes', 'ak_cracked_ice_2', 'ak_cracked_ice', 'ak_sunshine_ridge_area', 'ak_sunshine_ridge', 'az_granite_basin_lake', 'az_mint_wash', 'az_serengeti', 'az_gully_boulders_the', 'ca_horseshoe_slabs_boulder', 'ca_dog_boulder', 'co_bambi_s_trail_area', 'co_bambi_s_trail', 'id_checkered_demon_2', 'id_checkered_demon', 'nv_stooge_boulders', 'nv_space_oddity', 'nv_supple_leopard', 'nv_ziggy_stardust', 'ny_loon_lake_mt', 'ny_loon_lake_mtn', 'ny_upper_washbowl_cliff_ice', 'ny_upper_washbowl_cliff', 'ut_the_middle_fork_ice_climbs', 'wi_cox_hollow', 'ca_parking_lot_boulder_3', 'ca_main_boulders_2', 'ca_soda_punk_boulder', 'ca_upper_rainbow', 'ca_double_wide', 'ca_trigantor', 'ca_ginja_ninja', 'ca_sugar_cube', 'ca_t_j_slabs', 'ca_lake_boulder', 'ca_medicine_boulder', 'ca_spoon_boulder', 'ca_killer_wall', 'co_stanley_canyon_ice', 'id_dungeon_the_2', 'id_dungeon_the', 'ny_center_of_progress', 'ny_tsunami_wall', 'ny_potter_mountain', 'vt_interstate_boulder', 'vt_something_chossy_boulder', 'vt_grandma_s_house', 'vt_randy_bobandy', 'vt_shenanigans_boulder_the', 'vt_revolution_wall_2', 'vt_revolution_wall', 'az_skyline_boulders', 'az_dragon_eggz', 'az_pipeline_trail_boulders', 'az_bird_sanctuary', 'az_middle_elden', 'az_west_elden_2', 'az_elden_springs', 'az_solitude_canyon_2', 'az_east_elden_below_lost_elden', 'az_gloria_s', 'az_fatmans_loop', 'az_elysian_boulders', 'az_northern_satellite_area', 'az_main_creek', 'az_southern_satellite_area', 'ca_carson_peak_ice_2', 'ca_carson_peak_ice', 'ca_family_boulders', 'co_apache_peak_2', 'co_apache_peak', 'co_thatchtop_mt_se_aspect', 'co_glacier_creek_drainage_including_black_lake_area', 'co_overflow_and_jewell_lake', 'co_long_s_peak_western_aspect', 'co_mchenry_s_peak_2', 'co_mchenry_s_peak', 'co_chief_s_head_peak', 'ct_right_knee_2', 'ct_right_knee', 'id_elephant_rock_2', 'ny_azure_mountain_2', 'ny_azure_mountain', 'ny_starbuck_left_2', 'ny_starbuck_left', 'ny_starbuck_central_2', 'ny_starbuck_central', 'ny_starbuck_right_2', 'ak_mendenhall_towers_ice_mixed', 'az_outfrumunders', 'az_upper_outfromunder_boulder', 'az_new_outfromunder_boulders', 'az_turkey_flat_boulders', 'az_turkey_flat', 'ca_in_the_beginning', 'ca_drug_dome_boulders', 'ca_drug_dome', 'ca_arete_boulder_2', 'ca_base_layer_boulder', 'ca_sunlight_rock_2', 'ca_sunlight_rock', 'ca_uncertain_boulder', 'ca_uncertain_traverse_boulder', 'ca_stoney_point_boulder', 'ca_cave_rock_3', 'ca_side_kick_boulder', 'ca_scum_bag_boulder', 'ca_pinched_egg_boulder', 'ca_lechlinksi_cracks_area', 'ca_shark_fin_area', 'ca_volcano_area_the', 'ca_volcano_the', 'ca_western_belt', 'ca_lake_audrain_bouldering', 'ca_lake_audrain', 'ca_rosetta_stone_the', 'ca_xenolithic_boulder', 'ca_boulder_2_4', 'ca_lessons_boulder', 'ca_stumbling_blocks_area', 'ca_stumbling_blocks', 'ca_planet_of_the_apes_area', 'ca_ghetto_wall_boulders_the', 'ca_ghetto_wall', 'ca_matts_boulders_aka_the_nest', 'ca_lower_muffins_boulders', 'ca_lower_muffins', 'ca_watchtower_the_5', 'ca_underground_the', 'ca_queen_mountain_base', 'ca_summit_rock_boulders', 'ca_summit_rock', 'ca_tenaya_hillside', 'ca_big_lebowski_area', 'ca_western_wilderness', 'co_almost_asshole_rock_bouldering', 'co_almost_asshole_rock', 'co_anarchy_wall_boulders', 'co_anarchy_wall_2', 'co_asshole_rock_bouldering', 'co_asshole_rock', 'co_da_butts_bouldering', 'co_da_butts', 'co_diamond_head_bouldering', 'co_diamond_head', 'co_little_eiger_bouldering', 'co_new_economy_cliff_bouldering', 'co_new_economy_cliff', 'co_new_river_wall_bouldering', 'co_new_river_wall_the', 'co_nomad_s_cave_bouldering', 'co_nomad_s_cave', 'co_west_ridge_boulders', 'id_nest_boulder_the', 'id_songbird_boulder', 'mi_black_rocks', 'mi_pinnacle_area_bouldering', 'mi_pinnacle_area_the', 'mi_secret_crag_bouldering', 'mi_secret_crag', 'nv_natasha_s_highball_boulder', 'nv_wet_dream_boulder', 'nv_normal_dream', 'nv_twin_towers_2', 'nv_red_dragon_boulder_the', 'nv_creek_boulder', 'nv_in_our_time_boulder', 'nv_fountainhead_the', 'nv_black_boulder', 'nv_bone_daddy_dome_bouldering', 'nv_bone_daddy_dome', 'nv_honeycomb_boulder', 'nv_stone_age_traverse', 'nv_swingers_boulder', 'nv_qq_boulder', 'nv_strategic_arms_boulder', 'nv_moderate_mecca', 'nv_bone_grinder_boulder', 'nv_mr_smiley_boulders', 'nv_biscuits_and_gravy', 'nv_ash_creek_spring_boulders', 'nv_ash_canyon', 'nv_ruby_slipper_area', 'nv_fin_du_monde_drainage', 'nv_friends_boulder_2', 'nv_handcrack_boulder', 'nv_superfly', 'nv_cubicle_the', 'nv_shoulder_boulder', 'nv_streak_sauce', 'nv_jimbo_rocks', 'nv_first_waterfall_bouldering', 'nv_first_waterfall_area', 'nv_front_boulder_wall', 'nv_snake_eyes_corridor_bouldering', 'nv_chicken_leg_bouldering', 'nv_chicken_leg', 'nv_american_boulder', 'nv_areola_boulder', 'nv_cabana_boulder', 'nv_drunken_monkey_boulder', 'nv_get_moist_boulder', 'nv_kissed_boulder', 'nv_galaxy_gully', 'nv_beehive_knoll_area', 'nv_any_port_in_a_storm_area', 'nv_bees_knees_the', 'nv_blood_trails', 'nv_carapace_the', 'nv_desert_serenade', 'nv_get_burnt', 'nv_get_to_da_choppa', 'nv_group_decision_boulder', 'nv_headless_horseman_boulder', 'nv_shiatsu_boulder', 'nv_silly_patch_boulders', 'nv_sundial_the_3', 'nv_tilt_shift_boulder', 'nv_terrace_canyon_boulders', 'nv_stick_gully_boulders', 'nv_stick_gully', 'nv_abutment', 'nv_crack_of_fire', 'nv_crack_of_dawn', 'nv_optimist_the', 'nv_red_roof_inn', 'nv_skeletons_on_the_zahara', 'nv_under_the_desert_sky', 'nv_java_boulder', 'nv_monstro_s_gaping_maw', 'nv_pier_boulders_the', 'nv_propane_tank_boulder_the', 'nv_trophy_crack', 'nv_wake_up_wall_boulders', 'nv_the_wake_up_wall', 'nv_southern_outcrops_bouldering', 'nv_paiute_boulders', 'nv_hillside_boulders', 'sd_positron_bouldering', 'sd_positron', 'ut_cone_bouldering_the', 'ut_cone_area_the', 'vt_boulders_south', 'vt_boulders_north', 'vt_boulders_central', 'wa_roadside_boulders_the', 'wa_talus_boulders', 'wy_nature_center_boulders', 'ca_big_brother_boulders', 'ca_cilley_rock', 'ca_dwarf_the', 'ca_garden_angel_boulder', 'ca_horrors_boulder', 'ca_alien_arete_boulder', 'ca_real_hall_of_horrors_the', 'ca_zarmog', 'ca_intersection_rock_2', 'ca_intersection_rock', 'ct_split_boulder', 'ct_split_boulder_2', 'mi_hogback', 'nv_sundial_the_2', 'nv_sundial_the', 'sd_veiny_2', 'sd_veiny', 'ut_the_box_canyon_ice_climbs', 'wa_clamshell_cave_2', 'wa_clamshell_cave', 'wa_green_wall_2', 'wa_lookout_slabs', 'wi_bird_foot_buttress_2', 'wi_bird_foot_buttress', 'wi_tree_tower_2', 'wi_tree_tower', 'ca_party_bus', 'ca_flying_saucer', 'ca_reggie_dome_2', 'ca_reggie_dome', 'co_buoux_block_area', 'co_buoux_block', 'mi_sugar_cube_the', 'mi_sugar_cube', 'nv_echo_falls_area_2', 'nv_echo_falls_2', 'wa_barney_s_rubble_2', 'wa_barney_s_rubble', 'wi_white_wall_2', 'wi_white_wall', 'ak_monolith_area', 'ak_monolith_the', 'az_entrance_boulders_5', 'az_laundry_basket_the', 'az_the_bean_field', 'az_susurradores', 'az_sweet_rock_2', 'az_sweet_rock', 'ca_cap_rock_3', 'mi_wetmore_pond_2', 'mi_wetmore_pond_3', 'mn_cube_the_2', 'mn_cube_the', 'ca_boulder_crack_rock', 'ca_newton_s_law_boulder', 'ca_ok_corridor', 'ca_planet_x_boulder', 'ca_jerry_s_boulder', 'ca_satellite_boulder', 'ca_sports_challenge_rock_2', 'ca_and_she_was_boulder', 'ca_born_boulder', 'mi_blueberry_boulders_2', 'mi_ar_tection_boulder', 'mi_rock_loop_outcrops', 'mi_man_in_the_chair', 'mi_death_star_boulder', 'wa_castle_rock_3', 'wv_cotton_top', 'wv_cotton_top_2', 'wi_poison_ivy_wall_2', 'wi_poison_ivy_wall', 'az_wasteland_bouldering_the', 'az_wasteland_the', 'az_livin_large_area_3rd_degree_wall', 'az_box_canyon_dome_and_dread_wall', 'az_jetty_the', 'az_leaning_pillar', 'az_giant_steps', 'az_outback_boulder', 'az_basking_lizard_wall', 'az_zen_ledges_the', 'az_cranium_crack_area', 'az_thor_s_chasm', 'az_thor_s_marbles', 'az_thor_s_right', 'az_sanctuary_the', 'az_hot_rock_and_the_gutter', 'ar_kindergarten_boulder_bouldering', 'ar_kindergarten_boulder', 'ca_vibrator_boulder', 'ca_ayatollah_boulder', 'ca_collieherb_boulder', 'ca_four_corners_boulder', 'ca_french_roast_boulder', 'ca_gram_parsons_memorial_boulder', 'ca_hatrack_the', 'ca_parking_lot_boulder_8', 'ca_pumping_monzonite_boulder', 'ca_sandy_wash_corridor', 'ca_powell_pinch_boulder', 'ca_king_dome_area', 'ca_meadows_boulder', 'ca_north_star_wall_bouldering', 'ca_north_star_wall', 'ca_transplants_boulder', 'ca_adolescents_block', 'ca_wood_block_the', 'ca_hang_the', 'ca_sacred_land', 'ca_fidelman_boulder', 'ca_camp_boulder_2', 'ca_chipped_bulge_the', 'ca_facet_boulder_2', 'ca_flight_attendant_rock', 'ca_master_boulder_2', 'ca_matatte_boulder', 'ca_moffat_boulder', 'ca_northern_headstone_boulders', 'ca_powers_boulder_2', 'ca_roof_boulder_3', 'ca_school_rock_4', 'ca_drawing_of_the_three_the', 'ca_tombstone_area_bouldering', 'ca_tombstone', 'co_chaos_creek', 'co_hallett_south_side', 'co_parking_lot_boulders_the', 'co_parking_lot_the', 'mi_hogback_bouldering', 'mt_flying_buttress_boulders', 'mt_flying_buttress', 'nv_frigid_air_buttress_boulders', 'nv_frigid_air_buttress', 'nv_snake_eyes_wall_bouldering', 'nv_snake_eyes_wall', 'ut_green_adjective_gully_bouldering', 'ut_green_adjective_gully', 'wa_carnival_boulders_the', 'wa_carnival_crag', 'wa_rhino_boulders', 'wa_pistol_boulders', 'wa_bow_boulder_the', 'wa_mile_high_club_boulders', 'ca_eastern_rim_2', 'az_field_the', 'ca_rabbit_warren_the', 'az_high_rappel_area_2', 'ca_hungover_wall', 'ca_king_dome_east_face', 'ca_king_dome_west_face', 'ca_volcano_boulder', 'az_rappel_rock_gulley', 'az_crossbones_boulder', 'az_royale_boulder', 'az_skull_boulder', 'az_quartzite_spring_boulder', 'az_trailside_boulder', 'co_east_creek_day_use_bouldering', 'co_east_creek_day_use_climbing', 'co_four_blocks_bouldering', 'co_four_blocks_crag', 'mi_bread_loaf_bouldering', 'mi_bread_loaf', 'mi_flying_frog_bouldering', 'mi_flying_frog_area', 'mi_second_buttress_bouldering', 'mi_second_buttress', 'mi_sunset_gully_bouldering', 'mi_sunset_gully', 'nv_the_pier', 'wa_icicle_buttress_boulders', 'wa_icicle_buttress', 'ca_real_hall_of_horrors', 'ca_overhung_knobs_boulder', 'ca_lost_orbit_bouldering', 'ca_thunder_down_under', 'ca_chip_off_the_old_block', 'ca_deadwood_boulder', 'ca_tortoise_boulder', 'ca_broken_heart_boulder', 'co_eldora_2', 'co_silverton', 'nh_rumney_ice_climbs', 'co_big_meadows_2', 'nh_north_bald_cap_ice', 'vt_bone_mountain', 'mn_south_quarry_area_2', 'vt_black_mountain', 'co_clear_creek_canyon_ice', 'co_rifle_mountain_park_2', 'ct_webb_mountain_park_2', 'ct_west_rock_state_park_2', 'mn_mini_fortress', 'vt_bolton_quarry', 'ca_echo_rock_boulders', 'ca_echo_cove_bouldering', 'ca_echo_rock_bouldering', 'ca_barker_dam_bouldering', 'ca_central_joshua_tree_bouldering', 'ca_hidden_valley_campground_bouldering', 'ca_roadside_rocks_bouldering', 'ca_real_hidden_valley_bouldering', 'ca_outback_bouldering', 'ca_hidden_valley_area_bouldering', 'ca_hospital_rock_boulders', 'ca_rattlesnake_canyon_2', 'ca_group_campsites_road_2', 'ca_indian_cove_campground_2', 'ca_indian_cove_bouldering', 'ca_jimmy_cliff_area', 'ca_lost_horse_bouldering', 'ca_trashcan_rock_area', 'ca_quail_springs_bouldering', 'ct_mattatuck_state_forest_bouldering', 'id_ross_park_bouldering', 'nh_meadows_bouldering_the', 'ak_19_mile_wall', 'ny_crane_mountain_2', 'az_granite_mountain_2', 'az_sullivan_s_canyon_2', 'ca_horseshoe_lake', 'nv_white_rock_spring_2', 'ca_rainbow_2', 'ca_t_j_lake_2', 'ny_silver_lake_2', 'vt_bolton_dome_the', 'az_mt_elden_areas', 'az_west_clear_creek_2', 'ca_lake_george_2', 'co_glacier_gorge_2', 'ny_starbuck_mountain_2', 'az_thumb_butte_boulders', 'ca_bigcone_and_ladybug_canyons_bouldering', 'ca_towers_of_uncertainty_2', 'ca_virgin_islands_area_2', 'ca_geology_tour_road_bouldering', 'ca_loveland_bouldering', 'ca_malibu_creek_state_park_bouldering', 'ca_muffins_boulders', 'ca_queen_mountain_bouldering', 'ca_tenaya_lake_boulders', 'id_owl_rock_bouldering', 'mi_presque_isle_bouldering', 'nv_black_velvet_canyon_boulders', 'nv_moderate_mecca_boulders', 'nv_calico_basin_boulders', 'nv_juniper_canyon_boulders', 'nv_lower_canyon_bouldering', 'nv_oak_creek_canyon_boulders', 'nv_pine_creek_canyon_boulders', 'nv_sandstone_canyon_boulders', 'nv_sandstone_quarry_boulders', 'nv_western_fringe_bouldering', 'vt_upper_west_bouldering', 'wa_morning_rock_bouldering', 'wy_sandstone_boulders', 'ca_hall_of_horrors_area_2', 'wa_summit_area_2', 'ca_boreal_area_2', 'az_council_rocks', 'ca_planet_x_area_2', 'ca_talking_heads_area', 'mi_wetmore_pond', 'az_watson_lake_bouldering', 'ca_love_nest_area_2', 'ca_school_rock_bouldering', 'co_chaos_canyon', 'wa_far_side_boulders', 'az_oasis_the_2', 'ca_king_dome', 'az_rappel_rock', 'ca_central_pinnacles_bouldering', 'ca_voodoo_garden_bouldering_area', 'ak_glenn_highway_2', 'tn_upper_boulders_at_old_wauhatchie_pike', 'vt_revolution_hills', 'ca_carson_peak_2', 'ca_camoflage_forest_and_lake_audrain', 'nv_keyhole_canyon_bouldering', 'wa_kettle_valley_bouldering', 'sd_north_park', 'az_granite_dells_bouldering', 'co_eldora', 'nh_cathedral_ledge_bouldering', 'nh_north_conway_area', 'co_silverton_area', 'co_south_mineral_creek', 'co_cunningham_gulch', 'co_eureka_area', 'nh_rumney', 'nh_triple_corners', 'nh_infinity_wall', 'ak_purinton_creek_2', 'co_big_meadows', 'co_flatirons', 'co_co_ice_mixed', 'co_long_s_peak', 'co_front_range', 'co_north_cheyenne_canyon_2', 'co_colorado_springs_vicinity', 'nh_humphrey_s_ledge_2', 'nh_north_bald_cap', 'nh_sandwich_notch', 'nh_misc', 'nc_whiteside_mountain', 'nc_cashiers_area_ice', 'vt_bone_mountain_2', 'co_ophir', 'co_telluride', 'mn_south_quarry_area', 'vt_black_mountain_2', 'co_bear_creek', 'co_clear_creek_canyon', 'co_colorado_springs', 'co_rifle_mountain_park', 'ct_webb_mountain_park', 'nh_iron_mountain', 'tx_emerald_pools_sector_2', 'tx_continental_ranch', 'ak_portage_2', 'ak_south_central_alaska_ice_and_alpine', 'co_mt_bierstadt', 'co_staunton_state_park', 'ct_west_rock_state_park', 'mn_mini_fortress_area', 'nh_echo_crag', 'nh_franconia_notch', 'tx_painted_canyon_sector_2', 'vt_bolton_quarry_2', 'ca_central_joshua_tree', 'ca_echo_rock', 'ca_echo_cove', 'ca_barker_dam_area', 'ca_hidden_valley_campground', 'ca_roadside_rocks_4', 'ca_real_hidden_valley', 'ca_outback_the_2', 'ca_hospital_rock_area', 'ca_rattlesnake_canyon', 'ca_indian_cove', 'ca_group_campsites_road', 'ca_indian_cove_campground', 'ca_lost_horse_area', 'ca_jimmy_cliff', 'ca_quail_springs_area', 'ca_trashcan_rock', 'ct_western_highlands', 'ct_ct_bouldering', 'ct_mattatuck_state_forest', 'id_ross_park', 'mn_duluth_area_rock_and_ice', 'mn_duluth_bouldering', 'nh_the_meadows', 'nh_short_cut_trail', 'nh_newbury_cut_the', 'nh_western_nh', 'ut_sunshine_wall', 'ut_arches_national_park', 'ca_santa_barbara', 'ca_santa_barbara_bouldering', 'mn_bouldering_blue_mounds', 'ny_crane_mountain', 'az_granite_mountain', 'az_sullivan_s_canyon', 'ca_horseshoe_lake_area', 'co_hartman_rocks', 'co_bouldering_areas', 'id_city_of_rocks', 'id_city_of_rocks_bouldering', 'nv_white_rock_spring', 'ut_middle_fork', 'ut_maple_canyon_ice', 'wi_cox_hollow_2', 'wi_g_dodge_ice', 'ca_rainbow', 'ca_t_j_lake', 'co_stanley_canyon', 'ny_silver_lake', 'vt_bolton_dome', 'az_mt_elden_crags', 'az_west_elden', 'az_solitude_canyon', 'az_west_clear_creek', 'ca_lake_george', 'co_glacier_gorge', 'id_elephant_rock', 'ny_k_northern_region', 'ny_c_northwest', 'ny_starbuck_right', 'ak_mendenhall_towers', 'ak_juneau_ice_and_mixed', 'az_thumb_butte', 'ca_bigcone_and_ladybug_canyons', 'ca_tuolumne_meadows', 'ca_tuolumne_bouldering', 'ca_towers_of_uncertainty', 'ca_cave_rock_2', 'ca_virgin_islands_area', 'ca_geology_tour_road', 'ca_south_shore_2', 'ca_loveland', 'ca_malibu_creek_state_park', 'ca_queen_mountain', 'ca_castle_rock_area', 'ca_castle_rock_area_bouldering', 'ca_tenaya_lake_area', 'co_buffalo_creek', 'co_buffalo_creek_bouldering', 'co_west_ridge_the', 'co_eldorado_canyon_bouldering', 'id_owl_rock', 'mi_presque_isle', 'nv_black_velvet_canyon', 'nv_moon_aka_knob_hill_the', 'nv_big_ass_rocks_knob_hill_bouldering', 'nv_calico_basin', 'nv_moderate_mecca_2', 'nv_juniper_canyon', 'nv_lower_canyon', 'nv_oak_creek_canyon', 'nv_pine_creek_canyon', 'nv_sandstone_canyon', 'nv_sandstone_quarry', 'nv_southern_outcrops', 'nv_red_rock_bouldering', 'nv_western_fringe', 'vt_upper_west', 'wa_morning_rock', 'wy_sandstone_the', 'ca_hall_of_horrors_area', 'mi_hogback_mountain', 'mi_marquette_ice', 'ut_box_canyon', 'wa_summit_area', 'ca_boreal_area', 'co_castlewood_canyon_sp', 'co_bouldering_problems', 'nv_echo_falls_area_3', 'nv_kyle_canyon', 'ak_archangel_valley_sport_and_traditional_climbing', 'ak_archangel_bouldering', 'az_council_rocks_2', 'az_west_stronghold', 'az_west_stronghold_bouldering', 'ca_cap_rock_2', 'mi_550_roped', 'ca_planet_x_area', 'ca_sports_challenge_rock', 'ca_talking_heads', 'mi_blueberry_boulders', 'wa_castle_rock_2', 'wa_bouldering_in_tumwater_canyon', 'wv_cotton_hill', 'wv_lower_new_river_gorge_bouldering', 'az_east_stronghold', 'az_east_stronghold_bouldering', 'az_watson_lake', 'ca_hall_of_horrors', 'ca_love_nest_area', 'ca_ryan_campground', 'ca_school_rock', 'co_chaos_canyon_bouldering', 'mi_550_bouldering', 'mt_bear_trap_road_routes', 'mt_bear_trap_road_boulders', 'wa_far_side', 'ca_eastern_rim', 'ca_ice_caves_outer_area', 'az_oasis_the', 'ca_rabbit_warren', 'az_high_rappel_area', 'ca_hungover_wall_2', 'ca_keller_peak_bouldering', 'ca_volcano_boulder_area', 'az_rappel_rock_2', 'co_east_creek_day_use_area', 'co_nine_mile_bouldering', 'co_nine_mile_roped', 'wa_icicle_buttress_and_bob_s_wall', 'wa_bouldering_in_icicle_creek', 'ca_central_pinnacles', 'ca_voodoo_garden') and a.path @> t.path
  ;

-- 4. recount
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in (select id from m_recount where id in (select id from areas));

commit;
