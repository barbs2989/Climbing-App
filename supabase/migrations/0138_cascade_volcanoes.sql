-- Three Cascade volcanoes the Cascade Volcanoes tick list advertises and the catalog cannot fill.
-- Takes that list from 14 usable objectives to 17 of 18.
--
-- ONE OF THE THREE NEEDS NO AREA, and that is the interesting part. `or_middle_sister` ALREADY
-- EXISTS — a crag under or_three_sisters_wilderness carrying ZERO routes. The roster resolver
-- counts an area with no route as unusable, correctly: a peak you cannot tick is a name with
-- nothing behind it. So Middle Sister needs a ROUTE, not a peak, and creating a second area for
-- it would have split one mountain across two rows permanently — the 0106/0107/0112 repair.
-- The same shape is already known for co_mt_belford.
--
-- ROUTE NAMES ARE SOURCED, NOT DESCRIBED. Every name below is what a land manager, club or
-- guidebook actually calls the route, because a plausible-sounding invented route name on a real
-- mountain is indistinguishable from a real one and this catalog has paid for that before:
--
--   Lassen Peak Trail            the NPS's own name; SummitPost titles its route page
--                                "Lassen Peak Trail (Southeast Ridge)".
--   Mt. McLoughlin Trail #3716   the official USFS trail name AND number (Rogue River-Siskiyou
--                                NF); it is the only trail to the summit.
--   North Ridge (Hayden Glacier) named this way by Mazamas (activity 214), The Mountaineers,
--                                Timberline Mountain Guides and Jeff Thomas's Oregon High. Both
--                                halves are load-bearing: a separate North Ridge via Renfrew
--                                Glacier exists on the west side, so the ridge name alone does
--                                not identify the approach.
--
-- TWO PEAKS ARE DELIBERATELY ABSENT, and the reason is the same rule read the other way:
--
--   Mount Bachelor      NO authoritative route name. SummitPost says "Mt. Bachelor Trail", local
--                       and resort usage "Summit Trail", AllTrails resolves to "Summit East
--                       Trail", there is no USFS trail number and no Oregon Hikers entry. Its
--                       elevation also conflicts three ways (9,068 / 9,065 / 9,055). Do NOT mint
--                       "North East Ridge" from the fact the trail follows that ridge.
--   White Mountain Peak (a CA 14er, not a volcano) — the popular "South Face" is a single
--                       SummitPost OVERVIEW sentence echoed verbatim by every blog, with no
--                       route page behind it, and 14,246/14,252 is a real datum conflict.
--
-- GRADES follow the catalog's own conventions, read from neighbouring rows rather than invented:
-- the trail walk-ups take Class 1/2 with grade_system 'class' (as 0137's fourteeners do), and the
-- glacier route takes 'Grade II Snow'/'class', exactly matching wa_mount_baker_boulder_park_cleaver.
-- Middle Sister is `mountaineering` because it crosses the Hayden Glacier and needs axe, crampons
-- and rope; its Three Sisters neighbours are `alpine` because they are 3rd/4th-class rock, not
-- glacier routes — so this follows the rule rather than the nearest row.
--
-- NO YDS CLASS IS INVENTED for Middle Sister: no source publishes one. McLoughlin's Class 2 IS
-- inferred, from USFS/SummitPost/Mountaineers terrain language ("steep slopes, poor footing,
-- coarse bare rock", listed by The Mountaineers as an Alpine Scramble) rather than stated as a
-- number by anyone. Class 1 would be wrong; that is the claim being made.
--
-- `grade_num` stays NULL — it is the sortable ROCK grade and a class rating is not on that
-- ladder. `path` is set by the areas_set_path trigger. `route_count` by a trigger on routes.
--
-- Coordinates are written at 4 dp (~11 m), which is the real precision available: Lassen's
-- published figure is arcsecond-rounded, so 5 dp would dress up ~25 m of uncertainty.
--
-- Re-runnable: every statement is ON CONFLICT DO NOTHING.

begin;

-- 1. The two peaks that have no area. Filed beside their existing siblings:
--    or_oregon_volcanoes already parents or_mt_hood and or_mt_thielsen, and
--    ca_lassen_national_park is a region holding 0 direct routes, so both can take children
--    without tripping trg_areas_leaf_xor.
insert into areas (id, name, parent_id, area_type, elevation_ft, lat, lng, source) values
  ('ca_lassen_peak',   'Lassen Peak',    'ca_lassen_national_park', 'peak', 10457, 40.4881, -121.5050, 'cascade-volcanoes'),
  ('or_mt_mcloughlin', 'Mt. McLoughlin', 'or_oregon_volcanoes',     'peak',  9493, 42.4445, -122.3156, 'cascade-volcanoes')
on conflict (id) do nothing;

-- 2. One standard route each, including the one whose area already existed. Peak-scoped ids.
insert into routes (id, area_id, name, discipline, grade, grade_system, source) values
  ('ca_lassen_peak_trail',                        'ca_lassen_peak',   'Lassen Peak Trail',           'scrambling',     'Class 1',       'class', 'cascade-volcanoes'),
  ('or_mt_mcloughlin_trail_3716',                 'or_mt_mcloughlin', 'Mt. McLoughlin Trail #3716',  'scrambling',     'Class 2',       'class', 'cascade-volcanoes'),
  ('or_middle_sister_north_ridge_hayden_glacier', 'or_middle_sister', 'North Ridge (Hayden Glacier)','mountaineering', 'Grade II Snow', 'class', 'cascade-volcanoes')
on conflict (id) do nothing;

commit;

-- Verify AFTER, as SEPARATE statements — a failing SELECT inside the transaction would roll the
-- inserts back, which is how 0097's writes were undone:
--
--   select count(*) from areas  where source='cascade-volcanoes';  -- expect 2
--   select count(*) from routes where source='cascade-volcanoes';  -- expect 3
--   select id, path from areas where id='ca_lassen_peak';          -- must sit under ca_lassen_national_park
--   select route_count from areas where id='or_middle_sister';     -- expect 1, was 0
--
-- Then re-run scripts/oneoff/resolve-peak-rosters.mjs: Cascade volcanoes should read
-- "17/18 resolve, 17 hold a route", and lib/lists.js CASCADE_VOLCANO_PEAKS grows 14 -> 17.
--
-- SEPARATELY, NOT FIXED HERE — the Three Sisters coordinates look wrong and want a human eye.
-- Stored today: or_middle_sister 44.1664/-121.7727, or_north_sister 44.1486/-121.7839,
-- or_south_sister 44.1023/-121.7714. GNIS feature 1146183 puts MIDDLE Sister at 44.1485/-121.7841
-- — essentially the value this catalog stores for NORTH Sister — and North Sister's true summit
-- is nearer 44.166. So Middle and North look transposed. That is a pre-existing defect about a
-- different column and it does not affect a route row keyed on (area_id, name), so it is reported
-- rather than swept into a migration whose subject is something else.
