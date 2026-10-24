-- WA alpine audit -- batch 322 (pass 6)
-- Routes checked: wa_elephant_butte_standard_route, wa_elephant_head_standard,
-- wa_energizer_bunny, wa_fire_on_the_mountain, wa_fish_whistle,
-- wa_flora_mountain_southwest_slope, wa_flycatcher_buttress,
-- wa_forbidden_peak_east_ridge

-- =========================================================================
-- Fire on the Mountain, Sloan Peak -- wa_fire_on_the_mountain
-- =========================================================================
-- The stored `pitches` (8) contradicts FIVE other records that all agree on
-- SEVEN: this row's own 7-entry `pitch_detail` array (pitches 1-7, each with
-- real climbing description -- not a stub), its own `overview` ("Fire on the
-- Mountain climbs 7 pitches..."), its own `rope_note` ("7 pitches of 5.10d
-- rock... plus ~500ft of 4th/low-5th scrambling"), and two independent
-- external sources confirmed via WebSearch this run: The Mountaineers'
-- route page and Steph Abegg's FA trip report (stephabegg.com), both of
-- which describe this as a seven-pitch route. Only the `pitches` column and
-- the `beta` text ("...across 8 pitches...") say 8, and the row's own
-- `data_quality.gaps` had already flagged the 7-vs-8 discrepancy as an open
-- question ("likely minor route-finding/pitch-splitting variance") without
-- resolving it. Given the pitch-by-pitch breakdown the row itself stores
-- only goes to 7, and every external source agrees, corrected `pitches` and
-- `beta` to 7 and resolved the now-answered gap.
--
-- Also independently re-confirmed via WebSearch this run (Mountaineers, AAC
-- Publications, Steph Abegg, Mountain Project, Wikipedia all agree): FA was
-- Blake Herrington & Rad Roberts, 2009 -- already correct on this row, and
-- the "First-ascent history not confirmed" gap is stale now that it has
-- been confirmed from multiple independent sources; removed.
UPDATE routes SET
  pitches = 7,
  beta = replace(beta, 'across 8 pitches', 'across 7 pitches'),
  data_quality = jsonb_set(
    data_quality,
    '{gaps}',
    '["No public GPS track found for this route as of this research pass.", "Difficulty breakdown (physical/technical/exposure/commitment/routefinding) is a computed starting estimate derived from grade, pitch count, and route data on file -- not a researched or crowd-sourced rating. Users can blend in their own read via the UI."]'::jsonb
  )
  WHERE id = 'wa_fire_on_the_mountain'
    AND pitches = 8
    AND beta LIKE '%across 8 pitches%'
    AND jsonb_array_length(data_quality->'gaps') = 4
    AND data_quality->'gaps'->>0 = 'First-ascent history not confirmed'
    AND data_quality->'gaps'->>1 LIKE 'Some sources cite 8 pitches%';

-- =========================================================================
-- Forbidden Peak, East Ridge Direct -- wa_forbidden_peak_east_ridge
-- =========================================================================
-- This row's own `corrections` field (written 2026-07-29) says the sibling
-- duplicate row `wa_forbidden_peak_east_ridge_direct` "is a duplicate of
-- this one, flagged for deletion," and `data_quality.gaps` separately says
-- this entry "is very likely the same route as wa_east_ridge_direct under a
-- different record; the two catalog entries should probably be reconciled/
-- deduplicated." Confirmed live this run (2026-09-23): NEITHER
-- wa_forbidden_peak_east_ridge_direct NOR wa_east_ridge_direct exists in
-- `routes` any more, and `wa_forbidden_peak` has exactly one east-ridge
-- route (this one). The duplicate has already been removed -- presumably
-- by an intervening maintenance/audit pass -- but these two metadata fields
-- were never updated to say so, leaving a stale "still needs dedup" flag on
-- a row where the dedup is already done. Updated both to record that the
-- fact they describe (no duplicate remains) is independently true.
--
-- Guarded by a NOT EXISTS check against both possible duplicate ids and
-- against any other Forbidden Peak route matching an east-ridge name, so
-- this can only apply once the claim it makes is actually verified true at
-- UPDATE time.
UPDATE routes SET
  corrections = 'Renamed from "East Ridge" 2026-07-29: this row own overview opens "This is Forbidden East Ridge Direct" and its own data_quality field states no separate, easier non-direct East Ridge route on Forbidden could be verified. The thin sibling row wa_forbidden_peak_east_ridge_direct (same FA party, grade, pitch count) was a duplicate of this one, flagged for deletion at that time. RESOLVED (2026-09-23 audit): confirmed live that the duplicate row no longer exists and wa_forbidden_peak now has exactly one east-ridge route (this one) -- dedup is complete. Note the id slug retains the old name -- same documented id/content mismatch family as wa_big_kangaroo_southwest_rib.',
  data_quality = jsonb_set(
    data_quality,
    '{gaps}',
    '["GPS track sourced from public CalTopo map: https://caltopo.com/m/QT10", "Difficulty breakdown (physical/technical/exposure/commitment/routefinding) is a computed starting estimate derived from grade, pitch count, and route data on file -- not a researched or crowd-sourced rating. Users can blend in their own read via the UI."]'::jsonb
  )
  WHERE id = 'wa_forbidden_peak_east_ridge'
    AND corrections LIKE '%flagged for deletion%'
    AND jsonb_array_length(data_quality->'gaps') = 3
    AND data_quality->'gaps'->>0 LIKE 'Every current source%'
    AND data_quality->'gaps'->>1 LIKE 'GPS track sourced%'
    AND NOT EXISTS (
      SELECT 1 FROM routes
      WHERE id = 'wa_forbidden_peak_east_ridge_direct' OR id = 'wa_east_ridge_direct'
    )
    AND NOT EXISTS (
      SELECT 1 FROM routes
      WHERE area_id = 'wa_forbidden_peak'
        AND id <> 'wa_forbidden_peak_east_ridge'
        AND name ILIKE '%east%ridge%'
    );
