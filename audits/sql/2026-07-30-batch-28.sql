-- WA Alpine Audit — Pass 1, Batch 28 — 2026-07-30
-- Peaks: Mount Maude (Entiat Ice Fall/r2), Mount Olympus (Blue Glacier,
--        West Ridge), Mount Persis (The Hexorcist, West Ridge),
--        Mount Pilchuck (East Ridge, Standard Route), Mount Price
--        (Hester Lake Route)

-- =========================================================================
-- Mount Olympus
-- =========================================================================

-- wa_mount_olympus_blue_glacier: waypoints' "Mount Olympus (West Peak)"
-- summit entry stored elevFt 7973, contradicting this same row's own
-- high_point_ft (7980) and the sibling wa_mount_olympus_west_ridge row's
-- summit waypoint (7980) -- and confirmed externally at 7,980 ft NAVD88
-- (NPS/Wikipedia). Fixed to match.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '7980', false)
WHERE id = 'wa_mount_olympus_blue_glacier'
  AND waypoints->1->>'name' = 'Mount Olympus (West Peak)'
  AND (waypoints->1->>'elevFt')::numeric = 7973;

-- =========================================================================
-- Mount Pilchuck
-- =========================================================================

-- wa_mount_pilchuck_standard_route: waypoints' summit/lookout entry stored
-- elevFt 5341, contradicting this same row's own high_point_ft (5324) and
-- confirmed externally at the USGS-cited 5,324 ft (matches State Parks and
-- this app's own value on the sibling wa_mount_pilchuck_east_ridge row).
-- Fixed to match.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '5324', false)
WHERE id = 'wa_mount_pilchuck_standard_route'
  AND waypoints->1->>'name' = 'Mount Pilchuck summit / fire lookout'
  AND (waypoints->1->>'elevFt')::numeric = 5341;
