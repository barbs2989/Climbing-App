-- Merge the two Baring area rows into one mountain.
--
-- Before:
--   Skykomish Valley
--   ├── wa_mount_baring     "Mount Baring"     region, no elevation, no blurb
--   │   ├── wa_dolomite_tower   crag, 2 routes (Vanishing Point, Deep Blue)
--   │   └── wa_main_peak_3      "Main Peak"    crag, 0 routes  <- empty
--   └── wa_baring_mountain  "Baring Mountain"  peak, 6127 ft, blurb, 5 routes
--
-- Both rows sit at the same coordinates (47.7793 / -121.4359) and describe the same
-- mountain. `wa_baring_mountain` is the real row: typed `peak`, carries the elevation
-- and the blurb. It should own both crags.
--
-- The obvious one-liner — reparent Dolomite Tower under the peak — fails the
-- `areas_leaf_xor` trigger, because the peak holds five routes of its own and an area
-- is leaf XOR parent. The empty `wa_main_peak_3` crag is the home those routes need.
--
-- After:
--   Skykomish Valley
--   └── wa_baring_mountain  "Baring Mountain"  peak, 6127 ft, blurb
--       ├── wa_dolomite_tower   crag, 2 routes
--       └── wa_main_peak_3      "Main Peak"    crag, 5 routes
--
-- ORDER MATTERS — each step clears the trigger that would block the next:
--   1 empties the peak so `areas_leaf_xor` will accept children in 2 and 3;
--   `trg_routes_require_leaf` already passes in 1 because Main Peak has no sub-areas.
-- Do NOT set `path` by hand: `trg_areas_set_path` fires on UPDATE of parent_id and
-- recomputes it. Both crags are leaves, so no descendant cascade is needed.
-- `route_count` is maintained by `routes_bump_counts` on the area and all ancestors.

BEGIN;

-- 1. Move Baring Mountain's own five routes into the empty Main Peak crag.
UPDATE routes
   SET area_id = 'wa_main_peak_3'
 WHERE area_id = 'wa_baring_mountain';
-- expect: UPDATE 5

-- 2. Re-home Main Peak under the real peak row.
UPDATE areas
   SET parent_id = 'wa_baring_mountain'
 WHERE id = 'wa_main_peak_3';
-- expect: UPDATE 1

-- 3. Re-home Dolomite Tower under the real peak row.
UPDATE areas
   SET parent_id = 'wa_baring_mountain'
 WHERE id = 'wa_dolomite_tower';
-- expect: UPDATE 1

-- 4. The duplicate region row is now childless and routeless. Remove it.
DELETE FROM areas
 WHERE id = 'wa_mount_baring'
   AND NOT EXISTS (SELECT 1 FROM areas  WHERE parent_id = 'wa_mount_baring')
   AND NOT EXISTS (SELECT 1 FROM routes WHERE area_id  = 'wa_mount_baring');
-- expect: DELETE 1  — if this reports DELETE 0, something above did not apply:
--         ROLLBACK and investigate rather than committing a half-merge.

COMMIT;

-- Verify after committing (expect: one Baring row, two child crags, 5 + 2 routes,
-- and paths rebuilt under wa_baring_mountain):
--
--   SELECT id, name, area_type, parent_id, route_count, path::text
--     FROM areas
--    WHERE id IN ('wa_baring_mountain','wa_dolomite_tower','wa_main_peak_3','wa_mount_baring')
--    ORDER BY path;
