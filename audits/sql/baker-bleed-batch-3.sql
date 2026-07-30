-- Batch 3 of 3. Run AFTER baker-bleed-batch-2.sql.
-- Two distance errors, found by a new plausibility test rather than by matching
-- values across rows: a route's own gain_ft and dist_km can be impossible
-- together even when neither number looks wrong on its own.

-- ------------------------------------------------- Johannesburg round-trip distance
-- dist_km 1.6 is exactly 1.0 mile: the length of the CLIMB, stored in a column
-- every other route uses for the ROUND TRIP (Goode 61.6 = 38.3 mi, Bonanza
-- 23.34 = 14.5 mi). 4,720 ft of gain over a 1.6 km round trip would average a
-- 1.8 grade -- steeper than 60 degrees, approach included.
--
-- 8.8 mi = 14.2 km, from a trip report's own leg breakdown: 1 mi trailhead to
-- bivy, 0.3 to the summit, 0.5 to the Cascade-Johannesburg col, then 7 mi back
-- to the trailhead. The descent is Doug's Direct, a long traverse under the
-- Triplets to Mixup Peak's north ridge -- NOT a reversal of the climb. That is
-- also why loss_ft (5000) legitimately exceeds gain_ft (4720) on this row, and
-- why summit-minus-trailhead would have been the wrong way to derive either.
update routes set dist_km = 14.2
where id = 'wa_johannesburg_mountain_northeast_buttress' and dist_km = 1.6;

-- ---------------------------------------------------- "Cutthroat" across three states
-- Cutthroat Peak's gain_ft 2500 / dist_km 2.0 also sit on a sport route called
-- "Cutthroat" at City Rock, Arkansas and one called "Cutthroat Trout" in an
-- Arizona crag named Fish Bowl. The highest point in the whole of Arkansas is
-- 2,753 ft, so a single pitch there does not gain 2,500.
--
-- Worth carrying forward: this bled from the WA AREA name to a matching ROUTE
-- name in another state, which is why audit check 7 -- which groups by route
-- name -- cannot see it. Both fields nulled; neither row has any other source.
update routes set gain_ft = null, dist_km = null
where gain_ft = 2500 and dist_km = 2
  and id in ('ar_cutthroat', 'az_cutthroat_trout');

-- verify
--   expect: Johannesburg at 14.2; the four WA Cutthroat Peak routes keep 2500/2,
--   and the AR/AZ rows are gone from the list entirely
select id, area_id, gain_ft, dist_km from routes
where id = 'wa_johannesburg_mountain_northeast_buttress'
   or (gain_ft = 2500 and dist_km = 2)
order by id;
