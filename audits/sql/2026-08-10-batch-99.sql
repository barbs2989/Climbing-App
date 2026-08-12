-- WA alpine audit batch 99 (pass 2)
-- Robinson Mountain, Rock Mountain, Ruth Mountain, Sahale Mountain,
-- Eagle Peak, Mount Washington (Eastern Olympics), Sentinel Peak,
-- South Early Winters Spire
-- Generated 2026-08-10. Proposed fixes for human review before running.

-- =========================================================================
-- Robinson Mountain
-- =========================================================================

-- wa_robinson_mountain_north_couloir: beta credited "Tom Goldman's '75
-- Scrambles in Washington" -- that book (Mountaineers Books, 2001,
-- ISBN 9780898867619) is authored by Peggy Goldman (confirmed via Open
-- Library, Amazon, Internet Archive, AbeBooks); no "Tom Goldman" edition
-- exists.
UPDATE routes SET beta = replace(beta, 'Tom Goldman''s', 'Peggy Goldman''s') WHERE id = 'wa_robinson_mountain_north_couloir';

-- wa_robinson_mountain (area): prominence_ft was 1700; Wikipedia/PeakVisor
-- consistently give 1,686 ft (514 m), with Mount Lago as parent peak. The
-- same sources returned this row's own summit coordinates to 6 decimal
-- places exactly, indicating reliable underlying data.
UPDATE areas SET prominence_ft = 1686 WHERE id = 'wa_robinson_mountain';

-- =========================================================================
-- Rock Mountain
-- =========================================================================

-- wa_rock_mountain (area): prominence_ft was 676; Wikipedia's "Rock
-- Mountain (Washington)" article (Cascades-peak infoboxes sourced to
-- Peakbagger.com) consistently lists 640 ft (196 m/200 m) across multiple
-- lookups. Distinct from the row's already-corrected elevation (6,841 ft),
-- so not a stale copy of that fix.
UPDATE areas SET prominence_ft = 640 WHERE id = 'wa_rock_mountain';

-- =========================================================================
-- Ruth Mountain
-- =========================================================================

-- wa_ruth_icy_traverse: length_m was 610 (~2,000 ft), contradicting this
-- same row's own pitches=1/pitch_detail[0].lengthM=30 and its own
-- overview/approach/descent_text, all of which describe the technical
-- section as a "100-ft" (~30m) gully.
UPDATE routes SET length_m = 30 WHERE id = 'wa_ruth_icy_traverse';

-- wa_ruth_icy_traverse: waypoints[1] "Ruth Glacier Camp" elev was 5800,
-- duplicating the (correct) Ruth-Icy Saddle elevation at waypoints[2].
-- This row's own approach/beta text twice describes this same camp as
-- "~6,600 ft," and the sibling South Slopes route independently describes
-- the identical notch/camp as "~6,600 ft."
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elev}', '6600'::jsonb) WHERE id = 'wa_ruth_icy_traverse';

-- wa_ruth_icy_traverse: approach text put the Ruth-Icy saddle at "roughly
-- 6,600-6,800 ft" -- self-contradicting arithmetic in the same sentence,
-- which states the saddle is reached by descending "about 1,600 ft total
-- off Ruth's summit" (7,115 ft), computing to ~5,515 ft. Matches this row's
-- own waypoints[2] "Ruth-Icy Saddle" (elev 5800).
UPDATE routes SET approach = replace(approach, 'the low saddle/col between Ruth and Icy at roughly 6,600-6,800 ft', 'the low saddle/col between Ruth and Icy at roughly 5,500-5,800 ft') WHERE id = 'wa_ruth_icy_traverse';

-- wa_ruth_icy_traverse: approach_logistics.trailheadLng was -121.5894222,
-- contradicting this same row's own waypoints "Hannegan Trailhead" entry
-- (lng -121.5927, whose own note flags a near-match to "existing DB
-- trailhead 48.91021,-121.591885") and the WTA-published trailhead
-- coordinate (48.9101, -121.5927). The old value sits ~800 ft east of all
-- three corroborating sources.
UPDATE routes SET approach_logistics = jsonb_set(approach_logistics, '{trailheadLng}', '-121.5927'::jsonb) WHERE id = 'wa_ruth_icy_traverse';

-- wa_ruth_mountain_south_slopes: approach_logistics.trailheadLng was
-- -121.5894222, contradicting this same row's own waypoints "Hannegan
-- Trailhead" entry (lng -121.59197074) and its own gpx track (first point
-- at lng -121.590742), and the WTA-published coordinate (-121.5927). Same
-- systematic ~800 ft eastward error as the sibling Icy Traverse route.
UPDATE routes SET approach_logistics = jsonb_set(approach_logistics, '{trailheadLng}', '-121.59197074'::jsonb) WHERE id = 'wa_ruth_mountain_south_slopes';

-- wa_ruth_mountain_south_slopes: itinerary.days[0].schedule[1].detail said
-- "4 miles in, 5,056 ft" for Hannegan Pass, contradicting this same row's
-- own waypoints "Hannegan Pass" entry (elev 5066) and its own approach text
-- ("Hannegan Pass (5,066 ft)"). 5,066 ft also matches the externally cited
-- range (5,050-5,076 ft); 5,056 ft appears nowhere else on the row.
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,0,schedule,1,detail}', '"4 miles in, 5,066 ft."'::jsonb) WHERE id = 'wa_ruth_mountain_south_slopes';

-- wa_ruth_mountain (area, shared by both routes above): avy_zone contained
-- leftover research/editorial meta-commentary (a self-referential pointer
-- to another record's field) rather than a clean zone value. Both routes'
-- own climate.forecastZone/seasonal_hazards.avalanche.zone fields already
-- just say "NWAC West Slopes North."
UPDATE areas SET avy_zone = 'NWAC West Slopes North forecast zone' WHERE id = 'wa_ruth_mountain';

-- =========================================================================
-- Sahale Mountain
-- =========================================================================

-- wa_sahale_mountain_r1 (Quien Sabe Glacier): overview said the route
-- climbs Sahale's "north side," contradicting this same row's own
-- aspect="W"/face="West side, on the ridge between Sahale and Boston Peak"
-- fields; NC Mountain Guides confirms "The Quien Sabe Glacier lies on the
-- west side of Sahale."
UPDATE routes SET overview = 'The Quien Sabe Glacier is the direct line up Sahale''s west side from Boston Basin, climbing beneath Sharkfin Tower to the col between Sahale and Boston Peak before a short technical finish to the same 8,680 ft summit reached by the Sahale Arm route. It''s more committing and more remote than the Sahale Arm approach and is usually done as an overnight from a Boston Basin camp.' WHERE id = 'wa_sahale_mountain_r1';

-- wa_sahale_mountain_r1: dist_km was 16.9 (the route's own round-trip
-- distance, per itinerary.totalNote's "roughly 10.5 mi" round trip and its
-- own waypoints' one-way trailhead-summit distance of 5.2 mi = 8.4 km).
-- The sibling route's dist_km correctly stores the one-way figure -- this
-- row stored round-trip instead, which would make the app double it again.
UPDATE routes SET dist_km = 8.4 WHERE id = 'wa_sahale_mountain_r1';

-- wa_sahale_mountain_r1: access.fees was "N/A", contradicting this same
-- row's own access._raw.cost_structure, which already has the correct
-- figure; confirmed against NPS's 2024 backcountry-permit fee-structure
-- change ($10/person + $6 nonrefundable fee).
UPDATE routes SET access = jsonb_set(access, '{fees}', '"$10 per person + $6 non-refundable reservation fee; youth 15 and under free"'::jsonb) WHERE id = 'wa_sahale_mountain_r1';

-- wa_sahale_mountain_r1: access.closures was "N/A", contradicting this same
-- row's own access._raw.seasonal_closures (already correct) and the
-- sibling route's access.closures, which is filled in identically.
UPDATE routes SET access = jsonb_set(access, '{closures}', '"State Route 20 closed mid-November to mid-April; Cascade Pass area not reservable before July 1 due to snow; high-demand early-access lottery runs May 15-October 10"'::jsonb) WHERE id = 'wa_sahale_mountain_r1';

-- wa_sahale_mountain_r1: access.group_limit was 6; Boston Basin is a
-- confirmed Type I/"high-occupancy" cross-country zone (12-person cap).
-- This row's own access.rules text and its own corrections log already
-- state the limit was fixed to 12, but the numeric field itself was never
-- actually updated.
UPDATE routes SET access = jsonb_set(access, '{group_limit}', '12'::jsonb) WHERE id = 'wa_sahale_mountain_r1';

-- wa_sahale_mountain_sahale_glacier: access.group_limit was 6, same issue
-- as the sibling Quien Sabe Glacier route above.
UPDATE routes SET access = jsonb_set(access, '{group_limit}', '12'::jsonb) WHERE id = 'wa_sahale_mountain_sahale_glacier';

-- wa_sahale_mountain_sahale_glacier: rappels described the summit-block
-- rappel as "optional," contradicting this same row's own descent_text
-- ("Getting off the summit block itself, however, requires a rappel rather
-- than a downclimb").
UPDATE routes SET rappels = 'A rappel off the slung summit block is required to descend (not a downclimb) -- a 60m rope doubled typically covers it in one rappel; shorter ropes may need an awkward down-scramble or a second, shorter rappel.' WHERE id = 'wa_sahale_mountain_sahale_glacier';

-- wa_sahale_mountain_sahale_glacier: grade ("Grade II, Class 3, glacier")
-- omitted the 5.0 summit-block crux that this same row's own rock_grade
-- ("5.0"), pitch_detail, and watch_out fields all document.
UPDATE routes SET grade = 'Grade II, Class 3 (5.0 summit block), glacier' WHERE id = 'wa_sahale_mountain_sahale_glacier';

-- =========================================================================
-- Eagle Peak
-- =========================================================================

-- wa_scramble_route (Eagle Peak): fa was "unknown", contradicting this same
-- row's own area.blurb, which already states "...first summited by a USGS
-- crew in 1910." Externally corroborated (Wikipedia/search consensus).
UPDATE routes SET fa = '1910, USGS survey crew (first recorded ascent)' WHERE id = 'wa_scramble_route';

-- wa_scramble_route: loss_ft was 2955 on an out-and-back trail, where
-- cumulative loss should equal cumulative gain (3297). 2955 matches this
-- same row's own approach text's cited gain-to-saddle figure ("~2,955 ft
-- gain") -- evidence the approach-only gain figure was mistakenly copied
-- into the round-trip loss_ft field.
UPDATE routes SET loss_ft = gain_ft WHERE id = 'wa_scramble_route';

-- wa_scramble_route: access.passRequired said "None", contradicting this
-- same row's own access.parking_pass, which lists the required NPS
-- entrance fees/passes ($30/vehicle, $55 MORA annual, $80 America the
-- Beautiful) -- confirmed current 2026 NPS fee structure.
UPDATE routes SET access = jsonb_set(access, '{passRequired}', '"Mount Rainier NP entrance fee, MORA annual pass, or America the Beautiful interagency annual pass"'::jsonb) WHERE id = 'wa_scramble_route';

-- wa_scramble_route: access.fees and access.closures were both "N/A",
-- contradicting this same row's own access._raw.cost_structure (detailed,
-- externally-verified-current fee figures) and access._raw.seasonal_
-- closures/road.seasonalGate (real closure info).
UPDATE routes SET access = jsonb_set(jsonb_set(access, '{fees}', '"Mount Rainier NP entrance fee ($30/vehicle); overnight wilderness permit $12/person/night + $6 Recreation.gov reservation fee (May 1-Sept 15)"'::jsonb), '{closures}', '"Longmire accessible year-round via SR-706 (weather permitting); Longmire-to-Paradise road closes seasonally in winter (does not affect this trailhead)"'::jsonb) WHERE id = 'wa_scramble_route';

-- wa_scramble_route: access.permit and access._raw.permit_type led with
-- "Wilderness Permit + Climbing Permit (for travel above 10,000 ft or on
-- glaciers)", contradicting this same row's own top-level route.permit
-- field ("no permit for day climbs") and its own access.notes. NPS's
-- climbing permit applies only above ~10,000 ft or on glacier travel;
-- Eagle Peak is a non-glaciated 5,958 ft scramble, well below threshold.
UPDATE routes SET access = jsonb_set(jsonb_set(access, '{permit}', '"None required for day climbs. Overnight camping requires a Wilderness Permit. The Climbing Cost Recovery permit (required above 10,000 ft or on glacier travel) does not apply to this route."'::jsonb), '{_raw,permit_type}', '"None required for day climbs; Wilderness Permit required only for overnight camping. Climbing permit (above 10,000 ft / glacier travel) not applicable."'::jsonb) WHERE id = 'wa_scramble_route';

-- wa_scramble_route: access._raw.parking_pass listed "or Northwest Forest
-- Pass" as an alternative to the NPS entrance fee, contradicting this same
-- row's own top-level access.parking_pass (already correct, no NW Forest
-- Pass mention). A Northwest Forest Pass is a USFS day-use pass and is not
-- accepted for NPS entrance; this route's land manager is confirmed NPS/
-- Mount Rainier NP, not USFS.
UPDATE routes SET access = jsonb_set(access, '{_raw,parking_pass}', '"Mount Rainier National Park entrance fee ($30 per vehicle), MORA annual pass ($55), or America the Beautiful interagency annual pass ($80)"'::jsonb) WHERE id = 'wa_scramble_route';

-- wa_scramble_route: waypoints[1] "Eagle Peak Trailhead" note ended with
-- "This matches the existing DB value exactly." -- leftover QA/enrichment-
-- pipeline commentary accidentally left in a production field, not
-- user-facing route content.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,note}', '"Reached from Longmire: park at the Lodge/Museum lot, walk past staff housing and across the Nisqually Suspension Bridge; trailhead is just over the bridge."'::jsonb) WHERE id = 'wa_scramble_route';

-- =========================================================================
-- Mount Washington (Eastern Olympics)
-- =========================================================================

-- wa_se_ridge_aka_shield_wall: access._raw.cost_structure used Olympic
-- National Park's fee schedule ($6 reservation + $8/person/night), but
-- this route's own land_manager fields (already corrected in this row)
-- confirm it's on Olympic National Forest land (Mount Skokomish
-- Wilderness), which uses a free self-issue permit with no per-person fee.
UPDATE routes SET access = jsonb_set(access, '{_raw,cost_structure}', '"Day hike: free (Northwest Forest Pass day-use fee for trailhead parking, $5/day or $30/annual). Overnight in Mount Skokomish Wilderness: free self-issue wilderness permit, no camping fee."'::jsonb) WHERE id = 'wa_se_ridge_aka_shield_wall';

-- wa_se_ridge_aka_shield_wall: access.parking_pass listed an Olympic NP
-- entrance fee ($30/$55/$80), directly contradicting this same row's own
-- access.passRequired field. The FR-2419/Mount Washington trailhead is on
-- Olympic National Forest land; the correct fee is a Northwest Forest Pass
-- ($5 day/$30 annual).
UPDATE routes SET access = jsonb_set(access, '{parking_pass}', '"Northwest Forest Pass ($5 day / $30 annual) required for Mount Washington (FR-2419) trailhead parking; no Olympic National Park entrance fee applies (trailhead/route are on Olympic National Forest land)."'::jsonb) WHERE id = 'wa_se_ridge_aka_shield_wall';

-- wa_se_ridge_aka_shield_wall: access._raw.permit_pickup_location/hours
-- described Olympic National Park Wilderness Information Centers (Port
-- Angeles/Quinault, staffed hours). This route's wilderness permit (per
-- this same row's own permit/access.permit fields) is a free self-issue
-- Forest Service trailhead kiosk permit, not an NP ranger-station permit.
UPDATE routes SET access = jsonb_set(jsonb_set(access, '{_raw,permit_pickup_location}', '"Self-issue permit kiosk at the FR-2419 / Mount Washington trailhead (Mount Skokomish Wilderness, Olympic National Forest) -- no ranger-station visit required."'::jsonb), '{_raw,permit_pickup_hours}', '"N/A -- self-issue kiosk at trailhead, available any time."'::jsonb) WHERE id = 'wa_se_ridge_aka_shield_wall';

-- wa_se_ridge_aka_shield_wall: access.rules described Olympic National
-- Park-specific group-size caps and Wilderness Information Center
-- bear-canister loaners (verbatim NP policy), and self-contradicted this
-- same row's own access._raw.group_size_limits ("Not specified in
-- sources; recommend contacting park"). No such Mount Skokomish Wilderness
-- (NF)-specific rule was found.
UPDATE routes SET access = jsonb_set(access, '{rules}', '"No Mount Skokomish Wilderness (Olympic National Forest)-specific group-size or bear-canister rule found in sources; practice standard food storage in bear country. (Prior text describing a 12-person/8-stock cap and Wilderness Information Center bear-canister loaners is Olympic National Park policy and does not apply here.)"'::jsonb) WHERE id = 'wa_se_ridge_aka_shield_wall';

-- wa_se_ridge_aka_shield_wall: access._raw.permit_type said "Forest side
-- camping: no permit needed", contradicting this same row's own
-- already-corrected top-level permit field ("Free self-issue Mount
-- Skokomish Wilderness permit at the trailhead").
UPDATE routes SET access = jsonb_set(access, '{_raw,permit_type}', '"Day hike: no permit required. Overnight in Mount Skokomish Wilderness (Olympic National Forest): free self-issue wilderness permit required at trailhead."'::jsonb) WHERE id = 'wa_se_ridge_aka_shield_wall';

-- wa_se_ridge_aka_shield_wall: access.notes referenced "the standard
-- entrance fee" (NP terminology), contradicting this same row's own
-- access.fees ("N/A") and corrected land-manager fields (NF land, no
-- entrance fee).
UPDATE routes SET access = jsonb_set(access, '{notes}', '"No separate climbing cost-recovery fee like Mount Rainier''s $82, and no Olympic National Park entrance fee applies -- this route is on Olympic National Forest land. Only the Northwest Forest Pass (trailhead parking) and a free self-issue Mount Skokomish Wilderness permit apply."'::jsonb) WHERE id = 'wa_se_ridge_aka_shield_wall';

-- wa_se_ridge_aka_shield_wall: rock_grade gave the British equivalent of
-- 5.7 as "MVS 4b"; standard YDS-to-British conversion charts map 5.7 to
-- British HS 4b (Hard Severe) -- MVS trends toward 5.8. French (5a) and
-- UIAA (V+) values were already correct.
UPDATE routes SET rock_grade = '5.7 (5a French / V+ UIAA / HS 4b British)' WHERE id = 'wa_se_ridge_aka_shield_wall';

-- =========================================================================
-- Sentinel Peak
-- =========================================================================

-- wa_sentinel_peak_standard: hazards[3] placed the Red Ledge traverse
-- "between Cache Col and Kool-Aid Lake", contradicting this same row's own
-- waypoints ordering (Cache Col -> Kool-Aid Lake -> Red Ledge) and its own
-- approach text, which explicitly places Red Ledge after Kool-Aid Lake, on
-- the way to Yang Yang Lakes.
UPDATE routes SET hazards = jsonb_set(hazards, '{3}', '"The Red Ledge traverse between Kool-Aid Lake and Yang Yang Lakes is exposed when banked with steep snow"'::jsonb) WHERE id = 'wa_sentinel_peak_standard';

-- wa_sentinel_peak_standard: watch_out[0] repeated the same wrong
-- placement of the Red Ledge as hazards[3] above.
UPDATE routes SET watch_out = jsonb_set(watch_out, '{0}', '"The Red Ledge, a broad angling rock ramp skirting a spur between Kool-Aid Lake and Yang Yang Lakes, is the reported crux of the approach when covered in steep snow (common into early July)."'::jsonb) WHERE id = 'wa_sentinel_peak_standard';

-- wa_sentinel_peak_standard: rock_grade said "4th class (short section)",
-- contradicting five other fields on this same row (gear, hazards,
-- pitch_detail, approach, descent_text) that all independently describe
-- the crux as "low 5th class."
UPDATE routes SET rock_grade = 'Low 5th class (short section)' WHERE id = 'wa_sentinel_peak_standard';

-- wa_sentinel_peak_standard: access.parking_pass claimed a Northwest
-- Forest Pass is required at the Cascade River Road/Cascade Pass
-- trailhead, contradicting this same row's own access.fees ("no fee is
-- charged at the Cascade River Road trailhead inside the national park
-- boundary") and its own Cascade Pass Trailhead waypoint note. The
-- Cascade Pass Trail is inside North Cascades NP and does not require a
-- Northwest Forest Pass; that pass is only needed at the alternate
-- Suiattle River Road/Downey Creek (USFS) approach.
UPDATE routes SET access = jsonb_set(access, '{parking_pass}', '"No Northwest Forest Pass is required at the Cascade River Road / Cascade Pass Trailhead (inside the North Cascades NP boundary). A Northwest Forest Pass ($5/day or $30/year) is required at the Suiattle River Road / Downey Creek trailhead (Forest Service land), used for the alternate south approach."'::jsonb) WHERE id = 'wa_sentinel_peak_standard';

-- wa_sentinel_peak_standard: access.permit described the North Cascades NP
-- backcountry permit as "free". NPS has charged $10/person + $6
-- non-refundable reservation fee for permits reserved mid-May-early
-- October (this route's own climbing season) since March 2024; permits
-- are free only off-season or via free walk-up/self-issue. The lottery
-- dates already in this field (2026: March 2-13, general booking April 29)
-- are independently confirmed correct -- only the "free" characterization
-- was wrong.
UPDATE routes SET access = jsonb_set(access, '{permit}', '"A North Cascades NP backcountry permit is required for any overnight camping within the park-complex boundary near Cascade Pass/Pelton Basin. Since March 2024, NPS charges $10/person plus a $6 reservation fee for permits booked mid-May-early October (this route''s own climbing season); permits are free the rest of the year, and free walk-up/self-issue permits are always available in person at the Wilderness Information Center in Marblemount, (360) 854-7245 (or noca_wilderness@nps.gov), including outside the station when it is closed. 2026 early-access lottery ran March 2-13, general online booking opened April 29. Once camped beyond the park boundary in the Glacier Peak Wilderness (Forest Service land), no quota permit or fee is required, but a self-issue wilderness permit at the trailhead is expected."'::jsonb) WHERE id = 'wa_sentinel_peak_standard';

-- =========================================================================
-- South Early Winters Spire
-- =========================================================================

-- wa_sews_sw_rib: itinerary.days[0].gainFt/lossFt (2621) and totalNote
-- ("roughly 2,600 ft gain") were stale -- this same row's own top-level
-- gain_ft/loss_ft (2407) were already corrected on 2026-07-31 (per this
-- row's own corrections log) from the row's own waypoint elevations
-- (7,807 ft summit - 5,400 ft trailhead, both externally confirmed via
-- WTA/USFS and Wikipedia/Peakbagger). The itinerary breakdown was never
-- updated to match; it also doesn't match the GPS-tracked source trip
-- report cited in itinerary.sourceNote (646 m / 2,119 ft gain).
UPDATE routes SET itinerary = jsonb_set(jsonb_set(jsonb_set(itinerary, '{days,0,gainFt}', '2407'::jsonb, false), '{days,0,lossFt}', '2407'::jsonb, false), '{totalNote}', '"A long single day: about 9.5 hrs car-to-car with roughly 2,400 ft gain over 7 pitches."'::jsonb, false) WHERE id = 'wa_sews_sw_rib';

-- wa_sews_sw_rib: timing.recommendedStart and itinerary.days[0].schedule[0]
-- gave a 6:00 AM start, but the schedule's own entries run 6:00 AM to
-- 4:00 PM = 10 hours, contradicting this same row's own timing.totalHrs/
-- itinerary.days[0].hours (9.5). This row's own cited source
-- (itinerary.sourceNote: francisbaileyh.com, 2022) states a 6:30 AM start,
-- ~1 hr approach, 9.5 hr car-to-car -- which reconciles exactly with the
-- schedule's stated 4:00 PM return (6:30 + 9.5 = 16:00).
UPDATE routes SET timing = jsonb_set(timing, '{recommendedStart}', '"6:30 AM from the trailhead"'::jsonb, false), itinerary = jsonb_set(itinerary, '{days,0,schedule,0,time}', '"6:30 AM"'::jsonb, false) WHERE id = 'wa_sews_sw_rib';
