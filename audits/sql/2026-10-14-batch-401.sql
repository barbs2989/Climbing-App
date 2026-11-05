-- WA alpine/mountaineering audit -- batch 401 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_forbidden_peak_east_ledges, wa_forbidden_peak_east_ridge,
--         wa_forbidden_peak_north_ridge, wa_forbidden_peak_northeast_face,
--         wa_forbidden_peak_northwest_face, wa_forbidden_peak_west_ridge,
--         wa_fortress_mountain_east_ridge, wa_fortress_mountain_northeast_face,
--         wa_fortress_mountain_southwest_face, wa_fortune_peak_east_slope
-- Five fixes this batch: two pitch-count corrections on Forbidden Peak where the
-- top-level `pitches` column disagreed with the row's own `pitch_detail` array length
-- (and, for East Ridge Direct, with its own `beta` text and outside corroboration);
-- one ice-grade self-contradiction (3 fields vs 1); one gain_ft correction derived from
-- the row's own waypoint elevations; one wrong ranger-district phone/address plus an
-- unapplied rename already decided in the row's own `corrections` field. See
-- wa-alpine-audit-log.md for full per-route detail, including everything checked and
-- left flagged for human review (most notably: Forbidden Peak Northeast Face's FA
-- attribution to "Ed Cooper and Stuart Ferguson, 1961" could not be corroborated by any
-- source and the route's existence as a standalone climb is itself in question).
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

-- =========================================================================
-- Forbidden Peak, East Ridge Direct (wa_forbidden_peak_east_ridge)
-- -- pitches (6) disagrees with the row's own pitch_detail array (8 entries) and its
--    own beta text ("6-8 pitches"); AAJ 1959 / SummitPost describe multiple gendarmes
--    consistent with 8, not 6
-- =========================================================================
UPDATE routes SET
  pitches = 8
WHERE id = 'wa_forbidden_peak_east_ridge'
  AND pitches = 6
  AND jsonb_array_length(pitch_detail) = 8;

-- =========================================================================
-- Forbidden Peak, West Ridge (wa_forbidden_peak_west_ridge)
-- -- pitches (8) disagrees with the row's own pitch_detail array (6 entries) and its
--    own waypoint directions ("about six pitches of low fifth class"); Mountain Project
--    independently lists this as a 7-pitch route and Mountaineers.org calls it 4 pitches
--    -- external sources cluster well below 8, corroborating the row's own 6-entry
--    pitch_detail over the stale top-level column
-- =========================================================================
UPDATE routes SET
  pitches = 6
WHERE id = 'wa_forbidden_peak_west_ridge'
  AND pitches = 8
  AND jsonb_array_length(pitch_detail) = 6;

-- =========================================================================
-- Forbidden Peak, Northeast Face (wa_forbidden_peak_northeast_face)
-- -- ice_grade ("AI3") disagrees with grade ("AI2"), grade_num (2) and ice_grade_num (2)
--    -- all three agree with each other, only ice_grade is the outlier
-- =========================================================================
UPDATE routes SET
  ice_grade = 'AI2'
WHERE id = 'wa_forbidden_peak_northeast_face'
  AND ice_grade = 'AI3'
  AND grade = 'AI2'
  AND grade_num = 2
  AND ice_grade_num = 2;

-- =========================================================================
-- Forbidden Peak, North Ridge (wa_forbidden_peak_north_ridge)
-- -- gain_ft (4500) undercounts the route's own waypoint elevation profile. Unlike the
--    East Ridge Direct's simple ridge climb (gain_ft 5615 = exact trailhead-to-summit
--    delta), North Ridge's own waypoints show a glacier approach with real intermediate
--    ups and downs: Trailhead 3200 -> High Camp 6400 (+3200) -> Sharkfin Col 7725
--    (+1325) -> rappel to 7570 (-155) -> glacier low point 7000 (-570) -> ridge crest
--    8100 (+1100) -> summit 8815 (+715). Summing the positive segments gives 6340 ft of
--    cumulative gain on this route's own data -- well above the stored 4500.
-- =========================================================================
UPDATE routes SET
  gain_ft = 6340
WHERE id = 'wa_forbidden_peak_north_ridge'
  AND gain_ft = 4500
  AND waypoints->0->>'elev' = '3200'
  AND waypoints->1->>'elev' = '6400'
  AND waypoints->2->>'elev' = '7725'
  AND waypoints->3->>'elev' = '7570'
  AND waypoints->4->>'elev' = '7000'
  AND waypoints->5->>'elev' = '8100'
  AND waypoints->6->>'elev' = '8815';

-- =========================================================================
-- Fortress Mountain, Northeast Ridge (wa_fortress_mountain_northeast_face)
-- -- (1) name/face still read "Northeast Face", but the row's own `corrections` field
--    already documents a 2026-07-29 decision to rename this to "Northeast Ridge" (every
--    source found -- SummitPost, CascadeClimbers, Country Highpoints -- describes this
--    line as the Northeast Ridge, used as a descent/connector, not a standalone face
--    route) that was never actually applied to the name/face columns. Id slug retains
--    the old name, matching the stated precedent.
-- -- (2) emergency.rangerStation lists "Chelan Ranger District, (509) 682-4900" -- a
--    real, current Chelan RD number, but the wrong district for this peak. The Trinity
--    Trailhead / Chiwawa River drainage is served by the Wenatchee River Ranger
--    District, confirmed via the official USFS office page and matching the other two
--    Fortress Mountain rows (East Ridge, Southwest Face) in this same catalog.
-- =========================================================================
UPDATE routes SET
  name = 'Northeast Ridge',
  face = 'Northeast Ridge',
  emergency = jsonb_set(
    emergency, '{rangerStation}',
    '"Wenatchee River Ranger District, (509) 548-2550, 600 Sherbourne St, Leavenworth, WA 98826"'::jsonb
  )
WHERE id = 'wa_fortress_mountain_northeast_face'
  AND name = 'Northeast Face'
  AND face = 'Northeast Face'
  AND emergency->>'rangerStation' = 'Chelan Ranger District, (509) 682-4900'
  AND corrections LIKE '%Northeast Ridge%';
