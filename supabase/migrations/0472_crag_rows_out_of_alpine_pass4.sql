-- 0472 — Crag rows filed alpine move to trad / sport / top-rope, pass 4 (owner 2026-11-11: "crag for trad is just a
-- short approach"; passes 1-3 = 0452, 0457, 0462). 202 rows: 113 sport, 86 trad, 3 toprope.
--
-- These rows match the audit filter (alpine, 5.x grade, no alpine grade, no Summit pin, no gain) but were never judged by
-- passes 1-3 (894 rows, 359 areas). Each area was researched for a STATED walk time (12 lists, 2026-11-18;
-- data/research/2026-11-14/crag4/q-out-*.json; decisions: research-data/crag-rows-out-of-alpine-pass4-2026-11-18/).
-- A row moves only when ALL hold (owner: "accurate and correct"; "i dont want to have to do any of our own math"):
--  * a page STATES the walk from the car to the base as <= 60 min, or as roadside; a distance alone, a time from a lift
--    or from a point part-way in, a time stated only for a neighbouring or parent area, or a time past 60 min -> NOT moved;
--  * no summit / ridge finish, glacier or snow for the area;
--  * Mountain Project names THIS route with a Sport / Trad / TR type (no guessed or near-spelling match);
--  * the row's own text carries no strong alpine signal; no row or area moved TO alpine by 0413/0418 (checked).
--
-- Guards (as 0462): assert-then-set (a row no longer alpine is left alone); a row whose discipline the owner locked
-- by hand (route_field_confidence) or that carries an approved climber edit of discipline / rockStyle is left alone.
-- disciplines: the new primary first (0366's trigger requires it), then the route's MP types, then any other tag
-- already on the row except alpine / mountaineering / scrambling. Area main types re-derive via triggers 0051, 0198.
-- Checked before applying: check:migration-claims, check:sql preflight, check:migration-replay; version recorded in
-- supabase_migrations.schema_migrations in the same step; then npm run gen:schema.
begin;

create temp table _crag_moves (id text primary key, area_id text not null, discipline text not null, disciplines jsonb not null) on commit drop;
insert into _crag_moves (id, area_id, discipline, disciplines) values
  ('ak_300_days_of_sunshine_and_attitude', 'ak_republic_of_boulder', 'sport', '["sport"]'::jsonb), -- 300 Days of Sunshine and Attitude | 5.12b | <= 25 min on foot
  ('ak_5_star_everything', 'ak_republic_of_boulder', 'sport', '["sport"]'::jsonb), -- 5 Star Everything | 5.11a | <= 25 min on foot
  ('ak_919', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- 919 | 5.8+ | <= 25 min on foot
  ('ak_afternoon_shadow_boxing', 'ak_sunny_side_the', 'trad', '["trad"]'::jsonb), -- Afternoon Shadow Boxing | 5.7 | <= 25 min on foot
  ('ak_air_shows_flower_drops', 'ak_airport_heights', 'sport', '["sport"]'::jsonb), -- Air Shows & Flower Drops | 5.10c | <= 15 min on foot
  ('ak_allice_in_wonderland', 'ak_tunnel_wall_the', 'sport', '["sport"]'::jsonb), -- Allice in Wonderland | 5.10c/d | <= 1 min on foot
  ('ak_already_herd', 'ak_lookout_rock', 'sport', '["sport"]'::jsonb), -- Already Herd | 5.9 | <= 20 min on foot
  ('ak_anchor_man', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Anchor Man | 5.9+ | <= 25 min on foot
  ('ak_another_foolish_route', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Another Foolish Route | 5.7 | <= 25 min on foot
  ('ak_ant_eater', 'ak_tsaina_river_gorge_wall', 'trad', '["trad"]'::jsonb), -- Ant Eater | 5.10b | <= 2 min on foot
  ('ak_artic_oven_lovin', 'ak_sunny_side_the', 'trad', '["trad"]'::jsonb), -- Artic Oven Lovin | 5.6 | <= 25 min on foot
  ('ak_babar_yoga', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Babar Yoga | 5.6 | <= 25 min on foot
  ('ak_backflip_bum', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Backflip Bum | 5.9 | <= 25 min on foot
  ('ak_balaclava_joy', 'ak_sunny_side_the', 'trad', '["trad"]'::jsonb), -- Balaclava Joy | 5.6 | <= 25 min on foot
  ('ak_bicentennial', 'ak_lookout_rock', 'sport', '["sport"]'::jsonb), -- Bicentennial | 5.8 | <= 20 min on foot
  ('ak_bio_dome', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Bio-Dome | 5.7 | <= 25 min on foot
  ('ak_brand_new', 'ak_lookout_rock', 'sport', '["sport"]'::jsonb), -- Brand New | 5.8 | <= 20 min on foot
  ('ak_by_others', 'ak_mine_the', 'trad', '["trad"]'::jsonb), -- By Others | 5.8 | <= 45 min on foot
  ('ak_canadian_heat_wave', 'ak_panorama_point', 'sport', '["sport"]'::jsonb), -- Canadian Heat Wave | 5.11a | <= 15 min on foot
  ('ak_casa_bonita', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Casa Bonita | 5.9+ | <= 25 min on foot
  ('ak_cessna_in_turbulence', 'ak_airport_heights', 'sport', '["sport"]'::jsonb), -- Cessna in Turbulence | 5.8 | <= 15 min on foot
  ('ak_chain_letters_from_the_dalai_lama', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Chain Letters From the Dalai Lama | 5.8 | <= 25 min on foot
  ('ak_chain_letters_to_the_dalai_lama', 'ak_republic_of_boulder', 'sport', '["sport"]'::jsonb), -- Chain Letters to the Dalai Lama | 5.11c | <= 25 min on foot
  ('ak_choss_boss', 'ak_tunnel_wall_the', 'sport', '["sport"]'::jsonb), -- Choss Boss | 5.12a | <= 1 min on foot
  ('ak_cold_day_at_the_fair', 'ak_renaissance_wall', 'trad', '["trad"]'::jsonb), -- Cold Day at The Fair | 5.11- | <= 60 min on foot
  ('ak_cool_hand_luke', 'ak_raspberry_rock', 'trad', '["trad"]'::jsonb), -- Cool Hand Luke | 5.8 | <= 5 min on foot
  ('ak_cotter_unlimited', 'ak_panorama_point', 'sport', '["sport"]'::jsonb), -- Cotter Unlimited | 5.8- | <= 15 min on foot
  ('ak_curry_popcorn', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Curry Popcorn | 5.7 | <= 25 min on foot
  ('ak_d', 'ak_raspberry_rock', 'sport', '["sport"]'::jsonb), -- d | 5.10a | <= 5 min on foot
  ('ak_danger_stranger', 'ak_panorama_point', 'sport', '["sport"]'::jsonb), -- Danger Stranger | 5.12b | <= 15 min on foot
  ('ak_derailed', 'ak_tunnel_wall_the', 'sport', '["sport"]'::jsonb), -- Derailed | 5.12b | <= 1 min on foot
  ('ak_double_micros', 'ak_gold_cord_lake', 'trad', '["trad"]'::jsonb), -- Double micros | 5.10 | <= 30 min on foot
  ('ak_dynosaur', 'ak_panorama_point', 'sport', '["sport"]'::jsonb), -- Dynosaur | 5.11d | <= 15 min on foot
  ('ak_e', 'ak_raspberry_rock', 'trad', '["trad"]'::jsonb), -- E. | 5.10c | <= 5 min on foot
  ('ak_e_talk_the_talk', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- E-Talk the Talk | 5.7 | <= 25 min on foot
  ('ak_eager_beaver', 'ak_airport_heights', 'sport', '["sport"]'::jsonb), -- Eager Beaver | 5.11d | <= 15 min on foot
  ('ak_elitist_s_overcompensation', 'ak_republic_of_boulder', 'sport', '["sport"]'::jsonb), -- Elitist's Overcompensation | 5.11c | <= 25 min on foot
  ('ak_entrepreneur', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Entrepreneur | 5.8+ | <= 25 min on foot
  ('ak_ewok_the_walk', 'ak_sunny_side_the', 'trad', '["trad"]'::jsonb), -- Ewok the Walk | 5.8+ | <= 25 min on foot
  ('ak_face_in_the_crowd', 'ak_tsaina_river_gorge_wall', 'sport', '["sport"]'::jsonb), -- Face In The Crowd | 5.7 | <= 2 min on foot
  ('ak_find_the_cure', 'ak_sunny_side_the', 'trad', '["trad"]'::jsonb), -- Find The Cure | 5.8 | <= 25 min on foot
  ('ak_fixe_fixie', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Fixe Fixie | 5.9 | <= 25 min on foot
  ('ak_flatirons', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Flatirons | 5.10a | <= 25 min on foot
  ('ak_follow_the_medallion', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Follow the Medallion | 5.10b | <= 25 min on foot
  ('ak_fudgecicle_chimney', 'ak_19_mile_wall_2', 'trad', '["trad"]'::jsonb), -- Fudgecicle Chimney | 5.8 | <= 45 min on foot
  ('ak_g', 'ak_raspberry_rock', 'sport', '["sport"]'::jsonb), -- G | 5.10c | <= 5 min on foot
  ('ak_game_on', 'ak_sunny_side_the', 'trad', '["trad"]'::jsonb), -- Game On! | 5.10b | <= 25 min on foot
  ('ak_gingerade', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Gingerade | 5.7 | <= 25 min on foot
  ('ak_gold_spot', 'ak_mine_the', 'trad', '["trad"]'::jsonb), -- Gold Spot | 5.9 | <= 45 min on foot
  ('ak_goldrunner', 'ak_mine_the', 'trad', '["trad"]'::jsonb), -- Goldrunner | 5.10d | <= 45 min on foot
  ('ak_grandma_s_barley_soup', 'ak_sunny_side_the', 'trad', '["trad"]'::jsonb), -- Grandma's Barley Soup | 5.6 | <= 25 min on foot
  ('ak_gusel_jugs', 'ak_panorama_point', 'sport', '["sport"]'::jsonb), -- Gusel Jugs | 5.12b | <= 15 min on foot
  ('ak_happy_rosh_hashana', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Happy Rosh Hashana | 5.6 | <= 25 min on foot
  ('ak_harristotle', 'ak_panorama_point', 'sport', '["sport"]'::jsonb), -- Harristotle | 5.11b | <= 15 min on foot
  ('ak_honey_badger', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Honey Badger | 5.6 | <= 25 min on foot
  ('ak_hunka_munka', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Hunka Munka | 5.9 | <= 25 min on foot
  ('ak_i_got_a_fever_of_5_7', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- I Got A Fever of 5.7 | 5.7 | <= 25 min on foot
  ('ak_i_love_lamp', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- I Love Lamp | 5.10a | <= 25 min on foot
  ('ak_jacobs_ladder', 'ak_tsaina_river_gorge_wall', 'trad', '["trad"]'::jsonb), -- Jacobs Ladder | 5.10b | <= 2 min on foot
  ('ak_kentner_s_mill', 'ak_panorama_point', 'sport', '["sport"]'::jsonb), -- Kentner's Mill | 5.6 | <= 15 min on foot
  ('ak_kombucha_crack', 'ak_sunny_side_the', 'trad', '["trad"]'::jsonb), -- Kombucha Crack | 5.6 | <= 25 min on foot
  ('ak_larping_on_acid', 'ak_renaissance_wall', 'trad', '["trad"]'::jsonb), -- LARPing on Acid | 5.11+ | <= 60 min on foot
  ('ak_last_train_to_chossville', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Last Train to Chossville | 5.7 | <= 25 min on foot
  ('ak_learning_center_for_ants', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Learning Center for Ants | 5.7 | <= 25 min on foot
  ('ak_ledgeway_to_sleven', 'ak_panorama_point', 'sport', '["sport"]'::jsonb), -- Ledgeway to Sleven | 5.11a | <= 15 min on foot
  ('ak_lefty_lucy', 'ak_panorama_point', 'sport', '["sport"]'::jsonb), -- Lefty Lucy | 5.9+ | <= 15 min on foot
  ('ak_lightning_strikes_twice', 'ak_tsaina_river_gorge_wall', 'sport', '["sport"]'::jsonb), -- Lightning Strikes Twice | 5.10- | <= 2 min on foot
  ('ak_love_bubble', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Love Bubble | 5.8 | <= 25 min on foot
  ('ak_lucky_number_fifty_sleven', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Lucky Number Fifty-Sleven | 5.6 | <= 25 min on foot
  ('ak_mccarthy_bus_lane', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- McCarthy  Bus Lane | 5.7 | <= 25 min on foot
  ('ak_mcschmiggens', 'ak_sunny_side_the', 'trad', '["trad"]'::jsonb), -- McSchmiggens | 5.6 | <= 25 min on foot
  ('ak_mecha_streisand', 'ak_sunny_side_the', 'trad', '["trad"]'::jsonb), -- Mecha Streisand | 5.10a | <= 25 min on foot
  ('ak_meet_you_at_the_station', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Meet You at the Station | 5.5 | <= 25 min on foot
  ('ak_mimosa_morning', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Mimosa Morning | 5.8 | <= 25 min on foot
  ('ak_my_pick_struck_cold', 'ak_tunnel_wall_the', 'sport', '["sport"]'::jsonb), -- My Pick Struck Cold! | 5.11d | <= 1 min on foot
  ('ak_neptune', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Neptune | 5.7 | <= 25 min on foot
  ('ak_new_era', 'ak_19_mile_wall_2', 'trad', '["trad"]'::jsonb), -- New Era | 5.8 | <= 45 min on foot
  ('ak_no_bolts', 'ak_mine_the', 'trad', '["trad"]'::jsonb), -- No Bolts | 5.9+ | <= 45 min on foot
  ('ak_north_slope', 'ak_republic_of_boulder', 'sport', '["sport"]'::jsonb), -- North Slope | 5.11d | <= 25 min on foot
  ('ak_northurn_lights_dleight', 'ak_sunny_side_the', 'trad', '["trad"]'::jsonb), -- Northurn lights dleight | 5.11a | <= 25 min on foot
  ('ak_on_the_grid', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- On The Grid | 5.6 | <= 25 min on foot
  ('ak_organic', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Organic | 5.8 | <= 25 min on foot
  ('ak_party_on_garth', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Party on Garth | 5.5 | <= 25 min on foot
  ('ak_party_on_wayne', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Party on Wayne | 5.8 | <= 25 min on foot
  ('ak_paydirt', 'ak_mine_the', 'trad', '["trad"]'::jsonb), -- Paydirt | 5.9+ | <= 45 min on foot
  ('ak_people_get_up_and_drive_your_funky_soul', 'ak_lookout_rock', 'sport', '["sport"]'::jsonb), -- People Get Up And Drive Your Funky Soul | 5.11c | <= 20 min on foot
  ('ak_philanthroparian', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Philanthroparian | 5.8 | <= 25 min on foot
  ('ak_pika_s_penthouse', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Pika's Penthouse | 5.9 | <= 25 min on foot
  ('ak_pika_s_playhouse', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Pika's Playhouse | 5.7+ | <= 25 min on foot
  ('ak_ping_pong_madness', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Ping Pong Madness | 5.8 | <= 25 min on foot
  ('ak_pws_training_run', 'ak_mine_the', 'trad', '["trad"]'::jsonb), -- PWS Training Run | 5.11a | <= 45 min on foot
  ('ak_quartzsite_s_strike', 'ak_lookout_rock', 'sport', '["sport"]'::jsonb), -- Quartzsite's Strike | 5.11a | <= 20 min on foot
  ('ak_reacharound', 'ak_lookout_rock', 'sport', '["sport"]'::jsonb), -- Reacharound | 5.9+ | <= 20 min on foot
  ('ak_redheaded_stepchild', 'ak_panorama_point', 'trad', '["trad"]'::jsonb), -- Redheaded Stepchild | 5.11d | <= 15 min on foot
  ('ak_renaissance_man', 'ak_renaissance_wall', 'trad', '["trad"]'::jsonb), -- Renaissance Man | 5.11c | <= 60 min on foot
  ('ak_retroed_art', 'ak_renaissance_wall', 'trad', '["trad"]'::jsonb), -- Retroed Art | 5.11a | <= 60 min on foot
  ('ak_right_a_way_gone_wrong', 'ak_tunnel_wall_the', 'sport', '["sport"]'::jsonb), -- Right-a-Way Gone Wrong | 5.11c | <= 1 min on foot
  ('ak_righty_tighty', 'ak_panorama_point', 'sport', '["sport"]'::jsonb), -- Righty Tighty | 5.8 | <= 15 min on foot
  ('ak_rotten_reynolds_run_him_out_of_town', 'ak_tunnel_wall_the', 'sport', '["sport"]'::jsonb), -- Rotten Reynolds "Run Him Out Of Town" | 5.11a | <= 1 min on foot
  ('ak_salami_heist', 'ak_sunny_side_the', 'trad', '["trad"]'::jsonb), -- Salami Heist | 5.7 | <= 25 min on foot
  ('ak_saturday_night_fever', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Saturday Night Fever | 5.8 | <= 25 min on foot
  ('ak_science_is_sorcery', 'ak_renaissance_wall', 'trad', '["trad"]'::jsonb), -- Science is Sorcery | 5.11a | <= 60 min on foot
  ('ak_scouts_honor', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Scouts Honor | 5.6 | <= 25 min on foot
  ('ak_seams_to_me', 'ak_tsaina_river_gorge_wall', 'trad', '["trad"]'::jsonb), -- Seams To Me | 5.6 | <= 2 min on foot
  ('ak_sharp_end', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Sharp End | 5.8 | <= 25 min on foot
  ('ak_shoop_dog', 'ak_19_mile_wall_2', 'trad', '["trad"]'::jsonb), -- Shoop Dog | 5.7 | <= 45 min on foot
  ('ak_shoot_em_up', 'ak_tunnel_wall_the', 'sport', '["sport"]'::jsonb), -- Shoot' em Up | 5.11b | <= 1 min on foot
  ('ak_six_figure_bums', 'ak_republic_of_boulder', 'sport', '["sport"]'::jsonb), -- Six Figure Bums | 5.12b | <= 25 min on foot
  ('ak_slabawooke', 'ak_panorama_point', 'sport', '["sport"]'::jsonb), -- Slabawooke | 5.6 | <= 15 min on foot
  ('ak_snot_a_rocket', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Snot a Rocket | 5.7 | <= 25 min on foot
  ('ak_socal_dj', 'ak_renaissance_wall', 'sport', '["sport"]'::jsonb), -- SoCal DJ | 5.10d | <= 60 min on foot
  ('ak_soldiers_of_the_cross', 'ak_tsaina_river_gorge_wall', 'sport', '["sport"]'::jsonb), -- Soldiers of the Cross | 5.10 | <= 2 min on foot
  ('ak_south_park', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- South Park | 5.8+ | <= 25 min on foot
  ('ak_steave_s_goalie', 'ak_sunny_side_the', 'trad', '["trad"]'::jsonb), -- Steave's Goalie | 5.7 | <= 25 min on foot
  ('ak_stellar_cruise', 'ak_mine_the', 'trad', '["trad"]'::jsonb), -- Stellar Cruise | 5.10b | <= 45 min on foot
  ('ak_steve_s_tanker', 'ak_sunny_side_the', 'trad', '["trad"]'::jsonb), -- Steve's Tanker | 5.8 | <= 25 min on foot
  ('ak_stoken_the_stove', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Stoken the Stove | 5.7 | <= 25 min on foot
  ('ak_sundowner', 'ak_raspberry_rock', 'sport', '["sport"]'::jsonb), -- Sundowner | 5.10b | <= 5 min on foot
  ('ak_super_cub', 'ak_airport_heights', 'sport', '["sport"]'::jsonb), -- Super Cub | 5.10a | <= 15 min on foot
  ('ak_sway_penny_yoga', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Sway Penny Yoga | 5.8 | <= 25 min on foot
  ('ak_swayze_express', 'ak_19_mile_wall_2', 'trad', '["trad"]'::jsonb), -- Swayze Express | 5.10a | <= 45 min on foot
  ('ak_tailspin', 'ak_airport_heights', 'sport', '["sport"]'::jsonb), -- Tailspin | 5.10b | <= 15 min on foot
  ('ak_tavern_time', 'ak_renaissance_wall', 'trad', '["trad"]'::jsonb), -- Tavern Time | 5.8 | <= 60 min on foot
  ('ak_the_firing_line', 'ak_panorama_point', 'trad', '["trad"]'::jsonb), -- The Firing Line | 5.10c | <= 15 min on foot
  ('ak_the_jester', 'ak_renaissance_wall', 'trad', '["trad"]'::jsonb), -- The Jester | 5.11+ | <= 60 min on foot
  ('ak_the_lost_era', 'ak_airport_heights', 'sport', '["sport"]'::jsonb), -- The Lost Era | 5.11a | <= 15 min on foot
  ('ak_the_mental_block', 'ak_raspberry_rock', 'sport', '["sport"]'::jsonb), -- The Mental Block | 5.9 | <= 5 min on foot
  ('ak_the_nose_knows', 'ak_panorama_point', 'sport', '["sport"]'::jsonb), -- The Nose Knows | 5.11d | <= 15 min on foot
  ('ak_thursday_night_cruiser', 'ak_sunny_side_the', 'sport', '["sport"]'::jsonb), -- Thursday Night Cruiser | 5.9+ | <= 25 min on foot
  ('ak_tibetan_prayer_flags_made_in_china', 'ak_republic_of_boulder', 'sport', '["sport"]'::jsonb), -- Tibetan Prayer Flags Made in China | 5.11b | <= 25 min on foot
  ('ak_trustafarian_rasta_with_a_trust_fund', 'ak_republic_of_boulder', 'sport', '["sport"]'::jsonb), -- Trustafarian (Rasta With a Trust Fund) | 5.12a | <= 25 min on foot
  ('ak_under_the_drip', 'ak_mine_the', 'trad', '["trad"]'::jsonb), -- Under the Drip | 5.10d | <= 45 min on foot
  ('ak_unknown_1_3', 'ak_raspberry_rock', 'trad', '["trad"]'::jsonb), -- Unknown 1 | 5.10a | <= 5 min on foot
  ('ak_unknown_10', 'ak_tunnel_wall_the', 'sport', '["sport"]'::jsonb), -- Unknown | 5.11a | <= 1 min on foot
  ('ak_unknown_11', 'ak_tsaina_river_gorge_wall', 'trad', '["trad"]'::jsonb), -- Unknown | 5.10c | <= 2 min on foot
  ('ak_up_and_at_em', 'ak_mine_the', 'trad', '["trad"]'::jsonb), -- Up and At' em | 5.10d | <= 45 min on foot
  ('ak_valet_at_the_movement', 'ak_republic_of_boulder', 'sport', '["sport"]'::jsonb), -- Valet at the Movement | 5.10c/d | <= 25 min on foot
  ('ak_walkman_and_button_heads', 'ak_renaissance_wall', 'trad', '["trad"]'::jsonb), -- Walkman and Button Heads | 5.11a | <= 60 min on foot
  ('ak_warm_up_with_a_little_fisting', 'ak_renaissance_wall', 'trad', '["trad"]'::jsonb), -- Warm up with a little fisting | 5.10a | <= 60 min on foot
  ('ak_what_would_squeak_do', 'ak_sunny_side_the', 'trad', '["trad"]'::jsonb), -- What Would Squeak Do? | 5.7 | <= 25 min on foot
  ('ak_yippie_yuppie_hippie', 'ak_republic_of_boulder', 'sport', '["sport"]'::jsonb), -- Yippie (Yuppie Hippie) | 5.11c | <= 25 min on foot
  ('ak_your_favorite_weapon', 'ak_lookout_rock', 'sport', '["sport"]'::jsonb), -- Your Favorite Weapon | 5.8 | <= 20 min on foot
  ('ca_all_work_no_spray', 'ca_stream_wall', 'sport', '["sport"]'::jsonb), -- All Work No Spray | 5.11b/c | <= 20 min on foot
  ('ca_alligator_jaws', 'ca_upper_dinosaur_rock_north_face', 'trad', '["trad"]'::jsonb), -- Alligator Jaws | 5.9 | <= 15 min on foot
  ('ca_arctic_arete', 'ca_arctic_temple', 'trad', '["trad"]'::jsonb), -- Arctic Arete | 5.10d | <= 45 min on foot
  ('ca_arroyo_seco', 'ca_stream_wall', 'trad', '["trad"]'::jsonb), -- Arroyo Seco | 5.10d | <= 20 min on foot
  ('ca_autumn_storm', 'ca_wavy_gravy_wall', 'sport', '["sport"]'::jsonb), -- Autumn Storm | 5.9+ | <= 20 min on foot
  ('ca_balvenie', 'ca_highlands_wall', 'trad', '["trad"]'::jsonb), -- Balvenie | 5.9 | <= 45 min on foot
  ('ca_banjo_memorial_buttress', 'ca_lower_dinosaur_rock_w_face', 'trad', '["trad"]'::jsonb), -- Banjo Memorial Buttress | 5.10c | <= 15 min on foot
  ('ca_barely_anything', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Barely Anything | 5.10c | <= 5 min on foot
  ('ca_battle_crack', 'ca_castle_grey_skull', 'trad', '["trad"]'::jsonb), -- Battle Crack | 5.9 | <= 10 min on foot
  ('ca_ben_nevis', 'ca_kilt_wall', 'trad', '["trad"]'::jsonb), -- Ben Nevis | 5.9+ | <= 45 min on foot
  ('ca_big_dog', 'ca_lower_dinosaur_rock_w_face', 'trad', '["trad"]'::jsonb), -- Big Dog | 5.10a | <= 15 min on foot
  ('ca_biscuit_and_gravy', 'ca_bunny_slopes', 'trad', '["trad"]'::jsonb), -- Biscuit and Gravy | 5.8 | <= 5 min on foot
  ('ca_black_angel', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Black Angel | 5.11a | <= 5 min on foot
  ('ca_black_diamond_2', 'ca_bunny_slopes', 'trad', '["trad"]'::jsonb), -- Black Diamond | 5.9 | <= 5 min on foot
  ('ca_black_uhuru', 'ca_bunny_slopes', 'trad', '["trad"]'::jsonb), -- Black Uhuru | 5.6 | <= 5 min on foot
  ('ca_blood_donor', 'ca_upper_dinosaur_rock_north_face', 'toprope', '["toprope"]'::jsonb), -- Blood Donor | 5.12b | <= 15 min on foot
  ('ca_bloody_ankles', 'ca_lower_dinosaur_rock_n_face', 'trad', '["trad"]'::jsonb), -- Bloody Ankles | 5.9+ | <= 15 min on foot
  ('ca_boomerproof', 'ca_spring_dome', 'sport', '["sport"]'::jsonb), -- Boomerproof | 5.12a | <= 5 min on foot
  ('ca_brutha_from_anotha_mutha', 'ca_lower_tier_2', 'sport', '["sport"]'::jsonb), -- Brutha From Anotha Mutha | 5.10b | <= 4 min on foot
  ('ca_but_i_don_t_drink_scotch', 'ca_highlands_wall', 'sport', '["sport"]'::jsonb), -- But I Don't Drink Scotch | 5.10a | <= 45 min on foot
  ('ca_buzz_off', 'ca_lower_dinosaur_rock_n_face', 'trad', '["trad"]'::jsonb), -- Buzz Off | 5.9+ | <= 15 min on foot
  ('ca_buzzed_by_ed', 'ca_penstemon_dome_east_face', 'sport', '["sport"]'::jsonb), -- Buzzed by Ed | 5.7+ | <= 45 min on foot
  ('ca_calf_fish', 'ca_crystal_lake_wall', 'sport', '["sport"]'::jsonb), -- Calf Fish | 5.11+ | <= 50 min on foot
  ('ca_canine_arthropods', 'ca_lower_dinosaur_rock_w_face', 'trad', '["trad"]'::jsonb), -- Canine Arthropods | 5.10d | <= 15 min on foot
  ('ca_captain_america', 'ca_penstemon_dome_west_face', 'trad', '["trad"]'::jsonb), -- Captain America | 5.10a | <= 30 min on foot
  ('ca_church_s_fried_chicken_heads', 'ca_rectory_south_face', 'trad', '["trad"]'::jsonb), -- Church's Fried Chicken Heads | 5.6 | <= 30 min on foot
  ('ca_chutzpah', 'ca_rectory_east_face', 'trad', '["trad"]'::jsonb), -- Chutzpah | 5.10a | <= 30 min on foot
  ('ca_claim_jumper_2', 'ca_upper_tier_2', 'sport', '["sport"]'::jsonb), -- Claim Jumper | 5.7 | <= 10 min on foot
  ('ca_cleaning_lady_2', 'ca_spring_wall', 'sport', '["sport"]'::jsonb), -- Cleaning Lady | 5.9 | <= 20 min on foot
  ('ca_cornbread', 'ca_nightmare_tower_west_face', 'sport', '["sport"]'::jsonb), -- Cornbread | 5.10a | <= 5 min on foot
  ('ca_crackasauras_rex', 'ca_upper_dinosaur_rock_north_face', 'trad', '["trad"]'::jsonb), -- Crackasauras Rex | 5.10c | <= 15 min on foot
  ('ca_crimp_city', 'ca_castle_grey_skull', 'toprope', '["toprope"]'::jsonb), -- Crimp City | 5.11b/c | <= 10 min on foot
  ('ca_crooked_neck', 'ca_penstemon_dome_west_face', 'trad', '["trad"]'::jsonb), -- Crooked Neck | 5.8 | <= 30 min on foot
  ('ca_cross_reference', 'ca_stately_pleasure_dome', 'trad', '["trad"]'::jsonb), -- Cross Reference | 5.10d | <= 5 min on foot
  ('ca_crystal_whipped', 'ca_schoolboy_buttress', 'sport', '["sport"]'::jsonb), -- Crystal Whipped | 5.11d | <= 45 min on foot
  ('co_2nd_apron_right_side_dihedral', 'co_aprons_the', 'trad', '["trad"]'::jsonb), -- 2nd Apron, Right Side Dihedral | 5.5 | <= 60 min on foot
  ('co_9_with_some_10_stuff', 'co_bionut_wall', 'trad', '["trad"]'::jsonb), -- 9 With Some 10 Stuff | 5.9+ | <= 5 min on foot
  ('co_a_line', 'co_lincoln_lake_slabs', 'trad', '["trad"]'::jsonb), -- A Line | 5.7+ | <= 5 min on foot
  ('co_aku_aku_2', 'co_easter_island_pinnacle', 'trad', '["trad"]'::jsonb), -- Aku Aku | 5.10 | <= 25 min on foot
  ('co_big_blocky', 'co_bionut_wall', 'trad', '["trad"]'::jsonb), -- Big Blocky | 5.9 | <= 5 min on foot
  ('co_big_blocky_face_variation', 'co_bionut_wall', 'trad', '["trad"]'::jsonb), -- Big Blocky Face variation | 5.10 | <= 5 min on foot
  ('co_big_horns', 'co_lincoln_lake_slabs', 'sport', '["sport"]'::jsonb), -- Big Horns | 5.7 | <= 5 min on foot
  ('co_bless_you', 'co_sakkety_point', 'sport', '["sport"]'::jsonb), -- Bless You | 5.9+ | <= 5 min on foot
  ('co_breath_of_fire', 'co_instant_karma_cliff', 'trad', '["trad"]'::jsonb), -- Breath of Fire | 5.10c | <= 50 min on foot
  ('co_canine', 'co_easter_island', 'trad', '["trad"]'::jsonb), -- Canine | 5.9+ | <= 50 min on foot
  ('co_cleaning_the_coral', 'co_coral_the', 'trad', '["trad"]'::jsonb), -- Cleaning the Coral | 5.7 | <= 30 min on foot
  ('co_columbine_crack', 'co_lincoln_lake_slabs', 'trad', '["trad"]'::jsonb), -- Columbine Crack | 5.10 | <= 5 min on foot
  ('co_dan_hare_s_route', 'co_lincoln_lake_slabs', 'trad', '["trad"]'::jsonb), -- Dan Hare's Route | 5.9 | <= 5 min on foot
  ('co_dislichen_it', 'co_easter_island', 'trad', '["trad"]'::jsonb), -- DisLichen' It | 5.10+ | <= 50 min on foot
  ('co_disposition', 'co_instant_karma_cliff', 'trad', '["trad"]'::jsonb), -- Disposition | 5.9 | <= 50 min on foot
  ('co_easy_flakes_name_unknown', 'co_lincoln_lake_slabs', 'trad', '["trad"]'::jsonb), -- Easy Flakes (name unknown) | 5.5 | <= 5 min on foot
  ('co_emancipation_arete', 'co_lincoln_lake_slabs', 'sport', '["sport"]'::jsonb), -- Emancipation Arete | 5.10 | <= 5 min on foot
  ('co_end_of_the_spear', 'co_sakkety_point', 'sport', '["sport"]'::jsonb), -- End of the Spear | 5.9 | <= 5 min on foot
  ('co_exposure_arete', 'co_easter_island_pinnacle', 'toprope', '["toprope"]'::jsonb), -- Exposure Arete | 5.12+ | <= 25 min on foot
  ('co_fingercicles', 'co_easter_island', 'trad', '["trad"]'::jsonb), -- Fingercicles | 5.10a | <= 50 min on foot
  ('co_goat_yoga', 'co_lincoln_lake_slabs', 'sport', '["sport"]'::jsonb), -- Goat Yoga | 5.9 | <= 5 min on foot
  ('co_golden_slab', 'co_lincoln_lake_slabs', 'trad', '["trad"]'::jsonb), -- Golden Slab | 5.8+ | <= 5 min on foot
  ('co_gotta_have_balls_gotta_have_nuts', 'co_bionut_wall', 'trad', '["trad"]'::jsonb), -- Gotta Have Balls, Gotta Have Nuts | 5.10+ | <= 5 min on foot
  ('id_a_wing_and_a_pereyra', 'id_right_flank_the', 'sport', '["sport"]'::jsonb), -- A Wing And A Pereyra | 5.12b | <= 40 min on foot
  ('id_alternative_fact', 'id_right_flank_the', 'sport', '["sport"]'::jsonb); -- Alternative Fact | 5.11c | <= 40 min on foot

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
  if n_missing > 0 or n_moved_area > 0 then raise exception 'ids or areas changed since the audit (2026-11-18) — re-run classify4.js'; end if;
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

-- Expect 202 (less any rows the guards skipped; the notice above says why).
select discipline, count(*) from routes where id in (select id from _crag_moves) group by discipline order by 1;

commit;
