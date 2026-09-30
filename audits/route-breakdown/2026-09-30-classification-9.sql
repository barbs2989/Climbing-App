-- verify-14 / verify-15 (leftovers, second pass). Rollback: 2026-09-30-classification-9-rollback.sql.
-- South Spur (Whatcom Peak): two independent sources give Class 3 and two more give easier; one listing gives 4th.
update routes set grade = 'Class 3', grade_num = 3
 where id = 'wa_south_spur' and area_id = 'wa_whatcom_peak' and grade = '4th';
-- Little Sister: the blurb's closing note claims 6,536 ft is "used here" while the page shows elevation_ft 6,600
-- (sources give 6,600–6,640 ft). Drop the contradicting note; the rest of the blurb is unchanged.
update areas set blurb = replace(blurb, ' Note: the summit is sometimes listed at ~6,600 ft (from rounded 40-ft USGS contours) rather than the more precise 6,536 ft used here.', '')
 where id = 'wa_little_sister' and elevation_ft = 6600 and blurb like '%rather than the more precise 6,536 ft used here.';
