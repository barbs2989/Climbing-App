-- WA Alpine Audit — Pass 1, Batch 22 — 2026-07-30
-- Peaks: Mount Adams (Adams Glacier, Lava Glacier Headwall, Lyman Glacier,
--        Mazama Glacier Headwall, North Ridge, Northwest Ridge, South Climb,
--        Wilson Glacier Headwall), Mount Anderson (Eel Glacier / Flypaper
--        Pass), Mount Baker (Boulder Glacier / Boulder Cleaver)

-- =========================================================================
-- Mount Adams — Adams Glacier
-- =========================================================================

-- wa_mount_adams_adams_glacier: high_point_ft stored as 12281, contradicting
-- this same row's own watch_out text ("Alpine ice terrain at high elevation
-- (12,276 ft)"), the parent area's elevation_ft (12276), and all 7 other
-- Mount Adams routes in this batch (all already 12276). Wikipedia's current
-- infobox lists 12,281 ft NAVD88 while USGS/most other sources use 12,276 ft
-- -- a genuine external datum split (flagged separately below for a human to
-- standardize peak-wide) -- but within this DB the row contradicts itself and
-- every sibling, so aligning to the unanimous internal value.
UPDATE routes SET high_point_ft = 12276 WHERE id = 'wa_mount_adams_adams_glacier';

-- =========================================================================
-- Mount Adams — Wilson Glacier Headwall
-- =========================================================================

-- wa_mount_adams_wilson_glacier_headwall: the summit waypoint (waypoints[1])
-- is stamped elevFt 12280, contradicting this same row's own high_point_ft
-- (12276) and every other Mount Adams route in this batch (all 12276).
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '12276')
WHERE id = 'wa_mount_adams_wilson_glacier_headwall';

-- wa_mount_adams_wilson_glacier_headwall: access.notes falsely stated this
-- Mount Adams (South Cascades) route is in the "Mount Tom area, North
-- Cascades" -- Mount Tom is an unrelated peak nowhere near Mount Adams. This
-- is the identical boilerplate clause already found and stripped from 2 of
-- 35 DB-wide affected routes in batch 15 (wa_guye_peak_south_gully,
-- wa_icy_peak_southwest_route); same contamination, same fix.
UPDATE routes
SET access = jsonb_set(
  access,
  '{notes}',
  '"Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit."'
)
WHERE id = 'wa_mount_adams_wilson_glacier_headwall';
