-- ClimbMatch Safety can suspend or ban an account, tells the climber why, and hears an appeal.
--
-- This REVERSES the 2026-08-19 decision that "no suspension, warning or ban exists" (memory
-- moderation-outcomes-decided-no-suspension). The owner reopened it on 2026-10-07 for App Store
-- listing: App Review's UGC checklist requires acting on a report "by removing the content AND
-- EJECTING THE USER". The objection that stood then -- enforcing account state across ~33 tables
-- would be half-done -- is answered by enforcing at the two places every write passes:
--
--   * AUTH: a BANNED account gets auth.users.banned_until, so GoTrue refuses its sign-in AND its
--     token refresh (measured 2026-10-07: "user_banned" on both).
--   * WRITES: an access token already issued keeps working for up to an hour (measured: a REST read
--     with it still returned 200), so every table people write content into gets a RESTRICTIVE
--     insert policy on is_active_user(). A suspended or banned account cannot post, message, comment,
--     log, report-as-content, connect or create anything -- from the next request on.
--
-- A SUSPENDED account is NOT auth-banned: it can still sign in, which is how it is told why, until
-- when, and how to appeal. It can read; it cannot write.
--
-- Terms §8 and §10 already reserve "We may suspend or remove accounts" -- a claim the app could not
-- honour until now (legal packet F15). It can now.

-- ---------------------------------------------------------------------------------------------
-- 1. Account standing: one row per climber who is (or was) restricted. Read by its subject and by
--    an admin; written only by set_account_standing().
-- ---------------------------------------------------------------------------------------------
create table if not exists account_standing (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  status     text not null check (status in ('active', 'suspended', 'banned')),
  until      timestamptz,
  reason     text not null,
  set_by     uuid references auth.users(id) on delete set null,
  set_at     timestamptz not null default now(),
  constraint account_standing_until_only_for_suspension check (status = 'suspended' or until is null)
);
alter table account_standing enable row level security;
drop policy if exists "standing read own or admin" on account_standing;
create policy "standing read own or admin" on account_standing for select
  using (user_id = auth.uid() or is_admin(auth.uid()));

-- True unless the account is banned, or suspended and the suspension has not run out. A lapsed
-- suspension needs no job to lift it: `until` passing is enough.
create or replace function is_active_user(uid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select uid is not null and not exists (
    select 1 from account_standing s
     where s.user_id = uid
       and (s.status = 'banned' or (s.status = 'suspended' and (s.until is null or s.until > now())))
  );
$$;
revoke all on function is_active_user(uuid) from public, anon;
grant execute on function is_active_user(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2. A restricted account cannot write content. Restrictive, so AND-ed onto each table's own
--    insert policy; written out per table so check:rls can read every one.
-- ---------------------------------------------------------------------------------------------
drop policy if exists "restricted accounts cannot post" on messages;
create policy "restricted accounts cannot post" on messages       as restrictive for insert with check (is_active_user(auth.uid()));
drop policy if exists "restricted accounts cannot post" on crews_messages;
create policy "restricted accounts cannot post" on crews_messages as restrictive for insert with check (is_active_user(auth.uid()));
drop policy if exists "restricted accounts cannot post" on group_posts;
create policy "restricted accounts cannot post" on group_posts    as restrictive for insert with check (is_active_user(auth.uid()));
drop policy if exists "restricted accounts cannot post" on group_events;
create policy "restricted accounts cannot post" on group_events   as restrictive for insert with check (is_active_user(auth.uid()));
drop policy if exists "restricted accounts cannot post" on comments;
create policy "restricted accounts cannot post" on comments       as restrictive for insert with check (is_active_user(auth.uid()));
drop policy if exists "restricted accounts cannot post" on climb_logs;
create policy "restricted accounts cannot post" on climb_logs     as restrictive for insert with check (is_active_user(auth.uid()));
drop policy if exists "restricted accounts cannot post" on groups;
create policy "restricted accounts cannot post" on groups         as restrictive for insert with check (is_active_user(auth.uid()));
drop policy if exists "restricted accounts cannot post" on topos;
create policy "restricted accounts cannot post" on topos          as restrictive for insert with check (is_active_user(auth.uid()));
drop policy if exists "restricted accounts cannot post" on user_lists;
create policy "restricted accounts cannot post" on user_lists     as restrictive for insert with check (is_active_user(auth.uid()));
drop policy if exists "restricted accounts cannot post" on connections;
create policy "restricted accounts cannot post" on connections    as restrictive for insert with check (is_active_user(auth.uid()));
drop policy if exists "restricted accounts cannot post" on contributions;
create policy "restricted accounts cannot post" on contributions  as restrictive for insert with check (is_active_user(auth.uid()));
drop policy if exists "restricted accounts cannot post" on crews;
create policy "restricted accounts cannot post" on crews          as restrictive for insert with check (is_active_user(auth.uid()));
drop policy if exists "restricted accounts cannot post" on crew_members;
create policy "restricted accounts cannot post" on crew_members   as restrictive for insert with check (is_active_user(auth.uid()));
drop policy if exists "restricted accounts cannot post" on group_members;
create policy "restricted accounts cannot post" on group_members  as restrictive for insert with check (is_active_user(auth.uid()));
-- ...nor rewrite the profile everyone else reads (bio, name, photos) while restricted.
drop policy if exists "restricted accounts cannot edit their profile" on profiles;
create policy "restricted accounts cannot edit their profile" on profiles as restrictive for update
  using (true) with check (is_active_user(auth.uid()) or is_admin(auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- 3. The audit log learns the account actions.
-- ---------------------------------------------------------------------------------------------
alter table moderation_actions drop constraint if exists moderation_actions_action_check;
alter table moderation_actions add constraint moderation_actions_action_check
  check (action in ('remove', 'hold', 'restore', 'auto_hold', 'suspend', 'ban', 'reinstate', 'remove_all'));

-- ---------------------------------------------------------------------------------------------
-- 4. set_account_standing(user, status, days, reason, remove_content): admin-only.
--    'banned'    -> auth-banned (no sign-in, no refresh) and refused every write.
--    'suspended' -> refused every write for `days` (1-365); can still sign in to read the notice.
--    'active'    -> reinstated; the auth ban is lifted.
--    remove_content takes down everything they posted that has a `moderation` column, in one go.
-- ---------------------------------------------------------------------------------------------
create or replace function set_account_standing(p_user uuid, p_status text, p_days int default null,
                                                p_reason text default null, p_remove_content boolean default false,
                                                p_report uuid default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
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
$$;
revoke all on function set_account_standing(uuid, text, int, text, boolean, uuid) from public, anon;
grant execute on function set_account_standing(uuid, text, int, text, boolean, uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 5. Appeals. The author of removed or held content, or a restricted account, asks a person to look
--    again. One open appeal per thing; ClimbMatch Safety decides, and a reversal restores the
--    content or reinstates the account in the same transaction.
-- ---------------------------------------------------------------------------------------------
create table if not exists moderation_appeals (
  id          uuid primary key default gen_random_uuid(),
  appellant   uuid not null references auth.users(id) on delete cascade,
  target_kind text not null,
  target_id   text not null,
  message     text not null check (char_length(message) between 1 and 2000),
  status      text not null default 'open' check (status in ('open', 'upheld', 'reversed')),
  created_at  timestamptz not null default now(),
  decided_by  uuid references auth.users(id) on delete set null,
  decided_at  timestamptz,
  decision_note text
);
create unique index if not exists moderation_appeals_one_open
  on moderation_appeals (appellant, target_kind, target_id) where status = 'open';
alter table moderation_appeals enable row level security;
drop policy if exists "appeals read own or admin" on moderation_appeals;
create policy "appeals read own or admin" on moderation_appeals for select
  using (appellant = auth.uid() or is_admin(auth.uid()));

-- file_appeal(kind, id, message): refuses an appeal about anything that is not yours and not taken
-- down. 'account' appeals the caller's own standing.
create or replace function file_appeal(p_kind text, p_id text, p_message text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
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
  elsif p_kind = 'message'      then ok := exists (select 1 from messages       where id::text = p_id and sender_id  = uid and moderation <> 'visible');
  elsif p_kind = 'crew_message' then ok := exists (select 1 from crews_messages where id::text = p_id and user_id    = uid and moderation <> 'visible');
  elsif p_kind = 'group_post'   then ok := exists (select 1 from group_posts    where id::text = p_id and author     = uid and moderation <> 'visible');
  elsif p_kind = 'group_event'  then ok := exists (select 1 from group_events   where id::text = p_id and host       = uid and moderation <> 'visible');
  elsif p_kind = 'comment'      then ok := exists (select 1 from comments       where id::text = p_id and user_id    = uid and moderation <> 'visible');
  elsif p_kind = 'trip_report'  then ok := exists (select 1 from climb_logs     where id::text = p_id and user_id    = uid and moderation <> 'visible');
  elsif p_kind = 'group'        then ok := exists (select 1 from groups         where id::text = p_id and created_by = uid and moderation <> 'visible');
  elsif p_kind = 'topo'         then ok := exists (select 1 from topos          where id::text = p_id and created_by = uid and moderation <> 'visible');
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
$$;
revoke all on function file_appeal(text, text, text) from public, anon;
grant execute on function file_appeal(text, text, text) to authenticated;

-- decide_appeal(id, 'upheld' | 'reversed', note): admin-only. A reversal restores the content or
-- reinstates the account through the same audited functions a reviewer would use by hand.
create or replace function decide_appeal(p_appeal uuid, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  a   moderation_appeals%rowtype;
begin
  if not is_admin(uid) then raise exception 'only ClimbMatch Safety decides appeals' using errcode = '42501'; end if;
  if p_decision not in ('upheld', 'reversed') then raise exception 'unknown decision: %', p_decision; end if;
  select * into a from moderation_appeals where id = p_appeal and status = 'open' for update;
  if not found then raise exception 'that appeal is not open' using errcode = 'P0002'; end if;
  if p_decision = 'reversed' then
    if a.target_kind = 'account' then
      perform set_account_standing(a.appellant, 'active', null, 'Appeal granted', false, null);
    else
      perform moderate_content(a.target_kind, a.target_id, 'restore', null, 'Appeal granted');
    end if;
  end if;
  update moderation_appeals
     set status = p_decision, decided_by = uid, decided_at = now(), decision_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_appeal;
end;
$$;
revoke all on function decide_appeal(uuid, text, text) from public, anon;
grant execute on function decide_appeal(uuid, text, text) to authenticated;

-- Confirm:
--   node scripts/oneoff/probe-suspend-ban-and-appeal.mjs   (real accounts; must end 0 failed)
