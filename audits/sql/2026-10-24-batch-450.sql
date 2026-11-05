-- WA alpine/mountaineering audit — batch 450 (pass 7)
-- Reviewed 2026-10-24. Each fix below was cross-checked against at least one authoritative
-- source (see audits/wa-alpine-audit-log.md for the summary). These are PROPOSED fixes for
-- a human to review and run — not yet applied.

-- Ruby Mountain, Northwest Ridge Route (wa_ruby_mountain_northwest_ridge): the route's own
-- waypoints[0] ("Ruby Mountain summit") stores elev/elevFt = 7426 ft, but the SAME route's
-- own high_point_ft field holds 7408 ft -- the two fields contradict each other for the
-- same summit. 7426 ft is also the exact value the parent area row stored before batch 449
-- corrected it to 7412 ft (Wikipedia/PeakVisor) as unsupported by any source -- strong sign
-- this waypoint was populated from that same stale figure. Resolving to the route's own
-- high_point_ft (7408 ft, independently confirmed via WTA/trip reports) rather than picking
-- a different number for the two fields to disagree about.
update routes
  set waypoints = jsonb_set(jsonb_set(waypoints, '{0,elev}', '7408'), '{0,elevFt}', '7408')
  where id = 'wa_ruby_mountain_northwest_ridge';

-- Ruby Mountain, South Ridge Route (wa_ruby_mountain_south_ridge): same contradiction as
-- above -- waypoints[1] ("Ruby Mountain summit") stores elev/elevFt = 7426 ft against this
-- route's own high_point_ft of 7408 ft.
update routes
  set waypoints = jsonb_set(jsonb_set(waypoints, '{1,elev}', '7408'), '{1,elevFt}', '7408')
  where id = 'wa_ruby_mountain_south_ridge';
