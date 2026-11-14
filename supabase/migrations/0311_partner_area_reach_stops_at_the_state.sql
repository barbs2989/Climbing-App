-- 0311: a listing at a STATE no longer reaches every crag in it.
--
-- 0300's reach is two-way on the area tree: searching T finds a listing INSIDE T (<@) or at an area that
-- CONTAINS T (@>), so "listed at Little Cottonwood" surfaces at Hellgate. Taken to the top, "listed at
-- Utah" surfaces at every Utah crag, canyon and range — hundreds of pages — ordered last and labelled
-- "listed across Utah", but still a row on every one of them. The 0300 header named this as the thing
-- to cap if it flooded. The cap is the state: an ancestor listing reaches down only when it sits BELOW
-- the state (region, range, canyon, crag, wall). A state listing still answers a search AT the state
-- (the <@ half: equal paths), so the Partners tab's By Area on "Utah" still finds it.
--
-- Same three readers as 0300, same signatures, columns, visibility and distance; only the predicate
-- gains `and la.area_type <> 'state'` on the @> half. check:partner-areas pins the predicate shape.

drop function if exists public.partners_in_area(text, double precision, double precision, integer, integer);
create function public.partners_in_area(
  p_area_id text, p_lat double precision default null, p_lng double precision default null,
  p_radius_mi integer default null, p_limit integer default 50)
returns table(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb,
              sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean,
              availability text[], avail_week text[], hiking_speed_ft_hr integer, dist_mi integer,
              listed_area_ids text[], listed_area_names text[], listed_area_paths text[], listed_disciplines text[],
              free_from date, free_to date, listed_above boolean)
language plpgsql stable security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  n integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  r double precision := least(greatest(coalesce(p_radius_mi, 50), 10), 500);
  tp ltree;
begin
  if auth.uid() is null then raise exception 'sign in to search for partners'; end if;
  select a.path into tp from areas a where a.id = p_area_id;
  if tp is null then raise exception 'unknown area'; end if;
  if (p_lat is null) <> (p_lng is null)
     or (p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180)) then
    raise exception 'a valid origin is required';
  end if;
  return query
    with lr as (
      select pa.user_id, pa.area_id, la.name as area_name, la.path as area_path, pa.disciplines as discs,
             case when pa.free_to is not null and pa.free_to >= current_date then pa.free_from end as ff,
             case when pa.free_to is not null and pa.free_to >= current_date then pa.free_to end as ft,
             (la.path @> tp and la.path <> tp) as above_t
      from partner_areas pa join areas la on la.id = pa.area_id
      where pa.user_id <> auth.uid() and (la.path <@ tp or (la.path @> tp and la.area_type <> 'state'))
    ), m as (
      select lr.user_id,
             array_agg(lr.area_id order by nlevel(lr.area_path) desc, lr.area_id) as ids,
             array_agg(lr.area_name order by nlevel(lr.area_path) desc, lr.area_id) as names,
             array_agg(lr.area_path::text order by nlevel(lr.area_path) desc, lr.area_id) as paths,
             (select array_agg(distinct x order by x) from lr lr2, unnest(lr2.discs) x where lr2.user_id = lr.user_id) as discs,
             (array_agg(lr.ff order by lr.ff nulls last))[1] as ff,
             (array_agg(lr.ft order by lr.ff nulls last))[1] as ft,
             bool_and(lr.above_t) as above_t
      from lr group by lr.user_id
    ), d as (
      select p.*, m.ids, m.names, m.paths, m.discs, m.ff, m.ft, m.above_t,
             case when p_lat is null or z.lat is null then null else 3958.8 * 2 * asin(sqrt(
                 power(sin(radians(z.lat - p_lat) / 2), 2)
               + cos(radians(p_lat)) * cos(radians(z.lat)) * power(sin(radians(z.lng - p_lng) / 2), 2))) end as miles
      from m
      join profiles p on p.id = m.user_id
      left join profile_zips pz on pz.user_id = p.id
      left join zip_centroids z on z.zip = pz.zip
      where p.discoverable = true and not profile_owner_blocked_me(p.id)
    )
    select d.id, d.name, d.username, d.avatar, d.bio, d.location, d.disciplines,
           d.sport_grade, d.trad_grade, d.boulder_grade, d.show_name, d.resume_public,
           d.availability, d.avail_week, d.hiking_speed_ft_hr,
           case when d.miles is null then null else (greatest(1, ceil(d.miles / 5.0)) * 5)::integer end,
           d.ids[1:10], d.names[1:10], d.paths[1:10], coalesce(d.discs, '{}'::text[]), d.ff, d.ft, d.above_t
    from d
    where p_lat is null or (d.miles is not null and d.miles <= r)
    order by d.above_t asc, d.miles nulls last, d.id
    limit n;
end;
$function$;
revoke all on function public.partners_in_area(text, double precision, double precision, integer, integer) from public, anon;
grant execute on function public.partners_in_area(text, double precision, double precision, integer, integer) to authenticated, service_role;

drop function if exists public.partners_for_my_areas(double precision, double precision, integer, integer);
create function public.partners_for_my_areas(
  p_lat double precision default null, p_lng double precision default null,
  p_radius_mi integer default null, p_limit integer default 50)
returns table(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb,
              sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean,
              availability text[], avail_week text[], hiking_speed_ft_hr integer, dist_mi integer,
              listed_area_ids text[], listed_area_names text[], listed_area_paths text[], listed_disciplines text[],
              free_from date, free_to date, listed_above boolean,
              shared_count integer, via_area_names text[])
language plpgsql stable security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  n integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  r double precision := least(greatest(coalesce(p_radius_mi, 50), 10), 500);
begin
  if auth.uid() is null then raise exception 'sign in to search for partners'; end if;
  if (p_lat is null) <> (p_lng is null)
     or (p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180)) then
    raise exception 'a valid origin is required';
  end if;
  return query
    with my as (
      select la.id as area_id, la.name as area_name, la.path as area_path
      from partner_areas pa join areas la on la.id = pa.area_id where pa.user_id = auth.uid()
    ), lr as (
      select pa.user_id, pa.area_id, la.name as area_name, la.path as area_path, pa.disciplines as discs,
             case when pa.free_to is not null and pa.free_to >= current_date then pa.free_from end as ff,
             case when pa.free_to is not null and pa.free_to >= current_date then pa.free_to end as ft,
             (la.path @> my.area_path and la.path <> my.area_path) as above_t,
             my.area_name as via_name
      from partner_areas pa
      join areas la on la.id = pa.area_id
      join my on (la.path <@ my.area_path or (la.path @> my.area_path and la.area_type <> 'state'))
      where pa.user_id <> auth.uid()
    ), m as (
      select lr.user_id,
             (select array_agg(q.area_id order by nlevel(q.area_path) desc, q.area_id) from (select distinct lr2.area_id, lr2.area_path from lr lr2 where lr2.user_id = lr.user_id) q) as ids,
             (select array_agg(q.area_name order by nlevel(q.area_path) desc, q.area_id) from (select distinct lr2.area_id, lr2.area_name, lr2.area_path from lr lr2 where lr2.user_id = lr.user_id) q) as names,
             (select array_agg(q.area_path::text order by nlevel(q.area_path) desc, q.area_id) from (select distinct lr2.area_id, lr2.area_path from lr lr2 where lr2.user_id = lr.user_id) q) as paths,
             (select array_agg(distinct x order by x) from lr lr2, unnest(lr2.discs) x where lr2.user_id = lr.user_id) as discs,
             (array_agg(lr.ff order by lr.ff nulls last))[1] as ff,
             (array_agg(lr.ft order by lr.ff nulls last))[1] as ft,
             bool_and(lr.above_t) as above_t,
             count(distinct lr.area_id)::integer as cnt,
             array_agg(distinct lr.via_name) as via
      from lr group by lr.user_id
    ), d as (
      select p.*, m.ids, m.names, m.paths, m.discs, m.ff, m.ft, m.above_t, m.cnt, m.via,
             case when p_lat is null or z.lat is null then null else 3958.8 * 2 * asin(sqrt(
                 power(sin(radians(z.lat - p_lat) / 2), 2)
               + cos(radians(p_lat)) * cos(radians(z.lat)) * power(sin(radians(z.lng - p_lng) / 2), 2))) end as miles
      from m
      join profiles p on p.id = m.user_id
      left join profile_zips pz on pz.user_id = p.id
      left join zip_centroids z on z.zip = pz.zip
      where p.discoverable = true and not profile_owner_blocked_me(p.id)
    )
    select d.id, d.name, d.username, d.avatar, d.bio, d.location, d.disciplines,
           d.sport_grade, d.trad_grade, d.boulder_grade, d.show_name, d.resume_public,
           d.availability, d.avail_week, d.hiking_speed_ft_hr,
           case when d.miles is null then null else (greatest(1, ceil(d.miles / 5.0)) * 5)::integer end,
           d.ids[1:10], d.names[1:10], d.paths[1:10], coalesce(d.discs, '{}'::text[]), d.ff, d.ft, d.above_t,
           d.cnt, d.via[1:10]
    from d
    where p_lat is null or (d.miles is not null and d.miles <= r)
    order by d.cnt desc, d.above_t asc, d.miles nulls last, d.id
    limit n;
end;
$function$;
revoke all on function public.partners_for_my_areas(double precision, double precision, integer, integer) from public, anon;
grant execute on function public.partners_for_my_areas(double precision, double precision, integer, integer) to authenticated, service_role;

drop function if exists public.partner_area_counts(text[]);
create function public.partner_area_counts(p_area_ids text[])
returns table(area_id text, listed_count integer)
language plpgsql stable security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is null then raise exception 'sign in to see who is listed'; end if;
  if coalesce(array_length(p_area_ids, 1), 0) > 50 then raise exception 'too many areas'; end if;
  return query
    select t.aid, (
      select count(distinct pa.user_id)::integer
      from partner_areas pa
      join areas la on la.id = pa.area_id
      join profiles p on p.id = pa.user_id
      where pa.user_id <> auth.uid()
        and (la.path <@ ta.path or (la.path @> ta.path and la.area_type <> 'state'))
        and p.discoverable = true and not profile_owner_blocked_me(p.id))
    from unnest(p_area_ids) as t(aid)
    join areas ta on ta.id = t.aid;
end;
$function$;
revoke all on function public.partner_area_counts(text[]) from public, anon;
grant execute on function public.partner_area_counts(text[]) to authenticated, service_role;
