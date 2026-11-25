-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- Majority rule: alpinedave and climberkyle both give 5.10a (MP description also says 5.10a; MP grade field 5.10-; chossclimbers 5.10b).
update routes set grade = $q$5.10a$q$ where id = 'wa_silent_running' and grade = $q$5.10-$q$;

-- gradeNumFrom("5.10a","yds") with the grade change.
update routes set grade_num = 10.25 where id = 'wa_silent_running' and grade_num = 10;

-- Templated Glacier Peak Wilderness text is wrong here: the Forest Service trail page says the Eightmile trail enters the Boulder River Wilderness (group limit 12). The Eightmile/Clear Creek trailhea
update routes set access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"The Eightmile trail enters the Boulder River Wilderness: groups are capped at 12.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":null}$q$::jsonb where id = 'wa_silent_running' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb;

-- Mountain Project 900 ft (273 m); single source - approve only if an MP-only length is acceptable.
update routes set length_m = 274 where id = 'wa_silent_running' and length_m is null;

-- Majority rule: The Mountaineers rate it 5.9 (crux pitch 3 was 5.8 until a big flake fell off in 2004) and alpinedave gives the crux pitch 5.9; only MP keeps 5.8+.
update routes set grade = $q$5.9$q$ where id = 'wa_blueberry_hill_proxima_wall_blueberry_buttress' and grade = $q$5.8+$q$;

-- gradeNumFrom("5.9","yds") with the grade change.
update routes set grade_num = 9 where id = 'wa_blueberry_hill_proxima_wall_blueberry_buttress' and grade_num = 8;

-- 0 is invalid; MP describes it as one long pitch (190 ft).
update routes set pitches = 1 where id = 'wa_centralia' and pitches = 0;

-- MP 190 ft (58 m); single source.
update routes set length_m = 58 where id = 'wa_centralia' and length_m is null;

-- MP: 10 bolts; single source.
update routes set bolts = 10 where id = 'wa_centralia' and bolts is null;

-- Templated Glacier Peak Wilderness rules do not apply to the Salami Slabs below Exfoliation Dome (Glacier Peak Wilderness lies far east; the WCC lists Three O'Clock Rock, The Comb, Green Giant and S
update routes set access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":null,"permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":null,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb where id = 'wa_centralia' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb;

-- 0 is invalid. MP: single 80 ft trad line (MP omits the count on single-pitch routes).
update routes set pitches = 1 where id = 'wa_bridger' and pitches = 0;

-- MP: 80 ft (24 m). Single source.
update routes set length_m = 24 where id = 'wa_bridger' and length_m is null;

-- WDFW parking page: on WDFW wildlife areas a Discover Pass is required unless the vehicle shows a Vehicle Access Pass. WDFW's 2017 release places Royal Columns on the Oak Creek Wildlife Area, across
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_bridger' and permit is null;

-- as permit: land manager from WDFW's own release (Royal Columns on Oak Creek Wildlife Area); pass from the WDFW parking page.
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_bridger' and access is null;

-- 0 is invalid. MP: one pitch from the roof to the top of the pillar.
update routes set pitches = 1 where id = 'wa_ball_and_chain' and pitches = 0;

-- WDFW parking page: on WDFW wildlife areas a Discover Pass is required unless the vehicle shows a Vehicle Access Pass. WDFW's 2017 release places Royal Columns on the Oak Creek Wildlife Area, across
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_ball_and_chain' and permit is null;

-- as permit: land manager from WDFW's own release (Royal Columns on Oak Creek Wildlife Area); pass from the WDFW parking page.
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_ball_and_chain' and access is null;

-- WDFW parking page: on WDFW wildlife areas a Discover Pass is required unless the vehicle shows a Vehicle Access Pass. WDFW's 2017 release places Royal Columns on the Oak Creek Wildlife Area, across
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_main_face_belayer_slayer' and permit is null;

-- as permit: land manager from WDFW's own release (Royal Columns on Oak Creek Wildlife Area); pass from the WDFW parking page.
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_main_face_belayer_slayer' and access is null;

-- 0 is invalid. MP lists it as a single trad line with no pitch count (its single-pitch convention); Main Face routes are one pitch.
update routes set pitches = 1 where id = 'wa_contraction_action' and pitches = 0;

-- WDFW parking page: on WDFW wildlife areas a Discover Pass is required unless the vehicle shows a Vehicle Access Pass. WDFW's 2017 release places Royal Columns on the Oak Creek Wildlife Area, across
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_contraction_action' and permit is null;

-- as permit: land manager from WDFW's own release (Royal Columns on Oak Creek Wildlife Area); pass from the WDFW parking page.
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_contraction_action' and access is null;

-- 0 is invalid. MP: one 70 ft pitch to chains.
update routes set pitches = 1 where id = 'wa_cactus_love' and pitches = 0;

-- MP: 70 ft (21 m). Single source.
update routes set length_m = 21 where id = 'wa_cactus_love' and length_m is null;

-- WDFW parking page: on WDFW wildlife areas a Discover Pass is required unless the vehicle shows a Vehicle Access Pass. WDFW's 2017 release places Royal Columns on the Oak Creek Wildlife Area, across
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_cactus_love' and permit is null;

-- as permit: land manager from WDFW's own release (Royal Columns on Oak Creek Wildlife Area); pass from the WDFW parking page.
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_cactus_love' and access is null;

-- Round trip in a one-way column: 59.5 km = 37.0 mi, exactly The Mountaineers' ROUND-TRIP length for Goode via Bridge Creek; the route's own summit pin says 16.5 mi (26.6 km) one-way, so 59.5 is 2.2x
update routes set dist_km = null where id = 'wa_goode_mountain_southwest_couloir' and dist_km = 59.5;

-- Flow is at about SR 155 milepost 8.5, just south of the Salt and Pepper amphitheater. WA DNR's public-lands layer puts the coulee wall at that milepost (WSDOT milepost points; base of the cliff, no
update routes set access = $q${"land_manager":"U.S. Bureau of Reclamation land managed by WDFW (Banks Lake Unit, Columbia Basin Wildlife Area)","parking_pass":"A Discover Pass is required on WDFW lands, or a WDFW Vehicle Access Pass issued with a hunting or fishing licence."}$q$::jsonb where id = 'wa_banks_lake_ice_climbing_agent_orange' and access is null;

-- Two sources put the flow just south of SR 155 milepost 10 (Mountain Project and the first-ascent report on Alpine Dave); near MP 10 the cliff band (1,700-2,200 ft) lies inside the Reclamation parce
update routes set access = $q${"land_manager":"U.S. Bureau of Reclamation land managed by WDFW (Banks Lake Unit, Columbia Basin Wildlife Area)","parking_pass":"A Discover Pass is required on WDFW lands, or a WDFW Vehicle Access Pass issued with a hunting or fishing licence."}$q$::jsonb where id = 'wa_banks_lake_ice_climbing_brush_bash' and access is null;

-- Flow is just past the toilet turnout, left of More Banks Ice; the only toilet turnout in that stretch on OpenStreetMap is the WDFW one at Million Dollar Mile North (node 7190112740, about SR 155 MP
update routes set access = $q${"land_manager":"U.S. Bureau of Reclamation land managed by WDFW (Banks Lake Unit, Columbia Basin Wildlife Area)","parking_pass":"A Discover Pass is required on WDFW lands, or a WDFW Vehicle Access Pass issued with a hunting or fishing licence."}$q$::jsonb where id = 'wa_banks_lake_ice_climbing_corner_route' and access is null;

-- Mountain Project says access crosses private property and permission is needed (it guesses a developer owns it). WA DNR's public-lands layer shows no public parcel anywhere on a 0.006 x 0.014 degre
update routes set access = $q${"land_manager":"Private land","notes":"Reaching the flows crosses private property; ask the landowner before climbing."}$q$::jsonb where id = 'wa_banks_lake_ice_climbing_electric_avenue_b' and access is null;

-- Mountain Project's route page and its Main Face list now give 5.7; an older MP list snapshot (search result) showed 5.6, the stored value. Single source - theCrag and SummitPost blocked. Owner deci
update routes set grade = $q$5.7$q$ where id = 'wa_bridger' and grade = $q$5.6$q$;

-- gradeNumFrom('5.7','yds') = 7, with the grade fix only.
update routes set grade_num = 7 where id = 'wa_bridger' and grade_num = 6;

-- MP route page and Main Face list: 5.10b (MP's Tieton River classics list shows 5.10c). The stored 5.10a is the grade MP gives the separate bolted 'Render Us Weightless/Ball & Chain Direct Start'. S
update routes set grade = $q$5.10b$q$ where id = 'wa_ball_and_chain' and grade = $q$5.10a$q$;

-- gradeNumFrom('5.10b','yds') = 10.5, with the grade fix only.
update routes set grade_num = 10.5 where id = 'wa_ball_and_chain' and grade_num = 10.25;

commit;
