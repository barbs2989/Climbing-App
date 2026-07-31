-- routes.grade_system disagrees with the grade string it labels. Part 3.
-- e.g. grade '5.8' stored with system 'v'; grade 'Class 4' stored as 'yds'.
-- The app already derives the system from the grade string (routeGradeSystem, PR #457),
-- so this aligns the column with the behaviour rather than changing what users see.
-- Guarded on id + the current wrong value; a re-run affects 0 rows. Expect UPDATE 1 x17.

update routes set grade_system='yds' where id='wa_pow_crack' and grade_system='v';
update routes set grade_system='class' where id='wa_sentinel_peak_standard' and grade_system='yds';
update routes set grade_system='v' where id='wa_shock_and_awe' and grade_system='yds';
update routes set grade_system='class' where id='wa_sinister_peak_southwest_route' and grade_system='yds';
update routes set grade_system='class' where id='wa_sitkum_spire_standard' and grade_system='yds';
update routes set grade_system='class' where id='wa_skookum_peak_twinsisters_scramble' and grade_system='yds';
update routes set grade_system='yds' where id='wa_so_easy_i_forgot_to_laugh' and grade_system='v';
update routes set grade_system='yds' where id='wa_south_crack' and grade_system='v';
update routes set grade_system='class' where id='wa_tenpeak_mountain_southeast' and grade_system='yds';
update routes set grade_system='yds' where id='wa_the_fin_scramble' and grade_system='class';
update routes set grade_system='yds' where id='wa_the_fist' and grade_system='v';
update routes set grade_system='class' where id='wa_the_needle_neve_glacier' and grade_system='yds';
update routes set grade_system='yds' where id='wa_the_nug' and grade_system='v';
update routes set grade_system='wi' where id='wa_the_tooth_r1' and grade_system='yds';
update routes set grade_system='class' where id='wa_tower_mountain_southwest_route' and grade_system='yds';
update routes set grade_system='class' where id='wa_unicorn_peak_r1' and grade_system='yds';
update routes set grade_system='class' where id='wa_warrior_peak_standard' and grade_system='yds';

select count(*) as fixed from routes where id in ('wa_pow_crack','wa_sentinel_peak_standard','wa_shock_and_awe','wa_sinister_peak_southwest_route','wa_sitkum_spire_standard','wa_skookum_peak_twinsisters_scramble','wa_so_easy_i_forgot_to_laugh','wa_south_crack','wa_tenpeak_mountain_southeast','wa_the_fin_scramble','wa_the_fist','wa_the_needle_neve_glacier','wa_the_nug','wa_the_tooth_r1','wa_tower_mountain_southwest_route','wa_unicorn_peak_r1','wa_warrior_peak_standard')
  and grade_system in ('yds','v','wi','m','class');
