-- Round-5 batch H review: name + grade confirmed against sources. Rollback: 2026-09-26-classification-5-rollback.sql.
-- Mount Carrie: the one documented summit route climbs the southwest ridge from Boston Charlie's via the High Divide and
-- the Catwalk (three sources); nothing documents a southeast route or a start from Hurricane Ridge.
update routes set name = 'Southwest Ridge via High Divide and the Catwalk'
 where id = 'wa_mount_carrie_se_route' and area_id = 'wa_mount_carrie' and name = 'Southeast Route via Hurricane Ridge / Cat Basin';
-- Big Snow East Ridge (Hardscrabble): grade was empty; every source rates it class 2.
update routes set grade = 'Class 2', grade_num = 2
 where id = 'wa_big_snow_mountain_east_ridge_hardscrabble_route' and area_id = 'wa_big_snow_mountain' and grade is null;
