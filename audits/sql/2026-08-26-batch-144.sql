-- Batch 144 (pass 3, 2026-08-26)
-- Routes: Mount Constance (Terrible Traverse, West Arete), Mount Crowder (Northeast Ridge,
-- Southwest Route), Mount Cruiser (South Corner, NW Face/Corner), Mount Custer (Standard),
-- Mount Daniel (Daniel Glacier / Southeast Slopes).
--
-- NOTE: this exact batch of 8 routes was already audited in pass 2 (see
-- audits/sql/2026-08-08-batch-80.sql and the "Batch 80" log entry). All five fixes drafted
-- there are STILL live/uncorrected in the database 18 days later -- confirmed by direct
-- read today, and independently re-verified against fresh sources below rather than just
-- re-trusting the earlier batch's citations. This file restates those five fixes (still
-- accurate and still needed) plus a sixth for wa_mount_cruiser_nw_face_corner's
-- access.closures, which was also drafted in batch 80 but is unapplied. Recommend
-- reviewing/merging audits/sql/2026-08-08-batch-80.sql (or this file, which supersedes it
-- with today's re-confirmation) rather than letting a third pass re-find the same six items.
--
-- One correction from batch 80: wa_mount_cruiser_south_corner's road.status has, in fact,
-- been updated to "Open -- FS-24 reopened 8 July 2026..." since batch 80 -- that one part
-- of the earlier fix did take. Its sibling route's road.status and access.closures did not,
-- so only wa_mount_cruiser_nw_face_corner needs the road-status/closures fix below.

-- wa_mount_constance_west_arete: gear array calls the rock "granite" ("Full set of
-- nuts/stoppers -- this granite takes them well"), contradicting this same row's own
-- descent_text ("Given the pillow-basalt rock..."). Re-confirmed today: WA DNR and NPS
-- geology sources agree Mount Constance is Eocene pillow basalt of the Crescent Formation,
-- not granite (dnr.wa.gov/washington-geological-survey, nps.gov/articles/000/pillow-basalts.htm).
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

-- wa_mount_crowder (area): lat/lng (48.7976266, -121.352631) is a ~50m outlier against the
-- published summit coordinate. Re-confirmed today via Wikipedia (Mount_Crowder_(Washington)):
-- 48°47'52"N 121°21'07"W = 48.7977, -121.3519 -- matching this peak's own
-- wa_mount_crowder_northeast_ridge route, whose summit waypoint already stores
-- 48.79778/-121.35194 (rounds to the same value). Two different coordinate sources appear to
-- have been mixed into the area row and both routes' approach_logistics.
UPDATE areas
SET lat = 48.7977056, lng = -121.3519083
WHERE id = 'wa_mount_crowder' AND lat = 48.7976266 AND lng = -121.352631;

-- wa_mount_crowder_southwest_route: approach_logistics.peakLat/peakLng carries the same
-- uncorroborated coordinate as the area row above.
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

-- wa_mount_cruiser_nw_face_corner: road.status still says "Closed as of 2026 due to the Bear
-- Gulch Fire closure order (FR 24 gated near milepost 10.5-14.5...)", contradicting this
-- route's own sibling wa_mount_cruiser_south_corner (same trailhead, same road), whose
-- road.status already correctly says the road reopened. Re-confirmed today via WebSearch
-- against fs.usda.gov/r06/olympic (Bear Gulch Fire page) and prior reporting: FS-24 and the
-- Staircase entrance reopened July 8, 2026 and remain open as of this audit (2026-08-26) --
-- only FS-2451 and the Copper Creek Trail remain closed, neither of which this route uses.
UPDATE routes
SET road = jsonb_set(road, '{status}',
  '"FR 24 and the Staircase entrance reopened July 8, 2026 after the 2025 Bear Gulch Fire closure order, and remain open as of Aug 2026; conditions in the burn scar can still change, so verify current status before driving out."')
WHERE id = 'wa_mount_cruiser_nw_face_corner'
  AND road->>'status' LIKE 'Closed as of 2026 due to the Bear Gulch Fire closure order%';

-- wa_mount_cruiser_nw_face_corner: access.closures separately claims Lake Cushman Rd/FR-24 and
-- the Staircase entrance are closed "through at least Oct 1, 2026" -- same stale claim as the
-- road field above. Flapjack Lakes Trail/Gladys Divide (this route's actual approach trail) are
-- left marked closed below, since WebSearch today (AllTrails/WTA) still shows the Gladys Divide
-- Primitive Trail closed for Bear Gulch Fire burn-scar recovery with no reopening date.
UPDATE routes
SET access = jsonb_set(access, '{closures}',
  '"Staircase entrance, the Rapids Loop Trail, campground, and the Mildred Lakes trailhead/trail reopened July 8, 2026 after the 2025 Bear Gulch Fire closure and remain open as of Aug 2026. Flapjack Lakes Trail and Gladys Divide, this route''s actual approach, remain closed for burn-scar trail rehabilitation as of this writing -- verify current status with Olympic National Forest/NPS before planning a trip."')
WHERE id = 'wa_mount_cruiser_nw_face_corner'
  AND access->>'closures' LIKE 'IMPORTANT (current as of mid-2026)%';

-- wa_mount_daniel (area): prominence_ft (3508) does not match any source found. Re-confirmed
-- today via WebSearch (Wikipedia/Peakbagger-derived summaries): Mount Daniel's prominence is
-- consistently given as 3,480 ft.
UPDATE areas
SET prominence_ft = 3480
WHERE id = 'wa_mount_daniel' AND prominence_ft = 3508;

-- wa_mount_daniel_daniel_glacier: max_angle (56) contradicts The Mountaineers' own route page
-- for this named route. Re-confirmed today: mountaineers.org/activities/routes-places/
-- mount-daniel-daniel-glacier describes it as "Grade II with 35 degrees snow and/or ice", and
-- this row's own beta field matches that page's route description almost verbatim.
UPDATE routes
SET max_angle = 35
WHERE id = 'wa_mount_daniel_daniel_glacier' AND max_angle = 56;
