-- WA alpine/mountaineering audit -- batch 464 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_upper_north_ridge_w_great_gendarme, wa_vasiliki_ridge_standard,
--         wa_wallaby_peak_standard, wa_warrior_peak_standard,
--         wa_washington_ellinor_traverse_ridge, wa_west_craggy_peak_standard_route,
--         wa_west_face_2, wa_west_twin_needle_south_route
--
-- All current values below were re-read from the live DB via the read-only anon key
-- immediately before this file was written; each UPDATE carries a guard on that current
-- value so it cannot silently no-op or clobber an unrelated edit.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Vasiliki Ridge, Standard Route (Ares Tower) -- wa_vasiliki_ridge_standard
-- =========================================================================
-- This row's own `corrections` column already documents the research: Wikipedia's
-- commonly-cited 8,190 ft is the older, rounded figure, while a 2025 dGPS survey
-- (countryhighpoints.com, cross-checked, consistent with newer USGS LiDAR) measured
-- Ares Tower's actual summit at 8,202.8 ft +/-0.1 ft (NAVD88) -- and that text states
-- outright "the more precise 8,203 ft figure is used here as highPointFt". The stored
-- high_point_ft is still 8190, not 8203: the correction described was never applied to
-- the column. Fixing it to match what the route's own documented research already
-- concluded.
UPDATE routes
SET high_point_ft = 8203
WHERE id = 'wa_vasiliki_ridge_standard' AND high_point_ft = 8190;

-- =========================================================================
-- North (Gunsight) Peak, West Face -- wa_west_face_2
-- =========================================================================
-- Stored `fa` gives the 1986 Jim Nelson & Carl Dietrich first ascent as "5.10 A2, with
-- aid". Alpinist's NewsWire writeup on the 2007 first free ascent (which covers the same
-- climbing history) states the original aid grade as 5.10 A1, not A2 -- "Established by
-- Jim Nelson ... and Carl Dietrich in 1986 at 5.10 A1" -- and no source found anywhere
-- supports A2. FFA climbers/year (Max Hasson & Jens Holsten, 2007) and free grade
-- (5.11+) are independently corroborated by the same source and left unchanged.
UPDATE routes
SET fa = 'Jim Nelson & Carl Dietrich, 1986 (5.10 A1, with aid), FFA by Max Hasson & Jens Holsten, 2007 (5.11+)'
WHERE id = 'wa_west_face_2'
  AND fa LIKE 'Jim Nelson & Carl Dietrich, 1986 (5.10 A2, with aid)%';

COMMIT;
