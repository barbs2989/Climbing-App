-- WA alpine route audit -- batch 41 (pass 1)
-- Peaks checked: Sherpa Balanced Rock, Mount Stuart (Sherpa Glacier), Sherpa Peak (East/
-- North/West Ridges), Silver Star Mountain, Sinister Peak, Sitkum Spire.
-- See audits/wa-alpine-audit-log.md for the full writeup of this batch, including items
-- flagged for human review that are NOT included in this file.

-- ------------------------------------------------------- Sherpa Balanced Rock elevation
-- Both the route's own high_point_ft (8605) and the parent area's elevation_ft (8605)
-- disagreed with the SAME route's own waypoint ("Sherpa Peak / Balanced Rock summit",
-- elevFt 8630). 8605 is an older USGS-quad-era figure; 8630 is the modern consensus
-- (Wikipedia, SummitPost) and matches the already-correct wa_sherpa_peak area row and
-- both of Sherpa Peak's East/West Ridge summit waypoints -- the Balanced Rock obelisk
-- sits only ~2 ft below Sherpa's true summit per this area's own blurb, so treating them
-- as equal at typical GPS/waypoint precision is reasonable and resolves the self-contradiction.
UPDATE routes
SET high_point_ft = 8630,
    corrections = COALESCE(corrections, '') || ' 2026-07-31: high_point_ft corrected from 8605 (stale USGS-quad figure) to 8630, matching this route''s own summit waypoint and the modern consensus elevation for Sherpa Peak.'
WHERE id = 'wa_sherpa_balanced_rock_ne_couloir'
  AND high_point_ft = 8605;

UPDATE areas
SET elevation_ft = 8630
WHERE id = 'wa_sherpa_balanced_rock'
  AND elevation_ft = 8605;

-- expect: 1 row updated each
SELECT id, high_point_ft FROM routes WHERE id = 'wa_sherpa_balanced_rock_ne_couloir';
SELECT id, elevation_ft FROM areas WHERE id = 'wa_sherpa_balanced_rock';

-- ---------------------------------------------------------- Sherpa Glacier (access.notes)
-- access.notes carried a trailing "Mount Tom area, North Cascades" clause. Mount Tom is an
-- unrelated peak in the Olympic Mountains, nowhere near Mount Stuart/the Stuart Range --
-- the same cross-route contamination pattern already fixed on Ruth Mountain in batch 40.
UPDATE routes
SET access = jsonb_set(access, '{notes}', to_jsonb(replace(access->>'notes', ' Mount Tom area, North Cascades.', '')), false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: access.notes trimmed -- removed a trailing "Mount Tom area, North Cascades" clause describing an unrelated Olympic Mountains peak, not Mount Stuart.'
WHERE id = 'wa_sherpa_glacier'
  AND access->>'notes' LIKE '%Mount Tom area, North Cascades.';

-- expect: 1 row updated
SELECT id, access->'notes' AS notes FROM routes WHERE id = 'wa_sherpa_glacier';

-- --------------------------------------------------- Sherpa Glacier summit-ridge grade
-- grade/grade_num/rock_grade said "4th"/4/"Class 4", contradicting this route's own overview
-- text ("simple class-3 ridge scrambling to the summit") and SummitPost's description of the
-- same final ridge section as class 3.
UPDATE routes
SET grade = '3rd',
    grade_num = 3,
    rock_grade = 'Class 3',
    corrections = COALESCE(corrections, '') || ' 2026-07-31: grade/grade_num/rock_grade corrected from Class 4 to Class 3 for the summit ridge scramble, matching this route''s own overview text and SummitPost.'
WHERE id = 'wa_sherpa_glacier'
  AND grade = '4th' AND grade_num = 4 AND rock_grade = 'Class 4';

-- expect: 1 row updated
SELECT id, grade, grade_num, rock_grade FROM routes WHERE id = 'wa_sherpa_glacier';

-- --------------------------------------------------------------- Sherpa Glacier dist_km
-- dist_km (43.45 km) converts to exactly 27.00 mi -- but this row's own
-- partner_requirements.fitnessSpec already states "~27 mi / 6,000 ft gain car-to-car
-- logged" as the ROUND-TRIP figure. Per this app's distKm*2-for-round-trip display
-- convention, storing the already-round-trip mileage as if it were one-way doubles the
-- displayed round trip to 54 mi. Corrected to the one-way value (27 mi / 2 = 13.5 mi =
-- 21.73 km) so the display convention reproduces this row's own stated 27 mi round trip.
-- This is a single-row fix backed by an internal numeric match, not a bulk conversion --
-- see CLAUDE.md's standing caution against normalizing dist_km across the table.
UPDATE routes
SET dist_km = 21.73,
    corrections = COALESCE(corrections, '') || ' 2026-07-31: dist_km corrected from 43.45 (an exact km conversion of this row''s own 27-mi round-trip fitness spec, mistakenly stored as one-way) to 21.73, the one-way value that reproduces 27 mi round trip under this app''s distKm*2 display convention.'
WHERE id = 'wa_sherpa_glacier'
  AND dist_km = 43.45;

-- expect: 1 row updated
SELECT id, dist_km FROM routes WHERE id = 'wa_sherpa_glacier';

-- ------------------------------------------------- Sherpa Peak North Ridge summit waypoint
-- Summit waypoint elevFt (8635) disagreed with this route's own high_point_ft (8630), the
-- wa_sherpa_peak area row (8630), and both sibling routes' summit waypoints (8630 each).
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '8630', false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: summit waypoint elevFt corrected from 8635 to 8630, matching this route''s own high_point_ft, the area row, and both sibling routes'' summit waypoints.'
WHERE id = 'wa_sherpa_peak_north_ridge'
  AND waypoints->1->>'name' = 'Sherpa Peak Summit'
  AND (waypoints->1->>'elevFt')::int = 8635;

-- expect: 1 row updated
SELECT id, waypoints->1 AS summit_waypoint FROM routes WHERE id = 'wa_sherpa_peak_north_ridge';

-- ------------------------------------------------------- Sherpa Peak West Ridge gain_ft
-- gain_ft (7400) contradicted loss_ft (4330) on what this route's own descent_text
-- describes as a true out-and-back (reverse the ridge, then the same Longs Pass approach
-- back to the trailhead) -- gain should equal loss. The route's own itinerary.totalNote
-- ("~4,300 ft gain total") and trailhead(4243 ft)-to-summit(8630 ft) arithmetic both land
-- close to loss_ft's existing 4330, so gain_ft is corrected to match rather than loss_ft.
UPDATE routes
SET gain_ft = 4330,
    corrections = COALESCE(corrections, '') || ' 2026-07-31: gain_ft corrected from 7400 to 4330 to match loss_ft on this out-and-back route, consistent with this row''s own itinerary.totalNote ("~4,300 ft gain total") and trailhead-to-summit elevation difference.'
WHERE id = 'wa_sherpa_peak_west_ridge'
  AND gain_ft = 7400 AND loss_ft = 4330;

-- expect: 1 row updated
SELECT id, gain_ft, loss_ft FROM routes WHERE id = 'wa_sherpa_peak_west_ridge';

-- --------------------------------------------------------- Silver Star Glacier comms
-- comms labeled the real Okanogan County non-emergency dispatch number (509-422-7232) as
-- "Skagit County Sheriff Dispatch". Silver Star Mountain sits in Okanogan County (Methow
-- Valley Ranger District); 509-422-7232 is independently confirmed as Okanogan County's own
-- non-emergency line (okanogancounty.org), and this same route's own emergency block
-- elsewhere already cites the correct county. A genuine Skagit County number would carry a
-- 360 area code, not 509.
UPDATE routes
SET comms = replace(comms, 'Skagit County Sheriff Dispatch', 'Okanogan County Sheriff Dispatch'),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: comms corrected -- the 509-422-7232 non-emergency number was mislabeled "Skagit County Sheriff Dispatch"; it is Okanogan County''s own dispatch line (matches this route''s own emergency.county/sheriffDispatch fields).'
WHERE id = 'wa_silver_star_glacier'
  AND comms LIKE '%Skagit County Sheriff Dispatch%';

-- expect: 1 row updated
SELECT id, comms FROM routes WHERE id = 'wa_silver_star_glacier';

-- ----------------------------------------------------------- Silver Star Glacier FA
-- fa credited "Fred Beckey, Joe Hieb, Herb Staley, Don Wilde (May 31, 1952)" to this route,
-- which targets the true EAST summit (8,876 ft). Multiple sources place that same 1952
-- party's ascent on the WEST summit (~8,840 ft) via the glacier's northeast side -- the
-- ascent already (and more appropriately) credited on the sibling wa_silver_star_ne_ridge
-- route. This route's own overview text states the east summit's actual FA was Wernstedt in
-- 1926, "though from the south side rather than this now-standard north-glacier line" --
-- i.e. no source establishes a specific FA party for this exact north-glacier line to the
-- east summit. Clearing the field rather than guessing a replacement.
UPDATE routes
SET fa = NULL,
    corrections = COALESCE(corrections, '') || ' 2026-07-31: fa cleared -- credited the 1952 Beckey/Hieb/Staley/Wilde ascent, which multiple sources place on Silver Star''s WEST summit (already credited on the sibling wa_silver_star_ne_ridge route), not this route''s east-summit line. No source found for who first climbed this specific north-glacier line to the true summit.'
WHERE id = 'wa_silver_star_glacier'
  AND fa = 'Fred Beckey, Joe Hieb, Herb Staley, Don Wilde (May 31, 1952)';

-- expect: 1 row updated
SELECT id, fa FROM routes WHERE id = 'wa_silver_star_glacier';

-- ------------------------------------------- Sinister Peak, both routes: Downey Creek TH
-- Both routes' own approach prose gives the Downey Creek Trailhead as "~1,450 ft", matching
-- the real USFS figure, but each route's own waypoint gave a different number (North Face:
-- 1440; Southwest Route: 1400) -- neither matches the other or their shared prose.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elevFt}', '1450', false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: Downey Creek Trailhead waypoint elevFt corrected from 1440 to 1450, matching this route''s own approach text and the USFS figure.'
WHERE id = 'wa_sinister_peak_north_face'
  AND waypoints->0->>'name' = 'Downey Creek Trailhead'
  AND (waypoints->0->>'elevFt')::int = 1440;

UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '1450', false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: Downey Creek Trailhead waypoint elev corrected from 1400 to 1450, matching this route''s own approach text and the USFS figure.'
WHERE id = 'wa_sinister_peak_southwest_route'
  AND waypoints->0->>'name' = 'Downey Creek Trailhead'
  AND (waypoints->0->>'elev')::int = 1400;

-- expect: 1 row updated each
SELECT id, waypoints->0 AS trailhead_waypoint FROM routes WHERE id = 'wa_sinister_peak_north_face';
SELECT id, waypoints->0 AS trailhead_waypoint FROM routes WHERE id = 'wa_sinister_peak_southwest_route';

-- --------------------------------------------- Sinister Peak North Face summit elevation
-- high_point_ft and the summit waypoint both said 8440; the area row and the sibling
-- Southwest Route's own summit waypoint both say 8444 (matching ListsOfJohn). Normalizing
-- this route to the same, more-precise figure already used elsewhere in this peak's data.
UPDATE routes
SET high_point_ft = 8444,
    waypoints = jsonb_set(waypoints, '{1,elevFt}', '8444', false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: high_point_ft and summit waypoint elevFt corrected from 8440 to 8444, matching the area row and the sibling Southwest Route''s summit waypoint.'
WHERE id = 'wa_sinister_peak_north_face'
  AND high_point_ft = 8440;

-- expect: 1 row updated
SELECT id, high_point_ft, waypoints->1 AS summit_waypoint FROM routes WHERE id = 'wa_sinister_peak_north_face';

-- --------------------------------------------------- Sitkum Spire White Chuck Trailhead
-- Trailhead waypoint elev (1600) disagreed with this same route's own approach and
-- approach_logistics.trailheadDirection text (both "~2,300 ft"), which independently
-- matches a WTA trip report for this trailhead.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '2300', false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: White Chuck River Trailhead waypoint elev corrected from 1600 to 2300, matching this route''s own approach/approach_logistics text and WTA.'
WHERE id = 'wa_sitkum_spire_standard'
  AND waypoints->0->>'name' = 'White Chuck River Trailhead'
  AND (waypoints->0->>'elev')::int = 1600;

-- expect: 1 row updated
SELECT id, waypoints->0 AS trailhead_waypoint FROM routes WHERE id = 'wa_sitkum_spire_standard';

-- --------------------------------------------- Sherpa Peak East Ridge waypoint/gpx order
-- The corrected Esmeralda Basin/Ingalls Way Trailhead waypoint (fixed in an earlier pass,
-- per its own note) sits at array index 3 -- AFTER "East end of ridge" (7,800 ft, index 2)
-- and BEFORE the summit -- instead of first, and is missing distMi (every sibling waypoint
-- has one). Because this route's gpx track is built directly from this same ordered list,
-- the rendered path currently climbs to 7,800 ft, drops back to the 3,500 ft trailhead, then
-- jumps to the 8,630 ft summit. Reordered to Trailhead -> Long's Pass -> Stuart basin bivy ->
-- East end of ridge -> Summit (distMi 0 added to the trailhead); no coordinates changed.
UPDATE routes
SET waypoints = '[
      {"lat": 47.4366, "lng": -120.937, "name": "Esmeralda Basin / Ingalls Way Trailhead (North Fork Teanaway Rd, FR-9737) via Longs Pass", "note": "Shared trailhead for Longs Pass Trail and Esmeralda Basin/Ingalls Way Trail; route drops from Longs Pass into Ingalls Creek drainage before climbing to Sherpa''s east basin. Existing DB coordinate (47.4569,-120.9389) is ~2-2.5km north of this real trailhead location.", "type": "Trailhead", "elevFt": 3500, "distMi": 0},
      {"lat": 47.4561, "lng": -120.9136, "name": "Long''s Pass", "type": "Junction", "distMi": 2.5, "elevFt": 6250},
      {"lat": 47.465, "lng": -120.895, "name": "Stuart basin bivy", "type": "Campsite", "distMi": 4.5, "elevFt": 6300},
      {"lat": 47.4718, "lng": -120.8855, "name": "East end of ridge", "type": "Junction", "distMi": 5.6, "elevFt": 7800},
      {"lat": 47.471845, "lng": -120.888871, "name": "Sherpa Peak summit", "type": "Summit", "elevFt": 8630}
    ]'::jsonb,
    gpx = '[
      [47.4366, -120.937],
      [47.4561, -120.9136],
      [47.465, -120.895],
      [47.4718, -120.8855],
      [47.471845, -120.888871]
    ]'::jsonb,
    corrections = COALESCE(corrections, '') || ' 2026-07-31: waypoints/gpx reordered -- the trailhead waypoint sat after "East end of ridge" instead of first, producing a nonsensical elevation profile (climb to 7,800 ft, drop to 3,500 ft, jump to summit); reordered to match the actual approach sequence and gave the trailhead distMi 0. No coordinates changed.'
WHERE id = 'wa_sherpa_peak_east_ridge'
  AND jsonb_array_length(waypoints) = 5
  AND waypoints->3->>'name' LIKE 'Esmeralda Basin%';

-- expect: 1 row updated
SELECT id, waypoints, gpx FROM routes WHERE id = 'wa_sherpa_peak_east_ridge';
