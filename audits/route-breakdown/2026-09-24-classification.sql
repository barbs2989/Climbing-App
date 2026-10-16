-- Classification corrections from the 2026-09-24 verification pass (audits/route-breakdown/
-- 2026-09-24-verify-*.json, review.classification). Each was confirmed by two or more sources.
-- Every UPDATE pins id + area_id + the CURRENT value, so a row that has moved since it was read
-- matches nothing rather than being overwritten. grade_num comes from lib/grade.js gradeNumFor().

-- Grade V, 21-pitch 5.10- rock route filed as mountaineering; MP lists it Trad/Alpine.
update routes set discipline = 'alpine'
 where id = 'wa_direct_north_buttress' and area_id = 'wa_bear_mountain_chilliwack' and discipline = 'mountaineering';

-- First-ascent report grades the ice AI4+; grade was empty.
update routes set grade = 'AI4+', grade_num = 4
 where id = 'wa_colfax_peak_fords_theatre' and area_id = 'wa_colfax_peak' and grade is null;

-- 1972 route is NCCS IV F7 (5.7); 5.9 belongs to the separate Direct Tower Route.
update routes set grade = 'IV 5.7', grade_num = 7
 where id = 'wa_big_four_mountain_tower_route' and area_id = 'wa_big_four_mountain' and grade = '5.9';

-- Ice couloir carried a commitment grade with no ice grade.
update routes set grade = 'III, WI4', grade_num = 4
 where id = 'wa_cutthroat_peak_cauthorn_wilson_couloir' and area_id = 'wa_cutthroat_peak' and grade = 'III+';

-- NPS grades the upper ice step AI3.
update routes set grade = 'Grade III, AI3', grade_num = 3
 where id = 'wa_mount_rainier_kautz_glacier' and area_id = 'wa_mount_rainier' and grade = 'Grade III, ice to ~40–45°';

-- Both pitch-by-pitch descriptions give 14 pitches on the tower (table rewritten to 14 in #1877).
update routes set pitches = 14
 where id = 'wa_vanishing_point' and area_id = 'wa_dolomite_tower' and pitches = 20;

-- Every field but the name (FA Molenaar et al. 1960, III, AI1-2, 2,000 ft, 5 pitches) is the
-- North Ridge (West Face); the real Northwest Ridge is an unroped snow-and-talus ridge.
update routes set name = 'North Ridge (West Face)', grade = 'Grade III, AI1-2', grade_num = 2
 where id = 'wa_mount_adams_northwest_ridge' and area_id = 'wa_mount_adams' and name = 'Northwest Ridge' and grade is null;

-- Empty grades filled from two or more sources.
update routes set grade = 'Grade I, snow to 50°'
 where id = 'wa_south_early_winter_spire_southwest_couloir' and area_id = 'wa_south_early_winters_spire' and grade is null;
update routes set grade = 'Steep snow to 45°'
 where id = 'wa_mount_adams_mazama_glacier_headwall' and area_id = 'wa_mount_adams' and grade is null;
update routes set grade = 'Steep snow/ice 45–50°'
 where id = 'wa_mount_rainier_edmunds_headwall' and area_id = 'wa_mount_rainier' and grade is null;
update routes set grade = 'Class 4', grade_num = 4
 where id = 'wa_icy_peak_ruth_icy_traverse' and area_id = 'wa_icy_peak' and grade is null;
