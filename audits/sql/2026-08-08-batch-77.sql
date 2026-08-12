-- WA alpine audit, pass 2, batch 77 (2026-08-08)
-- Routes checked: wa_mount_adams_lyman_glacier, wa_mount_adams_mazama_glacier_headwall,
-- wa_mount_adams_north_ridge, wa_mount_adams_northwest_ridge, wa_mount_adams_south_climb,
-- wa_mount_adams_wilson_glacier_headwall, wa_mount_anderson_eel_glacier, wa_mount_baker_boulder_glacier

-- wa_mount_adams_lyman_glacier: top-level `season` ("May-Jun") excluded July even though
-- the row's own `best_season` ("June to July") and `seasonal_guidance.monthBreakdown` (July
-- rated "good", within the optimal window) both treat July as climbable. Widening `season`
-- to match the row's own more detailed fields; no new external fact needed, this is a
-- same-row internal-consistency fix.
UPDATE routes SET season = 'May-Jul'
WHERE id = 'wa_mount_adams_lyman_glacier';

-- wa_mount_adams_mazama_glacier_headwall: the top-level `permit` field carried the generic
-- USFS "Mt. Adams Climbing Pass (Cascade Volcano Pass)" boilerplate that's correct for the
-- south/north-side USFS routes but wrong here -- this route starts from Bird Creek Meadows
-- on Yakama Nation land (Tract D), as the row's OWN `access` object and `watch_out` array
-- already correctly document (Yakama tribal-use permit, non-tribal season restricted to
-- roughly July 1-October 1). The Cascade Volcano Pass does not apply on reservation land.
-- Rewriting the plain-text `permit` field to match what the row's own access/watch_out
-- fields already established, rather than the copy-pasted USFS default.
UPDATE routes SET permit = 'Yakama Indian Reservation Tract-D tribal-use permit required to start from Bird Creek Meadows, non-tribal-member access restricted to roughly July 1-October 1 (Bird Creek Meadows is among the few reservation-side areas open to public recreation). This route lies on Yakama Nation land, not Forest Service land, so the Mt. Adams Climbing Pass (Cascade Volcano Pass) does not apply here.'
WHERE id = 'wa_mount_adams_mazama_glacier_headwall';
