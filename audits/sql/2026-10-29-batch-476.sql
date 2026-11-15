-- WA alpine route audit -- batch 476 (pass 8)
-- Routes: wa_cathedral_peak_last_rites, wa_cathedral_peak_pasayten_se_buttress,
-- wa_cathedral_rock_northeast_buttress, wa_cathedral_rock_northeast_ridge_2003_variation,
-- wa_cathedral_rock_southeast_face_chimney, wa_chair_bryant_traverse,
-- wa_chair_peak_east_face, wa_chair_peak_north_face

-- wa_cathedral_peak_pasayten_se_buttress: stored grade is 5.10a (grade_num
-- 10.25), but every independent source found gives 5.9/5.9+: SummitPost's
-- dedicated "SE Buttress" route page, the lamountaineers.org North American
-- Classic Climbs entry, a 2016 Steph Abegg trip report ("Southeast Buttress,
-- 5.9, 1000'"), a 2007 cascadeclimbers.com trip report titled "Southeast
-- Buttress (5.9+, 10 pitches)" matching this row's own pitches=10, and the
-- Wikipedia .com mirror ("class 5.9, 9-10 pitches"). A Mountain Project
-- comment on the area page itself asks "Who changed the grade on this
-- climb?", consistent with the grade having drifted from the sourced 5.9+ to
-- 5.10a at some point. Corrected to 5.9+ (grade_num 9, matching this app's
-- existing 5.9/5.9+ convention). FA party/date ("unrecorded"/July 1973) was
-- not independently verifiable either way and is left as-is -- not fixed,
-- per audit rules against guessing.
update routes set
  grade = '5.9+',
  grade_num = 9
where id = 'wa_cathedral_peak_pasayten_se_buttress'
  and grade = '5.10a'
  and grade_num = 10.25;

-- wa_chair_peak_east_face: stored grade is 5.2 (grade_num 2), for the
-- historic 1933 summer line (FA Don Blair/Art Winder, confirmed exactly via
-- SummitPost). SummitPost's dedicated "East Face (Summer)" page gives this
-- same route 5.5, with the crux "about 15 to 20 feet" through an overhanging
-- band; a 2006 trip report independently calls it "5.6 I believe". This
-- row's own pitch_detail P1 already records a "5.1-5.6" range for the first
-- pitch depending on which side of the chimney is climbed, which is
-- inconsistent with an overall 5.2 rating and consistent with the externally
-- sourced 5.5. Corrected the summary grade to 5.5 (grade_num 5) to match the
-- route's own pitch breakdown and the independent sources; pitch_detail
-- itself (which already reads 5.1-5.6) was left untouched.
update routes set
  grade = '5.5',
  grade_num = 5
where id = 'wa_chair_peak_east_face'
  and grade = '5.2'
  and grade_num = 2;
