-- WA alpine/mountaineering audit -- batch 367 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_south_face_10, wa_south_face_12, wa_south_face_2, wa_south_face_2001_variation,
--         wa_south_face_3, wa_south_face_4, wa_south_face_5, wa_south_face_8,
--         wa_south_face_center, wa_south_gully_south_spur
-- Every UPDATE is guarded on the value read live just before this file was written.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- wa_south_gully_south_spur (Guye Peak): grade_num (2) disagrees with the catalog's
-- own single grade parser for its stored grade string. gradeNumFrom() in lib/grade.js
-- has a dedicated bare-ordinal branch (RX_ORD) specifically for strings like "Easy
-- 5th" with no "class"/"5." in them, added 2026-08-12 to stop these ~40 WA rows from
-- scoring null -- the comment at lib/grade.js:163-171 names "Easy 5th" by name as one
-- of the three strings the fix makes score correctly (4, 3, 5 respectively).
-- Verified live: `gradeNumFor('Easy 5th', 'alpine') === 5` (ran lib/grade.js from
-- origin/main directly, since this audit branch's own copy is stale and lacks the
-- function). The SAME grade string "Easy 5th" appears on wa_south_face_8 (Lundin
-- Peak) in this same batch with grade_num already correctly set to 5 -- confirming
-- the parser is deterministic and this row alone drifted from it.
UPDATE routes SET grade_num = 5
WHERE id = 'wa_south_gully_south_spur'
  AND grade = 'Easy 5th' AND grade_num = 2;

COMMIT;
