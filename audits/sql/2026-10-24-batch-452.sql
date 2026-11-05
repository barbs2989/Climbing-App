-- WA alpine/mountaineering audit -- batch 452 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_sherpa_peak_east_ridge, wa_sherpa_peak_north_ridge, wa_sherpa_peak_northeast_face,
--         wa_sherpa_peak_west_ridge, wa_silver_star_glacier, wa_silver_star_ne_ridge,
--         wa_sinister_peak_north_face, wa_sinister_peak_southwest_route
--
-- All current values below were re-read from the live DB via the read-only anon key
-- immediately before this file was written; each UPDATE carries a guard on that current
-- value so it cannot silently no-op or clobber an unrelated edit.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Sinister Peak -- area row elevation_ft
-- =========================================================================
-- Wikipedia, PeakVisor, SummitPost and mountaineers.org all independently give Sinister
-- Peak's elevation as 8,440 ft; none give 8,444 ft. A 2026-07-31 prior "correction"
-- (recorded in both routes' own corrections fields) changed this area's elevation_ft from
-- 8440 to 8444 purely to match the routes' own high_point_ft/waypoints -- i.e. it made the
-- three in-app copies agree with each other, not with any outside source, and in doing so
-- moved the area row away from the figure every outside source actually gives. Reverting
-- to 8440 and carrying the same correction through the two sibling routes below so all
-- three stay in agreement, now with an authoritative source.
UPDATE areas SET elevation_ft = 8440
WHERE id = 'wa_sinister_peak' AND elevation_ft = 8444;

-- =========================================================================
-- Sinister Peak, North Face -- wa_sinister_peak_north_face
-- =========================================================================
UPDATE routes SET high_point_ft = 8440
WHERE id = 'wa_sinister_peak_north_face' AND high_point_ft = 8444;

UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elev}', '8440'::jsonb)
WHERE id = 'wa_sinister_peak_north_face'
  AND waypoints #>> '{1,name}' = 'Sinister Peak Summit'
  AND waypoints #>> '{1,elev}' = '8444';

UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '8440'::jsonb)
WHERE id = 'wa_sinister_peak_north_face'
  AND waypoints #>> '{1,name}' = 'Sinister Peak Summit'
  AND waypoints #>> '{1,elevFt}' = '8444';

-- =========================================================================
-- Sinister Peak, Southwest Route -- wa_sinister_peak_southwest_route
-- =========================================================================
UPDATE routes SET high_point_ft = 8440
WHERE id = 'wa_sinister_peak_southwest_route' AND high_point_ft = 8444;

UPDATE routes SET waypoints = jsonb_set(waypoints, '{7,elev}', '8440'::jsonb)
WHERE id = 'wa_sinister_peak_southwest_route'
  AND waypoints #>> '{7,name}' = 'Sinister Peak'
  AND waypoints #>> '{7,elev}' = '8444';

-- =========================================================================
-- Silver Star Glacier -- wa_silver_star_glacier
-- =========================================================================
-- fa misspells the second 1952 first-ascent party member's name as "Joe Heib"; every
-- source (American Alpine Club Climbs and Expeditions 1953, SummitPost) spells it
-- "Joe Hieb". This row's own corrections field already uses the correct "Hieb" spelling
-- when describing this same ascent -- the fa field itself was never updated to match.
UPDATE routes
SET fa = 'Fred Beckey, Joe Hieb, Herb Staley and Don Wilde, May 1952'
WHERE id = 'wa_silver_star_glacier'
  AND fa = 'Fred Beckey, Joe Heib, Herb Staley and Don Wilde, May 1952';

COMMIT;
