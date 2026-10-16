-- WA alpine audit batch 389 (pass 7) — 2026-10-08
-- Review in the Supabase SQL Editor before running. Apply the BEGIN...COMMIT block only.

BEGIN;

-- wa_cathedral_rock_northeast_buttress: stored pitch count (7) does not match the
-- first-ascent party's own account. AAC Publications / American Alpine Journal 1985
-- ("Washington—Cascade Mountains, Cathedral Rock, Northeast Buttress", reported by
-- Gary Speer) states the route — Bellamy and Speer, III 5.7 — was climbed in eight
-- pitches, not seven. Grade and FA names themselves already match the AAJ report and
-- are left untouched.
UPDATE routes SET pitches = 8
WHERE id = 'wa_cathedral_rock_northeast_buttress' AND pitches = 7;

COMMIT;
