-- Snow grades in the route finder, as Mountain Project rates them (owner, 2026-10-04: "do what
-- mountain project does", for mountaineering too, with the Class grade kept).
--
-- MP rates snow on three steps, Easy Snow / Mod. Snow / Steep Snow, written into the grade text
-- beside any other grade ("AI2 Steep Snow", "5.7 Mod. Snow"). snow_grade_num holds that step as
-- 1 / 2 / 3, a fourth per-scale column beside 0206's ice/mixed/aid ones, so a route keeps its
-- primary grade (Class, 5.x, WI) on grade_num and is ALSO findable by its snow rating.
--
-- Filled from the grade text: a backfill here (434 rows on 2026-10-04) and a trigger for every
-- later insert or grade edit. The trigger only ever SETS a rating it can read, so a value written
-- directly (an import naming the snow rating of a route whose grade text is a Class) is kept.
--
-- The two search functions are 0245's bodies unchanged plus one 'snow' branch each.

alter table routes add column if not exists snow_grade_num numeric;

create or replace function snow_grade_step(g text) returns numeric language sql immutable as $$
  select case
    when g ~* '\msteep\s+snow' then 3
    when g ~* '\mmod(erate|\.)?\s+snow' then 2
    when g ~* '\measy\s+snow' then 1
  end::numeric
$$;

create or replace function routes_fill_snow_grade_num() returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  new.snow_grade_num := coalesce(snow_grade_step(new.grade), new.snow_grade_num);
  return new;
end
$$;

drop trigger if exists trg_routes_snow_grade_num on routes;
create trigger trg_routes_snow_grade_num before insert or update of grade, snow_grade_num on routes
  for each row execute function routes_fill_snow_grade_num();

update routes set snow_grade_num = snow_grade_step(grade)
where snow_grade_step(grade) is not null and snow_grade_num is distinct from snow_grade_step(grade);

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
      when grade_sys = 'snow' then r.snow_grade_num is not null and (min_grade is null or r.snow_grade_num >= min_grade) and (max_grade is null or r.snow_grade_num <= max_grade)
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
      when grade_sys = 'snow' then r.snow_grade_num is not null and (min_grade is null or r.snow_grade_num >= min_grade) and (max_grade is null or r.snow_grade_num <= max_grade)
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
