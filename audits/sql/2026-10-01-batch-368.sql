-- WA alpine/mountaineering audit -- batch 368 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_south_headwall, wa_south_rib, wa_south_ridge_2, wa_south_ridge_4,
--         wa_south_twin_sister_north_ridge, wa_south_twin_sister_scramble,
--         wa_southeast_face, wa_southeast_mox_peak_se_rib,
--         wa_southeast_ridge_se_corner, wa_southern_man
-- Every UPDATE is guarded on the value read live just before this file was written.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- wa_south_twin_sister_north_ridge (South Twin Sister, North Ridge): grade_system is
-- stored as 'yds' but the route's own grade string is "Grade III, Class 4" -- a
-- class-system grade, not YDS -- and its discipline ("mountaineering") maps to
-- "class" via gradeSystemFor()/the live routeGradeSystem() in ClimbMatchCore.jsx.
-- routeGradeSystem(r) only falls back to the discipline-derived system when the
-- stored column is EMPTY; because it holds a wrong non-null "yds" here, it wins
-- over the correct derivation. passesFilters() (ClimbMatchCore.jsx:398) then uses
-- that value to gate the grade-band filter: a YDS-band filter (e.g. "5.9") will
-- match this row (routeSys===sys="yds", and since the grade string never matches a
-- 5.x pattern routeBandIdx returns -1, which skips the range check entirely and lets
-- the row through), while a Class-band filter correctly scoped to this route
-- (routeSys would need to be "class") is excluded instead. Sibling row
-- wa_south_twin_sister_scramble on the SAME peak stores no grade_system at all
-- (null) and falls through to the correct "class" derivation -- confirming this
-- row's non-null "yds" is the outlier, not the norm for this peak.
UPDATE routes SET grade_system = 'class'
WHERE id = 'wa_south_twin_sister_north_ridge'
  AND grade = 'Grade III, Class 4' AND grade_system = 'yds';

-- wa_southern_man (South Early Winters Spire): fa names the first-free-ascent
-- partner as "Blake Matthews". Every independent source that names him --
-- SuperTopo's own route page/narrative, CascadeClimbers.com trip reports, and a
-- cross-check against Mountain Project's "B. Matthews" credit -- calls him "Bobby
-- Mathews", never "Blake". ("Blake Herrington" is a different, separately
-- well-known Cascades climber active in the same era; plausible source of the
-- mix-up.) Corrects only the first name; the aid/free-ascent structure, the 2008
-- aid-FA party, and "Matthews" surname spelling are unchanged. NOT touching the
-- free-ascent YEAR: SuperTopo's narrative places it in September 2009, while
-- Mountain Project's own listing (the source the row's year already matches) says
-- 2010 -- sources conflict and neither is an original-trip-report primary source
-- here, so the year is left for human review rather than guessed.
UPDATE routes SET fa = 'Mark Allen, Leighan Falley, Joel Kauffman (aid, 2008); free ascent Bobby Matthews and Bryan Burdo (2010)'
WHERE id = 'wa_southern_man'
  AND fa = 'Mark Allen, Leighan Falley, Joel Kauffman (aid, 2008); free ascent Blake Matthews and Bryan Burdo (2010)';

COMMIT;
