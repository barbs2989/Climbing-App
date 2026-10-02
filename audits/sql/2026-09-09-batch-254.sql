-- WA alpine route audit -- batch 254 (pass 5)
-- Routes: wa_east_ridge_8, wa_east_slope, wa_east_twin_needle_south_route,
-- wa_east_twin_needle_thread_of_ice, wa_eldorado_peak_east_ridge,
-- wa_eldorado_peak_eldorado_glacier_nw, wa_eldorado_peak_north_ridge,
-- wa_eldorado_peak_northeast_face

-- wa_eldorado_peak_eldorado_glacier_nw (Eldorado Peak, Northwest Couloir /
-- Eldorado Glacier): gain_ft was stored as 4000, which is impossible for a
-- route that starts and ends at this row's own Eldorado Creek Trailhead
-- waypoint (2,160 ft) and summits at 8,872 ft -- a bare net rise of 6,712 ft,
-- already matched by this row's own loss_ft=6712. The row's own itinerary
-- field makes the correct total explicit and self-consistent: its three-day
-- breakdown gives gainFt 5400 (day 1, approach to high camp) + 1300 (day 2,
-- couloir to summit) + 0 (day 3, hike out) = 6700, and itinerary.totalNote
-- states outright "~6,700 ft gain, ~10 mi round trip." Corrected gain_ft to
-- match the row's own already-stated total (6700) rather than the
-- self-contradicting top-level value.
UPDATE routes
SET gain_ft = 6700
WHERE id = 'wa_eldorado_peak_eldorado_glacier_nw' AND gain_ft = 4000;

-- wa_eldorado_peak_north_ridge (Eldorado Peak, North Ridge): three related
-- fixes on one row.
-- (1) permit was NULL. Its sibling routes on the same peak/permit regime
-- (East Ridge, NW Couloir, Northeast Face) all carry the same standard North
-- Cascades NP complex permit text, which matches this row's own access.permit
-- ("Backcountry permit required for camping in the Eldorado zone") and
-- access.landManager ("North Cascades National Park (NPS)"). Populated with
-- the same text used across the other Eldorado Peak routes in this dataset.
-- (2) The Summit waypoint's elev was stored as 8868 ft. A sibling route on
-- this exact peak (Northeast Face) already researched and documented this
-- discrepancy in its own `corrections` field: reputable sources (Wikipedia /
-- USGS-derived survey data) give the true summit as 8,872.9 ft (rounds to
-- 8,873), while 8,868 ft is a nearby USGS benchmark marker below and west of
-- the true summit, not the summit itself. This row's Summit waypoint sits at
-- essentially the identical coordinate (48.5375,-121.1342) used by this
-- peak's other routes for the true summit, and this row's own
-- `high_point_ft` is already 8872 -- only the waypoints array still carried
-- the old benchmark value. Corrected to 8872 to match.
-- (3) loss_ft was NULL. Every other route in this batch (and the large
-- majority in this dataset) that returns to its own trailhead stores gain_ft
-- and loss_ft as equal or near-equal (e.g. this same peak's East Ridge:
-- 6716/6712; NW Couloir: 6700/6712 after the fix above; Northeast Face:
-- 6800/6800). This row's own descent_text describes returning down the same
-- ridge system to the notch and back to camp (an out-and-back, not a
-- different lower-elevation exit), consistent with that pattern. A NULL here
-- risks the documented app defect where a missing gain/loss value is read as
-- zero by the planner's `||0` fallback, understating the return leg.
-- Populated to match gain_ft.
UPDATE routes
SET permit = 'North Cascades NP complex: no permit for day climbs; all overnight backcountry stays require a backcountry permit (reserve on Recreation.gov or walk-up at the Marblemount Wilderness Information Center).',
    waypoints = jsonb_set(waypoints, '{3,elev}', '8872', false),
    loss_ft = 6800
WHERE id = 'wa_eldorado_peak_north_ridge'
  AND permit IS NULL
  AND loss_ft IS NULL
  AND gain_ft = 6800
  AND waypoints->3->>'name' = 'Eldorado Peak'
  AND (waypoints->3->>'elev')::numeric = 8868;
