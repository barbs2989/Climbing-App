-- WA alpine audit batch 204 (pass 4)
-- Routes: wa_mix_up_peak_east_face, wa_mojo_rising, wa_mount_adams_adams_glacier,
-- wa_mount_adams_lava_glacier_headwall, wa_mount_adams_lyman_glacier,
-- wa_mount_adams_mazama_glacier_headwall, wa_mount_adams_north_ridge,
-- wa_mount_adams_northwest_ridge.
--
-- Both fixes below correct an internal contradiction between a route's free-text
-- grade field and its separate commitment column, which are meant to encode the
-- same NCCS commitment grade. See audits/wa-alpine-audit-log.md for the full
-- reasoning and for the items flagged for human review rather than fixed here.

-- wa_mix_up_peak_east_face: the grade field already states "Grade II, Class 4 / low
-- 5th" but the separate commitment column stored "I". A 7-9 hour car-to-car outing
-- with two roped 5th-class pitches and a multi-rappel descent is squarely NCCS
-- Grade II (most of a day), not Grade I (a few hours). Fixing commitment to agree
-- with the row's own stated grade.
UPDATE routes SET commitment = 'II' WHERE id = 'wa_mix_up_peak_east_face';

-- wa_mount_adams_lyman_glacier: the grade field said "III" while the separate
-- commitment column already said "II". The Mountaineers' own listing for this climb
-- (Intermediate Alpine Climb, Mount Adams / North Lyman Glacier) calls it a Grade II
-- ice climb, agreeing with commitment rather than with grade. Fixing grade to match
-- the external source and the row's own commitment field.
UPDATE routes SET grade = 'II' WHERE id = 'wa_mount_adams_lyman_glacier';
