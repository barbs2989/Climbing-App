-- WA alpine/mountaineering audit -- batch 454 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_south_early_winter_spire_southwest_couloir, wa_south_face_10, wa_south_face_12,
--         wa_south_face_2, wa_south_face_3, wa_south_face_4, wa_south_face_5, wa_south_face_8
--
-- All current values below were re-read from the live DB via the read-only anon key
-- immediately before this file was written; each UPDATE carries a guard on that current
-- value so it cannot silently no-op or clobber an unrelated edit.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Cathedral Peak (Pasayten), South Face -- wa_south_face_10
-- =========================================================================
-- Summit waypoint (index 2) stores elev 8601, but this row's own high_point_ft is 8606 --
-- an internal self-contradiction for the same point. A 2026-08-12 pass (batch 102) found
-- this split traces to a real external datum dispute (GNIS/NAVD88 = 8606; the
-- traditional/NGVD29-era figure most trip reports use = 8601; a 2020s LiDAR resurvey =
-- 8599) and deliberately left it unresolved pending a human decision on which convention
-- this database standardizes on. A later pass (batch 182, 2026-08-27) independently
-- reconfirmed 8,606 ft for this peak (this row's own high_point_ft already carries that
-- figure) and this catalog's sibling Cathedral Peak route (wa_cathedral_peak_pasayten_se_
-- buttress) stores 8606 consistently with no internal split. Bringing this row's outlying
-- waypoint into line with its own high_point_ft and the sibling route, so the catalog is at
-- least internally consistent -- the underlying external datum question (8606 vs 8601 vs
-- 8599) remains open and is not re-litigated here.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{2,elev}', '8606'::jsonb)
WHERE id = 'wa_south_face_10'
  AND waypoints #>> '{2,name}' = 'Cathedral Peak summit'
  AND waypoints #>> '{2,elev}' = '8601'
  AND high_point_ft = 8606;

-- =========================================================================
-- Argonaut Peak, South Face -- wa_south_face_12
-- =========================================================================
-- Summit waypoint (index 6) stores elev 8453 against this row's own high_point_ft of 8457.
-- 8,457 ft is Wikipedia's figure for Argonaut Peak and has been independently reconfirmed
-- against Wikipedia/USGS-derived data across at least three separate prior passes (batches
-- noted 2026-07-30, 2026-08-07 and 2026-08-27 in this audit's own log); a 2026-08-12 pass
-- (batch 102) already identified this exact waypoint as carrying a "stale 8,453 ft"
-- elevation and proposed the same fix below -- that proposal was apparently never applied
-- (the live row still shows the contradiction), so it is re-proposed here unchanged.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{6,elev}', '8457'::jsonb)
WHERE id = 'wa_south_face_12'
  AND waypoints #>> '{6,name}' = 'Argonaut Peak summit (west summit, true)'
  AND waypoints #>> '{6,elev}' = '8453'
  AND high_point_ft = 8457;

-- =========================================================================
-- Concord Tower, South Face -- wa_south_face_3
-- =========================================================================
-- high_point_ft (7569) matches no source found anywhere, and the summit waypoint (index 1,
-- 7611) matches only ListsOfJohn's disputed figure for this peak -- not the same-peak
-- consensus. Three independent sources found this run (Mountain Project, SummitPost,
-- mountain-forecast.com) all converge tightly on ~7,559-7,560 ft. This matches two separate
-- prior passes' independent conclusions: batch 102 (2026-08-12) found "no source anywhere
-- supports 7,569" and fixed Concord Tower's South Face/South Face Center routes to 7560;
-- batch 156 (2026-08-27), re-checking after a different pass had moved a sibling route's
-- figure to 7611 citing ListsOfJohn, found via two independent WebSearch queries that
-- "7,611 appears in no source found" and brought the area row and
-- wa_north_face_var_right_directisimo back to 7560 (that route's live high_point_ft is
-- 7560 today, confirming that fix WAS applied). This row (South Face) was evidently never
-- brought into that same, already-settled correction -- fixing it here to match the
-- established, repeatedly-reconfirmed 7560 ft figure and its own summit waypoint for
-- internal consistency.
-- NOTE for a human: four more sibling routes on this same peak (wa_the_cave_route,
-- wa_around_the_cave_we_go, wa_south_face_center, wa_up_in_arms) plus
-- wa_concord_tower_north_face and areas.wa_concord_tower.elevation_ft still carry the
-- stale 7569/7611 values as of this run -- out of this batch's scope (not yet reached /
-- not yet re-audited this pass) but worth a human batch-applying the same 7560 fix across
-- all of them rather than one row at a time.
UPDATE routes
SET high_point_ft = 7560
WHERE id = 'wa_south_face_3' AND high_point_ft = 7569;

UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elev}', '7560'::jsonb)
WHERE id = 'wa_south_face_3'
  AND waypoints #>> '{1,name}' = 'Concord Tower Summit'
  AND waypoints #>> '{1,elev}' = '7611';

-- =========================================================================
-- Inspiration Peak, South Face -- wa_south_face_5
-- =========================================================================
-- Top-level length_m (305 = ~1000ft) contradicts this same row's own 4-entry pitch_detail
-- array (50+40+35+35 = 160m) and its own overview text ("about 600 ft (4 pitches)").
-- pitches is already correctly 4. A 2026-08-12 pass (batch 102) identified this same
-- contradiction and proposed correcting length_m to 160m; that proposal was apparently
-- never applied (the live row still shows 305) and is re-proposed here unchanged.
UPDATE routes
SET length_m = 160
WHERE id = 'wa_south_face_5' AND length_m = 305 AND pitches = 4;

COMMIT;
