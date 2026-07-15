-- Data repair: WA peak/wilderness hierarchy had several duplicate and misplaced
-- nodes, found via a full audit of the 390-peak WA alpine tree (scoped to
-- peaks + their region/range/wilderness ancestors only — rock-climbing crags
-- were left untouched).
--
-- Root cause: a prior partial hierarchy audit created "group"/"range" bucket
-- areas (Monte Cristo Group, Chilliwack Range) intended to hold clusters of
-- peaks, but never reparented the actual peaks into them — so the buckets sat
-- empty while their peaks remained flat children of the wrong ancestor. A
-- separate wilderness area (Pasayten) was also split across two area rows
-- under two different parent branches. This migration reparents the affected
-- peaks and merges/removes the now-empty duplicate.
--
-- IMPORTANT: route_count is a denormalized aggregate maintained by a trigger
-- on the ROUTES table (see 0001_areas_routes.sql) — it does NOT recompute
-- when an AREA's parent_id changes. Every reparent below is followed by a
-- bulk recount over the whole WA subtree, the same fix pattern used in
-- 0017_recount_wa.sql.

-- ── 1. Monte Cristo Group: move it out of Glacier Peak Wilderness (the real
--      Monte Cristo Seven peaks are in Henry M. Jackson Wilderness, not
--      Glacier Peak Wilderness) and populate it with its actual peaks, which
--      were sitting as flat children of "Darrington and Mountain Loop Hwy".
--      wa_monte_cristo (the separate Mossy Loaf rock-climbing crag/townsite
--      area) is untouched.
update areas set parent_id = 'wa_glacier_peak_region' where id = 'wa_monte_cristo_group';
update areas set parent_id = 'wa_monte_cristo_group' where id in (
  'wa_cadet_peak', 'wa_columbia_peak', 'wa_del_campo_peak',
  'wa_foggy_peak', 'wa_kyes_peak', 'wa_monte_cristo_peak'
);

-- ── 2. Chilliwack Range: same pattern — populate the empty bucket with its
--      peaks, currently flat children of Picket Range. Geographically
--      distinct cluster (confirmed by lat/lng: 48.93-49.0 vs the Picket
--      Range core at 48.70-48.86).
update areas set parent_id = 'wa_chilliwack_range' where id in (
  'wa_mount_rahm', 'wa_mount_custer', 'wa_mount_spickard', 'wa_mount_redoubt',
  'wa_northwest_mox_peak', 'wa_southeast_mox_peak', 'wa_bear_mountain_chilliwack'
);

-- ── 3. Pasayten Wilderness was split into two peak-bearing area rows under
--      two different parents. Merge wa_pasayten_wilderness_region into the
--      canonical wa_pasayten. (A third "Pasayten Wilderness" row,
--      wa_pasayten_wilderness, holds only rock-climbing crags and is
--      intentionally left alone.)
--      wa_pasayten_wilderness_region is now empty (0 routes, 0 children) but
--      deliberately NOT deleted here — left for a separate explicit decision
--      since it's the one step in this fix that removes an area row rather
--      than just reparenting one.
update areas set parent_id = 'wa_pasayten' where id = 'wa_blizzard_peak';

-- ── 4. Castle Peak (Pasayten) was misfiled under Picket Range — 25+ miles
--      away geographically; it belongs in Pasayten Wilderness (confirmed by
--      lat/lng and its own id).
update areas set parent_id = 'wa_pasayten' where id = 'wa_castle_peak_pasayten';

-- ── 5. Tatoosh Range: same empty-bucket-vs-flat-peaks pattern. Its peaks
--      (confirmed by lat/lng clustering tightly with the range's existing
--      crag children) were flat children of Southwest Cascades.
update areas set parent_id = 'wa_tatoosh_range' where id in (
  'wa_castle_peak_tatoosh', 'wa_pinnacle_peak_tatoosh', 'wa_plummer_peak',
  'wa_lane_peak', 'wa_unicorn_peak'
);

-- ── 6. Recompute route_count for the whole WA subtree (+ usa rollup), since
--      none of the reparents above touched the routes table.
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where path <@ (select path from areas where id = 'usa');

-- Verify afterward:
--   select id, route_count from areas where id in
--     ('wa_monte_cristo_group','wa_chilliwack_range','wa_pasayten','wa_tatoosh_range',
--      'wa_glacier_peak_wilderness','wa_picket_range','wa_southwest_cascades','washington','usa');
--   select id, parent_id from areas where id = 'wa_pasayten_wilderness_region'; -- expect 0 rows
