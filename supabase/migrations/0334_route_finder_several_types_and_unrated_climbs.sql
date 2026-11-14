-- 0334: the Route finder takes SEVERAL disciplines at once, and a star minimum no longer hides the
-- climbs nobody has rated (owner, 2026-10-21: "you should be able to select both trad and sport";
-- "we probably need to still show them routes that fit the other filters").
--
-- disc: a comma-separated list ("sport,trad"), split once into `discs`, as Mountain Project's Route Finder lets you tick Trad,
-- Sport and Toprope together. One discipline is a one-item list, so every caller that passes a
-- single discipline reads exactly as before.
--
-- min_stars: hides a climb RATED below the minimum; a climb with no rating (stars null or 0) still
-- shows. Measured 2026-10-21: 2 of 90,084 sport climbs carry a star rating, so the old rule
-- (coalesce(stars,0) >= min_stars) turned a 5.6-5.10 sport search in Washington from 3,240 climbs
-- into 0. The finder says, beside the control, that unrated climbs are still shown.
--
-- Only those two predicates change from 0332 (routes_in_subtree) and 0246 (routes_in_subtree_count);
-- signatures, grants, ordering and every other filter are untouched. lib/offline.js mirrors both.
--
-- AND A BROWSE STARTS FROM THE AREA, NOT THE CATALOG. With no name typed, the planner chose to walk
-- routes_grade_idx across EVERY state (80,226 rows for 5.6-5.10a) and join the subtree afterwards,
-- so Sport + Trad 5.6-5.10a in Central-East Cascades hit the 3 s anon statement timeout (measured
-- 2026-10-21; Sport alone happened to plan well). A browse now materialises the subtree's areas
-- and reads each one's routes through routes_area_idx (a LATERAL with OFFSET 0, so it is not
-- flattened back into the same hash join): Washington, Sport + Trad 5.6-5.11, 180 ms of route reads.
-- A name search keeps 0244/0245's plan unchanged, which leads with the name index.

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
returns setof routes language plpgsql stable set plan_cache_mode = force_custom_plan as $$
declare
  -- Split ONCE into a variable: inline, string_to_array() made the planner re-evaluate it per row
  -- (a crag took 9 s instead of 0.34 s, measured 2026-10-21).
  discs text[] := string_to_array(nullif(disc, ''), ',');
begin
  if q is null or btrim(q) = '' then
    return query
  with ra as materialized (
    select a.id, a.name from areas a
    join areas root on root.id = root_id
    where a.path <@ root.path
  )
  select r.* from ra cross join lateral (
    select x.* from routes x
    where x.area_id = ra.id
    and (discs is null or x.discipline = any (discs))
    and (case
      when grade_sys = 'wi' then x.ice_grade_num is not null and (min_grade is null or x.ice_grade_num >= min_grade) and (max_grade is null or x.ice_grade_num <= max_grade)
      when grade_sys = 'm' then x.mixed_grade_num is not null and (min_grade is null or x.mixed_grade_num >= min_grade) and (max_grade is null or x.mixed_grade_num <= max_grade)
      when grade_sys = 'aid' then x.aid_grade_num is not null and (min_grade is null or x.aid_grade_num >= min_grade) and (max_grade is null or x.aid_grade_num <= max_grade)
      when grade_sys = 'snow' then x.snow_grade_num is not null and (min_grade is null or x.snow_grade_num >= min_grade) and (max_grade is null or x.snow_grade_num <= max_grade)
      else (grade_sys is null or grade_sys = '' or x.grade_system = grade_sys)
        and (min_grade is null or x.grade_num >= min_grade)
        and (max_grade is null or x.grade_num <= max_grade)
    end)
    and (min_stars is null or coalesce(x.stars, 0) = 0 or x.stars >= min_stars)
    and (min_pitches is null or coalesce(nullif(x.pitches, 0),
         case when x.discipline = 'bouldering' then 0 else 1 end) >= min_pitches)
    and (min_length_m is null or x.length_m >= min_length_m)
    and (max_length_m is null or x.length_m <= max_length_m)
    offset 0
  ) r
  order by
    case when sort_by in ('area', 'lr', 'rl') then ra.name end asc nulls last,
    case when sort_by in ('area', 'lr', 'rl') then ra.id end asc,
    case when sort_by = 'lr' then r.sort_order end asc nulls last,
    case when sort_by = 'rl' then r.sort_order end desc nulls last,
    case when sort_by = 'grade_asc' then r.grade_num end asc nulls last,
    case when sort_by = 'grade_desc' then r.grade_num end desc nulls last,
    case when sort_by = 'stars_desc' then r.stars end desc nulls last,
    case when sort_by = 'name_desc' then r.name end desc,
    r.name asc
  limit lim offset off;
    return;
  end if;

  return query

  select r.* from routes r
  join areas ra on ra.id = r.area_id
  join areas root on root.id = root_id
  where ra.path <@ root.path
    and (q is null or q = '' or coalesce(r.name_search, search_norm(r.name)) like all (search_patterns(q)))
    and (search_lead_pattern(q) is null or r.name_search like search_lead_pattern(q))
    and (discs is null or r.discipline = any (discs))
    and (case
      when grade_sys = 'wi' then r.ice_grade_num is not null and (min_grade is null or r.ice_grade_num >= min_grade) and (max_grade is null or r.ice_grade_num <= max_grade)
      when grade_sys = 'm' then r.mixed_grade_num is not null and (min_grade is null or r.mixed_grade_num >= min_grade) and (max_grade is null or r.mixed_grade_num <= max_grade)
      when grade_sys = 'aid' then r.aid_grade_num is not null and (min_grade is null or r.aid_grade_num >= min_grade) and (max_grade is null or r.aid_grade_num <= max_grade)
      when grade_sys = 'snow' then r.snow_grade_num is not null and (min_grade is null or r.snow_grade_num >= min_grade) and (max_grade is null or r.snow_grade_num <= max_grade)
      else (grade_sys is null or grade_sys = '' or r.grade_system = grade_sys)
        and (min_grade is null or r.grade_num >= min_grade)
        and (max_grade is null or r.grade_num <= max_grade)
    end)
    and (min_stars is null or coalesce(r.stars, 0) = 0 or r.stars >= min_stars)
    and (min_pitches is null or coalesce(nullif(r.pitches, 0),
         case when r.discipline = 'bouldering' then 0 else 1 end) >= min_pitches)
    and (min_length_m is null or r.length_m >= min_length_m)
    and (max_length_m is null or r.length_m <= max_length_m)
  order by
    case when sort_by in ('area', 'lr', 'rl') then ra.name end asc nulls last,
    case when sort_by in ('area', 'lr', 'rl') then ra.id end asc,
    case when sort_by = 'lr' then r.sort_order end asc nulls last,
    case when sort_by = 'rl' then r.sort_order end desc nulls last,
    case when sort_by = 'grade_asc' then r.grade_num end asc nulls last,
    case when sort_by = 'grade_desc' then r.grade_num end desc nulls last,
    case when sort_by = 'stars_desc' then r.stars end desc nulls last,
    case when sort_by = 'name_desc' then r.name end desc,
    r.name asc
  limit lim offset off;
end
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
returns bigint language plpgsql stable set plan_cache_mode = force_custom_plan as $$
declare
  -- Split ONCE into a variable: inline, string_to_array() made the planner re-evaluate it per row
  -- (a crag took 9 s instead of 0.34 s, measured 2026-10-21).
  discs text[] := string_to_array(nullif(disc, ''), ',');
begin
  if q is null or btrim(q) = '' then
    return (
  with ra as materialized (
    select a.id from areas a
    join areas root on root.id = root_id
    where a.path <@ root.path
  )
  select count(*) from ra cross join lateral (
    select 1 from routes x
    where x.area_id = ra.id
    and (discs is null or x.discipline = any (discs))
    and (case
      when grade_sys = 'wi' then x.ice_grade_num is not null and (min_grade is null or x.ice_grade_num >= min_grade) and (max_grade is null or x.ice_grade_num <= max_grade)
      when grade_sys = 'm' then x.mixed_grade_num is not null and (min_grade is null or x.mixed_grade_num >= min_grade) and (max_grade is null or x.mixed_grade_num <= max_grade)
      when grade_sys = 'aid' then x.aid_grade_num is not null and (min_grade is null or x.aid_grade_num >= min_grade) and (max_grade is null or x.aid_grade_num <= max_grade)
      when grade_sys = 'snow' then x.snow_grade_num is not null and (min_grade is null or x.snow_grade_num >= min_grade) and (max_grade is null or x.snow_grade_num <= max_grade)
      else (grade_sys is null or grade_sys = '' or x.grade_system = grade_sys)
        and (min_grade is null or x.grade_num >= min_grade)
        and (max_grade is null or x.grade_num <= max_grade)
    end)
    and (min_stars is null or coalesce(x.stars, 0) = 0 or x.stars >= min_stars)
    and (min_pitches is null or coalesce(nullif(x.pitches, 0),
         case when x.discipline = 'bouldering' then 0 else 1 end) >= min_pitches)
    and (min_length_m is null or x.length_m >= min_length_m)
    and (max_length_m is null or x.length_m <= max_length_m)
    offset 0
  ) r
    );
  end if;

  return (

  select count(*) from routes r
  join areas ra on ra.id = r.area_id
  join areas root on root.id = root_id
  where ra.path <@ root.path
    and (q is null or q = '' or coalesce(r.name_search, search_norm(r.name)) like all (search_patterns(q)))
    and (search_lead_pattern(q) is null or r.name_search like search_lead_pattern(q))
    and (discs is null or r.discipline = any (discs))
    and (case
      when grade_sys = 'wi' then r.ice_grade_num is not null and (min_grade is null or r.ice_grade_num >= min_grade) and (max_grade is null or r.ice_grade_num <= max_grade)
      when grade_sys = 'm' then r.mixed_grade_num is not null and (min_grade is null or r.mixed_grade_num >= min_grade) and (max_grade is null or r.mixed_grade_num <= max_grade)
      when grade_sys = 'aid' then r.aid_grade_num is not null and (min_grade is null or r.aid_grade_num >= min_grade) and (max_grade is null or r.aid_grade_num <= max_grade)
      when grade_sys = 'snow' then r.snow_grade_num is not null and (min_grade is null or r.snow_grade_num >= min_grade) and (max_grade is null or r.snow_grade_num <= max_grade)
      else (grade_sys is null or grade_sys = '' or r.grade_system = grade_sys)
        and (min_grade is null or r.grade_num >= min_grade)
        and (max_grade is null or r.grade_num <= max_grade)
    end)
    and (min_stars is null or coalesce(r.stars, 0) = 0 or r.stars >= min_stars)
    and (min_pitches is null or coalesce(nullif(r.pitches, 0),
         case when r.discipline = 'bouldering' then 0 else 1 end) >= min_pitches)
    and (min_length_m is null or r.length_m >= min_length_m)
    and (max_length_m is null or r.length_m <= max_length_m)
  );
end
$$;
