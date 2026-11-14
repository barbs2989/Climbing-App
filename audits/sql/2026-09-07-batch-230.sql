-- WA alpine audit — batch 230 (pass 4)
--
-- wa_south_headwall (Mount Stuart, South Headwall): stored `grade`/`rock_grade` were both
-- "5.8", but the row's OWN `pitch_detail` field already breaks the route down as "Lower
-- headwall: 4th/low 5th" plus "Crux sections (x2): 5.7" — nothing in the row's own
-- pitch-by-pitch data reaches 5.8. Independently corroborated by Mountain Project's route
-- description for this exact route ("two 20- or 30-foot sections of 5.7 ... lots of 4th
-- Class and low 5th Class terrain spread across 4 or 5 technical pitches"), which matches
-- the stored pitch_detail almost verbatim. This resolves the 5.7-vs-5.8 question flagged
-- (but not fixed) in batch 166 — that flag cited only the external MP source; the row's own
-- internal pitch breakdown is the stronger, decisive argument. grade_num updated from 8 to 7
-- to match (plain integer-after-"5." convention already used elsewhere in this column for
-- un-suffixed YDS grades).
UPDATE routes SET grade = '5.7', rock_grade = '5.7', grade_num = 7 WHERE id = 'wa_south_headwall';

-- wa_south_face_5 (Inspiration Peak, South Face): re-proposing batch 166's fix, which does
-- not appear to have been applied yet — the live row still carries the self-hedged fa
-- ("June 18 (year unconfirmed — likely 1969, not independently corroborated)") rather than
-- the resolved value. Re-confirmed this run: two independent secondary sources (Wikipedia's
-- Inspiration Peak article; an aggregated Mountain Project/SummitPost route-guide result)
-- both give 1969 for Michael Heath and Bill Sumner's South Face first ascent. Day/month
-- (June 18) unchanged.
UPDATE routes SET fa = 'Bill Sumner and Mike Heath, June 18, 1969' WHERE id = 'wa_south_face_5';
