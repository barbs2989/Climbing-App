-- WA alpine audit — batch 249 (2026-09-09, pass 5)
-- Routes: wa_colfax_peak_kimchi_suicide_volcano, wa_colfax_peak_polish_route
-- (Colfax Peak), wa_colonial_peak_west_ridge (Colonial Peak),
-- wa_complete_south_buttress (Cutthroat Peak), wa_concord_tower_north_face
-- (Concord Tower), wa_copper_peak_south_route (Copper Peak),
-- wa_corteo_peak_southwest_ridge (Corteo Peak),
-- wa_crater_mountain_standard_route (Crater Mountain).
-- All WHERE clauses include the current (wrong) value, or a distinctive
-- prefix of it, as a safety check per project convention. Run
-- `npm run check:sql -- audits/sql/2026-09-09-batch-249.sql` before pasting
-- into the SQL Editor. New replacement text below avoids literal ";" and
-- "--" for the same reason batch 248 documents: the SQL Editor precheck's
-- naive line/statement splitter does not respect string-literal boundaries.

-- -------------------------------------------------------------------------
-- Colfax Peak (wa_colfax_peak) — wa_colfax_peak_kimchi_suicide_volcano
-- -------------------------------------------------------------------------

-- Same defect this audit fixed one batch ago (2026-09-09, batch 248) on this
-- route's sibling wa_colfax_peak_cosley_houston, and this route's own
-- sibling wa_colfax_peak_polish_route already carries the corrected text
-- (fixed in an earlier batch, access_checked_at 2026-08-27) -- this route
-- was simply missed at the time. All three share the same Heliotrope
-- Ridge/Glacier Creek Road (FS-39) approach. Confirmed via WebSearch
-- (Cascadia Daily News, "Glacier Creek Road reopens following washout
-- repairs," 2026-08-20; corroborated by USFS's own release and an
-- AllTrails/Snowater trip-report mention of the road being drivable, with
-- potholes, as of 2026-08-25) that the road reopened to vehicles on August
-- 20, 2026, three weeks before this audit and roughly a month after this
-- row's stale "as of July 2026" language was written. No evidence of a new
-- closure since.
UPDATE routes
SET access = jsonb_set(
  access, '{closures}',
  '"Glacier Creek Road (FS-39) has a history of washouts. December 2025 flood damage closed it to all vehicles at MP 3.0 (Glacier Creek bridge) from June 2026, and the Forest Service announced on 20 August 2026 that repairs are complete and the trailhead is drivable again — check current Mt. Baker-Snoqualmie NF alerts before driving."'
)
WHERE id = 'wa_colfax_peak_kimchi_suicide_volcano'
  AND access->>'closures' LIKE 'Glacier Creek Road (FS-39) closed to vehicles at mile 3 for washout repair as of July 2026%';

UPDATE routes
SET road = jsonb_set(
  road, '{status}',
  '"Gravel, seasonal, and historically washout-prone. December 2025 flood damage closed the road to all vehicles at the Glacier Creek bridge (MP 3.0) from June 2026, but the Forest Service announced on 20 August 2026 that repairs are complete and vehicles can again reach the Heliotrope Ridge trailhead. Check current MBS NF alerts before you drive."'
)
WHERE id = 'wa_colfax_peak_kimchi_suicide_volcano'
  AND road->>'status' = 'Closed to vehicles at mile 3 for washout repairs (as of July 2026)';

UPDATE routes
SET road = jsonb_set(
  road, '{driveNote}',
  '"From Glacier, WA on SR 542, turn onto Glacier Creek Road (FS-39) toward the Heliotrope Ridge trailhead (reopened 20 August 2026 after flood-damage repairs). Check current Mt. Baker-Snoqualmie NF alerts before driving."'
)
WHERE id = 'wa_colfax_peak_kimchi_suicide_volcano'
  AND road->>'driveNote' LIKE 'From Glacier, WA on SR 542, turn onto Glacier Creek Road (FS-39) toward the Heliotrope Ridge trailhead%due to the active closure.';

-- -------------------------------------------------------------------------
-- Copper Peak (wa_copper_peak) — wa_copper_peak_south_route
-- -------------------------------------------------------------------------

-- This row's own `corrections` field records an unresolved identity
-- ambiguity between two Washington peaks named Copper, and says it was
-- "treated as non-technical" like the Olympics Copper Mountain (Class 2-3)
-- -- but every other field on this row (overview, hazards, gear, gpx near
-- Holden Village/Railroad Creek, `lists`) already describes the glaciated
-- North Cascades/Entiat Copper Peak with roped Southeast Glacier travel and
-- Class 3-4 terrain, which contradicts that note. The area row itself
-- (id=wa_copper_peak) is unambiguously placed in the Entiat Mountains
-- (path usa.washington.wa_centraleast.wa_chiwawa_entiat_region.wa_copper_peak,
-- lat/lng 48.1745741/-120.803989), not the Olympics. Confirmed via WebSearch
-- (Wikipedia "Copper Peak (Washington)") that this peak's elevation is
-- exactly 8,965 ft -- matching this row's stored high_point_ft (8965) to
-- the foot -- in the Entiat Mountains, Chelan County, ranked 21st-highest
-- in WA / 19th on the Bulger List, which matches this row's own `lists`
-- field ("Washington Bulger List (100 Highest) - #19") and its Class 4-5
-- climbing (Wikipedia), consistent with this row's stored Class 3-4 grade.
-- The stale note is corrected to record that resolution rather than left
-- describing a decision the row's own content does not match.
UPDATE routes
SET corrections = 'Area coordinates (48.1745741, -120.803989, path usa.washington.wa_centraleast.wa_chiwawa_entiat_region.wa_copper_peak) and the content already on this row (Holden Village and Railroad Creek access, a roped Southeast Glacier crossing with crevasse hazard, Washington Bulger List #19) confirm this is the North Cascades (Entiat Mountains) Copper Peak, not the Olympics Copper Mountain the earlier note flagged as a possible match. high_point_ft (8965 ft) matches the published elevation for this peak exactly (Wikipedia: 8,965 ft, Entiat Mountains, Chelan County, ranked 19th on the Bulger List). The Class 3-4 grade with one exposed 4th-class step and glacier travel fits this identity. The earlier concern about matching a Class 2-3 non-technical peak does not apply here. Identity ambiguity resolved via WebSearch corroboration, 2026-09-09.'
WHERE id = 'wa_copper_peak_south_route'
  AND corrections LIKE 'Search results were ambiguous between multiple Washington peaks named %';

-- -------------------------------------------------------------------------
-- Crater Mountain (wa_crater_mountain) — wa_crater_mountain_standard_route
-- -------------------------------------------------------------------------

-- grade/grade_system/grade_num were all null while rock_grade already holds
-- the descriptive rating ("Class 3, with one short Class 4 move (exposed)")
-- -- so the header grade pill (which reads `grade`, not `rock_grade`) rendered
-- blank on a route that otherwise has a grade documented on file. Not
-- research: filled using the same compact "Class N-N" convention already
-- used on this dataset's other Class 3-4 scrambles on the same batch
-- (wa_colonial_peak_west_ridge: grade "Class 3-4 glacier + summit rock",
-- grade_system class, grade_num 3; wa_corteo_peak_southwest_ridge: grade
-- "Class 3-4", grade_system class, grade_num 3), reconciling this row's own
-- rock_grade content into the field the header actually renders, per
-- CLAUDE.md's rule that a grade column must hold a short grade rather than
-- an explanation -- the explanation stays in rock_grade/pitch_detail as-is.
UPDATE routes
SET grade = 'Class 3-4', grade_system = 'class', grade_num = 3
WHERE id = 'wa_crater_mountain_standard_route'
  AND grade IS NULL AND grade_system IS NULL AND grade_num IS NULL
  AND rock_grade LIKE 'Class 3, with one short Class 4 move%';
