-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- Mountain Project lists 6 pitches and Steph Abegg's pitch-by-pitch report has six; two independent sources agree. One blog (lemkeclimbs) counts 8.
update routes set pitches = 6 where id = 'wa_burgundy_spire_north_face' and pitches = 7;

-- 2,500 ft is less than the summit-minus-trailhead difference (8,050 - 5,227 ft on the USGS elevation model at the trailhead pin = 2,823 ft), before the drop to State Creek. The Mountaineers trip pro
update routes set gain_ft = 3050 where id = 'wa_cutthroat_south_buttress' and gain_ft = 2500;

-- pitches is >= 1 or null; an unroped class 4 scramble has no pitch count
update routes set pitches = null where id = 'wa_south_ridge_3' and pitches = 0;

-- stored gain is below the net climb: 8,970 ft summit minus USGS 3DEP 4,857 ft at the Rainy Pass trailhead = 4,113 ft, and the route drops to Lewis Lake on the way; a published figure gives 4,700 ft
update routes set gain_ft = 4700 where id = 'wa_south_ridge_3' and gain_ft = 3971;

-- pitches is >= 1 or null; a glacier route with a short scramble has no pitch count
update routes set pitches = null where id = 'wa_mount_logan_fremont_glacier' and pitches = 0;

-- stored gain is below the net climb (8,485 ft summit - USGS 3DEP 3,378 ft at the Stuart Lake lot = 5,107 ft); The Mountaineers give 5,400 ft for the 15 mi round trip
update routes set gain_ft = 5400 where id = 'wa_little_annapurna_south_slopes' and gain_ft = 5018;

-- one-way convention. 8 km is shorter than the straight line from the Beverly Turnpike lot to the summit (9.0 km), so it cannot be right; The Mountaineers give 20.0 mi round trip (16.1 km one way); a
update routes set dist_km = null where id = 'wa_argonaut_peak_east_ridge' and dist_km = 8;

-- stored gain is below the net climb (8,453 ft summit - USGS 3DEP 3,647 ft at the Beverly Turnpike lot = 4,806 ft); The Mountaineers give 4,853 ft. Note the approach also crosses Fourth Creek Pass (~
update routes set gain_ft = 4853 where id = 'wa_argonaut_peak_east_ridge' and gain_ft = 4300;

-- pitches 0 is invalid (>=1 or null); no source gives a pitch count for this snow/glacier route (MP lists none).
update routes set pitches = null where id = 'wa_mount_rainier_fuhrer_finger' and pitches = 0;

-- Official NPS summit figure 14,410 ft, as locked on the other Columbia Crest routes (Mountaineers prints 14,411). Lock agree-2 after.
update routes set high_point_ft = 14410 where id = 'wa_mount_rainier_fuhrer_finger' and high_point_ft = 14406;

-- Fails the recorded-track checks: starts 9.1 km from the trailhead pin (near Curtis Ridge), gaps up to 806 m, no timestamps (CalTopo-sourced per data_quality). Rule: a stored line with gaps over 500
update routes set gpx = null where id = 'wa_mount_rainier_ptarmigan_ridge' and gpx is not null;

-- Measured: USFS official summit 12,276 ft - USGS 3DEP 4,587 ft at the Killen Creek lot = 7,689 ft. 5,150 is roughly the climb above High Camp only; the stored loss_ft (7,680) already counts the whol
update routes set gain_ft = 7690 where id = 'wa_mount_adams_adams_glacier' and gain_ft = 5150;

-- USFS page (updated 2026-11-17) names it the Mt. Adams Climbing Pass (not Cascade Volcano Pass), age 16+, sold on Recreation.gov; free self-issue wilderness permit below 7,000 ft and Oct-Apr; pack o
update routes set permit = $q$Mt. Adams Climbing Pass required above 7,000 ft from May 1 to Sep 30 (age 16 and up), bought ahead on Recreation.gov; at other times and below 7,000 ft, a free self-issued wilderness permit at the trailhead. Pack out all human waste.$q$ where id = 'wa_mount_adams_adams_glacier' and permit = $q$Mt. Adams Climbing Pass (Cascade Volcano Pass) required above 7,000 ft May 1-Sep 30, sold per trip on Recreation.gov; free self-issue wilderness permit at the trailhead otherwise. Pack out human waste.$q$;

-- The stored line is the trailhead, one point and the summit pin joined up (3 points, 7.7 km gap) - not a track. Rule: lines that are only pins joined are removed.
update routes set gpx = null where id = 'wa_mount_adams_adams_glacier' and gpx is not null;

-- MP and gethighonaltitude both rate the route Grade IV (the row's own alpine_grade already says Grade IV). Lock agree-2 after.
update routes set commitment = $q$IV$q$ where id = 'wa_mount_baker_coleman_headwall' and commitment = $q$II-III$q$;

-- The stored line is exactly the four waypoints joined up (gaps to 2.9 km) - not a track. Rule: lines that are only pins joined are removed.
update routes set gpx = null where id = 'wa_mount_baker_coleman_headwall' and gpx is not null;

-- dist_km 8 is shorter than the 11.8 km straight line from the Artist Point lot to the summit, so it cannot be one-way; it equals the USFS 5-mile (8.0 km) approach to Camp Kiser - a leg. No source op
update routes set dist_km = null where id = 'wa_mount_baker_park_glacier_headwall' and dist_km = 8;

-- Fails the track checks: starts 7.1 km from the trailhead pin, gaps to 765 m, 13 points, no timestamps (CalTopo-sourced). Rule: gaps over 500 m are removed.
update routes set gpx = null where id = 'wa_mount_baker_park_glacier_headwall' and gpx is not null;

-- disciplines must name the row primary discipline (trad)
update routes set disciplines = array['trad']::text[] where id = 'wa_snow_creek_wall_satellite' and disciplines is null;

-- 0 is invalid; sources disagree (MP 3 pitches 160/140/120 ft; The Mountaineers four pitches) so null until a third source settles it
update routes set pitches = null where id = 'wa_white_slabs' and pitches = 0;

-- MP and The Mountaineers both give Grade II
update routes set commitment = $q$II$q$ where id = 'wa_white_slabs' and commitment is null;

-- disciplines must name the row primary discipline (trad)
update routes set disciplines = array['trad']::text[] where id = 'wa_white_slabs' and disciplines is null;

-- disciplines must name the row primary discipline (trad)
update routes set disciplines = array['trad']::text[] where id = 'wa_snow_creek_wall_galaxy' and disciplines is null;

-- MP (gear to 3 in, Outer Space rack) and Wenatchee Outdoors (gear to 3 inches) agree; same array shape as the wall siblings
update routes set gear = array['gear to 3 in']::text[] where id = 'wa_snow_creek_wall_remorse' and gear is null;

-- 0 is invalid. MP and Steph Abegg list 7 pitches (Abegg P1 is Remorse 5.8 or RPM 5.10+); Wenatchee Outdoors and the 1984 AAJ note say 8 - owner to choose; 7 is the count in the modern topos
update routes set pitches = null where id = 'wa_hyperspace' and pitches = 0;

-- a commitment grade misfiled in alpine_grade on a trad crag route, and MP gives Grade III, not IV
update routes set alpine_grade = null where id = 'wa_hyperspace' and alpine_grade = $q$IV$q$;

-- MP Grade III (one source; no other source states a commitment grade)
update routes set commitment = $q$III$q$ where id = 'wa_hyperspace' and commitment is null;

-- disciplines must name the row primary discipline (trad)
update routes set disciplines = array['trad']::text[] where id = 'wa_hyperspace' and disciplines is null;

-- 8,066 is the listsofjohn LiDAR figure. The published map (USGS) figure is 8,050 ft, which The Mountaineers and the American Alpine Institute also give. The rule is to use the published official fig
update routes set high_point_ft = 8050 where id = 'wa_cutthroat_south_buttress' and high_point_ft = 8066;

commit;
