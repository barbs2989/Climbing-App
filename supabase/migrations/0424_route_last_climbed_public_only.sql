-- route_stats(): last_climbed now reads PUBLIC logs only.
--
-- route_stats is SECURITY DEFINER and callable by anon (it backs the public route page), so it
-- reads climb_logs past RLS. Its counts are unattributed aggregates and stay as they were. But
-- last_climbed returned max(date_climbed) over EVERY visible log, private/crew/friends included:
-- on a route only one person has climbed, that is their private log's date, readable by anyone
-- holding the anon key. Found by check:rls rule 6's review (PR #3324). A date is now shown only
-- when a climb behind it is one RLS would let any visitor read (trip_report_visibility = 'public').
--
-- Body is 0371's, unchanged except the `public` column in `logs` and the last_climbed filter.
-- `create or replace` keeps 0371's grants (execute to anon, authenticated).

create or replace function public.route_stats(p_route text)
returns jsonb
language sql stable security definer set search_path = public, pg_temp
as $$
  with logs as (
    select l.user_id, l.date_climbed,
           (l.trip_report_visibility = 'public') as public,
           (l.tick_type is distinct from 'Conditions') as climb,
           (coalesce(l.tick_type, '') not in ('Attempt', 'Turned around', 'Fell', 'Hung', 'Project', 'Conditions')) as sent
      from climb_logs l
     where l.route_id = p_route and l.moderation = 'visible'
  ), header as (
    select rr.user_id, rr.stars from route_ratings rr where rr.route_id = p_route
  ), logged as (
    select distinct on (cl.user_id) cl.user_id, cl.stars::smallint as stars
      from climb_logs cl
     where cl.route_id = p_route and cl.stars between 1 and 5
       and cl.trip_report_visibility = 'public' and cl.moderation = 'visible'
       and not exists (select 1 from header h where h.user_id = cl.user_id)
     order by cl.user_id, cl.date_climbed desc nulls last, cl.created_at desc
  ), votes as (
    select stars from header union all select stars from logged
  ), views as (
    select count(*) as total,
           count(*) filter (where day > (now() at time zone 'utc')::date - 30) as last30,
           min(day) as since
      from route_views where route_id = p_route
  )
  select jsonb_build_object(
    'views_total',     (select total from views),
    'views_30d',       (select last30 from views),
    'views_since',     (select since from views),
    'climbs',          (select count(*) from logs where climb),
    'climbers',        (select count(distinct user_id) from logs where climb),
    'sends',           (select count(*) from logs where sent),
    'senders',         (select count(distinct user_id) from logs where sent),
    'climbers_12m',    (select count(distinct user_id) from logs where climb and date_climbed > current_date - 365),
    'senders_12m',     (select count(distinct user_id) from logs where sent and date_climbed > current_date - 365),
    'last_climbed',    (select max(date_climbed) from logs where climb and public),
    'objectives',      (select count(distinct o.user_id) from objectives o where o.route_id = p_route),
    'star_counts',     (select jsonb_build_array(
                          count(*) filter (where stars = 1), count(*) filter (where stars = 2),
                          count(*) filter (where stars = 3), count(*) filter (where stars = 4),
                          count(*) filter (where stars = 5)) from votes),
    'sends_by_month',  (select jsonb_agg(coalesce(c.n, 0) order by m.m)
                          from generate_series(1, 12) as m(m)
                          left join (select extract(month from date_climbed)::int as m, count(*) as n
                                       from logs where sent and date_climbed is not null group by 1) c
                            on c.m = m.m)
  );
$$;
