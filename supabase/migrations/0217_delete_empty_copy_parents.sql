-- 0217: delete the 65 EMPTY copy areas 0215 left behind.
--
-- 0215 moved the routes out of 224 Mountain Project copy areas and deleted them, but left their
-- PARENTS alone: 95 ended up empty. Reviewed one by one (audits/import-copy-areas-2026-09-25/
-- empty-parents.json). The user: "if there are climbs out there, eventually people could add
-- climbs and they wont be empty anymore" — so the 30 that are real places stay (22 we hold nowhere
-- else, 6 whose name-twin is a different place, 2 uncertain). These 65 are copies of an area that
-- ALREADY holds the climbs ("Mount Wilson" beside "Mt. Wilson", 45 routes); a climber adding a climb
-- to the copy would split it from those routes and recreate the duplicate. Approved: "yes".
--
-- None has a blurb, a coordinate, a sub-area or a route. Each delete re-checks that, and that its
-- twin still holds routes, on the live row.

begin;

create temp table m_empty(id text primary key, twin text not null) on commit drop;
insert into m_empty values
  ('ak_glacier_creek_drainage_and_snowbird_glacier_2', 'ak_glacier_creek_drainage_and_snowbird_glacier'),  -- Alaska › South Central Alaska › Hatcher Pass › Glacier Creek Drainage and Snowbird Glacier  =>  Alaska › Anchorage & South Central Alaska › Hatcher Pass › Glacier Creek Drainage and Snowbird Glacier (17)
  ('ak_portage_3', 'ak_portage_4'),  -- Alaska › South Central Alaska › Portage  =>  Alaska › South Central Alaska › South Central Alaska Ice and Alpine › Portage (13)
  ('ak_boy_scout_rocks_2', 'ak_boy_scout_rocks'),  -- Alaska › South Central Alaska › Seward Highway › Boy Scout Rocks  =>  Alaska › Anchorage & South Central Alaska › Seward Highway › Boy Scout Rocks (11)
  ('ak_sky_pilot_areas_2', 'ak_sky_pilot_areas'),  -- Alaska › South Central Alaska › Seward Highway › Sky Pilot Areas  =>  Alaska › Anchorage & South Central Alaska › Seward Highway › Sky Pilot Areas (30)
  ('az_the_ultimates', 'az_ultimates_the'),  -- Arizona › Northern Arizona › Flagstaff Area › Upper Pumphouse Wash › The Ultimates  =>  Arizona › Northern Arizona › Flagstaff Area › Upper Pumphouse Wash › Ultimates, The (56)
  ('az_colorado_river_2', 'az_colorado_river'),  -- Arizona › Northern Arizona › Grand Canyon › Colorado River  =>  Arizona › Northern Arizona › Grand Canyon National Park › Colorado River (3)
  ('az_the_druid', 'az_druid_the'),  -- Arizona › Southern Arizona › Mount Lemmon (Santa Catalina Mountains) › Mount Lemmon (Catalina Highway) › 6 - Mid-Mountain › The Druid  =>  Arizona › Southern Arizona › Mount Lemmon (Santa Catalina Mountains) › Mount Lemmon (Catalina Highway) › 6 - Mid-Mountain › Druid, The (22)
  ('az_pinale_o_mountains_mt_graham', 'az_pinaleno_mtns_mt_graham'),  -- Arizona › Southern Arizona › Pinaleño Mountains (Mt. Graham)  =>  Arizona › Southern Arizona › Pinaleno mtns. (Mt. Graham) (3)
  ('ca_scheelite_crags_psom_slab_2', 'ca_scheelite_crags_psom_slab'),  -- California › Eastern Sierra › Bishop Area › Pine Creek Canyon › Scheelite Crags / PSOM Slab  =>  California › Sierra Eastside › Bishop Area › Pine Creek Canyon › Scheelite Crags / PSOM Slab (81)
  ('ca_south_lake_2', 'ca_south_lake'),  -- California › Eastern Sierra › Bishop Area › South Lake  =>  California › Sierra Eastside › Bishop Area › South Lake (31)
  ('ca_wheeler_crest_2', 'ca_wheeler_crest'),  -- California › Eastern Sierra › Bishop Area › Wheeler Crest  =>  California › Sierra Eastside › Bishop Area › Wheeler Crest (19)
  ('ca_mount_morrison', 'ca_mt_morrison'),  -- California › High Sierra › 05 - Convict Lake & McGee Creek › Mount Morrison  =>  California › High Sierra › 05 - Convict Lake & McGee Creek › Mt. Morrison (16)
  ('ca_the_blob', 'ca_blob_the'),  -- California › Joshua Tree National Park › Hidden Valley Area › Hidden Valley Campground › The Blob  =>  California › Joshua Tree National Park › Hidden Valley Area › Hidden Valley Campground › Blob, The (32)
  ('ca_oz_2', 'ca_oz'),  -- California › Joshua Tree National Park › Pinto Basin › OZ Area › OZ.  =>  California › Joshua Tree National Park › Pinto Basin › OZ Area › OZ_ (52)
  ('ca_darwin_dome_2', 'ca_darwin_dome'),  -- California › Joshua Tree National Park › Queen Valley Area › Geology Tour Road › Geology Tour Road West › The Galapagos › Darwin Dome  =>  California › Joshua Tree National Park › Queen Valley Area › Geology Tour Road › Galapagos, The › Darwin Dome (9)
  ('ca_bucks_bar_dome', 'ca_buck_s_bar_dome'),  -- California › Lake Tahoe › Highway 50 Corridor › Placerville › Cosumnes River Gorge › Bucks Bar Dome  =>  California › Lake Tahoe › Highway 50 Corridor › Placerville › Cosumnes River Gorge › Buck's Bar Dome (44)
  ('ca_the_benches', 'ca_benches_the'),  -- California › Lake Tahoe › I-80 Corridor › Bowman/Emeralds › The Emeralds › The Benches  =>  California › Lake Tahoe › I-80 Corridor › Bowman/Emeralds › Emeralds, The › Benches, The (123)
  ('ca_so_so_grotto_2', 'ca_so_so_grotto'),  -- California › Northwest California › So-So Grotto  =>  California › Redwood Coast › So-So Grotto (17)
  ('ca_trinity_alps_2', 'ca_trinity_alps'),  -- California › Northwest California › Trinity Alps  =>  California › Redwood Coast › Trinity Alps (6)
  ('ca_the_skull', 'ca_skull_the'),  -- California › San Bernardino Mountains › Lake Arrowhead Area › Lake Arrowhead Pinnacles › The Skull  =>  California › San Bernardino Mountains › Lake Arrowhead Area › Lake Arrowhead Pinnacles › Skull, The (19)
  ('ca_the_wedge', 'ca_wedge_the'),  -- California › San Diego County › South San Diego County › El Cajon Mountain › The Wedge  =>  California › San Diego County › South San Diego County › El Cajon Mountain › Wedge, The (63)
  ('ca_j_hawk_dome_2', 'ca_j_hawk_dome'),  -- California › Southern-Western Sierra › Hwy 41: Fresno Dome, Shuteye Ridge › Fresno Dome (Wamello) Area › Fresno Dome › j. Hawk Dome  =>  California › Western Sierra › Fresno Dome (Wamello) Area › Fresno Dome › j. Hawk Dome (18)
  ('ca_domeland_wilderness_2', 'ca_domeland_wilderness'),  -- California › Southern-Western Sierra › Southern Sierra - The Needles, Kern River, Domelands, etc. › Domeland Wilderness  =>  California › Western Sierra › Domeland Wilderness (22)
  ('ca_lower_kern_river_canyon_2', 'ca_lower_kern_river_canyon'),  -- California › Southern-Western Sierra › Southern Sierra - The Needles, Kern River, Domelands, etc. › Lower Kern River Canyon  =>  California › Western Sierra › Needles / Kern River, The › Lower Kern River Canyon (52)
  ('co_the_grenadiers', 'co_grenadiers_the'),  -- Colorado › Alpine Rock › San Juans › The Grenadiers  =>  Colorado › Alpine Rock › San Juans › Grenadiers, The (16)
  ('co_west_needle_mountains_2', 'co_west_needle_mountains'),  -- Colorado › Alpine Rock › San Juans › The Needles › West Needle Mountains  =>  Colorado › Alpine Rock › San Juans › Needles, The › West Needle Mountains (5)
  ('co_bouldering_problems_2', 'co_bouldering_problems'),  -- Colorado › Denver South › Castlewood Canyon SP › Bouldering problems  =>  Colorado › Denver Metropolitan Area Bouldering and Buildering › Denver South › Castlewood Canyon SP › Bouldering problems (183)
  ('co_the_access_fund_trailhead', 'co_access_fund_trailhead_the'),  -- Colorado › Grand Junction Area › Unaweep Canyon › Main Canyon: Unaweep Granite › The Access Fund Trailhead  =>  Colorado › Grand Junction Area › Unaweep Canyon › Main Canyon: Unaweep Granite › Access Fund Trailhead, The (131)
  ('id_the_sawtooth_range', 'id_sawtooth_range_the'),  -- Idaho › Central Idaho › The Sawtooth Range  =>  Idaho › Central Idaho › Sawtooth Range, The (39)
  ('id_gunsight_peak_2', 'id_gunsight_peak'),  -- Idaho › North Idaho › The Selkirk Crest (American) › Gunsight Peak  =>  Idaho › North Idaho › Selkirk Crest, The › Gunsight Peak (2)
  ('id_riggins_2', 'id_riggins'),  -- Idaho › West Idaho › Riggins  =>  Idaho › Central Idaho › Riggins (10)
  ('me_great_head_2', 'me_great_head'),  -- Maine › -Acadia National Park › Great Head  =>  Maine › Acadia National Park › Great Head (26)
  ('mn_ely_s_peak_bouldering_2', 'mn_ely_s_peak_bouldering'),  -- Minnesota › Duluth Area › Ely's Peak Bouldering  =>  Minnesota › Duluth Area (Rock and Ice) › Duluth Rock Climbs › Duluth Bouldering › Ely's Peak Bouldering (49)
  ('mn_little_foxx_canyon_2', 'mn_little_foxx_canyon'),  -- Minnesota › Duluth Area › Little Foxx Canyon  =>  Minnesota › Duluth Area (Rock and Ice) › Duluth Rock Climbs › Duluth Bouldering › Little Foxx Canyon (97)
  ('mt_mill_creek_north_rim_2', 'mt_mill_creek_north_rim'),  -- Montana › Northwest Region › Mill Creek › Mill Creek North Rim  =>  Montana › Northwest Region › Mill Creek North Rim (36)
  ('nv_ash_canyon_2', 'nv_ash_canyon'),  -- Nevada › Southern Nevada › Red Rocks › Calico Basin › Ash Spring › Ash Canyon  =>  Nevada › Southern Nevada › Red Rocks › Red Rock Bouldering › Calico Basin Boulders › Ash Canyon (3)
  ('nv_mount_wilson', 'nv_mt_wilson'),  -- Nevada › Southern Nevada › Red Rocks › Mount Wilson  =>  Nevada › Southern Nevada › Red Rocks › Mt. Wilson (45)
  ('nm_la_cueva_canyon_upper_2', 'nm_la_cueva_canyon_upper'),  -- New Mexico › Albuquerque Area › Sandia Mountains (West Side) › La Cueva Canyon (Upper)  =>  New Mexico › Albuquerque Area › Sandia Mountains › La Cueva Canyon, Upper (110)
  ('nm_dona_ana_mountains_2', 'nm_dona_ana_mountains'),  -- New Mexico › Las Cruces Area › Dona Ana Mountains  =>  New Mexico › Las Cruces Area Climbing › Dona Ana Mountains (121)
  ('nm_needle_and_squaretops_2', 'nm_needle_and_squaretops'),  -- New Mexico › Las Cruces Area › Organ Mountains › Needle and Squaretops  =>  New Mexico › Las Cruces Area Climbing › Organ Mountains › Needle and Squaretops (26)
  ('nm_the_diamond', 'nm_diamond_the'),  -- New Mexico › Las Cruces Area › Organ Mountains › North Organs › The Diamond  =>  New Mexico › Las Cruces Area Climbing › Organ Mountains › North Organs › Diamond, The (1)
  ('nm_rabbit_ears_area_2', 'nm_rabbit_ears_area'),  -- New Mexico › Las Cruces Area › Organ Mountains › Rabbit Ears Area  =>  New Mexico › Las Cruces Area Climbing › Organ Mountains › Rabbit Ears Area (119)
  ('nc_the_dark_side_closed_to_climbing_included_for_historic_', 'nc_dark_side_closed_to_climbing_included_for_historic_refe'),  -- North Carolina › 1. Southern Mountains Region › The Dark Side (Closed to climbing, included for historic reference)  =>  North Carolina › 1. Southern Mountains Region › Dark Side (Closed to climbing, included for historic reference), The (56)
  ('or_the_garden', 'or_garden_the'),  -- Oregon › Willamette Valley › The Garden  =>  Oregon › Willamette Valley › Garden, The (133)
  ('pa_the_northwest', 'pa_northwest_the'),  -- Pennsylvania › The Northwest  =>  Pennsylvania › Northwest, The (138)
  ('sd_the_chessmen', 'sd_chessmen_the'),  -- South Dakota › The Needles Of Rushmore › Horsethief Lake Area › The Chessmen  =>  South Dakota › Needles Of Rushmore, The › Horsethief Lake Area › Chessmen, The (54)
  ('ut_the_minarets', 'ut_minarets_the'),  -- Utah › South Central Utah › Grand Staircase › Church › The Minarets  =>  Utah › South Central Utah › Grand Staircase › Church › Minarets, The (2)
  ('ut_the_desert_wedding_site', 'ut_desert_wedding_site_the'),  -- Utah › South Central Utah › Grand Staircase › The Desert Wedding Site  =>  Utah › South Central Utah › Grand Staircase › Desert Wedding Site, The (9)
  ('ut_the_maze_district', 'ut_maze_district_the'),  -- Utah › South Central Utah › Hanksville Area › The Maze District  =>  Utah › South Central Utah › Hanksville Area › Maze District, The (2)
  ('ut_the_whisky_caps', 'ut_whisky_caps_the'),  -- Utah › Southeast Utah › Little Valley › The Whisky Caps  =>  Utah › Southeast Utah › Little Valley › Whisky Caps, The (5)
  ('ut_cottonwood_wash_4', 'ut_cottonwood_wash'),  -- Utah › Southeast Utah › San Juan County › Bluff › Cottonwood Wash  =>  Utah › Southeast Utah › 191 South › Bluff › Cottonwood Wash (12)
  ('ut_bells_canyon', 'ut_bell_s_canyon'),  -- Utah › Wasatch Range › Central Wasatch › Bells Canyon  =>  Utah › Wasatch Range › Central Wasatch › Bell's Canyon (29)
  ('ut_the_fin', 'ut_fin_the'),  -- Utah › Wasatch Range › Central Wasatch › Little Cottonwood Canyon › The Fin  =>  Utah › Wasatch Range › Central Wasatch › Little Cottonwood Canyon › Fin, The (17)
  ('wa_entiat_mountain_range', 'wa_chiwawa_entiat_region'),  -- Washington › Central-East Cascades, Wenatchee, & Leavenworth › Entiat Mountain Range  =>  Washington › Central-East Cascades, Wenatchee & Leavenworth › Entiat Mountain Range (28)
  ('wa_madsen_s_buttress_area', 'wa_madsen_s_buttress'),  -- Washington › Central-East Cascades, Wenatchee, & Leavenworth › Leavenworth › Icicle Creek › Madsen's Buttress Area  =>  Washington › Central-East Cascades, Wenatchee & Leavenworth › Leavenworth › Icicle Creek › Madsen's Buttress (8)
  ('wa_castle_rock_4', 'wa_castle_rock_2'),  -- Washington › Central-East Cascades, Wenatchee, & Leavenworth › Leavenworth › Tumwater Canyon › Castle Rock  =>  Washington › Central-East Cascades, Wenatchee & Leavenworth › Leavenworth › Tumwater Canyon › Castle Rock (54)
  ('wa_tumwater_mountain_crest_2', 'wa_tumwater_mountain_crest'),  -- Washington › Central-East Cascades, Wenatchee, & Leavenworth › Leavenworth › Tumwater Canyon › Tumwater Mountain Crest  =>  Washington › Central-East Cascades, Wenatchee & Leavenworth › Leavenworth › Tumwater Canyon › Tumwater Mountain Crest (5)
  ('wa_the_diamond_area', 'wa_diamond_area_the'),  -- Washington › Central-West Cascades & Seattle › Skykomish Valley › Index › The Diamond Area  =>  Washington › Central-West Cascades & Seattle › Skykomish Valley › Index › Diamond Area, The (16)
  ('wa_the_gunsight_range', 'wa_gunsight_range_the'),  -- Washington › Northwest Region › Darrington and Mountain Loop Hwy › Glacier Peak Wilderness › The Gunsight Range  =>  Washington › Northwest Region › Darrington and Mountain Loop Hwy › Glacier Peak Wilderness › Gunsight Range, The (8)
  ('wa_eldorado_peak_2', 'wa_eldorado_peak'),  -- Washington › Northwest Region › Hwy 20 and North Cascades National Park › North Cascades › Cascade River Drainage (Eldorado, Forbidden, Johannesburg, Sahale, Torment, etc.) › Eldorado Peak  =>  Washington › Northwest Region › Hwy 20 and North Cascades National Park › North Cascades › North Cascades Core › Eldorado Peak (12)
  ('wv_cotton_hill_2', 'wv_cotton_hill'),  -- West Virginia › The New River Gorge Region › New River Gorge Proper › Cotton Hill  =>  West Virginia › New River Gorge, The › New River Gorge Proper › Cotton Hill (66)
  ('wv_endless_wall_2', 'wv_endless_wall'),  -- West Virginia › The New River Gorge Region › New River Gorge Proper › Endless Wall  =>  West Virginia › New River Gorge, The › New River Gorge Proper › Endless Wall (270)
  ('wv_summersville_gauley_river_area_2', 'wv_summersville_gauley_river_area'),  -- West Virginia › The New River Gorge Region › Summersville (Gauley River) Area  =>  West Virginia › New River Gorge, The › Summersville (Gauley River) Area (271)
  ('wy_snowy_range_2', 'wy_snowy_range'),  -- Wyoming › Laramie Area › Snowy Range  =>  Wyoming › Snowy Range (49)
  ('wy_the_book_pages_mound', 'wy_book_pages_mound_the');  -- Wyoming › Laramie Range › Laramie Peak Wildlife Habitat Management Area › Reese Mountain › Southwest Ridge of Reese Mtn › The Book Pages Mound  =>  Wyoming › Laramie Range › Laramie Peak Wildlife Habitat Management Area › Reese Mountain › Southwest Ridge of Reese Mtn › Book Pages Mound, The (64)

delete from areas a using m_empty m
 where a.id = m.id
   and a.route_count = 0
   and coalesce(a.blurb, '') = ''
   and not exists (select 1 from routes r where r.area_id = a.id)
   and not exists (select 1 from areas s where s.parent_id = a.id)
   and exists (select 1 from areas t where t.id = m.twin and t.route_count > 0);

commit;
