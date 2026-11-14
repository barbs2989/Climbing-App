-- WA alpine audit -- batch 154 (2026-08-27, pass 3)
-- Routes: wa_mount_terror_north_face, wa_mount_terror_southeast_face,
-- wa_mount_terror_stoddard_buttress, wa_mount_terror_west_ridge,
-- wa_mount_thomson_west_ridge, wa_mount_tom_scramble,
-- wa_mount_torment_south_ridge, wa_mount_torment_torment_forbidden_traverse.
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention. Apply each UPDATE individually rather than
-- pasting the whole file at once.

-- =========================================================================
-- Mount Terror (wa_mount_terror) -- all four routes on this peak
-- =========================================================================

-- All four Mount Terror routes stored an identical gain_ft of 6000, which is
-- physically impossible: every route's own approach_logistics/waypoints
-- record the shared Goodell Creek trailhead at 600 ft, and the peak's own
-- high_point_ft (and areas.wa_mount_terror.elevation_ft) is 8151 ft -- a
-- one-way net rise of 7551 ft that a stored total gain of 6000 ft cannot
-- possibly cover (a route can gain MORE than the trailhead-to-summit net
-- rise, due to intermediate ups and downs on the approach, but never less).
-- wa_mount_terror_north_face's own waypoint list makes this concrete: summing
-- only its ascending segments (600->1700->5000->6200, then a dip to the
-- 5800 ft Terror Basin bivy, then 5800->6500->7700->8151) gives 7951 ft of
-- climbing/hiking gain from its own recorded elevations alone, before any
-- external source is consulted. Independently corroborated by web search:
-- multiple trip reports for the Goodell Creek approach describe an elevation
-- range from 600 ft to the 8,151 ft summit (~7,500 ft of net one-way gain),
-- and one detailed trip report logs roughly 12,500 ft gained-and-lost for
-- the round trip -- both far above the stored 6000 ft one-way figure.
-- Corrected all four routes to 7551 ft, the exact net-rise floor computed
-- from each row's own high_point_ft (8151) minus its own trailhead waypoint
-- elevation (600) -- a conservative, mechanically-derived minimum rather
-- than an invented number. The true value may be somewhat higher (per the
-- ~7951 ft figure derivable from wa_mount_terror_north_face's own waypoints,
-- reflecting the shared basin dip all four routes' approaches pass through),
-- but 7551 ft is the only value confirmable from every row's own stored data
-- without borrowing from a sibling route.
UPDATE routes
SET gain_ft = 7551
WHERE id = 'wa_mount_terror_north_face'
  AND gain_ft = 6000
  AND high_point_ft = 8151;

UPDATE routes
SET gain_ft = 7551
WHERE id = 'wa_mount_terror_southeast_face'
  AND gain_ft = 6000
  AND high_point_ft = 8151;

UPDATE routes
SET gain_ft = 7551
WHERE id = 'wa_mount_terror_stoddard_buttress'
  AND gain_ft = 6000
  AND high_point_ft = 8151;

UPDATE routes
SET gain_ft = 7551
WHERE id = 'wa_mount_terror_west_ridge'
  AND gain_ft = 6000
  AND high_point_ft = 8151;
