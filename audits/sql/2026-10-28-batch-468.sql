-- WA alpine/mountaineering audit -- batch 468 (pass 8)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_argonaut_peak_northeast_couloir, wa_around_the_cave_we_go,
--         wa_arrowhead_mountain_south_route, wa_austera_peak, wa_austera_peak_southwest_ridge,
--         wa_bacon_peak_diobsud, wa_bald_eagle_peak_daniel_glacier, wa_bald_eagle_peak_south_spur
-- All values below were re-read from the live DB immediately before this file was written;
-- each UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Austera Peak (wa_austera_peak) -- waypoint mislabeled (RE-PROPOSED)
-- =========================================================================
-- This exact fix was already proposed in audits/sql/2026-10-07-batch-381.sql (pass 7,
-- batch 381) but the live row still reads "Klawatti col" at this waypoint as of this
-- run (2026-10-28) -- the prior SQL appears not to have been applied yet. Re-confirmed
-- this pass: the waypoint at elev 7900 ("Junction", note "rappel ~75 ft to the Klawatti
-- Glacier") is actually the separate Klawatti-Austera col one ridge segment past the true
-- Klawatti Col (~7,800 ft). AAC Publications' route description and the Mountaineers.org
-- Inspiration-McAllister-Klawatti Ice Cap Traverse page both distinguish the two features,
-- and the sibling row wa_austera_peak_southwest_ridge already names this same 7,900 ft
-- feature "Klawatti-Austera Col" correctly.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{2,name}', '"Klawatti-Austera col"')
WHERE id = 'wa_austera_peak'
  AND waypoints -> 2 ->> 'name' = 'Klawatti col'
  AND (waypoints -> 2 ->> 'elev')::int = 7900;

COMMIT;
