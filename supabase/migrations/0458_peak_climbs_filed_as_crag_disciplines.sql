-- 0458 — Five PEAK climbs filed under a CRAG discipline get the discipline their own grade says (owner 2026-11-18:
-- "waypoints and things on the map need to be consistent per discipline" -> "do what you recommend based on research").
--
-- audit:map-discipline's CRAG_SUMMIT check found 43 crag climbs drawing a peak Summit pin; 38 were pin types and were
-- retyped (data/research/2026-11-18/map-discipline/batch-crag.json). These 5 were not: the pin is right, the DISCIPLINE
-- is wrong. Each row's own stored grade decides it, under the app's rules (scrambling = class 3-4, never a 5.x;
-- alpine = a roped climb to a summit; check:mountaineering-rule):
--   ny_trap_dike_summer                    trad    -> scrambling  (grade "4th"; the Trap Dike to Mt Colden's summit)
--   ny_cascade_mountain_slide              trad    -> scrambling  (grade "4th"; a slide to Cascade Mountain's summit)
--   ca_castle_dome_4th_class_route         trad    -> scrambling  (grade "4th")
--   ca_mt_baldy_trail_aka_south_ridge_...  toprope -> scrambling  (grade "3rd"; a TRAIL to Mt. Baldy's summit)
--   wa_south_face_of_the_mole              trad    -> alpine      (5.7, 4 pitches, Grade II, crampons early season, to
--                                                                  Edward Peak's summit; its own overview calls it alpine)
-- Their AREAS are still typed crag (Cascade Mountain, Mt Colden and Mount San Antonio are peaks); retyping an area moves
-- every route on it, so that is left for a separate, owner-reviewed change.
--
-- Guards (as 0452 / 0457): assert-then-set — every id must exist, sit in the expected area and still carry the expected
-- OLD discipline, or the whole migration stops; an empty catalog (replay / preview branch) does nothing. A row whose
-- discipline the owner locked (route_field_confidence) or that carries an approved climber edit of discipline /
-- rockStyle is left alone. disciplines: the new primary only (0366's trigger requires it first).
begin;

create temp table _peak_moves (id text primary key, area_id text not null, old_discipline text not null, discipline text not null) on commit drop;
insert into _peak_moves (id, area_id, old_discipline, discipline) values
  ('ny_trap_dike_summer', 'ny_mt_colden', 'trad', 'scrambling'),
  ('ny_cascade_mountain_slide', 'ny_cascade_mountain', 'trad', 'scrambling'),
  ('ca_castle_dome_4th_class_route', 'ca_castle_dome_2', 'trad', 'scrambling'),
  ('ca_mt_baldy_trail_aka_south_ridge_or_bear_flat_trail', 'ca_mount_san_antonio_mt_baldy', 'toprope', 'scrambling'),
  ('wa_south_face_of_the_mole', 'wa_hook_creek_drainage', 'trad', 'alpine');

do $$
declare n_missing int; n_moved_area int; n_changed int;
begin
  select count(*) into n_missing from _peak_moves m where not exists (select 1 from routes r where r.id = m.id);
  if n_missing = (select count(*) from _peak_moves) then raise notice 'no listed route exists here (empty catalog) — nothing to do'; return; end if;
  select count(*) into n_moved_area from _peak_moves m join routes r on r.id = m.id where r.area_id is distinct from m.area_id;
  select count(*) into n_changed from _peak_moves m join routes r on r.id = m.id where r.discipline is distinct from m.old_discipline;
  raise notice 'peak moves: % listed, % missing, % in another area, % no longer the old discipline', (select count(*) from _peak_moves), n_missing, n_moved_area, n_changed;
  if n_missing > 0 or n_moved_area > 0 or n_changed > 0 then raise exception 'rows changed since the 2026-11-18 audit — re-read them before moving'; end if;
end $$;

update routes r
   set discipline = m.discipline,
       disciplines = jsonb_build_array(m.discipline)
  from _peak_moves m
 where r.id = m.id
   and r.area_id = m.area_id
   and r.discipline = m.old_discipline
   and not exists (select 1 from route_field_confidence f where f.route_id = r.id and f.field in ('discipline', 'rockStyle'))
   and not exists (select 1 from contributions c where c.route_id = r.id and c.kind = 'field'
                    and c.field in ('discipline', 'rockStyle') and c.status = 'approved');

-- Expect 4 scrambling + 1 alpine.
select discipline, count(*) from routes where id in (select id from _peak_moves) group by discipline order by 1;

commit;
