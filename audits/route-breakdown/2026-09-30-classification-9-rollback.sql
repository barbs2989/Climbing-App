-- Rollback for 2026-09-30-classification-9.sql.
update routes set grade = '4th', grade_num = 4
 where id = 'wa_south_spur' and area_id = 'wa_whatcom_peak' and grade = 'Class 3';
update areas set blurb = blurb || ' Note: the summit is sometimes listed at ~6,600 ft (from rounded 40-ft USGS contours) rather than the more precise 6,536 ft used here.'
 where id = 'wa_little_sister' and blurb not like '%6,536 ft used here.';
