-- 0537: a log can say how the GRADE felt, and ROUTE STATS counts the answers (multipitch audit
-- proposal 5, approved in advance by the owner 2026-10-28).
--
-- WHY: UKC prints a grade-vote spread on every route page and theCrag records a grade opinion on each
-- logged ascent; Mountain Project lets a tick suggest a rating and lists the suggestions on its Stats
-- page. We had star votes only, and a route's grade changes only through three agreeing corrections
-- (guidebooks are the source of truth), so nothing told a climber that a 5.9 is widely called stiff.
--
-- WHAT: one nullable column, climb_logs.grade_feel in ('soft','right','stiff'), RELATIVE to the grade
-- the route page shows. Relative rather than a picked grade, so it means the same thing on every
-- scale (YDS, V, WI, Class) and cannot be read as a vote to change the stored grade: it never does.
-- route_stats returns the three counts as `grade_feel`; counts only, no names, like star_counts.
-- Everything 0535 returned is returned unchanged; `create or replace` keeps its grants.

begin;

alter table public.climb_logs
  add column if not exists grade_feel text
  constraint climb_logs_grade_feel_chk check (grade_feel in ('soft', 'right', 'stiff'));

comment on column public.climb_logs.grade_feel is
  'How the climber found the route''s shown grade: soft, right or stiff. Null = not stated. Never changes routes.grade.';

create or replace function public.route_stats(p_route text)
returns jsonb
language sql stable security definer set search_path = public, pg_temp
as $$
  with logs as (
    select l.user_id, l.date_climbed, l.tick_type, l.summited, l.outcome_reasons,
           l.car_to_car_minutes, l.party_size, l.grade_feel,
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
  ), c2c as (
    select car_to_car_minutes as m from logs
     where climb and car_to_car_minutes between 10 and 20160
  ), party as (
    select party_size as p from logs where climb and party_size between 1 and 30
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
                            on c.m = m.m),
    'tick_counts',     (select coalesce(jsonb_object_agg(t, n), '{}'::jsonb)
                          from (select tick_type as t, count(*) as n from logs
                                 where climb and tick_type is not null and tick_type <> ''
                                 group by 1) x),
    'summit_answers',  (select count(*) from logs where climb and summited is not null),
    'summits',         (select count(*) from logs where climb and summited),
    'turnback_reasons',(select coalesce(jsonb_object_agg(r, n), '{}'::jsonb)
                          from (select r, count(*) as n from logs, unnest(outcome_reasons) as r
                                 where climb and r is not null and r <> '' group by 1) x),
    'c2c_n',           (select count(*) from c2c),
    'c2c_median_min',  (select case when count(*) >= 3
                                    then round(percentile_cont(0.5) within group (order by m))::int end from c2c),
    'party_n',         (select count(*) from party),
    'grade_feel',      (select jsonb_build_object(
                          'soft',  count(*) filter (where grade_feel = 'soft'),
                          'right', count(*) filter (where grade_feel = 'right'),
                          'stiff', count(*) filter (where grade_feel = 'stiff'))
                          from logs where climb),
    'party_median',    (select case when count(*) >= 3
                                    then percentile_cont(0.5) within group (order by p) end from party)
  );
$$;

commit;
