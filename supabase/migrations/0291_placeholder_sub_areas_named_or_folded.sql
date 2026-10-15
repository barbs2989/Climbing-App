-- 0291: the source's "New Sub-Area N" placeholders, each named for what it is or folded into where its climbs belong.
--
-- Asked: "do what you recommend" (2026-10-14), after 0288 found Rainbow Mountain filed as a catch-all list plus an
-- unnamed "New Sub-Area 1" while the source now names its boulders. 18 areas carried that placeholder name
-- ("New Sub-Area N" 15, "Sub-Area N" 3); check:generic-area-names now flags it:
--   * Rainbow Mountain (AL): the source's 15 named boulders replace its old unnamed list. 11 boulders created at the
--     source's pins; every climb of the catch-all "Rainbow Mountain Bouldering" and of "New Sub-Area 1" moved onto
--     the boulder the source files it on; three climbs listed twice merged (Rainbow Warior = Rainbow Warrior, Rhino no
--     dyno = Rhyno no Dyno, Unknown v2 = Playground Block's Unknown v2); both lists deleted once empty.
--   * Friction Slab, Indian Creek (UT): each climb filed where the source files it (Friction Slab itself, Unsorted
--     Routes, Y-Crack Simulator Crag, a new Clementine Corner Crag); The Turner Prize Tower and Entrance Exam merged
--     into their Shay Canyon / Unsorted Routes copies; Friction Slab takes the source's pin (it held the corridor's).
--   * Walkers Branch (KY): Meat grinder onto Boulder #4, as the source files it.
--   * Stone Fort (TN): renamed Potato Boulder (its problems' pages: "On the Potato Boulder"); Mantle Particulate, on a
--     small boulder of its own, gets one.
--   * Western Washington University Buildering (WA): joined to the other half of the source's one list.
--   * Hillside (MA), La Bleue (QC), Shirley and the Gang (CA): the source never named them and their problems are
--     scattered around the place, so each takes the catalog's name for such a list ("<Place> Routes/Bouldering").
--   * Shady Corridor (UT): the source's "Sub-Area 1" is the corridor's main list, which we held twice (an older copy
--     plus the 4 routes added since): joined, Unknown Crack to 2-bolt Face merged; Vagination Alcove, filed beside
--     the corridor, nests inside it as the source has it, and its Unknown Hard Slab is the list's. Bowman (CA) and PCT Boulders
--     (CA): one problem each on a wall/boulder of its own, named for that problem as the source names such boulders.
--   * Six more, empty, deleted (seven with Friction Slab's empty "New Sub-Area 2").
-- 7 climbs merged (0 take a grade), 71 moved, 13 areas deleted.
-- No contribution, log, photo, topo, list or report on any climb this deletes.
-- ABORTS if climber data points at a climb deleted, or if the live tree no longer matches the plan.
-- Plan: the job's fold14/ (decide.mjs, extra.json, force-pairs.json); rollback: scripts/data/placeholder-sub-areas-rollback.json.

begin;

create temp table m_merge(keep text not null, drop_id text primary key, grade text, grade_num numeric, disc text) on commit drop;
insert into m_merge values
  ('al_rainbow_warrior_rainbow_warrior', 'al_rainbow_warior', null, null, null),
  ('al_rhyno_wall_rhyno_no_dyno', 'al_rhino_no_dyno', null, null, null),
  ('al_playground_block_unknown_v2', 'al_new_sub_area_1_2_unknown_v2', null, null, null),
  ('ut_shay_canyon_the_turner_prize_tower', 'ut_the_turner_prize_tower', null, null, null),
  ('ut_unsorted_routes_unnamed_5_11_aka_entrance_exam', 'ut_unnamed_5_11_aka_entrance_exam', null, null, null),
  ('ut_unknown_crack_to_2_bolt_face', 'ut_sub_area_1_unknown_crack_to_2_bolt_face', null, null, null),
  ('ut_vagination_alcove_unknown_hard_slab', 'ut_unknown_hard_slab', null, null, null);

create temp table m_route_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
-- (m_route_rename: none in this plan)

create temp table m_move(id text primary key, from_area text not null, to_area text not null, bypass boolean not null) on commit drop;
insert into m_move values
  ('al_a_s_s_another_sit_start', 'al_rainbow_mountain_climbs', 'al_rainbow_warrior', false),
  ('al_amun_s_route', 'al_rainbow_mountain_climbs', 'al_the_dual_slit_boulder', false),
  ('al_bad_start_to_the_day', 'al_rainbow_mountain_climbs', 'al_rhyno_wall', false),
  ('al_covid_cave_19', 'al_rainbow_mountain_climbs', 'al_covid_cave', false),
  ('al_crap_crimp', 'al_rainbow_mountain_climbs', 'al_rainbow_warrior', false),
  ('al_damp_it', 'al_rainbow_mountain_climbs', 'al_weeping_wall', false),
  ('al_doom_fist', 'al_rainbow_mountain_climbs', 'al_rainbow_ride', false),
  ('al_emperor_s_new_groove', 'al_rainbow_mountain_climbs', 'al_emperor_s_roof', false),
  ('al_fumblestep', 'al_rainbow_mountain_climbs', 'al_fumblestep_slab', false),
  ('al_haggard', 'al_rainbow_mountain_climbs', 'al_the_dual_slit_boulder', false),
  ('al_happiness_is_easy', 'al_rainbow_mountain_climbs', 'al_i_m_not_getting_in_that_cave', false),
  ('al_holy_moly', 'al_rainbow_mountain_climbs', 'al_rainbow_warrior', false),
  ('al_i_m_not_getting_in_that_cave', 'al_rainbow_mountain_climbs', 'al_i_m_not_getting_in_that_cave', false),
  ('al_i_think_i_ll_just_stay_here_and_drink', 'al_rainbow_mountain_climbs', 'al_i_m_not_getting_in_that_cave', false),
  ('al_iron_fist', 'al_rainbow_mountain_climbs', 'al_rainbow_ride', false),
  ('al_jimmy_s', 'al_rainbow_mountain_climbs', 'al_fumblestep_slab', false),
  ('al_just_like_that', 'al_rainbow_mountain_climbs', 'al_the_dual_slit_boulder', false),
  ('al_lebron', 'al_rainbow_mountain_climbs', 'al_i_m_not_getting_in_that_cave', false),
  ('al_letters_from_roberto', 'al_rainbow_mountain_climbs', 'al_playground_block', false),
  ('al_m_anton_aka_white_russian', 'al_rainbow_mountain_climbs', 'al_baby_balance_rock', false),
  ('al_mama_tried', 'al_rainbow_mountain_climbs', 'al_rhyno_wall', false),
  ('al_mudslide', 'al_rainbow_mountain_climbs', 'al_baby_balance_rock', false),
  ('al_north_paw', 'al_rainbow_mountain_climbs', 'al_the_paw_boulder', false),
  ('al_ogre_and_out', 'al_rainbow_mountain_climbs', 'al_ogre_wall', false),
  ('al_ogre_it', 'al_rainbow_mountain_climbs', 'al_ogre_wall', false),
  ('al_okie_from_muskogee', 'al_rainbow_mountain_climbs', 'al_the_dual_slit_boulder', false),
  ('al_pelican_compression', 'al_rainbow_mountain_climbs', 'al_i_m_not_getting_in_that_cave', false),
  ('al_pen_island', 'al_rainbow_mountain_climbs', 'al_rainbow_warrior', false),
  ('al_pit_stop', 'al_rainbow_mountain_climbs', 'al_pit_stop', false),
  ('al_rainbow_ride', 'al_rainbow_mountain_climbs', 'al_rainbow_ride', false),
  ('al_rhyno', 'al_rainbow_mountain_climbs', 'al_rhyno_wall', false),
  ('al_santana', 'al_rainbow_mountain_climbs', 'al_fumblestep_slab', false),
  ('al_south_paw', 'al_rainbow_mountain_climbs', 'al_the_paw_boulder', false),
  ('al_stay_weird', 'al_rainbow_mountain_climbs', 'al_covid_cave', false),
  ('al_the_artist', 'al_rainbow_mountain_climbs', 'al_weeping_wall', false),
  ('al_thorn_bush', 'al_rainbow_mountain_climbs', 'al_rhyno_wall', false),
  ('al_three_or_four_men', 'al_rainbow_mountain_climbs', 'al_baby_balance_rock', false),
  ('al_under_and_over', 'al_rainbow_mountain_climbs', 'al_rainbow_warrior', false),
  ('al_wander_over_yonder', 'al_rainbow_mountain_climbs', 'al_rainbow_ride', false),
  ('al_yonder_cling', 'al_rainbow_mountain_climbs', 'al_rainbow_ride', false),
  ('al_new_sub_area_1_2_brocklee_with_cheez', 'al_new_sub_area_1_2', 'al_ogre_wall', false),
  ('al_new_sub_area_1_2_dr_doom_fist', 'al_new_sub_area_1_2', 'al_rainbow_ride', false),
  ('al_new_sub_area_1_2_dual_slit_experiment', 'al_new_sub_area_1_2', 'al_the_dual_slit_boulder', false),
  ('al_new_sub_area_1_2_empressive', 'al_new_sub_area_1_2', 'al_emperor_s_roof', false),
  ('al_new_sub_area_1_2_hitler_s_dick_chode', 'al_new_sub_area_1_2', 'al_the_paw_boulder', false),
  ('al_new_sub_area_1_2_low_pressure', 'al_new_sub_area_1_2', 'al_low_pressure', false),
  ('al_new_sub_area_1_2_muffin_top', 'al_new_sub_area_1_2', 'al_the_dual_slit_boulder', false),
  ('al_new_sub_area_1_2_nancy_pelosi_s_bush', 'al_new_sub_area_1_2', 'al_i_m_not_getting_in_that_cave', false),
  ('al_new_sub_area_1_2_rumpelstiltskin', 'al_new_sub_area_1_2', 'al_the_paw_boulder', false),
  ('al_new_sub_area_1_2_teenage_werewolf', 'al_new_sub_area_1_2', 'al_the_paw_boulder', false),
  ('ut_cloud_dancer', 'ut_new_sub_area_1', 'ut_friction_slab', false),
  ('ut_sundance', 'ut_new_sub_area_1', 'ut_friction_slab', false),
  ('ut_white_waltz', 'ut_new_sub_area_1', 'ut_friction_slab', false),
  ('ut_arch_route', 'ut_new_sub_area_1', 'ut_unsorted_routes', false),
  ('ut_split_pinnacle', 'ut_new_sub_area_1', 'ut_unsorted_routes', false),
  ('ut_the_event_horizon', 'ut_new_sub_area_1', 'ut_unsorted_routes', false),
  ('ut_y_crack_simulator', 'ut_new_sub_area_1', 'ut_y_crack_simulator_crag', false),
  ('ut_clementine_corner', 'ut_new_sub_area_1', 'ut_clementine_corner_crag', false),
  ('ky_meat_grinder', 'ky_new_sub_area_1', 'ky_boulder_4', false),
  ('tn_new_sub_area_1_mantle_particulate', 'tn_new_sub_area_1', 'tn_mantle_particulate_boulder', false),
  ('wa_new_sub_area_1_burden_of_wet_dreams', 'wa_new_sub_area_1', 'wa_western_washington_university_buildering_climbs', false),
  ('wa_new_sub_area_1_crotch_rocket', 'wa_new_sub_area_1', 'wa_western_washington_university_buildering_climbs', false),
  ('wa_new_sub_area_1_fuxley', 'wa_new_sub_area_1', 'wa_western_washington_university_buildering_climbs', false),
  ('wa_new_sub_area_1_mr_chocolate_starfish', 'wa_new_sub_area_1', 'wa_western_washington_university_buildering_climbs', false),
  ('wa_new_sub_area_1_natural_brick_viking_cabbin', 'wa_new_sub_area_1', 'wa_western_washington_university_buildering_climbs', false),
  ('wa_new_sub_area_1_over_the_river_and_through_the_woods', 'wa_new_sub_area_1', 'wa_western_washington_university_buildering_climbs', false),
  ('wa_new_sub_area_1_scan_tron_doobies', 'wa_new_sub_area_1', 'wa_western_washington_university_buildering_climbs', false),
  ('wa_new_sub_area_1_stemming_corner_project', 'wa_new_sub_area_1', 'wa_western_washington_university_buildering_climbs', false),
  ('ut_sub_area_1_beehive_arete', 'ut_sub_area_1', 'ut_shady_corridor_climbs', false),
  ('ut_sub_area_1_start_behind_dead_tree_route', 'ut_sub_area_1', 'ut_shady_corridor_climbs', false),
  ('ut_sub_area_1_unvaginated', 'ut_sub_area_1', 'ut_shady_corridor_climbs', false);

create temp table m_reparent(id text primary key, from_area text not null, to_area text not null) on commit drop;
insert into m_reparent values
  ('ut_vagination_alcove', 'ut_lambs_knoll', 'ut_shady_corridor');

create temp table m_drop_area(id text primary key, into_area text not null, ord int not null) on commit drop;
insert into m_drop_area values
  ('al_rainbow_mountain_climbs', 'al_rainbow_mountain', 0),
  ('al_new_sub_area_1_2', 'al_rainbow_mountain', 1),
  ('ut_new_sub_area_1', 'ut_friction_slab', 2),
  ('ut_new_sub_area_2', 'ut_friction_slab', 3),
  ('ky_new_sub_area_1', 'ky_walkers_branch', 4),
  ('wa_new_sub_area_1', 'wa_western_washington_university_buildering', 5),
  ('ut_sub_area_1', 'ut_shady_corridor', 6),
  ('ca_new_sub_area_1', 'ca_saddle_boulders', 7),
  ('il_new_sub_area_2', 'il_z_bouldering_in_the_canyon_proper', 8),
  ('ma_new_sub_area_2', 'ma_hotel_boulders', 9),
  ('wa_new_sub_area_2', 'wa_clayton_beach', 10),
  ('wa_new_sub_area_2_2', 'wa_midnight_lichen_group', 11),
  ('wa_new_sub_area_2_3', 'wa_briefs_boulders', 12);

create temp table m_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
insert into m_rename values
  ('tn_new_sub_area_1', 'New Sub-Area 1', 'Potato Boulder'),
  ('ma_new_sub_area_1', 'New Sub-Area 1', 'Hillside Bouldering'),
  ('qc_new_sub_area_1', 'New Sub-Area 1', 'La Bleue Bouldering Routes'),
  ('ca_new_sub_area_1_2', 'New Sub-Area 1', 'Shirley and the Gang Routes'),
  ('ca_sub_area_1', 'Sub-Area 1', 'Riding Around and Lichen It Wall'),
  ('ca_sub_area_3', 'Sub-Area 3', 'Eminently Climbable Boulder');

create temp table m_new_area(id text primary key, name text not null, parent_id text not null, final_parent text not null, area_type text, region text, lat double precision, lng double precision) on commit drop;
insert into m_new_area values
  ('al_weeping_wall', 'Weeping wall', 'al_rainbow_mountain', 'al_rainbow_mountain', 'crag', 'Alabama', 34.73286, -86.72855),
  ('al_ogre_wall', 'Ogre wall', 'al_rainbow_mountain', 'al_rainbow_mountain', 'crag', 'Alabama', 34.73269, -86.72824),
  ('al_emperor_s_roof', 'Emperor''s Roof', 'al_rainbow_mountain', 'al_rainbow_mountain', 'crag', 'Alabama', 34.73239, -86.72762),
  ('al_fumblestep_slab', 'Fumblestep slab', 'al_rainbow_mountain', 'al_rainbow_mountain', 'crag', 'Alabama', 34.73233, -86.72769),
  ('al_the_dual_slit_boulder', 'The Dual slit boulder', 'al_rainbow_mountain', 'al_rainbow_mountain', 'crag', 'Alabama', 34.73187, -86.72699),
  ('al_covid_cave', 'Covid Cave', 'al_rainbow_mountain', 'al_rainbow_mountain', 'crag', 'Alabama', 34.73136, -86.72661),
  ('al_the_paw_boulder', 'The Paw boulder', 'al_rainbow_mountain', 'al_rainbow_mountain', 'crag', 'Alabama', 34.73092, -86.72629),
  ('al_baby_balance_rock', 'Baby Balance Rock', 'al_rainbow_mountain', 'al_rainbow_mountain', 'crag', 'Alabama', 34.73116, -86.72647),
  ('al_rainbow_ride', 'Rainbow Ride', 'al_rainbow_mountain', 'al_rainbow_mountain', 'crag', 'Alabama', 34.7351, -86.72523),
  ('al_low_pressure', 'Low Pressure', 'al_rainbow_mountain', 'al_rainbow_mountain', 'crag', 'Alabama', 34.73398, -86.72466),
  ('al_pit_stop', 'Pit Stop', 'al_rainbow_mountain', 'al_rainbow_mountain', 'crag', 'Alabama', 34.73235, -86.72746),
  ('ut_clementine_corner_crag', 'Clementine Corner Crag', 'ut_entrance_corridor', 'ut_entrance_corridor', 'crag', 'Utah', 37.98433, -109.50569),
  ('tn_mantle_particulate_boulder', 'Mantle Particulate Boulder', 'tn_jungle_gym_fromundathunda_area', 'tn_jungle_gym_fromundathunda_area', 'crag', 'Tennessee', null, null);

create temp table m_pin(id text primary key, lat double precision not null, lng double precision not null, approx boolean not null, from_lat double precision, from_lng double precision) on commit drop;
insert into m_pin values
  ('ut_friction_slab', 37.99375, -109.52404, false, 38.0258, -109.54);

create temp table m_lift(id text primary key, from_parent text not null, to_parent text not null) on commit drop;
insert into m_lift values
  ('ut_new_sub_area_1', 'ut_friction_slab', 'ut_entrance_corridor'),
  ('ut_new_sub_area_2', 'ut_friction_slab', 'ut_entrance_corridor');

create temp table m_retype(id text primary key, from_type text not null, to_type text not null) on commit drop;
insert into m_retype values
  ('ut_friction_slab', 'region', 'crag');

create temp table m_junk(id text primary key, area_id text not null, name text not null) on commit drop;
-- (m_junk: none in this plan)

-- every ancestor of every touched area, read BEFORE anything moves (old and new ancestors both)
create temp table m_recount on commit drop as
  select distinct a.id from areas a join areas t on a.path @> t.path
   where t.id in ('al_rainbow_mountain_climbs', 'al_rainbow_mountain', 'al_new_sub_area_1_2', 'ut_new_sub_area_1', 'ut_friction_slab', 'ut_new_sub_area_2', 'ky_new_sub_area_1', 'ky_walkers_branch', 'wa_new_sub_area_1', 'wa_western_washington_university_buildering', 'ut_sub_area_1', 'ut_shady_corridor', 'ca_new_sub_area_1', 'ca_saddle_boulders', 'il_new_sub_area_2', 'il_z_bouldering_in_the_canyon_proper', 'ma_new_sub_area_2', 'ma_hotel_boulders', 'wa_new_sub_area_2', 'wa_clayton_beach', 'wa_new_sub_area_2_2', 'wa_midnight_lichen_group', 'wa_new_sub_area_2_3', 'wa_briefs_boulders', 'ut_lambs_knoll', 'al_rainbow_warrior', 'al_the_dual_slit_boulder', 'al_rhyno_wall', 'al_covid_cave', 'al_weeping_wall', 'al_rainbow_ride', 'al_emperor_s_roof', 'al_fumblestep_slab', 'al_i_m_not_getting_in_that_cave', 'al_playground_block', 'al_baby_balance_rock', 'al_the_paw_boulder', 'al_ogre_wall', 'al_pit_stop', 'al_low_pressure', 'ut_unsorted_routes', 'ut_y_crack_simulator_crag', 'ut_clementine_corner_crag', 'ky_boulder_4', 'tn_new_sub_area_1', 'tn_mantle_particulate_boulder', 'wa_western_washington_university_buildering_climbs', 'ut_shady_corridor_climbs', 'ut_shay_canyon', 'ut_vagination_alcove');

do $$ declare n int; begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog: nothing to fold.
  select count(*) into n from areas where id in (select id from m_drop_area);
  if n = 0 then raise notice '0291: no catalog, nothing to fold'; return; end if;
  if n <> 13 then raise exception '0291: expected 13 copy areas, found %', n; end if;
  -- the tree must still be the one the plan read
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.from_area;
  if n <> 71 then raise exception '0291: % of 71 climbs are where the plan found them', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep join routes o on o.id = m.drop_id;
  if n <> 7 then raise exception '0291: % of 7 merge pairs still exist', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.from_area;
  if n <> 1 then raise exception '0291: % of 1 sub-areas are where the plan found them', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.from_name;
  if n <> 6 then raise exception '0291: % of 6 renames still carry the planned name', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.from_name;
  if n <> 0 then raise exception '0291: % of 0 climb renames still carry the planned name', n; end if;
  select count(*) into n from areas where id in (select id from m_new_area);
  if n > 0 then raise exception '0291: % of the new areas already exist', n; end if;
  select count(*) into n from m_pin m join areas a on a.id = m.id
   where a.lat is not distinct from m.from_lat and a.lng is not distinct from m.from_lng;
  if n <> 1 then raise exception '0291: % of 1 pins are where the plan read them', n; end if;
  select count(*) into n from m_junk j join routes r on r.id = j.id and r.area_id = j.area_id and r.name = j.name;
  if n <> 0 then raise exception '0291: % of 0 junk rows are where they were read', n; end if;
  select count(*) into n from m_lift l join areas a on a.id = l.id and a.parent_id = l.from_parent where l.id in (select id from m_drop_area);
  if n <> 2 then raise exception '0291: % of 2 placeholders to lift are where the plan read them (and are deleted)', n; end if;
  select count(*) into n from m_retype t join areas a on a.id = t.id and a.area_type = t.from_type;
  if n <> 1 then raise exception '0291: % of 1 areas to retype have the type the plan read', n; end if;
  -- every climb on a copy is accounted for
  select count(*) into n from routes r join m_drop_area d on d.id = r.area_id
   where r.id not in (select id from m_move) and r.id not in (select drop_id from m_merge);
  if n > 0 then raise exception '0291: % climbs on a copy are not in the plan', n; end if;
  select count(*) into n from areas a join m_drop_area d on d.id = a.parent_id
   where a.id not in (select id from m_reparent) and a.id not in (select id from m_drop_area);
  if n > 0 then raise exception '0291: % sub-areas of a copy are not in the plan', n; end if;
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
  if n > 0 then raise exception '0291: % climber rows point at a row this deletes — stop and repoint them', n; end if;
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
  if n > 0 then raise exception '0291: % climber rows still point at a copy', n; end if;
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

update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in (select id from m_recount);

do $$ declare n int; begin
  -- the empty preview database: nothing was there to fold
  if not exists (select 1 from routes where id in (select keep from m_merge)) then return; end if;
  select count(*) into n from areas where id in (select id from m_drop_area);
  if n > 0 then raise exception '0291: % copy areas were not emptied', n; end if;
  select count(*) into n from routes where id in (select drop_id from m_merge union select id from m_junk);
  if n > 0 then raise exception '0291: % merged or junk climbs survived', n; end if;
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.to_area;
  if n <> 71 then raise exception '0291: % of 71 climbs moved', n; end if;
  select count(*) into n from m_rename m join areas a on a.id = m.id and a.name = m.to_name;
  if n <> 6 then raise exception '0291: % of 6 renames landed', n; end if;
  select count(*) into n from m_new_area m join areas a on a.id = m.id and a.parent_id = m.final_parent and a.route_count > 0;
  if n <> 13 then raise exception '0291: % of 13 new areas are in place, holding their climbs', n; end if;
  select count(*) into n from m_reparent m join areas a on a.id = m.id and a.parent_id = m.to_area;
  if n <> 1 then raise exception '0291: % of 1 sub-areas re-parented', n; end if;
  select count(*) into n from m_route_rename m join routes r on r.id = m.id and r.name = m.to_name;
  if n <> 0 then raise exception '0291: % of 0 climb renames landed', n; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep where m.grade is not null and (k.grade <> m.grade or k.grade_num is distinct from m.grade_num);
  if n > 0 then raise exception '0291: % merged grades or grade_nums did not land', n; end if;
  select count(*) into n from m_pin m join areas a on a.id = m.id and a.lat = m.lat and a.lng = m.lng and a.coords_approx = m.approx;
  if n <> 1 then raise exception '0291: % of 1 pins landed', n; end if;
  select count(*) into n from m_retype t join areas a on a.id = t.id and a.area_type = t.to_type;
  if n <> 1 then raise exception '0291: % of 1 retypes landed', n; end if;
  -- no area holds climbs AND sub-areas
  select count(*) into n from areas a where a.id in (select id from m_recount)
     and exists (select 1 from routes r where r.area_id = a.id) and exists (select 1 from areas s where s.parent_id = a.id);
  if n > 0 then raise exception '0291: % areas hold climbs and sub-areas', n; end if;
end $$;

commit;
