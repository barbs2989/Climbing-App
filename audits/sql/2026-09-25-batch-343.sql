-- WA alpine audit batch 343 (pass 6)
-- Routes: wa_mount_ferry_standard (clean), wa_mount_formidable_south_face (clean),
--         wa_mount_fricaba_standard (1 fix), wa_mount_fury_east_direct_east_ridge (clean),
--         wa_mount_fury_east_mongo_ridge (clean), wa_mount_fury_east_north_buttress (1 fix),
--         wa_mount_fury_east_southeast_glaciers (1 fix), wa_mount_fury_west_west_ridge (clean)

-- =========================================================================
-- Mount Fricaba, Standard Scramble -- wa_mount_fricaba_standard
-- =========================================================================
-- Same bug pattern already confirmed and fixed on wa_mount_deception_standard in batch 342:
-- access.parking_pass claims the Upper Dungeness Trailhead sits in a "Quilcene Ranger District"
-- that does not exist -- Quilcene is the Hood Canal Ranger District's office town, not a district
-- name. This row's OWN access.rules/emergency.rangerStation field elsewhere already correctly
-- says "Olympic National Forest - Hood Canal Ranger District, Quilcene Office" -- parking_pass is
-- the one field never corrected to match. Confirmed via USFS Olympic National Forest's ranger
-- district structure (only Pacific and Hood Canal districts exist).
UPDATE routes
SET access = jsonb_set(
  access,
  '{parking_pass}',
  '"Northwest Forest Pass, Interagency Pass or Scan & Pay at the Upper Dungeness Trailhead — $5 per vehicle per day or $30 annual. The trailhead is on Olympic National Forest land (Hood Canal Ranger District), so no Olympic National Park entrance fee is charged to park there."'::jsonb
)
WHERE id = 'wa_mount_fricaba_standard'
  AND access->>'parking_pass' = 'Northwest Forest Pass, Interagency Pass or Scan & Pay at the Upper Dungeness Trailhead — $5 per vehicle per day or $30 annual. The trailhead is on Olympic National Forest land (Quilcene Ranger District), so no Olympic National Park entrance fee is charged to park there.';

-- =========================================================================
-- Mount Fury (East Peak), North Buttress -- wa_mount_fury_east_north_buttress
-- =========================================================================
-- high_point_ft and the route's own "Mount Fury, East Peak (East Fury)" summit waypoint (index 2)
-- both store 8,322 ft, an outlier against the areas.wa_mount_fury_east row (8,356 ft) and this
-- same peak's two sibling routes in this batch (Direct East Ridge and Southeast Glaciers), which
-- both already correctly store 8,356 ft. Confirmed via Eric Gilbertson's Oct 22, 2022 theodolite
-- survey of Fury's two summits (countryhighpoints.com), which set East Fury at 8,356 ± 8 ft --
-- the current standard figure, also cited by summitpost.org/mount-fury and Wikipedia. West Fury
-- (8,303-8,305 ft per the same survey) is unaffected and left as-is.
UPDATE routes
SET high_point_ft = 8356,
    waypoints = jsonb_set(
      jsonb_set(waypoints, '{2,elev}', '8356'::jsonb),
      '{2,elevFt}', '8356'::jsonb
    )
WHERE id = 'wa_mount_fury_east_north_buttress'
  AND high_point_ft = 8322
  AND waypoints->2->>'name' = 'Mount Fury, East Peak (East Fury)'
  AND waypoints->2->>'type' = 'Summit'
  AND (waypoints->2->>'elev')::int = 8322
  AND (waypoints->2->>'elevFt')::int = 8322;

-- =========================================================================
-- Mount Fury (East Peak), Southeast Glaciers (Standard) -- wa_mount_fury_east_southeast_glaciers
-- =========================================================================
-- loss_ft (13,000) is more than double gain_ft (6,200) on a route whose own descent field says
-- "Reverse the southeast glacier route" -- a car-to-car reversal of the ascent line should return
-- gain_ft and loss_ft to roughly the same figure, not one over twice the other. The row's own
-- itinerary JSON breaks the same trip into daily gainFt/lossFt figures that sum to ~6,900 ft
-- gained / ~7,200 ft lost -- in the same range as the stored gain_ft and nowhere near the stored
-- loss_ft. loss_ft looks like it absorbed the itinerary's "~13,000 ft of cumulative gain/loss"
-- total-note figure (roughly gain+loss combined) rather than the descent-only figure. Corrected
-- to match gain_ft, consistent with the row's own "reverse the route" description and itinerary
-- breakdown; no external source states a differing figure so this is an internal-consistency fix,
-- not a fact drawn from a guidebook.
UPDATE routes
SET loss_ft = 6200
WHERE id = 'wa_mount_fury_east_southeast_glaciers'
  AND gain_ft = 6200
  AND loss_ft = 13000;
