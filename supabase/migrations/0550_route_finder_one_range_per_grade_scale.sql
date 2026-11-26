-- 0550: the Route finder takes ONE GRADE RANGE PER SCALE, all at once.
--
-- Owner's note (2026-11-26): "For filtering by Alpine climbs, we should probably allow them to filter
-- by many types of grades. I.e. they want to climb 5.7 to 5.9 YDS and only want easy snow grade."
-- Until now a search held one range on one scale (grade_sys + min_grade + max_grade), so an alpine
-- climber could ask for 5.7-5.9 OR for Easy Snow, never both.
--
-- `grade_ranges` is a JSON object, one entry per scale: {"yds":[7,9.9],"snow":[null,1]}, each bound a
-- number on gradeNumFrom's line (lib/grade.js) or null for open. Scales: yds (5.x free grade), class,
-- v, wi (WI/AI), m, aid (A/C), snow (Easy 1 / Mod. 2 / Steep 3), nccs (commitment Grade I-VII).
--
-- THE RULE (route_grade_fits). A climb passes when
--   1. it carries a grade on AT LEAST ONE of the scales searched,
--   2. every searched scale it carries a grade on is inside that scale's range, and
--   3. every range with a MINIMUM is carried: "5.7 and up" asks for a 5.7, which a climb with no
--      free grade does not have.
-- So a range with no minimum ("up to Easy Snow") is a CAP: a climb with no snow grade still passes
-- it. That is what the owner's example needs: 64 of the 4,313 alpine routes carry a snow grade
-- (static snapshot, 2026-11-26), so "5.7-5.9 AND Easy snow" read strictly would leave almost nothing,
-- while "5.7-5.9, and no snow harder than Easy" is the question being asked. With ONE range set the
-- rule is exactly the old one: the climb must carry that scale, inside the range.
--
-- Which number a scale reads:
--   yds   grade_num on a 5.x-graded row (and on sport/trad/toprope/rock, which never needed the label);
--         otherwise rock_grade_num, NEW HERE: the 5.x free grade an ice, mixed, aid or alpine route
--         carries beside a headline on another scale ("5.7 WI3 Easy Snow", "C3" with a 5.8 free
--         grade). Filled by scripts/oneoff/backfill-rock-grade-num.mjs with gradeNumFrom(, "yds"),
--         the one parser, rather than a SQL copy of it.
--   class grade_num on a Class-graded row.   v  grade_num on a boulder or V-graded row.
--   wi / m / aid / snow  the per-scale column (0206, 0246), else grade_num when the row's own scale is it.
--   nccs  commitment_num(commitment): the roman numeral the `commitment` column opens with
--         ("III", "II-III" -> the higher, "Grade IV"); prose there ("Day trip ...") is no grade.
--
-- grade_sys / min_grade / max_grade still work, so a bundle cached before this deploy keeps
-- searching; the app sends grade_ranges from now on. A parameter is ADDED, so the old signatures
-- are dropped first: two overloads would make PostgREST's named-argument call ambiguous.
-- Bodies otherwise copied verbatim from 0538 (list) and 0398 (count).

alter table public.routes add column if not exists rock_grade_num numeric;
comment on column public.routes.rock_grade_num is
  'The 5.x free grade (gradeNumFrom scale) of a route whose headline grade is on another scale; null when grade_system = ''yds'' (grade_num holds it). Read by route_grade_fits (0550).';

create or replace function public.commitment_num(t text) returns numeric
language sql immutable parallel safe as $$
  select case upper(coalesce(
      (regexp_match(t, '^\s*(?:grade\s+)?(VII|VI|IV|V|III|II|I)\M\+?(?:\s*[-/–]\s*(VII|VI|IV|V|III|II|I)\M)?', 'i'))[2],
      (regexp_match(t, '^\s*(?:grade\s+)?(VII|VI|IV|V|III|II|I)\M', 'i'))[1]))
    when 'I' then 1 when 'II' then 2 when 'III' then 3 when 'IV' then 4 when 'V' then 5 when 'VI' then 6 when 'VII' then 7 end
$$;

-- Scale order everywhere below: 1 yds, 2 class, 3 v, 4 wi, 5 m, 6 aid, 7 snow, 8 nccs.
create or replace function public.grade_ranges_on(g jsonb) returns boolean[]
language sql immutable parallel safe as $$
  select case when g is null or jsonb_typeof(g) <> 'object'
      or not (g ?| array['yds', 'class', 'v', 'wi', 'm', 'aid', 'snow', 'nccs']) then null
    else array[g ? 'yds', g ? 'class', g ? 'v', g ? 'wi', g ? 'm', g ? 'aid', g ? 'snow', g ? 'nccs'] end
$$;

create or replace function public.grade_ranges_bound(g jsonb, i int) returns numeric[]
language sql immutable parallel safe as $$
  select case when g is null or jsonb_typeof(g) <> 'object' then null else array[
    (g->'yds'->>i)::numeric, (g->'class'->>i)::numeric, (g->'v'->>i)::numeric, (g->'wi'->>i)::numeric,
    (g->'m'->>i)::numeric, (g->'aid'->>i)::numeric, (g->'snow'->>i)::numeric, (g->'nccs'->>i)::numeric] end
$$;

-- One scale's test: not searched, or (rule 2+3) carried inside the range, or not carried and no minimum.
create or replace function public.grade_in(searched boolean, v numeric, lo numeric, hi numeric) returns boolean
language sql immutable parallel safe as $$
  select not searched or (v is null and lo is null) or (v is not null and (lo is null or v >= lo) and (hi is null or v <= hi))
$$;

-- One boolean expression, so the planner can inline it into both finder functions. The eight
-- values are spelled out twice (once for "carried", once for "inside") for the same reason.
create or replace function public.route_grade_fits(
  disc text, gs text, gn numeric, rk numeric, ice numeric, mix numeric, aid numeric, snow numeric, commit text,
  o boolean[], lo numeric[], hi numeric[]
) returns boolean language sql immutable parallel safe as $$
  select coalesce(
    (
      (o[1] and (case when disc in ('sport', 'trad', 'toprope', 'rock') or gs = 'yds' then gn else rk end) is not null)
      or (o[2] and (case when gs = 'class' then gn end) is not null)
      or (o[3] and (case when disc = 'bouldering' or gs = 'v' then gn end) is not null)
      or (o[4] and coalesce(ice, case when gs = 'wi' then gn end) is not null)
      or (o[5] and coalesce(mix, case when gs = 'm' then gn end) is not null)
      or (o[6] and coalesce(aid, case when gs = 'aid' then gn end) is not null)
      or (o[7] and coalesce(snow, case when gs = 'snow' then gn end) is not null)
      or (o[8] and commitment_num(commit) is not null)
    )
    and grade_in(o[1], case when disc in ('sport', 'trad', 'toprope', 'rock') or gs = 'yds' then gn else rk end, lo[1], hi[1])
    and grade_in(o[2], case when gs = 'class' then gn end, lo[2], hi[2])
    and grade_in(o[3], case when disc = 'bouldering' or gs = 'v' then gn end, lo[3], hi[3])
    and grade_in(o[4], coalesce(ice, case when gs = 'wi' then gn end), lo[4], hi[4])
    and grade_in(o[5], coalesce(mix, case when gs = 'm' then gn end), lo[5], hi[5])
    and grade_in(o[6], coalesce(aid, case when gs = 'aid' then gn end), lo[6], hi[6])
    and grade_in(o[7], coalesce(snow, case when gs = 'snow' then gn end), lo[7], hi[7])
    and grade_in(o[8], commitment_num(commit), lo[8], hi[8]),
  false)
$$;

drop function if exists public.routes_in_subtree(text, text, text, numeric, numeric, numeric, integer, integer, integer, text, integer, integer, text, integer, integer, numeric, numeric, integer, integer, double precision, double precision, numeric);
drop function if exists public.routes_in_subtree_count(text, text, text, numeric, numeric, numeric, integer, integer, integer, text, integer, integer, numeric, numeric, integer, integer, double precision, double precision, numeric);

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
  within_km numeric default null,
  grade_ranges jsonb default null
)
returns setof routes language plpgsql stable set plan_cache_mode = force_custom_plan as $$
declare
  -- 0550: one range per grading scale, decoded ONCE (see route_grade_fits).
  g_on boolean[] := grade_ranges_on(grade_ranges);
  g_lo numeric[] := grade_ranges_bound(grade_ranges, 0);
  g_hi numeric[] := grade_ranges_bound(grade_ranges, 1);
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
    and (g_on is null or route_grade_fits(x.discipline, x.grade_system, x.grade_num, x.rock_grade_num, x.ice_grade_num, x.mixed_grade_num, x.aid_grade_num, x.snow_grade_num, x.commitment, g_on, g_lo, g_hi))
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
    case when sort_by = 'classic' then r.classic end desc nulls last,
    case when sort_by = 'classic' then r.classic_score end desc nulls last,
    case when sort_by = 'classic' then r.stars end desc nulls last,
    case when sort_by = 'len_desc' then r.length_m end desc nulls last,
    case when sort_by = 'len_asc' then r.length_m end asc nulls last,
    case when sort_by = 'pitches_desc' then nullif(r.pitches, 0) end desc nulls last,
    case when sort_by = 'gain_desc' then route_gain_ft(r.gain_ft, r.itinerary) end desc nulls last,
    case when sort_by = 'gain_asc' then route_gain_ft(r.gain_ft, r.itinerary) end asc nulls last,
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
    and (g_on is null or route_grade_fits(r.discipline, r.grade_system, r.grade_num, r.rock_grade_num, r.ice_grade_num, r.mixed_grade_num, r.aid_grade_num, r.snow_grade_num, r.commitment, g_on, g_lo, g_hi))
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
    case when sort_by = 'classic' then r.classic end desc nulls last,
    case when sort_by = 'classic' then r.classic_score end desc nulls last,
    case when sort_by = 'classic' then r.stars end desc nulls last,
    case when sort_by = 'len_desc' then r.length_m end desc nulls last,
    case when sort_by = 'len_asc' then r.length_m end asc nulls last,
    case when sort_by = 'pitches_desc' then nullif(r.pitches, 0) end desc nulls last,
    case when sort_by = 'gain_desc' then route_gain_ft(r.gain_ft, r.itinerary) end desc nulls last,
    case when sort_by = 'gain_asc' then route_gain_ft(r.gain_ft, r.itinerary) end asc nulls last,
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
  within_km numeric default null,
  grade_ranges jsonb default null
)
returns bigint language plpgsql stable set plan_cache_mode = force_custom_plan as $$
declare
  -- 0550: one range per grading scale, decoded ONCE (see route_grade_fits).
  g_on boolean[] := grade_ranges_on(grade_ranges);
  g_lo numeric[] := grade_ranges_bound(grade_ranges, 0);
  g_hi numeric[] := grade_ranges_bound(grade_ranges, 1);
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
    and (g_on is null or route_grade_fits(x.discipline, x.grade_system, x.grade_num, x.rock_grade_num, x.ice_grade_num, x.mixed_grade_num, x.aid_grade_num, x.snow_grade_num, x.commitment, g_on, g_lo, g_hi))
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
    and (g_on is null or route_grade_fits(r.discipline, r.grade_system, r.grade_num, r.rock_grade_num, r.ice_grade_num, r.mixed_grade_num, r.aid_grade_num, r.snow_grade_num, r.commitment, g_on, g_lo, g_hi))
    and (min_elev_ft is null or ra.elevation_ft >= min_elev_ft)
    and (min_prom_ft is null or ra.prominence_ft >= min_prom_ft)
    and (not has_r or km_between(near_lat, near_lng, ra.lat, ra.lng) <= within_km)
  );
end
$$;

grant execute on function public.routes_in_subtree(text, text, text, numeric, numeric, numeric, integer, integer, integer, text, integer, integer, text, integer, integer, numeric, numeric, integer, integer, double precision, double precision, numeric, jsonb) to anon, authenticated;
grant execute on function public.routes_in_subtree_count(text, text, text, numeric, numeric, numeric, integer, integer, integer, text, integer, integer, numeric, numeric, integer, integer, double precision, double precision, numeric, jsonb) to anon, authenticated;
