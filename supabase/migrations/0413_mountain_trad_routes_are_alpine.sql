-- Trad routes that are mountain days are filed ALPINE (owner, 2026-11-11: "Since you are climbing a route
-- in the mountains ... research all trad routes to declare based on research if it should be placed in the
-- alpine discipline"). Extends the owner's rule in 0197 ("Trad only applies to climbs at a crag").
--
-- How the list was made (research-data/trad-alpine-2026-11-11/): 476 of ~78,760 trad routes carried an
-- alpine signal (on a peak, NCCS grade III+, or a descent naming a summit/glacier/crampons). Each was judged
-- against RULE.md there: a route that tops out on a mountain, spire or ridge crest, needs mountain travel, or
-- sits on a high cirque face is alpine; valley and canyon walls, desert towers and long crag routes stay trad
-- (Snow Creek Wall's Outer Space, Yosemite's Sentinel Rock and Colorado's Medicine Man all stay trad).
-- Every call is in decisions.json with its reason.
--
-- Rule (RULE.md, owner 2026-11-11: "yes crag for trad is just a short approach"): trad at a crag is a short
-- approach (about an hour or less on foot) and a return to the base. Alpine = a mountain setting plus a summit
-- or ridge-crest finish, a long backcountry approach, or snow/glacier travel. The 306 rows here are the
-- high/medium alpine calls plus 14 borderline rows settled by approach research (out-approach.json; e.g.
-- Darrington's Comb, ~2 h in). Roadside formations that return to the base (Pikes Peak, Black Wall) stay trad;
-- 3 still-unsure rows stay trad. NOTE: Yak Peak (Coquihalla) is roadside but tops out on the summit -> alpine.
--
-- Assert-then-set, as 0204: a row no longer typed trad is left alone. The route triggers (0051, 0198)
-- re-derive each area's main type and type list. Discipline is owner-locked (0406); this is the owner's edit.

update routes set discipline = 'alpine'
 where discipline = 'trad'
   and id in (
  'ab_adams_lake_wall_wonderous_wanderer', -- Adams Lake Wall: Tops out on the crest of Windsor Ridge (summit optional) in the Castle range, reached by a long valley approach
  'ab_grand_sentinel_south_face', -- Grand Sentinel: Ends on summit of an alpine spire above Sentinel Pass, high-country trail approach
  'ab_lady_macdonald_east_south_east_ridge', -- Lady Macdonald: Ridge route joining summit ridge of Lady Macdonald, descent by summit scramble trail
  'ab_mount_alberta_northeast_ridge', -- Mount Alberta: Remote 11,877 ft Rockies peak, river ford, summit and descent via Japanese Route
  'ab_mount_edith_cavell_east_ridge', -- Mount Edith Cavell: 11,033 ft peak ridge with moderate snow to summit
  'ab_mount_louis_the_gmoser_route', -- Mount Louis: 15 pitches finishing on summit ridge of Mount Louis, rappel descent off peak
  'ab_mount_louis_the_kain_route', -- Mount Louis: Reaches summit cross of Mount Louis by ridge crest
  'ab_mount_temple_greenwood_jones', -- Mount Temple: North-side buttress on 11,614 ft Mount Temple with glacier-side scree descent
  'ab_mount_temple_squashed_bones', -- Mount Temple: NE buttress leading to East Ridge, summit ice cap and summit of Mount Temple
  'ab_mount_whyte_perren_route_east_ridge', -- Mount Whyte: Ridge climb to summit of Mount Whyte from a high col
  'ab_mt_babel_east_face', -- Mt. Babel: Big Rockies peak face to summit, descent down north ridge with rappels
  'ab_mt_colin_nw_traverse', -- Mt. Colin: Knife-edge ridge traverse to the summit of Mt Colin
  'ab_mt_deltaform_flying_buttress', -- Mt. Deltaform: 15-pitch buttress on Valley of the Ten Peaks peak; glacier/traverse descents
  'ab_outpost_peak_north_buttress', -- Outpost Peak: Hut-based alpine ridge outing with glacier crossing on descent
  'ab_rim_wall_on_the_wings_of_maybe', -- Rim Wall: 400 m route on Rimwall east face, short hike to the peak summit after topping out
  'ab_roche_a_perdrix_chimney_route', -- Roche a Perdrix: NW face of a 7,000 ft mountain; parties commonly go to the summit and descend the scramble route (a conditions report did exactly this)
  'ak_3rd_4th_the_curtain_inside_passage', -- 3rd/4th The Curtain: Mendenhall Towers, glacier/heli approach and camp
  'ak_3rd_4th_the_curtain_resisting_a_rest', -- 3rd/4th The Curtain: Mendenhall Towers, glacier/heli approach and camp
  'ak_5390_west_face_f_tea_parties', -- 5390 West Face: Remote massif, bergschrund start, crevassed snow descent to camp
  'ak_5390_west_face_fossilized_potential', -- 5390 West Face: Remote massif, bergschrund start, crevassed snow descent to camp
  'ak_5390_west_face_four_amigos_aka_5_hours_to_freedom_big_anime_titties_se', -- 5390 West Face: Remote massif, bergschrund start, crevassed snow descent to camp
  'ak_nunatak_kissing_up_the_choss_pile', -- Nunatak: Above-treeline formation by Snowbird Glacier at Hatcher Pass with summit scramble
  'ak_o_malley_peak_3_unknown_5_9', -- O’Malley Peak: Buttress on O’Malley Peak (Chugach front range) with option to scramble to the summit
  'ak_southeast_buttress_barnyard_betty', -- Southeast Buttress: Remote Mount Prindle, long hike in, route reaches summit
  'ak_southeast_buttress_homewrecker', -- Southeast Buttress: Remote Mount Prindle, long hike in, ends at summit tower
  'ak_the_throne_oxidado_express', -- The Throne: Little Switzerland on the Pika Glacier, air taxi and glacier base camp
  'az_southeast_arete_2', -- East Face: Tops out on summit of Baboquivari Peak (7,730 ft), long remote approach
  'bc_1_north_faces_from_fairy_meadow_adamant_turret_austerity_traverse', -- North Faces (from Fairy Meadow): Adamants glacier traverse from Fairy Meadow hut
  'bc_1_north_faces_from_fairy_meadow_gog_east_face', -- North Faces (from Fairy Meadow): Adamants spire summit, snowfield and moat
  'bc_1_north_faces_from_fairy_meadow_horn_se_face_and_unicorn', -- North Faces (from Fairy Meadow): Adamants, glacier approach to summits
  'bc_1_north_faces_from_fairy_meadow_magog', -- North Faces (from Fairy Meadow): Adamants spire summit from Fairy Meadow hut
  'bc_1_north_faces_from_fairy_meadow_mount_quadrant_west_face_to_north_summit_stem_winder', -- North Faces (from Fairy Meadow): Adamants peak, summit ridge traverse, snow approach
  'bc_1_north_faces_from_fairy_meadow_mt_austerity_east_face', -- North Faces (from Fairy Meadow): Crevassed glacier approach, steep snow, summit
  'bc_1_north_faces_from_fairy_meadow_north_peak_of_colossal_via_east_couloir', -- North Faces (from Fairy Meadow): Glacier, steep snow and bergschrund to a summit
  'bc_1_north_faces_from_fairy_meadow_outpost_to_spire_traverse_quadrant_spire', -- North Faces (from Fairy Meadow): Ridge-crest summit traverse in the Adamants
  'bc_1_north_faces_from_fairy_meadow_the_black_rib', -- North Faces (from Fairy Meadow): Adamants route to main summit of Quadrant
  'bc_3_south_west_faces_from_adamant_or_austerityglacier_iron_man_gibson_rohn', -- South & West Faces (from Adamant or AusterityGlacier): Adamants buttress, axe and crampons for glacier descent
  'bc_3_south_west_faces_from_adamant_or_austerityglacier_south_buttress_adamant_mountain', -- South & West Faces (from Adamant or AusterityGlacier): Adamant Mountain to summit snowfield, heli or glacier access
  'bc_3_south_west_faces_from_adamant_or_austerityglacier_west_buttress_of_the_horn', -- South & West Faces (from Adamant or AusterityGlacier): 20-pitch Adamants buttress, glacier access and camp
  'bc_alpaca_peak_whitewater', -- Alpaca Peak: Peak east face in Anderson River Group, finishing on shelf above the face with backcountry trail approach
  'bc_brenta_spire_another_fine_day_in_the_bugaboos', -- Brenta Spire: Bugaboos spire summit
  'bc_crescent_spire_westside_story', -- Crescent Spire: Bugaboos spire to summit ridge
  'bc_crescent_towers_ears_between', -- Crescent Towers: Bugaboos tower summit
  'bc_crescent_towers_thatcher_cracker', -- Crescent Towers: Bugaboos tower summit
  'bc_crown_mountain_widowmaker_arete', -- Crown Mountain: 10-pitch arete to top of The Camel and summit of Crown Mountain, long backcountry approach
  'bc_dione_sunny_chibas', -- Dione: Tantalus Range, glacier from hut, snow couloir
  'bc_dione_sw_buttress_of_dione', -- Dione: Tantalus Range, glacier from hut to summit
  'bc_eastpost_spire_classic_grit', -- Eastpost Spire: Bugaboos spire summit
  'bc_frontier_creek_culbert_crag', -- Frontier Creek: Waddington Range, fly-in camp, summit
  'bc_frontier_creek_trident_tower_west_face', -- Frontier Creek: Waddington Range, fly-in, tower summit
  'bc_goat_lake_area_eternal_darkness', -- Goat Lake Area: High Cathedral Park tower, route to summit with snow gully descent
  'bc_goat_lake_area_loose_caboose', -- Goat Lake Area: High Cathedral Park face ending near summit ridge of Boxcar Mountain
  'bc_goat_lake_area_needs_more_cowbell', -- Goat Lake Area: High Cathedral Park face ending near summit ridge of Boxcar Mountain
  'bc_grimface_grimface_se_chimney', -- Grimface: Cathedral Park peak summit from backcountry camp
  'bc_grimface_matriarch_sw_face', -- Grimface: Summit of Matriarch, part of ridge traverse
  'bc_grimface_se_notch', -- Grimface: Summit of Grimface from backcountry camp
  'bc_les_cornes_springbok_arete', -- Les Cornes: 13-pitch arete to summit of Les Cornes, Anderson River Group
  'bc_mount_assiniboine_3_618m_north_ridge', -- Mount Assiniboine (3,618m): Standard route on 3,618 m peak from Hind hut, snow
  'bc_mount_athelstan_gnomon_direct', -- Mount Athelstan: Salal Creek alpine walls, peak summit, snow descent
  'bc_mount_athelstan_lillarete', -- Mount Athelstan: Salal Creek alpine wall to Randy Stoltmann Tower summit, snow
  'bc_mount_athelstan_moonraker', -- Mount Athelstan: Summit ridge finish, snow couloir descent to bivy
  'bc_mount_athelstan_raised_by_bears', -- Mount Athelstan: Axe and crampons, bivy site
  'bc_mount_athelstan_selective_cut', -- Mount Athelstan: Salal Creek alpine wall to summit
  'bc_mount_athelstan_solstice_start', -- Mount Athelstan: Salal Creek alpine wall to summit
  'bc_mount_athelstan_south_face_randy_stoltmann_tower', -- Mount Athelstan: Ends on Randy Stoltmann Tower summit
  'bc_mount_athelstan_standing_wave', -- Mount Athelstan: Crosses snowpatch to summit rim, snow couloir descent to bivy
  'bc_mount_bardean_the_tuning_fork', -- Mount Bardean: Long alpine line from slab bivy with snow and ridge descent
  'bc_mount_gimli_beach_break', -- Mount Gimli: Valhalla peak east face, escape to the ridge
  'bc_mount_gimli_kristiansen_croston', -- Mount Gimli: Finishes to summit of Mount Gimli
  'bc_mount_gimli_kristiansen_croston_direct_start', -- Mount Gimli: Finishes to summit of Mount Gimli
  'bc_mount_gimli_lusting_after_women', -- Mount Gimli: Ends on summit of Mount Gimli
  'bc_mount_gimli_north_face_arete', -- Mount Gimli: Ends on summit of Mount Gimli
  'bc_mount_gimli_south_ridge', -- Mount Gimli: Ridge to summit of Mount Gimli
  'bc_mount_gimli_tight_ass', -- Mount Gimli: Joins South Ridge to summit of Mount Gimli
  'bc_mount_gimli_valhalla_gold', -- Mount Gimli: Ends at summit of Mount Gimli
  'bc_mount_harvey_pup_buttress', -- Mount Harvey: Ends on summit of Harvey’s Pup pinnacle on Mount Harvey after long mountain hike
  'bc_mount_macdonald_roger_s_pass_northwest_ridge_integral', -- Mount MacDonald (Roger’s Pass): 14-18 pitch peak ridge to summit
  'bc_mount_sir_donald_northwest_ridge', -- Mount Sir Donald: Classic long ridge on 10,774 ft peak
  'bc_mount_sir_donald_uto_peak_southwest_ridge', -- Mount Sir Donald: Ridge to Uto Peak summit, Rogers Pass
  'bc_mount_tupper_west_ridge', -- Mount Tupper: Ridge to summit of Mount Tupper
  'bc_mouses_tooth_mighty_mouse', -- Mouses Tooth: Alpine spire in North Joffre Creek, headwall below summit, rappel route
  'bc_mt_colonel_foster_walsh_s_foray', -- Mt Colonel Foster: Steep snow, summit ridge traverse
  'bc_nesakwatch_spires_dairyland', -- Nesakwatch Spires: Chilliwack spire summit
  'bc_nesakwatch_spires_north_nesakwatch_spire_nesakwatch_notch_ne_buttress', -- Nesakwatch Spires: Snow-filled notch, spire summit
  'bc_nesakwatch_spires_north_nesakwatch_spire_nw_face_to_w_ridge', -- Nesakwatch Spires: Snow ramp, ridge to summit
  'bc_nesakwatch_spires_north_spire_sw_ridge', -- Nesakwatch Spires: Spire summit
  'bc_nesakwatch_spires_south_spire_east_buttress', -- Nesakwatch Spires: Couloir and bergschrund approach, summit
  'bc_nesakwatch_spires_south_spire_fairytales_fantasies_5_11_5_11', -- Nesakwatch Spires: Spire to summit ridge
  'bc_nesakwatch_spires_south_spire_south_ridge', -- Nesakwatch Spires: Spire summit from notch
  'bc_nesakwatch_spires_south_spire_west_buttress', -- Nesakwatch Spires: Spire to summit ridge
  'bc_nesakwatch_spires_waltz_right_in', -- Nesakwatch Spires: Spire to summit
  'bc_north_illusion_peak_illusion_traverse_south_to_north', -- North Illusion Peak: Peak-to-peak traverse
  'bc_phyllis_engine_south_face_variation', -- Phyllis’ Engine: Garibaldi crest spires from hut
  'bc_pigeon_feathers_furry_friends', -- Pigeon Feathers: Bugaboos pinnacle summit
  'bc_pigeon_feathers_lentils_or_tvp_eh', -- Pigeon Feathers: Bugaboos ridge to summit, snow descent
  'bc_pigeon_spire_cooper_kor', -- Pigeon Spire: Bugaboos glacier approach, summit
  'bc_pigeon_spire_west_ridge', -- Pigeon Spire: Bugaboos glacier approach, summit ridge
  'bc_rugged_mountain_thunderbird', -- Rugged Mountain: 22-pitch line to summit tower, col descent
  'bc_serra_2_south_ridge', -- Serra 2: Waddington Range, glacier descent
  'bc_skihist_mountain_traverse_of_the_seasons', -- Skihist Mountain: Ends on summit of Skihist Mountain
  'bc_slesse_mountain_east_pillar_of_labor_day_horn_neufeld_brayshaw', -- Slesse Mountain: Snow ramp, summit of Labour Day Horn
  'bc_slesse_mountain_flight_810_buttress', -- Slesse Mountain: Slesse massif, ends on third peak
  'bc_slesse_mountain_north_east_headwall_variation', -- Slesse Mountain: Slesse NE Buttress to summit
  'bc_slesse_mountain_north_pillar', -- Slesse Mountain: Ends on summit of Slesse
  'bc_slesse_mountain_north_rib_kiesel_lowe', -- Slesse Mountain: Ends on summit of Slesse
  'bc_slesse_mountain_russian_roulette', -- Slesse Mountain: Ends on summit of Slesse
  'bc_slesse_mountain_slesse_massif_traverse', -- Slesse Mountain: Full massif traverse with snow
  'bc_slesse_mountain_southwest_gully', -- Slesse Mountain: Summit of Slesse from above treeline
  'bc_slesse_mountain_welcome_to_the_wack', -- Slesse Mountain: 26 pitches to summit of Slesse
  'bc_snowpatch_spire_buckingham_route_easy_version', -- Snowpatch Spire: Snowpatch Spire, Bugaboos: alpine granite spire reached via Kain Hut and glacier travel
  'bc_snowpatch_spire_snowpatch_route_aka_se_corner_wiessner_s_route', -- Snowpatch Spire: Snowpatch Spire, Bugaboos: alpine granite spire reached via Kain Hut and glacier travel
  'bc_snowpatch_spire_southwest_ridge_direct_finish', -- Snowpatch Spire: Snowpatch Spire, Bugaboos: alpine granite spire reached via Kain Hut and glacier travel
  'bc_snowpatch_spire_surfs_up', -- Snowpatch Spire: Snowpatch Spire, Bugaboos: alpine granite spire reached via Kain Hut and glacier travel
  'bc_snowpatch_spire_west_face', -- Snowpatch Spire: Snowpatch Spire, Bugaboos: alpine granite spire reached via Kain Hut and glacier travel
  'bc_snowpatch_spire_wildflowers', -- Snowpatch Spire: Snowpatch Spire, Bugaboos: alpine granite spire reached via Kain Hut and glacier travel
  'bc_south_howser_tower_beckey_chouinard', -- South Howser Tower: South Howser Tower west face, Bugaboos: glacier approach over Vowell Glacier, summit route
  'bc_the_camel_regular_route', -- The Camel: Rock pinnacle on Crown Mountain (North Shore Mountains), reached by mountain approach with fixed line, tops out on its summit
  'bc_the_deacon_sentinel_direct', -- The Deacon: The Deacon, Cathedral Provincial Park: col and ridge traverse with snow on approach, mountain face
  'bc_the_deacon_the_heretic', -- The Deacon: The Deacon, Cathedral Provincial Park: col and ridge traverse with snow on approach, mountain face
  'bc_the_old_settler_black_september', -- The Old Settler: The Old Settler, Coast Mountains peak: summit routes with snow/couloir descents
  'bc_the_old_settler_central_peak_west_buttress_down_duck', -- The Old Settler: The Old Settler, Coast Mountains peak: summit routes with snow/couloir descents
  'bc_the_old_settler_complete_northwest_ridge', -- The Old Settler: The Old Settler, Coast Mountains peak: summit routes with snow/couloir descents
  'bc_the_old_settler_duck_a_l_orange', -- The Old Settler: The Old Settler, Coast Mountains peak: summit routes with snow/couloir descents
  'bc_the_old_settler_the_contact_zone', -- The Old Settler: The Old Settler, Coast Mountains peak: summit routes with snow/couloir descents
  'bc_the_old_settler_watchman_s_northeast_ridge', -- The Old Settler: The Old Settler, Coast Mountains peak: summit routes with snow/couloir descents
  'bc_the_old_settler_west_face_of_the_north_peak', -- The Old Settler: The Old Settler, Coast Mountains peak: summit routes with snow/couloir descents
  'bc_vowell_group_archduke_trio', -- Vowell Group: Vowell Group, Bugaboos: glacier approach, ridge traverse of three summits
  'bc_west_ear_helix', -- West Ear: West Ear, Valhalla Mountains: alpine summit route from backcountry basin
  'bc_west_ear_the_pack', -- West Ear: West Ear, Valhalla Mountains: alpine summit route from backcountry basin
  'bc_yak_peak_beckey_route_speedway', -- Yak Peak: Yak Peak, Coquihalla: roadside slab but routes top out on the mountain summit with a peak walk-off
  'bc_yak_peak_cardiyak_rhythm', -- Yak Peak: Yak Peak, Coquihalla: roadside slab but routes top out on the mountain summit with a peak walk-off
  'bc_yak_peak_hole_in_my_heaven', -- Yak Peak: Yak Peak, Coquihalla: roadside slab but routes top out on the mountain summit with a peak walk-off
  'bc_yak_peak_madness', -- Yak Peak: Yak Peak, Coquihalla: roadside slab but routes top out on the mountain summit with a peak walk-off
  'bc_yak_peak_reality_check', -- Yak Peak: Yak Peak, Coquihalla: roadside slab but routes top out on the mountain summit with a peak walk-off
  'bc_yak_peak_somwow_seven_one_move_wonders_of_the_world', -- Yak Peak: Yak Peak, Coquihalla: roadside slab but routes top out on the mountain summit with a peak walk-off
  'bc_yak_peak_wind_walker', -- Yak Peak: Yak Peak, Coquihalla: roadside slab but routes top out on the mountain summit with a peak walk-off
  'bc_yak_peak_yak_check', -- Yak Peak: Yak Peak, Coquihalla: roadside slab but routes top out on the mountain summit with a peak walk-off
  'bc_yak_peak_yak_crack', -- Yak Peak: Yak Peak, Coquihalla: roadside slab but routes top out on the mountain summit with a peak walk-off
  'ca_arctic_lake_wall_chillin_the_most', -- Arctic Lake Wall: Arctic Lake Wall in the Whitney cirque, High Sierra: high-country approach, finishes on summit
  'ca_arctic_lake_wall_too_much_fun', -- Arctic Lake Wall: Arctic Lake Wall in the Whitney cirque, High Sierra: high-country approach, finishes on summit
  'ca_banner_peak_northeast_buttress', -- Banner Peak: Banner Peak NE Buttress: High Sierra peak, ice axe needed for snow descent
  'ca_charlotte_dome_beast_and_beauty', -- Charlotte Dome: Charlotte Dome: remote High Sierra dome needing a long backcountry approach, summit walk-off
  'ca_charlotte_dome_stop_that_train', -- Charlotte Dome: Charlotte Dome: remote High Sierra dome needing a long backcountry approach, summit walk-off
  'ca_cherubim_dome_archangel', -- Cherubim Dome: Cherubim Dome, Hamilton Lakes: multi-day High Sierra Trail backcountry approach
  'ca_echo_peaks_echo_ridge_echo_peak_9_sw_face', -- Echo Peaks & Echo Ridge: Echo Peaks, Cathedral Range: summit of a high Sierra peak via Echo Pass
  'ca_golden_trout_spire_dry_flyin', -- Golden Trout Spire: Golden Trout Spire, High Sierra (Humphreys/Pine Creek region): backcountry spire summit
  'ca_hot_tuna_tower_sorry_charlie', -- Hot Tuna Tower: Grade IV tower at 8,162 ft on the Wheeler Crest flank, reached by a long steep backcountry approach
  'ca_iceberg_lake_crags_iceberg_lake_gear_exchange', -- Iceberg Lake Crags: Iceberg Lake Crags: tower in the ~12,600 ft Whitney cirque above treeline, high-country approach
  'ca_incredible_hulk_infinity_gauntlet', -- Incredible Hulk: Incredible Hulk, Sawtooth Ridge: High Sierra alpine wall to summit
  'ca_lone_pine_peak_north_ridge_full', -- Lone Pine Peak: Lone Pine Peak North Ridge: 4400 ft of gain to a High Sierra summit
  'ca_main_wall_21_antichrist_dihedral', -- Main Wall: Mount Stewart, Great Western Divide: backcountry High Sierra Trail approach, high peak face
  'ca_middle_buttress_center_route', -- Middle Buttress: Sheep Peak buttresses below Mt Conness: high-country cross-country approach, summit plateau descent
  'ca_middle_buttress_north_arete_route', -- Middle Buttress: Sheep Peak buttresses below Mt Conness: high-country cross-country approach, summit plateau descent
  'ca_mount_lamarck_mindy', -- Mount Lamarck: Mount Lamarck: High Sierra peak, up-and-over descent along summit ridge
  'ca_mount_whitney_direct_east_face', -- Mt. Whitney: Mt. Whitney east side: High Sierra peak, descent via Mountaineers Route
  'ca_mount_whitney_our_own_devices', -- Mt. Whitney: Mt. Whitney east side: High Sierra peak, descent via Mountaineers Route
  'ca_mount_whitney_the_great_book', -- Mt. Whitney: Mt. Whitney east side: High Sierra peak, descent via Mountaineers Route
  'ca_mt_clarence_king_south_face', -- Mt. Clarence King: Mt. Clarence King: High Sierra peak summit route
  'ca_mt_goode_goode_earth', -- Mt. Goode: Mt. Goode, Bishop Pass: High Sierra peak/ridge route
  'ca_mt_goode_west_ridge', -- Mt. Goode: Mt. Goode, Bishop Pass: High Sierra peak/ridge route
  'ca_mt_russell_goldbug', -- Mt. Russell: Mt. Russell: High Sierra peak
  'ca_mt_whitney_hairline_free', -- Mt. Whitney: Mt. Whitney east side: High Sierra peak, descent via Mountaineers Route
  'ca_mt_winchell_silver_linings_arete', -- Mt. Winchell: Mt. Winchell, Palisades: long approach over Bishop Pass, summit route
  'ca_mt_winchell_training_day', -- Mt. Winchell: Mt. Winchell, Palisades: long approach over Bishop Pass, summit route
  'ca_north_buttress_3_east_arete', -- North Buttress: Sheep Peak buttresses below Mt Conness: high-country cross-country approach, summit plateau descent
  'ca_north_face_the_sauron_s_sport_route', -- North Face, The: Mt. Hoffman north face: high-country peak, summit plateau descent
  'ca_northern_tooth_gin_and_juice', -- Northern Tooth: Dogtooth Peak, Western Sierra: backcountry approach, finishes on peak summit
  'ca_panther_peak_house_cat', -- Panther Peak: Panther Peak, Sequoia NP: trail approach to a mountain, routes finish on/near the peak summit
  'ca_panther_peak_on_the_hunt', -- Panther Peak: Panther Peak, Sequoia NP: trail approach to a mountain, routes finish on/near the peak summit
  'ca_peeler_pillar_nimue', -- Peeler Pillar: Peeler Pillar, Sawtooth Ridge: backcountry High Sierra formation, ridge to summit
  'ca_regge_pole_free_radical', -- Regge Pole: Regge Pole, Little Slide Canyon spires: High Sierra alpine spire
  'ca_royce_peak_north_ridge_direct', -- Royce Peak: Royce Peak North Ridge: High Sierra peak summit
  'ca_sky_blue_diamond_altared_state', -- Sky Blue Diamond: Miter Basin, High Sierra: remote basin reached over high passes, peak/spire summits
  'ca_sky_blue_diamond_journey_to_the_center_of_the_earth', -- Sky Blue Diamond: Miter Basin, High Sierra: remote basin reached over high passes, peak/spire summits
  'ca_sky_blue_diamond_stupa_troopers', -- Sky Blue Diamond: Miter Basin, High Sierra: remote basin reached over high passes, peak/spire summits
  'ca_sky_blue_spire_2_bofa_spire', -- Sky Blue Spire 2: Miter Basin, High Sierra: remote basin reached over high passes, peak/spire summits
  'ca_sky_blue_spire_hawg_ripper', -- Sky Blue Spire: Miter Basin, High Sierra: remote basin reached over high passes, peak/spire summits
  'ca_sky_blue_spire_sapphire_crack', -- Sky Blue Spire: Miter Basin, High Sierra: remote basin reached over high passes, peak/spire summits
  'ca_spring_lake_wall_friends', -- Spring Lake Wall: Spring Lake Wall: remote Mineral King backcountry approach over Glacier Pass
  'ca_the_fortress_2_the_sage', -- The Fortress: Castle Rocks, Sequoia NP: long high-country approach to a ridge-top granite spire
  'ca_the_miter_janitorial_service', -- The Miter: Miter Basin, High Sierra: remote basin reached over high passes, peak/spire summits
  'ca_the_miter_the_miterhorn', -- The Miter: Miter Basin, High Sierra: remote basin reached over high passes, peak/spire summits
  'ca_the_sphinx_north_buttress', -- The Sphinx: The Sphinx, Kings Canyon: peak summit high above Bubbs Creek, backcountry approach
  'ca_the_sphinx_south_side', -- The Sphinx: The Sphinx, Kings Canyon: peak summit high above Bubbs Creek, backcountry approach
  'ca_the_thing_2_gambit', -- The Thing: The Thing, Sawtooth Ridge: High Sierra backcountry formation
  'ca_the_thing_2_wonder_woman', -- The Thing: The Thing, Sawtooth Ridge: High Sierra backcountry formation
  'ca_trapezoid_peak_harvest_time', -- Trapezoid Peak: Trapezoid Peak Kaleidoscope Wall: ~13,000 ft High Sierra face
  'ca_trapezoid_peak_shield_of_dreams', -- Trapezoid Peak: Trapezoid Peak Kaleidoscope Wall: ~13,000 ft High Sierra face
  'ca_whorl_mt_golden_pillar', -- Whorl Mt.: Whorl Mountain, Sawtooth Ridge: High Sierra peak summit
  'ca_whorl_mt_north_ridge', -- Whorl Mt.: Whorl Mountain, Sawtooth Ridge: High Sierra peak summit
  'co_aiguille_de_fleur_fish_in_formation', -- Aiguille de Fleur: Aiguille de Fleur, RMNP: backcountry peak via East Inlet, summit descent to col
  'co_big_buttress_zeb_s_arete', -- Big Buttress: Pikes Peak formations above treeline (~13,000 ft), ending on the summit plateau near the summit road
  'co_bigger_bagger_pinnacle_anus_grape', -- Bigger Bagger Pinnacle: Pikes Peak formations above treeline (~13,000 ft), ending on the summit plateau near the summit road
  'co_bigger_bagger_pinnacle_solar_winds', -- Bigger Bagger Pinnacle: Pikes Peak formations above treeline (~13,000 ft), ending on the summit plateau near the summit road
  'co_cathedral_wall_garden_wall', -- Cathedral Wall: Cathedral Wall above Sky Pond, RMNP: high alpine cirque face
  'co_flattop_mountain_mosquito_wall', -- Flattop Mountain: Flattop Mountain/Dragon’s Tail, RMNP: couloir approach, high peak face
  'co_flattop_mountain_south_ridge', -- Flattop Mountain: Flattop Mountain/Dragon’s Tail, RMNP: couloir approach, high peak face
  'co_lone_eagle_peak_detour_crack', -- Lone Eagle Peak: Single pitch, but sits beneath Lone Eagle Peak’s east face, reached only by a long Indian Peaks wilderness approach
  'co_mount_neva_peace_is_for_the_valleys_war_is_for_the_mountains', -- Mount Neva: Unnamed peak by Mount Neva at Arapaho Pass, ~12k ft, tops out on a summit
  'co_palisades_the_great_chimney', -- Palisades: Great White Tower on Longs Peak via the Loft, high RMNP peak terrain
  'co_pilot_mtn_sandwich_cannon', -- Pilot Mtn.: Pilot Mountain deep in Wild Basin RMNP, climbs to the Divide, descends via Boulder-Grand Pass
  'co_ptarmigan_towers_ptarmigan_reality_aka_night_moose', -- Ptarmigan Towers: Ptarmigan Towers above Lake Nanita, long RMNP backcountry approach, summit topout
  'co_ptarmigan_towers_unoriginal_sin', -- Ptarmigan Towers: Ptarmigan Towers above Lake Nanita, long RMNP backcountry approach, summit topout
  'co_sharkstooth_northeast_ridge', -- Sharkstooth: Sharkstooth spire in a high RMNP cirque near Andrews Glacier, summit route
  'co_southeast_face_coming_of_age', -- Southeast Face: Mt Bierstadt southeast face above Abyss Lake, ~13k ft, ends on ridge crest below summit
  'co_t_3_northeast_corner', -- T 3: Mountaineer’s route on T3 in the Block Tops, San Juans, ridge traverse via T4
  'co_the_crestones_the_prow_kit_carson', -- The Crestones: Kit Carson south ridge in the Crestones, 14er terrain with a long peak descent
  'co_the_hand_north_arete', -- The Hand: Pinnacle at the head of the Sneffels north-face drainage, high San Juans
  'co_valhalla_peak_eldar_tower_i_found_the_letters', -- Valhalla Peak, Eldar Tower: Eldar Tower by the upper alpine lake in the Gore Range, summit and 4th-class descent
  'co_walk_of_life_spire_walk_of_life', -- Walk of Life Spire: Gore Range spire in South Rock Creek, high-country approach and summit
  'id_beehive_dome_beehive_five', -- Beehive Dome: Selkirk Crest dome, bushwhack approach, ends on summits of a ridge traverse
  'id_bighorn_crags_litner_group_of_peaks_pace_setter', -- Bighorn Crags/Litner Group of Peaks: Bighorn Crags in the Frank Church Wilderness, over two passes, peak summit
  'id_mt_idaho_east_face_mountaineer_s_route', -- Mt Idaho: Mt Idaho in the Lost River Range, summit and scree descent from a Merriam Lake camp
  'id_south_face_southeast_face', -- South Face: Lion’s Head peak in the North Idaho Selkirks, route links to the summit
  'id_storm_dome_pika_paradise', -- Storm Dome: Storm Dome above Twenty Mile Lakes via alpine meadow, summit option
  'me_flatiron', -- Chimney Pond ("South") Basin - Summer Rock Routes: Katahdin buttress topping out on the Knife Edge near Baxter Peak
  'me_the_armadillo', -- Chimney Pond ("South") Basin - Summer Rock Routes: Katahdin buttress, ridge traverse to Pamola for descent
  'mt_arrowhead_bowl_no_name_bowl_alpine_boogie', -- Arrowhead Bowl / No Name Bowl: Ends on the summit of Arrowhead on the Bridger Ridge, descends via the ridge trail
  'mt_mt_wood_north_face_central_rib', -- Mt. Wood North Face: Mt Wood north face in the Beartooths, moraine approach from a camp, summit
  'mt_palm_springs_buttress_if_i_had_a_hammer', -- Palm Springs Buttress: Glacier NP buttress in the Lake Ellen Wilson basin via Gunsight Pass trail, long high-country approach
  'mt_sacajawea_peak_sacajawea_direct', -- Sacajawea Peak: Route to the summit of Sacajawea Peak, Bridgers
  'mt_spirit_mountain_lunar_arete', -- Spirit Mountain: Beartooth peak arete with steep snow
  'mt_witchtowers_hocus_pocus', -- Witchtowers: 8 pitches to a tower summit block in the Beartooth backcountry, with off-trail approach and descent
  'nh_04_lion_s_head_lion_s_head_standard', -- Lion’s Head: Lion’s Head on Mt Washington above Tuckerman Ravine, above treeline, ends near its summit
  'nm_whiskey_peak_whiskey_ridge', -- Whiskey Peak: Long ridge with 3rd/4th class to the summit of Whiskey Peak, Sandias
  'nt_mt_sir_james_macbrien_peak_southeast_arete', -- Mt. Sir James MacBrien Peak: Cirque of the Unclimbables peak, long serious descent
  'nu_coronation_glacier_escape_from_azkaban', -- Coronation Glacier: Baffin Island glacier approach, expedition
  'nu_coronation_glacier_the_salami_exchange_commission', -- Coronation Glacier: Baffin Island glacier approach, expedition
  'ut_demoisy_peak_2_lone_tree', -- DeMoisy Peak: Ends on top of DeMoisy Peak, walk off the summit
  'ut_demoisy_peak_2_on_the_fly', -- DeMoisy Peak: Reaches DeMoisy Peak summit ridge, walk off the top
  'wa_apex_mountain_pasayten_apex_buttress', -- Apex Mountain: Apex Mountain buttress in the Pasayten Wilderness above Tungsten Lake
  'wa_big_snow_mountain_sasquatch_s_breath', -- Big Snow Mountain: Multi-pitch route on Big Snow Mountain, a 6,680 ft Alpine Lakes Wilderness peak with a long backcountry approach
  'wa_burgundy_spire_corkscrew_route', -- Burgundy Spire: 15-pitch line with snow couloir to the summit of Burgundy Spire, Washington Pass
  'wa_colchuck_balanced_rock_the_foot_of_faith_west_face_p3_variation', -- Colchuck Balanced Rock: Pitch on Colchuck Balanced Rock, an 8,240 ft alpine tower above Colchuck Lake in the Enchantments
  'wa_colchuck_balanced_rock_west_face_p3_1984_variation', -- Colchuck Balanced Rock: Pitch on Colchuck Balanced Rock, an 8,240 ft alpine tower above Colchuck Lake in the Enchantments
  'wa_comb_the_boomerang', -- Comb, The Routes: Long backcountry approach into the Boulder River Wilderness; well over the one-hour crag limit
  'wa_comb_the_desire', -- Comb, The Routes: Grade IV in the Boulder River Wilderness with a long backcountry approach
  'wa_comb_the_dreamer', -- Comb, The Routes: Grade IV in the Boulder River Wilderness with a long backcountry approach
  'wa_comb_the_the_fast_lane', -- Comb, The Routes: Grade IV in the Boulder River Wilderness with a long backcountry approach
  'wa_crater_mountain_appassionata_smothered_in_smoke', -- Crater Mountain: Crag high on a North Cascades peak in the Pasayten backcountry; reaching it is mountain travel
  'wa_dragontail_peak_a_kidney_for_a_friend', -- Dragontail Peak: Route on Dragontail Peak, 8,840 ft Enchantments peak
  'wa_dragontail_peak_complete_northeast_buttress', -- Dragontail Peak: Long buttress to the summit of Dragontail Peak
  'wa_dragontail_peak_dragon_s_jaw', -- Dragontail Peak: Route on Dragontail Peak, 8,840 ft Enchantments peak
  'wa_dragontail_peak_dragonfruit', -- Dragontail Peak: Route on Dragontail Peak, 8,840 ft Enchantments peak
  'wa_dragontail_peak_dragons_of_eden', -- Dragontail Peak: Route on Dragontail Peak, 8,840 ft Enchantments peak
  'wa_dragontail_peak_new_dark_ages', -- Dragontail Peak: Route on Dragontail Peak, 8,840 ft Enchantments peak
  'wa_elephant_head_lower_west_face', -- Elephant Head: Route on Elephant Head, a ~8,000 ft backcountry peak
  'wa_elephant_head_variation_p1_west_face', -- Elephant Head: Pitch variation on Elephant Head, a ~8,000 ft backcountry peak
  'wa_ez_way', -- Shark Rock: Long backcountry approach in the Dark Divide to a route that tops out on the formation summit
  'wa_half_moon_uncle_wehrly_s_toupee', -- Half Moon: Route on Half Moon, a Kangaroo Ridge peak near Washington Pass
  'wa_house_buttress', -- Poster Peak: Alpine ridge to the summit of Poster Peak with mountain descent couloir
  'wa_ingalls_peak_east_peak_southwest_face', -- Ingalls Peak: Summit route on Ingalls Peak, 7,662 ft
  'wa_ingalls_peak_ingalls_error', -- Ingalls Peak: Route on Ingalls Peak, 7,662 ft
  'wa_liberty_bell_the_barber_pole', -- Liberty Bell Mountain: Route on Liberty Bell Mountain, Washington Pass
  'wa_little_big_chief_mountain_falcon_route', -- Little Big Chief Mountain: 15-pitch route on Little Big Chief Mountain, 7,225 ft Alpine Lakes peak
  'wa_main_peak_tepeh_towers', -- Main Peak: Glaciated approach across Eldorado icecap from high camp
  'wa_mixup_peak_pbs_late_night_special', -- Mix-up Peak: Route on Mix-up Peak, 7,440 ft Cascade Pass area peak
  'wa_monte_cristo_peak_standard_route_variation_1', -- Monte Cristo Peak: Standard route on Monte Cristo Peak with steep snow and moat
  'wa_monte_cristo_peak_standard_route_variation_2', -- Monte Cristo Peak: Standard route on Monte Cristo Peak with steep snow and moat
  'wa_mount_olympus_2_north_ridge_via_blue_glacier', -- Mount Olympus (West Peak): Glacier approach to Mount Olympus summit
  'wa_mount_stuart_direct_north_ridge', -- Mount Stuart: 20-pitch ridge to summit of Mount Stuart
  'wa_mount_stuart_gorillas_in_the_mist', -- Mount Stuart: Route on Mount Stuart with snow approach
  'wa_mount_stuart_stuart_range_traverse', -- Mount Stuart: Multi-peak Stuart Range traverse
  'wa_north_early_winter_spire_christianson_roskelley', -- North Early Winters Spire: Route on North Early Winters Spire, Washington Pass
  'wa_north_early_winter_spire_twitch_of_the_death_nerve', -- North Early Winters Spire: Route on North Early Winters Spire, Washington Pass
  'wa_north_early_winter_spire_vulcan_death_grip', -- North Early Winters Spire: Route on North Early Winters Spire, Washington Pass
  'wa_north_early_winters_spire_northwest_corner_a_k_a_boving_pollack_route', -- North Early Winters Spire: Route on North Early Winters Spire, Washington Pass
  'wa_northwest_face', -- Vasiliki Tower: Summit route on Vasiliki Tower from Burgundy Col, Washington Pass
  'wa_northwest_mox_peak_northeast_ridge', -- Northwest Mox Peak: Snow and rock standard route on remote NW Mox Peak, Chilliwacks
  'wa_primal_scream', -- South Face: 12-pitch ridge on Squire Creek Wall reached via a long approach with a saddle bivy
  'wa_prusik_peak_stanley_burgner', -- Prusik Peak: Route on Prusik Peak in the Enchantments
  'wa_safe_sex', -- Green Giant Buttress: Green Giant Buttress, Grade IV in the Boulder River Wilderness with a long backcountry approach
  'wa_sharkfin_tower_flakes_and_chimneys_south_face', -- Sharkfin Tower: Boston Basin tower with snow approach
  'wa_skookum_peak_twinsisters_jaw_s_tooth_and_northwest_ridge', -- Skookum Peak: Ridge route to Skookum Peak summit from a backcountry basin, Twin Sisters area
  'wa_smears_jugs_and_rock_roll', -- Viviane Campsite: Single pitch, but sits near Lake Viviane in the core Enchantments, reached by a long high-country approach
  'wa_south_early_winters_spire_backseat_driver', -- South Early Winters Spire: Route on South Early Winters Spire, Washington Pass
  'wa_south_early_winters_spire_south_east_mank', -- South Early Winters Spire: Route on South Early Winters Spire, Washington Pass
  'wa_south_early_winters_spire_the_rubbernecker', -- South Early Winters Spire: Route on South Early Winters Spire, Washington Pass
  'wa_southeast_mox_peak_beckey_route_west_ridge', -- Southeast Mox Peak: Ridge route on remote SE Mox Peak, Chilliwacks
  'wa_the_temple_west_face', -- The Temple: Route on The Temple, 8,295 ft Enchantments peak
  'wa_vesper_peak_north_face', -- Vesper Peak: North face route on Vesper Peak
  'wy_buck_mt_smith_lepore_variation', -- Buck Mt.: Snow approach to Buck Mountain summit, Tetons
  'wy_buck_mt_the_buck_sanction', -- Buck Mt.: North face of Buck Mountain, Tetons, topping near summit
  'wy_disappointment_peak_almost_overhanging', -- Disappointment Peak: Garnet Canyon arete on Disappointment Peak, high Teton terrain with fourth-class descent
  'wy_gannett_peak_northeast_ridge', -- Gannett Peak: Glaciated route on Gannett Peak, Wind Rivers
  'wy_grand_teton_flipping_tokens_to_hoboken', -- Grand Teton: Joins Exum Ridge to Grand Teton summit
  'wy_grand_teton_petzoldt_ridge', -- Grand Teton: Grand Teton ridge route to summit
  'wy_grand_teton_the_rainbow_bridge', -- Grand Teton: Grandstand on Grand Teton, finishes via North Ridge
  'wy_grand_teton_trust_but_verify', -- Grand Teton: Joins Upper Exum to Grand Teton summit
  'wy_grand_teton_wish_you_were_here', -- Grand Teton: Joins Upper Exum to Grand Teton summit
  'wy_grand_teton_wooden_ships', -- Grand Teton: Ends on Exum Ridge of Grand Teton
  'wy_index_peak_west_face', -- Index Peak: West face to summit of Index Peak, Absarokas
  'wy_index_pika_hunter', -- Index: Granite spire summit in Cloud Peak Wilderness backcountry
  'wy_medicine_bow_peak_area_diamond_central_diamond_express', -- Medicine Bow Peak Area: Tops out at summit of 12,000 ft Medicine Bow Peak, above treeline
  'wy_medicine_bow_peak_area_dr_kervorkian', -- Medicine Bow Peak Area: Tops out at summit of 12,000 ft Medicine Bow Peak, above treeline
  'wy_medicine_bow_peak_area_midnight_cowboy', -- Medicine Bow Peak Area: Tops out at summit of 12,000 ft Medicine Bow Peak, above treeline
  'wy_monolith_cirque_big_jobbin', -- Monolith Cirque: Wind River backcountry cirque route
  'wy_monolith_cirque_monolith_north_face_gran_route', -- Monolith Cirque: 14-pitch north face to summit of the Monolith, Wind Rivers
  'wy_south_side_of_death_canyon_predator', -- South side of Death Canyon: Grade IV with a complex approach through an avalanche couloir and snow cone, and long descent options; MP calls it rarely done
  'wy_stuart_draw_peaches', -- Stuart Draw: Tops out on the summit via the east ridge, after a ~2 hr backcountry approach in the Tetons
  'wy_symmetry_spire_reticent_slabs', -- Symmetry Spire: Face on Symmetry Spire above Cascade Canyon, Tetons, via snowy couloir approach
  'wy_table_mountain_heartbreak_ridge', -- Table Mountain: Ridge to summit of Table Mountain, Tetons
  'wy_taminah_arete_sunrise_ridge', -- Taminah Arete: Ridge finishing on Gilkey Tower summit, Tetons
  'wy_warrior_1_northeast_face_r_of_warrior_i', -- Warrior 1: Cirque of the Towers peak, Wind Rivers
  'yt_caribou_mountain_gwaihir', -- Caribou Mountain: Tops out on summit of Caribou Mountain with peak descent
  'yt_mt_kelsall_area_unnamed_peak_honeymoon_arete'  -- Mt Kelsall area: Arete to sub-peak summit near Mt Kelsall from backcountry camp
);
