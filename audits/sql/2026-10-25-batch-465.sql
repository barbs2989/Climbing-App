-- WA alpine/mountaineering audit -- batch 465 (pass 7, final batch of this pass)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_white_mountain_olympics_scramble, wa_whitehorse_mountain_nw_shoulder,
--         wa_winchester_mountain_south_trail, wa_witches_tower_northwest_buttress,
--         wa_witches_tower_south_face, wa_witches_tower_southwest_corner,
--         wa_witches_tower_west_buttress, wa_wolframite_mountain_scramble
--
-- All current values below were re-read from the live DB via the read-only anon key
-- immediately before this file was written; each UPDATE carries a guard on that current
-- value so it cannot silently no-op or clobber an unrelated edit.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Whitehorse Mountain -- area wa_whitehorse_mountain, route
-- wa_whitehorse_mountain_nw_shoulder (Northwest Shoulder)
-- =========================================================================
-- Stored elevation is 6851 ft (area.elevation_ft) / 6852 ft (route.high_point_ft).
-- Three independent sources converge on a materially lower figure: Wikipedia's
-- infobox gives 6,840+ ft (NGVD 29), SummitPost gives 6,840 ft, and Living
-- Wilderness (a North Cascades-focused photo/reference site) also gives 6,840 ft.
-- No source found supports 6851/6852. Correcting both columns to 6840, the figure
-- every reachable source agrees on.
UPDATE areas
SET elevation_ft = 6840
WHERE id = 'wa_whitehorse_mountain' AND elevation_ft = 6851;

UPDATE routes
SET high_point_ft = 6840
WHERE id = 'wa_whitehorse_mountain_nw_shoulder' AND high_point_ft = 6852;

COMMIT;
