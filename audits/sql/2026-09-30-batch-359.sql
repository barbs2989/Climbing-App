-- WA alpine/mountaineering audit -- batch 359 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_oval_peak_scramble, wa_overcoat_peak_southeast_route, wa_pernod_spire_standard,
--         wa_phantom_peak_south_route, wa_phantom_peak_west_ridge, wa_philadelphia_mountain_scramble
-- All values below were re-read from the live DB immediately before this file was written;
-- each UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Standard Scramble, Oval Peak (wa_oval_peak_scramble)
-- -- high_point_ft vs the route's own summit waypoint, the wa_oval_peak area
-- -- row, and external sources, all of which already agree on 8,800 ft
-- =========================================================================
-- This route's own high_point_ft stores 8795 while its own waypoints array's "Oval Peak"
-- summit entry already says elev=8800 -- matching the wa_oval_peak area row
-- (elevation_ft = 8800). Wikipedia, WTA, and ListsOfJohn all independently give Oval
-- Peak's elevation as 8,800 ft; no source found supports 8,795 ft. Correcting the
-- outlier high_point_ft to match the route's own waypoint, the area row, and every
-- external source checked.
UPDATE routes SET high_point_ft = 8800
WHERE id = 'wa_oval_peak_scramble'
  AND high_point_ft = 8795;

-- =========================================================================
-- East Face, Overcoat Peak (wa_overcoat_peak_southeast_route)
-- -- top-level gain_ft/loss_ft vs the route's own 3-day itinerary day-sum
-- =========================================================================
-- This is a car-to-car route returning to the same Dingford Creek trailhead it starts
-- from, so total gain and total loss over the whole trip must be equal. The top-level
-- gain_ft (6032) and loss_ft (5800) violate that identity by 232 ft, while the route's
-- own itinerary.days[] (3 days: 5200/0, 900/2900, 100/3300) already sum to an equal
-- 6200 ft of gain and 6200 ft of loss. Correcting the top-level fields to match the
-- route's own, internally self-consistent itinerary breakdown.
UPDATE routes SET gain_ft = 6200, loss_ft = 6200
WHERE id = 'wa_overcoat_peak_southeast_route'
  AND gain_ft = 6032 AND loss_ft = 5800;

-- =========================================================================
-- South Route, Phantom Peak (wa_phantom_peak_south_route)
-- -- top-level gain_ft/loss_ft vs the route's own 5-day itinerary day-sum
-- =========================================================================
-- Top-level gain_ft (1916) and loss_ft (1000) only capture the final summit push from
-- the ~6,100 ft high-camp saddle to the 8,016 ft summit (8016 - 6100 = 1916); they omit
-- the rest of this route's own documented 5-day, ~44-mile round-trip approach, which
-- crosses Hannegan Pass, Whatcom Pass and Perfect Pass. The route's own itinerary.days[]
-- (5 days: 2500/200, 3000/300, 2400/2400, 300/3000, 200/2500) already sum to an equal
-- 8400 ft of gain and 8400 ft of loss -- consistent with a car-to-car trip that returns
-- to the same Hannegan Pass trailhead. Correcting the top-level fields to match the
-- route's own itinerary.
UPDATE routes SET gain_ft = 8400, loss_ft = 8400
WHERE id = 'wa_phantom_peak_south_route'
  AND gain_ft = 1916 AND loss_ft = 1000;

COMMIT;
