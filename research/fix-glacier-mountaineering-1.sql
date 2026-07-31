-- Glacier crossed ON THE ROUTE -> mountaineering. Part 1 of 4.
-- Rationale + exclusions: see the PR. Guarded on id + area_id + current discipline,
-- so a re-run affects 0 rows. Expect UPDATE 1 x16.

update routes set discipline='mountaineering' where id='wa_american_border_peak_northeast_face' and area_id='wa_american_border_peak' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_andersons_thumb_standard' and area_id='wa_andersons_thumb' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_austera_peak_southwest_ridge' and area_id='wa_austera_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_bonanza_peak_mary_green_glacier' and area_id='wa_bonanza_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_boston_peak_southeast_face' and area_id='wa_boston_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_clark_mountain_west_ridge' and area_id='wa_clark_mountain' and discipline='scrambling';
update routes set discipline='mountaineering' where id='wa_colchuck_peak_northeast_couloir' and area_id='wa_colchuck_peak' and discipline='mixed';
update routes set discipline='mountaineering' where id='wa_crooked_thumb_peak_east_face' and area_id='wa_crooked_thumb_peak' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_dome_peak_indian_summer' and area_id='wa_dome_peak' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_dorado_needle_east_ridge' and area_id='wa_dorado_needle' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_east_face_6' and area_id='wa_chimney_rock' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_east_slope' and area_id='wa_primus_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_frying_pan_whitman_glaciers' and area_id='wa_little_tahoma' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_icy_peak_ruth_icy_traverse' and area_id='wa_icy_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_icy_peak_southwest_route' and area_id='wa_icy_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_klawatti_peak_southeast_face' and area_id='wa_klawatti_peak' and discipline='alpine';

select count(*) filter (where discipline='mountaineering') as done, count(*) as total
  from routes where id in ('wa_american_border_peak_northeast_face','wa_andersons_thumb_standard','wa_austera_peak_southwest_ridge','wa_bonanza_peak_mary_green_glacier','wa_boston_peak_southeast_face','wa_clark_mountain_west_ridge','wa_colchuck_peak_northeast_couloir','wa_crooked_thumb_peak_east_face','wa_dome_peak_indian_summer','wa_dorado_needle_east_ridge','wa_east_face_6','wa_east_slope','wa_frying_pan_whitman_glaciers','wa_icy_peak_ruth_icy_traverse','wa_icy_peak_southwest_route','wa_klawatti_peak_southeast_face');
