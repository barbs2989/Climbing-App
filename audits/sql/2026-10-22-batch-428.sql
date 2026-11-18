-- WA alpine audit -- batch 428 (pass 7) -- 2026-10-22
-- Routes: wa_mount_ferry_standard (clean), wa_mount_formidable_south_face (clean),
--         wa_mount_fricaba_standard (clean), wa_mount_fury_east_direct_east_ridge (clean),
--         wa_mount_fury_east_mongo_ridge (clean), wa_mount_fury_east_north_buttress (clean),
--         wa_mount_fury_east_southeast_glaciers (flagged, not fixed),
--         wa_mount_fury_west_west_ridge (fixed)

-- wa_mount_fury_west_west_ridge: high_point_ft (8322) is West Fury's East-neighbor
-- elevation misapplied to this row. Every other West-Peak source in the catalog clusters
-- tightly around 8,301-8,303 ft (areas.elevation_ft for wa_mount_fury_west = 8303; the
-- sibling wa_mount_fury_east_mongo_ridge route's own high_point_ft = 8303 and its "West
-- Fury summit" waypoint = 8301 ft), consistent with Eric Gilbertson's October 2022
-- theodolite survey (8,305 ft +/-10) and the older USGS-quad range (8,292-8,298 ft). No
-- source anywhere gives West Fury as 8,322 ft -- that figure belongs to East Fury (it's
-- this same row's own `corrections` field that first raised the discrepancy, though that
-- note is itself stale: it describes the area's elevation_ft as still null, but the areas
-- table already holds 8303 as of this run).
UPDATE routes SET high_point_ft = 8303
WHERE id = 'wa_mount_fury_west_west_ridge' AND high_point_ft = 8322;

-- NOT FIXED, flagged for a human instead (see audits/wa-alpine-audit-log.md for detail):
-- wa_mount_fury_east_southeast_glaciers: fa still credits "Don Keller, Joan Firey, and Joe
--   Firey, 1960" -- batch 82 (2026-08-08) already proposed replacing this with "Fred Beckey
--   and Helmy Beckey, 1940" (medium-high confidence, still unapplied in the live DB as of
--   this run; see audits/sql/2026-08-08-batch-82.sql). This run turned up a THIRD, distinct
--   candidate: a chronology citing Bill Cox and Will F. Thompson reaching East Peak in
--   early September 1937 via the "Fury Glacier." Three non-overlapping candidates (1937
--   Cox/Thompson, 1940 Beckey/Beckey, 1960 Keller/Firey) for the same peak's first ascent
--   is not a case for picking one -- it needs a human with access to Beckey's Cascade
--   Alpine Guide or the AAJ archive to adjudicate which (if any) of these is the actual
--   first ascent of this specific southeast-glacier line versus the peak overall.
-- wa_mount_fury_east_north_buttress: high_point_ft (8322) and the two other East-Peak
--   routes in this catalog (8356) disagree, but this is the SAME unresolved ambiguity
--   batch 82 already flagged for the area row -- a 2022 theodolite survey gives East Fury
--   8,356 ft while a more precise October 2024 GPS resurvey by the same party gives
--   8,321.5 ft (i.e., this row's 8322 may well be the MORE accurate figure, not an error).
--   Not re-fixed or re-flagged as new; noted here only so this pass doesn't re-litigate it.
