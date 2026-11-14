-- The Colorado Centennials and the Adirondack 46: the summits the catalog does not hold, and a standard
-- route on the list peaks it holds only as technical walls.
--
-- WHY (owner, 2026-10-21): two new tick lists, and a list card must never advertise a total the catalog
-- cannot reach — twelve cards were removed in August for exactly that (PR #927). Both lists were removed
-- then; the owner asked for them back with the missing peaks ADDED, not shown as unreachable.
--
-- ABSENCE WAS PROVEN, NOT ASSUMED (the 0137 method). Every Colorado and New York area was read once and
-- matched by name AND by coordinate (nearest same-named area within 3 km, else any peak-type area within
-- 0.6 km), then a LOOSE probe looked for the distinctive word within 8 km. Its only hits were separate
-- summits: West Trinity Peak (beside Trinity), Little Marcy (beside Marcy), Dix (beside South Dix).
-- "Nipple Top" was found that way — an exact-name check had missed it — so it gets a route, not a copy.
-- 0216's trigger still refuses any same-named area within 1.5 km if this file is wrong.
--
-- WHAT IS WRITTEN, and what is deliberately not:
--   * the peak: name, parent range, elevation, summit coordinate (from the published lists);
--   * ONE route: its name, its class as the grade, and a short description in our own words.
--   * NOT round-trip miles, gain or trailhead coordinates. Research found sources disagreeing on many of
--     those, and dist_km already holds two conventions (CLAUDE.md); a wrong number on the planner is worse
--     than an empty field a climber can fill.
--   Class -> discipline as in 0137: Class 1-3 scrambling, Class 4 mountaineering, Class 5 alpine. A class
--   rating is not on the rock ladder, so grade_num stays NULL. Adirondack trails carry no published class:
--   a marked trail is Class 1 and a herd path Class 2, the convention the High Peaks are described by.
--
-- The Colorado 14ers card already resolves the first 53 Centennials; this adds only the 13ers.
-- Re-runnable: every insert is ON CONFLICT DO NOTHING. `path` and route_count are set by triggers.
--
-- REPLAY: the whole body returns early on an empty database (a Supabase preview branch), as 0137 does.

do $replay$ begin
if not exists (select 1 from areas where id = 'colorado') or not exists (select 1 from areas where id = 'ny_e_high_peaks_region') then
  raise notice '0344: catalog not loaded, nothing to add'; return;
end if;

-- 1. Colorado: the Centennial 13ers the catalog does not hold, each with its standard route.
insert into areas (id, name, parent_id, area_type, elevation_ft, lat, lng) values
  ('co_stewart_peak', 'Stewart Peak', 'co_san_juans', 'peak', 13988, 38.0231, -106.9234),
  ('co_mount_ouray', 'Mount Ouray', 'co_sawatch_range', 'peak', 13979, 38.4226, -106.2248),
  ('co_cathedral_peak', 'Cathedral Peak', 'co_elk_mountains', 'peak', 13952, 39.0343, -106.8591),
  ('co_thunder_pyramid', 'Thunder Pyramid', 'co_elk_mountains', 'peak', 13944, 39.0627, -106.9517),
  ('co_fletcher_mountain', 'Fletcher Mountain', 'co_tenmile_range', 'peak', 13943, 39.4033, -106.1289),
  ('co_french_mountain', 'French Mountain', 'co_sawatch_range', 'peak', 13942, 39.1284, -106.4823),
  ('co_mount_hope', 'Mount Hope', 'co_sawatch_range', 'peak', 13939, 39.0211, -106.4199),
  ('co_mount_adams', 'Mount Adams', 'co_sangre_de_cristo_range', 'peak', 13937, 38.0073, -105.6047),
  ('co_horseshoe_mountain', 'Horseshoe Mountain', 'co_mosquito_range', 'peak', 13918, 39.1854, -106.185),
  ('co_emerald_peak', 'Emerald Peak', 'co_sawatch_range', 'peak', 13916, 38.9291, -106.3812),
  ('co_red_mountain', 'Red Mountain', 'co_sangre_de_cristo_range', 'peak', 13911, 37.1122, -105.1813),
  ('co_vermilion_peak', 'Vermilion Peak', 'co_san_juans', 'peak', 13909, 37.7993, -107.8285),
  ('co_casco_peak', 'Casco Peak', 'co_sawatch_range', 'peak', 13905, 39.114, -106.4939),
  ('co_phoenix_peak', 'Phoenix Peak', 'co_san_juans', 'peak', 13904, 37.9364, -106.8664),
  ('co_cronin_peak', 'Cronin Peak', 'co_sawatch_range', 'peak', 13872, 38.6553, -106.2833),
  ('co_mount_buckskin', 'Mount Buckskin', 'co_mosquito_range', 'peak', 13871, 39.3207, -106.1511),
  ('co_north_apostle', 'North Apostle', 'co_sawatch_range', 'peak', 13869, 38.9197, -106.4343),
  ('co_jones_mountain', 'Jones Mountain', 'co_san_juans', 'peak', 13867, 37.8965, -107.5264),
  ('co_half_peak', 'Half Peak', 'co_san_juans', 'peak', 13866, 37.8643, -107.4667),
  ('co_clinton_peak', 'Clinton Peak', 'co_mosquito_range', 'peak', 13866, 39.3682, -106.1488),
  ('co_dyer_mountain', 'Dyer Mountain', 'co_mosquito_range', 'peak', 13861, 39.2398, -106.1832),
  ('co_crystal_peak', 'Crystal Peak', 'co_tenmile_range', 'peak', 13860, 39.4346, -106.1145),
  ('co_mount_edwards', 'Mount Edwards', 'co_front_range', 'peak', 13860, 39.6364, -105.7941),
  ('co_atlantic_peak', 'Atlantic Peak', 'co_tenmile_range', 'peak', 13856, 39.4135, -106.1259),
  ('co_california_peak', 'California Peak', 'co_sangre_de_cristo_range', 'peak', 13854, 37.6143, -105.4988),
  ('co_holy_cross_ridge', 'Holy Cross Ridge', 'co_sawatch_range', 'peak', 13850, 39.459, -106.4859),
  ('co_hagerman_peak', 'Hagerman Peak', 'co_elk_mountains', 'peak', 13848, 39.112, -107.0602),
  ('co_mount_oklahoma', 'Mount Oklahoma', 'co_sawatch_range', 'peak', 13843, 39.1786, -106.5064),
  ('co_un_13_838', 'UN 13,838', 'co_san_juans', 'peak', 13838, 37.9471, -107.3983),
  ('co_jupiter_mountain', 'Jupiter Mountain', 'co_san_juans', 'peak', 13838, 37.6125, -107.592),
  ('co_turret_peak', 'Turret Peak', 'co_san_juans', 'peak', 13837, 37.6275, -107.6399),
  ('co_huerfano_peak', 'Huerfano Peak', 'co_sangre_de_cristo_range', 'peak', 13837, 37.6003, -105.4479),
  ('co_mount_silverheels', 'Mount Silverheels', 'co_front_range', 'peak', 13828, 39.3395, -106.0054),
  ('co_lackawanna', 'Lackawanna', 'co_sawatch_range', 'peak', 13826, 39.0936, -106.5121),
  ('co_rio_grande_pyramid', 'Rio Grande Pyramid', 'co_san_juans', 'peak', 13825, 37.6796, -107.3924),
  ('co_un_13_820', 'UN 13,820', 'co_san_juans', 'peak', 13820, 37.9546, -107.3782),
  ('co_trinity_peak', 'Trinity Peak', 'co_san_juans', 'peak', 13816, 37.6848, -107.5814),
  ('co_niagara_peak', 'Niagara Peak', 'co_san_juans', 'peak', 13816, 37.8893, -107.5335)
on conflict (id) do nothing;

insert into routes (id, area_id, name, discipline, grade, grade_system, description) values
  ('co_stewart_peak_east_ridge', 'co_stewart_peak', 'East Ridge', 'scrambling', 'Class 2', 'class', 'Long grassy ridge in the remote eastern San Juans; mileage depends heavily on how far a vehicle can drive up the Stewart Creek road.'),
  ('co_mount_ouray_west_ridge', 'co_mount_ouray', 'West Ridge', 'scrambling', 'Class 2', 'class', 'Short, mostly walking ascent along the Continental Divide ridge from the pass, with a bit of rocky stepping near the top.'),
  ('co_cathedral_peak_south_ridge_and_couloir', 'co_cathedral_peak', 'South Ridge and Couloir', 'scrambling', 'Class 3', 'class', 'Trail to Cathedral Lake, then a loose gully and ridge scramble to the summit above Aspen; rockfall and late-season loose scree are the main concerns.'),
  ('co_thunder_pyramid_west_face_white_couloir', 'co_thunder_pyramid', 'West Face (White Couloir)', 'scrambling', 'Class 3', 'class', 'Steep couloir and west-face scrambling reached from the Maroon Lake area; very loose rock makes rockfall a serious hazard, so helmets and small parties matter.'),
  ('co_fletcher_mountain_southeast_ridge', 'co_fletcher_mountain', 'Southeast Ridge', 'scrambling', 'Class 2', 'class', 'Short tundra and talus climb from the Blue Lakes road, often paired with Drift Peak by a Class 3 traverse.'),
  ('co_french_mountain_southeast_ridge', 'co_french_mountain', 'Southeast Ridge', 'scrambling', 'Class 2', 'class', 'Grassy ridge and flank above the Halfmoon drainage; often linked in a day with Frasco Benchmark and Casco Peak.'),
  ('co_mount_hope_east_ridge', 'co_mount_hope', 'East Ridge', 'scrambling', 'Difficult Class 2', 'class', 'Steady climb with considerable loose talus on the upper ridge, usually done with neighboring Quail Mountain.'),
  ('co_mount_adams_west_ridge_via_willow_creek', 'co_mount_adams', 'West Ridge via Willow Creek', 'scrambling', 'Class 3', 'class', 'Long approach to a high basin followed by a ridge scramble with some Class 3 moves in the Sangre de Cristos.'),
  ('co_horseshoe_mountain_east_slopes', 'co_horseshoe_mountain', 'East Slopes', 'scrambling', 'Class 1', 'class', 'Gentle walk-up on tundra slopes in the Mosquito Range; one of the easiest Centennial 13ers.'),
  ('co_emerald_peak_south_southwest_ridge', 'co_emerald_peak', 'South/Southwest Ridge', 'scrambling', 'Class 2', 'class', 'Moderate hike from the Clohesy Lake area above Winfield with a talus finish.'),
  ('co_red_mountain_north_ridge_from_culebra_peak', 'co_red_mountain', 'North Ridge (from Culebra Peak)', 'scrambling', 'Class 2', 'class', 'Reached only across private ranch land with a permit; it is a ridge walk usually done after Culebra Peak.'),
  ('co_vermilion_peak_southeast_ridge', 'co_vermilion_peak', 'Southeast Ridge', 'scrambling', 'Class 2+', 'class', 'Open ridge and loose talus above Telluride''s Ophir area with a short final scramble.'),
  ('co_casco_peak_north_ridge', 'co_casco_peak', 'North Ridge', 'scrambling', 'Class 2+', 'class', 'Rocky ridge scramble that is usually combined with French Mountain and Frasco Benchmark.'),
  ('co_phoenix_peak_south_ridge_and_slopes', 'co_phoenix_peak', 'South Ridge and Slopes', 'scrambling', 'Class 2', 'class', 'Remote tundra walk reached by a rough road near Creede; adds a few miles if the road is not driven.'),
  ('co_cronin_peak_north_ridge', 'co_cronin_peak', 'North Ridge', 'scrambling', 'Class 2', 'class', 'Long ridge hike at the southern end of the Sawatch, started from the Baldwin Creek area.'),
  ('co_mount_buckskin_northeast_slope', 'co_mount_buckskin', 'Northeast Slope', 'scrambling', 'Class 2', 'class', 'Short, easy tundra climb from Kite Lake; commonly done with the Decalibron group.'),
  ('co_north_apostle_southwest_ridge', 'co_north_apostle', 'Southwest Ridge', 'scrambling', 'Class 2', 'class', 'Tundra and talus ridge in the Collegiate Peaks, often combined with Ice Mountain.'),
  ('co_jones_mountain_northeast_ridge', 'co_jones_mountain', 'Northeast Ridge', 'scrambling', 'Class 2', 'class', 'Straightforward ridge walk, normally strung together with American and Niagara peaks.'),
  ('co_half_peak_northwest_ridge', 'co_half_peak', 'Northwest Ridge', 'scrambling', 'Class 3', 'class', 'Remote peak near the Continental Divide whose mileage depends on how far a high-clearance vehicle can drive; rough ridge scrambling near the top.'),
  ('co_clinton_peak_south_slope', 'co_clinton_peak', 'South Slope', 'scrambling', 'Class 2', 'class', 'Gentle slopes above the Mosquito Range, usually done on its own or with neighboring McNamee and Traver.'),
  ('co_dyer_mountain_southeast_slopes', 'co_dyer_mountain', 'Southeast Slopes', 'scrambling', 'Class 2', 'class', 'Short climb from a high trailhead above Leadville.'),
  ('co_crystal_peak_northeast_ridge', 'co_crystal_peak', 'Northeast Ridge', 'scrambling', 'Class 2', 'class', 'Talus ridge in the Tenmile Range; often joined with Pacific and Atlantic peaks.'),
  ('co_mount_edwards_southwest_ridge', 'co_mount_edwards', 'Southwest Ridge', 'scrambling', 'Class 2', 'class', 'Tundra ridge off the Argentine Pass road near Georgetown with some rocky sections.'),
  ('co_atlantic_peak_north_ridge', 'co_atlantic_peak', 'North Ridge', 'scrambling', 'Class 2', 'class', 'Trail up McCullough Gulch then a talus ridge; parking is restricted at this trailhead.'),
  ('co_california_peak_south_ridge', 'co_california_peak', 'South Ridge', 'scrambling', 'Class 2', 'class', 'Long grassy and talus ridge in the Sangre de Cristo Range accessed from the Lily Lake road.'),
  ('co_holy_cross_ridge_north_section_from_half_moon_creek', 'co_holy_cross_ridge', 'North Section from Half Moon Creek', 'scrambling', 'Class 2', 'class', 'Long trail and ridge walk near Holy Cross with a talus finish.'),
  ('co_hagerman_peak_southface', 'co_hagerman_peak', 'Southface', 'scrambling', 'Difficult Class 2', 'class', 'Climb through steep gullies on the south face above Geneva Lake; snow can linger in the gullies.'),
  ('co_mount_oklahoma_southeast_slopes', 'co_mount_oklahoma', 'Southeast Slopes', 'scrambling', 'Class 2', 'class', 'Steady grassy and talus slopes above Halfmoon Creek.'),
  ('co_un_13_838_west_ridge', 'co_un_13_838', 'West Ridge', 'scrambling', 'Class 2', 'class', 'Tundra ridge reached by a rough 4x4 road near Redcloud; also climbed in a combo with its neighbor.'),
  ('co_jupiter_mountain_southwest_slopes', 'co_jupiter_mountain', 'Southwest Slopes', 'scrambling', 'Class 2+', 'class', 'Remote Chicago Basin objective reached by train; the final slopes are loose.'),
  ('co_turret_peak_northwest_slope', 'co_turret_peak', 'Northwest Slope', 'scrambling', 'Class 2', 'class', 'Talus slope above Chicago Basin, normally combined with Pigeon Peak.'),
  ('co_huerfano_peak_south_slopes', 'co_huerfano_peak', 'South Slopes', 'scrambling', 'Class 2', 'class', 'Long ridge and talus ascent in the Sangre de Cristos; a side trip to the Iron Nipple is optional.'),
  ('co_mount_silverheels_north_spur_from_hoosier_pass', 'co_mount_silverheels', 'North Spur from Hoosier Pass', 'scrambling', 'Class 2', 'class', 'Broad spur above Hoosier Pass; a short hike with talus near the top.'),
  ('co_lackawanna_north_northwest_ridge', 'co_lackawanna', 'North-Northwest Ridge', 'scrambling', 'Class 2', 'class', 'Steep grass and talus ridge above Lake Creek near Twin Lakes.'),
  ('co_rio_grande_pyramid_east_slope_ridge', 'co_rio_grande_pyramid', 'East Slope/Ridge', 'scrambling', 'Class 2', 'class', 'Very long Weminuche Wilderness hike, usually made an overnight, over gentle grassy terrain.'),
  ('co_un_13_820_southwest_ridge', 'co_un_13_820', 'Southwest Ridge', 'scrambling', 'Class 2', 'class', 'Remote ridge hike from the Silver Creek road near Redcloud.'),
  ('co_trinity_peak_west_ridge', 'co_trinity_peak', 'West Ridge', 'mountaineering', 'Class 4', 'class', 'Remote Grenadier peak reached from Vestal Basin with exposed ridge climbing.'),
  ('co_niagara_peak_northeast_ridge', 'co_niagara_peak', 'Northeast Ridge', 'scrambling', 'Class 2', 'class', 'Ridge walk usually combined with American and Jones peaks.')
on conflict (id) do nothing;


-- 2. New York: the Adirondack 46 High Peaks the catalog does not hold, each with its standard route.
insert into areas (id, name, parent_id, area_type, elevation_ft, lat, lng) values
  ('ny_mount_marcy', 'Mount Marcy', 'ny_e_high_peaks_region', 'peak', 5344, 44.1127, -73.9237),
  ('ny_mount_haystack', 'Mount Haystack', 'ny_e_high_peaks_region', 'peak', 4960, 44.1056, -73.9006),
  ('ny_mount_skylight', 'Mount Skylight', 'ny_e_high_peaks_region', 'peak', 4924, 44.0994, -73.9308),
  ('ny_gray_peak', 'Gray Peak', 'ny_e_high_peaks_region', 'peak', 4840, 44.1114, -73.9349),
  ('ny_iroquois_peak', 'Iroquois Peak', 'ny_e_high_peaks_region', 'peak', 4840, 44.137, -73.9982),
  ('ny_basin_mountain', 'Basin Mountain', 'ny_e_high_peaks_region', 'peak', 4827, 44.1212, -73.8863),
  ('ny_santanoni_peak', 'Santanoni Peak', 'ny_e_high_peaks_region', 'peak', 4607, 44.0825, -74.1312),
  ('ny_mount_redfield', 'Mount Redfield', 'ny_e_high_peaks_region', 'peak', 4606, 44.0948, -73.9499),
  ('ny_saddleback_mountain', 'Saddleback Mountain', 'ny_e_high_peaks_region', 'peak', 4515, 44.1267, -73.8752),
  ('ny_panther_peak', 'Panther Peak', 'ny_e_high_peaks_region', 'peak', 4442, 44.0984, -74.1321),
  ('ny_table_top_mountain', 'Table Top Mountain', 'ny_e_high_peaks_region', 'peak', 4427, 44.1407, -73.9163),
  ('ny_rocky_peak_ridge', 'Rocky Peak Ridge', 'ny_e_high_peaks_region', 'peak', 4420, 44.1544, -73.7056),
  ('ny_macomb_mountain', 'Macomb Mountain', 'ny_e_high_peaks_region', 'peak', 4405, 44.0517, -73.7801),
  ('ny_armstrong_mountain', 'Armstrong Mountain', 'ny_e_high_peaks_region', 'peak', 4400, 44.1348, -73.849),
  ('ny_hough_peak', 'Hough Peak', 'ny_e_high_peaks_region', 'peak', 4400, 44.0695, -73.7776),
  ('ny_seward_mountain', 'Seward Mountain', 'ny_e_high_peaks_region', 'peak', 4361, 44.1597, -74.1997),
  ('ny_mount_marshall', 'Mount Marshall', 'ny_e_high_peaks_region', 'peak', 4360, 44.1275, -74.0118),
  ('ny_allen_mountain', 'Allen Mountain', 'ny_e_high_peaks_region', 'peak', 4340, 44.0708, -73.9397),
  ('ny_esther_mountain', 'Esther Mountain', 'ny_e_high_peaks_region', 'peak', 4240, 44.387, -73.8899),
  ('ny_upper_wolfjaw_mountain', 'Upper Wolfjaw Mountain', 'ny_e_high_peaks_region', 'peak', 4185, 44.1405, -73.8453),
  ('ny_street_mountain', 'Street Mountain', 'ny_e_high_peaks_region', 'peak', 4166, 44.1793, -74.0272),
  ('ny_phelps_mountain', 'Phelps Mountain', 'ny_e_high_peaks_region', 'peak', 4161, 44.157, -73.9215),
  ('ny_donaldson_mountain', 'Donaldson Mountain', 'ny_e_high_peaks_region', 'peak', 4140, 44.1539, -74.211),
  ('ny_seymour_mountain', 'Seymour Mountain', 'ny_e_high_peaks_region', 'peak', 4120, 44.1582, -74.1727),
  ('ny_sawteeth', 'Sawteeth', 'ny_e_high_peaks_region', 'peak', 4100, 44.1133, -73.8507),
  ('ny_south_dix', 'South Dix', 'ny_e_high_peaks_region', 'peak', 4060, 44.06, -73.7743),
  ('ny_mount_colvin', 'Mount Colvin', 'ny_e_high_peaks_region', 'peak', 4057, 44.0939, -73.8344),
  ('ny_mount_emmons', 'Mount Emmons', 'ny_e_high_peaks_region', 'peak', 4040, 44.1437, -74.214),
  ('ny_dial_mountain', 'Dial Mountain', 'ny_e_high_peaks_region', 'peak', 4020, 44.1059, -73.796),
  ('ny_grace_peak', 'Grace Peak', 'ny_e_high_peaks_region', 'peak', 4012, 44.0653, -73.7574),
  ('ny_blake_peak', 'Blake Peak', 'ny_e_high_peaks_region', 'peak', 3960, 44.0814, -73.8446),
  ('ny_cliff_mountain', 'Cliff Mountain', 'ny_e_high_peaks_region', 'peak', 3960, 44.1031, -73.9751),
  ('ny_nye_mountain', 'Nye Mountain', 'ny_e_high_peaks_region', 'peak', 3895, 44.1873, -74.0238),
  ('ny_couchsachraga_peak', 'Couchsachraga Peak', 'ny_e_high_peaks_region', 'peak', 3820, 44.0956, -74.1602)
on conflict (id) do nothing;

insert into routes (id, area_id, name, discipline, grade, grade_system, description) values
  ('ny_mount_marcy_van_hoevenberg_trail', 'ny_mount_marcy', 'Van Hoevenberg Trail', 'scrambling', 'Class 1', 'class', 'The most popular route, marked all the way; the upper cone is bare rock and is followed by cairns and paint blazes. Path: Van Hoevenberg Trail. Starts at Adirondak Loj / High Peaks Information Center.'),
  ('ny_mount_haystack_phelps_trail_from_the_garden', 'ny_mount_haystack', 'Phelps Trail from the Garden', 'scrambling', 'Class 1', 'class', 'Steep rock slab and an exposed summit make this one of the harder marked High Peaks; the Loj approach via Marcy Dam is longer. Path: Phelps Trail from The Garden. Starts at The Garden, Keene Valley.'),
  ('ny_mount_skylight_via_mount_marcy', 'ny_mount_skylight', 'Via Mount Marcy', 'scrambling', 'Class 1', 'class', 'Usually climbed with Marcy and Gray; the alternative approach from Upper Works is longer. Path: Van Hoevenberg Trail over Marcy to Lake Tear of the Clouds. Starts at Adirondak Loj / High Peaks Information Center.'),
  ('ny_gray_peak_via_lake_tear_of_the_clouds', 'ny_gray_peak', 'Via Lake Tear of the Clouds', 'scrambling', 'Class 2', 'class', 'Marked trail to Lake Tear of the Clouds, then a faint herd path to the summit. Path: Marcy Dam and Lake Arnold/Feldspar trails to Lake Tear, then herd path. Starts at Adirondak Loj / High Peaks Information Center.'),
  ('ny_iroquois_peak_via_algonquin_peak', 'ny_iroquois_peak', 'Via Algonquin Peak', 'scrambling', 'Class 2', 'class', 'Done as an out-and-back over Algonquin, with a steep unmarked final stretch. Path: Algonquin Peak trail, then herd path to Iroquois. Starts at Adirondak Loj / High Peaks Information Center.'),
  ('ny_basin_mountain_shoreys_shortcut', 'ny_basin_mountain', 'Shorey''s Shortcut', 'scrambling', 'Class 1', 'class', 'Long day with ladders and rock slabs; the exposed summit is often combined with Haystack or Saddleback. Path: Phelps Trail and Shorey''s Shortcut. Starts at The Garden, Keene Valley.'),
  ('ny_santanoni_peak_santanoni_express', 'ny_santanoni_peak', 'Santanoni Express', 'scrambling', 'Class 2', 'class', 'Steep eroded herd path after the marked trail to Bradley Pond; Santanoni Brook can be hard to cross when wet. Path: Bradley Pond Trail and Santanoni Express herd path. Starts at Upper Works, Newcomb.'),
  ('ny_mount_redfield_uphill_brook_herd_path', 'ny_mount_redfield', 'Uphill Brook herd path', 'scrambling', 'Class 2', 'class', 'Marked trail to the Uphill lean-to area, then a cairned herd path; the approach from the Loj crosses slides and is not the usual way. Path: Calamity Brook Trail to unmarked herd path. Starts at Upper Works, Newcomb.'),
  ('ny_saddleback_mountain_ore_bed_trail', 'ny_saddleback_mountain', 'Ore Bed Trail', 'scrambling', 'Class 1', 'class', 'Steps and ladders on the Ore Bed Trail; the garden lot is small and fills early on weekends. Path: Johns Brook Valley and Ore Bed Trail. Starts at The Garden, Keene Valley.'),
  ('ny_panther_peak_panther_brook_herd_path', 'ny_panther_peak', 'Panther Brook herd path', 'scrambling', 'Class 2', 'class', 'Unmarked path leaves the Bradley Pond trail about 4.3 miles in; often combined with Santanoni. Path: Bradley Pond Trail and Panther Brook herd path. Starts at Upper Works, Newcomb.'),
  ('ny_table_top_mountain_herd_path_from_the_van_hoevenberg_trail', 'ny_table_top_mountain', 'Herd path from the Van Hoevenberg Trail', 'scrambling', 'Class 2', 'class', 'Unmarked herd path leaving the main trail past Marcy Dam; frequently paired with Phelps. Path: Herd path off the Van Hoevenberg Trail. Starts at Adirondak Loj / High Peaks Information Center.'),
  ('ny_rocky_peak_ridge_via_giant_mountain', 'ny_rocky_peak_ridge', 'Via Giant Mountain', 'scrambling', 'Class 1', 'class', 'Most climbers go over Giant and along the ridge; a longer direct route starts at the East Trail on Route 9. Path: Roaring Brook Trail over Giant, then the ridge trail.'),
  ('ny_macomb_mountain_macomb_slide', 'ny_macomb_mountain', 'Macomb Slide', 'scrambling', 'Class 2', 'class', 'Slide is steep and loose; the first 2.3 miles from Elk Lake cross private land and the trail closes during big game season. Path: Hunters Pass Trail to Slide Brook, then slide and herd path. Starts at Elk Lake trailhead.'),
  ('ny_armstrong_mountain_great_range_trail_from_the_lake_road', 'ny_armstrong_mountain', 'Great Range Trail from the Lake Road', 'scrambling', 'Class 1', 'class', 'Ladders beside Beaver Meadow Falls and steep sections; crossing the reserve on foot needs a reservation in the warm season. Path: Gothics access trail and Great Range Trail via Beaver Meadow Falls.'),
  ('ny_hough_peak_dix_range_herd_path', 'ny_hough_peak', 'Dix Range herd path', 'scrambling', 'Class 2', 'class', 'Unmarked herd path along the Dix crest, with tight brush and rock scrambles; usually done with Dix. Path: Dix Range crest herd path from Elk Lake. Starts at Elk Lake trailhead.'),
  ('ny_seward_mountain_seward_herd_path', 'ny_seward_mountain', 'Seward herd path', 'scrambling', 'Class 2', 'class', 'Marked trail for about 5 miles, then an unmarked eroded path; the road can be closed in winter. Path: Blueberry Trail to Seward herd path. Starts at Corey''s Road parking area.'),
  ('ny_mount_marshall_herbert_brook_herd_path', 'ny_mount_marshall', 'Herbert Brook herd path', 'scrambling', 'Class 2', 'class', 'Marked trail to Flowed Lands, then a cairned herd path up Herbert Brook with many stream crossings. Path: Flowed Lands and Herbert Brook herd path. Starts at Upper Works, Newcomb.'),
  ('ny_allen_mountain_allen_brook_herd_path', 'ny_allen_mountain', 'Allen Brook herd path', 'scrambling', 'Class 2', 'class', 'Long, muddy day; the Opalescent River bridge is gone so the crossing can be hazardous at high water. Path: Hanging Spear Falls (East River) Trail to Allen Brook herd path. Starts at Upper Works / Tahawus Road.'),
  ('ny_esther_mountain_herd_path_from_marble_mountain', 'ny_esther_mountain', 'Herd path from Marble Mountain', 'scrambling', 'Class 2', 'class', 'Cairn-marked junction past Marble Mountain leads to an unofficial herd path; the summit has a false top before the plaque. Path: Marble Mountain route from the Atmospheric Science Research Center road. Starts at Atmospheric Science Research Center road, Wilmington.'),
  ('ny_upper_wolfjaw_mountain_wedge_brook_trail', 'ny_upper_wolfjaw_mountain', 'Wedge Brook Trail', 'scrambling', 'Class 1', 'class', 'Steep and often icy on the upper part; a longer alternative starts at The Garden via Johns Brook. Path: West River Trail, Wedge Brook Trail and State Range Trail cutoff. Starts at St. Huberts parking (Adirondack Mountain Reserve).'),
  ('ny_street_mountain_via_indian_pass_brook', 'ny_street_mountain', 'Via Indian Pass Brook', 'scrambling', 'Class 2', 'class', 'Unmarked and brushy; the unbridged brook crossing can be dangerous at high water. Done with Nye in one trip. Path: Nye ski trail and herd path via Indian Pass Brook. Starts at Adirondak Loj / High Peaks Information Center.'),
  ('ny_phelps_mountain_phelps_trail', 'ny_phelps_mountain', 'Phelps Trail', 'scrambling', 'Class 1', 'class', 'Heavily used marked trail leaving the Marcy route past Marcy Dam; a good first High Peak. Path: Van Hoevenberg Trail and Phelps Trail. Starts at Adirondak Loj / High Peaks Information Center.'),
  ('ny_donaldson_mountain_seward_range_herd_path', 'ny_donaldson_mountain', 'Seward Range herd path', 'scrambling', 'Class 2', 'class', 'Summit sits just off the ridge path beyond Seward; normally done as part of the range. Path: Blueberry Trail and Seward Range herd path. Starts at Corey''s Road parking area.'),
  ('ny_seymour_mountain_ward_brook_herd_path', 'ny_seymour_mountain', 'Ward Brook herd path', 'scrambling', 'Class 2', 'class', 'Cairned herd path leaves the truck trail just past the Ward Brook lean-to; steep and slippery on top. Path: Blueberry Trail, Ward Brook Truck Trail and Seymour herd path. Starts at Corey''s Road parking area.'),
  ('ny_sawteeth_weld_trail', 'ny_sawteeth', 'Weld Trail', 'scrambling', 'Class 1', 'class', 'Out-and-back on a marked trail with a steep rock slab; the reserve needs a parking reservation in season. Path: Weld Trail. Starts at St. Huberts parking (Adirondack Mountain Reserve).'),
  ('ny_south_dix_dix_range_herd_path', 'ny_south_dix', 'Dix Range herd path', 'scrambling', 'Class 2', 'class', 'Unmarked herd path with a steep dip and bare-rock climb; also called Carson Peak. Path: Dix Range crest herd path from Elk Lake. Starts at Elk Lake trailhead.'),
  ('ny_mount_colvin_gill_brook_trail', 'ny_mount_colvin', 'Gill Brook Trail', 'scrambling', 'Class 1', 'class', 'Steep slab and a challenging spot near the summit; usually extended to Blake. Path: Gill Brook Trail.'),
  ('ny_mount_emmons_seward_range_herd_path', 'ny_mount_emmons', 'Seward Range herd path', 'scrambling', 'Class 2', 'class', 'Last peak along the Seward ridge; usually combined with Seward and Donaldson. Path: Blueberry Trail and Seward Range herd path. Starts at Corey''s Road parking area.'),
  ('ny_dial_mountain_via_bear_den', 'ny_dial_mountain', 'Via Bear Den', 'scrambling', 'Class 1', 'class', 'Long push along the summit ridge; snow spikes advised on steeper parts of the Elk Pass side in winter. Path: Lake Road to Dial via Bear Den.'),
  ('ny_grace_peak_dix_range_herd_path', 'ny_grace_peak', 'Dix Range herd path', 'scrambling', 'Class 2', 'class', 'Formerly East Dix; pointed rock summit reached by unmarked path east of South Dix. Path: Dix Range crest herd path from Elk Lake. Starts at Elk Lake trailhead.'),
  ('ny_blake_peak_via_mount_colvin', 'ny_blake_peak', 'Via Mount Colvin', 'scrambling', 'Class 2', 'class', 'Reached over Colvin on the practical route; the Elk Lake approach is far longer. Path: Gill Brook Trail over Colvin, then path to Blake.'),
  ('ny_cliff_mountain_uphill_brook_herd_path', 'ny_cliff_mountain', 'Uphill Brook herd path', 'scrambling', 'Class 2', 'class', 'Herd path leaves near the Uphill lean-to and climbs a steep, slippery cliff band; the first high point is a false summit. Path: Calamity Brook Trail to unmarked herd path. Starts at Upper Works, Newcomb.'),
  ('ny_nye_mountain_via_indian_pass_brook', 'ny_nye_mountain', 'Via Indian Pass Brook', 'scrambling', 'Class 2', 'class', 'A short herd path from the same junction as Street Mountain, usually climbed with it. Path: Nye ski trail and herd path via Indian Pass Brook. Starts at Adirondak Loj / High Peaks Information Center.'),
  ('ny_couchsachraga_peak_via_santanoni_ridge', 'ny_couchsachraga_peak', 'Via Santanoni ridge', 'scrambling', 'Class 2', 'class', 'Reached along the ridge beyond Santanoni; the boggy col below it is notoriously wet. Path: Santanoni Express herd path and ridge from Upper Works. Starts at Upper Works, Newcomb.')
on conflict (id) do nothing;


-- 3. The standard route on list peaks the catalog already holds, filed so far with only technical, ice or slide lines.
insert into routes (id, area_id, name, discipline, grade, grade_system, description) values
  ('ny_algonquin_van_hoevenberg_and_macintyre_range_trails', 'ny_algonquin', 'Van Hoevenberg and MacIntyre Range Trails', 'scrambling', 'Class 1', 'class', 'Follow the blue-blazed Van Hoevenberg Trail about a mile to the yellow-blazed MacIntyre Range Trail, then climb about 3.3 miles to the summit. The upper trail grows steeper and rockier, with about 2,900 ft of total gain.'),
  ('ny_whiteface_wilmington_trail', 'ny_whiteface', 'Wilmington Trail', 'scrambling', 'Class 1', 'class', 'About 5.2 miles one way with roughly 3,600-3,700 ft of gain, passing ski trails and lifts. A short unmarked side path branches off toward Esther Mountain.'),
  ('ny_dix_mtn_beckhorn_trail_from_elk_lake', 'ny_dix_mtn', 'Beckhorn Trail from Elk Lake', 'scrambling', 'Class 1', 'class', 'About 6.6 miles one way with roughly 3,700 ft of gain. The upper Beckhorn is steep, eroded and exposed on slab, and the longer Hunters Pass Trail is a gentler alternative.'),
  ('ny_gothics_beaver_meadow_falls_trail_to_the_range_trail', 'ny_gothics', 'Beaver Meadow Falls Trail to the Range Trail', 'scrambling', 'Class 1', 'class', 'Walk Lake Road about 2 miles, then take the Gothics trail past Beaver Meadow Falls, with ladders on the steep section to the Range Trail. Turn left along the ridge to the summit; about 11.4 miles round trip.'),
  ('ny_mt_colden_lake_arnold_trail', 'ny_mt_colden', 'Lake Arnold Trail', 'scrambling', 'Class 1', 'class', 'About 6.3 miles one way with roughly 2,500 ft of gain via Lake Arnold. The Avalanche Pass loop has been affected by slide damage, making the out-and-back the usual choice.'),
  ('ny_giant_mountain_ridge_trail', 'ny_giant_mountain', 'Ridge Trail', 'scrambling', 'Class 1', 'class', 'About 5.4 miles round trip with roughly 3,050 ft of gain, the shortest of the main routes. The Roaring Brook Trail (6.6 miles round trip) is the other common option.'),
  ('ny_wright_peak_wright_peak_spur_trail_from_algonquin_trail', 'ny_wright_peak', 'Wright Peak Spur Trail from Algonquin Trail', 'scrambling', 'Class 1', 'class', 'Take the Marcy Dam and Algonquin trails to the spur junction about 3.1 miles in, then climb a steep rock slab for 0.4 miles to the summit. About 7 miles round trip with roughly 2,600 ft of gain.'),
  ('ny_big_slide_mtn_the_brothers_trail', 'ny_big_slide_mtn', 'The Brothers Trail', 'scrambling', 'Class 1', 'class', 'Climb over the three Brothers for 3.2 miles to a junction, then continue to the summit at 3.4 miles. About 6.8 miles round trip with roughly 2,950 ft of gain.'),
  ('ny_lower_wolfjaw_wedge_brook_and_range_trail_from_st_huberts', 'ny_lower_wolfjaw', 'Wedge Brook and Range Trail from St. Huberts', 'scrambling', 'Class 1', 'class', 'About 8.8 miles round trip with roughly 3,000 ft of gain via West River, Wedge Brook and the State Range Trail. The Garden trailhead via the Phelps and Range trails is the other common approach.'),
  ('ny_cascade_mountain_cascade_mountain_trail', 'ny_cascade_mountain', 'Cascade Mountain Trail', 'scrambling', 'Class 1', 'class', 'About 2.4 miles one way; at the junction near mile 2, go left for the final stretch of bare rock marked by yellow blazes and cairns. The trailhead lot fills early.'),
  ('ny_porter_mountain_cascade_mountain_trail_to_porter_spur', 'ny_porter_mountain', 'Cascade Mountain Trail to Porter spur', 'scrambling', 'Class 1', 'class', 'Follow the Cascade trail about 2 miles to a junction, then turn right for roughly 0.7-0.8 miles to the summit. About 5 miles round trip.'),
  ('co_grizzly_peak_south_ridge_from_garfield_peak', 'co_grizzly_peak', 'South Ridge (from Garfield Peak)', 'scrambling', 'Class 2+', 'class', 'Follow the ridge over rock and talus with only informal use-trails, usually combined with Garfield Peak; about 10.8 miles round trip with 3,790 ft of gain. Third-class bits can be bypassed on the west side.'),
  ('co_pigeon_peak_northwest_couloir', 'co_pigeon_peak', 'Northwest Couloir', 'scrambling', 'Class 3', 'class', 'Backpack up Ruby Creek to a camp in the northwest basin, then climb the large couloir and a stiff slope to third-class scrambling at the summit block. Often combined with Turret Peak.'),
  ('co_pacific_peak_east_slopes', 'co_pacific_peak', 'East Slopes', 'scrambling', 'Class 2', 'class', 'Follow the Mohawk Lakes trail, then a faint trail and off-trail terrain to a loose gully near 13,200 ft; hard Class 2 with rockfall. About 11 miles round trip with 3,650 ft of gain, less from the upper road.'),
  ('co_gladstone_peak_north_ridge', 'co_gladstone_peak', 'North Ridge', 'mountaineering', 'Class 4', 'class', 'Reach the Rock of Ages saddle near 13,000 ft, then follow the ridge crest with loose rock and a Class 4 crux (Class 3 bypass exists). About 11.25 miles round trip with 4,100 ft of gain.'),
  ('co_mt_meeker_the_loft_route', 'co_mt_meeker', 'The Loft Route', 'scrambling', 'Class 3', 'class', 'Follow the Longs Peak trail to Chasm Lake, climb the couloir south of the Ship''s Prow and a ledge near 12,800 ft to the Loft, then boulder-hop to the summit block. About 11 miles round trip with 4,500 ft of gain.'),
  ('co_vestal_peak_south_face', 'co_vestal_peak', 'South Face', 'scrambling', 'Class 2+', 'class', 'Backpack the Colorado Trail and Elk Creek to Vestal Creek camp, then contour below the cliffs from the Arrow-Vestal saddle to a couloir on the southeast face. Mostly Class 2+ rock; ice axe useful early in the season.'),
  ('co_arrow_peak_east_ramp', 'co_arrow_peak', 'East Ramp', 'scrambling', 'Class 3', 'class', 'Backpack to the Vestal Creek camp, then climb the long slabby ramp on the east face; the upper couloir is steeper, closer to Class 4. Ice axe useful in early season.'),
  ('ny_nipple_top_elk_pass_trail', 'ny_nipple_top', 'Elk Pass Trail', 'scrambling', 'Class 1', 'class', 'Steep, sustained loop over Dial on the way down; reserve parking reservation needed in season. Path: Elk Pass trail from Lake Road, down the Leach Trail. Starts at St. Huberts parking (Adirondack Mountain Reserve).'),
  ('co_ice_mountain_northeast_ridge', 'co_ice_mountain', 'Northeast Ridge', 'scrambling', 'Class 3', 'class', 'Rocky ridge scramble that is normally combined with North Apostle.')
on conflict (id) do nothing;

end $replay$;
