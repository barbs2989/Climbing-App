-- WA alpine audit, pass 8, batch 541
-- wa_south_early_winter_spire_southwest_couloir: top-level gain_ft/loss_ft were both null,
-- but the route's own single-day itinerary already sums to a symmetric 2430/2430 (a round trip
-- back to the Blue Lake Trailhead), and its own itinerary.totalNote states "2,400-2,600 ft of
-- gain" -- filling in the null fields to match the route's own data.
UPDATE routes
SET gain_ft = 2430,
    loss_ft = 2430
WHERE id = 'wa_south_early_winter_spire_southwest_couloir'
  AND gain_ft IS NULL
  AND loss_ft IS NULL;
