-- 0244 made the name filter index-usable, and a state-wide search STILL timed out for anon.
--
-- 0244's comment assumed PostgREST inlines these SQL functions with CONSTANT arguments, so that
-- search_lead_pattern(q) folds to a literal the trigram index can serve. It does not: PostgREST
-- passes every argument as a subquery over its JSON payload, so q is unknown when the query is
-- planned, the `is null or like` clause cannot use the index, and the planner walks every area
-- again. Measured on production 2026-10-02 after 0244, with the arguments passed as subqueries
-- (warm cache): 500-830ms, seconds cold, and the anon RPC still returned 57014 statement timeout
-- (12s for "North Ridge (Complete)").
--
-- Fix: the same two bodies, unchanged, run from PL/pgSQL with plan_cache_mode = force_custom_plan.
-- PL/pgSQL plans its query with the arguments' actual VALUES, so search_lead_pattern(q) folds and
-- the index is used on every call (forced custom, so a cached generic plan never takes over).
-- Same subquery-argument test, same session: 21-34ms, identical row counts.
--
-- Signatures, defaults and return types are unchanged, so this is a plain replace and the grants
-- carry over; they are restated as 0206 and 0244 do. Both stay SECURITY INVOKER.

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
    and (disc is null or disc = '' or r.discipline = disc)
    and (case
      when grade_sys = 'wi' then r.ice_grade_num is not null and (min_grade is null or r.ice_grade_num >= min_grade) and (max_grade is null or r.ice_grade_num <= max_grade)
      when grade_sys = 'm' then r.mixed_grade_num is not null and (min_grade is null or r.mixed_grade_num >= min_grade) and (max_grade is null or r.mixed_grade_num <= max_grade)
      when grade_sys = 'aid' then r.aid_grade_num is not null and (min_grade is null or r.aid_grade_num >= min_grade) and (max_grade is null or r.aid_grade_num <= max_grade)
      else (grade_sys is null or grade_sys = '' or r.grade_system = grade_sys)
        and (min_grade is null or r.grade_num >= min_grade)
        and (max_grade is null or r.grade_num <= max_grade)
    end)
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
    and (disc is null or disc = '' or r.discipline = disc)
    and (case
      when grade_sys = 'wi' then r.ice_grade_num is not null and (min_grade is null or r.ice_grade_num >= min_grade) and (max_grade is null or r.ice_grade_num <= max_grade)
      when grade_sys = 'm' then r.mixed_grade_num is not null and (min_grade is null or r.mixed_grade_num >= min_grade) and (max_grade is null or r.mixed_grade_num <= max_grade)
      when grade_sys = 'aid' then r.aid_grade_num is not null and (min_grade is null or r.aid_grade_num >= min_grade) and (max_grade is null or r.aid_grade_num <= max_grade)
      else (grade_sys is null or grade_sys = '' or r.grade_system = grade_sys)
        and (min_grade is null or r.grade_num >= min_grade)
        and (max_grade is null or r.grade_num <= max_grade)
    end)
    and (min_stars is null or coalesce(r.stars, 0) >= min_stars)
    and (min_pitches is null or coalesce(nullif(r.pitches, 0),
         case when r.discipline = 'bouldering' then 0 else 1 end) >= min_pitches)
    and (min_length_m is null or r.length_m >= min_length_m)
    and (max_length_m is null or r.length_m <= max_length_m)
  );
end
$$;

grant execute on function public.routes_in_subtree(text, text, text, numeric, numeric, numeric, integer, integer, integer, text, integer, integer, text) to anon, authenticated;
grant execute on function public.routes_in_subtree_count(text, text, text, numeric, numeric, numeric, integer, integer, integer, text) to anon, authenticated;
