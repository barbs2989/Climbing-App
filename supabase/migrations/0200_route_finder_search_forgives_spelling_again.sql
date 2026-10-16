-- The area route list forgives how a name is spelled again: "NE Buttress" finds Northeast Buttress.
--
-- 0190 (applied 11:16 on 2026-09-24) made routes_in_subtree / routes_in_subtree_count match
-- through `name_search`, so "ne", "mt", "st", apostrophes, accents and word order stop mattering.
-- 0196 (applied 17 minutes later) re-created both functions to add `grade_sys`, from bodies it
-- describes as "0074's verbatim" — i.e. from BEFORE 0190 — and so put back
-- `r.name ilike '%' || q || '%'`, one verbatim substring. Measured on the live database
-- 2026-09-24: areas_in_subtree and search_names_fuzzy were still forgiving; both route finders
-- were not. So typing "NE Buttress" in an area's route list found nothing, while the global
-- search found it.
--
-- Bodies are 0196's verbatim, with 0190's match line restored. Same argument lists, so this is a
-- plain replace: no overload, no drop. `check:search-norm` now fails the build if the newest
-- definition of any search function goes back to a verbatim ilike.

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

-- Grants: the finders are read by the anon role (the app is usable signed out).
grant execute on function public.routes_in_subtree(text, text, text, numeric, numeric, numeric, integer, integer, integer, text, integer, integer, text) to anon, authenticated;
grant execute on function public.routes_in_subtree_count(text, text, text, numeric, numeric, numeric, integer, integer, integer, text) to anon, authenticated;
