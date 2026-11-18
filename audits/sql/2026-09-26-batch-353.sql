-- WA alpine/mountaineering audit -- batch 353 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_mount_thomson_west_ridge, wa_mount_tom_scramble,
--         wa_mount_torment_south_ridge, wa_mount_torment_torment_forbidden_traverse,
--         wa_mount_townsend_standard, wa_mount_triumph_northeast_ridge,
--         wa_mount_washington_olympic_winter_direct, wa_mount_wilder_scramble
-- All values below were re-read from the live DB immediately before this file was written;
-- the UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Mount Torment - Forbidden Peak Traverse (wa_mount_torment_torment_forbidden_traverse) -- beta
-- =========================================================================
-- This row contradicts itself on the grade of the finishing pitch (Forbidden
-- Peak's West Ridge): `rock_grade` = '5.6', `overview` states "never harder
-- than 5.6", and `pitch_detail` pitch 5 says "4th/5.6" -- but `beta` calls the
-- same finish "(5.7, 50 classic)". External corroboration favors 5.6 (Steph
-- Abegg's route page title "Forbidden Peak, West Ridge (5.6)"; BC Adventure
-- Guides and other independent trip-report/guide-service sources cite III 5.6;
-- only one guide-service listing used 5.7). Correcting the outlier field to
-- match the other three fields on this same row and the external majority.
UPDATE routes
SET beta = 'The Torment-Forbidden Traverse is a multi-day alpine adventure combining Mount Torment''s South Ridge approach with a mile-long exposed ridge traverse to neighboring Forbidden Peak (8,815 ft), finishing via the famous Forbidden West Ridge (5.6, 50 classic). The route crosses the Taboo Glacier, climbs to Mount Torment''s summit via the south ridge, then descends and traverses the Forbidden Glacier before ascending the knife-edge ridge with exposure on both sides. Climbers must move quickly, efficiently protect themselves, and be capable of 5.6 rock climbing with a medium pack over 12+ continuous hours.'
WHERE id = 'wa_mount_torment_torment_forbidden_traverse'
  AND beta = 'The Torment-Forbidden Traverse is a multi-day alpine adventure combining Mount Torment''s South Ridge approach with a mile-long exposed ridge traverse to neighboring Forbidden Peak (8,815 ft), finishing via the famous Forbidden West Ridge (5.7, 50 classic). The route crosses the Taboo Glacier, climbs to Mount Torment''s summit via the south ridge, then descends and traverses the Forbidden Glacier before ascending the knife-edge ridge with exposure on both sides. Climbers must move quickly, efficiently protect themselves, and be capable of 5.6 rock climbing with a medium pack over 12+ continuous hours.';

COMMIT;
