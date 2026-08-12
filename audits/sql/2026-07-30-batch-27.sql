-- WA Alpine Audit — Pass 1, Batch 27 — 2026-07-30
-- Peaks: Mount Index (Northeast Buttress), Mount Johnson (Standard Route),
--        Mount Lago (South Slope-South Face), Mount Larrabee (South Ridge),
--        Mount Logan (Fremont Glacier, Banded Glacier/r1, Douglas Glacier/r2),
--        Mount Maude (North Face/r1)

-- =========================================================================
-- Mount Index
-- =========================================================================

-- wa_mount_index_northeast_buttress: waypoints/gpx for "Lake Serene
-- Trailhead" and "Lake Serene" both had longitudes ~0.24-0.25 deg (~19 km)
-- too far west of the real named points -- contradicted externally
-- (WTA/Trailforks/Wikipedia-GNIS) and by this same row's own
-- approach_logistics.trailheadLat/trailheadLng (47.80925, -121.57409),
-- which are correct. Fixed to match.
UPDATE routes
SET waypoints = '[
  {"lat":47.80925,"lng":-121.57409,"name":"Lake Serene Trailhead","type":"trailhead","distMi":0,"elevFt":600},
  {"lat":47.78182,"lng":-121.57038,"name":"Lake Serene","type":"landmark","distMi":3.6,"elevFt":2525}
]'::jsonb,
gpx = '[[47.80925,-121.57409],[47.78182,-121.57038]]'::jsonb
WHERE id = 'wa_mount_index_northeast_buttress';

-- wa_mount_index_northeast_buttress: rock_grade/grade_num stored "5.8"/8,
-- contradicting this same row's own `corrections` field (which explicitly
-- resolves the technical grade as "5.6-5.7") and its own `pitch_detail`
-- (crux pitches P10-12 listed as "5.6-5.7"). Fixed to match the row's own
-- resolved grade.
UPDATE routes SET rock_grade = '5.7', grade_num = 7
WHERE id = 'wa_mount_index_northeast_buttress';

-- =========================================================================
-- Mount Johnson
-- =========================================================================

-- wa_mount_johnson_standard: gain_ft/loss_ft stored 3150/3150, contradicting
-- this same row's own high_point_ft (7680) minus the trailhead waypoint
-- elevation (2500) = 5180, which also exactly matches the sum of every
-- consecutive waypoint elevation step in the row's own `waypoints` array.
-- Fixed to match the row's own waypoint data.
UPDATE routes SET gain_ft = 5180, loss_ft = 5180
WHERE id = 'wa_mount_johnson_standard';

-- wa_mount_johnson_standard: approach text gave Upper Royal Basin's
-- elevation as "~5,200 ft", contradicting the same sentence's own math
-- (Royal Lake 5,100 ft + the stated "500 ft" gain = 5,600 ft) and this same
-- row's own `waypoints` entry for "Upper Royal Basin" (elev 5600). Fixed
-- the outlier prose figure.
UPDATE routes SET approach = replace(
  approach,
  '~5,200 ft',
  '~5,600 ft'
) WHERE id = 'wa_mount_johnson_standard';

-- =========================================================================
-- Mount Lago
-- =========================================================================

-- areas.wa_mount_lago: elevation_ft stored 8748, contradicting this peak's
-- own route (wa_mount_lago_south_slope_south_face.high_point_ft = 8745) and
-- external sources (Wikipedia, Peakbagger, PeakVisor all give 8,745 ft; a
-- 2024 lidar re-survey gives 8,743 ft -- neither supports 8748). Fixed to
-- match the peak's own route data and the stronger external consensus.
UPDATE areas SET elevation_ft = 8745 WHERE id = 'wa_mount_lago';

-- wa_mount_lago_south_slope_south_face: approach_logistics named the
-- trailhead "Monument Creek Trailhead" at coordinates matching the real,
-- distinct Monument Creek Trailhead (Trail #484, per USFS/WTA) -- a
-- different drainage that does not lead toward Fred's Lake/Shellrock
-- Basin/Mount Lago. This directly contradicts this same row's own
-- `waypoints[0]` ("Robinson Creek Trailhead"), `approach` text ("From the
-- Robinson Creek Trailhead... via SR-20 and Lost River Road/Forest Road
-- 5400"), `road`, and `pitch_detail[0]`, which all agree the route starts
-- at Robinson Creek Trailhead. Fixed to match the row's own correct fields.
UPDATE routes
SET approach_logistics = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(approach_logistics, '{trailhead}', '"Robinson Creek Trailhead (Lost River Road / Forest Road 5400)"'::jsonb),
      '{trailheadLat}', '48.6617'::jsonb),
    '{trailheadLng}', '-120.54201'::jsonb),
  '{trailheadDirection}', '"From the Robinson Creek Trailhead off Lost River Road/Forest Road 5400 past Mazama"'::jsonb)
WHERE id = 'wa_mount_lago_south_slope_south_face';

-- =========================================================================
-- Mount Larrabee
-- =========================================================================

-- wa_mount_larrabee_south_ridge: waypoints[0] ("Twin Lakes Trailhead") held
-- coordinates and elevation byte-for-byte identical to waypoints[1] ("Twin
-- Lakes," distMi 2) -- internally impossible, since the row itself says
-- these are 2 road-miles apart. Wikipedia's Twin Lakes coordinates
-- (48.9512139, -121.6383778) confirm waypoint[1] is correct, and the row's
-- own beta text places the real trailhead (end of maintained FS-3065, i.e.
-- the Tomyhoi Lake/Yellow Aster Butte Trailhead) about 2 rough miles before
-- Twin Lakes -- externally sourced at approx. 48.9435, -121.6625, ~3,700 ft.
-- Fixed waypoint[0] to the real trailhead rather than the duplicated value.
UPDATE routes
SET waypoints = jsonb_set(
  jsonb_set(
    jsonb_set(waypoints, '{0,lat}', '48.9435'::jsonb),
    '{0,lng}', '-121.6625'::jsonb
  ),
  '{0,elev}', '3700'::jsonb
)
WHERE id = 'wa_mount_larrabee_south_ridge';

-- wa_mount_larrabee_south_ridge: approach_logistics.trailheadLat/Lng
-- (48.9526, -121.6358) were near-identical to the row's own "High Pass"
-- waypoint (48.9523, -121.6358) -- a different landmark 3.3 miles up the
-- route, not any trailhead. Fixed to the same real trailhead coordinates
-- used above.
UPDATE routes
SET approach_logistics = jsonb_set(
  jsonb_set(approach_logistics, '{trailheadLat}', '48.9435'::jsonb),
  '{trailheadLng}', '-121.6625'::jsonb
)
WHERE id = 'wa_mount_larrabee_south_ridge';

-- =========================================================================
-- Mount Logan
-- =========================================================================

-- wa_mount_logan_fremont_glacier: access.notes ended with "Mount Tom area,
-- North Cascades." -- boilerplate contamination from an unrelated peak's
-- record (this route's own area.name, overview, and both sibling Logan
-- routes' access.notes confirm this route is Mount Logan, never Mount Tom).
-- Removed the contaminated tail.
UPDATE routes SET access = jsonb_set(access, '{notes}',
  '"Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit."'::jsonb)
WHERE id = 'wa_mount_logan_fremont_glacier';

-- wa_mount_logan_r1 (Banded Glacier): approach and approach_logistics
-- described an Easy Pass/Fisher Basin approach and a "Rainy Pass PCT North
-- Trailhead" start -- but this route's real approach (per Beckey's Cascade
-- Alpine Guide via Mountaineers.org and an independent trip report) is
-- Thunder Creek Trail + Fisher Creek Trail from Colonial Creek Campground.
-- This is corroborated in-row: the stored GPX track starts at
-- 48.685,-121.093 (matching the Thunder Creek trailhead, not Easy Pass) and
-- tracks almost identically to sibling route wa_mount_logan_fremont_glacier
-- 's own Thunder Creek GPX. Fixed the top-level approach summary and
-- trailhead fields to match the row's own GPX/beckey-sourced reality.
-- NOTE: `beta`, `descent_text`, `road`, `access.closures`, `itinerary`,
-- `pitch_detail`, `seasonal_guidance`, `partner_requirements`, and
-- `data_quality` on this row still describe the wrong Easy Pass/Fisher
-- Basin approach and were NOT rewritten here -- correcting a multi-day
-- itinerary/pitch-by-pitch narrative with fabricated mileage/timing would
-- itself be a fabrication risk. Left for a human enrichment pass; see audit
-- log.
UPDATE routes SET approach =
  'Follow Thunder Creek Trail from Colonial Creek Campground (SR-20 MP130) about 9 miles to the Fisher Creek Trail junction, then Fisher Creek Trail about 3 miles to a lake camp near 5,160 ft below the Banded Glacier.'
WHERE id = 'wa_mount_logan_r1';

UPDATE routes SET approach_logistics =
  jsonb_set(jsonb_set(jsonb_set(approach_logistics,
    '{trailhead}', '"Thunder Creek Trailhead (Colonial Creek Campground)"'::jsonb),
    '{trailheadLat}', '48.6855'::jsonb), '{trailheadLng}', '-121.0925'::jsonb)
WHERE id = 'wa_mount_logan_r1';

-- =========================================================================
-- Mount Maude
-- =========================================================================

-- wa_mount_maude_r1 (North Face): length_m (533, ~1,750 ft) and a line in
-- `overview` ("rises about 1,000 vertical feet") both undercount this
-- route's true scale by roughly 2.5-4x. AAC Publications' account of the
-- 1957 FA and independent route-beta summaries describe "the 4,000-foot
-- wall on the north side of Mount Maude" -- corroborated in-row by this
-- peak's own area.blurb (wa_mount_maude), which already independently
-- states "the 4,000-foot North Face." Fixed to match.
UPDATE routes SET length_m = 1219
WHERE id = 'wa_mount_maude_r1';

UPDATE routes SET overview = replace(
  overview,
  'rises about 1,000 vertical feet',
  'rises roughly 4,000 vertical feet'
) WHERE id = 'wa_mount_maude_r1';

-- =========================================================================
-- Verify afterward:
-- =========================================================================
select id, waypoints, gpx, rock_grade, grade_num from routes where id = 'wa_mount_index_northeast_buttress';
select id, gain_ft, loss_ft, approach from routes where id = 'wa_mount_johnson_standard';
select id, elevation_ft from areas where id = 'wa_mount_lago';
select id, approach_logistics from routes where id = 'wa_mount_lago_south_slope_south_face';
select id, waypoints, approach_logistics from routes where id = 'wa_mount_larrabee_south_ridge';
select id, access from routes where id = 'wa_mount_logan_fremont_glacier';
select id, approach, approach_logistics from routes where id = 'wa_mount_logan_r1';
select id, length_m, overview from routes where id = 'wa_mount_maude_r1';
