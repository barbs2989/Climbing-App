-- 0489: the words on a topo LINE are moderated like every other thing a climber writes.
--
-- A line drawn on a topo photo carries free text that every reader of the route sees: the line's name
-- (label), a caption per variation (variant_labels, 0362) and a note per marker (pins[].note). None of
-- it was screened, a line could not be held or removed, and nothing could report one (topo audit,
-- 2026-11-23). topos has had all of that since 0263-0265; topo_lines had none of it.
--
-- This gives topo_lines the same treatment under a new kind, 'topo_line':
--   1. a moderation column (visible / held / removed), hidden from everyone but its author and admins;
--   2. the guard that stops a client writing that column;
--   3. the screening floor on insert and on any edit that changes the words;
--   4. report_content, the three-reporter auto-hold, the model hold, appeals, and remove-everything
--      on a suspension or ban.
-- Also: a REPORT of a topo photo now snapshots its caption (0488 screened it; the report still copied
-- only alt and photographer).
--
-- Every function below is the LIVE definition (read with pg_get_functiondef on 2026-11-23) plus the
-- one 'topo_line' branch; nothing else in them changes. create or replace keeps their grants.

-- 1. the column, and who may read a line that is not visible -------------------------------------
alter table topo_lines add column if not exists moderation text not null default 'visible';
alter table topo_lines drop constraint if exists topo_lines_moderation_chk;
alter table topo_lines add  constraint topo_lines_moderation_chk check (moderation in ('visible','held','removed'));

drop policy if exists "moderation hides taken-down content" on topo_lines;
create policy "moderation hides taken-down content" on topo_lines as restrictive for select
  using (moderation = 'visible' or created_by = auth.uid() or is_admin(auth.uid()));

-- 2. nobody sets it by writing the row (0263's guard) --------------------------------------------
drop trigger if exists topo_lines_guard_moderation on topo_lines;
create trigger topo_lines_guard_moderation before insert or update on topo_lines
  for each row execute function guard_moderation_column();

-- 3. the words of a line, and the floor ------------------------------------------------------------
create or replace function screening_text(p_kind text, r jsonb) returns text
language sql immutable as $$
  select case p_kind
    when 'message'      then r->>'body'
    when 'crew_message' then r->>'body'
    when 'group_post'   then r->>'body'
    when 'group_event'  then concat_ws(E'\n', r->>'title', r->>'descr', r->>'location')
    when 'comment'      then r->>'text'
    when 'trip_report'  then concat_ws(E'\n', r->>'notes', r->>'beta', r->>'gear_beta', r->>'road_note', r->>'outcome_note', r->>'sun_note')
    when 'group'        then concat_ws(E'\n', r->>'name', r->>'blurb', r->>'location')
    when 'topo'         then concat_ws(E'\n', r->>'alt', r->>'photographer', r->>'caption')
    when 'topo_line'    then nullif(concat_ws(E'\n', r->>'label',
                               (select string_agg(v, E'\n') from jsonb_array_elements_text(case when jsonb_typeof(r->'variant_labels') = 'array' then r->'variant_labels' else '[]'::jsonb end) v where v <> ''),
                               (select string_agg(p->>'note', E'\n') from jsonb_array_elements(case when jsonb_typeof(r->'pins') = 'array' then r->'pins' else '[]'::jsonb end) p where coalesce(p->>'note', '') <> '')), '')
    when 'list'         then concat_ws(E'\n', r->>'name', r->>'description')
  end;
$$;

-- Named so the floor fires AFTER the guard (triggers fire in name order), as on every other table.
drop trigger if exists topo_lines_screen_floor on topo_lines;
create trigger topo_lines_screen_floor before insert or update on topo_lines for each row execute function screen_floor('topo_line');
drop trigger if exists topo_lines_screen_after on topo_lines;
create trigger topo_lines_screen_after after insert or update on topo_lines for each row execute function screen_after_insert('topo_line', 'created_by');

-- 4. a line can be reported, held, appealed and removed -------------------------------------------
alter table user_reports drop constraint if exists user_reports_target_kind_chk;
alter table user_reports add  constraint user_reports_target_kind_chk check (target_kind is null or target_kind in
  ('message','crew_message','group_post','group_event','comment','trip_report','group','topo','topo_line','list','profile'));

CREATE OR REPLACE FUNCTION public._set_content_moderation(p_kind text, p_id text, p_state text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_owner uuid;
begin
  perform set_config('app.moderation_bypass', 'on', true);
  if    p_kind = 'message'      then update messages       set moderation = p_state where id::text = p_id returning sender_id  into v_owner;
  elsif p_kind = 'crew_message' then update crews_messages set moderation = p_state where id::text = p_id returning user_id    into v_owner;
  elsif p_kind = 'group_post'   then update group_posts    set moderation = p_state where id::text = p_id returning author     into v_owner;
  elsif p_kind = 'group_event'  then update group_events   set moderation = p_state where id::text = p_id returning host       into v_owner;
  elsif p_kind = 'comment'      then update comments       set moderation = p_state where id::text = p_id returning user_id    into v_owner;
  elsif p_kind = 'trip_report'  then update climb_logs     set moderation = p_state where id::text = p_id returning user_id    into v_owner;
  elsif p_kind = 'group'        then update groups         set moderation = p_state where id::text = p_id returning created_by into v_owner;
  elsif p_kind = 'topo'         then update topos          set moderation = p_state where id::text = p_id returning created_by into v_owner;
  elsif p_kind = 'topo_line'    then update topo_lines     set moderation = p_state where id::text = p_id returning created_by into v_owner;
  elsif p_kind = 'list'         then update user_lists     set moderation = p_state where id::text = p_id returning user_id    into v_owner;
  else raise exception 'content of kind % cannot be held or removed', p_kind;
  end if;
  perform set_config('app.moderation_bypass', '', true);
  return v_owner;
end;
$function$;

CREATE OR REPLACE FUNCTION public.report_content(p_kind text, p_id text, p_reason text, p_detail text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    select t.created_by, concat_ws(E'\n', t.alt, t.photographer, t.caption), jsonb_build_array(t.storage_path) into v_author, v_text, v_media
      from topos t where t.id::text = p_id;
  elsif p_kind = 'topo_line' then
    select l.created_by, screening_text('topo_line', to_jsonb(l)), jsonb_build_array(t.storage_path) into v_author, v_text, v_media
      from topo_lines l join topos t on t.id = l.topo_id where l.id::text = p_id;
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
        when p_kind = 'topo_line'    then (select moderation from topo_lines     where id::text = p_id)
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
$function$;

CREATE OR REPLACE FUNCTION public.screening_hold(p_kind text, p_id text, p_category text, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_owner uuid; v_text text; v_row jsonb;
begin
  v_row := case p_kind
    when 'message'      then (select to_jsonb(x) from messages x       where id::text = p_id and moderation = 'visible')
    when 'crew_message' then (select to_jsonb(x) from crews_messages x where id::text = p_id and moderation = 'visible')
    when 'group_post'   then (select to_jsonb(x) from group_posts x    where id::text = p_id and moderation = 'visible')
    when 'group_event'  then (select to_jsonb(x) from group_events x   where id::text = p_id and moderation = 'visible')
    when 'comment'      then (select to_jsonb(x) from comments x       where id::text = p_id and moderation = 'visible')
    when 'trip_report'  then (select to_jsonb(x) from climb_logs x     where id::text = p_id and moderation = 'visible')
    when 'group'        then (select to_jsonb(x) from groups x         where id::text = p_id and moderation = 'visible')
    when 'topo'         then (select to_jsonb(x) from topos x          where id::text = p_id and moderation = 'visible')
    when 'topo_line'    then (select to_jsonb(x) from topo_lines x     where id::text = p_id and moderation = 'visible')
    when 'list'         then (select to_jsonb(x) from user_lists x     where id::text = p_id and moderation = 'visible')
  end;
  if v_row is null then return false; end if;     -- gone, or already held/removed
  v_text := screening_text(p_kind, v_row);
  v_owner := _set_content_moderation(p_kind, p_id, 'held');
  insert into user_reports (reporter, reporter_label, reported_id, reported_name, reason, detail, status,
                            target_kind, target_id, snapshot, snapshot_media, snapshot_at)
  values (null, 'Automatic screening', v_owner::text,
          (select case when pr.show_name and coalesce(pr.name, '') <> '' then pr.name
                       when coalesce(pr.username, '') <> '' then '@' || pr.username else 'A climber' end
             from profiles pr where pr.id = v_owner),
          'Automatic screening: ' || left(coalesce(p_category, 'flagged'), 60),
          nullif(left(coalesce(p_reason, ''), 500), ''), 'open',
          p_kind, p_id, left(v_text, 8000),
          case when p_kind = 'message' and coalesce(v_row->>'image_url', '') <> '' then jsonb_build_array(v_row->>'image_url')
               when p_kind in ('group_post', 'trip_report') then v_row->'photos' else null end,
          now());
  insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
  values (null, 'auto_hold', p_kind, p_id, v_owner, 'model: ' || left(coalesce(p_category, '?'), 60));
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.file_appeal(p_kind text, p_id text, p_message text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  uid  uuid := auth.uid();
  ok   boolean := false;
  v_id uuid;
begin
  if uid is null then raise exception 'sign in to appeal' using errcode = '42501'; end if;
  if p_message is null or length(btrim(p_message)) = 0 then raise exception 'say why it should be looked at again'; end if;
  if p_kind = 'account' then
    ok := not is_active_user(uid);
    p_id := uid::text;
  elsif p_kind = 'contributing' then
    ok := not can_contribute_fields(uid) or not can_flag(uid);
    p_id := uid::text;
  elsif p_kind = 'message'      then ok := exists (select 1 from messages       where id::text = p_id and sender_id  = uid and moderation <> 'visible');
  elsif p_kind = 'crew_message' then ok := exists (select 1 from crews_messages where id::text = p_id and user_id    = uid and moderation <> 'visible');
  elsif p_kind = 'group_post'   then ok := exists (select 1 from group_posts    where id::text = p_id and author     = uid and moderation <> 'visible');
  elsif p_kind = 'group_event'  then ok := exists (select 1 from group_events   where id::text = p_id and host       = uid and moderation <> 'visible');
  elsif p_kind = 'comment'      then ok := exists (select 1 from comments       where id::text = p_id and user_id    = uid and moderation <> 'visible');
  elsif p_kind = 'trip_report'  then ok := exists (select 1 from climb_logs     where id::text = p_id and user_id    = uid and moderation <> 'visible');
  elsif p_kind = 'group'        then ok := exists (select 1 from groups         where id::text = p_id and created_by = uid and moderation <> 'visible');
  elsif p_kind = 'topo'         then ok := exists (select 1 from topos          where id::text = p_id and created_by = uid and moderation <> 'visible');
  elsif p_kind = 'topo_line'    then ok := exists (select 1 from topo_lines     where id::text = p_id and created_by = uid and moderation <> 'visible');
  elsif p_kind = 'list'         then ok := exists (select 1 from user_lists     where id::text = p_id and user_id    = uid and moderation <> 'visible');
  end if;
  if not ok then raise exception 'there is nothing of yours to appeal there' using errcode = 'P0002'; end if;
  insert into moderation_appeals (appellant, target_kind, target_id, message)
  values (uid, p_kind, p_id, left(btrim(p_message), 2000))
  on conflict (appellant, target_kind, target_id) where status = 'open'
  do update set message = excluded.message, created_at = now()
  returning id into v_id;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_account_standing(p_user uuid, p_status text, p_days integer DEFAULT NULL::integer, p_reason text DEFAULT NULL::text, p_remove_content boolean DEFAULT false, p_report uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  uid  uuid := auth.uid();
  v_until timestamptz;
begin
  if not is_admin(uid) then
    raise exception 'only ClimbMatch Safety can change an account''s standing' using errcode = '42501';
  end if;
  if p_user is null or p_user = uid then
    raise exception 'choose another climber';
  end if;
  if is_admin(p_user) then
    raise exception 'an admin account cannot be suspended or banned from here';
  end if;
  if p_status not in ('active', 'suspended', 'banned') then
    raise exception 'unknown status: %', p_status;
  end if;
  if p_status <> 'active' and (p_reason is null or length(btrim(p_reason)) = 0) then
    raise exception 'give the reason the climber will be shown';
  end if;
  if p_status = 'suspended' then
    if p_days is null or p_days < 1 or p_days > 365 then
      raise exception 'a suspension lasts 1 to 365 days';
    end if;
    v_until := now() + make_interval(days => p_days);
  end if;

  insert into account_standing (user_id, status, until, reason, set_by, set_at)
  values (p_user, p_status, v_until, coalesce(nullif(btrim(p_reason), ''), 'Reinstated'), uid, now())
  on conflict (user_id) do update
    set status = excluded.status, until = excluded.until, reason = excluded.reason,
        set_by = excluded.set_by, set_at = excluded.set_at;

  -- The auth half: a ban refuses sign-in and refresh; anything else lifts it.
  update auth.users set banned_until = case when p_status = 'banned' then now() + interval '100 years' else null end
   where id = p_user;

  if p_remove_content and p_status <> 'active' then
    perform set_config('app.moderation_bypass', 'on', true);
    update messages       set moderation = 'removed' where sender_id  = p_user and moderation <> 'removed';
    update crews_messages set moderation = 'removed' where user_id    = p_user and moderation <> 'removed';
    update group_posts    set moderation = 'removed' where author     = p_user and moderation <> 'removed';
    update group_events   set moderation = 'removed' where host       = p_user and moderation <> 'removed';
    update comments       set moderation = 'removed' where user_id    = p_user and moderation <> 'removed';
    update climb_logs     set moderation = 'removed' where user_id    = p_user and moderation <> 'removed';
    update groups         set moderation = 'removed' where created_by = p_user and moderation <> 'removed';
    update topos          set moderation = 'removed' where created_by = p_user and moderation <> 'removed';
    update topo_lines     set moderation = 'removed' where created_by = p_user and moderation <> 'removed';
    update user_lists     set moderation = 'removed' where user_id    = p_user and moderation <> 'removed';
    perform set_config('app.moderation_bypass', '', true);
    insert into moderation_actions (actor, action, target_kind, target_id, target_owner, report_id, note)
    values (uid, 'remove_all', 'account', p_user::text, p_user, p_report, 'everything they posted');
  end if;

  insert into moderation_actions (actor, action, target_kind, target_id, target_owner, report_id, note)
  values (uid, case p_status when 'banned' then 'ban' when 'suspended' then 'suspend' else 'reinstate' end,
          'account', p_user::text, p_user, p_report,
          coalesce(nullif(btrim(p_reason), ''), 'Reinstated') || case when p_days is not null and p_status = 'suspended' then ' (' || p_days || ' days)' else '' end);

  if p_status <> 'active' then
    update user_reports set status = 'actioned', reviewed_by = uid, reviewed_at = now()
     where status in ('open', 'reviewing') and (reported_id = p_user::text or id = p_report);
  end if;
end;
$function$;
