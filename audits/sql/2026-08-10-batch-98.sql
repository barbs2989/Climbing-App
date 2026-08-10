-- WA Alpine Audit — Pass 2, Batch 98 — 2026-08-10
-- Peaks: Prusik Peak (South Face/Burgner-Stanley, West Ridge), Vesper Peak
--        (Ragged Edge), Liberty Bell Mountain (Rapple Grapple), Raven Ridge
--        (Southeast Ridge/Crater Lake), Remmel Mountain (NW Ridge), Goose
--        Egg Mountain (Ride the Lightning), Mount Fury West (Ridge
--        Traverse from East Fury)

-- =========================================================================
-- Prusik Peak
-- =========================================================================

-- wa_prusik_peak_south_face_burgner_stanley: fa never actually named the
-- first-ascent party ("same first-ascent line as 'Stanley-Burgner', see
-- that entry"), despite this row's own overview already stating it plainly
-- ("put up in 1968 by Ron Burgner and Fred Stanley") and external
-- confirmation (Climbing.com, SummitPost: FA by Ron Burgner and Fred
-- Stanley, 1968, nearly free with two points of aid on lead). Filled in.
UPDATE routes SET fa = '1968, Ron Burgner and Fred Stanley (nearly free ascent, two points of aid on lead)' WHERE id = 'wa_prusik_peak_south_face_burgner_stanley';

-- wa_prusik_peak_west_ridge: alpine_grade/commitment were both "III",
-- contradicting this route's own top-level grade ("Grade II, 5.7") and its
-- own itinerary (a ~90-minute simul-climb day) -- looks copy-pasted from
-- the sibling South Face row, which correctly carries III throughout for a
-- much longer 6-pitch day. Multiple sources describe the West Ridge as
-- Prusik's short, easy, popular line. Fixed to match the route's own grade.
UPDATE routes SET alpine_grade = 'II', commitment = 'II' WHERE id = 'wa_prusik_peak_west_ridge';

-- wa_prusik_peak_west_ridge: gain_ft/loss_ft (6200/4608) contradicted this
-- route's own itinerary.days figures, which sum to an internally-equal
-- 5,300 ft gain / 5,300 ft loss. The sibling South Face route's gain_ft/
-- loss_ft (5400/5400) match its own itinerary sum exactly, confirming this
-- is the intended pattern. Fixed to match the row's own itinerary math.
UPDATE routes SET gain_ft = 5300, loss_ft = 5300 WHERE id = 'wa_prusik_peak_west_ridge';

-- wa_prusik_peak_west_ridge: access._raw.group_size_limits said "Maximum
-- party 12 people," directly contradicting this same object's own
-- access.group_limit field (8) and the actual Enchantment Permit Area rule
-- (max group size 8). Fixed to match.
UPDATE routes SET access = jsonb_set(access, '{_raw,group_size_limits}', '"Maximum party 8 people"') WHERE id = 'wa_prusik_peak_west_ridge';

-- wa_prusik_peak_west_ridge: access._raw.advanced_lottery_dates said
-- "results posted ~March 15," contradicting this same row's own
-- access.notes ("results after Mar 17") and the confirmed 2026 Enchantment
-- Permit Area lottery result date of March 17, 2026. Fixed to match.
UPDATE routes SET access = jsonb_set(access, '{_raw,advanced_lottery_dates}', '"Registration opens Feb 15, closes March 1; results posted ~March 17; unclaimed permits released April 1 at 7:00am PT"') WHERE id = 'wa_prusik_peak_west_ridge';

-- wa_prusik_peak_west_ridge: fa said "the specific first-ascent party is
-- not recorded in available sources," but multiple independent sources
-- (drawing on Wikipedia's "Prusik Peak" article) consistently credit Fred
-- Beckey with the 1957 West Ridge FA (no climbing partner recorded).
UPDATE routes SET fa = 'First ascent Fred Beckey, 1957 (per Wikipedia); climbing partner, if any, not recorded in available sources.' WHERE id = 'wa_prusik_peak_west_ridge';

-- =========================================================================
-- Vesper Peak
-- =========================================================================

-- wa_ragged_edge: approach_logistics.trailheadLat/Lng (48.02388889,
-- -121.4741444) is a different coordinate than this same row's own
-- waypoints[0] entry for the identical named point ("Sunrise Mine
-- Trailhead"), which already correctly holds the externally-verified
-- location (48.0247771, -121.4778228) -- ~0.18 mi apart for what should be
-- one point. Fixed approach_logistics to match the verified coordinate.
UPDATE routes SET approach_logistics = jsonb_set(
  jsonb_set(approach_logistics, '{trailheadLat}', '48.0247771'),
  '{trailheadLng}', '-121.4778228'
) WHERE id = 'wa_ragged_edge';

-- wa_ragged_edge: length_m (244m ~= 800 ft) overstated the route by ~100
-- ft. Steph Abegg's trip report gives the route as "Ragged Edge (5.7,
-- 700')," multiple other sources agree on ~700 ft, and this row's own
-- overview/pro_tips text already says "~700 ft" / "roughly 700 ft over 6
-- pitches" -- its own pitch_detail lengths also sum to 200m (656 ft),
-- much closer to 700 ft than 244m. Fixed to 213m (~700 ft).
UPDATE routes SET length_m = 213 WHERE id = 'wa_ragged_edge';

-- =========================================================================
-- Liberty Bell Mountain
-- =========================================================================

-- wa_rapple_grapple: waypoints[0].elev for Blue Lake Trailhead was 5200;
-- WTA, The Mountaineers, and the USFS Blue Lake Trail #604 page all give
-- 5,400 ft. This row's own approach_logistics.trailheadDirection prose
-- already correctly says "5,400 ft" -- only the waypoints entry was stale.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '5400') WHERE id = 'wa_rapple_grapple';

-- wa_rapple_grapple: gear[0] still said "rack to 3 inches," contradicting
-- this row's own corrections field, which documents that a fresh MP source
-- broadened the rack to "pro to 4 inches" -- a fix already applied to
-- pro_needs and sling_rack/rack, but never to this older, duplicate gear
-- array. Fixed to match the rest of the row.
UPDATE routes SET gear = jsonb_set(gear, '{0}', '"rack to 4 inches"') WHERE id = 'wa_rapple_grapple';

-- =========================================================================
-- Raven Ridge
-- =========================================================================

-- wa_raven_ridge_southeast_ridge_crater_lake: permit claimed a "Free
-- self-issue Lake Chelan-Sawtooth Wilderness permit" is required at the
-- trailhead. Multiple USFS sources state no wilderness permit -- self-issue
-- or otherwise -- is required in the Lake Chelan-Sawtooth Wilderness. This
-- also contradicted the row's own access.permit field, which already
-- correctly says no permit is required for day use. Fixed to match, kept
-- the accurate Northwest Forest Pass / day-use-fee sentence.
UPDATE routes SET permit = replace(permit, 'Free self-issue Lake Chelan-Sawtooth Wilderness permit at the trailhead; no quota or fee.', 'No wilderness permit required in the Lake Chelan-Sawtooth Wilderness (day use or overnight).') WHERE id = 'wa_raven_ridge_southeast_ridge_crater_lake';

-- =========================================================================
-- Remmel Mountain
-- =========================================================================

-- wa_remmel_mountain (area): prominence_ft stored 4328; Wikipedia,
-- PeakVisor, and WA prominence-peak rankings (which place Remmel 14th in
-- the state) consistently give 4,364 ft.
UPDATE areas SET prominence_ft = 4364 WHERE id = 'wa_remmel_mountain';

-- wa_remmel_mountain (area): elevation_ft (8688) contradicted the row's
-- own route waypoint, its own gear-list text ("cold at 8,685 ft"), and its
-- own blurb, which all say 8,685 ft -- also the figure Wikipedia and
-- PeakVisor report. Aligned the area field to the value the record already
-- uses everywhere else (8,688 appears to come from a single divergent
-- LiDAR-derived source nothing else in the record agrees with).
UPDATE areas SET elevation_ft = 8685 WHERE id = 'wa_remmel_mountain';

-- =========================================================================
-- Goose Egg Mountain
-- =========================================================================

-- wa_ride_the_lightning_2: access.notes called Goose Egg a "basalt crag,"
-- contradicting this same row's own hazards field ("columnar andesite")
-- and external sources (Washington Climbers Coalition, WA DNR's Naches
-- Ranger District geology report) confirming the whole Tieton River
-- corridor, including Goose Egg, is andesite from the Goat Rocks flow.
UPDATE routes SET access = jsonb_set(access, '{notes}', to_jsonb(replace(access->>'notes', 'basalt crag', 'andesite crag'))) WHERE id = 'wa_ride_the_lightning_2';

-- wa_ride_the_lightning_2: top-level season said "May-Oct," but this same
-- row's own best_season ("May through November") and its own approach text
-- ("climbable from May through November") both say November, matching
-- SummitPost's independent description of the season for this route.
UPDATE routes SET season = 'May-Nov' WHERE id = 'wa_ride_the_lightning_2';

-- wa_ride_the_lightning_2: access._raw.altitude_restrictions stated
-- "Goose Egg Mountain elevation 4,531 feet," contradicting this row's own
-- high_point_ft (4566) and the area's own elevation_ft/prominence_ft
-- (4566/1566) -- SummitPost's figures for Goose Egg Mountain match the
-- 4566 pairing exactly. Fixed the embedded text to match.
UPDATE routes SET access = jsonb_set(access, '{_raw,altitude_restrictions}', to_jsonb(replace(access->'_raw'->>'altitude_restrictions', '4,531', '4,566'))) WHERE id = 'wa_ride_the_lightning_2';

-- =========================================================================
-- Mount Fury (West Peak)
-- =========================================================================

-- wa_ridge_traverse_from_east_fury: overview cited a stale pre-survey
-- elevation for East Fury ("8,280 ft"), while this route's own parent area
-- blurb already cites the Oct 2022 Eric Gilbertson theodolite survey
-- putting East Fury at 8,356 ft +/-8 ft (confirmed via countryhighpoints.com,
-- explorersweb.com, stevensong.com). Fixed to match.
UPDATE routes SET overview = replace(overview, 'East Fury (8,280 ft)', 'East Fury (8,356 ft)') WHERE id = 'wa_ridge_traverse_from_east_fury';

-- wa_ridge_traverse_from_east_fury: approach described the standard Mount
-- Challenger approach (Big Beaver valley to Beaver Pass, Wiley Ridge/Whatcom
-- Pass/Easy Ridge/Perfect Pass, Challenger Glacier) -- a different Northern
-- Pickets peak entirely (confirmed via SummitPost/Mountaineers.org), and it
-- directly contradicted this same row's own waypoints, road,
-- approach_logistics, itinerary, and descent fields, which all correctly
-- describe Ross Lake -> Big Beaver Trail -> Luna Camp -> Access Creek ->
-- Luna Col. Rewritten using only the row's own already-correct data.
UPDATE routes SET approach = 'Drive SR-20 (North Cascades Highway) to the Ross Dam Trailhead, then descend roughly 15-20 minutes to Ross Lake, where most parties arrange a paid water taxi from Ross Lake Resort (or paddle/walk ~6 miles along the west shore) to the Big Beaver Trail landing. From Big Beaver Landing it is about 9.4 miles of trail up the Big Beaver valley to Luna Camp (~7,200 ft), then off-trail travel up the Access Creek drainage via Access Col to Luna Col to reach the base of East Fury. This is a genuine multi-day (4-5+ day) expedition into one of the most remote, weather-exposed corners of North Cascades National Park, with essentially no bailout options once committed to the East Fury-West Fury connecting ridge.' WHERE id = 'wa_ridge_traverse_from_east_fury';

-- wa_ridge_traverse_from_east_fury: access._raw.special_requirements was
-- contaminated with Olympic National Park content ("Elk Lake and Glacier
-- Meadows basecamp," "no camping between Glacier Meadows and Blue Glacier")
-- -- those are Hoh River Trail/Mount Olympus landmarks in Olympic NP
-- (confirmed via backpacker.com, mountaineers.org, Olympic NP's own
-- climbing page), not North Cascades NP, contradicting this row's own
-- land_manager field. Rewritten with North Cascades NP-appropriate content.
UPDATE routes SET access = jsonb_set(access, '{_raw,special_requirements}', '"Experienced mountaineers only, comfortable with sustained loose 4th/low-5th class terrain and remote self-rescue. Overnight stays require a backcountry permit (Recreation.gov reservation or Marblemount Wilderness Information Center walk-up); no permit needed for a day climb. Group size capped at 6 in this off-trail cross-country zone. Bear canisters required."'::jsonb) WHERE id = 'wa_ridge_traverse_from_east_fury';

-- wa_ridge_traverse_from_east_fury: rope_note misplaced Mount Fury in the
-- "Southern Pickets." The area's own path files it under
-- wa_picket_range.wa_northern_pickets.wa_mount_fury_west, and external
-- sources (SummitPost Picket Range, stephabegg.com) confirm Fury/Luna/
-- Challenger are the Northern Pickets group.
UPDATE routes SET rope_note = replace(rope_note, 'Southern Pickets', 'Northern Pickets') WHERE id = 'wa_ridge_traverse_from_east_fury';

-- wa_ridge_traverse_from_east_fury: access.fees said "N/A" -- outdated.
-- North Cascades NP has charged summer-season backcountry permit fees
-- since March 2024 (confirmed via nationalparkstraveler.org/spokesman.com
-- coverage of NPS's own announcement: $10/person + $6 nonrefundable permit
-- fee, mid-May-early Oct; no fee off-season or for day climbs).
UPDATE routes SET access = jsonb_set(access, '{fees}', '"$10 per person (summer season, mid-May–early Oct) plus a $6 nonrefundable permit reservation fee; no fee mid-Oct–mid-May, and no fee for a day climb with no overnight stay."'::jsonb) WHERE id = 'wa_ridge_traverse_from_east_fury';
