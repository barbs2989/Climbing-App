-- 0334: the Route finder takes SEVERAL disciplines at once, and a star minimum no longer hides the
-- climbs nobody has rated (owner, 2026-10-21: "you should be able to select both trad and sport";
-- "we probably need to still show them routes that fit the other filters").
--
-- disc: a comma-separated list ("sport,trad"), as Mountain Project's Route Finder lets you tick Trad,
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
begin
  return query

  select r.* from routes r
  join areas ra on ra.id = r.area_id
  join areas root on root.id = root_id
  where ra.path <@ root.path
    and (q is null or q = '' or coalesce(r.name_search, search_norm(r.name)) like all (search_patterns(q)))
    and (search_lead_pattern(q) is null or r.name_search like search_lead_pattern(q))
    and (disc is null or disc = '' or r.discipline = any (string_to_array(disc, ',')))
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
begin
  return (

  select count(*) from routes r
  join areas ra on ra.id = r.area_id
  join areas root on root.id = root_id
  where ra.path <@ root.path
    and (q is null or q = '' or coalesce(r.name_search, search_norm(r.name)) like all (search_patterns(q)))
    and (search_lead_pattern(q) is null or r.name_search like search_lead_pattern(q))
    and (disc is null or disc = '' or r.discipline = any (string_to_array(disc, ',')))
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
