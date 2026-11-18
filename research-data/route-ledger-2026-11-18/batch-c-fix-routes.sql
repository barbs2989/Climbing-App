-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- Summit elevation = the published official figure: NPS states 14,410 ft (The Mountaineers 14,411). Same value the DC batch used for its gain. Lock agree-2 after.
update routes set high_point_ft = 14410 where id = 'wa_mount_rainier_emmons_glacier' and high_point_ft = 14406;

-- Summit elevation = the published official figure: NPS states 14,410 ft (The Mountaineers 14,411). Same value the DC batch used for its gain. Lock agree-2 after.
update routes set high_point_ft = 14410 where id = 'wa_mount_rainier_kautz_glacier' and high_point_ft = 14406;

-- Summit elevation = the published official figure: NPS states 14,410 ft (The Mountaineers 14,411). Same value the DC batch used for its gain. Lock agree-2 after.
update routes set high_point_ft = 14410 where id = 'wa_mount_rainier_gibraltar_ledges' and high_point_ft = 14406;

-- pitches is >=1 or null, never 0; no source gives this snow/ice route a pitch count
update routes set pitches = null where id = 'wa_mount_rainier_gibraltar_ledges' and pitches = 0;

-- 4 km is shorter than the straight line from the Heliotrope Ridge lot to the summit (6.6 km), so it is impossible. The Mountaineers gives 16.0 mi round trip (trailhead-camp 5 mi + camp-summit 3 mi =
update routes set dist_km = null where id = 'wa_mount_baker_north_ridge' and dist_km = 4;

-- The stored track is the 4 waypoints joined by straight lines (trailhead, camp, base, summit). It fails the track checks (>=10 points, no gap over 500 m); route-waypoints-and-tracks says remove it a
update routes set gpx = null where id = 'wa_mount_baker_north_ridge' and gpx is not null;

-- The 3 'pitches' are the route's three sections (trail, glacier, summit pyramid) per pitch_detail, not roped pitches; no source gives a pitch count for this Class 3 route.
update routes set pitches = null where id = 'wa_mount_shuksan_sulphide_glacier' and pitches = 3;

-- pitches is >= 1 or null, never 0 (disciplines.md shapes); this is an unroped scramble.
update routes set pitches = null where id = 'wa_vesper_peak_standard_route' and pitches = 0;

-- permit is empty; the USFS Esmeralda Trailhead page states the free self-issued wilderness permit and the parking fee.
update routes set permit = $q$Free self-issued Alpine Lakes Wilderness permit at the trailhead, required for all entry. Parking: $5/day or $30/year (Northwest Forest Pass, Interagency or Digital Day Pass).$q$ where id = 'wa_ingalls_peak_south_ridge' and permit = $q$$q$;

-- pitches must be >= 1 or null; this is a snow/scramble route with no pitches stated by any source.
update routes set pitches = null where id = 'wa_colchuck_peak_colchuck_glacier' and pitches = 0;

-- 0 is not a valid pitch count; three sources give 3 pitches (one blog notes it can be linked into 2).
update routes set pitches = 3 where id = 'wa_midway' and pitches = 0;

-- MP: 280 ft (85 m). Single source; no other page states a length.
update routes set length_m = 85 where id = 'wa_midway' and length_m is null;

-- USFS Castle Rock Trailhead page (official): no recreation pass needed to park; no fees.
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_midway' and permit is null;

-- 0 is not valid. MP: 3 pitches / 300 ft to the top of Castle Rock; most parties climb only the short finger-crack first pitch and lower from the horn. Owner may prefer 1 (the pitch most parties clim
update routes set pitches = 3 where id = 'wa_angel' and pitches = 0;

-- MP: 300 ft (91 m) for the full route. Single source.
update routes set length_m = 91 where id = 'wa_angel' and length_m is null;

-- USFS Castle Rock Trailhead page (official): no recreation pass needed to park.
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_angel' and permit is null;

-- MP: 100 ft (30 m). Single source.
update routes set length_m = 30 where id = 'wa_potholes' and length_m is null;

-- MP protection: '6 bolts of varied ages' plus gear to 2 in. Single source.
update routes set bolts = 6 where id = 'wa_potholes' and bolts is null;

-- WA State Parks page (official): Discover Pass; hours 6:30 a.m.-dusk; closed Nov 1-Mar 15; off rocks 30 min before close; no bolting/drilling. Mountaineers also lists Discover Pass.
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_potholes' and permit is null;

-- 0 is not valid; MP 2 pitches, Wenatchee Outdoors mentions its second pitch.
update routes set pitches = 2 where id = 'wa_cro_magnon_caveman' and pitches = 0;

-- WA State Parks official page (see wa_potholes).
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_cro_magnon_caveman' and permit is null;

-- Abegg: 4,626 ft from the car (parking 4,250 ft). Measured net: 8,876 (published summit) - 4,315 (USGS 3DEP at the stored trailhead pin) = 4,561 ft, within 2%. MP: ~3,500 ft to Burgundy Col alone, p
update routes set gain_ft = 4626 where id = 'wa_silver_star_glacier' and gain_ft = 4000;

commit;
