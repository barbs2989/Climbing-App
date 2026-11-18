-- 0452 — Crag rows filed alpine move to trad / sport (owner 2026-11-11: "crag for trad is just a
-- short approach"; research-data/trad-alpine-2026-11-11/RULE.md). 672 rows: 362 trad, 310 sport.
--
-- Each row: stored alpine with a 5.x grade, no alpine_grade, no Summit pin, no gain_ft, in a crag that a Mountain Project
-- area page puts at <= 45 min on foot from the car with a return to the base, and named on that page with a Sport/Trad
-- type (the new discipline; MP's own "Alpine" tag on these crags is an area-level label, not a setting). Per-route
-- signals and URLs: decisions.json beside this file. No row moved TO alpine by 0413/0418 is here, and no row in an area
-- where 0413/0418 moved a route to alpine.
--
-- Guards: assert-then-set (a row no longer alpine is left alone); a row whose discipline the owner locked by hand
-- (route_field_confidence) or that carries an approved climber edit of discipline / rockStyle is left alone.
-- disciplines: the new primary first (0366's trigger requires the list to hold it), then the route's MP types, then any
-- other tag already on the row except 'alpine'. The route triggers (0051, 0198) re-derive each area's main type.
-- Grade becomes HIGH (climber-locked) once discipline is trad/sport/toprope (0406 _route_field_level_for).
-- Checked before applying: check:migration-claims, check:sql, check:migration-replay; version recorded in
-- supabase_migrations.schema_migrations in the same step; then npm run gen:schema.
begin;

create temp table _crag_moves (id text primary key, area_id text not null, discipline text not null, disciplines jsonb not null) on commit drop;
insert into _crag_moves (id, area_id, discipline, disciplines) values
  ('ca_afterbirth', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- Afterbirth | 5.10b | ~15 min on foot
  ('ca_ambient_groove', 'ca_wavy_gravy_wall', 'sport', '["sport"]'::jsonb), -- Ambient Groove | 5.11b | ~20 min on foot
  ('ca_anger_management', 'ca_spring_wall', 'sport', '["sport"]'::jsonb), -- Anger Management | 5.12a | ~20 min on foot
  ('ca_aoxomoxoa', 'ca_stately_pleasure_dome', 'sport', '["sport"]'::jsonb), -- Aoxomoxoa | 5.5 | ~5 min on foot
  ('ca_arch_rival_2', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Arch Rival | 5.11c | ~5 min on foot
  ('ca_battle_apple', 'ca_voyager_rock', 'trad', '["trad"]'::jsonb), -- Battle Apple | 5.10d | ~10 min on foot
  ('ca_by_jupiter_there_are_rings_around_uranus', 'ca_voyager_rock', 'trad', '["trad"]'::jsonb), -- By Jupiter, There are Rings Around Uranus | 5.11+ | ~10 min on foot
  ('ca_carson_kodas_arete', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- Carson-Kodas Arete | 5.11b | ~15 min on foot
  ('ca_d_d_d', 'ca_spring_wall', 'sport', '["sport"]'::jsonb), -- D.D.D. | 5.11a | ~20 min on foot
  ('ca_daddy_s_little_girl', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Daddy's Little Girl | 5.10d | ~5 min on foot
  ('ca_death_crack', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Death Crack | 5.11d | ~5 min on foot
  ('ca_delayed_labor', 'ca_stream_wall', 'sport', '["sport"]'::jsonb), -- Delayed Labor | 5.11a | ~20 min on foot
  ('ca_dixie_peach', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Dixie Peach | 5.9 | ~5 min on foot
  ('ca_double_double', 'ca_spring_dome', 'trad', '["trad"]'::jsonb), -- Double Double | 5.6 | ~5 min on foot
  ('ca_dreams_2', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Dreams | 5.11c | ~5 min on foot
  ('ca_drill_instructor', 'ca_upper_tier_2', 'sport', '["sport"]'::jsonb), -- Drill Instructor | 5.4 | ~15 min on foot
  ('ca_edge_of_freedom', 'ca_spring_wall', 'sport', '["sport"]'::jsonb), -- Edge of Freedom | 5.10c | ~20 min on foot
  ('ca_elmer_fudd', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- Elmer Fudd | 5.10a | ~15 min on foot
  ('ca_end_of_summer', 'ca_voyager_rock', 'trad', '["trad","toprope"]'::jsonb), -- End of Summer | 5.11b | ~10 min on foot
  ('ca_erin_s_climb', 'ca_punk_rock_west_face', 'trad', '["trad"]'::jsonb), -- Erin's Climb | 5.11b | ~15 min on foot
  ('ca_esto_power', 'ca_west_face_4', 'trad', '["trad"]'::jsonb), -- Esto Power | 5.10d | ~15 min on foot
  ('ca_eunuch', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Eunuch | 5.7 | ~5 min on foot
  ('ca_eve_of_destruction', 'ca_voyager_rock', 'trad', '["trad"]'::jsonb), -- Eve of Destruction | 5.10d | ~10 min on foot
  ('ca_eye_of_the_tiger', 'ca_tiger_cage', 'trad', '["trad","toprope"]'::jsonb), -- Eye Of The Tiger | 5.9 | ~10 min on foot
  ('ca_fall_harvest', 'ca_spring_wall', 'sport', '["sport"]'::jsonb), -- Fall Harvest | 5.10b | ~20 min on foot
  ('ca_family_affair', 'ca_spring_dome', 'trad', '["trad"]'::jsonb), -- Family Affair | 5.7 | ~5 min on foot
  ('ca_far_west_country', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Far West Country | 5.6 | ~5 min on foot
  ('ca_flintstone_feet', 'ca_tiger_cage', 'trad', '["trad","toprope"]'::jsonb), -- Flintstone Feet | 5.8+ | ~10 min on foot
  ('ca_floracation', 'ca_stream_wall', 'sport', '["sport","toprope"]'::jsonb), -- Floracation | 5.7 | ~20 min on foot
  ('ca_foolish_pleasures', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Foolish Pleasures | 5.11a | ~5 min on foot
  ('ca_footnote', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Footnote | 5.10c | ~5 min on foot
  ('ca_four_play_2', 'ca_sex_wall', 'sport', '["sport"]'::jsonb), -- Four Play | 5.8 | ~10 min on foot
  ('ca_frisky_bits', 'ca_tiger_cage_upper_tier', 'trad', '["trad"]'::jsonb), -- Frisky Bits | 5.5 | ~15 min on foot
  ('ca_full_yellow_jacket', 'ca_spring_wall', 'sport', '["sport"]'::jsonb), -- Full Yellow Jacket | 5.11a | ~20 min on foot
  ('ca_gerrytromp', 'ca_spring_dome', 'trad', '["trad"]'::jsonb), -- Gerrytromp | 5.8 | ~5 min on foot
  ('ca_get_slick', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Get Slick | 5.10b | ~5 min on foot
  ('ca_give_that_cat_a_comb', 'ca_tiger_cage', 'trad', '["trad","toprope"]'::jsonb), -- Give That Cat a Comb | 5.9 | ~10 min on foot
  ('ca_giving_tree', 'ca_wavy_gravy_wall', 'sport', '["sport"]'::jsonb), -- Giving Tree | 5.11a | ~20 min on foot
  ('ca_go_runout_and_pray', 'ca_west_face_4', 'trad', '["trad"]'::jsonb), -- Go Runout and Pray | 5.10a | ~15 min on foot
  ('ca_good_deed', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- Good Deed | 5.5 | ~15 min on foot
  ('ca_graupel_with_this', 'ca_wavy_gravy_wall', 'sport', '["sport"]'::jsonb), -- Graupel with This | 5.10c | ~20 min on foot
  ('ca_great_white_book', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Great White Book | 5.6 | ~5 min on foot
  ('ca_hail_caesar', 'ca_wavy_gravy_wall', 'trad', '["trad"]'::jsonb), -- Hail, Caesar | 5.8 | ~20 min on foot
  ('ca_hannaramic', 'ca_west_face_4', 'sport', '["sport"]'::jsonb), -- Hannaramic | 5.10b | ~15 min on foot
  ('ca_helm_s_deep', 'ca_west_face_4', 'trad', '["trad"]'::jsonb), -- Helm's Deep | 5.10c | ~15 min on foot
  ('ca_hermaphrodite_flake', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Hermaphrodite Flake | 5.7 | ~5 min on foot
  ('ca_high_anxiety', 'ca_stream_wall', 'sport', '["sport"]'::jsonb), -- High Anxiety | 5.9 | ~20 min on foot
  ('ca_horseshoe_pits', 'ca_spring_wall', 'trad', '["trad","toprope"]'::jsonb), -- Horseshoe Pits | 5.8- | ~20 min on foot
  ('ca_horsing_around', 'ca_spring_wall', 'trad', '["trad"]'::jsonb), -- Horsing Around | 5.5 | ~20 min on foot
  ('ca_hungry_tiger', 'ca_tiger_wall', 'trad', '["trad","toprope"]'::jsonb), -- Hungry Tiger | 5.10 | ~10 min on foot
  ('ca_i_am_not_a_bear_i_am_a_marmot', 'ca_spring_dome', 'sport', '["sport"]'::jsonb), -- I am not a bear! I am a marmot! | 5.10c | ~5 min on foot
  ('ca_i_wouldn_t_want_to_be_like_you_always_at_it', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- I Wouldn't Want to Be Like You (Always at it!) | 5.11a | ~15 min on foot
  ('ca_illegal_in_48_states', 'ca_sex_wall', 'sport', '["sport"]'::jsonb), -- Illegal in 48 States | 5.10c | ~10 min on foot
  ('ca_jigsaw', 'ca_tiger_cage', 'trad', '["trad"]'::jsonb), -- Jigsaw | 5.10c | ~10 min on foot
  ('ca_joy_spring', 'ca_spring_dome', 'trad', '["trad"]'::jsonb), -- Joy Spring | 5.10b | ~5 min on foot
  ('ca_kamasutra', 'ca_sex_wall', 'sport', '["sport","toprope"]'::jsonb), -- Kamasutra | 5.10d | ~10 min on foot
  ('ca_kamps_couch', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Kamps-Couch | 5.7 | ~5 min on foot
  ('ca_ky', 'ca_sex_wall', 'sport', '["sport"]'::jsonb), -- KY | 5.10a | ~10 min on foot
  ('ca_leaner', 'ca_spring_wall', 'trad', '["trad"]'::jsonb), -- Leaner | 5.9 | ~20 min on foot
  ('ca_marmot_crack', 'ca_voyager_rock', 'trad', '["trad"]'::jsonb), -- Marmot Crack | 5.9 | ~10 min on foot
  ('ca_marmotromp', 'ca_spring_dome', 'trad', '["trad"]'::jsonb), -- Marmotromp | 5.10a/b | ~5 min on foot
  ('ca_midnight_oil_2', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- Midnight Oil | 5.10d | ~15 min on foot
  ('ca_millennial_proof', 'ca_spring_dome', 'trad', '["trad"]'::jsonb), -- Millennial Proof | 5.12a | ~5 min on foot
  ('ca_millions_of_dead_cops', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- Millions of Dead Cops | 5.11a | ~15 min on foot
  ('ca_mini_dike_overpass', 'ca_spring_dome', 'trad', '["trad"]'::jsonb), -- Mini-Dike Overpass | 5.9 | ~5 min on foot
  ('ca_miss_adventure', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Miss Adventure | 5.10d | ~5 min on foot
  ('ca_mommy_s_little_monster', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- Mommy's Little Monster | 5.11a | ~15 min on foot
  ('ca_mosquito_3', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Mosquito | 5.7 | ~5 min on foot
  ('ca_mouse_hole_corner', 'ca_tiger_cage_upper_tier', 'trad', '["trad","toprope"]'::jsonb), -- Mouse Hole Corner | 5.9 | ~15 min on foot
  ('ca_mozzy_mania', 'ca_stream_wall', 'sport', '["sport"]'::jsonb), -- Mozzy Mania | 5.10a | ~20 min on foot
  ('ca_nancy_s_bright_idea', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- Nancy's Bright Idea | 5.8 | ~15 min on foot
  ('ca_new_jersey_attitude', 'ca_tiger_cage', 'trad', '["trad","toprope"]'::jsonb), -- New Jersey Attitude | 5.10b | ~10 min on foot
  ('ca_nipple_clip', 'ca_sex_wall', 'sport', '["sport"]'::jsonb), -- Nipple Clip | 5.10b | ~10 min on foot
  ('ca_no_nookie_tonight', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- No Nookie Tonight | 5.12a | ~15 min on foot
  ('ca_no_zukes', 'ca_penstemon_dome_west_face', 'trad', '["trad"]'::jsonb), -- No Zukes | 5.9 | ~30 min on foot
  ('ca_north_face_unknown_1', 'ca_stream_wall', 'sport', '["sport"]'::jsonb), -- North face unknown 1 | 5.12a | ~20 min on foot
  ('ca_nosferatu', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- Nosferatu | 5.10c | ~15 min on foot
  ('ca_ohm_sweet_ohm', 'ca_west_face_4', 'trad', '["trad"]'::jsonb), -- Ohm Sweet Ohm | 5.8 | ~15 min on foot
  ('ca_ominous_skies', 'ca_stream_wall', 'sport', '["sport"]'::jsonb), -- Ominous Skies | 5.11b | ~20 min on foot
  ('ca_orangutan_roof', 'ca_voyager_rock', 'trad', '["trad"]'::jsonb), -- Orangutan Roof | 5.11d | ~10 min on foot
  ('ca_organ_grinder_2', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- Organ Grinder | 5.11c | ~15 min on foot
  ('ca_orgasm_addict', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- Orgasm Addict | 5.10c | ~15 min on foot
  ('ca_outward_bound_corner', 'ca_voyager_rock', 'trad', '["trad"]'::jsonb), -- Outward Bound Corner | 5.7 | ~10 min on foot
  ('ca_phasers_set_on_stun_reunion', 'ca_voyager_rock', 'trad', '["trad"]'::jsonb), -- Phasers Set On Stun (Reunion) | 5.10b | ~10 min on foot
  ('ca_pitching_box', 'ca_spring_wall', 'trad', '["trad"]'::jsonb), -- Pitching Box | 5.7 | ~20 min on foot
  ('ca_population_explosion', 'ca_wavy_gravy_wall', 'sport', '["sport"]'::jsonb), -- Population Explosion | 5.10a | ~20 min on foot
  ('ca_potter_in_wonderland', 'ca_stately_pleasure_dome', 'sport', '["sport"]'::jsonb), -- Potter in Wonderland | 5.10c | ~5 min on foot
  ('ca_powerline', 'ca_west_face_4', 'trad', '["trad"]'::jsonb), -- Powerline | 5.11a | ~15 min on foot
  ('ca_pretend_to_be_your_friend', 'ca_penstemon_dome_west_face', 'sport', '["sport"]'::jsonb), -- Pretend to be Your Friend | 5.9 | ~30 min on foot
  ('ca_prints_of_pleasure', 'ca_stately_pleasure_dome', 'sport', '["sport"]'::jsonb), -- Prints of Pleasure | 5.10d | ~5 min on foot
  ('ca_puss_n_boots', 'ca_tiger_wall', 'trad', '["trad"]'::jsonb), -- Puss N Boots | 5.11b | ~10 min on foot
  ('ca_quickie', 'ca_sex_wall', 'sport', '["sport"]'::jsonb), -- Quickie | 5.9- | ~10 min on foot
  ('ca_quiet_desperation_2', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Quiet Desperation | 5.9 | ~5 min on foot
  ('ca_rachel_s_garden', 'ca_penstemon_dome_west_face', 'sport', '["sport"]'::jsonb), -- Rachel's Garden | 5.9 | ~30 min on foot
  ('ca_reach_for_the_sky', 'ca_punk_rock_west_face', 'trad', '["trad"]'::jsonb), -- Reach for the Sky | 5.10a | ~15 min on foot
  ('ca_real_men_don_t_kill_coyotes', 'ca_upper_tier_2', 'trad', '["trad","toprope"]'::jsonb), -- Real Men Don't Kill Coyotes | 5.10a | ~15 min on foot
  ('ca_reallyfivenineplus', 'ca_spring_wall', 'sport', '["sport"]'::jsonb), -- Reallyfivenineplus | 5.10c | ~20 min on foot
  ('ca_rebirth', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- Rebirth | 5.10a | ~15 min on foot
  ('ca_ringer', 'ca_spring_wall', 'sport', '["sport","toprope"]'::jsonb), -- Ringer | 5.8 | ~20 min on foot
  ('ca_rope_a_dope', 'ca_penstemon_dome_west_face', 'sport', '["sport"]'::jsonb), -- Rope-A-Dope | 5.8+ | ~30 min on foot
  ('ca_seam_stress', 'ca_voyager_rock', 'trad', '["trad"]'::jsonb), -- Seam Stress | 5.12b | ~10 min on foot
  ('ca_searching_for_ascention', 'ca_voyager_rock', 'trad', '["trad"]'::jsonb), -- Searching for Ascention | 5.10c | ~10 min on foot
  ('ca_sesh', 'ca_spring_dome', 'trad', '["trad"]'::jsonb), -- Sesh | 5.8 | ~5 min on foot
  ('ca_shadow_nose', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Shadow Nose | 5.7 | ~5 min on foot
  ('ca_shake_the_flake', 'ca_penstemon_dome_west_face', 'trad', '["trad"]'::jsonb), -- Shake The Flake | 5.9 | ~30 min on foot
  ('ca_sixty_nine', 'ca_sex_wall', 'sport', '["sport"]'::jsonb), -- Sixty Nine | 5.10b | ~10 min on foot
  ('ca_smegmathon', 'ca_west_face_4', 'trad', '["trad"]'::jsonb), -- Smegmathon | 5.10c | ~15 min on foot
  ('ca_smiladon', 'ca_tiger_wall', 'sport', '["sport","toprope"]'::jsonb), -- Smiladon | 5.12c | ~10 min on foot
  ('ca_smiling_faces_2', 'ca_penstemon_dome_west_face', 'trad', '["trad"]'::jsonb), -- Smiling Faces | 5.8 | ~30 min on foot
  ('ca_smoke_for_face', 'ca_voyager_rock', 'trad', '["trad"]'::jsonb), -- Smoke for Face | 5.11a | ~10 min on foot
  ('ca_son_of_vaino', 'ca_punk_rock_west_face', 'trad', '["trad"]'::jsonb), -- Son of Vaino | 5.11b | ~15 min on foot
  ('ca_song_of_the_earth', 'ca_penstemon_dome_west_face', 'trad', '["trad"]'::jsonb), -- Song of the Earth | 5.10a | ~30 min on foot
  ('ca_south_crack_3', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- South Crack | 5.8 | ~5 min on foot
  ('ca_southern_california_drill_team', 'ca_spring_dome', 'trad', '["trad"]'::jsonb), -- Southern California Drill Team | 5.5 | ~5 min on foot
  ('ca_spring_honeymoon', 'ca_spring_dome', 'trad', '["trad"]'::jsonb), -- Spring Honeymoon | 5.9 | ~5 min on foot
  ('ca_step_it_up_and_go', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Step It Up and Go | 5.10c | ~5 min on foot
  ('ca_sunday_hoe_down', 'ca_penstemon_dome_west_face', 'trad', '["trad"]'::jsonb), -- Sunday Hoe-down | 5.6 | ~30 min on foot
  ('ca_sushi_dreams', 'ca_west_face_4', 'trad', '["trad"]'::jsonb), -- Sushi Dreams | 5.10b/c | ~15 min on foot
  ('ca_sweet_nothings', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Sweet Nothings | 5.10c | ~5 min on foot
  ('ca_table_of_contents', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Table of Contents | 5.10d | ~5 min on foot
  ('ca_talitha_kumi', 'ca_tiger_cage', 'trad', '["trad"]'::jsonb), -- Talitha kumi | 5.7 | ~10 min on foot
  ('ca_tao_2', 'ca_upper_tier_2', 'sport', '["sport"]'::jsonb), -- Tao | 5.7 | ~15 min on foot
  ('ca_that_makes_3', 'ca_sex_wall', 'sport', '["sport"]'::jsonb), -- That Makes 3 | 5.8 | ~10 min on foot
  ('ca_the_boltway', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- The Boltway | 5.8 | ~5 min on foot
  ('ca_the_cobbler', 'ca_punk_rock_west_face', 'trad', '["trad"]'::jsonb), -- The Cobbler | 5.10c | ~15 min on foot
  ('ca_the_cross_and_the_switchblade', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- The Cross and the Switchblade | 5.12a | ~15 min on foot
  ('ca_the_gold_standard', 'ca_voyager_rock', 'sport', '["sport"]'::jsonb), -- The Gold Standard | 5.12c | ~10 min on foot
  ('ca_the_golden_shot', 'ca_stream_wall', 'sport', '["sport"]'::jsonb), -- The Golden Shot | 5.12a | ~20 min on foot
  ('ca_the_groove_3', 'ca_spring_dome', 'trad', '["trad","toprope"]'::jsonb), -- The Groove | 5.6 | ~5 min on foot
  ('ca_the_lizard_of_oz', 'ca_spring_dome', 'trad', '["trad","toprope"]'::jsonb), -- The Lizard Of Oz | 5.8 | ~5 min on foot
  ('ca_the_offwidth', 'ca_tiger_cage', 'trad', '["trad","toprope"]'::jsonb), -- The Offwidth | 5.9 | ~10 min on foot
  ('ca_the_paraclete', 'ca_west_face_4', 'trad', '["trad"]'::jsonb), -- The Paraclete | 5.10 | ~15 min on foot
  ('ca_the_rhythm_divine', 'ca_upper_tier_2', 'sport', '["sport","toprope"]'::jsonb), -- The Rhythm Divine | 5.10d | ~15 min on foot
  ('ca_the_way_we_could_have_been', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- The Way We Could Have Been | 5.10c | ~5 min on foot
  ('ca_the_way_we_were', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- The Way We Were | 5.10a | ~5 min on foot
  ('ca_the_white_flake', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- The White Flake | 5.7 | ~5 min on foot
  ('ca_this_is_hard', 'ca_tiger_cage', 'trad', '["trad"]'::jsonb), -- This is Hard | 5.11c | ~10 min on foot
  ('ca_this_is_the_meaning_of_life', 'ca_stream_wall', 'sport', '["sport"]'::jsonb), -- This is the Meaning of Life | 5.11a | ~20 min on foot
  ('ca_this_pussy_eats_you', 'ca_tiger_cage', 'trad', '["trad"]'::jsonb), -- This Pussy Eats You | 5.10b | ~10 min on foot
  ('ca_thundercat', 'ca_tiger_wall', 'trad', '["trad"]'::jsonb), -- Thundercat | 5.12b | ~10 min on foot
  ('ca_tic_tac_toe', 'ca_west_face_4', 'trad', '["trad"]'::jsonb), -- Tic-Tac-Toe | 5.9 | ~15 min on foot
  ('ca_tiger_by_the_tail', 'ca_tiger_wall', 'trad', '["trad"]'::jsonb), -- Tiger by the Tail | 5.11c | ~10 min on foot
  ('ca_tiger_cage_crack', 'ca_tiger_cage', 'trad', '["trad","toprope"]'::jsonb), -- Tiger Cage Crack | 5.8 | ~10 min on foot
  ('ca_tiger_s_eye', 'ca_spring_wall', 'sport', '["sport"]'::jsonb), -- Tiger's Eye | 5.10d | ~20 min on foot
  ('ca_tiger_tiers', 'ca_tiger_cage', 'trad', '["trad","sport","toprope"]'::jsonb), -- Tiger Tiers | 5.9 | ~10 min on foot
  ('ca_tiger_was_a_little_dog', 'ca_tiger_cage', 'trad', '["trad","toprope"]'::jsonb), -- Tiger Was a Little Dog | 5.10b | ~10 min on foot
  ('ca_top_gun_5', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Top Gun | 5.13d | ~5 min on foot
  ('ca_top_secret', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- Top Secret | 5.11+ | ~15 min on foot
  ('ca_train_in_vain', 'ca_punk_rock_west_face', 'sport', '["sport"]'::jsonb), -- Train In Vain | 5.13a | ~15 min on foot
  ('ca_trappey_s', 'ca_upper_tier_2', 'sport', '["sport"]'::jsonb), -- Trappey's | 5.9+ | ~15 min on foot
  ('ca_trivial_pursuit_2', 'ca_west_face_4', 'trad', '["trad"]'::jsonb), -- Trivial Pursuit | 5.9 | ~15 min on foot
  ('ca_turkey_trot_2', 'ca_stately_pleasure_dome', 'sport', '["sport"]'::jsonb), -- Turkey Trot | 5.7+ | ~5 min on foot
  ('ca_turning_japanese', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Turning Japanese | 5.10d | ~5 min on foot
  ('ca_up_jump_spring', 'ca_spring_dome', 'trad', '["trad"]'::jsonb), -- Up, Jump, Spring | 5.9 | ~5 min on foot
  ('ca_vernal_rain', 'ca_wavy_gravy_wall', 'sport', '["sport"]'::jsonb), -- Vernal Rain | 5.8 | ~20 min on foot
  ('ca_voyeur', 'ca_sex_wall', 'sport', '["sport"]'::jsonb), -- Voyeur | 5.11b | ~10 min on foot
  ('ca_waiting_for_isabella', 'ca_stream_wall', 'sport', '["sport"]'::jsonb), -- Waiting For Isabella | 5.12c | ~20 min on foot
  ('ca_wardance', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- Wardance | 5.11d | ~15 min on foot
  ('ca_water_streak_1', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Water Streak #1 | 5.7 | ~5 min on foot
  ('ca_wavy_gravy', 'ca_wavy_gravy_wall', 'sport', '["sport"]'::jsonb), -- Wavy Gravy | 5.11d | ~20 min on foot
  ('ca_welcome_to_courtright', 'ca_west_face_4', 'trad', '["trad"]'::jsonb), -- Welcome to Courtright | 5.9 | ~15 min on foot
  ('ca_west_country', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- West Country | 5.7 | ~5 min on foot
  ('ca_wichita_lineman', 'ca_west_face_4', 'trad', '["trad"]'::jsonb), -- Wichita Lineman | 5.8 | ~15 min on foot
  ('ca_zla_mys', 'ca_upper_tier_2', 'trad', '["trad"]'::jsonb), -- Zla Mys | 5.11d | ~15 min on foot
  ('ca_zodiac_mind_warp', 'ca_upper_tier_2', 'sport', '["sport","toprope"]'::jsonb), -- Zodiac Mind Warp | 5.10d | ~15 min on foot
  ('ut_1_hot_thorny_black_streak_wall', 'ut_green_meadow_crags', 'trad', '["trad"]'::jsonb), -- Hot & Thorny--Black Streak Wall | 5.3 | ~25 min on foot
  ('ut_10_bolts_to_freedom', 'ut_cobrazone', 'sport', '["sport"]'::jsonb), -- 10 Bolts To Freedom | 5.11a/b | ~15 min on foot
  ('ut_10_gabe_s_corner', 'ut_green_meadow_crags', 'trad', '["trad"]'::jsonb), -- Gabe's Corner | 5.6 | ~25 min on foot
  ('ut_11_end_of_a_good_day', 'ut_green_meadow_crags', 'trad', '["trad"]'::jsonb), -- End of a Good Day | 5.7 | ~25 min on foot
  ('ut_12_late_day_surprise', 'ut_green_meadow_crags', 'trad', '["trad"]'::jsonb), -- Late Day Surprise | 5.7 | ~25 min on foot
  ('ut_14_cougar_cave_arete', 'ut_green_meadow_crags', 'trad', '["trad"]'::jsonb), -- Cougar Cave Arete | 5.7 | ~25 min on foot
  ('ut_15_i_m_all_thumbs', 'ut_green_meadow_crags', 'trad', '["trad"]'::jsonb), -- I'm All Thumbs | 5.9 | ~25 min on foot
  ('ut_16_screaming_kitties_exposure_arete_wall', 'ut_green_meadow_crags', 'trad', '["trad","toprope"]'::jsonb), -- Screaming Kitties--Exposure Arete Wall | 5.8 | ~25 min on foot
  ('ut_17_purple_gerbil', 'ut_green_meadow_crags', 'trad', '["trad","toprope"]'::jsonb), -- Purple Gerbil | 5.7 | ~25 min on foot
  ('ut_18_exposure_arete', 'ut_green_meadow_crags', 'trad', '["trad","toprope"]'::jsonb), -- Exposure Arete | 5.7 | ~25 min on foot
  ('ut_19_organ_harvest', 'ut_green_meadow_crags', 'trad', '["trad"]'::jsonb), -- Organ Harvest | 5.8 | ~25 min on foot
  ('ut_2_fear_trembling', 'ut_green_meadow_crags', 'trad', '["trad"]'::jsonb), -- Fear & Trembling | 5.4 | ~25 min on foot
  ('ut_3_hedge_trimmer', 'ut_green_meadow_crags', 'trad', '["trad","toprope"]'::jsonb), -- Hedge Trimmer | 5.6 | ~25 min on foot
  ('ut_4_black_streak', 'ut_green_meadow_crags', 'trad', '["trad","toprope"]'::jsonb), -- Black Streak | 5.10a | ~25 min on foot
  ('ut_45_hangover', 'ut_doldrums_the', 'sport', '["sport"]'::jsonb), -- 45% Hangover | 5.11b | ~12 min on foot
  ('ut_5_7_trad_route', 'ut_reids_basin', 'trad', '["trad"]'::jsonb), -- 5.7 Trad Route | 5.7 | ~30 min on foot
  ('ut_5_between_2_trees', 'ut_green_meadow_crags', 'trad', '["trad"]'::jsonb), -- Between 2 Trees | 5.7 | ~25 min on foot
  ('ut_6_wuhan_bats', 'ut_green_meadow_crags', 'trad', '["trad"]'::jsonb), -- Wuhan Bats | 5.10 | ~25 min on foot
  ('ut_67', 'ut_banshee_wall', 'sport', '["sport"]'::jsonb), -- 67 | 5.11a | ~9 min on foot
  ('ut_69th', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- 69th | 5.11- | ~10 min on foot
  ('ut_7_horizontal_crack_madness', 'ut_green_meadow_crags', 'trad', '["trad"]'::jsonb), -- Horizontal Crack Madness | 5.6 | ~25 min on foot
  ('ut_70', 'ut_flying_raptor_s_area', 'sport', '["sport"]'::jsonb), -- 70 | 5.11- | ~15 min on foot
  ('ut_72', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- 72 | 5.10+ | ~10 min on foot
  ('ut_8_mystery_buttress', 'ut_green_meadow_crags', 'trad', '["trad"]'::jsonb), -- Mystery Buttress | 5.8 | ~25 min on foot
  ('ut_9_east_face_mysteries', 'ut_green_meadow_crags', 'trad', '["trad"]'::jsonb), -- East Face Mysteries | 5.7 | ~25 min on foot
  ('ut_a_fez_for_your_monkey', 'ut_lower_jungle', 'trad', '["trad","sport"]'::jsonb), -- A Fez for Your Monkey | 5.11a | ~5 min on foot
  ('ut_a_long_way_from_suburbia', 'ut_suburbia', 'trad', '["trad"]'::jsonb), -- A Long Way From Suburbia | 5.10 | ~45 min on foot
  ('ut_a_skxawng_s_line', 'ut_pandora', 'trad', '["trad"]'::jsonb), -- A Skxawng's Line | 5.10a/b | ~10 min on foot
  ('ut_a_symbiotic_relationship', 'ut_research_station_the', 'sport', '["sport"]'::jsonb), -- A Symbiotic Relationship | 5.9+ | ~10 min on foot
  ('ut_aaron_s_hot_venom_injection_arete', 'ut_cobrazone', 'sport', '["sport"]'::jsonb), -- Aaron's Hot Venom Injection Arete | 5.9 | ~15 min on foot
  ('ut_agree_to_disagree', 'ut_pass_crag_the', 'sport', '["sport"]'::jsonb), -- Agree to Disagree | 5.10a | ~15 min on foot
  ('ut_aibell', 'ut_banshee_wall', 'sport', '["sport"]'::jsonb), -- Aibell | 5.10 | ~9 min on foot
  ('ut_allelopathy_arete', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Allelopathy Arete | 5.11d | ~5 min on foot
  ('ut_amazing_grace', 'ut_reids_basin', 'sport', '["sport"]'::jsonb), -- Amazing Grace | 5.11d | ~30 min on foot
  ('ut_and_on_the_third_day_he_bolted', 'ut_upper_jungle', 'sport', '["sport"]'::jsonb), -- And on the Third Day he Bolted | 5.11b/c | ~5 min on foot
  ('ut_angering_the_cheese_gods', 'ut_starting_block_the', 'sport', '["sport"]'::jsonb), -- Angering the Cheese Gods | 5.10b | ~5 min on foot
  ('ut_ape_factor', 'ut_upper_jungle', 'sport', '["sport"]'::jsonb), -- Ape Factor | 5.10b | ~5 min on foot
  ('ut_ape_shit', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Ape Shit | 5.12a/b | ~5 min on foot
  ('ut_apodidae_arete', 'ut_flying_raptor_s_area', 'trad', '["trad"]'::jsonb), -- Apodidae Arete | 5.10a | ~15 min on foot
  ('ut_approach_protocol', 'ut_air_strip_the', 'sport', '["sport"]'::jsonb), -- Approach Protocol | 5.9+ | ~15 min on foot
  ('ut_arete_a_go_go', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Arete a go-go | 5.9 | ~10 min on foot
  ('ut_as_the_song_and_dance_begins', 'ut_starting_block_the', 'sport', '["sport"]'::jsonb), -- As the Song and Dance Begins | 5.8 | ~5 min on foot
  ('ut_assegai', 'ut_dark_continent_area_the', 'sport', '["sport"]'::jsonb), -- Assegai | 5.11a/b | ~5 min on foot
  ('ut_astral_abyss', 'ut_dark_continent_area_the', 'trad', '["trad"]'::jsonb), -- Astral Abyss | 5.9 | ~5 min on foot
  ('ut_authenticity', 'ut_cobrazone', 'trad', '["trad"]'::jsonb), -- Authenticity | 5.9 | ~15 min on foot
  ('ut_axl_rose_s_intro', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Axl Rose's Intro | 5.9- | ~5 min on foot
  ('ut_baby_gorillas_are_cute', 'ut_upper_jungle', 'sport', '["sport"]'::jsonb), -- Baby Gorillas are Cute | 5.8 | ~5 min on foot
  ('ut_baby_thor', 'ut_butterfly_lake', 'trad', '["trad"]'::jsonb), -- Baby Thor | 5.11a | ~10 min on foot
  ('ut_bad_baboon_with_small_hands', 'ut_upper_canopy', 'sport', '["sport"]'::jsonb), -- Bad Baboon With Small Hands | 5.12a | ~15 min on foot
  ('ut_bad_banana_dreams', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Bad Banana Dreams | 5.10b | ~5 min on foot
  ('ut_bad_bills_mean_stovies', 'ut_doldrums_the', 'trad', '["trad"]'::jsonb), -- Bad Bills Mean Stovies | 5.10a | ~12 min on foot
  ('ut_bagheera_2', 'ut_dark_continent_area_the', 'sport', '["sport"]'::jsonb), -- Bagheera | 5.12c | ~5 min on foot
  ('ut_bahala_na', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Bahala Na | 5.9+ | ~10 min on foot
  ('ut_baloo_s_nightmare', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Baloo's Nightmare | 5.9+ | ~5 min on foot
  ('ut_ban_cheese_pillar', 'ut_banshee_wall', 'trad', '["trad"]'::jsonb), -- Ban Cheese Pillar | 5.10+ | ~9 min on foot
  ('ut_banshee_holiday', 'ut_banshee_wall', 'trad', '["trad"]'::jsonb), -- Banshee Holiday | 5.12a/b | ~9 min on foot
  ('ut_banshee_port_wing', 'ut_banshee_wall', 'trad', '["trad"]'::jsonb), -- Banshee Port Wing | 5.10a | ~9 min on foot
  ('ut_banshee_starboard_wing', 'ut_banshee_wall', 'trad', '["trad"]'::jsonb), -- Banshee Starboard Wing | 5.9 | ~9 min on foot
  ('ut_bear_necessities', 'ut_distant_drum', 'sport', '["sport"]'::jsonb), -- Bear Necessities | 5.10b | ~35 min on foot
  ('ut_being_boiled', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Being Boiled | 5.10 | ~10 min on foot
  ('ut_between_the_lines', 'ut_moore_wall_the', 'sport', '["sport"]'::jsonb), -- Between the Lines | 5.11c | ~20 min on foot
  ('ut_big_fat_friend', 'ut_suburbia', 'trad', '["trad"]'::jsonb), -- Big Fat Friend | 5.11- | ~45 min on foot
  ('ut_bird_brain', 'ut_flying_raptor_s_area', 'sport', '["sport"]'::jsonb), -- Bird Brain | 5.11b | ~15 min on foot
  ('ut_bird_of_pray', 'ut_flying_raptor_s_area', 'trad', '["trad"]'::jsonb), -- Bird of Pray | 5.10a | ~15 min on foot
  ('ut_bird_of_prey', 'ut_flying_raptor_s_area', 'sport', '["sport"]'::jsonb), -- Bird of Prey. | 5.8+ | ~15 min on foot
  ('ut_birdseed_bourbon_and_bolts', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Birdseed, Bourbon, and Bolts | 5.10a | ~10 min on foot
  ('ut_birth_canal_2', 'ut_high_rise_area_the', 'sport', '["sport"]'::jsonb), -- Birth Canal | 5.11d | ~10 min on foot
  ('ut_blake_effect', 'ut_cobrazone', 'trad', '["trad"]'::jsonb), -- Blake Effect | 5.10 | ~15 min on foot
  ('ut_blue_collar_ape', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Blue Collar Ape | 5.9 | ~5 min on foot
  ('ut_blue_green_olga', 'ut_pass_crag_the', 'sport', '["sport"]'::jsonb), -- Blue Green Olga | 5.8 | ~15 min on foot
  ('ut_blue_nile', 'ut_dark_continent_area_the', 'trad', '["trad","sport"]'::jsonb), -- Blue Nile | 5.9- | ~5 min on foot
  ('ut_blue_suede_shoes', 'ut_starting_block_the', 'sport', '["sport"]'::jsonb), -- Blue Suede Shoes | 5.11d | ~5 min on foot
  ('ut_boris_ascends_again', 'ut_upper_jungle', 'sport', '["sport"]'::jsonb), -- Boris Ascends Again | 5.10a | ~5 min on foot
  ('ut_bourbonic', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Bourbonic | 5.10 | ~10 min on foot
  ('ut_breaking_up_is_hard_to_do', 'ut_pangaea', 'trad', '["trad"]'::jsonb), -- Breaking Up Is Hard To Do | 5.9 | ~45 min on foot
  ('ut_brief_case', 'ut_butterfly_lake', 'trad', '["trad"]'::jsonb), -- Brief Case | 5.11c | ~10 min on foot
  ('ut_bring_the_machete', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Bring the Machete | 5.11b | ~5 min on foot
  ('ut_broad_bagert_crack', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Broad Bagert Crack | 5.10b | ~5 min on foot
  ('ut_bullwinkle', 'ut_lower_moore_wall', 'trad', '["trad"]'::jsonb), -- Bullwinkle | 5.10c | ~20 min on foot
  ('ut_bungle_in_the_jungle', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Bungle in the Jungle | 5.10b | ~5 min on foot
  ('ut_bushtit', 'ut_flying_raptor_s_area', 'trad', '["trad"]'::jsonb), -- Bushtit | 5.6 | ~15 min on foot
  ('ut_butterfly_arete', 'ut_butterfly_lake', 'sport', '["sport","toprope"]'::jsonb), -- Butterfly Arete | 5.10 | ~10 min on foot
  ('ut_candy_for_breakfast_candy_for_lunch_breakfast_for_dinne', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Candy for Breakfast, Candy for Lunch, Breakfast for Dinner | 5.10b/c | ~10 min on foot
  ('ut_cannibalistic_tendencies', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Cannibalistic Tendencies | 5.11a | ~10 min on foot
  ('ut_cape_of_storms', 'ut_dark_continent_area_the', 'trad', '["trad"]'::jsonb), -- Cape of Storms | 5.9 | ~5 min on foot
  ('ut_carnivorous_pika', 'ut_butterfly_lake', 'trad', '["trad"]'::jsonb), -- Carnivorous Pika | 5.9 | ~10 min on foot
  ('ut_carrion_pillar', 'ut_flying_raptor_s_area', 'sport', '["sport"]'::jsonb), -- Carrion Pillar | 5.10- | ~15 min on foot
  ('ut_carry_on_up_the_khyber', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Carry On Up the Khyber | 5.11b | ~5 min on foot
  ('ut_catnip_lucy', 'ut_doldrums_the', 'trad', '["trad"]'::jsonb), -- Catnip Lucy | 5.10d | ~12 min on foot
  ('ut_cave_dog', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Cave Dog | 5.9- | ~5 min on foot
  ('ut_caveman_odyssey', 'ut_pangaea', 'trad', '["trad"]'::jsonb), -- Caveman Odyssey | 5.10 | ~45 min on foot
  ('ut_center_punch', 'ut_lowe_wall', 'trad', '["trad"]'::jsonb), -- Center Punch | 5.11b | ~20 min on foot
  ('ut_checking_for_structural_integrity', 'ut_air_strip_the', 'sport', '["sport"]'::jsonb), -- Checking For Structural Integrity | 5.10a | ~15 min on foot
  ('ut_chimp_off_the_old_chiwiener', 'ut_upper_canopy', 'sport', '["sport"]'::jsonb), -- Chimp Off the Old Chiwiener | 5.10d | ~15 min on foot
  ('ut_chutes_and_daggers', 'ut_distant_drum', 'sport', '["sport"]'::jsonb), -- Chutes and Daggers | 5.11+ | ~35 min on foot
  ('ut_climbers_in_the_mist', 'ut_upper_jungle', 'trad', '["trad"]'::jsonb), -- Climbers in the Mist | 5.10b | ~5 min on foot
  ('ut_cobra_2', 'ut_cobrazone', 'sport', '["sport"]'::jsonb), -- Cobra | 5.10a | ~15 min on foot
  ('ut_coco_s_lichen_it', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Coco's Lichen It | 5.10a | ~5 min on foot
  ('ut_coffee_hour', 'ut_reids_basin', 'sport', '["sport"]'::jsonb), -- Coffee Hour | 5.10d | ~30 min on foot
  ('ut_college_girl', 'ut_reids_basin', 'sport', '["sport"]'::jsonb), -- College Girl | 5.10b/c | ~30 min on foot
  ('ut_colobus_crack', 'ut_upper_jungle', 'trad', '["trad"]'::jsonb), -- Colobus Crack | 5.7 | ~5 min on foot
  ('ut_concrete_jungle_2', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Concrete Jungle | 5.11b | ~5 min on foot
  ('ut_congo_crack', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Congo Crack | 5.9 | ~5 min on foot
  ('ut_congolese_crescendo', 'ut_distant_drum', 'trad', '["trad"]'::jsonb), -- Congolese Crescendo | 5.10c | ~35 min on foot
  ('ut_continental_drift_2', 'ut_pangaea', 'sport', '["sport"]'::jsonb), -- Continental Drift | 5.10d | ~45 min on foot
  ('ut_cordyceps_on_the_brain', 'ut_upper_jungle', 'trad', '["trad"]'::jsonb), -- Cordyceps on the Brain | 5.8+ | ~5 min on foot
  ('ut_cowboys_in_control', 'ut_suburbia', 'trad', '["trad"]'::jsonb), -- Cowboys in Control | 5.10c | ~45 min on foot
  ('ut_crack_in_the_space_time_fabric', 'ut_pandora', 'trad', '["trad"]'::jsonb), -- Crack In The Space Time Fabric | 5.10a | ~10 min on foot
  ('ut_crash_landing_2', 'ut_air_strip_the', 'trad', '["trad"]'::jsonb), -- Crash Landing | 5.9+ | ~15 min on foot
  ('ut_crazy_baldheads', 'ut_pass_crag_the', 'trad', '["trad"]'::jsonb), -- Crazy Baldheads | 5.9 | ~15 min on foot
  ('ut_crazy_tail', 'ut_pass_crag_the', 'trad', '["trad"]'::jsonb), -- Crazy Tail | 5.8 | ~15 min on foot
  ('ut_cthulhu', 'ut_doldrums_the', 'trad', '["trad"]'::jsonb), -- Cthulhu | 5.11b | ~12 min on foot
  ('ut_cul_de_sac', 'ut_suburbia', 'trad', '["trad"]'::jsonb), -- Cul-de-sac | 5.10+ | ~45 min on foot
  ('ut_curious_george_3', 'ut_upper_jungle', 'trad', '["trad"]'::jsonb), -- Curious George | 5.10c | ~5 min on foot
  ('ut_daktari', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Daktari | 5.11a | ~5 min on foot
  ('ut_damned_dirty_apes', 'ut_planet_of_the_apes_the', 'trad', '["trad","sport"]'::jsonb), -- Damned Dirty Apes | 5.10+ | ~35 min on foot
  ('ut_daniel_dravot', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Daniel Dravot | 5.11 | ~5 min on foot
  ('ut_daniel_quinn', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Daniel Quinn | 5.11a/b | ~5 min on foot
  ('ut_dark_matter_3', 'ut_research_station_the', 'sport', '["sport"]'::jsonb), -- Dark Matter | 5.7 | ~10 min on foot
  ('ut_dead_bolt', 'ut_wall_of_mirrors', 'trad', '["trad"]'::jsonb), -- Dead Bolt | 5.10c/d | ~20 min on foot
  ('ut_dead_chickens_for_komodos', 'ut_cobrazone', 'trad', '["trad"]'::jsonb), -- Dead Chickens for Komodos | 5.9+ | ~15 min on foot
  ('ut_deep_in_shangri_la', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Deep In Shangri La | 5.10b | ~10 min on foot
  ('ut_deicing', 'ut_air_strip_the', 'trad', '["trad"]'::jsonb), -- Deicing | 5.9+ | ~15 min on foot
  ('ut_despot', 'ut_suburbia', 'trad', '["trad"]'::jsonb), -- Despot | 5.12+ | ~45 min on foot
  ('ut_dirty_rotten_scoudrel', 'ut_starting_block_the', 'trad', '["trad"]'::jsonb), -- Dirty Rotten Scoudrel | 5.9+ | ~5 min on foot
  ('ut_dirty_secrets', 'ut_butterfly_lake', 'trad', '["trad"]'::jsonb), -- Dirty Secrets | 5.9- | ~10 min on foot
  ('ut_diverging_evolution', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Diverging Evolution | 5.9 | ~5 min on foot
  ('ut_don_t_call_me_shirley', 'ut_air_strip_the', 'trad', '["trad"]'::jsonb), -- Don't Call Me Shirley | 5.9 | ~15 min on foot
  ('ut_don_t_tell_jonny', 'ut_moore_wall_the', 'sport', '["sport"]'::jsonb), -- Don't Tell Jonny | 5.10c | ~20 min on foot
  ('ut_donkey_kong', 'ut_upper_canopy', 'trad', '["trad"]'::jsonb), -- Donkey Kong | 5.10a/b | ~15 min on foot
  ('ut_donkey_kong_country', 'ut_upper_canopy', 'trad', '["trad"]'::jsonb), -- Donkey Kong Country | 5.9+ | ~15 min on foot
  ('ut_donkey_kong_jr', 'ut_upper_canopy', 'trad', '["trad"]'::jsonb), -- Donkey Kong Jr. | 5.9+ | ~15 min on foot
  ('ut_dr_diaper', 'ut_starting_block_the', 'trad', '["trad"]'::jsonb), -- Dr. Diaper | 5.9 | ~5 min on foot
  ('ut_dr_livingstone_i_presume', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Dr. Livingstone, I Presume? | 5.11c | ~5 min on foot
  ('ut_dr_zaius', 'ut_planet_of_the_apes_the', 'trad', '["trad"]'::jsonb), -- Dr. Zaius | 5.10b/c | ~35 min on foot
  ('ut_drag_queen_3', 'ut_dark_continent_area_the', 'trad', '["trad"]'::jsonb), -- Drag Queen | 5.9 | ~5 min on foot
  ('ut_dusty_springfield', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Dusty Springfield | 5.10 | ~5 min on foot
  ('ut_duty_free_zone', 'ut_air_strip_the', 'trad', '["trad"]'::jsonb), -- Duty Free Zone | 5.9 | ~15 min on foot
  ('ut_dying_light', 'ut_doldrums_the', 'sport', '["sport"]'::jsonb), -- Dying Light | 5.11c/d | ~12 min on foot
  ('ut_easy_like_sunday_morning_2', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Easy like Sunday Morning | 5.10+ | ~5 min on foot
  ('ut_el_chapo', 'ut_moore_wall_the', 'sport', '["sport"]'::jsonb), -- El Chapo | 5.12a | ~20 min on foot
  ('ut_eric_robinson_route', 'ut_erm_wall', 'trad', '["trad"]'::jsonb), -- Eric Robinson Route | 5.10- | ~20 min on foot
  ('ut_every_body_drops', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Every Body Drops | 5.10- | ~5 min on foot
  ('ut_evolutionary_leap', 'ut_dark_continent_area_the', 'trad', '["trad","sport"]'::jsonb), -- Evolutionary Leap | 5.12a | ~5 min on foot
  ('ut_falco', 'ut_flying_raptor_s_area', 'sport', '["sport"]'::jsonb), -- Falco | 5.10 | ~15 min on foot
  ('ut_fire_away', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Fire Away | 5.10+ | ~5 min on foot
  ('ut_flaky_chimp', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Flaky Chimp | 5.10c | ~5 min on foot
  ('ut_flaky_flake', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Flaky Flake | 5.10- | ~10 min on foot
  ('ut_flesh_wound', 'ut_butterfly_lake', 'trad', '["trad"]'::jsonb), -- Flesh Wound | 5.10a | ~10 min on foot
  ('ut_flight_school', 'ut_air_strip_the', 'trad', '["trad"]'::jsonb), -- Flight School | 5.7 | ~15 min on foot
  ('ut_flying_butter', 'ut_butterfly_lake', 'trad', '["trad","toprope"]'::jsonb), -- Flying Butter | 5.7+ | ~10 min on foot
  ('ut_forbidden_coast_line', 'ut_distant_drum', 'trad', '["trad"]'::jsonb), -- Forbidden Coast Line | 5.9 | ~35 min on foot
  ('ut_free_passage', 'ut_moore_wall_the', 'trad', '["trad"]'::jsonb), -- Free Passage | 5.10a | ~20 min on foot
  ('ut_frogman_of_the_uintas', 'ut_cobrazone', 'sport', '["sport"]'::jsonb), -- Frogman of the Uintas | 5.10d | ~15 min on foot
  ('ut_funky_boss', 'ut_starting_block_the', 'sport', '["sport","toprope"]'::jsonb), -- Funky Boss | 5.10a | ~5 min on foot
  ('ut_funky_monkey', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Funky Monkey | 5.10a | ~5 min on foot
  ('ut_furious_george', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Furious George | 5.11+ | ~5 min on foot
  ('ut_gabonese_grin', 'ut_distant_drum', 'trad', '["trad"]'::jsonb), -- Gabonese Grin | 5.7 | ~35 min on foot
  ('ut_gauche', 'ut_lowe_wall', 'trad', '["trad"]'::jsonb), -- Gauche | 5.10c | ~20 min on foot
  ('ut_george_2', 'ut_lower_jungle', 'sport', '["sport","toprope"]'::jsonb), -- George | 5.12- | ~5 min on foot
  ('ut_girl_next_door', 'ut_suburbia', 'trad', '["trad"]'::jsonb), -- Girl Next Door | 5.8 | ~45 min on foot
  ('ut_go_for_broke', 'ut_reids_basin', 'sport', '["sport"]'::jsonb), -- Go For Broke | 5.11a | ~30 min on foot
  ('ut_gondwanaland_man', 'ut_pangaea', 'trad', '["trad"]'::jsonb), -- Gondwanaland Man | 5.9+ | ~45 min on foot
  ('ut_gone_for_good', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Gone For Good | 5.10- | ~5 min on foot
  ('ut_goodall_times', 'ut_upper_jungle', 'trad', '["trad"]'::jsonb), -- Goodall Times | 5.10c | ~5 min on foot
  ('ut_gooseberry_corner', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Gooseberry Corner | 5.9+ | ~5 min on foot
  ('ut_gorillas_in_the_crack', 'ut_upper_jungle', 'trad', '["trad"]'::jsonb), -- Gorillas in the Crack | 5.11a | ~5 min on foot
  ('ut_grape_ape', 'ut_upper_jungle', 'trad', '["trad"]'::jsonb), -- Grape Ape | 5.9- | ~5 min on foot
  ('ut_great_rift_valley', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Great Rift Valley | 5.9 | ~5 min on foot
  ('ut_gremlin_special', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Gremlin Special | 5.10a | ~10 min on foot
  ('ut_ground_control_to_climber_tom', 'ut_air_strip_the', 'trad', '["trad"]'::jsonb), -- Ground Control To Climber Tom | 5.8 | ~15 min on foot
  ('ut_guinea_worm', 'ut_research_station_the', 'trad', '["trad"]'::jsonb), -- Guinea Worm | 5.7 | ~10 min on foot
  ('ut_hand_cannibal', 'ut_dark_continent_area_the', 'trad', '["trad"]'::jsonb), -- Hand Cannibal | 5.8- | ~5 min on foot
  ('ut_hangar_shadow', 'ut_air_strip_the', 'sport', '["sport"]'::jsonb), -- Hangar Shadow | 5.10d | ~15 min on foot
  ('ut_happy_house', 'ut_banshee_wall', 'sport', '["sport"]'::jsonb), -- Happy House | 5.11- | ~9 min on foot
  ('ut_have_you_been_huffing', 'ut_reids_basin', 'sport', '["sport"]'::jsonb), -- Have You Been Huffing | 5.11a | ~30 min on foot
  ('ut_headhunter', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Headhunter | 5.10c | ~10 min on foot
  ('ut_hear_no_evil', 'ut_distant_drum', 'trad', '["trad"]'::jsonb), -- Hear No Evil | 5.12a | ~35 min on foot
  ('ut_hear_the_music', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Hear the Music | 5.10- | ~5 min on foot
  ('ut_heart_of_darkness_4', 'ut_dark_continent_area_the', 'trad', '["trad","sport"]'::jsonb), -- Heart of Darkness | 5.11c | ~5 min on foot
  ('ut_hemotoxin', 'ut_cobrazone', 'trad', '["trad"]'::jsonb), -- Hemotoxin | 5.11c | ~15 min on foot
  ('ut_hey_hey_we_re_the_monkeys', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Hey Hey We're The Monkeys | 5.11a | ~5 min on foot
  ('ut_high_hanging_fruit_snacks', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- High-Hanging Fruit Snacks | 5.11c | ~10 min on foot
  ('ut_high_little_thing', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- High Little Thing | 5.10 | ~10 min on foot
  ('ut_holidays_in_the_sun', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Holidays in the Sun | 5.11- | ~10 min on foot
  ('ut_homo_cragus', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Homo cragus | 5.10a | ~5 min on foot
  ('ut_howard_hughes', 'ut_starting_block_the', 'sport', '["sport"]'::jsonb), -- Howard Hughes | 5.11c | ~5 min on foot
  ('ut_humble_pie_2', 'ut_butterfly_lake', 'trad', '["trad"]'::jsonb), -- Humble Pie | 5.9+ | ~10 min on foot
  ('ut_i_feel_lonely', 'ut_planet_of_the_apes_the', 'trad', '["trad"]'::jsonb), -- I Feel Lonely | 5.9 | ~35 min on foot
  ('ut_i_speak_jive', 'ut_air_strip_the', 'trad', '["trad"]'::jsonb), -- I Speak Jive | 5.9+ | ~15 min on foot
  ('ut_ian_hatch_memorial_route', 'ut_pass_crag_the', 'trad', '["trad"]'::jsonb), -- Ian Hatch Memorial Route | 5.8 | ~15 min on foot
  ('ut_in_search_of_quarks', 'ut_research_station_the', 'sport', '["sport"]'::jsonb), -- In Search of Quarks | 5.8+ | ~10 min on foot
  ('ut_in_the_eyrie_of_the_beholder', 'ut_flying_raptor_s_area', 'trad', '["trad"]'::jsonb), -- In the Eyrie of the Beholder | 5.9 | ~15 min on foot
  ('ut_instruction_manual', 'ut_air_strip_the', 'sport', '["sport","toprope"]'::jsonb), -- Instruction Manual | 5.7 | ~15 min on foot
  ('ut_insufficient_landing_strip', 'ut_air_strip_the', 'trad', '["trad"]'::jsonb), -- Insufficient Landing Strip | 5.9+ | ~15 min on foot
  ('ut_into_the_light', 'ut_banshee_wall', 'trad', '["trad"]'::jsonb), -- Into the Light. | 5.10 | ~9 min on foot
  ('ut_ipso_facto', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Ipso facto | 5.11 | ~5 min on foot
  ('ut_irn_bru', 'ut_doldrums_the', 'trad', '["trad"]'::jsonb), -- Irn-Bru | 5.11c | ~12 min on foot
  ('ut_it_looked_good', 'ut_butterfly_lake', 'trad', '["trad"]'::jsonb), -- It Looked Good | 5.8 | ~10 min on foot
  ('ut_jabu_and_the_lion', 'ut_dark_continent_area_the', 'sport', '["sport"]'::jsonb), -- Jabu and The Lion. | 5.11b/c | ~5 min on foot
  ('ut_java_man', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Java Man | 5.11b | ~5 min on foot
  ('ut_jigsaw_feeling', 'ut_banshee_wall', 'sport', '["sport"]'::jsonb), -- Jigsaw Feeling. | 5.10+ | ~9 min on foot
  ('ut_jungle_boogie', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Jungle Boogie | 5.10a | ~5 min on foot
  ('ut_jungle_fever', 'ut_research_station_the', 'trad', '["trad"]'::jsonb), -- Jungle Fever | 5.11- | ~10 min on foot
  ('ut_keepin_up_with_the_jones', 'ut_suburbia', 'trad', '["trad"]'::jsonb), -- Keepin' up with the Jones | 5.10 | ~45 min on foot
  ('ut_killer', 'ut_suburbia', 'trad', '["trad"]'::jsonb), -- Killer | 5.12a | ~45 min on foot
  ('ut_king_kong_2', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- King Kong | 5.11c | ~5 min on foot
  ('ut_kipling_s_short_story', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Kipling's Short Story | 5.10d | ~5 min on foot
  ('ut_knuckle_draggers_needed', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Knuckle Draggers Needed | 5.10 | ~5 min on foot
  ('ut_komodo_corner', 'ut_cobrazone', 'trad', '["trad"]'::jsonb), -- Komodo Corner | 5.8 | ~15 min on foot
  ('ut_land_of_the_lost_portal', 'ut_pangaea', 'sport', '["sport"]'::jsonb), -- Land of the Lost Portal | 5.7 | ~45 min on foot
  ('ut_last_but_not_least', 'ut_banshee_wall', 'sport', '["sport"]'::jsonb), -- Last but not least | 5.10 | ~9 min on foot
  ('ut_law_giver', 'ut_planet_of_the_apes_the', 'trad', '["trad"]'::jsonb), -- Law Giver | 5.10- | ~35 min on foot
  ('ut_leaf_hallucination', 'ut_reids_basin', 'sport', '["sport"]'::jsonb), -- Leaf Hallucination | 5.10d | ~30 min on foot
  ('ut_little_man_in_suburbia', 'ut_suburbia', 'trad', '["trad"]'::jsonb), -- Little Man in Suburbia | 5.11 | ~45 min on foot
  ('ut_lost_horizon', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Lost Horizon | 5.11d | ~10 min on foot
  ('ut_lucy_in_the_sky', 'ut_upper_jungle', 'sport', '["sport"]'::jsonb), -- Lucy in the Sky | 5.10c | ~5 min on foot
  ('ut_mad_man_of_the_uinta_s', 'ut_moore_wall_the', 'sport', '["sport"]'::jsonb), -- Mad Man of the Uinta's | 5.11+ | ~20 min on foot
  ('ut_maguilla_gorilla', 'ut_upper_jungle', 'sport', '["sport"]'::jsonb), -- Maguilla Gorilla | 5.10a | ~5 min on foot
  ('ut_man_can_be_domesticated', 'ut_planet_of_the_apes_the', 'trad', '["trad"]'::jsonb), -- Man Can Be Domesticated | 5.11 | ~35 min on foot
  ('ut_man_chimpster_united', 'ut_dark_continent_area_the', 'trad', '["trad"]'::jsonb), -- Man-Chimpster United | 5.11+ | ~5 min on foot
  ('ut_man_next_door', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Man Next Door | 5.11a | ~5 min on foot
  ('ut_manakin_dance', 'ut_flying_raptor_s_area', 'sport', '["sport"]'::jsonb), -- Manakin Dance | 5.8+ | ~15 min on foot
  ('ut_maneater', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Maneater | 5.9 | ~10 min on foot
  ('ut_manifest_destiny', 'ut_suburbia', 'trad', '["trad"]'::jsonb), -- Manifest Destiny | 5.10 | ~45 min on foot
  ('ut_maple_bar', 'ut_reids_basin', 'sport', '["sport"]'::jsonb), -- Maple Bar | 5.10d | ~30 min on foot
  ('ut_marriage_of_convenience', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Marriage of Convenience | 5.11c | ~10 min on foot
  ('ut_mayday_on_monday', 'ut_air_strip_the', 'sport', '["sport"]'::jsonb), -- Mayday On Monday | 5.11- | ~15 min on foot
  ('ut_me_tarzan', 'ut_distant_drum', 'trad', '["trad"]'::jsonb), -- Me Tarzan | 5.10b | ~35 min on foot
  ('ut_merlin', 'ut_flying_raptor_s_area', 'sport', '["sport"]'::jsonb), -- Merlin | 5.10+ | ~15 min on foot
  ('ut_mind_the_gap', 'ut_air_strip_the', 'sport', '["sport"]'::jsonb), -- Mind the Gap | 5.11a | ~15 min on foot
  ('ut_mistah_kurtz_he_dead', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Mistah Kurtz - he dead. | 5.10+ | ~5 min on foot
  ('ut_monkey_bumps', 'ut_upper_jungle', 'trad', '["trad"]'::jsonb), -- Monkey Bumps | 5.9 | ~5 min on foot
  ('ut_monkey_business_2', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Monkey Business | 5.11a | ~5 min on foot
  ('ut_monkey_do', 'ut_upper_jungle', 'trad', '["trad"]'::jsonb), -- Monkey Do | 5.11a | ~5 min on foot
  ('ut_monkey_fist', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Monkey Fist | 5.10b | ~5 min on foot
  ('ut_monkey_hips_and_rice', 'ut_upper_canopy', 'trad', '["trad","sport"]'::jsonb), -- Monkey Hips and Rice | 5.10c/d | ~15 min on foot
  ('ut_monkey_on_my_back', 'ut_upper_canopy', 'sport', '["sport"]'::jsonb), -- Monkey On My Back | 5.11a | ~15 min on foot
  ('ut_monkey_sea_foam', 'ut_distant_drum', 'sport', '["sport"]'::jsonb), -- Monkey Sea Foam | 5.9+ | ~35 min on foot
  ('ut_monkey_see', 'ut_upper_jungle', 'trad', '["trad"]'::jsonb), -- Monkey See | 5.11a | ~5 min on foot
  ('ut_monkey_shoulder', 'ut_distant_drum', 'trad', '["trad","sport"]'::jsonb), -- Monkey Shoulder | 5.10b | ~35 min on foot
  ('ut_monkey_trick', 'ut_lower_jungle', 'trad', '["trad","sport"]'::jsonb), -- Monkey Trick | 5.13a | ~5 min on foot
  ('ut_mopping_up_banshee_gravy', 'ut_banshee_wall', 'sport', '["sport"]'::jsonb), -- Mopping Up Banshee Gravy | 5.10c/d | ~9 min on foot
  ('ut_mountains_of_the_moon', 'ut_dark_continent_area_the', 'sport', '["sport"]'::jsonb), -- Mountains of the Moon | 5.11b | ~5 min on foot
  ('ut_mr_clean', 'ut_reids_basin', 'sport', '["sport"]'::jsonb), -- Mr. Clean | 5.11b | ~30 min on foot
  ('ut_muli_made', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Muli Made | 5.9- | ~10 min on foot
  ('ut_murut', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Murut | 5.11a | ~10 min on foot
  ('ut_must_suck_being_you', 'ut_starting_block_the', 'sport', '["sport","toprope"]'::jsonb), -- Must Suck Being You | 5.12b/c | ~5 min on foot
  ('ut_my_ikran', 'ut_banshee_wall', 'trad', '["trad"]'::jsonb), -- My Ikran | 5.8 | ~9 min on foot
  ('ut_nag', 'ut_cobrazone', 'trad', '["trad"]'::jsonb), -- Nag | 5.9- | ~15 min on foot
  ('ut_nairobi', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Nairobi | 5.10+ | ~5 min on foot
  ('ut_natasha', 'ut_lower_moore_wall', 'trad', '["trad"]'::jsonb), -- Natasha | 5.10a | ~20 min on foot
  ('ut_nit_picking', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Nit Picking | 5.11c | ~5 min on foot
  ('ut_no_rhyme_or_reason', 'ut_starting_block_the', 'trad', '["trad","toprope"]'::jsonb), -- No Rhyme or Reason | 5.10a | ~5 min on foot
  ('ut_nomadic_alternative', 'ut_suburbia', 'trad', '["trad"]'::jsonb), -- Nomadic Alternative | 5.10- | ~45 min on foot
  ('ut_not_for_the_faint_hearted', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Not For The Faint Hearted | 5.10+ | ~10 min on foot
  ('ut_nova_s_route', 'ut_planet_of_the_apes_the', 'sport', '["sport"]'::jsonb), -- Nova's Route | 5.11d | ~35 min on foot
  ('ut_nowhere_girl', 'ut_dark_continent_area_the', 'trad', '["trad"]'::jsonb), -- Nowhere Girl | 5.11- | ~5 min on foot
  ('ut_ode_to_sha_re', 'ut_pangaea', 'trad', '["trad"]'::jsonb), -- Ode to Sha're | 5.9+ | ~45 min on foot
  ('ut_of_mice_and_men', 'ut_moore_wall_the', 'trad', '["trad"]'::jsonb), -- Of Mice and Men | 5.10a | ~20 min on foot
  ('ut_one', 'ut_banshee_wall', 'trad', '["trad"]'::jsonb), -- One | 5.9+ | ~9 min on foot
  ('ut_one_bolt_wonder', 'ut_banshee_wall', 'trad', '["trad"]'::jsonb), -- One Bolt Wonder | 5.7+ | ~9 min on foot
  ('ut_one_degree_of_separation', 'ut_distant_drum', 'sport', '["sport"]'::jsonb), -- One Degree of Separation | 5.6 | ~35 min on foot
  ('ut_one_finger_pockets_suck', 'ut_high_rise_area_the', 'trad', '["trad"]'::jsonb), -- One-finger Pockets Suck | 5.10a | ~10 min on foot
  ('ut_one_for_the_pot', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- One for the Pot | 5.10+ | ~10 min on foot
  ('ut_open_hood', 'ut_cobrazone', 'trad', '["trad"]'::jsonb), -- Open Hood | 5.9 | ~15 min on foot
  ('ut_opposable_thumbs_required', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Opposable Thumbs Required | 5.11a | ~5 min on foot
  ('ut_oranguterror', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Oranguterror | 5.11a | ~5 min on foot
  ('ut_orifice', 'ut_high_rise_area_the', 'trad', '["trad","toprope"]'::jsonb), -- Orifice | 5.8 | ~10 min on foot
  ('ut_overhanging_cockpit', 'ut_air_strip_the', 'trad', '["trad"]'::jsonb), -- Overhanging Cockpit | 5.9+ | ~15 min on foot
  ('ut_overlooked_10c', 'ut_starting_block_the', 'trad', '["trad"]'::jsonb), -- Overlooked 10c | 5.10+ | ~5 min on foot
  ('ut_paul_s_route', 'ut_moore_wall_the', 'sport', '["sport"]'::jsonb), -- Paul's Route | 5.9 | ~20 min on foot
  ('ut_peachy_carnehan', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Peachy Carnehan | 5.10+ | ~5 min on foot
  ('ut_picked_the_wrong_week', 'ut_air_strip_the', 'sport', '["sport"]'::jsonb), -- Picked the Wrong Week | 5.10a/b | ~15 min on foot
  ('ut_pico_de_gallo', 'ut_pico_wall_the', 'sport', '["sport"]'::jsonb), -- Pico de Gallo | 5.8 | ~20 min on foot
  ('ut_pico_the_good_puppy', 'ut_pico_wall_the', 'trad', '["trad","sport"]'::jsonb), -- Pico the Good Puppy | 5.8- | ~20 min on foot
  ('ut_pizza_party', 'ut_suburbia', 'trad', '["trad"]'::jsonb), -- Pizza Party | 5.11 | ~45 min on foot
  ('ut_please_leave_me_blood', 'ut_high_rise_area_the', 'sport', '["sport"]'::jsonb), -- Please Leave Me Blood | 5.13a | ~10 min on foot
  ('ut_portal_to_the_infinite', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Portal To The Infinite | 5.7 | ~10 min on foot
  ('ut_prehensile_tail_preferred', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Prehensile Tail Preferred | 5.11b | ~5 min on foot
  ('ut_primary_feathers', 'ut_flying_raptor_s_area', 'trad', '["trad"]'::jsonb), -- Primary Feathers | 5.6 | ~15 min on foot
  ('ut_primate_primer', 'ut_upper_jungle', 'trad', '["trad"]'::jsonb), -- Primate Primer | 5.10a | ~5 min on foot
  ('ut_prime_eight', 'ut_dark_continent_area_the', 'trad', '["trad"]'::jsonb), -- Prime Eight | 5.8 | ~5 min on foot
  ('ut_primordial_lichen_soup', 'ut_pangaea', 'trad', '["trad"]'::jsonb), -- Primordial Lichen Soup | 5.10- | ~45 min on foot
  ('ut_prism_of_shadows', 'ut_dark_continent_area_the', 'sport', '["sport"]'::jsonb), -- Prism of Shadows | 5.10a | ~5 min on foot
  ('ut_prisoners_of_the_sun', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Prisoners of the Sun | 5.10+ | ~10 min on foot
  ('ut_propeller_blades', 'ut_air_strip_the', 'sport', '["sport"]'::jsonb), -- Propeller Blades | 5.11- | ~15 min on foot
  ('ut_psycho_city_kid', 'ut_wall_of_mirrors', 'sport', '["sport"]'::jsonb), -- Psycho City Kid | 5.10a | ~20 min on foot
  ('ut_pumping_out_of_gas', 'ut_starting_block_the', 'sport', '["sport"]'::jsonb), -- Pumping Out of Gas | 5.10c | ~5 min on foot
  ('ut_pygmy', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Pygmy | 5.8 | ~5 min on foot
  ('ut_r_i_l_f', 'ut_suburbia', 'trad', '["trad"]'::jsonb), -- R.I.L.F. | 5.11+ | ~45 min on foot
  ('ut_rain_stopped_play', 'ut_banshee_wall', 'trad', '["trad"]'::jsonb), -- Rain Stopped Play. | 5.9 | ~9 min on foot
  ('ut_rampage_2', 'ut_upper_jungle', 'trad', '["trad"]'::jsonb), -- Rampage | 5.9- | ~5 min on foot
  ('ut_ray_of_light', 'ut_moore_wall_the', 'sport', '["sport"]'::jsonb), -- Ray of Light | 5.11c | ~20 min on foot
  ('ut_red_lock_in_suburbia', 'ut_suburbia', 'trad', '["trad"]'::jsonb), -- Red Lock in Suburbia | 5.10 | ~45 min on foot
  ('ut_red_rucksack', 'ut_erm_wall', 'sport', '["sport"]'::jsonb), -- Red Rucksack | 5.9 | ~20 min on foot
  ('ut_replete_with_gremlins', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Replete With Gremlins | 5.10+ | ~10 min on foot
  ('ut_restless_natives', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Restless Natives | 5.10b | ~5 min on foot
  ('ut_revenge_of_the_rhodesian_flycatcher', 'ut_dark_continent_area_the', 'sport', '["sport"]'::jsonb), -- Revenge of the Rhodesian Flycatcher | 5.9- | ~5 min on foot
  ('ut_rhodesian_ridgeback', 'ut_dark_continent_area_the', 'sport', '["sport"]'::jsonb), -- Rhodesian Ridgeback | 5.11+ | ~5 min on foot
  ('ut_rikki_tikki_tavi', 'ut_lower_jungle', 'trad', '["trad","sport"]'::jsonb), -- Rikki-Tikki-Tavi | 5.12a | ~5 min on foot
  ('ut_root_down', 'ut_lower_moore_wall', 'trad', '["trad"]'::jsonb), -- Root Down | 5.9+ | ~20 min on foot
  ('ut_rose_hip_corner', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Rose Hip Corner | 5.9 | ~10 min on foot
  ('ut_rose_hip_crack', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Rose Hip Crack | 5.10+ | ~10 min on foot
  ('ut_rose_hip_face', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Rose Hip Face | 5.10 | ~10 min on foot
  ('ut_rudyard_kipling', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Rudyard Kipling | 5.10b | ~5 min on foot
  ('ut_rug_rat_2', 'ut_pico_wall_the', 'trad', '["trad"]'::jsonb), -- Rug Rat | 5.7 | ~20 min on foot
  ('ut_scapular_arete', 'ut_distant_drum', 'trad', '["trad"]'::jsonb), -- Scapular Arete | 5.9+ | ~35 min on foot
  ('ut_scar_aka_inflammation_crack', 'ut_dark_continent_area_the', 'trad', '["trad"]'::jsonb), -- Scar aka Inflammation Crack | 5.13 | ~5 min on foot
  ('ut_scorpion', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Scorpion | 5.11- | ~10 min on foot
  ('ut_see_no_evil', 'ut_distant_drum', 'sport', '["sport"]'::jsonb), -- See No Evil | 5.10a/b | ~35 min on foot
  ('ut_shambala', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Shambala | 5.10+ | ~10 min on foot
  ('ut_shantaram', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Shantaram | 5.10+ | ~10 min on foot
  ('ut_she_jane', 'ut_distant_drum', 'sport', '["sport"]'::jsonb), -- She Jane | 5.12a | ~35 min on foot
  ('ut_shere_khan_2', 'ut_lower_jungle', 'trad', '["trad","sport"]'::jsonb), -- Shere Khan | 5.11- | ~5 min on foot
  ('ut_short_lived', 'ut_butterfly_lake', 'trad', '["trad"]'::jsonb), -- Short Lived | 5.10d | ~10 min on foot
  ('ut_sigurd', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Sigurd | 5.9 | ~10 min on foot
  ('ut_silverback_2', 'ut_upper_jungle', 'trad', '["trad"]'::jsonb), -- Silverback | 5.11- | ~5 min on foot
  ('ut_simeon_smile', 'ut_distant_drum', 'sport', '["sport"]'::jsonb), -- Simeon Smile | 5.9 | ~35 min on foot
  ('ut_simian_survival', 'ut_planet_of_the_apes_the', 'trad', '["trad","sport"]'::jsonb), -- Simian Survival | 5.9+ | ~35 min on foot
  ('ut_sine_wave', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Sine Wave | 5.11d | ~10 min on foot
  ('ut_siouxsie_sioux', 'ut_banshee_wall', 'sport', '["sport"]'::jsonb), -- Siouxsie Sioux | 5.11- | ~9 min on foot
  ('ut_small_bag_of_salty_peanuts', 'ut_air_strip_the', 'sport', '["sport"]'::jsonb), -- Small Bag of Salty Peanuts | 5.10d | ~15 min on foot
  ('ut_sod_noodle', 'ut_pico_wall_the', 'trad', '["trad"]'::jsonb), -- Sod Noodle | 5.6 | ~20 min on foot
  ('ut_sod_poodle', 'ut_pico_wall_the', 'trad', '["trad"]'::jsonb), -- Sod Poodle | 5.6 | ~20 min on foot
  ('ut_solstice_3', 'ut_banshee_wall', 'sport', '["sport"]'::jsonb), -- Solstice | 5.11a | ~9 min on foot
  ('ut_something_on_the_side', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Something on the Side | 5.11c | ~10 min on foot
  ('ut_son_of_a_banshee', 'ut_banshee_wall', 'sport', '["sport","toprope"]'::jsonb), -- Son of a Banshee | 5.6 | ~9 min on foot
  ('ut_song_to_the_siren', 'ut_dark_continent_area_the', 'sport', '["sport"]'::jsonb), -- Song to the Siren | 5.11 | ~5 min on foot
  ('ut_sonic_bat_tsaheylu', 'ut_banshee_wall', 'trad', '["trad"]'::jsonb), -- Sonic Bat Tsaheylu | 5.10a | ~9 min on foot
  ('ut_soul_rebel', 'ut_pass_crag_the', 'trad', '["trad"]'::jsonb), -- Soul Rebel | 5.10a | ~15 min on foot
  ('ut_sparkle_donkey', 'ut_upper_canopy', 'sport', '["sport"]'::jsonb), -- Sparkle Donkey | 5.8 | ~15 min on foot
  ('ut_spellbound', 'ut_banshee_wall', 'trad', '["trad"]'::jsonb), -- Spellbound | 5.11c | ~9 min on foot
  ('ut_splitting_atoms', 'ut_research_station_the', 'trad', '["trad"]'::jsonb), -- Splitting Atoms | 5.9- | ~10 min on foot
  ('ut_stall_fall', 'ut_air_strip_the', 'sport', '["sport"]'::jsonb), -- Stall & Fall | 5.9+ | ~15 min on foot
  ('ut_star_of_astoroth', 'ut_lower_jungle', 'trad', '["trad","sport"]'::jsonb), -- Star of  Astoroth | 5.11c | ~5 min on foot
  ('ut_stemming_sargassum', 'ut_doldrums_the', 'trad', '["trad"]'::jsonb), -- Stemming Sargassum | 5.9 | ~12 min on foot
  ('ut_steppin_razor', 'ut_pass_crag_the', 'sport', '["sport"]'::jsonb), -- Steppin' Razor | 5.10d | ~15 min on foot
  ('ut_steps_to_enlightenment', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Steps To Enlightenment | 5.10a/b | ~10 min on foot
  ('ut_stolen_crown', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Stolen Crown | 5.11c | ~10 min on foot
  ('ut_straighten_up_and_fly_right', 'ut_pandora', 'trad', '["trad"]'::jsonb), -- Straighten Up and Fly Right | 5.9+ | ~10 min on foot
  ('ut_stross_vs_kipling', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Stross vs. Kipling | 5.11a | ~5 min on foot
  ('ut_student_pilot', 'ut_air_strip_the', 'trad', '["trad"]'::jsonb), -- Student Pilot | 5.6 | ~15 min on foot
  ('ut_stuffed_monkey', 'ut_upper_canopy', 'sport', '["sport"]'::jsonb), -- Stuffed Monkey | 5.10b | ~15 min on foot
  ('ut_subduction_zone', 'ut_pangaea', 'trad', '["trad"]'::jsonb), -- Subduction Zone | 5.11a | ~45 min on foot
  ('ut_subterfuge', 'ut_flying_raptor_s_area', 'sport', '["sport"]'::jsonb), -- Subterfuge | 5.10- | ~15 min on foot
  ('ut_suck_it_up_crybaby', 'ut_starting_block_the', 'sport', '["sport"]'::jsonb), -- Suck it Up Crybaby | 5.12b | ~5 min on foot
  ('ut_sumpit', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Sumpit | 5.9+ | ~10 min on foot
  ('ut_sumwhere', 'ut_erm_wall', 'trad', '["trad","sport"]'::jsonb), -- Sumwhere | 5.10+ | ~20 min on foot
  ('ut_sunday_roast', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Sunday Roast | 5.11+ | ~10 min on foot
  ('ut_swinging_from_limbs', 'ut_distant_drum', 'sport', '["sport"]'::jsonb), -- Swinging From Limbs | 5.11a/b | ~35 min on foot
  ('ut_swinging_on_webs', 'ut_distant_drum', 'sport', '["sport"]'::jsonb), -- Swinging on Webs | 5.11b | ~35 min on foot
  ('ut_taildragger', 'ut_air_strip_the', 'trad', '["trad"]'::jsonb), -- Taildragger | 5.7 | ~15 min on foot
  ('ut_take_the_skinheads_bowling', 'ut_pass_crag_the', 'trad', '["trad"]'::jsonb), -- Take The Skinheads Bowling | 5.9 | ~15 min on foot
  ('ut_talus_knirschen', 'ut_pandora', 'sport', '["sport"]'::jsonb), -- Talus Knirschen | 5.11b | ~10 min on foot
  ('ut_tarmac_debris', 'ut_air_strip_the', 'trad', '["trad"]'::jsonb), -- Tarmac Debris | 5.8+ | ~15 min on foot
  ('ut_tectonic_plates', 'ut_pangaea', 'trad', '["trad"]'::jsonb), -- Tectonic Plates | 5.11- | ~45 min on foot
  ('ut_tequila', 'ut_moore_wall_the', 'trad', '["trad","sport"]'::jsonb), -- Tequila | 5.12b | ~20 min on foot
  ('ut_tequila_sunrise_2', 'ut_moore_wall_the', 'sport', '["sport"]'::jsonb), -- Tequila Sunrise | 5.12b | ~20 min on foot
  ('ut_terra_incognita', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Terra Incognita | 5.11- | ~5 min on foot
  ('ut_the_african_queen', 'ut_dark_continent_area_the', 'trad', '["trad"]'::jsonb), -- The African Queen | 5.10b | ~5 min on foot
  ('ut_the_ascent_of_man', 'ut_flying_raptor_s_area', 'trad', '["trad"]'::jsonb), -- The Ascent of Man | 5.10+ | ~15 min on foot
  ('ut_the_crucible', 'ut_high_rise_area_the', 'sport', '["sport"]'::jsonb), -- The Crucible | 5.13a | ~10 min on foot
  ('ut_the_father', 'ut_reids_basin', 'sport', '["sport"]'::jsonb), -- The Father | 5.11a | ~30 min on foot
  ('ut_the_gong_show', 'ut_pass_crag_the', 'trad', '["trad"]'::jsonb), -- The Gong Show | 5.10a/b | ~15 min on foot
  ('ut_the_great_ape_escape', 'ut_upper_jungle', 'trad', '["trad"]'::jsonb), -- The Great Ape Escape | 5.11a | ~5 min on foot
  ('ut_the_highline', 'ut_erm_wall', 'trad', '["trad"]'::jsonb), -- The Highline | 5.11 | ~20 min on foot
  ('ut_the_holy_ghost', 'ut_reids_basin', 'sport', '["sport"]'::jsonb), -- The Holy Ghost | 5.12a | ~30 min on foot
  ('ut_the_keener', 'ut_banshee_wall', 'sport', '["sport"]'::jsonb), -- The Keener | 5.10+ | ~9 min on foot
  ('ut_the_last_shadow_you_will_ever_see', 'ut_pandora', 'trad', '["trad"]'::jsonb), -- The Last Shadow You Will Ever See | 5.11a | ~10 min on foot
  ('ut_the_longest_day', 'ut_banshee_wall', 'trad', '["trad"]'::jsonb), -- The Longest Day | 5.10c | ~9 min on foot
  ('ut_the_lost_piton', 'ut_erm_wall', 'trad', '["trad"]'::jsonb), -- The Lost Piton | 5.9 | ~20 min on foot
  ('ut_the_man_who_would_be_king', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- The Man Who Would Be King | 5.11a | ~5 min on foot
  ('ut_the_missing_link', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- The Missing Link | 5.10c/d | ~5 min on foot
  ('ut_the_overdoit', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- The Overdoit | 5.10+ | ~5 min on foot
  ('ut_the_passage', 'ut_moore_wall_the', 'trad', '["trad"]'::jsonb), -- The Passage | 5.7 | ~20 min on foot
  ('ut_the_pink_flamingo', 'ut_flying_raptor_s_area', 'trad', '["trad"]'::jsonb), -- The Pink Flamingo | 5.10+ | ~15 min on foot
  ('ut_the_queen_of_shangri_la', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- The Queen of Shangri La | 5.11c | ~10 min on foot
  ('ut_the_septuagenarian', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- The Septuagenarian | 5.11 | ~5 min on foot
  ('ut_the_shangorilla', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- The Shangorilla | 5.10 | ~10 min on foot
  ('ut_the_shattering', 'ut_flying_raptor_s_area', 'sport', '["sport"]'::jsonb), -- The Shattering | 5.10+ | ~15 min on foot
  ('ut_the_short_forever', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- The Short Forever | 5.10 | ~10 min on foot
  ('ut_the_son', 'ut_reids_basin', 'sport', '["sport"]'::jsonb), -- The Son | 5.12c | ~30 min on foot
  ('ut_the_source_of_de_nile', 'ut_distant_drum', 'trad', '["trad"]'::jsonb), -- The Source of De Nile | 5.10+ | ~35 min on foot
  ('ut_the_trials_tribulations_of_margaret_hastings', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- The Trials & Tribulations of Margaret Hastings | 5.10a/b | ~10 min on foot
  ('ut_the_wing_s_leading_edge', 'ut_flying_raptor_s_area', 'trad', '["trad"]'::jsonb), -- The Wing's Leading Edge | 5.11a | ~15 min on foot
  ('ut_the_wrinkle', 'ut_pandora', 'trad', '["trad"]'::jsonb), -- The Wrinkle | 5.9+ | ~10 min on foot
  ('ut_thin_red_line', 'ut_shangri_la', 'trad', '["trad"]'::jsonb), -- Thin Red Line | 5.10+ | ~10 min on foot
  ('ut_titmouse', 'ut_flying_raptor_s_area', 'sport', '["sport"]'::jsonb), -- Titmouse | 5.6 | ~15 min on foot
  ('ut_to_hell_with_the_scarecrows', 'ut_planet_of_the_apes_the', 'trad', '["trad","sport"]'::jsonb), -- To Hell With The Scarecrows | 5.11b | ~35 min on foot
  ('ut_totally_topless', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Totally Topless | 5.9+ | ~10 min on foot
  ('ut_touch_no_evil', 'ut_distant_drum', 'trad', '["trad","sport"]'::jsonb), -- Touch No Evil | 5.10a/b | ~35 min on foot
  ('ut_tuff_gong', 'ut_pass_crag_the', 'sport', '["sport"]'::jsonb), -- Tuff Gong | 5.12a | ~15 min on foot
  ('ut_turbulence', 'ut_air_strip_the', 'trad', '["trad"]'::jsonb), -- Turbulence | 5.11b | ~15 min on foot
  ('ut_turning_into_the_wind', 'ut_doldrums_the', 'trad', '["trad"]'::jsonb), -- Turning Into The Wind | 5.10b | ~12 min on foot
  ('ut_two_fer', 'ut_banshee_wall', 'sport', '["sport"]'::jsonb), -- Two Fer | 5.10 | ~9 min on foot
  ('ut_tyger_tyger_burning_bright', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Tyger, Tyger, Burning Bright. | 5.10+ | ~5 min on foot
  ('ut_under_the_radar', 'ut_air_strip_the', 'sport', '["sport"]'::jsonb), -- Under the Radar | 5.10a | ~15 min on foot
  ('ut_universal_conflicts', 'ut_banshee_wall', 'trad', '["trad"]'::jsonb), -- Universal Conflicts | 5.10b | ~9 min on foot
  ('ut_upper_your_volta', 'ut_dark_continent_area_the', 'trad', '["trad","sport"]'::jsonb), -- Upper Your Volta | 5.8+ | ~5 min on foot
  ('ut_upton_sinclair', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Upton Sinclair | 5.10b | ~5 min on foot
  ('ut_utopian_lamasery', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Utopian Lamasery | 5.11 | ~10 min on foot
  ('ut_vanishing_half', 'ut_shangri_la', 'sport', '["sport"]'::jsonb), -- Vanishing Half | 5.10+ | ~10 min on foot
  ('ut_vertigo', 'ut_air_strip_the', 'trad', '["trad"]'::jsonb), -- Vertigo | 5.10+ | ~15 min on foot
  ('ut_virtual_ecstasy', 'ut_high_rise_area_the', 'sport', '["sport"]'::jsonb), -- Virtual Ecstasy | 5.11c | ~10 min on foot
  ('ut_voodoo_billy_man', 'ut_wall_of_mirrors', 'sport', '["sport"]'::jsonb), -- VooDoo Billy Man | 5.10a | ~20 min on foot
  ('ut_vt_dark_amber', 'ut_reids_basin', 'trad', '["trad"]'::jsonb), -- VT Dark Amber | 5.9 | ~30 min on foot
  ('ut_wall_of_mirrors', 'ut_wall_of_mirrors', 'sport', '["sport"]'::jsonb), -- Wall of Mirrors | 5.11b | ~20 min on foot
  ('ut_welcome_to_the_jungle_2', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Welcome to the Jungle | 5.10b/c | ~5 min on foot
  ('ut_what_s_my_line', 'ut_starting_block_the', 'sport', '["sport"]'::jsonb), -- What's My Line | 5.9 | ~5 min on foot
  ('ut_whats_the_vector_victor', 'ut_air_strip_the', 'sport', '["sport"]'::jsonb), -- Whats the Vector, Victor? | 5.10c | ~15 min on foot
  ('ut_whiskey_throttle', 'ut_pass_crag_the', 'sport', '["sport"]'::jsonb), -- Whiskey Throttle | 5.12b | ~15 min on foot
  ('ut_willie_the_pimp', 'ut_starting_block_the', 'sport', '["sport"]'::jsonb), -- Willie the Pimp | 5.10a | ~5 min on foot
  ('ut_wing_commander', 'ut_air_strip_the', 'sport', '["sport"]'::jsonb), -- Wing Commander | 5.10c | ~15 min on foot
  ('ut_wish_you_were_here_2', 'ut_moore_wall_the', 'sport', '["sport"]'::jsonb), -- Wish You Were Here | 5.10b | ~20 min on foot
  ('ut_wizard_s_sleeve', 'ut_pass_crag_the', 'sport', '["sport"]'::jsonb), -- Wizard's Sleeve | 5.9 | ~15 min on foot
  ('ut_wrath_of_the_talus_monster', 'ut_pandora', 'trad', '["trad"]'::jsonb), -- Wrath of the Talus Monster | 5.10- | ~10 min on foot
  ('ut_your_bones_will_crack', 'ut_lower_jungle', 'trad', '["trad"]'::jsonb), -- Your Bones Will Crack | 5.9+ | ~5 min on foot
  ('ut_your_substrate_makes_my_lava_flow', 'ut_pangaea', 'sport', '["sport"]'::jsonb), -- Your Substrate Makes My Lava Flow | 5.9 | ~45 min on foot
  ('ut_yours_truly', 'ut_lower_jungle', 'sport', '["sport"]'::jsonb), -- Yours Truly | 5.10 | ~5 min on foot
  ('ut_zoo_keeper', 'ut_distant_drum', 'trad', '["trad"]'::jsonb), -- Zoo Keeper | 5.9 | ~35 min on foot
  ('wy_10c_exit', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- 10c exit | 5.10c | ~30 min on foot
  ('wy_5_11_exit', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- 5.11 exit | 5.11 | ~30 min on foot
  ('wy_8_exit_crack', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- .8 exit crack | 5.8 | ~30 min on foot
  ('wy_9_exit', 'wy_upper_blacktail_butte', 'trad', '["trad"]'::jsonb), -- .9+ exit | 5.9+ | ~30 min on foot
  ('wy_aah_me_wrikey', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Aah... Me Wrikey | 5.11b | ~1 min on foot
  ('wy_americana', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Americana | 5.12a | ~30 min on foot
  ('wy_arch_direct_waterstreak', 'wy_lower_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Arch Direct - Waterstreak | 5.12c | ~5 min on foot
  ('wy_as_you_wish', 'wy_lower_blacktail_butte', 'sport', '["sport"]'::jsonb), -- As You Wish | 5.11c | ~5 min on foot
  ('wy_at_the_radio', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- At the Radio | 5.11b | ~1 min on foot
  ('wy_balls', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Balls? | 5.11a | ~1 min on foot
  ('wy_big_ben', 'wy_island_the_climbs', 'sport', '["sport"]'::jsonb), -- Big Ben | 5.10d | ~1 min on foot
  ('wy_blazing_star', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Blazing Star | 5.12d | ~1 min on foot
  ('wy_blitzkrieg', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Blitzkrieg | 5.11d | ~30 min on foot
  ('wy_bobby_and_the_bosch', 'wy_island_the_climbs', 'sport', '["sport"]'::jsonb), -- Bobby and The Bosch | 5.9+ | ~1 min on foot
  ('wy_brighton_rock', 'wy_island_the_climbs', 'trad', '["trad"]'::jsonb), -- Brighton Rock | 5.8 | ~1 min on foot
  ('wy_bruce_s_crack', 'wy_island_the_climbs', 'trad', '["trad"]'::jsonb), -- Bruce's Crack | 5.7 | ~1 min on foot
  ('wy_bullit_with_a_name_on_it', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Bullit with a name on it | 5.10b/c | ~30 min on foot
  ('wy_certain_damage', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Certain Damage | 5.12b | ~1 min on foot
  ('wy_check_my_brain', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Check my Brain | 5.10a/b | ~30 min on foot
  ('wy_chili_verde', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Chili Verde | 5.9+ | ~30 min on foot
  ('wy_come_out_swingin', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Come out Swingin | 5.9 | ~30 min on foot
  ('wy_community_service', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Community Service | 5.10b | ~1 min on foot
  ('wy_crackin_the_cherry', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Crackin' the Cherry | 5.10d | ~30 min on foot
  ('wy_crimp_master_5000', 'wy_island_the_climbs', 'sport', '["sport"]'::jsonb), -- Crimp Master 5000 | 5.11d | ~1 min on foot
  ('wy_digital_jedi', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Digital Jedi | 5.11c/d | ~1 min on foot
  ('wy_disconnected', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Disconnected | 5.12- | ~30 min on foot
  ('wy_do_the_right_thing', 'wy_lower_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Do the Right Thing | 5.11c | ~5 min on foot
  ('wy_easy_ramp', 'wy_the_tunnel_wall', 'trad', '["trad"]'::jsonb), -- Easy Ramp | 5.6 | ~1 min on foot
  ('wy_egyptian', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Egyptian | 5.9+ | ~1 min on foot
  ('wy_eight_crack', 'wy_upper_blacktail_butte', 'trad', '["trad"]'::jsonb), -- Eight Crack | 5.8+ | ~30 min on foot
  ('wy_feelin_all_right', 'wy_island_the_climbs', 'sport', '["sport"]'::jsonb), -- Feelin' All Right | 5.8 | ~1 min on foot
  ('wy_free_time', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Free Time | 5.12a | ~1 min on foot
  ('wy_general_crook', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- General Crook | 5.10c | ~30 min on foot
  ('wy_goldstein', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Goldstein | 5.11d | ~30 min on foot
  ('wy_graceland', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Graceland | 5.11b/c | ~30 min on foot
  ('wy_gunpowder', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Gunpowder | 5.10+ | ~1 min on foot
  ('wy_higher_education', 'wy_lower_blacktail_butte', 'sport', '["sport","toprope"]'::jsonb), -- Higher Education | 5.12a | ~5 min on foot
  ('wy_hole_a_day', 'wy_island_the_climbs', 'sport', '["sport"]'::jsonb), -- Hole A Day | 5.11a | ~1 min on foot
  ('wy_illegal_dihedral', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Illegal Dihedral | 5.10d | ~1 min on foot
  ('wy_in_with_the_new', 'wy_island_the_climbs', 'sport', '["sport"]'::jsonb), -- In With The New | 5.8 | ~1 min on foot
  ('wy_inconceivable', 'wy_lower_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Inconceivable | 5.11a | ~5 min on foot
  ('wy_jesus_loves_you', 'wy_island_the_climbs', 'sport', '["sport"]'::jsonb), -- Jesus Loves You | 5.7 | ~1 min on foot
  ('wy_jingus_road', 'wy_lower_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Jingus Road | 5.12a/b | ~5 min on foot
  ('wy_kehough_cling', 'wy_lower_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Kehough Cling | 5.12b/c | ~5 min on foot
  ('wy_last_freedom', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Last Freedom | 5.11d | ~1 min on foot
  ('wy_leftovers', 'wy_lower_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Leftovers | 5.10c | ~5 min on foot
  ('wy_light_it_up', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Light it up | 5.10a | ~30 min on foot
  ('wy_light_tension', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Light Tension | 5.11b | ~1 min on foot
  ('wy_mac_10', 'wy_upper_blacktail_butte', 'trad', '["trad"]'::jsonb), -- Mac-10 | 5.10b | ~30 min on foot
  ('wy_mild_thing', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Mild Thing | 5.9 | ~1 min on foot
  ('wy_million_miles', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Million Miles | 5.12a | ~30 min on foot
  ('wy_mind_games', 'wy_island_the_climbs', 'sport', '["sport"]'::jsonb), -- Mind Games | 5.10a | ~1 min on foot
  ('wy_mountaineers_route', 'wy_upper_blacktail_butte', 'trad', '["trad"]'::jsonb), -- Mountaineers Route | 5.6 | ~30 min on foot
  ('wy_muy_macho', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Muy Macho | 5.10d | ~30 min on foot
  ('wy_nine_millimeter', 'wy_upper_blacktail_butte', 'trad', '["trad"]'::jsonb), -- Nine Millimeter | 5.9+ | ~30 min on foot
  ('wy_outsider', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Outsider | 5.10a/b | ~30 min on foot
  ('wy_panic', 'wy_island_the_climbs', 'sport', '["sport"]'::jsonb), -- Panic! | 5.11a | ~1 min on foot
  ('wy_power_trip', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Power Trip | 5.9+ | ~30 min on foot
  ('wy_push_it', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Push It | 5.10a | ~30 min on foot
  ('wy_race_against_myself', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Race Against Myself | 5.10b | ~30 min on foot
  ('wy_rain_or_shine', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Rain or shine | 5.10a | ~1 min on foot
  ('wy_red_chili', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Red Chili | 5.10a | ~30 min on foot
  ('wy_rescue', 'wy_island_the_climbs', 'sport', '["sport"]'::jsonb), -- Rescue | 5.8 | ~1 min on foot
  ('wy_rock_candy_nugget', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Rock Candy Nugget | 5.10b | ~30 min on foot
  ('wy_rub_the_nub', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Rub the Nub | 5.9 | ~1 min on foot
  ('wy_running_down_a_dream', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Running Down a Dream | 5.13b | ~30 min on foot
  ('wy_search', 'wy_island_the_climbs', 'sport', '["sport"]'::jsonb), -- Search | 5.8 | ~1 min on foot
  ('wy_shattered_dream', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Shattered Dream | 5.9+ | ~30 min on foot
  ('wy_silent_spaz', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Silent Spaz | 5.10a | ~1 min on foot
  ('wy_spider_pig', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Spider Pig | 5.12b | ~1 min on foot
  ('wy_splinter', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Splinter | 5.10b | ~30 min on foot
  ('wy_spring_cleaning', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Spring Cleaning | 5.10c | ~1 min on foot
  ('wy_squintch', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Squintch | 5.12b/c | ~1 min on foot
  ('wy_still_born', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Still Born | 5.9 | ~30 min on foot
  ('wy_tec_dc_9', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Tec DC-9 | 5.10a | ~30 min on foot
  ('wy_the_arch', 'wy_lower_blacktail_butte', 'sport', '["sport"]'::jsonb), -- The Arch | 5.12a | ~5 min on foot
  ('wy_the_horn_of_plenty', 'wy_island_the_climbs', 'sport', '["sport"]'::jsonb), -- The Horn of Plenty | 5.12a | ~1 min on foot
  ('wy_this_is_the_new_shit', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- This is the new shit | 5.8 | ~30 min on foot
  ('wy_times_flies_when_you_re_alive', 'wy_lower_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Times Flies When You're Alive | 5.10c | ~5 min on foot
  ('wy_value_jet', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Value Jet | 5.10c | ~1 min on foot
  ('wy_waterstreak', 'wy_lower_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Waterstreak | 5.12b | ~5 min on foot
  ('wy_waterstreak_direct', 'wy_lower_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Waterstreak Direct | 5.13a | ~5 min on foot
  ('wy_welcome_to_billings', 'wy_island_the_climbs', 'sport', '["sport"]'::jsonb), -- Welcome to Billings | 5.8 | ~1 min on foot
  ('wy_wild_at_heart', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb), -- Wild at Heart | 5.11b | ~30 min on foot
  ('wy_wild_thing', 'wy_the_tunnel_wall', 'sport', '["sport"]'::jsonb), -- Wild Thing | 5.10c | ~1 min on foot
  ('wy_winston', 'wy_upper_blacktail_butte', 'sport', '["sport"]'::jsonb); -- Winston | 5.11c | ~30 min on foot

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
  if n_missing > 0 or n_moved_area > 0 then raise exception 'ids or areas changed since the audit (rows.json 2026-11-14) — re-run classify.js'; end if;
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

-- Expect 672 (less any rows the guards skipped; the notice above says why).
select discipline, count(*) from routes where id in (select id from _crag_moves) group by discipline order by 1;

commit;
