-- Batch 266 (pass 5): wa_liberty_bell_serpentine_crack, wa_liberty_bell_thin_red_line,
--   wa_liberty_cap_liberty_ridge_finish, wa_liberty_cap_ptarmigan_ridge_finish,
--   wa_liberty_crack, wa_liberty_crack_free, wa_liberty_traverse,
--   wa_lichtenberg_mountain_west_face_west_rib
--
-- Findings below were verified this session via WebSearch (Wikipedia, and searches
-- corroborating first-ascent dates/parties, elevations and approach mileage against
-- multiple independent secondary sources) and/or the row's own internal data (its own
-- waypoints/itinerary object, a sibling route sharing the identical stated trailhead,
-- and -- for the two Liberty Cap routes and Liberty Bell/Liberty Crack -- the areas
-- table's own canonical elevation_ft/blurb for the same peak, which several individual
-- route rows had drifted away from). See the log for items checked and left unfixed.

-- Fix 1: wa_liberty_cap_liberty_ridge_finish -- high_point_ft (14112) disagrees with the
-- areas table's own canonical record for this exact peak (areas.wa_liberty_cap:
-- elevation_ft = 14097, blurb: "Liberty Cap (14,097 ft) ... a precise August 2025 GPS
-- survey put it at about 14,095 ft"), and with this very route's OWN overview text, which
-- independently states "It tops out on Liberty Cap (14,097 ft; an August 2025 GPS survey
-- puts it closer to 14,095 ft as the summit icecap keeps thinning)." 14112 appears to be
-- an older/traditional topo-derived figure that was never reconciled with the canonical
-- area record and the route's own prose. Corrected to match.
UPDATE routes SET high_point_ft = 14097
WHERE id = 'wa_liberty_cap_liberty_ridge_finish' AND high_point_ft = 14112;

-- Fix 2: wa_liberty_cap_ptarmigan_ridge_finish -- same high_point_ft mismatch as Fix 1,
-- and this row additionally contradicts ITSELF: its own "Liberty Cap" waypoint states
-- elev/elevFt = "14097" (matching the areas table's canonical 14097), while the top-level
-- high_point_ft field says 14112. Corrected to match the row's own waypoint and the
-- areas table.
UPDATE routes SET high_point_ft = 14097
WHERE id = 'wa_liberty_cap_ptarmigan_ridge_finish' AND high_point_ft = 14112;

-- Fix 3: wa_liberty_crack -- high_point_ft (7746) contradicts this very route's OWN
-- "Liberty Bell Mountain summit" waypoint, which states elev/elevFt = "7720". It also
-- disagrees with the areas table's canonical record for this peak (areas.wa_liberty_bell:
-- elevation_ft = 7720; the area's own blurb notes "some older USGS-derived listings round
-- to 7,745-7,750 ft" as a known-superseded alternate figure, which 7746 matches almost
-- exactly) and with every sibling route on this same peak in the catalog, all of which
-- store 7720 (externally confirmed via Wikipedia: "Liberty Bell Mountain ... 7,720+ ft").
-- Corrected to 7720.
UPDATE routes SET high_point_ft = 7720
WHERE id = 'wa_liberty_crack' AND high_point_ft = 7746;

-- Fix 4: wa_liberty_bell_serpentine_crack -- dist_km (2.5) is far too low under the app's
-- one-way convention (the Plan tab doubles dist_km for the round-trip display). The row's
-- own itinerary.days[0].miles = 5.2 (a car-to-car / round-trip figure) halves to 2.6 mi
-- one-way = 4.184 km. This is independently corroborated by external sources describing
-- the standard Blue Lake Trailhead / Beckey-approach corridor this route explicitly
-- shares ("Approach via Beckey Route approach") as "a short 5 miles round trip" / "~2.5
-- mi" one-way to reach the climb. 2.5 km (1.55 mi) is too short under any reading of
-- either figure.
UPDATE routes SET dist_km = 4.184
WHERE id = 'wa_liberty_bell_serpentine_crack' AND dist_km = 2.5;

-- Fix 5: wa_liberty_bell_thin_red_line -- dist_km (1.6) is far too low. The row's own
-- itinerary.days[0].miles = 5 (round trip) halves to 2.5 mi one-way = 4.023 km. This
-- matches, almost exactly, the sibling route wa_liberty_crack, which shares the
-- IDENTICAL trailhead coordinates (48.51454, -120.64332, the SR-20 hairpin/pond pullout)
-- and the identical itinerary.miles = 5, and whose dist_km (4.02) was not flagged as an
-- error. 1.6 km (0.99 mi) is inconsistent with both this row's own itinerary and its
-- same-trailhead sibling.
UPDATE routes SET dist_km = 4.023
WHERE id = 'wa_liberty_bell_thin_red_line' AND dist_km = 1.6;

-- Fix 6: wa_liberty_traverse -- high_point_ft is NULL. The row's own second waypoint
-- ("Liberty Bell Mountain", the traverse's final summit) already states elev = 7720,
-- matching the areas table's canonical elevation_ft for this peak and every other route
-- on it in the catalog. Filled from the row's own waypoint rather than researched fresh.
UPDATE routes SET high_point_ft = 7720
WHERE id = 'wa_liberty_traverse' AND high_point_ft IS NULL;

-- Fix 7 & 8: wa_liberty_traverse -- gain_ft (2001) is physically impossible: this row's
-- own waypoints put the trailhead at 5200 ft (Blue Lake TH) and the final summit
-- (Liberty Bell) at 7720 ft, a net gain of 2520 ft -- more than the stored gain_ft of
-- 2001, which cannot be correct for a route that finishes 2520 ft higher than it starts,
-- let alone one crossing five summits with descents/rappels between each. loss_ft is
-- NULL. The row's own itinerary.days[0] already states gainFt = 3500 and lossFt = 3500
-- for this exact "Full massif traverse" day (a figure consistent with a traverse whose
-- ridgeline profile undulates well beyond the simple trailhead-to-final-summit
-- difference, and symmetric because the traverse returns to the same trailhead area).
-- Both top-level fields corrected/filled to match the row's own itinerary object.
UPDATE routes SET gain_ft = 3500
WHERE id = 'wa_liberty_traverse' AND gain_ft = 2001;

UPDATE routes SET loss_ft = 3500
WHERE id = 'wa_liberty_traverse' AND loss_ft IS NULL;
