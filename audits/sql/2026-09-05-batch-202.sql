-- WA alpine audit, pass 4, batch 202 (2026-09-05)
-- Routes covered: wa_little_tahoma_east_shoulder, wa_live_free_or_die,
-- wa_lizard_mountain_south_route, wa_luahna_peak_southwest_slope_southeast_ridge,
-- wa_luna_glacier, wa_luna_peak_southeast_slopes, wa_lundin_peak_south_face_left,
-- wa_magic_mountain_north_face

-- wa_lizard_mountain_south_route: high_point_ft (7420) disagreed with both this row's
-- own Summit waypoint (waypoints[7].elev = 7399, "Lizard Mountain") and this app's own
-- areas.elevation_ft for wa_lizard_mountain (7399). Two independently-stored records
-- agree at 7399; only the summary high_point_ft field held the stale 7420.
UPDATE routes
SET high_point_ft = 7399
WHERE id = 'wa_lizard_mountain_south_route' AND high_point_ft = 7420;

-- wa_luahna_peak (area, not a route): elevation_ft (8450) is the outlier against
-- multiple external sources (Wikipedia's Luahna Peak article and PeakVisor both give
-- 8,445ft as the true summit's elevation; 8,450ft traces to a single secondary listing,
-- listsofjohn.com) and against this app's own route data -- both
-- wa_luahna_peak_southwest_slope_southeast_ridge and wa_luahna_peak_east_slopes store
-- high_point_ft = 8445.
UPDATE areas
SET elevation_ft = 8445
WHERE id = 'wa_luahna_peak' AND elevation_ft = 8450;

-- wa_luna_glacier: the "Luna Camp, Big Beaver Trail" bivy entry (index 0) carries a
-- populated elev (2432) but its own notes text ends "No elevation is recorded because
-- no confident figure was sourced" -- a stale claim left over from before the elevation
-- was filled in. The sibling route wa_luna_peak_southeast_slopes independently stores
-- the same camp ("Luna Camp (Big Beaver Trail)") at the same 2432ft with a fuller,
-- sourced description and no such disclaimer, corroborating that the figure is in fact
-- known. Dropping the now-false trailing sentence; no other change to the entry.
UPDATE routes
SET bivy = jsonb_set(
  bivy,
  '{0,notes}',
  '"The standard staging camp for the Access Creek side of the Northern Pickets — Mount Fury''s west peak and the Luna Cirque generally. Most parties take the Ross Lake water taxi to the Big Beaver landing near 1,600 ft and then walk eight to ten miles of nearly flat old-growth trail, so it functions as a first night rather than a destination. The climbers'' path leaves the maintained trail roughly a mile and a half beyond and crosses Big Beaver Creek near the Access Creek confluence, where the crossing may be a log or a wade varying year to year and with runoff."'::jsonb
)
WHERE id = 'wa_luna_glacier'
  AND bivy->0->>'name' = 'Luna Camp, Big Beaver Trail'
  AND (bivy->0->>'elev')::numeric = 2432
  AND bivy->0->>'notes' LIKE '%No elevation is recorded because no confident figure was sourced.';
