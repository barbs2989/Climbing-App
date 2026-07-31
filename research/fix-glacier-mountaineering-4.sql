-- Glacier crossed ON THE ROUTE -> mountaineering. Part 4 of 4.
-- Rationale + exclusions: see the PR. Guarded on id + area_id + current discipline,
-- so a re-run affects 0 rows. Expect UPDATE 1 x16.

update routes set discipline='mountaineering' where id='wa_neve_glacier_west_ridge' and area_id='wa_snowfield_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_old_guard_peak_east_side_route' and area_id='wa_old_guard_peak' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_olympus_blue_glacier_east_ramps' and area_id='wa_mount_olympus' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_primus_peak_south_ridge' and area_id='wa_primus_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_ptarmigan_traverse' and area_id='wa_alpine_and_technical_traverses' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_ruth_mountain_south_slopes' and area_id='wa_ruth_mountain' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_sherpa_glacier' and area_id='wa_mount_stuart' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_sitkum_spire_standard' and area_id='wa_sitkum_spire' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_sloan_peak_r1' and area_id='wa_sloan_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_south_face_5' and area_id='wa_inspiration_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_spider_mountain_north_ridge' and area_id='wa_spider_mountain' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_swiss_peak_standard_route' and area_id='wa_swiss_peak' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_three_fingers_r1' and area_id='wa_three_fingers' and discipline='scrambling';
update routes set discipline='mountaineering' where id='wa_three_fingers_r2' and area_id='wa_three_fingers' and discipline='scrambling';
update routes set discipline='mountaineering' where id='wa_three_fingers_south_peak_lookout' and area_id='wa_three_fingers' and discipline='scrambling';
update routes set discipline='mountaineering' where id='wa_west_ridge_6' and area_id='wa_west_mcmillan_spire' and discipline='alpine';

select count(*) filter (where discipline='mountaineering') as done, count(*) as total
  from routes where id in ('wa_neve_glacier_west_ridge','wa_old_guard_peak_east_side_route','wa_olympus_blue_glacier_east_ramps','wa_primus_peak_south_ridge','wa_ptarmigan_traverse','wa_ruth_mountain_south_slopes','wa_sherpa_glacier','wa_sitkum_spire_standard','wa_sloan_peak_r1','wa_south_face_5','wa_spider_mountain_north_ridge','wa_swiss_peak_standard_route','wa_three_fingers_r1','wa_three_fingers_r2','wa_three_fingers_south_peak_lookout','wa_west_ridge_6');
