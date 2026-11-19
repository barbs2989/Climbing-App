-- 0465 — The Black Wall (Mt Blue Sky, CO) stays ALPINE: 0462's 11 Black Wall rows go back.
--
-- 0462 (crag pass 3) moved 11 Black Wall routes from alpine to trad on a stated 40-minute walk from Summit Lake. The
-- owner's review (2026-11-18: "do what research says") checked them against the pass's own rule, which files glacier or
-- snow as alpine (research-data/crag-rows-out-of-alpine-pass3-2026-11-18/CRAG3.md), and pass 3's own owner-review.json
-- had already held the wall back for snow. Researched online:
--   * snow lies at the base and over the rappel anchors into July (stephabegg.com/?p=11406, 2021: anchors buried behind
--     a snow mound, a cornice above the right side, snow at the base); you rappel in (4 x 70 m) and climb back out;
--   * 12,000-13,000 ft; Mountain Project calls these its "long, committing routes" and says the approach "varies a little
--     with snow levels" (mountainproject.com/area/105745699).
--   * The AAC's "2-3 hours" (publications.americanalpineclub.org/articles/13201213251) was from Guanella Pass with the
--     road closed; the road reopened in May 2026. So the 40 min stands; the snow is what decides.
-- overrides3.json records the decision (co_black_wall_the: unsure) and decisions3.json marks the 11 rows unsure.
--
-- Each row returns to what it held before 0462: discipline 'alpine', disciplines NULL (0462's decisions recorded no
-- earlier list, and the wall's other alpine rows hold NULL). Assert-then-set: a row is touched only while it still holds
-- exactly what 0462 wrote (trad, ["trad"]), so a later edit by a climber or the owner is left alone.
-- Out of scope, noted for the owner: four Black Wall routes made trad by earlier passes (Cary Granite; Black Mamba,
-- Harry Caray and Miller's Face, which keep an "alpine" tag).
begin;

update routes
   set discipline = 'alpine', disciplines = null
 where area_id = 'co_black_wall_the'
   and discipline = 'trad'
   and disciplines = '["trad"]'::jsonb
   and id in ('co_cannonball_corner', 'co_coffee_achievers', 'co_escape_route', 'co_espresso', 'co_good_evans',
              'co_high_variance', 'co_old_rappel_route', 'co_parallel_universe_2', 'co_phil_a_guster',
              'co_rainbow_highway', 'co_road_warrior');

-- Expect 11 (0 on an empty catalog: a migration replay or a Supabase preview branch).
select discipline, count(*) from routes where area_id = 'co_black_wall_the' group by discipline order by 1;

commit;
