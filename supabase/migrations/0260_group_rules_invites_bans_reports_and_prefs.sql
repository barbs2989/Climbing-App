-- 0260 — Groups, the Facebook follow-ups the owner approved on 2026-10-07 ("yes to all").
--
-- Seven things, each with the rule that makes it true rather than a control that only looks it:
--
-- 1. RULES, AND "I AGREE". `groups.rules` holds up to 10 {title, details}. A group with rules cannot
--    be joined, asked to join, or have an invitation accepted without agreeing to them: the agreement
--    is a column (`group_members.rules_agreed_at`) the policies require, so skipping the checkbox is
--    a refused write, not a forgotten one. join_group() is the one door for joining and asking; the
--    self-insert policy now admits only a group with no rules (and, as 0258, no questions).
--
-- 2. MEMBERS INVITE FRIENDS. `groups.invite_policy` is 'members' (Facebook's default) or 'mods'.
--    `group_members.invited_by` records who asked, so the invitee is told by whom and an inviter can
--    withdraw their own invitation. Since this file, NOBODY may invite a climber who has blocked them
--    (0095's profile_owner_blocked_me) or one the group has banned — the moderation plan listed group
--    invites as the one invite path the block did not reach.
--
-- 3. PER-GROUP NOTIFICATIONS AND UNREAD. `group_member_prefs` holds, per member, a level ('all',
--    'highlights', 'off') and when they last opened the group. The app derives its bell from these:
--    nothing here sends anything. Own rows only, and only for a group you are an active member of.
--
-- 4. TOPICS. `group_posts.topic`, one of a fixed climbing set, or none.
--
-- 5. SAVED POSTS THAT PERSIST. `group_post_saves`, own rows only, on posts you can read.
--
-- 6. APPROVE ALL, AND DECLINE WITH A MESSAGE. Approve-all is the existing manager UPDATE, unchanged.
--    decline_group_request() removes the request and, when the organizer wrote one, leaves a message
--    the climber can read (`group_join_declines`) — and nobody else but the group's managers.
--
-- 7. OWNERSHIP, BANS, AND A REPORT QUEUE FOR THE GROUP'S OWN MODERATORS.
--    * "Owner" is the roster's owner row (`role = 'owner'`), as 0258's is_group_owner already reads
--      it. `groups.created_by` stays the immutable record of who CREATED the group (its guard trigger
--      is unchanged); deleting a group now follows the owner, not the creator.
--      transfer_group_ownership() swaps the two rows atomically.
--    * `group_bans`: a banned climber cannot join, ask, or be invited. ban_group_member() removes
--      them (whatever their status) and records the ban; a moderator may ban a member, only the
--      owner may ban a moderator, and nobody bans the owner.
--    * `group_reports`: a member reports a post, a comment or a member to the GROUP'S moderators,
--      with a snapshot of what they saw (the shape docs/SAFETY-AND-MODERATION-PLAN.md proposes for
--      the app-wide queue: target_kind, target_id, snapshot). The reporter is never shown to the
--      moderators by the app; managers resolve or dismiss, and can change nothing else on the row.
--
-- NON-GOALS: no push or email (the bell is derived), no app-level suspension (that is the moderation
-- plan's decision, still with the owner), no anonymous posting.

-- ── helpers ─────────────────────────────────────────────────────────────────────────────────────

-- Rules: up to 10, each {title 1-100, details 0-600}. Same coalesce discipline as 0258's validator.
create or replace function group_rules_valid(r jsonb) returns boolean
language plpgsql immutable set search_path = public, pg_temp as $$
declare e jsonb;
begin
  if r is null or jsonb_typeof(r) <> 'array' or jsonb_array_length(r) > 10 then return false; end if;
  for e in select value from jsonb_array_elements(r) loop
    if coalesce(jsonb_typeof(e), '') <> 'object' then return false; end if;
    if coalesce(jsonb_typeof(e -> 'title'), '') <> 'string' then return false; end if;
    if coalesce(length(btrim(e ->> 'title')), 0) not between 1 and 100 then return false; end if;
    if e ? 'details' and coalesce(jsonb_typeof(e -> 'details'), '') <> 'string' then return false; end if;
    if coalesce(length(e ->> 'details'), 0) > 600 then return false; end if;
  end loop;
  return true;
end $$;

-- ── columns ─────────────────────────────────────────────────────────────────────────────────────

alter table groups add column if not exists rules jsonb not null default '[]'::jsonb;
alter table groups drop constraint if exists groups_rules_valid;
alter table groups add constraint groups_rules_valid check (group_rules_valid(rules));
alter table groups add column if not exists invite_policy text not null default 'members';
alter table groups drop constraint if exists groups_invite_policy_check;
alter table groups add constraint groups_invite_policy_check check (invite_policy in ('members', 'mods'));

comment on column groups.rules is 'Up to 10 group rules [{title, details}] (0260). A group with rules is joined only by agreeing to them.';
comment on column groups.invite_policy is 'Who may invite people: members (any active member) or mods (owner and moderators) (0260).';

alter table group_members add column if not exists invited_by uuid references auth.users(id) on delete set null default auth.uid();
alter table group_members add column if not exists rules_agreed_at timestamptz;

comment on column group_members.invited_by is 'Who created this row: the inviter for an invitation, the climber themselves for a join or request (0260).';
comment on column group_members.rules_agreed_at is 'When this climber agreed to the group''s rules (0260). Required to join a group that has rules.';

alter table group_posts add column if not exists topic text;
alter table group_posts drop constraint if exists group_posts_topic_check;
alter table group_posts add constraint group_posts_topic_check
  check (topic is null or topic in ('partner', 'conditions', 'gear', 'beta', 'trip', 'question'));

-- ── 3. notification level + last seen ──────────────────────────────────────────────────────────

create table if not exists group_member_prefs (
  group_id     uuid not null,
  user_id      uuid not null default auth.uid(),
  notify       text not null default 'highlights' check (notify in ('all', 'highlights', 'off')),
  last_seen_at timestamptz,
  primary key (group_id, user_id),
  foreign key (group_id, user_id) references group_members (group_id, user_id) on delete cascade
);
alter table group_member_prefs enable row level security;
drop policy if exists "group prefs are your own" on group_member_prefs;
create policy "group prefs are your own" on group_member_prefs for select using (auth.uid() = group_member_prefs.user_id);
drop policy if exists "group prefs written by the member" on group_member_prefs;
create policy "group prefs written by the member" on group_member_prefs for insert
  with check (auth.uid() = group_member_prefs.user_id and is_group_member(group_member_prefs.group_id));
drop policy if exists "group prefs changed by the member" on group_member_prefs;
create policy "group prefs changed by the member" on group_member_prefs for update
  using (auth.uid() = group_member_prefs.user_id)
  with check (auth.uid() = group_member_prefs.user_id and is_group_member(group_member_prefs.group_id));
drop policy if exists "group prefs cleared by the member" on group_member_prefs;
create policy "group prefs cleared by the member" on group_member_prefs for delete using (auth.uid() = group_member_prefs.user_id);

-- ── 5. saved posts ─────────────────────────────────────────────────────────────────────────────

create table if not exists group_post_saves (
  post_id    uuid not null references group_posts(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table group_post_saves enable row level security;
drop policy if exists "saved posts are your own" on group_post_saves;
create policy "saved posts are your own" on group_post_saves for select using (auth.uid() = group_post_saves.user_id);
-- The subquery runs under the caller's RLS on group_posts, so a save needs a post you can read.
drop policy if exists "save a post you can read" on group_post_saves;
create policy "save a post you can read" on group_post_saves for insert
  with check (auth.uid() = group_post_saves.user_id and exists (select 1 from group_posts p where p.id = group_post_saves.post_id));
drop policy if exists "unsave your own" on group_post_saves;
create policy "unsave your own" on group_post_saves for delete using (auth.uid() = group_post_saves.user_id);

-- ── 6. declines with a message ─────────────────────────────────────────────────────────────────

create table if not exists group_join_declines (
  group_id    uuid not null references groups(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  message     text not null check (length(btrim(message)) between 1 and 500),
  declined_by uuid references auth.users(id) on delete set null,
  declined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table group_join_declines enable row level security;
drop policy if exists "a decline is read by the climber and the group's managers" on group_join_declines;
create policy "a decline is read by the climber and the group's managers" on group_join_declines for select
  using (auth.uid() = group_join_declines.user_id or is_group_manager(group_join_declines.group_id));
drop policy if exists "the climber dismisses their own decline" on group_join_declines;
create policy "the climber dismisses their own decline" on group_join_declines for delete
  using (auth.uid() = group_join_declines.user_id);

-- ── 7. bans ────────────────────────────────────────────────────────────────────────────────────

create table if not exists group_bans (
  group_id   uuid not null references groups(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  banned_by  uuid references auth.users(id) on delete set null,
  reason     text check (reason is null or length(reason) <= 300),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table group_bans enable row level security;
drop policy if exists "bans are read by the group's managers" on group_bans;
create policy "bans are read by the group's managers" on group_bans for select using (is_group_manager(group_bans.group_id));
-- Writes go through ban_group_member() / unban_group_member() only.

-- ── 7. reports to the group's moderators ───────────────────────────────────────────────────────

create table if not exists group_reports (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references groups(id) on delete cascade,
  target_kind   text not null check (target_kind in ('post', 'comment', 'member')),
  target_id     uuid,
  reported_user uuid references auth.users(id) on delete set null,
  reporter      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason        text not null check (length(btrim(reason)) between 1 and 80),
  detail        text check (detail is null or length(detail) <= 1000),
  snapshot      text check (snapshot is null or length(snapshot) <= 2000),
  status        text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by   uuid references auth.users(id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists group_reports_open_idx on group_reports (group_id, status, created_at desc);
alter table group_reports enable row level security;
drop policy if exists "a member reports as themselves" on group_reports;
create policy "a member reports as themselves" on group_reports for insert
  with check (auth.uid() = group_reports.reporter and group_reports.status = 'open' and is_group_member(group_reports.group_id));
drop policy if exists "reports are read by their reporter and the group's managers" on group_reports;
create policy "reports are read by their reporter and the group's managers" on group_reports for select
  using (auth.uid() = group_reports.reporter or is_group_manager(group_reports.group_id));
drop policy if exists "the group's managers close a report" on group_reports;
create policy "the group's managers close a report" on group_reports for update
  using (is_group_manager(group_reports.group_id)) with check (is_group_manager(group_reports.group_id));

-- A manager closes a report; nothing else on the row may change (an UPDATE policy cannot pin columns).
create or replace function guard_group_report_update() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.group_id is distinct from old.group_id or new.target_kind is distinct from old.target_kind
     or new.target_id is distinct from old.target_id or new.reported_user is distinct from old.reported_user
     or new.reporter is distinct from old.reporter or new.reason is distinct from old.reason
     or new.detail is distinct from old.detail or new.snapshot is distinct from old.snapshot
     or new.created_at is distinct from old.created_at then
    raise exception 'a report can only be resolved or dismissed';
  end if;
  new.resolved_by := auth.uid();
  new.resolved_at := case when new.status = 'open' then null else now() end;
  return new;
end $$;
drop trigger if exists trg_group_report_update on group_reports;
create trigger trg_group_report_update before update on group_reports
  for each row execute function guard_group_report_update();

-- Helpers for the policies below. SQL-language functions are checked against the schema when they
-- are CREATED, so they sit after the columns and tables they read (a replay into an empty database
-- stops otherwise — check:migration-replay caught it).
create or replace function group_has_rules(gid uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select coalesce((select jsonb_array_length(rules) > 0 from groups where id = gid), false);
$$;

create or replace function group_user_banned(gid uuid, who uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (select 1 from group_bans where group_id = gid and user_id = who);
$$;

create or replace function group_invite_policy(gid uuid) returns text
language sql security definer stable set search_path = public, pg_temp as $$
  select invite_policy from groups where id = gid;
$$;

-- ── 1/2/7. membership policies ─────────────────────────────────────────────────────────────────

-- Self-seating (0178, 0258) admits only a group with no rules and no questions, and never a banned
-- climber. Everything else goes through join_group().
drop policy if exists "group_members join self" on group_members;
create policy "group_members join self" on group_members for insert
  with check (
    auth.uid() = group_members.user_id
    and group_members.role = 'member'
    and not group_user_banned(group_members.group_id, auth.uid())
    and (
      (group_members.status = 'active' and exists (
        select 1 from groups g
        where g.id = group_members.group_id and g.visibility = 'public' and g.policy = 'open'
          and jsonb_array_length(g.rules) = 0
      ))
      or
      (group_members.status = 'pending' and exists (
        select 1 from groups g
        where g.id = group_members.group_id and g.visibility = 'public'
          and g.policy in ('approval', 'trust')
          and jsonb_array_length(g.join_questions) = 0 and jsonb_array_length(g.rules) = 0
      ))
    )
  );

-- ONE invite policy for managers and (where the group allows it) members. The inviter is recorded,
-- and neither a banned climber nor one who has blocked the inviter can be invited.
drop policy if exists "group_members invite by manager" on group_members;
drop policy if exists "group_members invite" on group_members;
create policy "group_members invite" on group_members for insert
  with check (
    auth.uid() <> group_members.user_id
    and group_members.status = 'invited'
    and group_members.role = 'member'
    and group_members.invited_by = auth.uid()
    and (is_group_manager(group_members.group_id)
         or (is_group_member(group_members.group_id) and group_invite_policy(group_members.group_id) = 'members'))
    and not group_user_banned(group_members.group_id, group_members.user_id)
    and not profile_owner_blocked_me(group_members.user_id)
  );

-- Accepting an invitation to a group with rules records the agreement in the same write.
drop policy if exists "group_members accept own invite" on group_members;
create policy "group_members accept own invite" on group_members for update
  using (auth.uid() = group_members.user_id and group_members.status = 'invited')
  with check (
    auth.uid() = group_members.user_id and group_members.status = 'active' and group_members.role = 'member'
    and (group_members.rules_agreed_at is not null or not group_has_rules(group_members.group_id))
  );

-- Your own row, and invitations you sent (so "Invited · undo" survives a reload).
drop policy if exists "group_members read own" on group_members;
create policy "group_members read own" on group_members for select
  using (auth.uid() = group_members.user_id or auth.uid() = group_members.invited_by);

-- 0258's delete rules, plus: an inviter withdraws an invitation they sent.
drop policy if exists "group_members leave or be removed" on group_members;
create policy "group_members leave or be removed" on group_members for delete
  using (
    (auth.uid() = group_members.user_id and group_members.role <> 'owner')
    or (is_group_owner(group_members.group_id) and group_members.role <> 'owner')
    or (is_group_manager(group_members.group_id) and group_members.role = 'member')
    or (group_members.status = 'invited' and auth.uid() = group_members.invited_by)
  );

-- Deleting a group follows its OWNER (the roster), not its immutable creator.
drop policy if exists "groups delete by creator" on groups;
drop policy if exists "groups delete by owner" on groups;
create policy "groups delete by owner" on groups for delete using (is_group_owner(groups.id));

-- ── RPCs ───────────────────────────────────────────────────────────────────────────────────────

-- THE door for joining an open group and asking to join a gated one. Returns 'active' or 'pending'.
create or replace function join_group(gid uuid, answers jsonb default '[]'::jsonb, agreed_rules boolean default false)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  g    groups%rowtype;
  me   uuid := auth.uid();
  qs   jsonb;
  q    jsonb;
  a    text;
  n    int;
  i    int;
  snap jsonb := '[]'::jsonb;
  has_rules boolean;
begin
  if me is null then raise exception 'Sign in to join a group' using errcode = '42501'; end if;
  select * into g from groups where id = gid;
  if not found then raise exception 'That group no longer exists' using errcode = 'P0002'; end if;
  if g.visibility <> 'public' then raise exception 'This group is invite only' using errcode = '42501'; end if;
  if exists (select 1 from group_bans b where b.group_id = gid and b.user_id = me) then
    raise exception 'You can’t join this group' using errcode = '42501';
  end if;
  if exists (select 1 from group_members m where m.group_id = gid and m.user_id = me) then
    raise exception 'You have already asked to join, been invited to, or joined this group' using errcode = '23505';
  end if;
  has_rules := jsonb_array_length(coalesce(g.rules, '[]'::jsonb)) > 0;
  if has_rules and not coalesce(agreed_rules, false) then
    raise exception 'Please agree to the group’s rules' using errcode = '23514';
  end if;

  if g.policy = 'open' then
    insert into group_members (group_id, user_id, role, status, rules_agreed_at)
      values (gid, me, 'member', 'active', case when has_rules then now() end);
    delete from group_join_declines d where d.group_id = gid and d.user_id = me;
    return 'active';
  end if;

  if answers is null or jsonb_typeof(answers) <> 'array' then answers := '[]'::jsonb; end if;
  qs := coalesce(g.join_questions, '[]'::jsonb);
  n := jsonb_array_length(qs);
  for i in 0 .. n - 1 loop
    q := qs -> i;
    a := btrim(coalesce(answers ->> i, ''));
    if length(a) > 1000 then
      raise exception 'Your answer to "%" is too long — 1000 characters at most', q ->> 'prompt' using errcode = '22001';
    end if;
    if a = '' and coalesce((q ->> 'required')::boolean, false) then
      raise exception 'Please answer: %', q ->> 'prompt' using errcode = '23514';
    end if;
    if a <> '' and q ->> 'type' = 'choice'
       and not exists (select 1 from jsonb_array_elements_text(q -> 'options') o where o = a) then
      raise exception 'Pick one of the listed answers for: %', q ->> 'prompt' using errcode = '23514';
    end if;
    snap := snap || jsonb_build_array(jsonb_build_object('prompt', q ->> 'prompt', 'type', q ->> 'type', 'answer', a));
  end loop;

  insert into group_members (group_id, user_id, role, status, rules_agreed_at)
    values (gid, me, 'member', 'pending', case when has_rules then now() end);
  if n > 0 then
    insert into group_join_answers (group_id, user_id, answers) values (gid, me, snap);
  end if;
  delete from group_join_declines d where d.group_id = gid and d.user_id = me;
  return 'pending';
end $$;
revoke all on function join_group(uuid, jsonb, boolean) from public, anon;
grant execute on function join_group(uuid, jsonb, boolean) to authenticated;

-- 0258's request door, kept for any client still calling it; it cannot agree to rules, so a group
-- with rules refuses it and the climber is sent through join_group().
create or replace function request_to_join_group(gid uuid, answers jsonb default '[]'::jsonb)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if (select policy from groups where id = gid) = 'open' then
    raise exception 'This group is open to all — join it directly' using errcode = 'P0001';
  end if;
  perform join_group(gid, answers, false);
end $$;
revoke all on function request_to_join_group(uuid, jsonb) from public, anon;
grant execute on function request_to_join_group(uuid, jsonb) to authenticated;

create or replace function decline_group_request(gid uuid, who uuid, message text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare msg text := nullif(btrim(coalesce(message, '')), '');
begin
  if not is_group_manager(gid) then
    raise exception 'Only the group’s organizer or a moderator can decline a request' using errcode = '42501';
  end if;
  if msg is not null and length(msg) > 500 then
    raise exception 'Keep the message to 500 characters' using errcode = '22001';
  end if;
  delete from group_members m where m.group_id = gid and m.user_id = who and m.status = 'pending';
  if not found then
    raise exception 'That request is no longer waiting — it may have been withdrawn or answered' using errcode = 'P0002';
  end if;
  if msg is not null then
    insert into group_join_declines (group_id, user_id, message, declined_by)
      values (gid, who, msg, auth.uid())
      on conflict (group_id, user_id) do update set message = excluded.message, declined_by = excluded.declined_by, declined_at = now();
  end if;
end $$;
revoke all on function decline_group_request(uuid, uuid, text) from public, anon;
grant execute on function decline_group_request(uuid, uuid, text) to authenticated;

create or replace function transfer_group_ownership(gid uuid, new_owner uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid();
begin
  if not is_group_owner(gid) then
    raise exception 'Only the group’s owner can hand it over' using errcode = '42501';
  end if;
  if new_owner is null or new_owner = me then
    raise exception 'Pick another member to hand the group to' using errcode = '22023';
  end if;
  if not exists (select 1 from group_members m where m.group_id = gid and m.user_id = new_owner and m.status = 'active') then
    raise exception 'They have to be a member of the group first' using errcode = 'P0002';
  end if;
  update group_members set role = 'owner' where group_id = gid and user_id = new_owner;
  update group_members set role = 'moderator' where group_id = gid and user_id = me;
end $$;
revoke all on function transfer_group_ownership(uuid, uuid) from public, anon;
grant execute on function transfer_group_ownership(uuid, uuid) to authenticated;

create or replace function ban_group_member(gid uuid, who uuid, reason text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare r text; why text := nullif(btrim(coalesce(reason, '')), '');
begin
  if not is_group_manager(gid) then
    raise exception 'Only the group’s organizer or a moderator can ban someone' using errcode = '42501';
  end if;
  if who is null or who = auth.uid() then
    raise exception 'You can’t ban yourself' using errcode = '22023';
  end if;
  select role into r from group_members where group_id = gid and user_id = who;
  if r = 'owner' then
    raise exception 'The group’s owner can’t be banned' using errcode = '42501';
  end if;
  if r = 'moderator' and not is_group_owner(gid) then
    raise exception 'Only the owner can ban a moderator' using errcode = '42501';
  end if;
  if why is not null and length(why) > 300 then
    raise exception 'Keep the reason to 300 characters' using errcode = '22001';
  end if;
  delete from group_members where group_id = gid and user_id = who;
  insert into group_bans (group_id, user_id, banned_by, reason) values (gid, who, auth.uid(), why)
    on conflict (group_id, user_id) do update set banned_by = excluded.banned_by, reason = excluded.reason, created_at = now();
end $$;
revoke all on function ban_group_member(uuid, uuid, text) from public, anon;
grant execute on function ban_group_member(uuid, uuid, text) to authenticated;

create or replace function unban_group_member(gid uuid, who uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_group_manager(gid) then
    raise exception 'Only the group’s organizer or a moderator can lift a ban' using errcode = '42501';
  end if;
  delete from group_bans where group_id = gid and user_id = who;
  if not found then raise exception 'They aren’t banned from this group' using errcode = 'P0002'; end if;
end $$;
revoke all on function unban_group_member(uuid, uuid) from public, anon;
grant execute on function unban_group_member(uuid, uuid) to authenticated;

revoke all on function group_has_rules(uuid) from public, anon;
grant execute on function group_has_rules(uuid) to authenticated;
revoke all on function group_user_banned(uuid, uuid) from public, anon;
grant execute on function group_user_banned(uuid, uuid) to authenticated;
revoke all on function group_invite_policy(uuid) from public, anon;
grant execute on function group_invite_policy(uuid) to authenticated;

-- Confirm:
--   select tablename, policyname, cmd from pg_policies
--    where tablename in ('group_members','groups','group_member_prefs','group_post_saves','group_join_declines','group_bans','group_reports')
--    order by tablename, cmd, policyname;
--   expect group_members: DELETE leave or be removed; INSERT invite, join self; SELECT read own, read visible;
--   UPDATE accept own invite, approve request, promote by owner. groups DELETE "groups delete by owner".
