-- WA alpine audit — pass 2, batch 71
-- Peaks: Kololo Peaks, Kyes Peak, North Early Winters Spire (Labor Pains),
-- Lane Peak, Le Conte Mountain, Lemah Mountain, Lemah Two
-- Each statement proposed only after cross-checking the current live row.

-- Le Conte Mountain: fa misnamed 1938 FA party member "Ralph W. Clough" -- every
-- independent source (Wikipedia, Mountain Madness, Alpine Institute, alpenglow.org)
-- gives "Ray W. Clough" (later a well-known UC Berkeley structural engineer).
UPDATE routes
SET fa = 'Calder T. Bressler, Ray W. Clough, Bill Cox, Tom Myers — July 23, 1938 (peak first ascent; subsequent ridge ascents in 1953 and 1957)'
WHERE id = 'wa_le_conte_mountain_northern_aspect';

-- Le Conte Mountain: top-level permit field claimed a "self-issue Glacier Peak
-- Wilderness permit, no quota" plus Northwest Forest Pass -- contradicts the row's
-- own access.* fields (correctly North Cascades NP / Cascade Pass) and NPS policy
-- (free NPS backcountry permit via reservation lottery or the Marblemount WIC).
UPDATE routes
SET permit = 'Free NPS backcountry permit required for any overnight stay (Cascade Pass Trailhead is in North Cascades National Park, not Glacier Peak Wilderness); obtain via advance online reservation lottery (peak season) or at the Wilderness Information Center, Marblemount. Park is fee-free -- no Northwest Forest Pass needed.'
WHERE id = 'wa_le_conte_mountain_northern_aspect';

-- Labor Pains: alpine_grade held a stray British trad adjectival grade ("E3
-- PG13") used nowhere else in the catalog, contradicting commitment='III' and
-- the route's own overview text ("Labor Pains, III 5.11a (PG13)"). Every sibling
-- route on this peak stores alpine_grade as the commitment/technical string.
UPDATE routes SET alpine_grade = 'III PG13' WHERE id = 'wa_labor_pains';

-- Labor Pains: waypoints[0]/gpx[0] "Blue Lake TH" sat ~1.26km from the route's
-- own approach_logistics trailhead coordinates (which match the real Blue Lake
-- Trailhead) -- and suspiciously close to the summit itself instead.
UPDATE routes
SET waypoints = jsonb_set(jsonb_set(waypoints, '{0,lat}', '48.518965'), '{0,lng}', '-120.67436')
WHERE id = 'wa_labor_pains';

UPDATE routes
SET gpx = jsonb_set(jsonb_set(gpx, '{0,0}', '48.518965'), '{0,1}', '-120.67436')
WHERE id = 'wa_labor_pains';

-- Labor Pains: rappels/descent/descent_text claimed "bolted stations," contradicting
-- the route's own, more granular rappel_detail/rappel_count_note/bail fields, which
-- describe mixed bolt+natural-sling+gear anchors, not a uniformly bolted line.
UPDATE routes SET
  rappels = 'Rappel the Chockstone Route descent line back to the base -- mixed bolted/natural/gear anchors, not uniformly bolted (see rappel_detail).',
  descent = 'Descend via the Chockstone Route''s rappel line (mixed bolted, natural sling, and gear anchors -- not uniformly bolted) back to the base.',
  descent_text = 'Rappel down the Chockstone Route line -- the same mixed bolted/natural/gear rappel stations used to descend that route, not a uniformly bolted line -- rather than reversing the Labor Pains pitches.'
WHERE id = 'wa_labor_pains';

-- Labor Pains: overview claimed "three sustained 5.11a pitches," contradicting the
-- row's own corrections field (framed as "confirmed facts only": 5 pitches, 2 of
-- them 5.10-5.11) and pitch_detail (only P4 is clean 5.11a; P3 is 5.10-5.11).
UPDATE routes SET overview = 'Labor Pains, III 5.11a (PG13), is a 5-pitch, roughly 600 ft (182 m) line up clean rock between the Chockstone Route and The West Face on North Early Winters Spire, with two pitches in the 5.10-5.11 range, including a committing overhang on Pitch 4.'
WHERE id = 'wa_labor_pains';

-- The Zipper (Lane Peak): grade_num=3 contradicted its own ice_grade "WI2", beta
-- text "WI2 M2", and pitch_detail's own WI2 M2 crux pitch. Sibling r2 correctly
-- stores grade_num=2 for the same "WI2" ice_grade.
UPDATE routes SET grade_num = 2 WHERE id = 'wa_lane_peak_r1';

-- Lover's Lane (Lane Peak): grade/grade_system/grade_num were null, flagged
-- unresolved in the 2026-07-29 pass-1 audit. Filled using the value already
-- established and internally consistent across this row's own ice_grade field
-- and its turnaround/watch_out prose (both cite "AI1").
UPDATE routes SET grade = 'Alpine ice/mixed couloir', grade_system = 'ai', grade_num = 1 WHERE id = 'wa_lane_peak_r3';

-- Kyes Peak Northeast Ridge: grade/grade_system/grade_num were null despite
-- rock_grade='Class 3' and the route's own beta text stating "Class 3 rock
-- along the climber's-left edge of the Pride Glacier."
UPDATE routes SET grade = 'Class 3', grade_system = 'class', grade_num = 3 WHERE id = 'wa_kyes_peak_northeast_ridge';

-- Kyes Peak Glaciated Scramble: loss_ft=707 was wildly inconsistent with
-- gain_ft=6023 for a route whose own descent field says "reverse the route"
-- (pure out-and-back); the row's own waypoints sum to ~5,956 ft of ascent.
UPDATE routes SET loss_ft = 6023 WHERE id = 'wa_kyes_peak_glaciated_scramble';

-- Kyes Peak Glaciated Scramble: beta text named the boot-path junction "Kyes'
-- upper northeast ridge (~6,600 ft)," but this route's own waypoints array
-- labels the same point/elevation "South Ridge climber's trail junction"
-- (6,500 ft) -- Northeast Ridge is a separate route in this DB (Pride
-- Glacier/Curry Gap side), so this was a name mix-up between the two routes.
UPDATE routes SET beta = replace(beta, 'upper northeast ridge (~6,600 ft)', 'upper south ridge (~6,500 ft)') WHERE id = 'wa_kyes_peak_glaciated_scramble';

-- Kololo Peaks Standard Route: the summit waypoint (index 6) labeled the west
-- summit "True (west) summit," contradicting this same route's own
-- overview/beta text (east summit, 8,243 ft, is the true high point; west,
-- 8,220 ft, is lower) and external sources (SummitPost, listsofjohn.com). The
-- waypoint's own stored elevation (8,240 ft) is much closer to the stated
-- east-summit figure than the west, confirming the waypoint itself is the
-- east summit, mislabeled.
UPDATE routes
SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{6,name}', '"Kololo Peaks (east summit, true high point)"', false),
  '{6,note}', '"True (east) summit at 8,243 ft, the higher of the two summits; reached via a short scramble/traverse from the west summit (8,220 ft) after the final low-angle ice/snow pitch off the White River Glacier."', false
)
WHERE id = 'wa_kololo_peaks_standard';

-- Kololo Peaks Standard Route: loss_ft=7000 vs gain_ft=6120, despite descent
-- stating "reverse the ascent line... no rappels typically required" (pure
-- out-and-back). The row's own waypoints sum to ~6,190 ft cumulative ascent.
UPDATE routes SET loss_ft = 6120 WHERE id = 'wa_kololo_peaks_standard';

-- Kyes Peak (area): prominence_ft=1744 doesn't reconcile with Wikipedia's own
-- infobox arithmetic (7,280 ft peak - 5,560 ft key col = 1,720 ft prominence).
UPDATE areas SET prominence_ft = 1720 WHERE id = 'wa_kyes_peak';
