-- Undo 2026-09-25-classification.sql.
update routes set grade = null where id = 'wa_mount_baker_squak_glacier' and area_id = 'wa_mount_baker' and grade = 'Grade III, Easy Snow';
update routes set pitches = 0 where id = 'wa_mount_baker_cockscomb_ridge' and area_id = 'wa_mount_baker' and pitches = 5;
