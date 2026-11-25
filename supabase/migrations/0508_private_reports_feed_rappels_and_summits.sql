-- 0508: a report kept to friends, a crew or Just me also feeds the route's RAPPELS answers and its
-- summit counts, without a name or a word of the climber's.
--
-- Owner 2026-11-23 ("do all", after the log-form audit): the log form tells a climber whose report is
-- not public that "what it records about the conditions still feeds the climb's conditions for every
-- climber, without your name or your words". route_private_conditions (0329, 0358, 0425) carried the
-- chips, the metrics, the times and the camps, but not the three RAPPELS answers or the summit flag
-- (0373), so a private report's "2 rappels, longest 30 m, single 60 m" and "Also reached the summit"
-- reached nobody.
--
-- Added: rappel_count, rappel_longest_m, rappel_rope, summited. Facts, not prose.
-- NOT added, on purpose: road_note (and notes, beta, gear_beta, sun_note, outcome_note). Those are
-- the climber's own words, which the promise keeps out. The road's STATUS chips already travel in
-- cond_tags.
--
-- Body otherwise identical to 0425 (opaque ids, the salted reporter key, the friend / crew / block
-- exclusions). The return type changes, so the function is dropped and re-created, and its grants
-- are re-stated as 0329/0358 set them.

begin;

drop function if exists public.route_private_conditions(text);

create function public.route_private_conditions(p_route text)
returns table(id uuid, reporter_key text, date_climbed date, tick_type text, discipline text,
  cond_tags text[], outcome_reasons text[], approach_minutes integer, climb_minutes integer,
  descent_minutes integer, car_to_car_minutes integer, snow_condition text, freezing_level_ft integer,
  water_level text, bug_pressure text, trail_condition text, protection_quality text, anchor_quality text,
  crowd_level text, temp_f integer, snow_depth text, seepage text, mud text, nights_out integer, camp_names text[],
  rappel_count integer, rappel_longest_m integer, rappel_rope text, summited boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select private.opaque_log_id(l.id),
         md5('reporter:' || (select salt from private.log_hash_salt) || ':' || l.user_id::text || ':' || l.route_id),
         l.date_climbed, l.tick_type, l.discipline,
         l.cond_tags, l.outcome_reasons,
         l.approach_minutes, l.climb_minutes, l.descent_minutes, l.car_to_car_minutes,
         l.snow_condition, l.freezing_level_ft, l.water_level, l.bug_pressure, l.trail_condition,
         l.protection_quality, l.anchor_quality, l.crowd_level,
         l.temp_f, l.snow_depth, l.seepage, l.mud,
         l.nights_out, l.camp_names,
         l.rappel_count, l.rappel_longest_m, l.rappel_rope, l.summited
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

commit;
