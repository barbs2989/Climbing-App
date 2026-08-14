-- WA alpine audit, pass 3, batch 117 (2026-08-14)
-- Batch covered: wa_buckner_mountain_north_face, wa_buckner_mountain_southwest_face,
-- wa_burgundy_spire_north_face, wa_burnt_boot_peak_north_ridge,
-- wa_cardinal_peak_nw_couloir_north_ridge, wa_cascade_peak_east_ridge,
-- wa_castle_peak_tatoosh_southeast_face, wa_cathedral_peak_pasayten_se_buttress

-- 1. Burgundy Spire (areas.elevation_ft): stored 8483 ft, but Burgundy Spire's own
-- North Face route already stores its summit at 8400 ft (both in high_point_ft and in
-- the route's own recorded summit waypoint), and three independent sources (Mountaineers,
-- LemkeClimbs guidebook page, a peakbagger-derived summary citing 2560m) all give ~8,400 ft
-- (2560m), not 8483. Correcting the area row to match the summit elevation this catalog's
-- own route data — and outside sources — agree on.
UPDATE areas
SET elevation_ft = 8400
WHERE id = 'wa_burgundy_spire'
  AND elevation_ft = 8483;

-- 2. wa_castle_peak_tatoosh_southeast_face (routes.waypoints): the route's own Summit
-- waypoint stores elev/elevFt 6640, but this route's own high_point_ft column already
-- says 6440, the parent area row's elevation_ft is 6440, and Wikipedia independently
-- confirms The Castle (Tatoosh Range) at 6,440 ft — 6640 looks like a digit
-- transposition of the correct 6440. Guarded on the current (wrong) value so this is a
-- no-op if the row has already changed.
UPDATE routes
SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{1,elev}', '6440'),
  '{1,elevFt}', '6440'
)
WHERE id = 'wa_castle_peak_tatoosh_southeast_face'
  AND waypoints->1->>'name' = 'The Castle summit (true/northernmost ridge)'
  AND waypoints->1->>'elevFt' = '6640';

-- 3. wa_castle_peak_tatoosh_southeast_face (routes.access): the access jsonb carries a
-- leftover `_raw` sub-object that describes an entirely different peak — 8,343 ft,
-- "Provincial Park (north)" / Canadian-border access routes, "north Cascades Ranger
-- District", and "Glacial terrain and ice sheets" as a hazard. None of that is The
-- Castle: it's a 6,440 ft non-glaciated Tatoosh Range scramble inside Mount Rainier NP,
-- nowhere near the Canadian border, per this same row's own (correct) `notes`/`permit`/
-- `landManager` fields and per Wikipedia. `_raw` is not read anywhere in the app (grep
-- of *.jsx found no reference), so this only removes contaminated leftover data, not
-- anything currently displayed.
UPDATE routes
SET access = access - '_raw'
WHERE id = 'wa_castle_peak_tatoosh_southeast_face'
  AND access ? '_raw';
