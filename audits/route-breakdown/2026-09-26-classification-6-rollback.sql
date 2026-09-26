-- Undo 2026-09-26-classification-6.sql.
update routes set grade = '5.10+', grade_num = 10 where id = 'wa_one_piece_at_a_time' and area_id = 'wa_cutthroat_wall' and grade = '5.10d';
update routes set grade = 'Class 5.6 / glacier' where id = 'wa_gunsight_peak_standard' and area_id = 'wa_middle_peak' and grade = '5.6';
update routes set discipline = 'mountaineering' where id = 'wa_south_ridge' and area_id = 'wa_south_peak' and discipline = 'alpine';
