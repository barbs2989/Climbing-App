-- WA Alpine Audit — Pass 1, Batch 19 — 2026-07-30
-- Peaks: Liberty Bell Mountain (Northwest Face, Serpentine Crack, Thin Red Line,
--        Liberty Crack, Liberty Crack (Free)), Liberty Cap / Mount Rainier
--        (Liberty Ridge finish, Ptarmigan Ridge finish), Lichtenberg Mountain
--        (West Face - West Rib)

-- =========================================================================
-- Liberty Bell Mountain — Northwest Face
-- =========================================================================

-- wa_liberty_bell_nw_face: alpine_grade stored "III", which is just a copy of this
-- row's own commitment field (also "III") -- a Roman-numeral NCCS commitment grade,
-- not a French adjectival grade. Per supabase/migrations/0006_composite_grades.sql,
-- alpine_grade is specifically defined as "French adjectival F/PD/AD/D/TD/ED", a
-- distinct facet from commitment. This is the same bug pattern already fixed on
-- wa_dragontail_peak_triple_couloirs (batch 9): a commitment-grade value leaking into
-- the adjectival column. Every other rock route on this same peak (Overexposure,
-- Serpentine Crack, Thin Red Line, Liberty Crack) already carries a correctly-typed
-- alpine_grade of 'D' -- aligned this row to match its own siblings' convention.
UPDATE routes SET alpine_grade = 'D' WHERE id = 'wa_liberty_bell_nw_face';

-- =========================================================================
-- Liberty Bell Mountain — Serpentine Crack
-- =========================================================================

-- wa_liberty_bell_serpentine_crack: waypoints[0].note read "Reused coordinate from
-- this session's own Liberty Bell area research (same real trailhead)." -- a leaked
-- meta-comment from whatever process generated this row's data, not real route
-- content (compare wa_liberty_bell_nw_face/overexposure/thin_red_line/liberty_crack,
-- whose waypoint #0 is the identical Blue Lake Trailhead point with the actual
-- descriptive note). Replaced with the same wording already used for this exact
-- trailhead on this route's own siblings.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,note}',
  '"Signed pullout on SR-20 about 1.5 mi west of Washington Pass; Northwest Forest Pass required, privy at the lot."'::jsonb, false)
WHERE id = 'wa_liberty_bell_serpentine_crack';

-- =========================================================================
-- Liberty Bell Mountain — Thin Red Line
-- =========================================================================

-- wa_liberty_bell_thin_red_line: fa credited only "FFA Mikey Schaefer, 2008" for the
-- free ascent, dropping Kate Rutherford -- who this row's own overview text already
-- names ("first freed by Kate Rutherford and Mikey Schaefer in September 2008, at
-- 5.12c"). Confirmed via Climbing.com's FA account: the free ascent (5.12c,
-- Sept 15, 2008) was a Rutherford/Schaefer team ascent, not a Schaefer solo credit.
UPDATE routes SET fa = 'Jim Madsen & Kim Schmitz, 1967 (aid, A3); FFA Kate Rutherford & Mikey Schaefer, September 2008 (5.12c)'
WHERE id = 'wa_liberty_bell_thin_red_line';

-- =========================================================================
-- Liberty Bell Mountain — Liberty Crack
-- =========================================================================

-- wa_liberty_crack: waypoints[1] (Liberty Bell Mountain summit) elevFt read 7746 --
-- the sole outlier against this route's own parent area row (elevation_ft 7720,
-- whose blurb explicitly identifies "7,745-7,750" as an older, superseded USGS-derived
-- figure) and against all five other Liberty Bell routes audited this same batch
-- (nw_face, overexposure, serpentine_crack, thin_red_line, liberty_traverse), every one
-- of which already stores the summit at 7720.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '7720', false)
WHERE id = 'wa_liberty_crack';

-- =========================================================================
-- Liberty Bell Mountain — Liberty Crack (Free)
-- =========================================================================

-- wa_liberty_crack_free: fa dated the fully-free bolt-ladder-bypass variation
-- (Schaefer/Lee/Herrington/Hadley) to 2017. Blake Herrington's own trip-report blog
-- post documenting this ascent is dated July 1, 2016, and a CascadeClimbers.com trip
-- report titles the same ascent "6/28/2016" -- both place the actual climb in June/
-- July 2016, not 2017. (This row's own overview already hedges "2016-2017"; the
-- structured fa field had picked the wrong single year.)
UPDATE routes SET fa = 'Original FFA: Brooke Sandahl, 1991 (of the 1965 Marts/McPherson/Stanley aid line); current free variation FFA: Mikey Schaefer, Shanjean Lee, Blake Herrington & Nathan Hadley, 2016'
WHERE id = 'wa_liberty_crack_free';

-- =========================================================================
-- Liberty Cap (Mount Rainier) — via Liberty Ridge
-- =========================================================================

-- wa_liberty_cap_liberty_ridge_finish: fa misspelled the third climber's surname as
-- "Jim Burrow" -- this row's own overview text already spells it correctly ("Ome
-- Daiber, Arnie Campbell, and Jim Borrow"), and the AAC's own publication title for
-- the FA account ("The First Ascent of Mt. Ranier by Way of Liberty Ridge on Willis
-- Wall (September 28 - October 1, 1935)") corroborates both the spelling and the date
-- range already stored.
UPDATE routes SET fa = 'Ome Daiber, Arnie Campbell, and Jim Borrow, Sept 28-Oct 1, 1935'
WHERE id = 'wa_liberty_cap_liberty_ridge_finish';

-- wa_liberty_cap_liberty_ridge_finish: overview cited Liberty Cap at "14,112 ft" and
-- named Columbia Crest, at "14,411 ft", as the mountain's "true high point" -- both
-- stale. This route's own parent area row already carries the correct, recently
-- researched figure (elevation_ft 14097; blurb cites an Aug 2025 GPS survey at
-- ~14,095 ft). Separately, Columbia Crest has not been Rainier's true high point since
-- around 2014: a GPS survey conducted Aug 28, 2024 (widely reported -- Seattle Met,
-- Seattle Times, Newsweek, GPS World) found the crater's southwest rim, ~440 ft south
-- of Columbia Crest, now stands higher (~14,400 ft) than the thinning Columbia Crest
-- icecap (~14,389 ft). Updated the overview to match this route's own area data and
-- the 2024 resurvey rather than leave a superseded "true summit" claim.
UPDATE routes SET overview = 'Liberty Ridge is the sharp buttress splitting Rainier''s glaciated north face — the Liberty Wall to climber''s left, the infamous Willis Wall to the right — and is widely regarded as the most striking, and most dangerous, of the mountain''s standard routes. First climbed in 1935 by Ome Daiber, Arnie Campbell, and Jim Borrow, it gains roughly 7,000 vertical feet of sustained 30-60° snow and ice from the Carbon Glacier to the summit plateau and is one of Steck & Roper''s ''50 Classic Climbs of North America.'' It tops out on Liberty Cap (14,097 ft; an August 2025 GPS survey puts it closer to 14,095 ft as the summit icecap keeps thinning), the northernmost of Rainier''s three summit points. Columbia Crest, long treated as the mountain''s true high point, has itself been overtaken: a GPS survey on August 28, 2024 found a rockier point on the crater''s southwest rim now stands higher (~14,400 ft) than the faster-thinning Columbia Crest icecap (~14,389 ft).'
WHERE id = 'wa_liberty_cap_liberty_ridge_finish';

-- =========================================================================
-- Liberty Cap (Mount Rainier) — via Ptarmigan Ridge
-- =========================================================================

-- wa_liberty_cap_ptarmigan_ridge_finish: top-level grade was NULL despite this row's
-- own alpine_grade ('IV'), rock_grade ('5.6'), and ice_grade ('AI2-3') all already
-- being populated (and grade_num=6 already matching the rock_grade digit) -- same
-- "fill the top-level grade from the row's own verified sub-fields" pattern as
-- batch 6 (Kimchi Suicide Volcano) and batch 10 (Thread of Ice).
UPDATE routes SET grade = 'Grade IV, 5.6, AI2-3'
WHERE id = 'wa_liberty_cap_ptarmigan_ridge_finish';

-- wa_liberty_cap_ptarmigan_ridge_finish: waypoints[0] (Liberty Cap) elevFt read 14112,
-- the same stale legacy figure fixed above on the Liberty Ridge route -- corrected to
-- match this route's own parent area row (elevation_ft 14097).
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elevFt}', '14097', false)
WHERE id = 'wa_liberty_cap_ptarmigan_ridge_finish';

-- wa_liberty_cap_ptarmigan_ridge_finish: waypoints[1] labeled Columbia Crest "Mount
-- Rainier true summit" at elevFt 14409 -- same superseded claim fixed in the Liberty
-- Ridge route's overview above (GPS survey, Aug 28, 2024: southwest rim ~14,400 ft now
-- exceeds Columbia Crest's thinning ~14,389 ft). Relabeled and updated the elevation.
UPDATE routes SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{1,name}', '"Columbia Crest (historic high point; overtaken by the crater''s southwest rim per an Aug. 2024 GPS survey as the icecap thins)"'::jsonb, false),
  '{1,elevFt}', '14389', false)
WHERE id = 'wa_liberty_cap_ptarmigan_ridge_finish';

-- =========================================================================
-- NOT fixed here (flagged for human review only — see audit log for detail):
--  - wa_liberty_cap_liberty_ridge_finish / wa_liberty_cap_ptarmigan_ridge_finish:
--    alpine_grade stores 'IV' on both routes -- the same commitment-grade-in-the-
--    wrong-column bug fixed above on wa_liberty_bell_nw_face, per
--    migrations/0006_composite_grades.sql's "French adjectival" definition. Unlike
--    nw_face, Liberty Cap has only these two routes (route_count: 2 on the area row)
--    and both share the identical bug, so there is no correctly-typed in-DB sibling
--    to copy from. This run's sources (International Mountain Guides, Mountaineers.org,
--    SummitPost) describe Liberty Ridge as "Grade V" (commitment) but none states a
--    French adjectival rating -- needs a human with a guidebook (e.g. Nelson/
--    Potterfield Selected Climbs) to supply the correct D/TD-class value rather than
--    a guess.
--  - wa_liberty_bell_nw_face: fa (Hans Kraus & John Rupley, 1956; free FA Sandy Bill,
--    Ron Burgner, Ian Martin & Frank Tarver, 1966) could be neither corroborated nor
--    contradicted by this run's sources (Mountaineers.org/SummitPost/SuperTopo pages
--    found describe the route but not its FA history) -- left as-is.
--  - wa_liberty_traverse: fa is 'unknown'; the route's summit order (Liberty Bell ->
--    Concord Tower -> Lexington Tower -> North Early Winters Spire -> South Early
--    Winters Spire) matches the Liberty Bell Group's documented NW-to-SE layout
--    (SummitPost/Mountain Project), but no dedicated source was found to confirm the
--    specific 26-pitch count or 5.9 overall grade for a single continuous traverse --
--    left as-is pending a human with a specific trip report/guidebook entry.
--  - wa_lichtenberg_mountain_west_face_west_rib: this row already self-describes as
--    sparsely documented ("almost no modern trip-report or grade documentation
--    exists"); this run found nothing online to confirm or refute any of its fields,
--    consistent with that self-assessment -- no action.
-- =========================================================================

-- Verify afterward:
SELECT id, alpine_grade FROM routes WHERE id = 'wa_liberty_bell_nw_face';

SELECT id, waypoints->0->>'note' AS wp0_note FROM routes WHERE id = 'wa_liberty_bell_serpentine_crack';

SELECT id, fa FROM routes WHERE id IN ('wa_liberty_bell_thin_red_line', 'wa_liberty_crack_free', 'wa_liberty_cap_liberty_ridge_finish');

SELECT id, waypoints->1->>'elevFt' AS summit_elevft FROM routes WHERE id = 'wa_liberty_crack';

SELECT id, overview FROM routes WHERE id = 'wa_liberty_cap_liberty_ridge_finish';

SELECT id, grade, waypoints FROM routes WHERE id = 'wa_liberty_cap_ptarmigan_ridge_finish';
