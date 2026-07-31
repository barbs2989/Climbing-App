-- routes.grade_system disagrees with the grade string it labels. Part 1.
-- e.g. grade '5.8' stored with system 'v'; grade 'Class 4' stored as 'yds'.
-- The app already derives the system from the grade string (routeGradeSystem, PR #457),
-- so this aligns the column with the behaviour rather than changing what users see.
-- Guarded on id + the current wrong value; a re-run affects 0 rows. Expect UPDATE 1 x19.

update routes set grade_system='yds' where id='wa_5_8_cube_crack' and grade_system='v';
update routes set grade_system='class' where id='wa_andersons_thumb_standard' and grade_system='yds';
update routes set grade_system='yds' where id='wa_beehive_crack' and grade_system='v';
update routes set grade_system='class' where id='wa_bonanza_peak_mary_green_glacier' and grade_system='yds';
update routes set grade_system='yds' where id='wa_chair_bryant_traverse' and grade_system='aid';
update routes set grade_system='class' where id='wa_chair_peak_northeast_buttress' and grade_system='yds';
update routes set grade_system='class' where id='wa_chimney_rock_west_face' and grade_system='yds';
update routes set grade_system='wi' where id='wa_colfax_peak_cosley_houston' and grade_system='yds';
update routes set grade_system='m' where id='wa_colfax_peak_kimchi_suicide_volcano' and grade_system='yds';
update routes set grade_system='wi' where id='wa_colfax_peak_polish_route' and grade_system='yds';
update routes set grade_system='class' where id='wa_corteo_peak_southwest_ridge' and grade_system='yds';
update routes set grade_system='class' where id='wa_devore_peak_west_ridge' and grade_system='yds';
update routes set grade_system='class' where id='wa_dome_peak_dome_glacier' and grade_system='yds';
update routes set grade_system='class' where id='wa_elephant_head_standard' and grade_system='yds';
update routes set grade_system='class' where id='wa_goat_mountain_south_ridge' and grade_system='yds';
update routes set grade_system='yds' where id='wa_grandpa_lit_the_roof_on_fire' and grade_system='v';
update routes set grade_system='class' where id='wa_gunsight_peak_standard' and grade_system='yds';
update routes set grade_system='class' where id='wa_guye_peak_r2' and grade_system='yds';
update routes set grade_system='class' where id='wa_horseshoe_peak_scramble' and grade_system='yds';

select count(*) as fixed from routes where id in ('wa_5_8_cube_crack','wa_andersons_thumb_standard','wa_beehive_crack','wa_bonanza_peak_mary_green_glacier','wa_chair_bryant_traverse','wa_chair_peak_northeast_buttress','wa_chimney_rock_west_face','wa_colfax_peak_cosley_houston','wa_colfax_peak_kimchi_suicide_volcano','wa_colfax_peak_polish_route','wa_corteo_peak_southwest_ridge','wa_devore_peak_west_ridge','wa_dome_peak_dome_glacier','wa_elephant_head_standard','wa_goat_mountain_south_ridge','wa_grandpa_lit_the_roof_on_fire','wa_gunsight_peak_standard','wa_guye_peak_r2','wa_horseshoe_peak_scramble')
  and grade_system in ('yds','v','wi','m','class');
