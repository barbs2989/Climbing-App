-- WA alpine/mountaineering audit -- batch 463 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_trapper_mountain_north_couloir, wa_traverse_of_mount_index, wa_true_grit_2,
--         wa_tupshin_peak_east_face, wa_tye_peak_e_route, wa_ultramega_ok,
--         wa_union_peak_se_route, wa_up_in_arms
--
-- All current values below were re-read from the live DB via the read-only anon key
-- immediately before this file was written; each UPDATE carries a guard on that current
-- value so it cannot silently no-op or clobber an unrelated edit.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Concord Tower, Up In Arms -- wa_up_in_arms
-- =========================================================================
-- Same stale 7569 figure five prior passes (batch 102, batch 156, and this pass's own
-- batches 454/455/458) have already converged on fixing for this peak's sibling routes
-- (wa_south_face_3, wa_south_face_center, wa_the_cave_route), all moving 7569 -> 7560 on
-- Mountain Project / SummitPost agreement -- and wa_up_in_arms was named explicitly, each
-- time, as still outstanding on the peak. This batch reaches it. Re-confirmed again this
-- run: Mountain Project and SummitPost both independently give Concord Tower's summit as
-- 7,560 ft; no source found anywhere supports 7,569. (The area's own blurb separately notes
-- a second ~7,611-7,612 ft LIDAR figure also in circulation for this peak -- left
-- unresolved, not re-litigated here, same as every prior batch on this peak.)
-- Still outstanding on this peak after this batch: wa_concord_tower_north_face (7611) and
-- areas.wa_concord_tower.elevation_ft (still 7611).
UPDATE routes
SET high_point_ft = 7560
WHERE id = 'wa_up_in_arms' AND high_point_ft = 7569;

COMMIT;
