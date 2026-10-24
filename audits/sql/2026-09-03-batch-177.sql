-- WA alpine/mountaineering audit, pass 4, batch 177: wa_alpine_lookout_round_mountain_trail,
-- wa_american_border_peak_northeast_face, wa_american_border_peak_southeast_face,
-- wa_amphitheater_mountain_finger_of_fatwa, wa_amphitheater_mountain_middle_finger_buttress_left_side,
-- wa_amphitheater_mountain_middle_finger_buttress_right_side, wa_amphitheater_mountain_north_ridge,
-- wa_amphitheater_mountain_pilgrimage_to_mecca.

-- wa_amphitheater_mountain_finger_of_fatwa: `grade` is null while `grade_system` ('yds'),
-- `grade_num` (11) and `rock_grade` ('5.11c') are all populated and agree with each other --
-- this route is the one row on this buttress missing the plain-text grade its own sibling
-- rows (Middle Finger Buttress Right Side, North Ridge, Pilgrimage to Mecca, all on the
-- same wa_amphitheater_mountain area) all carry (grade mirrors rock_grade on every one of
-- them). Independently confirmed via web search (Wikipedia's Amphitheater Mountain page
-- describes Finger of Fatwa as "a class 5.11c rock climbing route with 5 pitches"),
-- matching this row's own rock_grade/grade_num exactly. Filling the gap with the value the
-- row's own rock_grade/grade_num and an external source already agree on.
UPDATE routes
SET grade = '5.11c'
WHERE id = 'wa_amphitheater_mountain_finger_of_fatwa'
  AND grade IS NULL
  AND rock_grade = '5.11c';

-- wa_amphitheater_mountain_middle_finger_buttress_left_side: same defect as Finger of
-- Fatwa above and on the same buttress -- `grade` is null while `grade_system` ('yds'),
-- `grade_num` (10) and `rock_grade` ('5.10b') are all populated and agree. Every sibling
-- route on this mountain (Right Side, North Ridge, Pilgrimage to Mecca) has `grade` set
-- equal to its own `rock_grade`; this is the one row where that mirroring never happened.
-- Filling the gap with the value the row's own rock_grade/grade_num already state.
UPDATE routes
SET grade = '5.10b'
WHERE id = 'wa_amphitheater_mountain_middle_finger_buttress_left_side'
  AND grade IS NULL
  AND rock_grade = '5.10b';
