-- WA alpine audit -- batch 171 (pass 3)
-- Routes: wa_the_monk_le_gibet, wa_the_monk_odine, wa_the_monk_scabo,
-- wa_the_monk_west_cracks_left_crack, wa_the_monk_west_cracks_right_crack,
-- wa_the_needle_neve_glacier, wa_the_pleiades_scramble,
-- wa_the_pyramid_picket_south_route.
-- WHERE clauses include the current (wrong) value as a safety check per
-- project convention, so this is a no-op if the row has already changed.

-- =========================================================================
-- The Monk (Cathedral Peak, Pasayten) -- Odine, wa_the_monk_odine
-- =========================================================================

-- This row's own `grade` (5.9) and `pitch_detail` (crux pitch marked "5.9
-- (crux)") already reflect the correct grade -- its own `corrections` field
-- records that Mountain Project lists 5.9, "not 5.8 as given in the route
-- table," which reads as though that discrepancy is still live. It is not:
-- `grade` already says 5.9. Two things were left stale when the grade was
-- corrected upstream: the `watch_out` text still opens "5.8 route in The
-- Monk complex," and the `corrections` note still describes the discrepancy
-- as unresolved rather than as fixed. Both are internal-consistency fixes
-- (the row already states the correct grade in two other fields); no new
-- external research was needed to make watch_out and corrections agree
-- with grade/pitch_detail.
UPDATE routes
SET watch_out = '"5.9 route in The Monk complex\nWeather exposure on extended climbing\nRoute-finding through multi-pitch terrain\nLoose rock hazard in mixed sections\nDescent rappel sequences"'::jsonb
WHERE id = 'wa_the_monk_odine'
  AND watch_out = '"5.8 route in The Monk complex\nWeather exposure on extended climbing\nRoute-finding through multi-pitch terrain\nLoose rock hazard in mixed sections\nDescent rappel sequences"'::jsonb;

UPDATE routes
SET corrections = 'Grade corrected to 5.9 per Mountain Project (was previously stored as 5.8), and watch_out text updated to match. No pitch count or rack published specifically for this line beyond the pitch_detail on file, so gear remains inferred from sibling Monk routes on the same formation.'
WHERE id = 'wa_the_monk_odine'
  AND corrections = 'Mountain Project lists this route at 5.9, not 5.8 as given in the route table — flagging for correction upstream.';

-- verify: watch_out should now read "5.9 route...", corrections should
-- describe the fix as applied rather than pending
SELECT id, grade, watch_out, corrections FROM routes WHERE id = 'wa_the_monk_odine';
