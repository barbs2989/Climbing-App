-- Round-4 / re-run / round-5 verification (2026-09-26-verify-8.json, -verify-9.json, r5-batch-F review): classification
-- fixes confirmed against sources. Pinned on id + area + current value; grade_num = lib/grade.js gradeNumFor(new grade).
-- Rollback: 2026-09-26-classification-4-rollback.sql.
-- Held back: And Say 5.11b -> 5.11+ (the parser reads 5.11+ as 11, which would LOWER its sort below 5.11b's 11.5),
-- Lane Peak "Grade II" and Sinister N Face (proposed values are not grades), Mount Lyall (single source).

update routes set grade = '5.8+' where id = 'wa_concerto_in_c_for_drill_and_hammer' and area_id = 'wa_south_face' and grade = '5.8';
update routes set grade = '5.10c', grade_num = 10.75 where id = 'wa_prey' and area_id = 'wa_osprey_wall' and grade = '5.10';
update routes set grade = '5.11c', grade_num = 11.75 where id = 'wa_ellen_pea' and area_id = 'wa_m_m_wall_aka_supercave_wall' and grade = '5.11';
-- Spindrift Couloir: the grade dropped the commitment and the ice (IV+ 5.9 WI5); grade_num unchanged (9).
update routes set grade = 'IV+ 5.9 WI5' where id = 'wa_big_four_mountain_spindrift_couloir' and area_id = 'wa_big_four_mountain' and grade = '5.9';
-- Cascade Peak NW Chimney: the grade was a sentence about one party; grade_num 10 had been parsed out of that sentence.
update routes set grade = '5.8', grade_num = 8 where id = 'wa_cascade_peak_nw_chimney' and area_id = 'wa_cascade_peak'
   and grade = '5.8 (a 2013 party found pitch 1 harder, closer to 5.10, due to loose rock)';
update routes set grade = 'Class 3-4', grade_num = 4 where id = 'wa_fortress_mountain_east_ridge' and area_id = 'wa_fortress_mountain' and grade is null;
update routes set grade = 'Class 3', grade_num = 3 where id = 'wa_gilbert_peak_west_route' and area_id = 'wa_gilbert_peak' and grade is null;
update routes set grade = 'Class 2-3', grade_num = 3 where id = 'wa_south_twin_sister_scramble' and area_id = 'wa_south_twin_sister' and grade is null;
-- Fight or Flight: the route page describes 12 pitches.
update routes set pitches = 12 where id = 'wa_north_face_left_buttress' and area_id = 'wa_castle_peak_pasayten' and pitches = 14;
-- The first ascensionist asked for the route to be renamed; it is listed as "The Dirty" now. The id is unchanged.
update routes set name = 'The Dirty' where id = 'wa_dirty_sanchez' and area_id = 'wa_goose_egg_mountain' and name = 'Dirty Sanchez';
