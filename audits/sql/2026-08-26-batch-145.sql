-- Batch 145 (pass 3, 2026-08-26)
-- Routes: Mount Daniel (Lynch Glacier), Mount Deception (Standard Scramble), Mount Degenhardt
-- (Southwest Route), Mount Despair (East Route), Mount Fairchild (Standard Route), Mount
-- Formidable (South Face/Southeast Ledges), Mount Fury West Peak (Mongo Ridge, West Ridge/
-- Northwest Route), Mount Fury East Peak (Southeast Glaciers), Mount Goode (Northeast
-- Buttress).

-- wa_mount_fury_east_southeast_glaciers: waypoints[2] ("Big Beaver Landing") stores
-- lat/lng (48.819748, -121.279546) that contradict the waypoint's own note text ("roughly
-- 4.6 mi up-lake from Ross Dam, at Ross Lake's full-pool elevation") and its own distMi
-- (5.9) -- the stored coordinate is actually ~11 miles further up-valley, essentially on
-- top of the next waypoint, Luna Camp (48.810807, -121.301745, distMi 17.4). Re-confirmed
-- today via WebSearch (Mountaineers.org "Ross Dam & Big Beaver Creek", Ross Lake Resort
-- water-taxi info): Big Beaver Landing is the boat/water-taxi drop at the mouth of Big
-- Beaver Creek on Ross Lake, ~6 trail miles from Ross Dam -- matching the elevation already
-- stored (1602 ft = Ross Lake's full-pool elevation) and matching the sibling route
-- wa_mount_fury_west_west_ridge's own independently-recorded coordinate for the same landing
-- (48.77563, -121.0658, ~6 mi from the same Ross Dam Trailhead by the same approach).
UPDATE routes
SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{2,lat}', '48.77563'),
  '{2,lng}', '-121.0658'
)
WHERE id = 'wa_mount_fury_east_southeast_glaciers'
  AND waypoints->2->>'name' = 'Big Beaver Landing'
  AND (waypoints->2->>'lat')::numeric = 48.819748
  AND (waypoints->2->>'lng')::numeric = -121.279546;

-- wa_mount_fury_east_mongo_ridge: fa field hedges "month uncertain: July or August" for
-- Wayne Wallace's solo first ascent, contradicting this same row's own beta field ("first
-- ascended August 24-27, 2006"). Re-confirmed today via three independent sources: AAC
-- Publications ("Mt. Fury, West Peak, Mongo Ridge"), a Cascade Climbers trip report titled
-- "Mongo Ridge-W.Fury F.A.- VI-5.10- 8/28/2006", and Alpinist's climbing note -- all agree
-- the solo ascent ran August 24-28, 2006 (Wallace started up at 4am Aug 24, topped out and
-- hiked out by the 28th). No source gives a July date; the "month uncertain" hedge is stale.
UPDATE routes
SET fa = 'Wayne Wallace, solo — August 24-28, 2006 (climbing completed by the 27th, with the walk-out on the 28th)'
WHERE id = 'wa_mount_fury_east_mongo_ridge'
  AND fa = 'Wayne Wallace, solo — 2006 (month uncertain: July or August)';
