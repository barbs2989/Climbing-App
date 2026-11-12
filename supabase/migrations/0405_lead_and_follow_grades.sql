-- LEAD vs FOLLOW grades (competitor review Batch C item 20, owner 2026-11-04).
--
-- Mountain Project's partner finder asks per discipline "Lead 5.7 / Follow 5.9". Ours stored ONE
-- grade per discipline (sport_grade / trad_grade / boulder_grade, and climb_grades.<k>.grade for
-- ice, mixed and aid) with a role beside it — "lead" or "follow only" at that grade (0237). For
-- partner matching the question that matters is "can they lead the crux pitch", and a single grade
-- with a flag cannot say "leads 5.9, follows 5.11a".
--
-- No new column: climb_grades is jsonb. Each roped discipline's entry gains `lead` — the hardest
-- grade the climber LEADS — beside `grade` (ice/mixed/aid) or the discipline's own column (sport,
-- trad), which stays the hardest grade they climb at all, roped either way (what they FOLLOW up to).
-- `role` is still written ("lead" when a lead grade is set, else "follow" when only a top grade is)
-- so every reader of it keeps working, and an old row with role = 'lead' and no `lead` key reads as
-- leading its top grade — which is what that row said.
--
-- Nothing here to backfill: the app derives the old shape, and NULL still means "not asked yet".

begin;

comment on column public.profiles.climb_grades is
  'Per-discipline extras beside sport_grade/trad_grade/boulder_grade: {"sport":{"role":"lead","lead":"5.9"},"ice":{"grade":"WI4","lead":"WI3","role":"lead"},...}. '
  'grade is the hardest climbed (set only for ice, mixed and aid; sport/trad/boulder keep their columns); lead (0405) is the hardest LED, roped disciplines only; '
  'role is lead or follow and mirrors whether a lead grade is set. NULL = not asked yet.';

commit;
