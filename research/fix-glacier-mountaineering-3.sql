-- Glacier crossed ON THE ROUTE -> mountaineering. Part 3 of 4.
-- Rationale + exclusions: see the PR. Guarded on id + area_id + current discipline,
-- so a re-run affects 0 rows. Expect UPDATE 1 x16.

update routes set discipline='mountaineering' where id='wa_mount_maude_r1' and area_id='wa_mount_maude' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_olympus_blue_glacier' and area_id='wa_mount_olympus' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_rainier_kautz_headwall' and area_id='wa_mount_rainier' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_rainier_mowich_face' and area_id='wa_mount_rainier' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_rainier_tahoma_glacier' and area_id='wa_mount_rainier' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_sefrit_southeast_ridge' and area_id='wa_mount_sefrit' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_mount_shuksan_fisher_chimneys' and area_id='wa_mount_shuksan' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_shuksan_hanging_glacier' and area_id='wa_mount_shuksan' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_shuksan_northwest_arete' and area_id='wa_mount_shuksan' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_shuksan_price_glacier' and area_id='wa_mount_shuksan' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_shuksan_sulphide_glacier' and area_id='wa_mount_shuksan' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_shuksan_white_salmon_glacier' and area_id='wa_mount_shuksan' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_stuart_girth_pillar' and area_id='wa_mount_stuart' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_stuart_ice_cliff_glacier' and area_id='wa_mount_stuart' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_stuart_stuart_glacier_couloir' and area_id='wa_mount_stuart' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_torment_torment_forbidden_traverse' and area_id='wa_mount_torment' and discipline='alpine';

select count(*) filter (where discipline='mountaineering') as done, count(*) as total
  from routes where id in ('wa_mount_maude_r1','wa_mount_olympus_blue_glacier','wa_mount_rainier_kautz_headwall','wa_mount_rainier_mowich_face','wa_mount_rainier_tahoma_glacier','wa_mount_sefrit_southeast_ridge','wa_mount_shuksan_fisher_chimneys','wa_mount_shuksan_hanging_glacier','wa_mount_shuksan_northwest_arete','wa_mount_shuksan_price_glacier','wa_mount_shuksan_sulphide_glacier','wa_mount_shuksan_white_salmon_glacier','wa_mount_stuart_girth_pillar','wa_mount_stuart_ice_cliff_glacier','wa_mount_stuart_stuart_glacier_couloir','wa_mount_torment_torment_forbidden_traverse');
