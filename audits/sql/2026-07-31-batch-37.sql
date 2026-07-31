-- WA Alpine Audit — Pass 1, Batch 37 — 2026-07-31
-- Peaks: Boston Peak (Northwest Ridge), Liberty Bell Mountain (NW Face Var.,
--        Remsberg Variation), Colchuck Balanced Rock (NW Ridge), Old Guard
--        Peak (Southwest Route), Old Snowy Mountain (South Ridge / PCT
--        approach), Mount Olympus (Blue Glacier/Snow Dome East Face Ramps,
--        Summit Block Northwest Edge Finish, West-Middle-East Traverse)

-- =========================================================================
-- Boston Peak
-- =========================================================================

-- wa_northwest_ridge_2: audited clean. Elevation (8,894 ft), FA (Boyce/
-- Willis, 2018, documented as one leg of their "Boston Marathon" Boston
-- Basin circumnavigation), and the Cascade River Road trailhead coordinates
-- are all internally consistent with the area row and independently
-- corroborated. The row's own `corrections` field already documents and
-- resolves a July-vs-August FA month discrepancy between Mountain Project
-- and the AAJ account -- left as-is.

-- =========================================================================
-- Liberty Bell Mountain
-- =========================================================================

-- wa_nw_face_var_remsberg_variation: audited clean. Pitch-by-pitch grades,
-- shared P1-P2 with the standard Northwest Face, summit elevation (7,720 ft,
-- matching the area and 8 sibling Liberty Bell routes), and the Blue Lake
-- Trailhead access/permit details (Okanogan-Wenatchee NF, Methow Valley RD)
-- are all internally consistent and independently corroborated.

-- =========================================================================
-- Colchuck Balanced Rock
-- =========================================================================

-- wa_nw_ridge_2: flagged, not fixed -- see below.

-- =========================================================================
-- Old Guard Peak
-- =========================================================================

-- wa_old_guard_peak_southwest_route: access.land_manager ("Mt. Baker-
-- Snoqualmie National Forest (Darrington Ranger District)") directly
-- contradicts this same row's own, more detailed access.landManager field
-- ("Glacier Peak Wilderness, Okanogan-Wenatchee National Forest (Chelan
-- Ranger District) -- not North Cascades National Park. The park boundary
-- ends at Cache Col, well north of this summit.") and its own
-- emergency.rangerStation field, which names Chelan RD as the peak's actual
-- jurisdiction and Darrington RD only for the separate western Suiattle
-- River/Downey Creek access corridor. access.parking_pass separately cited
-- "Northwest Forest Pass required at Mountain Loop Highway trailheads" --
-- Mountain Loop Highway is an unrelated Mt. Baker-Snoqualmie NF corridor
-- near Darrington/Verlot, nowhere on this route's Cascade Pass/Ptarmigan
-- Traverse approach, and contradicts this row's own access.passRequired
-- field, which already correctly states no Northwest Forest Pass applies.
-- Both corrected to match the row's own already-correct landManager/
-- passRequired fields (same wrong-ranger-district/wrong-corridor
-- contamination pattern as batches 4, 5, 8, and 12).
UPDATE routes
SET access = jsonb_set(
  jsonb_set(access, '{land_manager}', '"Okanogan-Wenatchee National Forest (Chelan Ranger District) -- Glacier Peak Wilderness"', false),
  '{parking_pass}', '"No Northwest Forest Pass needed for wilderness travel; NPS wilderness permit only required if camping within the park (north of Cache Col). (The Mountain Loop Highway trailhead reference previously here was boilerplate from an unrelated Mt. Baker-Snoqualmie NF corridor and did not apply to this route.)"', false
),
corrections = COALESCE(corrections, '') || ' 2026-07-31: access.land_manager corrected from "Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)" to "Okanogan-Wenatchee National Forest (Chelan Ranger District)", matching this row''s own access.landManager/emergency.rangerStation fields. access.parking_pass corrected to remove an unrelated "Mountain Loop Highway trailheads" reference, matching this row''s own access.passRequired (no NW Forest Pass needed).'
WHERE id = 'wa_old_guard_peak_southwest_route'
  AND access->>'land_manager' = 'Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)';

-- =========================================================================
-- Old Snowy Mountain
-- =========================================================================

-- wa_old_snowy_mountain_r1: audited clean. Elevation (7,880 ft), the
-- Snowgrass Flats/PCT approach, Gifford Pinchot NF (Cowlitz Valley RD) land
-- manager, and the December 2025 FR-21 washout closure note are all
-- internally consistent and independently corroborated (WTA, Mountaineers,
-- Oregon Hikers).

-- =========================================================================
-- Mount Olympus
-- =========================================================================

-- wa_olympus_blue_glacier_east_ramps: two issues.
-- (1) access.notes carried a "Mount Tom area, North Cascades" clause plus a
-- "Northwest Forest Pass" pass-type claim -- the exact same DB-wide
-- boilerplate-contamination string first identified and fixed on two other
-- routes in batch 15 (found on 35 routes DB-wide at the time, including a
-- Wyoming route with no possible North Cascades connection). Mount Olympus
-- is in Olympic National Park on the Olympic Peninsula, not the North
-- Cascades, and this row's own permit/access.land_manager/access.
-- parking_pass fields already correctly describe an NPS Olympic NP
-- entrance fee, not a Forest Service Northwest Forest Pass. Corrected to
-- match those already-correct fields rather than fabricate new detail.
-- (2) waypoints[1] ("Mount Olympus West Peak") stored elevFt=7973, the sole
-- outlier against this same row's own high_point_ft (7980), the area row's
-- elevation_ft (7980), and the identical West Peak summit waypoint on both
-- sibling routes in this batch (wa_olympus_summit_block_west_edge,
-- wa_olympus_traverse -- both 7980). Corrected to 7980.
UPDATE routes
SET access = jsonb_set(access, '{notes}', '"Olympic National Park entrance fee applies (see parking_pass); no specific climbing permit beyond the standard overnight wilderness permit noted above."', false),
corrections = COALESCE(corrections, '') || ' 2026-07-31: access.notes corrected -- previously carried a "Mount Tom area, North Cascades" clause and a Northwest Forest Pass claim, the same DB-wide copy-paste contamination string fixed on two unrelated routes in batch 15. Mount Olympus is in Olympic National Park, not the North Cascades; corrected to match this row''s own already-correct permit/access.land_manager/access.parking_pass fields.'
WHERE id = 'wa_olympus_blue_glacier_east_ramps'
  AND access->>'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit. Mount Tom area, North Cascades.';

UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '7980', false),
corrections = COALESCE(corrections, '') || ' 2026-07-31: waypoints[1] ("Mount Olympus West Peak") elevFt corrected from 7973 to 7980, matching this row''s own high_point_ft, the area row''s elevation_ft, and the identical summit waypoint on sibling routes wa_olympus_summit_block_west_edge and wa_olympus_traverse.'
WHERE id = 'wa_olympus_blue_glacier_east_ramps'
  AND (waypoints->1->>'elevFt')::numeric = 7973
  AND waypoints->1->>'name' = 'Mount Olympus West Peak';

-- wa_olympus_summit_block_west_edge: top-level `grade` was null despite
-- populated, internally-consistent alpine_grade ("PD"), rock_grade ("5.4"),
-- commitment ("Grade III"), and pitch_detail (grade "Class 5.3-5.4, 100
-- feet") -- the recurring null-top-level-grade-despite-populated-subfields
-- bug seen in many prior batches (6, 10, 17, 19, 26, 30, 31, 33). Filled
-- from the row's own subfields, matching the format already used by its
-- sibling wa_olympus_blue_glacier_east_ramps ("Grade III; ...").
UPDATE routes
SET grade = 'Grade III; 5.4',
corrections = COALESCE(corrections, '') || ' 2026-07-31: top-level grade was null despite populated alpine_grade (PD), rock_grade (5.4), commitment (Grade III), and pitch_detail (Class 5.3-5.4) -- filled as "Grade III; 5.4" from this row''s own subfields, matching sibling wa_olympus_blue_glacier_east_ramps''s grade format.'
WHERE id = 'wa_olympus_summit_block_west_edge'
  AND grade IS NULL;

-- wa_olympus_traverse: rope_note read "West Peak (7,969ft)", the sole
-- outlier against this same row's own high_point_ft (7980), its own West
-- Peak waypoint (elevFt 7980), and the area row's elevation_ft (7980) --
-- a plain digit transposition/typo. Corrected.
UPDATE routes
SET rope_note = 'Full glacier team-rope travel across the Blue Glacier/upper mountain (17+ mile approach, crevasses and bergschrunds) connecting West (7,980ft), Middle (7,929ft), and East (7,762ft) Peaks. West Peak''s summit pitch needs 3-4 small-to-medium cams; Middle/East Peak sections are comparatively easier but still glaciated and exposed.',
corrections = COALESCE(corrections, '') || ' 2026-07-31: rope_note''s West Peak elevation corrected from 7,969ft (typo) to 7,980ft, matching this row''s own high_point_ft, West Peak waypoint, and the area row''s elevation_ft.'
WHERE id = 'wa_olympus_traverse'
  AND rope_note LIKE '%West (7,969ft)%';

-- =========================================================================
-- Flagged for human review (not auto-fixed)
-- =========================================================================

-- wa_nw_ridge_2 (Colchuck Balanced Rock, NW Ridge): `pitches` is stored as
-- 0, contradicting this same row's own `overview`/`hazards` text, which
-- describes "a few pitches of low 5th class... up to 5.6 along the exposed
-- ridge crest" -- real roped multi-pitch climbing, not an unroped scramble
-- (the route also has a documented 1-rope-length rappel on descent). The
-- cited source (Steph Abegg's trip report, stephabegg.com/trip-reports/
-- washington/cbr-nw-ridge/) 403'd on fetch this pass, and no Mountain
-- Project page specific to this route was found with an exact pitch count
-- -- "a few" isn't specific enough to assign a number, so this is left
-- flagged rather than guessed.

-- wa_old_guard_peak_southwest_route: this row's own data_quality.gaps
-- field already documents an unresolved route-naming ambiguity -- the
-- route is named "Southwest Route" and its own `approach` text describes
-- a "southwest side" snow couloir, but its `face` field ("West/northwest
-- side") and `aspect` ("NW") disagree, and other sources reportedly call
-- the same or a very similar LeConte-Glacier line "Northwest Snowfinger."
-- Re-confirmed still open this pass; left as-is per the row's own existing
-- flag rather than re-flagged as new.
