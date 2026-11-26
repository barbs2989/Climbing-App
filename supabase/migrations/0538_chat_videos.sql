-- 0538: a chat can carry a VIDEO, and a video is as private as the chat it was sent in.
--
-- Owner's note (2026-11-25): "Do we have the option of sending videos too?" We did not. A chat photo is a
-- data URL in image_url (00420); a phone video is tens of megabytes, far too large for a row, so a video
-- is a file in Storage and the message row names it.
--
--   1. a PRIVATE bucket, chat-videos: 50 MiB a file (Supabase's Free-plan cap; the bucket limit cannot
--      exceed the project's global one) and the three containers phones and browsers produce;
--   2. messages.video_path / crews_messages.video_path: {sender uid}/{uuid}.{mp4|mov|webm}, and only
--      inside the SENDER's own folder, so a row can never point at somebody else's file;
--   3. who may READ an object: its uploader, an admin, or anyone who can read a message row that names
--      it. The subquery runs under the reader's own RLS on messages / crews_messages, so the DM's two
--      people or the crew's members, and moderation's restrictive policy (0263) hides a taken-down
--      video's file along with its row. Writes only into your own folder; delete only your own;
--   4. 0267's rule that a stranger's DM is words only now covers a video too;
--   5. 0263's "a sent message cannot be rewritten" covers video_path;
--   6. a REPORT of a message snapshots its video ('chat-videos/<path>' in snapshot_media), as a topo's
--      report snapshots its storage path. report_content below is the LIVE definition (0492) with only
--      the two message branches changed.
--
-- Not screened: the automatic screening model reads text and photos, not video. A reported video is
-- held by the three-reporter rule and reviewed by a moderator, as everything else is.

-- 1. the bucket -------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-videos', 'chat-videos', false, 52428800, array['video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 2. the columns ------------------------------------------------------------------------------------
alter table messages       add column if not exists video_path text;
alter table crews_messages add column if not exists video_path text;
alter table messages drop constraint if exists messages_video_path_chk;
alter table messages add  constraint messages_video_path_chk check (video_path is null
  or (video_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(mp4|mov|webm)$' and split_part(video_path, '/', 1) = sender_id::text));
alter table crews_messages drop constraint if exists crews_messages_video_path_chk;
alter table crews_messages add  constraint crews_messages_video_path_chk check (video_path is null
  or (video_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(mp4|mov|webm)$' and split_part(video_path, '/', 1) = user_id::text));
create index if not exists messages_video_path_idx       on messages (video_path)       where video_path is not null;
create index if not exists crews_messages_video_path_idx on crews_messages (video_path) where video_path is not null;

-- 3. who reads, writes and deletes an object --------------------------------------------------------
drop policy if exists "chat_videos read by the chat" on storage.objects;
create policy "chat_videos read by the chat" on storage.objects for select to authenticated
  using (bucket_id = 'chat-videos' and (
    auth.uid()::text = (storage.foldername(name))[1]
    or is_admin(auth.uid())
    or exists (select 1 from public.messages m where m.video_path = storage.objects.name)
    or exists (select 1 from public.crews_messages cm where cm.video_path = storage.objects.name)));
drop policy if exists "chat_videos insert own" on storage.objects;
create policy "chat_videos insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-videos' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "chat_videos delete own" on storage.objects;
create policy "chat_videos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'chat-videos' and auth.uid()::text = (storage.foldername(name))[1]);

-- 4. a stranger's DM is words only, video included (0267) ------------------------------------------
create or replace function guard_message_image_from_stranger() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if coalesce(new.image_url, '') = '' and coalesce(new.video_path, '') = '' then return new; end if;
  if exists (select 1 from connections c where c.status = 'accepted'
              and least(c.requester, c.addressee) = least(new.sender_id, new.recipient_id)
              and greatest(c.requester, c.addressee) = greatest(new.sender_id, new.recipient_id))
     or exists (select 1 from crew_members a join crew_members b on a.crew_id = b.crew_id
                 where a.user_id = new.sender_id and b.user_id = new.recipient_id
                   and a.status = 'confirmed' and b.status = 'confirmed')
     or exists (select 1 from messages m where m.sender_id = new.recipient_id and m.recipient_id = new.sender_id) then
    return new;
  end if;
  raise exception 'Photos and videos can be sent once you’re friends, or after they reply.';
end;
$$;

-- 5. a sent message cannot be rewritten, its video included (0263) ---------------------------------
create or replace function guard_message_update() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.sender_id is distinct from old.sender_id
     or new.recipient_id is distinct from old.recipient_id
     or new.body is distinct from old.body
     or new.image_url is distinct from old.image_url
     or new.video_path is distinct from old.video_path
     or new.created_at is distinct from old.created_at then
    raise exception 'a sent message cannot be rewritten';
  end if;
  return new;
end;
$$;

-- 6. a report of a message keeps its video ----------------------------------------------------------
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
    select m.sender_id, m.body, case when coalesce(m.image_url, '') = '' and coalesce(m.video_path, '') = '' then null
                else (case when coalesce(m.image_url, '') = '' then '[]'::jsonb else jsonb_build_array(m.image_url) end)
                  || (case when coalesce(m.video_path, '') = '' then '[]'::jsonb else jsonb_build_array('chat-videos/' || m.video_path) end) end
      into v_author, v_text, v_media
      from messages m
     where m.id::text = p_id and (m.sender_id = uid or m.recipient_id = uid);
  elsif p_kind = 'crew_message' then
    select cm.user_id, cm.body, case when coalesce(cm.image_url, '') = '' and coalesce(cm.video_path, '') = '' then null
                else (case when coalesce(cm.image_url, '') = '' then '[]'::jsonb else jsonb_build_array(cm.image_url) end)
                  || (case when coalesce(cm.video_path, '') = '' then '[]'::jsonb else jsonb_build_array('chat-videos/' || cm.video_path) end) end
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


-- Confirm:
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'chat-videos';
--   select policyname from pg_policies where schemaname = 'storage' and policyname like 'chat_videos%';
