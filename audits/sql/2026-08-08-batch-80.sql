-- Batch 80 (pass 2, 2026-08-08)
-- Routes: Mount Constance (Terrible Traverse, West Arete), Mount Crowder (Northeast Ridge,
-- Southwest Route), Mount Cruiser (South Corner, NW Face/Corner), Mount Custer (Standard),
-- Mount Daniel (Daniel Glacier / Southeast Slopes).
-- Researched via 5 parallel agents grouped by peak.

-- wa_mount_constance_west_arete: gear array called the rock "granite" ("Full set of
-- nuts/stoppers -- this granite takes them well"), contradicting this same row's own
-- descent_text ("Given the pillow-basalt rock, a helmet and careful hand-testing matter
-- more...") and confirmed externally (NPS/WA DNR geology: Mount Constance is Eocene pillow
-- basalt of the Crescent Formation, not granite).
UPDATE routes
SET gear = (
  SELECT jsonb_agg(
    CASE WHEN elem = '"Full set of nuts/stoppers — this granite takes them well"'::jsonb
      THEN '"Full set of nuts/stoppers — this basalt takes them well"'::jsonb
      ELSE elem
    END
  )
  FROM jsonb_array_elements(gear) AS elem
)
WHERE id = 'wa_mount_constance_west_arete'
  AND gear @> '["Full set of nuts/stoppers — this granite takes them well"]'::jsonb;

-- wa_mount_crowder (area): lat/lng (48.7976266, -121.352631) was a ~35m outlier against
-- Wikipedia/Peakbagger's published summit coordinate (48.7977056, -121.3519083) -- which this
-- peak's own wa_mount_crowder_southwest_route already stores verbatim in its own summit
-- waypoint. Two different coordinate sources appear to have been mixed into the same peak
-- record; the area row and both routes' approach_logistics used the uncorroborated value.
UPDATE areas
SET lat = 48.7977056, lng = -121.3519083
WHERE id = 'wa_mount_crowder' AND lat = 48.7976266 AND lng = -121.352631;

-- wa_mount_crowder_southwest_route: approach_logistics.peakLat/peakLng carried the same
-- uncorroborated coordinate as the area row above -- fixed to match the authoritative value
-- already present in this same route's own summit waypoint.
UPDATE routes
SET approach_logistics = jsonb_set(
  jsonb_set(approach_logistics, '{peakLat}', '48.7977056'),
  '{peakLng}', '-121.3519083'
)
WHERE id = 'wa_mount_crowder_southwest_route'
  AND approach_logistics->>'peakLat' = '48.7976266';

-- wa_mount_crowder_northeast_ridge: same approach_logistics coordinate fix as its sibling
-- route above (this route's own summit waypoint, 48.79778/-121.35194, already rounds to the
-- corrected value, not the outlier).
UPDATE routes
SET approach_logistics = jsonb_set(
  jsonb_set(approach_logistics, '{peakLat}', '48.7977056'),
  '{peakLng}', '-121.3519083'
)
WHERE id = 'wa_mount_crowder_northeast_ridge'
  AND approach_logistics->>'peakLat' = '48.7976266';

-- wa_mount_cruiser_south_corner: road.status still described FR-24/Staircase as closed under
-- the 2025 Bear Gulch Fire closure order. Confirmed via NPS news release ("Staircase
-- Developed Area to Reopen July 8 After Year-Long Closure") and Shelton-Mason County Journal
-- reporting (2026-07-09, 2026-07-16) that FR-24 and the Staircase entrance reopened July 8,
-- 2026 -- stale by a month as of this audit (2026-08-08).
UPDATE routes
SET road = jsonb_set(road, '{status}',
  '"FR 24 and the Staircase entrance reopened July 8, 2026 after the 2025 Bear Gulch Fire closure order, conditions in the burn scar can still change, so verify current status before driving out."')
WHERE id = 'wa_mount_cruiser_south_corner'
  AND road->>'status' LIKE 'Closed as of 2026 due to the Bear Gulch Fire closure order%';

-- wa_mount_cruiser_nw_face_corner: identical stale road.status as its sibling route above --
-- same fix.
UPDATE routes
SET road = jsonb_set(road, '{status}',
  '"FR 24 and the Staircase entrance reopened July 8, 2026 after the 2025 Bear Gulch Fire closure order, conditions in the burn scar can still change, so verify current status before driving out."')
WHERE id = 'wa_mount_cruiser_nw_face_corner'
  AND road->>'status' LIKE 'Closed as of 2026 due to the Bear Gulch Fire closure order%';

-- wa_mount_cruiser_nw_face_corner: access.closures claimed the Staircase entrance and Mildred
-- Lakes Trail were still closed "through at least Oct 1, 2026" -- also stale per the same July
-- 8, 2026 reopening. Flapjack Lakes Trail/Gladys Divide (this route's actual approach) remain
-- closed for burn-scar trail rehab per the most recent USFS alerts found, so that part is left
-- in place rather than cleared.
UPDATE routes
SET access = jsonb_set(access, '{closures}',
  '"Staircase entrance, the Rapids Loop Trail, campground, and the Mildred Lakes trailhead/trail reopened July 8, 2026 after the 2025 Bear Gulch Fire closure. Flapjack Lakes Trail and Gladys Divide, this route''s actual approach, remain closed for burn-scar trail rehabilitation as of this writing, verify current status with Olympic National Forest/NPS before planning a trip."')
WHERE id = 'wa_mount_cruiser_nw_face_corner'
  AND access->>'closures' LIKE 'IMPORTANT (current as of mid-2026)%';

-- wa_mount_daniel (area): prominence_ft (3508) did not match any source found -- Wikipedia,
-- Peakbagger, and PeakVisor all consistently give 3,480 ft.
UPDATE areas
SET prominence_ft = 3480
WHERE id = 'wa_mount_daniel' AND prominence_ft = 3508;

-- wa_mount_daniel_daniel_glacier: max_angle (56) contradicted The Mountaineers' own route page
-- for this named route ("Mount Daniel/Daniel Glacier... Grade II with 35 degrees snow and/or
-- ice"), whose route description text matches this row's own beta field almost verbatim,
-- confirming it describes this exact line.
UPDATE routes
SET max_angle = 35
WHERE id = 'wa_mount_daniel_daniel_glacier' AND max_angle = 56;
