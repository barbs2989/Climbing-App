-- WA alpine audit batch 173 (pass 3)
-- wa_three_fingers_south_peak_lookout: trailhead waypoint (Three Fingers/Goat Flats
-- Trailhead, Tupso Pass Rd) stored elev 2650 ft. The sibling route wa_three_fingers_r2
-- (Middle Peak) stores the SAME coordinates (48.1972, -121.7742) for the same physical
-- trailhead at elev 3020 ft. External sources (Trail #641 trail-info page: "trailhead
-- elevation of 3020 feet"; a WTA trip report citing "el. 3,100 ft" at this trailhead)
-- corroborate ~3,020 ft, not 2,650 ft. Correcting the lookout route's waypoint to match.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '3020', false)
WHERE id = 'wa_three_fingers_south_peak_lookout'
  AND waypoints->0->>'name' = 'Three Fingers / Goat Flats Trailhead (Tupso Pass Rd)'
  AND waypoints->0->>'elev' = '2650';
