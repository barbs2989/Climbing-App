-- Round-2 verification (2026-09-25-verify-4.json): classification fixes confirmed against sources.
-- Pinned on id + area + current value so a changed row matches nothing. Rollback: 2026-09-25-classification-rollback.sql.
-- Held back (see findings): Megalodon pitches 8 -> 20 (20 is a different line from the stored first-ascent grade),
-- Bonanza grade V -> 5.7 (single source; changes grade_num 5 -> 7), Little Tahoma grade (identity question open).

-- Squak Glacier: grade was empty; graded Easy Snow, Grade III. grade_num stays null (the parser gives null for it).
update routes set grade = 'Grade III, Easy Snow'
 where id = 'wa_mount_baker_squak_glacier' and area_id = 'wa_mount_baker' and grade is null;

-- Cockscomb Ridge: pitches 0, while the route is 5 pitches (and the row's own beta says 5).
update routes set pitches = 5
 where id = 'wa_mount_baker_cockscomb_ridge' and area_id = 'wa_mount_baker' and pitches = 0;
