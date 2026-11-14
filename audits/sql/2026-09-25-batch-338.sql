-- WA alpine/mountaineering audit -- batch 338 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_mount_adams_lyman_glacier, wa_mount_adams_mazama_glacier_headwall,
--         wa_mount_adams_north_ridge, wa_mount_adams_northwest_ridge,
--         wa_mount_adams_south_climb, wa_mount_adams_wilson_glacier_headwall,
--         wa_mount_anderson_eel_glacier, wa_mount_baker_boulder_glacier
-- All values below were re-read from the live DB immediately before this file was written;
-- every UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Mazama Glacier Headwall (wa_mount_adams_mazama_glacier_headwall)
-- =========================================================================
-- The top-level `permit` column (rendered as a standalone green banner on the route's Overview
-- tab via route.permits) held the generic Forest-Service "Mt. Adams Climbing Pass" boilerplate
-- shared by the FS-side routes (South Climb, North Ridge, etc.) -- but this route's OWN
-- approach text starts at "Bird Creek Road trailhead... on the Yakama Reservation side", and its
-- OWN access.permit / access.closures / access.landManager fields already correctly say a
-- Yakama Indian Reservation Tract-D tribal-use permit is required instead, with non-tribal
-- access restricted to roughly July 1-Oct 1. Three sibling Mount Adams routes in this same
-- batch (Lyman Glacier, North Ridge, Wilson Glacier Headwall) independently carry the identical
-- boilerplate sentence noting "The Mazama Glacier route ... cross[es] Yakama Nation land and
-- require[s] a separate small tribal recreation permit", corroborating that this route -- not
-- the FS pass -- is the one that needs the tribal permit. Externally corroborated: the Yakama
-- Tract-D tribal-use permit for Bird Creek Meadows / Mazama Glacier access, and the Jul 1-Oct 1
-- non-tribal season, are documented by multiple public trip-report sources. The Planner tab's
-- ACCESS & REGULATIONS panel already reads access.permit (already correct) -- only the
-- Overview-tab top-level column was wrong, so the two tabs were contradicting each other.
UPDATE routes SET permit = 'Yakama Indian Reservation Tract-D tribal-use permit required to start from Bird Creek Meadows -- this route stays on Yakama Nation land, not Forest Service land, so the Mt. Adams Climbing Pass required elsewhere on the mountain does not apply. Non-tribal-member access is restricted to roughly July 1-Oct 1.'
WHERE id = 'wa_mount_adams_mazama_glacier_headwall'
  AND permit = 'Mt. Adams Climbing Pass (Cascade Volcano Pass) required above 7,000 ft May 1-Sep 30, sold per trip on Recreation.gov; free self-issue wilderness permit at the trailhead otherwise. Pack out human waste.';

-- =========================================================================
-- Wilson Glacier Headwall (wa_mount_adams_wilson_glacier_headwall)
-- =========================================================================
-- This row's access JSON carried three self-contradicting fields, all reachable on the same
-- Planner ACCESS & REGULATIONS panel:
--  - landManager said "Yakama Nation (Tract D, eastern Mount Adams)" while the row's own
--    canonical land_manager (the field the app's display code prefers) already correctly said
--    "U.S. Forest Service" -- matching this route's own approach text, which starts at the
--    Cold Springs/South Climb trailhead (FS land), and matching this row's own boilerplate
--    access.rules sentence: "the standard South Climb/Cold Springs route stays on Forest
--    Service land and does not [require the Yakama permit]." landManager looks like a leftover
--    copy from the Mazama Glacier Headwall row (the one Mount Adams route that IS on Yakama
--    land) never updated for this route. Corrected to match land_manager.
--  - closures repeated the same Yakama Tract D restriction, inapplicable to an FS-land route
--    with no independently researched closure fact for this specific route -- cleared rather
--    than inventing a replacement.
--  - notes said "No specific climbing permit," directly contradicted by this SAME row's own
--    fees ("$20 per person...") and permit ("Mt. Adams Climbing Activity Pass") fields two keys
--    away in the same object. Corrected by dropping the false clause; the remaining Northwest
--    Forest Pass sentence is left as-is since South Climb's own parking_pass field confirms a
--    Northwest Forest Pass is accepted at the same Cold Springs trailhead.
UPDATE routes SET access = jsonb_set(access, '{landManager}', '"U.S. Forest Service"'::jsonb)
WHERE id = 'wa_mount_adams_wilson_glacier_headwall'
  AND access ->> 'landManager' = 'Yakama Nation (Tract D, eastern Mount Adams)'
  AND access ->> 'land_manager' = 'U.S. Forest Service';

UPDATE routes SET access = access - 'closures'
WHERE id = 'wa_mount_adams_wilson_glacier_headwall'
  AND access ->> 'closures' = 'Yakama Nation Tract D is largely closed to public recreation outside specific permitted areas/season (Jul 1 - Oct 1 for non-tribal members).';

UPDATE routes SET access = jsonb_set(access, '{notes}', '"Northwest Forest Pass required ($5/day or $30/annual)."'::jsonb)
WHERE id = 'wa_mount_adams_wilson_glacier_headwall'
  AND access ->> 'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit.';

-- =========================================================================
-- Mount Anderson (area wa_mount_anderson) -- elevation
-- =========================================================================
-- areas.elevation_ft stored 7323 ft, but Mount Anderson's authoritative USGS/NGS-sourced
-- elevation is 7,330 ft (per Wikipedia's citation of the "Anderson USGS 1955" survey) --
-- and this row's own route wa_mount_anderson_eel_glacier already stores high_point_ft = 7330,
-- so the areas row was the one out of step with both the outside source and this app's own
-- route data for the same peak.
UPDATE areas SET elevation_ft = 7330
WHERE id = 'wa_mount_anderson' AND elevation_ft = 7323;

COMMIT;
