-- Mount Bachelor and White Mountain Peak — the last gap in the Cascade Volcanoes list and the
-- last in California 14ers. Takes Cascades to 18 of 18 and CA 14ers to 12 of 12.
--
-- THESE TWO WERE DELIBERATELY HELD BACK FROM 0138, AND THE RESERVATION IS RECORDED RATHER THAN
-- DROPPED, because it is about the ROUTE NAME and it does not go away by importing them. For
-- Lassen and McLoughlin the standard route is named by the land manager itself (NPS "Lassen Peak
-- Trail"; USFS "Mt. McLoughlin Trail #3716"). Neither of these two has that:
--
--   Mount Bachelor       No federal source names a route. SummitPost's ROUTE PAGE is titled
--                        "Mt. Bachelor Trail" (its only sibling page is "Ski Area Trail" for the
--                        direct scree/lift-line variation), Armchair Mountaineer calls it "the
--                        Mount Bachelor Trail", local and resort usage is "the Summit Trail", and
--                        AllTrails' /mount-bachelor-trail URL resolves to a trail titled "Summit
--                        East Trail". There is no USFS trail number and no Oregon Hikers Field
--                        Guide entry (checked, 404).
--   White Mountain Peak  SummitPost's OVERVIEW sentence calls the standard "the South Face route
--                        (class 1)", but SummitPost has NO route page by that name — its only two
--                        are "East Side" and "West Ridge", neither of which is the standard — and
--                        every blog using "South Face" reproduces that one sentence near
--                        verbatim. That is single-origin echo, not corroboration. AllTrails calls
--                        it "White Mountain Peak Trail"; everyday usage is "the jeep road from
--                        Barcroft Gate".
--
-- So each takes the name from the strongest PUBLISHED ROUTE PAGE that exists for it, which is the
-- same standard 0138 applied to Lassen (SummitPost's "Lassen Peak Trail (Southeast Ridge)").
-- "South Face" is NOT used for White Mountain Peak: a name with no route page behind it, echoed
-- from a single overview line, is exactly the kind of plausible-looking string this catalog has
-- been burned by. The road/trail framing is what climbers actually describe.
--
-- ELEVATIONS: both had conflicting published figures, and each is resolved by picking the DATUM
-- the rest of the roster already uses rather than the most common number.
--
--   Mount Bachelor       9,068 ft (NAVD88, NGS PID PB0762). Also in circulation: 9,065 (resort /
--                        Harris) and 9,055 (older USGS topo).
--   White Mountain Peak  14,252 ft (NAVD88, NGS PID HR2559). The long-standard 14,246 is NGVD29
--                        and is still what most peakbagging lists print; a third source says
--                        14,261. CA_14ER_PEAKS already stores Whitney as 14,505, which is the
--                        NAVD88 value (the classic figures are 14,494/14,497), so NAVD88 is the
--                        convention here and 14,246 would be the inconsistent choice.
--
-- WHITE MOUNTAIN PEAK GETS ITS OWN RANGE, and that is deliberate. The White Mountains are a GREAT
-- BASIN range, not the Sierra Nevada — this is the only fourteener in the contiguous US outside
-- the Rockies, Cascades and Sierra. Filing it under `ca_sierra_eastside` (the nearest populated
-- region, across the Owens Valley) would be the misparenting `audit:area-parents` exists to find.
-- California's direct children are all `region` rows, so a new region matches the tree's shape.
-- The existing `nv_white_mountains` is filed under Western Nevada and is not this;
-- `ca_white_mountain_west_side_boulder_field` is under Tuolumne bouldering and is unrelated.
--
-- Both routes are Class 1 and well corroborated as such: Bachelor is a trail to the summit (loose
-- volcanic scree in its upper half), White Mountain Peak follows a gated 4WD road nearly to the
-- top and is California's easiest fourteener. `grade_num` stays NULL — a class rating is not on
-- the sortable rock-grade ladder. `path` is set by areas_set_path; `route_count` by a trigger.
--
-- Re-runnable: every statement is ON CONFLICT DO NOTHING.

begin;

-- 1. The White Mountains, as a region under California. Bachelor needs no new container —
--    or_oregon_volcanoes already parents Mt. Hood, Mt. Thielsen and (from 0138) Mt. McLoughlin,
--    and holds 0 direct routes, so it can take another child.
insert into areas (id, name, parent_id, area_type, source) values
  ('ca_white_mountains', 'White Mountains', 'california', 'region', 'peak-lists')
on conflict (id) do nothing;

-- 2. The two peaks.
insert into areas (id, name, parent_id, area_type, elevation_ft, lat, lng, source) values
  ('ca_white_mountain_peak', 'White Mountain Peak', 'ca_white_mountains',  'peak', 14252, 37.6341, -118.2557, 'peak-lists'),
  ('or_mt_bachelor',         'Mt. Bachelor',        'or_oregon_volcanoes', 'peak',  9068, 43.9794, -121.6885, 'peak-lists')
on conflict (id) do nothing;

-- 3. One standard route each. Peak-scoped ids.
insert into routes (id, area_id, name, discipline, grade, grade_system, source) values
  ('ca_white_mountain_peak_trail', 'ca_white_mountain_peak', 'White Mountain Peak Trail', 'scrambling', 'Class 1', 'class', 'peak-lists'),
  ('or_mt_bachelor_trail',         'or_mt_bachelor',         'Mt. Bachelor Trail',        'scrambling', 'Class 1', 'class', 'peak-lists')
on conflict (id) do nothing;

commit;

-- Verify AFTER, as SEPARATE statements:
--
--   select count(*) from areas  where source='peak-lists';   -- expect 3 (1 region + 2 peaks)
--   select count(*) from routes where source='peak-lists';   -- expect 2
--   select id, path from areas where id='ca_white_mountain_peak';
--     -- must be usa.california.ca_white_mountains.ca_white_mountain_peak
--   select id, path from areas where id='or_mt_bachelor';
--     -- must be usa.oregon.or_oregon_volcanoes.or_mt_bachelor
--
-- Then re-run scripts/oneoff/resolve-peak-rosters.mjs: Cascade volcanoes 18/18 and California
-- 14ers 12/12, both holding a route, and lib/lists.js grows CASCADE_VOLCANO_PEAKS 17 -> 18 and
-- CA_14ER_PEAKS 11 -> 12. `npm run check:counts` after, for the route_count caches.
