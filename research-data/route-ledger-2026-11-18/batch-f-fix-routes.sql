-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- Impossible: 4,500 is below the net climb (8,815 summit - 3,228 trailhead = 5,587), and the route also climbs to Sharkfin Col (7,720), drops to about 7,000 on the Boston Glacier and regains the ridg
update routes set gain_ft = 7000 where id = 'wa_forbidden_peak_north_ridge' and gain_ft = 4500;

-- owner: height 8,160 (majority); 8,160 - 3,228 ft trailhead = 4,932 net
update routes set gain_ft = 4932 where id = 'wa_sharkfin_tower_southeast_ridge' and gain_ft = 4870;

-- Shape: a sentence in a grade column, and no source gives a WI/AI grade - Mountain Project rates the snow traverse "Steep Snow" (icy front-pointing to step-kicking). Keep that in prose, not ice_grad
update routes set ice_grade = null where id = 'wa_mount_torment_torment_forbidden_traverse' and ice_grade = $q$AI2-AI3 (variable depending on seasonal snow/ice conditions)$q$;

-- pitches must be >= 1 or null; this is an unroped scramble/snow climb with no pitch count published.
update routes set pitches = null where id = 'wa_the_brothers_south_couloir' and pitches = 0;

-- Impossible: 7,100 ft is below the net climb. Summit 7,756 ft (USGS map) - USGS 3DEP 466 ft at the stored Dosewallips washout trailhead pin = 7,290 ft (506 ft at the OSM Dosewallips River Trailhead 
update routes set gain_ft = 7300 where id = 'wa_mount_constance_north_chimney' and gain_ft = 7100;

-- Out-and-back route: loss equals gain; same fix as gain_ft.
update routes set loss_ft = 7300 where id = 'wa_mount_constance_north_chimney' and loss_ft = 7100;

-- Impossible: below the net climb. Summit 7,756 ft (USGS map) - USGS 3DEP 466 ft at the stored washout trailhead pin = 7,290 ft. The Mountaineers gives 7,300 ft for the West Arete.
update routes set gain_ft = 7300 where id = 'wa_mount_constance_west_arete' and gain_ft = 7100;

-- Loss mirrors gain on this out-and-back; same fix.
update routes set loss_ft = 7300 where id = 'wa_mount_constance_west_arete' and loss_ft = 7100;

-- Impossible: 5,500 ft is below the net climb. NPS 9,131 ft summit - USGS 3DEP 3,573 ft at the stored White Salmon trailhead pin = 5,558 ft (5,510 ft from the OSM White Salmon lodge lot at 3,622 ft).
update routes set gain_ft = 5558 where id = 'wa_mount_shuksan_north_face' and gain_ft = 5500;

-- Round trip stored in a one-way column: 20.92 km = 13.0 mi, which is Steph Abegg's GPS car-to-car round trip (about 13 mi). The route's own summit pin says 8 mi one-way and the straight line is 5.1 
update routes set dist_km = null where id = 'wa_mount_shuksan_north_face' and dist_km = 20.92;

-- Round trip in a one-way column: 16.9 km (10.5 mi) is 2x the route's own summit pin (5.2 mi = 8.4 km) and matches the published 10 mi round trip. No published one-way figure (straight line trailhead
update routes set dist_km = null where id = 'wa_sahale_mountain_r1' and dist_km = 16.9;

-- 25.7 km is 2x the route's own summit pin (8 mi = 12.9 km): a round trip in a one-way column - the same value batch E proposed nulling on the sibling Boulder Glacier route (same trailhead). No publi
update routes set dist_km = null where id = 'wa_mount_baker_boulder_park_cleaver' and dist_km = 25.7;

-- Stored access is the pasted Mt. Baker-Snoqualmie NF template (Persis/Gunn/Baring text, NW Forest Pass) - false here, as on Abraxas (batch A). State Parks' release of 2026-03-13: the WCC donated the
update routes set access = $q$[object Object]$q$ where id = 'wa_godzilla' and access = $q$[object Object]$q$;

-- disciplines is null; must name the primary discipline (trad).
update routes set disciplines = array['trad']::text[] where id = 'wa_godzilla' and disciplines is null;

-- Stored access is the pasted Mt. Baker-Snoqualmie NF template (NW Forest Pass, Persis/Gunn/Baring) - false at Index, as on Abraxas (batch A, also Upper Town Wall, nulled). The official State Parks r
update routes set access = null where id = 'wa_davis_holland_route' and access = $q$[object Object]$q$;

-- Gear item 2 calls the pitch 3 crux 5.10a; MP and Abegg both grade pitch 3 5.10c (P2 is the 5.10a pitch). Only that number changes.
update routes set gear = array['Rack up to 3 inches, though many parties get by without the #3 cam','Small nuts, with extras if you have them, for the delicate pitch 3 crux (5.10c)','All three pitch belays are bolted anchors','Descent: rappel about 25 m from the p3 anchor to a 3-bolt station, then either a 55 m double-rope rappel to the ground or a couple of shorter single-rope raps trending climber''s left via the sport-wall anchors','A single 70 m rope also works for rappelling, or you can walk off','Most parties link into Lovin'' Arms (5.11b) from the pitch 3 anchor rather than rapping — that adds three more pitches to the top of the Upper Wall']::text[] where id = 'wa_davis_holland_route' and gear = array['Rack up to 3 inches, though many parties get by without the #3 cam','Small nuts, with extras if you have them, for the delicate pitch 3 crux (5.10a)','All three pitch belays are bolted anchors','Descent: rappel about 25 m from the p3 anchor to a 3-bolt station, then either a 55 m double-rope rappel to the ground or a couple of shorter single-rope raps trending climber''s left via the sport-wall anchors','A single 70 m rope also works for rappelling, or you can walk off','Most parties link into Lovin'' Arms (5.11b) from the pitch 3 anchor rather than rapping — that adds three more pitches to the top of the Upper Wall']::text[];

-- disciplines is null; must name the primary discipline (trad).
update routes set disciplines = array['trad']::text[] where id = 'wa_davis_holland_route' and disciplines is null;

-- Stored access is the pasted Mt. Baker-Snoqualmie NF template (Persis/Gunn/Baring text, NW Forest Pass) - false here, as on Abraxas (batch A). State Parks' release of 2026-03-13: the WCC donated the
update routes set access = $q$[object Object]$q$ where id = 'wa_japanese_gardens' and access = $q$[object Object]$q$;

-- MP: 200 ft (61 m), 4 pitches. Single source (theCrag shows no length; Rakkup is paywalled) - owner decides.
update routes set length_m = 61 where id = 'wa_japanese_gardens' and length_m is null;

-- disciplines is null; must name the primary discipline (trad).
update routes set disciplines = array['trad']::text[] where id = 'wa_japanese_gardens' and disciplines is null;

-- Stored access is the pasted Mt. Baker-Snoqualmie NF template (Persis/Gunn/Baring text, NW Forest Pass) - false here, as on Abraxas (batch A). State Parks' release of 2026-03-13: the WCC donated the
update routes set access = $q$[object Object]$q$ where id = 'wa_thin_fingers' and access = $q$[object Object]$q$;

-- disciplines is null; must name the primary discipline (trad).
update routes set disciplines = array['trad']::text[] where id = 'wa_thin_fingers' and disciplines is null;

-- Stored access is the pasted Mt. Baker-Snoqualmie NF template (Persis/Gunn/Baring text, NW Forest Pass) - false here, as on Abraxas (batch A). State Parks' release of 2026-03-13: the WCC donated the
update routes set access = $q$[object Object]$q$ where id = 'wa_iron_horse' and access = $q$[object Object]$q$;

-- disciplines is null; must name the primary discipline (trad).
update routes set disciplines = array['trad']::text[] where id = 'wa_iron_horse' and disciplines is null;

-- owner 2026-11-18: majority (Mountain Project + Steph Abegg 8,160)
update routes set high_point_ft = 8160 where id = 'wa_sharkfin_tower_southeast_ridge' and high_point_ft = 8120;

commit;
