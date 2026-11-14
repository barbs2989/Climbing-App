-- 0427 — Security audit 2026-11-14, part 2: three smaller leaks of what a climber kept private.
--
-- 1. rank_breakdown (0357) returned the REAL climb_logs id for logs the viewer may not read. Route,
--    date and area were already masked, but the id could be matched against other functions that return
--    log ids, putting the route and day back on a hidden log. Hidden rows now get an id hashed with the
--    call's own random salt: unique within the response (React keys), meaningless outside it.
-- 2. crag_regular named "the regular" at a crag from logs of EVERY visibility, so a climber whose logs
--    are all private could be shown as climbing there. It now counts only logs the caller may read:
--    their own, public ones, a friend's friends-only ones and their crew's crew-only ones (the same rule
--    rank_breakdown uses).
-- 3. Crew email invites were claimed by whichever account held the invited address, with no check that
--    the address was confirmed. Both the signup trigger (0070) and the per-sign-in RPC (0076) now claim
--    only for a confirmed email. Nothing is lost: the app calls claim_my_crew_email_invites on every
--    sign-in, so an invite waits until the first sign-in after the address is confirmed.
--
-- Bodies below are the live definitions with only those lines changed.

CREATE OR REPLACE FUNCTION public.rank_breakdown(p_user uuid, p_area_id text DEFAULT NULL::text)
 RETURNS TABLE(log_id uuid, hidden boolean, route_id text, route_name text, grade text, area_name text, date_climbed date, tick_type text, tier text, disc text, raw_disc text, sent boolean, recent boolean, classic boolean, climb_ft numeric, send_pts numeric, onsight_pts numeric, route_key text, day_key text, peak_key text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  a_path ltree;
  salt text := gen_random_uuid()::text;
begin
  if me is null then raise exception 'sign in to see rankings'; end if;
  if p_user is null then raise exception 'which climber?'; end if;
  if p_user <> me and not exists (
       select 1 from profiles p
        where p.id = p_user and coalesce(p.show_on_ranks, true)
          and not profile_owner_blocked_me(p.id)
          and not exists (select 1 from blocked_users b where b.blocker = me and b.blocked = p.id)) then
    raise exception 'this climber is not on the rankings';
  end if;
  if p_area_id is not null then
    select a.path into a_path from areas a where a.id = p_area_id;
    if a_path is null then raise exception 'unknown area %', p_area_id; end if;
  end if;

  return query
  with counted0 as (
    -- leaderboard()'s counted0, for one climber
    select rl.id, rl.route_id, rl.date_climbed, rl.tick_type, lower(coalesce(rl.tick_type, '')) as tt, rl.tier,
           cl.summited, rl.created_at, coalesce(ro.classic, false) as classic, ro.area_id, ro.name as rname, ro.grade as rgrade,
           ra.name as aname, ro.discipline as raw_disc,
           case when ro.discipline = 'rock' then 'trad' else ro.discipline end as disc,
           case when coalesce(ro.gain_ft, 0) > 0 then ro.gain_ft
                when coalesce(ro.length_m, 0) > 0 then round(ro.length_m * 3.28084) else 0 end as climb_ft,
           case rl.tier when 'confirmed' then 1.0 when 'evidence' then 0.75 else 0.5 end::numeric as w,
           (rl.date_climbed >= current_date - 365) as recent,
           rank_grade(ro.grade_system, ro.grade_num) as g,
           (p_user = me
            or cl.trip_report_visibility = 'public'
            or (cl.trip_report_visibility = 'friends' and are_friends(me, p_user))
            or (cl.trip_report_visibility = 'crew' and cl.crew_id in (
                  select cm.crew_id from crew_members cm where cm.user_id = me and cm.status = 'confirmed'))) as visible
      from rankable_logs(array[p_user]) rl
      join climb_logs cl on cl.id = rl.id
      join routes ro on ro.id = rl.route_id
      join areas ra on ra.id = ro.area_id
     where (a_path is null or ra.path <@ a_path)
       and lower(coalesce(rl.tick_type, '')) <> 'conditions'
  ),
  counted as (
    select c.*,
           (c.tt not in ('attempt', 'turned around', 'fell', 'hung', 'project')) as is_sent,
           row_number() over (partition by c.route_id order by c.date_climbed, c.created_at, c.id) as nth_on_route,
           greatest(0, c.g - case when c.tt in ('top-rope', 'follow') then 0.25 else 0 end) as g_style
      from counted0 c
  )
  select case when c.visible then c.id else md5(salt || ':' || c.id::text)::uuid end,
         not c.visible,
         case when c.visible then c.route_id end,
         case when c.visible then c.rname end,
         case when c.visible then c.rgrade end,
         case when c.visible then c.aname end,
         case when c.visible then c.date_climbed end,
         case when c.visible then c.tick_type end,
         c.tier, c.disc, c.raw_disc, c.is_sent, c.recent, c.classic, c.climb_ft::numeric,
         case when c.is_sent then (8 + c.g_style * c.g_style * 0.35) * c.w else 0 end::numeric,
         case when c.tt in ('onsight', 'flash') and c.nth_on_route = 1 and c.disc in ('sport', 'trad', 'bouldering')
              then (10 + c.g * c.g * 0.3) * c.w else 0 end::numeric,
         case when c.visible then c.route_id else md5(salt || c.route_id) end,
         case when c.visible then c.date_climbed::text else md5(salt || c.date_climbed::text) end,
         case when (c.tt = 'summit' or c.summited is true) and c.raw_disc in ('mountaineering', 'alpine', 'scrambling')
              then case when c.visible then c.area_id else md5(salt || c.area_id) end end
    from counted c
   order by c.date_climbed desc, c.created_at desc;
end $function$;

CREATE OR REPLACE FUNCTION public.crag_regular(p_area_id text)
 RETURNS TABLE(user_id uuid, name text, username text, show_name boolean, avatar text, days integer, logs integer, last_day date, is_me boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  a_path ltree;
begin
  if me is null then raise exception 'sign in to see the crag regular'; end if;
  select a.path into a_path from areas a where a.id = p_area_id;
  if a_path is null then return; end if;

  return query
  with people as (
    select p.id, p.name, p.username, p.show_name, p.avatar
      from profiles p
     where (p.id = me or coalesce(p.show_on_ranks, true))
       and not profile_owner_blocked_me(p.id)
       and not exists (select 1 from blocked_users b where b.blocker = me and b.blocked = p.id)
  ),
  d as (
    select l.user_id,
           count(distinct l.date_climbed)::integer as days,
           count(*)::integer as logs,
           max(l.date_climbed) as last_day
      from climb_logs l
      join routes ro on ro.id = l.route_id
      join areas ra on ra.id = ro.area_id
     where ra.path <@ a_path
       and l.moderation = 'visible'
       and l.date_climbed is not null
       and l.date_climbed >= current_date - 90
       and l.date_climbed <= current_date + 1
       and lower(coalesce(l.tick_type, '')) <> 'conditions'
       and l.user_id in (select pe.id from people pe)
       and (l.user_id = me
            or l.trip_report_visibility = 'public'
            or (l.trip_report_visibility = 'friends' and are_friends(me, l.user_id))
            or (l.trip_report_visibility = 'crew' and l.crew_id in (
                  select cm.crew_id from crew_members cm where cm.user_id = me and cm.status = 'confirmed')))
     group by l.user_id
  )
  select pe.id, pe.name, pe.username, pe.show_name, pe.avatar, d.days, d.logs, d.last_day, (pe.id = me)
    from d
    join people pe on pe.id = d.user_id
   where d.days >= 2
   order by d.days desc, d.logs desc, d.last_day desc, pe.id
   limit 1;
end $function$;

CREATE OR REPLACE FUNCTION public.claim_my_crew_email_invites()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_n     integer := 0;
begin
  if v_uid is null then
    return 0;
  end if;

  -- Authoritative: the account's own email, not the JWT claim (which can be
  -- absent depending on how the session was minted).
  select lower(email) into v_email from auth.users where id = v_uid and email_confirmed_at is not null;
  if v_email is null or v_email = '' then
    return 0;
  end if;

  insert into public.crew_members (crew_id, user_id, status, note)
  select i.crew_id, v_uid, 'invited', coalesce(i.note, '')
    from public.crew_email_invites i
   where lower(i.email) = v_email
     and i.claimed_by is null
  on conflict (crew_id, user_id) do nothing;

  update public.crew_email_invites
     set claimed_by = v_uid, claimed_at = now()
   where lower(email) = v_email
     and claimed_by is null;

  get diagnostics v_n = row_count;
  return v_n;
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_crew_email_invites()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.email_confirmed_at is null then return new; end if;
  insert into public.crew_members (crew_id, user_id, status, note)
  select i.crew_id, new.id, 'invited', coalesce(i.note, '')
  from public.crew_email_invites i
  where lower(i.email) = lower(new.email) and i.claimed_by is null
  on conflict (crew_id, user_id) do nothing;

  update public.crew_email_invites
  set claimed_by = new.id, claimed_at = now()
  where lower(email) = lower(new.email) and claimed_by is null;

  return new;
end; $function$;
