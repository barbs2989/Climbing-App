-- 0109: reshape Eldorado Peak to match Mountain Project. Step 2 of 2, after 0108's merge.
--
--   MP                              ours (before)
--   Eldorado Peak                   North Cascades Core
--     Dorado Needle      (4)          Eldorado Peak        [peak 8,872 / 2,188]  5 routes
--     Early Morning Spire(1)          Main Peak            [crag  no elevation]  4 routes
--     El Dorado Boulders (1)          Dorado Needle        [peak 8,440 / 800]    4 routes
--     Main Peak          (6)          Early Morning Spire  [crag]                0 routes
--
-- Same shape 0105 fixed for Mount Index: the summit's own sub-areas sitting beside it
-- instead of within it. "El Dorado Boulders" is MP-only — we hold no such area, so there
-- is nothing to nest for it.
--
-- 0108 merged the two duplicated climbs onto the peak-scoped keepers (25 columns; verified
-- 6/6 and 19/19 landed, sources untouched). Only now can the crag copies be dropped.
--
-- ORDER IS FORCED BY THE TRIGGERS. areas_leaf_xor refuses to nest anything under an area
-- holding routes, and routes_require_leaf refuses to attach a route to an area with
-- sub-areas. So Eldorado Peak must be emptied before it can take children.
--
-- THE COST, STATED PLAINLY. Emptying Eldorado Peak moves its five summit routes onto Main
-- Peak, which has no elevation and no prominence — so all seven routes there would lose
-- their TECHNICAL STATS peak panel. Main Peak therefore takes Eldorado's own figures
-- (8,872 ft / 2,188 ft), which is factually right because Main Peak IS Eldorado's summit.
-- The side effect is that parent and child both read 8,872 ft. That is duplicative but
-- honest, and it is the price of MP fidelity here. It differs from 0105, where North Peak
-- had a genuinely distinct 5,357 ft of its own.

-- ── 1. Main Peak becomes the summit it actually is ──────────────────────────
update areas set area_type = 'peak',
                 elevation_ft  = coalesce(elevation_ft,  8872),
                 prominence_ft = coalesce(prominence_ft, 2188)
 where id = 'wa_main_peak';

-- ── 2. Empty Eldorado Peak onto Main Peak ───────────────────────────────────
update routes set area_id = 'wa_main_peak' where area_id = 'wa_eldorado_peak';

-- ── 3. Drop the crag copies 0108 superseded ─────────────────────────────────
-- Guarded on the keeper carrying a column 0108 copied, so each is a no-op if that merge
-- never landed. Never delete before the merge is proven — the rule that saved the data on
-- The Brothers, Mount Index and here.
delete from routes where id = 'wa_west_ridge_7'
  and exists (select 1 from routes k where k.id = 'wa_eldorado_peak_west_arete' and k.alpine_grade is not null);

delete from routes where id = 'wa_north_ridge_5'
  and exists (select 1 from routes k where k.id = 'wa_eldorado_peak_north_ridge' and k.fa is not null);

-- ── 4. Nest the sub-areas, as MP does ───────────────────────────────────────
-- Legal only now that Eldorado Peak holds no routes.
update areas set parent_id = 'wa_eldorado_peak'
 where id in ('wa_main_peak', 'wa_dorado_needle', 'wa_early_morning_spire');

-- None of the three has children of its own, so there is no descendant path to cascade
-- (contrast 0105, where Middle Peak's two children needed their parent_id rewritten to
-- re-fire trg_areas_set_path). Verified before writing: children = 0 for all three.

-- ── 5. Recount ──────────────────────────────────────────────────────────────
-- route_count is a trigger on ROUTES — the moves and deletes above maintained it, but an
-- AREA reparent does not touch it. Recomputed by subquery so it cannot go stale.
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in ('wa_eldorado_peak', 'wa_main_peak', 'wa_dorado_needle',
               'wa_early_morning_spire', 'wa_north_cascades_core');

-- Verify afterward. No ltree operators in the checks: `!~` on an ltree column raised 42883
-- during 0097 and, because the SQL Editor runs a paste as ONE transaction, rolled back the
-- correct UPDATEs above it. Derive the expected counts from the subtree, never by
-- arithmetic on cached numbers — that mispredicted 0097 (103 vs 106) and 0105 (6 vs 7).
--   select id, name, area_type, parent_id, elevation_ft, route_count, path::text
--     from areas
--    where id in ('wa_eldorado_peak','wa_main_peak','wa_dorado_needle','wa_early_morning_spire')
--    order by path::text;
--   -- expect all three parented to wa_eldorado_peak, every path containing .wa_eldorado_peak.
--   select id, name from routes where area_id = 'wa_eldorado_peak';
--   -- expect 0 rows — required for it to be a parent
--   select id, name from routes where area_id = 'wa_main_peak' order by name;
--   -- expect 7: the 5 moved off Eldorado plus South Ridge and Tepeh Towers
--   select id from routes where id in ('wa_west_ridge_7','wa_north_ridge_5');
--   -- expect 0 rows
