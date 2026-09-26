-- Batch 297 (pass 5): wa_south_ridge_3, wa_south_ridge_4, wa_south_spur,
-- wa_south_twin_sister_north_ridge, wa_south_twin_sister_scramble,
-- wa_south_twin_sister_west_ridge, wa_southeast_face, wa_southeast_mox_peak_se_rib

-- wa_south_ridge_3 (Black Peak, South Ridge): outing_shape filled null->'outback'.
-- descent_text/itinerary both describe reversing the South Ridge back to Wing Lake and
-- hiking out the same approach trail to the same Rainy Pass/Lake Ann trailhead -- a clean
-- same-trailhead round trip, the same pattern many prior batches have tagged this way.
UPDATE routes SET outing_shape = 'outback' WHERE id = 'wa_south_ridge_3';
-- FLAGGED, not fixed: gain_ft/loss_ft (3971/5100) disagree with each other by 1,129 ft on a
-- route that returns to its own trailhead by the same path (net elevation change should be
-- ~0, so gain should closely track loss). Three internal records disagree on what the right
-- pair actually is: this row's own itinerary.days gainFt/lossFt sum to 4,300/4,270 (nearly
-- balanced, and this row's own `corrections` field claims loss_ft was set from exactly this
-- sum on 2026-08-05 -- but the live value, 5100, does not match that sum, so either the
-- corrections log is stale or something changed loss_ft again after that pass); the
-- itinerary.totalNote separately says "~5,100 ft total gain" (matching the current loss_ft
-- number, not gain_ft, and not the itinerary day sum either); and a rough waypoint-elevation
-- dead-reckoning (TH 4,850 ft -> Heather Pass 5,900 -> talus 6,100 -> Lewis Lake 5,700 (dip)
-- -> Wing Lake 6,900 -> col 8,300 -> summit 8,970, there and back) comes out closer to
-- ~4,900-4,920 ft each way. None of gain_ft, loss_ft, the itinerary sum, or totalNote agree
-- with each other precisely enough to pick one with confidence; needs a human pass (or a
-- topo re-measure) rather than a guess.

-- wa_south_ridge_4 (Eldorado Peak, South Ridge):
-- top-level lat/lng populated (were null), matching this row's own summit waypoint
-- (48.5375, -121.1342) and the area's own coordinate exactly.
UPDATE routes SET lat = 48.5375, lng = -121.1342 WHERE id = 'wa_south_ridge_4';
-- loss_ft populated (was null) to match gain_ft (6800): this is a same-trailhead round trip
-- (Eldorado Creek TH, ascend the South Ridge, descend via the East Ridge back to the same
-- high camp and out the same approach), so net elevation change over the whole day is ~0 and
-- loss should track gain; gain_ft (6800) already closely matches this row's own waypoints
-- (TH 2,100 ft -> summit 8,868 ft = 6,768 ft).
UPDATE routes SET loss_ft = 6800 WHERE id = 'wa_south_ridge_4';
-- outing_shape filled null->'loop': ascent (South Ridge) and descent (East Ridge) are
-- different named lines on the mountain that both return to the same trailhead/camp system
-- (pro_tips[0] and descent_text both say to descend via the East Ridge rather than reversing
-- the South Ridge) -- a loop, not a straight out-and-back.
UPDATE routes SET outing_shape = 'loop' WHERE id = 'wa_south_ridge_4';
-- itinerary converted from a bare narrative string to the standard {cal,days,totalNote}
-- object shape every other route in the catalog uses -- the existing narrative text is
-- preserved verbatim as totalNote, days is an honest empty array since no day-by-day
-- breakdown was ever recorded, no content invented.
UPDATE routes SET itinerary = '{"cal":"","days":[],"totalNote":"Day 1: approach to Eldorado high camp (~7,600 ft) via Eldorado Creek and Eldorado Glacier, 5-6 hrs. Day 2: climb the South Ridge (4 pitches) and descend the East Ridge. Day 3: hike out."}'::jsonb
WHERE id = 'wa_south_ridge_4'
  AND jsonb_typeof(itinerary) = 'string'
  AND itinerary #>> '{}' = 'Day 1: approach to Eldorado high camp (~7,600 ft) via Eldorado Creek and Eldorado Glacier, 5-6 hrs. Day 2: climb the South Ridge (4 pitches) and descend the East Ridge. Day 3: hike out.';

-- wa_south_spur (Whatcom Peak): clean. gain_ft/loss_ft (11000/9300), outing_shape
-- ('outback'), and the closed-loop itinerary were all already corrected in a prior pass
-- with sourcing cited in this row's own `corrections` field; nothing new found.

-- wa_south_twin_sister_north_ridge:
-- top-level lat/lng populated (were null), matching this row's own summit waypoint and the
-- area's own coordinate exactly (48.7049, -121.9874 -- South Twin Sister, confirmed via
-- Peakbagger/SummitPost at 7,004 ft, matching this row's own high_point_ft).
UPDATE routes SET lat = 48.7049, lng = -121.9874 WHERE id = 'wa_south_twin_sister_north_ridge';
-- outing_shape filled null->'loop': descent_text explicitly says NOT to reverse the North
-- Ridge ("the last ~400 vertical feet... is steep, exposed low-5th-class terrain") and to
-- descend via the West Ridge instead -- ascent and descent are different named routes
-- sharing one trailhead, i.e. a loop.
UPDATE routes SET outing_shape = 'loop' WHERE id = 'wa_south_twin_sister_north_ridge';

-- wa_south_twin_sister_scramble (South Twin Sister Olivine Scramble):
-- top-level lat/lng populated (were null), matching this row's own summit waypoint.
UPDATE routes SET lat = 48.70484, lng = -121.98725 WHERE id = 'wa_south_twin_sister_scramble';
-- outing_shape filled null->'outback': descent_text explicitly reverses the same south-side
-- gully/snowfield line back to the notch and retraces the approach talus/climbers'
-- path/logging roads to the same trailhead.
UPDATE routes SET outing_shape = 'outback' WHERE id = 'wa_south_twin_sister_scramble';
-- (dist_km was already corrected in a prior pass, 2026-08-27, per this row's own
-- `corrections` field, and needs no further change.)

-- wa_south_twin_sister_west_ridge:
-- top-level lat/lng populated (were null), matching this row's own summit waypoint and the
-- area's own coordinate exactly.
UPDATE routes SET lat = 48.7049, lng = -121.9874 WHERE id = 'wa_south_twin_sister_west_ridge';
-- dist_km corrected 20.1 -> 15.29 (one-way, half of this row's own itinerary.days[0].miles,
-- 19, which matches itinerary.totalNote's "~19 mi round trip" almost exactly). 20.1 km
-- (12.5 mi) is the same figure this route's scramble sibling had stored pre-correction as a
-- ROUND-TRIP distance in a column the route page treats as one-way and doubles (see that
-- row's own 2026-08-27 correction note) -- here it produces a doubled ~25 mi round trip
-- against an itinerary that says 19 mi. Halved to the itinerary's own one-way figure.
UPDATE routes SET dist_km = 15.29 WHERE id = 'wa_south_twin_sister_west_ridge';
-- outing_shape filled null->'outback': descent_text says "Nearly all parties descend the
-- same West Ridge line used on ascent" and retrace the approach back to the same trailhead.
UPDATE routes SET outing_shape = 'outback' WHERE id = 'wa_south_twin_sister_west_ridge';

-- wa_southeast_face (Sharkfin Tower, Southeast Face):
-- gain_ft/loss_ft corrected 4870 -> 4920, matching this row's own waypoints (trailhead
-- 3,200 ft, summit 8,120 ft = 4,920 ft) and the identical, already-corrected figure applied
-- to this peak's sibling route (wa_sharkfin_tower_southeast_ridge, batch 292) for the same
-- shared Boston Basin trailhead and the same 8,120 ft summit. This row's own itinerary day
-- sum (2,500+2,400 gain, 0+4,900 loss) and totalNote ("Roughly 4,900 ft total gain...
-- (estimated)") are close to 4,920 but explicitly hedged as approximate; the waypoint pair
-- and the sibling route's sourced figure are the tighter match.
UPDATE routes SET gain_ft = 4920, loss_ft = 4920 WHERE id = 'wa_southeast_face';
-- top-level lat/lng populated (were null), matching this row's own summit waypoint and the
-- area's own coordinate exactly.
UPDATE routes SET lat = 48.4996, lng = -121.0398 WHERE id = 'wa_southeast_face';
-- outing_shape filled null->'outback': descent_text describes rappelling back to the shared
-- Sharkfin descent gully "used by all routes on the tower" and returning to the same Boston
-- Basin camp/trailhead -- no separate named descent line, unlike the South Ridge/North
-- Ridge cases above.
UPDATE routes SET outing_shape = 'outback' WHERE id = 'wa_southeast_face';
-- access.passRequired corrected: stated "$5 day / $35 annual" for the Northwest Forest
-- Pass; the current annual price is $30 (confirmed via the USFS Pacific Northwest Region
-- digital-pass page and REI's current listing). $35 does not match any Northwest Forest
-- Pass tier currently offered.
UPDATE routes SET access = jsonb_set(access, '{passRequired}', '"Northwest Forest Pass ($5 day / $30 annual) or Interagency Pass"'::jsonb)
WHERE id = 'wa_southeast_face'
  AND access ->> 'passRequired' = 'Northwest Forest Pass ($5 day / $35 annual) or Interagency Pass';

-- wa_southeast_mox_peak_se_rib (Southeast Mox Peak / "Hard Mox", West Ridge / Beckey
-- Route -- id retains the pre-correction "se_rib" name-derived slug; this row's own
-- `corrections` field already documents the NAME being fixed 2026-08-05 from "Southeast
-- Rib / Standard" to "West Ridge (Beckey Route)" to match the content and every external
-- source, and per this project's standing rule route ids are stable identifiers that are
-- not renamed to track a corrected display name, so no further action on the id):
--
-- itinerary and timing.sectionBreakdown[0] both described an entirely different, wrong
-- approach -- a Ross Lake water taxi to the Little Beaver dock and a hike up the Perry Creek
-- drainage (the Picket Range approach used by OTHER North Cascades peaks, e.g. this row's
-- own `climate.winter` field correctly notes the 2023 winter ascent used "a different, Ross
-- Lake/Perry Creek approach"). That has nothing to do with how this peak is actually
-- reached: this row's own `approach`, `descent_text`, `waypoints`, and `approach_logistics`
-- fields all consistently and correctly describe the real approach via the Depot Creek
-- trailhead off Chilliwack Lake Road in British Columbia, crossing the border on foot at
-- Monument 65, past Depot Creek Falls to Ouzel Lake and a high camp on the Redoubt Glacier
-- saddle -- confirmed externally (Mountain Project, trailcatjim.com trip report) as the
-- standard approach for Hard Mox. The itinerary/timing fields were simply never updated
-- when the rest of the row was corrected. Rewritten below using ONLY information already
-- present in this row's own approach/descent_text/waypoints/timing fields (mileages and
-- elevations taken from the waypoints array, hours from the pre-existing
-- timing.approachTimeHrs=13/summitTimeHrs=19, which already summed correctly to
-- timing.totalHrs=32) -- no new facts invented, only re-homed and corrected.
UPDATE routes SET itinerary = '{"cal":"A North Cascades NP backcountry permit is required for the overnight high camp; the approach crosses the international border on foot away from a staffed port of entry, so carry ID/passport and sign in at the Monument 65 kiosk. Best climbed mid-July through September once the Depot Creek approach and Redoubt Glacier crossing are established.","days":[{"n":1,"title":"Depot Creek approach to a high camp on the Redoubt Glacier saddle","note":"From the Depot Creek trailhead parking on the abandoned logging spur off Chilliwack Lake Road (BC, ~2,350 ft), hike the old roadway grade to the Monument 65 border marker and register at the park kiosk, then follow the unmaintained Depot Creek climbers'' path past the falls (a fixed handline aids a steep, wet slab step) into the Redoubt Glacier basin. Ouzel Lake is the common first camp; most parties relocate 3-4 hours further up onto the glacier-edge saddle (~7,150 ft) for a high camp closer to the peaks.","hours":13,"miles":8,"gainFt":4800,"lossFt":0,"packLb":45,"schedule":[],"objective":"Reach a high camp on the Redoubt Glacier saddle below the Mox Peaks"},{"n":2,"title":"Alpine start, summit via the West Ridge, and hike/climb all the way out","note":"A 3:30 AM start crosses the Redoubt Glacier toward the Col of the Wild, up roughly 1,000 ft of loose talus to the col, then class 4 ledges through the Ridge of Gendarmes notch to the base of the West Ridge''s three roped pitches (5.5-5.6) to the summit. Reverse the route with rappels back to the col and glacier, then retrace the approach all the way out via Ouzel Lake, Depot Creek Falls, and Monument 65 to the trailhead -- a huge single day.","hours":19,"miles":12.6,"gainFt":1354,"lossFt":6154,"packLb":20,"schedule":[{"time":"3:30 AM","label":"Leave high camp","detail":"Rope up for the Redoubt Glacier crossing toward the Col of the Wild."},{"time":"~7:00 AM","label":"Reach the Col of the Wild","detail":"Final ~1,000 ft is loose talus over sand; helmets on."},{"time":"~9:00 AM","label":"Through the Ridge of Gendarmes notch","detail":"Class 4 ledges gain the notch below the West Ridge''s roped pitches."},{"time":"~11:00 AM","label":"Summit (8,504 ft)","detail":"Three pitches of 5.5-5.6 above the notch."},{"time":"11:30 AM","label":"Begin rappel descent","detail":"Reverse the route with rappels back to the notch and glacier."},{"time":"~2:00 PM","label":"Back at the Col of the Wild","detail":"Retrace the glacier crossing to high camp."},{"time":"3:00 PM","label":"Break camp, start the descent","detail":"Retrace Ouzel Lake, Depot Creek Falls (fixed handline), and Monument 65 back to the trailhead."},{"time":"~10:30 PM","label":"Back at the trailhead","detail":"A huge single day; some parties split the descent with a second bivy instead."}],"objective":"Climb the West Ridge (Beckey Route) and return to the car"}],"totalNote":"A fast, technical 2-day trip for a fit, competent party: hike in to a high camp on the Redoubt Glacier saddle (~13 hrs) on day one, then a massive ~19-hour summit-and-out day two via the Col of the Wild and the West Ridge, from a 3:30 AM alpine start to roughly 10:30 PM back at the car."}'::jsonb
WHERE id = 'wa_southeast_mox_peak_se_rib'
  AND itinerary #>> '{days,0,note}' LIKE '%Ross Lake%';

-- timing.sectionBreakdown[0] carried the same Ross Lake/Little Beaver/Perry Creek
-- contamination as the itinerary above; corrected to match the real Depot Creek approach.
-- hrs (13) and section ("Approach") unchanged; only note/fromTo replaced.
UPDATE routes SET timing = jsonb_set(timing, '{sectionBreakdown,0}', '{"hrs":13,"note":"From the Depot Creek trailhead on Chilliwack Lake Road (BC), hike to the Monument 65 border marker and register, then follow the Depot Creek climbers'' path past the falls (fixed handline) to Ouzel Lake and on up to a high camp on the Redoubt Glacier saddle (~7,150 ft).","fromTo":"Depot Creek trailhead to Redoubt Glacier saddle high camp","section":"Approach"}'::jsonb)
WHERE id = 'wa_southeast_mox_peak_se_rib'
  AND timing #>> '{sectionBreakdown,0,fromTo}' = 'Boat taxi + hike to a high bivy';

-- road.driveNote said "long approach from Hannegan / Chilliwack trailheads" -- this row's
-- own bivy entries explicitly state the real camp (Ouzel Lake) is "NOT reachable from the
-- Hannegan Pass trailhead" and must never be treated as an alternative on that approach.
-- Corrected name/status/driveNote to describe the real Depot Creek (BC) approach this row's
-- own approach/waypoints/approach_logistics fields already use; seasonalGate left as-is.
UPDATE routes SET road = road || '{"name":"Depot Creek spur off Chilliwack Lake Road (BC)","status":"Unpaved logging spur to a trailhead on the Canadian side of the border; beyond it the route is an unmaintained climbers'' path, not a road.","driveNote":"No direct US road access to this peak. Park at the Depot Creek logging spur off Chilliwack Lake Road in British Columbia and walk in across the border at Monument 65 -- this route is not reached via the Hannegan Pass/Chilliwack River trailheads on the US side."}'::jsonb
WHERE id = 'wa_southeast_mox_peak_se_rib'
  AND road ->> 'driveNote' = 'No direct road access; long approach from Hannegan / Chilliwack trailheads.';

-- top-level lat/lng populated (were null), matching this row's own summit waypoint and the
-- area's own coordinate exactly.
UPDATE routes SET lat = 48.947089, lng = -121.256998 WHERE id = 'wa_southeast_mox_peak_se_rib';

-- gain_ft/loss_ft corrected 7400/6900 -> 6154/6154: this is a same-trailhead round trip
-- (Depot Creek parking, elev 2,350 ft) reversing the same approach on descent per
-- descent_text ("reverse the approach traverse back to your high camp... then descend the
-- Depot Creek climbers path... back to the trailhead"), and this row's own high_point_ft
-- (8,504 ft, cross-source-confirmed per this row's own `corrections` field) minus the
-- trailhead elevation gives 6,154 ft -- matching a waypoint-chain dead-reckoning of the
-- whole route (every waypoint from the trailhead up to the summit increases monotonically,
-- so gain and loss on the round trip should be equal and close to this figure). The prior
-- 7400/6900 pair was internally inconsistent (differed from each other by 500 ft) and did
-- not match either the waypoint chain or the itinerary rewrite above.
UPDATE routes SET gain_ft = 6154, loss_ft = 6154 WHERE id = 'wa_southeast_mox_peak_se_rib';

-- outing_shape filled null->'outback': descent_text explicitly says to reverse the ascent
-- line rather than take an independent walk-off.
UPDATE routes SET outing_shape = 'outback' WHERE id = 'wa_southeast_mox_peak_se_rib';

-- dist_km corrected 24.1 -> 16.58 (one-way, matching the one-way distance implied by this
-- row's own waypoints -- 10.3 mi from trailhead to summit -- and consistent with the
-- itinerary rewrite above, whose day miles (8 + 12.6 = 20.6) sum to the round-trip distance
-- this figure doubles to).
UPDATE routes SET dist_km = 16.58 WHERE id = 'wa_southeast_mox_peak_se_rib';
