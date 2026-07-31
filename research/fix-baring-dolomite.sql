-- Baring / Dolomite Tower: the last crag-copy duplicate.
--
-- "Vanishing Point" (Grade V 5.12b, ~20 pitches) existed twice: the real row on
-- wa_dolomite_tower — the tower is the route's correct home — and a thinner
-- peak-scoped copy filed on wa_baring_mountain. Note the direction is REVERSED
-- versus the other pairs in this cleanup: here the short id is the survivor and
-- the peak-scoped id is the misfile.
--
-- The content merge already ran (14 fields, verified landed with an
-- order-insensitive comparison — jsonb does not preserve key order, so a plain
-- byte-compare reports false mismatches on jsonb columns). A loss audit against
-- research/crag-merges/baring-pre-merge.json shows 0 fields where the copy has
-- content and the survivor is blank, so the copy owes the survivor nothing.
--
-- Validate before pasting:  npm run check:sql -- research/fix-baring-dolomite.sql
--
-- check:sql will FAIL this file with "would remove the ONLY row with that name on
-- its peak" for both Vanishing Point rows. That is expected and is the point of the
-- merge: the twins sit on two different areas, so neither is "the only copy" in the
-- sense the guard means. Same override as the Gunsight merge. Do NOT override it
-- without first confirming both ids return rows.

begin;

-- Delete the peak-scoped copy, guarded on the survivor existing AND carrying the
-- merged content (20 pitches came from its own pitch_detail).
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

-- Duplicated parents: "Mount Baring" (region, no elevation) and "Baring Mountain"
-- (peak, 6127 ft) are the same mountain. Move Dolomite Tower under the peak row and
-- retire the region husk once it holds nothing.
update areas set parent_id = 'wa_baring_mountain'
 where id = 'wa_dolomite_tower' and parent_id = 'wa_mount_baring';

delete from areas
 where id = 'wa_mount_baring'
   and not exists (select 1 from routes where area_id = 'wa_mount_baring')
   and not exists (select 1 from areas  where parent_id = 'wa_mount_baring');

-- Recount the affected subtree (route_count is a stored rollup, not derived).
update areas set route_count = (
    select count(*) from routes r
     where r.area_id in (select d.id from areas d where d.path <@ areas.path)
  )
 where id in ('wa_dolomite_tower', 'wa_baring_mountain', 'wa_stevens_pass_region',
              'wa_centralwest', 'washington');

commit;

-- After running, expect: wa_baring_mountain holds 4 routes directly and Dolomite
-- Tower (2) beneath it; wa_mount_baring is gone; one Vanishing Point remains.
