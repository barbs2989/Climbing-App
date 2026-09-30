-- verify-16 (leftovers, third pass). Rollback: 2026-09-30-classification-10-rollback.sql.
-- Little Tahoma Cowlitz/Ingraham: the stored breakdown finishes by the East Shoulder gully-chimney. Five independent
-- sources give that finish Class 3; the club's Class 4 / low 5th rating is for its South Shoulder variant. The Class 4
-- move or two at the saddle stays in the breakdown row that describes it.
update routes set grade = 'Class 3, steep snow', grade_num = 3
 where id = 'wa_little_tahoma_cowlitz_ingraham_glaciers' and area_id = 'wa_little_tahoma' and grade is null;
