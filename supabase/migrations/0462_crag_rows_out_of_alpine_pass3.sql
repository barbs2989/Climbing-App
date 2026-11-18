-- 0462 — Crag rows filed alpine move to trad / sport / top-rope, pass 3 (owner 2026-11-11: "crag for trad is just a
-- short approach"; pass 1 = 0452, pass 2 = 0457). 101 rows: 57 trad, 40 sport, 4 toprope.
-- The Black Wall (Mt Blue Sky, 11 rows) is held back as unsure: snow at its base and over its rappel anchors (overrides3.json).
--
-- These rows were still "unsure" after pass 2. Their 227 areas were researched again for a STATED walk time from other
-- sources (8 lists; data/research/2026-11-14/crag3/p-out-*.json; decisions: research-data/crag-rows-out-of-alpine-pass3-2026-11-18/).
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
  ('ca_beer_gut', 'ca_north_buttress_2', 'trad', '["trad"]'::jsonb), -- Beer Gut | 5.7 | <= 50 min on foot
  ('ca_black_leather', 'ca_north_face_3', 'sport', '["sport"]'::jsonb), -- Black Leather | 5.11a | <= 20 min on foot
  ('ca_dichotomy', 'ca_north_face_3', 'sport', '["sport"]'::jsonb), -- Dichotomy | 5.11b | <= 20 min on foot
  ('ca_dirty_trixters', 'ca_campground_crags', 'trad', '["trad"]'::jsonb), -- Dirty Trixters | 5.12a/b | <= 5 min on foot
  ('ca_dominatrix', 'ca_north_face_3', 'trad', '["trad"]'::jsonb), -- Dominatrix | 5.11b | <= 20 min on foot
  ('ca_double_down', 'ca_north_buttress_2', 'trad', '["trad"]'::jsonb), -- Double Down | 5.7 | <= 50 min on foot
  ('ca_double_ender', 'ca_north_face_3', 'sport', '["sport"]'::jsonb), -- Double Ender | 5.10c | <= 20 min on foot
  ('ca_family_flake', 'ca_north_buttress_2', 'trad', '["trad"]'::jsonb), -- Family Flake | 5.6 | <= 50 min on foot
  ('ca_feather_ruffler', 'ca_north_face_3', 'sport', '["sport"]'::jsonb), -- Feather Ruffler | 5.12a | <= 20 min on foot
  ('ca_garden_party_4', 'ca_north_buttress_2', 'trad', '["trad"]'::jsonb), -- Garden Party | 5.5 | <= 50 min on foot
  ('ca_going_both_ways', 'ca_north_face_3', 'sport', '["sport"]'::jsonb), -- Going Both Ways | 5.11c | <= 20 min on foot
  ('ca_green_machine', 'ca_outlet_wall', 'sport', '["sport"]'::jsonb), -- Green Machine | 5.8 | <= 50 min on foot
  ('ca_hops_n_barley', 'ca_north_buttress_2', 'trad', '["trad"]'::jsonb), -- Hops'n'Barley | 5.6 | <= 50 min on foot
  ('ca_it_s_all_in_the_genes', 'ca_north_face_3', 'trad', '["trad"]'::jsonb), -- It's All in the Genes | 5.9 | <= 20 min on foot
  ('ca_lesbie_friends', 'ca_north_face_3', 'sport', '["sport"]'::jsonb), -- Lesbie Friends | 5.11b | <= 20 min on foot
  ('ca_main_squeeze', 'ca_north_face_3', 'toprope', '["toprope"]'::jsonb), -- Main Squeeze | 5.11c/d | <= 20 min on foot
  ('ca_muscle_fat', 'ca_north_buttress_2', 'trad', '["trad"]'::jsonb), -- Muscle Fat | 5.7 | <= 50 min on foot
  ('ca_on_the_rocks', 'ca_highlands_wall', 'sport', '["sport"]'::jsonb), -- On The Rocks | 5.10c | <= 45 min on foot
  ('ca_party_of_two', 'ca_north_buttress_2', 'trad', '["trad"]'::jsonb), -- Party of Two | 5.5 | <= 50 min on foot
  ('ca_pedestal_center', 'ca_north_buttress_2', 'toprope', '["toprope"]'::jsonb), -- Pedestal Center | 5.8 | <= 50 min on foot
  ('ca_quick_lick', 'ca_north_face_3', 'sport', '["sport"]'::jsonb), -- Quick Lick | 5.11a | <= 20 min on foot
  ('ca_ride_the_lightning_3', 'ca_campground_crags', 'trad', '["trad"]'::jsonb), -- Ride The Lightning | 5.13a | <= 5 min on foot
  ('ca_rust', 'ca_castle_grey_skull', 'toprope', '["toprope"]'::jsonb), -- Rust | 5.7 | <= 10 min on foot
  ('ca_sidewinder_2', 'ca_outlet_wall', 'sport', '["sport"]'::jsonb), -- Sidewinder | 5.7 | <= 50 min on foot
  ('ca_skeletor', 'ca_castle_grey_skull', 'trad', '["trad"]'::jsonb), -- Skeletor | 5.10d | <= 10 min on foot
  ('ca_slab_time', 'ca_north_buttress_2', 'trad', '["trad"]'::jsonb), -- Slab Time | 5.8+ | <= 50 min on foot
  ('ca_slab_time_crack', 'ca_north_buttress_2', 'trad', '["trad"]'::jsonb), -- Slab Time Crack | 5.6 | <= 50 min on foot
  ('ca_small_arch_left_side', 'ca_north_buttress_2', 'toprope', '["toprope"]'::jsonb), -- Small Arch Left Side | 5.9 | <= 50 min on foot
  ('ca_springbank', 'ca_highlands_wall', 'sport', '["sport"]'::jsonb), -- Springbank | 5.10a | <= 45 min on foot
  ('ca_std', 'ca_north_buttress_2', 'trad', '["trad"]'::jsonb), -- STD | 5.7 | <= 50 min on foot
  ('ca_strap_on_tools', 'ca_north_face_3', 'sport', '["sport"]'::jsonb), -- Strap-On Tools | 5.12a | <= 20 min on foot
  ('ca_sugar_shack_2', 'ca_campground_crags', 'trad', '["trad"]'::jsonb), -- Sugar Shack | 5.12c | <= 5 min on foot
  ('ca_t_j_swan', 'ca_t_j_swan_cliff', 'trad', '["trad"]'::jsonb), -- T J Swan | 5.7 | <= 50 min on foot
  ('ca_tumbler_2', 'ca_highlands_wall', 'sport', '["sport"]'::jsonb), -- Tumbler | 5.11a | <= 45 min on foot
  ('ca_two_scoops_3', 'ca_campground_crags', 'trad', '["trad"]'::jsonb), -- Two Scoops | 5.11b | <= 5 min on foot
  ('ca_you_don_t_got_it_till_you_get_it', 'ca_campground_crags', 'trad', '["trad"]'::jsonb), -- You Don't Got It Till You Get It | 5.11+ | <= 5 min on foot
  ('co_just_stand_up', 'co_bionut_wall', 'trad', '["trad"]'::jsonb), -- Just Stand Up | 5.12- | <= 5 min on foot
  ('co_manalive', 'co_main_wall_15', 'sport', '["sport"]'::jsonb), -- Manalive | 5.12a | <= 25 min on foot
  ('co_moai_geddit', 'co_easter_island', 'trad', '["trad"]'::jsonb), -- Moai Geddit | 5.10- | <= 50 min on foot
  ('co_no_gear_left_behind', 'co_bionut_wall', 'trad', '["trad"]'::jsonb), -- No Gear Left Behind | 5.10 | <= 5 min on foot
  ('co_priceless', 'co_main_wall_15', 'sport', '["sport"]'::jsonb), -- Priceless | 5.12b | <= 25 min on foot
  ('co_rick_ross_big_bosch', 'co_bionut_wall', 'sport', '["sport"]'::jsonb), -- Rick Ross Big Bosch | 5.11- | <= 5 min on foot
  ('co_touch_gold', 'co_main_wall_15', 'sport', '["sport"]'::jsonb), -- Touch Gold | 5.12b/c | <= 25 min on foot
  ('co_trad_route_2', 'co_bionut_wall', 'trad', '["trad"]'::jsonb), -- Trad Route | 5.10 | <= 5 min on foot
  ('co_tremendous_trifles', 'co_main_wall_15', 'sport', '["sport"]'::jsonb), -- Tremendous Trifles | 5.12c | <= 25 min on foot
  ('co_unknown_sporty_climb', 'co_instant_karma_cliff', 'trad', '["trad"]'::jsonb), -- Unknown Sporty Climb | 5.10+ | <= 50 min on foot
  ('co_wind_machine_2', 'co_main_wall_15', 'trad', '["trad"]'::jsonb), -- Wind Machine | 5.12a/b | <= 25 min on foot
  ('id_ch3', 'id_right_flank_the', 'trad', '["trad"]'::jsonb), -- CH3 | 5.11 | <= 40 min on foot
  ('id_chert_highway', 'id_right_flank_the', 'trad', '["trad"]'::jsonb), -- Chert Highway | 5.11a | <= 40 min on foot
  ('id_hammerhead', 'id_right_flank_the', 'trad', '["trad"]'::jsonb), -- Hammerhead | 5.12b | <= 40 min on foot
  ('id_harmy_route_1', 'id_right_flank_the', 'trad', '["trad"]'::jsonb), -- Harmy Route 1 | 5.11 | <= 40 min on foot
  ('id_harmy_route_2', 'id_right_flank_the', 'trad', '["trad"]'::jsonb), -- Harmy Route 2 | 5.11 | <= 40 min on foot
  ('id_jw_10d', 'id_right_flank_the', 'trad', '["trad"]'::jsonb), -- JW 10d | 5.10d | <= 40 min on foot
  ('id_jw_12b', 'id_right_flank_the', 'trad', '["trad"]'::jsonb), -- JW 12b | 5.12b | <= 40 min on foot
  ('id_jw_other', 'id_right_flank_the', 'trad', '["trad"]'::jsonb), -- JW Other | 5.10d | <= 40 min on foot
  ('id_jw_route', 'id_main_wall_the', 'trad', '["trad"]'::jsonb), -- JW route | 5.11 | <= 40 min on foot
  ('id_layback_line', 'id_main_wall_the', 'trad', '["trad"]'::jsonb), -- Layback Line | 5.12a/b | <= 40 min on foot
  ('id_luddite', 'id_right_flank_the', 'sport', '["sport"]'::jsonb), -- Luddite | 5.12b | <= 40 min on foot
  ('id_middlemiss', 'id_right_flank_the', 'trad', '["trad"]'::jsonb), -- Middlemiss | 5.12 | <= 40 min on foot
  ('id_mr_b_meson', 'id_right_flank_the', 'trad', '["trad"]'::jsonb), -- Mr. B Meson | 5.12a | <= 40 min on foot
  ('id_no_chert_no_chews_no', 'id_right_flank_the', 'sport', '["sport"]'::jsonb), -- No Chert, No Chews, No... | 5.12a | <= 40 min on foot
  ('id_pereyra_wheel', 'id_main_wall_the', 'trad', '["trad"]'::jsonb), -- Pereyra Wheel | 5.10c | <= 40 min on foot
  ('id_rte_4', 'id_lower_tier', 'trad', '["trad"]'::jsonb), -- Rte 4 | 5.11a | <= 40 min on foot
  ('id_the_chert_off_my_back', 'id_lower_tier', 'sport', '["sport"]'::jsonb), -- The Chert Off My Back | 5.12d | <= 40 min on foot
  ('id_the_eleven_plus_exam', 'id_main_wall_the', 'trad', '["trad"]'::jsonb), -- The Eleven Plus Exam | 5.12a | <= 40 min on foot
  ('id_the_prince_of_jerks', 'id_lower_tier', 'sport', '["sport"]'::jsonb), -- The Prince Of Jerks | 5.11d | <= 40 min on foot
  ('id_world_line', 'id_main_wall_the', 'trad', '["trad"]'::jsonb), -- World Line | 5.12b | <= 40 min on foot
  ('mt_left_climb', 'mt_canadian_roadcut', 'sport', '["sport"]'::jsonb), -- Left Climb | 5.10b/c | hand-read approach
  ('mt_middle_climb', 'mt_canadian_roadcut', 'sport', '["sport"]'::jsonb), -- Middle Climb | 5.8 | hand-read approach
  ('mt_put_me_on_a_pedestal', 'mt_smash_n_grab_slab_the', 'trad', '["trad"]'::jsonb), -- Put Me on a Pedestal | 5.7 | <= 15 min on foot
  ('mt_right_climb', 'mt_canadian_roadcut', 'sport', '["sport"]'::jsonb), -- Right Climb | 5.10a | hand-read approach
  ('mt_rocco_and_cody_s', 'mt_canadian_roadcut', 'trad', '["trad"]'::jsonb), -- Rocco and Cody's | 5.9 | hand-read approach
  ('nh_condescending_mid_climb_variation', 'nh_slabs', 'trad', '["trad"]'::jsonb), -- Condescending  (Mid-Climb Variation) | 5.9+ | <= 40 min on foot
  ('nh_consolation_prize', 'nh_slabs', 'trad', '["trad"]'::jsonb), -- Consolation Prize | 5.8 | <= 40 min on foot
  ('nh_falling_aspirations', 'nh_slabs', 'trad', '["trad"]'::jsonb), -- Falling Aspirations | 5.9- | <= 40 min on foot
  ('nh_lima_bean', 'nh_slabs', 'trad', '["trad"]'::jsonb), -- Lima Bean | 5.8 | <= 40 min on foot
  ('nh_micron', 'nh_slabs', 'trad', '["trad"]'::jsonb), -- Micron | 5.9- | <= 40 min on foot
  ('nh_odyssey_of_an_artichoke', 'nh_slabs', 'trad', '["trad"]'::jsonb), -- Odyssey of an Artichoke | 5.10 | <= 40 min on foot
  ('nh_slip_o_fools', 'nh_slabs', 'trad', '["trad"]'::jsonb), -- Slip o' Fools | 5.10a | <= 40 min on foot
  ('nh_snooky', 'nh_slabs', 'trad', '["trad"]'::jsonb), -- Snooky | 5.8 | <= 40 min on foot
  ('nh_the_indented_slab_a_mid_cliff_slab', 'nh_slabs', 'trad', '["trad"]'::jsonb), -- The Indented Slab (a "Mid-Cliff" Slab) | 5.9 | <= 40 min on foot
  ('nh_the_late_show', 'nh_01_main_wall', 'trad', '["trad"]'::jsonb), -- The Late Show | 5.11a | <= 50 min on foot
  ('nh_the_wag', 'nh_slabs', 'trad', '["trad"]'::jsonb), -- The Wag | 5.7+ | <= 40 min on foot
  ('nh_w_nderbub', 'nh_01_main_wall', 'sport', '["sport"]'::jsonb), -- Wünderbub | 5.12a | <= 50 min on foot
  ('nh_weissners_butress', 'nh_slabs', 'trad', '["trad"]'::jsonb), -- Weissners Butress | 5.6 | <= 40 min on foot
  ('nh_weissners_dike', 'nh_slabs', 'trad', '["trad"]'::jsonb), -- Weissners Dike | 5.6 | <= 40 min on foot
  ('ut_the_rise_of_punk', 'ut_melting_mud_west', 'sport', '["sport"]'::jsonb), -- The Rise of Punk | 5.10c/d | <= 5 min on foot
  ('ut_total_chaos', 'ut_melting_mud_west', 'sport', '["sport"]'::jsonb), -- Total Chaos | 5.11a | <= 5 min on foot
  ('ut_whiskey_weekend_jugs_of_joy', 'ut_melting_mud_west', 'sport', '["sport"]'::jsonb), -- Whiskey Weekend Jugs of Joy | 5.11a | <= 5 min on foot
  ('ut_wovoka', 'ut_melting_mud_west', 'sport', '["sport"]'::jsonb), -- Wovoka | 5.10c | <= 5 min on foot
  ('wy_8_hour_bliss', 'wy_horse_creek_slabs', 'trad', '["trad","toprope"]'::jsonb), -- 8 Hour Bliss | 5.7 | <= 3 min on foot
  ('wy_barely_there', 'wy_horse_creek_slabs', 'sport', '["sport"]'::jsonb), -- Barely There | 5.9 | <= 3 min on foot
  ('wy_bitch_with_a_broomstick', 'wy_island_the_climbs', 'sport', '["sport"]'::jsonb), -- Bitch With A Broomstick | 5.8 | <= 1 min on foot
  ('wy_misfire', 'wy_horse_creek_slabs', 'sport', '["sport"]'::jsonb), -- Misfire | 5.10b/c | <= 3 min on foot
  ('wy_pea_green_limosine', 'wy_island_the_climbs', 'sport', '["sport"]'::jsonb), -- Pea Green Limosine | 5.10c | <= 1 min on foot
  ('wy_runnin_on_empty', 'wy_horse_creek_slabs', 'sport', '["sport"]'::jsonb), -- Runnin' on Empty | 5.7 | <= 3 min on foot
  ('wy_slim_pickin_s', 'wy_horse_creek_slabs', 'sport', '["sport"]'::jsonb), -- Slim Pickin's | 5.10b | <= 3 min on foot
  ('wy_the_relic', 'wy_roadside_cave', 'sport', '["sport"]'::jsonb), -- The Relic | 5.13b | <= 5 min on foot
  ('wy_the_waterhole', 'wy_horse_creek_slabs', 'sport', '["sport"]'::jsonb), -- The Waterhole | 5.10b | <= 3 min on foot
  ('wy_the_watering_hole', 'wy_horse_creek_slabs', 'sport', '["sport"]'::jsonb), -- The Watering Hole | 5.10b | <= 3 min on foot
  ('wy_time_traveller', 'wy_roadside_cave', 'sport', '["sport"]'::jsonb); -- Time Traveller | 5.12d | <= 5 min on foot

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
  if n_missing > 0 or n_moved_area > 0 then raise exception 'ids or areas changed since the audit (2026-11-18) — re-run classify3.js'; end if;
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

-- Expect 101 (less any rows the guards skipped; the notice above says why).
select discipline, count(*) from routes where id in (select id from _crag_moves) group by discipline order by 1;

commit;
