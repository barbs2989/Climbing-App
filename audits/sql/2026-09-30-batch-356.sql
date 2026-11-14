-- WA alpine/mountaineering audit -- batch 356 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_northeast_buttress_4, wa_northeast_face_direct, wa_northeast_ridge_1963_route,
--         wa_northwest_arete, wa_northwest_buttress, wa_northwest_face_2, wa_northwest_face_4,
--         wa_northwest_face_boving_pollock
-- All values below were re-read from the live DB immediately before this file was written;
-- each UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Northeast Ridge (1963 Route), Johannesburg Mountain (wa_northeast_ridge_1963_route)
-- -- summit waypoint `elev` vs its own `elevFt`, the route's own high_point_ft,
-- -- and the area row, all of which already agree on 8,200 ft
-- =========================================================================
-- This route's own "Johannesburg Mountain" summit waypoint stores elev=8066 ft while
-- its sibling field on the SAME waypoint object, elevFt, already says 8200 ft -- matching
-- this route's own high_point_ft (8200) and the wa_johannesburg_mountain area row
-- (elevation_ft = 8200). External sources agree with the 8,200 side: Wikipedia's infobox
-- gives "8,200+ ft (2,500+ m) NGVD 29" and Peakbagger gives 8,210.5 ft; no source found
-- supports 8,066 ft for this peak. Correcting the outlier `elev` to match `elevFt` and
-- everything else on file.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{4,elev}', '8200')
WHERE id = 'wa_northeast_ridge_1963_route'
  AND waypoints -> 4 ->> 'name' = 'Johannesburg Mountain'
  AND (waypoints -> 4 ->> 'elev')::int = 8066
  AND (waypoints -> 4 ->> 'elevFt')::int = 8200;

-- =========================================================================
-- Northwest Face (Boving-Pollock), South Early Winters Spire (wa_northwest_face_boving_pollock)
-- -- `fa` field named the first FREE ascensionists, not the first ascensionists
-- =========================================================================
-- This route's own `name` ("...(Boving-Pollock)") and its own `overview` text
-- ("First ascended (aid) by Boving & Pollock in 1976; freed by Boving & Kerns in 1977.")
-- both correctly distinguish the 1976 aid FA (Boving & Pollock) from the 1977 first free
-- ascent (Boving & Kerns) -- but the row's separate `fa` field stores only "Boving and
-- Kerns, 1977", i.e. the FFA team/date, not the first ascent. Independently confirmed via
-- SuperTopo's route page for this exact route (titled "Northwest Face - South Early
-- Winters Spire", FA by Paul Boving & Steve Pollock, October 1976; FFA by Boving & Matt
-- Kerns, July 1977) and Mountain Project's page for this same route (also titled
-- "Northwest Face (Boving-Pollock)"). Correcting `fa` to name the actual first ascent,
-- consistent with the route's own name and its own overview text.
UPDATE routes SET fa = 'Boving and Pollock (aid), October 1976; first free ascent by Boving and Kerns, July 1977'
WHERE id = 'wa_northwest_face_boving_pollock'
  AND fa = 'Boving and Kerns, 1977';

COMMIT;
