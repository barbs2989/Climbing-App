-- WA alpine audit — batch 195 (pass 4)
-- Routes: wa_honeymoon_route, wa_hourglass_gully_winter,
-- wa_hozomeen_mountain_north_peak_north_route, wa_hozomeen_mountain_southeast_face,
-- wa_hurry_up_peak_south_ridge, wa_icy_peak_ruth_icy_traverse,
-- wa_icy_peak_southwest_route, wa_ingalls_peak_east_route

-- ============================================================================
-- wa_hurry_up_peak_south_ridge: gain_ft/loss_ft (1700) are far below the
-- physical floor implied by the row's OWN waypoints (Cascade Pass Trailhead
-- 3,600 ft -> Hurry-up Peak Summit 7,821 ft = 4,221 ft minimum net gain;
-- externally confirmed both elevations via WebSearch/NPS/Wikipedia sources).
-- The route's own `approach` text goes further and gives explicit cumulative
-- figures rather than leaving it at the bare floor: "Car-to-camp is roughly
-- 5-6 miles with about 3,300 ft of gain" (trailhead to Kool-Aid Lake camp,
-- via Cascade Pass, Pelton Basin, and Cache Col -- a route that dips and
-- reclimbs, so cumulative gain exceeds simple net elevation change) plus
-- "about 1 mile and 1,400-1,500 ft above camp" for the summit side-trip.
-- 3,300 + 1,400 to 3,300 + 1,500 = 4,700-4,800 ft; corrected to the midpoint
-- (4,750), which is fully traceable to the row's own approach prose rather
-- than a computed/guessed minimum. Descent explicitly reverses the ascent
-- ("Reverse the ascent route" / descent_text: "reversing the approach"), so
-- loss_ft is set equal to gain_ft for this out-and-back.
UPDATE routes
SET gain_ft = 4750,
    loss_ft = 4750
WHERE id = 'wa_hurry_up_peak_south_ridge'
  AND gain_ft = 1700
  AND loss_ft = 1700;

-- ============================================================================
-- wa_icy_peak_ruth_icy_traverse: high_point_ft was 7073 (Icy Peak's own
-- summit elevation), but this route traverses OVER Ruth Mountain's summit en
-- route to Icy Peak ("parties gain Ruth Mountain ... then descend Ruth's
-- south ridge ... to the Ruth-Icy Saddle"). Ruth Mountain's summit is 7,115
-- ft -- HIGHER than Icy Peak's 7,073 ft -- confirmed via Wikipedia and
-- independently via a WTA trip-report title that names both elevations
-- together verbatim: "Ruth Mtn. (7115') Icy Peak (7073')". So the true high
-- point reached on this route is Ruth Mountain's 7,115 ft summit, not Icy
-- Peak's 7,073 ft. Also fills loss_ft and dist_km, both previously null,
-- using the row's own itinerary text: "a documented outing totaled about 16
-- miles and roughly 8,000 ft of cumulative elevation gain/loss round trip"
-- -- i.e. loss_ft = 8000 (matching the already-stored gain_ft of 8000, which
-- that same sentence corroborates), and dist_km = one-way distance so the
-- app's round-trip doubling reproduces "about 16 miles": 16 mi / 2 = 8 mi
-- one-way = 12.9 km.
UPDATE routes
SET high_point_ft = 7115,
    loss_ft = 8000,
    dist_km = 12.9
WHERE id = 'wa_icy_peak_ruth_icy_traverse'
  AND high_point_ft = 7073
  AND loss_ft IS NULL
  AND dist_km IS NULL
  AND gain_ft = 8000;

-- ============================================================================
-- wa_hozomeen_mountain_southeast_face: two corrections, both because this
-- route's own fields had been populated with the WRONG PEAK's facts --
-- Hozomeen Mountain has two summits (North Peak 8,071 ft, South Peak 8,003
-- ft; both confirmed via Wikipedia), and this specific route climbs the
-- SOUTH Peak (its own summit waypoint is literally named "Hozomeen
-- Mountain, South Peak" at elev 8003, and its own overview text gives South
-- Peak as 8,003 ft).
--
-- (1) high_point_ft was 8071 -- the NORTH Peak's elevation -- corrected to
--     8003, the South Peak's elevation, matching the row's own waypoint and
--     overview and confirmed externally.
-- (2) fa was "September 6, 1904 (Sledge Tatum and George E. Loudon Jr.,
--     Boundary Survey)" -- which the row's OWN overview text explicitly
--     attributes to the NORTH Peak's first ascent, not the South Peak this
--     route climbs. The overview separately states the South Peak's FA as
--     "May 30 1947 by Fred Beckey and five companions via the Southwest
--     Route", and frames this route ("Southeast Face (Standard)") as one of
--     exactly three known lines to the South Peak's summit -- the other two
--     being the Southeast Buttress (FA 1988) and the North Face (FA 2019).
--     Since the 1947 Southwest Route ascent is not one of those other two
--     lines, and is independently confirmed via WebSearch (AAC/Sutori/
--     kiddle sources) as "the standard and most commonly used route on the
--     peak" -- matching this row's own "(Standard)" naming -- it is the
--     same line, and the FA is corrected to the South Peak's 1947 ascent,
--     with the full named party (Fred Beckey, Melvin Marcus, Jerry O'Neil,
--     Ken Prestrud, Herb Staley & Charles Welsh -- "five companions" matches
--     exactly) rather than the wrong North Peak 1904 credit.
UPDATE routes
SET high_point_ft = 8003,
    fa = 'May 30, 1947 (Fred Beckey, Melvin Marcus, Jerry O''Neil, Ken Prestrud, Herb Staley & Charles Welsh, via the Southwest Route)'
WHERE id = 'wa_hozomeen_mountain_southeast_face'
  AND high_point_ft = 8071
  AND fa = 'September 6, 1904 (Sledge Tatum and George E. Loudon Jr., Boundary Survey)';
