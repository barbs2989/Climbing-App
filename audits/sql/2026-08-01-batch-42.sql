-- WA alpine route audit -- batch 42 (pass 1)
-- Peaks checked: Sloan Peak (Corkscrew Route, West Face/r1), Snowfield Peak (Neve Glacier),
-- Snowking Mountain (Standard Route), South Early Winters Spire (South Arete, Direct East
-- Buttress, East Buttress, Passenger, Southwest Couloir), Cathedral Peak (South Face).
-- See audits/wa-alpine-audit-log.md for the full writeup of this batch, including items
-- flagged for human review that are NOT included in this file.

-- =========================================================================
-- Sloan Peak

-- wa_sloan_peak_corkscrew: loss_ft (5300) didn't match gain_ft (5935) on this out-and-back
-- route, nor the row's own itinerary day-by-day loss sum (0 + 5935 = 5935). Corrected to
-- match gain_ft and the itinerary.
UPDATE routes
SET loss_ft = 5935,
    corrections = COALESCE(corrections, '') || ' 2026-08-01: loss_ft corrected from 5300 to 5935 to match gain_ft and this row''s own itinerary day-by-day loss sum on this out-and-back route.'
WHERE id = 'wa_sloan_peak_corkscrew'
  AND loss_ft = 5300 AND gain_ft = 5935;

-- wa_sloan_peak_corkscrew: access fields wrongly named "Glacier Peak Wilderness" (Sloan Peak
-- sits in the adjacent Henry M. Jackson Wilderness, per this row's own area parent_id/path
-- and confirmed via Wikipedia/USFS/PeakVisor) and carried contamination bled in from other
-- peaks' rows (a Vesper Peak trailhead reference, a Glacier Peak/Suiattle River Road note).
UPDATE routes SET access = access || jsonb_build_object(
  'land_manager', 'Mt. Baker-Snoqualmie National Forest (Darrington Ranger District) -- Henry M. Jackson Wilderness',
  'rules', 'Group size capped at 12 (people + stock combined) in Henry M. Jackson Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft.',
  'parking_pass', 'Northwest Forest Pass required at Mountain Loop Highway trailheads (e.g. Bedal Creek or Sloan Peak/Cougar Creek trailheads) -- $5/day or $30/year.',
  'seasonal', 'Mountain Loop Highway has a seasonal gate closure (Deer Creek-Bedal, ~14 mi), typically Nov-mid/late May; check current Darrington Ranger District conditions before a trip.'
),
corrections = COALESCE(corrections, '') || ' 2026-08-01: access.land_manager/rules/parking_pass/seasonal corrected -- wrongly named Glacier Peak Wilderness (Sloan Peak is in the Henry M. Jackson Wilderness) and carried contamination from other peaks'' rows (Vesper Peak trailhead, Glacier Peak/Suiattle River Road).'
WHERE id = 'wa_sloan_peak_corkscrew';

-- wa_sloan_peak_corkscrew: dist_km (15.3 = 9.51 mi) matches this row's own approach text
-- ("~9.5 mi ... round trip") and itinerary day-sum (9.8 mi) taken directly, not doubled --
-- an instance of the round-trip-stored-as-one-way dist_km bug (CLAUDE.md). Single-row fix,
-- not a bulk normalize.
UPDATE routes
SET dist_km = 7.65,
    corrections = COALESCE(corrections, '') || ' 2026-08-01: dist_km corrected from 15.3 (this row''s own ~9.5 mi round-trip figure mistakenly stored as one-way) to 7.65, the one-way value that reproduces ~9.5 mi round trip under this app''s distKm*2 display convention.'
WHERE id = 'wa_sloan_peak_corkscrew'
  AND dist_km = 15.3;

-- expect: 1 row updated
SELECT id, loss_ft, access, dist_km FROM routes WHERE id = 'wa_sloan_peak_corkscrew';

-- wa_sloan_peak_r1 ("West Face (Corkscrew route)"): same Glacier-Peak-Wilderness/contamination
-- errors as the Corkscrew Route above (identical wrong text, copy-pasted), plus its own
-- landManager field says Sloan Peak is "adjacent to" the Henry M. Jackson Wilderness when it
-- is inside it (Wikipedia/PeakVisor).
UPDATE routes SET access = access || jsonb_build_object(
  'land_manager', 'Mt. Baker-Snoqualmie National Forest (Darrington Ranger District) -- Henry M. Jackson Wilderness',
  'landManager', 'Mt. Baker-Snoqualmie National Forest, Darrington Ranger District (within the Henry M. Jackson Wilderness)',
  'rules', 'Group size capped at 12 (people + stock combined) in Henry M. Jackson Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft.',
  'parking_pass', 'Northwest Forest Pass required at Mountain Loop Highway trailheads (e.g. Bedal Creek or Sloan Peak/Cougar Creek trailheads) -- $5/day or $30/year.',
  'seasonal', 'Mountain Loop Highway has a seasonal gate closure (Deer Creek-Bedal, ~14 mi), typically Nov-mid/late May; check current Darrington Ranger District conditions before a trip.'
),
corrections = COALESCE(corrections, '') || ' 2026-08-01: access.land_manager/landManager/rules/parking_pass/seasonal corrected -- same Glacier-Peak-Wilderness/contamination errors as the sibling Corkscrew Route, plus landManager wrongly said "adjacent to" the Henry M. Jackson Wilderness rather than inside it.'
WHERE id = 'wa_sloan_peak_r1';

-- wa_sloan_peak_r1: Bedal Creek Trailhead waypoint (48.0719,-121.3764) is ~200m off from the
-- same physical trailhead's coordinate on the sibling Corkscrew Route (48.0701,-121.3753,
-- matching USFS/WTA sourcing) -- both rows describe the same FR-4096 road-end trailhead.
UPDATE routes
SET waypoints = jsonb_set(jsonb_set(waypoints, '{1,lat}', '48.0701', false), '{1,lng}', '-121.3753', false),
    corrections = COALESCE(corrections, '') || ' 2026-08-01: Bedal Creek Trailhead waypoint corrected from (48.0719,-121.3764) to (48.0701,-121.3753) to match the same physical trailhead as recorded on the sibling wa_sloan_peak_corkscrew route.'
WHERE id = 'wa_sloan_peak_r1'
  AND waypoints->1->>'name' = 'Bedal Creek Trailhead (FR-4096)'
  AND (waypoints->1->>'lat')::numeric = 48.0719;

-- wa_sloan_peak_r1: loss_ft was null on this out-and-back route sharing the same trailhead
-- and gain_ft (5935) as the sibling Corkscrew Route; filled to match gain_ft.
UPDATE routes
SET loss_ft = 5935,
    corrections = COALESCE(corrections, '') || ' 2026-08-01: loss_ft was null; filled to 5935 to match gain_ft on this out-and-back route (same trailhead/summit as the sibling wa_sloan_peak_corkscrew, which shares this exact gain_ft value).'
WHERE id = 'wa_sloan_peak_r1'
  AND loss_ft IS NULL AND gain_ft = 5935;

-- wa_sloan_peak_r1: dist_km, same round-trip-stored-as-one-way issue as the Corkscrew Route
-- (identical stored value 15.3).
UPDATE routes
SET dist_km = 7.65,
    corrections = COALESCE(corrections, '') || ' 2026-08-01: dist_km corrected from 15.3 to 7.65, same round-trip-stored-as-one-way fix as the sibling wa_sloan_peak_corkscrew.'
WHERE id = 'wa_sloan_peak_r1'
  AND dist_km = 15.3;

-- expect: 1 row updated each
SELECT id, access, waypoints, loss_ft, dist_km FROM routes WHERE id = 'wa_sloan_peak_r1';

-- =========================================================================
-- Snowfield Peak

-- wa_snowfield_peak_neve_glacier: top-level permit column was null while this row's own
-- access.permit already fully documented the NPS backcountry-permit requirement -- lib/db.js
-- maps route.permits from the top-level permit column (not access.permit), so the info was
-- invisible in the app despite being correctly captured elsewhere on the same row. Same bug
-- pattern already fixed repeatedly in prior batches (e.g. 2026-07-28-batch-9,
-- 2026-07-30-batch-23, 2026-07-30-batch-25).
UPDATE routes
SET permit = access->>'permit',
    corrections = COALESCE(corrections, '') || ' 2026-08-01: top-level permit field was null while this row''s own access.permit already documented the requirement; copied across so the permit info actually renders (lib/db.js reads the top-level permit column, not access.permit).'
WHERE id = 'wa_snowfield_peak_neve_glacier'
  AND permit IS NULL;

-- wa_snowfield_peak_neve_glacier: loss_ft was null on this round-trip route (same trailhead
-- start/end at 1,150 ft); this row's own itinerary day-by-day loss sum (100 + 7300 = 7400)
-- matches gain_ft (7400) exactly.
UPDATE routes
SET loss_ft = 7400,
    corrections = COALESCE(corrections, '') || ' 2026-08-01: loss_ft was null; set to 7400 to match gain_ft, consistent with this row''s own itinerary day-by-day loss sum for this round-trip route.'
WHERE id = 'wa_snowfield_peak_neve_glacier'
  AND loss_ft IS NULL;

-- wa_snowfield_peak_neve_glacier: "Colonial Glacier moraine camp" waypoint elev (6400) is an
-- outlier against four other same-row mentions of this same camp (approach text ~5,900-6,100
-- ft, itinerary day-1 schedule/objective ~5,400-6,000 ft, pitch_detail ~5,500-5,700 ft) and
-- against external trip reports (WTA, Mountaineers.org, climberkyle.com, willhiteweb.com),
-- all clustering 5,400-6,100 ft. Corrected to a best-fit 5,900 ft within that band; exact
-- figure genuinely varies by camp spot across sources, so this is a fix of the clear outlier,
-- not a precise re-survey.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{3,elev}', '5900', false),
    corrections = COALESCE(corrections, '') || ' 2026-08-01: Colonial Glacier moraine camp waypoint elev corrected from 6400 to 5900, matching this row''s own approach/itinerary/pitch_detail text (all several hundred feet lower) and external trip reports (WTA, Mountaineers.org, climberkyle.com, willhiteweb.com), all of which cluster 5,400-6,100 ft.'
WHERE id = 'wa_snowfield_peak_neve_glacier'
  AND waypoints->3->>'name' = 'Colonial Glacier moraine camp'
  AND (waypoints->3->>'elev')::numeric = 6400;

-- expect: 1 row updated each
SELECT id, permit, loss_ft, waypoints->3 AS moraine_camp_waypoint FROM routes WHERE id = 'wa_snowfield_peak_neve_glacier';

-- =========================================================================
-- Snowking Mountain

-- wa_snowking_mountain_standard: same North-Cascades-NP-vs-Forest-Service access
-- contamination already found and fixed on this peak's OTHER route (wa_east_ridge_2, batch 9)
-- -- Snowking Mountain sits in the Glacier Peak Wilderness, Mount Baker-Snoqualmie National
-- Forest (confirmed via Wikipedia and fs.usda.gov), not North Cascades NP. access.land_manager,
-- access.notes (NPS Recreation.gov lottery boilerplate for Boston Basin/Eldorado/Sulphide
-- Glacier), access.rules (NPS Boston Basin campsite/bear-canister boilerplate), and
-- access.group_limit (6, the NPS off-trail cross-country-zone cap) all carried the same
-- contamination; this row's own access.landManager and access.permit fields were already
-- correct and are left unchanged.
UPDATE routes SET access = access || jsonb_build_object(
  'land_manager', 'Mount Baker-Snoqualmie National Forest -- Glacier Peak Wilderness (Mt. Baker Ranger District)',
  'notes', 'No reservation, lottery, or quota system applies to this Glacier Peak Wilderness approach; access is via the free self-issued trailhead permit noted under "permit."',
  'rules', 'Standard Wilderness Act group-size limit (12) applies; no bear-canister requirement or NPS-style off-trail cross-country zone cap is documented for this Forest Service approach.',
  'group_limit', 12
),
corrections = COALESCE(corrections, '') || ' 2026-08-01: access.land_manager/notes/rules/group_limit corrected -- carried the same NPS/North-Cascades-NP contamination already fixed on this peak''s sibling wa_east_ridge_2 in batch 9 (Snowking Mountain is Forest Service land, Glacier Peak Wilderness, not NCNP).'
WHERE id = 'wa_snowking_mountain_standard';

-- wa_snowking_mountain_standard: top-level permit column was written in NPS/North Cascades NP
-- language (backcountry permit, Marblemount Wilderness Information Center), contradicting this
-- row's own (correct) access.permit field. Confirmed via Wikipedia/USFS (free self-issue
-- Glacier Peak Wilderness trailhead permit, no NPS system applies).
UPDATE routes
SET permit = 'No permit required for day climbs. A free self-issued wilderness travel permit must be completed at the trailhead register when entering the Glacier Peak Wilderness (Mount Baker-Snoqualmie National Forest); no Recreation.gov reservation or NPS backcountry permit applies to this Forest Service approach.',
    corrections = COALESCE(corrections, '') || ' 2026-08-01: top-level permit field corrected -- was written in NPS/North Cascades NP language, contradicting this row''s own access.permit field and the peak''s actual Forest Service land status.'
WHERE id = 'wa_snowking_mountain_standard'
  AND permit LIKE 'North Cascades NP complex%';

-- wa_snowking_mountain_standard: loss_ft (1100) is internally impossible for this out-and-back
-- route: gain_ft (6800, independently corroborated by a Mountaineers/WTA-sourced trip-report
-- figure of "6,800 feet of elevation gain") and this row's own itinerary day-by-day loss sum
-- (300 + 6200 = 6500) both indicate loss should track gain, not sit at 1,100.
UPDATE routes
SET loss_ft = 6800,
    corrections = COALESCE(corrections, '') || ' 2026-08-01: loss_ft corrected from 1100 to 6800 to match gain_ft on this out-and-back route; this row''s own itinerary day-by-day loss sum (300+6200=6500) also indicated loss was badly understated.'
WHERE id = 'wa_snowking_mountain_standard'
  AND loss_ft = 1100 AND gain_ft = 6800;

-- wa_snowking_mountain_standard: itinerary still cites the stale 7,439 ft summit figure in two
-- places (day-2 objective and schedule label), not updated to match this row's own
-- high_point_ft/summit waypoint (7,433, already correct) -- same stale-text bug already found
-- and fixed on wa_east_ridge_2 in batch 9.
UPDATE routes
SET itinerary = jsonb_set(
      jsonb_set(itinerary, '{days,1,objective}', '"Climb the Snowking Glacier to the 7,433 ft summit, then descend all the way to the car"', false),
      '{days,1,schedule,2,label}', '"Summit (7,433 ft)"', false
    ),
    corrections = COALESCE(corrections, '') || ' 2026-08-01: itinerary day-2 objective/schedule label corrected from the stale 7,439 ft summit figure to 7,433 ft, matching this row''s own high_point_ft/summit waypoint.'
WHERE id = 'wa_snowking_mountain_standard'
  AND itinerary->'days'->1->>'objective' LIKE '%7,439 ft summit%';

-- wa_snowking_mountain (area): elevation_ft (7439) conflicted with this peak's own route
-- (high_point_ft/summit waypoint, 7433) and Wikipedia/ListsOfJohn (7433) -- same figure
-- already resolved for this peak's sibling route in batch 9.
UPDATE areas SET elevation_ft = 7433 WHERE id = 'wa_snowking_mountain' AND elevation_ft = 7439;

-- wa_snowking_mountain (area): prominence_ft (1639) vs. Wikipedia/peakbagger-indexed figure
-- (1593). Corroborated via WebSearch snippets only (direct fetch to peakbagger.com/
-- summitpost.org 403'd this session) -- moderate rather than direct-source evidence.
UPDATE areas SET prominence_ft = 1593 WHERE id = 'wa_snowking_mountain' AND prominence_ft = 1639;

-- expect: 1 row updated each
SELECT id, access, permit, loss_ft, itinerary->'days'->1 AS day2 FROM routes WHERE id = 'wa_snowking_mountain_standard';
SELECT id, elevation_ft, prominence_ft FROM areas WHERE id = 'wa_snowking_mountain';

-- =========================================================================
-- South Early Winters Spire

-- wa_south_arete, wa_south_early_winter_spire_direct_east_buttress,
-- wa_south_early_winter_spire_passenger: access.rules on all three named a 1/4-mile
-- no-camping buffer around "Cutthroat Lake." Cutthroat Lake is a separate trailhead several
-- miles from the Blue Lake Trailhead these three routes actually use; USFS Okanogan-Wenatchee
-- recreation-page content and a WTA trip report both describe this same 1/4-mile no-overnight-
-- camping rule as applying to Blue Lake -- the same Cutthroat-Lake/Blue-Lake mixup already
-- found in the neighboring Liberty Bell/Lexington Tower cluster (batch 18, batch 40).
UPDATE routes SET access = access || jsonb_build_object(
  'rules', 'No climbing or wilderness permit required for day climbing. Dispersed camping capped at 10 days; no camping within 1/4 mile of Blue Lake; no campfires at dispersed sites; bear-resistant food storage required; dogs on leash <=6 ft.'
),
corrections = COALESCE(corrections, '') || ' 2026-08-01: access.rules corrected -- the 1/4-mile no-camping buffer was misattributed to Cutthroat Lake instead of Blue Lake, the trailhead this route actually uses (same mixup pattern found on the neighboring Liberty Bell/Lexington Tower cluster in batches 18 and 40).'
WHERE id IN ('wa_south_arete', 'wa_south_early_winter_spire_direct_east_buttress', 'wa_south_early_winter_spire_passenger')
  AND access->>'rules' LIKE '%Cutthroat Lake%';

-- wa_south_arete: gain_ft (2000) disagreed with loss_ft (2407) on a route whose own
-- descent_text says the descent reverses the approach (gain should equal loss for a
-- car-to-car out-and-back). This row's own itinerary.days[0] independently gives a
-- symmetric gainFt/lossFt of 2400, close to loss_ft, and loss_ft (2407) also equals this
-- row's own high_point_ft (7807) minus its own approach_logistics trailhead figure (5400).
UPDATE routes
SET gain_ft = 2407,
    corrections = COALESCE(corrections, '') || ' 2026-08-01: gain_ft corrected from 2000 to 2407 to match loss_ft, this row''s own itinerary.days[0] (symmetric 2400/2400), and its own high_point_ft-minus-trailhead-elevation arithmetic, on this out-and-back route whose own descent_text says the descent reverses the approach.'
WHERE id = 'wa_south_arete'
  AND gain_ft = 2000 AND loss_ft = 2407;

-- wa_south_early_winter_spire_passenger: grade_num (12) didn't match the displayed grade text
-- ("5.11d", which maps to 11 per this batch's own convention on sibling routes, e.g. Direct
-- East Buttress's "5.11a" -> grade_num 11). This row's own corrections field already explains
-- the source of the mismatch: AAC Publications lists this route as 5.12a while Mountain
-- Project lists it as 5.11d; grade_num appears to have been carried over from the AAC-sourced
-- grade while the grade text kept the MP-sourced one.
UPDATE routes
SET grade_num = 11,
    corrections = COALESCE(corrections, '') || ' 2026-08-01: grade_num corrected from 12 to 11 to match the displayed grade text (5.11d); this row''s own corrections field already explains the mismatch as AAC (5.12a) vs. Mountain Project (5.11d) sourcing bleeding into different fields.'
WHERE id = 'wa_south_early_winter_spire_passenger'
  AND grade_num = 12 AND grade = '5.11d';

-- expect: 3 rows updated (Cutthroat->Blue Lake), 1 row updated each (gain_ft, grade_num)
SELECT id, access->'rules' AS rules FROM routes WHERE id IN ('wa_south_arete', 'wa_south_early_winter_spire_direct_east_buttress', 'wa_south_early_winter_spire_passenger');
SELECT id, gain_ft, loss_ft FROM routes WHERE id = 'wa_south_arete';
SELECT id, grade, grade_num FROM routes WHERE id = 'wa_south_early_winter_spire_passenger';

-- =========================================================================
-- Cathedral Peak (Pasayten Wilderness)

-- wa_south_face_10: overview said "the original 1969 Beckey line," contradicting this row's
-- own fa field ("September 1968"). The FA (Fred Beckey, Dave Wagner, John Brottem, Doug Leen,
-- September 26-27, 1968) is confirmed by the AAC Publications first-ascent account (which
-- names the "Confession Box," "Pulpit Ledge," and "Belfry Ledge" features that also appear in
-- this row's own beta/pitch_detail) and Mountain Project; no source gives 1969.
UPDATE routes
SET overview = 'The original 1968 Beckey line up the middle of Cathedral''s imposing ~1,000-foot South Face -- a classic mixed free/aid granite climb, now commonly led free in the 5.8-5.9 range.',
    corrections = COALESCE(corrections, '') || ' 2026-08-01: overview corrected from "1969" to "1968" to match this row''s own fa field (September 1968), confirmed via the AAC Publications first-ascent account and Mountain Project; no source found gives 1969.'
WHERE id = 'wa_south_face_10'
  AND overview LIKE '%original 1969 Beckey line%';

-- expect: 1 row updated
SELECT id, overview FROM routes WHERE id = 'wa_south_face_10';

-- =========================================================================
-- NOT fixed here (flagged for human review only -- see audit log for detail):
--  - wa_sloan_peak_r1: looks like a duplicate/mislabeled entry of wa_sloan_peak_corkscrew
--    (identical GPX track, identical gain_ft, identical permit text) rather than the genuinely
--    distinct roped 5.7-5.8 "West Face" rock route its own beta field says it should document;
--    that beta field's own disambiguation also misattributes a real but unrelated route (the
--    2023 Merrill-Minton winter ice line) as this route's FA. Needs a human merge/delete or
--    from-scratch rewrite decision, not a field patch.
--  - wa_sloan_peak_corkscrew: a 1998 climbing-accident hazard note (fall into a moat on the
--    Sloan Glacier) is corroborated for year/peak/glacier (KOMO News retrospective, a 1998
--    trip report) but not for the specific "moat" fall mechanism -- AAC's own Accidents in
--    North American Mountaineering report could not be fetched this session (403).
--  - wa_sloan_peak_corkscrew / wa_sloan_peak_r1: grade/grade_system pairing looks like a
--    schema-semantics issue (grade="Grade II" paired with grade_system="class") but without
--    documentation of this DB's intended grade_system enumeration, no fix is proposed.
--  - wa_snowfield_peak_neve_glacier: summit elevation genuinely varies by source (8,347-8,351
--    ft) and is already correctly hedged in this row's own data_quality.gaps field -- no
--    change needed, already handled per this project's policy against normalizing disputed
--    figures.
--  - wa_snowking_mountain_standard: alpine_grade ("II") holds a Roman-numeral commitment
--    grade instead of the French adjectival scale (F/PD/AD/D/TD/ED) the column is defined to
--    hold per supabase/migrations/0006_composite_grades.sql -- same bug class fixed on
--    wa_dragontail_peak_r4 in batch 9, but no sourced F/PD/AD value could be found for this
--    route/guidebook line, so nothing was fabricated. grade_num=2 vs. grade text "Class 2-3 +
--    glacier" (a range, not a single class) is also left alone -- no established convention
--    for which bound to encode. fa is null and unresearched (guidebook-only sources 403'd).
--    areas.path embeds "wa_hwy20_ncnp" in Snowking's ancestry despite the peak being Forest
--    Service, not NPS -- may just be a shared Highway-20-corridor label; needs a human with
--    sibling-area data to judge whether the hierarchy itself needs re-parenting.
--  - wa_south_arete: pitches (3) vs. this row's own pitch_detail array (2 entries) and
--    timing/itinerary text (both say "2 pitches") -- could be an un-itemized 3rd scramble
--    section, not clearly wrong. Blue Lake Trailhead elevation disagrees across all 5 South
--    Early Winters Spire routes' own waypoints (5200/5204 ft) vs. their shared
--    approach_logistics boilerplate (5400 ft); external sources also disagree (~5,200 vs.
--    ~5,400 ft) -- no single figure could be confirmed peak-wide.
--  - wa_south_early_winter_spire_direct_east_buttress: alpine_grade ("D") is not a valid
--    Roman-numeral commitment-grade token and disagrees with this row's own commitment
--    ("III") and grade text ("Grade III+"); secondary (search-snippet only) sources suggest
--    "Grade IV," but this could not be verified against a primary source this session.
--    Pitch count (9 in DB, some secondary sources say 10) is similarly thin evidence, not
--    changed. gain_ft/loss_ft (2350/2350) vs. this row's own itinerary.days[0] (2200/2200)
--    disagree by 150 ft with no external source to resolve which is right.
--  - wa_south_early_winter_spire_east_buttress: this row's own beta field already says it
--    isn't clearly distinguished from the Direct East Buttress in modern guides; two
--    different historical 5.8 East-face FA parties were found in search results but neither
--    could be confidently matched to this specific DB entry -- fa is appropriately left null
--    pending a human with Beckey's guide. gain_ft/loss_ft (2400/2200, asymmetric) vs. this
--    row's own itinerary.days[0] (2200/2200, symmetric) disagree. dist_km (6.6) looks high
--    relative to the Direct East Buttress's near-identical approach (dist_km 2.4) -- possibly
--    the known one-way/round-trip dist_km ambiguity (CLAUDE.md); not bulk-normalized.
--  - wa_south_early_winter_spire_southwest_couloir: both waypoints have elevFt null at the
--    trailhead -- a completeness gap, not a factual error; no SQL proposed.
--  - wa_south_face_10 (Cathedral Peak): gain_ft (4700)/loss_ft (6700) pairing is internally
--    implausible for the Andrews Creek approach (net trailhead-to-summit gain of ~5,556 ft
--    per confirmed trailhead/summit elevations) but no authoritative source gives an exact
--    gain/loss breakdown for this specific route to confirm a corrected replacement value.
--    A waypoint ("Monk area" pin, type Base) sits implausibly close (~370 ft) to the summit
--    waypoint -- Mountain Project pins are known to be approximate, but the page 403'd this
--    session and no corrected coordinate could be sourced. A 5 ft mismatch between
--    high_point_ft/area elevation_ft (8606) and the summit waypoint elev (8601) reflects two
--    legitimate figures from different datum vintages, not a clear error -- left as-is.
