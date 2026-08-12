-- WA alpine route audit -- batch 40 (pass 1)
-- Peaks checked: Ruth Mountain, Sahale Mountain, Mount Washington (Olympics), Sentinel Peak,
-- South Early Winters Spire, Sharkfin Tower, Sherman Peak (Baker).
-- See audits/wa-alpine-audit-log.md for the full writeup of this batch, including items
-- flagged for human review that are NOT included in this file.

-- ------------------------------------------------- Ruth Mountain South Slopes (access.notes)
-- access.notes carried a trailing "Mount Tom area, North Cascades" clause. Mount Tom is an
-- unrelated 7,076 ft peak in the Olympic Mountains (Jefferson County), nowhere near Ruth
-- Mountain in the Mt. Baker area of the North Cascades -- cross-route contamination.
UPDATE routes
SET access = jsonb_set(access, '{notes}', to_jsonb(replace(access->>'notes', ' Mount Tom area, North Cascades.', '')), false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: access.notes trimmed -- removed a trailing "Mount Tom area, North Cascades" clause that described an unrelated Olympic Mountains peak, not Ruth Mountain.'
WHERE id = 'wa_ruth_mountain_south_slopes'
  AND access->>'notes' LIKE '%Mount Tom area, North Cascades.';

-- expect: 1 row updated
SELECT id, access->'notes' AS notes FROM routes WHERE id = 'wa_ruth_mountain_south_slopes';

-- ------------------------------------- Sahale Mountain, both routes (camp elev + group limit)
-- access._raw.altitude_restrictions said Sahale Glacier Camp sits at 7,400 ft on both Sahale
-- routes, contradicted by WTA's "Sahale Glacier" page (12 mi RT, 3,940 ft gain to camp --
-- matching this row's own gainFt) and several independent trip-report sources, all citing
-- 7,600 ft; also contradicted by each route's own waypoints/approach text (already 7,600 ft).
-- Also correcting access.rules/group_limit: NPS's cross-country-zones page names Boston
-- Basin (plus Eldorado and Sulphide Glacier) as a 12-person high-occupancy zone, not the
-- 6-person limit that applies to other cross-country zones -- confirmed via the same NPS
-- source while auditing the sibling Sharkfin Tower route (same batch, also Boston Basin).
-- wa_sahale_mountain_sahale_glacier approaches via the maintained Cascade Pass Trail, which
-- this row's own (uncorrected) rules text already carves out as a 12-person on-trail corridor.
UPDATE routes
SET access = jsonb_set(
              jsonb_set(access,
                '{_raw,altitude_restrictions}', '"Sahale Glacier Camp at 7,600 feet (one of highest elevation campsites in park)"'::jsonb, false),
                '{rules}', '"Group size capped at 12 in the Boston Basin/Eldorado/Sulphide Glacier high-occupancy cross-country zones and on-trail corridors (6 in other cross-country zones). Boston Basin camping restricted to two designated sites (Low Camp ~5,300 ft, High Camp ~6,400 ft). Bear canisters required in some zones -- free loaners at permit offices."'::jsonb, false),
    group_limit = 12,
    corrections = COALESCE(corrections, '') || ' 2026-07-31: access._raw.altitude_restrictions corrected -- Sahale Glacier Camp elevation was 7,400 ft, contradicting WTA and this row''s own waypoints/approach text (7,600 ft). access.rules/group_limit corrected from a 6-person limit to 12, matching NPS''s designation of Boston Basin as a high-occupancy cross-country zone / this route''s on-trail corridor.'
WHERE id IN ('wa_sahale_mountain_r1', 'wa_sahale_mountain_sahale_glacier')
  AND access->'_raw'->>'altitude_restrictions' = 'Sahale Glacier Camp at 7,400 feet (one of highest elevation campsites in park)';

-- expect: 2 rows updated
SELECT id, access->'_raw'->'altitude_restrictions' AS altitude_restrictions, group_limit FROM routes WHERE id IN ('wa_sahale_mountain_r1', 'wa_sahale_mountain_sahale_glacier');

-- ---------------------------------------- Sahale Arm / Sahale Glacier (pitch_detail camp elev)
-- Same 7,400-vs-7,600 ft camp-elevation error repeated inside pitch_detail[1].notes.
UPDATE routes
SET pitch_detail = jsonb_set(pitch_detail, '{1,notes}', '"Continue north on the Sahale Arm climbers'' trail; totals 5.9 mi / 3,940 ft gain from the trailhead to camp (7,600 ft)"'::jsonb),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: pitch_detail[1].notes corrected -- camp elevation was 7,400 ft, should be 7,600 ft (see access._raw.altitude_restrictions fix, same batch).'
WHERE id = 'wa_sahale_mountain_sahale_glacier'
  AND pitch_detail->1->>'notes' = 'Continue north on the Sahale Arm climbers'' trail; totals 5.9 mi / 3,940 ft gain from the trailhead to camp (7,400 ft)';

-- expect: 1 row updated
SELECT id, pitch_detail->1->'notes' AS camp_note FROM routes WHERE id = 'wa_sahale_mountain_sahale_glacier';

-- ------------------------------------------------------ Mount Washington (Olympics) elevation
-- Area row elevation_ft (6255) disagreed with the wa_se_ridge_aka_shield_wall route's own
-- high_point_ft (6260), its summit waypoint (6260), and its own corrections field (which
-- already concluded 6,260 ft is the better-sourced figure). Wikipedia's "Mount Washington
-- (Olympics)" infobox gives 6,260 ft / 1,908 m, and its prominence figure (2,615 ft) matches
-- this row's own prominence_ft exactly, corroborating the same source.
UPDATE areas
SET elevation_ft = 6260
WHERE id = 'wa_mount_washington_olympic'
  AND elevation_ft = 6255;

-- expect: 1 row updated
SELECT id, elevation_ft FROM areas WHERE id = 'wa_mount_washington_olympic';

-- --------------------------- Mount Washington SE Ridge / Shield Wall (land manager + altitude)
-- This route's access block was contaminated throughout with Olympic NATIONAL PARK-specific
-- language, but Mount Washington sits entirely within the Mount Skokomish WILDERNESS of
-- Olympic NATIONAL FOREST (Hood Canal Ranger District) -- confirmed via fs.usda.gov's Mount
-- Skokomish Wilderness recreation page, and already stated correctly in this same peak's own
-- area blurb. No source places any part of the approach, trailhead, or summit inside the
-- national park. Also fixing access._raw.altitude_restrictions, which gave a third, wrong
-- elevation (6,278 ft, matching neither this row's own high_point_ft/waypoint of 6,260 ft nor
-- the area row) and a "3.2-mile out-and-back day hike" description that is actually Mount
-- Ellinor's stat (a neighboring peak), not this route's Class 3-4/5.7 alpine climb.
-- NOT fixed here (flagged for human review): access._raw.cost_structure, permit_pickup_hours/
-- location, and access.parking_pass still describe Olympic NP's fee/permit system; the
-- correct Forest-Service-side fee/permit wording could not be sourced this session.
UPDATE routes
SET access = jsonb_set(
              jsonb_set(
              jsonb_set(
              jsonb_set(
              jsonb_set(
              jsonb_set(access,
                '{_raw,altitude_restrictions}', '"Mount Washington summit 6,260 feet; no maintained trail to the true summit -- standard route is a Class 3-4 scramble"'::jsonb, false),
                '{_raw,land_manager}', '"Olympic National Forest (Hood Canal Ranger District) -- Mount Skokomish Wilderness"'::jsonb, false),
                '{_raw,wilderness_zone}', '"Mount Skokomish Wilderness, Olympic National Forest"'::jsonb, false),
                '{landManager}', '"Olympic National Forest (Mount Skokomish Wilderness)"'::jsonb, false),
                '{land_manager}', '"USDA Forest Service -- Olympic National Forest (Mount Skokomish Wilderness)"'::jsonb, false),
                '{permitZone}', '"Mount Skokomish Wilderness, Olympic National Forest"'::jsonb, false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: access.landManager/land_manager/permitZone/_raw.wilderness_zone corrected from Olympic National Park to Olympic National Forest (Mount Skokomish Wilderness), matching this peak''s own area blurb and fs.usda.gov; access._raw.altitude_restrictions corrected from a wrong 6,278 ft + Mount Ellinor''s 3.2-mile day-hike stat to this route''s real 6,260 ft elevation and Class 3-4 scramble character.'
WHERE id = 'wa_se_ridge_aka_shield_wall'
  AND access->'_raw'->>'altitude_restrictions' = 'Mount Washington summit 6,278 feet; day hike accessible year-round (3.2-mile out-and-back)';

-- expect: 1 row updated
SELECT id, access->'landManager', access->'land_manager', access->'permitZone', access->'_raw'->'altitude_restrictions', access->'_raw'->'wilderness_zone' FROM routes WHERE id = 'wa_se_ridge_aka_shield_wall';

-- ------------------------------------------------------- Sentinel Peak (route content fixes)
-- approach: Cache Col elevation given as "~6,600-6,800 ft", contradicted by this row's own
-- waypoints (Cache Col 6,900 ft) and Wikipedia's "Cache Col" article (6,903 ft).
-- hazards/pitch_detail: this row's own overview/approach/descent_text/itinerary all agree the
-- standard route climbs via the Le Conte Glacier to the Le Conte-Sentinel col, then the west
-- face/west ridge (matching pitch_detail's 4th entry) -- but hazards[0] and pitch_detail[0-2]
-- instead describe crossing "Dana Glacier" and a "south face" moat/ramp system. Dana Glacier
-- is real but sits ~2.5 mi south near Dome Peak, unrelated to Sentinel; no source describes a
-- south-face route on Sentinel. Removing the contaminated entries rather than inventing
-- replacement pitch-by-pitch text for a route no source documents.
UPDATE routes
SET approach = replace(approach, 'Cache Col (~6,600-6,800 ft)', 'Cache Col (~6,900 ft)'),
    hazards = jsonb_set(hazards, '{0}', '"Crevasses on the Le Conte Glacier -- rope up for glacier travel"'::jsonb),
    pitch_detail = '[{"grade": "Low 5th class", "notes": "A steep snow ramp near 7,400 ft leads to a short low-5th-class rock step into a gully, then ~600 ft of ridge scrambling to the summit -- the only technical section on this route.", "pitch": "Snow ramp to west ridge"}]'::jsonb,
    corrections = COALESCE(corrections, '') || ' 2026-07-31: approach corrected Cache Col elevation from 6,600-6,800 ft to 6,900 ft (Wikipedia; matches this row''s own waypoint). hazards/pitch_detail: removed a "Dana Glacier"/"south face" line that contradicted this row''s own approach/descent_text/itinerary (Dana Glacier is a real but unrelated glacier near Dome Peak, ~2.5 mi south) -- pitch_detail now holds only the route''s real, already-documented west-ridge finish.'
WHERE id = 'wa_sentinel_peak_standard'
  AND approach LIKE '%Cache Col (~6,600-6,800 ft)%';

-- expect: 1 row updated
SELECT id, hazards->0 AS hazard_0, jsonb_array_length(pitch_detail) AS pitch_count FROM routes WHERE id = 'wa_sentinel_peak_standard';

-- --------------------------------------------------- Sentinel Peak (access/logistics fixes)
-- access.permit cited the wrong 2026 NCNP early-access lottery window; the real 2026 window
-- (confirmed via NPS/recreation.gov announcements) is March 2-13, general on-sale April 29.
-- access.parking_pass named "Mountain Loop Highway" as the access corridor, but this route's
-- own access.fees/approach/itinerary fields (and area parent_chain) describe Cascade River
-- Road and Suiattle River Road instead -- Mountain Loop Highway does not reach Sentinel Peak.
-- approach_logistics.trailheadDirection gave the Cascade Pass Trailhead as 3,660 ft, but this
-- row's own waypoints already list it at 3,600 ft, matching external sources.
UPDATE routes
SET access = jsonb_set(
              jsonb_set(access,
                '{permit}', to_jsonb(replace(access->>'permit', 'Feb 10-Mar 3; remaining permits opened to walk-up/online booking April 25', 'March 2-13; remaining permits opened to walk-up/online booking April 29')), false),
                '{parking_pass}', '"Northwest Forest Pass required at the Cascade River Road / Suiattle River Road trailheads used to reach Sentinel Peak — $5/day or $30/year."'::jsonb, false),
    approach_logistics = jsonb_set(approach_logistics, '{trailheadDirection}', '"From the Cascade Pass Trailhead at the end of Cascade River Road (~3,600 ft)"'::jsonb),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: access.permit date range corrected to the actual 2026 NCNP early-access lottery window (March 2-13; general on-sale April 29), not Feb 10-Mar 3/April 25. access.parking_pass and approach_logistics.trailheadDirection corrected -- previously named Mountain Loop Highway and 3,660 ft, neither of which apply to Sentinel Peak (reached via Cascade River Road/Suiattle River Road at a 3,600 ft trailhead, per this row''s own waypoints).'
WHERE id = 'wa_sentinel_peak_standard'
  AND access->>'parking_pass' = 'Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year.';

-- expect: 1 row updated
SELECT id, access->'permit', access->'parking_pass', approach_logistics->'trailheadDirection' FROM routes WHERE id = 'wa_sentinel_peak_standard';

-- ------------------------------------------------- South Early Winters Spire, Southwest Rib
-- access.rules named "Cutthroat Lake" for a 1/4-mile no-camping closure that USFS's Blue Lake
-- Trailhead page actually attributes to Blue Lake -- this route's own trailhead lake, and the
-- correct one given the surrounding context (Cutthroat Lake is a different trailhead further
-- down SR-20). Also corrected the dispersed-camping stay limit from 10 to 14 days, the actual
-- Okanogan-Wenatchee NF standard (no source supports 10).
-- waypoints[0].elevFt (Blue Lake Trailhead) was 5200 ft; WTA/Gaia GPS give ~5,400 ft, and this
-- row's own gain_ft (2407) already equals 7807-5400, i.e. the rest of the record already uses
-- 5,400 ft -- 5200 was the outlier.
-- approach_logistics.trailheadDirection said "~1.5 miles west of Washington Pass"; multiple
-- independent sources (and this row's own approach field) say ~1 mile.
UPDATE routes
SET access = jsonb_set(access, '{rules}', to_jsonb(
               replace(replace(access->>'rules',
                 'no camping within ¼ mile of Cutthroat Lake', 'no camping within ¼ mile of Blue Lake'),
                 'Dispersed camping capped at 10 days', 'Dispersed camping capped at 14 days')
             ), false),
    waypoints = jsonb_set(waypoints, '{0,elevFt}', '5400'::jsonb),
    approach_logistics = jsonb_set(approach_logistics, '{trailheadDirection}', to_jsonb(
               replace(approach_logistics->>'trailheadDirection', '~1.5 miles west of Washington Pass', '~1 mile west of Washington Pass')
             ), false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: access.rules corrected -- the 1/4-mile no-camping closure applies to Blue Lake (this route''s own trailhead lake), not Cutthroat Lake; dispersed-camping stay limit corrected from 10 to 14 days (Okanogan-Wenatchee NF standard). waypoints[0].elevFt (Blue Lake Trailhead) corrected from 5200 to 5400 ft, matching WTA/Gaia GPS and this row''s own gain_ft (2407 = 7807-5400). approach_logistics.trailheadDirection corrected from ~1.5 mi to ~1 mi west of Washington Pass, matching this row''s own approach text and WTA.'
WHERE id = 'wa_sews_sw_rib'
  AND waypoints->0->>'elevFt' = '5200';

-- expect: 1 row updated
SELECT id, access->'rules', waypoints->0->'elevFt', approach_logistics->'trailheadDirection' FROM routes WHERE id = 'wa_sews_sw_rib';

-- --------------------------------------------------- Sharkfin Tower, Southeast Ridge (access)
-- access._raw.permit_pickup_hours embedded the wrong NCNP Wilderness Information Center phone
-- number ((360) 873-4500); the real WIC number, confirmed across multiple NPS-derived listings
-- (and already stored correctly elsewhere in this database, e.g. Sentinel Peak's access.permit
-- field), is (360) 854-7245.
-- access.passRequired/_raw.parking_pass_required gave the annual Northwest Forest Pass price
-- as $35; USFS and retail sources (REI) confirm $30 (day price of $5 was already correct).
-- access.rules/group_limit said Boston Basin is a 6-person cross-country zone, but NPS's own
-- cross-country-zones page names Boston Basin (with Eldorado and Sulphide Glacier) as a
-- 12-person high-occupancy zone, same as on-trail corridors -- the 6-person limit applies only
-- to other cross-country zones.
UPDATE routes
SET access = jsonb_set(
              jsonb_set(
              jsonb_set(
              jsonb_set(access,
                '{_raw,permit_pickup_hours}', to_jsonb(replace(access->'_raw'->>'permit_pickup_hours', '(360) 873-4500', '(360) 854-7245')), false),
                '{passRequired}', to_jsonb(replace(access->>'passRequired', '$35 annual', '$30 annual')), false),
                '{_raw,parking_pass_required}', to_jsonb(replace(access->'_raw'->>'parking_pass_required', '$35 annual', '$30 annual')), false),
                '{rules}', '"Group size capped at 12 in the Boston Basin/Eldorado/Sulphide Glacier high-occupancy cross-country zones and on-trail corridors (6 in other cross-country zones). Boston Basin camping restricted to two designated sites (Low Camp ~5,300 ft, High Camp ~6,400 ft). Bear canisters required in some zones -- free loaners at permit offices."'::jsonb, false),
    group_limit = 12,
    corrections = COALESCE(corrections, '') || ' 2026-07-31: access._raw.permit_pickup_hours phone number corrected to the real NCNP Wilderness Information Center number (360) 854-7245 (was 873-4500, unattributable to any NCNP office). access.passRequired/_raw.parking_pass_required annual Northwest Forest Pass price corrected from $35 to $30 (USFS/REI). access.rules/group_limit corrected -- NPS designates Boston Basin (along with Eldorado and Sulphide Glacier) a high-occupancy cross-country zone with a 12-person party limit, not the 6-person limit that applies to other cross-country zones.'
WHERE id = 'wa_sharkfin_tower_southeast_ridge'
  AND group_limit = 6;

-- expect: 1 row updated
SELECT id, access->'_raw'->'permit_pickup_hours', access->'passRequired', access->'rules', group_limit FROM routes WHERE id = 'wa_sharkfin_tower_southeast_ridge';

-- ------------------------------------------- Sherman Peak, Crater Rim Scramble (elev + gain)
-- high_point_ft (10160) contradicted this same route's own overview text and summit waypoint
-- (both already 10,133 ft) and the area row (10,133 ft). A real July 2023 differential-GPS
-- survey (documented on countryhighpoints.com, using a survey-grade Spectra ProMark 220 unit
-- and NOAA OPUS post-processing) fixed Sherman Peak at 10,133.0 +/- 0.1 ft / 395.4 +/- 0.3 ft
-- prominence -- just under the 400 ft cutoff, resulting in its removal from WA's Top 100 peaks
-- list. 10,160 ft was the stale pre-survey figure still repeated on some older pages.
-- gain_ft (7500) didn't match this row's own loss_ft (6800) or totalNote (~6,700 ft), nor the
-- verified trailhead(~3,360 ft)-to-corrected-summit(10,133 ft) difference (~6,770 ft); 7,500
-- appears to be carried over from stats for the longer route to Baker's true summit (Grant
-- Peak, 10,781 ft), which this route does not reach.
UPDATE routes
SET high_point_ft = 10133,
    gain_ft = 6800,
    corrections = COALESCE(corrections, '') || ' 2026-07-31: high_point_ft corrected from 10160 to 10133 -- a real July 2023 differential-GPS survey (countryhighpoints.com) fixed Sherman Peak at 10,133.0 ft / 395.4 ft prominence, matching this row''s own area row, overview text, and summit waypoint (all already 10,133); 10,160 was the stale pre-survey figure. gain_ft corrected from 7500 to 6800 to match this row''s own loss_ft and totalNote, and the verified trailhead-to-summit difference; 7,500 appears to have been carried over from stats for the longer route to Baker''s true summit (Grant Peak), which this route does not reach.'
WHERE id = 'wa_sherman_peak_baker_route'
  AND high_point_ft = 10160;

-- expect: 1 row updated
SELECT id, high_point_ft, gain_ft FROM routes WHERE id = 'wa_sherman_peak_baker_route';

-- ------------------------------------------- Sherman Peak, Squak Glacier Route (elev fields)
-- Same 10160-vs-10133 stale-survey figure as the sibling Crater Rim Scramble route (see that
-- fix, same batch, for sourcing) -- both high_point_ft and this route's own summit waypoint
-- need correcting.
UPDATE routes
SET high_point_ft = 10133,
    waypoints = jsonb_set(waypoints, '{0,elevFt}', '10133'::jsonb),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: high_point_ft and waypoints[0] (Sherman Peak summit) corrected from 10160 to 10133 ft, matching the 2023 DGPS survey figure already used by the area row and the sibling Crater Rim Scramble route (see that route''s fix, same batch).'
WHERE id = 'wa_sherman_peak_baker_squak_glacier'
  AND high_point_ft = 10160;

-- expect: 1 row updated
SELECT id, high_point_ft, waypoints->0->'elevFt' FROM routes WHERE id = 'wa_sherman_peak_baker_squak_glacier';

-- =========================================================================
-- NOT fixed here (flagged for human review only -- see audit log for detail):
--  - wa_ruth_icy_traverse: "Ruth-Icy Saddle"/"Ruth Glacier Camp" waypoint longitudes
--    (-121.555) sit west of Ruth's own summit -- the wrong direction from Icy Peak entirely.
--    Direction of the error is confirmed; the correct lat/lng needs a human pull from
--    CalTopo/topo rather than a guess.
--  - wa_ruth_mountain_south_slopes: Hannegan Pass elevation internally inconsistent (5,066 ft
--    everywhere except one itinerary schedule string saying "5,056 ft"); gain_ft/loss_ft
--    (4115) vs itinerary gainFt/lossFt (4200) also disagree. External sources themselves
--    range 5,050-5,100 ft for the pass, so no single figure could be confirmed as "correct" --
--    only that the record should be made internally consistent.
--  - wa_ruth_icy_traverse: which of Icy Peak's two sub-summits (SE vs NW) is truly higher is
--    disputed between older USGS-map-based sources and a peakbagger LiDAR discussion.
--  - wa_sahale_mountain_r1: dist_km (16.9) doubles to almost exactly 21.00 mi, the known
--    round-trip/one-way convention bug pattern flagged in CLAUDE.md for ~61 other WA rows --
--    but this row's own itinerary/totalNote insist the real round trip is ~10.5 mi (matching
--    16.9 km undoubled). Needs a human GPX-track check before touching dist_km (do not bulk-
--    normalize this column). Also gain_ft/loss_ft (5480/5500) vs. itinerary day-sum
--    (5080/5080) disagree.
--  - wa_sahale_mountain_sahale_glacier.fa ("August 1897; John Charlton and Albert H.
--    Sylvester"): consistent across secondary sources but could not be verified against a
--    primary source (Beckey/AAC) this session -- direct fetches were blocked. Leaning correct,
--    not auto-changed.
--  - wa_se_ridge_aka_shield_wall: access._raw.cost_structure, permit_pickup_hours/location,
--    and access.parking_pass still describe Olympic National Park's NPS-specific fee/permit
--    system (confirmed wrong direction -- this is Forest Service land) but the correct
--    Forest-Service-side wording/fee amounts could not be sourced this session; also
--    access._raw.group_size_limits ("not specified") contradicts access.rules (a specific
--    12-person/8-stock figure) on the same row.
--  - wa_se_ridge_aka_shield_wall: pitch count above the Shield Wall (3 rappels + 6 pitches = 13
--    total) matches one secondary source exactly but not another (which describes only 2
--    rappels + 2-3 pitches) -- could not resolve which is more current.
--  - wa_sentinel_peak_standard.data_quality.gaps: the claim that listsofjohn.com's LiDAR
--    figure "independently" corroborates the 2025 DGPS resurvey may be circular (the LoJ page
--    may have been updated because of the same resurvey) -- wording, not a factual error;
--    left as-is pending a direct check of listsofjohn.com's page history.
--  - wa_sentinel_peak_standard.gain_ft/loss_ft (8500/9200): an out-and-back route with an ~8%
--    gain/loss mismatch; flagged in the row's own data_quality as a computed estimate, not
--    independently sourced, so not correctable against an authoritative source.
--  - wa_sentinel_peak/wa_sentinel_peak_standard: area parent_chain ("Darrington and Mountain
--    Loop Hwy") is itself wrong -- Sentinel is not reached via that corridor -- but re-parenting
--    the area node in the hierarchy needs a human to pick the correct existing area id, which
--    this audit didn't have visibility into.
--  - wa_sews_sw_rib: pitch count (7, matching Alpinism Project) vs. two other sources citing
--    9 or 10 pitches for the same route -- longstanding source disagreement on belay
--    granularity, not a clear error. Also length_m (274) doesn't reconcile with the sum of
--    pitch_detail lengths (225m); and itinerary.days[0] gainFt/lossFt (2621) vs. this route's
--    own gain_ft/loss_ft (2407) disagree by ~214 ft -- neither reconciled against a source.
--  - wa_sharkfin_tower_southeast_ridge.areas.prominence_ft (80 ft): could not independently
--    verify this session (Peakbagger/ListsOfJohn fetches were blocked).
--  - wa_sharkfin_tower_southeast_ridge.pitch_detail grades (P1 5.4, P3 5.2): secondary sources
--    describe these more loosely as "class 4 to low 5th" / "exposed class 4" -- may reflect a
--    specific guidebook's line choice rather than an error; row's own data_quality already
--    discloses a 5.0-5.5 range depending on source.
--  - wa_sharkfin_tower_southeast_ridge.length_m (61) does not reconcile with the sum of
--    pitch_detail lengths (95m); unclear what this field is meant to represent.
--  - wa_sherman_peak_baker_route.descent_text "roughly 30 degrees" for the Roman Wall section:
--    guide-service sources describe the actual Roman Wall as 35-45 degrees, and it's unclear
--    this Sherman-only route (which turns off below Grant Peak) legitimately reaches Roman
--    Wall terrain at all -- may be copied from the full-Baker-summit route description.
--  - wa_sherman_peak_baker_squak_glacier.season ("Jun-Sep") and .approach ("high camp...around
--    6,800 ft"): several guide sources favor an earlier (May-June) window before the
--    bergschrund opens, and cite a ~6,500 ft common camp ("Craig View") -- not clearly wrong,
--    flagged for a closer look against a primary source.
