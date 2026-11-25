-- Batch 265 (pass 5): wa_lewis_creek_route, wa_lexington_tower_east_face,
--   wa_liberty_and_injustice_for_all, wa_liberty_bell_beckey_route,
--   wa_liberty_bell_east_face, wa_liberty_bell_independence_route,
--   wa_liberty_bell_nw_face, wa_liberty_bell_overexposure
--
-- All findings below were independently verified this session via WebSearch against
-- external sources (Wikipedia, Mountain Project, NC Mountain Guides/chossclimbers pitch
-- breakdowns, AAC Publications) and/or the row's own internal data (its itinerary object,
-- its own waypoints, a sibling route sharing the identical stated approach) before being
-- written. See the log for items checked and left unfixed (Lexington Tower notch
-- elevation, wa_liberty_bell_east_face's suspect route identity, Lewis Creek's gain
-- figure) where no sourced number could be established.

-- Fix 1: wa_liberty_and_injustice_for_all -- dist_km (8.05) stores the ROUND-TRIP distance
-- where the app's own convention (RouteDetail.jsx: "Approach (one way)", and the Plan tab
-- doubling distKm for the round-trip tile) expects a ONE-WAY figure. The row's own
-- itinerary.days[0].miles = 5 (a car-to-car, i.e. round-trip, figure) converts to 8.05 km
-- exactly (5 mi x 1.60934 = 8.047 km) -- confirming 8.05 is the round-trip distance, not
-- one-way. Its own approach text says this route uses "Same East Face approach ... as the
-- other Liberty Crack-area routes," and the sibling wa_liberty_bell_east_face route (same
-- trailhead, same approach corridor) correctly stores dist_km = 4.02 one-way. Halved to
-- match the app's one-way convention and its sibling's value.
UPDATE routes SET dist_km = 4.025
WHERE id = 'wa_liberty_and_injustice_for_all' AND dist_km = 8.05;

-- Fix 2: wa_liberty_and_injustice_for_all -- high_point_ft is NULL. The row's own second
-- waypoint states "Liberty Bell Mountain" / "True summit of Liberty Bell Mountain" at
-- elev 7720, and every other route on this same peak in the catalog (Beckey Route, East
-- Face, Independence Route, NW Face, Overexposure) already stores high_point_ft = 7720,
-- externally confirmed via Wikipedia (Liberty Bell Mountain, 7,720+ ft). Filled from the
-- row's own waypoint rather than researched fresh.
UPDATE routes SET high_point_ft = 7720
WHERE id = 'wa_liberty_and_injustice_for_all' AND high_point_ft IS NULL;

-- Fix 3: wa_liberty_bell_overexposure -- same round-trip/one-way dist_km bug as Fix 1.
-- The row's own itinerary.days[0].miles = 5.4 (car-to-car) converts to 8.69 km exactly
-- (5.4 mi x 1.60934 = 8.690 km). Its own approach text states "the trailhead-to-base
-- approach is identical to the Beckey Route," whose dist_km is correctly stored as 4
-- (one-way) for the same Blue Lake Trailhead corridor. Halved to match.
UPDATE routes SET dist_km = 4.345
WHERE id = 'wa_liberty_bell_overexposure' AND dist_km = 8.69;

-- Fix 4: wa_liberty_bell_overexposure -- pitches (4) overstates the route. Mountain
-- Project and NC Mountain Guides both independently describe Overexposure as a 2-pitch
-- 5.8 route ("Overexposure is class 5.8 with 2 pitches... The second pitch tops out at
-- the start of the Liberty Bell rappels. If you are continuing to the summit, it's a few
-- hundred feet of fourth and low fifth class scrambling to the top"), which matches this
-- row's own descent_text almost verbatim ("The route's 2nd pitch tops out at the same
-- bolted anchor system that starts the standard Liberty Bell descent, so most parties
-- either stop there or continue a few hundred feet of 4th/low-5th-class scrambling to the
-- true summit"). Corrected to 2 pitches.
UPDATE routes SET pitches = 2
WHERE id = 'wa_liberty_bell_overexposure' AND pitches = 4;

-- Fix 5: wa_liberty_bell_nw_face -- loss_ft is NULL. The row's own itinerary.days[0]
-- already states lossFt = 2400 for this exact car-to-car day, and its own descent_text
-- confirms the party returns to the same Blue Lake Trailhead ("retrace the approach to
-- the Blue Lake Trail") rather than exiting elsewhere -- consistent with a loss figure
-- close to the route's own gain_ft = 2520 (5200 ft trailhead to the 7720 ft summit).
-- Filled from the row's own itinerary field rather than researched fresh.
UPDATE routes SET loss_ft = 2400
WHERE id = 'wa_liberty_bell_nw_face' AND loss_ft IS NULL;
