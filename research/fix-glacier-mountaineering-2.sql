-- Glacier crossed ON THE ROUTE -> mountaineering. Part 2 of 4.
-- Rationale + exclusions: see the PR. Guarded on id + area_id + current discipline,
-- so a re-run affects 0 rows. Expect UPDATE 1 x16.

update routes set discipline='mountaineering' where id='wa_kyes_peak_northeast_ridge' and area_id='wa_kyes_peak' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_liberty_cap_liberty_ridge_finish' and area_id='wa_liberty_cap' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_little_sister_north_face' and area_id='wa_little_sister' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_little_tahoma_cowlitz_ingraham_glaciers' and area_id='wa_little_tahoma' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_luna_glacier' and area_id='wa_phantom_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_magic_mountain_west_ridge' and area_id='wa_magic_mountain' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_mesahchie_peak_west_ridge' and area_id='wa_mesahchie_peak' and discipline='scrambling';
update routes set discipline='mountaineering' where id='wa_mount_adams_adams_glacier' and area_id='wa_mount_adams' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_adams_lava_glacier_headwall' and area_id='wa_mount_adams' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_adams_wilson_glacier_headwall' and area_id='wa_mount_adams' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_baker_coleman_headwall' and area_id='wa_mount_baker' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_baker_north_ridge' and area_id='wa_mount_baker' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_baker_park_glacier_headwall' and area_id='wa_mount_baker' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_challenger_challenger_glacier' and area_id='wa_mount_challenger' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_deception_standard' and area_id='wa_mount_deception' and discipline='scrambling';
update routes set discipline='mountaineering' where id='wa_mount_logan_fremont_glacier' and area_id='wa_mount_logan' and discipline='alpine';

select count(*) filter (where discipline='mountaineering') as done, count(*) as total
  from routes where id in ('wa_kyes_peak_northeast_ridge','wa_liberty_cap_liberty_ridge_finish','wa_little_sister_north_face','wa_little_tahoma_cowlitz_ingraham_glaciers','wa_luna_glacier','wa_magic_mountain_west_ridge','wa_mesahchie_peak_west_ridge','wa_mount_adams_adams_glacier','wa_mount_adams_lava_glacier_headwall','wa_mount_adams_wilson_glacier_headwall','wa_mount_baker_coleman_headwall','wa_mount_baker_north_ridge','wa_mount_baker_park_glacier_headwall','wa_mount_challenger_challenger_glacier','wa_mount_deception_standard','wa_mount_logan_fremont_glacier');
