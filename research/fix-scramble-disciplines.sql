-- Class 3/4 scrambles filed as 'trad'. Evidence + exclusions: see the PR description.
-- Guarded on id + area_id + discipline; a re-run affects 0 rows. Expect UPDATE 1 x19.

update routes set discipline='scrambling' where id='wa_booker_mountain_northwest_route' and area_id='wa_booker_mountain' and discipline='trad';
update routes set discipline='scrambling' where id='wa_booker_mountain_south_ridge' and area_id='wa_booker_mountain' and discipline='trad';
update routes set discipline='scrambling' where id='wa_cannon_mountain_northeast_ridge' and area_id='wa_cannon_mountain' and discipline='trad';
update routes set discipline='scrambling' where id='wa_cathedral_rock_northwest_couloir' and area_id='wa_cathedral_rock' and discipline='trad';
update routes set discipline='scrambling' where id='wa_emerald_peak_west_route' and area_id='wa_emerald_peak_entiat' and discipline='trad';
update routes set discipline='scrambling' where id='wa_hozomeen_mountain_north_peak_south_ridge' and area_id='wa_hozomeen_mountain' and discipline='trad';
update routes set discipline='scrambling' where id='wa_jack_mountain_east_ridge' and area_id='wa_jack_mountain' and discipline='trad';
update routes set discipline='scrambling' where id='wa_jack_mountain_north_ridge' and area_id='wa_jack_mountain' and discipline='trad';
update routes set discipline='scrambling' where id='wa_jack_mountain_southwest_ridge' and area_id='wa_jack_mountain' and discipline='trad';
update routes set discipline='scrambling' where id='wa_klawatti_peak_north_ridge' and area_id='wa_klawatti_peak' and discipline='trad';
update routes set discipline='scrambling' where id='wa_magic_mountain_southwest_cirque' and area_id='wa_magic_mountain' and discipline='trad';
update routes set discipline='scrambling' where id='wa_mount_lincoln_harniss_chute' and area_id='wa_mount_lincoln' and discipline='trad';
update routes set discipline='scrambling' where id='wa_mount_maude_r3' and area_id='wa_mount_maude' and discipline='trad';
update routes set discipline='scrambling' where id='wa_mount_prophet_southwest_rib' and area_id='wa_mount_prophet' and discipline='trad';
update routes set discipline='scrambling' where id='wa_mount_rahm_custer_traverse' and area_id='wa_mount_rahm' and discipline='trad';
update routes set discipline='scrambling' where id='wa_north_star_mountain_cloudy_peak_traverse' and area_id='wa_north_star_mountain' and discipline='trad';
update routes set discipline='scrambling' where id='wa_raven_ridge_standard_route' and area_id='wa_raven_ridge' and discipline='trad';
update routes set discipline='scrambling' where id='wa_robinson_mountain_southeast_ridge' and area_id='wa_robinson_mountain' and discipline='trad';
update routes set discipline='scrambling' where id='wa_west_twin_needle_west_slope' and area_id='wa_west_twin_needle' and discipline='trad';

select id, discipline from routes where id in (
 'wa_booker_mountain_northwest_route',
 'wa_booker_mountain_south_ridge',
 'wa_cannon_mountain_northeast_ridge',
 'wa_cathedral_rock_northwest_couloir',
 'wa_emerald_peak_west_route',
 'wa_hozomeen_mountain_north_peak_south_ridge',
 'wa_jack_mountain_east_ridge',
 'wa_jack_mountain_north_ridge',
 'wa_jack_mountain_southwest_ridge',
 'wa_klawatti_peak_north_ridge',
 'wa_magic_mountain_southwest_cirque',
 'wa_mount_lincoln_harniss_chute',
 'wa_mount_maude_r3',
 'wa_mount_prophet_southwest_rib',
 'wa_mount_rahm_custer_traverse',
 'wa_north_star_mountain_cloudy_peak_traverse',
 'wa_raven_ridge_standard_route',
 'wa_robinson_mountain_southeast_ridge',
 'wa_west_twin_needle_west_slope') order by id;
