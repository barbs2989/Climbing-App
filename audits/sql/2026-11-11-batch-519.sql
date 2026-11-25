-- wa_mount_fury_east_direct_east_ridge: high_point_ft is stored as 8356, the East Fury figure
-- from Eric Gilbertson's Oct 2022 theodolite survey. That same surveyor re-surveyed East Fury in
-- Oct 2024 (higher-precision, NGVD29) after finding the 2022 benchmark reference was wrong, and
-- published a corrected 8321.5 ft -- a figure effectively confirmed by this catalog's own
-- wa_mount_fury_east_north_buttress row, which already stores 8322 for the same summit. The
-- stored 8356 is the disavowed 2022 number.
UPDATE routes
SET high_point_ft = 8322
WHERE id = 'wa_mount_fury_east_direct_east_ridge'
  AND high_point_ft = 8356;

-- wa_mount_fury_west_west_ridge: high_point_ft is stored as 8322 -- but that is East Fury's
-- (corrected) elevation, not West Fury's. West Fury's own 2022 theodolite survey gives
-- 8305 ft +/-10, which this catalog's sibling route wa_mount_fury_east_mongo_ridge (also West
-- Peak) already stores as 8303 ft, within that survey's tolerance. 8322 looks like it was
-- copied from the East Peak row by mistake. The row's own `corrections` field already concludes
-- this but was never applied to the column.
UPDATE routes
SET high_point_ft = 8305
WHERE id = 'wa_mount_fury_west_west_ridge'
  AND high_point_ft = 8322;

-- wa_mount_fury_west_west_ridge: the itinerary's day-2 schedule labels the West Fury summit
-- "(8,303 ft)" -- inconsistent with the corrected 8,305 ft value above (and already slightly off
-- from the stored 8303/8305 range by itself). Bringing the embedded prose in line with the fix.
UPDATE routes
SET itinerary = replace(itinerary::text, 'West Fury summit (8,303 ft)', 'West Fury summit (8,305 ft)')::jsonb
WHERE id = 'wa_mount_fury_west_west_ridge'
  AND itinerary::text LIKE '%West Fury summit (8,303 ft)%';
