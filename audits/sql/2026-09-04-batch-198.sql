-- WA alpine audit — batch 198 (pass 4)
-- Routes checked: wa_kyes_peak_northeast_ridge, wa_labor_pains, wa_lane_peak_r1,
-- wa_lane_peak_r2, wa_lane_peak_r3, wa_le_conte_mountain_northern_aspect,
-- wa_lemah_mountain_east_route, wa_lemah_two_goatshead_spire

-- wa_labor_pains: waypoints[0] "Blue Lake TH" stored elev 5200 ft. Multiple
-- authoritative sources (USFS Okanogan-Wenatchee official trail page, Washington
-- Trails Association, The Mountaineers, AllTrails) agree the Blue Lake trailhead
-- sits at 5,380 ft. The wrong trailhead figure was also making this peak's
-- gain_ft values (shared identically by three sibling routes on the same face)
-- read as falling below the trailhead-to-summit geometric floor; correcting the
-- waypoint resolves that too without touching gain_ft, which turns out to already
-- be correct once the trailhead elevation is fixed.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '5380'::jsonb)
WHERE id = 'wa_labor_pains'
  AND waypoints->0->>'name' = 'Blue Lake TH'
  AND (waypoints->0->>'elev')::numeric = 5200;

-- wa_le_conte_mountain_northern_aspect: fa named the 1938 Ptarmigan Traverse
-- first-ascent party's fourth member "Ralph W. Clough". Multiple independent
-- sources (Wikipedia's Ptarmigan Traverse article, and a UC Berkeley Academic
-- Senate in-memoriam page for this specific person, who co-founded the Ptarmigan
-- Climbing Club as a teenager and later became a UC Berkeley engineering professor
-- credited with co-developing the Finite Element Method) agree the name is Ray W.
-- Clough, not Ralph.
UPDATE routes
SET fa = 'Calder T. Bressler, Ray W. Clough, Bill Cox, Tom Myers — July 23, 1938 (peak first ascent; subsequent ridge ascents in 1953 and 1957)'
WHERE id = 'wa_le_conte_mountain_northern_aspect'
  AND fa = 'Calder T. Bressler, Ralph W. Clough, Bill Cox, Tom Myers — July 23, 1938 (peak first ascent; subsequent ridge ascents in 1953 and 1957)';

-- wa_lane_peak_r1 / wa_lane_peak_r2: the top-level `permit` column (which the
-- app's own "Permit-free" search filter reads via `r.permits`) was left an empty
-- string on these two routes, while their own `access.permit` field and this
-- peak's third sibling route (wa_lane_peak_r3, already correctly populated)
-- state the fact: NPS's $82 climbing permit/fee at Mount Rainier NP applies only
-- above 10,000 ft or on glacier travel (confirmed via nps.gov), which doesn't
-- reach Lane Peak's non-glaciated 6,012 ft summit. Filling the blank with the
-- same wording already shipped on r3 so the "Permit-free" filter surfaces these
-- two correctly instead of silently excluding them.
UPDATE routes
SET permit = 'Inside Mount Rainier National Park: no permit for day climbs; overnight stays require a park wilderness permit.'
WHERE id = 'wa_lane_peak_r1'
  AND permit = '';

UPDATE routes
SET permit = 'Inside Mount Rainier National Park: no permit for day climbs; overnight stays require a park wilderness permit.'
WHERE id = 'wa_lane_peak_r2'
  AND permit = '';

-- wa_lemah_two_goatshead_spire: its single Trailhead waypoint ("Pete Lake
-- Trailhead (Trail #1323, FR-4616)") carries lat/lng but no elevation. It is the
-- same physical trailhead as wa_lemah_mountain_east_route's "Pete Lake Trailhead"
-- waypoint (coordinates ~120m apart, both matching the real trailhead's public
-- coordinates), which already records elev 2800 — independently confirmed as
-- within the trailhead's actual 2,799-2,904 ft range by public trail data.
-- Filling in the missing figure from the sibling route's own already-verified
-- value rather than leaving the map's elevation profile with no starting point.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '2800'::jsonb)
WHERE id = 'wa_lemah_two_goatshead_spire'
  AND waypoints->0->>'name' = 'Pete Lake Trailhead (Trail #1323, FR-4616)'
  AND waypoints->0->'elev' IS NULL;
