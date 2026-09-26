-- Undo 2026-09-26-identity.sql.
update routes set name = 'Boulder Glacier / Boulder Cleaver' where id = 'wa_mount_baker_boulder_glacier' and area_id = 'wa_mount_baker' and name = 'Boulder Glacier';
update routes set name = 'North Ridge / Standard' where id = 'wa_lincoln_peak_north_ridge' and area_id = 'wa_lincoln_peak' and name = 'Wilkes-Booth (Northwest Face)';
update routes set grade = '5.9' where id = 'wa_mount_index_north_norwegian_buttress' and area_id = 'wa_north_norwegian_buttress' and grade = '5.9 A3+';
