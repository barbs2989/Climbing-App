-- wa_big_four_mountain_spindrift_couloir (Big Four Mountain, Spindrift Couloir, North Face)
-- max_angle stores 90, but the route's own `pitch_detail` array explicitly describes the
-- "Upper mixed" pitch as "Rotten ice, shale, and drytooling moves up to roughly 95-degree
-- angles" -- a direct self-contradiction between the summary column and the route's own
-- pitch-by-pitch text. This is independently confirmed by the primary source: AAC
-- Publications' report on Bart Paull and Doug Littauer's March 2, 1996 first ascent grades
-- the route "IV+ 5.9 95 degrees" (4,000 feet), which also matches this row's own
-- length_m (1219 m = 4,000 ft), alpine_grade (IV+), rock_grade (5.9) and ice_grade (WI5) --
-- every other figure on the row already agrees with the AAC account except max_angle.
UPDATE routes SET max_angle = 95 WHERE id = 'wa_big_four_mountain_spindrift_couloir';

-- wa_big_kangaroo_west_face (Big Kangaroo, West Face / West Route)
-- grade_num is NULL despite the route's own `rock_grade` field storing "5.6" and its own
-- `pitch_detail` array itemizing pitch 3 as the crux at "5.6" ("a steep move past a single
-- old, rusty 1/4-inch bolt to the tiny summit -- essentially unprotected and the crux of
-- the whole route"). This catalog's convention is grade_num = the digits after the decimal
-- point (see CLAUDE.md's check:grade-parser notes), so a documented 5.6 crux should store
-- grade_num = 6 -- the same convention already applied correctly to the sibling route on
-- this peak, wa_beckey_tate (grade "5.9+" -> grade_num 9). A NULL value here makes an
-- otherwise fully-graded route invisible to the app's grade-based sort/filter.
UPDATE routes SET grade_num = 6 WHERE id = 'wa_big_kangaroo_west_face' AND grade_num IS NULL;
