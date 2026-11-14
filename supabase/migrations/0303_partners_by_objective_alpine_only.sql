-- 0303: partners_by_objective counts only the objectives that still COUNT — a crag-route objective is a
-- tick list, not a partner signal (owner decision 2026-10-15; the rule 0300 wrote for
-- match_objectives_of_users, applied to the search itself).
--
-- My Objectives / By Route reach real climbers through this function (0211). Until now a climber who had
-- saved the same sport route as you was returned as a match — while the Partners tab, the area page and
-- the route page all say crag partners are found by AREA. Same signature, same columns, same visibility
-- and distance rules as 0211; only the objectives that qualify change:
--   * a route whose discipline is not crag-family (alpine, mountaineering, scrambling, ice, mixed, hiking…)
--   * OR a crag-family route filed on a PEAK (trad that climbs a peak is alpine — catOf's rule)
--   * a route the catalog does not hold (a seed id) no longer counts either; 0211 matched it by string.
-- p_area_id keeps its meaning (objectives filed under that subtree) for any caller that still passes one;
-- the Partners tab's By Area is listing-based (partners_in_area) since 0300 and passes none.
-- check:partner-areas pins the rule in this function's final body.

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
      join routes rt on rt.id = o.route_id
      join areas a on a.id = rt.area_id
      where o.user_id <> auth.uid()
        and (p_route_ids is null or o.route_id = any(p_route_ids))
        and (rt.discipline not in ('trad','sport','toprope','aid','bouldering') or a.area_type = 'peak')
        and (apath is null or a.path <@ apath)
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
