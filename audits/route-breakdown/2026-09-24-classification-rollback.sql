-- Reverses 2026-09-24-classification.sql, restoring the values read immediately before it ran.
update routes set discipline = 'mountaineering' where id = 'wa_direct_north_buttress' and discipline = 'alpine';
update routes set grade = null, grade_num = null where id = 'wa_colfax_peak_fords_theatre' and grade = 'AI4+';
update routes set grade = '5.9', grade_num = 9 where id = 'wa_big_four_mountain_tower_route' and grade = 'IV 5.7';
update routes set grade = 'III+', grade_num = null where id = 'wa_cutthroat_peak_cauthorn_wilson_couloir' and grade = 'III, WI4';
update routes set grade = 'Grade III, ice to ~40–45°', grade_num = null where id = 'wa_mount_rainier_kautz_glacier' and grade = 'Grade III, AI3';
update routes set pitches = 20 where id = 'wa_vanishing_point' and pitches = 14;
update routes set name = 'Northwest Ridge', grade = null, grade_num = null where id = 'wa_mount_adams_northwest_ridge' and name = 'North Ridge (West Face)';
update routes set grade = null where id = 'wa_south_early_winter_spire_southwest_couloir' and grade = 'Grade I, snow to 50°';
update routes set grade = null where id = 'wa_mount_adams_mazama_glacier_headwall' and grade = 'Steep snow to 45°';
update routes set grade = null where id = 'wa_mount_rainier_edmunds_headwall' and grade = 'Steep snow/ice 45–50°';
update routes set grade = null, grade_num = null where id = 'wa_icy_peak_ruth_icy_traverse' and grade = 'Class 4';
