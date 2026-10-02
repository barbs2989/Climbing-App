-- WA alpine route audit batch 290 (pass 5)
-- Routes checked: wa_point_success_south_side, wa_poltergeist_pinnacle,
-- wa_poltergeist_pinnacle_north_route, wa_primus_peak_south_ridge,
-- wa_prusik_peak_der_sportsman, wa_prusik_peak_south_face_burgner_stanley,
-- wa_prusik_peak_west_ridge, wa_ragged_edge

-- Fix 1: wa_point_success_south_side (Point Success, via Success Cleaver) --
-- outing_shape was 'point' (ends at a different trailhead / car shuttle), but this
-- row's own descent_text says the STANDARD descent "reverse[s] the ascent line"
-- back to Longmire, explicitly contrasting it with a "carry-over" shuttle option
-- "some parties choose" -- i.e. the shuttle is the exception, not the rule. This
-- row's own 3-day itinerary.days[] ends "exit to Longmire" (day 3), the same
-- trailhead day 1 departs from, confirming outback (2 x dist_km = round trip) is
-- the correct app behavior for this route, not point-to-point.
--
-- dist_km (16.1) implies a round trip of only 20.0 mi once doubled, but this row's
-- own itinerary.days[].miles sums to EXACTLY 25 mi (10+3+12), matching
-- itinerary.totalNote word for word ("roughly 25 miles round trip and 11,500 ft of
-- gain"). Corrected dist_km to the one-way half of that: (25 * 1.60934) / 2 =
-- 20.12 km.
--
-- loss_ft was NULL. For an outback route returning to the same trailhead and
-- elevation, loss should equal gain; this row's own gain_ft (11,500) already
-- matches itinerary.totalNote's stated round-trip gain, so loss_ft is set to the
-- same figure rather than the itinerary's less-precise per-day loss sum (11,700,
-- built from three independently-rounded day figures).
UPDATE routes
SET outing_shape = 'outback',
    dist_km = 20.12,
    loss_ft = 11500
WHERE id = 'wa_point_success_south_side'
  AND outing_shape = 'point'
  AND dist_km = 16.1
  AND loss_ft IS NULL;

-- wa_point_success_south_side: waypoints[0] (the trailhead pin) is named
-- "Westside Road / Dry Creek (Tahoma Creek) Trailhead" at 3,200 ft -- but this
-- row's own approach text, itinerary, road, and access fields ALL describe
-- departing from Longmire (2,762 ft) via the Wonderland Trail over the Rampart
-- and Kautz Creek, and this row's own access.closures field already states the
-- Westside Road / Tahoma Creek Trail approach is closed to vehicles beyond Dry
-- Creek due to washouts. External corroboration (Mountaineers.org / SummitPost
-- search results on the Success Cleaver approach): "There is now only one
-- approach to Success Cleaver because the Tahoma Creek Trail is now closed due
-- to flood hazards. The only remaining approach is from Longmire via the
-- Wonderland Trail..." -- matching this row's own approach text almost verbatim
-- ("climb a steep switchback trail over the Rampart... descend... to Kautz
-- Creek. Cross Kautz Creek and climb up to Indian Henry's Hunting Ground and
-- Mirror Lakes."). Corrected waypoints[0] to the Longmire Wilderness Information
-- Center, using the elevation (2,762 ft) already stated three times elsewhere
-- in this same row (approach, road.driveNote, access), and a coordinate for
-- Longmire confirmed via web search (visitrainier.com / latlong.net-class
-- aggregator results: ~46.7493, -121.8233). Also filled
-- approach_logistics.trailheadLat/trailheadLng, which were previously absent
-- entirely even though approach_logistics.trailhead already named Longmire in
-- text -- the coordinate fields were simply never populated for it.
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(waypoints, '{0,name}', '"Longmire Wilderness Information Center"'::jsonb),
          '{0,lat}', '46.7493'::jsonb
        ),
        '{0,lng}', '-121.8233'::jsonb
      ),
      '{0,elev}', '2762'::jsonb
    ),
    approach_logistics = jsonb_set(
      jsonb_set(approach_logistics, '{trailheadLat}', '46.7493'::jsonb),
      '{trailheadLng}', '-121.8233'::jsonb
    )
WHERE id = 'wa_point_success_south_side'
  AND waypoints#>>'{0,name}' = 'Westside Road / Dry Creek (Tahoma Creek) Trailhead'
  AND approach_logistics->'trailheadLat' IS NULL;

-- Fix 2: wa_poltergeist_pinnacle (Poltergeist Pinnacle, filed under area
-- wa_mount_challenger) --
-- This row's own data_quality.gaps already flagged the defect being fixed here:
-- "Approach text describes the Ross Lake/Big Beaver Trail corridor used for
-- southern Pickets objectives, but this route's own waypoints show the Hannegan
-- Pass/Whatcom Pass/Challenger Glacier approach instead -- needs a fresh
-- approach-beta rewrite to match the waypoints." That gap was correct and had
-- never been acted on: approach, road, approach_logistics.trailhead*, and
-- waypoints[0] ALL still described the Ross Dam Trailhead / Ross Lake water
-- taxi / Big Beaver Trail approach, while waypoints[1] onward (Hannegan Pass,
-- Boundary Camp, Whatcom Pass, Challenger Glacier Crossing) and this row's own
-- itinerary text ("Drive to the Hannegan Pass Trailhead and hike roughly 16 mi
-- via Hannegan Pass, the Chilliwack River ford, Easy Ridge, and the Imperfect
-- Impasse to camp at Perfect Pass") already correctly described the Hannegan
-- Pass approach. External corroboration (web search on the 2004 first-ascent
-- trip report, cascadeclimbers.com): "On July 3, Dan Aylward and another
-- climber hiked to Perfect Pass via Hannegan Pass/Easy Ridge. On July 4th, they
-- traversed around Challenger Arm and climbed a new route..." -- confirming the
-- Hannegan Pass approach is the historically correct one, not Ross Lake/Big
-- Beaver (which serves the SOUTHERN Pickets, a different sub-range).
--
-- This row is a known duplicate of wa_poltergeist_pinnacle_north_route (per that
-- row's own corrections field: "the duplicate row wa_poltergeist_pinnacle
-- already carries 445" for length_m) -- a thoroughly self-consistent row whose
-- gain_ft/loss_ft/dist_km are independently verified against its own
-- itinerary.days[] sums (gain 5000+1600+2200+2300=11100, loss
-- 2300+1000+2200+5200=10700, exact) and whose approach text matches the FA
-- account above. Copied that row's verified approach/road/access text and
-- gain_ft/loss_ft/dist_km onto this row, since both describe the identical
-- climb via the identical trailhead and this row's own numbers (dist_km 4.8 km,
-- gain_ft 7066, no loss_ft) cannot be reconciled with either the Hannegan Pass
-- approach's real length (17.5 mi one-way per both rows' own waypoints/
-- itinerary) or the Ross Lake/Big Beaver approach's real length (>20 mi
-- one-way) -- 4.8 km (3 mi) is too short for either.
--
-- pitches was 6, but this row's OWN pitch_detail array has only 4 entries
-- (P1, P2, P3, then "P4-6 (ridge, simul-climbed)" covering the whole ridge
-- traverse as one array element), and the FA trip report explicitly states
-- "The climb route consists of four pitches with ratings ranging from 5.7 to
-- 5.9" -- matching the sibling row's pitches=4 exactly. Corrected to 4.
UPDATE routes
SET pitches = 4,
    dist_km = 28.17,
    gain_ft = 11100,
    loss_ft = 10700
WHERE id = 'wa_poltergeist_pinnacle'
  AND pitches = 6
  AND dist_km = 4.8
  AND gain_ft = 7066
  AND loss_ft IS NULL;

-- wa_poltergeist_pinnacle: waypoints[0] (the trailhead pin) named "Ross Dam
-- Trailhead (SR-20 milepost 134)" at 3,100 ft -- see Fix 2's header comment.
-- Corrected to the Hannegan Pass Trailhead, matching the sibling row's own
-- waypoint and approach_logistics for the identical trailhead (no coordinate
-- invented -- copied from the sibling's own already-verified figures).
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0}', '{"type":"Trailhead","name":"Hannegan Pass Trailhead","lat":48.910185,"lng":-121.591971,"elev":3120,"distMi":0}'::jsonb)
WHERE id = 'wa_poltergeist_pinnacle'
  AND waypoints#>>'{0,name}' = 'Ross Dam Trailhead (SR-20 milepost 134)';

-- wa_poltergeist_pinnacle: approach_logistics.trailhead/trailheadLat/
-- trailheadLng/trailheadDirection all still named the Ross Dam Trailhead;
-- peakLat/peakLng (Mount Challenger's own summit) were already correct and are
-- left unchanged. Corrected the trailhead fields to Hannegan Pass, copied from
-- the sibling row's own approach_logistics.
UPDATE routes
SET approach_logistics = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(approach_logistics, '{trailhead}', '"Hannegan Pass Trailhead"'::jsonb),
          '{trailheadLat}', '48.910185'::jsonb
        ),
        '{trailheadLng}', '-121.591971'::jsonb
      ),
      '{trailheadDirection}', '"From the Hannegan Pass Trailhead (end of FR-32) via Hannegan Pass, the Chilliwack River, Easy Ridge and Whatcom Pass to Perfect Pass camp, then across the Challenger Glacier to the base of Poltergeist Pinnacle"'::jsonb
    )
WHERE id = 'wa_poltergeist_pinnacle'
  AND approach_logistics->>'trailhead' = 'Ross Dam Trailhead (SR-20 milepost 134)';

-- wa_poltergeist_pinnacle: approach text fully replaced (copied verbatim from
-- the sibling row's own already-verified approach text -- same trailhead, same
-- climb). Old text (Ross Lake/Big Beaver) is left documented in this file's
-- history/log rather than repeated here.
UPDATE routes
SET approach = 'Start at the Hannegan Pass Trailhead (end of FR 32, ~3,100 ft) on Trail #674. Climb steadily through forest for about 4 miles to Hannegan Pass (5,050 ft), then descend the climbers'' path toward the Chilliwack River/Boundary Camp area (last reliable water for a while) before regaining elevation onto Easy Ridge, a long, partly brushy climbers'' route past blueberry meadows and the old fire-lookout foundation/antenna remains atop Easy Peak. From Easy Ridge, contour toward Whatcom Peak''s east flank to the infamous ''Imperfect Impasse'' — a moat/cliff notch that often still holds snow well into summer and typically requires a short stretch of low 5th-class downclimbing or a scramble around/under a snow tunnel to cross; rope up if it looks insecure. Beyond the Impasse, climb snowfields (fog/whiteout is a real hazard here — parties have mistakenly headed for Whatcom''s summit wall instead of the pass) up to Perfect Pass (~5,800 ft), the standard base camp below Whatcom Peak. Trailhead to camp is roughly 16 miles one-way with about 7,000 ft of cumulative gain — a full, long day (8-12+ hours) for a fast party, and worth splitting into two days for most. From Perfect Pass, the second-day approach crosses onto the Challenger Glacier: rope up for crevasse hazard, traverse east around Challenger Arm, and cross roughly 2.5-3 miles of upper glacier into Luna Cirque below the east side of Mt. Challenger''s subsidiary summits. In lower-snow years a broken icefall blocks the direct line beneath Challenger''s sub-peaks; most parties detour high above the first crevasse band (or backtrack to Challenger Arm for a lower line) to reach the base of Poltergeist Pinnacle''s distinctive dike-streaked granite shield, the southernmost sub-summit between Challenger and Crooked Thumb.'
WHERE id = 'wa_poltergeist_pinnacle'
  AND approach LIKE '%Ross Dam Trailhead%'
  AND approach LIKE '%Big Beaver%';

-- wa_poltergeist_pinnacle: road field fully replaced (copied verbatim from the
-- sibling row's own road field -- Hannegan Pass Road / FR 32, not the Ross Lake
-- water taxi described previously).
UPDATE routes
SET road = '{"name":"Hannegan Pass Road (Forest Road 32)","status":"Seasonal — opens after snowmelt, typically by early-mid summer","driveNote":"From Glacier, WA, drive Mt. Baker Highway (SR 542) east about 13 miles, then turn onto FR 32 (Hannegan Pass/Ruth Creek Road) and continue roughly 5.3-5.4 miles to the Hannegan Trailhead/Campground at road''s end.","seasonalGate":"Closed by snow in winter and spring; road and trail typically open by early-mid summer"}'::jsonb
WHERE id = 'wa_poltergeist_pinnacle'
  AND road->>'name' = 'Ross Lake water taxi (from Ross Dam TH off SR-20) to Little Beaver, Northern Pickets';

-- wa_poltergeist_pinnacle: removed the now-resolved data_quality.gaps entry
-- (the approach-text mismatch this whole fix addresses) and bumped
-- lastVerified. The other two gaps (difficulty-breakdown estimate, thin
-- post-FA ascent history) are untouched -- still true, not addressed by this
-- batch.
UPDATE routes
SET data_quality = jsonb_set(
      jsonb_set(data_quality, '{gaps}', (data_quality->'gaps') - 'Approach text describes the Ross Lake/Big Beaver Trail corridor used for southern Pickets objectives, but this route''s own waypoints show the Hannegan Pass/Whatcom Pass/Challenger Glacier approach instead — needs a fresh approach-beta rewrite to match the waypoints.'),
      '{lastVerified}', '"2026-09-18"'::jsonb
    )
WHERE id = 'wa_poltergeist_pinnacle'
  AND data_quality->'gaps' @> '["Approach text describes the Ross Lake/Big Beaver Trail corridor used for southern Pickets objectives, but this route''s own waypoints show the Hannegan Pass/Whatcom Pass/Challenger Glacier approach instead — needs a fresh approach-beta rewrite to match the waypoints."]'::jsonb;

-- Fix 3: wa_poltergeist_pinnacle_north_route (East Face, area
-- wa_poltergeist_pinnacle) --
-- outing_shape was NULL. This row's own itinerary is an explicit round trip
-- returning to the Hannegan Pass Trailhead (day 4: "Break camp at Perfect Pass
-- and reverse the entire approach in one long push... down to the cars"), and
-- its own gain_ft/loss_ft (11100/10700) already match the itinerary's day-sum
-- exactly for that round trip. Set outing_shape = 'outback' so the app doubles
-- dist_km for round-trip display, matching this row's own totalNote ("~35 mi
-- round trip").
UPDATE routes
SET outing_shape = 'outback'
WHERE id = 'wa_poltergeist_pinnacle_north_route'
  AND outing_shape IS NULL;

-- Fix 4 (flagged, not corrected): wa_primus_peak_south_ridge (South Ridge /
-- McAllister Glacier) --
-- See the long gap note added below for the full diagnosis. Summary: this row's
-- gain_ft (7300) and dist_km (15.3) are CONFIRMED CORRECT by an external source
-- ("19.0-mile roundtrip hike with 7,300 feet of elevation gain" via the Thunder
-- Creek Trailhead) -- no numeric fix needed. The approach/descent_text/
-- itinerary PROSE, however, still describes a different peak's trailhead
-- (Dorado Needle's Eldorado Creek Trailhead on Cascade River Road), which this
-- row's own approach_logistics field already says outright. Flagging for a
-- human research pass rather than guessing at the real Thunder Creek route
-- detail.
UPDATE routes
SET data_quality = jsonb_set(data_quality, '{gaps}', (data_quality->'gaps') || '["FLAGGED 2026-09-18: approach, descent_text and itinerary all still describe the Eldorado Creek Trailhead / Cascade River Road approach (Eldorado Glacier, Inspiration Glacier, Klawatti Col) -- but this row''s OWN approach_logistics.trailheadDirection already documents that trailhead as belonging to Dorado Needle, 21.5 km away, and approach_logistics.trailhead/trailheadLat/trailheadLng plus waypoints[0] have already been corrected to the Thunder Creek Trailhead. External corroboration (web search): \"Primus Peak is most often reached via the Thunder Creek Trailhead... a 19.0-mile roundtrip hike with 7,300 feet of elevation gain\" -- matching this row''s own gain_ft (7300) and dist_km (15.3 km = 9.5 mi one-way = half of 19.0 mi) exactly, confirming those two numeric fields are ALREADY correct for the Thunder Creek approach even though the prose is not. Needs a full rewrite of approach/descent_text/itinerary to the actual Thunder Creek-based route (likely via Fisher Creek/Park Creek Pass or the McAllister Glacier corridor) -- not attempted here because the specific waypoint-by-waypoint detail of that approach was not found in sources reachable from this environment; a from-scratch rewrite risks inventing detail. Needs human research."]'::jsonb)
WHERE id = 'wa_primus_peak_south_ridge'
  AND NOT (data_quality->'gaps' @> '["FLAGGED 2026-09-18: approach, descent_text and itinerary all still describe the Eldorado Creek Trailhead / Cascade River Road approach (Eldorado Glacier, Inspiration Glacier, Klawatti Col) -- but this row''s OWN approach_logistics.trailheadDirection already documents that trailhead as belonging to Dorado Needle, 21.5 km away, and approach_logistics.trailhead/trailheadLat/trailheadLng plus waypoints[0] have already been corrected to the Thunder Creek Trailhead. External corroboration (web search): \"Primus Peak is most often reached via the Thunder Creek Trailhead... a 19.0-mile roundtrip hike with 7,300 feet of elevation gain\" -- matching this row''s own gain_ft (7300) and dist_km (15.3 km = 9.5 mi one-way = half of 19.0 mi) exactly, confirming those two numeric fields are ALREADY correct for the Thunder Creek approach even though the prose is not. Needs a full rewrite of approach/descent_text/itinerary to the actual Thunder Creek-based route (likely via Fisher Creek/Park Creek Pass or the McAllister Glacier corridor) -- not attempted here because the specific waypoint-by-waypoint detail of that approach was not found in sources reachable from this environment; a from-scratch rewrite risks inventing detail. Needs human research."]'::jsonb);

-- Fix 5: wa_prusik_peak_der_sportsman (Prusik Peak, Der Sportsman) --
-- watch_out was stored as a plain JSON STRING with embedded newlines
-- (jsonb_typeof = 'string'), unlike every other route in this batch and this
-- app's own convention, where watch_out is a JSON ARRAY of strings rendered
-- as separate bullet items. Converted to a proper array by splitting on the
-- newlines already present in the value -- no content invented or reworded.
UPDATE routes
SET watch_out = to_jsonb(string_to_array(watch_out #>> '{}', E'\n'))
WHERE id = 'wa_prusik_peak_der_sportsman'
  AND jsonb_typeof(watch_out) = 'string';

-- wa_prusik_peak_der_sportsman: gain_ft (6200) and loss_ft (4500) both disagree
-- with this row's own 3-day itinerary.days[] sum (gain 4000+700+700=5400, loss
-- 700+700+4000=5400 -- symmetric, as expected for a round trip back to the
-- same Stuart Lake Trailhead). Note gain_ft (6200) is IDENTICAL to the sibling
-- wa_prusik_peak_west_ridge's stored gain_ft, despite the two routes' own
-- itineraries implying different totals (5400 vs 5300) -- a sign both were
-- copied from a generic/stale value rather than computed per-route. The third
-- sibling on this same approach, wa_prusik_peak_south_face_burgner_stanley,
-- already has gain_ft=loss_ft=5400, exactly matching ITS OWN itinerary sum --
-- the already-corrected state this fix brings der_sportsman into line with.
-- Corrected to match this row's own itinerary.
UPDATE routes
SET gain_ft = 5400,
    loss_ft = 5400
WHERE id = 'wa_prusik_peak_der_sportsman'
  AND gain_ft = 6200
  AND loss_ft = 4500;

-- wa_prusik_peak_der_sportsman: outing_shape was NULL. This row's own 3-day
-- itinerary is a round trip back to the Stuart Lake Trailhead (day 3: "Hike
-- out", reversing day 1's approach). Set to 'outback'.
UPDATE routes
SET outing_shape = 'outback'
WHERE id = 'wa_prusik_peak_der_sportsman'
  AND outing_shape IS NULL;

-- Fix 6: wa_prusik_peak_south_face_burgner_stanley (South Face) --
-- descent_text and rappel_count_note both said "3-4 single-rope rappels" with
-- no hedge/explanation for the range, contradicting this SAME row's own
-- rope_note ("5 single-rope rappels down the north side off slung belay
-- stations... measured the rappels at roughly 30m each") and rappel_detail
-- array (5 entries, n=1..5) -- and this row's own corrections field already
-- documents the resolution: "2026-07-31: descent (5 single-rope raps off slung
-- stations, ~30m spacing) verified via Mountain Project and two independent
-- trip reports (climberkyle.com, stephabegg.com)." descent_text/
-- rappel_count_note were simply never updated to match that verified
-- correction. (Contrast with the sibling wa_prusik_peak_west_ridge, whose
-- descent_text/rappel_count_note/corrections all consistently discuss "4,
-- some report 5" as an acknowledged range -- not touched, not the same
-- defect.)
UPDATE routes
SET descent_text = replace(
      descent_text,
      'Plan on 3–4 single-rope rappels',
      'Plan on 5 single-rope rappels'
    ),
    rappel_count_note = replace(
      rappel_count_note,
      'Reported as 3-4 single-rope rappels depending on party choices;',
      'Reported as 5 single-rope rappels (the final pair of stations is optional -- station 4 also allows downclimbing 3rd/4th class to the climbers'' trail);'
    )
WHERE id = 'wa_prusik_peak_south_face_burgner_stanley'
  AND descent_text LIKE '%Plan on 3–4 single-rope rappels%'
  AND rappel_count_note LIKE 'Reported as 3-4 single-rope rappels depending on party choices;%';

-- wa_prusik_peak_south_face_burgner_stanley: outing_shape was NULL despite
-- gain_ft=loss_ft=5400 already matching this row's own itinerary exactly (a
-- round trip back to the Stuart Lake Trailhead). Set to 'outback'.
UPDATE routes
SET outing_shape = 'outback'
WHERE id = 'wa_prusik_peak_south_face_burgner_stanley'
  AND outing_shape IS NULL;

-- Fix 7: wa_prusik_peak_west_ridge (West Ridge) --
-- waypoints[0] (Stuart Lake Trailhead) had elev=1300, contradicting: (a) the
-- two siblings' identical trailhead (both 3,400 ft at essentially the same
-- coordinate), (b) this SAME row's own approach text ("Stuart Lake Trailhead
-- ...elev. ~3,400-3,600 ft"), and (c) the real-world elevation of the
-- Stuart/Colchuck trailhead off Icicle Creek Road (~3,400 ft, a well-
-- documented trailhead). Corrected to 3400.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '3400'::jsonb)
WHERE id = 'wa_prusik_peak_west_ridge'
  AND waypoints#>>'{0,elev}' = '1300';

-- wa_prusik_peak_west_ridge: gain_ft (6200) and loss_ft (4608) both disagree
-- with this row's own 3-day itinerary.days[] sum (gain 4000+600+700=5300, loss
-- 700+600+4000=5300 -- symmetric round trip). gain_ft (6200) is the same
-- stale/copied value flagged on the wa_prusik_peak_der_sportsman fix above.
-- Corrected to match this row's own itinerary.
UPDATE routes
SET gain_ft = 5300,
    loss_ft = 5300
WHERE id = 'wa_prusik_peak_west_ridge'
  AND gain_ft = 6200
  AND loss_ft = 4608;

-- wa_prusik_peak_west_ridge: outing_shape was NULL. This row's own itinerary
-- day 3 title is "Hike out via Aasgard Pass", reversing day 1's approach back
-- to the same Stuart Lake Trailhead. Set to 'outback'.
UPDATE routes
SET outing_shape = 'outback'
WHERE id = 'wa_prusik_peak_west_ridge'
  AND outing_shape IS NULL;

-- Fix 8: wa_ragged_edge (Vesper Peak, Ragged Edge) --
-- gain_ft (4115) disagreed with loss_ft (4400), this row's own single-day
-- itinerary.days[0] (gainFt=lossFt=4400 -- a car-to-car day returning to the
-- same trailhead, so gain must equal loss), AND itinerary.totalNote ("roughly
-- 10-11 hrs, ~4,400 ft gain"). Three independent fields inside this same row
-- agree on 4,400; only the top-level gain_ft was stale. Corrected to match.
UPDATE routes
SET gain_ft = 4400
WHERE id = 'wa_ragged_edge'
  AND gain_ft = 4115
  AND loss_ft = 4400;

-- wa_ragged_edge: access.seasonal carried a leftover clause about the Suiattle
-- River Road (FSR 26) being "the primary Glacier Peak access" -- unrelated to
-- Vesper Peak, which this SAME row's own corrections field already documents
-- was contaminated with Glacier Peak Wilderness boilerplate elsewhere
-- (land_manager, rules) and fixed on 2026-07-31; this is the same DB-wide
-- contamination pattern (first identified in batch 15) recurring in a field
-- that prior fix did not touch. Stripped the Glacier Peak/Suiattle sentence,
-- kept the genuinely-relevant Mountain Loop Highway seasonal gate info.
UPDATE routes
SET access = jsonb_set(access, '{seasonal}', '"Mountain Loop Highway has a seasonal gate closure (Deer Creek–Bedal, ~14 mi), typically Nov–mid/late May."'::jsonb)
WHERE id = 'wa_ragged_edge'
  AND access->>'seasonal' LIKE '%Suiattle River Road%';

