-- WA alpine audit batch 282 (pass 5)
-- Routes checked: wa_mount_shuksan_price_glacier, wa_mount_shuksan_sulphide_glacier,
-- wa_mount_shuksan_white_salmon_glacier, wa_mount_spickard_silver_glacier,
-- wa_mount_spickard_southwest, wa_mount_st_helens_monitor_ridge,
-- wa_mount_st_helens_worm_flows, wa_mount_stuart_girth_pillar

-- Fix 1: wa_mount_shuksan_price_glacier -- access.fees claimed the North Cascades NP
-- backcountry permit is free ("free NPS permit only if camping overnight past the park
-- boundary"). This is contradicted by five other sources on file: the row's OWN six
-- bivy[].permit entries all say the permit is "no longer free" with per-person/reservation
-- fees, and four sibling routes on the same peak/area (wa_mount_shuksan_sulphide_glacier,
-- wa_mount_shuksan_white_salmon_glacier, wa_mount_spickard_silver_glacier,
-- wa_mount_spickard_southwest) all independently state the fee as "$10 per person plus a
-- $6 fee, youth 15 and under free." Confirmed against NPS's own published fee schedule via
-- web search: North Cascades NP backcountry permits carry a $10/person recreation fee plus
-- a $6 non-refundable reservation fee during the May-October quota season (free/self-issued
-- only Nov-Mar, outside the season this row's own routes are actually climbed in).
-- Corrected to match the sibling rows' verified wording. WHERE clause matches on a short,
-- semicolon-free tail substring of the current value rather than the full string, since
-- the full current value contains a literal semicolon that the SQL Editor's paste-chunking
-- (and this repo's own check:sql tool) would otherwise split the statement on.
UPDATE routes
SET access = jsonb_set(access, '{fees}', '"No climbing fee (Forest Service approach). An NPS permit is required if camping overnight past the park boundary, and it is not free: $10 per person plus a $6 fee, youth 15 and under free."'::jsonb)
WHERE id = 'wa_mount_shuksan_price_glacier'
  AND access->>'fees' LIKE '%free NPS permit only if camping overnight past the park boundary)';

-- Fix 2: wa_mount_st_helens_worm_flows -- access.parking_pass stated "$5/day/vehicle at
-- Climber's Bivouac," which is Monitor Ridge's summer trailhead fee, not this route's.
-- Worm Flows is the winter/spring route from Marble Mountain Sno-Park (confirmed by this
-- route's own waypoints[0] trailhead and by its own access.fees field, which correctly
-- names "a Washington Sno-Park permit... required to park at Marble Mountain Sno-Park").
-- The parking_pass field appears to have been copied from the Monitor Ridge row without
-- updating for Worm Flows' actual trailhead. Corrected to match the row's own access.fees.
UPDATE routes
SET access = jsonb_set(access, '{parking_pass}', '"Washington Sno-Park permit required to park at Marble Mountain Sno-Park (not the $5/day Climbers Bivouac fee, which applies to the separate Monitor Ridge trailhead)."'::jsonb)
WHERE id = 'wa_mount_st_helens_worm_flows'
  AND access->>'parking_pass' = '$5/day/vehicle at Climber’s Bivouac, waived with a valid climbing permit.';

-- Fix 3: wa_mount_spickard_southwest -- `corrections` field states "'fa' has been left
-- null rather than guessed," but this row's own `fa` column is NOT null -- it holds
-- "Fred Beckey and Helmi Beckey, June 21, 1941 (first recorded ascent via the southwest
-- side, made right after their first ascent of Northwest Mox)", already hedged as a
-- "first recorded ascent" claim rather than an unqualified one. The corrections text is
-- stale, written for an earlier version of the row before fa was populated. Web search
-- corroborates the fa claim (Fred & Helmy Beckey climbed Spickard's southwest side the
-- same day as their Northwest Mox first ascent, June 21 1941), so fa is left as-is and
-- only the self-contradicting clause in corrections is corrected -- every other clause
-- (elevation source variance, approach-distance variance) is untouched. (The replacement
-- also swaps one semicolon for an em dash, matching the surrounding prose style, so the
-- paste-chunking/statement-splitting tooling cannot fragment this UPDATE on it.)
UPDATE routes
SET corrections = 'Sources vary slightly on summit elevation (8,979-8,983 ft across Wikipedia, WTA, and listsofjohn.com) — this page uses 8,979 ft, the traditional Wikipedia figure (matches the given coordinates closely). The mountain''s overall first ascent (1904, Walter B. Reaburn) is well documented — the first ascent of this specific southwest line is recorded in ''fa'' as the 1941 Beckey brothers ascent ''from the southwest,'' made the same day as their Mox Peaks first ascents and reported in secondary sources, though it is not independently confirmed as specifically this line rather than a nearby variant. Approach distance/gain figures also vary by source (5.5 mi/~3,400 ft to Ouzel Lake in older reports vs. ~8 mi/~7,000 ft total in a 2022 report) likely reflecting recent road-access degradation forcing earlier parking — this page uses the more recent (2022) total-route figures.'
WHERE id = 'wa_mount_spickard_southwest'
  AND corrections = 'Sources vary slightly on summit elevation (8,979-8,983 ft across Wikipedia, WTA, and listsofjohn.com) — this page uses 8,979 ft, the traditional Wikipedia figure (matches the given coordinates closely). The mountain''s overall first ascent (1904, Walter B. Reaburn) is well documented, but the first ascent of this specific southwest line is not clearly established — a 1941 Beckey brothers ascent ''from the southwest'' (after their Mox Peaks first ascents) is mentioned in secondary sources but is not confirmed as this route''s first ascent, so ''fa'' has been left null rather than guessed. Approach distance/gain figures also vary by source (5.5 mi/~3,400 ft to Ouzel Lake in older reports vs. ~8 mi/~7,000 ft total in a 2022 report) likely reflecting recent road-access degradation forcing earlier parking — this page uses the more recent (2022) total-route figures.';

-- Fix 4: wa_mount_spickard_silver_glacier -- bivy[5] ("Basin below the Bear Mountain
-- saddle") is a camp for Bear Mountain, a different peak, reached via the Chilliwack
-- River Trail from Hannegan Pass -- its own notes say so explicitly ("The launching point
-- for the north side of Bear Mountain"), with no connection to Silver Glacier's own two
-- approaches (Silver Creek via Ross Lake boat, or Depot Creek from the Canadian side --
-- neither of which passes anywhere near the Chilliwack River Trail corridor). Removed as
-- a single, unambiguous corridor-list contamination entry; the other 5 bivy entries
-- (Hannegan Camp, Boundary Camp, Copper Lake Camp, US Cabin Camp, Ouzel Lake) are left in
-- place -- Ouzel Lake is confirmed relevant by this route's own approach text, and the
-- other four sit on a plausible (if unconfirmed) long Chilliwack-corridor approach to this
-- same peak group that this session could not confidently rule in or out.
UPDATE routes
SET bivy = bivy - 5
WHERE id = 'wa_mount_spickard_silver_glacier'
  AND jsonb_array_length(bivy) = 6
  AND bivy->5->>'name' = 'Basin below the Bear Mountain saddle';

-- No further UPDATEs this batch. Remaining checked facts and flagged items below.

-- wa_mount_shuksan_price_glacier: FA claim ("Fred Beckey, Jack Schwabland, and Bill
-- Granston, 1945") confirmed via Wikipedia's Price Glacier (Mount Shuksan) article and
-- other independent sources -- matches exactly. NOT FIXED, FLAGGED FOR HUMAN REVIEW:
-- (1) `gain_ft` (6000) is below the hard floor implied by this route's own waypoint
-- chain (Nooksack Cirque TH 2,200 ft -> Price Glacier Base Camp 6,500 ft -> Mount
-- Shuksan Summit 9,131 ft, all monotonically increasing, net rise 6,931 ft) by 931 ft --
-- but the row's own itinerary.days sum to exactly 6,000 (matching gain_ft) AND
-- itinerary.totalNote independently says "about 6,000 ft of gain," so two internal
-- records (gain_ft+itinerary) disagree with a third (waypoints) by a non-trivial margin
-- with no clean tiebreaker. (2) `season` ("Jun-Sep, heavy early-season snowpack often
-- preferred") appears to disagree with best_season/seasonal_guidance/seasonal_hazards
-- (all May-June only) AND with itinerary.cal ("most trip reports cluster in July-August
-- after crevasses have opened enough to navigate but before it goes fully bare") --
-- but external sources (SummitPost, trip reports) independently confirm BOTH windows
-- have real support: May-June is viable in good-snowpack years for firm bridging, while
-- most recorded ascents are July-August. Left unchanged since narrowing to either window
-- would mean taking a side in a genuine, externally-corroborated disagreement about a
-- serac/icefall-hazard route where timing safety actually matters.

-- wa_mount_shuksan_sulphide_glacier: FA ("Asahel Curtis and W. Montelius Price,
-- September 7, 1906 -- the peak's first ascent went by this route") matches general
-- knowledge and is independently corroborated by wa_mount_shuksan_hanging_glacier's own
-- fa note from batch 281 ("distinct from Asahel Curtis's 1906 first ascent of the
-- mountain overall via the Sulphide Glacier side"). gain_ft (6600) clears its own
-- waypoint-derived floor (6,580 ft). season ("Jun-Sep") is consistent with
-- best_season/seasonal_guidance/monthBreakdown/itinerary.cal, which all agree
-- July-August is prime within a broader May-September window -- no contradiction, unlike
-- Price Glacier above. access.fees ($10pp + $6, matching the verified NPS figure) is
-- correct and was one of the four sibling rows used to confirm Fix 1. Clean.

-- wa_mount_shuksan_white_salmon_glacier: FLAGGED FOR HUMAN REVIEW, NOT FIXED -- this
-- row's own approach_variants[0].baseFinding explicitly states the on-file approach
-- record is wrong: "the record on file for this route describes going south past Lake
-- Ann and over Austin Pass. That is not the way parties reach the White Salmon Glacier;
-- the drainage is entered from the White Salmon side of the highway." The top-level
-- `approach` text, `approach_logistics.trailhead*` fields, and `waypoints[0]` all
-- describe the Lake Ann/Austin Pass trailhead (48.8502,-121.6861), while
-- approach_variants[0] and the row's own `road` field (driveNote: "White Salmon
-- pull-off ... near milepost 51, near White Salmon Road (FS-3075)") independently agree
-- on a different trailhead on the White Salmon side of Mount Baker Highway. Web search
-- corroborates a real "White Salmon Road" pull-off near SR-542 milepost 51.5 (~3,450 ft)
-- but no reliable coordinate source could be reached this session (nps.gov and
-- mountaineers.org are both blocked by this environment's network egress proxy) to
-- safely correct waypoints[0]/approach_logistics.trailheadLat/Lng without risking a
-- fabricated coordinate. A prose-only fix to `approach` was considered and rejected:
-- it would leave the map/Directions-button-facing fields (which the app reads
-- preferentially over prose) still pointing at Lake Ann, i.e. it would not fix the
-- actionable part of the defect and would add a new prose-vs-coordinate inconsistency.
-- access.fees on this row already correctly matches the $10pp+$6 verified figure.

-- wa_mount_spickard_silver_glacier: FA left null (correctly -- no confident FA claim
-- exists for this specific line). Waypoints monotonic, gain_ft/loss_ft/dist_km
-- appropriately left null rather than guessed. best_season/season internally
-- consistent (no contradiction of the Price Glacier kind). access.fees ($10pp+$6, plus
-- the Ross Lake water-taxi fee) matches the verified NPS figure and was another of the
-- four sibling rows used to confirm Fix 1. bivy[5] removed per Fix 4 above; the
-- remaining Hannegan/Boundary/Copper Lake/US Cabin Chilliwack-corridor entries are
-- flagged as POSSIBLE (not confirmed) corridor-list contamination -- plausible as a
-- long alternate approach to the Redoubt/Spickard group via Hannegan Pass, but this
-- session could not confirm or rule it out with available sources.

-- wa_mount_spickard_southwest: exceptionally well-hedged row -- see its own
-- `corrections` field (fixed per Fix 3 above) and `data_quality.gaps`, which already
-- flag summit-elevation variance, FA uncertainty, and approach-mileage variance by
-- source. FA claim externally corroborated (web search: "Fred & Helmy Beckey climbed
-- Spickard from the southwest after completing their first ascent of NW Mox on June 21,
-- 1941"). gain_ft (6580) is ~100 ft below its own waypoint-derived floor (~6,680 ft) --
-- within the row's own acknowledged approximation (data_quality.gaps: "the 7,000 ft
-- gain figure here is drawn from a single detailed trip report and should be treated as
-- approximate"; itinerary.totalNote separately states "roughly ... 7,000 ft round-trip"
-- for the full out-and-back, which is a different, larger quantity than the one-way
-- gain_ft) -- not flagged as a defect, already appropriately caveated. access.fees
-- ($10pp+$6) matches the verified NPS figure, a third of the four sibling rows used to
-- confirm Fix 1.

-- wa_mount_st_helens_monitor_ridge: FA appropriately hedged ("Unknown (1853,
-- pre-eruption south-side snow route)") -- confirmed via web search that the mountain's
-- documented 1853 first ascent (Thomas J. Dryer's party) was indeed via the south side,
-- consistent with this note; left as-is since it does not claim this modern route is
-- literally the historical line. gain_ft/loss_ft (4598/4598) consistent with its own
-- waypoint chain (net rise 4,663 ft; within normal rounding) and itinerary day-sum
-- (4600). season/best_season internally consistent. bivy list (Dana Yelverton Shelter
-- site, Climbers Bivouac, Marble Mountain Sno-Park) includes a Goat Rocks/PCT shelter
-- site that reads as out of place at first glance, but this is a previously-identified,
-- deliberately-unresolved case documented elsewhere in this repo's engineering notes
-- (a shared 7-entry list across Mount St. Helens and three Goat Rocks peaks, repaired
-- everywhere it could be attributed -- Dana Yelverton Shelter specifically could not be
-- placed via gazetteer and was deliberately left rather than guessed at). Not re-flagged.
-- Clean.

-- wa_mount_st_helens_worm_flows: parking_pass corrected per Fix 2 above. season
-- (Nov-Jun) and best_season (Feb-April optimal, with Dec-Jan and late May caveats)
-- consistent, no contradiction. gain_ft/loss_ft (5563/5700) consistent with a winter
-- start at Marble Mountain Sno-Park (2,680-2,700 ft) to the shared 8,363 ft summit.
-- access.notes' $20/climber summer permit-fee figure (distinguished explicitly from
-- Rainier's and Adams' fee systems) is plausible and left as-is -- this route is
-- primarily climbed outside the fee season (Nov-Jun) in any case, when the permit is
-- free and self-issued per this row's own access.permit field.

-- wa_mount_stuart_girth_pillar: gain_ft (6016) matches its own waypoint-derived floor
-- (6,016 ft) exactly. FA (Kit Lewis & Jim Nelson, 1983) is plausible (Jim Nelson is a
-- well-documented North Cascades first-ascensionist and guidebook co-author) but was
-- not independently re-confirmed this session given time; left as-is. FLAGGED FOR HUMAN
-- REVIEW, NOT FIXED: (1) `descent` and `descent_text` directly contradict each other
-- about which descent is "standard" -- `descent` says the north-side return via the
-- Sherpa Glacier to the same Ice Cliff/Sherpa moraine camp is standard, explicitly
-- calling the Cascadian Couloir/Longs Pass exit "a penalty rather than the plan" (it
-- exits ~70 road miles from the approach trailhead and abandons camp); `descent_text`
-- instead calls the Cascadian Couloir/Longs Pass line "the standard descent" requiring
-- a car shuttle. This is logistics- and safety-relevant (whether a party needs to
-- arrange a shuttle) and needs a careful prose edit to `descent_text` rather than a
-- simple value swap -- left for human review rather than risk a partial rewrite that
-- loses the useful route detail in that field. (2) The top-level `permit` field states
-- with confidence that the Enchantment lottery permit governs overnight stays for this
-- route, while this row's own bivy[3] ("Lake Stuart") entry says the Stuart Zone
-- boundary relative to the upper Mountaineer Creek/Ice Cliff Glacier moraine camp this
-- route actually uses is "genuinely unclear -- some maps place Stuart's north side
-- outside the permit zones" and recommends confirming with the ranger district. Left
-- unresolved since this session has no way to adjudicate a genuinely unclear permit-zone
-- boundary question. The Mount Stuart bivy list spans both the north (Lake Stuart, Goat
-- Pass, North Ridge notch -- directly relevant) and south/Ingalls sides (Ingalls Creek
-- basin, Headlight Basin, Upper Ingalls meadows -- relevant to this route's own
-- alternate/emergency Cascadian Couloir exit per its own descent_text); not flagged as
-- contamination given the route's own descent genuinely can reach the south side.
