-- 0357: rank_breakdown() -- the climbs behind a number on Ranks.
--
-- Owner note (2026-10-22): "Should we give users a chance to view each rank signal ... to add more
-- context to how they have that many points?" 8a.nu's scorecard lists the ascents its points are
-- summed from, and theCrag's CPR timeline opens the ascent list under any column. This is that list
-- for every log-counted board: one row per log leaderboard() (0335) counted for this climber, with
-- the numbers that log contributes, computed by the SAME expressions so the rows add up to the board.
--
-- Privacy: a log the viewer could not read under climb_logs' own select policy (0269: public, a
-- friend's 'friends' log, a crew-mate's 'crew' log; the owner always) comes back HIDDEN -- no route,
-- name, grade, date or tick, only its contribution. Its route, date and summit are replaced by keys
-- salted per call, so the client can still count DIFFERENT routes, days and peaks (the board does)
-- without learning which ones, and a key from one call never matches one from the next. The total
-- matches what the board already shows; the breakdown says how much of it is private.
--
-- Who can be broken down: yourself, or a climber leaderboard() would list for you (show_on_ranks,
-- not blocked either way).

begin;

create or replace function public.rank_breakdown(p_user uuid, p_area_id text default null)
returns table(
  log_id uuid, hidden boolean, route_id text, route_name text, grade text, area_name text,
  date_climbed date, tick_type text, tier text, disc text, raw_disc text,
  sent boolean, recent boolean, classic boolean, climb_ft numeric,
  send_pts numeric, onsight_pts numeric, route_key text, day_key text, peak_key text)
language plpgsql stable security definer
set search_path = public, pg_temp
as $function$
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
           rl.created_at, coalesce(ro.classic, false) as classic, ro.area_id, ro.name as rname, ro.grade as rgrade,
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
  select c.id,
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
         case when c.tt = 'summit' and c.raw_disc in ('mountaineering', 'alpine', 'scrambling')
              then case when c.visible then c.area_id else md5(salt || c.area_id) end end
    from counted c
   order by c.date_climbed desc, c.created_at desc;
end $function$;
comment on function public.rank_breakdown(uuid, text) is
  'The logs leaderboard() counted for one climber, each with what it adds to every board; logs the caller could not read come back hidden (0357).';
revoke all on function public.rank_breakdown(uuid, text) from public, anon;
grant execute on function public.rank_breakdown(uuid, text) to authenticated;

commit;
