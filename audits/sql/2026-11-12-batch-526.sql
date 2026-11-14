-- Batch 526 (pass 8, 2026-11-12)
-- Routes: Mount Steel (Standard Scramble); Mount Stuart (Direct North Ridge, Girth Pillar,
-- Gorillas in the Mist, Ice Cliff Glacier, North Ridge (Complete), Stuart Glacier Couloir,
-- Stuart Range Traverse, West Ridge).

-- wa_mount_stuart_direct_north_ridge: top-level lat/lng (47.81595, -122.37455) places this
-- route roughly 25-30 miles west-northwest of Mount Stuart's actual summit -- nowhere near
-- the peak (that coordinate falls in the lowlands near North Bend/Snoqualmie, not the
-- Stuart Range). The row's own area parent (wa_mount_stuart) already carries the correct
-- summit coordinate (47.475118, -120.903144), which matches Wikipedia (47°28'30"N
-- 120°54'11"W) and TopoQuest (47.475118, -120.903144) exactly, and this same route row's
-- own itinerary text independently states "the 9,415 ft summit" -- consistent with the
-- area's coordinate and elevation, not with the row's own stored lat/lng. Corrected to match
-- the area's already-verified coordinate.
UPDATE routes SET lat = 47.475118, lng = -120.903144
WHERE id = 'wa_mount_stuart_direct_north_ridge' AND lat = 47.81595 AND lng = -122.37455;
