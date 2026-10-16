-- WA alpine audit — batch 190 (pass 4)
-- Routes: wa_flora_mountain_southwest_slope, wa_flycatcher_buttress,
-- wa_forbidden_peak_east_ridge, wa_forbidden_peak_north_ridge,
-- wa_forbidden_peak_northeast_face, wa_forbidden_peak_northwest_face,
-- wa_forbidden_peak_west_ridge, wa_fortress_mountain_east_ridge

-- ============================================================================
-- wa_flora_mountain_southwest_slope: gain_ft/loss_ft (3150/3150) are far
-- below the floor set by the row's OWN text. `beta`/`approach`/`pitch_detail`
-- all independently state Bird Creek Camp at 4,200 ft, and `high_point_ft`
-- is 8,323 ft -- a one-way rise of 4,123 ft from camp to summit. The row's
-- own `itinerary` explicitly scopes this field: "Day 2: Round-trip summit
-- push from Bird Creek Camp ... to the 8,323-ft summit and back", and
-- `timing.totalHrs` (6) matches only that single day, not the full 3-day
-- trip -- confirming gain_ft/loss_ft are scoped to the day-2 summit push
-- alone (same convention already documented for wa_austera_peak-family
-- routes in batch 178), not the whole multi-day approach. For that
-- out-and-back day, cumulative gain must be at least 2 x 4123 = 8246 ft.
-- Corrected to that provable floor (the true figure is likely somewhat
-- higher still, since the described route dips into a scree gully/creek
-- crossing between the saddle and the final ridge, but 8246 is what the
-- row's own camp/summit elevations directly establish).
UPDATE routes
SET gain_ft = 8246, loss_ft = 8246
WHERE id = 'wa_flora_mountain_southwest_slope'
  AND gain_ft = 3150 AND loss_ft = 3150;

-- ============================================================================
-- wa_forbidden_peak_north_ridge: gain_ft (4500) is below the floor implied
-- by the row's own 7-point waypoint chain, walked in order: Boston Basin
-- Trailhead 3200 -> High Camp 6400 (+3200) -> Sharkfin Col 7720 (+1320) ->
-- rappel to Boston Glacier 7570 (descent, no gain) -> glacier traverse 7000
-- (descent, no gain) -> North Ridge crest 8100 (+1100) -> summit 8815
-- (+715). Summing only the climbing (uphill) legs gives 6335 ft of
-- cumulative gain, which the route's own down-and-up profile (rappelling
-- off the col onto the glacier, then re-climbing to the ridge) requires
-- regardless of how gain_ft is scoped. Corrected to that waypoint-derived
-- floor. (loss_ft, 5700, already comfortably clears the separate West Ridge
-- descent floor of 8815-3200=5615 and is left unchanged -- this route's
-- ascent and descent use different lines, so gain and loss are not expected
-- to match here.)
UPDATE routes
SET gain_ft = 6335
WHERE id = 'wa_forbidden_peak_north_ridge'
  AND gain_ft = 4500;

-- ============================================================================
-- wa_forbidden_peak_northeast_face: gain_ft (4600) is below the floor
-- implied by the row's own waypoint chain (Trailhead 3200 -> High Camp 6400
-- -> glacier approach 7000 -> bergschrund 7300 -> NE Face climb 8000 ->
-- summit 8815 = 5615 ft of cumulative gain, a monotonic climb with no
-- descending legs). This also exactly matches the simple trailhead(3200)-
-- to-summit(8815) net-rise floor. Corrected gain_ft to 5615.
-- loss_ft (5200) is likewise below that same floor: the row's own
-- descent_text states the route does not reverse itself and instead
-- descends the West Ridge/"Cat Scratch Gullies" system fully back into
-- Boston Basin (i.e. back to the same 3200 ft trailhead), for which the net
-- descent floor is identically 8815-3200=5615 ft. Corrected to match.
UPDATE routes
SET gain_ft = 5615, loss_ft = 5615
WHERE id = 'wa_forbidden_peak_northeast_face'
  AND gain_ft = 4600 AND loss_ft = 5200;

-- ============================================================================
-- wa_forbidden_peak_northwest_face: gain_ft (4800) is below the floor
-- implied by the row's own waypoint chain (Trailhead 3200 -> High Camp 6400
-- -> glacier basin 6900 -> moat/bergschrund 7100 -> ice band 7700 ->
-- knife-edge/North Ridge crest 8100 -> summit 8815 = 5615 ft of cumulative
-- gain, again a monotonic climb). This matches both the row's own already-
-- correct loss_ft (5615, for the same West Ridge descent fully back to the
-- 3200 ft trailhead described in this row's own descent_text) and the
-- simple trailhead-to-summit floor. Corrected gain_ft to match.
UPDATE routes
SET gain_ft = 5615
WHERE id = 'wa_forbidden_peak_northwest_face'
  AND gain_ft = 4800;

-- ============================================================================
-- wa_forbidden_peak_west_ridge: gain_ft (6640) disagrees with loss_ft
-- (5700) by 940 ft on a route whose own descent_text is explicit that there
-- is no separate descent line ("There is no walk-off -- descend the same
-- West Ridge/couloir line"): for a route reversing its own ascent, gain
-- must equal loss. The row's own waypoint chain (Trailhead 3200 -> Boston
-- Basin 6200 -> West Ridge notch 8265 -> summit 8815 = 5615 ft, a monotonic
-- climb) supports the loss_ft side (5700, a plausible 85 ft of real-terrain
-- padding above that floor) rather than the gain_ft side, which has no
-- support in the row's own data. Lowered gain_ft to match loss_ft.
UPDATE routes
SET gain_ft = 5700
WHERE id = 'wa_forbidden_peak_west_ridge'
  AND gain_ft = 6640 AND loss_ft = 5700;
