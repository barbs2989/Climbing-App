-- WA alpine/mountaineering audit -- batch 469 (pass 8)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_bald_eagle_peak_southwest_route, wa_baldy_standard,
--         wa_baring_mountain_east_face, wa_baring_mountain_oatmeal_man,
--         wa_baring_mountain_r1, wa_bear_mountain_chilliwack_north_buttress,
--         wa_bears_breast_mountain_infinite_beauty, wa_bears_breast_mountain_southwest_face
--
-- All current values below were re-read from the live DB via the read-only anon key
-- immediately before this file was written; each UPDATE carries a guard on that current
-- value so it cannot silently no-op or clobber an unrelated edit.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Baldy (Gray Wolf Ridge, Olympics) -- area wa_baldy (elevation_ft = 6808),
-- route wa_baldy_standard (Standard Route)
-- =========================================================================
-- high_point_ft stores 6827, but every other signal on this exact entry says 6808:
-- the parent area row's elevation_ft (6808), the route's own last waypoint ("Baldy
-- summit", elev 6808), and the route's own data_quality.gaps note, which states in
-- plain text that "6,808 ft was used as the most consistently repeated figure" --
-- i.e. the research behind this entry already decided on 6808 ft, but the
-- high_point_ft column was never updated to match. External sources genuinely vary
-- (SummitPost 6808/6827 inconsistently, Wikipedia 6797, TopoQuest 6817, trip reports
-- 6827), so 6808 is not asserted here as the one true elevation -- only as the figure
-- this entry already committed to and that its own other fields already carry.
UPDATE routes
SET high_point_ft = 6808
WHERE id = 'wa_baldy_standard' AND high_point_ft = 6827;

COMMIT;
