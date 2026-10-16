-- verify-12 / verify-13 (leftovers): classification values confirmed by two agreeing sources; grade_num = gradeNumFor().
-- Rollback: 2026-09-27-classification-8-rollback.sql.
-- Accidental Discharge: a 3-pitch II 5.10 crack/offwidth rock route; the peak's other rock route is filed alpine.
update routes set discipline = 'alpine'
 where id = 'wa_accidental_discharge_east_face' and area_id = 'wa_south_peak' and discipline = 'mountaineering';
-- Traverse of Mount Index: 4 comes from one header and is contradicted by per-section counts; no source gives a total.
update routes set pitches = null
 where id = 'wa_traverse_of_mount_index' and area_id = 'wa_main_peak_2' and pitches = 4;
-- Kennedy Glacier: crux 40° headwall then ~45° often-icy slope; snow grades carry no grade_num.
update routes set grade = 'Glacier, steep snow/ice 40–45°', grade_num = null
 where id = 'wa_glacier_peak_kennedy_glacier' and area_id = 'wa_glacier_peak' and grade = 'Class 2-3, Glacier';
-- Sherpa Glacier: ~40° snow couloir to class-3 ridge scrambling.
update routes set grade = 'Class 3, steep snow to 40°', grade_num = 3
 where id = 'wa_sherpa_glacier' and area_id = 'wa_mount_stuart' and grade = '3rd';
-- Entiat Ice Fall (Mount Maude): Grade III alpine ice.
update routes set grade = 'Grade III, alpine ice', grade_num = null
 where id = 'wa_mount_maude_r2' and area_id = 'wa_mount_maude' and grade is null;
-- Sinister Peak North Face: 45–50° névé/ice face.
update routes set grade = 'Steep snow/ice 45–50°', grade_num = null
 where id = 'wa_sinister_peak_north_face' and area_id = 'wa_sinister_peak' and grade is null;
-- Lover's Lane (Lane Peak): Grade II steep snow/ice couloir.
update routes set grade = 'Grade II, steep snow/ice', grade_num = null
 where id = 'wa_lane_peak_r3' and area_id = 'wa_lane_peak' and grade is null;
-- Mount Logan Douglas Glacier: two sources give Grade III against one for II; the overview is updated to match.
update routes set grade = 'Grade III, Class 4', grade_num = 4
 where id = 'wa_mount_logan_r2' and area_id = 'wa_mount_logan' and grade = 'Grade II, Class 4';
