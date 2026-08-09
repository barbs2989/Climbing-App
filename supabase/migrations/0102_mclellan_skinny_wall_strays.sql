-- 0102: two routes filed on the wrong wall at McLellan Rocks.
--
-- Found by the co-located-area sweep that followed the Brothers dedup (0100/0101). That
-- sweep found 2,543 co-located WA leaf pairs and only two real candidates; this is the
-- clean one. The other (Mount Index vs "North Peak") is NOT actioned here — its
-- overlapping climbs may be genuinely different lines and it needs route research.
--
-- `wa_skinny_wall` and `wa_white_wall` sit 19 m apart under McLellan Rocks, and Skinny
-- Wall's only two routes are byte-for-byte copies of two of White Wall's:
--
--   wa_rocket_queen  (wa_white_wall)  ==  wa_rocket_queen_2  (wa_skinny_wall)
--   wa_suicide_king  (wa_white_wall)  ==  wa_suicide_king_2  (wa_skinny_wall)
--
-- Compared column by column across the whole row: **every column is identical except
-- `area_id`**. Nothing is populated on one side and blank on the other, and no value
-- differs. So unlike the Brothers case there is nothing to merge first — there is no
-- information on the `_2` rows that the originals lack. The `_2` suffix is the ETL's
-- uniquifier for a same-name clash (see the route-id root cause: ids minted from the
-- route NAME plus a counter), which is exactly the fingerprint of an accidental copy.
--
-- WHICH SIDE IS WRONG, established from the source rather than by picking the tidier
-- option: Mountain Project's White Wall lists 12 climbs INCLUDING "Rocket Queen" (S 5.8)
-- and "Suicide King" (S 5.10c) — the same grades we hold. So White Wall is the correct
-- home and the Skinny Wall pair are the strays. Deleting the White Wall copies instead
-- would have removed the correctly-filed routes.
--
-- THE `wa_skinny_wall` AREA IS KEPT. Mountain Project lists Skinny Wall as a real
-- sub-area of McLellan Rocks with 2 climbs of its own, which we simply do not hold. After
-- this it has 0 routes, and an honestly-empty real area is better than deleting a place
-- that exists. Contrast 0101, where the duplicate AREA was removed because it was a
-- second row for a mountain we already had.
--
-- Verified before writing: no climb_logs / contributions / comments / hazard_votes /
-- user_lists reference either `_2` id, so nothing is orphaned.
--
-- Each delete names its twin in an EXISTS guard, so it removes zero rows if the original
-- is not there at run time — the guard check:sql requires, and the property that makes a
-- duplicate delete safe to re-run.
delete from routes where id = 'wa_rocket_queen_2'
  and exists (select 1 from routes k where k.id = 'wa_rocket_queen' and k.area_id = 'wa_white_wall');

delete from routes where id = 'wa_suicide_king_2'
  and exists (select 1 from routes k where k.id = 'wa_suicide_king' and k.area_id = 'wa_white_wall');

-- route_count is trigger-maintained on ROUTES, so both deletes already decremented every
-- ancestor (wa_skinny_wall -> 0, McLellan Rocks and above by 2). No manual recount.
-- check:counts (daily) is the backstop.

-- Verify afterward:
--   select id from routes where id in ('wa_rocket_queen_2','wa_suicide_king_2');
--   -- expect 0 rows
--   select id, name, grade from routes where area_id = 'wa_white_wall' order by name;
--   -- expect 11 rows, still including Rocket Queen (5.8) and Suicide King (5.10c)
--   select id, route_count from areas where id in ('wa_skinny_wall','wa_white_wall');
--   -- expect skinny_wall 0, white_wall 11
