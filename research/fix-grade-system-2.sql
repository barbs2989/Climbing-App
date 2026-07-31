-- routes.grade_system disagrees with the grade string it labels. Part 2.
-- e.g. grade '5.8' stored with system 'v'; grade 'Class 4' stored as 'yds'.
-- The app already derives the system from the grade string (routeGradeSystem, PR #457),
-- so this aligns the column with the behaviour rather than changing what users see.
-- Guarded on id + the current wrong value; a re-run affects 0 rows. Expect UPDATE 1 x19.

update routes set grade_system='class' where id='wa_hozomeen_mountain_southeast_face' and grade_system='yds';
update routes set grade_system='class' where id='wa_huckleberry_mountain_west_route' and grade_system='yds';
update routes set grade_system='class' where id='wa_inner_constance_standard' and grade_system='yds';
update routes set grade_system='class' where id='wa_lemah_mountain_east_route' and grade_system='yds';
update routes set grade_system='yds' where id='wa_lightning_crack' and grade_system='v';
update routes set grade_system='class' where id='wa_little_big_chief_mountain_west_route' and grade_system='yds';
update routes set grade_system='v' where id='wa_live_free_or_die' and grade_system='yds';
update routes set grade_system='class' where id='wa_lundin_peak_west_ridge' and grade_system='yds';
update routes set grade_system='yds' where id='wa_meadow_and_spicer' and grade_system='v';
update routes set grade_system='class' where id='wa_monte_cristo_peak_scramble' and grade_system='yds';
update routes set grade_system='class' where id='wa_mount_challenger_challenger_glacier' and grade_system='yds';
update routes set grade_system='class' where id='wa_mount_despair_east_route' and grade_system='yds';
update routes set grade_system='class' where id='wa_mount_fury_east_southeast_glaciers' and grade_system='yds';
update routes set grade_system='class' where id='wa_mount_index_north_peak_traverse' and grade_system='yds';
update routes set grade_system='class' where id='wa_mount_johnson_standard' and grade_system='yds';
update routes set grade_system='class' where id='wa_mount_thomson_west_ridge' and grade_system='yds';
update routes set grade_system='wi' where id='wa_new_york_gully' and grade_system='yds';
update routes set grade_system='class' where id='wa_north_ridge_7' and grade_system='yds';
update routes set grade_system='class' where id='wa_overcoat_peak_southeast_route' and grade_system='yds';

select count(*) as fixed from routes where id in ('wa_hozomeen_mountain_southeast_face','wa_huckleberry_mountain_west_route','wa_inner_constance_standard','wa_lemah_mountain_east_route','wa_lightning_crack','wa_little_big_chief_mountain_west_route','wa_live_free_or_die','wa_lundin_peak_west_ridge','wa_meadow_and_spicer','wa_monte_cristo_peak_scramble','wa_mount_challenger_challenger_glacier','wa_mount_despair_east_route','wa_mount_fury_east_southeast_glaciers','wa_mount_index_north_peak_traverse','wa_mount_johnson_standard','wa_mount_thomson_west_ridge','wa_new_york_gully','wa_north_ridge_7','wa_overcoat_peak_southeast_route')
  and grade_system in ('yds','v','wi','m','class');
