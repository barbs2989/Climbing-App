-- Batch 79 (pass 2, 2026-08-08)
-- Routes: Mount Blum North Ridge, Mount Buckindy Scramble, Mount Carrie Standard,
-- Mount Challenger Glacier, Mount Christie West Slopes, Mount Constance
-- (Finger Traverse, North Chimney, North Chute).

-- wa_mount_christie (area row): elevation_ft was a 1 ft outlier (6182) against this peak's own
-- West Slopes route high_point_ft (6181, already correct) and external sources (Wikipedia/
-- PeakVisor: 6,181 ft NAVD88, 1,777 ft prominence). Fixed to match.
UPDATE areas SET elevation_ft = 6181 WHERE id = 'wa_mount_christie' AND elevation_ft = 6182;

-- wa_mount_christie_west: the route's own summit waypoint carried the same 1 ft slip (elev 6182)
-- contradicting its own high_point_ft column (6181, correct) -- same fix as the area row above.
UPDATE routes
SET waypoints = (
  SELECT jsonb_agg(
    CASE WHEN wp->>'name' = 'Mount Christie Summit'
      THEN jsonb_set(wp, '{elev}', '6181')
      ELSE wp
    END
  )
  FROM jsonb_array_elements(waypoints) AS wp
)
WHERE id = 'wa_mount_christie_west'
  AND waypoints @> '[{"elev": 6182, "name": "Mount Christie Summit"}]';

-- wa_mount_challenger_challenger_glacier: grade_num (5) didn't match the DB-wide convention for
-- grade_system='class' (grade_num = the class digit -- confirmed against ~25 other WA class-graded
-- routes, all of which follow this). This route's own grade text is "Class 3-4, Glacier, 5.6-5.7",
-- so grade_num should be 3, not the YDS digit of the glacier's 5.6-5.7 rock step.
UPDATE routes SET grade_num = 3 WHERE id = 'wa_mount_challenger_challenger_glacier' AND grade_num = 5;

-- wa_mount_constance_north_chimney: grade_num was null despite a populated grade ("Grade II-III")
-- and rock_grade ("Class 3, with short low-5th-class moves on the final summit block"). Filled
-- from the row's own rock_grade using the same "5th class -> grade_num 5" convention already on
-- file elsewhere in this table (e.g. wa_vasiliki_ridge_standard's "low-mid 5th class" -> 5).
UPDATE routes SET grade_num = 5 WHERE id = 'wa_mount_constance_north_chimney' AND grade_num IS NULL;

-- wa_mount_blum_north_ridge: top-level grade was null despite a fully populated commitment (III)
-- and rock_grade (5.8-5.9 R). Filled from the row's own verified sub-fields, matching the
-- "Grade <commitment>, <rock_grade>" convention already used DB-wide (e.g.
-- wa_the_pyramid_picket_south_route: "Grade III, 5.6").
UPDATE routes SET grade = 'Grade III, 5.8-5.9 R' WHERE id = 'wa_mount_blum_north_ridge' AND grade IS NULL;

-- wa_mount_buckindy_scramble: top-level permit column contained NPS North Cascades boilerplate
-- ("reserve on Recreation.gov or walk-up at the Marblemount Wilderness Information Center") that
-- contradicts the row's own access.notes/access.rules/access.permit sub-fields, all three of which
-- correctly describe a Forest Service self-issue permit with no NPS involvement. Confirmed
-- externally: Mount Buckindy sits in the Glacier Peak Wilderness, managed by the Mount
-- Baker-Snoqualmie National Forest, not North Cascades National Park.
UPDATE routes
SET permit = 'Mount Baker-Snoqualmie National Forest (Glacier Peak Wilderness): free self-issue wilderness permit at the trailhead, no quota, reservation, or lottery system. This is a Forest Service objective, not part of the North Cascades National Park permit zones.'
WHERE id = 'wa_mount_buckindy_scramble'
  AND permit = 'North Cascades NP complex: no permit for day climbs; all overnight backcountry stays require a backcountry permit (reserve on Recreation.gov or walk-up at the Marblemount Wilderness Information Center).';
