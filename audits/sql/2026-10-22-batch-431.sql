-- WA alpine audit -- batch 431 (pass 7) -- 2026-10-22
-- Routes: wa_mount_lago_south_slope_south_face (clean), wa_mount_lawson_standard (clean),
--         wa_mount_logan_fremont_glacier (fixed), wa_mount_logan_r1 (clean),
--         wa_mount_logan_r2 (clean), wa_mount_mathias_scramble (clean),
--         wa_mount_maude_r1 (clean), wa_mount_maude_r2 (clean),
--         wa_mount_mccausland_n_route (clean), wa_mount_mystery_standard (clean)

-- wa_mount_logan_fremont_glacier: approach text gives the Colonial Creek Campground /
-- Thunder Creek Trailhead elevation as "1,060 ft", but the route's own waypoints list
-- (and the two sibling Mount Logan routes sharing the identical trailhead, r1 and r2)
-- all store 1,200 ft for the same spot. Two independent outside sources corroborate
-- 1,200, not 1,060: Campendium gives Colonial Creek Campground as 1,213 ft, and WTA's
-- Thunder Woods Nature Trail page (same trailhead/coordinates) gives a high point of
-- 1,200 ft. Fixing the prose to match the route's own waypoint and the outside sources.
UPDATE routes
SET approach = replace(approach, 'elevation 1,060 ft', 'elevation 1,200 ft')
WHERE id = 'wa_mount_logan_fremont_glacier'
  AND approach LIKE '%elevation 1,060 ft%';
