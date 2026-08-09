-- 0117: Ingalls Peak was filed under Teanaway; Mountain Project puts it in
-- Stuart-Enchantments.
--
-- Fourth find from the MP diff, and the smallest — but it is the one that shows the diff
-- still pays after the big structural faults are gone.
--
-- We hold three rows, all under `wa_teanaway`:
--
--     wa_ingalls_peak         Ingalls Peak                 3 routes
--     wa_ingalls_peak_south   Ingalls Peak - South Peak    1 route
--     wa_ingalls_peak_east    Ingalls Peak - East Peak     2 routes
--                                                          ─────────
--                                                          6 routes
--
-- MP's Stuart-Enchantments sub-area list carries **"Ingalls Peak — 6 routes"**. The totals
-- match exactly; MP simply keeps one area where we keep three summit rows.
--
-- Geography is why this one is easy to get wrong, and why the MP list settles it: Ingalls
-- sits at the head of the North Fork Teanaway, so filing it under Teanaway looks right on a
-- map. But it is climbed from Ingalls Lake on the Esmeralda approach and belongs to the
-- Stuart massif, which is how every guidebook — and MP — groups it. Our own tree already
-- half-agrees: `wa_lake_ingalls_outcrop` is under Headlight Basin, inside
-- Stuart-Enchantments.
--
-- ── THE THREE ROWS ARE KEPT SEPARATE ─────────────────────────────────────────
-- MP has one "Ingalls Peak" area; we have the main, South and East summits as distinct
-- peak rows. That is finer-grained, not wrong — Ingalls genuinely has three summits and
-- `enrichRoute` builds peakMetadata per `area_type='peak'`, so collapsing them would strip
-- each summit's own elevation. Matching MP's *placement* does not mean importing MP's
-- *granularity*. Same call as 0111, which declined to copy MP filing Austera Peak as a
-- route on Eldorado.
--
-- ── ALSO NOT DONE ────────────────────────────────────────────────────────────
-- MP's Stuart-Enchantments has two areas we hold no rows for at all — "Jack Ridge Crags"
-- (5 routes) and "Greater Wocky" (1). Nothing to move; noted so the gap is recorded rather
-- than rediscovered.
--
-- ── SAFETY ───────────────────────────────────────────────────────────────────
-- Verified against the live DB immediately before writing: all three rows are childless
-- leaves, and neither wa_stuart_range nor wa_teanaway holds a direct route, so
-- trg_areas_leaf_xor passes and there is no ltree cascade to chase. Both areas sit under
-- wa_centraleast, so only those two rows change subtree membership and every ancestor above
-- already counted these 6 routes.
update areas set parent_id = 'wa_stuart_range'
 where id in ('wa_ingalls_peak','wa_ingalls_peak_south','wa_ingalls_peak_east');

-- Recount both — one gains the subtree, one loses it. Never arithmetic: 0111 predicted 29
-- for Western Alpine Lakes and the truth was 28, because two areas moved out in the same
-- migration.
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in ('wa_stuart_range','wa_teanaway');

-- ── Verify afterward, as SEPARATE statements ─────────────────────────────────
-- One transaction; an error in a read-only SELECT rolls back the writes above it.
--
--   select id, parent_id, path::text from areas
--     where id like 'wa_ingalls_peak%' order by id;
--   -- expect parent_id = wa_stuart_range on all three, paths ending
--   --   ...wa_centraleast.wa_stuart_range.<id>
--
--   select id, route_count from areas
--     where id in ('wa_stuart_range','wa_teanaway','wa_centraleast') order by id;
--   -- expect stuart_range 96, teanaway 8, centraleast UNCHANGED at 2009.
--   -- The recounts are authoritative if they disagree; centraleast moving at all would
--   -- mean a route left the subtree and is a real problem.
--
--   -- then:  npm run check:counts   and   npm run audit:area-parents
