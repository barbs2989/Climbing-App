-- Batch 262 (pass 5): wa_inner_constance_northwest_buttress, wa_inner_constance_standard,
--   wa_inspiration_peak_west_ridge, wa_jack_mountain_nohokomeen_headwall,
--   wa_jack_mountain_northeast_glacier, wa_jack_mountain_south_face,
--   wa_johannesburg_mountain_cj_couloir, wa_johannesburg_mountain_northeast_buttress

-- Fix 1: wa_inner_constance_northwest_buttress -- bivy held 6 entries; 5 of them
-- (Camp Mystery/Marmot Pass/Buckhorn Lake -- all for Buckhorn Mountain and Mount
-- Worthington; Camp Windy -- Mount Townsend; Boulder Shelter -- content specifically
-- about Warrior Peak's SE summit) describe camps for four entirely different peaks,
-- matching CLAUDE.md's own documented audit:camp-route-fit contamination pattern (a
-- corridor zone-file bleeding onto an unrelated route). Only the 6th entry, "Home Lake,
-- below Constance Pass", is genuinely about this route -- its own text says "the
-- northwest side of Inner Constance works up... toward the 7,670 ft summit," matching
-- this route's own face/overview (NW side, Home Creek basin approach, high_point_ft
-- 7670). Trimmed to that one entry.
UPDATE routes SET bivy = '[{"elev": 5330, "name": "Home Lake, below Constance Pass \u2014 inside the park, and reached from the north", "type": "camp", "notes": "The high camp for both Warrior Peak and the northwest side of Inner Constance, and the natural next step up from Boulder Shelter once you want to be closer to the peaks. Reach it from the UPPER DUNGENESS trailhead by way of Camp Handy and Boulder Shelter \u2014 the approach from the Dosewallips over Constance Pass is technically the same lake but adds the long closed-road walk on that side and is not how anyone sensibly gets here. Do not confuse this basin with Lake Constance: they sit on opposite flanks of the massif, the twenty-person quota that governs Lake Constance does not apply here, and neither camp substitutes for the other. From Home Lake the usual line for Inner Constance works up the northwest side toward the 7,670 ft summit on loose alpine rock; the northeast summit by way of Crystal Pass at the head of Avalanche Canyon is a different climb from a different camp altogether. Camping lower at Boulder Shelter saves you the permit and the canister at the cost of two miles and 400 ft each way on summit morning, which on a long alpine day is a real price. Snow-free from roughly July; the basin is exposed and holds weather off Constance Pass.", "water": "The lake, reliable through the season. It is the last dependable water before Constance Pass and before anything you climb from here, and the slopes above hold no running water once the snow has gone.", "permit": "OLYMPIC NATIONAL PARK, and everything changes at the boundary sign about a mile below the lake. An overnight wilderness permit is mandatory and is reserved in advance through the federal recreation booking site; the summer season runs roughly mid-May to mid-October with reservations opening in the spring. BEAR CANISTERS ARE REQUIRED \u2014 hangs and wires are not accepted, and free loaners can be collected from the park wilderness office. No fires at this elevation. Dogs are prohibited. None of this applies at Boulder Shelter two miles back down the trail, and confusing the two is the standard way to arrive here without a legal place to sleep.", "capacity": "A few small sites in an open subalpine basin; the park sets a maximum party size for the area, so check what your permit allows before assuming a big group fits"}]'::jsonb WHERE id = 'wa_inner_constance_northwest_buttress';

-- Fix 2: wa_inner_constance_standard -- carried the IDENTICAL 6-entry contaminated bivy
-- array as Fix 1 (same area_id). Unlike the Northwest Buttress route, NONE of the 6
-- entries apply here: this route's own approach/road/itinerary describe the
-- Dosewallips-side approach (Constance Pass / Crystal Pass) or, per its own
-- approach_variants[0], the separate Lake Constance/Avalanche Canyon approach -- neither
-- of which touches the Upper Dungeness/Buckhorn-Wilderness corridor the bivy entries
-- describe (Camp Mystery, Marmot Pass, Buckhorn Lake, Camp Windy, Boulder Shelter, and
-- even "Home Lake" itself, whose own text is about Warrior Peak and Inner Constance's
-- NORTHWEST side -- a different approach/camp than either of this route's own two
-- documented lines). Cleared entirely, matching the wa_mount_pilchuck_standard_route
-- precedent (batch 148) of clearing bivy when no entry is about the route's own approach.
UPDATE routes SET bivy = NULL WHERE id = 'wa_inner_constance_standard';

-- Fix 3: wa_jack_mountain_nohokomeen_headwall -- dist_km (17.7, implying an 11.0 mi
-- one-way / 22 mi round-trip under this app's distKm*2 rendering convention) contradicts
-- this row's OWN overview text ("The round trip is rated at 30 miles and 10,000 ft of
-- gain") and is confirmed wrong against Mountaineers.org's official route listing for
-- this exact route ("30.0 miles round trip, 10,000 ft gain" -- matches this row's own
-- gain_ft exactly). 17.7 km (11.0 mi) actually matches only the ONE-WAY distance to camp
-- (8 mi trail + 3 mi bushwhack per this row's own approach text), not the full one-way
-- distance to the summit and back. Corrected to 15.0 mi one-way = 24.14 km so that
-- distKm*2 renders the correct, externally-confirmed 30 mi round trip.
UPDATE routes SET dist_km = 24.14 WHERE id = 'wa_jack_mountain_nohokomeen_headwall';

-- Fix 4: wa_jack_mountain_nohokomeen_headwall -- bivy held 6 entries describing camps
-- for Colonial Peak, Snowfield Peak, Cosho Peak and Crater Mountain (a completely
-- different SR-20/Colonial Creek/Easy Pass corridor, nowhere near Jack Mountain) plus
-- "Jerry Lakes basin, Jack Mountain SOUTH side" -- explicitly the high camp for the
-- SOUTH FACE route, not this NORTH-side glacier/headwall route, whose own documented
-- camps (a bench at ~5,200 ft below the glacier toe, or a high camp near 7,400 ft on the
-- glacier itself, both reached via the East Bank Trail/May Creek) appear in NONE of the
-- 6 stored entries. Cleared entirely.
UPDATE routes SET bivy = NULL WHERE id = 'wa_jack_mountain_nohokomeen_headwall';

-- Fix 5: wa_jack_mountain_northeast_glacier -- carried the IDENTICAL 6-entry
-- contaminated bivy array as Fix 4 (same area_id, same corridor-bleed defect). This
-- route's own approach is also the north side of Jack Mountain (May Creek / East Bank
-- Trail), so the same reasoning applies -- none of the 6 entries, including the
-- south-side Jerry Lakes camp, describe this route's own approach or camp. Cleared
-- entirely.
UPDATE routes SET bivy = NULL WHERE id = 'wa_jack_mountain_northeast_glacier';

-- Fix 6: wa_jack_mountain_south_face -- dist_km (35, implying a 21.75 mi one-way /
-- 43.5 mi round-trip under distKm*2) is inconsistent with this row's own waypoints
-- (cumulative distMi of 11.5 to the summit) and its own itinerary.totalNote ("A 3-day,
-- ~22-24 mile round trip"), both of which independently converge on a ~22-23 mi round
-- trip. Corrected to 11.5 mi one-way = 18.51 km so distKm*2 matches this row's own
-- stated round-trip mileage.
UPDATE routes SET dist_km = 18.51 WHERE id = 'wa_jack_mountain_south_face';

-- Fix 7: wa_jack_mountain_south_face -- overview text ("Jack Mountain (9,069 ft)") and
-- waypoints[6] (summit, elev/elevFt 9069) disagree with this row's own high_point_ft
-- (9075) and with its two sibling routes on the same peak (wa_jack_mountain_
-- nohokomeen_headwall and wa_jack_mountain_northeast_glacier), which both store the
-- summit at 9075 -- matching Wikipedia's cited NAVD88 figure of 9,075 ft (confirmed via
-- WebSearch). This row's own data_quality.gaps already flagged the 9,066-9,075 ft
-- source variance as an open item "pending a clearer source"; 9,075 ft NAVD88 is that
-- clearer, more current source, and aligning removes an internal three-way split on one
-- mountain within this same catalog. Updates the overview text, the summit waypoint's
-- elev/elevFt, and removes the now-resolved data_quality gap.
UPDATE routes SET
  overview = replace(overview, 'Jack Mountain (9,069 ft)', 'Jack Mountain (9,075 ft)'),
  waypoints = jsonb_set(
    jsonb_set(waypoints, '{6,elev}', '9075', false),
    '{6,elevFt}', '9075', false
  ),
  data_quality = jsonb_set(
    data_quality,
    '{gaps}',
    (SELECT jsonb_agg(g) FROM jsonb_array_elements(data_quality->'gaps') g
     WHERE g::text NOT LIKE '%Summit elevation varies by source%')
  )
  WHERE id = 'wa_jack_mountain_south_face';

-- Fix 8: wa_johannesburg_mountain_cj_couloir -- bivy held 6 entries; 5 of them (Boston
-- Basin lower/upper camp, Sahale Glacier Camp, Pelton Basin, and the "informal snow and
-- rock bivouacs above the basins" note) describe camps used for Forbidden Peak, Sharkfin
-- Tower, Sahale Peak, Boston Peak, Mixup Peak and Magic Mountain -- all reached from the
-- SAME Cascade River Road/Cascade Pass trailhead but serving entirely different
-- objectives on the far side of Cascade Pass, not Johannesburg. Only "Johannesburg
-- Camp" is genuinely about this route -- its own text names it "the practical staging
-- point for the Cascade-Johannesburg Couloir" directly. Trimmed to that one entry.
UPDATE routes SET bivy = '[{"elev": 3400, "name": "Johannesburg Camp", "type": "camp", "notes": "A walk-in camp a short, steep and often slick few minutes above the Cascade Pass trailhead at the end of the road \u2014 not a drive-up campground, you carry everything in. It is the practical staging point for the Cascade-Johannesburg Couloir, Cascade Peak, and any pre-dawn start where you want to be at the road end the night before. If it is full, Marble Creek and Mineral Park down the Cascade River Road are the car campgrounds, at the cost of driving the rough section twice.", "water": "A creek runs beside the sites and normally holds water through the season, being fed by drainage off the north side of Johannesburg Mountain rather than by a single small snowfield.", "permit": "NPS wilderness permit required even though the camp is minutes from the car; Cascade River Road permits are issued in person at Marblemount, part reservable on Recreation.gov and part held for walk-ups. Approved bear-resistant food storage is required.", "capacity": "Three small primitive sites, so it is easily filled by one or two parties."}]'::jsonb WHERE id = 'wa_johannesburg_mountain_cj_couloir';
