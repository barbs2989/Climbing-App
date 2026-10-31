-- WA alpine/mountaineering audit -- batch 466 (pass 8, batch 1)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_a_servant_to_liberty, wa_abernathy_peak_south_ridge,
--         wa_accendo_lunae_lib_west_face_var, wa_action_potential,
--         wa_agnes_mountain_south_ridge, wa_alpine_lookout_round_mountain_trail,
--         wa_american_border_peak_northeast_face, wa_american_border_peak_southeast_face
--
-- All current values below were re-read from the live DB via the read-only anon key
-- immediately before this file was written; each UPDATE carries a guard on that current
-- value so it cannot silently no-op or clobber an unrelated edit.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Burgundy Spire -- area wa_burgundy_spire (elevation_ft = 8483), route
-- wa_action_potential (East Face)
-- =========================================================================
-- Action Potential is the only route on Burgundy Spire that disagrees with the
-- peak's own area row: it stores high_point_ft = 8492, while the area row itself
-- is 8483 ft and sibling route Ultramega OK (wa_ultramega_ok) also stores 8483 ft.
-- A Lemke Climbs trip report independently gives the summit as 8,483 ft/2,586 m,
-- matching the area row and Ultramega OK; no source found supports 8492. (A third
-- sibling, North Face, stores 8400 ft -- matching SummitPost/The Mountaineers --
-- but that pre-existing area-vs-SummitPost split is not this batch's routes and is
-- left untouched.) Correcting Action Potential's high_point_ft to match its own
-- peak's area row and the sibling route that agrees with an independent source.
UPDATE routes
SET high_point_ft = 8483
WHERE id = 'wa_action_potential' AND high_point_ft = 8492;

COMMIT;
