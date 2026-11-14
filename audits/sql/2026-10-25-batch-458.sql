-- WA alpine/mountaineering audit -- batch 458 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_table_mountain_standard_scramble, wa_tenpeak_mountain_north_couloir,
--         wa_tenpeak_mountain_southeast, wa_the_brothers_south_couloir,
--         wa_the_brothers_traverse, wa_the_cave_route,
--         wa_the_chopping_block_northeast_ridge, wa_the_chopping_block_northwest_route
--
-- All current values below were re-read from the live DB via the read-only anon key
-- immediately before this file was written; each UPDATE carries a guard on that current
-- value so it cannot silently no-op or clobber an unrelated edit.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Concord Tower, The Cave Route -- wa_the_cave_route
-- =========================================================================
-- Same stale 7569 figure that batches 454/455 already fixed on this peak's sibling routes
-- (wa_south_face_3, wa_south_face_center) -- this row was flagged as still outstanding in
-- batch 455's note and is now reached by the scan. SummitPost and Mountain Project both
-- list Concord Tower's summit at 7,560 ft (confirmed again independently this run); no
-- source found anywhere supports 7,569. The area's own blurb (areas.wa_concord_tower)
-- separately notes a second, higher LIDAR figure (~7,611-7,612 ft) as also in circulation
-- and leaves it unresolved -- not re-litigated here, this fix only replaces the
-- unsupported 7,569 with the figure three independent prior passes (batch 102, batch 156,
-- and this one) converged on via MP/SummitPost.
-- Still outstanding on this peak after this batch: wa_around_the_cave_we_go, wa_up_in_arms,
-- wa_concord_tower_north_face, and areas.wa_concord_tower.elevation_ft (still 7611) -- not
-- yet reached by the scan this pass.
UPDATE routes
SET high_point_ft = 7560
WHERE id = 'wa_the_cave_route' AND high_point_ft = 7569;

COMMIT;
