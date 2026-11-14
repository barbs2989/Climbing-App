-- 0447: the area charts read the stored subtree totals (step 2 of 2 after 0440).
--
-- WHY: see 0440 — California's charts timed out from a cold cache (HTTP 500 at 3.2 s, 2026-11-14)
-- because 0421's sum probes every area under the root. 0440 built and filled area_subtree_rollup; this
-- file switches area_climb_stats and area_children_grade_counts to one area's rows from it plus the
-- area's own area_route_rollup rows. Applied only after the store matched a fresh recount on production.
-- Output of both functions is unchanged; the client is not touched.

begin;

-- Same output as 0421, now read from the root's own rows plus its stored subtree rows.
create or replace function public.area_climb_stats(aid text) returns jsonb
language sql stable set search_path = public, pg_temp as $$
  with g as materialized (
    select nullif(x.disc, '') as discipline,
           nullif(x.sys, '') as grade_system,
           nullif(x.b, -32768) as b,
           sum(x.n) as n
      from (select disc, sys, b, n from area_route_rollup where area_id = aid
            union all
            select disc, sys, b, n from area_subtree_rollup where area_id = aid) x
     where exists (select 1 from areas where id = aid)
     group by 1, 2, 3
  )
  select jsonb_build_object(
    'total',  coalesce((select sum(n) from g), 0),
    'graded', coalesce((select sum(n) from g where b is not null), 0),
    'by_disc', coalesce((
      select jsonb_agg(jsonb_build_object('disc', discipline, 'n', n) order by n desc, discipline)
        from (select discipline, sum(n) as n from g where discipline is not null group by 1) d
    ), '[]'::jsonb),
    'by_grade', coalesce((
      select jsonb_agg(jsonb_build_object('sys', grade_system, 'bucket', b, 'n', n) order by grade_system, b)
        from (select grade_system, b, sum(n) as n from g where b is not null group by 1, 2) q
    ), '[]'::jsonb)
  );
$$;
grant execute on function public.area_climb_stats(text) to anon, authenticated;

-- Same output as 0421: each CHILD (the area one level below the root in the path) with its whole
-- subtree's graded counts — its own rows plus its stored subtree rows.
create or replace function public.area_children_grade_counts(aid text) returns jsonb
language sql stable set search_path = public, pg_temp as $$
  with root as (
    select path from areas where id = aid
  ),
  kids as (
    select c.id from areas c, root
     where c.path <@ root.path and nlevel(c.path) = nlevel(root.path) + 1
  ),
  g as materialized (
    select x.child, x.sys, x.b, sum(x.n) as n
      from (select r.area_id as child, r.sys, r.b, r.n from area_route_rollup r join kids on kids.id = r.area_id
            union all
            select s.area_id, s.sys, s.b, s.n from area_subtree_rollup s join kids on kids.id = s.area_id) x
     where x.b <> -32768 and x.sys <> ''
     group by 1, 2, 3
  )
  select coalesce(jsonb_object_agg(child, rows), '{}'::jsonb)
    from (
      select child, jsonb_agg(jsonb_build_object('sys', sys, 'bucket', b, 'n', n) order by sys, b) as rows
        from g
       group by child
    ) q;
$$;
revoke all on function public.area_children_grade_counts(text) from public;
grant execute on function public.area_children_grade_counts(text) to anon, authenticated;

commit;
