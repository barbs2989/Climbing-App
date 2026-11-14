-- 0371: ROUTE STATS says how many climbers logged / sent the climb in the PAST 12 MONTHS.
-- Owner note 2026-10-24: "How many people who have climbed that route and within a time frame?"
-- route_stats() (0353) gave lifetime counts and the last date only. It now also returns
-- climbers_12m and senders_12m: distinct climbers whose visible log (a Conditions report is not a
-- climb; a send is Ranks' definition, as 0353) is dated within the trailing 365 days. Trailing,
-- not calendar-year (Strava's "This Year"), so an alpine route in October still counts its summer
-- season. Same visibility rule as 0353: private logs count, unnamed. Everything else is unchanged.

create or replace function public.route_stats(p_route text)
returns jsonb
language sql stable security definer set search_path = public, pg_temp
as $$
  with logs as (
    select l.user_id, l.date_climbed,
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
    'last_climbed',    (select max(date_climbed) from logs where climb),
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
revoke all on function public.route_stats(text) from public;
grant execute on function public.route_stats(text) to anon, authenticated;
