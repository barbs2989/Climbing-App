-- North Sister and Middle Sister are holding each other's coordinates.
--
-- PROVEN AGAINST USGS, not inferred from a map by eye. The National Map Gazetteer (GNIS) layer 5,
-- queried live 2026-08-13, returns for the three Oregon Sisters summits:
--
--     gaz_id 1147062  North Sister    44.16662, -121.77214
--     gaz_id 1146183  Middle Sister   44.14849, -121.78406
--     gaz_id 1150082  South Sister    44.10354, -121.76949
--
-- and this catalog stores:
--
--     or_middle_sister  44.1664, -121.7727   <- that is GNIS NORTH Sister, to 4 dp
--     or_north_sister   44.1486, -121.7839   <- that is GNIS MIDDLE Sister, to 4 dp
--     or_south_sister   44.1023, -121.7714   <- ~200 m from GNIS, ordinary variance, LEFT ALONE
--
-- It is an exact transposition, not two independently wrong values: each row holds the other's
-- number to every digit stored.
--
-- WHICH ROW IS WRONG WAS SETTLED BEFORE WRITING THIS, because three different faults produce the
-- same symptom and they need opposite repairs — swapped coordinates, one row imported from the
-- wrong feature, or the NAMES sitting on the wrong rows (which would mean the ROUTES are misfiled
-- and this migration would be actively harmful). The routes decide it:
--
--     or_north_sister   South Ridge (4th), West Face- Right (4th)   <- North Sister's own lines;
--                                                                      South Ridge is its standard
--     or_south_sister   Old Crater Route (3rd), North Ridge (4th)   <- South Sister's standard
--     or_middle_sister  North Ridge (Hayden Glacier)                <- added by 0138
--
-- Every route is filed on the peak it belongs to, so the names are right and only the two
-- coordinate pairs are wrong. This is therefore a two-column repair and NOT a re-parenting.
--
-- NOT COSMETIC. `areas.lat`/`lng` is what FireNearRoute reads to ask which wildfires are near a
-- route — the panel renders nothing without a coordinate and its distances are to the fire's
-- reported point of origin. With these swapped, the nearby-fire panel on a Middle Sister route was
-- answering for North Sister, ~2.1 km away, and vice versa. The area browser and every
-- distance-sorted list read the same columns.
--
-- Written as two straight assignments rather than a swap through a temporary, because the values
-- are known constants from GNIS — there is nothing to preserve and a self-referential UPDATE would
-- be harder to verify. Values are 5 dp here (~1 m), which GNIS supports; the existing rows are
-- 4 dp. Re-runnable: assigning the same constants twice is a no-op.

begin;

update areas set lat = 44.16662, lng = -121.77214 where id = 'or_north_sister';
update areas set lat = 44.14849, lng = -121.78406 where id = 'or_middle_sister';

commit;

-- Verify AFTER, as SEPARATE statements (a failing SELECT inside the transaction rolls the updates
-- back — that is how 0097's writes were undone):
--
--   select id, lat, lng from areas where id in ('or_north_sister','or_middle_sister');
--   -- expect or_north_sister 44.16662/-121.77214 and or_middle_sister 44.14849/-121.78406,
--   -- i.e. North is now NORTH of Middle. Before this ran, Middle sat north of North.
--
-- A sanity check that does not depend on remembering which is which: North Sister's latitude must
-- be GREATER than Middle Sister's, which must be greater than South Sister's. That ordering was
-- violated before this migration and holds after it.
--
-- South Sister is deliberately untouched. Its stored value differs from GNIS by ~200 m, which is
-- an ordinary difference in where a summit point is placed, not a transposition — and "move every
-- coordinate to GNIS" is a separate, much larger claim than "these two rows hold each other's".
