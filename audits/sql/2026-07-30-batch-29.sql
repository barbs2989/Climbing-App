-- WA Alpine Audit — Pass 1, Batch 29 — 2026-07-30
-- Peaks: Mount Rahm (Standard Route), Mount Rainier (Curtis Ridge,
--        Disappointment Cleaver, Edmunds Headwall, Emmons-Winthrop
--        Glacier, Fuhrer Finger, Fuhrer Thumb, Gibraltar Ledges,
--        Ingraham Direct, Kautz Glacier)

-- =========================================================================
-- Mount Rahm
-- =========================================================================

-- wa_mount_rahm_standard: trailhead waypoint's note field contained a leaked
-- internal research comment ("Reused coordinate from this session's own
-- Devil's Club (Southeast Mox Peak) research...") instead of normal
-- descriptive text -- same leaked-audit-commentary pattern already fixed on
-- Mount Constance West Arete (batch 24) and Liberty Bell Serpentine Crack
-- (batch 19). Coordinates themselves are correct and unchanged.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,note}', '"Depot Creek Road trailhead off Chilliwack Lake Road, on the Canadian side of the border; the standard start for the cross-border approach to Rahm, Custer, Redoubt, and Spickard."', false)
WHERE id = 'wa_mount_rahm_standard'
  AND waypoints->0->>'name' = 'Depot Creek Road Trailhead'
  AND waypoints->0->>'note' LIKE 'Reused coordinate from this session%';

-- =========================================================================
-- Mount Rainier
-- =========================================================================

-- All of Disappointment Cleaver, Emmons-Winthrop Glacier, Fuhrer Finger,
-- Gibraltar Ledges, Ingraham Direct, and Kautz Glacier stored high_point_ft
-- 14410, the stale pre-2024-survey figure. The area row (wa_mount_rainier)
-- was already corrected to 14406 ft (NAVD88) in an earlier pass, matching
-- the Aug 2024 GPS survey (Gilbertson et al., "Mount Rainier Elevation
-- Survey 2024") that found the true summit is no longer icecapped Columbia
-- Crest but the rocky Southwest Rim, at 14,399.6 ft NGVD29 / 14,406.2 ft
-- NAVD88 -- these six routes were the sole outliers against their own area.
-- Fuhrer Finger, Gibraltar Ledges, and Ingraham Direct had already had their
-- own *waypoints* corrected to 14406 in a prior pass but not their
-- high_point_ft column (a self-contradiction); Disappointment Cleaver,
-- Emmons, and Kautz Glacier had neither field updated.

UPDATE routes
SET high_point_ft = 14406,
    waypoints = jsonb_set(waypoints, '{7,elev}', '14406', false)
WHERE id = 'wa_mount_rainier_disappointment_cleaver'
  AND high_point_ft = 14410
  AND waypoints->7->>'name' = 'Columbia Crest'
  AND (waypoints->7->>'elev')::numeric = 14410;

UPDATE routes
SET high_point_ft = 14406,
    waypoints = jsonb_set(waypoints, '{4,elev}', '14406', false)
WHERE id = 'wa_mount_rainier_emmons_glacier'
  AND high_point_ft = 14410
  AND waypoints->4->>'name' = 'Columbia Crest'
  AND (waypoints->4->>'elev')::numeric = 14410;

UPDATE routes
SET high_point_ft = 14406
WHERE id = 'wa_mount_rainier_fuhrer_finger'
  AND high_point_ft = 14410;

UPDATE routes
SET high_point_ft = 14406
WHERE id = 'wa_mount_rainier_gibraltar_ledges'
  AND high_point_ft = 14410;

UPDATE routes
SET high_point_ft = 14406
WHERE id = 'wa_mount_rainier_ingraham_direct'
  AND high_point_ft = 14410;

UPDATE routes
SET high_point_ft = 14406,
    waypoints = jsonb_set(waypoints, '{4,elev}', '14406', false)
WHERE id = 'wa_mount_rainier_kautz_glacier'
  AND high_point_ft = 14410
  AND waypoints->4->>'name' = 'Columbia Crest'
  AND (waypoints->4->>'elev')::numeric = 14410;

-- wa_mount_rainier_emmons_glacier: fa named "Warner Forbes, Jones, and
-- Wells, August 1884" -- confirmed via multiple sources (NPS Nature Notes
-- history, SummitPost, Snohomish-history accounts) the actual party was
-- Rev. J. Warner Fobes, George James, and Richard O. Wells on Aug 20, 1884
-- ("Forbes" is a misspelling of "Fobes", and "Jones" is simply the wrong
-- name -- it was James). Fixed to the corroborated names.
UPDATE routes
SET fa = 'Rev. J. Warner Fobes, George James, and Richard O. Wells, August 20, 1884 (first ski descent of the Emmons-Winthrop: Roberts, Bengtson, Welsh, Schmidtke, 1947)'
WHERE id = 'wa_mount_rainier_emmons_glacier'
  AND fa = 'Warner Forbes, Jones, and Wells, August 1884 (first ski descent: Roberts, Bengtson, Welsh, Schmidtke, 1947)';

-- wa_mount_rainier_kautz_glacier: fa claimed "route to the true summit
-- proven practicable by Joe Hazard of the Seattle Mountaineers in 1921 and
-- 1924" -- this does not match any source found. Multiple independent
-- sources (American Alpine Institute route history, a July 11, 1920 letter
-- from Roger Toll to Harry Myers in the UW Pacific NW Historical Documents
-- Collection responding to Myers's own account of the climb, and general
-- Rainier climbing-history summaries) agree the Kautz Glacier route's first
-- full ascent to the summit was June 26-28, 1920 by Hans Fuhrer, Heinie
-- Fuhrer, Roger Toll, and Harry Myers. Fixed to the corroborated history.
UPDATE routes
SET fa = 'Peak first approached via this line to ~12,000 ft by Wapowety, August V. Kautz, Dr. O.R. Craig and four soldiers, July 1857 (did not reach the true summit); first full ascent to the summit via this route completed June 26-28, 1920 by Hans Fuhrer, Heinie Fuhrer, Roger Toll, and Harry Myers.'
WHERE id = 'wa_mount_rainier_kautz_glacier'
  AND fa LIKE '%Joe Hazard of the Seattle Mountaineers in 1921 and 1924%';

-- wa_mount_rainier_fuhrer_thumb: gain_ft stored as 3599, contradicting this
-- same row's own waypoints (Paradise trailhead 5,400 ft -> Columbia Crest
-- summit 14,406 ft implies ~9,006 ft of gain) and its own loss_ft (9000,
-- descending a different line back to Paradise). 3599 has no support
-- anywhere else in the row -- fixed to match the row's own elevation data
-- and loss_ft.
UPDATE routes
SET gain_ft = 9000
WHERE id = 'wa_mount_rainier_fuhrer_thumb'
  AND gain_ft = 3599;
