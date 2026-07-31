-- Round 2: routes whose GEAR requires glacier travel (crevasse rescue kit, glacier
-- rope, glacier travel harness) but which are not yet mountaineering. The prose scan
-- missed these -- several describe the peak as "glaciated" or say nothing about ice at
-- all, while the gear list says glacier travel is mandatory. Gear is the better signal.
-- 49 routes. Guarded on id + area_id + current discipline; a re-run affects 0 rows.
-- ~6KB: if the closing count does not appear, the paste was truncated.

update routes set discipline='mountaineering' where id='wa_accidental_discharge_east_face' and area_id='wa_south_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_bonanza_peak_north_ridge' and area_id='wa_bonanza_peak' and discipline='scrambling';
update routes set discipline='mountaineering' where id='wa_buckner_mountain_north_face' and area_id='wa_buckner_mountain' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_chalangin_peak_little_giant_pass_luahna_col' and area_id='wa_chalangin_peak' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_colfax_peak_cosley_houston' and area_id='wa_colfax_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_colfax_peak_polish_route' and area_id='wa_colfax_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_copper_peak_south_route' and area_id='wa_copper_peak' and discipline='scrambling';
update routes set discipline='mountaineering' where id='wa_crooked_thumb_peak_south_route' and area_id='wa_crooked_thumb_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_eldorado_peak_west_arete' and area_id='wa_eldorado_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_elephant_head_standard' and area_id='wa_elephant_head' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_gunsight_peak_standard' and area_id='wa_middle_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_hurry_up_peak_south_ridge' and area_id='wa_hurry_up_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_jack_mountain_south_face' and area_id='wa_jack_mountain' and discipline='scrambling';
update routes set discipline='mountaineering' where id='wa_klawatti_peak_sw_buttress' and area_id='wa_klawatti_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_liberty_cap_ptarmigan_ridge_finish' and area_id='wa_liberty_cap' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_lincoln_peak_north_ridge' and area_id='wa_lincoln_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_lincoln_peak_standard' and area_id='wa_lincoln_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_magic_mountain_south_ridge' and area_id='wa_magic_mountain' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_christie_west' and area_id='wa_mount_christie' and discipline='scrambling';
update routes set discipline='mountaineering' where id='wa_mount_mathias_scramble' and area_id='wa_mount_mathias' and discipline='scrambling';
update routes set discipline='mountaineering' where id='wa_mount_mystery_standard' and area_id='wa_mount_mystery' and discipline='scrambling';
update routes set discipline='mountaineering' where id='wa_mount_rainier_curtis_ridge' and area_id='wa_mount_rainier' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_rainier_edmunds_headwall' and area_id='wa_mount_rainier' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_rainier_nisqually_icefall' and area_id='wa_mount_rainier' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_rainier_ptarmigan_ridge' and area_id='wa_mount_rainier' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_rainier_sunset_ridge' and area_id='wa_mount_rainier' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_rainier_willis_wall' and area_id='wa_mount_rainier' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_shuksan_north_face' and area_id='wa_mount_shuksan' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_shuksan_northeast_ridge' and area_id='wa_mount_shuksan' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_mount_terror_north_face' and area_id='wa_mount_terror' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_terror_stoddard_buttress' and area_id='wa_mount_terror' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_torment_south_ridge' and area_id='wa_mount_torment' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mount_triumph_northeast_ridge' and area_id='wa_mount_triumph' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_north_ridge_5' and area_id='wa_main_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_northwest_ridge_2' and area_id='wa_boston_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_olympus_traverse' and area_id='wa_mount_olympus' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_overcoat_peak_southeast_route' and area_id='wa_overcoat_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_ruth_icy_traverse' and area_id='wa_ruth_mountain' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_silver_star_ne_ridge' and area_id='wa_silver_star_mountain_okanogan' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_sinister_peak_north_face' and area_id='wa_sinister_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_sinister_peak_southwest_route' and area_id='wa_sinister_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_south_ridge' and area_id='wa_south_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_south_ridge_4' and area_id='wa_main_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_south_twin_sister_north_ridge' and area_id='wa_south_twin_sister' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_tepeh_towers' and area_id='wa_main_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_the_triad_east_peak' and area_id='wa_the_triad' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_tricouni_peak_southwest_slopes' and area_id='wa_tricouni_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_west_face_2' and area_id='wa_north_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_west_ridge_7' and area_id='wa_main_peak' and discipline='alpine';

select count(*) filter (where discipline='mountaineering') as done, count(*) as total
  from routes where id in (
  'wa_accidental_discharge_east_face',
  'wa_bonanza_peak_north_ridge',
  'wa_buckner_mountain_north_face',
  'wa_chalangin_peak_little_giant_pass_luahna_col',
  'wa_colfax_peak_cosley_houston',
  'wa_colfax_peak_polish_route',
  'wa_copper_peak_south_route',
  'wa_crooked_thumb_peak_south_route',
  'wa_eldorado_peak_west_arete',
  'wa_elephant_head_standard',
  'wa_gunsight_peak_standard',
  'wa_hurry_up_peak_south_ridge',
  'wa_jack_mountain_south_face',
  'wa_klawatti_peak_sw_buttress',
  'wa_liberty_cap_ptarmigan_ridge_finish',
  'wa_lincoln_peak_north_ridge',
  'wa_lincoln_peak_standard',
  'wa_magic_mountain_south_ridge',
  'wa_mount_christie_west',
  'wa_mount_mathias_scramble',
  'wa_mount_mystery_standard',
  'wa_mount_rainier_curtis_ridge',
  'wa_mount_rainier_edmunds_headwall',
  'wa_mount_rainier_nisqually_icefall',
  'wa_mount_rainier_ptarmigan_ridge',
  'wa_mount_rainier_sunset_ridge',
  'wa_mount_rainier_willis_wall',
  'wa_mount_shuksan_north_face',
  'wa_mount_shuksan_northeast_ridge',
  'wa_mount_terror_north_face',
  'wa_mount_terror_stoddard_buttress',
  'wa_mount_torment_south_ridge',
  'wa_mount_triumph_northeast_ridge',
  'wa_north_ridge_5',
  'wa_northwest_ridge_2',
  'wa_olympus_traverse',
  'wa_overcoat_peak_southeast_route',
  'wa_ruth_icy_traverse',
  'wa_silver_star_ne_ridge',
  'wa_sinister_peak_north_face',
  'wa_sinister_peak_southwest_route',
  'wa_south_ridge',
  'wa_south_ridge_4',
  'wa_south_twin_sister_north_ridge',
  'wa_tepeh_towers',
  'wa_the_triad_east_peak',
  'wa_tricouni_peak_southwest_slopes',
  'wa_west_face_2',
  'wa_west_ridge_7');
