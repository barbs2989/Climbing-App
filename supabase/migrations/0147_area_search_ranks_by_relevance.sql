-- 0147 — the "All areas" filter box returns the BEST matches, and says when it truncated.
--
-- `areas_in_subtree` (0015) backs every area-search box in the app: the full-screen "All
-- areas" tree modal, and the Areas half of the in-page search on any non-leaf area page.
-- It ordered `by a.name` and cut at `limit lim` (40), which makes the cap ALPHABETICAL and
-- silent. Measured against the live Washington subtree before this change:
--
--   q          matches   the 40 shown ran from …            … to
--   "mount"       216    "Agnes Mountain"                   "Garfield Mountain"
--   "wall"        301    "(0) Sport School Wall"            "Bob's Wall"
--   "peak"        164    "Abernathy Peak"                   "Davis Peak"
--   "rock"        128    "2nd Rock"                         "Highway Rock"
--   "north"        58    "(A) Great Northern Slab"          "North Side, The"
--
-- So typing "mount" could not reach Mount Rainier, Mount Baker or Mount Stuart — the three
-- most-searched peaks in the state — because M sorts after G and the cut landed at
-- "Garfield Mountain". Nothing on screen said 176 further matches existed. Names that lead
-- with punctuation or a digit ("(0) Sport School Wall") outranked every real formation for
-- the same reason. That is the "no silent caps" rule in CLAUDE.md, and it was load-bearing
-- here rather than cosmetic: the search reads as "this peak is not in the catalog".
--
-- Two changes, both inside one function with an UNCHANGED argument list:
--
-- 1. ORDER BY relevance, not spelling. The ladder mirrors `routeSearchScore` in `lib/db.js`
--    deliberately — the two search boxes in this app should not disagree about what a good
--    match is — including its "climbers type the peak, not the honorific" rule, so "baker"
--    reaches "Mount Baker" as an EXACT match rather than as a mid-word hit. Ties break on
--    `route_count desc`, so a formation holding 27 climbs outranks an empty stub of the
--    same name.
-- 2. Return `total`, the full match count before the limit, so the UI can say "showing 40
--    of 216" instead of implying it showed everything. A window function is what forces the
--    match set to be materialized; at a few hundred rows per state subtree that is free,
--    and the alternative (a second round trip per keystroke) is not.
--
-- DROP + CREATE rather than `create or replace`, because the RETURN TYPE gains a column and
-- Postgres refuses to replace across that. The ARGUMENT LIST is byte-identical, so this
-- cannot leave an overload behind — the failure [[adding-a-param-does-not-replace-a-function]]
-- and 0135 both record, where two live signatures answered the same call differently.
--
-- The grants are re-stated because DROP takes the ACL with it. Measured before writing this:
-- `proacl` was `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,
-- service_role=X/postgres}` — PUBLIC plus all three roles. This is a plain `stable` reader
-- with no SECURITY DEFINER, so it is NOT one of the functions 0136 revoked, and restoring
-- exactly what was there keeps that true rather than quietly widening or narrowing it.

begin;

drop function if exists areas_in_subtree(text, text, int);

create function areas_in_subtree(
  root_id text,
  q text,
  lim int default 40
)
returns table(id text, name text, area_type text, route_count int, parent_id text, parent_name text, total bigint)
language sql stable as $$
  with needle as (
    -- `bare` drops the honorific so "baker" scores against "Mount Baker" the same way
    -- "mount baker" does. It can only ever be empty if the caller sent a bare honorific,
    -- and every comparison against it is guarded on that below — an empty needle would
    -- otherwise make `like '' || '%'` true for every row and flatten the whole ranking.
    select lower(coalesce(q, '')) as raw,
           regexp_replace(lower(coalesce(q, '')), '^(mount|mt\.?|the)\s+', '') as bare
  ),
  hit as (
    -- The match predicate is UNCHANGED from 0015. This migration reorders and counts what
    -- comes back; it must not change which areas are considered a match, or a search that
    -- worked yesterday starts coming back empty for reasons no release note explains.
    select a.id, a.name, a.area_type, a.route_count, a.parent_id,
           lower(a.name) as lname,
           regexp_replace(lower(a.name), '^(mount|mt\.?|the)\s+', '') as bname
      from areas a
      join areas root on root.id = root_id
     where a.path <@ root.path
       and a.id <> root_id
       and a.name ilike '%' || q || '%'
  ),
  scored as (
    select h.*,
           case
             when h.lname = n.raw then 100
             when n.bare <> '' and (h.bname = n.raw or h.lname = n.bare or h.bname = n.bare) then 90
             when h.lname like n.raw || '%' then 80
             when n.bare <> '' and (h.bname like n.raw || '%' or h.lname like n.bare || '%') then 70
             -- A word-boundary hit ("North Ridge" inside "Direct North Ridge") beats a
             -- mid-word one ("goode" inside "No-Gooders"). Approximated with LIKE rather
             -- than a regex on purpose: `q` is raw user input and would have to be
             -- regex-escaped, which Postgres has no built-in for at this version.
             when h.lname like '% ' || n.raw || '%' then 60
             else 10
           end as score,
           count(*) over () as total
      from hit h, needle n
  )
  select s.id, s.name, s.area_type, s.route_count, s.parent_id, pa.name as parent_name, s.total
    from scored s
    left join areas pa on pa.id = s.parent_id
   order by s.score desc, s.route_count desc nulls last, s.name
   limit lim;
$$;

grant execute on function areas_in_subtree(text, text, int) to anon, authenticated, service_role;

commit;

-- Verify as SEPARATE statements (a pasted script is one transaction):
--
--   select p.oid::regprocedure::text from pg_proc p where p.proname = 'areas_in_subtree';
--   -- expect exactly 1 row: areas_in_subtree(text,text,integer)
--
--   select name, route_count, total from areas_in_subtree('washington', 'mount', 5);
--   -- expect Mount Rainier / Mount Baker / Mount Stuart at the top, total = 216
