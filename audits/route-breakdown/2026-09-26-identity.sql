-- Identity resolution (2026-09-26-identity-1.json, -2.json): names and one grade, so each row's classification matches
-- the one climb its text now describes. Pinned on id + area + current value. Rollback: 2026-09-26-identity-rollback.sql.

-- Boulder Glacier: the row now describes the glacier line; the cleaver is its own row (wa_mount_baker_boulder_park_cleaver).
update routes set name = 'Boulder Glacier'
 where id = 'wa_mount_baker_boulder_glacier' and area_id = 'wa_mount_baker' and name = 'Boulder Glacier / Boulder Cleaver';
-- Lincoln Peak: "North Ridge / Standard" matches no documented route; the row's grade, fa and text are Wilkes-Booth.
update routes set name = 'Wilkes-Booth (Northwest Face)'
 where id = 'wa_lincoln_peak_north_ridge' and area_id = 'wa_lincoln_peak' and name = 'North Ridge / Standard';
-- Jötnar: VI 5.9 A3+; the stored 5.9 hid the aid. grade_num unchanged (9).
update routes set grade = '5.9 A3+'
 where id = 'wa_mount_index_north_norwegian_buttress' and area_id = 'wa_north_norwegian_buttress' and grade = '5.9';
