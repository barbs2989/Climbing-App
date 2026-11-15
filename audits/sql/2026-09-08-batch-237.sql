-- WA alpine audit batch 237 (pass 4)
-- Routes: wa_three_fingers_r2, wa_three_fingers_south_peak_lookout,
-- wa_three_queens_middle_peak, wa_three_queens_west_peak,
-- wa_tomyhoi_peak_southeast_ridge, wa_tooth_and_claw,
-- wa_tooth_chair_traverse, wa_tower_mountain_southwest_route

-- wa_three_fingers_r2 (Three Fingers, Middle Peak South Face): dist_km stored
-- 23.5 (14.6 mi under the app's dist_km*2 one-way convention, i.e. would
-- display as a ~29.2 mi round trip). The row's own itinerary.totalNote states
-- "roughly 14.5 mi ... overall" for the full 3-day round trip, and this
-- route's sibling on the same massif (wa_three_fingers_r1, North Peak,
-- fixed in batch 236) was corrected to 11.75 km for a nearly identical
-- shared approach. 23.5 km reads as the round-trip figure itself rather than
-- the one-way distance the app doubles for display. Corrected to half the
-- itinerary's stated round trip (14.5 mi / 2 = 7.25 mi = 11.67 km, rounded to
-- 11.7).
UPDATE routes SET dist_km = 11.7
WHERE id = 'wa_three_fingers_r2' AND dist_km = 23.5;

-- Same route: `corrections` field recommends setting the area's elevationFt
-- to 6,854 ft (the South Peak/lookout summit) as "the peak's main high
-- point." The wa_three_fingers area row has since been populated
-- (elevation_ft = 6865) and its own blurb now states outright that "the true
-- high point is the technical North Peak (~6,870 ft), while the famous fire
-- lookout ... sits on the slightly lower South Peak (~6,854 ft)" -- i.e. the
-- ambiguity this note flagged has been resolved differently than it
-- recommended. Rewritten in the established stale-corrections-note style
-- (see batch 235's wa_the_monk_odine) to record that outcome rather than
-- leaving live but superseded advice on the row.
UPDATE routes
SET corrections = 'Peak-level elevationFt was null when this note was written; the wa_three_fingers area record has since been populated (elevation_ft = 6865) and its blurb now states the true high point is the technical North Peak (~6,870 ft), not the South Peak/lookout summit (6,854 ft) this note had recommended using -- superseded. Middle Peak itself, the subject of this route, remains a true but minor sub-summit at ~6,800 ft (Peakery), consistent with this route''s own high_point_ft.'
WHERE id = 'wa_three_fingers_r2'
  AND corrections = 'Peak-level elevationFt was null in the given data; reputable sources converge on approximately 6,854-6,870 ft for the (South Peak/main) summit of Three Fingers (Wikipedia: 6,858-6,859 ft; Peakbagger: 6,865.4 ft; WTA/SummitPost: 6,854-6,870 ft) — recommend setting peak elevationFt to 6854 ft (WTA/lookout-summit figure, most commonly cited for the named high point). Middle Peak itself, the subject of this route, is lower and separately listed by Peakery at 6,800 ft with only 200 ft of prominence, confirming it is a true but minor sub-summit of the massif, not the peak''s main high point.';

-- wa_three_fingers_south_peak_lookout (South Peak via Lookout): the
-- Trailhead waypoint's own `elev` reads 2650, at coordinates (48.1972,
-- -121.7742) IDENTICAL to the trailhead used by this route's two siblings
-- (wa_three_fingers_r1 "Saddle Lake / Three Fingers Trailhead", elev 3020;
-- wa_three_fingers_r2 "Three Fingers / Goat Flats Trailhead", elev 3020) --
-- same physical point, one outlier elevation. External corroboration: the
-- USFS Three Fingers-Goat Flats-Saddle Lake Trail #641 page and WTA both
-- give the trailhead elevation as 3,020 ft. Corrected to match both sibling
-- routes and the external source.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '3020'::jsonb)
WHERE id = 'wa_three_fingers_south_peak_lookout'
  AND waypoints->0->>'elev' = '2650';

-- Same route: gain_ft stored 5750 against loss_ft 4200 for a route whose own
-- descent_text says it is "a walk-off/downclimb route ... reverse Trail #641"
-- (the same trail both ways). The row's own itinerary.days sum to exactly
-- 4,200 ft of gain (day 1: 3,000 ft; day 2: 1,200 ft) -- matching the
-- existing loss_ft, not the top-level gain_ft -- and this also matches the
-- net rise from the corrected 3,020 ft trailhead above to the 6,854 ft
-- summit (3,834 ft, comfortably inside a 4,200 ft cumulative-gain figure for
-- a trail with real undulation). External corroboration: the USFS trail page
-- for this exact route states "a cumulative vertical gain of 4,000+ feet."
-- Corrected gain_ft to match loss_ft and both independent sources.
UPDATE routes SET gain_ft = 4200
WHERE id = 'wa_three_fingers_south_peak_lookout' AND gain_ft = 5750 AND loss_ft = 4200;

-- Same route: dist_km stored 24.9 (15.47 mi one-way under the app's
-- convention, i.e. would display as a ~30.9 mi round trip). This route
-- carries an actual gpx track (387 points); measured directly, its total
-- length is 11.35 km (7.05 mi) one-way, and the track's endpoint sits within
-- 18 m of this route's own recorded summit coordinate -- i.e. it is a
-- genuine trailhead-to-summit track, not a partial one. External
-- corroboration: the USFS trail page for this route states a round-trip
-- distance of 16 miles (8.0 mi one-way = 12.87 km), in the same range.
-- Corrected to the row's own measured gpx track length, the most precise
-- internal record available (24.9 reads as roughly double any of the
-- one-way estimates here, the same doubling pattern already fixed in this
-- massif's other two routes in batches 236-237).
UPDATE routes SET dist_km = 11.35
WHERE id = 'wa_three_fingers_south_peak_lookout' AND dist_km = 24.9;

-- wa_tooth_and_claw (Lexington Tower, Tooth and Claw): high_point_ft was
-- null. The row's own waypoint chain gives the "Topout" (East Shoulder) at
-- elev 7560, and the row's own access._raw.elevation independently states
-- "7,560 feet" -- both already on file and agreeing exactly. External
-- corroboration: Wikipedia gives Lexington Tower's elevation as 7,560 ft.
-- Filled from the row's own already-agreeing internal fields.
UPDATE routes SET high_point_ft = 7560
WHERE id = 'wa_tooth_and_claw' AND high_point_ft IS NULL;

-- wa_tower_mountain_southwest_route (Tower Mountain, Southwest Route):
-- data_quality.gaps states "No public GPS track found for this route as of
-- this research pass" -- but the row's own `gpx` field carries a detailed,
-- 1,112-point track. Measured directly, every one of this route's own named
-- waypoints (Cutthroat Pass, Granite Pass, the Snowy Lakes spur and camp,
-- the headwall cave-ledge bypass, the main summit gully, and the Tower
-- Mountain summit itself) sits within 2-100 m of that track -- i.e. it is a
-- real track of this exact route, not an unrelated leftover. Removed the
-- stale gap from the array; every other gap in the list is left untouched.
UPDATE routes
SET data_quality = jsonb_set(
  data_quality,
  '{gaps}',
  (SELECT jsonb_agg(gap) FROM jsonb_array_elements_text(data_quality->'gaps') AS gap
   WHERE gap <> 'No public GPS track found for this route as of this research pass.')
)
WHERE id = 'wa_tower_mountain_southwest_route'
  AND data_quality->'gaps' @> '["No public GPS track found for this route as of this research pass."]'::jsonb;

-- Same route: loss_ft was null against gain_ft 4400. The row's own
-- descent_text says outright: "Descend by reversing the ascent line — this
-- is a walk-off/downclimb with no rappelling required (rappels: 0)," i.e.
-- the same terrain is retraced in both directions, so cumulative loss should
-- equal cumulative gain. Filled from the row's own gain_ft for round-trip
-- symmetry on a route that is explicitly not a loop.
UPDATE routes SET loss_ft = 4400
WHERE id = 'wa_tower_mountain_southwest_route' AND loss_ft IS NULL AND gain_ft = 4400;

-- Verify
SELECT id, dist_km, gain_ft, loss_ft, high_point_ft
FROM routes
WHERE id IN (
  'wa_three_fingers_r2',
  'wa_three_fingers_south_peak_lookout',
  'wa_tooth_and_claw',
  'wa_tower_mountain_southwest_route'
)
ORDER BY id;

SELECT id, waypoints->0->>'elev' AS trailhead_elev
FROM routes WHERE id = 'wa_three_fingers_south_peak_lookout';

SELECT id, corrections FROM routes WHERE id = 'wa_three_fingers_r2';

SELECT id, data_quality->'gaps' AS gaps
FROM routes WHERE id = 'wa_tower_mountain_southwest_route';

-- wa_three_queens_middle_peak: FLAGGED FOR HUMAN REVIEW, no fix applied.
-- itinerary states "roughly 10 miles round trip and 4,600 ft of gain/loss"
-- (10 mi RT = 5.0 mi one-way = 8.05 km), but stored dist_km = 4.3 km
-- (2.67 mi one-way, would display as a 5.34 mi round trip) -- a mismatch,
-- but in the WRONG direction to be the usual doubling bug seen elsewhere in
-- this massif (here dist_km reads too LOW relative to the itinerary, not
-- too high). The route's own approach text (1.7 mi trail + ~1 mi brush to
-- the base of the talus = ~2.7 mi one-way, then more terrain up the talus/
-- gable/chimney to the summit) is roughly consistent with the stored
-- 2.67 mi, and the sibling West Peak route's "16 miles round trip" is
-- independently confirmed by its own dist_km (12.8 km = 7.96 mi one-way,
-- doubles to ~15.9 mi) -- so a 5-mile one-way approach for the SHORTER,
-- more direct Middle Peak day-route (vs. West Peak's multi-day approach to
-- the more remote Spectacle Point) seems implausibly long. Left un-fixed:
-- no single number here is well enough corroborated to write a confident
-- correction either way.

-- wa_tooth_and_claw: dist_km = 10.14 (6.3 mi one-way, doubles to ~12.6 mi
-- round trip) ALSO FLAGGED FOR HUMAN REVIEW, no fix applied. The approach is
-- described as "30-45 minutes total from the car to the base" (straight-line
-- trailhead-to-tower distance measured at only ~0.65 mi), which reads far
-- too short to justify a 12.6-mile round trip. But the route's own
-- descent_text offers a walk-off option via a DIFFERENT trail system (down
-- to the Blue Lake Trail, whose trailhead is ~1.7 road-miles from the
-- SR-20 hairpin/pond pullout used for the approach), so a car-to-car day
-- taking that descent could plausibly rack up several extra miles beyond a
-- simple approach-distance doubling. Left un-fixed given the two descent
-- options (rappel vs. walk-off) make "one-way distance" ambiguous for this
-- route, and no waypoint distMi or gpx track is populated to settle it.
