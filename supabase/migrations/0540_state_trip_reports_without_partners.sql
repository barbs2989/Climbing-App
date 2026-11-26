-- 0540: the offline state files build again — state_trip_reports no longer reads climb_logs.partners.
--
-- WHY: 0501 (2026-11-23) revoked the table-level SELECT on climb_logs from anon and granted every
-- column but `partners` back by name. state_trip_reports (0250/0273) is SECURITY INVOKER and returned
-- SETOF climb_logs through `select l.*`, so under the anon key its whole-row read touched `partners`
-- and Postgres refused it: "permission denied for table climb_logs" (42501). The nightly offline
-- state files are built with the anon key (scripts/build-state-snapshots.mjs), so from 2026-11-23 on
-- EVERY state failed and the nightly run published 0 states; the last good file (2026-11-22) aged out
-- of the app's 3-day window and every download and refresh fell back to paging the live database
-- (Colorado: 40,118 climbs). A signed-out climber downloading a state live lost its trip reports too.
--
-- WHAT: the function names its columns — every climb_logs column but `partners` — so it reads only
-- what anon may read. RLS still decides WHICH rows, exactly as before (it stays SECURITY INVOKER).
-- The return type changes, so it is dropped and re-created; both callers (the nightly builder and
-- lib/offline.js's live download) ask for named columns through `select=`, none of them `partners`.
--
-- ALSO: 0537 added climb_logs.grade_feel without granting it to anon, which 0501's header says every
-- later column must do. The app's trip-report readers ask for grade_feel, so signed out they were
-- refused with the same 42501. It is a soft / right / stiff opinion on a report already readable
-- signed out, so it is granted like every other column.

begin;

grant select (grade_feel) on public.climb_logs to anon;

drop function if exists public.state_trip_reports(text, text, text, integer);

create function public.state_trip_reports(p_state text, p_from text, p_to text, p_per_route integer default 5)
returns table (
  id uuid, user_id uuid, route_id text, crew_id uuid, discipline text, date_climbed date, stars integer,
  cond_tags text[], notes text, party_size integer, car_to_car_minutes integer, approach_minutes integer,
  climb_minutes integer, descent_minutes integer, snow_condition text, freezing_level_ft integer,
  water_level text, bug_pressure text, trail_condition text, protection_quality text, anchor_quality text,
  crowd_level text, belayed_by uuid, caught_fall boolean, photos jsonb, trip_report_visibility text,
  created_at timestamptz, updated_at timestamptz, fa_ascent boolean, developed boolean, beta text,
  gear_beta text, sun_vote text, sun_note text, outcome_reasons text[], outcome_note text, gpx_track jsonb,
  itinerary jsonb, tick_type text, temp_f integer, snow_depth text, seepage text, mud text,
  photo_taken_on date, photo_near_route boolean, road_note text, photo_hash text, rappel_count integer,
  rappel_longest_m integer, rappel_rope text, moderation text, nights_out integer, camp_names text[],
  summited boolean, pitches_climbed integer, grade_feel text
)
language sql stable
as $$
  select l.id, l.user_id, l.route_id, l.crew_id, l.discipline, l.date_climbed, l.stars,
         l.cond_tags, l.notes, l.party_size, l.car_to_car_minutes, l.approach_minutes,
         l.climb_minutes, l.descent_minutes, l.snow_condition, l.freezing_level_ft,
         l.water_level, l.bug_pressure, l.trail_condition, l.protection_quality, l.anchor_quality,
         l.crowd_level, l.belayed_by, l.caught_fall, l.photos, l.trip_report_visibility,
         l.created_at, l.updated_at, l.fa_ascent, l.developed, l.beta,
         l.gear_beta, l.sun_vote, l.sun_note, l.outcome_reasons, l.outcome_note, l.gpx_track,
         l.itinerary, l.tick_type, l.temp_f, l.snow_depth, l.seepage, l.mud,
         l.photo_taken_on, l.photo_near_route, l.road_note, l.photo_hash, l.rappel_count,
         l.rappel_longest_m, l.rappel_rope, l.moderation, l.nights_out, l.camp_names,
         l.summited, l.pitches_climbed, l.grade_feel
  from climb_logs l
  join (
    select x.id from (
      select l2.id,
             row_number() over (partition by l2.route_id order by l2.date_climbed desc nulls last, l2.created_at desc, l2.id) as rn
      from climb_logs l2
      join routes r on r.id = l2.route_id
      join areas ra on ra.id = r.area_id
      join areas root on root.id = p_state
      where l2.route_id between p_from and p_to
        and ra.path <@ root.path
        and l2.trip_report_visibility in ('public', 'crew', 'friends')
    ) x
    where x.rn <= least(greatest(coalesce(p_per_route, 5), 1), 20)
  ) k on k.id = l.id
$$;

comment on function public.state_trip_reports(text, text, text, integer) is
  'Newest p_per_route readable trip reports per route in one state''s id window, for offline downloads. Names every climb_logs column but partners (0540), so the anon key can call it after 0501.';

grant execute on function public.state_trip_reports(text, text, text, integer) to anon, authenticated;

commit;
