-- WA alpine audit -- batch 181 (2026-09-03, pass 4)
-- Routes: wa_booker_mountain_northeast_face, wa_boston_peak_southeast_face,
-- wa_boving_christensen, wa_boving_roofs, wa_buckner_mountain_north_face,
-- wa_buckner_mountain_southwest_face, wa_burgundy_spire_north_face,
-- wa_burnt_boot_peak_north_ridge.
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention. Apply each UPDATE individually rather than
-- pasting the whole file at once.

-- =========================================================================
-- Buckner Mountain, North Face -- wa_buckner_mountain_north_face
-- =========================================================================

-- The header `season` field says "Jul-Sep", directly contradicting this
-- same row's own `best_season` ("Late May through early July") and its own
-- `seasonal_guidance.optimalWindow` ("Late May through early July, per
-- existing best_season, with June generally offering the best balance of
-- ice quality and access"). The route's own monthBreakdown only rates
-- May/June/July at all -- July is already marked "marginal" as the face
-- "bares out" -- and says nothing about August or September being
-- climbable. External sources corroborate the row's own best_season/
-- seasonal_guidance rather than the stale header value: this is a
-- snow/ice route on the Boston Glacier's north-facing slope that melts
-- out fast, with spring/early-summer widely described as the season for
-- ice climbing here (ice quality degrades rapidly through June-July, and
-- one May-August account describes the route "bar[ing] out" by
-- mid-summer). Corrected to match the row's own well-documented, sourced
-- window rather than what reads as an un-customized default carried over
-- from other routes on this peak (e.g. the Southwest Face, whose "Jul-Sep"
-- header genuinely does match its own Jul-Sep best_season).
UPDATE routes SET season = 'May-Jul'
WHERE id = 'wa_buckner_mountain_north_face'
  AND season = 'Jul-Sep'
  AND best_season = 'Late May through early July';
