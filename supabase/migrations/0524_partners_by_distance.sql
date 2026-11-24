-- 0524: partners_by_distance -- Partners › Everyone, nearest first, as ONE ordered read (owner 2026-11-24).
--
-- Everyone at Anywhere read `profiles` (discoverable, first 24) in no order, so once more than 24 climbers
-- are listed a climber with a zip could see nobody near them. A browser-side merge of that list with
-- partners_near took seven review rounds of timing bugs (#3895, closed); the owner chose to do it here.
--
-- Returns ONLY ids and a rounded distance, nearest first, climbers with no zip last. The app then reads
-- those profiles through the same select (and the same 0434 column rules) as the plain Everyone list,
-- so this function re-implements no profile privacy. Visibility matches the Everyone list and
-- partners_near: discoverable, not the caller, not a climber who blocked the caller.
--
-- The origin is the CALLER's own saved zip, looked up here. It takes no coordinates, so it cannot be
-- used to measure distances from an arbitrary point. No zip on file: every dist_mi is null (the app
-- does not call it then). Distances are rounded up to 5 mi, as partners_near rounds them.

create or replace function public.partners_by_distance(p_limit integer default 24)
returns table(id uuid, dist_mi integer)
language plpgsql stable security definer set search_path = public, pg_temp as $function$
declare
  n integer := least(greatest(coalesce(p_limit, 24), 1), 50);
  me_lat double precision;
  me_lng double precision;
begin
  if auth.uid() is null then raise exception 'sign in to search for partners'; end if;
  select z.lat, z.lng into me_lat, me_lng
    from profile_zips pz join zip_centroids z on z.zip = pz.zip
   where pz.user_id = auth.uid();
  return query
    with d as (
      select p.id as pid,
             case when me_lat is null or z.lat is null then null else 3958.8 * 2 * asin(sqrt(
                 power(sin(radians(z.lat - me_lat) / 2), 2)
               + cos(radians(me_lat)) * cos(radians(z.lat)) * power(sin(radians(z.lng - me_lng) / 2), 2))) end as miles
      from profiles p
      left join profile_zips pz on pz.user_id = p.id
      left join zip_centroids z on z.zip = pz.zip
      where p.discoverable = true and p.id <> auth.uid() and not profile_owner_blocked_me(p.id)
    )
    select d.pid,
           case when d.miles is null then null else (greatest(1, ceil(d.miles / 5.0)) * 5)::integer end
    from d
    order by d.miles nulls last, d.pid
    limit n;
end;
$function$;

revoke all on function public.partners_by_distance(integer) from public, anon;
grant execute on function public.partners_by_distance(integer) to authenticated, service_role;
