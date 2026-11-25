-- WA alpine audit — batch 585 (pass 9)
-- Routes checked: wa_indian_head_peak_southwest_slopes, wa_indian_mountain_baker_scramble,
-- wa_ingalls_peak_east_ne_ridge_route, wa_ingalls_peak_east_peak_southwest_face,
-- wa_ingalls_peak_east_route, wa_ingalls_peak_friends_in_high_places,
-- wa_ingalls_peak_ingalls_error, wa_ingalls_peak_north_peak_southwest_face,
-- wa_ingalls_peak_south_ridge, wa_inner_constance_northwest_buttress.
-- All WHERE clauses include the current (wrong) value as a safety check per project
-- convention. Apply each UPDATE individually rather than pasting the whole file at once.

-- =========================================================================
-- Southwest Slopes (Standard Route), Indian Head Peak — wa_indian_head_peak_southwest_slopes
-- =========================================================================

-- Top-level gain_ft is 5900 and loss_ft is NULL. The row's own itinerary (day 1:
-- trailhead to Indian Pass camp, gainFt 3400/lossFt 800; day 2: camp to summit and
-- all the way back out to the trailhead, gainFt 2600/lossFt 5200) sums to gain 6000 /
-- loss 6000 -- a there-and-back route on the same approach, so gain should equal
-- loss, and both should match the itinerary rather than the stale top-level 5900.
UPDATE routes SET gain_ft = 6000, loss_ft = 6000
WHERE id = 'wa_indian_head_peak_southwest_slopes' AND gain_ft = 5900 AND loss_ft IS NULL;

-- =========================================================================
-- East Peak (Northeast Ridge to East Face) — wa_ingalls_peak_east_ne_ridge_route
-- =========================================================================

-- gain_ft and loss_ft are both NULL while the row's own single-day itinerary entry
-- already states gainFt 3210 / lossFt 3210 for this round trip. Propagating the
-- itinerary's own figures to the top-level columns rather than leaving them empty.
UPDATE routes SET gain_ft = 3210, loss_ft = 3210
WHERE id = 'wa_ingalls_peak_east_ne_ridge_route' AND gain_ft IS NULL AND loss_ft IS NULL;

-- =========================================================================
-- East Peak (Low Fifth Class) — wa_ingalls_peak_east_route
-- =========================================================================

-- Top-level gain_ft (3500) doesn't match this same row's own single-day itinerary
-- entry (gainFt 3300 / lossFt 3300) -- loss_ft already matches the itinerary at 3300,
-- only gain_ft is stale. This is a there-and-back route on one approach (per its own
-- waypoints/descent_text), so gain should equal loss as the itinerary already has it.
UPDATE routes SET gain_ft = 3300
WHERE id = 'wa_ingalls_peak_east_route' AND gain_ft = 3500 AND loss_ft = 3300;

-- =========================================================================
-- Friends In High Places — wa_ingalls_peak_friends_in_high_places
-- =========================================================================

-- gain_ft and loss_ft are both NULL while the row's own single-day itinerary entry
-- already states gainFt 3400 / lossFt 3400 for this round trip. Propagating those
-- figures to the top-level columns rather than leaving them empty.
UPDATE routes SET gain_ft = 3400, loss_ft = 3400
WHERE id = 'wa_ingalls_peak_friends_in_high_places' AND gain_ft IS NULL AND loss_ft IS NULL;

-- =========================================================================
-- Ingalls Error — wa_ingalls_peak_ingalls_error
-- =========================================================================

-- fa is NULL. Mountain Project's route page for Ingalls Error
-- (mountainproject.com/route/126883520/ingalls-error) credits the first ascent to
-- Andy Kish & Adam Moorad (no date given on the page). Filling the previously-empty
-- field from this single corroborating source; grade (5.7 PG13) already matches MP
-- exactly and needed no change.
UPDATE routes SET fa = 'Andy Kish & Adam Moorad'
WHERE id = 'wa_ingalls_peak_ingalls_error' AND fa IS NULL;

-- =========================================================================
-- South Ridge, Ingalls Peak — wa_ingalls_peak_south_ridge
-- =========================================================================

-- Top-level gain_ft/loss_ft (3500/3500) don't match this same row's own single-day
-- itinerary entry (gainFt 3600 / lossFt 3600). Trailhead (~4,100 ft per the stored
-- approach) to summit (7,662 ft) is a net gain of ~3,560 ft, so 3,600 ft round-trip
-- gain/loss is the more plausible figure and matches the itinerary; aligning the
-- top-level columns to it.
UPDATE routes SET gain_ft = 3600, loss_ft = 3600
WHERE id = 'wa_ingalls_peak_south_ridge' AND gain_ft = 3500 AND loss_ft = 3500;

-- =========================================================================
-- Northwest Buttress, Inner Constance — wa_inner_constance_northwest_buttress
-- =========================================================================

-- gain_ft and loss_ft are both NULL while the row's own three-day itinerary already
-- sums to gainFt 2800 / lossFt 2800 for this round trip. Propagating those figures
-- to the top-level columns rather than leaving them empty.
UPDATE routes SET gain_ft = 2800, loss_ft = 2800
WHERE id = 'wa_inner_constance_northwest_buttress' AND gain_ft IS NULL AND loss_ft IS NULL;

-- =========================================================================
-- Flagged for human review (not fixed here):
--  wa_ingalls_peak_east_peak_southwest_face -- area_id is wa_ingalls_peak (the main
--    summit), but Mountain Project (mountainproject.com/route/120932106/east-peak-
--    southwest-face) and the Mountaineers both describe this route as specifically
--    on Ingalls Peak's separate East Peak summit -- starting at the chockstone in the
--    notch between the North and East Peaks, reached via the East Ridge's first
--    pitch -- and explicitly warn not to confuse it with the MAIN peak's own,
--    unrelated "Southwest Face"/"Southwest Ledges" route. Its two siblings
--    (wa_ingalls_peak_east_ne_ridge_route, wa_ingalls_peak_east_route) are already
--    correctly filed under area_id = wa_ingalls_peak_east. This route's area_id looks
--    misfiled the same way, but reassigning it touches the areas.route_count
--    aggregation trigger and the route-identity rules in
--    docs/codebase/route-identity.md, so it needs a human to re-home it rather than
--    an audit-run UPDATE.
--  wa_indian_mountain_baker_scramble -- dist_km is 25.7 (km), but the row's own
--    hazards text states "long multi-day approach (about 32 mi round trip)." 25.7 km
--    = ~16 mi; doubled (treating 25.7 as a ONE-WAY distance), it is ~31.9 mi, matching
--    the hazards text almost exactly. CLAUDE.md already documents that dist_km holds
--    two conventions (one-way vs. round-trip) across this table and warns against
--    bulk-normalizing it, so this single row isn't corrected here -- flagged for a
--    human to settle which convention this row should use.
--  wa_inner_constance_northwest_buttress -- stored fa "Eric Hardee and Dan Coffey,
--    1983" could not be corroborated against any source found (Wikipedia and the
--    American Alpine Club's publications archive document only the peak's own 1939
--    first ascent by David Harrah's party and a 1963 Inner Constance Ridge traverse
--    by Northcutt/Barrie/Laster -- neither names these climbers or this buttress
--    route). May be correct and simply not indexed online (e.g. a guidebook-only
--    record); not disproven, just unverified this pass.
--
-- Also noted, no action: wa_ingalls_peak_south_ridge's FA "Keith Rankin & Ken
-- Solberg, May 30, 1941" is independently confirmed twice on OpenBeta, matching the
-- stored value exactly -- but Mountain Project names the second climber "Ken Colbert"
-- instead of "Solberg." Two sources disagree with each other on a surname, not with
-- our stored value, and nothing found settles which is right, so left as-is.
-- =========================================================================
