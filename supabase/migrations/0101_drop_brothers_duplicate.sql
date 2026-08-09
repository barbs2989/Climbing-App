-- 0101: The Brothers, step 2 of 2 — drop the duplicate now that the merge is confirmed.
--
-- 0100 copied 40 populated columns off the legacy rows onto the peak-scoped keepers and
-- deliberately deleted nothing. Re-read after it was applied: 11/11 on South Couloir and
-- 29/29 on Brothers Traverse landed, the keepers' name/area_id are unchanged, and both
-- legacy rows were still present. Only now is this delete safe.
--
--   keeper  wa_the_brothers_south_couloir   dist_km 13.7  commitment II   <- keeps everything
--   drop    wa_south_couloir
--   keeper  wa_the_brothers_traverse        dist_km 14.5  commitment III  outing_shape outback
--   drop    wa_brothers_traverse
--
-- Preconditions re-checked against the live DB immediately before writing this, rather
-- than carried over from the 0100 pass — on 2026-07-29 a concurrent session had already
-- deleted three rows from a duplicate list while another was still working it, so the
-- table genuinely moves underneath you:
--   * both keepers present and carrying the merged values           (2/2)
--   * both rows to delete still present                             (2/2)
--   * NOTHING else lives on the duplicate area                      (exactly those 2 routes)
--   * the duplicate area has no child areas                         (0)
--   * no climb_logs / contributions / comments / hazard_votes / user_lists reference
--     either route id                                               (0 references)
--
-- EXISTS GUARDS, and why they are not ceremony. check:sql refused the plain form:
--
--   FAIL  2 DELETE(s) would remove the ONLY row with that name on its peak
--
-- It is right. The survivors were RENAMED by the peak-scoped import — "South Couloir
-- (Standard Route)" and "Brothers Traverse (North Peak to South Peak)" — so a name-based
-- twin search cannot see them, and from the guard's view this looks exactly like the
-- delete that destroyed Triple Couloirs. The fix it suggests is better than silencing it:
-- name the intended twin in an EXISTS clause.
--
-- Each guard below tests a column that 0100 COPIED and that was null on the keeper before
-- it. So these deletes cannot run unless the merge actually landed — if 0100 were skipped,
-- or copied nothing (the silent `UPDATE ... FROM` failure mode), both statements match
-- zero rows and the legacy data survives. That is the property worth having: the delete is
-- conditional on the thing it depends on, not on my having checked in the right order.
--
-- Order matters: routes first, then the area. `areas_leaf_xor` and `routes_require_leaf`
-- both key off the routes/areas relationship, and deleting an area that still holds routes
-- would either fail or orphan them.
delete from routes where id = 'wa_south_couloir'
  and exists (select 1 from routes k
               where k.id = 'wa_the_brothers_south_couloir'
                 and k.gear_confidence is not null);   -- copied by 0100; was null before

delete from routes where id = 'wa_brothers_traverse'
  and exists (select 1 from routes k
               where k.id = 'wa_the_brothers_traverse'
                 and k.outing_shape = 'outback');      -- copied by 0100; was null before

-- route_count is maintained by a trigger on ROUTES, so the two deletes above already
-- decremented every ancestor (wa_brothers_south_peak_the -> 0, and Olympic NP / Olympics /
-- washington / usa each by 2). No manual recount is needed here — unlike 0097, where an
-- AREA moved and nothing maintained the counts. check:counts (daily) is the backstop.
delete from areas where id = 'wa_brothers_south_peak_the';

-- Verify afterward. No ltree operators: `!~` on an ltree column raised 42883 during 0097
-- and, because the SQL Editor runs a paste as ONE transaction, rolled back the correct
-- UPDATEs above it.
--   select id from routes where id in ('wa_south_couloir','wa_brothers_traverse');
--   -- expect 0 rows
--   select id from areas where id = 'wa_brothers_south_peak_the';
--   -- expect 0 rows
--   select id, name, dist_km, commitment, outing_shape from routes
--     where area_id = 'wa_the_brothers' order by id;
--   -- expect exactly 2 rows, both peak-scoped, still carrying the merged values
--   select id, route_count from areas where id in ('wa_the_brothers','wa_olympic_np');
--   -- expect wa_the_brothers = 2
