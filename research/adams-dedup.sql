-- Mount Adams — remove two duplicate rows for the standard South Climb.
--
-- Run this AFTER the merge, which has already been applied (scripts/adams-merge-south.mjs).
-- The merge copied south_spur's 18 unique fields onto south_climb and unioned hazards and
-- gear, so nothing below is still needed by the surviving row.
--
-- WHY: the live catalogue had three rows for Mount Adams' one standard route.
--
--   wa_mount_adams_south_climb   "South Climb (South Spur)"    19.3 km  6700 ft   <- KEEP
--   wa_mount_adams_south_spur    "South Spur Route"             9.2 km  6676 ft   <- delete
--   wa_mount_adams_south_side    "Mount Adams - South Side"      null    null     <- delete
--
-- south_spur's own overview reads "The South Spur (also called the South Climb) is Mount
-- Adams' standard, non-technical route", so it is the same line under its other name.
-- south_climb survives because 19.3 km matches the real ~12.5 mi round trip (south_spur's
-- 9.2 km is a one-way figure) and because it carries a genuine 166-point GPX track against
-- south_spur's 5. south_side had 3 of 22 fields populated and no discipline, grade,
-- distance, gain, hazards or track — a stub.
--
-- These DELETEs are deliberately left for a human. A wrong DELETE in this table destroyed
-- Triple Couloirs once already; the SELECT below is here so you can eyeball the rows first.

-- 1. LOOK BEFORE YOU CUT: expect exactly the two rows named above, and confirm the keeper
--    still holds the merged content. If this doesn't match, stop.
select id, name, dist_km, gain_ft,
       array_length(hazards, 1) as hazards,
       array_length(gear, 1)    as gear,
       jsonb_array_length(to_jsonb(gpx)) as gpx_points,
       grade
from routes
where id in ('wa_mount_adams_south_climb','wa_mount_adams_south_spur','wa_mount_adams_south_side')
order by id;

-- 2. Delete the two duplicates.
delete from routes where id = 'wa_mount_adams_south_spur';
delete from routes where id = 'wa_mount_adams_south_side';

-- 3. Fix the cached count on the area. It read 12 and the peak really has 10 routes after
--    this; recompute rather than hardcoding, so it stays right if other rows changed.
update areas a
set route_count = (select count(*) from routes r where r.area_id = a.id)
where a.id = 'wa_mount_adams';

-- 4. VERIFY: expect one row (the keeper), and route_count = 10.
-- If these result tables don't appear, your paste was truncated.
select id, name, dist_km, gain_ft, grade,
       array_length(hazards, 1) as hazards
from routes
where area_id = 'wa_mount_adams' and lower(name) like '%south%'
order by id;

select id, name, route_count from areas where id = 'wa_mount_adams';
