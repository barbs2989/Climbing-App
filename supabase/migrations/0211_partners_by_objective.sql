-- Partners → Search for partners by My Objectives / By Route / By Area reached REAL climbers
-- nowhere: all three filtered the example CLIMBERS only, so a real climber who had saved the very
-- route you picked could not be found through it. This is the door onto that search.
--
-- partners_by_objective(route ids, area, origin?, radius?) returns the same columns as
-- partners_near (0209), plus which of the climber's objectives matched and how many:
--   * p_route_ids  — "My Objectives" passes the caller's own objective ids, "By Route" passes one.
--   * p_area_id    — "By Area": any objective whose route is filed ANYWHERE under that area, so a
--                    state finds a climber whose objective sits three levels down (ltree <@).
--   * p_lat/p_lng/p_radius_mi — optional; the same origin and 10-500 mi clamp as partners_near,
--                    and dist_mi is rounded up to 5 miles exactly as there. Without an origin,
--                    dist_mi is null and nobody is excluded for having no zip.
-- Same listing rules as partners_near: signed in, discoverable, not the caller, not a climber who
-- has blocked the caller. The caller's OWN blocks are filtered client-side, as they are there.
--
-- objectives is already public-read (0031); this does not widen what can be read, it applies the
-- discoverable opt-out and the block list to a search that would otherwise have to go around them.

drop function if exists public.partners_by_objective(text[], text, double precision, double precision, integer, integer);
create function public.partners_by_objective(
  p_route_ids text[] default null, p_area_id text default null,
  p_lat double precision default null, p_lng double precision default null,
  p_radius_mi integer default null, p_limit integer default 50)
returns table(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb,
              sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean,
              availability text[], avail_week text[], hiking_speed_ft_hr integer, dist_mi integer,
              shared_route_ids text[], shared_count integer)
language plpgsql stable security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  n integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  r double precision := least(greatest(coalesce(p_radius_mi, 50), 10), 500);
  apath ltree;
begin
  if auth.uid() is null then raise exception 'sign in to search for partners'; end if;
  if p_route_ids is null and p_area_id is null then raise exception 'a route or an area is required'; end if;
  if coalesce(array_length(p_route_ids, 1), 0) > 500 then raise exception 'too many routes'; end if;
  if p_area_id is not null then
    select a.path into apath from areas a where a.id = p_area_id;
    if apath is null then raise exception 'unknown area'; end if;
  end if;
  if (p_lat is null) <> (p_lng is null)
     or (p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180)) then
    raise exception 'a valid origin is required';
  end if;
  return query
    with m as (
      select o.user_id, array_agg(o.route_id order by o.created_at desc) as ids, count(*)::integer as cnt
      from objectives o
      where o.user_id <> auth.uid()
        and (p_route_ids is null or o.route_id = any(p_route_ids))
        and (apath is null or exists (
              select 1 from routes rt join areas a on a.id = rt.area_id
              where rt.id = o.route_id and a.path <@ apath))
      group by o.user_id
    ), d as (
      select p.*, m.ids, m.cnt,
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
           d.ids[1:20], d.cnt
    from d
    where p_lat is null or (d.miles is not null and d.miles <= r)
    order by d.cnt desc, d.miles nulls last, d.id
    limit n;
end;
$function$;
revoke all on function public.partners_by_objective(text[], text, double precision, double precision, integer, integer) from public, anon;
grant execute on function public.partners_by_objective(text[], text, double precision, double precision, integer, integer) to authenticated, service_role;
