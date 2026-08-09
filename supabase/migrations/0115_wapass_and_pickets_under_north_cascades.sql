-- 0115 (drafted as 0112): Washington Pass and the Picket Range sit one level too high.
--
-- Found by the MP diff that 0111 started. Mountain Project's own breadcrumbs put both
-- inside "N Cascades", and we have both as its SIBLINGS:
--
--   MP   All Locations > Washington > Northwest Region > Hwy 20 & N Cascades National Park
--          > N Cascades > Washington Pass
--        ... > N Cascades > Picket Range > Northern Pickets
--
--   ours Hwy 20 and North Cascades National Park
--          ├ North Cascades          <- MP nests the next two INSIDE this
--          ├ Picket Range
--          └ Washington Pass
--
-- Both breadcrumbs were read from MP directly (the Washington Pass area page, and the
-- Northern Pickets path in MP's own listing), not inferred.
--
-- 218 routes and 88 descendant areas are involved, so this is the largest reshape in this
-- series -- but it is also the safest kind: nothing changes hands, the two subtrees move
-- intact one level down.
--
-- ── MP INDEPENDENTLY CONFIRMS 0106 ───────────────────────────────────────────
-- Worth recording, because it is the strongest evidence any of this work was right. MP's
-- Washington Pass sub-area list, fetched today:
--
--     Liberty Bell Group          52 routes      ours after 0106:  50
--     Kangaroo Ridge              14 routes      ours after 0106:  13
--     Silver Star and Wine Spires 21 routes      ours after 0106:  25
--
-- 0106 was derived from latitude ordering and guidebook convention, with no reference to
-- MP at all, and it landed within a route or two of MP's grouping on all three. Before it,
-- Liberty Bell Group held 27 against MP's 52.
--
-- ── THE ltree CASCADE IS THE WHOLE DIFFICULTY ────────────────────────────────
-- trg_areas_set_path (0001) recomputes `path` only for the row whose parent_id changed --
-- it does NOT cascade. 0097 handled this by re-assigning one level of children to
-- themselves, which puts parent_id in the SET clause and re-fires the trigger. That works
-- for one level; these subtrees are three deep (Washington Pass: 20 children, 30
-- grandchildren, 2 great-grandchildren; Picket Range: 10 and 26).
--
-- So instead of naming levels, step 2 repairs ANY row whose stored path disagrees with the
-- path its parent implies, and is run three times. Each pass fixes one more level, and a
-- pass with nothing left to fix is a harmless no-op -- so it is idempotent and safe to run
-- again. This is the same disagreement `audit:area-parents` D3 reports, which is what will
-- confirm the result.

-- ── 1. Move the two subtree roots ────────────────────────────────────────────
update areas set parent_id = 'wa_north_cascades'
 where id in ('wa_sub_wapass','wa_picket_range');

-- ── 2. Re-derive every descendant path (run 3x — depth is 3) ─────────────────
-- `set parent_id = a.parent_id` is not a no-op: naming the column in SET is what fires
-- trg_areas_set_path, which then rebuilds path from the parent's NEW path.
update areas a set parent_id = a.parent_id
  from areas p where p.id = a.parent_id and a.path <> p.path || subpath(a.path, -1);

update areas a set parent_id = a.parent_id
  from areas p where p.id = a.parent_id and a.path <> p.path || subpath(a.path, -1);

update areas a set parent_id = a.parent_id
  from areas p where p.id = a.parent_id and a.path <> p.path || subpath(a.path, -1);

-- ── 3. Recount the one node whose subtree changed ────────────────────────────
-- route_count is trigger-maintained on ROUTES and does not recompute when an AREA moves.
-- Only wa_north_cascades gains members; wa_hwy20_ncnp and everything above it already
-- counted these 218 routes, since the move stays inside that subtree.
-- Recount, never arithmetic -- 0097 predicted 106 from cached numbers and the truth was 103.
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id = 'wa_north_cascades';

-- ── Verify afterward, as SEPARATE statements ─────────────────────────────────
-- Do not append these to the paste: the SQL Editor runs it as ONE transaction and an error
-- in a read-only SELECT rolls back the writes before it. Cast path to text; `!~` is the
-- TEXT regex operator with no ltree form and raises 42883.
--
--   select id, parent_id, path::text from areas
--     where id in ('wa_sub_wapass','wa_picket_range') order by id;
--   -- expect parent_id = wa_north_cascades and path
--   --   usa.washington.wa_northwest.wa_hwy20_ncnp.wa_north_cascades.<id>
--
--   select count(*) from areas a join areas p on p.id = a.parent_id
--     where a.path <> p.path || subpath(a.path, -1);
--   -- expect 0 — every descendant path agrees with its parent chain
--
--   select count(*) from areas where path::text like '%wa_north_cascades.wa_sub_wapass%';
--   -- expect 53 (Washington Pass + its 52 descendants)
--
--   select id, route_count from areas
--     where id in ('wa_north_cascades','wa_hwy20_ncnp','wa_sub_wapass','wa_picket_range')
--     order by id;
--   -- expect north_cascades ~342 (124 + 149 + 69), hwy20_ncnp UNCHANGED at 479,
--   -- and the two moved roots unchanged at 149 and 69. hwy20_ncnp moving at all would
--   -- mean a route left the subtree and is a real problem.
--
--   -- then:  npm run check:counts   and   npm run audit:area-parents
--   -- D3 (path breaks) must stay 0. If it does not, run step 2 once more.
