-- WA alpine audit — batch 583 (pass 9)
-- Routes checked: wa_himmelhorn_wild_hair_crack, wa_honeymoon_route,
-- wa_hoodoo_peak_sawtooth_raven_ridge_traverse, wa_hoodoo_peak_sawtooth_scramble,
-- wa_horseshoe_peak_scramble, wa_hourglass_gully_winter,
-- wa_hozomeen_mountain_south_peak_north_ridge,
-- wa_hozomeen_mountain_south_peak_southeast_buttress,
-- wa_hozomeen_mountain_south_peak_southwest_route, wa_hozomeen_mountain_southwest_buttress.
-- All WHERE clauses include the current (wrong) value as a safety check per project
-- convention. Apply each UPDATE individually rather than pasting the whole file at once.

-- =========================================================================
-- Honeymoon Route, Mount Deception — wa_honeymoon_route
-- =========================================================================

-- Top-level gain_ft/loss_ft (7861/5400) don't match this SAME row's own itinerary:
-- day 1 (hike in) gainFt 3050/lossFt 0, day 2 (climb+return to camp) gainFt 2200/
-- lossFt 2200, day 3 (hike out) gainFt 0/lossFt 3050 -- summing to 5250 gain and
-- 5250 loss. This is a there-and-back route on one trail (approach_variants[0] and
-- descent_text both describe returning via the same basin/trail), so gain and loss
-- should be equal, as the itinerary already has them. 7861 also exceeds the net
-- elevation possible on this route (trailhead ~2,550 ft per waypoints[0], summit
-- 7,788 ft -- a net gain of 5,238 ft), confirming 7861 is the outlier, not the
-- itinerary. Aligning the top-level figures to match the row's own itinerary.
UPDATE routes SET gain_ft = 5250, loss_ft = 5250
WHERE id = 'wa_honeymoon_route' AND gain_ft = 7861 AND loss_ft = 5400;

-- =========================================================================
-- Checked clean this batch, no issues found:
--  wa_himmelhorn_wild_hair_crack (high_point_ft 7880 and FA "Silas Wild, Russ
--    Kroeker, John Roper -- 1981" both match the American Alpine Journal's account
--    of "Wild Hair Crack (Kroeker-Roper-Wild, 1981)" on Himmelhorn's NW aspect, and
--    7,880 ft matches Wikipedia/Mountaineers.org; a LiDAR remeasurement elsewhere
--    gives 7,903 ft but no source gives a figure this row's 7,880 ft actually
--    contradicts),
--  wa_hoodoo_peak_sawtooth_raven_ridge_traverse and wa_hoodoo_peak_sawtooth_scramble
--    (high_point_ft 8475 matches ListsOfJohn's current figure; the scramble's own
--    dist_km 19.63 (~12.2 mi) and gain/loss 4500/4600 match its own data_quality.gaps
--    note citing "12-12.5 mi/4,000-4,600 ft to the summit"; permit/access text is
--    consistent between the two sibling routes),
--  wa_horseshoe_peak_scramble (high_point_ft 8480 matches Mountaineers.org/TopoZone/
--    ListsOfJohn's 8,480-8,491 ft range for Horseshoe Peak; the row's own
--    data_quality.gaps already discloses the SummitPost-noted coordinate/naming
--    confusion with the separately-named "Ripsaw Ridge" high point (8,300 ft) --
--    nothing further to fix there),
--  wa_hourglass_gully_winter (high_point_ft 5991 for Mount Index Main Peak matches
--    Wikipedia exactly; gain_ft/loss_ft 5500/5500 are a plausible, symmetric
--    there-and-back figure given the stated Lake Serene approach and East Ridge
--    rappel-descent),
--  wa_hozomeen_mountain_south_peak_north_ridge, ...southeast_buttress, and
--    ...southwest_route (high_point_ft 8003 for Hozomeen's South Peak matches
--    Wikipedia/ListsOfJohn exactly; access/road/emergency blocks are identical and
--    internally consistent across all three South Peak routes, and match current
--    reporting on the Hozomeen border-crossing and Border 2 Fire closures, which the
--    row's own text already dates and tells climbers to re-check),
--  wa_hozomeen_mountain_southwest_buttress (high_point_ft 8071 for Hozomeen's North
--    Peak matches Wikipedia's NAVD88 figure exactly).
-- No waypoints/coordinates are stored yet for any of the four Hozomeen routes --
-- unenriched, not contradictory, so nothing to fix or flag here.
-- =========================================================================

-- Verify afterward:
select id, gain_ft, loss_ft from routes where id = 'wa_honeymoon_route';
