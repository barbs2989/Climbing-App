-- Rappel-count corrections 2/2 — rows whose own note already settles the disagreement.
-- 2026-08-09. Run `npm run check:sql -- audits/2026-08-09-rappel-counts-2-self-adjudicated.sql` first.
--
-- Since #687 the stated count and the rappel table render on the SAME screen, so where they
-- disagree the contradiction is visible to the climber. 23 routes are in that state
-- (scripts/oneoff/audit-rappel-count-conflicts.mjs).
--
-- For these three the rappel_count_note written when the table was built already says which
-- side is right, so aligning the summary to the table is bookkeeping, not a new claim. The
-- other 20 are deliberately NOT here: each needs its own source, and they are listed by
-- scripts/oneoff/rappel-conflict-triage.mjs.

-- note: "Corroborated by the SpokAlpine trip report (3 West Ridge rappels + 7 Cat Scratch
-- Gully rappels = 10 total, matching the most commonly cited figures...)"
UPDATE routes SET rappels = '10' WHERE id = 'wa_mount_torment_torment_forbidden_traverse' AND rappels IS DISTINCT FROM '10';

-- note: "Rappel count of 3 with a 60m rope is corroborated..."
UPDATE routes SET rappels = '3' WHERE id = 'wa_concord_tower_north_face' AND rappels IS DISTINCT FROM '3';

-- note: "...gives no rappel-by-rappel breakdown. A count of 3 is..."
UPDATE routes SET rappels = '3' WHERE id = 'wa_south_ridge' AND rappels IS DISTINCT FROM '3';
