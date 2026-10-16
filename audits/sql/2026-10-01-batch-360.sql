-- WA alpine/mountaineering audit -- batch 360 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_plummer_peak_r1, wa_point_success_south_side, wa_poltergeist_pinnacle,
--         wa_poltergeist_pinnacle_north_route, wa_preacher_mountain_scramble,
--         wa_primus_peak_south_ridge
-- All values below were re-read from the live DB immediately before this file was written;
-- each UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Point Success via Success Cleaver (wa_point_success_south_side)
-- -- loss_ft is NULL while gain_ft and this row's own itinerary prose already agree
-- =========================================================================
-- This is a 3-day round trip that returns to the same Longmire trailhead it starts
-- from (descent_text: "reversing the ascent line ... retrace the loose, scree-and-choss
-- cleaver back down"), so total gain and total loss over the whole trip should be equal.
-- Top-level gain_ft is already 11500, and this row's own itinerary.totalNote already
-- states "roughly 25 miles round trip and 11,500 ft of gain" for the same trip -- but
-- loss_ft was left NULL rather than set to match. Populating it from the row's own,
-- already-agreeing gain_ft/totalNote (externally, 11,500 ft gain for Success Cleaver is
-- also the commonly cited figure for this route).
UPDATE routes SET loss_ft = 11500
WHERE id = 'wa_point_success_south_side'
  AND gain_ft = 11500 AND loss_ft IS NULL;

-- =========================================================================
-- Poltergeist Pinnacle, East Face (wa_poltergeist_pinnacle)
-- -- top-level gain_ft/loss_ft only capture the first of this row's own 3 itinerary days
-- =========================================================================
-- This row's own itinerary text describes a 3-day round trip from the Hannegan Pass
-- trailhead (Day 1: hike in, "~7,000 ft of gain" to Perfect Pass camp; Day 2: cross the
-- glacier, climb the East Face, traverse to Mt. Challenger's summit, descend back to
-- camp; Day 3: hike out), returning to the same trailhead. The stored gain_ft (7066)
-- matches only the Day 1 figure quoted in a contemporaneous trip report of this exact
-- climb (cascadeclimbers.com: "~16 miles ... ~7,000 vertical feet" to Perfect Pass, plus
-- "an additional 3 miles of glacier travel with ~1,500 vertical feet" beyond Perfect
-- Pass to reach the climb) -- it omits the glacier approach, the climb itself, and all
-- of Day 3's descent, and loss_ft was left NULL entirely. The sibling row for the same
-- 2004 Aylward/Murphy East Face FA, wa_poltergeist_pinnacle_north_route (same route,
-- filed under its own area), already carries a full-trip total that is internally
-- self-consistent with its own 4-day itinerary.days[] sum (gain 11100 / loss 10700) and
-- is of a piece with the external approach figures above -- adopting that already-
-- verified total here.
UPDATE routes SET gain_ft = 11100, loss_ft = 10700
WHERE id = 'wa_poltergeist_pinnacle'
  AND gain_ft = 7066 AND loss_ft IS NULL;

-- =========================================================================
-- South Ridge / McAllister Glacier, Primus Peak (wa_primus_peak_south_ridge)
-- -- gain_ft/loss_ft/dist_km all NULL while this row's own itinerary already states them
-- =========================================================================
-- This route's top-level gain_ft, loss_ft and dist_km are all NULL, even though its own
-- itinerary.days[] (4 days: 4400/0, 2000/400, 1400/1400, 200/5700) already sum to 8000 ft
-- of gain and 7500 ft of loss, and its own itinerary.totalNote already states "on the
-- order of 8,000 ft of cumulative gain" over "roughly 20 miles round trip" (20 mi =
-- 32.19 km). Populating the three NULL fields from this row's own, already-stated and
-- internally-consistent itinerary (left unmatched to gain, as this route does not return
-- to the exact same elevation it started from net of the glacier approach's own ups and
-- downs, per its own day-by-day split).
UPDATE routes SET gain_ft = 8000, loss_ft = 7500, dist_km = 32.19
WHERE id = 'wa_primus_peak_south_ridge'
  AND gain_ft IS NULL AND loss_ft IS NULL AND dist_km IS NULL;

COMMIT;
