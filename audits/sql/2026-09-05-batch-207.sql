-- WA alpine audit batch 207 (pass 4)
-- Routes checked: wa_mount_christie_west, wa_mount_constance_finger_traverse,
-- wa_mount_constance_north_chimney, wa_mount_constance_north_chute,
-- wa_mount_constance_terrible_traverse, wa_mount_constance_west_arete,
-- wa_mount_crowder_northeast_ridge, wa_mount_crowder_southwest_route

-- wa_mount_christie_west: dist_km (25.7) understates the route's own summit waypoint
-- distance. The route's own waypoint chain (North Fork Quinault Trailhead -> Wolf Bar ->
-- Halfway House -> Elip Creek -> Trapper Shelter -> Low Divide -> North Saddle -> summit)
-- carries an explicit distMi=20.3 at the summit waypoint. Per this app's convention
-- (dist_km is one-way; the app doubles it for round trip), the stored 25.7 km implies
-- 15.97 mi one-way, contradicting the route's own recorded 20.3 mi. Corrected to match
-- the row's own waypoint data: 20.3 mi * 1.60934 km/mi = 32.67 km.
UPDATE routes SET dist_km = 32.67 WHERE id = 'wa_mount_christie_west';
