-- 0515: three follow-ups from the code reviews of #3787 and of 0508 / #3793 (owner 2026-11-23, "do a review once it's live").
--
-- 1. A PRIVATE REPORT'S ROPE IS ONE OF THE FOUR CHIPS, OR NOTHING. climb_logs.rappel_rope is free text
--    with no CHECK; only the log form's chips (COND_ENUMS.rapRope) keep it to "Single 60 m", "Single 70 m",
--    "Single 80 m" or "Double ropes". 0508 began handing it out for non-public rows, and the route page
--    prints the most-used rope as is, so a row written straight through the API could put any words on a
--    route page anonymously -- which the promise "no words you wrote" forbids. The function now returns
--    the rope only when it is one of the four. (A public report's rope is the author's own, under their
--    name, and reportable; it is not filtered here.)
--
-- 2. A PRIVATE REPORT'S SUN VOTE TRAVELS HERE, NOT AS A CONTRIBUTION. #3787 filed it as a contributions row
--    marked {vote, anon:true} and drew it as "A climber" -- but contributions is readable by anyone (0002), its
--    `contributor` included, so the vote named its author to any API reader. The vote is already in
--    climb_logs.sun_vote; this function now returns it (one of its three values, or nothing; never sun_note),
--    and the app stops filing a contribution for a report that is not public. No {anon:true} row exists in
--    production (checked 2026-11-23), so nothing needs moving.
--
-- 3. A CLIMBER CAN TAKE BACK THEIR OWN SUN VOTE. A sun vote is a contributions row (kind 'sun'), filed
--    from the log form. Editing a log could correct a vote but never withdraw one, and every correction
--    filed another row that piled up on the Review desk. The delete policy (0223) allowed only photos and
--    pairings; it now allows a climber's own sun rows too, so the app replaces the old vote instead of
--    adding to it and removes it when the log's vote is cleared.

begin;

drop function if exists public.route_private_conditions(text);

create function public.route_private_conditions(p_route text)
returns table(id uuid, reporter_key text, date_climbed date, tick_type text, discipline text,
  cond_tags text[], outcome_reasons text[], approach_minutes integer, climb_minutes integer,
  descent_minutes integer, car_to_car_minutes integer, snow_condition text, freezing_level_ft integer,
  water_level text, bug_pressure text, trail_condition text, protection_quality text, anchor_quality text,
  crowd_level text, temp_f integer, snow_depth text, seepage text, mud text, nights_out integer, camp_names text[],
  rappel_count integer, rappel_longest_m integer, rappel_rope text, summited boolean, sun_vote text)
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
         l.rappel_count, l.rappel_longest_m,
         case when l.rappel_rope in ('Single 60 m', 'Single 70 m', 'Single 80 m', 'Double ropes') then l.rappel_rope end,
         l.summited,
         case when l.sun_vote in ('more', 'accurate', 'less') then l.sun_vote end
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

drop policy if exists "own photo or pairing, or an admin" on contributions;
drop policy if exists "own photo, pairing or sun vote, or an admin" on contributions;
create policy "own photo, pairing or sun vote, or an admin" on contributions for delete using (
  (kind in ('photo', 'pair', 'sun') and contributor is not null and contributor = (select auth.uid())::text)
  or is_admin((select auth.uid()))
);

commit;
