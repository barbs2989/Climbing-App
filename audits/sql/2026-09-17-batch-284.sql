-- WA alpine audit batch 284 (pass 5)
-- Routes checked: wa_mount_terror_north_face, wa_mount_terror_southeast_face,
-- wa_mount_terror_stoddard_buttress, wa_mount_terror_west_ridge,
-- wa_mount_thomson_west_ridge, wa_mount_tom_scramble, wa_mount_torment_south_ridge,
-- wa_mount_torment_torment_forbidden_traverse

-- Fix 1: wa_mount_terror_north_face -- gain_ft (6,000) is below the mathematically
-- required floor: this route's own waypoint chain runs Goodell Creek Trailhead (600 ft)
-- up through six intermediate points to the Mount Terror summit (8,151 ft, matching
-- areas.wa_mount_terror), and 8,151-600 = 7,551 ft is the bare minimum net rise --
-- 1,551 ft more than the stored value. 6,000 ft appears to describe only the two-day
-- APPROACH to Crescent Creek Basin camp (the route's own approach text separately states
-- "~6,000 ft gain" for reaching camp), omitting the climbing day's additional net gain to
-- the true summit. Corrected using this row's own waypoint elevation chain (cumulative
-- positive elevation change: 600->1700->5000->6200->5800->6500->7700->8151 ft =
-- 7,951 ft of total ascent), which is the most precise figure available in the row itself.
UPDATE routes
SET gain_ft = 7951
WHERE id = 'wa_mount_terror_north_face'
  AND gain_ft = 6000;

-- Fix 2: wa_mount_terror_southeast_face -- same class of error as Fix 1 (identical
-- trailhead/summit pair, so the same 7,551 ft floor applies): gain_ft (6,000) also
-- describes only the approach-to-camp figure, not the whole route. This row already
-- carries a companion loss_ft of 7,550 -- effectively the same trailhead-to-summit rise,
-- and the value the row's own descent accounting already treats as correct. Corrected
-- gain_ft to match the row's own loss_ft, the same "match the row's own companion field"
-- fix already applied to wa_mount_stuart_stuart_glacier_couloir in batch 283.
UPDATE routes
SET gain_ft = 7550
WHERE id = 'wa_mount_terror_southeast_face'
  AND gain_ft = 6000
  AND loss_ft = 7550;

-- Fix 3: wa_mount_terror_southeast_face -- watch_out array contained four generic/
-- misapplied entries inconsistent with every other field on this row: a glaciated-approach
-- "continuous rope essential ... bergschrund crossing required" entry and a "moat crossing"
-- entry, though this row's own approach/beta/itinerary describe only slabs, talus and a
-- short ridge (no glacier is named anywhere else on the row, and this route's own
-- `hazards` field independently lists "Notoriously loose, choss-prone rock" and an
-- "Exposed slab traverse" with no glacier hazard at all); a "Potential avalanche exposure
-- on approach slopes ... assess stability in spring" entry, though this row's own
-- best_season/seasonal_guidance state a Jul-Sep dry-rock window with no spring climbing
-- season mentioned anywhere; and a "altitude gain to 8400 ft" figure that contradicts this
-- row's own high_point_ft (8,151 ft, matching areas.wa_mount_terror and the row's own
-- waypoints[]). Web search corroborates the East Ridge's actual character as a talus/
-- scree/snowfield approach with no bergschrund/moat crossing (SummitPost's East Ridge
-- page: scree/talus/snowfield to the ridge base, watch for "wells" in late-season snow --
-- not continuous glacier travel). Kept the four remaining entries (loose rock, route-
-- finding among false summits, weather exposure, descent complexity), all independently
-- consistent with this row's own hazards/approach/descent_text fields, correcting the
-- altitude figure in the weather-exposure entry and rewording internal semicolons to
-- periods/em dashes purely so this checker's/the SQL Editor's statement-splitter cannot
-- fragment the UPDATE on them (no wording removed by that rewording, only punctuation).
UPDATE routes
SET watch_out = '["Loose rock sections on east ridge—unstable granite typical of area. Test holds. Rockfall potential from upper sections and other climbers.", "Route-finding on initial ridge sections—terrain confusing with multiple false summits. Verify the correct line and study photos/topo beforehand.", "Weather exposure on high ridge—exposed position near the 8,151 ft summit. Afternoon storms are common, with lightning hazard.", "Descent complexity—rappel setup required on some sections. Route-finding matters on the descent, and tired climbers increase risk."]'::jsonb
WHERE id = 'wa_mount_terror_southeast_face'
  AND watch_out::text LIKE '%Glacier approach with crevasse field%';

-- Fix 4: wa_mount_thomson_west_ridge -- gain_ft/loss_ft (5,200/5,200) contradict this
-- row's own itinerary, which is explicit and internally consistent: itinerary.days[0]
-- states gainFt/lossFt of 3,600/3,600 for the single car-to-car day (West Ridge up, East
-- Ridge down), and itinerary.totalNote independently restates "~3,600 ft gain/loss" in
-- prose. Corrected to match the row's own stated total.
UPDATE routes
SET gain_ft = 3600, loss_ft = 3600
WHERE id = 'wa_mount_thomson_west_ridge'
  AND gain_ft = 5200
  AND loss_ft = 5200;

-- Fix 5: wa_mount_thomson_west_ridge -- bivy carried an 8-entry corridor-wide camp list
-- for the whole Western Alpine Lakes/Snoqualmie Pass area, of which 7 entries describe
-- camps for entirely different peaks with no bearing on this route: Commonwealth
-- Basin/Red Pond (explicitly "the natural overnight for Lundin Peak and for Red
-- Mountain"), Melakwa Lake ("the camp for Kaleetan Peak and Bryant Peak"), Rachel Lake
-- ("the base for Alta Mountain and for Hibox Mountain"), Rampart Lakes (Alta Mountain),
-- Alaska/Joe Lake ("the direct way into Chikamin Peak and Huckleberry Mountain"), Park
-- Lakes ("the standard camp for Chikamin Peak's southeast slopes"), and Kachess
-- Campground ("the drive-in answer" for Alta/Hibox via a different trailhead/road
-- entirely). This route's own itinerary explicitly frames Mount Thomson as a single
-- long car-to-car day (no overnight required), reached via the PCT North/Commonwealth
-- Basin trailhead over the Kendall Katwalk to Ridge Lake, then Bumblebee Pass -- a
-- different approach corridor from all seven pruned camps. Pruned to the one entry that
-- is geographically on this route's own stated approach (Ridge Lake/Gravel Lake, which
-- this row's own `approach` and `waypoints` fields both place directly on the PCT
-- roughly a mile past the Kendall Katwalk and a short distance before the Bumblebee Pass
-- climbers' path), adding one sentence (drawn only from this row's own approach/waypoints
-- fields, not researched) making the connection to Thomson explicit, and rewording two
-- internal semicolons to periods/dashes for the same statement-splitter reason as Fix 3.
UPDATE routes
SET bivy = '[{"elev": 5270, "name": "Ridge Lake and Gravel Lake, PCT beyond Kendall Katwalk", "type": "camp", "notes": "These sit about seven and a half miles out on the PCT, a mile or so past the Kendall Katwalk. For Kendall Peak itself they are past the objective — the scramble leaves the PCT well before the Katwalk — so this is a contingency rather than a plan for that peak. Their real value is as the only established camp on the crest walk north, which is what makes a PCT approach to Huckleberry Mountain and Chikamin Peak thinkable at all: from here the trail keeps north past Alaska Mountain toward Huckleberry, with Chikamin beyond that. Treat the Katwalk itself as the gate on the season. It is a narrow shelf blasted into a cliff and it is genuinely dangerous with snow on it, so the practical window here is mid-summer to early autumn rather than whenever the road is open. The ridge is exposed to weather with nowhere to retreat below treeline for miles. This is also the closest established camp along Mount Thomson''s own PCT approach, roughly 1 mile past the Katwalk and a short distance before the Bumblebee Pass climbers'' path branches off toward Thomson''s West Ridge.", "water": "Both lakes hold water through summer — treat it. Late-season they drop and the ground around them gets trampled and dusty. No running water on the ridge between here and the pass.", "permit": "Free self-issue Alpine Lakes Wilderness permit at the exit 52 PCT trailhead. Gravel Lake is on the designated-sites-only list, so camp only at established sites within half a mile of it. Campfires are prohibited above 4,000 ft on this trail, which means the entire segment including both lakes is stoves only. Party size capped at 12. Northwest Forest Pass or interagency pass to park — the lot is a Sno-Park in winter.", "capacity": "Several established sites split between the two small lakes — exposed, limited, and popular with through-hikers as well as weekend parties"}]'::jsonb
WHERE id = 'wa_mount_thomson_west_ridge'
  AND bivy::text LIKE '%the natural overnight for Lundin Peak%';
