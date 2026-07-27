-- WA alpine/mountaineering audit — batch 3 (pass 1)
-- Reviewed 2026-07-27. Each fix below was cross-checked against at least one authoritative
-- source (see audits/wa-alpine-audit-log.md for the summary). These are PROPOSED fixes for a
-- human to review and run — not yet applied. Continues the same scope/ordering as batches 1-2
-- (routes.discipline in ('alpine','mountaineering'), id like 'wa_%', area_type = 'peak').

-- Beyond Redlining (wa_beyond_redlining), West Face of Vega North Tower/Eros Tower: the stored
-- FA month "July 2020" is wrong. The AAC Publications article (authored by FA climber Rad
-- Roberts), Mountain Project, and an independent trip-report source (Andrew's Hikes) all place
-- the ascent in May 2020, not July. The exact day (some snippets suggest May 29) could not be
-- pinned down with full confidence, so only the month is corrected here.
update routes set fa = 'Rad Roberts and Kurt Hicks, May 2020'
  where id = 'wa_beyond_redlining';

-- Beyond Redlining (wa_beyond_redlining): the row's access data misidentifies the wilderness
-- area and misattributes an unrelated closure. This route's approach (Sunrise Mine Trail off
-- FR-4065, Mountain Loop Highway) is nowhere near Glacier Peak Wilderness -- the two areas are
-- separated by the entire Henry M. Jackson Wilderness (per USFS). WA DNR and Washington Wild
-- both document this peak/basin (Morning Star NRCA) as adjacent to Wild Sky Wilderness instead.
-- Separately, the stored note about "December 2025 storm damage" limiting access as of April
-- 2026 refers to real, confirmed damage -- but on the Suiattle River Road (FSR 26), which is
-- Glacier Peak Wilderness's own access corridor, not this route's Mountain Loop Highway/Sunrise
-- Mine Road approach, which has no documented storm damage and reopened on its normal seasonal
-- schedule.
update routes set access = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        access,
        '{_raw,wilderness_zone}',
        '"Adjacent to Wild Sky Wilderness; the peak and much of the approach fall within WA DNR''s Morning Star Natural Resources Conservation Area, not Glacier Peak Wilderness (Glacier Peak Wilderness is a separate area to the north, divided from here by the Henry M. Jackson Wilderness)."'::jsonb
      ),
      '{_raw,notes}',
      '"Historical note: December 2025 storm damage closed the Suiattle River Road (FSR 26), the primary access corridor for Glacier Peak Wilderness -- a different watershed from this route''s own approach via Mountain Loop Highway/Sunrise Mine Road (FR-4065). No storm damage or closure has been documented on this route''s actual access road."'::jsonb
    ),
    '{permitZone}',
    '"Adjacent to Wild Sky Wilderness / WA DNR Morning Star NRCA, not Glacier Peak Wilderness."'::jsonb
  ),
  '{land_manager}',
  '"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District); the peak and much of the approach lie within or adjacent to WA DNR''s Morning Star Natural Resources Conservation Area, not Glacier Peak Wilderness."'::jsonb
)
where id = 'wa_beyond_redlining';

-- Big Kangaroo West Face/West Route (wa_big_kangaroo_southwest_rib): high_point_ft (8323) is a
-- fourth, unsupported figure that matches none of the values found in sourcing (8,326 ft 2023
-- theodolite survey / 8,318 ft lidar reanalysis / 8,280 ft older USGS figure) -- and doesn't
-- even match the route's own overview text, which already says "8,326 ft". Correcting to 8326
-- to match the row's own overview/waypoint text and the more commonly cited current figure
-- (countryhighpoints.com, Wikipedia). The elevation dispute itself is pre-existing and already
-- flagged in this row's own data_quality.gaps -- not resolving that further here, just fixing
-- the one number that was inconsistent with everything else including the row's own prose.
update routes set high_point_ft = 8326
  where id = 'wa_big_kangaroo_southwest_rib';

-- Black Peak Northeast Ridge (wa_black_peak_northeast_ridge): the route's own overview text and
-- its summit waypoint both state the elevation as "8,970 ft", contradicting this same row's
-- high_point_ft field (8975) and the authoritative figure (Wikipedia/NAVD88: 8,975 ft, also used
-- by AllTrails). Correcting overview and the summit waypoint to 8,975 ft so the row is
-- internally consistent and matches the better-supported figure already stored in high_point_ft.
update routes set
  overview = replace(overview, '(8,970 ft)', '(8,975 ft)'),
  waypoints = jsonb_set(waypoints, '{5,elev}', '8975')
  where id = 'wa_black_peak_northeast_ridge';

-- Big Snow Mountain East Ridge/Hardscrabble Route (wa_big_snow_mountain_east_ridge_hardscrabble_route):
-- the row's own `corrections` field explicitly states "gainFt is left null rather than
-- estimated" -- but gain_ft is populated with 5200, a direct self-contradiction. The 5200 figure
-- itself is plausible (consistent with willhiteweb's pre-gate figures once the added ~14-mile
-- flat road-walk is accounted for) and more useful to keep than nulling it out, so rewriting
-- `corrections` to describe it honestly as a working estimate rather than claiming no gain
-- figure was recorded.
update routes set corrections = 'Given peak data had elevationFt as null; corrected to 6,680 ft per USGS/Wikipedia, matching the target coordinates. Distance/elevation-gain figures for this route vary substantially across sources because the Middle Fork Road gate at Dingford Creek changed the approach after older guidebook figures (8 mi RT / 4,000+ ft gain from the old roadside trailhead) were written; current total round trip is commonly cited as ~25 miles. gainFt (5,200 ft) is a working estimate for the current full approach-to-summit round trip -- not a single-source surveyed figure -- since no source publishes one updated total that accounts for the extra Dingford-gate road walk; distKm (one-way, 20.1 km / 12.5 mi) is derived from the widely-cited 25-mile round-trip figure.'
  where id = 'wa_big_snow_mountain_east_ridge_hardscrabble_route';

-- Blood Sport (wa_blood_sport), Guye Peak: access._raw says "Unknown"/"could not be located" in
-- nine sub-fields, directly contradicting the sibling access.* fields on the same row, which
-- already carry real, externally-corroborated data (Mt. Baker-Snoqualmie NF / Snoqualmie Ranger
-- District land manager, Alpental/Snow Lake Trailhead fee structure) from a later enrichment
-- pass that never went back to clear out the stale _raw block. Replacing _raw with a note
-- pointing at the good data instead of leaving it self-contradictory.
update routes set access = jsonb_set(
  access, '{_raw}',
  '{"note": "Superseded by the sibling access.* fields on this row (added in a later enrichment pass) -- land_manager, permit/parking_pass, and rules there are the current researched values. This _raw block is kept only as a record of an earlier failed auto-lookup for this obscure crag."}'::jsonb
) where id = 'wa_blood_sport';

-- =========================================================================
-- NOT fixed here (flagged for human review only -- see audit log for detail):
--  - Big Kangaroo West Face/West Route (wa_big_kangaroo_southwest_rib) -- MOST SIGNIFICANT
--    OPEN ISSUE THIS BATCH: the row's own `id` implies a route called "Southwest Rib," but no
--    such route exists on Big Kangaroo. "Southwest Rib" is the real, distinct name of a
--    different, well-documented 5.8 route on South Early Winter Spire, a different peak in the
--    same Washington Pass cluster. This row's actual content (name, overview, waypoints, GPX)
--    correctly describes Big Kangaroo's real route, "West Face" (Mountain Project) / "West
--    Route" (The Mountaineers) -- only the `id` is wrong. Not renamed here since changing a
--    primary-key-style id has broader blast radius (any FKs/UI code keying off it) than a data
--    fix; needs a human decision on whether/how to rename it. Same category of issue as batch
--    1's Apex Buttress and batch 2's Argonaut Peak Northeast Ridge flags.
--  - Beyond Redlining (wa_beyond_redlining): exact FA day (the AAC source snippet's internal
--    reference to "two days after" George Floyd's murder doesn't cleanly reconcile with a
--    May 29 date) couldn't be pinned down -- only the month was corrected. Also: one
--    independent trip report describes the Mile High Club descent as "7 rappels with a 70m
--    rope" vs. this row's "8 rappels, single 60m rope" -- Mountain Project (the authoritative
--    source both figures likely draw from) was blocked from direct fetch this session, so this
--    needs a human with MP access to confirm. The specific numeric wilderness rules in
--    `access.rules` (group size, campfire elevation) were carried over from the wrong
--    wilderness area along with the naming fixed above; whether Morning Star NRCA has the same
--    numeric rules is unconfirmed.
--  - Big Four Mountain Spindrift Couloir (wa_big_four_mountain_spindrift_couloir): AAJ's own
--    publications disagree on the FA climber's surname -- the new-route index says "Bart
--    Pauli" (matching this row) but the same AAJ volume's first-person trip report is bylined
--    "Bart Paull." Needs a human with direct AAJ archive/PDF access to resolve. The named
--    "Big Four-Hall Peak col" on the descent (both Big Four routes) is geographically
--    plausible but not directly sourced.
--  - Black Peak Northeast Ridge (wa_black_peak_northeast_ridge): whether the standard Wing
--    Lake basecamp itinerary described in this row's own text actually crosses onto North
--    Cascades NP land (triggering the stored $10+$6 NPS permit fee) or stays on National
--    Forest land (free) is ambiguous across sources -- needs a human to check NPS's official
--    cross-country zone boundary map before adjusting the access framing.
--  - Blood Sport (wa_blood_sport): `discipline` is stored as "alpine," but every available
--    description (this row's own overview/beta, and an indexed Mountain Project snippet) depicts
--    a 50ft single-pitch bolted sport/mixed crag pitch with a 2-bolt chain lower-off and no
--    alpine character at all -- the same misclassification pattern flagged for "Alpine Lookout"
--    in batch 1. Left to a human since it's a categorization call, not a single verifiable fact.
--    Grade (5.11b), FA ("Frank Bush 2014"), and length (50ft/15m) could not be confirmed or
--    refuted -- the Mountain Project page exists and matches the route's location/gear/anchor
--    details, but its full content was blocked (403) from direct fetch this session. The row's
--    "2021 access dispute" claim about the Alpental approach also couldn't be corroborated.
--  - Big Snow Mountain (both routes): the claimed FSR 56 washout at milepost 17.3 (as of July 1,
--    2026) is corroborated by multiple independent search results citing a USFS alerts page,
--    but that page itself was blocked from direct fetch -- treat as well-corroborated but not
--    primary-source-verified; road conditions change fast, so a human should recheck live USFS
--    alerts before relying on it operationally. (Same caveat as batch 2's Bacon Peak FR-1107
--    flag.)
-- =========================================================================

-- Verify afterward:
select id, fa from routes where id = 'wa_beyond_redlining';
select id, access from routes where id = 'wa_beyond_redlining';
select id, high_point_ft from routes where id = 'wa_big_kangaroo_southwest_rib';
select id, overview, waypoints from routes where id = 'wa_black_peak_northeast_ridge';
select id, corrections, gain_ft from routes where id = 'wa_big_snow_mountain_east_ridge_hardscrabble_route';
select id, access from routes where id = 'wa_blood_sport';
