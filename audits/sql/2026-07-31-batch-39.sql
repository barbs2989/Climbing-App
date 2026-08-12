-- WA alpine audit batch 39 (2026-07-31): Poltergeist Pinnacle (North Route stub), Primus
-- Peak, Prusik Peak (x3), Vesper Peak (Ragged Edge), Liberty Bell (Rapple Grapple),
-- Raven Ridge, Robinson Mountain, Rock Mountain.
-- Run each statement, then the paired "expect" select, before moving to the next.

-- --------------------------------------------- Poltergeist Pinnacle North Route (length)
-- length_m (421) was the sole outlier against this row's own pitch_detail array, which
-- sums to 55+60+60+270 = 445m. Independently corroborated against the AAC Publications
-- first-ascent report (Aylward/Murphy, 2004), whose per-pitch meter figures match this
-- row's pitch_detail exactly; 421 traces to a lossy m->ft->m round-trip through Mountain
-- Project's foot conversion of the same AAC text. Also matches the length_m (445) already
-- on file for the likely-duplicate wa_poltergeist_pinnacle route (flagged, not merged, in
-- batch 38).
UPDATE routes
SET length_m = 445,
    corrections = COALESCE(corrections, '') || ' 2026-07-31: length_m corrected from 421 to 445 to match this row''s own pitch_detail sum (55+60+60+270m) and the AAC Publications 2004 FA report; the duplicate row wa_poltergeist_pinnacle already carries 445.'
WHERE id = 'wa_poltergeist_pinnacle_north_route'
  AND length_m = 421;

-- expect: 1 row updated
SELECT id, length_m FROM routes WHERE id = 'wa_poltergeist_pinnacle_north_route';

-- --------------------------------------------------- Primus Peak South Ridge (access.notes)
-- access.notes carried the "Mount Tom area, North Cascades" boilerplate string -- the same
-- DB-wide copy-paste contamination first identified in batch 15 (confirmed there across 35
-- routes). Primus Peak has no connection to Mount Tom; every other field on this row
-- (rangerStation, land_manager, county) consistently places it in North Cascades NP.
UPDATE routes
SET access = jsonb_set(access, '{notes}', '"Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit."', false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: access.notes corrected -- stripped a leftover "Mount Tom area, North Cascades" clause (DB-wide boilerplate contamination pattern first identified in batch 15); Primus Peak has no connection to Mount Tom.'
WHERE id = 'wa_primus_peak_south_ridge'
  AND access->>'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit. Mount Tom area, North Cascades.';

-- expect: 1 row updated
SELECT id, access->'notes' AS notes FROM routes WHERE id = 'wa_primus_peak_south_ridge';

-- --------------------------------------------------- Prusik Peak Der Sportsman (waypoint)
-- waypoints[1] ("Prusik Peak Summit") elevFt (8000) was the sole outlier against this same
-- row's own high_point_ft (8008) and both sibling Prusik Peak routes' summit waypoints
-- (8008), and the wa_prusik_peak area's own elevation_ft (8008).
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '8008', false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: waypoints[1] (Prusik Peak Summit) elevFt corrected from 8000 to 8008 to match this row''s own high_point_ft, both sibling routes'' summit waypoints, and the wa_prusik_peak area elevation_ft.'
WHERE id = 'wa_prusik_peak_der_sportsman'
  AND waypoints->1->>'name' = 'Prusik Peak Summit'
  AND (waypoints->1->>'elevFt')::int = 8000;

-- expect: 1 row updated
SELECT id, waypoints->1 AS summit_waypoint FROM routes WHERE id = 'wa_prusik_peak_der_sportsman';

-- ------------------------------------------- Prusik Peak South Face, Burgner-Stanley (grade)
-- rock_grade (5.10a) and grade_num (10) contradicted this same row's own top-level grade
-- ("III, 5.9+") and every pitch_detail entry, none of which exceeds 5.9+. Climbing.com's
-- route title ("Stanley-Burgner, III 5.9+, six pitches") confirms 5.9+ is the real grade;
-- 5.10a/10 look like copy-paste contamination from an unrelated harder route.
UPDATE routes
SET rock_grade = '5.9+',
    grade_num = 9,
    corrections = COALESCE(corrections, '') || ' 2026-07-31: rock_grade corrected from 5.10a to 5.9+ and grade_num from 10 to 9 -- contradicted this row''s own top-level grade ("III, 5.9+") and pitch_detail (nothing above 5.9+); confirmed via Climbing.com''s route title.'
WHERE id = 'wa_prusik_peak_south_face_burgner_stanley'
  AND rock_grade = '5.10a' AND grade_num = 10;

-- expect: 1 row updated
SELECT id, rock_grade, grade_num FROM routes WHERE id = 'wa_prusik_peak_south_face_burgner_stanley';

-- --------------------------------------- Prusik Peak South Face, Burgner-Stanley (dist_km)
-- dist_km (31.4) is stored as the round-trip figure, not the one-way convention the app
-- doubles for display -- this row's own itinerary.totalNote already states "~19.5 mi ...
-- round-trip," and 31.4 km already equals 19.5 mi. Both sibling Prusik Peak routes in this
-- same batch correctly store one-way distance. Unlike the DB-wide dist_km ambiguity
-- documented in CLAUDE.md (never bulk-normalize), this is a single row with concrete
-- internal evidence (its own itinerary note) that it is the outlier among its own siblings.
UPDATE routes
SET dist_km = 15.7,
    corrections = COALESCE(corrections, '') || ' 2026-07-31: dist_km corrected from 31.4 to 15.7 -- was stored as a round-trip figure (matching this row''s own itinerary.totalNote of "~19.5 mi round-trip") rather than the one-way convention the app doubles for display; both sibling Prusik Peak routes already store one-way distance.'
WHERE id = 'wa_prusik_peak_south_face_burgner_stanley'
  AND dist_km = 31.4;

-- expect: 1 row updated
SELECT id, dist_km FROM routes WHERE id = 'wa_prusik_peak_south_face_burgner_stanley';

-- ------------------------------------------------------- Ragged Edge (access contamination)
-- access.land_manager and access.rules both carried Glacier Peak Wilderness boilerplate
-- (wrong wilderness area's group-size/campfire rules), contradicting this same row's own
-- access._raw.wilderness_zone/permitZone ("Outside protected wilderness areas") and
-- access._raw.land_manager (plain "USFS Mount Baker-Snoqualmie National Forest", no
-- wilderness designation). Vesper Peak/Sunrise Mine Trail is not in Glacier Peak
-- Wilderness -- same wrong-district/wrong-zone contamination pattern as many prior batches.
UPDATE routes
SET access = jsonb_set(
              jsonb_set(access, '{land_manager}', '"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"', false),
              '{rules}', '"No specific group-size restriction (outside wilderness); standard Northwest Forest Pass trailhead rules apply."', false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: access.land_manager and access.rules corrected -- both previously carried Glacier Peak Wilderness boilerplate that contradicts this row''s own access._raw.wilderness_zone/permitZone/land_manager fields, which correctly place Vesper Peak outside any wilderness area.'
WHERE id = 'wa_ragged_edge'
  AND access->>'land_manager' = 'Mt. Baker-Snoqualmie National Forest (Darrington Ranger District) — Glacier Peak Wilderness';

-- expect: 1 row updated
SELECT id, access->'land_manager' AS land_manager, access->'rules' AS rules FROM routes WHERE id = 'wa_ragged_edge';

-- --------------------------------------------------- Rapple Grapple (high_point_ft null)
-- high_point_ft was null despite this row's own waypoints already giving an explicit
-- summit elevation (7,720 ft) matching the wa_liberty_bell area row and every audited
-- sibling Liberty Bell route (batches 11, 18, 19, 37).
UPDATE routes
SET high_point_ft = 7720,
    corrections = COALESCE(corrections, '') || ' 2026-07-31: high_point_ft filled from null to 7720, matching this row''s own summit waypoint, the wa_liberty_bell area elevation_ft, and every previously-audited sibling Liberty Bell route.'
WHERE id = 'wa_rapple_grapple'
  AND high_point_ft IS NULL;

-- expect: 1 row updated
SELECT id, high_point_ft FROM routes WHERE id = 'wa_rapple_grapple';

-- --------------------------------------------------------- Rapple Grapple (descent field)
-- Top-level descent field described the standard Beckey Route rappels/downclimb to the
-- Liberty Bell-Concord notch -- directly contradicted by this same row's own, more
-- detailed descent_text, which describes a distinct east-side gully exit with two
-- independent single-rope rappels, explicitly NOT the notch line.
UPDATE routes
SET descent = 'Distinct exit east of the Beckey/notch line: downclimb the ridge and a short 5.6 boulder problem, follow an obvious tree-filled gully east to the first set of rappel bolts, then two single-rope rappels to the ground.',
    corrections = COALESCE(corrections, '') || ' 2026-07-31: descent corrected -- previously described the standard Beckey Route rappels to the Liberty Bell-Concord notch, contradicting this row''s own more detailed descent_text, which documents a distinct east-side gully exit.'
WHERE id = 'wa_rapple_grapple'
  AND descent = 'Descend via the standard Beckey Route rappels/downclimb to the Liberty Bell-Concord notch.';

-- expect: 1 row updated
SELECT id, descent FROM routes WHERE id = 'wa_rapple_grapple';

-- ------------------------------------------------- Rock Mountain Northeast Ridge (elevation)
-- high_point_ft (6852) disagreed with even this route's own area row (wa_rock_mountain,
-- elevation_ft 6856) by 4 ft, and both disagreed with external sources: Wikipedia
-- ("Rock Mountain (Washington)", 6,840+ ft) and GNIS/Wikidata (2,085.5 m = 6,841 ft,
-- independently confirmed via web search). Fixing both the route and its area row to the
-- precise GNIS-derived figure.
UPDATE routes
SET high_point_ft = 6841,
    corrections = COALESCE(corrections, '') || ' 2026-07-31: high_point_ft corrected from 6852 to 6841 -- disagreed with this route''s own area row (was 6856) and external sources (Wikipedia 6,840+ ft; GNIS/Wikidata 2,085.5m = 6,841 ft).'
WHERE id = 'wa_rock_mountain_northeast_ridge'
  AND high_point_ft = 6852;

-- expect: 1 row updated
SELECT id, high_point_ft FROM routes WHERE id = 'wa_rock_mountain_northeast_ridge';

UPDATE areas
SET elevation_ft = 6841
WHERE id = 'wa_rock_mountain'
  AND elevation_ft = 6856;

-- expect: 1 row updated
SELECT id, elevation_ft FROM areas WHERE id = 'wa_rock_mountain';
