-- wa_spire_point_southwest_face (Spire Point, Itswoot Ridge): grade/grade_num/rock_grade are
-- stale lower values that contradict the row's own beta and pitch_detail. beta already says
-- "Final pitch involves friction slab climbing (class 5.6)"; pitch_detail's own crux pitch is
-- separately listed at grade "5.6"; external sources (search-corroborated Mountain Project/
-- SummitPost topo descriptions) agree the crux is 5.6. But the overall `grade` field says
-- "Class 4" (grade_num 4) and `rock_grade` says "5.4" -- both read as an earlier/lower draft
-- value never updated to match the rest of the row. Corrected all three to agree with the
-- row's own already-correct fields.
UPDATE routes SET grade = '5.6', grade_num = 6 WHERE id = 'wa_spire_point_southwest_face';
UPDATE routes SET rock_grade = '5.6' WHERE id = 'wa_spire_point_southwest_face';

-- wa_star_peak_sawtooth_nw_ridge: access.permit claims "Self-issue wilderness permit typical
-- for Lake Chelan-Sawtooth Wilderness entry." Lake Chelan-Sawtooth Wilderness (Methow Valley
-- Ranger District, Okanogan-Wenatchee NF) does not require any wilderness-entry permit,
-- self-issue or otherwise -- unlike e.g. Alpine Lakes Wilderness, which does. The only
-- requirement found at this trailhead is a Northwest Forest Pass for parking, which this same
-- access object already states in its own `fees`/`passRequired` fields.
UPDATE routes SET access = jsonb_set(access, '{permit}', '"No wilderness-entry permit is required for Lake Chelan-Sawtooth Wilderness. A Northwest Forest Pass is required for trailhead parking. No quota."') WHERE id = 'wa_star_peak_sawtooth_nw_ridge';

-- wa_table_mountain (area row): elevation_ft stored 5744, but the peak's own route
-- (wa_table_mountain_standard_scramble.high_point_ft = 5742) and external sources (Wikipedia,
-- SummitPost-class sources both citing 5,742 ft / 1,750 m) agree on 5742. The area row is the
-- outlier here, not the route -- corrected the area to match the already-correct route value.
UPDATE areas SET elevation_ft = 5742 WHERE id = 'wa_table_mountain';
