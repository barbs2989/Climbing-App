-- Extend routes_in_subtree / routes_in_subtree_count (0015) with the filter
-- dimensions the static RouteFinder already supports — grade range (via the
-- existing normalized grade_num column), minimum stars, minimum pitches,
-- length range, and sort — so the DB-catalog Route Finder can reach feature
-- parity with the static one instead of only filtering by search + discipline.
--
-- Deliberately NOT included:
--   - "popular" sort: the DB catalog has no per-route popularity signal
--     (no trip-report/activity count column on routes).
--   - "group by area": requires the full matching set client-side, which
--     doesn't fit the paginated design at 200k+ routes scale the way it does
--     for the static catalog's small in-memory ROUTES array.
--
-- All new parameters are optional with defaults, so existing callers using
-- the old (root_id, q, disc, lim, off) signature keep working unchanged.
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
  off int default 0
)
returns setof routes language sql stable as $$
  select r.* from routes r
  join areas ra on ra.id = r.area_id
  join areas root on root.id = root_id
  where ra.path <@ root.path
    and (q is null or q = '' or r.name ilike '%' || q || '%')
    and (disc is null or disc = '' or r.discipline = disc)
    and (min_grade is null or r.grade_num >= min_grade)
    and (max_grade is null or r.grade_num <= max_grade)
    and (min_stars is null or coalesce(r.stars, 0) >= min_stars)
    and (min_pitches is null or coalesce(r.pitches, 1) >= min_pitches)
    and (min_length_m is null or r.length_m >= min_length_m)
    and (max_length_m is null or r.length_m <= max_length_m)
  order by
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
  max_length_m int default null
)
returns bigint language sql stable as $$
  select count(*) from routes r
  join areas ra on ra.id = r.area_id
  join areas root on root.id = root_id
  where ra.path <@ root.path
    and (q is null or q = '' or r.name ilike '%' || q || '%')
    and (disc is null or disc = '' or r.discipline = disc)
    and (min_grade is null or r.grade_num >= min_grade)
    and (max_grade is null or r.grade_num <= max_grade)
    and (min_stars is null or coalesce(r.stars, 0) >= min_stars)
    and (min_pitches is null or coalesce(r.pitches, 1) >= min_pitches)
    and (min_length_m is null or r.length_m >= min_length_m)
    and (max_length_m is null or r.length_m <= max_length_m);
$$;
