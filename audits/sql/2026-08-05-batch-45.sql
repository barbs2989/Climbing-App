-- WA alpine audit — batch 45 (2026-08-05)
-- Routes: wa_southwest_face (The Tooth), wa_southwest_scramble (Pinnacle Peak),
--         wa_soviet_route (Bonanza Peak), wa_spectre_peak_south_route (Spectre Peak),
--         wa_spider_mountain_north_face, wa_spider_mountain_north_ridge (Spider Mountain),
--         wa_spire_point_southwest_face (Spire Point), wa_stanley_burgner (Prusik Peak),
--         wa_storm_king_north_face, wa_storm_king_southwest_scramble (Storm King)
-- Researched via 5 parallel agents, one peak-group each. All fixes below were
-- independently re-verified against this batch's own raw row data (waypoints,
-- itinerary day-sums, area rows, sibling routes) before inclusion — two of the
-- research agents' proposed fixes were rejected/revised after that check (see
-- audits/wa-alpine-audit-log.md for details): a Southwest Face grade "correction"
-- that actually contradicted this row's own considered `corrections` note, and a
-- Soviet Route elevation "correction" that would have overwritten a real,
-- deliberately-different sub-summit figure with the main summit's elevation.

-- =========================================================================
-- The Tooth (wa_the_tooth) — wa_southwest_face
-- =========================================================================

-- wa_southwest_face: pitches (0) contradicts this row's own pitch_detail array
-- (4 numbered pitch sections: P1-P2, P3, P4) and its own corrections note
-- ("MP is the authoritative page... 350 ft, 4 pitches").
UPDATE routes
SET pitches = 4,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: pitches corrected from 0 to 4 -- contradicted this row''s own pitch_detail array (4 sections) and its own corrections note citing Mountain Project''s 4-pitch breakdown.'
WHERE id = 'wa_southwest_face'
  AND pitches = 0;

-- wa_southwest_face: alpine_grade ('II') duplicated the commitment field ('II')
-- instead of holding a French-adjectival grade -- same recurring DB-wide bug
-- pattern found repeatedly in past batches. No verified French-scale value found
-- to substitute.
UPDATE routes
SET alpine_grade = NULL,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: alpine_grade cleared -- duplicated the commitment grade (''II'') rather than holding a French-adjectival value; no sourced replacement found.'
WHERE id = 'wa_southwest_face'
  AND alpine_grade = 'II' AND commitment = 'II';

-- =========================================================================
-- Pinnacle Peak, Tatoosh Range (wa_pinnacle_peak_tatoosh) — wa_southwest_scramble
-- =========================================================================

-- wa_southwest_scramble: gain_ft/loss_ft (1050) only covered the trailhead-to-
-- saddle segment (matches this row's own approach text: "~1,050 ft ... to the
-- 5,920 ft saddle"), omitting the additional gain from saddle to summit. This
-- row's own waypoints give trailhead elevFt 4880 and summit elevFt 6562 -- a
-- full-route gain of 1682 ft.
UPDATE routes
SET gain_ft = 1682, loss_ft = 1682,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: gain_ft/loss_ft corrected from 1050 to 1682 -- old figure only covered the trailhead-to-saddle segment; this row''s own waypoints (trailhead 4880ft, summit 6562ft) give a full-route gain of 1682 ft.'
WHERE id = 'wa_southwest_scramble'
  AND gain_ft = 1050 AND loss_ft = 1050;

-- wa_southwest_scramble: access.permitZone and access._raw.wilderness_zone both
-- said "Tatoosh Wilderness" -- a separate, legally distinct USFS wilderness in
-- Gifford Pinchot National Forest (designated 1984), not part of Mount Rainier
-- National Park. This row's own land_manager/landManager fields already
-- correctly say NPS Mount Rainier NP, whose backcountry wilderness unit is
-- "Mount Rainier Wilderness" (NPS, designated 1988). The Butter Creek RNA
-- adjacency itself is geographically accurate and left unchanged.
UPDATE routes
SET access = jsonb_set(
  jsonb_set(access, '{permitZone}', '"Mount Rainier Wilderness (borders Butter Creek Research Natural Area)"'),
  '{_raw,wilderness_zone}', '"Mount Rainier Wilderness (borders Butter Creek Research Natural Area)"'
),
corrections = COALESCE(corrections, '') || ' 2026-08-05: access.permitZone / access._raw.wilderness_zone corrected from "Tatoosh Wilderness" to "Mount Rainier Wilderness" -- Tatoosh Wilderness is a separate Gifford Pinchot NF unit, not part of Mount Rainier NP, whose own wilderness is "Mount Rainier Wilderness"; this row''s own land_manager field already correctly names NPS Mount Rainier NP.'
WHERE id = 'wa_southwest_scramble'
  AND access->>'permitZone' = 'Tatoosh Wilderness (borders Butter Creek Research Natural Area)';

-- =========================================================================
-- Bonanza Peak (wa_bonanza_peak) — wa_soviet_route
-- =========================================================================

-- wa_soviet_route: access.land_manager repeats the exact nonexistent
-- "Chiwawa/Entiat Ranger Districts" error already found and fixed elsewhere on
-- this same peak in batch 4. This row's own access.landManager field (camelCase)
-- already correctly says "Chelan Ranger District."
UPDATE routes
SET access = jsonb_set(access, '{land_manager}', '"Okanogan-Wenatchee National Forest (Chelan Ranger District) -- Glacier Peak Wilderness"'),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: access.land_manager corrected -- "Chiwawa/Entiat Ranger Districts" does not exist (same recurring error already fixed elsewhere on this peak in batch 4); this row''s own access.landManager field already correctly names Chelan Ranger District.'
WHERE id = 'wa_soviet_route'
  AND access->>'land_manager' LIKE '%Chiwawa/Entiat%';

-- wa_soviet_route: loss_ft was null. This row's own itinerary day-sums
-- (0 + 2300 + 3000 = 5300) match gain_ft (5300) exactly, as expected for a
-- round trip returning to the same trailhead.
UPDATE routes
SET loss_ft = 5300,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: loss_ft filled as 5300 (was null) -- matches this row''s own itinerary day-sum (0+2300+3000) and gain_ft (5300) for this round-trip route.'
WHERE id = 'wa_soviet_route'
  AND loss_ft IS NULL;

-- wa_soviet_route: dist_km (22.53 km = 14.0 mi) is the round-trip distance --
-- this row's own itinerary day-miles sum to the same 14 mi (5.5+3+5.5). Per
-- CLAUDE.md the app displays round trip as dist_km*2, so the stored value must
-- be one-way (7 mi = 11.27 km), matching the "Northeast Ridge traverse"
-- waypoint's own one-way distMi of 6.8.
UPDATE routes
SET dist_km = 11.27,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: dist_km corrected from 22.53 to 11.27 -- old value was the round-trip distance (matches itinerary day-miles sum of 14mi); per this app''s distKm*2 display convention the stored value must be one-way.'
WHERE id = 'wa_soviet_route'
  AND dist_km = 22.53;

-- NOTE (not applied): a research pass this batch proposed changing high_point_ft
-- from 9320 to 9511/9516 to match Bonanza's main summit. Rejected on review --
-- this route's own overview text explicitly states it climbs to Bonanza's
-- "Southwest Peak (9,320'), a distinct sub-summit south of Bonanza's true
-- 9,516' main summit." 9320 is correct for what this specific route climbs.
-- See flags in the audit log for the unresolved question of whether the route's
-- own "Northeast Ridge traverse to West Peak" waypoint (9410 ft, higher than the
-- Southwest Peak summit) means the route's true high point is somewhat above
-- 9320 -- left for human review, not guessed here.

-- =========================================================================
-- Spectre Peak (wa_spectre_peak) — wa_spectre_peak_south_route
-- =========================================================================

-- wa_spectre_peak_south_route: gain_ft (7052) and loss_ft (null) did not match
-- this row's own 4-day itinerary, whose day-level gainFt/lossFt sum to
-- 8100/8100 (4300+1600+1500+700 / 800+1900+200+5200) -- symmetric, as expected
-- for this out-and-back approach-and-climb trip.
UPDATE routes
SET gain_ft = 8100, loss_ft = 8100,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: gain_ft/loss_ft corrected from 7052/null to 8100/8100 -- matches this row''s own 4-day itinerary day-sum (4300+1600+1500+700 gain / 800+1900+200+5200 loss), symmetric as expected for this out-and-back route.'
WHERE id = 'wa_spectre_peak_south_route'
  AND gain_ft = 7052 AND loss_ft IS NULL;

-- wa_spectre_peak_south_route: dist_km (74.03 km = 46.0 mi) is the round-trip
-- distance -- this row's own approach text and itinerary.totalNote both
-- describe "roughly a 46-mile... round-trip" explicitly "matching the on-file
-- 74 km distance." Per the app's distKm*2 convention the stored value must be
-- one-way (23 mi = 37.02 km).
UPDATE routes
SET dist_km = 37.02,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: dist_km corrected from 74.03 to 37.02 -- old value was the round-trip distance (this row''s own approach text explicitly calls 74km the round-trip figure); per this app''s distKm*2 display convention the stored value must be one-way.'
WHERE id = 'wa_spectre_peak_south_route'
  AND dist_km = 74.03;

-- wa_spectre_peak_south_route: waypoints[7] (summit) elevFt (7880) is a stale
-- older AAJ/NWMJ figure. high_point_ft (7952) and the parent area's own
-- elevation_ft (7952, listsofjohn.com LIDAR-derived) both already agree on the
-- more precise modern figure -- this row's own data_quality.gaps field already
-- documents the 7880-vs-7952 split and calls 7952 the current/likely figure.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{7,elevFt}', '7952'),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: waypoints[7] (summit) elevFt corrected from 7880 to 7952 -- stale older AAJ/NWMJ figure; high_point_ft and the parent area''s own elevation_ft already agree on 7952 (listsofjohn.com/LIDAR), as this row''s own data_quality.gaps note already concluded.'
WHERE id = 'wa_spectre_peak_south_route'
  AND (waypoints->7->>'elevFt')::numeric = 7880;

-- wa_spectre_peak_south_route: access.landManager named a nonexistent "Glacier
-- Ranger District." Confirmed via the USFS's own site: Mt. Baker-Snoqualmie NF
-- has no ranger district by that name -- the correct district is "Mt. Baker
-- Ranger District" (Glacier, WA is simply the town hosting that district's
-- public service center, matching this row's own emergency.rangerStation field).
UPDATE routes
SET access = jsonb_set(access, '{landManager}', '"North Cascades National Park Service Complex (the Picket Range lies entirely within the park); trailhead access is via Mt Baker-Snoqualmie National Forest, Mt. Baker Ranger District"'),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: access.landManager corrected -- "Glacier Ranger District" does not exist on Mt. Baker-Snoqualmie NF per the USFS''s own site; the correct district is "Mt. Baker Ranger District" (Glacier, WA hosts that district''s public service center, matching this row''s own emergency.rangerStation field).'
WHERE id = 'wa_spectre_peak_south_route'
  AND access->>'landManager' LIKE '%Glacier Ranger District%';

-- wa_spectre_peak_south_route: data_quality.gaps[2] is a stale research-session
-- artifact referencing an "on-file FA year of '1980'" that no longer exists --
-- this row's own fa field already correctly reads "Sam Boyce and Joe Manning,
-- July 2022."
UPDATE routes
SET data_quality = data_quality #- '{gaps,2}',
    corrections = COALESCE(corrections, '') || ' 2026-08-05: removed stale data_quality.gaps entry referencing an "on-file FA year of 1980" -- this row''s own fa field already correctly reads Sam Boyce and Joe Manning, July 2022; the note was a leftover research-session artifact.'
WHERE id = 'wa_spectre_peak_south_route'
  AND data_quality->'gaps'->2 IS NOT NULL
  AND data_quality->'gaps'->>2 LIKE '%on-file FA year of%1980%';

-- wa_spectre_peak_south_route: approach_logistics.trailheadDirection was
-- truncated mid-sentence ("Start at the Hannegan Pass Trailhead (elev."). This
-- row's own (complete) approach field gives the intended continuation.
UPDATE routes
SET approach_logistics = jsonb_set(approach_logistics, '{trailheadDirection}', '"Start at the Hannegan Pass Trailhead (elev. ~3,120 ft) at the end of Ruth Creek Road (FS-32), then follow the maintained Hannegan Pass Trail #674 up the Ruth Creek valley to 5,050 ft Hannegan Pass, then leave the trail toward Easy Ridge."'),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: approach_logistics.trailheadDirection completed -- was truncated mid-sentence ("...Trailhead (elev."); completed using this row''s own (complete) approach field.'
WHERE id = 'wa_spectre_peak_south_route'
  AND approach_logistics->>'trailheadDirection' = 'Start at the Hannegan Pass Trailhead (elev.';

-- =========================================================================
-- Spider Mountain (wa_spider_mountain) — no confirmed fixes this batch
-- =========================================================================
-- wa_spider_mountain_north_face and wa_spider_mountain_north_ridge audited
-- clean/flagged only -- see audits/wa-alpine-audit-log.md for the id/name
-- mismatch and FA-spelling flags. No SQL for this peak.

-- =========================================================================
-- Spire Point (wa_spire_point) — wa_spire_point_southwest_face
-- =========================================================================

-- wa_spire_point_southwest_face: pitches (1) contradicts this row's own
-- rope_note ("5-pitch 5.6") and pitch_detail (5 numbered pitch sections, with
-- the itinerary schedule referencing P1-P5).
UPDATE routes
SET pitches = 5,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: pitches corrected from 1 to 5 -- contradicted this row''s own rope_note ("5-pitch 5.6") and pitch_detail (5 numbered sections).'
WHERE id = 'wa_spire_point_southwest_face'
  AND pitches = 1;

-- =========================================================================
-- Prusik Peak (wa_prusik_peak) — wa_stanley_burgner
-- =========================================================================

-- wa_stanley_burgner: alpine_grade ('III') duplicated the commitment field
-- ('III') instead of holding a French-adjectival grade -- same recurring
-- DB-wide bug pattern. No verified French-scale value found to substitute.
UPDATE routes
SET alpine_grade = NULL,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: alpine_grade cleared -- duplicated the commitment grade (''III'') rather than holding a French-adjectival value; no sourced replacement found.'
WHERE id = 'wa_stanley_burgner'
  AND alpine_grade = 'III' AND commitment = 'III';

-- wa_stanley_burgner: loss_ft was null. gain_ft (5400) already matches this
-- row's own itinerary day-sum (4000+700+700) and its own totalNote ("~5,400 ft
-- round-trip"); the itinerary's day-level lossFt sums to the identical 5400
-- (700+700+4000) for this out-and-back route.
UPDATE routes
SET loss_ft = 5400,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: loss_ft filled as 5400 (was null) -- matches gain_ft and this row''s own itinerary day-sum for this out-and-back route.'
WHERE id = 'wa_stanley_burgner'
  AND loss_ft IS NULL;

-- wa_stanley_burgner: dist_km (31.38 km = 19.5 mi) is the round-trip distance
-- -- matches this row's own itinerary.totalNote verbatim ("~19.5 mi... round-
-- trip"). Per the app's distKm*2 convention the stored value must be one-way.
UPDATE routes
SET dist_km = 15.69,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: dist_km corrected from 31.38 to 15.69 -- old value was the round-trip distance (matches this row''s own itinerary.totalNote "~19.5 mi round-trip" verbatim); per this app''s distKm*2 display convention the stored value must be one-way.'
WHERE id = 'wa_stanley_burgner'
  AND dist_km = 31.38;

-- wa_stanley_burgner: descent and descent_text both say "five" rappels,
-- contradicted by this row's own rappel_detail array (exactly 4 entries) and
-- its own rappel_count_note, which explicitly states independent trip reports
-- and Mountain Project "converge on four single-rope rappels... not five."
UPDATE routes
SET descent = replace(descent, '~5 rappels', '~4 rappels'),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: descent corrected "~5 rappels" to "~4 rappels" -- contradicted this row''s own rappel_detail array (4 entries) and rappel_count_note.'
WHERE id = 'wa_stanley_burgner'
  AND descent LIKE '%~5 rappels%';

UPDATE routes
SET descent_text = replace(descent_text, 'Plan on five single-rope rappels', 'Plan on four single-rope rappels'),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: descent_text corrected "five single-rope rappels" to "four" -- same fix as descent, per this row''s own rappel_detail array and rappel_count_note.'
WHERE id = 'wa_stanley_burgner'
  AND descent_text LIKE '%Plan on five single-rope rappels%';

-- wa_stanley_burgner: waypoints[0] name ("Snow Lakes Trailhead") is copy-paste
-- contamination -- its stored coordinates (47.527315, -120.820942) match Stuart
-- Lake Trailhead, which every other field in this row (approach, road,
-- approach_logistics) consistently names as the correct access point for this
-- route. Snow Lakes Trailhead is a different, more distant Enchantments access
-- point.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,name}', '"Stuart Lake Trailhead"'),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: waypoints[0] name corrected from "Snow Lakes Trailhead" to "Stuart Lake Trailhead" -- coordinates match Stuart Lake TH, which this row''s own approach/road/approach_logistics fields consistently name as the real access point.'
WHERE id = 'wa_stanley_burgner'
  AND waypoints->0->>'name' = 'Snow Lakes Trailhead';

-- wa_stanley_burgner: length_m (152m / ~500ft) conflicts with multiple
-- corroborating external sources (climbing.com, Mountain Project,
-- Mountaineers.org) that consistently describe this as a "600-foot route"
-- (600 ft = 182.9 m). NOTE: this row's own pitch_detail pitch lengths sum to
-- 237m (777ft), which does not fully reconcile with either figure -- flagged
-- separately in the audit log as a residual inconsistency, not resolved here.
UPDATE routes
SET length_m = 182.9,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: length_m corrected from 152 to 182.9 (600ft) -- multiple external sources (climbing.com, Mountain Project, Mountaineers.org) consistently describe this as a 600-foot route. Note: this row''s own pitch_detail lengths sum to 237m, which still does not fully reconcile -- flagged for further review.'
WHERE id = 'wa_stanley_burgner'
  AND length_m = 152;

-- wa_stanley_burgner: fa claimed the FA party's "full given names not
-- independently confirmed" -- both externally wrong (Fred Stanley and Ron
-- Burgner's full names are documented, e.g. climbing.com) and internally
-- contradicted by this row's own overview field, which already names them.
UPDATE routes
SET fa = '1968; first ascent by Fred Stanley and Ron Burgner, nearly free except two points of aid for the leader.',
    corrections = COALESCE(corrections, '') || ' 2026-08-05: fa corrected -- previously claimed full given names were unconfirmed, but this row''s own overview field and external sources (climbing.com) already name Fred Stanley and Ron Burgner.'
WHERE id = 'wa_stanley_burgner'
  AND fa LIKE '%full given names not independently confirmed%';

-- =========================================================================
-- Storm King (wa_storm_king) — wa_storm_king_north_face, wa_storm_king_southwest_scramble
-- =========================================================================
-- IMPORTANT: this Storm King is in North Cascades National Park (near Mount
-- Goode), NOT the unrelated same-named peak in Olympic NP near Lake Crescent --
-- this batch's own task briefing incorrectly assumed Olympic NP; the audit
-- agent caught this and correctly did not apply any Olympic-NP-based
-- corrections. The area hierarchy/land-manager text in the DB (North Cascades
-- NP, Wilderness Information Center Marblemount) is already correct as-is.

-- wa_storm_king_north_face: approach_logistics.peakLat/peakLng (48.49, -120.88)
-- doesn't match this peak's own area row (wa_storm_king: 48.4913, -120.9228)
-- or the sibling Southwest Scramble route's approach_logistics for the same
-- peak (which correctly uses 48.4913/-120.9228) -- a ~3km internal
-- inconsistency, self-evident without an external source.
UPDATE routes
SET approach_logistics = jsonb_set(jsonb_set(approach_logistics, '{peakLat}', '48.4913'), '{peakLng}', '-120.9228'),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: approach_logistics.peakLat/peakLng corrected from 48.49/-120.88 to 48.4913/-120.9228 -- ~3km off from this peak''s own area row and its sibling Southwest Scramble route, both of which already use the correct coordinates.'
WHERE id = 'wa_storm_king_north_face'
  AND (approach_logistics->>'peakLat')::numeric = 48.49 AND (approach_logistics->>'peakLng')::numeric = -120.88;

-- NOTE (not a field fix -- flagged for human review, see audit log): this
-- route's own `verif` field already states "Likely a fabricated entry --
-- verify independently before relying on this beta." No source found this
-- batch corroborates a "North Face" technical route or a 1978 FA by Dick
-- Emerson/Walt Grove on this Storm King; every available source documents only
-- the Southwest Route as an established line. Per audit guardrails this run
-- does not delete rows -- flagging for a human decision on whether to remove
-- or further investigate this entry.

-- wa_storm_king_southwest_scramble: loss_ft (2200) conflicts with this row's
-- own itinerary day-sum (300+100+5900=6300) and with gain_ft (6800) -- an
-- out-and-back trip returning to the same trailhead should have gain roughly
-- equal to loss.
UPDATE routes
SET loss_ft = 6300,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: loss_ft corrected from 2200 to 6300 -- matches this row''s own itinerary day-sum (300+100+5900) and is consistent with gain_ft (6800) for this out-and-back route.'
WHERE id = 'wa_storm_king_southwest_scramble'
  AND loss_ft = 2200;

-- NOTE (not applied -- flagged for human review, see audit log): waypoints[6]
-- and gpx[6] ("Rainy Pass Trailhead...") contain a leaked research-session
-- artifact -- its `note` field is meta-commentary about the database itself
-- ("The current DB trailhead... is very likely wrong") rather than user-facing
-- route content, and geographically it sits far from the rest of the route's
-- waypoint sequence. However, no other waypoint in this row documents an actual
-- trailhead before mile 13.8 ("Skagit Queen Camp"), so simply deleting this
-- element would leave the route with no stored trailhead at all. This needs a
-- human decision on the correct trailhead/approach, not a mechanical removal.
