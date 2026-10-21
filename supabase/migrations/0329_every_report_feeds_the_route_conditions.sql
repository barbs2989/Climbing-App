-- 0329 — Every report feeds the route's conditions, anonymously when its climber kept it to themselves.
--
-- A trip report set to "My friends", "My crew" or "Just me" used to feed NOTHING outside that circle: the
-- route page reads climb_logs under RLS, so a stranger's view of a route's conditions was built only from
-- the public reports, and the conditions a private climber saw on the day were lost to everyone else.
--
-- This is the Mountain Project model for private ticks: the tick still counts on the route page, shown
-- with its date and nothing that says who. Here the CONDITIONS a report recorded (the date, the
-- condition and hazard chips, the summit/turn-around outcome and its chips, the measured times and the
-- snow/water/bugs/trail/protection/crowd answers) are returned with NO author, NO name, NO written text,
-- NO photos, NO beta, NO itinerary, NO partners and NO GPS track. `reporter_key` is an opaque hash of the
-- author and the route, so the page can count distinct climbers without learning who they are, and it
-- cannot be joined to the same author on another route.
--
-- Which rows: every report on the route that the caller cannot already read in full -- not public, not
-- the caller's own, not a friend's "friends" report, not their crew's "crew" report (those arrive through
-- the ordinary select with their author). Taken-down reports stay out, as do reports by a climber who has
-- blocked the caller or whom the caller has blocked.

create or replace function public.route_private_conditions(p_route text)
returns table (
  id uuid, reporter_key text, date_climbed date, tick_type text, discipline text,
  cond_tags text[], outcome_reasons text[],
  approach_minutes int, climb_minutes int, descent_minutes int, car_to_car_minutes int,
  snow_condition text, freezing_level_ft int, water_level text, bug_pressure text, trail_condition text,
  protection_quality text, anchor_quality text, crowd_level text,
  temp_f int, snow_depth text, seepage text, mud text
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select l.id, md5(l.user_id::text || ':' || l.route_id), l.date_climbed, l.tick_type, l.discipline,
         l.cond_tags, l.outcome_reasons,
         l.approach_minutes, l.climb_minutes, l.descent_minutes, l.car_to_car_minutes,
         l.snow_condition, l.freezing_level_ft, l.water_level, l.bug_pressure, l.trail_condition,
         l.protection_quality, l.anchor_quality, l.crowd_level,
         l.temp_f, l.snow_depth, l.seepage, l.mud
    from climb_logs l
   where l.route_id = p_route
     and l.trip_report_visibility is distinct from 'public'
     and l.moderation = 'visible'
     and (auth.uid() is null or l.user_id <> auth.uid())
     and not (l.trip_report_visibility = 'friends' and is_my_friend(l.user_id))
     and not (l.trip_report_visibility = 'crew' and l.crew_id in (
           select cm.crew_id from crew_members cm where cm.user_id = auth.uid() and cm.status = 'confirmed'))
     and not exists (select 1 from blocked_users b
                      where (b.blocker = l.user_id and b.blocked = auth.uid())
                         or (b.blocker = auth.uid() and b.blocked = l.user_id))
   order by l.date_climbed desc nulls last
   limit 60;
$$;
revoke all on function public.route_private_conditions(text) from public;
grant execute on function public.route_private_conditions(text) to anon, authenticated;
