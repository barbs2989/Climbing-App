-- WA alpine/mountaineering audit -- batch 351 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_mount_st_helens_monitor_ridge, wa_mount_st_helens_worm_flows,
--         wa_mount_steel_first_divide, wa_mount_steel_standard,
--         wa_mount_stuart_girth_pillar, wa_mount_stuart_ice_cliff_glacier,
--         wa_mount_stuart_north_ridge, wa_mount_stuart_stuart_glacier_couloir
-- All values below were re-read from the live DB immediately before this file was written;
-- each UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Mount St. Helens, Worm Flows (wa_mount_st_helens_worm_flows) -- waypoints, bivy
-- =========================================================================
-- This single row states the Marble Mountain Sno-Park trailhead elevation three different
-- ways: 2,800 ft in both the "approach" and "beta" prose fields (left unchanged -- already
-- correct), but 2,680 ft in waypoints[0].elev and 2,700 ft in bivy[0].elev. Independent
-- sources (USFS trail page, WTA, AllTrails) consistently give the Sno-Park's elevation as
-- 2,800 ft, matching this row's own prose. Aligning the two structured fields to the
-- externally-corroborated, internally-dominant figure.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '2800')
WHERE id = 'wa_mount_st_helens_worm_flows'
  AND waypoints -> 0 ->> 'name' = 'Marble Mountain Sno-Park'
  AND (waypoints -> 0 ->> 'elev')::int = 2680;

UPDATE routes SET bivy = jsonb_set(bivy, '{0,elev}', '2800')
WHERE id = 'wa_mount_st_helens_worm_flows'
  AND bivy -> 0 ->> 'name' = 'Marble Mountain Sno-Park'
  AND (bivy -> 0 ->> 'elev')::int = 2700;

-- =========================================================================
-- Mount Stuart, Stuart Glacier Couloir (wa_mount_stuart_stuart_glacier_couloir) -- max_angle
-- =========================================================================
-- Stored max_angle is 80 degrees, but this route's own overview/beta prose caps the crux at
-- 60 degrees ("...frequently holds around 100 ft of water ice up to 60deg"; "the couloir
-- climbs 40-50deg snow with two steeper steps"), and an independent route-guide source
-- (paraphrasing the Cascade Alpine Guide) likewise states "Grade III Class 5+ with snow
-- and/or ice to 60 degrees... most of the route is 40 to 50 degrees." Nothing in this row or
-- any source found supports 80 degrees anywhere on the route. Corrected to match the route's
-- own description and the external source.
UPDATE routes SET max_angle = 60
WHERE id = 'wa_mount_stuart_stuart_glacier_couloir'
  AND max_angle = 80;

COMMIT;
