-- Rollback for 2026-09-27-classification-8.sql.
update routes set discipline = 'mountaineering'
 where id = 'wa_accidental_discharge_east_face' and area_id = 'wa_south_peak' and discipline = 'alpine';
update routes set pitches = 4
 where id = 'wa_traverse_of_mount_index' and area_id = 'wa_main_peak_2' and pitches is null;
update routes set grade = 'Class 2-3, Glacier', grade_num = 3
 where id = 'wa_glacier_peak_kennedy_glacier' and area_id = 'wa_glacier_peak' and grade = 'Glacier, steep snow/ice 40–45°';
update routes set grade = '3rd', grade_num = 3
 where id = 'wa_sherpa_glacier' and area_id = 'wa_mount_stuart' and grade = 'Class 3, steep snow to 40°';
update routes set grade = null, grade_num = null
 where id = 'wa_mount_maude_r2' and area_id = 'wa_mount_maude' and grade = 'Grade III, alpine ice';
update routes set grade = null, grade_num = null
 where id = 'wa_sinister_peak_north_face' and area_id = 'wa_sinister_peak' and grade = 'Steep snow/ice 45–50°';
update routes set grade = null, grade_num = null
 where id = 'wa_lane_peak_r3' and area_id = 'wa_lane_peak' and grade = 'Grade II, steep snow/ice';
update routes set grade = 'Grade II, Class 4', grade_num = 4
 where id = 'wa_mount_logan_r2' and area_id = 'wa_mount_logan' and grade = 'Grade III, Class 4';
