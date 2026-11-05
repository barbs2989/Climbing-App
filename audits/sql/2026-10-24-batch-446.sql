-- WA alpine/mountaineering audit -- batch 446 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_poltergeist_pinnacle_north_route, wa_preacher_mountain_east_gully,
--         wa_preacher_mountain_north_route, wa_preacher_mountain_scramble,
--         wa_preacher_mountain_south_gully_south_spur, wa_preacher_mountain_south_rib,
--         wa_preacher_mountain_west_face, wa_primus_peak_south_ridge
--
-- All current values below were re-read from the live DB via the read-only anon key
-- immediately before this file was written; each UPDATE carries a guard on that current
-- value so it cannot silently no-op or clobber an unrelated edit.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Poltergeist Pinnacle, East Face -- wa_poltergeist_pinnacle_north_route
-- =========================================================================
-- waypoints[0] "Hannegan Pass Trailhead" stores lat/lng 48.910185/-121.591971 -- off by
-- ~190m from the official USFS trailhead page (fs.usda.gov/r06/mbs/recreation/
-- hannegan-trailhead: Latitude 48.91049444, Longitude -121.5894222). This SAME row
-- already has that exact correct USFS figure in its own approach_logistics.trailheadLat/
-- trailheadLng field -- the waypoints entry just disagrees with the row's own other field.
-- Corrected the waypoint to match the row's own (and USFS's) more accurate coordinate.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,lat}', '48.91049444'::jsonb)
WHERE id = 'wa_poltergeist_pinnacle_north_route'
  AND waypoints #>> '{0,name}' = 'Hannegan Pass Trailhead'
  AND waypoints #>> '{0,lat}' = '48.910185';

UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,lng}', '-121.5894222'::jsonb)
WHERE id = 'wa_poltergeist_pinnacle_north_route'
  AND waypoints #>> '{0,name}' = 'Hannegan Pass Trailhead'
  AND waypoints #>> '{0,lng}' = '-121.591971';

COMMIT;
