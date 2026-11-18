-- WA alpine audit batch 236 (pass 4)
-- Routes: wa_the_rake_traverse_route, wa_the_roof, wa_the_tooth_fairy,
-- wa_the_tooth_r1, wa_the_tooth_south_face, wa_the_triad_east_peak,
-- wa_the_west_face, wa_three_fingers_r1

-- wa_the_rake_traverse_route (The Rake, Southern Pickets): high_point_ft stored
-- 7869, but the row's own waypoint chain gives the summit ("The Rake" waypoint,
-- type Summit) as 7840 ft, and the area row wa_the_rake's own lat/lng/elevation
-- record matches the waypoint's coordinate exactly. External corroboration:
-- Peakbagger, StephAbegg's Pickets trip-report index, and Wikipedia's Picket
-- Range peak list all independently give The Rake's elevation as 7,840 ft, with
-- no source found supporting 7,869. Corrected to match both the row's own
-- waypoint data and external sources.
UPDATE routes SET high_point_ft = 7840
WHERE id = 'wa_the_rake_traverse_route' AND high_point_ft = 7869;

-- Same route: dist_km stored 25.7 (16.0 mi under the app's dist_km*2 one-way
-- convention, i.e. would display as a 31.9 mi round trip). The row's own
-- itinerary.totalNote states the trip is "roughly 16 miles ... round trip,"
-- and the summit waypoint's own distMi field (8.07, cumulative one-way from
-- the trailhead) confirms it: 8.07 mi one-way = 16.14 mi round trip, matching
-- the itinerary almost exactly. The stored 25.7 km appears to have been
-- entered as the round-trip figure itself rather than the one-way distance
-- the app's own rendering convention requires, so the app would double an
-- already-round-trip number. Corrected to the row's own one-way waypoint
-- mileage (8.07 mi = 12.99 km, rounded to 13.0).
UPDATE routes SET dist_km = 13.0
WHERE id = 'wa_the_rake_traverse_route' AND dist_km = 25.7;

-- Same route: grade_num stored 7 for grade "IV, 5.9" (grade_system yds). Every
-- other WA route in the catalog carrying rock_grade 5.9 under grade_system yds
-- stores grade_num = 9, including several with the identical "<commitment
-- grade>, 5.9" string shape (e.g. wa_east_ridge_4's "IV, 5.9" -> grade_num 9).
-- 7 is a clear outlier against ~30 sibling examples and would sort/filter this
-- route as though it were roughly 5.7 rather than 5.9. Corrected to match the
-- catalog's own consistent parsing convention for this exact grade string.
UPDATE routes SET grade_num = 9
WHERE id = 'wa_the_rake_traverse_route' AND grade_num = 7;

-- wa_the_roof (Unicorn Peak, Tatoosh Range): gain_ft/loss_ft both stored 2397,
-- but the row's own waypoints give trailhead 4400 ft and summit (Unicorn Peak,
-- shared high point for all Unicorn routes) 6971 ft -- a net rise of 2571 ft,
-- which 2397 falls 174 ft short of (an impossible-gain violation: gain_ft
-- cannot be less than the row's own trailhead-to-summit rise). Notably, 2397
-- is exactly 6971 minus 4574 -- the TRAILHEAD ELEVATION OF A DIFFERENT SIBLING
-- ROUTE on the same peak (wa_unicorn_peak_r1, whose own trailhead waypoint is
-- 4574 ft, not 4400), suggesting the value was computed against the wrong
-- route's trailhead. External corroboration: search aggregation of AllTrails/
-- WTA-derived figures for the standard Unicorn Peak approach states "the full
-- trail to Unicorn Peak is 5.1 miles ... with an elevation gain of 2,667
-- feet," which is comfortably above the 2571 ft floor and confirms 2397 reads
-- low. Corrected to the row's own trailhead/summit net rise (2571), which
-- satisfies the floor without over-reaching to a different route's approach
-- figure. loss_ft matched to the same value for round-trip symmetry (same
-- descent line reverses the ascent per the row's own descent_text).
UPDATE routes SET gain_ft = 2571, loss_ft = 2571
WHERE id = 'wa_the_roof' AND gain_ft = 2397 AND loss_ft = 2397;

-- wa_the_tooth_r1 (Northeast Slabs, The Tooth): the Trailhead waypoint's own
-- `note` field still reads "...approach up valley past Source Lake toward
-- Pineapple Pass basin for NE Face/Catscratch Couloir" -- but this row's own
-- `beta`, `overview`, and `data_quality.gaps` fields all explicitly state that
-- no route named "Catscratch Couloir" exists on The Tooth, that the name could
-- not be corroborated by any source, and that the route is correctly called
-- "Northeast Slabs" (the top-level `name` field has already been corrected to
-- this). The waypoint note is the one remaining place still presenting the
-- debunked name as current without qualification. Updated to match the row's
-- own already-established correction.
UPDATE routes
SET waypoints = jsonb_set(
  waypoints,
  '{0,note}',
  '"I-90 Exit 52, Alpental ski area parking lot; approach up valley past Source Lake toward Pineapple Pass basin for the NE Face (Northeast Slabs)."'::jsonb
)
WHERE id = 'wa_the_tooth_r1'
  AND waypoints->0->>'note' = 'I-90 Exit 52, Alpental ski area parking lot; approach up valley past Source Lake toward Pineapple Pass basin for NE Face/Catscratch Couloir.';

-- Same route: dist_km stored 10.46 (6.5 mi one-way under the app's convention,
-- i.e. would display as a 13.0 mi round trip). The row's own itinerary object
-- states this is a single car-to-car day of "roughly 10-12 hours, about 6.5
-- miles and 3,000 ft of gain," i.e. 6.5 mi is the ROUND TRIP total, not
-- one-way -- matching 10.46 km almost exactly. As with wa_the_rake_traverse_route,
-- the value appears to have been stored as the round-trip figure rather than
-- the one-way distance the app doubles for display. Corrected to half the
-- stored value (3.25 mi = 5.23 km) so the app's own doubling reproduces the
-- itinerary's stated 6.5 mi round trip.
UPDATE routes SET dist_km = 5.23
WHERE id = 'wa_the_tooth_r1' AND dist_km = 10.46;

-- Same route: top-level gain_ft/loss_ft stored 2500/2500, but the row's own
-- itinerary.days[0] states gainFt: 3000, lossFt: 3000 for the same single-day
-- car-to-car trip, and the itinerary's totalNote independently repeats "3,000
-- ft of gain." Corrected the top-level summary fields to match the row's own
-- more detailed itinerary sub-object.
UPDATE routes SET gain_ft = 3000, loss_ft = 3000
WHERE id = 'wa_the_tooth_r1' AND gain_ft = 2500 AND loss_ft = 2500;

-- wa_the_tooth_south_face (South Face, The Tooth): loss_ft stored 2500 against
-- gain_ft 2700 -- an asymmetric pair for a there-and-back route whose own
-- descent_text says parties "reverse the Class 3-4 scramble and talus/snow
-- descent through Great Scott Bowl back to the Source Lake junction," i.e. the
-- same up-and-down terrain climbed on the way in. For a round trip returning
-- to the same trailhead, cumulative loss should equal cumulative gain. The
-- row's own itinerary.days[0] gives gainFt: 2800 and lossFt: 2800 for this
-- exact single-day trip (also matching the itinerary's totalNote, "about 6
-- miles and 2,800 ft of gain"), so both top-level fields are brought in line
-- with the row's own itinerary rather than just matching one to the other.
UPDATE routes SET gain_ft = 2800, loss_ft = 2800
WHERE id = 'wa_the_tooth_south_face' AND gain_ft = 2700 AND loss_ft = 2500;

-- wa_the_triad_east_peak (The Triad, East Peak): top-level gain_ft stored
-- 3920 -- exactly the bare trailhead-to-summit net rise (7520 - 3600) with no
-- allowance for the terrain the row's own approach text describes (crossing
-- the Triad Glacier and passing all three Triad summits before East Triad
-- Col, i.e. real elevation lost and regained en route). loss_ft is already
-- stored at 5410, and the row's own itinerary.days[0] independently states
-- gainFt: 5410 AND lossFt: 5410 for the same single-day round trip -- so
-- gain_ft disagrees with both the itinerary's explicit figure and the row's
-- own loss_ft, which should be equal for a there-and-back day climb.
-- Corrected gain_ft to match.
UPDATE routes SET gain_ft = 5410
WHERE id = 'wa_the_triad_east_peak' AND gain_ft = 3920 AND loss_ft = 5410;

-- wa_the_west_face (North Early Winters Spire, West Face): the Trailhead
-- waypoint's own `elev` field reads 5200, while this row's own `approach`
-- text ("From the Blue Lake Trailhead (5,400 ft)...") and its own
-- `approach_logistics.trailheadDirection` ("From the Blue Lake Trailhead on
-- SR-20 (~1.5 miles west of Washington Pass, 5,400 ft)...") both independently
-- state 5,400 ft -- two internal sources against the one outlier waypoint
-- value. External corroboration: the Washington Trails Association and The
-- Mountaineers both give the Blue Lake Trailhead elevation as 5,400 ft.
-- Corrected the waypoint to match.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '5400'::jsonb)
WHERE id = 'wa_the_west_face' AND waypoints->0->>'elev' = '5200';

-- wa_three_fingers_r1 (Three Fingers, North Peak): dist_km stored 22.53 (14.0
-- mi one-way under the app's convention, i.e. would display as a 28.0 mi
-- round trip). The row's own waypoint chain gives the summit's cumulative
-- one-way distance from the trailhead as 7.3 mi (the "North Peak, Three
-- Fingers Summit" waypoint's own distMi field), which as a round trip (14.6
-- mi) is far closer to the row's own itinerary figures -- itinerary.days sum
-- to 18.5 mi round trip and itinerary.totalNote separately states "roughly
-- 14.5 mi" -- than the 28 mi a doubled 22.53 km would display. As with the
-- two routes above, the stored value appears to be roughly double the correct
-- one-way distance. Corrected to the row's own one-way waypoint mileage (7.3
-- mi = 11.75 km).
UPDATE routes SET dist_km = 11.75
WHERE id = 'wa_three_fingers_r1' AND dist_km = 22.53;

-- Verify
SELECT id, high_point_ft, dist_km, grade_num, gain_ft, loss_ft
FROM routes
WHERE id IN (
  'wa_the_rake_traverse_route',
  'wa_the_roof',
  'wa_the_tooth_r1',
  'wa_the_tooth_south_face',
  'wa_the_triad_east_peak',
  'wa_three_fingers_r1'
)
ORDER BY id;

SELECT id, waypoints->0->>'elev' AS trailhead_elev, waypoints->0->>'note' AS trailhead_note
FROM routes
WHERE id IN ('wa_the_west_face', 'wa_the_tooth_r1')
ORDER BY id;

-- wa_the_tooth_fairy: no changes. See audits/wa-alpine-audit-log.md for what
-- was checked (FA, grade, dist_km, gain/loss all corroborated against the
-- row's own waypoint chain and, for the FA, against external search results;
-- no internal or external contradictions found).
