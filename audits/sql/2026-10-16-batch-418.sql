-- Batch 418 (Pass 7) -- Lichtenberg Mountain (Southeast Ridge, West Face, West Face/West Rib),
-- Lincoln Peak (Wilkes-Booth NW Face, X Couloir/Standard), Little Annapurna (Boola Boola
-- Buttress, Northeast Face, Northwest Buttress).
-- Run `npm run check:sql -- fix.sql` against this file before applying, per
-- docs/codebase/hand-written-sql.md.

-- 1. wa_lichtenberg_mountain_west_face: grade/grade_num store '5.9+'/9, and the `overview` field
-- repeats "Reported at 5.9+". But the only documented ascent of this face -- Alex Bertulis'
-- AAC Publications account (1995 American Alpine Journal) of climbing it with his son Nik when it
-- was "previously unclimbed" -- rates it (II, 5.8), with a 5.7 friction slab on pitch one and a
-- 5.8 overhanging move on pitch three as the crux. No source found gives 5.9 for this face; the
-- SummitPost overview of the mountain's three established routes (SW gully scramble, NE ridge
-- winter route, west face) names no harder variant. Corrects grade, grade_num and the `overview`
-- string to match the FA party's own published rating.
UPDATE routes
SET grade = '5.8',
    grade_num = 8,
    overview = replace(overview, 'Reported at 5.9+ and reached', 'Reported at 5.8 and reached')
WHERE id = 'wa_lichtenberg_mountain_west_face'
  AND grade = '5.9+'
  AND grade_num = 9;

-- Note: the route's `name` field, "West Face (5.9+ rock route)", also embeds the old grade.
-- Left untouched here since `name` is route identity, not a researched fact, and a rename is a
-- bigger change than this audit's scope -- flagged in the log for a human to rename alongside
-- this grade fix if they agree.

-- Nothing else in this batch needed a fix: wa_lichtenberg_mountain_southeast_ridge and
-- wa_lichtenberg_mountain_west_face_west_rib's FA/descent prose both checked out exactly against
-- Jim Brisbine's trip reports (Sept 20-21, 1975 and Oct 21, 1978 respectively); both Lincoln Peak
-- routes' `fa` fields matched independent sources; and the three Little Annapurna routes carry too
-- little stored data (no fa/approach/descent, two with a bare grade) to contradict -- see the log
-- for the one open question (Boola Boola Buttress's area filing) flagged for human review instead
-- of a write.
