-- Batch 527 (pass 8, 2026-11-12)
-- Routes: Mount Teneriffe (Kamikaze Trail, Standard Route); Mount Terror (North Face/North
-- Buttress, East Ridge/Southeast Face, Stoddard Buttress, West Ridge); Mount Thomson (West
-- Ridge); Mount Tom (Glacier/Scramble Route); Mount Torment (South Ridge, Torment-Forbidden
-- Traverse).

-- wa_mount_terror_west_ridge: grade/rock_grade stored "5.6" (grade_num 6), but this is the
-- standard/easiest route up Mount Terror and four independent secondary sources agree it is
-- far easier than that: SummitPost's Mount Terror page rates the West Ridge "Class 5.0" and
-- calls it the standard route; FastestKnownTime's route page calls it "low fifth class," the
-- least technical way up the peak; Steph Abegg's Southern Pickets trip report describes the
-- ridge crest as mostly Class 3 scrambling with one 5th-class variation to reach the crest;
-- and a 2006 Sverdina trip report likewise describes mostly 3rd/4th-class scrambling on
-- occasionally loose rock. No source supports 5.6. (mountainproject.com and summitpost.org
-- could not be fetched directly this run -- same network constraint as prior batches -- so
-- this relies on WebSearch's synthesized snippets of those pages/reports, convergent across
-- four independent accounts.) Correcting grade/rock_grade to "5.0" and grade_num to 0 to match
-- lib/grade.js's YDS parsing of "5.0".
UPDATE routes SET grade = '5.0', rock_grade = '5.0', grade_num = 0
WHERE id = 'wa_mount_terror_west_ridge' AND grade = '5.6' AND rock_grade = '5.6' AND grade_num = 6;
