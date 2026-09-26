-- Undo 2026-09-25-classification-3.sql.
update routes set grade = '5.11' where id = 'wa_big_kangaroo_walkabout' and area_id = 'wa_big_kangaroo' and grade = '5.11 A2';
update routes set grade = '5.2', grade_num = 2 where id = 'wa_sw_couloir_and_face' and area_id = 'wa_mount_shuksan' and grade = 'WI3 5.2';
update routes set grade = null, grade_num = null where id = 'wa_snoqualmie_mountain_the_snostril' and area_id = 'wa_snoqualmie_mountain' and grade = 'WI4+ M5+';
update routes set grade = null, grade_num = null where id = 'wa_fantasy_falls' and area_id = 'wa_unicorn_peak' and grade = 'WI5';
update routes set grade = 'Class 5.4' where id = 'wa_olympus_summit_block_north_face' and area_id = 'wa_mount_olympus' and grade = '5.4';
