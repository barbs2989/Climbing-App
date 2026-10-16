-- A trip report can be shared with FRIENDS (phase 5, item 8 of docs/SAFETY-AND-MODERATION-PLAN.md).
--
-- Until now friendship unlocked nothing on the server. A report was Everyone, "My crew only" (offered
-- only on a crew climb, because the policy reads crew_id), or Just me -- so a solo climb could be shared
-- with the whole internet or with nobody. "My friends" is the tier in between: readable by the climbers
-- you have an ACCEPTED connection with, enforced by RLS, not by hiding it in the app.
--
-- A friends-only report counts everywhere a crew-only one already does -- the route's conditions as its
-- readers see them, ranks evidence, "logged with", offline state packs -- because each of those functions
-- read in ('public', 'crew') and would otherwise have silently dropped it. The definitions below are the
-- LIVE ones (pg_get_functiondef, 2026-10-08) with only that literal widened; report_content is 0263's
-- with one readable case added. leaderboard_top_climbs stays 'public'-only on purpose: a public board must
-- not rank on something only friends can read.

-- Accepted connection, either direction. Definer: a viewer cannot read the other person's rows (0087).
create or replace function are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select a is not null and b is not null and exists (
    select 1 from connections c
     where c.status = 'accepted'
       and least(c.requester, c.addressee) = least(a, b)
       and greatest(c.requester, c.addressee) = greatest(a, b));
$$;
revoke all on function are_friends(uuid, uuid) from public, anon;
grant execute on function are_friends(uuid, uuid) to authenticated;

alter table climb_logs drop constraint if exists climb_logs_trip_report_visibility_check;
alter table climb_logs add constraint climb_logs_trip_report_visibility_check
  check (trip_report_visibility in ('private', 'crew', 'friends', 'public'));

drop policy if exists "view crew logs" on climb_logs;
create policy "view crew logs" on climb_logs for select
  using (
    trip_report_visibility = 'public'
    or (trip_report_visibility = 'crew' and crew_id in (
          select crew_members.crew_id from crew_members
           where crew_members.user_id = auth.uid() and crew_members.status = 'confirmed'))
    or (trip_report_visibility = 'friends' and are_friends(auth.uid(), user_id))
  );

-- get_trip_reports_for_consensus: 1 literal(s) widened
CREATE OR REPLACE FUNCTION public.get_trip_reports_for_consensus(p_route_id text)
 RETURNS TABLE(id uuid, user_id uuid, stars integer, cond_tags text[], date_climbed date, discipline text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
begin
  return query
  select cl.id, cl.user_id, cl.stars, cl.cond_tags,
         cl.date_climbed, cl.discipline, cl.created_at
  from climb_logs cl
  where cl.route_id = p_route_id
    and cl.trip_report_visibility in ('public', 'crew', 'friends')
    and cl.date_climbed >= (now()::date - interval '180 days')
  order by cl.created_at desc;
end;
$function$;

-- rankable_logs: 1 literal(s) widened
CREATE OR REPLACE FUNCTION public.rankable_logs(p_users uuid[])
 RETURNS TABLE(id uuid, user_id uuid, route_id text, date_climbed date, tick_type text, created_at timestamp with time zone, is_report boolean, tier text, nth_on_route bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with raw as (
    select l.id, l.user_id, l.route_id, l.date_climbed, l.tick_type, l.created_at,
           (coalesce(l.trip_report_visibility, '') in ('public', 'crew', 'friends')
            and (btrim(coalesce(l.notes, '')) <> '' or cardinality(coalesce(l.cond_tags, '{}')) > 0
                 or btrim(coalesce(l.beta, '')) <> '')) as is_report,
           l.partners, l.photo_taken_on, l.photo_near_route, l.photo_hash, l.gpx_track,
           coalesce(ro.lat, ra.lat) as rlat, coalesce(ro.lng, ra.lng) as rlng
      from climb_logs l
      join routes ro on ro.id = l.route_id
      join areas ra on ra.id = ro.area_id
     where l.user_id = any(p_users)
       and l.date_climbed is not null
       and l.date_climbed <= current_date + 1
       and not exists (select 1 from climb_log_confirmations c
                        where c.log_id = l.id and c.verdict = 'denied' and c.partner_id = any(l.partners))
  ),
  good_conf as (
    select c.log_id, r.user_id as author, c.partner_id, r.date_climbed
      from raw r
      join climb_log_confirmations c on c.log_id = r.id
      join profiles pp on pp.id = c.partner_id
     where c.verdict = 'confirmed'
       and c.partner_id = any(r.partners) and c.partner_id <> r.user_id
       and pp.created_at <= c.created_at - interval '30 days'
       and exists (select 1 from verification_records v
                    where v.user_id = c.partner_id and v.verification_type = 'email' and v.status = 'verified')
       and exists (select 1 from connections cn where cn.status = 'accepted'
                    and ((cn.requester = r.user_id and cn.addressee = c.partner_id)
                      or (cn.addressee = r.user_id and cn.requester = c.partner_id)))
       and not exists (select 1 from blocked_users b
                        where (b.blocker = r.user_id and b.blocked = c.partner_id)
                           or (b.blocker = c.partner_id and b.blocked = r.user_id))
  ),
  -- (a) A climber is carried by confirmations only once at least TWO different partners have
  -- confirmed their climbs: one colluding friend is no longer enough.
  confirmer_count as (
    select g.author, count(distinct g.partner_id) as n from good_conf g group by g.author
  ),
  capped_conf as (
    select g.log_id,
           row_number() over (partition by g.author, g.partner_id, extract(year from g.date_climbed)
                              order by g.date_climbed, g.log_id) as nth
      from good_conf g
      join confirmer_count cc on cc.author = g.author and cc.n >= 2
  ),
  tiered as (
    select r.*,
           case when exists (select 1 from capped_conf cc where cc.log_id = r.id and cc.nth <= 12) then 'confirmed'
                when (r.photo_taken_on between r.date_climbed - 1 and r.date_climbed + 1
                      and r.photo_near_route is not false
                      and photo_is_first_use(r.id, r.photo_hash))
                  or log_track_backs_climb(r.gpx_track, r.date_climbed, r.rlat, r.rlng) then 'evidence'
                else 'self' end as tier
      from raw r
  ),
  one_a_day as (
    select t.*,
           row_number() over (partition by t.user_id, t.route_id, t.date_climbed
                              order by case t.tier when 'confirmed' then 0 when 'evidence' then 1 else 2 end,
                                       t.created_at, t.id) as rn_day
      from tiered t
  ),
  deduped as (
    select d.*,
           row_number() over (partition by d.user_id, d.date_climbed order by d.created_at, d.id) as rn_cap,
           row_number() over (partition by d.user_id, d.route_id order by d.date_climbed, d.created_at, d.id) as nth
      from one_a_day d where d.rn_day = 1
  )
  select x.id, x.user_id, x.route_id, x.date_climbed, x.tick_type, x.created_at,
         x.is_report, x.tier, x.nth
    from deduped x where x.rn_cap <= 30;
$function$;

-- route_logged_with: 2 literal(s) widened
CREATE OR REPLACE FUNCTION public.route_logged_with(p_route_id text, p_limit integer DEFAULT 5)
 RETURNS TABLE(route_id text, climbers integer)
 LANGUAGE sql
 STABLE
AS $function$
  select b.route_id, count(distinct a.user_id)::int as climbers
  from climb_logs a
  join climb_logs b
    on b.user_id = a.user_id
   and b.date_climbed = a.date_climbed
   and b.route_id <> a.route_id
  where a.route_id = p_route_id
    and a.date_climbed is not null
    and a.trip_report_visibility in ('public', 'crew', 'friends')
    and b.trip_report_visibility in ('public', 'crew', 'friends')
  group by b.route_id
  order by climbers desc, b.route_id
  limit greatest(1, least(p_limit, 20));
$function$;

-- state_trip_reports: 1 literal(s) widened
CREATE OR REPLACE FUNCTION public.state_trip_reports(p_state text, p_from text, p_to text, p_per_route integer DEFAULT 5)
 RETURNS SETOF climb_logs
 LANGUAGE sql
 STABLE
AS $function$
  select l.*
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
$function$;

-- report_content (0263) with friends-visible trip reports reportable by the friends who can read them.
create or replace function report_content(p_kind text, p_id text, p_reason text, p_detail text default null)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid        uuid := auth.uid();
  v_author   uuid;
  v_text     text;
  v_media    jsonb;
  v_name     text;
  v_id       uuid;
  v_reporters int;
  v_state    text;
begin
  if uid is null then
    raise exception 'sign in to report content' using errcode = '42501';
  end if;
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'choose a reason for the report';
  end if;
  if (select count(*) from user_reports where reporter = uid and created_at > now() - interval '1 day') >= 30 then
    raise exception 'you have filed a lot of reports today — try again tomorrow';
  end if;

  if p_kind = 'message' then
    select m.sender_id, m.body, case when coalesce(m.image_url, '') = '' then null else jsonb_build_array(m.image_url) end
      into v_author, v_text, v_media
      from messages m
     where m.id::text = p_id and (m.sender_id = uid or m.recipient_id = uid);
  elsif p_kind = 'crew_message' then
    select cm.user_id, cm.body, case when coalesce(cm.image_url, '') = '' then null else jsonb_build_array(cm.image_url) end
      into v_author, v_text, v_media
      from crews_messages cm
     where cm.id::text = p_id
       and (exists (select 1 from crew_members m where m.crew_id = cm.crew_id and m.user_id = uid and m.status = 'confirmed')
            or exists (select 1 from crews c where c.id = cm.crew_id and c.created_by = uid));
  elsif p_kind = 'group_post' then
    select p.author, p.body, p.photos into v_author, v_text, v_media
      from group_posts p where p.id::text = p_id and is_group_member(p.group_id);
  elsif p_kind = 'group_event' then
    select e.host, concat_ws(E'\n', e.title, e.descr, e.location), null into v_author, v_text, v_media
      from group_events e where e.id::text = p_id and (is_group_member(e.group_id) or is_invited_to_group_event(e.id));
  elsif p_kind = 'comment' then
    select c.user_id, c.text, null into v_author, v_text, v_media
      from comments c where c.id::text = p_id and not c.deleted and comment_target_readable(c.target_id);
  elsif p_kind = 'trip_report' then
    select l.user_id, concat_ws(E'\n', l.notes, l.beta, l.gear_beta, l.road_note, l.outcome_note, l.sun_note), l.photos
      into v_author, v_text, v_media
      from climb_logs l
     where l.id::text = p_id
       and (l.user_id = uid or l.trip_report_visibility = 'public'
            or (l.trip_report_visibility = 'crew'
                and l.crew_id in (select cm.crew_id from crew_members cm where cm.user_id = uid and cm.status = 'confirmed'))
            or (l.trip_report_visibility = 'friends' and are_friends(uid, l.user_id)));
  elsif p_kind = 'group' then
    select g.created_by, concat_ws(E'\n', g.name, g.blurb, g.location), null into v_author, v_text, v_media
      from groups g where g.id::text = p_id and (g.visibility = 'public' or is_group_member(g.id) or is_group_invited(g.id));
  elsif p_kind = 'topo' then
    select t.created_by, concat_ws(E'\n', t.alt, t.photographer), jsonb_build_array(t.storage_path) into v_author, v_text, v_media
      from topos t where t.id::text = p_id;
  elsif p_kind = 'list' then
    select l.user_id, concat_ws(E'\n', l.name, l.description), null into v_author, v_text, v_media
      from user_lists l where l.id::text = p_id and (l.shared or l.user_id = uid);
  elsif p_kind = 'profile' then
    select pr.id, concat_ws(E'\n', pr.name, '@' || pr.username, pr.bio, pr.location),
           (case when coalesce(pr.avatar, '') = '' then '[]'::jsonb else jsonb_build_array(pr.avatar) end)
             || coalesce(to_jsonb(pr.photos), '[]'::jsonb)
      into v_author, v_text, v_media
      from profiles pr where pr.id::text = p_id and not profile_owner_blocked_me(pr.id);
  else
    raise exception 'unknown kind of content: %', p_kind;
  end if;

  if v_author is null then
    raise exception 'that content is not available to report' using errcode = 'P0002';
  end if;
  if v_author = uid then
    raise exception 'you cannot report your own content';
  end if;

  select case when pr.show_name and coalesce(pr.name, '') <> '' then pr.name
              when coalesce(pr.username, '') <> '' then '@' || pr.username
              else 'A climber' end
    into v_name from profiles pr where pr.id = v_author;

  insert into user_reports (reporter, reported_id, reported_name, reason, detail, status,
                            target_kind, target_id, snapshot, snapshot_media, snapshot_at)
  values (uid, v_author::text, coalesce(v_name, 'A climber'), left(btrim(p_reason), 120),
          nullif(left(btrim(coalesce(p_detail, '')), 2000), ''), 'open',
          p_kind, p_id, left(v_text, 8000), v_media, now())
  on conflict (reporter, target_kind, target_id) where target_kind is not null and reporter is not null
  do update set reason = excluded.reason, detail = coalesce(excluded.detail, user_reports.detail),
                status = 'open', snapshot = excluded.snapshot, snapshot_media = excluded.snapshot_media,
                snapshot_at = excluded.snapshot_at, created_at = now()
  returning id into v_id;

  if p_kind <> 'profile' then
    select count(distinct reporter) into v_reporters
      from user_reports where target_kind = p_kind and target_id = p_id and status in ('open', 'reviewing');
    if v_reporters >= 3 then
      v_state := case
        when p_kind = 'message'      then (select moderation from messages       where id::text = p_id)
        when p_kind = 'crew_message' then (select moderation from crews_messages where id::text = p_id)
        when p_kind = 'group_post'   then (select moderation from group_posts    where id::text = p_id)
        when p_kind = 'group_event'  then (select moderation from group_events   where id::text = p_id)
        when p_kind = 'comment'      then (select moderation from comments       where id::text = p_id)
        when p_kind = 'trip_report'  then (select moderation from climb_logs     where id::text = p_id)
        when p_kind = 'group'        then (select moderation from groups         where id::text = p_id)
        when p_kind = 'topo'         then (select moderation from topos          where id::text = p_id)
        when p_kind = 'list'         then (select moderation from user_lists     where id::text = p_id)
      end;
      if v_state = 'visible' then
        perform _set_content_moderation(p_kind, p_id, 'held');
        insert into moderation_actions (actor, action, target_kind, target_id, target_owner, report_id, note)
        values (null, 'auto_hold', p_kind, p_id, v_author, v_id, v_reporters || ' climbers reported it');
      end if;
    end if;
  end if;
  return v_id;
end;
$$;
revoke all on function report_content(text, text, text, text) from public, anon;
grant execute on function report_content(text, text, text, text) to authenticated;

-- Confirm:
--   node scripts/oneoff/probe-trip-reports-for-friends.mjs   (real accounts; must end 0 failed)
