-- Batch 81 (pass 2, 2026-08-08)
-- Routes: Mount Daniel (Lynch Glacier), Mount Deception (Standard), Mount Degenhardt
-- (Southwest Route), Mount Despair (East Route), Mount Fairchild (Standard), Mount Formidable
-- (North Ptarmigan, South Face), Mount Fury (Mongo Ridge).
-- Researched via 7 parallel agents grouped by peak.

-- wa_mount_daniel_lynch_glacier: emergency.notes placed the Deception Pass Trailhead in
-- "Chelan County / Icicle Creek area" and called it "a different jurisdiction than the
-- Cathedral Rock Trailhead route." Both claims are wrong: the Deception Pass/Tucquala
-- Meadows-Fish Lake Trailhead (Trail #1376) is reached via Salmon La Sac Road off I-90 and
-- sits on the King/Kittitas county line -- the same trailhead area used by the Cathedral Rock
-- Trailhead route, not a separate one. Icicle Creek is an unrelated drainage near Leavenworth
-- off US-2. Confirmed via USFS Okanogan-Wenatchee's Deception Pass Trail #1376 page and
-- Wikipedia's "Deception Pass (King County, Washington)" entry.
UPDATE routes
SET emergency = jsonb_set(emergency, '{notes}',
  '"This approach starts from the Deception Pass Trailhead (Tucquala Meadows/Fish Lake Trailhead, Trail #1376) on the mountain''s north side, reached via Salmon La Sac Road off I-90 on the King/Kittitas county line -- the same general trailhead area as the Cathedral Rock Trailhead route, not a separate jurisdiction; exact trailhead coordinates and local emergency contacts for this side were not confirmed from a reputable source this pass."')
WHERE id = 'wa_mount_daniel_lynch_glacier'
  AND emergency->>'notes' LIKE 'This approach starts from the Deception Pass Trailhead on the mountain''s north side (Chelan County%';

-- wa_mount_deception_standard: the summit waypoint's elevFt (7786) contradicted this same
-- row's own high_point_ft (7788), the area row's elevation_ft (7788), and the overview text
-- ("Mount Deception (7,788 ft)"). External sources (Wikipedia, PeakVisor, WTA) unanimously
-- give 7,788 ft; the waypoint was the lone outlier.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '7788')
WHERE id = 'wa_mount_deception_standard'
  AND waypoints->1->>'name' = 'Mount Deception'
  AND (waypoints->1->>'elevFt')::numeric = 7786;

-- wa_mount_deception_standard: access.parking_pass claimed an Olympic NP entrance fee
-- ($30/vehicle 7-day, $55/$80 annual passes) applies at this trailhead. The Upper Dungeness
-- Trailhead is on Olympic National Forest land (the trail only crosses into the park roughly
-- 1.2 mi in, with no entrance station), so no NP entrance fee applies -- only a Northwest
-- Forest Pass or Interagency pass for parking, which is what this same row's own
-- access.passRequired field already correctly states. Confirmed via WTA's Royal Basin hike
-- page and USFS Olympic National Forest's recreation page.
UPDATE routes
SET access = jsonb_set(access, '{parking_pass}',
  '"No Olympic NP entrance fee applies at the Upper Dungeness Trailhead (Olympic National Forest land, no entrance station); a Northwest Forest Pass ($5/day or $30/year) or an America the Beautiful/Interagency annual pass covers trailhead parking."')
WHERE id = 'wa_mount_deception_standard'
  AND access->>'parking_pass' LIKE 'Olympic NP entrance fee: $30/vehicle%';

-- wa_mount_formidable_north_ptarmigan: road.status said Cascade River Road is "paved for
-- roughly the first 20 miles from Marblemount, then gravel." Multiple sources (onX Offroad,
-- Cascades Field Guide trailhead references) put the paved section at roughly 10 miles, not
-- 20 -- and this route's own sibling, wa_mount_formidable_south_face, already correctly
-- states "Paved to about mile 10" for the same road.
UPDATE routes
SET road = jsonb_set(road, '{status}',
  '"Paved for roughly the first 10 miles from Marblemount, then gravel to the trailhead; check the NPS road-conditions page for washouts before driving."')
WHERE id = 'wa_mount_formidable_north_ptarmigan'
  AND road->>'status' LIKE 'Paved for roughly the first 20 miles from Marblemount%';

-- wa_mount_formidable_south_face: gain_ft/loss_ft (6100/6200) contradicted this same row's
-- own itinerary.sourceNote, which cites trailcatjim.com reporting "22 mi / 10,600 ft round
-- trip" for this same climb -- a ~4,400-4,500 ft gap sourced from the row's own citation, not
-- an external dispute. Fixed to match the row's own cited source, which also brings it in
-- line with the sibling wa_mount_formidable_north_ptarmigan route's 10,600/10,600 ft (both
-- routes describe substantially the same approach/climb).
UPDATE routes
SET gain_ft = 10600, loss_ft = 10600
WHERE id = 'wa_mount_formidable_south_face'
  AND gain_ft = 6100 AND loss_ft = 6200;

-- wa_mount_fury_east_mongo_ridge: the "Ross Dam Trailhead" waypoint gave elevFt 1640, which
-- contradicts this same route's own approach narrative text (which correctly states the
-- trailhead is at "~2,150 ft") -- confirmed via WTA (Ross Dam Trailhead parking lot elevation
-- 2,150 ft, SR-20 MP 134-135). 1640 ft looks like it was conflated with Ross Lake's
-- water-surface elevation (~1,600 ft) rather than the trailhead itself.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elevFt}', '2150')
WHERE id = 'wa_mount_fury_east_mongo_ridge'
  AND waypoints->0->>'name' = 'Ross Dam Trailhead (SR-20)'
  AND (waypoints->0->>'elevFt')::numeric = 1640;

-- NOTE: wa_mount_daniel (area) prominence_ft (3508, should be 3480) was already proposed as a
-- fix in audits/sql/2026-08-08-batch-80.sql. The live DB still shows 3508 as of this batch
-- (proposed SQL is not auto-applied), so it is not re-proposed here -- see batch-80's file.

-- NOT FIXED, flagged for a human instead (see audits/wa-alpine-audit-log.md for detail):
-- wa_mount_fury_east_mongo_ridge's own *id* (not its area_id, which is correct) is mislabeled
-- -- every source describes Mongo Ridge as a West Fury (West Peak) route, so the id should
-- read wa_mount_fury_west_mongo_ridge. This is a primary-key rename, not a field patch -- it
-- needs a check for any foreign-key/contribution references to this id before renaming, per
-- CLAUDE.md's route-identity guidance, so no UPDATE is proposed here.
