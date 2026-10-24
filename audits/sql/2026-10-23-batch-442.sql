-- wa_northwest_face_boving_pollock: watch_out prose said "5.11a" but this route's own
-- grade/rock_grade (5.11b, confirmed by Mountain Project) disagrees with itself -- fix the prose.
UPDATE routes
SET watch_out = to_jsonb(replace(watch_out #>> '{}', '5.11a', '5.11b'))
WHERE id = 'wa_northwest_face_boving_pollock';
