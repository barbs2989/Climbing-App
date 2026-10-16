-- Round-2 verification (2026-09-25-verify-5.json): classification fixes confirmed against sources.
-- Each is pinned on id + area + current value; grade_num is the value lib/grade.js gradeNumFor() gives the new grade.
-- Rollback: 2026-09-25-classification-2-rollback.sql.
-- Held back: Kennedy grade (would empty grade_num 3 -> null), Sherpa grade (proposed value is prose, not a grade),
-- Sitkum grade (rewording only), Index Traverse pitches -> null (could change how the page classifies the route).

-- Mojo Rising: the aid pitches have not been freed; the grade hid the aid.
update routes set grade = '5.11b C1+' where id = 'wa_mojo_rising' and area_id = 'wa_south_early_winters_spire' and grade = '5.11b';
-- The Tooth Fairy: 5.9+ (grade_num unchanged at 9).
update routes set grade = '5.9+' where id = 'wa_the_tooth_fairy' and area_id = 'wa_the_tooth' and grade = '5.9';
-- Enchantment Peak East Ridge: grade was empty; Class 2 ridge with a Class 3 summit block.
update routes set grade = 'Class 2-3', grade_num = 3 where id = 'wa_enchantment_peak_east_ridge' and area_id = 'wa_enchantment_peak' and grade is null;
-- Triumph West Route: grade was empty; Class 4.
update routes set grade = 'Class 4', grade_num = 4 where id = 'wa_mount_triumph_west_route' and area_id = 'wa_mount_triumph' and grade is null;
-- Vesper standard route: Class 2 with Class 3 slabs.
update routes set grade = 'Class 2-3', grade_num = 3 where id = 'wa_vesper_peak_standard_route' and area_id = 'wa_vesper_peak' and grade = '2nd';
-- Ultramega OK: 900 ft (273 m), which the row's own overview states; 310 had no source.
update routes set length_m = 273 where id = 'wa_ultramega_ok' and area_id = 'wa_burgundy_spire' and length_m = 310;
-- Bacon Peak: the ascent is the Diobsud Creek Glacier; the Green Lake Glacier is only on the traverse descent.
update routes set name = 'Diobsud Creek Glacier' where id = 'wa_bacon_peak_diobsud' and area_id = 'wa_bacon_peak' and name = 'Diobsud Creek / Green Lake Glacier';
