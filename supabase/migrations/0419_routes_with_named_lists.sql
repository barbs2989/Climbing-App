-- 0419: the Challenges / tick-list read reads ~64 rows, not 2,300 table pages.
--
-- WHY (2026-11-12 outage): useRoutesWithLists (lib/db.js) asked PostgREST for
--   routes?lists=not.is.null&lists=not.eq.{state_classics}&limit=2000
-- Since 0390 tagged ~3,800 routes `state_classics`, the 0132 partial index (`lists is not null`)
-- matches 3,894 rows; the query keeps 64 of them and throws 3,830 away AFTER reading each from the
-- table: 2,320 heap pages per call (measured 2026-11-14), once per app user every 5 minutes. Warm
-- that is 8 ms; with the disk throttled it ran past anon's 3 s statement_timeout 468 times on
-- 2026-11-12, the most of any query, and a PostgREST session whose statement timed out was left
-- idle in its transaction until 0416 ended it (22 of the 34 sessions 0416 ended that day had a
-- timeout first). Those stuck sessions are what filled the pool and took the API down.
--
-- A partial index on exactly the wanted rows fixes the read, but only if the query states the
-- predicate as a LITERAL: PostgREST sends `{state_classics}` as a bind parameter, and a generic
-- plan cannot prove a parameter matches a partial index's predicate. So the predicate lives in
-- this function, and the client calls it (rpc "routes_with_named_lists").

create index if not exists routes_named_lists_idx on public.routes (id)
  where lists is not null and lists <> '{state_classics}'::text[];

create or replace function public.routes_with_named_lists()
returns table (id text, name text, area_id text, grade text, discipline text, pitches integer, stars numeric, lists text[], classic boolean)
language sql
stable
as $$
  select r.id, r.name, r.area_id, r.grade, r.discipline, r.pitches, r.stars, r.lists, r.classic
    from public.routes r
   where r.lists is not null
     and r.lists <> '{state_classics}'::text[]
   order by r.id
   limit 2000
$$;

grant execute on function public.routes_with_named_lists() to anon, authenticated;
