-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- No source gives 4. MP: 2 pitches (from the Liberty Bell-Concord notch to a chain anchor, then a dihedral to a second chain anchor); theCrag: 3. Proposing MP's count, the route's primary description
update routes set pitches = 2 where id = 'wa_liberty_bell_overexposure' and pitches = 4;

-- 8.69 km is 2x the route's own summit-pin distMi (2.7 mi = 4.35 km): a round trip stored in a one-way column. Sibling Liberty Bell routes hold 4. No published one-way figure (The Mountaineers give 4
update routes set dist_km = null where id = 'wa_liberty_bell_overexposure' and dist_km = 8.69;

-- 2,001 ft is below the net climb: the day ends on South Early Winters Spire (7,807 ft, locked on wa_sews_sw_rib) from the Blue Lake Trailhead (USFS 5,400 ft) = 2,407 ft, the measured value locked on
update routes set gain_ft = 2407 where id = 'wa_liberty_traverse' and gain_ft = 2001;

-- The traverse finishes on South Early Winters Spire, its highest summit (7,807 ft, locked on wa_sews_sw_rib / wa_south_arete); NEWS 7,760 ft and Liberty Bell 7,720 ft are lower
update routes set high_point_ft = 7807 where id = 'wa_liberty_traverse' and high_point_ft is null;

-- 2,350 ft is below the net climb: 7,807 ft summit (locked) minus USGS 3DEP 5,175 ft at the route's own hairpin-pullout trailhead pin (48.5143,-120.6425) = 2,632 ft. Measured floor; no published figu
update routes set gain_ft = 2632 where id = 'wa_south_early_winter_spire_direct_east_buttress' and gain_ft = 2350;

-- The stored track is two points: the trailhead pin joined straight to the old summit pin - a line made from pins, which the waypoint rules remove. There is no recorded or mapped trail to draw instea
update routes set gpx = null where id = 'wa_south_early_winter_spire_direct_east_buttress' and gpx is not null;

-- theCrag 800 ft and Steph Abegg 800 ft agree (244 m); MP gives none
update routes set length_m = 244 where id = 'wa_northwest_face_boving_pollock' and length_m is null;

-- Two-point line from the trailhead pin to the old summit pin - a line made from pins, removed under the waypoint rules; no mapped trail reaches the face
update routes set gpx = null where id = 'wa_northwest_face_boving_pollock' and gpx is not null;

-- Mountain Project, The Mountaineers and Wenatchee Outdoors all give Grade III (same value as the sibling Beckey-Davis). alpine_grade null -> III likewise, as on Beckey-Davis.
update routes set commitment = $q$III$q$ where id = 'wa_prusik_peak_stanley_burgner' and commitment is null;

-- Route is in the Enchantment Permit Area; same official text locked on the sibling Prusik routes (USFS pages).
update routes set permit = $q$Enchantment permit area: overnight stays May 15-Oct 31 require a quota permit (Recreation.gov advance lottery); day trips need the free self-issued day-use permit at the trailhead.$q$ where id = 'wa_prusik_peak_stanley_burgner' and permit is null;

-- alpine_grade holds a value like the sibling Stuart/Dragontail routes ("IV"); MP Grade IV.
update routes set alpine_grade = $q$IV$q$ where id = 'wa_northeast_buttress_4' and alpine_grade = $q$Grade IV (Alpine)$q$;

-- The stored line is only three of the route pins joined (and out of order: trailhead -> summit -> lake). The waypoint skill removes a pins-joined line; draw the mapped trail instead.
update routes set gpx = null where id = 'wa_northeast_buttress_4' and gpx is not null;

-- 24.14 km is exactly 15.0 mi - reads as a round trip stored in a one-way column (the app doubles it to 30 mi). The stored track measures ~10.2 km from the point nearest the trailhead to the summit, 
update routes set dist_km = null where id = 'wa_mount_stuart_ice_cliff_glacier' and dist_km = 24.14;

-- Fails the track checks: starts 4.75 km from the trailhead pin (on the lower road), has a 658 m gap, and has no timestamps. Remove gpx and elev_pts together.
update routes set gpx = null where id = 'wa_mount_stuart_ice_cliff_glacier' and gpx is not null;

-- Land manager's summit figure is 8,365 ft (USFS summit page; same fix as Monitor Ridge in batch B). Lock official-1 after.
update routes set high_point_ft = 8365 where id = 'wa_mount_st_helens_worm_flows' and high_point_ft = 8363;

-- IMPOSSIBLE: 5.5 km is shorter than the 7.8 km straight line from the trailhead to the summit; it is the 3.5 mi (5.5 km) leg to Crag View camp. One-way convention: Alpine Institute ~13 mi (21 km) ro
update routes set dist_km = null where id = 'wa_mount_baker_squak_glacier' and dist_km = 5.5;

-- Empty. Measured: USFS 10,781 ft - USGS 3DEP 3,322 ft at the Park Butte lot = 7,459 ft; Alpine Institute gives 8,000 ft (3,300 to camp + 4,700 to the summit, within 10%). The stored line accumulates
update routes set gain_ft = 7500 where id = 'wa_mount_baker_squak_glacier' and gain_ft is null;

-- 25.7 km is 2x the summit pin's 8 mi (12.9 km): a round trip stored in a one-way column. No source opened states a one-way (or round-trip) distance - USFS gives only 'about two miles' of maintained 
update routes set dist_km = null where id = 'wa_mount_baker_boulder_glacier' and dist_km = 25.7;

-- The column holds an argument, not a value. Mountain Project: Grade II (matches commitment II).
update routes set alpine_grade = $q$Grade II$q$ where id = 'wa_glacier_peak_frostbite_ridge' and alpine_grade = $q$AD-/PD+ (it is also rated Grade II, easier than the AD given here)$q$;

-- No source gives 5 pitches. Mountain Project: the ice face below the rim takes 1-2 pitches, the rest is ridge/glacier travel; no total pitch count is published.
update routes set pitches = null where id = 'wa_glacier_peak_frostbite_ridge' and pitches = 5;

-- Fails the track checks: a 1,651 m gap and other gaps over 500 m (27.3 km in 81 points); elev_pts jump 4,242 -> 5,853 -> 4,985 ft between neighbours. CalTopo-sourced per data_quality. Draw the mappe
update routes set gpx = null where id = 'wa_glacier_peak_frostbite_ridge' and gpx is not null;

-- IMPOSSIBLE: 5,000 ft is below the net climb. USFS 12,276 ft - USGS 3DEP 4,587 ft at the Killen Creek lot = 7,689 ft; The Mountaineers (shared approach for Adams Glacier / North Lyman / NW Ridge nor
update routes set gain_ft = 7690 where id = 'wa_mount_adams_lyman_glacier' and gain_ft = 5000;

-- 37.3 km (23 mi) is 3.5x the 10.7 km straight line and matches neither a one-way nor a round-trip figure; no source opened states a distance for this route (the sibling Adams Glacier shares the appr
update routes set dist_km = null where id = 'wa_mount_adams_lyman_glacier' and dist_km = 37.3;

-- The stored line is two points (46.308445,-121.539099 - 2.4 km from the trailhead - and the summit pin), 12.4 km apart: pins joined, not a track. Rule: remove.
update routes set gpx = null where id = 'wa_mount_adams_lyman_glacier' and gpx is not null;

-- Same correction the owner approved for the Adams Glacier (batch D): USFS calls it the Mt. Adams Climbing Pass (not Cascade Volcano Pass), age 16+; 'per trip' is not stated. Lock official-1 after (e
update routes set permit = $q$Mt. Adams Climbing Pass required above 7,000 ft from May 1 to Sep 30 (age 16 and up), bought ahead on Recreation.gov; at other times and below 7,000 ft, a free self-issued wilderness permit at the trailhead. Pack out all human waste.$q$ where id = 'wa_mount_adams_lyman_glacier' and permit = $q$Mt. Adams Climbing Pass (Cascade Volcano Pass) required above 7,000 ft May 1-Sep 30, sold per trip on Recreation.gov; free self-issue wilderness permit at the trailhead otherwise. Pack out human waste.$q$;

-- 0 is invalid. MP: 2 pitches (a different first pitch, then the standard Saber finish from Saber Ledge). Single source.
update routes set pitches = 2 where id = 'wa_saber_direct' and pitches = 0;

-- MP: 300 ft (91 m). Single source.
update routes set length_m = 91 where id = 'wa_saber_direct' and length_m is null;

-- Reused from batch C (wa_midway/wa_angel): USFS Castle Rock Trailhead page, no pass or fee to park.
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_saber_direct' and permit is null;

-- disciplines is null; must name the primary discipline (trad).
update routes set disciplines = array['trad']::text[] where id = 'wa_saber_direct' and disciplines is null;

-- Reused from batch C (wa_midway/wa_angel): USFS Castle Rock Trailhead page, no pass or fee to park.
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_upper_castle_angel_dreads' and permit is null;

-- 0 is invalid. MP: 80 ft sport route, 6 bolts to a two-bolt anchor (MP omits the count on single-pitch routes).
update routes set pitches = 1 where id = 'wa_dr_leakey' and pitches = 0;

-- MP: 80 ft (24 m). Single source; theCrag length UNKNOWN.
update routes set length_m = 24 where id = 'wa_dr_leakey' and length_m is null;

-- MP: six bolts. Single source.
update routes set bolts = 6 where id = 'wa_dr_leakey' and bolts is null;

-- MP: two-bolt anchor. Single source.
update routes set anchor = $q$Two-bolt anchor$q$ where id = 'wa_dr_leakey' and anchor is null;

-- Reused from batch C (wa_potholes): WA State Parks page, official.
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_dr_leakey' and permit is null;

-- disciplines is null; must name the primary discipline (sport).
update routes set disciplines = array['sport']::text[] where id = 'wa_dr_leakey' and disciplines is null;

-- MP 700 ft (212 m); theCrag 660 ft (201 m) - within 10%. MP figure used.
update routes set length_m = 212 where id = 'wa_mary_jane_dihedral' and length_m is null;

-- Reused from batch D: USFS Snow Lakes Trailhead page (updated 2026-08-04) - $5/day or $30/yr, NW Forest Pass and Interagency passes accepted. Wenatchee Outdoors also says NW Forest Pass. Whether a d
update routes set permit = $q$Park at the Snow Lakes Trailhead with the $5 day-use fee, a Northwest Forest Pass or an interagency pass.$q$ where id = 'wa_mary_jane_dihedral' and permit is null;

-- disciplines is null; must name the primary discipline (trad).
update routes set disciplines = array['trad']::text[] where id = 'wa_mary_jane_dihedral' and disciplines is null;

-- 0 is invalid. MP: 8 pitches counting the two Remorse pitches it starts on and the P8 bolt ladder. WO describes 7 (Remorse 1-2, then 3-7 ending at the bolt ladder) and Abegg 6 - owner may prefer ano
update routes set pitches = null where id = 'wa_iconoclast' and pitches = 0;

-- MP: 800 ft (242 m). Single source.
update routes set length_m = 242 where id = 'wa_iconoclast' and length_m is null;

-- MP: Grade IV. Single source.
update routes set commitment = $q$IV$q$ where id = 'wa_iconoclast' and commitment is null;

-- Reused from batch D: USFS Snow Lakes Trailhead page (updated 2026-08-04) - $5/day or $30/yr, NW Forest Pass and Interagency passes accepted. Wenatchee Outdoors also says NW Forest Pass. Whether a d
update routes set permit = $q$Park at the Snow Lakes Trailhead with the $5 day-use fee, a Northwest Forest Pass or an interagency pass.$q$ where id = 'wa_iconoclast' and permit is null;

-- disciplines is null; must name the primary discipline (trad).
update routes set disciplines = array['trad']::text[] where id = 'wa_iconoclast' and disciplines is null;

-- theCrag 5.11a III and Steph Abegg 5.11a (two independent publishers) vs MP 5.11b (stored). theCrag also cites a guidebook III 5.10c
update routes set grade = $q$5.11a$q$ where id = 'wa_northwest_face_boving_pollock' and grade = $q$5.11b$q$;

-- as grade
update routes set rock_grade = $q$5.11a$q$ where id = 'wa_northwest_face_boving_pollock' and rock_grade = $q$5.11b$q$;

-- Two independent sources give 5.9+ (Steph Abegg; Wenatchee Outdoors, crux the last pitch) and The Mountaineers 5.9 with a 5.9+ pitch; only Mountain Project says 5.10a. Also set rock_grade 5.9+ and r
update routes set grade = $q$5.9+$q$ where id = 'wa_prusik_peak_stanley_burgner' and grade = $q$5.10a$q$;

-- Three independent sources put it at 5.9: theCrag 5.9 III (citing Rock Climbing Washington), Steph Abegg 5.9, Wenatchee Outdoors 5.9+. Only MP says 5.10a. grade_num would go 10.25 -> 9. Owner decide
update routes set grade = $q$5.9$q$ where id = 'wa_mary_jane_dihedral' and grade = $q$5.10a$q$;

-- follows grade 5.11a (lib/grade.js gradeNumFrom)
update routes set grade_num = 11.25 where id = 'wa_northwest_face_boving_pollock' and grade_num = 11.5;

-- follows grade 5.9+
update routes set grade_num = 9 where id = 'wa_prusik_peak_stanley_burgner' and grade_num = 10.25;

-- follows grade 5.9
update routes set grade_num = 9 where id = 'wa_mary_jane_dihedral' and grade_num = 10.25;

commit;
