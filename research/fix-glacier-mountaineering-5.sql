-- Glacier crossed on the APPROACH counts too -- same rope, crampons and crevasse
-- rescue as crossing it higher up. Extends parts 1-4. Part 5.
-- Guarded on id + area_id + current discipline; a re-run affects 0 rows. Expect UPDATE 1 x16.

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

select count(*) filter (where discipline='mountaineering') as done, count(*) as total
  from routes where id in ('wa_austera_peak','wa_austera_peak_chockstone_route','wa_bonanza_peak_northeast_buttress','wa_colchuck_peak_east_ridge','wa_corteo_peak_southwest_ridge','wa_direct_north_buttress','wa_dragontail_peak_r3','wa_east_mcmillan_spire_west_ridge','wa_eldorado_peak_north_ridge','wa_forbidden_peak_north_ridge','wa_kimtah_peak_scramble','wa_little_tahoma_east_shoulder','wa_lizard_mountain_south_route','wa_magic_mountain_north_face','wa_mcmillan_spire_west_southwest_ridge','wa_mix_up_peak_east_face');
