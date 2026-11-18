-- WA alpine route audit, pass 4, batch 205 (2026-09-05)
-- Scope: wa_mount_adams_south_climb .. wa_mount_baker_coleman_headwall

-- wa_mount_baker_coleman_deming: dist_km stored as 4.7 km, which is physically
-- impossible for this route -- it is SHORTER than the straight-line chord between
-- the route's own trailhead and summit waypoints (6.52 km). The route's own summit
-- waypoint independently states distMi=5.5 (=8.85 km one-way), and this exact figure
-- ("gains 7,000 feet in a distance of 5.5 miles") is corroborated by multiple external
-- sources for the Coleman-Deming standard route (e.g. AllTrails/guide-service route
-- descriptions citing 11.8 mi / 19 km round trip). gain_ft (7080) already matches the
-- externally-cited ~7,000 ft and needs no change.
UPDATE routes SET dist_km = 8.85
WHERE id = 'wa_mount_baker_coleman_deming' AND dist_km = 4.7;

-- wa_mount_baker_boulder_glacier: dist_km stored as 25.7 km, contradicted by the
-- route's OWN summit waypoint, which stores distMi=6.35 (=10.22 km) explicitly tagged
-- "distFrom":"track" -- i.e. already computed by this app's own pipeline from this
-- route's own stored gpx track. Independently re-summing the stored gpx track's 252
-- points gives 10.23 km, matching the waypoint value almost exactly. dist_km was never
-- updated to match; corrected to agree with the route's own corroborated value.
UPDATE routes SET dist_km = 10.22
WHERE id = 'wa_mount_baker_boulder_glacier' AND dist_km = 25.7;

-- wa_mount_baker_boulder_glacier: gain_ft/loss_ft stored as 7000/7000, which does not
-- match this route's own trailhead (2,200 ft) and summit (10,781 ft) waypoints -- a
-- simple net-elevation-difference gives 8,581 ft, not 7,000. 7000/7000 appears to be a
-- generic filler value shared with other, unrelated Mount Baker routes on different
-- trailheads (e.g. Coleman Headwall, whose own 3,437 ft trailhead genuinely does net to
-- ~7,000 ft). Corrected to match this route's own two elevation waypoints; loss_ft set
-- equal to gain_ft since this is an out-and-back route returning to the same trailhead.
UPDATE routes SET gain_ft = 8581, loss_ft = 8581
WHERE id = 'wa_mount_baker_boulder_glacier' AND gain_ft = 7000 AND loss_ft = 7000;

-- wa_mount_baker_cockscomb_ridge: overview field claimed the route is "approached from
-- the Heliotrope Ridge Trailhead across the Coleman and Roosevelt Glaciers" -- this
-- contradicts THREE other fields on the same row: the route's own waypoints array
-- (whose trailhead is "Artist Point (Ptarmigan Ridge Trailhead)"), its beta field
-- ("Ascend Ptarmigan Ridge Trail to Camp Kiser..."), and its descent field ("...retrace
-- the boot path and Ptarmigan Ridge Trail to Artist Point"). An authoritative source
-- (The Mountaineers, mountaineers.org, describing Camp Kiser on the Ptarmigan Ridge
-- Trail) independently confirms Camp Kiser "provides access to the Park Glacier route,
-- the Cockscomb, and the Roosevelt Headwall" -- i.e. the Ptarmigan Ridge/Artist Point
-- approach, not Heliotrope Ridge (which is the opposite, west side of the mountain,
-- used by the Coleman-Deming and Coleman Headwall routes). Corrected to match the
-- other three fields and the external source. NOTE: this route's `gpx` track and its
-- second waypoint ("Heliotrope Ridge Camp", at Heliotrope-side coordinates) still
-- describe the wrong (Heliotrope) side and were NOT touched here -- flagged separately
-- for a human to supply real Ptarmigan Ridge/Camp Kiser-side coordinates.
UPDATE routes SET overview = 'Cockscomb Ridge is the true north ridge of Mount Baker — a long, prominent rock-and-ice ridge forming a skyline on the north side of the peak, distinct from the popular ''North Ridge'' route (which is actually the NW spur). It sits between the North Ridge and the Park Glacier Headwall and is approached from the Ptarmigan Ridge Trailhead at Artist Point, via Camp Kiser, across the Coleman and Roosevelt Glaciers. First climbed in its entirety on July 4, 1961 by Chuck Murley, John Musser, and a third climber, after a 1906 Mazama party had been turned back by the ridge''s 300-ft Cockscomb Tower.'
WHERE id = 'wa_mount_baker_cockscomb_ridge'
  AND overview LIKE 'Cockscomb Ridge is the true north ridge of Mount Baker%Heliotrope Ridge Trailhead across the Coleman and Roosevelt Glaciers%';
