-- Undo 2026-09-27-classification-7.sql.
update routes set name = 'Southwest Route', grade = 'Grade III, 5.6', grade_num = 6
 where id = 'wa_mount_degenhardt_southwest_route' and area_id = 'wa_mount_degenhardt' and name = 'South Route' and grade = 'Class 4 / low 5th';
