-- Follow-up to my own error. Two fixes in PR #492 were generated from the same
-- snapshot and contradicted each other:
--
--   fix-grade-system-*.sql  saw grade 'V5+'  -> set grade_system = 'v'
--   fix-live-free-or-die.sql                 -> set grade   = '5.11+'
--
-- Applied in that order the row ends as grade '5.11+' with system 'v'. The
-- grade is right (its overview states 5.11+ yds); only the system is stale.
--
-- Guarded on the exact wrong pair, so this is a no-op if anything has moved.

update routes set grade_system='yds'
 where id='wa_live_free_or_die' and area_id='wa_liberty_bell'
   and grade='5.11+' and grade_system='v';

select id, grade, grade_system, pitches, discipline
  from routes where id='wa_live_free_or_die';
