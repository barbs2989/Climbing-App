-- 0353 — ROUTE STATS on the route page: page views, logged sends, and the other counts a climber
-- reads before picking a line (owner, 2026-10-22: "add stats on number of logged sends, page views,
-- and explore other stats we can have on the route pages").
--
-- Modelled on Mountain Project's route sidebar ("Page Views: N total · N/month") and its Stats page
-- (star breakdown, ticks, "on N to-do lists"), and theCrag's ascents-by-month season chart.
-- Two places we do better than MP:
--   * A VIEW is one visitor, one route, one day — reloading a page does not inflate it. MP counts
--     page loads.
--   * "In the last 30 days" is a real 30-day window, not a lifetime average dressed as a rate.
--
-- route_views stores no account id: the visitor is md5 of the signed-in uid (server-side, from
-- auth.uid(), never trusted from the client) or of a random per-device key for a signed-out
-- visitor. Nothing reads a row of it; route_stats() returns counts only.
--
-- route_stats() counts EVERY visible climb_logs row on the route, private ones included, as
-- numbers with no author — Mountain Project's private-tick model, the same one 0329 uses for the
-- conditions. A send is what Ranks calls a send (0235): any climb but Attempt, Turned around, Fell,
-- Hung, Project or Conditions. A Conditions report is not a climb, so it is not a "logged climb".
-- The star breakdown is the SAME vote set as route_star_summary() (0294) — header rating, else the
-- climber's latest public report — so the bars add up to the "★ N rated" in the header.

create table if not exists route_views (
  route_id text not null references routes(id) on delete cascade,
  visitor text not null,
  day date not null default ((now() at time zone 'utc')::date),
  primary key (route_id, visitor, day)
);
create index if not exists route_views_route_day_idx on route_views (route_id, day);

alter table route_views enable row level security;
-- No policies on purpose: no client reads or writes a row. record_route_view() writes, route_stats()
-- counts; both are security definer.

create or replace function public.record_route_view(p_route text, p_device text default null)
returns void
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare v text;
begin
  if p_route is null or length(p_route) > 200 then return; end if;
  if auth.uid() is not null then
    v := md5('u:' || auth.uid()::text);
  elsif p_device is not null and length(p_device) between 16 and 64 then
    v := md5('d:' || p_device);
  else
    return;
  end if;
  insert into route_views (route_id, visitor)
  select p_route, v where exists (select 1 from routes r where r.id = p_route)
  on conflict do nothing;
end;
$$;
revoke all on function public.record_route_view(text, text) from public;
grant execute on function public.record_route_view(text, text) to anon, authenticated;

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
