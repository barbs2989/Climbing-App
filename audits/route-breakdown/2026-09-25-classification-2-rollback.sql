-- Undo 2026-09-25-classification-2.sql.
update routes set grade = '5.11b' where id = 'wa_mojo_rising' and area_id = 'wa_south_early_winters_spire' and grade = '5.11b C1+';
update routes set grade = '5.9' where id = 'wa_the_tooth_fairy' and area_id = 'wa_the_tooth' and grade = '5.9+';
update routes set grade = null, grade_num = null where id = 'wa_enchantment_peak_east_ridge' and area_id = 'wa_enchantment_peak' and grade = 'Class 2-3';
update routes set grade = null, grade_num = null where id = 'wa_mount_triumph_west_route' and area_id = 'wa_mount_triumph' and grade = 'Class 4';
update routes set grade = '2nd', grade_num = 2 where id = 'wa_vesper_peak_standard_route' and area_id = 'wa_vesper_peak' and grade = 'Class 2-3';
update routes set length_m = 310 where id = 'wa_ultramega_ok' and area_id = 'wa_burgundy_spire' and length_m = 273;
update routes set name = 'Diobsud Creek / Green Lake Glacier' where id = 'wa_bacon_peak_diobsud' and area_id = 'wa_bacon_peak' and name = 'Diobsud Creek Glacier';
