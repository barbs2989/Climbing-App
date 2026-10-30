-- WA alpine route audit -- batch 488 (pass 8)
-- Routes: wa_east_twin_needle_thread_of_ice, wa_eldorado_peak_east_ridge,
-- wa_eldorado_peak_eldorado_glacier_nw, wa_eldorado_peak_north_ridge,
-- wa_eldorado_peak_northeast_face, wa_eldorado_peak_west_arete,
-- wa_elephant_butte_standard_route, wa_energizer_bunny
-- All values below were re-read from the live DB immediately before this file was
-- written; each UPDATE carries a guard on the current value so it cannot silently
-- no-op if another session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

-- wa_eldorado_peak_north_ridge: the "Eldorado Peak" summit waypoint (index 3) carries
-- elev 8868, contradicting this same row's own high_point_ft (8872) for the identical
-- point, and the parent_area row (8872). 8868 ft is the older USGS benchmark figure for
-- a point near, not on, the true summit (per countryhighpoints.com's Eldorado survey
-- writeup); 8872 is the current accepted figure and is already what this row's own
-- high_point_ft states.
update routes set
  waypoints = jsonb_set(waypoints, '{3,elev}', '8872'::jsonb)
where id = 'wa_eldorado_peak_north_ridge'
  and waypoints->3->>'name' = 'Eldorado Peak'
  and waypoints->3->>'elev' = '8868';

-- wa_eldorado_peak_west_arete: fa gives "Aug 24, 1969" for Richard Emerson and Walter
-- Gove's first ascent. Mountain Project's West Arete route page gives the date as
-- "Aug. 29 1969" -- names match, only the day differs (24 -> 29); no source found
-- supports the 24th.
update routes set
  fa = 'Richard Emerson, Walter R. Gove - Aug 29, 1969'
where id = 'wa_eldorado_peak_west_arete'
  and fa = 'Richard Emerson, Walter R. Gove - Aug 24, 1969';

-- wa_eldorado_peak_west_arete: the summit waypoint (index 2) still carries elev/elevFt
-- 8868, even though this row's own `corrections` field already explains that 8868 is a
-- nearby USGS benchmark, not the true summit, and states the correct figure as 8872.9
-- (~8873) ft. Using 8872 to match the catalog's existing convention on this peak
-- (high_point_ft here and on every other Eldorado route in this batch is 8872).
update routes set
  waypoints = jsonb_set(jsonb_set(waypoints, '{2,elev}', '8872'::jsonb), '{2,elevFt}', '8872'::jsonb)
where id = 'wa_eldorado_peak_west_arete'
  and waypoints->2->>'name' = 'Eldorado Peak'
  and waypoints->2->>'elev' = '8868'
  and waypoints->2->>'elevFt' = '8868';

-- wa_eldorado_peak_east_ridge: the final pitch_detail entry ("East Ridge to summit")
-- states the summit at "(8,868 ft)", contradicting this row's own high_point_ft (8872),
-- its own "Eldorado Peak summit" waypoint (8872), its own itinerary schedule entry
-- ("Summit... 8,872 ft."), and approach_logistics' peak coordinate -- all of which
-- already agree on 8,872 ft. This prose mention is the sole outlier.
update routes set
  pitch_detail = jsonb_set(
    pitch_detail,
    '{4,notes}',
    '"The final crest narrows to the famous snow knife-edge, in some conditions very thin and corniced, with steep drops on both sides to the small summit (8,872 ft). Axe and crampons are essential; many parties belay or place pickets along it. Late in the season it can be icy and firm, which makes the same crest more serious to reverse on the way down."'::jsonb
  )
where id = 'wa_eldorado_peak_east_ridge'
  and pitch_detail->4->>'pitch' = 'East Ridge to summit'
  and pitch_detail->4->>'notes' = 'The final crest narrows to the famous snow knife-edge, in some conditions very thin and corniced, with steep drops on both sides to the small summit (8,868 ft). Axe and crampons are essential; many parties belay or place pickets along it. Late in the season it can be icy and firm, which makes the same crest more serious to reverse on the way down.';

-- wa_eldorado_peak_eldorado_glacier_nw: data_quality.gaps[0] states "No confirmed
-- first-ascent party/date found", directly contradicting this row's own populated fa
-- field ("Dan Cauthorn and Bill Pilling", corroborated via Mountain Project). Only the
-- exact date is actually unconfirmed -- correcting the gap note to say so instead of
-- the false "no party found" claim.
update routes set
  data_quality = jsonb_set(
    data_quality,
    '{gaps,0}',
    '"First-ascent party is documented (Dan Cauthorn and Bill Pilling, per this route'' own fa field); only the exact date is unconfirmed."'::jsonb
  )
where id = 'wa_eldorado_peak_eldorado_glacier_nw'
  and data_quality->'gaps'->>0 = 'No confirmed first-ascent party/date found';

-- wa_eldorado_peak_eldorado_glacier_nw: pitches (8) and length_m (480 = exactly 8x60m)
-- disagree with this same row's own overview ("2-3 long pitches... often simul-climbed"),
-- beta ("~1,000 ft, 7,800-8,800 ft"), climbing_route array and pitch_detail array (which
-- itself enumerates exactly 2 named pitches). Mountain Project independently lists this
-- route as "1000 ft (303 m), Grade III", matching the row's own majority text rather than
-- the 8/480 outlier. Setting pitches to 2 (matching the row's own pitch_detail array
-- length) and length_m to 305 (1,000 ft, matching the row's own stated span).
update routes set
  pitches = 2,
  length_m = 305
where id = 'wa_eldorado_peak_eldorado_glacier_nw'
  and pitches = 8
  and length_m = 480;

-- wa_elephant_butte_standard_route: dist_km (16.1 km / ~10.0 mi) is roughly half this
-- same row's own bivy entry for the Stetattle Ridge tarn camps, which states outright
-- "a full trip is closer to twenty miles and ten thousand feet of gain and loss over two
-- nights" -- 20 mi = 32.2 km, and this row's own gain_ft/loss_ft (9,700/9,700) already
-- agree with that same sentence. Only dist_km was off, by a one-way/round-trip factor of
-- almost exactly 2.
update routes set
  dist_km = 32.2
where id = 'wa_elephant_butte_standard_route'
  and dist_km = 16.1
  and gain_ft = 9700
  and loss_ft = 9700;

-- wa_energizer_bunny: dist_km (15.69 km / ~9.75 mi) is roughly half this same row's own
-- itinerary.totalNote, which states "A 3-day trip (~19.5 mi, ~5,800 ft round-trip
-- estimated)" -- 19.5 mi = 31.38 km -- and this row's own gain_ft/loss_ft (5,800/5,800)
-- and itinerary day-by-day gainFt/lossFt (4600+500+700=5800) already agree with that same
-- sentence. Same one-way/round-trip halving pattern as wa_elephant_butte_standard_route
-- above.
update routes set
  dist_km = 31.38
where id = 'wa_energizer_bunny'
  and dist_km = 15.69
  and gain_ft = 5800
  and loss_ft = 5800;

-- wa_energizer_bunny: the top-level bivy array's "Gnome Tarn" entry (index 1) gives
-- elev 7372, but this row's own "Gnome Tarn" waypoint already states elev 7415, and
-- USGS/Topozone topographic data for the Enchantment Lakes quadrangle gives Gnome Tarn
-- at 7,415 ft -- the 7372 bivy entries are the outliers against both.
update routes set
  bivy = jsonb_set(bivy, '{1,elev}', '7415'::jsonb)
where id = 'wa_energizer_bunny'
  and bivy->1->>'name' = 'Gnome Tarn'
  and bivy->1->>'elev' = '7372';

-- wa_energizer_bunny: the same Gnome Tarn elevation error is duplicated inside
-- approach_variants[1].trip.bivy[1] (the "Snow Lakes and the lower Enchantments"
-- alternate-approach variant's own nested bivy list) -- same wrong 7372 figure, same fix.
update routes set
  approach_variants = jsonb_set(
    approach_variants,
    '{1,trip,bivy,1,elev}',
    '7415'::jsonb
  )
where id = 'wa_energizer_bunny'
  and approach_variants->1->'trip'->'bivy'->1->>'name' = 'Gnome Tarn'
  and approach_variants->1->'trip'->'bivy'->1->>'elev' = '7372';

-- verify
select id, waypoints->3->>'elev' as summit_elev from routes where id = 'wa_eldorado_peak_north_ridge';
select id, fa, waypoints->2->>'elev' as summit_elev, waypoints->2->>'elevFt' as summit_elevft from routes where id = 'wa_eldorado_peak_west_arete';
select id, pitch_detail->4->>'notes' as summit_note from routes where id = 'wa_eldorado_peak_east_ridge';
select id, data_quality->'gaps'->>0 as gap0, pitches, length_m from routes where id = 'wa_eldorado_peak_eldorado_glacier_nw';
select id, dist_km from routes where id = 'wa_elephant_butte_standard_route';
select id, dist_km, bivy->1->>'elev' as gnome_tarn_bivy_elev, approach_variants->1->'trip'->'bivy'->1->>'elev' as gnome_tarn_variant_elev from routes where id = 'wa_energizer_bunny';
