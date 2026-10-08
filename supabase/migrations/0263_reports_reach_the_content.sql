-- A report reaches the CONTENT, and ClimbMatch Safety can take content down.
--
-- Before this, the only things a climber could report were a person (user_reports, which points
-- at nobody's words) and a route photo (content_reports). A DM, a crew-chat message, a group post,
-- a comment, a trip report, a group or a list could not be reported at all; the one group-post
-- report (#2258) welded the post's text into `detail`, which the reporter types and can forge.
-- And the reviewer had no lever: "Actioned" changed a status and nothing else, the admin's RLS
-- reached none of these tables, and a photo "take down" left the file public (no admin DELETE on
-- storage). App Review's checklist asks for exactly this -- a way to flag content, and a developer
-- who acts on reports by removing the content (docs/SAFETY-AND-MODERATION-PLAN.md, Part 2/3).
--
-- 1. `moderation` ('visible' | 'held' | 'removed') on every table of words other people read, and a
--    RESTRICTIVE select policy that shows a non-visible row only to its author (who is told it was
--    taken down) and to an admin. Restrictive, so no existing permissive policy is rewritten: it is
--    AND-ed onto whatever decides readability today.
-- 2. Only the two definer functions below may change `moderation` -- not a client, not even an
--    admin's client -- so every take-down goes through the audit log.
-- 3. report_content(): the snapshot of what was reported is copied SERVER-SIDE, from a row the
--    reporter can actually read. The reviewer sees the reported DM without any blanket access to DMs.
-- 4. moderate_content(): admin-only remove / hold / restore, logged in moderation_actions.
-- 5. Two holes found on the way:
--    - messages' UPDATE policy ("mark own received messages as read") has no WITH CHECK, so a
--      RECIPIENT could rewrite the body of a message someone sent them -- i.e. fabricate the
--      evidence they then report. A trigger now pins everything but `read`.
--    - an admin could not delete a reported photo's FILE (storage allowed owner delete only).

-- ---------------------------------------------------------------------------------------------
-- 1. The column, the check, and the restrictive read policy, table by table (written out rather
--    than generated, so check:rls and check:migration-replay can read every policy).
-- ---------------------------------------------------------------------------------------------
alter table messages       add column if not exists moderation text not null default 'visible';
alter table crews_messages add column if not exists moderation text not null default 'visible';
alter table group_posts    add column if not exists moderation text not null default 'visible';
alter table group_events   add column if not exists moderation text not null default 'visible';
alter table comments       add column if not exists moderation text not null default 'visible';
alter table climb_logs     add column if not exists moderation text not null default 'visible';
alter table groups         add column if not exists moderation text not null default 'visible';
alter table topos          add column if not exists moderation text not null default 'visible';
alter table user_lists     add column if not exists moderation text not null default 'visible';

alter table messages       drop constraint if exists messages_moderation_chk;
alter table messages       add  constraint messages_moderation_chk       check (moderation in ('visible','held','removed'));
alter table crews_messages drop constraint if exists crews_messages_moderation_chk;
alter table crews_messages add  constraint crews_messages_moderation_chk check (moderation in ('visible','held','removed'));
alter table group_posts    drop constraint if exists group_posts_moderation_chk;
alter table group_posts    add  constraint group_posts_moderation_chk    check (moderation in ('visible','held','removed'));
alter table group_events   drop constraint if exists group_events_moderation_chk;
alter table group_events   add  constraint group_events_moderation_chk   check (moderation in ('visible','held','removed'));
alter table comments       drop constraint if exists comments_moderation_chk;
alter table comments       add  constraint comments_moderation_chk       check (moderation in ('visible','held','removed'));
alter table climb_logs     drop constraint if exists climb_logs_moderation_chk;
alter table climb_logs     add  constraint climb_logs_moderation_chk     check (moderation in ('visible','held','removed'));
alter table groups         drop constraint if exists groups_moderation_chk;
alter table groups         add  constraint groups_moderation_chk         check (moderation in ('visible','held','removed'));
alter table topos          drop constraint if exists topos_moderation_chk;
alter table topos          add  constraint topos_moderation_chk          check (moderation in ('visible','held','removed'));
alter table user_lists     drop constraint if exists user_lists_moderation_chk;
alter table user_lists     add  constraint user_lists_moderation_chk     check (moderation in ('visible','held','removed'));

drop policy if exists "moderation hides taken-down content" on messages;
create policy "moderation hides taken-down content" on messages as restrictive for select
  using (moderation = 'visible' or sender_id = auth.uid() or is_admin(auth.uid()));
drop policy if exists "moderation hides taken-down content" on crews_messages;
create policy "moderation hides taken-down content" on crews_messages as restrictive for select
  using (moderation = 'visible' or user_id = auth.uid() or is_admin(auth.uid()));
drop policy if exists "moderation hides taken-down content" on group_posts;
create policy "moderation hides taken-down content" on group_posts as restrictive for select
  using (moderation = 'visible' or author = auth.uid() or is_admin(auth.uid()));
drop policy if exists "moderation hides taken-down content" on group_events;
create policy "moderation hides taken-down content" on group_events as restrictive for select
  using (moderation = 'visible' or host = auth.uid() or is_admin(auth.uid()));
drop policy if exists "moderation hides taken-down content" on comments;
create policy "moderation hides taken-down content" on comments as restrictive for select
  using (moderation = 'visible' or user_id = auth.uid() or is_admin(auth.uid()));
drop policy if exists "moderation hides taken-down content" on climb_logs;
create policy "moderation hides taken-down content" on climb_logs as restrictive for select
  using (moderation = 'visible' or user_id = auth.uid() or is_admin(auth.uid()));
drop policy if exists "moderation hides taken-down content" on groups;
create policy "moderation hides taken-down content" on groups as restrictive for select
  using (moderation = 'visible' or created_by = auth.uid() or is_admin(auth.uid()));
drop policy if exists "moderation hides taken-down content" on topos;
create policy "moderation hides taken-down content" on topos as restrictive for select
  using (moderation = 'visible' or created_by = auth.uid() or is_admin(auth.uid()));
drop policy if exists "moderation hides taken-down content" on user_lists;
create policy "moderation hides taken-down content" on user_lists as restrictive for select
  using (moderation = 'visible' or user_id = auth.uid() or is_admin(auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- 2. Nobody sets `moderation` by writing the row. A new row is always 'visible'; a change needs the
--    transaction-local flag only report_content()/moderate_content() raise. PostgREST cannot call
--    set_config (pg_catalog is not an exposed schema), and each request is its own transaction.
-- ---------------------------------------------------------------------------------------------
create or replace function guard_moderation_column() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if coalesce(current_setting('app.moderation_bypass', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.moderation := 'visible';
  elsif new.moderation is distinct from old.moderation then
    raise exception 'content is taken down or restored only through ClimbMatch Safety';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_guard_moderation on messages;
create trigger messages_guard_moderation before insert or update on messages
  for each row execute function guard_moderation_column();
drop trigger if exists crews_messages_guard_moderation on crews_messages;
create trigger crews_messages_guard_moderation before insert or update on crews_messages
  for each row execute function guard_moderation_column();
drop trigger if exists group_posts_guard_moderation on group_posts;
create trigger group_posts_guard_moderation before insert or update on group_posts
  for each row execute function guard_moderation_column();
drop trigger if exists group_events_guard_moderation on group_events;
create trigger group_events_guard_moderation before insert or update on group_events
  for each row execute function guard_moderation_column();
drop trigger if exists comments_guard_moderation on comments;
create trigger comments_guard_moderation before insert or update on comments
  for each row execute function guard_moderation_column();
drop trigger if exists climb_logs_guard_moderation on climb_logs;
create trigger climb_logs_guard_moderation before insert or update on climb_logs
  for each row execute function guard_moderation_column();
drop trigger if exists groups_guard_moderation on groups;
create trigger groups_guard_moderation before insert or update on groups
  for each row execute function guard_moderation_column();
drop trigger if exists topos_guard_moderation on topos;
create trigger topos_guard_moderation before insert or update on topos
  for each row execute function guard_moderation_column();
drop trigger if exists user_lists_guard_moderation on user_lists;
create trigger user_lists_guard_moderation before insert or update on user_lists
  for each row execute function guard_moderation_column();

-- ---------------------------------------------------------------------------------------------
-- 5a. A sent message cannot be rewritten. The recipient's UPDATE exists to mark it read.
-- ---------------------------------------------------------------------------------------------
create or replace function guard_message_update() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.sender_id is distinct from old.sender_id
     or new.recipient_id is distinct from old.recipient_id
     or new.body is distinct from old.body
     or new.image_url is distinct from old.image_url
     or new.created_at is distinct from old.created_at then
    raise exception 'a sent message cannot be rewritten';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_guard_update on messages;
create trigger messages_guard_update before update on messages
  for each row execute function guard_message_update();

-- ---------------------------------------------------------------------------------------------
-- 3. Reports carry WHAT was reported. Only report_content() may fill these columns: the insert
--    policy below refuses a client-written target or snapshot, so a snapshot is never the
--    reporter's own words about somebody else.
-- ---------------------------------------------------------------------------------------------
alter table user_reports add column if not exists target_kind    text;
alter table user_reports add column if not exists target_id      text;
alter table user_reports add column if not exists snapshot       text;
alter table user_reports add column if not exists snapshot_media jsonb;
alter table user_reports add column if not exists snapshot_at    timestamptz;
alter table user_reports drop constraint if exists user_reports_target_kind_chk;
alter table user_reports add constraint user_reports_target_kind_chk check (target_kind is null or target_kind in
  ('message','crew_message','group_post','group_event','comment','trip_report','group','topo','list','profile'));
create unique index if not exists user_reports_one_per_target
  on user_reports (reporter, target_kind, target_id)
  where target_kind is not null and reporter is not null;
create index if not exists user_reports_target_idx on user_reports (target_kind, target_id);

drop policy if exists "anyone can file a report open" on user_reports;
create policy "anyone can file a report open" on user_reports for insert
  with check (status = 'open' and (reporter is null or reporter = auth.uid())
              and target_kind is null and target_id is null and snapshot is null and snapshot_media is null);

-- The audit trail of every take-down, hold and restore. Written only by moderate_content() and
-- report_content() (definers); read only by an admin.
create table if not exists moderation_actions (
  id           uuid primary key default gen_random_uuid(),
  actor        uuid references auth.users(id) on delete set null,
  action       text not null check (action in ('remove','hold','restore','auto_hold')),
  target_kind  text not null,
  target_id    text not null,
  target_owner uuid,
  report_id    uuid references user_reports(id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists moderation_actions_target_idx on moderation_actions (target_kind, target_id, created_at desc);
alter table moderation_actions enable row level security;
drop policy if exists "admins read moderation actions" on moderation_actions;
create policy "admins read moderation actions" on moderation_actions for select
  using (is_admin(auth.uid()));

-- Set a target's moderation. Shared by both functions below; never granted to a client.
create or replace function _set_content_moderation(p_kind text, p_id text, p_state text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
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
  elsif p_kind = 'list'         then update user_lists     set moderation = p_state where id::text = p_id returning user_id    into v_owner;
  else raise exception 'content of kind % cannot be held or removed', p_kind;
  end if;
  perform set_config('app.moderation_bypass', '', true);
  return v_owner;
end;
$$;
revoke all on function _set_content_moderation(text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. report_content(kind, id, reason, detail) -> report id.
--    Refuses content the caller cannot read (same rules as each table's read policy), their own
--    content, and more than 30 reports a day. A second report of the same thing by the same
--    climber updates theirs rather than adding a row. THREE different climbers reporting one item
--    HOLDS it -- hidden from everyone but its author -- until a person reviews it; one report never
--    can, or a single account could hide anything it disliked.
-- ---------------------------------------------------------------------------------------------
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
                and l.crew_id in (select cm.crew_id from crew_members cm where cm.user_id = uid and cm.status = 'confirmed')));
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

-- ---------------------------------------------------------------------------------------------
-- 4. moderate_content(kind, id, action, report, note): ClimbMatch Safety removes, holds or restores.
--    A profile has no `moderation` row to hide -- removing one CLEARS what was reported (bio, avatar,
--    photos), which cannot be restored from here. Closing the report it came from is part of the
--    same transaction, so the queue cannot say "Closed" over a take-down that did not happen.
-- ---------------------------------------------------------------------------------------------
create or replace function moderate_content(p_kind text, p_id text, p_action text,
                                            p_report uuid default null, p_note text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid     uuid := auth.uid();
  v_owner uuid;
begin
  if not is_admin(uid) then
    raise exception 'only ClimbMatch Safety can take content down' using errcode = '42501';
  end if;
  if p_action not in ('remove', 'hold', 'restore') then
    raise exception 'unknown action: %', p_action;
  end if;

  if p_kind = 'profile' then
    if p_action <> 'remove' then
      raise exception 'a profile cannot be held or restored here — removing clears its bio and photos';
    end if;
    update profiles set bio = null, avatar = null, photos = '{}' where id::text = p_id returning id into v_owner;
  else
    v_owner := _set_content_moderation(p_kind, p_id,
                 case p_action when 'remove' then 'removed' when 'hold' then 'held' else 'visible' end);
  end if;
  if v_owner is null then
    raise exception 'no such content (it may have been deleted by its author)' using errcode = 'P0002';
  end if;

  insert into moderation_actions (actor, action, target_kind, target_id, target_owner, report_id, note)
  values (uid, p_action, p_kind, p_id, v_owner, p_report, nullif(btrim(coalesce(p_note, '')), ''));

  -- Every open report about this item is answered by the same decision, not just the one tapped.
  update user_reports
     set status = case when p_action = 'restore' then 'dismissed' else 'actioned' end,
         reviewed_by = uid, reviewed_at = now()
   where status in ('open', 'reviewing')
     and ((target_kind = p_kind and target_id = p_id) or id = p_report);
end;
$$;
revoke all on function moderate_content(text, text, text, uuid, text) from public, anon;
grant execute on function moderate_content(text, text, text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 5b. An admin can delete a reported photo's FILE, not just its row.
-- ---------------------------------------------------------------------------------------------
drop policy if exists "admins remove reported photos" on storage.objects;
create policy "admins remove reported photos" on storage.objects for delete
  using (bucket_id = 'topo-photos' and is_admin(auth.uid()));

-- Confirm:
--   node scripts/oneoff/probe-reports-reach-the-content.mjs   (three real accounts; must end 0 failed)
