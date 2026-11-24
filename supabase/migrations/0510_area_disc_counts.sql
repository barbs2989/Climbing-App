-- 0510: the climbs BY DISCIPLINE of a set of areas, for the map's ring markers.
--
-- WHY: the owner (2026-11-23) asked the area map to draw its circles the way Mountain Project does.
-- MP draws each area as a DONUT whose ring is split by how many routes of each type it holds. The
-- areas row carries only route_count and a disciplines[] list (which types exist, not how many), so
-- the map could not split a ring honestly. This reads the same stored totals 0455's
-- area_children_disc_counts reads (each area's own area_route_rollup rows plus its
-- area_subtree_rollup rows), for the areas the map has in view, by id.
--
-- Read straight from the rollup tables (both public-read), a state-wide view of 500 areas was ~3,500
-- rows over 10 requests; this is one request returning one small object per area.
--
-- Output: { "<area id>": { "<discipline>": n, ... }, ... }. An area with no climbs is absent; a climb
-- filed with no discipline is left out (its area's route_count still counts it). At most 600 ids are
-- read (the map asks for at most 500).

begin;

create or replace function public.area_disc_counts(ids text[]) returns jsonb
language sql stable set search_path = public, pg_temp as $$
  with want as (
    select distinct u.id from unnest(ids[1:600]) as u(id)
  ),
  g as materialized (
    select x.aid, x.disc, sum(x.n) as n
      from (select r.area_id as aid, r.disc, r.n from area_route_rollup r join want on want.id = r.area_id
            union all
            select s.area_id, s.disc, s.n from area_subtree_rollup s join want on want.id = s.area_id) x
     where x.disc <> ''
     group by 1, 2
    having sum(x.n) > 0
  )
  select coalesce(jsonb_object_agg(aid, counts), '{}'::jsonb)
    from (select aid, jsonb_object_agg(disc, n) as counts from g group by aid) q;
$$;
revoke all on function public.area_disc_counts(text[]) from public;
grant execute on function public.area_disc_counts(text[]) to anon, authenticated;

commit;
