-- WA alpine audit — batch 194 (pass 4)
-- Routes: wa_guye_peak_improbable_traverse, wa_guye_peak_r1, wa_guye_peak_r2,
-- wa_guye_peak_southeast_gully, wa_hadley_peak_cougar_divide,
-- wa_hadley_peak_skyline_divide, wa_helmet_butte_standard_route,
-- wa_himmelhorn_southeast_route

-- ============================================================================
-- wa_hadley_peak_skyline_divide: gain_ft/loss_ft (2818) are below the
-- physical floor implied by the row's OWN two waypoints -- Skyline Divide
-- Trailhead at 4,250 ft and Hadley Peak Summit at 7,515 ft, a minimum net
-- gain of 3,265 ft for a party that starts at the trailhead and stands on
-- the summit. No intermediate high point is recorded, so there is no
-- above-the-floor explanation (e.g. a high camp) the way audit:gain-floor-
-- stated's own exclusion allows for elsewhere in this catalog. Corrected to
-- the floor value (3265), which is the defensible minimum; the true
-- cumulative gain is very likely somewhat higher still, since the route's
-- own approach/descent text describes a ~3-mile undulating ridge traverse
-- along Chowder Ridge rather than a single monotonic climb, but no reliable
-- source gives a precise figure for that extra relief, so the number is not
-- guessed beyond the mathematically required minimum.
UPDATE routes
SET gain_ft = 3265,
    loss_ft = 3265
WHERE id = 'wa_hadley_peak_skyline_divide'
  AND gain_ft = 2818
  AND loss_ft = 2818;
