-- WA alpine audit — pass 2, batch 68 (2026-08-07)
-- Guye Peak (West Face, North Route, Southeast Gully), Hadley Peak (Cougar Divide, Skyline
-- Divide), Helmet Butte (Standard Route), Himmelhorn (Southeast Route — no fixes, see log),
-- Mount Deception (Honeymoon Route)

-- wa_guye_peak_r1 (West Face): high_point_ft (5169) is the sole outlier against every other
-- reference to this same summit -- the parent area row (elevation_ft 5168), this route's own
-- summit waypoint (elev 5168), and both sibling routes' high_point_ft (5168) all agree on
-- 5,168 ft, matching Wikipedia/aggregated peakbagger sources.
UPDATE routes SET high_point_ft = 5168 WHERE id = 'wa_guye_peak_r1';

-- wa_guye_peak_r1: waypoints[1] ("Guye Peak summit") and the matching gpx[1] point are ~170m
-- south of every other coordinate on file for the identical point, including this route's own
-- approach_logistics.peakLat/peakLng and both sibling routes' summit coordinates -- a
-- self-contradiction within the row, not a genuinely different summit.
UPDATE routes SET waypoints = jsonb_set(jsonb_set(waypoints, '{1,lat}', '47.442945'), '{1,lng}', '-121.409145') WHERE id = 'wa_guye_peak_r1';
UPDATE routes SET gpx = jsonb_set(jsonb_set(gpx, '{1,0}', '47.442945'), '{1,1}', '-121.409145') WHERE id = 'wa_guye_peak_r1';

-- wa_guye_peak_r2 (North Route): itinerary/timing describe an entirely different, nonexistent
-- route ("North Rib" reached via "the non-established talus route") that contradicts this same
-- row's own approach/beta/overview and even its own itinerary.cal field, which explicitly
-- states the North Route uses the separate Cave Ridge Trail and is unaffected by the 2021
-- Alpental road closure. Reads as West Face boilerplate copy-pasted without updating the route
-- name or approach; also carried over West Face's summit-elevation figure (5,169, already
-- fixed above to 5,168) and a mid-word truncation in sectionBreakdown[0].note. Rewritten to
-- match this route's own documented approach/beta.
UPDATE routes SET itinerary = '{"cal":"The 2021 Alpental Community Club road closure affects the West Face/Improbable Traverse talus approach, not this route -- the North Route uses the established Cave Ridge Trail from the Snow Lake trailhead and is unaffected. Climb June-October.","days":[{"n":1,"note":"From the Snow Lake trailhead, follow the separate Cave Ridge/Snoqualmie Mountain climbers'' trail (not the West Face talus approach) up to the Cave Ridge-Guye saddle, then follow the ridge north to Guye''s north summit via the class 3-4 North Route, with an optional 5.4 ''Hidden Ridge'' variation. Descend via the standard South Rib/Cave Ridge saddle scramble/rappel route back to the trailhead.","hours":7,"miles":3,"title":"Car-to-car: Cave Ridge Trail approach, North Route, summit","gainFt":2000,"lossFt":2000,"packLb":15,"schedule":[{"time":"7:00 AM","label":"Leave Snow Lake trailhead","detail":"Cave Ridge/Snoqualmie Mountain climbers'' trail, a separate path from the West Face talus approach and unaffected by the Alpental Community Club road closure."},{"time":"+1.5 hr","label":"Reach the Cave Ridge-Guye saddle","detail":"Cave Ridge Trail approach up to the saddle, then turn right (north) onto the ridge toward Guye''s north side."},{"time":"+3.5 hr","label":"Climb the North Route to the summit","detail":"Class 3-4 scramble with an optional 5.4 move on the Hidden Ridge variation; roughly comparable in length to the neighboring West Face route."},{"time":"+4 hr","label":"Summit (5,168 ft)","detail":""},{"time":"+4.5 to 7 hr","label":"Descend the standard scramble/rappel route","detail":"South Rib / Cave Ridge saddle back to the Snow Lake trailhead."}],"objective":"Summit Guye Peak via the North Route"}],"totalNote":"A roadside day similar in scope to Guye Peak''s other lines: roughly 6-7 hrs car-to-car for about 2,000 ft of gain.","sourceNote":"On-file data for this route is sparse (no gain/pitch figures, only a one-line descent note), and no route-specific trip report was found. Timing estimated by analogy to the neighboring, better-documented West Face and Improbable Traverse routes on the same peak, which share the same trailhead and similar elevation gain (2,000 ft to the shared 5,168 ft summit) and the same standard South Rib/Cave Ridge descent, even though this route''s own approach (the separate Cave Ridge Trail) and difficulty (class 3-4 scramble) differ from theirs -- treat this itinerary as a lower-confidence estimate rather than a sourced one."}'::jsonb
WHERE id = 'wa_guye_peak_r2';
UPDATE routes SET timing = '{"totalHrs":7,"summitTimeHrs":7,"descentTimeHrs":null,"approachTimeHrs":null,"recommendedStart":"7:00 AM from the trailhead","sectionBreakdown":[{"hrs":7,"note":"From the Snow Lake trailhead, follow the Cave Ridge/Snoqualmie Mountain climbers'' trail to the Cave Ridge-Guye saddle, then follow the ridge north to Guye''s north summit via the class 3-4 North Route (optional 5.4 ''Hidden Ridge'' variation).","fromTo":"Car-to-car: Cave Ridge Trail approach, North Route, summit","section":"Climb"}]}'::jsonb
WHERE id = 'wa_guye_peak_r2';

-- wa_guye_peak_southeast_gully: trailhead waypoint (PCT North / Snoqualmie Pass North
-- Trailhead, same point used in this row's own `road` field) was missing elevFt. USFS/
-- Mountaineers/AllTrails sources consistently give 3,045 ft for this trailhead (start of the
-- Commonwealth Basin Trail), which also reconciles this route's gain_ft (2,100) against the
-- true floor (5,168 - 3,045 = 2,123 ft).
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elevFt}', '3045') WHERE id = 'wa_guye_peak_southeast_gully';

-- wa_hadley_peak_skyline_divide: gain_ft/loss_ft (2818/2818) are below this route's own
-- mathematical floor (trailhead-to-summit alone implies ~3,272+ ft) and directly contradicted
-- by this same row's own pro_tips field ("GPS-tracked hikes commonly log more gain (3,300+ ft)
-- than simple trailhead-to-summit elevation math would suggest").
UPDATE routes SET gain_ft = 3300, loss_ft = 3300 WHERE id = 'wa_hadley_peak_skyline_divide';

-- wa_hadley_peak_skyline_divide: trailhead waypoint elevFt (4250) -- USFS's own trail page
-- states the Skyline Divide Trailhead sits at 4,400 ft, corroborated by Mountaineers.org
-- (4,350 ft) and Trailforks (4,346 ft floor); nothing supports ~4,250 ft.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elevFt}', '4400') WHERE id = 'wa_hadley_peak_skyline_divide';

-- wa_hadley_peak_cougar_divide: summit waypoint elevFt (7470) contradicts this route's own
-- high_point_ft (7522), the sibling Skyline Divide route's high_point_ft (7522), and the
-- parent area's elevation_ft (7522) -- all naming the identical "Hadley Peak" summit point.
-- Resolves the row's internal self-contradiction to the value used consistently everywhere
-- else on file (external sources disagree on Hadley's true elevation across a wider range --
-- see log/flagged items -- this fix does not attempt to settle that).
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '7522') WHERE id = 'wa_hadley_peak_cougar_divide';

-- wa_hadley_peak_cougar_divide / wa_hadley_peak_skyline_divide: access.land_manager (snake_case
-- field only -- the camelCase access.landManager sibling field is already correct on both rows)
-- wrongly claims some approaches cross into North Cascades National Park. Mount Baker/Hadley
-- Peak sit entirely within Mount Baker Wilderness/USFS land; NCNP's nearest boundary is ~20 mi
-- away near Hannegan Pass, nowhere near this Skyline/Cougar Divide corridor. access.rules
-- carried the same NCNP-permit contamination and is corrected to the actual Mount Baker
-- Wilderness rule (blue-bag waste pack-out) on both routes.
UPDATE routes SET access = jsonb_set(jsonb_set(access, '{land_manager}', '"Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District) -- Mount Baker Wilderness"'), '{rules}', '"Pack out human waste (blue bags) -- no burial or glacier deposition."') WHERE id = 'wa_hadley_peak_cougar_divide';
UPDATE routes SET access = jsonb_set(jsonb_set(access, '{land_manager}', '"Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District) -- Mount Baker Wilderness"'), '{rules}', '"Pack out human waste (blue bags) -- no burial or glacier deposition."') WHERE id = 'wa_hadley_peak_skyline_divide';

-- wa_helmet_butte_standard_route: access.land_manager/landManager name the Darrington Ranger
-- District (a different national forest side entirely, ~80mi away on the Mountain Loop
-- Highway) and, separately, Chelan Ranger District -- neither manages the actual Chiwawa
-- River Road/Trinity Trailhead approach used by this route. USFS's own closure alert for FR
-- 6200/Trinity confirms this drainage is Wenatchee River Ranger District, Okanogan-Wenatchee NF.
UPDATE routes SET access = jsonb_set(jsonb_set(access, '{land_manager}', '"Wenatchee River Ranger District, Okanogan-Wenatchee National Forest"'), '{landManager}', '"Glacier Peak Wilderness spans the Mount Baker-Snoqualmie National Forest (Darrington Ranger District, west/north side) and Okanogan-Wenatchee National Forest (Wenatchee River Ranger District, east side); the Trinity/Buck Creek Pass approach is managed by the Wenatchee River Ranger District"') WHERE id = 'wa_helmet_butte_standard_route';

-- wa_helmet_butte_standard_route: emergency.rangerStation cites the Chelan Ranger District's
-- real address/phone, but that office doesn't manage this trailhead -- corrected to the
-- Wenatchee River Ranger District (600 Sherbourne St, Leavenworth, (509) 548-2550), consistent
-- with the land_manager fix above.
UPDATE routes SET emergency = jsonb_set(emergency, '{rangerStation}', '"Wenatchee River Ranger District, Okanogan-Wenatchee National Forest, 600 Sherbourne St, Leavenworth, WA 98826 - (509) 548-2550"') WHERE id = 'wa_helmet_butte_standard_route';

-- wa_helmet_butte_standard_route: access.parking_pass named "Mountain Loop Highway"
-- trailheads -- an unrelated west-side Darrington/Verlot trailhead system with no connection
-- to this route's actual Chiwawa River Road/Trinity Trailhead approach. Same
-- boilerplate-contamination pattern flagged repeatedly in prior batches.
UPDATE routes SET access = jsonb_set(access, '{parking_pass}', '"Northwest Forest Pass or Interagency Pass required for parking at the Trinity Trailhead -- $5/day or $30/year for the Northwest Forest Pass."') WHERE id = 'wa_helmet_butte_standard_route';

-- wa_helmet_butte_standard_route: waypoints[0] ("Helmet Butte Summit") elevFt (7420)
-- contradicts this same row's own high_point_ft (7400) and its own `corrections` field, which
-- documents deliberately choosing Wikipedia's 7,400 ft over ListsOfJohn's 7,420 ft -- the
-- waypoint was never synced to that decision.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elevFt}', '7400') WHERE id = 'wa_helmet_butte_standard_route';

-- wa_helmet_butte (area): blurb said "a rounded 7,372-ft summit", disagreeing with this same
-- area row's own elevation_ft (7400) and matching no source found (7,366 WTA / 7,400 Wikipedia
-- / 7,420 ListsOfJohn+SummitPost) -- a stray typo, not a genuine alternate figure.
UPDATE areas SET blurb = replace(blurb, '7,372-ft summit', '7,400-ft summit') WHERE id = 'wa_helmet_butte';

-- wa_honeymoon_route (Mount Deception): emergency.rangerStation gives the wrong address AND
-- phone for the Wilderness Information Center (600 E. Park Ave / 360-565-3130 is the separate
-- park-headquarters mailing address and general visitor-center line). Multiple independent
-- sources place the WIC at 3002 Mount Angeles Rd, Port Angeles, (360) 565-3100 -- and this
-- same row's own access._raw.permit_pickup_hours field already correctly cites 360-565-3100,
-- making this also a self-contradiction.
UPDATE routes SET emergency = jsonb_set(emergency, '{rangerStation}', '"Olympic National Park Wilderness Information Center, 360-565-3100, 3002 Mount Angeles Rd, Port Angeles, WA 98362"') WHERE id = 'wa_honeymoon_route';

-- wa_honeymoon_route: access._raw.seasonal_closure_dates/access.closures gave "May 1 - Sept 30"
-- for Royal Basin's reservation season -- NPS's Royal Basin reservation info and secondary
-- permit aggregators agree the actual quota/reservation window is June 15 - Oct 15, which is
-- also internally consistent with this row's own seasonal_guidance.monthBreakdown.June note
-- ("Royal Basin permits open June 15").
UPDATE routes SET access = jsonb_set(jsonb_set(access, '{_raw,seasonal_closure_dates}', '"Royal Basin quota/reservation season: June 15 - Oct 15 (reservation required); outside that window (winter season, Oct 16 - May 14) requires contacting the Wilderness Information Center directly, not open self-registration."'), '{closures}', '"Royal Basin quota/reservation season: June 15 - Oct 15 (reservation required); outside that window (winter season, Oct 16 - May 14) requires contacting the Wilderness Information Center directly, not open self-registration."') WHERE id = 'wa_honeymoon_route';

-- wa_honeymoon_route: waypoints[1] (Upper Dungeness Trailhead) elevFt (2900) contradicts this
-- same row's own approach text, which already correctly states the trailhead is "~2,500 ft" --
-- externally confirmed via Mountaineers.org (trailhead 2,500 ft; 2,900 ft is actually the
-- Olympic NP boundary about 1.2 mi up-trail, a different point).
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '2500') WHERE id = 'wa_honeymoon_route';
