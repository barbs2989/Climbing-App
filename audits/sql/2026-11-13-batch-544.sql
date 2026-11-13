-- WA alpine audit, pass 8, batch 544
-- wa_spire_point_southwest_face (Spire Point, "Southeast Face" -- a 2026-08-27 correction already
-- fixed this row's face/name/aspect from an earlier mistaken "Southwest" labeling, but left the
-- headline grade untouched): grade and rock_grade are stored as "5.4" (grade_num 4), but this
-- row's own pitch_detail explicitly labels pitch 5 "(Crux)" at grade "5.6", and its own rope_note
-- already says "5-pitch 5.6 (low-5th-class) rock route" -- a self-contradiction on this same row,
-- the same pattern as the wa_soviet_route pitches fix in batch 543. External sources agree with
-- the row's own pitch_detail/rope_note, not with grade/rock_grade: SummitPost's Spire Point page
-- describes this south-face line as "5 Full-Pitch 5.6," and an independent trip report likewise
-- describes "South face of Spire Point - 5.6, five pitches." Correcting grade/grade_num/rock_grade
-- to 5.6 to match pitch_detail, rope_note, and both external sources.
UPDATE routes
SET grade = '5.6',
    grade_num = 6,
    rock_grade = '5.6'
WHERE id = 'wa_spire_point_southwest_face'
  AND grade = '5.4'
  AND rock_grade = '5.4';
