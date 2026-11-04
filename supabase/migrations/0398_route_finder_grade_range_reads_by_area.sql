-- 0398: a GRADE RANGE in the Route finder no longer times out on a region.
--
-- Measured 2026-11-04 (live, as the app's `anon` role): Sport + Trad, 5.6-5.10, on each of the
-- three largest regions of WA, CA, CO and UT (Central-East Cascades, Joshua Tree, Boulder,
-- Wasatch ...) returned 57014 "statement timeout" after 3 s, list AND count. The same search
-- with no grade range answered in ~0.1 s, and as the `postgres` role the grade-range search
-- took 19 ms.
--
-- Why: `anon` does not bypass RLS. Under RLS the planner may not apply a qual built on a
-- non-LEAKPROOF operator ahead of the policy, and numeric >= / <= (numeric_ge, numeric_le) are
-- not leakproof while text = is. So for each of a region's ~800 areas it chose
-- routes_grade_idx (every 5.6-5.10 route in the whole catalog) and filtered that by area_id,
-- 800 times over, instead of routes_area_idx (a handful of rows per area) filtered by grade.
--
-- Fix: compare `grade_num + 0`, which no index matches, so the per-area lateral always reads
-- routes_area_idx; the name-search branch the same way, where the trigram index on name_search
-- is the selective one. Results are unchanged (x + 0 = x for every numeric; null stays null).
-- grade_num is the only Route finder filter column with a btree index on routes (the ice/mixed/
-- aid/snow numbers, stars, length and pitches have none), so it is the only comparison changed.
-- Bodies otherwise copied verbatim from 0369.

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
  grade_sys text default null,
  min_gain_ft int default null,
  max_gain_ft int default null,
  min_trip_km numeric default null,
  max_trip_km numeric default null,
  min_elev_ft int default null,
  min_prom_ft int default null,
  near_lat double precision default null,
  near_lng double precision default null,
  within_km numeric default null
)
returns setof routes language plpgsql stable set plan_cache_mode = force_custom_plan as $$
declare
  -- Split ONCE into a variable: inline, string_to_array() made the planner re-evaluate it per row
  -- (a crag took 9 s instead of 0.34 s, measured 2026-10-21).
  discs text[] := string_to_array(nullif(disc, ''), ',');
  -- A radius needs both a point and a distance; a point alone still sorts by distance.
  has_pt boolean := near_lat is not null and near_lng is not null;
  has_r boolean := near_lat is not null and near_lng is not null and within_km is not null;
  dlat double precision := coalesce(within_km, 0) / 111.0;
  dlng double precision := coalesce(within_km, 0) / greatest(1.0, 111.0 * cos(radians(coalesce(near_lat, 0))));
begin
  if q is null or btrim(q) = '' then
    return query
  with ra as materialized (
    select a.id, a.name, case when has_pt and a.lat is not null then km_between(near_lat, near_lng, a.lat, a.lng) end as km
    from areas a
    join areas root on root.id = root_id
    where a.path <@ root.path
      and (min_elev_ft is null or a.elevation_ft >= min_elev_ft)
      and (min_prom_ft is null or a.prominence_ft >= min_prom_ft)
      -- the box first (cheap), then the circle
      and (not has_r or (a.lat between near_lat - dlat and near_lat + dlat and a.lng between near_lng - dlng and near_lng + dlng
        and km_between(near_lat, near_lng, a.lat, a.lng) <= within_km))
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
        and (min_grade is null or x.grade_num + 0 >= min_grade)
        and (max_grade is null or x.grade_num + 0 <= max_grade)
    end)
    and (min_stars is null or coalesce(x.stars, 0) = 0 or x.stars >= min_stars)
    and (min_pitches is null or coalesce(nullif(x.pitches, 0),
         case when x.discipline = 'bouldering' then 0 else 1 end) >= min_pitches)
    and (min_length_m is null or x.length_m >= min_length_m)
    and (max_length_m is null or x.length_m <= max_length_m)
    and (min_gain_ft is null or route_gain_ft(x.gain_ft, x.itinerary) >= min_gain_ft)
    and (max_gain_ft is null or route_gain_ft(x.gain_ft, x.itinerary) <= max_gain_ft)
    and (min_trip_km is null or route_trip_km(x.dist_km, x.outing_shape, x.itinerary) >= min_trip_km)
    and (max_trip_km is null or route_trip_km(x.dist_km, x.outing_shape, x.itinerary) <= max_trip_km)
    offset 0
  ) r
  order by
    case when sort_by = 'near' then ra.km end asc nulls last,
    case when sort_by in ('area', 'lr', 'rl', 'near') then ra.name end asc nulls last,
    case when sort_by in ('area', 'lr', 'rl', 'near') then ra.id end asc,
    case when sort_by in ('lr', 'near') then r.sort_order end asc nulls last,
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
        and (min_grade is null or r.grade_num + 0 >= min_grade)
        and (max_grade is null or r.grade_num + 0 <= max_grade)
    end)
    and (min_stars is null or coalesce(r.stars, 0) = 0 or r.stars >= min_stars)
    and (min_pitches is null or coalesce(nullif(r.pitches, 0),
         case when r.discipline = 'bouldering' then 0 else 1 end) >= min_pitches)
    and (min_length_m is null or r.length_m >= min_length_m)
    and (max_length_m is null or r.length_m <= max_length_m)
    and (min_gain_ft is null or route_gain_ft(r.gain_ft, r.itinerary) >= min_gain_ft)
    and (max_gain_ft is null or route_gain_ft(r.gain_ft, r.itinerary) <= max_gain_ft)
    and (min_trip_km is null or route_trip_km(r.dist_km, r.outing_shape, r.itinerary) >= min_trip_km)
    and (max_trip_km is null or route_trip_km(r.dist_km, r.outing_shape, r.itinerary) <= max_trip_km)
    and (min_elev_ft is null or ra.elevation_ft >= min_elev_ft)
    and (min_prom_ft is null or ra.prominence_ft >= min_prom_ft)
    and (not has_r or km_between(near_lat, near_lng, ra.lat, ra.lng) <= within_km)
  order by
    case when sort_by = 'near' and has_pt then km_between(near_lat, near_lng, ra.lat, ra.lng) end asc nulls last,
    case when sort_by in ('area', 'lr', 'rl', 'near') then ra.name end asc nulls last,
    case when sort_by in ('area', 'lr', 'rl', 'near') then ra.id end asc,
    case when sort_by in ('lr', 'near') then r.sort_order end asc nulls last,
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
  grade_sys text default null,
  min_gain_ft int default null,
  max_gain_ft int default null,
  min_trip_km numeric default null,
  max_trip_km numeric default null,
  min_elev_ft int default null,
  min_prom_ft int default null,
  near_lat double precision default null,
  near_lng double precision default null,
  within_km numeric default null
)
returns bigint language plpgsql stable set plan_cache_mode = force_custom_plan as $$
declare
  discs text[] := string_to_array(nullif(disc, ''), ',');
  has_r boolean := near_lat is not null and near_lng is not null and within_km is not null;
  dlat double precision := coalesce(within_km, 0) / 111.0;
  dlng double precision := coalesce(within_km, 0) / greatest(1.0, 111.0 * cos(radians(coalesce(near_lat, 0))));
begin
  if q is null or btrim(q) = '' then
    return (
  with ra as materialized (
    select a.id from areas a
    join areas root on root.id = root_id
    where a.path <@ root.path
      and (min_elev_ft is null or a.elevation_ft >= min_elev_ft)
      and (min_prom_ft is null or a.prominence_ft >= min_prom_ft)
      and (not has_r or (a.lat between near_lat - dlat and near_lat + dlat and a.lng between near_lng - dlng and near_lng + dlng
        and km_between(near_lat, near_lng, a.lat, a.lng) <= within_km))
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
        and (min_grade is null or x.grade_num + 0 >= min_grade)
        and (max_grade is null or x.grade_num + 0 <= max_grade)
    end)
    and (min_stars is null or coalesce(x.stars, 0) = 0 or x.stars >= min_stars)
    and (min_pitches is null or coalesce(nullif(x.pitches, 0),
         case when x.discipline = 'bouldering' then 0 else 1 end) >= min_pitches)
    and (min_length_m is null or x.length_m >= min_length_m)
    and (max_length_m is null or x.length_m <= max_length_m)
    and (min_gain_ft is null or route_gain_ft(x.gain_ft, x.itinerary) >= min_gain_ft)
    and (max_gain_ft is null or route_gain_ft(x.gain_ft, x.itinerary) <= max_gain_ft)
    and (min_trip_km is null or route_trip_km(x.dist_km, x.outing_shape, x.itinerary) >= min_trip_km)
    and (max_trip_km is null or route_trip_km(x.dist_km, x.outing_shape, x.itinerary) <= max_trip_km)
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
        and (min_grade is null or r.grade_num + 0 >= min_grade)
        and (max_grade is null or r.grade_num + 0 <= max_grade)
    end)
    and (min_stars is null or coalesce(r.stars, 0) = 0 or r.stars >= min_stars)
    and (min_pitches is null or coalesce(nullif(r.pitches, 0),
         case when r.discipline = 'bouldering' then 0 else 1 end) >= min_pitches)
    and (min_length_m is null or r.length_m >= min_length_m)
    and (max_length_m is null or r.length_m <= max_length_m)
    and (min_gain_ft is null or route_gain_ft(r.gain_ft, r.itinerary) >= min_gain_ft)
    and (max_gain_ft is null or route_gain_ft(r.gain_ft, r.itinerary) <= max_gain_ft)
    and (min_trip_km is null or route_trip_km(r.dist_km, r.outing_shape, r.itinerary) >= min_trip_km)
    and (max_trip_km is null or route_trip_km(r.dist_km, r.outing_shape, r.itinerary) <= max_trip_km)
    and (min_elev_ft is null or ra.elevation_ft >= min_elev_ft)
    and (min_prom_ft is null or ra.prominence_ft >= min_prom_ft)
    and (not has_r or km_between(near_lat, near_lng, ra.lat, ra.lng) <= within_km)
  );
end
$$;

grant execute on function public.routes_in_subtree(text, text, text, numeric, numeric, numeric, integer, integer, integer, text, integer, integer, text, integer, integer, numeric, numeric, integer, integer, double precision, double precision, numeric) to anon, authenticated;
grant execute on function public.routes_in_subtree_count(text, text, text, numeric, numeric, numeric, integer, integer, integer, text, integer, integer, numeric, numeric, integer, integer, double precision, double precision, numeric) to anon, authenticated;
