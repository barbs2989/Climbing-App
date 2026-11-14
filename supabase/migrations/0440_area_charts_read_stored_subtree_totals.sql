-- 0440: store each area's subtree totals (step 1 of 2; 0447 points the charts at them).
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
-- This file only builds and fills the store; the chart functions keep reading the 0421 way until 0447,
-- so a store that is still being filled can never be drawn.

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

-- REBUILD: the stored rows for every area in p_root's subtree (p_root included), recomputed from
-- area_route_rollup — or, with p_only_root, the root's rows alone. Deletes and re-inserts under locks
-- that hold route and area writes until the caller's transaction ends, so a delta the triggers wrote
-- before the rebuild cannot be counted twice. Returns the rows written.
--
-- WHY A FUNCTION, AND IN PIECES (2026-11-14): the first apply of 0440 backfilled every area in one
-- INSERT and was cancelled by the management API's statement timeout at 2 min 43 s (57014, 17:31 UTC,
-- during a database slowdown); the whole transaction rolled back. Production is therefore filled one
-- state per transaction (area_subtree_rebuild(<state>)), then the few areas above the states with
-- p_only_root. A fresh database (a preview branch, the PGlite replay) is filled by the call at the end
-- of this file.
create or replace function public.area_subtree_rebuild(p_root text, p_only_root boolean default false)
returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  rp ltree;
  n integer;
begin
  select path into rp from areas where id = p_root;
  if rp is null then return 0; end if;
  lock table routes in share row exclusive mode;
  lock table areas in share row exclusive mode;
  if p_only_root then
    delete from area_subtree_rollup where area_id = p_root;
    insert into area_subtree_rollup (area_id, disc, sys, b, n)
    select p_root, x.disc, x.sys, x.b, sum(x.n)
      from area_route_rollup x
      join areas a on a.id = x.area_id
     where a.path <@ rp and nlevel(a.path) > nlevel(rp)
     group by 1, 2, 3, 4;
  else
    delete from area_subtree_rollup s using areas a where a.id = s.area_id and a.path <@ rp;
    insert into area_subtree_rollup (area_id, disc, sys, b, n)
    select subpath(a.path, k, 1)::text, x.disc, x.sys, x.b, sum(x.n)
      from area_route_rollup x
      join areas a on a.id = x.area_id
      cross join lateral generate_series(nlevel(rp) - 1, nlevel(a.path) - 2) k
     where a.path <@ rp
       and exists (select 1 from areas anc where anc.id = subpath(a.path, k, 1)::text)
     group by 1, 2, 3, 4;
  end if;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.area_subtree_rebuild(text, boolean) from public, anon, authenticated;

-- Fresh databases only (see above): fill every tree from its top. Production skips this statement and
-- runs the per-state rebuild instead.
select public.area_subtree_rebuild(id) from public.areas where parent_id is null;

commit;
