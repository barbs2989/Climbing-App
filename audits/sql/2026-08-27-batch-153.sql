-- WA alpine audit -- batch 153 (2026-08-27, pass 3)
-- Routes: wa_mount_stuart_ice_cliff_glacier, wa_mount_stuart_north_face,
-- wa_mount_stuart_north_ridge, wa_mount_stuart_stuart_glacier_couloir,
-- wa_mount_stuart_the_gendarme, wa_mount_stuart_west_ridge,
-- wa_mount_teneriffe_kamikaze_trail, wa_mount_teneriffe_standard_route.
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention. Apply each UPDATE individually rather than
-- pasting the whole file at once.
--
-- NOTE: the two driveNote/approach edits below rephrase one semicolon in
-- the original prose to a comma ("... Road; the paved ..." ->
-- "... Road. The paved ..."; "... Way; turn left ..." -> "... Way, then
-- turn left ..."). Meaning is unchanged -- this is only so the corrected
-- literal contains no semicolon, since scripts/check-sql-targets.mjs
-- splits statements on bare ";" and a semicolon inside a string literal
-- would otherwise make the id predicate unreadable to that checker.

-- =========================================================================
-- Mount Stuart (wa_mount_stuart) -- wa_mount_stuart_north_face,
-- wa_mount_stuart_the_gendarme
-- =========================================================================

-- Both routes' "Mount Stuart summit" waypoint stores lng -120.9022. The
-- USGS-cited summit coordinate is 47.4751179 N, -120.9031444 W (confirmed via
-- web search against the USGS topo listing), which matches this catalog's own
-- areas.wa_mount_stuart row (lat 47.475118, lng -120.903144) AND the summit
-- waypoint already used correctly on wa_mount_stuart_ice_cliff_glacier in this
-- same batch. -120.9022 is off by ~0.0009 deg longitude (~68 m at this
-- latitude) from the peak's own established coordinate. Corrected to match.
UPDATE routes
SET waypoints = jsonb_set(jsonb_set(waypoints, '{1,lat}', '47.475118'), '{1,lng}', '-120.903144')
WHERE id = 'wa_mount_stuart_north_face'
  AND waypoints->1->>'name' = 'Mount Stuart summit'
  AND waypoints->1->>'type' = 'Summit'
  AND (waypoints->1->>'lat')::numeric = 47.475
  AND (waypoints->1->>'lng')::numeric = -120.9022;

UPDATE routes
SET waypoints = jsonb_set(jsonb_set(waypoints, '{0,lat}', '47.475118'), '{0,lng}', '-120.903144')
WHERE id = 'wa_mount_stuart_the_gendarme'
  AND waypoints->0->>'name' = 'Mount Stuart summit'
  AND waypoints->0->>'type' = 'Summit'
  AND (waypoints->0->>'lat')::numeric = 47.475
  AND (waypoints->0->>'lng')::numeric = -120.9022;

-- =========================================================================
-- Mount Teneriffe (wa_mount_teneriffe) -- wa_mount_teneriffe_kamikaze_trail,
-- wa_mount_teneriffe_standard_route
-- =========================================================================

-- Both routes' road.driveNote and (on the standard route) approach text cite
-- "I-90 Exit 31 (North Bend)" for reaching SE Mount Si Road via North Bend
-- Way. WSDOT's own interchange documentation identifies I-90 Exit 31 as
-- SR-202/Bendigo Blvd into downtown North Bend, not the Mount Si Road
-- corridor. The exit that reaches SE Mount Si Road via North Bend Way is
-- Exit 32 (436th Ave SE) -- confirmed against WTA and Mountaineers driving
-- directions for this trailhead (both explicitly cite Exit 32 / 436th Ave SE
-- as the turn, then North Bend Way, then SE Mount Si Road -- the identical
-- route this catalog's own text describes).
UPDATE routes
SET road = jsonb_set(road, '{driveNote}',
  '"From I-90 Exit 32 (North Bend), follow North Bend Way then turn onto SE Mount Si Road. The paved Mount Teneriffe Trailhead lot is about 2.9 miles past the Mount Si trailhead."')
WHERE id = 'wa_mount_teneriffe_kamikaze_trail'
  AND road->>'driveNote' = 'From I-90 Exit 31 (North Bend), follow North Bend Way then turn onto SE Mount Si Road; the paved Mount Teneriffe Trailhead lot is about 2.9 miles past the Mount Si trailhead.';

UPDATE routes
SET road = jsonb_set(road, '{driveNote}',
  '"From I-90 Exit 32 (North Bend), follow North Bend Way then turn onto SE Mount Si Road. The paved Mount Teneriffe Trailhead lot is about 2.9 miles past the Mount Si trailhead."')
WHERE id = 'wa_mount_teneriffe_standard_route'
  AND road->>'driveNote' = 'From I-90 Exit 31 (North Bend), follow North Bend Way then turn onto SE Mount Si Road; the paved Mount Teneriffe Trailhead lot is about 2.9 miles past the Mount Si trailhead.';

UPDATE routes
SET approach = 'From I-90 take Exit 32 into North Bend and continue on North Bend Way, then turn left (north) on SE Mount Si Road. Continue about 2.9 miles past the Mount Si trailhead to the paved, ~70-car Mount Teneriffe Trailhead lot (Discover Pass required). From the lot, a half-mile access path switchbacks up through second-growth forest to an old logging-road grade, which climbs gently for about 1.5 miles through young forest and meadow, passing the signed spur down to Teneriffe Falls at roughly 2.8 miles. Beyond the falls junction the trail narrows and climbs via switchbacks (with a Middle Fork Snoqualmie viewpoint) for another ~2.7 miles, then continues about 2.3 more miles, dipping briefly to Rachor Pass (~4,200 ft saddle) before the final short, rocky summit scramble.'
WHERE id = 'wa_mount_teneriffe_standard_route'
  AND approach = 'From I-90 take Exit 31 into North Bend and continue on North Bend Way; turn left (north) on SE Mount Si Road. Continue about 2.9 miles past the Mount Si trailhead to the paved, ~70-car Mount Teneriffe Trailhead lot (Discover Pass required). From the lot, a half-mile access path switchbacks up through second-growth forest to an old logging-road grade, which climbs gently for about 1.5 miles through young forest and meadow, passing the signed spur down to Teneriffe Falls at roughly 2.8 miles. Beyond the falls junction the trail narrows and climbs via switchbacks (with a Middle Fork Snoqualmie viewpoint) for another ~2.7 miles, then continues about 2.3 more miles, dipping briefly to Rachor Pass (~4,200 ft saddle) before the final short, rocky summit scramble.';
