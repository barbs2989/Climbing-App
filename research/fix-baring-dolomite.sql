-- Baring / Dolomite Tower: the last crag-copy duplicate.
--
-- "Vanishing Point" (Grade V 5.12b, ~20 pitches) exists twice: the real row on
-- wa_dolomite_tower — the tower is the route's correct home — and a thinner
-- peak-scoped copy on wa_baring_mountain. Note the direction is REVERSED versus
-- the other pairs in this cleanup: here the short id is the survivor and the
-- peak-scoped id is the misfile.
--
-- The content merge already ran (14 fields, verified landed with an
-- order-insensitive comparison — jsonb does not preserve key order, so a plain
-- byte-compare reports false mismatches on jsonb columns). A loss audit against
-- research/crag-merges/baring-pre-merge.json shows 0 fields where the copy has
-- content and the survivor is blank, so the copy owes the survivor nothing.
--
-- Validate before pasting:  npm run check:sql -- research/fix-baring-dolomite.sql
-- Passes clean — the checker recognises the cross-area EXISTS guard below and
-- reports it as INFO rather than the "only copy on its peak" failure, because the
-- guard makes the statement a no-op if the twin has gone at run time.

begin;

-- Delete the peak-scoped copy, guarded on the survivor existing on the right area
-- AND carrying the merged content (20 pitches came from its own pitch_detail).
delete from routes
 where id = 'wa_baring_mountain_vanishing_point'
   and area_id = 'wa_baring_mountain'
   and exists (
     select 1 from routes s
      where s.id = 'wa_vanishing_point'
        and s.area_id = 'wa_dolomite_tower'
        and s.pitches = 20
        and s.grade = '5.12b'
   );

commit;

-- route_count needs no manual update: the routes_bump_counts trigger (migration
-- 0001) decrements the deleted route's area and every ancestor automatically.

-- Verify:
--   select id, area_id from routes where name = 'Vanishing Point';   -- expect 1 row
--   select id, route_count from areas
--    where id in ('wa_dolomite_tower','wa_baring_mountain','wa_mount_baring');
--   -- expect wa_baring_mountain 3, wa_dolomite_tower 2, wa_mount_baring 2

-- ─────────────────────────────────────────────────────────────────────────────
-- NOT DONE HERE: the duplicated parent, and why.
--
-- "Mount Baring" (wa_mount_baring, region, no elevation, parent of Dolomite Tower)
-- and "Baring Mountain" (wa_baring_mountain, peak, 6127 ft) are the same mountain.
-- The obvious fix — reparent Dolomite Tower under the peak row and retire the
-- region husk — is REJECTED BY THE SCHEMA:
--
--   ERROR: cannot nest "wa_dolomite_tower" under "wa_baring_mountain"
--          — that area holds routes (leaf XOR parent)
--
-- areas_leaf_xor (migration 0001) enforces that an area either holds routes or has
-- child areas, never both. wa_baring_mountain holds three routes of its own that
-- are genuinely on the mountain and not on the tower — North Face (Grade IV-V
-- alpine), South Route (Class 3-4 scramble) and Oatmeal Man.
--
-- So unifying the two parents means first deciding where those three routes live:
-- a new sub-area for the mountain proper, so the peak row can become a pure parent.
-- That is a content judgement about how the mountain's routes are organised, not a
-- mechanical fix, and it is deliberately left alone rather than guessed at. The
-- route-level duplicate above is the actual data bug and is safe to fix on its own.
