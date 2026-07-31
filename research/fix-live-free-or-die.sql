-- Live Free or Die!: the row contradicts its own overview, which reads
-- "is NOT a boulder problem - it is a full 8-pitch, roughly 1,200-foot free route
--  up Liberty Bell's East Face (grade 5.11+ yds...)".
-- Columns hold grade 'V5+' (a boulder grade) and pitches 11. Both corrected from the
-- route's own text. grade_system 'yds' is already right once the grade is YDS.
-- Guarded on the current wrong values; a re-run affects 0 rows.

update routes set grade='5.11+', pitches=8
 where id='wa_live_free_or_die' and area_id='wa_liberty_bell'
   and grade='V5+' and pitches=11;

select id, grade, grade_system, pitches from routes where id='wa_live_free_or_die';
