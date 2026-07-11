-- Data repair: washington's (and its only ancestor usa's) cached route_count
-- is stale by exactly 18 routes — a pre-existing drift, unrelated to the path
-- bug fixed in 0016. Confirmed by cross-checking three independent counts,
-- all of which agree at 9099 (not washington's own cached 9117):
--   - routes_in_subtree_count('washington', null, null)
--   - select count(*) from routes where id like 'wa_%'
--   - route_count recomputed fresh from the (now-correct) path data below
-- usa's cached total (206712) is off by the same 18, confirming the drift
-- is isolated to these two rows and didn't affect any other state.
--
-- Likely cause: the WA duplicate-area merge referenced in prior session notes
-- (24 mountain pairs merged) removed some routes/areas without recomputing
-- the aggregate counter up the tree — a manual data operation, not something
-- the routes_bump_counts trigger (migration 0001) would have missed on its own.
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in ('washington', 'usa');

-- Verify afterward:
--   select id, route_count from areas where id in ('washington','usa');
--   -- expect washington = 9099, usa = 206694
