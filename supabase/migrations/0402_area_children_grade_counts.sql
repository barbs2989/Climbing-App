-- Wall cards carry a mini grade chart (competitor review item 13, owner 2026-11-04).
--
-- The area page lists the areas under it as one card each — "Castle Rock · 51 climbs". The
-- count says how much is there and nothing about whether any of it suits your grade; the
-- climber had to open every wall to find out. 27crags answers it on the card with a five-bar
-- grade histogram. GRADE SPREAD already exists per area (area_climb_stats, 0304), but calling
-- it once per child is N round trips over N subtrees, and a region page lists thirty.
--
-- ONE pass instead: every graded route under the parent is filed under the CHILD it falls in —
-- the label of its area's path right after the parent's (areas.path labels are area ids, so the
-- label IS the child's id) — and counted per child, grade system and whole-number grade bucket,
-- the same bucket GRADE SPREAD draws (floor(grade_num) within grade_system). The app bands the
-- buckets into five bars per child. Ungraded routes are not in the answer at all: a card's
-- count stays the stored route_count, and the chart says "N of M graded" on its own.
--
-- Shape: {"<child id>": [{"sys": "yds", "bucket": 10, "n": 12}, ...], ...}. A child with no
-- graded route is simply absent. Same statement timeout as area_climb_stats: a state's page
-- calls both, each one scan of the state's routes.

begin;

create or replace function public.area_children_grade_counts(aid text) returns jsonb
language sql stable set search_path = public, pg_temp as $$
  with root as (
    select path from areas where id = aid
  ),
  g as materialized (
    select subpath(ra.path, nlevel(root.path), 1)::text as child,
           r.grade_system as sys,
           floor(r.grade_num) as b,
           count(*) as n
      from routes r
      join areas ra on ra.id = r.area_id
      cross join root
     where ra.path <@ root.path
       and nlevel(ra.path) > nlevel(root.path)
       and r.grade_num is not null
       and r.grade_system is not null
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
comment on function public.area_children_grade_counts(text) is
  'Graded climbs under each CHILD of an area, per grade system and whole-number grade bucket (0402): '
  '{"<child id>": [{"sys","bucket","n"}, ...]}. One pass over the subtree. Backs the mini grade bars '
  'on the area page''s wall cards.';

commit;
