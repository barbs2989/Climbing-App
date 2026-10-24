-- 0369: the Route finder filters by ELEVATION GAIN, ROUND-TRIP DISTANCE, PEAK ELEVATION, PROMINENCE
-- and DISTANCE AWAY (owner, 2026-10-24: "You should be able to filter peaks and routes by
-- prominence, elevation gain, miles, etc when looking for climbs. Also by location and distance
-- away."). AllTrails filters length and elevation gain as ranges and offers "Distance away" as a
-- radius around you or a place you pick, sorted Closest; Peakbagger lists peaks by elevation and
-- prominence around a point. These are those controls, on the climbs this catalog holds.
--
-- WHAT EACH ONE READS -- the SAME arithmetic the route page prints, so a climb inside a "5-10 mi"
-- filter does not open on a page that says 14 mi:
--   * gain: route_gain_ft() = routeAscentFt() (ClimbMatchCore): gain_ft, else the sum of the
--     itinerary's day gains.
--   * round trip: route_trip_km() = the route page's headline distance (RouteDetail headlineDist +
--     lib/outing.js effDistKm): the itinerary's day miles when it states them, else dist_km --
--     already the whole outing on a recorded loop/point, otherwise one way and doubled. dist_km's
--     two conventions are NOT normalised here (route-identity.md): this reads them as the page does.
--   * peak elevation / prominence: the climb's own area (areas.elevation_ft / prominence_ft) --
--     the peak, for a peak route. A climb whose area has no such figure fails the filter, as an
--     ungraded climb fails a grade range; the finder says so beside the control.
--   * distance away: great-circle km from (near_lat, near_lng) to the climb's AREA coordinate,
--     which 315,716 of 315,734 climbs have (2026-10-24). sort_by 'near' orders closest first.
--
-- Coverage measured 2026-10-24: gain 885 climbs, distance 739, peak elevation 1,342, prominence
-- 996 -- nearly all of them mountain routes (alpine / mountaineering / scrambling). Distance away
-- reaches every climb with a coordinate.
--
-- The area-level filters (elevation, prominence, distance away) narrow the materialised subtree
-- BEFORE any route is read, so a radius around a town in a whole state stays a small read.
--
-- The signature grows, so the old functions are DROPPED first: create-or-replace with new
-- parameters would leave both overloads, and PostgREST refuses an ambiguous call. Every new
-- parameter defaults to null, so a caller that sends none reads exactly as 0334 did.
-- lib/offline.js mirrors both functions.

create or replace function km_between(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable parallel safe as $$
  select 2 * 6371.0088 * asin(least(1, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))))
$$;

-- routeAscentFt(): a positive gain_ft, else the itinerary's day gains (0 counts as none).
create or replace function route_gain_ft(gain_ft integer, itinerary jsonb)
returns numeric language sql immutable parallel safe as $$
  select case
    when gain_ft > 0 then gain_ft::numeric
    when jsonb_typeof(itinerary -> 'days') = 'array' then nullif((
      select sum(case when jsonb_typeof(d -> 'gainFt') = 'number' then (d ->> 'gainFt')::numeric else 0 end)
      from jsonb_array_elements(itinerary -> 'days') d), 0)
  end
$$;

-- The route page's headline trip distance in km. With day miles on at least half the days the
-- itinerary decides (effDistKm: whole trip on a loop/point, half of it otherwise -- doubled back
-- to the whole by the headline either way); else dist_km, whole on a loop/point, doubled otherwise.
create or replace function route_trip_km(dist_km numeric, outing_shape text, itinerary jsonb)
returns numeric language sql immutable parallel safe as $$
  select coalesce(
    case when jsonb_typeof(itinerary -> 'days') = 'array' and jsonb_array_length(itinerary -> 'days') > 0 then (
      select case when count(*) filter (where jsonb_typeof(d -> 'miles') = 'number') * 2 >= count(*)
        then nullif(sum(case when jsonb_typeof(d -> 'miles') = 'number' then (d ->> 'miles')::numeric else 0 end), 0) * 1.60934 end
      from jsonb_array_elements(itinerary -> 'days') d) end,
    case when dist_km > 0 then case when outing_shape in ('loop', 'point') then dist_km else dist_km * 2 end end)
$$;

drop function if exists routes_in_subtree(text, text, text, numeric, numeric, numeric, integer, integer, integer, text, integer, integer, text);
drop function if exists routes_in_subtree_count(text, text, text, numeric, numeric, numeric, integer, integer, integer, text);

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
        and (min_grade is null or x.grade_num >= min_grade)
        and (max_grade is null or x.grade_num <= max_grade)
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
        and (min_grade is null or r.grade_num >= min_grade)
        and (max_grade is null or r.grade_num <= max_grade)
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
        and (min_grade is null or x.grade_num >= min_grade)
        and (max_grade is null or x.grade_num <= max_grade)
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
        and (min_grade is null or r.grade_num >= min_grade)
        and (max_grade is null or r.grade_num <= max_grade)
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
