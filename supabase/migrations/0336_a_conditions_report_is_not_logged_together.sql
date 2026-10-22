-- 0336 — A conditions report is not a climb "logged the same day".
--
-- The route page's PAIRS WELL WITH section prints "Logged the same day by N climbers" from
-- route_logged_with (0223, widened by 0269): other routes the same climber has a climb_logs row
-- on, on the same date. A "Conditions only" report (tick_type 'Conditions') is a climb_logs row
-- too, so a climber who climbed one route and reported the road or the snow on a second paired
-- the two as a day's climbing. 0235, 0323 and 0333 already settled that a conditions report is
-- not a climb; this applies the same rule here, on both sides of the join.
--
-- Body is the LIVE definition (pg_get_functiondef, 2026-10-21) with the two tick_type lines added.
-- create or replace keeps every grant.

CREATE OR REPLACE FUNCTION public.route_logged_with(p_route_id text, p_limit integer DEFAULT 5)
 RETURNS TABLE(route_id text, climbers integer)
 LANGUAGE sql
 STABLE
AS $function$
  select b.route_id, count(distinct a.user_id)::int as climbers
  from climb_logs a
  join climb_logs b
    on b.user_id = a.user_id
   and b.date_climbed = a.date_climbed
   and b.route_id <> a.route_id
  where a.route_id = p_route_id
    and a.date_climbed is not null
    and a.trip_report_visibility in ('public', 'crew', 'friends')
    and b.trip_report_visibility in ('public', 'crew', 'friends')
    and a.tick_type is distinct from 'Conditions'
    and b.tick_type is distinct from 'Conditions'
  group by b.route_id
  order by climbers desc, b.route_id
  limit greatest(1, least(p_limit, 20));
$function$;
