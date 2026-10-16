-- Rollback for 2026-09-30-classification-10.sql.
update routes set grade = null, grade_num = null
 where id = 'wa_little_tahoma_cowlitz_ingraham_glaciers' and area_id = 'wa_little_tahoma' and grade = 'Class 3, steep snow';
