-- WA alpine audit, batch 588 (pass 9)

-- wa_kyes_peak_glaciated_scramble (Glaciated Scramble / Standard, Kyes Peak): gain_ft (6500) and
-- loss_ft (6023) disagreed with each other for a true out-and-back route (same Blanca Lake
-- Trailhead both ways) and with the route's own itinerary, whose single day entry states
-- gainFt/lossFt of 6000/6000 and whose totalNote independently says "roughly 9-12 hours, ~12 miles
-- round trip, ~6,000 ft gain." Syncing the top-level fields to the route's own already-researched
-- itinerary figures.
UPDATE routes SET gain_ft = 6000, loss_ft = 6000
WHERE id = 'wa_kyes_peak_glaciated_scramble' AND gain_ft = 6500 AND loss_ft = 6023;

-- wa_labor_pains (North Early Winters Spire): loss_ft was NULL while gain_ft was already 2400;
-- the route's own itinerary day entry gives gainFt/lossFt of 2400/2400 for this rappel-descent
-- route (descent_text: raps the Chockstone Route's bolted stations back to the base it started
-- from). Filling the missing field from the route's own stored itinerary.
UPDATE routes SET loss_ft = 2400
WHERE id = 'wa_labor_pains' AND gain_ft = 2400 AND loss_ft IS NULL;

-- wa_lane_peak_r2 (The Fly couloir, Lane Peak): gain_ft/loss_ft were stored as 2000/2000, copied
-- from this route's sibling couloirs (The Zipper, Lover's Lane) that share the same trailhead --
-- but this route's own itinerary day entry and totalNote both independently and explicitly state
-- 1,500 ft ("roughly 5-6 hours and 1,500 ft car-to-car"), consistent with the route's own
-- description of topping out at a lower west-ridge notch rather than the summit. Syncing to the
-- route's own sourced itinerary figure.
UPDATE routes SET gain_ft = 1500, loss_ft = 1500
WHERE id = 'wa_lane_peak_r2' AND gain_ft = 2000 AND loss_ft = 2000;

-- wa_le_conte_mountain_northern_aspect (Le Conte Mountain): gain_ft/loss_ft were both NULL despite
-- the route's own 3-day itinerary already carrying a full day-by-day gain/loss breakdown (9000/6800,
-- 1900/1900, 6800/9000) that sums to a consistent round-trip 17700/17700, matching the itinerary's
-- own cal note ("a typical plan takes 2-3 days") and the route's own waypoint chain (Cascade Pass ->
-- Cache Col -> Kool-Aid Lake -> Middle Cascade Glacier -> Yang Yang Lakes -> summit and back).
-- Filling the missing top-level fields from the route's own stored itinerary sum.
UPDATE routes SET gain_ft = 17700, loss_ft = 17700
WHERE id = 'wa_le_conte_mountain_northern_aspect' AND gain_ft IS NULL AND loss_ft IS NULL;
