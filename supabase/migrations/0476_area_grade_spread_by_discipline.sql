-- 0476: the area page's grade spread can be drawn per DISCIPLINE.
--
-- WHY (owner, 2026-11-18: "grade spread needs to have trad, sport, top rope be it's own discipline.
-- Make sure every dicipline is its own chip if there's that type of climbing in that area"):
-- area_climb_stats answered by_grade as (grade system, bucket) only, so the chart could offer one
-- chip per grading SCALE and drew trad, sport and top rope together as "Rock". The rollup both
-- stores read (area_route_rollup 0421, area_subtree_rollup 0440) already keys every count by
-- discipline; this adds the same counts, not folded across disciplines, as by_grade_disc:
--   [{ disc, sys, bucket, n }]   disc is null for a graded climb filed with no type.
-- Everything else in the answer (total, graded, by_disc, by_grade) is 0447's, unchanged, so a
-- client that does not know the new key reads what it always did.

begin;

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
    ), '[]'::jsonb),
    'by_grade_disc', coalesce((
      select jsonb_agg(jsonb_build_object('disc', discipline, 'sys', grade_system, 'bucket', b, 'n', n) order by discipline, grade_system, b)
        from g where b is not null and grade_system is not null
    ), '[]'::jsonb)
  );
$$;
grant execute on function public.area_climb_stats(text) to anon, authenticated;

commit;
