-- verify-10 / verify-11 (round-5 findings): classification values confirmed against sources; grade_num = gradeNumFor().
-- Rollback: 2026-09-26-classification-6-rollback.sql.
-- One Piece at a Time: the route page and a trip report both give 5.10d; the stored table already marks P2 as the 5.10d crux.
update routes set grade = '5.10d', grade_num = 11
 where id = 'wa_one_piece_at_a_time' and area_id = 'wa_cutthroat_wall' and grade = '5.10+';
-- Gunsight Peak Standard: the grade column takes a grade; the glacier travel is already in approach and descent_text.
update routes set grade = '5.6'
 where id = 'wa_gunsight_peak_standard' and area_id = 'wa_middle_peak' and grade = 'Class 5.6 / glacier';
-- South Peak South Ridge: a 3-pitch Grade II 5.8 trad alpine rock route, listed as Trad, Alpine.
update routes set discipline = 'alpine'
 where id = 'wa_south_ridge' and area_id = 'wa_south_peak' and discipline = 'mountaineering';
