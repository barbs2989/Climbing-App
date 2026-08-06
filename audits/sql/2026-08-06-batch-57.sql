-- WA alpine audit -- pass 2, batch 6 (batch #57 overall) -- 2026-08-06
-- Routes: wa_chair_bryant_traverse, wa_chair_peak_east_face, wa_chair_peak_north_face,
--         wa_chair_peak_northeast_buttress, wa_chair_peak_northwest_ridge (Chair Peak),
--         wa_chalangin_peak_little_giant_pass_luahna_col (Chalangin Peak),
--         wa_chelan_butte_chelan_butte_trail (Chelan Butte),
--         wa_chianti_spire_east_face (Chianti Spire),
--         wa_chimney_rock_east_face_direct, wa_chimney_rock_west_face (Chimney Rock)
-- Researched via 5 parallel agents, one per peak. See audits/wa-alpine-audit-log.md for
-- the full writeup. Every confirmed fix's current value was re-verified against a fresh
-- live Supabase read before this file was written. All WHERE clauses include the current
-- (wrong) value as a safety check per project convention.

-- =========================================================================
-- CHAIR PEAK
-- =========================================================================

-- Chair-Bryant Traverse (wa_chair_bryant_traverse) -- grade/grade_num/pitches/fa were
-- populated with unverifiable values that directly contradict this same row's own
-- `corrections` field, which states "no dedicated page exists for this exact linkup ...
-- all numeric grade/pitch/FA fields are left null" and explicitly declines to borrow
-- Mountain Project's "Tooth - Chair Traverse" data. Clearing to match the row's own
-- documented methodology.
UPDATE routes
SET grade = NULL, grade_num = NULL, fa = NULL, pitches = NULL
WHERE id = 'wa_chair_bryant_traverse'
  AND grade = '5.7' AND grade_num = 7 AND fa = 'Ari Schneider, Jason Linker' AND pitches = 0;

-- North Face (wa_chair_peak_north_face) -- top-level grade held "III" (a Roman-numeral
-- commitment grade, duplicating the separate `commitment` column) under grade_system='yds',
-- which requires a YDS value. This row's own grade_num (4) and rock_grade ('5.4') both
-- independently point to 5.4 as the intended value.
UPDATE routes
SET grade = '5.4'
WHERE id = 'wa_chair_peak_north_face'
  AND grade = 'III' AND grade_system = 'yds';

-- =========================================================================
-- CHALANGIN PEAK
-- =========================================================================

-- Little Giant Pass - Luahna Col (wa_chalangin_peak_little_giant_pass_luahna_col) --
-- top-level permit column was null even though this row's own access.permit field
-- already documents the free self-issue wilderness permit requirement. lib/db.js
-- (dbRouteToCamel) reads only the top-level `permit` column, not access.permit, so the
-- info was not rendering in the app at all.
UPDATE routes
SET permit = access->>'permit',
    corrections = COALESCE(corrections, '') || ' 2026-08-06: top-level permit field was null while this row''s own access.permit already documented the requirement; copied across so the permit info actually renders (lib/db.js reads the top-level permit column, not access.permit).'
WHERE id = 'wa_chalangin_peak_little_giant_pass_luahna_col'
  AND permit IS NULL;

-- Little Giant Pass - Luahna Col (wa_chalangin_peak_little_giant_pass_luahna_col) --
-- season said "Jul-Oct", contradicted by this row's own climate.summer field and by
-- WTA/Mountaineers.org, which state the Chiwawa River ford at the trailhead is only
-- safely fordable August through October -- July still carries high, dangerous
-- snowmelt runoff.
UPDATE routes
SET season = 'Aug-Oct',
    corrections = COALESCE(corrections, '') || ' 2026-08-06: season corrected from "Jul-Oct" to "Aug-Oct" -- contradicted this row''s own climate.summer field and WTA/Mountaineers.org, which state the Chiwawa River ford at the trailhead is only safely navigable August through October; July still carries high, dangerous snowmelt runoff.'
WHERE id = 'wa_chalangin_peak_little_giant_pass_luahna_col'
  AND season = 'Jul-Oct';

-- =========================================================================
-- CHELAN BUTTE
-- =========================================================================

-- Chelan Butte (area) -- elevation_ft stale at 3812; this route's own summit waypoint
-- (elevFt: 3835) and this row's own `corrections` field ("Peakbagger, PeakVisor, and WTA
-- all confirm a 3,835 ft summit") already settled on 3835 but it was never applied to
-- the actual column. Confirmed externally (PeakVisor, SummitPost).
UPDATE areas SET elevation_ft = 3835 WHERE id = 'wa_chelan_butte' AND elevation_ft = 3812;

-- Chelan Butte Trail (wa_chelan_butte_chelan_butte_trail) -- high_point_ft stale at
-- 3812, same source/contradiction as the area fix above.
UPDATE routes SET high_point_ft = 3835 WHERE id = 'wa_chelan_butte_chelan_butte_trail' AND high_point_ft = 3812;

-- Chelan Butte Trail (wa_chelan_butte_chelan_butte_trail) -- permit text wrongly cited a
-- Northwest Forest Pass (a USFS pass); Chelan Butte Wildlife Area is WDFW (state) land,
-- not USFS, so a Discover Pass / WDFW Vehicle Access Pass is required instead -- this
-- row's own access.parking_pass field already said so correctly, contradicting the
-- top-level permit field.
UPDATE routes
SET permit = 'No climbing or wilderness permit required; Discover Pass or WDFW Vehicle Access Pass required to park at the WDFW trailhead.'
WHERE id = 'wa_chelan_butte_chelan_butte_trail'
  AND permit = 'No climbing or wilderness permit required; Northwest Forest Pass (or day fee) to park at developed trailheads.';

-- =========================================================================
-- CHIANTI SPIRE
-- =========================================================================

-- Chianti Spire (area) -- elevation_ft stored as 8459, contradicting this route's own
-- "Chianti Spire Summit" waypoint (elevFt 8420) and external sources (ListsOfJohn,
-- SummitPost) giving 8,420 ft.
UPDATE areas SET elevation_ft = 8420 WHERE id = 'wa_chianti_spire' AND elevation_ft = 8459;

-- East Face / Rebel Yell (wa_chianti_spire_east_face) -- high_point_ft stored as 8459,
-- same contradiction/source as the area fix above.
UPDATE routes SET high_point_ft = 8420 WHERE id = 'wa_chianti_spire_east_face' AND high_point_ft = 8459;

-- East Face / Rebel Yell (wa_chianti_spire_east_face) -- length_m stored as 198, but
-- this row's own pitch_detail lengths (45+25+35+25+35+45+5 m) sum to 215.
UPDATE routes SET length_m = 215 WHERE id = 'wa_chianti_spire_east_face' AND length_m = 198;

-- =========================================================================
-- CHIMNEY ROCK
-- =========================================================================

-- East Face Direct (wa_chimney_rock_east_face_direct) -- emergency.nearestHospital named
-- a nonexistent Cle Elum "hospital" address/phone. Kittitas Valley Healthcare's only
-- ER/hospital is in Ellensburg (603 S Chestnut St, 509-962-9841); the Cle Elum location
-- is an urgent-care clinic only, non-emergency -- this is exactly what the sibling row
-- wa_chimney_rock_west_face already states correctly.
UPDATE routes
SET emergency = jsonb_set(
  emergency,
  '{nearestHospital}',
  '"Kittitas Valley Healthcare, 603 S Chestnut St, Ellensburg, WA 98926 -- (509) 962-9841 (24-hr ER; KVH Cle Elum location is urgent care only, non-emergency)"'
)
WHERE id = 'wa_chimney_rock_east_face_direct'
  AND emergency->>'nearestHospital' = 'Kittitas Valley Healthcare, 201 Alpha Way, Cle Elum, WA 98922 — (509) 674-5331';

-- West Face / South Summit (wa_chimney_rock_west_face) -- aspect stored as "E" even
-- though the route's name, overview, beta, hourly schedule, and descent narrative all
-- consistently describe it as the west face.
UPDATE routes
SET aspect = 'W'
WHERE id = 'wa_chimney_rock_west_face' AND aspect = 'E';

-- West Face / South Summit (wa_chimney_rock_west_face) -- itinerary.sourceNote still
-- justified its gain estimate using the 7,727 ft main-summit elevation, contradicting
-- this same row's own (correctly pass-1-batch-5-fixed) high_point_ft of 7,440 ft for the
-- South Summit this route actually climbs.
UPDATE routes
SET itinerary = jsonb_set(
  itinerary,
  '{sourceNote}',
  '"Route/pitch detail from SummitPost''s ''West Face (Standard Route)'' page and SummitPost''s Chimney Rock overview (approach/camp), with camp-to-notch and descent pacing estimated from an analogous South Peak trip report (trailcatjim.com, Aug 1999). On-file gainFt was blank; ~5,800-6,000 ft round trip is estimated from the shared approach/summit elevation (7,440 ft, this route''s South Summit high point, not the 7,727-ft main summit) and matches the ~19 mi distKm on file."'
)
WHERE id = 'wa_chimney_rock_west_face'
  AND itinerary->>'sourceNote' = 'Route/pitch detail from SummitPost''s ''West Face (Standard Route)'' page and SummitPost''s Chimney Rock overview (approach/camp), with camp-to-notch and descent pacing estimated from an analogous South Peak trip report (trailcatjim.com, Aug 1999). On-file gainFt was blank; ~5,800-6,000 ft round trip is estimated from the shared approach/summit elevation (7,727 ft) and matches the ~19 mi distKm on file.';
