-- Data repair: Washington's entire area subtree has stale `path` values.
--
-- Every other state's areas are rooted at usa.<state>.<...> (confirmed by direct
-- query — e.g. california's children are usa.california.ca_western_sierra).
-- Washington's are rooted at washington.<...> instead (e.g. wa_northwest's path
-- is "washington.wa_northwest", missing the "usa." prefix), even though
-- washington's own row correctly has path = "usa.washington" and parent_id =
-- 'usa'. parent_id relationships are fine throughout — only the denormalized
-- `path` column is stale for WA's ~9,000 descendant rows.
--
-- Root cause: WA was loaded via an older, separate one-off pipeline
-- (import-alpine.mjs / load-wa-rock-safe.mjs) before the "usa" root convention
-- existed. When washington was later re-parented under "usa", the
-- areas_set_path trigger (migration 0001) recomputed washington's own path,
-- but it only fires on the row being written — it doesn't cascade to
-- already-existing descendants, so they kept their pre-"usa" paths.
--
-- Practical effect: any query scoped to root_id = 'washington' (routes_in_subtree,
-- routes_in_subtree_count, areas_in_subtree, area_top_contributors) silently
-- returns zero rows for the WHOLE STATE, because `<@` ltree containment checks
-- washington's *current* correct path ("usa.washington") against descendants'
-- *stale* paths ("washington.xxx", a different root label entirely) and finds
-- no match. Queries scoped to any of WA's own sub-areas (e.g. root_id =
-- 'wa_northwest') work fine, since that subtree is internally consistent with
-- itself — the mismatch only bites at the state root.
--
-- Fix: re-fire areas_set_path for every WA descendant, top-down (shallowest
-- first) so each row picks up its parent's already-corrected path within the
-- same transaction. `set parent_id = parent_id` is a no-op value-wise but the
-- column IS included in the UPDATE, which is what the trigger's
-- "before update of parent_id, id" clause fires on.
do $$
declare
  r record;
begin
  for r in
    with recursive descendants as (
      select id, 1 as depth from areas where parent_id = 'washington'
      union all
      select a.id, d.depth + 1 from areas a join descendants d on a.parent_id = d.id
    )
    select id from descendants order by depth
  loop
    update areas set parent_id = parent_id where id = r.id;
  end loop;
end $$;

-- Verify afterward:
--   select path from areas where id = 'wa_northwest';  -- expect usa.washington.wa_northwest
--   select routes_in_subtree_count('washington', null, null);  -- expect 9117
