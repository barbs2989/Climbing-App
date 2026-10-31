-- WA alpine/mountaineering audit -- batch 365 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_sherpa_glacier, wa_sherpa_peak_east_ridge, wa_sherpa_peak_north_ridge,
--         wa_sherpa_peak_west_ridge, wa_silver_star_glacier, wa_silver_star_ne_ridge,
--         wa_sinister_peak_north_face, wa_sinister_peak_southwest_route,
--         wa_skookum_peak_twinsisters_scramble, wa_sky_mountain_s_route
-- Every UPDATE is guarded on the value read live just before this file was written.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- wa_sherpa_peak_west_ridge: grade_num (5) disagrees with the catalog's own single
-- grade parser. gradeNumFrom() in lib/grade.js, called as gradeNumFor(grade,
-- discipline), maps discipline "alpine" to the "yds" system and then scans the
-- grade string with RX_YDS = /5\.(\d+)([a-d]?)/g, taking the highest match. The
-- stored grade is "Grade II, Class 4 to 5.4" -- its only YDS match is "5.4", which
-- the parser reads as 4 (no letter suffix), not 5. Verified by running the live
-- lib/grade.js against this row's own stored grade+discipline directly (node, not
-- re-derived by hand): gradeNumFor('Grade II, Class 4 to 5.4', 'alpine') === 4. No
-- other route in this batch showed this drift -- all nine other grade/grade_num
-- pairs matched the parser exactly.
UPDATE routes SET grade_num = 4
WHERE id = 'wa_sherpa_peak_west_ridge'
  AND grade = 'Grade II, Class 4 to 5.4' AND grade_num = 5;

-- wa_sherpa_peak_north_ridge: data_quality.gaps claims "This entry duplicates
-- wa_north_ridge_9; catalog likely has two records for the same physical line."
-- Queried live: no row with id 'wa_north_ridge_9' exists in routes, and no other
-- route under area_id 'wa_sherpa_peak' has a name matching "North Ridge" besides
-- this one. The claimed duplicate is not present in the live catalog (it may have
-- already been merged/renamed in an earlier pass) -- the gaps entry is stale.
-- Removing just that entry; the row's other two documented gaps are untouched.
UPDATE routes SET data_quality = jsonb_set(
  data_quality,
  '{gaps}',
  '["No public GPS track found for this route as of this research pass.", "Difficulty breakdown (physical/technical/exposure/commitment/routefinding) is a computed starting estimate derived from grade, pitch count, and route data on file -- not a researched or crowd-sourced rating. Users can blend in their own read via the UI."]'::jsonb
)
WHERE id = 'wa_sherpa_peak_north_ridge'
  AND data_quality->'gaps'->>0 = 'This entry duplicates wa_north_ridge_9; catalog likely has two records for the same physical line.';

COMMIT;
