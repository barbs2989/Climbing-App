-- WA alpine audit batch 388 (pass 7) — 2026-10-08
-- Review in the Supabase SQL Editor before running. Apply the BEGIN...COMMIT block only.

BEGIN;

-- wa_cathedral_peak_pasayten_se_buttress: stored grade (5.10a) is an outlier against
-- four independent sources found this pass (Wikipedia, a Steph Abegg trip report,
-- lemkeclimbs.com, chossclimbers.com) which all agree on 5.9 (9-10 pitches). The route's
-- own gear field already distinguishes a "5.10a link-pitch bypass" from the standard
-- line avoiding the original P9 offwidth — the 5.10a figure most likely describes that
-- bypass pitch, not the route as a whole. The route's own data_quality.gaps note had
-- already flagged "5.7-5.9 in most trip reports vs III 5.10a in one recent source" as
-- an unresolved discrepancy; this pass resolves it toward the 5.9 consensus.
UPDATE routes SET grade = '5.9', grade_num = 9
WHERE id = 'wa_cathedral_peak_pasayten_se_buttress' AND grade = '5.10a';

COMMIT;
