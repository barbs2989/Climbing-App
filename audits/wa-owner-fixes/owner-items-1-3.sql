-- Owner-requested fixes the apply guard will not write (name, discipline, bivy). 2026-09-30.
-- Each UPDATE matches only while the row still holds the old value, so a re-run changes nothing.
-- Expected row counts: 1, 1, 1, 43, 5, 1. Run by the owner 2026-09-30; live result: 1a matched 0 (already renamed off Crystal Pass by another session), 1b, 2, 6 applied, 3a 42 + 1 already saying "just under a mile", 3b 4 + 1 already saying no pass.
begin;

-- 1a. Inner Constance: every content field climbs from Lake Constance up Avalanche Canyon, the South Gully
--     and the East Ridge; the name said "via Crystal Pass" (2 sources agree on the line).
update routes set name = 'South Gully / East Ridge via Lake Constance'
 where id = 'wa_inner_constance_standard' and name = 'Standard Route (Northeast summit via Crystal Pass)';

-- 1b. Ives Peak: the line is the northwest ridge, then the upper south face (2 sources); aspect is already NW.
update routes set name = 'Northwest Ridge / South Face'
 where id = 'wa_ives_peak_r1' and name = 'Northeast Slopes / Goat Rocks crest';

-- 2. Clast from the Past: listed as Sport; the row's own gear, rack and beta describe a fully bolted line.
update routes set discipline = 'sport'
 where id = 'wa_clast_from_the_past' and discipline = 'trad';

-- 3a. Washington Pass camp card (43 routes): the Blue Lake trailhead is about a mile west of the pass,
--     as every other field on these routes says.
update routes set bivy = replace(bivy::text, 'roughly half a mile west of Washington Pass', 'about a mile west of Washington Pass')::jsonb
 where id in ('wa_a_servant_to_liberty', 'wa_boving_roofs', 'wa_chockstone_route', 'wa_concord_tower_north_face', 'wa_dark_side_of_liberty', 'wa_dolphin_chimney', 'wa_east_face_3', 'wa_flycatcher_buttress', 'wa_free_mojo', 'wa_labor_pains', 'wa_lexington_tower_east_face', 'wa_liberty_and_injustice_for_all', 'wa_liberty_bell_beckey_route', 'wa_liberty_bell_east_face', 'wa_liberty_bell_independence_route', 'wa_liberty_bell_nw_face', 'wa_liberty_bell_overexposure', 'wa_liberty_bell_serpentine_crack', 'wa_liberty_bell_thin_red_line', 'wa_liberty_crack', 'wa_liberty_crack_free', 'wa_liberty_traverse', 'wa_live_free_or_die', 'wa_mojo_rising', 'wa_news_nw_corner', 'wa_north_face_3', 'wa_north_face_var_right_directisimo', 'wa_northwest_face_boving_pollock', 'wa_nw_face_var_remsberg_variation', 'wa_rapple_grapple', 'wa_sews_sw_rib', 'wa_south_arete', 'wa_south_early_winter_spire_direct_east_buttress', 'wa_south_early_winter_spire_east_buttress', 'wa_south_early_winter_spire_passenger', 'wa_south_early_winter_spire_southwest_couloir', 'wa_south_face_3', 'wa_south_face_center', 'wa_southern_man', 'wa_the_cave_route', 'wa_the_hitchhiker', 'wa_the_west_face', 'wa_tooth_and_claw')
   and bivy::text like '%roughly half a mile west of Washington Pass%';

-- 3b. Killen Creek camp card (5 Adams north-side routes): the Forest Service trailhead page says no fees
--     are required; the same routes' access fields already say so.
update routes set bivy = replace(bivy::text, 'Northwest Forest Pass or equivalent for trailhead parking.', 'No parking fee at the Killen Creek trailhead.')::jsonb
 where id in ('wa_mount_adams_adams_glacier', 'wa_mount_adams_lava_glacier_headwall', 'wa_mount_adams_lyman_glacier',
              'wa_mount_adams_north_ridge', 'wa_mount_adams_northwest_ridge')
   and bivy::text like '%Northwest Forest Pass or equivalent for trailhead parking.%';

-- 6. Clean Break: its 2-point sketch line still starts at the old trailhead point (~400 m off); start it at the
--    corrected Silver Star Creek pullout pin instead. It stays captioned as a straight segment, not a track.
update routes set gpx = '[[48.5986,-120.5879],[48.56281,-120.59725]]'::jsonb
 where id = 'wa_clean_break' and gpx::jsonb = '[[48.5974397,-120.5830608],[48.56281,-120.59725]]'::jsonb;

commit;
