-- Research batch B (2026-11-18) fixes enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- NPS: the wilderness permit is required in the high-use period May 1-Sep 15 even when not camping (single push); the stored text says only overnight camps need it.
update routes set permit = $q$Mount Rainier: a climbing permit is required on glaciers or above about 10,000 ft. From May 1 to September 15 a wilderness permit is also required, even for a single-push climb.$q$ where id = 'wa_mount_rainier_liberty_ridge' and permit = $q$Mount Rainier: climbing on glaciers or above 10,000 ft requires the park's climbing registration; overnight high camps also need a wilderness permit.$q$;

-- Every source and the sibling Stuart routes give 9,415 ft; 9,416 is a stray.
update routes set high_point_ft = 9415 where id = 'wa_mount_stuart_cascadian_couloir' and high_point_ft = 9416;

-- Liberty Bell summit is published as 7,720 ft by two independent sources, and the sibling wa_liberty_bell_beckey_route already stores 7720 for the same summit. USGS 3DEP reads 7,745 ft at the summit
update routes set high_point_ft = 7720 where id = 'wa_liberty_crack' and high_point_ft = 7746;

-- Two independent sources state 400 ft (122 m); only MP states 500 ft (the stored 152 m)
update routes set length_m = 122 where id = 'wa_liberty_bell_beckey_route' and length_m = 152;

-- disciplines must name the row's primary discipline (alpine)
update routes set disciplines = array['alpine']::text[] where id = 'wa_south_arete' and disciplines is null;

-- pitches must be >=1 or null, never 0; MP and Wenatchee Outdoors both say 2 pitches
update routes set pitches = 2 where id = 'wa_saber' and pitches = 0;

-- disciplines must name the row's primary discipline (trad)
update routes set disciplines = array['trad']::text[] where id = 'wa_saber' and disciplines is null;

-- MP and The Mountaineers both give Grade III; the III currently sits in alpine_grade
update routes set commitment = $q$III$q$ where id = 'wa_orbit' and commitment is null;

-- III is a commitment grade misfiled in alpine_grade on a trad crag route
update routes set alpine_grade = null where id = 'wa_orbit' and alpine_grade = $q$III$q$;

-- disciplines must name the row's primary discipline (trad)
update routes set disciplines = array['trad']::text[] where id = 'wa_orbit' and disciplines is null;

-- Stored track is 3 points = the route pins joined up (9.7 km gap), and its middle point 48.818,-121.585 lies SE of the summit, nowhere on the Nooksack Cirque / Price Glacier line. Fails the track ch
update routes set gpx = null where id = 'wa_mount_shuksan_price_glacier' and gpx is not null;

-- 6.4 km is shorter than the straight line from the Park Butte lot to the summit (7.8 km), so it is impossible under either dist_km convention. The Mountaineers gives 14.0 mi round trip; the stored t
update routes set dist_km = null where id = 'wa_mount_baker_easton_glacier' and dist_km = 6.4;

-- 4.7 km is shorter than the straight line from the Heliotrope Ridge lot to the summit (6.6 km) — impossible. The Mountaineers gives 11.0 mi round trip; the stored track measures 10.2 km trailhead-to
update routes set dist_km = null where id = 'wa_mount_baker_coleman_deming' and dist_km = 4.7;

-- pitches is >=1 or null, never 0; a walk-up snow climb has no pitches (same fix as wa_pimpsqueak in batch A)
update routes set pitches = null where id = 'wa_mount_adams_south_climb' and pitches = 0;

-- The official name is Mt. Adams Climbing Pass; 'Cascade Volcano Pass' appears on no current USFS or Recreation.gov page. Adds the stated $20 fee. Lock official-1 after.
update routes set permit = $q$Mt. Adams Climbing Pass required above 7,000 ft May 1-Sep 30, $20 per person (16+) per trip on Recreation.gov; free self-issue wilderness permit at the trailhead otherwise. Pack out human waste.$q$ where id = 'wa_mount_adams_south_climb' and permit = $q$Mt. Adams Climbing Pass (Cascade Volcano Pass) required above 7,000 ft May 1-Sep 30, sold per trip on Recreation.gov; free self-issue wilderness permit at the trailhead otherwise. Pack out human waste.$q$;

-- Land manager's published summit/crater-rim figure is 8,365 ft (USFS route + summit pages; Recreation.gov 8,365 ft / 2,550 m). 8,363 is the older USGS figure. Then lock official-1.
update routes set high_point_ft = 8365 where id = 'wa_mount_st_helens_monitor_ridge' and high_point_ft = 8363;

-- Published figure is 8,868 ft (USGS topo value carried by OSM node 356544852 ele=2703 m, source=USGS; The Mountaineers High Point 8,868 ft). No source found for 8,872. Then lock agree-2.
update routes set high_point_ft = 8868 where id = 'wa_eldorado_peak_east_ridge' and high_point_ft = 8872;

commit;
