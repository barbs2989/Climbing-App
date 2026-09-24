-- SEARCH FORGIVES HOW A NAME IS SPELLED: "mt baker" finds Mount Baker.
--
-- Every DB-backed search box matched `name ilike '%' || q || '%'` — the typed string, verbatim,
-- as one contiguous substring. The catalog spells the same word several ways, so whichever way
-- a climber typed it, half the catalog was unreachable. Measured on the live `areas` table
-- before this migration:
--
--   243 names start "Mount …" and 149 start "Mt …"      -> either spelling misses the other
--   "mt baker"          1 area  (a highway, "Bellingham and Mt Baker Hwy") — never Mount Baker
--   "mount st helens"   0 areas                          (it is "Mount St. Helens")
--   1,910 names carry an apostrophe                     -> "bobs wall" cannot reach "Bob's Wall"
--   118 names carry an accented or non-ASCII letter
--   routes "north ridge"  95 hits; 224 once "N Ridge" / word order are forgiven
--
-- The client-side seed matcher (`_norm` + `fuzzyMatch` in ClimbMatchCore.jsx) already expanded
-- mt -> mount; the database never did, so the same words found a peak in the demo and nothing
-- in the real catalog.
--
-- WHAT CHANGES
--
-- 1. `search_clean(t)`: lowercase, fold accents, drop apostrophes, every other run of
--    punctuation becomes ONE space. "Mt. St. Helens" -> "mt st helens".
-- 2. `search_forms(word)`: one table of spellings that mean the same word. It returns the
--    CANONICAL form first, then the aliases: 'mt' -> 'mount mt'. This table is mirrored in
--    lib/search.js (SEARCH_FORMS) and `check:search-norm` fails the build if they diverge,
--    because the global route search tokenises in JS and the RPCs tokenise here.
-- 3. `search_norm(name)` = every word replaced by ALL its forms. "Mt Baker" -> "mount mt baker".
--    Stored as `name_search` on `areas` and `routes`, kept current by a BEFORE INSERT OR UPDATE
--    OF name trigger, with a trigram index.
--
--    NOT A GENERATED COLUMN, and that was tried first. `add column … generated always … stored`
--    rewrites the table under ACCESS EXCLUSIVE, and on 205k routes it ran past the Management
--    API's 100 s limit (HTTP 524) while every read of `routes` from the live app queued behind
--    it. Before that, altering `areas` then `routes` in sequence deadlocked (40P01) against a
--    live reader holding them in the opposite order. Both attempts rolled back cleanly.
--    A plain nullable column is added without a rewrite; the backfill is ordinary UPDATEs, which
--    take row locks and block no reader, and fire none of the existing triggers (every one is
--    scoped to area_id / discipline / parent_id / id). The RPCs read
--    `coalesce(name_search, search_norm(name))`, so they are correct during the backfill and for
--    any row a future path writes around the trigger.
-- 4. A query MATCHES when every word of `search_clean(q)` appears somewhere in `name_search`.
--    Word order and punctuation stop mattering, and because the NAME carries every form rather
--    than the query being rewritten, a half-typed word still works: "mount st" still reaches
--    Mount Stuart ("st" is a substring of "stuart") AND Mount St. Helens ("st" is a form).
--    Rewriting the query instead (st -> saint) is what the obvious fix does, and it would make
--    "mount st" stop finding Stuart halfway through the word.
-- 5. Nothing that matched before stops matching. A contiguous substring of the old name is
--    still a set of substrings of the cleaned words — the one exception is a query that is
--    nothing but punctuation, which now has no words and matches everything, exactly as the
--    empty query always did.
-- 6. When nothing matches at all, `areas_in_subtree` falls back to trigram word similarity, so
--    "mt rainer" or "shucksan" still reaches the peak. It is a FALLBACK, never blended in: a
--    query that works keeps its exact result set and its `total`.
--
-- Ranking in areas_in_subtree is the 0147 ladder unchanged, compared on CANONICAL forms
-- (`search_canon`) instead of lowercased raw strings, so "mt baker" is an EXACT match (90) for
-- "Mount Baker" rather than falling through to a mid-word hit.
--
-- routes_in_subtree / _count: the LIVE signatures carry a trailing `grade_sys` parameter that no
-- migration file records (added out of band; the app never passes it). They are replaced with
-- that exact 13/10-argument list so this cannot leave a second overload behind — the PGRST203
-- ambiguity 0162 had to clean up. Bodies are the live `prosrc`, with the one `q` line changed.

begin;

create or replace function search_clean(t text) returns text
language sql immutable parallel safe as $$
  select btrim(regexp_replace(regexp_replace(replace(
    translate(lower(coalesce(t, '')),
      'áàâäãåāéèêëēíìîïīóòôöõøōúùûüūñçýÿ',
      'aaaaaaaeeeeeiiiiiooooooouuuuuncyy'),
    '&', ' and '),
    '[''’‘`´]', '', 'g'),
    '[^a-z0-9]+', ' ', 'g'))
$$;

-- CANONICAL FORM FIRST. search_canon takes the first word of this; search_norm takes all of it.
-- Single-letter compass points map one way only: 'n' already occurs inside 'north', so listing
-- it as an alias of north would add nothing.
create or replace function search_forms(w text) returns text
language sql immutable parallel safe as $$
  select case w
    when 'mount' then 'mount mt'           when 'mt' then 'mount mt'
    when 'mountain' then 'mountain mtn'    when 'mtn' then 'mountain mtn'
    when 'mountains' then 'mountains mtns' when 'mtns' then 'mountains mtns'
    when 'saint' then 'saint st'           when 'st' then 'saint st'
    when 'peak' then 'peak pk'             when 'pk' then 'peak pk'
    when 'northeast' then 'northeast ne'   when 'ne' then 'northeast ne'
    when 'northwest' then 'northwest nw'   when 'nw' then 'northwest nw'
    when 'southeast' then 'southeast se'   when 'se' then 'southeast se'
    when 'southwest' then 'southwest sw'   when 'sw' then 'southwest sw'
    when 'n' then 'north n'                when 's' then 'south s'
    when 'e' then 'east e'                 when 'w' then 'west w'
    else w end
$$;

create or replace function search_norm(t text) returns text
language sql immutable parallel safe as $$
  select coalesce(string_agg(search_forms(u.w), ' ' order by u.i), '')
    from unnest(string_to_array(search_clean(t), ' ')) with ordinality as u(w, i)
   where u.w <> ''
$$;

create or replace function search_canon(t text) returns text
language sql immutable parallel safe as $$
  select coalesce(string_agg(split_part(search_forms(u.w), ' ', 1), ' ' order by u.i), '')
    from unnest(string_to_array(search_clean(t), ' ')) with ordinality as u(w, i)
   where u.w <> ''
$$;

-- '%word%' for every word of the query. Cleaned words are [a-z0-9] only, so no LIKE escaping
-- is needed — a `%` or `_` typed by the climber is punctuation and never reaches a pattern.
create or replace function search_patterns(q text) returns text[]
language sql immutable parallel safe as $$
  select coalesce(array_agg('%' || w || '%'), '{}')
    from unnest(string_to_array(search_clean(q), ' ')) as w
   where w <> ''
$$;

-- Both tables in ONE lock statement: altering them one after the other deadlocked against a live
-- reader. No rewrite happens (nullable, no default), so the lock is held for milliseconds.
set local lock_timeout = '5s';
lock table routes, areas in access exclusive mode;

alter table areas  add column if not exists name_search text;
alter table routes add column if not exists name_search text;

create or replace function set_name_search() returns trigger
language plpgsql as $$
begin
  new.name_search := search_norm(new.name);
  return new;
end $$;

drop trigger if exists trg_areas_name_search on areas;
create trigger trg_areas_name_search before insert or update of name, name_search on areas
  for each row execute function set_name_search();
drop trigger if exists trg_routes_name_search on routes;
create trigger trg_routes_name_search before insert or update of name, name_search on routes
  for each row execute function set_name_search();

create or replace function areas_in_subtree(
  root_id text,
  q text,
  lim int default 40
)
returns table(id text, name text, area_type text, route_count int, parent_id text, parent_name text, total bigint)
language sql stable as $$
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
  hit as (
    select h.*, search_canon(h.name) as lname,
           regexp_replace(search_canon(h.name), '^(mount|the) ', '') as bname
      from (select * from strict union all select * from fuzzy) h
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

create or replace function routes_in_subtree(
  root_id text,
  q text default null,
  disc text default null,
  min_grade numeric default null,
  max_grade numeric default null,
  min_stars numeric default null,
  min_pitches int default null,
  min_length_m int default null,
  max_length_m int default null,
  sort_by text default 'name',
  lim int default 50,
  off int default 0,
  grade_sys text default null
)
returns setof routes language sql stable as $$
  select r.* from routes r
  join areas ra on ra.id = r.area_id
  join areas root on root.id = root_id
  where ra.path <@ root.path
    and (q is null or q = '' or coalesce(r.name_search, search_norm(r.name)) like all (search_patterns(q)))
    and (disc is null or disc = '' or r.discipline = disc)
    and (grade_sys is null or grade_sys = '' or r.grade_system = grade_sys)
    and (min_grade is null or r.grade_num >= min_grade)
    and (max_grade is null or r.grade_num <= max_grade)
    and (min_stars is null or coalesce(r.stars, 0) >= min_stars)
    and (min_pitches is null or coalesce(nullif(r.pitches, 0),
         case when r.discipline = 'bouldering' then 0 else 1 end) >= min_pitches)
    and (min_length_m is null or r.length_m >= min_length_m)
    and (max_length_m is null or r.length_m <= max_length_m)
  order by
    case when sort_by = 'area' then ra.name end asc nulls last,
    case when sort_by = 'grade_asc' then r.grade_num end asc nulls last,
    case when sort_by = 'grade_desc' then r.grade_num end desc nulls last,
    case when sort_by = 'stars_desc' then r.stars end desc nulls last,
    case when sort_by = 'name_desc' then r.name end desc,
    r.name asc
  limit lim offset off;
$$;

create or replace function routes_in_subtree_count(
  root_id text,
  q text default null,
  disc text default null,
  min_grade numeric default null,
  max_grade numeric default null,
  min_stars numeric default null,
  min_pitches int default null,
  min_length_m int default null,
  max_length_m int default null,
  grade_sys text default null
)
returns bigint language sql stable as $$
  select count(*) from routes r
  join areas ra on ra.id = r.area_id
  join areas root on root.id = root_id
  where ra.path <@ root.path
    and (q is null or q = '' or coalesce(r.name_search, search_norm(r.name)) like all (search_patterns(q)))
    and (disc is null or disc = '' or r.discipline = disc)
    and (grade_sys is null or grade_sys = '' or r.grade_system = grade_sys)
    and (min_grade is null or r.grade_num >= min_grade)
    and (max_grade is null or r.grade_num <= max_grade)
    and (min_stars is null or coalesce(r.stars, 0) >= min_stars)
    and (min_pitches is null or coalesce(nullif(r.pitches, 0),
         case when r.discipline = 'bouldering' then 0 else 1 end) >= min_pitches)
    and (min_length_m is null or r.length_m >= min_length_m)
    and (max_length_m is null or r.length_m <= max_length_m);
$$;

-- The GLOBAL route search (useRouteSearch) filters through PostgREST, which cannot express a
-- similarity operator — so its typo fallback is this. Called only after every strict leg came
-- back empty.
--
-- TWO index-backed prefilters, then the real test. Supabase refuses `set
-- pg_trgm.word_similarity_threshold` on a function (42501), so the operators run at their
-- defaults, and neither default alone is enough. Measured on real typos:
--   "shucksan" -> Mount Shuksan   word_similarity 0.55, similarity 0.32  (<% at 0.6 misses it)
--   "stuard"   -> Mount Stuart    word_similarity 0.71, similarity 0.29  (%  at 0.3 misses it)
-- `<%` OR `%` catches both, and `word_similarity >= 0.5` is the threshold actually applied.
-- Near-misses do get in — "rainer" also reaches Rainy Pass (0.57) — and are ordered below the
-- better match (Mount Rainier, 0.70) rather than refused.
create or replace function search_names_fuzzy(q text, lim int default 8)
returns table(kind text, id text, name text, path text, sim real)
language sql stable
as $$
  with n as (select search_clean(q) as c)
  (select 'area'::text, a.id, a.name, a.path::text, word_similarity(n.c, a.name_search)
     from areas a, n
    where n.c <> '' and (n.c <% a.name_search or n.c % a.name_search)
      and word_similarity(n.c, a.name_search) >= 0.5 and coalesce(a.route_count, 0) > 0
    order by 5 desc, a.route_count desc nulls last
    limit lim)
  union all
  (select 'route'::text, r.id, r.name, null::text, word_similarity(n.c, r.name_search)
     from routes r, n
    where n.c <> '' and (n.c <% r.name_search or n.c % r.name_search)
      and word_similarity(n.c, r.name_search) >= 0.5
    order by 5 desc
    limit lim)
$$;

grant execute on function search_clean(text), search_forms(text), search_norm(text), search_canon(text),
  search_patterns(text) to anon, authenticated, service_role;
grant execute on function areas_in_subtree(text, text, int) to anon, authenticated, service_role;
grant execute on function search_names_fuzzy(text, int) to anon, authenticated, service_role;

commit;

-- ── BACKFILL — run OUTSIDE the transaction above, repeated until it reports 0 rows ──────────
-- Batched because one UPDATE over 205k routes outlives the Management API's 100 s request limit,
-- and a dropped request rolls its whole transaction back. Writing '' (not the value) lets the
-- trigger compute it, so search_norm runs once per row. Readers are never blocked.
--
--   update areas  set name_search = '' where id in (select id from areas  where name_search is null limit 20000);
--   update routes set name_search = '' where id in (select id from routes where name_search is null limit 20000);
--
-- ── INDEXES — after the backfill. Each its own statement: CONCURRENTLY cannot run in a
-- transaction, and it keeps writes flowing while it builds.
--
--   create index concurrently if not exists areas_name_search_trgm  on areas  using gin (name_search gin_trgm_ops);
--   create index concurrently if not exists routes_name_search_trgm on routes using gin (name_search gin_trgm_ops);

-- Verify as SEPARATE statements:
--   select count(*) from routes where name_search is null;   -- expect 0 once backfilled
--   select count(*) from pg_proc where proname in ('routes_in_subtree','routes_in_subtree_count','areas_in_subtree');
--   -- expect 3: no overload left behind
--   select name from areas_in_subtree('washington', 'mt baker', 3);      -- Mount Baker first
--   select name from areas_in_subtree('washington', 'mt rainer', 3);     -- fuzzy: Mount Rainier
--   select count(*) from routes_in_subtree_count('washington', 'north ridge');
