-- 0455: each child area's climbs BY DISCIPLINE, for sorting an area page's sub-areas.
--
-- WHY: the owner (2026-11-18) asked to sort an area's sub-areas "by most sport, bouldering, trad, etc
-- disciplines". The areas row carries only route_count and a disciplines[] list (which ones exist, not
-- how many), so the page could not tell which child holds the most sport climbs. This reads the same
-- stored totals area_children_grade_counts reads (0447): each child's own area_route_rollup rows plus
-- its area_subtree_rollup rows, grouped by discipline instead of grade.
--
-- Output: { "<child id>": { "<discipline>": n, ... }, ... }. A child with no climbs is absent; a
-- climb filed with no discipline is left out (its child's route_count still counts it).

begin;

create or replace function public.area_children_disc_counts(aid text) returns jsonb
language sql stable set search_path = public, pg_temp as $$
  -- The children exactly as the page lists them (useAreaChildren: parent_id = aid), by the indexed parent_id
  -- rather than an ltree scan: 7-12 ms warm for Colorado's 101 children, against 17 ms by path.
  with kids as (
    select c.id from areas c where c.parent_id = aid
  ),
  g as materialized (
    select x.child, x.disc, sum(x.n) as n
      from (select r.area_id as child, r.disc, r.n from area_route_rollup r join kids on kids.id = r.area_id
            union all
            select s.area_id, s.disc, s.n from area_subtree_rollup s join kids on kids.id = s.area_id) x
     where x.disc <> ''
     group by 1, 2
    having sum(x.n) > 0
  )
  select coalesce(jsonb_object_agg(child, counts), '{}'::jsonb)
    from (select child, jsonb_object_agg(disc, n) as counts from g group by child) q;
$$;
revoke all on function public.area_children_disc_counts(text) from public;
grant execute on function public.area_children_disc_counts(text) to anon, authenticated;

commit;
