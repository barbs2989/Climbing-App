-- WA alpine audit -- batch 221 (2026-09-06, pass 4)
-- Routes: wa_northeast_ridge_1963_route (Johannesburg Mountain),
-- wa_northwest_arete (Argonaut Peak), wa_northwest_buttress (Sloan Peak),
-- wa_northwest_face_2 (Kangaroo Temple), wa_northwest_face_4 (Little Big
-- Chief Mountain), wa_northwest_face_boving_pollock (South Early Winters
-- Spire), wa_northwest_mox_peak_standard (Northwest Mox Peak),
-- wa_northwest_ridge (Dorado Needle).
-- Each WHERE clause includes the current (wrong) value as a safety check.
-- Apply each UPDATE individually.

-- Johannesburg Mountain, Northeast Ridge (1963 Route): the Summit waypoint
-- (index 5, "Johannesburg Mountain") stores elev/elevFt 8066, contradicting
-- this same row's own high_point_ft (8200) and externally corroborated
-- sources (Wikipedia/listsofjohn/PeakVisor all cite 8,200-8,212 ft; no
-- source found supports 8,066 ft). Corrected the waypoint to match.
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(waypoints, '{5,elev}', '8200'::jsonb),
      '{5,elevFt}', '8200'::jsonb
    )
WHERE id = 'wa_northeast_ridge_1963_route'
  AND waypoints->5->>'name' = 'Johannesburg Mountain'
  AND waypoints->5->>'type' = 'Summit'
  AND waypoints->5->'elev' = '8066'::jsonb
  AND waypoints->5->'elevFt' = '8066'::jsonb;

-- Kangaroo Temple, Northwest Face: the Summit waypoint (index 1, "Kangaroo
-- Temple") stores elev 7238, contradicting this same row's own high_point_ft
-- (7572) and an externally corroborated source (multiple sources, including
-- The Mountaineers, cite Kangaroo Temple at 7,572 ft; no source found
-- supports 7,238 ft). Corrected the waypoint to match.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elev}', '7572'::jsonb)
WHERE id = 'wa_northwest_face_2'
  AND waypoints->1->>'name' = 'Kangaroo Temple'
  AND waypoints->1->>'type' = 'Summit'
  AND waypoints->1->'elev' = '7238'::jsonb;

-- access_checked_at stamped for all 8 routes reviewed this batch (external
-- sources cross-checked 2026-09-06; no change to any other field on the
-- six routes not touched above).
UPDATE routes
SET access_checked_at = '2026-09-06T12:00:00+00:00'
WHERE id IN (
  'wa_northeast_ridge_1963_route',
  'wa_northwest_arete',
  'wa_northwest_buttress',
  'wa_northwest_face_2',
  'wa_northwest_face_4',
  'wa_northwest_face_boving_pollock',
  'wa_northwest_mox_peak_standard',
  'wa_northwest_ridge'
);
