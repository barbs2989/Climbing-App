-- WA alpine/mountaineering audit -- batch 455 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_south_face_center, wa_south_gully_south_spur, wa_south_headwall, wa_south_rib,
--         wa_south_ridge_4, wa_south_twin_sister_north_ridge, wa_southeast_face,
--         wa_southeast_mox_peak_se_rib
--
-- All current values below were re-read from the live DB via the read-only anon key
-- immediately before this file was written; each UPDATE carries a guard on that current
-- value so it cannot silently no-op or clobber an unrelated edit.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Concord Tower, South Face Center -- wa_south_face_center
-- =========================================================================
-- Same stale 7569/7611 pair batch 454 (2026-10-24, same day) fixed on the sibling route
-- wa_south_face_3 and flagged as still outstanding on this peak's other routes. No source
-- found anywhere supports either 7569 or 7611: two independent prior passes (batch 102,
-- 2026-08-12; batch 156, 2026-08-27) converged on ~7,559-7,560 ft via Mountain Project,
-- SummitPost and mountain-forecast.com, and that figure is what wa_north_face_var_right_
-- directisimo already carries live today. Bringing this row in line with the
-- already-established, repeatedly-reconfirmed figure.
-- NOTE for a human: wa_the_cave_route, wa_around_the_cave_we_go, wa_up_in_arms,
-- wa_concord_tower_north_face and areas.wa_concord_tower.elevation_ft still carry the
-- stale 7569/7611 values as of this run -- out of this batch's scope (not yet reached /
-- not yet re-audited this pass) but worth a human batch-applying the same 7560 fix across
-- all of them rather than one row at a time.
UPDATE routes
SET high_point_ft = 7560
WHERE id = 'wa_south_face_center' AND high_point_ft = 7569;

UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elev}', '7560'::jsonb)
WHERE id = 'wa_south_face_center'
  AND waypoints #>> '{1,name}' = 'Concord Tower Summit'
  AND waypoints #>> '{1,elev}' = '7611';

-- =========================================================================
-- Mount Stuart, South Headwall -- wa_south_headwall
-- =========================================================================
-- gain_ft (5009) is less than this row's own TH-to-summit net rise (9415-4269 = 5146),
-- impossible for a route ending higher than it starts. The row's own data pins the true
-- profile higher still: its bivy entry ("Ingalls Creek basin camp") sits at 4800 ft,
-- "reached from... Longs Pass at about 6,200 ft and then dropping roughly 1,400 ft" (6200
-- -1400 = 4800, confirming the drop is real). Approach text then climbs from that creek
-- crossing to the "cirque at about 8,700 ft" before 5 pitches to the 9415 ft summit:
--   TH 4269 -> Longs Pass 6200 (+1931) -> creek 4800 (-1400) -> cirque 8700 (+3900)
--   -> summit 9415 (+715) = 6546 ft one-way cumulative gain.
-- No source found either way for this route name or its 1966 FA party (see audit log) --
-- not touched here; flagged for human review. This fixes only gain_ft, wrong by the row's
-- own waypoints and bivy entry alone.
UPDATE routes
SET gain_ft = 6546
WHERE id = 'wa_south_headwall' AND gain_ft = 5009;

COMMIT;
