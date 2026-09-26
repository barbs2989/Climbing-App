-- WA alpine audit -- batch 157 (2026-08-27, pass 3)
-- Routes: wa_northeast_ridge_1963_route, wa_northwest_arete, wa_northwest_buttress,
-- wa_northwest_face_2, wa_northwest_face_4, wa_northwest_face_boving_pollock,
-- wa_northwest_mox_peak_standard, wa_northwest_ridge.
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention. Apply each UPDATE individually rather than
-- pasting the whole file at once.

-- =========================================================================
-- Johannesburg Mountain -- Northeast Ridge (1963 Route), wa_northeast_ridge_1963_route
-- =========================================================================

-- Summit waypoint (index 5) reads 8066/8066 (elev/elevFt) against this same
-- row's own high_point_ft (8200) and the parent area's elevation_ft (8200,
-- areas.wa_johannesburg_mountain). Externally corroborated: ListsOfJohn
-- gives 8,212 ft, PeakVisor gives 2,505 m (8,218 ft); no source found gives
-- anything near 8,066. Bringing the outlying waypoint into agreement with
-- the two figures already on file plus the external cluster around
-- 8,200-8,218 ft.
UPDATE routes
SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{5,elev}', '8200'),
  '{5,elevFt}', '8200'
)
WHERE id = 'wa_northeast_ridge_1963_route'
  AND waypoints->5->>'name' = 'Johannesburg Mountain'
  AND (waypoints->5->>'elev')::numeric = 8066
  AND (waypoints->5->>'elevFt')::numeric = 8066;

-- road names the wrong trailhead. This route's own waypoints[0] and
-- approach_logistics.trailhead both correctly name the "Cascade Pass
-- Trailhead" (the literal end of Cascade River Road, ~23 mi from
-- Marblemount) as this route's start -- but road.name/status instead
-- describe arrival at the "Boston Basin trailhead" / "Boston Basin
-- pulloff", a separate, earlier trailhead on the same road (~mile 21,
-- serving Forbidden Peak/Sharkfin Tower, per this row's own bivy entries)
-- that this route does not use. Re-homed to the trailhead this row's own
-- data already names. Also folded in a current, externally-verified access
-- fact not previously on file: per NPS (nps.gov/noca "Cascade River Road
-- Closure at Eldorado Creek" and NPS road-conditions page, checked
-- 2026-08-27), the road is presently gated to vehicles at Eldorado Creek
-- (mile 20) due to 2025-26 flood/landslide damage, with the final ~3 miles
-- / 1,500 vertical ft to Cascade Pass Trailhead open to bikes/pedestrians
-- only -- this directly affects reaching this route's own trailhead, so it
-- is noted with a "confirm before driving" hedge rather than stated as
-- permanent, consistent with the road's already-existing seasonalGate note
-- and with the general washout/closure history road.status already flagged.
UPDATE routes
SET road = jsonb_set(
  jsonb_set(
    road,
    '{name}',
    '"Cascade River Road (from Marblemount) to Cascade Pass Trailhead"'
  ),
  '{status}',
  '"Paved for the first ~10 miles from Marblemount, then gravel with potholes and washboard, and high-clearance is recommended for the upper miles. As of 2026 the road is gated to vehicles at Eldorado Creek (mile 20) due to flood/landslide damage -- bikes and pedestrians are permitted past the gate, adding roughly 3 miles and 1,500 vertical ft on foot/bike to reach the actual Cascade Pass Trailhead at the road end. Confirm the current gate location with NPS before a trip."'
)
WHERE id = 'wa_northeast_ridge_1963_route'
  AND road->>'name' = 'Cascade River Road (from Marblemount) to Boston Basin trailhead';

-- =========================================================================
-- Sloan Peak -- Northwest Buttress, wa_northwest_buttress
-- =========================================================================

-- access.land_manager and access.rules both name "Glacier Peak Wilderness",
-- contradicting every other wilderness-designation field on this same row
-- (access.landManager, access.permitZone, access._raw.wilderness_zone all
-- correctly say "Henry M. Jackson Wilderness (103,297 acres)"). Sloan Peak
-- sits in the Henry M. Jackson Wilderness, confirmed via USFS (Sloan Peak
-- Trailhead / Trail 648 recreation pages) and Wikipedia's Henry M. Jackson
-- Wilderness article; Glacier Peak Wilderness is a separate designation
-- entirely, accessed from a different trailhead system (Suiattle River
-- Road/FSR 26) well to the northeast. access.closures/seasonal also names
-- "Suiattle River Road (FSR 26), the primary Glacier Peak access" -- an
-- access road this Sloan Peak route (Bedal Creek Trailhead via FR-4096, per
-- this row's own road field) does not use at all. Corrected both fields to
-- match the wilderness this row's own other fields, and the external
-- sources, already establish; dropped the irrelevant Suiattle River Road
-- clause rather than inventing a Sloan-specific replacement, keeping the
-- Mountain Loop Highway seasonal-gate sentence that already correctly
-- applies here (and is corroborated by this row's own road.seasonalGate).
UPDATE routes
SET access = jsonb_set(
  jsonb_set(
    jsonb_set(
      access,
      '{land_manager}',
      '"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District) — Henry M. Jackson Wilderness"'
    ),
    '{rules}',
    '"Group size capped at 12 (people + stock combined) in Henry M. Jackson Wilderness, and larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft."'
  ),
  '{seasonal}',
  '"Mountain Loop Highway has a seasonal gate closure (Deer Creek–Bedal, ~14 mi), typically Nov–mid/late May."'
)
WHERE id = 'wa_northwest_buttress'
  AND access->>'land_manager' = 'Mt. Baker-Snoqualmie National Forest (Darrington Ranger District) — Glacier Peak Wilderness'
  AND access->>'rules' LIKE '%in Glacier Peak Wilderness%'
  AND access->>'seasonal' LIKE '%Suiattle River Road%';

-- =========================================================================
-- Kangaroo Temple -- Northwest Face, wa_northwest_face_2
-- =========================================================================

-- Summit waypoint (index 1) reads elev=7238 against this same row's own
-- high_point_ft (7572) and the parent area's elevation_ft (7572, areas.
-- wa_kangaroo_temple). Externally corroborated at 7,572 ft (multiple
-- sources incl. Wikipedia's "The Temple (Washington)" article and
-- SummitPost). Bringing the outlying waypoint into agreement.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elev}', '7572')
WHERE id = 'wa_northwest_face_2'
  AND waypoints->1->>'name' = 'Kangaroo Temple'
  AND (waypoints->1->>'elev')::numeric = 7238;

-- =========================================================================
-- Northwest Mox Peak -- Standard Route / Northwest Spire, wa_northwest_mox_peak_standard
-- =========================================================================

-- access.seasonal describes "Cascade River Road" washout/closure history --
-- a road entirely unrelated to this route, which is approached from British
-- Columbia via Chilliwack Lake Road/Depot Creek Road (per this same row's
-- own road.name/driveNote and access.closures fields, which already
-- correctly describe Depot Creek Road washouts). Cascade River Road serves
-- the Cascade Pass/Eldorado/Boston Basin area on the opposite (south) side
-- of the North Cascades and does not reach this peak at all. Re-homed to
-- describe this row's own access road, consistent with the correct
-- road.seasonalGate field already on file ("Seasonal snow and brush limit
-- the approach window; the road has also seen periodic washouts/
-- landslides").
UPDATE routes
SET access = jsonb_set(
  access,
  '{seasonal}',
  '"Depot Creek Road (the BC access road for this approach) is subject to seasonal snow and brush limiting the window, and has a history of washouts/landslides -- check current conditions before a trip."'
)
WHERE id = 'wa_northwest_mox_peak_standard'
  AND access->>'seasonal' = 'Cascade River Road (the access road for these trailheads) has a history of washouts/closures — check current NPS road-conditions page each season.';

-- verify: each of the five UPDATEs above should now read the corrected value
SELECT id, waypoints->5 FROM routes WHERE id = 'wa_northeast_ridge_1963_route';
SELECT id, road FROM routes WHERE id = 'wa_northeast_ridge_1963_route';
SELECT id, access->'land_manager', access->'rules', access->'seasonal' FROM routes WHERE id = 'wa_northwest_buttress';
SELECT id, waypoints->1 FROM routes WHERE id = 'wa_northwest_face_2';
SELECT id, access->'seasonal' FROM routes WHERE id = 'wa_northwest_mox_peak_standard';
