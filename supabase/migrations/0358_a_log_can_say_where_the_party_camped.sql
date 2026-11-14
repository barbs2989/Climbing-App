-- 0358 — A log can say where the party camped.
--
-- On a route you might sleep on (the route page's CAMPING & BIVY gate), the log form's GETTING THERE
-- section asks two things: how many nights the party spent out, and where they slept. The camp is
-- picked from the route's own CAMPING & BIVY list, or typed when it is somewhere the list does not
-- name. The answers feed back to the route page: each listed camp says how many reporting parties
-- slept there and when last, and a camp the list does not name is offered to the next climber as
-- one to add, through the ordinary contribute pipeline (nothing is written to the route by this).
--
--   nights_out  0 = a day trip / car-to-car, 1..60 = nights out. Peakbagger's ascent form asks the
--               same number ("nights camped"); WTA's trip reports tag day hike / overnight /
--               multi-night.
--   camp_names  the camps' NAMES as the route listed them (or as the climber typed one), in the
--               order slept in: a multi-night trip often moves camp (WTA's own Sahale Arm report:
--               Basin Creek, then Sahale Glacier). Names, not keys: a camp in this app is a name inside
--               routes.bivy or a Campsite waypoint, with no id of its own, and a report must outlive an
--               edit to that list.
--
-- Nullable, no defaults: the questions are optional, and a default would manufacture a statement
-- the climber never made.
--
-- route_private_conditions (0329) returns both too: a report kept to friends, a crew or the climber
-- still feeds the route's conditions anonymously, and where parties sleep is one of them. A camp
-- name says nothing about who slept there. The return type changes, so the function is dropped and
-- re-created with the same body, grants and filter.
--
-- The client degrades without these columns (LOG_COLS_0121 in lib/db.js drops them and re-sends
-- on an unknown-column error), so applying this and deploying the client are independent events.

alter table climb_logs add column if not exists nights_out integer;
alter table climb_logs add column if not exists camp_names text[];

alter table climb_logs drop constraint if exists climb_logs_nights_out_sane;
alter table climb_logs add constraint climb_logs_nights_out_sane check (nights_out is null or nights_out between 0 and 60);
alter table climb_logs drop constraint if exists climb_logs_camp_names_sane;
alter table climb_logs add constraint climb_logs_camp_names_sane check (camp_names is null or (cardinality(camp_names) between 1 and 10 and char_length(array_to_string(camp_names, '')) <= 1200));

comment on column climb_logs.nights_out is 'Nights the reporting party spent out on this trip; 0 = day trip / car-to-car.';
comment on column climb_logs.camp_names is 'Where the party camped, in order, by the names the route''s CAMPING & BIVY list uses (or as the climber typed them).';

drop function if exists public.route_private_conditions(text);
create function public.route_private_conditions(p_route text)
returns table (
  id uuid, reporter_key text, date_climbed date, tick_type text, discipline text,
  cond_tags text[], outcome_reasons text[],
  approach_minutes int, climb_minutes int, descent_minutes int, car_to_car_minutes int,
  snow_condition text, freezing_level_ft int, water_level text, bug_pressure text, trail_condition text,
  protection_quality text, anchor_quality text, crowd_level text,
  temp_f int, snow_depth text, seepage text, mud text,
  nights_out int, camp_names text[]
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select l.id, md5(l.user_id::text || ':' || l.route_id), l.date_climbed, l.tick_type, l.discipline,
         l.cond_tags, l.outcome_reasons,
         l.approach_minutes, l.climb_minutes, l.descent_minutes, l.car_to_car_minutes,
         l.snow_condition, l.freezing_level_ft, l.water_level, l.bug_pressure, l.trail_condition,
         l.protection_quality, l.anchor_quality, l.crowd_level,
         l.temp_f, l.snow_depth, l.seepage, l.mud,
         l.nights_out, l.camp_names
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
