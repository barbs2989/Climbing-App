-- WA alpine/mountaineering audit -- batch 355 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_north_face_3, wa_north_face_left_buttress, wa_north_face_var_right_directisimo,
--         wa_north_gardner_mountain_nw_couloir, wa_north_gardner_mountain_southwest,
--         wa_north_ridge_3, wa_north_ridge_4, wa_north_star_mountain_east_route
-- All values below were re-read from the live DB immediately before this file was written;
-- each UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- North Face Var. Right (Directisimo) (wa_north_face_var_right_directisimo)
-- -- high_point_ft and summit waypoint elevation
-- =========================================================================
-- This route sits on Concord Tower (area_id wa_concord_tower), whose own area row
-- already stores elevation_ft = 7611 -- but this route's high_point_ft and its own
-- "Concord Tower Summit" waypoint both store 7560 ft instead, apparently inherited from
-- neighboring Lexington Tower (7,560 ft, confirmed via Peakbagger/SummitPost/Wikipedia/
-- Mountain Project), a separate, similarly-named tower one col over in the same group.
-- Three independent external sources for Concord Tower itself agree closely and all
-- contradict 7,560 ft: Peakbagger lists 7610.6 ft, ListsOfJohn's LiDAR-derived figure is
-- 7,612 ft, and this app's own wa_concord_tower area row already has 7611 ft. This
-- route's own prior "corrections" note (dated 2026-07-31) claims external sources
-- "consistently give Concord Tower a 7,560 ft summit" -- that claim does not hold up;
-- 7,560 ft is Lexington Tower's summit, not Concord Tower's. Correcting both fields to
-- 7611 ft to match the area row and the converging external measurements.
UPDATE routes SET high_point_ft = 7611
WHERE id = 'wa_north_face_var_right_directisimo'
  AND high_point_ft = 7560;

UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elev}', '7611')
WHERE id = 'wa_north_face_var_right_directisimo'
  AND waypoints -> 1 ->> 'name' = 'Concord Tower Summit'
  AND (waypoints -> 1 ->> 'elev')::int = 7560;

-- =========================================================================
-- North Ridge, Cutthroat Peak (wa_north_ridge_3) -- summit waypoint elevation
-- =========================================================================
-- This route's own high_point_ft (8065) already matches its area row (wa_cutthroat_peak,
-- elevation_ft = 8065) and the majority of external sources -- Peakbagger gives 8,065 ft
-- and Wikipedia gives 8,066 ft (only Wikidata's 8,050 ft is an outlier). But the route's
-- own "Cutthroat Peak Summit" waypoint stores elev/elevFt = 8050, contradicting the
-- route's own high_point_ft, the area row, and 2 of 3 external sources checked. Correcting
-- the waypoint to 8065 ft to agree with everything else on file for this peak.
UPDATE routes SET waypoints = jsonb_set(
    jsonb_set(waypoints, '{2,elev}', '8065'),
    '{2,elevFt}', '8065'
  )
WHERE id = 'wa_north_ridge_3'
  AND waypoints -> 2 ->> 'name' = 'Cutthroat Peak Summit'
  AND (waypoints -> 2 ->> 'elev')::int = 8050
  AND (waypoints -> 2 ->> 'elevFt')::int = 8050;

COMMIT;
