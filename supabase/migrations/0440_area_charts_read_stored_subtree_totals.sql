-- 0440: the area charts read each area's STORED subtree totals, so a state answers on a cold cache.
--
-- WHY (owner, 2026-11-14: "check on california for me" → "do what you recommend"): 0421 made
-- area_climb_stats and area_children_grade_counts sum area_route_rollup (each area's OWN routes) over
-- the subtree. Warm, California answered in ~300 ms. Cold — measured 2026-11-14 15:00 UTC, right after
-- a database slowdown — the first calls still hit anon's 3 s statement timeout (HTTP 500 at 3.2 s, then
-- 2.1 s, then 480 ms): the sum probes area_route_rollup once per area under the root, 12,532 probes and
-- ~68k buffers for California (EXPLAIN ANALYZE, 2026-11-14), which is fast only from memory. A timed-out
-- call also leaves a stuck PostgREST session (0416/0419), worst exactly when the database is struggling.
--
-- THE STORE: area_subtree_rollup holds, for each area, the counts of every route strictly BELOW it, in
-- 0421's buckets (disc, sys, b; '' / -32768 mean none). An area's whole-subtree count is then its own
-- area_route_rollup rows plus its area_subtree_rollup rows — one index range each, a few hundred rows
-- for a state, whatever the cache holds.
--
-- WHICH AREAS ARE "BELOW": the same rule the charts always used, the materialized path. A route counts
-- under every area named in its own area's path (areas.path labels ARE area ids: areas_set_path builds
-- each path as parent.path || text2ltree(id)), except the area itself. Reading ancestors off the path
-- needs no join and gives the same answer as `ra.path <@ root.path` whenever paths are consistent.
--
-- KEPT CURRENT by two triggers:
--   * trg_area_route_rollup_up — any change to an area's OWN counts (0421's routes trigger writes them)
--     is applied, as a delta, to every area above it in its path.
--   * trg_areas_path_moves_rollup — when an area's path changes (a move: 0349's loop rewrites the moved
--     area and then each descendant, one row at a time), that area's OWN counts leave the areas of its
--     old path and join the areas of its new one. An area holding no routes moves nothing; its
--     descendants carry their own counts when their own paths are rewritten. Watches parent_id and id
--     too: a path set by the BEFORE trigger (trg_areas_set_path) does not fire an UPDATE OF path trigger.
--
-- Output of both functions is unchanged; the client is not touched.

begin;

create table if not exists public.area_subtree_rollup (
  area_id text not null references public.areas(id) on delete cascade,
  disc    text not null,
  sys     text not null,
  b       integer not null,
  n       integer not null,
  primary key (area_id, disc, sys, b)
);
comment on table public.area_subtree_rollup is
  'Per area, the routes strictly BELOW it (by path) counted in area_route_rollup''s buckets (0440). '
  'An area''s subtree = its area_route_rollup rows + these. Kept by trg_area_route_rollup_up and '
  'trg_areas_path_moves_rollup. Read by area_climb_stats and area_children_grade_counts.';

alter table public.area_subtree_rollup enable row level security;
drop policy if exists "area_subtree_rollup public read" on public.area_subtree_rollup;
create policy "area_subtree_rollup public read" on public.area_subtree_rollup for select using (true);
revoke all on public.area_subtree_rollup from anon, authenticated;
grant select on public.area_subtree_rollup to anon, authenticated;

-- Add `delta` routes of one bucket to every area above `p` (its path's labels, the last excluded).
create or replace function public.area_subtree_bump(p ltree, d text, s text, bk integer, delta integer)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  k integer;
  anc text;
begin
  if p is null or delta = 0 or nlevel(p) < 2 then return; end if;
  for k in 0 .. nlevel(p) - 2 loop
    anc := subpath(p, k, 1)::text;
    -- A label naming no area (a hand-damaged path) is skipped, never allowed to fail a route write.
    continue when not exists (select 1 from areas where id = anc);
    if delta > 0 then
      insert into area_subtree_rollup (area_id, disc, sys, b, n) values (anc, d, s, bk, delta)
      on conflict (area_id, disc, sys, b) do update set n = area_subtree_rollup.n + excluded.n;
    else
      update area_subtree_rollup set n = n + delta where area_id = anc and disc = d and sys = s and b = bk;
      delete from area_subtree_rollup where area_id = anc and disc = d and sys = s and b = bk and n <= 0;
    end if;
  end loop;
end $$;
revoke all on function public.area_subtree_bump(ltree, text, text, integer, integer) from public, anon, authenticated;

-- 1. An area's own counts changed: carry the change up its path.
create or replace function public.area_route_rollup_up() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  p ltree;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select path into p from areas where id = old.area_id;
    perform area_subtree_bump(p, old.disc, old.sys, old.b, -old.n);
  end if;
  if tg_op in ('UPDATE', 'INSERT') then
    select path into p from areas where id = new.area_id;
    perform area_subtree_bump(p, new.disc, new.sys, new.b, new.n);
  end if;
  return null;
end $$;
drop trigger if exists trg_area_route_rollup_up on public.area_route_rollup;
create trigger trg_area_route_rollup_up
  after insert or update or delete on public.area_route_rollup
  for each row execute function public.area_route_rollup_up();

-- 2. An area moved: its own counts leave its old ancestors and join its new ones.
create or replace function public.areas_path_moves_rollup() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  x record;
begin
  if old.path is not distinct from new.path then return null; end if;
  for x in select disc, sys, b, n from area_route_rollup where area_id = new.id loop
    perform area_subtree_bump(old.path, x.disc, x.sys, x.b, -x.n);
    perform area_subtree_bump(new.path, x.disc, x.sys, x.b, x.n);
  end loop;
  return null;
end $$;
drop trigger if exists trg_areas_path_moves_rollup on public.areas;
create trigger trg_areas_path_moves_rollup
  after update of path, parent_id, id on public.areas
  for each row execute function public.areas_path_moves_rollup();

-- Backfill under locks that stop route and area writes until commit. Re-runnable: rebuilds the table.
lock table public.routes in share row exclusive mode;
lock table public.areas in share row exclusive mode;
delete from public.area_subtree_rollup;
insert into public.area_subtree_rollup (area_id, disc, sys, b, n)
select subpath(a.path, k, 1)::text, x.disc, x.sys, x.b, sum(x.n)
  from public.area_route_rollup x
  join public.areas a on a.id = x.area_id
  cross join lateral generate_series(0, nlevel(a.path) - 2) k
 where a.path is not null
   and exists (select 1 from public.areas anc where anc.id = subpath(a.path, k, 1)::text)
 group by 1, 2, 3, 4;

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
