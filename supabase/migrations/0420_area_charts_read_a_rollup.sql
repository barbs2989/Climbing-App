-- 0420: the area page's charts (CLIMBS HERE, GRADE SPREAD, the wall cards' mini grade bars) read a
-- small pre-counted table instead of every route under the area.
--
-- WHY (owner, 2026-11-14: "Can we make the climbs here charts load faster? Same with grades spread."):
-- area_climb_stats (0304) and area_children_grade_counts (0402) joined routes to areas over the whole
-- subtree on every page open. Measured on production 2026-11-14 as anon:
--   California (49,225 routes)   both functions: HTTP 500 after 3.1 s — anon's statement timeout.
--                                A state page never drew either chart, and each timeout leaves a
--                                PostgREST session idle in its aborted transaction (see 0416/0419).
--   Red River Gorge (3,918)      area_climb_stats 693 ms
--   Yosemite Valley (1,965)      area_climb_stats 458 ms
--   a 99-route crag              ~150 ms (the round trip alone is ~110 ms)
--
-- THE ROLLUP: area_route_rollup holds, for each area, how many of ITS OWN routes (routes.area_id =
-- that area, not its subtree) fall in each (discipline, grade_system, grade bucket). The bucket is
-- the one both charts already draw: floor(grade_num) when grade_num AND grade_system are set, else
-- "none". ~one row per area per grade the area has, so a state's subtree sums a few thousand rows
-- where it used to read tens of thousands of routes.
--
-- It is keyed by area_id, NOT by path: the subtree is still found through areas.path (gist index)
-- at read time, so re-parenting an area (a path rewrite on areas) can never leave a stale copy here.
-- Kept current by a per-row trigger on routes — the shape trg_routes_bump_counts (0001) already
-- uses for areas.route_count — on insert, delete, and any change to the four columns it counts.
--
-- Columns are NOT NULL with sentinels ('' for no discipline/system, -32768 for no bucket) so the
-- primary key works on every Postgres version; the functions turn them back into nulls.
-- Output of both functions is unchanged, byte for byte in shape: the client is not touched.

begin;

create table if not exists public.area_route_rollup (
  area_id text not null references public.areas(id) on delete cascade,
  disc    text not null,
  sys     text not null,
  b       integer not null,
  n       integer not null,
  primary key (area_id, disc, sys, b)
);
comment on table public.area_route_rollup is
  'Per area, its OWN routes counted by (discipline, grade_system, floor(grade_num)) — '''' / -32768 mean none. '
  'Maintained by trg_routes_area_rollup (0420). Read by area_climb_stats and area_children_grade_counts.';

alter table public.area_route_rollup enable row level security;
drop policy if exists "area_route_rollup public read" on public.area_route_rollup;
create policy "area_route_rollup public read" on public.area_route_rollup for select using (true);
revoke all on public.area_route_rollup from anon, authenticated;
grant select on public.area_route_rollup to anon, authenticated;

-- The bucket key both charts use (0304's `b`), as the rollup stores it.
create or replace function public.area_rollup_bucket(gsys text, gnum numeric) returns integer
language sql immutable set search_path = public, pg_temp as $$
  select case when gnum is not null and gsys is not null then floor(gnum)::integer else -32768 end;
$$;

create or replace function public.routes_bump_area_rollup() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE'
     and old.area_id is not distinct from new.area_id
     and old.discipline is not distinct from new.discipline
     and old.grade_system is not distinct from new.grade_system
     and area_rollup_bucket(old.grade_system, old.grade_num) = area_rollup_bucket(new.grade_system, new.grade_num) then
    return null;  -- a grade edit inside the same bucket (5.10a -> 5.10b) changes no count
  end if;
  if tg_op in ('DELETE', 'UPDATE') and old.area_id is not null then
    update area_route_rollup set n = n - 1
     where area_id = old.area_id and disc = coalesce(old.discipline, '') and sys = coalesce(old.grade_system, '')
       and b = area_rollup_bucket(old.grade_system, old.grade_num);
    delete from area_route_rollup
     where area_id = old.area_id and disc = coalesce(old.discipline, '') and sys = coalesce(old.grade_system, '')
       and b = area_rollup_bucket(old.grade_system, old.grade_num) and n <= 0;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.area_id is not null then
    insert into area_route_rollup (area_id, disc, sys, b, n)
    values (new.area_id, coalesce(new.discipline, ''), coalesce(new.grade_system, ''), area_rollup_bucket(new.grade_system, new.grade_num), 1)
    on conflict (area_id, disc, sys, b) do update set n = area_route_rollup.n + 1;
  end if;
  return null;
end $$;

drop trigger if exists trg_routes_area_rollup on public.routes;
create trigger trg_routes_area_rollup
  after insert or delete or update of area_id, discipline, grade_system, grade_num on public.routes
  for each row execute function public.routes_bump_area_rollup();

-- Backfill under a lock that stops route writes until commit, so no insert lands between the
-- count and the trigger. Re-runnable: it rebuilds the table from routes.
lock table public.routes in share row exclusive mode;
delete from public.area_route_rollup;
insert into public.area_route_rollup (area_id, disc, sys, b, n)
select r.area_id, coalesce(r.discipline, ''), coalesce(r.grade_system, ''), area_rollup_bucket(r.grade_system, r.grade_num), count(*)
  from public.routes r
 where r.area_id is not null
 group by 1, 2, 3, 4;

-- Same output as 0304, now summed from the rollup.
create or replace function public.area_climb_stats(aid text) returns jsonb
language sql stable set search_path = public, pg_temp as $$
  with g as materialized (
    select nullif(x.disc, '') as discipline,
           nullif(x.sys, '') as grade_system,
           nullif(x.b, -32768) as b,
           sum(x.n) as n
      from area_route_rollup x
      join areas ra on ra.id = x.area_id
      join areas root on root.id = aid
     where ra.path <@ root.path
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

-- Same output as 0402, now summed from the rollup.
create or replace function public.area_children_grade_counts(aid text) returns jsonb
language sql stable set search_path = public, pg_temp as $$
  with root as (
    select path from areas where id = aid
  ),
  g as materialized (
    select subpath(ra.path, nlevel(root.path), 1)::text as child,
           x.sys,
           x.b,
           sum(x.n) as n
      from area_route_rollup x
      join areas ra on ra.id = x.area_id
      cross join root
     where ra.path <@ root.path
       and nlevel(ra.path) > nlevel(root.path)
       and x.b <> -32768
       and x.sys <> ''
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
