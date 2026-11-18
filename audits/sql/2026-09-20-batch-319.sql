-- WA alpine audit batch 319 (pass 6)
-- Routes: wa_dragontail_peak_backbone_ridge, wa_dragontail_peak_east_ridge_aasgard_pass,
--         wa_dragontail_peak_r1, wa_dragontail_peak_r2, wa_dragontail_peak_r3,
--         wa_dragontail_peak_r4, wa_dragontail_peak_serpentine_arete, wa_e_se_face
--
-- All three statements below are gated on the exact live value, re-checked
-- directly against the table immediately before this file was written.
--
-- OPERATIONAL NOTE, restated once more (see batches 248/249/250/317 and the
-- log entry for detail): batch 187's wa_dragontail_peak_r1 fix (2026-09-03)
-- and batch 253's wa_e_se_face fix (2026-09-09) are BOTH still live-wrong
-- 17 and 11 days later respectively -- confirmed directly against the table
-- this run, not assumed. Both are re-issued below (marked RE-ISSUE) rather
-- than skipped as "already handled." Nothing here should be read as
-- evidence the SQL-application backlog has cleared.

-- =========================================================================
-- Dragontail Peak, Hidden Couloir -- wa_dragontail_peak_r1
-- RE-ISSUE of batch 187 (2026-09-03), still unapplied.
-- FINDING: dist_km stored 20 (km), which does not correspond to this row's
-- own waypoint chain. Re-verified directly against the live waypoints array
-- this run: the chain climbs monotonically (Trailhead 0mi -> Colchuck Lake
-- trail split 2.3mi -> Colchuck Lake 4/4.3mi -> lateral moraine crest 5mi ->
-- Hidden Couloir base 5.3mi -> mid-face ice runnels 6mi -> Summit 6.3mi),
-- giving a one-way distance-to-summit of 6.3 mi = 10.14 km. This matches
-- the sibling wa_dragontail_peak_east_ridge_aasgard_pass almost exactly,
-- which shares the identical Stuart Lake Trailhead -> Colchuck Lake ->
-- Aasgard Pass corridor for its own first ~5 miles and already stores
-- dist_km = 10.1 (its own waypoint-derived one-way distance, 6.25 mi).
UPDATE routes SET dist_km = 10.1
  WHERE id = 'wa_dragontail_peak_r1'
  AND dist_km = 20;

-- =========================================================================
-- Witches Tower, E/SE Face -- wa_e_se_face
-- RE-ISSUE of batch 253 (2026-09-09), still unapplied.
-- FINDING: dist_km stored 24.14 (km) = 15.00 mi one-way, doubling to a
-- displayed 30 mi round trip. Re-verified directly against the live
-- waypoints array this run: Trailhead (0 mi) -> Colchuck Lake (4 mi) ->
-- Aasgard Pass (5 mi) -> Summit (5.7 mi) = one-way distance to summit of
-- 5.7 mi = 9.17 km. Independently corroborated by external sourcing
-- (Wenatcheeoutdoors.org's Witches Tower trip report describing ~8.0 mi
-- round trip to Colchuck Lake alone, i.e. 4.0 mi one-way, matching this
-- row's own Colchuck Lake waypoint exactly). No loop or alternate return
-- exists for this climb, so 24.14 km corresponds to no real feature of the
-- route. Corrected to the row's own waypoint-derived one-way distance.
UPDATE routes SET dist_km = 9.17
  WHERE id = 'wa_e_se_face'
  AND dist_km = 24.14;

-- =========================================================================
-- Dragontail Peak, Backbone Ridge -- wa_dragontail_peak_backbone_ridge
-- FINDING: dist_km stored 26.55 (km). Doubled by the app for a round-trip
-- display, that is 53.1 km = 33.0006 mi -- almost exactly a round-number
-- mile figure, the documented "half a round trip" dist_km tell CLAUDE.md
-- records for this column elsewhere in the catalog, and already flagged
-- (without a replacement value) by batch 187 (2026-09-03). This route's
-- own waypoints array carries no distMi at Trailhead/Summit (a malformed,
-- apparently templated set -- see flagged item below), so it cannot supply
-- a corrected figure internally. Externally: Guided Exposure's dedicated
-- route guide for this specific route ("A Route Guide: Dragontail Peak
-- Backbone Ridge") states plainly "This route is grade IV with a total of
-- 11 miles round trip," with the Stuart Lake Trailhead at "about 3,400 ft"
-- ascending to "6,400 ft" before the technical climbing begins -- both
-- consistent with this row's own gain_ft (5,440 ft = 8,840 - 3,400,
-- matching high_point_ft exactly) and with the well-documented Stuart Lake
-- Trailhead -> Colchuck Lake approach (Lake Stuart Trail 2.5 mi + Colchuck
-- Lake Trail 1.8 mi = 4.3 mi one-way to the lake, per WTA/Mountaineers.org,
-- matching this row's own "Water: Colchuck Lake" waypoint at distMi=4.3).
-- 11 mi round trip / 2 = 5.5 mi one-way = 8.85 km, consistent with this
-- family's other technical-line dist_km values (Gerber-Sink 6.4, Pandora's
-- Box 6.4, Triple Couloirs 6.9, corrected Hidden Couloir 10.1).
UPDATE routes SET dist_km = 8.85
  WHERE id = 'wa_dragontail_peak_backbone_ridge'
  AND dist_km = 26.55;
