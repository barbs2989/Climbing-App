-- Eighteen Colorado fourteeners the catalog does not hold, and the four ranges to hang them on.
--
-- WHY THEY ARE MISSING, because it is not an oversight to be swept: Colorado's tree in this
-- catalog is a CRAG tree. It has 40 direct children — Rifle, South Platte, Colorado Springs,
-- Morrison — and not one mountain range. A walk-up fourteener is not a rock-climbing area in the
-- OpenBeta source, so Longs Peak, Mount Elbert, Pikes Peak and Grays Peak have no row at all.
-- The Colorado 14ers tick list could therefore only ever reach 12 of 53.
--
-- ABSENCE WAS PROVEN, NOT ASSUMED. scripts/oneoff/verify-co14-absent.mjs probes every one of the
-- 53 by its distinctive word — loosely, anywhere in a Colorado area name — because the roster
-- matcher is EXACT and exactness is the wrong test for "does this already exist": "Kit Carson
-- Mountain" and "Kit Carson Peak" are one summit. Only the 18 below matched NOTHING. The other
-- 35 are deliberately left alone pending per-peak adjudication, and several are genuine finds
-- rather than duplicates-in-waiting:
--
--     co_mt_belford           exists with 0 routes  -> needs a ROUTE, not an area
--     co_blanca_peak          exists, already on the list
--     co_quandary_peak        exists, already on the list
--     co_el_diente_peak_mount_wilson   a COMBINED area for two separate fourteeners
--     co_crestone / co_crestones_the   ambiguous: which is Crestone Peak, which the Needle?
--
-- A duplicate peak is far worse than a missing one — it splits a mountain's routes across two
-- rows permanently, which is what 0106, 0107 and 0112 each had to repair by hand. So this file
-- creates only what was measured absent.
--
-- DISCIPLINES, and why there is no `hiking` one. Of the 58 Colorado fourteeners only 8 standard
-- routes are Class 1; the rest are Class 2-4. `scrambling` and `mountaineering` are existing
-- filter chips and cover them, while the GRADE carries the exact truth ("Class 1" says trail
-- hike as plainly as a discipline would). Adding a `hiking` discipline would be a much larger
-- change than a chip: CONDITION_SETS has no hiking key and would fall back to the ROCK set,
-- asking hikers about seepage — the same discipline-gate failure as #655. Deliberately not done.
--
--     Class 1-3  -> scrambling          Class 4 -> mountaineering
--
-- Route names and class ratings are the published standard routes; coordinates and ranges are
-- from the fourteener list. `grade_num` is left NULL: it is the sortable rock grade, and a class
-- rating is not on that ladder — inventing a number would misplace these in every grade filter.
-- `path` is set by the areas_set_path trigger, so it is not written here.
--
-- Re-runnable: every statement is ON CONFLICT DO NOTHING, so a partial apply can be re-run.

begin;

-- 1. The four ranges. `region`, holding peaks and no direct routes, which is what
--    trg_areas_leaf_xor requires of a container.
insert into areas (id, name, parent_id, area_type, source) values
  ('co_sawatch_range',  'Sawatch Range',  'colorado', 'region', 'fourteeners'),
  ('co_front_range',    'Front Range',    'colorado', 'region', 'fourteeners'),
  ('co_mosquito_range', 'Mosquito Range', 'colorado', 'region', 'fourteeners'),
  ('co_elk_mountains',  'Elk Mountains',  'colorado', 'region', 'fourteeners')
on conflict (id) do nothing;

-- 2. The peaks. co_san_juans and co_sangre_de_cristo_range already exist and were checked to
--    hold 0 direct routes, so they can take children without tripping the leaf/parent invariant.
insert into areas (id, name, parent_id, area_type, elevation_ft, lat, lng, source) values
  ('co_mount_elbert',      'Mount Elbert',      'co_sawatch_range',           'peak', 14440, 39.1178, -106.4454, 'fourteeners'),
  ('co_mount_harvard',     'Mount Harvard',     'co_sawatch_range',           'peak', 14421, 38.9244, -106.3207, 'fourteeners'),
  ('co_mount_antero',      'Mount Antero',      'co_sawatch_range',           'peak', 14276, 38.6741, -106.2462, 'fourteeners'),
  ('co_mount_shavano',     'Mount Shavano',     'co_sawatch_range',           'peak', 14231, 38.6192, -106.2393, 'fourteeners'),
  ('co_mount_princeton',   'Mount Princeton',   'co_sawatch_range',           'peak', 14204, 38.7492, -106.2424, 'fourteeners'),
  ('co_mount_oxford',      'Mount Oxford',      'co_sawatch_range',           'peak', 14160, 38.9648, -106.3388, 'fourteeners'),
  ('co_mount_columbia',    'Mount Columbia',    'co_sawatch_range',           'peak', 14077, 38.9039, -106.2975, 'fourteeners'),
  ('co_missouri_mountain', 'Missouri Mountain', 'co_sawatch_range',           'peak', 14074, 38.9476, -106.3785, 'fourteeners'),
  ('co_huron_peak',        'Huron Peak',        'co_sawatch_range',           'peak', 14010, 38.9455, -106.4381, 'fourteeners'),
  ('co_torreys_peak',      'Torreys Peak',      'co_front_range',             'peak', 14275, 39.6428, -105.8212, 'fourteeners'),
  ('co_longs_peak',        'Longs Peak',        'co_front_range',             'peak', 14259, 40.2550, -105.6151, 'fourteeners'),
  ('co_pikes_peak',        'Pikes Peak',        'co_front_range',             'peak', 14115, 38.8405, -105.0442, 'fourteeners'),
  ('co_mount_democrat',    'Mount Democrat',    'co_mosquito_range',          'peak', 14155, 39.3396, -106.1400, 'fourteeners'),
  ('co_snowmass_mountain', 'Snowmass Mountain', 'co_elk_mountains',           'peak', 14099, 39.1188, -107.0665, 'fourteeners'),
  ('co_windom_peak',       'Windom Peak',       'co_san_juans',               'peak', 14093, 37.6212, -107.5919, 'fourteeners'),
  ('co_redcloud_peak',     'Redcloud Peak',     'co_san_juans',               'peak', 14041, 37.9410, -107.4219, 'fourteeners'),
  ('co_humboldt_peak',     'Humboldt Peak',     'co_sangre_de_cristo_range',  'peak', 14070, 37.9762, -105.5552, 'fourteeners'),
  ('co_culebra_peak',      'Culebra Peak',      'co_sangre_de_cristo_range',  'peak', 14053, 37.1224, -105.1858, 'fourteeners')
on conflict (id) do nothing;

-- 3. One standard route per peak. Peak-scoped ids (id starts with its area_id), which is the
--    convention only ~9% of the catalog follows and the one that makes a route identifiable —
--    see CLAUDE.md on route identity. `route_count` is maintained by a trigger on this table.
insert into routes (id, area_id, name, discipline, grade, grade_system, source) values
  ('co_mount_elbert_northeast_ridge',        'co_mount_elbert',      'Northeast Ridge',         'scrambling',     'Class 1', 'class', 'fourteeners'),
  ('co_mount_harvard_south_slopes',          'co_mount_harvard',     'South Slopes',            'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_mount_antero_west_slopes',            'co_mount_antero',      'West Slopes',             'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_mount_shavano_east_slopes',           'co_mount_shavano',     'East Slopes',             'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_mount_princeton_east_slopes',         'co_mount_princeton',   'East Slopes',             'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_mount_oxford_via_mount_belford',      'co_mount_oxford',      'Via Mount Belford',       'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_mount_columbia_west_slopes',          'co_mount_columbia',    'West Slopes',             'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_missouri_mountain_northwest_ridge',   'co_missouri_mountain', 'Northwest Ridge',         'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_huron_peak_northwest_slopes',         'co_huron_peak',        'Northwest Slopes',        'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_torreys_peak_south_slopes',           'co_torreys_peak',      'South Slopes',            'scrambling',     'Class 1', 'class', 'fourteeners'),
  ('co_longs_peak_keyhole_route',            'co_longs_peak',        'Keyhole Route',           'scrambling',     'Class 3', 'class', 'fourteeners'),
  ('co_pikes_peak_east_slopes',              'co_pikes_peak',        'East Slopes',             'scrambling',     'Class 1', 'class', 'fourteeners'),
  ('co_mount_democrat_east_slope',           'co_mount_democrat',    'East Slope',              'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_snowmass_mountain_east_slopes',       'co_snowmass_mountain', 'East Slopes',             'scrambling',     'Class 3', 'class', 'fourteeners'),
  ('co_windom_peak_west_ridge',              'co_windom_peak',       'West Ridge',              'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_redcloud_peak_northeast_ridge',       'co_redcloud_peak',     'Northeast Ridge',         'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_humboldt_peak_west_ridge',            'co_humboldt_peak',     'West Ridge',              'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_culebra_peak_northwest_ridge',        'co_culebra_peak',      'Northwest Ridge',         'scrambling',     'Class 2', 'class', 'fourteeners')
on conflict (id) do nothing;

commit;

-- Verify AFTER, as separate statements (a pasted script is ONE transaction, and a failing SELECT
-- rolls back the inserts — that is how 0097's writes were undone):
--
--   select count(*) from areas where source = 'fourteeners';        -- expect 22 (4 ranges + 18 peaks)
--   select count(*) from routes where source = 'fourteeners';       -- expect 18
--   select id, path from areas where id = 'co_mount_elbert';        -- path must be usa.colorado.co_sawatch_range.co_mount_elbert
--   select id, route_count from areas where id = 'co_sawatch_range';-- expect 9, maintained by the trigger
--
-- Then `npm run check:counts` for the catalog-wide cache, and re-run
-- scripts/oneoff/resolve-peak-rosters.mjs — Colorado 14ers should go 12 -> 30.
