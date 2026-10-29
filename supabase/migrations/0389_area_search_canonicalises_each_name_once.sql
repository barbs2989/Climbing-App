-- areas_in_subtree normalises each hit's name ONCE, not once per rung of the ranking ladder.
--
-- The area search on the Climbs tab (the route finder's Areas box and the "Search <area>" box on an
-- area page) timed out on common words in the big states: "rock" in California or Colorado hit the
-- 3 s statement timeout (57014) and the screen said "Couldn't search areas". The match itself takes
-- ~35 ms; the time went on ranking. `hit` was an inlined CTE whose `lname` and `bname` are both
-- search_canon(name), and the score CASE reads them up to eight times per row, so a name was
-- canonicalised six to eight times over (~0.2 ms a call, 1,104 hits for "rock" in California).
--
-- Now `canon` is MATERIALIZED with search_canon(name) computed once, and `bname` is derived from
-- `lname` by the same regexp. Nothing else changes: same matches, same ladder, same order, same
-- `total`. Measured against the live function on 2026-10-29 (identical rows and totals in every case):
--   california "rock"  1,524 ms -> 183 ms      california "r"  7,860 ms -> 1,351 ms
--   california "ro"    1,602 ms -> 248 ms

CREATE OR REPLACE FUNCTION public.areas_in_subtree(root_id text, q text, lim integer DEFAULT 40)
 RETURNS TABLE(id text, name text, area_type text, route_count integer, parent_id text, parent_name text, total bigint)
 LANGUAGE sql
 STABLE
AS $$
  with needle as (
    -- `bare` drops a leading honorific so "baker" scores against "Mount Baker" the same way
    -- "mount baker" does. Compared on CANONICAL forms, so "mt" and "mount" are one honorific.
    -- It can only be empty if the caller sent a bare honorific, and every comparison against
    -- it is guarded — an empty needle would make `like '' || '%'` true for every row.
    select search_canon(q) as raw,
           regexp_replace(search_canon(q), '^(mount|the) ', '') as bare,
           search_clean(q) as clean,
           search_patterns(q) as pats
  ),
  strict as (
    select a.id, a.name, a.area_type, a.route_count, a.parent_id, 0::real as sim
      from areas a
      join areas root on root.id = root_id, needle n
     where a.path <@ root.path
       and a.id <> root_id
       and coalesce(a.name_search, search_norm(a.name)) like all (n.pats)
  ),
  -- ONLY when nothing matched. Blending near-misses into a query that works would change its
  -- result set and its `total`, which is exactly what 0147 promised a working search would
  -- never do.
  fuzzy as (
    select a.id, a.name, a.area_type, a.route_count, a.parent_id,
           word_similarity(n.clean, coalesce(a.name_search, search_norm(a.name))) as sim
      from areas a
      join areas root on root.id = root_id, needle n
     where not exists (select 1 from strict)
       and n.clean <> ''
       and a.path <@ root.path
       and a.id <> root_id
       and word_similarity(n.clean, coalesce(a.name_search, search_norm(a.name))) >= 0.5
  ),
  canon as materialized (
    select h.*, search_canon(h.name) as lname
      from (select * from strict union all select * from fuzzy) h
  ),
  hit as (
    select c.*, regexp_replace(c.lname, '^(mount|the) ', '') as bname
      from canon c
  ),
  scored as (
    select h.*,
           case
             when h.sim > 0 then 5
             when h.lname = n.raw then 100
             when n.bare <> '' and (h.bname = n.raw or h.lname = n.bare or h.bname = n.bare) then 90
             when h.lname like n.raw || '%' then 80
             when n.bare <> '' and (h.bname like n.raw || '%' or h.lname like n.bare || '%') then 70
             -- A word-boundary hit ("north ridge" inside "direct north ridge") beats a mid-word
             -- one. Canonical forms hold only [a-z0-9 ], so LIKE needs no escaping here.
             when h.lname like '% ' || n.raw || '%' then 60
             else 10
           end as score,
           count(*) over () as total
      from hit h, needle n
  )
  select s.id, s.name, s.area_type, s.route_count, s.parent_id, pa.name as parent_name, s.total
    from scored s
    left join areas pa on pa.id = s.parent_id
   order by s.score desc, s.sim desc, s.route_count desc nulls last, s.name
   limit lim;
$$;
