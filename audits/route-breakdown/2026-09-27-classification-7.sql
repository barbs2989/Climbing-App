-- identity-3 (Mount Degenhardt): the row now describes the South Route in every column. No source uses "Southwest Route",
-- and the stored "Grade III, 5.6" has none either; the South Route is mostly 4th class with a few low-5th moves (three
-- reports), written in the catalog's usual spelling; grade_num = gradeNumFor(). It is the peak's only row.
-- The duplicate guard names wa_the_pyramid_picket_south_route ("South Route" on The Pyramid, the next summit east): read,
-- and it is a different peak's climb, so the guard is bypassed for this one transaction.
-- Rollback: 2026-09-27-classification-7-rollback.sql.
begin;
set local catalog.allow_duplicate = 'on';
update routes set name = 'South Route', grade = 'Class 4 / low 5th', grade_num = 4
 where id = 'wa_mount_degenhardt_southwest_route' and area_id = 'wa_mount_degenhardt' and name = 'Southwest Route' and grade = 'Grade III, 5.6';
commit;
