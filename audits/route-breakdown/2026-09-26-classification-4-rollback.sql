-- Undo 2026-09-26-classification-4.sql.
update routes set grade = '5.8' where id = 'wa_concerto_in_c_for_drill_and_hammer' and area_id = 'wa_south_face' and grade = '5.8+';
update routes set grade = '5.10', grade_num = 10 where id = 'wa_prey' and area_id = 'wa_osprey_wall' and grade = '5.10c';
update routes set grade = '5.11', grade_num = 11 where id = 'wa_ellen_pea' and area_id = 'wa_m_m_wall_aka_supercave_wall' and grade = '5.11c';
update routes set grade = '5.9' where id = 'wa_big_four_mountain_spindrift_couloir' and area_id = 'wa_big_four_mountain' and grade = 'IV+ 5.9 WI5';
update routes set grade = '5.8 (a 2013 party found pitch 1 harder, closer to 5.10, due to loose rock)', grade_num = 10 where id = 'wa_cascade_peak_nw_chimney' and area_id = 'wa_cascade_peak' and grade = '5.8';
update routes set grade = null, grade_num = null where id = 'wa_fortress_mountain_east_ridge' and area_id = 'wa_fortress_mountain' and grade = 'Class 3-4';
update routes set grade = null, grade_num = null where id = 'wa_gilbert_peak_west_route' and area_id = 'wa_gilbert_peak' and grade = 'Class 3';
update routes set grade = null, grade_num = null where id = 'wa_south_twin_sister_scramble' and area_id = 'wa_south_twin_sister' and grade = 'Class 2-3';
update routes set pitches = 14 where id = 'wa_north_face_left_buttress' and area_id = 'wa_castle_peak_pasayten' and pitches = 12;
update routes set name = 'Dirty Sanchez' where id = 'wa_dirty_sanchez' and area_id = 'wa_goose_egg_mountain' and name = 'The Dirty';
