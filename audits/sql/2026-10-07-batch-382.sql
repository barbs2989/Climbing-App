-- WA alpine/mountaineering audit -- batch 382 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_baring_mountain_east_face, wa_baring_mountain_oatmeal_man, wa_baring_mountain_r1,
--         wa_bear_mountain_chilliwack_north_buttress, wa_bears_breast_mountain_infinite_beauty,
--         wa_bears_breast_mountain_southwest_face, wa_bears_breast_mountain_timeless_treasure,
--         wa_beckey_davis
-- All values below were re-read from the live DB immediately before this file was written;
-- each UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.
--
-- Tooling note: `npm run check:sql` warns "no literal id predicate found" on the UPDATE
-- below -- its statement splitter is semicolon-naive and the text being patched itself
-- contains a semicolon ("routefinding; retreat"), which splits the statement before the
-- splitter ever reaches the WHERE clause. That is a blind spot in the checker, not a
-- defect in this statement: the target id (wa_baring_mountain_r1) was confirmed live via
-- `routes?select=id&area_id=eq.wa_main_peak_3` immediately before writing this file, and
-- the WHERE guard's old-value string was copied verbatim from a fresh read of
-- `seasonal_hazards->>'exposure'` on that same row, so an exact-match no-op is not a risk
-- here the way a mistyped id would be.

BEGIN;

-- =========================================================================
-- Baring Mountain, North Face (wa_baring_mountain_r1) -- fatality year typo
-- =========================================================================
-- seasonal_hazards.exposure cites "a 1951 fatality during an early attempt." This route's
-- own partner_requirements.experienceLevel field already states the correct year, 1952, and
-- sibling route wa_baring_mountain_oatmeal_man's watch_out text also says 1952 ("a climber
-- fell to his death there in 1952 during the north-face attempts"). Per AAC Publications'
-- "The North Face of Mount Baring," the fatality was Richard Berge, who died in a 1952
-- retreat-in-storm fall after caching supplies; 1951 was the year of an earlier, non-fatal
-- Schoening/Berge attempt, which this field appears to have conflated with the fatal one.
UPDATE routes SET seasonal_hazards = jsonb_set(
  seasonal_hazards,
  '{exposure}',
  '"Extreme - a roughly 3,000-foot committing wall with serious rockfall, loose and vegetated rock, and difficult routefinding; retreat is difficult and rescue in this position would be a major undertaking (the route''s approach history includes a 1952 fatality during an early attempt)"'
)
WHERE id = 'wa_baring_mountain_r1'
  AND seasonal_hazards ->> 'exposure' = 'Extreme - a roughly 3,000-foot committing wall with serious rockfall, loose and vegetated rock, and difficult routefinding; retreat is difficult and rescue in this position would be a major undertaking (the route''s approach history includes a 1951 fatality during an early attempt)';

COMMIT;

-- =========================================================================
-- Flagged for human review (no SQL -- genuinely unresolved, not guessed):
-- =========================================================================
-- wa_bears_breast_mountain_southwest_face -- grade stored as 5.6 (rock_grade, grade, and the
--   pitch_detail breakdown all say 5.6), but independent search snippets (Wikipedia's Bears
--   Breast Mountain article, repeated verbatim across several queries) call the Southwest
--   Face class 5.4, "the easiest route" on the peak. Could be a guidebook-overall-grade vs.
--   hardest-pitch convention rather than an error -- needs a check against Beckey's Cascade
--   Alpine Guide directly before touching it.
-- wa_bears_breast_mountain_infinite_beauty / wa_bears_breast_mountain_timeless_treasure --
--   both rows' access.closures cite a specific Okanogan-Wenatchee closure order number
--   ("06-17-03-2026-44", "Three Queens Fire," effective 2026-09-18 to 2026-10-31). Plausible
--   and currently within its stated window (today is 2026-10-07), but the specific order
--   number could not be independently located via search -- not contradicted, just
--   unverifiable with the tools available this run. Needs someone with live USFS access to
--   confirm the order is real before this is trusted as-is for an active closure.
