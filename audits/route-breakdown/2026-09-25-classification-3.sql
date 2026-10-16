-- Round-3 verification (2026-09-25-verify-6.json, -7.json): grade fixes confirmed against sources.
-- Pinned on id + area + current value; grade_num is what lib/grade.js gradeNumFor() gives the new grade.
-- Rollback: 2026-09-25-classification-3-rollback.sql.
-- Held back: Mount Maude "AI2-3" (the research agent found no source for the ice grades), Accidental Discharge
-- discipline (no source checked).

-- Walkabout: pitches 3-5 are aid; IV 5.11 A2.
update routes set grade = '5.11 A2' where id = 'wa_big_kangaroo_walkabout' and area_id = 'wa_big_kangaroo' and grade = '5.11';
-- Shuksan SW Couloir and Face: WI3 5.2 (an ice route filed as ice; the grade dropped the ice).
update routes set grade = 'WI3 5.2', grade_num = 3 where id = 'wa_sw_couloir_and_face' and area_id = 'wa_mount_shuksan' and grade = '5.2';
-- The Snostril: grade was empty; WI4+ M5+.
update routes set grade = 'WI4+ M5+', grade_num = 4 where id = 'wa_snoqualmie_mountain_the_snostril' and area_id = 'wa_snoqualmie_mountain' and grade is null;
-- Fantasy Falls: grade was empty; WI5.
update routes set grade = 'WI5', grade_num = 5 where id = 'wa_fantasy_falls' and area_id = 'wa_unicorn_peak' and grade is null;
-- Olympus summit block: "Class 5.4" mixed two systems; the value is 5.4 (grade_num unchanged).
update routes set grade = '5.4' where id = 'wa_olympus_summit_block_north_face' and area_id = 'wa_mount_olympus' and grade = 'Class 5.4';
