-- WA alpine audit -- batch 182 (2026-09-03, pass 4)
-- Routes: wa_cardinal_peak_nw_couloir_north_ridge, wa_cascade_peak_east_ridge,
-- wa_castle_peak_tatoosh_southeast_face, wa_cathedral_peak_pasayten_se_buttress,
-- wa_chair_bryant_traverse, wa_chair_peak_east_face, wa_chair_peak_north_face,
-- wa_chair_peak_northeast_buttress.
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention. Apply each UPDATE individually rather than
-- pasting the whole file at once.

-- =========================================================================
-- The Castle (Tatoosh Range), Southeast Face -- wa_castle_peak_tatoosh_southeast_face
-- =========================================================================

-- This row's own `high_point_ft` (6440) already matches the externally
-- confirmed elevation of The Castle (Wikipedia: 6,440 ft / 1,963 m,
-- Tatoosh Range, Mount Rainier NP), but the row's own Summit waypoint
-- ("The Castle summit (true/northernmost ridge)") stores elev/elevFt =
-- 6640 -- 200 ft higher than the row's own high_point_ft and than the
-- externally confirmed figure. Corrected the waypoint to agree with
-- high_point_ft and the external source.
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(waypoints, '{1,elev}', '6440', false),
      '{1,elevFt}', '6440', false
    )
WHERE id = 'wa_castle_peak_tatoosh_southeast_face'
  AND waypoints->1->>'name' = 'The Castle summit (true/northernmost ridge)'
  AND (waypoints->1->>'elev')::numeric = 6640
  AND (waypoints->1->>'elevFt')::numeric = 6640;

-- =========================================================================
-- Chair Peak, Northeast Buttress -- wa_chair_peak_northeast_buttress
-- =========================================================================

-- This is a car-to-car climb from the same Alpental/Snow Lake Trailhead
-- (3,100 ft, per the row's own first waypoint) to the same Chair Peak
-- summit (6,238 ft, per the row's own high_point_ft and Summit waypoint)
-- as its two siblings wa_chair_peak_east_face and wa_chair_peak_north_face
-- -- both of which correctly store gain_ft = loss_ft = 3138 (the exact
-- trailhead-to-summit rise). This row's own loss_ft already reads 3138,
-- but gain_ft read 3100 (an apparent copy of the trailhead elevation
-- rather than the actual net rise), understating the approach's Planner
-- gain figure by 38 ft and disagreeing with its own loss_ft field for what
-- the row's own itinerary and descent_text describe as an out-and-back
-- day. Corrected gain_ft to match loss_ft and the row's own waypoints.
UPDATE routes SET gain_ft = 3138
WHERE id = 'wa_chair_peak_northeast_buttress'
  AND gain_ft = 3100
  AND loss_ft = 3138;
