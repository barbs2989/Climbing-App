-- WA alpine audit — batch 102 (2026-08-12, pass 2)
-- Routes: wa_south_face_10 (Cathedral Peak), wa_south_face_12 (Argonaut Peak),
--         wa_south_face_2 (Pernod Spire), wa_south_face_3 & wa_south_face_center
--         (Concord Tower), wa_south_face_4 (Kangaroo Temple), wa_south_face_5
--         (Inspiration Peak), wa_south_gully_south_spur & wa_south_rib (Guye Peak),
--         wa_south_headwall (Mount Stuart)
-- Researched via 8 parallel agents (one per peak/route-group). Confirmed fixes
-- below; see audits/wa-alpine-audit-log.md for items independently verified as
-- correct and items flagged for human review rather than auto-fixed. All WHERE
-- clauses include the current (wrong) value as a safety check per project
-- convention. Every confirmed fix's "current value" was independently
-- re-verified against a fresh full-row fetch of the live DB before this file
-- was written.
--
-- NOTE: several agents reported the network egress proxy blocking WebFetch for
-- mountainproject.com, supertopo.com, summitpost.org, mountaineers.org, and
-- similar reference domains this run, limiting them to WebSearch snippet
-- synthesis rather than primary-page text for some facts (Pernod Spire FA/
-- grade, Kangaroo Temple FA, Concord Tower's fourth FA name, South Rib pitch
-- count). Those items are left un-fixed and flagged for human review rather
-- than treated as confirmed.

-- =========================================================================
-- Argonaut Peak (wa_argonaut_peak) — wa_south_face_12
-- =========================================================================

-- waypoints[1] (Argonaut Peak summit) elevation was the older/superseded
-- 8,453 ft figure, contradicting this row's own (correct, current) elevation.
-- Wikipedia's Argonaut Peak entry (NAVD88-derived) gives 8,457 ft, matching
-- this row's own high_point_ft — the waypoint alone was stale.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elev}', '8457')
WHERE id = 'wa_south_face_12'
  AND waypoints->1->>'name' = 'Argonaut Peak summit (west summit, true)'
  AND (waypoints->1->>'elev')::numeric = 8453;

-- =========================================================================
-- Concord Tower (wa_concord_tower) — wa_south_face_3, wa_south_face_center
-- =========================================================================

-- Both Concord Tower routes carried high_point_ft = 7569, but this row's own
-- waypoints (both routes list "Concord Tower Summit" at elev 7560) and
-- multiple independent external sources (SummitPost et al.) consistently
-- give the tower's summit as 7,560 ft — no source anywhere supports 7569.
UPDATE routes SET high_point_ft = 7560
WHERE id = 'wa_south_face_3' AND high_point_ft = 7569;

UPDATE routes SET high_point_ft = 7560
WHERE id = 'wa_south_face_center' AND high_point_ft = 7569;

-- =========================================================================
-- Inspiration Peak (wa_inspiration_peak) — wa_south_face_5
-- =========================================================================

-- waypoints[1] (Inspiration Peak summit) elevation was 7,880 ft, contradicting
-- this row's own (correct, current) high_point_ft. Wikipedia and Peakbagger
-- both independently give 7,891 ft — the waypoint alone was stale.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elev}', '7891')
WHERE id = 'wa_south_face_5'
  AND waypoints->1->>'name' = 'Inspiration Peak'
  AND (waypoints->1->>'elev')::numeric = 7880;

-- pitches (8) and length_m (305 = ~1000ft) both contradicted this row's own
-- beta ("about 600 ft (4 pitches)"), itinerary ("just 4 pitches (5.8) to the
-- summit — the shortest of Inspiration's three technical lines"), and its own
-- pitch_detail array (exactly 4 entries, P1-P4, summing to 160m = ~525ft,
-- consistent with the "~600 ft" beta text). 8 pitches/305m is not corroborated
-- anywhere else on this row.
UPDATE routes SET pitches = 4, length_m = 160
WHERE id = 'wa_south_face_5' AND pitches = 8 AND length_m = 305;

-- =========================================================================
-- Mount Stuart (wa_mount_stuart) — wa_south_headwall
-- =========================================================================

-- approach_logistics.peakLat/peakLng (47.4773, -120.9022) sat ~0.3mi/1600ft
-- from Mount Stuart's true summit, disagreeing with this row's own area
-- lat/lng (47.475118, -120.903144) and its own waypoints "Mount Stuart summit
-- area" entry (47.4751179, -120.9031444) — both of which match USGS GNIS
-- Feature ID 1526641 exactly. The approach_logistics pair was the outlier.
UPDATE routes SET approach_logistics = jsonb_set(jsonb_set(approach_logistics, '{peakLat}', '47.4751179'), '{peakLng}', '-120.9031444')
WHERE id = 'wa_south_headwall'
  AND (approach_logistics->>'peakLat')::numeric = 47.4773
  AND (approach_logistics->>'peakLng')::numeric = -120.9022;
