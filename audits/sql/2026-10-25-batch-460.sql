-- WA alpine/mountaineering audit -- batch 460 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_the_monk_scabo, wa_the_monk_west_cracks_left_crack,
--         wa_the_monk_west_cracks_right_crack, wa_the_needle_neve_glacier,
--         wa_the_pleiades_scramble, wa_the_pyramid_picket_east_ridge,
--         wa_the_pyramid_picket_south_route, wa_the_rake_traverse_route
--
-- Current value below was re-read from the live DB via the read-only anon key
-- immediately before this file was written; the UPDATE carries a guard on that
-- current value so it cannot silently no-op or clobber an unrelated edit.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- The Pyramid, East Ridge -- wa_the_pyramid_picket_east_ridge
-- =========================================================================
-- `beta` names "Colin Haley (age 17)" as one of the three climbers on the July
-- 2003 Southern Pickets Enchainment (Wallace/Haley/Bunker) that put up this
-- line. Colin Haley's own Wikipedia page and a North Cascades Institute
-- profile both give his birth date as September 2, 1984 (Seattle) -- so in
-- July 2003 he had already turned 18 (his 18th birthday was September 2,
-- 2002) and would not turn 19 until that September. He was 18, not 17, on
-- this climb. (A separately-documented "age 17" Haley climb -- a winter
-- ascent of Mount Johannesburg's NE Buttress -- is a different route and
-- predates this one; it is not the source of this figure and is unaffected.)
UPDATE routes
SET beta = replace(beta, 'Colin Haley (age 17)', 'Colin Haley (age 18)')
WHERE id = 'wa_the_pyramid_picket_east_ridge'
  AND beta LIKE '%Colin Haley (age 17)%';

COMMIT;

-- =========================================================================
-- NOT fixed here (flagged for human review only -- see audit log for detail):
--  - wa_the_needle_neve_glacier: area/route high_point_ft is 8079, but the
--    only outside elevation figure found for The Needle (SummitPost) gives
--    8,040 ft -- a single, non-authoritative secondary source conflicting
--    with the stored value on an informally-named, off-USGS-map spire. Not
--    fixed per audit rule: a lone weak source isn't enough to overwrite a
--    stored figure with confidence either way.
--  - wa_the_pleiades_scramble: data_quality.gaps already flags the true high
--    point (Peak 3) as disputed across sources (7,346-7,371 ft on file this
--    run turned up a THIRD figure, SummitPost's 7,334 ft, widening rather
--    than resolving the range) -- still unresolved, left as-is.
--  - wa_the_pyramid_picket_south_route: `data_quality.gaps` text still reads
--    "Grade III/5.6 rating ... could not be corroborated", but the row's own
--    current `grade` field is "Class 3", not 5.6 -- the gaps note looks stale
--    from an earlier correction that updated the grade but not this note.
--    Not touched here since it's not clear what the gaps text SHOULD now
--    say; flagged for a human to reconcile. Separately, the 1951 FA date is
--    now partially corroborated -- Wikipedia's Picket Range peak table lists
--    1951 for The Pyramid -- but the "Don Gordon" attribution itself remains
--    unconfirmed by any source found.
-- =========================================================================

-- Verify afterward:
select id, beta from routes where id = 'wa_the_pyramid_picket_east_ridge';
