-- 0108: Eldorado Peak is filed twice as well — merge only, delete nothing.
--
-- Found by the flat-sub-summit sweep that followed 0105. `wa_main_peak` [crag, 4 routes]
-- sits 20 m from `wa_eldorado_peak` [peak, 8,872 ft], both flat under North Cascades Core.
--
-- It is not a separate formation, and the data says so itself: two of its routes carry
-- `face` values naming their parent —
--     North Ridge   -> "North Ridge, Eldorado Peak (Main Peak area)"
--     Tepeh Towers  -> "Inspiration Glacier side, Eldorado Peak (Main Peak area)"
--
-- Two routes are the same climb held twice:
--   West Arete (wa_eldorado_peak_west_arete)  ==  West Ridge (wa_west_ridge_7)
--     same FA (Richard Emerson & Walter Gove, August 1969), same 853 m, same W aspect,
--     same 6,800 ft gain. Named differently and graded differently (Alpine IV 5.8 vs 5.8,
--     19 pitches vs 10) by two enrichment passes.
--   North Ridge (wa_eldorado_peak_north_ridge) == North Ridge (wa_north_ridge_5)
--     same name on the same summit.
--
-- Two routes on wa_main_peak have NO counterpart and are NOT touched here: "South Ridge"
-- (Eldorado has no South Ridge on the peak row) and "Tepeh Towers" (a real arete NW of the
-- summit, which Mountain Project also lists as a route rather than an area).
--
-- KEEPER is the row on wa_eldorado_peak: that area is typed `peak` with elevation 8,872
-- and a prominence, so the TECHNICAL STATS peak panel renders. wa_main_peak has neither,
-- and moving the enrichment onto a row that cannot show it would be a silent downgrade.
--
-- The North Ridge merge is the one that matters: the crag row carries 19 columns the peak
-- row lacks, including `fa`, `grade`, `rack`, `waypoints` and `gpx`. Deleting it as "the
-- duplicate" — the obvious move — would have destroyed almost all of it, the same trap as
-- The Brothers and Mount Index.
--
-- MERGE ONLY. Nothing deleted, nothing overwritten, re-running is a no-op. Scalar subquery
-- per column, not `UPDATE ... FROM routes`, which silently changes zero rows here.
--
-- DELIBERATELY OUT OF SCOPE — the hierarchy. Mountain Project nests Dorado Needle, Early
-- Morning Spire, El Dorado Boulders and Main Peak UNDER Eldorado Peak; we hold all four
-- flat as siblings under North Cascades Core, the same shape 0105 fixed for Mount Index.
-- Reshaping it means emptying wa_eldorado_peak so it can take children (leaf XOR parent),
-- which moves the summit routes onto Main Peak — and Main Peak would then need Eldorado's
-- elevation and prominence or every one of those routes loses its peak panel. That is a
-- separate decision and a separate migration; this one is safe on its own either way.

-- West Arete / West Ridge (FA Emerson & Gove, Aug 1969): fill 6 blank column(s) on wa_eldorado_peak_west_arete from wa_west_ridge_7
update routes set
  alpine_grade = coalesce(alpine_grade, (select alpine_grade from routes where id = 'wa_west_ridge_7')),
  data_quality = coalesce(data_quality, (select data_quality from routes where id = 'wa_west_ridge_7')),
  difficulty = coalesce(difficulty, (select difficulty from routes where id = 'wa_west_ridge_7')),
  gpx = coalesce(gpx, (select gpx from routes where id = 'wa_west_ridge_7')),
  grade_num = coalesce(grade_num, (select grade_num from routes where id = 'wa_west_ridge_7')),
  grade_system = coalesce(grade_system, (select grade_system from routes where id = 'wa_west_ridge_7'))
where id = 'wa_eldorado_peak_west_arete';

-- North Ridge: fill 19 blank column(s) on wa_eldorado_peak_north_ridge from wa_north_ridge_5
update routes set
  alpine_draws = coalesce(alpine_draws, (select alpine_draws from routes where id = 'wa_north_ridge_5')),
  alpine_grade = coalesce(alpine_grade, (select alpine_grade from routes where id = 'wa_north_ridge_5')),
  approach_logistics = coalesce(approach_logistics, (select approach_logistics from routes where id = 'wa_north_ridge_5')),
  bail = coalesce(bail, (select bail from routes where id = 'wa_north_ridge_5')),
  comms = coalesce(comms, (select comms from routes where id = 'wa_north_ridge_5')),
  data_quality = coalesce(data_quality, (select data_quality from routes where id = 'wa_north_ridge_5')),
  difficulty = coalesce(difficulty, (select difficulty from routes where id = 'wa_north_ridge_5')),
  fa = coalesce(fa, (select fa from routes where id = 'wa_north_ridge_5')),
  features = coalesce(features, (select features from routes where id = 'wa_north_ridge_5')),
  gain_ft = coalesce(gain_ft, (select gain_ft from routes where id = 'wa_north_ridge_5')),
  gear_confidence = coalesce(gear_confidence, (select gear_confidence from routes where id = 'wa_north_ridge_5')),
  gpx = coalesce(gpx, (select gpx from routes where id = 'wa_north_ridge_5')),
  grade = coalesce(grade, (select grade from routes where id = 'wa_north_ridge_5')),
  rack = coalesce(rack, (select rack from routes where id = 'wa_north_ridge_5')),
  rope_length_m = coalesce(rope_length_m, (select rope_length_m from routes where id = 'wa_north_ridge_5')),
  rope_note = coalesce(rope_note, (select rope_note from routes where id = 'wa_north_ridge_5')),
  rope_type = coalesce(rope_type, (select rope_type from routes where id = 'wa_north_ridge_5')),
  sling_rack = coalesce(sling_rack, (select sling_rack from routes where id = 'wa_north_ridge_5')),
  waypoints = coalesce(waypoints, (select waypoints from routes where id = 'wa_north_ridge_5'))
where id = 'wa_eldorado_peak_north_ridge';

-- Verify by RE-READING THE KEEPERS, not by "it ran without error":
--   select id, grade, fa, alpine_grade, gain_ft, rope_length_m from routes
--    where id in ('wa_eldorado_peak_west_arete','wa_eldorado_peak_north_ridge') order by id;
--   -- expect north_ridge to now carry a grade, an fa, alpine_grade and gain_ft;
--   -- any NULL still there means the copy did not land.
