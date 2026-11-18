-- 0457 — Crag rows filed alpine move to trad / sport / top-rope, pass 2 (owner 2026-11-11: "crag for trad is just a
-- short approach"; pass 1 was 0452). 347 rows: 129 sport, 200 trad, 18 toprope.
--
-- These rows were "unsure" after pass 1. On 2026-11-18 each of their 684 crag areas was researched (23 lists; data:
-- data/research/2026-11-14/crag/c-out-*.json; decisions: data/research/2026-11-14/discipline-audit/decisions2.json).
-- A row moves only when ALL hold (owner: "accurate and correct"; "i dont want to have to do any of our own math"):
--  * a page STATES the walk from the car to the base as <= 60 min, or as roadside ("virtually no approach");
--    a distance alone, a time from a lift / tram / gondola top, a photo caption, a partly-timed walk, or pages that
--    disagree past 60 min -> NOT moved (left alpine, listed for the owner);
--  * no summit / ridge finish, glacier or snow for the area;
--  * Mountain Project names THIS route with a Sport / Trad / TR type (a guessed or substitute match -> not moved);
--  * the row's own text carries no strong alpine signal; no row moved TO alpine by 0413/0418 and none in their areas.
--
-- Guards (as 0452): assert-then-set (a row no longer alpine is left alone); a row whose discipline the owner locked
-- by hand (route_field_confidence) or that carries an approved climber edit of discipline / rockStyle is left alone.
-- disciplines: the new primary first (0366's trigger requires it), then the route's MP types, then any other tag
-- already on the row except alpine / mountaineering / scrambling. Area main types re-derive via triggers 0051, 0198.
-- Checked before applying: check:migration-claims, check:sql preflight, check:migration-replay; version recorded in
-- supabase_migrations.schema_migrations in the same step; then npm run gen:schema.
begin;

create temp table _crag_moves (id text primary key, area_id text not null, discipline text not null, disciplines jsonb not null) on commit drop;
insert into _crag_moves (id, area_id, discipline, disciplines) values
  ('ca_antibro', 'ca_east_face_3', 'sport', '["sport"]'::jsonb), -- Antibro | 5.11b | <= 50 min on foot
  ('ca_boreas', 'ca_main_wall_2', 'sport', '["sport"]'::jsonb), -- Boreas | 5.10a | <= 4 min on foot
  ('ca_breakfast_burrito', 'ca_sleepy_bear_tower', 'trad', '["trad"]'::jsonb), -- Breakfast Burrito | 5.10d | <= 5 min on foot
  ('ca_brownies_and_beer', 'ca_nightmare_tower_east_face', 'trad', '["trad"]'::jsonb), -- Brownies and Beer | 5.8- | <= 5 min on foot
  ('ca_carcass', 'ca_ugly_arete_boulder', 'sport', '["sport"]'::jsonb), -- Carcass | 5.12b | <= 5 min on foot
  ('ca_castle_grey_skull', 'ca_castle_grey_skull', 'sport', '["sport"]'::jsonb), -- Castle Grey Skull | 5.10a/b | <= 10 min on foot
  ('ca_catholic_grade_school', 'ca_castle_grey_skull', 'trad', '["trad"]'::jsonb), -- Catholic Grade School | 5.10c | <= 10 min on foot
  ('ca_catt_and_moose', 'ca_golden_rock', 'trad', '["trad"]'::jsonb), -- Catt and Moose | 5.11 | <= 45 min on foot
  ('ca_cinder', 'ca_lower_dinosaur_rock_n_face', 'sport', '["sport"]'::jsonb), -- Cinder | 5.11a | <= 10 min on foot
  ('ca_cragganmore', 'ca_highlands_wall', 'sport', '["sport"]'::jsonb), -- Cragganmore | 5.9+ | <= 45 min on foot
  ('ca_crystal_grip_pump', 'ca_crystal_lake_wall', 'trad', '["trad"]'::jsonb), -- Crystal Grip Pump | 5.12b | <= 50 min on foot
  ('ca_crystalline_ceilidh', 'ca_schoolboy_buttress', 'sport', '["sport"]'::jsonb), -- Crystalline Ceilidh | 5.10a/b | <= 45 min on foot
  ('ca_devil_s_wind_storm', 'ca_main_wall_2', 'sport', '["sport"]'::jsonb), -- Devil's Wind Storm | 5.10c | <= 4 min on foot
  ('ca_dies_irae', 'ca_rectory_east_face', 'trad', '["trad"]'::jsonb), -- Dies Irae | 5.10b | <= 30 min on foot
  ('ca_direct_start_republicans_on_crack', 'ca_lower_tier_2', 'trad', '["trad"]'::jsonb), -- Direct Start (Republicans on Crack) | 5.10+ | <= 4 min on foot
  ('ca_disbarred', 'ca_upper_dinosaur_rock_east_face', 'toprope', '["toprope"]'::jsonb), -- Disbarred | 5.10b | <= 15 min on foot
  ('ca_double_barrel_2', 'ca_highlands_wall', 'sport', '["sport"]'::jsonb), -- Double Barrel | 5.10c | <= 45 min on foot
  ('ca_double_seam', 'ca_dog_wall', 'toprope', '["toprope"]'::jsonb), -- double seam | 5.11 | <= 20 min on foot
  ('ca_double_take_2', 'ca_ugly_arete_boulder', 'sport', '["sport"]'::jsonb), -- Double Take | 5.10d | <= 5 min on foot
  ('ca_dreamweaver_2', 'ca_nightmare_tower_west_face', 'trad', '["trad"]'::jsonb), -- Dreamweaver | 5.7 | <= 5 min on foot
  ('ca_drunks_in_tow', 'ca_arctic_temple', 'trad', '["trad"]'::jsonb), -- Drunks in Tow | 5.10b | <= 40 min on foot
  ('ca_dudleya_man', 'ca_penstemon_dome_east_face', 'sport', '["sport"]'::jsonb), -- Dudleya Man | 5.10a | <= 45 min on foot
  ('ca_earth_daze', 'ca_lower_dinosaur_rock_n_face', 'sport', '["sport"]'::jsonb), -- Earth Daze | 5.10c | <= 10 min on foot
  ('ca_egotestical', 'ca_t_j_swan_cliff', 'sport', '["sport"]'::jsonb), -- Egotestical | 5.7 | <= 50 min on foot
  ('ca_eight_thousand_foot_headrush', 'ca_lower_tier_2', 'sport', '["sport"]'::jsonb), -- Eight Thousand Foot Headrush | 5.9 | <= 4 min on foot
  ('ca_extinction', 'ca_lower_dinosaur_rock_n_face', 'sport', '["sport"]'::jsonb), -- Extinction | 5.11b | <= 10 min on foot
  ('ca_eyes_wide_shut', 'ca_sleepy_bear_tower', 'sport', '["sport"]'::jsonb), -- Eyes Wide Shut | 5.11b | <= 5 min on foot
  ('ca_father_dowling_s_mystery', 'ca_rectory_east_face', 'trad', '["trad"]'::jsonb), -- Father Dowling's Mystery | 5.10c | <= 30 min on foot
  ('ca_feast_of_the_stego_s', 'ca_lower_dinosaur_rock_w_face', 'trad', '["trad"]'::jsonb), -- Feast of the Stego's | 5.8 | <= 10 min on foot
  ('ca_federal_holiday', 'ca_pyramid_the', 'trad', '["trad"]'::jsonb), -- Federal Holiday | 5.8+ | <= 40 min on foot
  ('ca_flairvoyant', 'ca_castle_grey_skull', 'trad', '["trad"]'::jsonb), -- Flairvoyant | 5.6 | <= 10 min on foot
  ('ca_flakes_crack', 'ca_crystal_lake_wall', 'trad', '["trad"]'::jsonb), -- Flakes Crack | 5.10 | <= 50 min on foot
  ('ca_g_spot', 'ca_east_wall_2', 'trad', '["trad","toprope"]'::jsonb), -- G-Spot | 5.9 | <= 10 min on foot
  ('ca_gaelic_101', 'ca_schoolboy_buttress', 'trad', '["trad"]'::jsonb), -- Gaelic 101 | 5.9 | <= 45 min on foot
  ('ca_grim_reality', 'ca_east_face_3', 'sport', '["sport"]'::jsonb), -- Grim Reality | 5.10b | <= 50 min on foot
  ('ca_grinder', 'ca_east_face_3', 'sport', '["sport"]'::jsonb), -- Grinder | 5.11c | <= 50 min on foot
  ('ca_he_man_slab', 'ca_castle_grey_skull', 'trad', '["trad"]'::jsonb), -- He Man Slab | 5.10b | <= 10 min on foot
  ('ca_hit_or_miss_2', 'ca_bunny_slopes', 'trad', '["trad"]'::jsonb), -- Hit or Miss | 5.7 | <= 5 min on foot
  ('ca_hoodoo_temple', 'ca_arctic_temple', 'trad', '["trad"]'::jsonb), -- Hoodoo Temple | 5.10c | <= 40 min on foot
  ('ca_hot_crossed_buns', 'ca_bunny_slopes', 'trad', '["trad"]'::jsonb), -- Hot Crossed Buns | 5.6 | <= 5 min on foot
  ('ca_house_of_the_holy', 'ca_rectory_east_face', 'trad', '["trad"]'::jsonb), -- House of the Holy | 5.10d | <= 30 min on foot
  ('ca_if_it_s_not_scottish_it_s_crap', 'ca_highlands_wall', 'sport', '["sport"]'::jsonb), -- If It's Not Scottish, It's Crap | 5.11a | <= 45 min on foot
  ('ca_it_s_barry_time', 'ca_penstemon_dome_east_face', 'sport', '["sport"]'::jsonb), -- It's Barry Time | 5.10a/b | <= 45 min on foot
  ('ca_izz_the_whizz', 'ca_ickle_wall', 'sport', '["sport"]'::jsonb), -- Izz the Whizz | 5.10b | <= 50 min on foot
  ('ca_izzers', 'ca_ickle_wall', 'trad', '["trad"]'::jsonb), -- Izzers | 5.8 | <= 50 min on foot
  ('ca_izzylish', 'ca_ickle_wall', 'sport', '["sport"]'::jsonb), -- Izzylish | 5.9 | <= 50 min on foot
  ('ca_john_hartman_s_proud_rock_climb', 'ca_east_face_3', 'sport', '["sport"]'::jsonb), -- John Hartman's Proud Rock Climb | 5.11d | <= 50 min on foot
  ('ca_jurassic_crack', 'ca_upper_dinosaur_rock_north_face', 'trad', '["trad"]'::jsonb), -- Jurassic Crack | 5.10c | <= 15 min on foot
  ('ca_knockando', 'ca_highlands_wall', 'sport', '["sport"]'::jsonb), -- Knockando | 5.10d | <= 45 min on foot
  ('ca_lagavulin', 'ca_highlands_wall', 'sport', '["sport"]'::jsonb), -- Lagavulin | 5.10d | <= 45 min on foot
  ('ca_land_of_the_midnight_sun', 'ca_arctic_temple', 'trad', '["trad"]'::jsonb), -- Land of the Midnight Sun | 5.10a/b | <= 40 min on foot
  ('ca_laser_blade', 'ca_laser_blade_block', 'sport', '["sport"]'::jsonb), -- Laser Blade | 5.12d | <= 10 min on foot
  ('ca_le_petit_ecolier', 'ca_schoolboy_buttress', 'sport', '["sport"]'::jsonb), -- Le Petit Ecolier | 5.11d | <= 45 min on foot
  ('ca_left_wing_route_aka_the_democrat', 'ca_t_j_swan_cliff', 'sport', '["sport"]'::jsonb), -- Left Wing Route - AKA The Democrat | 5.6 | <= 50 min on foot
  ('ca_lickety_split', 'ca_east_face_3', 'sport', '["sport"]'::jsonb), -- Lickety Split | 5.12b | <= 50 min on foot
  ('ca_life_liberty_and_the_pursuit_of_slabbiness', 'ca_t_j_swan_cliff', 'sport', '["sport"]'::jsonb), -- Life, Liberty, and the Pursuit of Slabbiness | 5.10b | <= 50 min on foot
  ('ca_lightning_bar', 'ca_right_side_of_east_face', 'trad', '["trad"]'::jsonb), -- Lightning Bar | 5.6 | <= 5 min on foot
  ('ca_liquid_jesus', 'ca_rock_of_ages', 'sport', '["sport"]'::jsonb), -- Liquid Jesus | 5.11c | <= 30 min on foot
  ('ca_lucy_s_flappin_lips', 'ca_dog_wall', 'trad', '["trad"]'::jsonb), -- Lucy's flappin lips | 5.9+ | <= 20 min on foot
  ('ca_macallan', 'ca_highlands_wall', 'sport', '["sport"]'::jsonb), -- Macallan | 5.9 | <= 45 min on foot
  ('ca_mama_bear', 'ca_64th_birthday_area_on_se_face', 'sport', '["sport"]'::jsonb), -- Mama Bear | 5.8 | <= 5 min on foot
  ('ca_mambo_number_5', 'ca_right_side_of_east_face', 'trad', '["trad"]'::jsonb), -- Mambo  Number 5 | 5.8 | <= 5 min on foot
  ('ca_mamma_s_boy', 'ca_t_j_swan_cliff', 'sport', '["sport"]'::jsonb), -- Mamma's Boy | 5.8 | <= 50 min on foot
  ('ca_mere_image', 'ca_bunny_slopes', 'trad', '["trad"]'::jsonb), -- Mere Image | 5.7 | <= 5 min on foot
  ('ca_metal_pecker', 'ca_north_buttress_2', 'trad', '["trad"]'::jsonb), -- Metal Pecker | 5.7 | <= 50 min on foot
  ('ca_mini_right_facing_corner_roof', 'ca_dog_wall', 'toprope', '["toprope"]'::jsonb), -- mini-right facing corner/roof | 5.10 | <= 20 min on foot
  ('ca_moon_dawg', 'ca_golden_rock', 'trad', '["trad"]'::jsonb), -- Moon Dawg | 5.9+ | <= 45 min on foot
  ('ca_moonah_luna', 'ca_dog_wall', 'trad', '["trad"]'::jsonb), -- Moonah Luna | 5.10a | <= 20 min on foot
  ('ca_moose_and_squirrel', 'ca_golden_rock', 'trad', '["trad"]'::jsonb), -- Moose and Squirrel | 5.10a | <= 45 min on foot
  ('ca_myers_crack', 'ca_t_j_swan_cliff', 'trad', '["trad"]'::jsonb), -- Myers Crack | 5.7 | <= 50 min on foot
  ('ca_neanderthal_jam', 'ca_upper_dinosaur_rock_north_face', 'trad', '["trad"]'::jsonb), -- Neanderthal Jam | 5.10b | <= 15 min on foot
  ('ca_no_hippie_chicks', 'ca_lower_dinosaur_rock_w_face', 'trad', '["trad"]'::jsonb), -- No Hippie Chicks | 5.8 | <= 10 min on foot
  ('ca_no_slick_hippies', 'ca_lower_dinosaur_rock_w_face', 'trad', '["trad"]'::jsonb), -- No Slick Hippies | 5.8 | <= 10 min on foot
  ('ca_obi_wan', 'ca_hurd_lake', 'toprope', '["toprope"]'::jsonb), -- Obi Wan | 5.10b | <= 40 min on foot
  ('ca_off_kilter', 'ca_kilt_wall', 'sport', '["sport"]'::jsonb), -- Off Kilter | 5.9+ | <= 45 min on foot
  ('ca_original_sin', 'ca_rectory_east_face', 'trad', '["trad"]'::jsonb), -- Original Sin | 5.10a | <= 30 min on foot
  ('ca_over_the_band_gap', 'ca_castle_grey_skull', 'toprope', '["toprope"]'::jsonb), -- Over the Band Gap | 5.10a | <= 10 min on foot
  ('ca_oxidation', 'ca_castle_grey_skull', 'toprope', '["toprope"]'::jsonb), -- Oxidation | 5.10a | <= 10 min on foot
  ('ca_papa_bear', 'ca_64th_birthday_area_on_se_face', 'toprope', '["toprope"]'::jsonb), -- Papa Bear | 5.9- | <= 5 min on foot
  ('ca_plaid_to_the_bone', 'ca_kilt_wall', 'sport', '["sport"]'::jsonb), -- Plaid to the Bone | 5.10d | <= 45 min on foot
  ('ca_pony', 'ca_crystal_lake_wall', 'trad', '["trad"]'::jsonb), -- Pony | 5.10 | <= 50 min on foot
  ('ca_pope_on_a_rope', 'ca_rectory_south_face', 'trad', '["trad"]'::jsonb), -- Pope On a Rope | 5.11b | <= 30 min on foot
  ('ca_puppy_puberty', 'ca_lower_dinosaur_rock_w_face', 'trad', '["trad"]'::jsonb), -- Puppy Puberty | 5.10b | <= 10 min on foot
  ('ca_quick_release', 'ca_laser_blade_block', 'sport', '["sport"]'::jsonb), -- Quick Release | 5.12b | <= 10 min on foot
  ('ca_rain_delay', 'ca_od_boulder', 'trad', '["trad"]'::jsonb), -- Rain Delay | 5.5 | <= 5 min on foot
  ('ca_raindance_2', 'ca_bunny_slopes', 'sport', '["sport"]'::jsonb), -- Raindance | 5.7 | <= 5 min on foot
  ('ca_republicans_on_crack', 'ca_lower_tier_2', 'trad', '["trad"]'::jsonb), -- Republicans On Crack | 5.8 | <= 4 min on foot
  ('ca_rhode_island_red', 'ca_upper_dinosaur_rock_north_face', 'trad', '["trad"]'::jsonb), -- Rhode Island Red | 5.9 | <= 15 min on foot
  ('ca_roadkill', 'ca_ugly_arete_boulder', 'sport', '["sport"]'::jsonb), -- Roadkill | 5.11c | <= 5 min on foot
  ('ca_savage_puppy', 'ca_lower_dinosaur_rock_w_face', 'sport', '["sport"]'::jsonb), -- Savage Puppy | 5.11c | <= 10 min on foot
  ('ca_second_choice', 'ca_east_wall_2', 'trad', '["trad"]'::jsonb), -- Second Choice | 5.7 | <= 10 min on foot
  ('ca_secret_agent_man', 'ca_east_face_3', 'sport', '["sport"]'::jsonb), -- Secret Agent Man | 5.12a | <= 50 min on foot
  ('ca_sirocco', 'ca_main_wall_2', 'sport', '["sport"]'::jsonb), -- Sirocco | 5.10b | <= 4 min on foot
  ('ca_slash_and_burn', 'ca_slasher_dome', 'trad', '["trad"]'::jsonb), -- Slash and Burn | 5.10a | <= 45 min on foot
  ('ca_smokin_or_what', 'ca_64th_birthday_area_on_se_face', 'trad', '["trad"]'::jsonb), -- Smokin' Or What? | 5.5 | <= 5 min on foot
  ('ca_solo_slab', 'ca_upper_dinosaur_rock_east_face', 'trad', '["trad"]'::jsonb), -- Solo Slab | 5.8 | <= 15 min on foot
  ('ca_sprockets', 'ca_lower_dinosaur_rock_n_face', 'sport', '["sport"]'::jsonb), -- Sprockets | 5.10c | <= 10 min on foot
  ('ca_stoneware', 'ca_nightmare_tower_east_face', 'sport', '["sport"]'::jsonb), -- Stoneware | 5.7 | <= 5 min on foot
  ('ca_streakin', 'ca_east_wall_2', 'trad', '["trad","toprope"]'::jsonb), -- Streakin' | 5.9 | <= 10 min on foot
  ('ca_street_of_dreams', 'ca_right_side_of_east_face', 'trad', '["trad"]'::jsonb), -- Street of Dreams | 5.7+ | <= 5 min on foot
  ('ca_take_what_you_get', 'ca_od_boulder', 'trad', '["trad"]'::jsonb), -- Take What You Get | 5.8- | <= 5 min on foot
  ('ca_tenuousity', 'ca_dog_wall', 'sport', '["sport"]'::jsonb), -- Tenuousity | 5.10 | <= 20 min on foot
  ('ca_the_bible_belt', 'ca_rectory_south_face', 'trad', '["trad"]'::jsonb), -- The Bible Belt | 5.6 | <= 30 min on foot
  ('ca_the_cradle_will_rock', 'ca_lower_tier_2', 'sport', '["sport"]'::jsonb), -- The Cradle Will Rock | 5.10+ | <= 4 min on foot
  ('ca_the_ripper', 'ca_slasher_dome', 'trad', '["trad"]'::jsonb), -- The Ripper | 5.10a | <= 45 min on foot
  ('ca_the_sinner', 'ca_temple_of_doom', 'trad', '["trad"]'::jsonb), -- The Sinner | 5.12a/b | <= 30 min on foot
  ('ca_the_slasher', 'ca_slasher_dome', 'sport', '["sport"]'::jsonb), -- The Slasher | 5.12a | <= 45 min on foot
  ('ca_the_thornbirds', 'ca_rock_of_ages', 'trad', '["trad"]'::jsonb), -- The Thornbirds | 5.10a/b | <= 30 min on foot
  ('ca_the_three_best_holds_your_hands_ever_had', 'ca_lower_dinosaur_rock_corridor_climbs', 'toprope', '["toprope"]'::jsonb), -- The Three Best Holds Your Hands Ever Had | 5.10b | <= 15 min on foot
  ('ca_time_warp_3', 'ca_east_wall_2', 'trad', '["trad","toprope"]'::jsonb), -- Time Warp | 5.9 | <= 10 min on foot
  ('ca_tj_hooker', 'ca_t_j_swan_cliff', 'sport', '["sport"]'::jsonb), -- TJ Hooker | 5.10a | <= 50 min on foot
  ('ca_top_rope_section', 'ca_dog_wall', 'toprope', '["toprope"]'::jsonb), -- Top rope section | 5.12a | <= 20 min on foot
  ('ca_trad_dad_s', 'ca_pyramid_the', 'trad', '["trad"]'::jsonb), -- Trad Dad's | 5.9 | <= 40 min on foot
  ('ca_tri_tip_and_corn', 'ca_nightmare_tower_west_face', 'sport', '["sport"]'::jsonb), -- Tri-Tip and Corn | 5.10a | <= 5 min on foot
  ('ca_tweekin', 'ca_east_wall_2', 'trad', '["trad","toprope"]'::jsonb), -- Tweekin' | 5.10a | <= 10 min on foot
  ('ca_ugly_arete', 'ca_ugly_arete_boulder', 'sport', '["sport"]'::jsonb), -- Ugly Arete | 5.12a | <= 5 min on foot
  ('ca_unknown_133', 'ca_stately_pleasure_dome', 'sport', '["sport"]'::jsonb), -- Unknown | 5.6 | <= 5 min on foot
  ('ca_unknown_5_10a_2', 'ca_punk_rock_west_face', 'sport', '["sport"]'::jsonb), -- Unknown 5.10a | 5.10a | <= 15 min on foot
  ('ca_unknown_5_7_2', 'ca_right_side_of_east_face', 'trad', '["trad"]'::jsonb), -- Unknown 5.7 | 5.7 | <= 5 min on foot
  ('ca_unnamed_10c_toprope', 'ca_east_wall_2', 'toprope', '["toprope"]'::jsonb), -- Unnamed 10c toprope | 5.10+ | <= 10 min on foot
  ('ca_velociraptor_2', 'ca_lower_dinosaur_rock_n_face', 'trad', '["trad"]'::jsonb), -- Velociraptor | 5.10a | <= 10 min on foot
  ('ca_view_to_a_kilt', 'ca_kilt_wall', 'sport', '["sport"]'::jsonb), -- View to a Kilt | 5.11a | <= 45 min on foot
  ('ca_water_boy_2', 'ca_pyramid_the', 'trad', '["trad"]'::jsonb), -- Water Boy | 5.7 | <= 40 min on foot
  ('ca_whoop_chicken', 'ca_crystal_lake_wall', 'sport', '["sport"]'::jsonb), -- Whoop Chicken | 5.12d | <= 50 min on foot
  ('ca_wild_in_the_streaks', 'ca_bunny_slopes', 'trad', '["trad"]'::jsonb), -- Wild in the Streaks | 5.7 | <= 5 min on foot
  ('ca_wild_turkey_arete', 'ca_arctic_temple', 'trad', '["trad"]'::jsonb), -- Wild Turkey Arete | 5.9 | <= 40 min on foot
  ('ca_wooly_mammoth', 'ca_lower_dinosaur_rock_n_face', 'trad', '["trad"]'::jsonb), -- Wooly Mammoth | 5.7 | <= 10 min on foot
  ('ca_wrenched', 'ca_nightmare_tower_west_face', 'toprope', '["toprope"]'::jsonb), -- Wrenched | 5.9 | <= 5 min on foot
  ('ca_yoda', 'ca_hurd_lake', 'toprope', '["toprope"]'::jsonb), -- Yoda | 5.10c | <= 40 min on foot
  ('ca_you_can_call_me_al_dude', 'ca_penstemon_dome_east_face', 'sport', '["sport"]'::jsonb), -- You Can Call me Al, Dude | 5.10a | <= 45 min on foot
  ('ca_zyzzyx', 'ca_lower_tier_2', 'sport', '["sport"]'::jsonb), -- Zyzzyx | 5.10a | <= 4 min on foot
  ('co_2nd_apron_center', 'co_aprons_the', 'trad', '["trad"]'::jsonb), -- 2nd Apron Center | 5.7 | <= 35 min on foot
  ('co_2nd_apron_far_left', 'co_aprons_the', 'trad', '["trad"]'::jsonb), -- 2nd Apron Far Left | 5.8 | <= 35 min on foot
  ('co_3rd_apron_left', 'co_aprons_the', 'trad', '["trad"]'::jsonb), -- 3rd Apron Left | 5.7+ | <= 35 min on foot
  ('co_a_twitch_upon_the_thread_submitted_as_unknown', 'co_main_wall_15', 'sport', '["sport"]'::jsonb), -- A Twitch Upon the Thread (submitted as Unknown) | 5.11 | <= 25 min on foot
  ('co_acidification', 'co_coral_the', 'trad', '["trad"]'::jsonb), -- Acidification | 5.10a | <= 30 min on foot
  ('co_back_to_school', 'co_bionut_wall', 'trad', '["trad"]'::jsonb), -- Back to School | 5.10 | <= 5 min on foot
  ('co_basalt_assault', 'co_bionut_wall', 'trad', '["trad"]'::jsonb), -- Basalt Assault | 5.10 | <= 5 min on foot
  ('co_birds_of_prey_approach', 'co_eyrie_sector_the', 'sport', '["sport"]'::jsonb), -- Birds of Prey (approach) | 5.11 | <= 25 min on foot
  ('co_blue_horizon', 'co_wave_the_2', 'sport', '["sport"]'::jsonb), -- Blue Horizon | 5.8 | <= 30 min on foot
  ('co_bottom_feeder_5', 'co_coral_the', 'trad', '["trad"]'::jsonb), -- Bottom Feeder | 5.10b | <= 30 min on foot
  ('co_breakdown', 'co_instant_karma_cliff', 'trad', '["trad"]'::jsonb), -- Breakdown | 5.10b | <= 50 min on foot
  ('co_cary_granite', 'co_black_wall_the', 'trad', '["trad"]'::jsonb), -- Cary Granite | 5.11c | <= 40 min on foot
  ('co_cat_tracks', 'co_main_wall_15', 'trad', '["trad","sport"]'::jsonb), -- Cat Tracks | 5.11c | <= 25 min on foot
  ('co_cheap_date_1st_apron', 'co_aprons_the', 'trad', '["trad"]'::jsonb), -- Cheap Date [1st Apron] | 5.9 | <= 35 min on foot
  ('co_comes_a_time_2', 'co_7_f_y_forever_young_wall', 'trad', '["trad"]'::jsonb), -- Comes A Time | 5.11+ | hand-read approach
  ('co_cool_corner', 'co_bionut_wall', 'sport', '["sport"]'::jsonb), -- Cool Corner | 5.11- | <= 5 min on foot
  ('co_dear_sergio', 'co_lincoln_lake_slabs', 'trad', '["trad"]'::jsonb), -- Dear Sergio | 5.13- | <= 5 min on foot
  ('co_egressus', 'co_easter_island', 'trad', '["trad","toprope"]'::jsonb), -- Egressus | 5.8 | <= 50 min on foot
  ('co_ellie_s_route', 'co_bionut_wall', 'trad', '["trad"]'::jsonb), -- Ellie's Route | 5.10 | <= 5 min on foot
  ('co_everybody_knows_this_is_nowhere', 'co_7_f_y_forever_young_wall', 'trad', '["trad"]'::jsonb), -- Everybody Knows This Is Nowhere | 5.10d | hand-read approach
  ('co_four_strong_winds', 'co_7_f_y_forever_young_wall', 'trad', '["trad"]'::jsonb), -- Four Strong Winds | 5.11b/c | hand-read approach
  ('co_further_on_up_the_road', 'co_putterman_s_dome', 'sport', '["sport"]'::jsonb), -- Further On Up The Road | 5.10c/d | <= 15 min on foot
  ('co_gettin_barreled', 'co_wave_the_2', 'trad', '["trad"]'::jsonb), -- Gettin' Barreled | 5.10+ | <= 30 min on foot
  ('co_held_under', 'co_wave_the_2', 'trad', '["trad"]'::jsonb), -- Held Under | 5.10b | <= 30 min on foot
  ('co_here_s_johnny', 'co_bionut_wall', 'trad', '["trad"]'::jsonb), -- Here's Johnny | 5.9+ | <= 5 min on foot
  ('co_high_five_2', 'co_bionut_wall', 'trad', '["trad"]'::jsonb), -- High Five | 5.11 | <= 5 min on foot
  ('co_i_d_give_my_left_nut', 'co_easter_island', 'trad', '["trad"]'::jsonb), -- I'd Give My Left Nut | 5.9 | <= 50 min on foot
  ('co_inside_job', 'co_wave_the_2', 'trad', '["trad"]'::jsonb), -- Inside Job | 5.10a | <= 30 min on foot
  ('co_invisible_crowns', 'co_main_wall_15', 'trad', '["trad"]'::jsonb), -- Invisible Crowns | 5.12c | <= 25 min on foot
  ('co_junk_show_direct', 'co_junk_show_pinnacle', 'trad', '["trad"]'::jsonb), -- Junk Show Direct | 5.11a | <= 20 min on foot
  ('co_ka_right_variation', 'co_old_goat_wall', 'trad', '["trad"]'::jsonb), -- KA Right Variation | 5.10a | <= 60 min on foot
  ('co_karma_corner', 'co_instant_karma_cliff', 'trad', '["trad"]'::jsonb), -- Karma Corner | 5.8 | <= 50 min on foot
  ('co_key_to_the_highway', 'co_putterman_s_dome', 'sport', '["sport"]'::jsonb), -- Key To The Highway | 5.11b | <= 15 min on foot
  ('co_king_of_the_mountain', 'co_main_wall_15', 'trad', '["trad","sport"]'::jsonb), -- King of the Mountain | 5.13a | <= 25 min on foot
  ('co_king_s_crown', 'co_quandary_peak_routes', 'trad', '["trad"]'::jsonb), -- King's Crown | 5.7 | <= 5 min on foot
  ('co_kundalini', 'co_instant_karma_cliff', 'trad', '["trad"]'::jsonb), -- Kundalini | 5.10c | <= 50 min on foot
  ('co_loosey_in_the_sky', 'co_main_wall_15', 'trad', '["trad","sport"]'::jsonb), -- Loosey In The Sky | 5.12a/b | <= 25 min on foot
  ('co_mammary_lane', 'co_lair_the', 'sport', '["sport"]'::jsonb), -- Mammary Lane | 5.10- | <= 5 min on foot
  ('co_marmot_arete', 'co_corner_area', 'trad', '["trad"]'::jsonb), -- Marmot Arete | 5.9- | <= 60 min on foot
  ('co_marmot_dihedral', 'co_corner_area', 'trad', '["trad"]'::jsonb), -- Marmot Dihedral | 5.7 | <= 60 min on foot
  ('co_miner_s_revenge', 'co_montgomery_reservoir', 'sport', '["sport"]'::jsonb), -- Miner's Revenge | 5.10a/b | <= 5 min on foot
  ('co_moai_don_geddit', 'co_easter_island', 'trad', '["trad"]'::jsonb), -- Moai Don Geddit | 5.10a | <= 50 min on foot
  ('co_mule_too', 'co_tool_wall_tool_tower', 'sport', '["sport"]'::jsonb), -- Mule Too | 5.10b | <= 5 min on foot
  ('co_oil_slick', 'co_wave_the_2', 'trad', '["trad"]'::jsonb), -- Oil Slick | 5.9+ | <= 30 min on foot
  ('co_option_1', 'co_rip_rap', 'trad', '["trad"]'::jsonb), -- Option 1 | 5.8+ | <= 30 min on foot
  ('co_option_2', 'co_rip_rap', 'trad', '["trad"]'::jsonb), -- Option 2 | 5.8- | <= 30 min on foot
  ('co_option_3', 'co_rip_rap', 'trad', '["trad"]'::jsonb), -- Option 3 | 5.8 | <= 30 min on foot
  ('co_option_4', 'co_rip_rap', 'sport', '["sport"]'::jsonb), -- Option 4 | 5.6 | <= 30 min on foot
  ('co_pandemonium_2', 'co_main_wall_15', 'sport', '["sport"]'::jsonb), -- Pandemonium | 5.9+ | <= 25 min on foot
  ('co_persistence_2', 'co_instant_karma_cliff', 'trad', '["trad"]'::jsonb), -- Persistence | 5.9 | <= 50 min on foot
  ('co_plow_position', 'co_instant_karma_cliff', 'trad', '["trad"]'::jsonb), -- Plow Position | 5.9 | <= 50 min on foot
  ('co_puddleglum', 'co_sakkety_point', 'trad', '["trad","toprope"]'::jsonb), -- Puddleglum | 5.5 | <= 5 min on foot
  ('co_riptide', 'co_outer_banks', 'trad', '["trad"]'::jsonb), -- Riptide | 5.10b | <= 30 min on foot
  ('co_sailing_home', 'co_outer_banks', 'trad', '["trad"]'::jsonb), -- Sailing Home | 5.10b | <= 30 min on foot
  ('co_second_reincarnation_of_the_golden_goat', 'co_quandary_peak_routes', 'trad', '["trad"]'::jsonb), -- Second Reincarnation of the Golden Goat | 5.6 | <= 5 min on foot
  ('co_shark_bite', 'co_coral_the', 'trad', '["trad"]'::jsonb), -- Shark Bite | 5.7 | <= 30 min on foot
  ('co_snowblind', 'co_quandary_peak_routes', 'trad', '["trad","toprope"]'::jsonb), -- Snowblind | 5.8- | <= 5 min on foot
  ('co_sphincteritis', 'co_easter_island', 'trad', '["trad","toprope"]'::jsonb), -- Sphincteritis | 5.9 | <= 50 min on foot
  ('co_spillway', 'co_montgomery_reservoir', 'sport', '["sport"]'::jsonb), -- Spillway | 5.5 | <= 5 min on foot
  ('co_stone_warrior', 'co_lair_the', 'sport', '["sport"]'::jsonb), -- Stone Warrior | 5.12b | <= 5 min on foot
  ('co_surfing_in_a_snowstorm', 'co_wave_the_2', 'sport', '["sport"]'::jsonb), -- Surfing in a Snowstorm | 5.6 | <= 30 min on foot
  ('co_tank_tracks', 'co_easter_island', 'trad', '["trad"]'::jsonb), -- Tank Tracks | 5.10 | <= 50 min on foot
  ('co_tap_line', 'co_lair_the', 'sport', '["sport"]'::jsonb), -- Tap Line | 5.9 | <= 5 min on foot
  ('co_the_boneyard', 'co_easter_island', 'trad', '["trad"]'::jsonb), -- The Boneyard | 5.10 | <= 50 min on foot
  ('co_the_golden_goat_buttress', 'co_quandary_peak_routes', 'trad', '["trad"]'::jsonb), -- The Golden Goat Buttress | 5.6 | <= 5 min on foot
  ('co_the_napkin_2nd_apron', 'co_aprons_the', 'trad', '["trad"]'::jsonb), -- The Napkin (2nd Apron) | 5.7+ | <= 35 min on foot
  ('co_the_northeast_face', 'co_innuendo_spire', 'trad', '["trad"]'::jsonb), -- The Northeast Face | 5.8- | <= 50 min on foot
  ('co_thriller_2', 'co_lair_the', 'trad', '["trad","sport"]'::jsonb), -- Thriller | 5.12a/b | <= 5 min on foot
  ('co_unknown_broken_chimney', 'co_instant_karma_cliff', 'trad', '["trad"]'::jsonb), -- Unknown Broken Chimney | 5.8+ | <= 50 min on foot
  ('co_wings_of_glory', 'co_eyrie_sector_the', 'sport', '["sport"]'::jsonb), -- Wings of Glory | 5.12 | <= 25 min on foot
  ('co_women_and_power_tools', 'co_tool_wall_tool_tower', 'sport', '["sport"]'::jsonb), -- Women and Power Tools | 5.10c | <= 5 min on foot
  ('co_worthy_endeavor', 'co_frasco_s_toe', 'trad', '["trad"]'::jsonb), -- Worthy Endeavor | 5.11a/b | <= 5 min on foot
  ('id_34_24', 'id_main_wall', 'sport', '["sport"]'::jsonb), -- 34/24 | 5.12c | <= 60 min on foot
  ('id_apple_num_num', 'id_east_gully', 'sport', '["sport"]'::jsonb), -- Apple Num Num | 5.11a | <= 5 min on foot
  ('id_ataya', 'id_main_wall', 'sport', '["sport"]'::jsonb), -- Ataya | 5.11c | <= 60 min on foot
  ('id_baker_s_magical_adventure', 'id_carl_sagan_wall', 'sport', '["sport"]'::jsonb), -- Baker's Magical Adventure | 5.10a | <= 10 min on foot
  ('id_belay_bunny_blues', 'id_main_wall_the', 'trad', '["trad"]'::jsonb), -- Belay Bunny Blues | 5.11+ | <= 40 min on foot
  ('id_blue_sky_thinking', 'id_campsite_wall', 'sport', '["sport"]'::jsonb), -- Blue Sky Thinking | 5.11 | <= 5 min on foot
  ('id_bonsai_tree', 'id_via_ferrata_wall', 'sport', '["sport"]'::jsonb), -- Bonsai Tree | 5.9+ | <= 60 min on foot
  ('id_catacombs', 'id_west_face', 'trad', '["trad"]'::jsonb), -- Catacombs | 5.7 | <= 30 min on foot
  ('id_center_route', 'id_left_side_the', 'trad', '["trad"]'::jsonb), -- Center Route | 5.10 | <= 40 min on foot
  ('id_check_yr_chert_at_the_door', 'id_lower_tier', 'sport', '["sport"]'::jsonb), -- Check Yr Chert At The Door | 5.7 | <= 40 min on foot
  ('id_chert_albert', 'id_main_wall_the', 'trad', '["trad"]'::jsonb), -- Chert Albert | 5.12b | <= 40 min on foot
  ('id_cluckers_variation', 'id_branz_wall', 'trad', '["trad"]'::jsonb), -- Cluckers variation | 5.10+ | <= 10 min on foot
  ('id_dirt_nap', 'id_east_gully', 'sport', '["sport"]'::jsonb), -- Dirt Nap | 5.8 | <= 5 min on foot
  ('id_drama_queen', 'id_main_wall_the', 'trad', '["trad"]'::jsonb), -- Drama Queen | 5.12b | <= 40 min on foot
  ('id_drink_up_buttercup', 'id_main_wall', 'sport', '["sport"]'::jsonb), -- Drink Up Buttercup | 5.11b | <= 60 min on foot
  ('id_event_horizon', 'id_branz_wall', 'trad', '["trad"]'::jsonb), -- Event Horizon | 5.9 | <= 10 min on foot
  ('id_event_horizon_variation', 'id_branz_wall', 'trad', '["trad"]'::jsonb), -- Event Horizon variation | 5.10+ | <= 10 min on foot
  ('id_feature_creep', 'id_left_side_the', 'trad', '["trad"]'::jsonb), -- Feature Creep | 5.10+ | <= 40 min on foot
  ('id_fifth_route', 'id_left_side_the', 'trad', '["trad"]'::jsonb), -- Fifth route | 5.10 | <= 40 min on foot
  ('id_fourth_route', 'id_left_side_the', 'trad', '["trad"]'::jsonb), -- Fourth route | 5.10 | <= 40 min on foot
  ('id_guevedoces', 'id_main_wall_the', 'trad', '["trad"]'::jsonb), -- Guevedoces | 5.10d | <= 40 min on foot
  ('id_hair_chert', 'id_right_flank_the', 'sport', '["sport"]'::jsonb), -- Hair Chert | 5.12a | <= 40 min on foot
  ('id_happy_bunny', 'id_main_wall_the', 'trad', '["trad"]'::jsonb), -- Happy Bunny | 5.12b | <= 40 min on foot
  ('id_j_dub_line', 'id_main_wall_the', 'trad', '["trad"]'::jsonb), -- J Dub Line | 5.12a/b | <= 40 min on foot
  ('id_little_dark_cloud', 'id_via_ferrata_wall', 'sport', '["sport"]'::jsonb), -- Little Dark Cloud | 5.9 | <= 60 min on foot
  ('id_obstinacy', 'id_lower_tier', 'trad', '["trad"]'::jsonb), -- Obstinacy | 5.11c | <= 40 min on foot
  ('id_one_rainy_wish', 'id_via_ferrata_wall', 'sport', '["sport"]'::jsonb), -- One Rainy Wish | 5.7+ | <= 60 min on foot
  ('id_open_book_2', 'id_east_gully', 'trad', '["trad"]'::jsonb), -- Open Book | 5.7 | <= 5 min on foot
  ('id_professor_fuckwit', 'id_lower_tier', 'sport', '["sport"]'::jsonb), -- Professor Fuckwit | 5.12a | <= 40 min on foot
  ('id_rte_1', 'id_lower_tier', 'sport', '["sport"]'::jsonb), -- Rte 1 | 5.10- | <= 40 min on foot
  ('id_rte_2', 'id_lower_tier', 'sport', '["sport"]'::jsonb), -- Rte 2 | 5.10 | <= 40 min on foot
  ('id_rte_3', 'id_lower_tier', 'sport', '["sport"]'::jsonb), -- Rte 3 | 5.10+ | <= 40 min on foot
  ('id_soft_serve', 'id_via_ferrata_wall', 'sport', '["sport"]'::jsonb), -- Soft Serve | 5.9 | <= 60 min on foot
  ('id_song_of_nine_winds', 'id_main_wall', 'sport', '["sport"]'::jsonb), -- Song of Nine Winds | 5.11b | <= 60 min on foot
  ('id_sweet_pea_2', 'id_east_gully', 'sport', '["sport"]'::jsonb), -- Sweet Pea | 5.10d | <= 5 min on foot
  ('id_taming_free_radicals', 'id_campsite_wall', 'sport', '["sport"]'::jsonb), -- Taming Free Radicals | 5.11 | <= 5 min on foot
  ('id_the_extortionist', 'id_left_side_the', 'trad', '["trad"]'::jsonb), -- The Extortionist | 5.10 | <= 40 min on foot
  ('id_thumbs_down', 'id_via_ferrata_wall', 'sport', '["sport"]'::jsonb), -- Thumbs Down | 5.11b | <= 60 min on foot
  ('id_unnamed_sport_climb_2', 'id_east_gully', 'sport', '["sport"]'::jsonb), -- Unnamed Sport Climb #2 | 5.10a | <= 5 min on foot
  ('id_whoopsie_daisy', 'id_east_gully', 'sport', '["sport"]'::jsonb), -- Whoopsie Daisy | 5.10a | <= 5 min on foot
  ('nh_ambrosia', 'nh_whitney_gilman_area', 'trad', '["trad"]'::jsonb), -- Ambrosia | 5.8 | <= 8 min on foot
  ('nh_beware_of_the_dog_mid_climb_variation', 'nh_slabs', 'trad', '["trad"]'::jsonb), -- Beware of the Dog (Mid-Climb Variation) | 5.9 | <= 40 min on foot
  ('nh_blockade_direct', 'nh_slabs', 'trad', '["trad"]'::jsonb), -- Blockade Direct ? | 5.9 | <= 40 min on foot
  ('nh_bound_by_blood', 'nh_01_main_wall', 'trad', '["trad"]'::jsonb), -- Bound By Blood | 5.12c | <= 50 min on foot
  ('nh_cannonade', 'nh_whitney_gilman_area', 'trad', '["trad"]'::jsonb), -- Cannonade | 5.4 | <= 8 min on foot
  ('nh_cirrus', 'nh_slabs', 'trad', '["trad"]'::jsonb), -- Cirrus | 5.11b | <= 40 min on foot
  ('nh_coin_de_la_souris', 'nh_02_gulley_no_1_buttress', 'trad', '["trad"]'::jsonb), -- Coin de la Souris | 5.5 | <= 10 min on foot
  ('nh_condescender', 'nh_slabs', 'trad', '["trad"]'::jsonb), -- Condescender | 5.11a | <= 40 min on foot
  ('nh_dihedral', 'nh_05_ben_wall_aka_crawford_crack_crag_by_rt_302', 'trad', '["trad"]'::jsonb), -- Dihedral | 5.8+ | <= 2 min on foot
  ('nh_farewell_angelina', 'nh_01_main_wall', 'trad', '["trad"]'::jsonb), -- Farewell Angelina | 5.11d | <= 50 min on foot
  ('nh_fresh_squeezed_2', 'nh_01_willey_brook_ravine', 'trad', '["trad"]'::jsonb), -- Fresh Squeezed | 5.8 | <= 2 min on foot
  ('nh_gamma_ray_mid_cliff_start', 'nh_03_main_slab', 'trad', '["trad"]'::jsonb), -- Gamma Ray (Mid-cliff start) | 5.6 | <= 10 min on foot
  ('nh_luck_of_the_green', 'nh_02_right_flank', 'trad', '["trad"]'::jsonb), -- Luck of the Green | 5.11c | <= 50 min on foot
  ('nh_meatgrinder', 'nh_whitney_gilman_area', 'trad', '["trad"]'::jsonb), -- Meatgrinder | 5.10+ | <= 8 min on foot
  ('nh_muir', 'nh_whitney_gilman_area', 'trad', '["trad"]'::jsonb), -- Muir | 5.7 | <= 8 min on foot
  ('nh_pin_it_p1', 'nh_01_main_wall', 'trad', '["trad"]'::jsonb), -- Pin it (P1) | 5.11- | <= 50 min on foot
  ('nh_pin_it_to_win_it', 'nh_01_main_wall', 'trad', '["trad"]'::jsonb), -- Pin It to Win It | 5.13b | <= 50 min on foot
  ('nh_she_gave_us_the_willy_s', 'nh_01_willey_brook_ravine', 'trad', '["trad"]'::jsonb), -- She Gave Us The Willy's | 5.9 | <= 2 min on foot
  ('nh_stoned_fingers_p1', 'nh_01_main_wall', 'trad', '["trad"]'::jsonb), -- Stoned Fingers (P1) | 5.8 | <= 50 min on foot
  ('nh_super_best_bubs', 'nh_01_main_wall', 'trad', '["trad"]'::jsonb), -- Super Best Bubs | 5.11c | <= 50 min on foot
  ('nh_the_wide_one', 'nh_05_ben_wall_aka_crawford_crack_crag_by_rt_302', 'trad', '["trad"]'::jsonb), -- The Wide One | 5.10 | <= 2 min on foot
  ('nh_twins', 'nh_05_ben_wall_aka_crawford_crack_crag_by_rt_302', 'trad', '["trad"]'::jsonb), -- Twins | 5.9+ | <= 2 min on foot
  ('nh_wet_shoes_sound_mind', 'nh_02_right_flank', 'trad', '["trad"]'::jsonb), -- Wet Shoes Sound Mind | 5.9 | <= 50 min on foot
  ('nh_willey_brook_bandits', 'nh_01_willey_brook_ravine', 'sport', '["sport"]'::jsonb), -- Willey Brook Bandits | 5.11c | <= 2 min on foot
  ('nm_1993_a_face_odyssey', 'nm_upper_science_friction', 'trad', '["trad"]'::jsonb), -- 1993: A Face Odyssey | 5.11a | <= 25 min on foot
  ('nm_arabesque', 'nm_lower_slabs_the', 'trad', '["trad"]'::jsonb), -- Arabesque | 5.10+ | <= 60 min on foot
  ('nm_bad_fun', 'nm_pino_wall', 'trad', '["trad"]'::jsonb), -- Bad Fun | 5.10b | hand-read approach
  ('nm_crujida_de_la_reina', 'nm_castle_the', 'trad', '["trad"]'::jsonb), -- Crujida de la Reina | 5.9 | <= 35 min on foot
  ('nm_crujida_fria', 'nm_castle_the', 'trad', '["trad"]'::jsonb), -- Crujida Fria | 5.11c | <= 35 min on foot
  ('nm_derelict', 'nm_lower_slabs_the', 'trad', '["trad"]'::jsonb), -- Derelict | 5.10 | <= 60 min on foot
  ('nm_desert_man', 'nm_pino_wall', 'trad', '["trad"]'::jsonb), -- Desert Man | 5.10a/b | hand-read approach
  ('nm_dust_to_dust', 'nm_pino_wall', 'trad', '["trad"]'::jsonb), -- Dust to Dust | 5.11a | hand-read approach
  ('nm_east_ridge_3', 'nm_great_potato_mt_ore_ida_the', 'trad', '["trad"]'::jsonb), -- East Ridge | 5.6 | <= 60 min on foot
  ('nm_jalopy', 'nm_lower_slabs_the', 'trad', '["trad"]'::jsonb), -- Jalopy | 5.9 | <= 60 min on foot
  ('nm_knackered', 'nm_donald_duck', 'trad', '["trad","toprope"]'::jsonb), -- Knackered | 5.10a | <= 30 min on foot
  ('nm_license_and_a_visa', 'nm_pino_wall', 'sport', '["sport"]'::jsonb), -- License and a Visa | 5.11b/c | hand-read approach
  ('nm_little_bits', 'nm_upper_science_friction', 'trad', '["trad"]'::jsonb), -- Little Bits | 5.10a | <= 25 min on foot
  ('nm_northeast_corner', 'nm_donald_duck', 'trad', '["trad"]'::jsonb), -- Northeast Corner | 5.8 | <= 30 min on foot
  ('nm_parallel_universe', 'nm_pino_wall', 'trad', '["trad"]'::jsonb), -- Parallel Universe | 5.12a/b | hand-read approach
  ('nm_pub_draught_guinness', 'nm_upper_science_friction', 'trad', '["trad"]'::jsonb), -- Pub Draught Guinness | 5.8+ | <= 25 min on foot
  ('nm_quack', 'nm_el_tecolote', 'trad', '["trad"]'::jsonb), -- Quack | 5.9 | <= 35 min on foot
  ('nm_ramshackle', 'nm_lower_slabs_the', 'trad', '["trad"]'::jsonb), -- Ramshackle | 5.9 | <= 60 min on foot
  ('nm_red_dawn', 'nm_pino_wall', 'trad', '["trad"]'::jsonb), -- Red Dawn | 5.11c | hand-read approach
  ('nm_sand_in_my_sombrero', 'nm_el_tecolote', 'trad', '["trad"]'::jsonb), -- Sand in My Sombrero | 5.10c | <= 35 min on foot
  ('nm_short_timing', 'nm_upper_science_friction', 'trad', '["trad"]'::jsonb), -- Short Timing | 5.10+ | <= 25 min on foot
  ('nm_tecolote_sin_nombre', 'nm_el_tecolote', 'trad', '["trad"]'::jsonb), -- Tecolote Sin Nombre | 5.11b/c | <= 35 min on foot
  ('nm_the_cha_cha', 'nm_donald_duck', 'trad', '["trad","toprope"]'::jsonb), -- The Cha Cha | 5.10d | <= 30 min on foot
  ('nm_threadbare', 'nm_lower_slabs_the', 'trad', '["trad"]'::jsonb), -- Threadbare | 5.11- | <= 60 min on foot
  ('nm_unknown_off_width', 'nm_donald_duck', 'trad', '["trad"]'::jsonb), -- Unknown off-width | 5.9 | <= 30 min on foot
  ('nm_upper_south_ridge', 'nm_castle_the', 'trad', '["trad"]'::jsonb), -- Upper South Ridge | 5.10+ | <= 35 min on foot
  ('nv_don_t_call_me_white', 'nv_hinkey_summit', 'sport', '["sport"]'::jsonb), -- Don't Call Me White | 5.10+ | <= 5 min on foot
  ('nv_melarkey_street', 'nv_cleft_the', 'sport', '["sport"]'::jsonb), -- Melarkey Street | 5.8 | <= 15 min on foot
  ('nv_paiute_pockets', 'nv_cleft_the', 'sport', '["sport"]'::jsonb), -- Paiute Pockets | 5.9 | <= 15 min on foot
  ('nv_solid_silver_on_the_hinkey_hop_crag', 'nv_hinkey_summit', 'sport', '["sport"]'::jsonb), -- Solid Silver (on the Hinkey Hop Crag) | 5.6 | <= 5 min on foot
  ('nv_unknown_left', 'nv_shady_rock', 'toprope', '["toprope"]'::jsonb), -- Unknown Left | 5.11a | <= 5 min on foot
  ('nv_unknown_middle', 'nv_shady_rock', 'toprope', '["toprope"]'::jsonb), -- Unknown Middle | 5.10c | <= 5 min on foot
  ('nv_unknown_right', 'nv_shady_rock', 'toprope', '["toprope"]'::jsonb), -- Unknown Right | 5.8 | <= 5 min on foot
  ('or_gingivitis', 'or_middle_limpy', 'trad', '["trad"]'::jsonb), -- Gingivitis | 5.10 | <= 5 min on foot
  ('or_limpy_express_line', 'or_middle_limpy', 'trad', '["trad"]'::jsonb), -- Limpy Express Line | 5.10b/c | <= 5 min on foot
  ('or_talweg', 'or_middle_limpy', 'trad', '["trad"]'::jsonb), -- Talweg | 5.10 | <= 5 min on foot
  ('tx_english_rose', 'tx_mammoth_rock', 'trad', '["trad"]'::jsonb), -- English Rose | 5.9 | <= 60 min on foot
  ('tx_local_loser', 'tx_mammoth_rock', 'sport', '["sport"]'::jsonb), -- Local Loser | 5.11 | <= 60 min on foot
  ('tx_skin_bridge', 'tx_mammoth_rock', 'sport', '["sport"]'::jsonb), -- Skin Bridge | 5.10+ | <= 60 min on foot
  ('tx_that_freeman_hardy_and_willis_acid', 'tx_mammoth_rock', 'sport', '["sport"]'::jsonb), -- that freeman, hardy and willis acid | 5.11 | <= 60 min on foot
  ('tx_wrangels_original', 'tx_mammoth_rock', 'trad', '["trad"]'::jsonb), -- Wrangels Original | 5.8 | <= 60 min on foot
  ('ut_ac_dc_crack', 'ut_window_rock', 'trad', '["trad"]'::jsonb), -- AC/DC Crack | 5.9 | <= 5 min on foot
  ('ut_alcohol_rub_out', 'ut_melting_mud_west', 'sport', '["sport"]'::jsonb), -- Alcohol Rub Out | 5.10b | <= 5 min on foot
  ('ut_angle_of_repose_2', 'ut_slums_the', 'sport', '["sport"]'::jsonb), -- Angle of Repose | 5.12a | <= 5 min on foot
  ('ut_big_heir', 'ut_millie_tower_12_crag_aka_killer', 'trad', '["trad"]'::jsonb), -- Big Heir | 5.10 | <= 5 min on foot
  ('ut_death_of_a_sling', 'ut_mt_superior_monte_cristo', 'trad', '["trad"]'::jsonb), -- Death of a Sling | 5.7 | <= 40 min on foot
  ('ut_devil_s_advocate', 'ut_melting_mud_west', 'sport', '["sport"]'::jsonb), -- Devil's Advocate | 5.9+ | <= 5 min on foot
  ('ut_devil_s_lettuce', 'ut_devil_s_castle', 'sport', '["sport"]'::jsonb), -- Devil's Lettuce | 5.12a | <= 30 min on foot
  ('ut_devil_s_tongue', 'ut_devil_s_tongue', 'sport', '["sport"]'::jsonb), -- Devil's Tongue | 5.10+ | <= 30 min on foot
  ('ut_devils_advocate_on_crack', 'ut_melting_mud_west', 'sport', '["sport"]'::jsonb), -- Devils Advocate on Crack | 5.10a | <= 5 min on foot
  ('ut_dwarf_tossing', 'ut_zoo_the_2', 'sport', '["sport"]'::jsonb), -- Dwarf Tossing | 5.12b | <= 5 min on foot
  ('ut_get_you_some', 'ut_jenga_wall', 'sport', '["sport"]'::jsonb), -- Get You Some | 5.8+ | <= 5 min on foot
  ('ut_halloween_corner', 'ut_far_out_frighton', 'trad', '["trad"]'::jsonb), -- Halloween Corner | 5.8 | <= 30 min on foot
  ('ut_hidden_hand_crack', 'ut_far_out_frighton', 'trad', '["trad"]'::jsonb), -- ? Hidden Hand Crack ? | 5.7 | <= 30 min on foot
  ('ut_how_ya_lichen_it', 'ut_zoo_the_2', 'sport', '["sport"]'::jsonb), -- How Ya ' Lichen it | 5.11a | <= 5 min on foot
  ('ut_it_s_no_secret', 'ut_zoo_the_2', 'sport', '["sport"]'::jsonb), -- It's No Secret | 5.11a | <= 5 min on foot
  ('ut_midget_marathon', 'ut_zoo_the_2', 'sport', '["sport"]'::jsonb), -- Midget Marathon | 5.9 | <= 5 min on foot
  ('ut_mouse', 'ut_millie_tower_12_crag_aka_killer', 'sport', '["sport"]'::jsonb), -- Mouse | 5.9+ | <= 5 min on foot
  ('ut_rasta_pocket', 'ut_melting_mud_west', 'sport', '["sport"]'::jsonb), -- Rasta Pocket | 5.10- | <= 5 min on foot
  ('ut_reconciliation', 'ut_window_rock', 'sport', '["sport"]'::jsonb), -- Reconciliation | 5.12b | <= 5 min on foot
  ('ut_running_free', 'ut_wolverine_cirque', 'trad', '["trad"]'::jsonb), -- Running Free | 5.9+ | <= 20 min on foot
  ('ut_sink_the_pink_2', 'ut_window_rock', 'trad', '["trad"]'::jsonb), -- Sink the Pink | 5.10 | <= 5 min on foot
  ('ut_smiling_at_the_majorettes', 'ut_slums_the', 'sport', '["sport"]'::jsonb), -- Smiling at the Majorettes | 5.11 | <= 5 min on foot
  ('ut_smoking_winston_cigarettes', 'ut_slums_the', 'sport', '["sport"]'::jsonb), -- Smoking Winston Cigarettes | 5.11c | <= 5 min on foot
  ('ut_sticky_geranium', 'ut_millie_tower_12_crag_aka_killer', 'sport', '["sport"]'::jsonb), -- Sticky Geranium | 5.5 | <= 5 min on foot
  ('ut_suicide_slab', 'ut_mt_superior_monte_cristo', 'trad', '["trad"]'::jsonb), -- Suicide Slab | 5.8 | <= 40 min on foot
  ('ut_talk_me_off_the_ledge', 'ut_mt_superior_monte_cristo', 'trad', '["trad"]'::jsonb), -- Talk Me Off The Ledge | 5.10b | <= 40 min on foot
  ('ut_unknown_146', 'ut_slums_the', 'sport', '["sport"]'::jsonb), -- Unknown | 5.11 | <= 5 min on foot
  ('ut_whiskey_wednesday', 'ut_melting_mud_west', 'sport', '["sport"]'::jsonb), -- Whiskey  Wednesday | 5.9 | <= 5 min on foot
  ('ut_wilson', 'ut_millie_tower_12_crag_aka_killer', 'trad', '["trad"]'::jsonb), -- Wilson | 5.10a/b | <= 5 min on foot
  ('ut_window_crack', 'ut_window_rock', 'trad', '["trad"]'::jsonb), -- Window Crack | 5.10- | <= 5 min on foot
  ('vt_steep_jugs', 'vt_bat_cave_buttress', 'sport', '["sport"]'::jsonb), -- Steep Jugs | 5.9 | <= 5 min on foot
  ('wy_beam_me_up_scotty', 'wy_south_fork_campground', 'toprope', '["toprope"]'::jsonb), -- Beam Me Up Scotty | 5.6 | <= 5 min on foot
  ('wy_host_with_the_most', 'wy_south_fork_campground', 'toprope', '["toprope"]'::jsonb), -- Host With The Most | 5.9 | <= 5 min on foot
  ('wy_junior', 'wy_junior_stiffy_wall', 'sport', '["sport"]'::jsonb), -- Junior | 5.11a | <= 5 min on foot
  ('wy_over_the_line', 'wy_sobchak_security_wall', 'sport', '["sport"]'::jsonb), -- Over the Line | 5.9+ | <= 10 min on foot
  ('wy_south_fork_slab', 'wy_south_fork_campground', 'trad', '["trad"]'::jsonb), -- South Fork Slab | 5.6 | <= 5 min on foot
  ('wy_stiffy', 'wy_junior_stiffy_wall', 'sport', '["sport"]'::jsonb), -- Stiffy | 5.11a | <= 5 min on foot
  ('wy_treasure_boulders', 'wy_boy_scout_cirque_route_list', 'toprope', '["toprope"]'::jsonb), -- Treasure Boulders | 5.12 | <= 60 min on foot
  ('wy_world_of_pain', 'wy_sobchak_security_wall', 'sport', '["sport"]'::jsonb); -- World of Pain | 5.11c | <= 10 min on foot

-- Every id must exist, sit in the area the decision was made for, and still be alpine; otherwise stop.
do $$
declare n_missing int; n_moved_area int; n_not_alpine int;
begin
  select count(*) into n_missing from _crag_moves m where not exists (select 1 from routes r where r.id = m.id);
  select count(*) into n_moved_area from _crag_moves m join routes r on r.id = m.id where r.area_id is distinct from m.area_id;
  select count(*) into n_not_alpine from _crag_moves m join routes r on r.id = m.id where r.discipline is distinct from 'alpine';
  raise notice 'crag moves: % listed, % missing, % in another area, % no longer alpine', (select count(*) from _crag_moves), n_missing, n_moved_area, n_not_alpine;
  -- An empty catalog (a migration replay or a Supabase preview branch) holds none of these routes: nothing to move.
  if n_missing = (select count(*) from _crag_moves) then raise notice 'no listed route exists here (empty catalog) — nothing to do'; return; end if;
  if n_missing > 0 or n_moved_area > 0 then raise exception 'ids or areas changed since the audit (2026-11-18) — re-run classify2.js'; end if;
end $$;

update routes r
   set discipline  = m.discipline,
       disciplines = m.disciplines || coalesce((
         select jsonb_agg(x) from jsonb_array_elements(case when jsonb_typeof(r.disciplines) = 'array' then r.disciplines else '[]'::jsonb end) x
          where x not in ('"alpine"'::jsonb, '"mountaineering"'::jsonb, '"scrambling"'::jsonb) and not m.disciplines @> jsonb_build_array(x)), '[]'::jsonb)
  from _crag_moves m
 where r.id = m.id
   and r.area_id = m.area_id
   and r.discipline = 'alpine'
   and not exists (select 1 from route_field_confidence f where f.route_id = r.id and f.field in ('discipline', 'rockStyle'))
   and not exists (select 1 from contributions c where c.route_id = r.id and c.kind = 'field'
                    and c.field in ('discipline', 'rockStyle') and c.status = 'approved');

-- Expect 347 (less any rows the guards skipped; the notice above says why).
select discipline, count(*) from routes where id in (select id from _crag_moves) group by discipline order by 1;

commit;
