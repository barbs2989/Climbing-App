-- The pitch filter hides 86% of the catalog on its mildest setting.
--
-- Measured against the live RPC on the `washington` subtree:
--
--     min_pitches = null  ->  8377 routes
--     min_pitches = 1     ->  1207 routes   <- "1+ (single)" drops 7170
--     min_pitches = 2     ->   452 routes
--
-- Cause: `coalesce(r.pitches, 1)` maps NULL to 1 but leaves 0 as 0, and the
-- catalog stores *both* as "unknown". In WA, 466 routes have pitches = NULL
-- (treated as single-pitch, so they pass "1+") while 7018 have pitches = 0
-- (treated as zero-pitch, so they fail even "1+"). Two spellings of the same
-- missing fact, filtered oppositely.
--
-- 0 is only meaningful for bouldering, where a problem genuinely has no
-- pitches -- 2343 of WA's 2346 boulder rows are 0. The other 4675 zeros are
-- roped routes (sport 2623, trad 2000) whose pitch count OpenBeta never
-- recorded.
--
-- Fix: normalise 0 to "unknown" for roped disciplines only, so it behaves the
-- way NULL already does. Boulder problems keep 0 and stay out of pitch
-- filters, which is correct -- they are not pitched climbs.
--
--     coalesce(nullif(r.pitches, 0),
--              case when r.discipline = 'bouldering' then 0 else 1 end)
--
--   roped, pitches = 0     -> nullif -> NULL -> 1   (was 0; now passes "1+")
--   roped, pitches = NULL  -> NULL          -> 1   (unchanged)
--   bouldering, pitches= 0 -> nullif -> NULL -> 0   (unchanged, still excluded)
--   any route, pitches = 5 -> 5                     (unchanged)
--
-- No route data is rewritten; this changes only how the filter reads a
-- missing value. Bodies are otherwise copied verbatim from 0019
-- (routes_in_subtree) and 0018 (routes_in_subtree_count) -- the single
-- min_pitches line differs.

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
    and (min_pitches is null or coalesce(nullif(r.pitches, 0),
         case when r.discipline = 'bouldering' then 0 else 1 end) >= min_pitches)
    and (min_length_m is null or r.length_m >= min_length_m)
    and (max_length_m is null or r.length_m <= max_length_m);
$$;

-- Verify. Expect roughly: null 8377 / 1+ ~6000 (was 1207) / 2+ 452 (unchanged).
-- "2+" must NOT move -- unknown counts as 1, so it never becomes multi-pitch.
select routes_in_subtree_count('washington', null, null, null, null, null, null)  as any_pitches,
       routes_in_subtree_count('washington', null, null, null, null, null, 1)     as one_plus,
       routes_in_subtree_count('washington', null, null, null, null, null, 2)     as two_plus;
