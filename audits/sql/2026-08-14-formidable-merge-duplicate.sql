-- Mount Formidable: retire the duplicate standard-route row, keep the South Face row.
--
-- DECIDED BY THE USER on 2026-08-14: "merge the pair, keep the south face row."
--
-- The pair, both aspect S on one peak:
--   wa_mount_formidable_south_face      "South Face / Southeast Ledges"       KEEP
--   wa_mount_formidable_north_ptarmigan "North Route via Ptarmigan Traverse"  RETIRE
--
-- They describe one climb. The retired row's own overview calls itself "the standard,
-- easiest way up Formidable ... cross to the peak's south slopes for a long, loose class
-- 3-4 scramble"; the survivor is the 1938 Ptarmigan Climbing Club first-ascent line, which
-- IS that standard route. Published sources agree the line is on the SOUTH side reached
-- over the Spider-Formidable col (The Mountaineers: "Mount Formidable/South Route";
-- SummitPost: "South Face"), so the retired row's NAME was recording the approach
-- direction, not the aspect — the same shape as Little Annapurna and Ruth Mountain.
--
-- SAFETY WORK DONE BEFORE WRITING THIS, none of it assumed:
--
--  * Dependent rows counted on the retired id across every table in `public` carrying a
--    `route_id`: climb_logs 0, contributions 0, crews 0, crew_listings 0, gps_submissions 0,
--    hazard_votes 0, objectives 0, topo_lines 0. Nothing is orphaned by the delete.
--  * The whole row is snapshotted to
--    research-data/retired-wa_mount_formidable_north_ptarmigan-2026-08-14.json (15,943 chars)
--    so nothing it held is destroyed by this file.
--
-- WHAT IS AND IS NOT CARRIED OVER, and why the line is drawn there:
--
-- Statement 1 copies ONLY `bivy`, which the survivor does not have at all (2,081 chars of
-- Ptarmigan Traverse camps — Kool-Aid Lake and the rest). It copies FROM THE ROW rather
-- than from a literal, so it cannot invent a value, and it is guarded on the survivor's
-- `bivy` being null so re-running cannot overwrite.
--
-- Fourteen further columns are LONGER on the retired row (access, road, climate,
-- best_season, obj_haz, bail, detailed_rack, what_to_bring, pro_needs, commitment, face,
-- season, rock_grade, discipline). They are deliberately NOT promoted. Longer is not more
-- correct, the survivor already carries its own values for each, and overwriting a
-- populated field is the one direction of this merge that can destroy good data. They live
-- in the snapshot for a later pass to judge one at a time.
--
-- `source` is deliberately not copied either: it is the retired row's pipeline provenance
-- ("phase3-master-consolidated.json prior research"), and attaching it to the survivor
-- would claim the survivor came from a file it did not.
--
-- NOTE ON `npm run check:sql`: it will object to statement 2 as "a DELETE removing the last
-- row with that name on its peak". That is correct and expected — its twin test matches on
-- NAME, and this pair's whole problem is that the twin is named differently. The twin is
-- wa_mount_formidable_south_face, confirmed present by the guard on statement 2 itself,
-- which cannot fire unless the survivor exists.

begin;

-- 1. Carry over the only field the survivor entirely lacks. Copied from the row, so no
--    value can be fabricated; guarded on null, so it is idempotent.
update routes k
   set bivy = d.bivy
  from routes d
 where k.id = 'wa_mount_formidable_south_face'
   and d.id = 'wa_mount_formidable_north_ptarmigan'
   and k.bivy is null
   and d.bivy is not null;

-- 2. Retire the duplicate. Guarded three ways: the id, its exact current name (so a row
--    that has been renamed since this file was written is NOT deleted), and the survivor
--    still existing — the Dragontail failure was deleting one half of a "duplicate" pair
--    whose other half was not actually there.
delete from routes
 where id = 'wa_mount_formidable_north_ptarmigan'
   and name = 'North Route via Ptarmigan Traverse'
   and exists (select 1 from routes s where s.id = 'wa_mount_formidable_south_face');

commit;

-- Verify AS SEPARATE STATEMENTS (a pasted script is one transaction, and a failing SELECT
-- would roll the writes back):
--
--   select id, name, aspect from routes where area_id = 'wa_mount_formidable' order by name;
--   -- expect 2 rows: "Northeast Face Direct" (NE) and "South Face / Southeast Ledges" (S)
--
--   select bivy is not null as bivy_carried from routes where id = 'wa_mount_formidable_south_face';
--   -- expect true
--
--   then: npm run check:counts   -- route_count is trigger-maintained on routes, so the
--                                -- ancestors above Formidable should already agree
