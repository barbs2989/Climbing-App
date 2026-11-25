-- WA alpine audit — batch 584 (pass 9)
-- Routes checked: wa_hozomeen_mountain_west_face, wa_huckleberry_mountain_east_ridge,
-- wa_huckleberry_mountain_north_route, wa_huckleberry_mountain_north_spur,
-- wa_huckleberry_mountain_south_face, wa_huckleberry_mountain_southwest_slope,
-- wa_huckleberry_mountain_west_route, wa_hurry_up_peak_south_ridge,
-- wa_icy_peak_ruth_icy_traverse, wa_icy_peak_southwest_route.
-- All WHERE clauses include the current (wrong) value as a safety check per project
-- convention. Apply each UPDATE individually rather than pasting the whole file at once.

-- =========================================================================
-- East Ridge, Huckleberry Mountain — wa_huckleberry_mountain_east_ridge
-- =========================================================================

-- loss_ft is NULL while gain_ft is 5850. This is a there-and-back PCT approach
-- (trailhead and exit are the same point, per waypoints), and the row's own
-- itinerary (day 1 hike in: gainFt 2700/lossFt 150; day 2 climb the ridge: gainFt
-- 3000/lossFt 3000; day 3 hike out: gainFt 150/lossFt 2700) sums to gain 5850 /
-- loss 5850 -- matching the stored gain_ft exactly and showing loss_ft should equal
-- it, not be empty.
UPDATE routes SET loss_ft = 5850
WHERE id = 'wa_huckleberry_mountain_east_ridge' AND gain_ft = 5850 AND loss_ft IS NULL;

-- =========================================================================
-- Ruth-Icy Traverse (Northwest Ridge, via Ruth Mountain) — wa_icy_peak_ruth_icy_traverse
-- =========================================================================

-- loss_ft is NULL while gain_ft is 8000. The row's own itinerary has one day,
-- "Traverse Ruth Mountain to Icy Peak", with gainFt 8000 AND lossFt 8000 -- the
-- round trip starts and ends at the same trailhead (waypoints[0]/[1], ~3,100 ft),
-- so gain must equal loss, exactly as the itinerary already states. loss_ft should
-- match gain_ft and the itinerary, not be empty.
UPDATE routes SET loss_ft = 8000
WHERE id = 'wa_icy_peak_ruth_icy_traverse' AND gain_ft = 8000 AND loss_ft IS NULL;

-- =========================================================================
-- Southwest Route / Icy Glacier — wa_icy_peak_southwest_route
-- =========================================================================

-- Top-level gain_ft/loss_ft (8000/3963) don't match this SAME row's own itinerary:
-- day 1 (approach to Ruth Glacier notch camp) gainFt 3600/lossFt 0; day 2 (summit
-- push and hike all the way out to the trailhead) gainFt 2200/lossFt 4300 -- summing
-- to 5800 gain and 4300 loss, not 8000/3963. Aligning the top-level figures to match
-- the row's own stored itinerary. (This route and the sibling Ruth-Icy Traverse above
-- still disagree on total round-trip stats even after this fix -- flagged separately
-- for human review, not auto-reconciled here.)
UPDATE routes SET gain_ft = 5800, loss_ft = 4300
WHERE id = 'wa_icy_peak_southwest_route' AND gain_ft = 8000 AND loss_ft = 3963;

-- =========================================================================
-- Flagged for human review (not fixed here):
--  wa_huckleberry_mountain_west_route -- stored FA "Gary Hehn & Dave Stephens,
--    September 2001" is disputed. A Cascade Climbers forum thread specifically
--    titled "first ascent west face of Huckleberry Mountain" has Hehn's own account
--    saying 2001 is when he wrote the trip up for the Boealps (Boeing Alpine Club)
--    November 2001 newsletter and sent it to Fred Beckey -- not necessarily when he
--    and Stephens climbed it -- and a reply in the same thread relays a claim from
--    "Johnny Jeans" that he climbed the west face "many years ago," before Hehn and
--    Stephens. No guidebook or AAJ record settles which account is right.
--  wa_huckleberry_mountain_south_face -- stored FA "Mark Bunker & Mike Press, 1998"
--    could not be corroborated against any source found (Mountain Project, AAJ,
--    SummitPost, Mountaineers.org, Cascade Climbers); every South Face search result
--    for a peak named Huckleberry names a different first-ascent party or no FA at
--    all. Needs a Beckey/Cascade Alpine Guide check or a direct Mountain Project
--    lookup to confirm or correct.
--  wa_icy_peak_southwest_route vs wa_icy_peak_ruth_icy_traverse -- even after the fix
--    above, these two sibling routes (which share nearly the same Hannegan-Pass-via-
--    Ruth-Mountain approach to Icy Peak, and are within half a mile of each other in
--    total round-trip distance: ~16 mi vs ~16.5 mi) report different total round-trip
--    gain/loss: 8000/8000 ft for the Traverse vs. 5800/4300 ft for the Southwest
--    Route. A human should reconcile these against a topo map or GPS track -- the
--    Southwest Route's own day-by-day figures don't even net to zero over the round
--    trip (gain 5800 != loss 4300), which this fix does not attempt to resolve.
-- =========================================================================

-- Checked clean this batch, no issues found:
--  wa_hozomeen_mountain_west_face (high_point_ft 8071 for Hozomeen's North Peak
--    matches Wikipedia/area row exactly; FA "Rolf Larson and Eric Wehrly, August
--    31 - September 1, 2013" and grade 5.9 both match the American Alpine Club/
--    Cascade Climbers/skisickness.com record of the "Zorro Face" first ascent,
--    titled "IV 5.9" in the contemporaneous trip report),
--  wa_huckleberry_mountain_north_route, wa_huckleberry_mountain_north_spur, and
--    wa_huckleberry_mountain_southwest_slope (no elevation/gain/loss/FA/season data
--    on file for any of the three -- unenriched, not contradictory),
--  wa_huckleberry_mountain_west_route (high_point_ft/gain_ft/loss_ft 6320/6320/6320
--    already matches its own itinerary sum exactly; elevation sits inside the
--    6,320-6,340 ft range across Wikipedia/GNIS and ListsOfJohn already disclosed in
--    this row's own data_quality.gaps -- FA flagged above, elevation not a new issue),
--  wa_hurry_up_peak_south_ridge (high_point_ft 7821 matches Wikipedia/Peakbagger's
--    cited figure exactly; gain_ft/loss_ft 5500/5500 already matches its own
--    itinerary sum exactly; this row's own data_quality.gaps already discloses the
--    unconfirmed route name and FA -- nothing new to flag).
-- =========================================================================

-- Verify afterward:
select id, gain_ft, loss_ft from routes where id in (
  'wa_huckleberry_mountain_east_ridge', 'wa_icy_peak_ruth_icy_traverse', 'wa_icy_peak_southwest_route'
);
