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
--
-- ZIP PRIVACY (0502): every OTHER climber’s zip centroid is snapped to the 0.1 degree grid (about 7 by 5 miles) before
-- any distance is taken or any row is ordered, exactly as partners_near does since 0502, so saving a series of zips and
-- calling this can recover at most a grid cell, never a zip. (The first version measured from the exact centroid and was
-- corrected before merging; review of #3901.) Climbers the CALLER blocked are left out here too, before the limit.
--
-- CLIMBERS WITH NO ZIP STILL SHOW (third review of #3901): the nearest p_limit climbers WITH a zip come first, then up
-- to 24 climbers with no zip -- a single limit with "nulls last" dropped every one of them once 50 had a zip, undoing
-- the point of #3869 (climbers without a zip are findable).

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
                 power(sin(radians((round(z.lat::numeric, 1))::double precision - me_lat) / 2), 2)
               + cos(radians(me_lat)) * cos(radians((round(z.lat::numeric, 1))::double precision)) * power(sin(radians((round(z.lng::numeric, 1))::double precision - me_lng) / 2), 2))) end as miles
      from profiles p
      left join profile_zips pz on pz.user_id = p.id
      left join zip_centroids z on z.zip = pz.zip
      where p.discoverable = true and p.id <> auth.uid() and not profile_owner_blocked_me(p.id)
        and not exists (select 1 from blocked_users b where b.blocker = auth.uid() and b.blocked = p.id)
    )
    select u.pid, u.dmi from (
      (select d.pid, (greatest(1, ceil(d.miles / 5.0)) * 5)::integer as dmi
         from d where d.miles is not null
        order by d.miles, d.pid
        limit n)
      union all
      (select d.pid, null::integer as dmi
         from d where d.miles is null
        order by d.pid
        limit 24)
    ) u
    order by u.dmi nulls last, u.pid;  -- a UNION ALL keeps no order of its own
end;
$function$;

revoke all on function public.partners_by_distance(integer) from public, anon;
grant execute on function public.partners_by_distance(integer) to authenticated, service_role;
