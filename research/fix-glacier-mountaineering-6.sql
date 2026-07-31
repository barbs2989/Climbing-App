-- Glacier crossed on the APPROACH counts too -- same rope, crampons and crevasse
-- rescue as crossing it higher up. Extends parts 1-4. Part 6.
-- Guarded on id + area_id + current discipline; a re-run affects 0 rows. Expect UPDATE 1 x16.

update routes set discipline='mountaineering' where id='wa_mount_baker_cockscomb_ridge' and area_id='wa_mount_baker' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_blum_north_ridge' and area_id='wa_mount_blum' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_mount_goode_northeast_buttress' and area_id='wa_mount_goode' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_olympus_west_ridge' and area_id='wa_mount_olympus' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_rainier_fuhrer_thumb' and area_id='wa_mount_rainier' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_shuksan_beckey_schmidtke' and area_id='wa_mount_shuksan' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_northeast_face_direct' and area_id='wa_mount_formidable' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_northwest_ridge' and area_id='wa_dorado_needle' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_phantom_peak_south_route' and area_id='wa_phantom_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_point_success_south_side' and area_id='wa_point_success' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_poltergeist_pinnacle' and area_id='wa_mount_challenger' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_ragged_ridge' and area_id='wa_alpine_and_technical_traverses' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_sharkfin_tower_southeast_ridge' and area_id='wa_sharkfin_tower' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_southeast_face' and area_id='wa_sharkfin_tower' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_southeast_ridge_se_corner' and area_id='wa_mount_shuksan' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_southwest_buttress' and area_id='wa_dorado_needle' and discipline='alpine';

select count(*) filter (where discipline='mountaineering') as done, count(*) as total
  from routes where id in ('wa_mount_baker_cockscomb_ridge','wa_mount_blum_north_ridge','wa_mount_goode_northeast_buttress','wa_mount_olympus_west_ridge','wa_mount_rainier_fuhrer_thumb','wa_mount_shuksan_beckey_schmidtke','wa_northeast_face_direct','wa_northwest_ridge','wa_phantom_peak_south_route','wa_point_success_south_side','wa_poltergeist_pinnacle','wa_ragged_ridge','wa_sharkfin_tower_southeast_ridge','wa_southeast_face','wa_southeast_ridge_se_corner','wa_southwest_buttress');
