-- Undo 2026-09-26-classification-5.sql.
update routes set name = 'Southeast Route via Hurricane Ridge / Cat Basin' where id = 'wa_mount_carrie_se_route' and area_id = 'wa_mount_carrie' and name = 'Southwest Ridge via High Divide and the Catwalk';
update routes set grade = null, grade_num = null where id = 'wa_big_snow_mountain_east_ridge_hardscrabble_route' and area_id = 'wa_big_snow_mountain' and grade = 'Class 2';
