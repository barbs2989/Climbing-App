-- Glacier crossed on the route OR the approach -> mountaineering. All 97 WA routes.
-- Guarded on id + area_id + current discipline: statements already applied match 0 rows,
-- so re-running part 1 is a no-op. Nothing here can overwrite a row that has moved on.
--
-- This paste is ~13KB. The SQL Editor truncates large pastes SILENTLY.
-- The final SELECT counts all 97 -- if it returns 97/97 the whole paste landed.
-- If you get no count row at all, the paste was cut short: run the numbered parts instead.

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
update routes set discipline='mountaineering' where id='wa_austera_peak' and area_id='wa_austera_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_austera_peak_chockstone_route' and area_id='wa_austera_peak' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_bonanza_peak_northeast_buttress' and area_id='wa_bonanza_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_colchuck_peak_east_ridge' and area_id='wa_colchuck_peak' and discipline='scrambling';
update routes set discipline='mountaineering' where id='wa_corteo_peak_southwest_ridge' and area_id='wa_corteo_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_direct_north_buttress' and area_id='wa_bear_mountain_chilliwack' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_dragontail_peak_r3' and area_id='wa_dragontail_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_east_mcmillan_spire_west_ridge' and area_id='wa_east_mcmillan_spire' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_eldorado_peak_north_ridge' and area_id='wa_eldorado_peak' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_forbidden_peak_north_ridge' and area_id='wa_forbidden_peak' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_kimtah_peak_scramble' and area_id='wa_kimtah_peak' and discipline='scrambling';
update routes set discipline='mountaineering' where id='wa_little_tahoma_east_shoulder' and area_id='wa_little_tahoma' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_lizard_mountain_south_route' and area_id='wa_lizard_mountain' and discipline='scrambling';
update routes set discipline='mountaineering' where id='wa_magic_mountain_north_face' and area_id='wa_magic_mountain' and discipline='trad';
update routes set discipline='mountaineering' where id='wa_mcmillan_spire_west_southwest_ridge' and area_id='wa_mcmillan_spire_west' and discipline='alpine';
update routes set discipline='mountaineering' where id='wa_mix_up_peak_east_face' and area_id='wa_mixup_peak' and discipline='alpine';
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
update routes set discipline='mountaineering' where id='wa_tenpeak_mountain_north_couloir' and area_id='wa_tenpeak_mountain' and discipline='alpine';

select count(*) filter (where discipline='mountaineering') as done, count(*) as total
  from routes where id in (
  'wa_american_border_peak_northeast_face',
  'wa_andersons_thumb_standard',
  'wa_austera_peak_southwest_ridge',
  'wa_bonanza_peak_mary_green_glacier',
  'wa_boston_peak_southeast_face',
  'wa_clark_mountain_west_ridge',
  'wa_colchuck_peak_northeast_couloir',
  'wa_crooked_thumb_peak_east_face',
  'wa_dome_peak_indian_summer',
  'wa_dorado_needle_east_ridge',
  'wa_east_face_6',
  'wa_east_slope',
  'wa_frying_pan_whitman_glaciers',
  'wa_icy_peak_ruth_icy_traverse',
  'wa_icy_peak_southwest_route',
  'wa_klawatti_peak_southeast_face',
  'wa_kyes_peak_northeast_ridge',
  'wa_liberty_cap_liberty_ridge_finish',
  'wa_little_sister_north_face',
  'wa_little_tahoma_cowlitz_ingraham_glaciers',
  'wa_luna_glacier',
  'wa_magic_mountain_west_ridge',
  'wa_mesahchie_peak_west_ridge',
  'wa_mount_adams_adams_glacier',
  'wa_mount_adams_lava_glacier_headwall',
  'wa_mount_adams_wilson_glacier_headwall',
  'wa_mount_baker_coleman_headwall',
  'wa_mount_baker_north_ridge',
  'wa_mount_baker_park_glacier_headwall',
  'wa_mount_challenger_challenger_glacier',
  'wa_mount_deception_standard',
  'wa_mount_logan_fremont_glacier',
  'wa_mount_maude_r1',
  'wa_mount_olympus_blue_glacier',
  'wa_mount_rainier_kautz_headwall',
  'wa_mount_rainier_mowich_face',
  'wa_mount_rainier_tahoma_glacier',
  'wa_mount_sefrit_southeast_ridge',
  'wa_mount_shuksan_fisher_chimneys',
  'wa_mount_shuksan_hanging_glacier',
  'wa_mount_shuksan_northwest_arete',
  'wa_mount_shuksan_price_glacier',
  'wa_mount_shuksan_sulphide_glacier',
  'wa_mount_shuksan_white_salmon_glacier',
  'wa_mount_stuart_girth_pillar',
  'wa_mount_stuart_ice_cliff_glacier',
  'wa_mount_stuart_stuart_glacier_couloir',
  'wa_mount_torment_torment_forbidden_traverse',
  'wa_neve_glacier_west_ridge',
  'wa_old_guard_peak_east_side_route',
  'wa_olympus_blue_glacier_east_ramps',
  'wa_primus_peak_south_ridge',
  'wa_ptarmigan_traverse',
  'wa_ruth_mountain_south_slopes',
  'wa_sherpa_glacier',
  'wa_sitkum_spire_standard',
  'wa_sloan_peak_r1',
  'wa_south_face_5',
  'wa_spider_mountain_north_ridge',
  'wa_swiss_peak_standard_route',
  'wa_three_fingers_r1',
  'wa_three_fingers_r2',
  'wa_three_fingers_south_peak_lookout',
  'wa_west_ridge_6',
  'wa_austera_peak',
  'wa_austera_peak_chockstone_route',
  'wa_bonanza_peak_northeast_buttress',
  'wa_colchuck_peak_east_ridge',
  'wa_corteo_peak_southwest_ridge',
  'wa_direct_north_buttress',
  'wa_dragontail_peak_r3',
  'wa_east_mcmillan_spire_west_ridge',
  'wa_eldorado_peak_north_ridge',
  'wa_forbidden_peak_north_ridge',
  'wa_kimtah_peak_scramble',
  'wa_little_tahoma_east_shoulder',
  'wa_lizard_mountain_south_route',
  'wa_magic_mountain_north_face',
  'wa_mcmillan_spire_west_southwest_ridge',
  'wa_mix_up_peak_east_face',
  'wa_mount_baker_cockscomb_ridge',
  'wa_mount_blum_north_ridge',
  'wa_mount_goode_northeast_buttress',
  'wa_mount_olympus_west_ridge',
  'wa_mount_rainier_fuhrer_thumb',
  'wa_mount_shuksan_beckey_schmidtke',
  'wa_northeast_face_direct',
  'wa_northwest_ridge',
  'wa_phantom_peak_south_route',
  'wa_point_success_south_side',
  'wa_poltergeist_pinnacle',
  'wa_ragged_ridge',
  'wa_sharkfin_tower_southeast_ridge',
  'wa_southeast_face',
  'wa_southeast_ridge_se_corner',
  'wa_southwest_buttress',
  'wa_tenpeak_mountain_north_couloir');
