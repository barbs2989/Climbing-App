-- Round 3, the tail. Two blind spots closed:
--  1. Scoping by `id like 'wa_%'` misses legacy ids -- Mount Adams' Avalanche Glacier
--     and two Rainier Mowich routes carry pre-migration ids. Scope by area_id.
--  2. The round-2 gear regex missed "glacier kit", "glacier gear" and "for the glacier
--     approach/descent" phrasings, so Chimney Rock West Face was wrongly reported as
--     included in round 2. It is here.
-- 12 routes. Guarded on id + area_id + current discipline; a re-run affects 0 rows.

update routes set discipline='mountaineering' where id='adams_avalanche_glacier' and area_id='wa_mount_adams' and discipline='alpine';
update routes set discipline='mountaineering' where id='rainier_central_mowich_face' and area_id='wa_mount_rainier' and discipline='alpine';
update routes set discipline='mountaineering' where id='rainier_north_mowich_headwall' and area_id='wa_mount_rainier' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_booker_mountain_northeast_face' and area_id='wa_booker_mountain' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_chimney_rock_west_face' and area_id='wa_chimney_rock' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_east_ridge_4' and area_id='wa_inspiration_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_inspiration_peak_west_ridge' and area_id='wa_inspiration_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_fury_west_west_ridge' and area_id='wa_mount_fury_west' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_north_face_left_buttress' and area_id='wa_castle_peak_pasayten' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_northeast_buttress_4' and area_id='wa_colchuck_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_phantom_peak_west_ridge' and area_id='wa_phantom_peak' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_poltergeist_pinnacle_north_route' and area_id='wa_poltergeist_pinnacle' and discipline='alpine';

select count(*) filter (where discipline='mountaineering') as done, count(*) as total
  from routes where id in (
  'adams_avalanche_glacier',
  'rainier_central_mowich_face',
  'rainier_north_mowich_headwall',
  'wa_booker_mountain_northeast_face',
  'wa_chimney_rock_west_face',
  'wa_east_ridge_4',
  'wa_inspiration_peak_west_ridge',
  'wa_mount_fury_west_west_ridge',
  'wa_north_face_left_buttress',
  'wa_northeast_buttress_4',
  'wa_phantom_peak_west_ridge',
  'wa_poltergeist_pinnacle_north_route');
