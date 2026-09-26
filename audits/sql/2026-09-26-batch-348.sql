-- WA alpine/mountaineering audit -- batch 348 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_mount_rainier_gibraltar_ledges, wa_mount_rainier_ingraham_direct,
--         wa_mount_rainier_kautz_glacier, wa_mount_rainier_kautz_headwall,
--         wa_mount_rainier_liberty_ridge, wa_mount_rainier_mowich_face,
--         wa_mount_rainier_nisqually_icefall, wa_mount_rainier_ptarmigan_ridge
-- All values below were re-read from the live DB immediately before this file was written;
-- each UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Mount Rainier, Liberty Ridge (wa_mount_rainier_liberty_ridge) -- road.status
-- =========================================================================
-- Stored White River Road (off SR 410) season was "typically open late June-early October".
-- NPS's own historical seasonal-road-opening notices for White River Road show it typically
-- opens in mid-to-late May (as early as May 1 in some years) and closes mid-to-late October --
-- a materially earlier opening than stored, which would wrongly tell an early-May-window
-- Liberty Ridge party (this route's own best_season is "Mid-May to mid-June") that they cannot
-- drive to the trailhead yet.
UPDATE routes SET road = jsonb_set(road, '{status}',
  '"Seasonal, typically opens mid-to-late May (as early as May 1 in some years) and closes mid-to-late October (early-season approaches may start from the gate before the road opens)."'::jsonb)
WHERE id = 'wa_mount_rainier_liberty_ridge'
  AND road ->> 'status' LIKE '%typically open late June%early October%may start from the gate%';

-- =========================================================================
-- Mount Rainier, Ptarmigan Ridge (wa_mount_rainier_ptarmigan_ridge) -- road.status
-- =========================================================================
-- Same White River Road stale-season issue as Liberty Ridge above, on this route's shared
-- trailhead approach.
UPDATE routes SET road = jsonb_set(road, '{status}',
  '"Paved, seasonal — typically opens mid-to-late May (as early as May 1 in some years) and closes mid-to-late October. This is the approach the stored trailhead uses."'::jsonb)
WHERE id = 'wa_mount_rainier_ptarmigan_ridge'
  AND road ->> 'status' LIKE '%typically open late June to early October%this is the approach the stored trailhead uses%';

COMMIT;
