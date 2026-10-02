-- 0239: "Free this weekend" -- a status partners can see.
--
-- availability (0209) says when a climber is USUALLY free. free_until says they are free NOW:
-- the menu's "Free this weekend" switch writes the coming Sunday's date here, and partner rows
-- show the badge while free_until >= today. It expires on its own, so a stale status needs no
-- clean-up job; switching it off writes null.
--
-- Both partner searches return it, so they are dropped and re-created (a RETURNS TABLE change
-- cannot go through CREATE OR REPLACE). The bodies are the live definitions with the one column
-- added; grants are unchanged: signed-in climbers only.

alter table public.profiles add column if not exists free_until date;

drop function if exists public.partners_near(double precision, double precision, integer, integer);
drop function if exists public.partners_by_objective(text[], text, double precision, double precision, integer, integer);

CREATE OR REPLACE FUNCTION public.partners_near(p_lat double precision, p_lng double precision, p_radius_mi integer, p_limit integer DEFAULT 24)
 RETURNS TABLE(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb, sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean, availability text[], avail_week text[], hiking_speed_ft_hr integer, free_until date, dist_mi integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  r double precision := least(greatest(coalesce(p_radius_mi, 50), 10), 500);
  n integer := least(greatest(coalesce(p_limit, 24), 1), 50);
begin
  if auth.uid() is null then raise exception 'sign in to search for partners'; end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'a valid origin is required';
  end if;
  return query
    with d as (
      select p.*, 3958.8 * 2 * asin(sqrt(
               power(sin(radians(z.lat - p_lat) / 2), 2)
             + cos(radians(p_lat)) * cos(radians(z.lat)) * power(sin(radians(z.lng - p_lng) / 2), 2))) as miles
      from profiles p
      join profile_zips pz on pz.user_id = p.id
      join zip_centroids z on z.zip = pz.zip
      where p.discoverable = true and p.id <> auth.uid() and not profile_owner_blocked_me(p.id)
    )
    select d.id, d.name, d.username, d.avatar, d.bio, d.location, d.disciplines,
           d.sport_grade, d.trad_grade, d.boulder_grade, d.show_name, d.resume_public,
           d.availability, d.avail_week, d.hiking_speed_ft_hr, d.free_until,
           (greatest(1, ceil(d.miles / 5.0)) * 5)::integer as dist_mi
    from d where d.miles <= r order by d.miles, d.id limit n;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partners_by_objective(p_route_ids text[] DEFAULT NULL::text[], p_area_id text DEFAULT NULL::text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_radius_mi integer DEFAULT NULL::integer, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb, sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean, availability text[], avail_week text[], hiking_speed_ft_hr integer, free_until date, dist_mi integer, shared_route_ids text[], shared_count integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
           d.availability, d.avail_week, d.hiking_speed_ft_hr, d.free_until,
           case when d.miles is null then null else (greatest(1, ceil(d.miles / 5.0)) * 5)::integer end,
           d.ids[1:20], d.cnt
    from d
    where p_lat is null or (d.miles is not null and d.miles <= r)
    order by d.cnt desc, d.miles nulls last, d.id
    limit n;
end;
$function$;

revoke all on function public.partners_near(double precision, double precision, integer, integer) from public, anon;
grant execute on function public.partners_near(double precision, double precision, integer, integer) to authenticated, service_role;
revoke all on function public.partners_by_objective(text[], text, double precision, double precision, integer, integer) from public, anon;
grant execute on function public.partners_by_objective(text[], text, double precision, double precision, integer, integer) to authenticated, service_role;
