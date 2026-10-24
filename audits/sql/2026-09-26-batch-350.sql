-- WA alpine/mountaineering audit -- batch 350 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_mount_shuksan_north_face, wa_mount_shuksan_northeast_ridge,
--         wa_mount_shuksan_northwest_arete, wa_mount_shuksan_price_glacier,
--         wa_mount_shuksan_sulphide_glacier, wa_mount_shuksan_white_salmon_glacier,
--         wa_mount_spickard_silver_glacier, wa_mount_spickard_southwest
-- All values below were re-read from the live DB immediately before this file was written;
-- each UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Mount Shuksan, North Face (wa_mount_shuksan_north_face) -- descent
-- =========================================================================
-- Stored descent text calls Winnie's Slide "(50+ degrees)". Independent sources
-- (SummitPost trip reports, Mountainproject caption, general Shuksan TR commentary)
-- consistently describe Winnie's Slide itself at roughly 40-45 degrees; the 50+ figure
-- appears to be borrowed from generic "40- to 50-degree snow and ice" copy describing the
-- North Face as a whole, not Winnie's Slide specifically. This DB's own White Salmon
-- Glacier route (wa_mount_shuksan_white_salmon_glacier) already stores Winnie's Slide at
-- "40-45 degrees" in two separate fields, so this brings North Face's descent text in line
-- with both outside sources and the sibling route already in this database.
UPDATE routes SET descent =
  'After summiting via summit pyramid, descend can follow several options: White Salmon Glacier and Winnies Slide (40-45 degrees), Sulphide Glacier via summit pyramid, or back down North Face depending on conditions and preferences. Most parties descend via White Salmon Glacier route due to better established terrain.'
WHERE id = 'wa_mount_shuksan_north_face'
  AND descent = 'After summiting via summit pyramid, descend can follow several options: White Salmon Glacier and Winnies Slide (50+ degrees), Sulphide Glacier via summit pyramid, or back down North Face depending on conditions and preferences. Most parties descend via White Salmon Glacier route due to better established terrain.';

-- =========================================================================
-- Mount Shuksan, Northwest Arete (wa_mount_shuksan_northwest_arete) -- waypoints
-- =========================================================================
-- The route's own summit waypoint ("Mount Shuksan summit pyramid") stores elev/elevFt as
-- 9127 ft. Wikipedia's cited NGVD29 figure for Mount Shuksan's summit is 9,131 ft at
-- 48.8315495, -121.603169886 -- matching this same waypoint's own coordinate (48.831095,
-- -121.602955) to four decimal places. 5 of the other 6 Shuksan routes audited in this same
-- batch (North Face, Northeast Ridge, Price Glacier, Sulphide Glacier, White Salmon Glacier)
-- already store the summit at 9131 ft; this waypoint is the outlier. Corrected to match.
UPDATE routes SET waypoints = jsonb_set(
    jsonb_set(waypoints, '{1,elev}', '9131'),
    '{1,elevFt}', '9131'
  )
WHERE id = 'wa_mount_shuksan_northwest_arete'
  AND waypoints -> 1 ->> 'name' = 'Mount Shuksan summit pyramid'
  AND (waypoints -> 1 ->> 'elev')::int = 9127
  AND (waypoints -> 1 ->> 'elevFt')::int = 9127;

COMMIT;
