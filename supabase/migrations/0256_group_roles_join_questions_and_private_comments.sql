-- 0256 — Group roles that match the app, membership questions, and comments a private group keeps.
--
-- Four things, found in one audit of Groups (2026-10-07). Each is stated as what a climber could
-- actually do against the live policies before this file, not what the screen offered.
--
-- 1. A MODERATOR COULD DO WHAT ONLY THE OWNER IS SHOWN DOING. The app draws "+ Mod" / "− Mod" for
--    the group's owner alone, but "group_members promote by manager" admitted any manager, so a
--    moderator could promote anyone, or demote every other moderator. And "group_members leave or
--    be removed" let any manager delete any non-owner row, so a moderator could remove a fellow
--    moderator, while the app shows the remove control on plain members only. Now:
--      * roles (member <-> moderator) are changed by the OWNER only;
--      * the owner may remove anyone but themselves; a moderator may remove a MEMBER (which also
--        covers declining a request and withdrawing an invite — both rows carry role 'member');
--      * nobody removes the owner row by "leaving": a group with no owner can no longer be managed
--        by anyone. Deleting the group still removes it (a cascade is not subject to RLS).
--
-- 2. A PUBLIC GROUP'S ROSTER SHOWED WHO HAD ASKED AND WHO HAD BEEN ASKED. "group_members read
--    visible" admitted every row of a public group to anyone, and 0178 put `pending` (a request)
--    and `invited` rows in that same table. So anybody could list who had asked to join a group,
--    and who its organiser had invited. Non-members and plain members now see ACTIVE rows only;
--    managers see the queue they act on; everyone still sees their own row (0178's read own).
--
-- 3. MEMBERSHIP QUESTIONS. A group that approves its members can ask up to five questions, each a
--    written answer or a multiple choice the organiser writes, each optional or required. The
--    answers travel with the request and only the asker and the group's managers can read them.
--      groups.join_questions  [{prompt, type: 'text'|'choice', options?: [..], required?: bool}]
--      group_join_answers     one row per request, a SNAPSHOT of {prompt, type, answer}: the
--                             organiser reads what the climber was actually asked, even if the
--                             questions were edited after they answered. It hangs off the
--                             membership row (composite FK, cascade), so declining, withdrawing or
--                             removing takes the answers with it, and an approved member's answers
--                             stay readable to the managers, as Facebook's "View answers" does.
--    request_to_join_group() is the one door that writes both, atomically, and it is where a
--    REQUIRED question is enforced: the self-insert of a pending row (0178) is now refused for a
--    group that has questions, so the questionnaire cannot be skipped by writing the row directly.
--
-- 4. COMMENTS ON A PRIVATE GROUP'S POSTS WERE PUBLIC. Group posts reuse the app-wide `comments`
--    table (target_id 'gp_<post uuid>'), whose SELECT policy is `true` — written for route pages,
--    which are public. 0230 made the POSTS members-only and left their comment threads world-
--    readable, and "authed can comment" let any signed-in account write into any group's thread.
--    Measured before this file: 0 such comments exist, so nothing has leaked yet. Now a 'gp_'
--    thread is read and written by members of that post's group only, every other target behaves
--    exactly as before, and a group's managers can remove a comment in their group
--    (remove_group_comment) — they could already remove the POST it hangs off.
--
-- NON-GOALS: no group-level report queue (reports still go to the app's review queue), no
-- ownership transfer, no ban list. Each is a product decision, not a hole.

-- ── helpers ─────────────────────────────────────────────────────────────────────────────────────

create or replace function is_group_owner(gid uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid() and status = 'active' and role = 'owner'
  );
$$;
revoke all on function is_group_owner(uuid) from public, anon;
grant execute on function is_group_owner(uuid) to authenticated;

-- Shape check for groups.join_questions. Immutable and self-contained so it can sit in a CHECK.
-- Every comparison is coalesced: a missing key reads NULL, and `if NULL then` silently passes.
create or replace function group_join_questions_valid(q jsonb) returns boolean
language plpgsql immutable set search_path = public, pg_temp as $$
declare e jsonb; o jsonb;
begin
  if q is null or jsonb_typeof(q) <> 'array' or jsonb_array_length(q) > 5 then return false; end if;
  for e in select value from jsonb_array_elements(q) loop
    if coalesce(jsonb_typeof(e), '') <> 'object' then return false; end if;
    if coalesce(jsonb_typeof(e -> 'prompt'), '') <> 'string' then return false; end if;
    if coalesce(length(btrim(e ->> 'prompt')), 0) not between 1 and 200 then return false; end if;
    if coalesce(e ->> 'type', '') not in ('text', 'choice') then return false; end if;
    if e ? 'required' and coalesce(jsonb_typeof(e -> 'required'), '') <> 'boolean' then return false; end if;
    if e ->> 'type' = 'choice' then
      if coalesce(jsonb_typeof(e -> 'options'), '') <> 'array' then return false; end if;
      if jsonb_array_length(e -> 'options') not between 2 and 8 then return false; end if;
      for o in select value from jsonb_array_elements(e -> 'options') loop
        if coalesce(jsonb_typeof(o), '') <> 'string' then return false; end if;
        if coalesce(length(btrim(o #>> '{}')), 0) not between 1 and 80 then return false; end if;
      end loop;
    end if;
  end loop;
  return true;
end $$;

-- ── 3. membership questions ─────────────────────────────────────────────────────────────────────

alter table groups add column if not exists join_questions jsonb not null default '[]'::jsonb;
alter table groups drop constraint if exists groups_join_questions_valid;
alter table groups add constraint groups_join_questions_valid check (group_join_questions_valid(join_questions));

comment on column groups.join_questions is
  'Up to 5 membership questions asked of a climber requesting to join (0256): '
  '[{prompt, type text|choice, options (choice only, 2-8), required}]. Only asked by groups whose '
  'policy is approval or trust; an open group admits without asking.';

create table if not exists group_join_answers (
  group_id   uuid not null,
  user_id    uuid not null,
  answers    jsonb not null check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) <= 5),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id),
  foreign key (group_id, user_id) references group_members (group_id, user_id) on delete cascade
);

comment on table group_join_answers is
  'A request''s answers to a group''s membership questions, as a snapshot of {prompt, type, answer} '
  '(0256). Readable by the asker and the group''s managers only. Written by request_to_join_group() '
  'only; removed with the membership row it belongs to.';

alter table group_join_answers enable row level security;

drop policy if exists "join answers read by the asker or a group manager" on group_join_answers;
create policy "join answers read by the asker or a group manager" on group_join_answers for select
  using (auth.uid() = group_join_answers.user_id or is_group_manager(group_join_answers.group_id));
-- No insert/update/delete policy on purpose: the RPC below is the only writer, and the cascade
-- from group_members is the only remover.

create or replace function request_to_join_group(gid uuid, answers jsonb default '[]'::jsonb)
returns void
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
begin
  if me is null then
    raise exception 'Sign in to ask to join a group' using errcode = '42501';
  end if;
  select * into g from groups where id = gid;
  if not found then
    raise exception 'That group no longer exists' using errcode = 'P0002';
  end if;
  if g.visibility <> 'public' then
    raise exception 'This group is invite only' using errcode = '42501';
  end if;
  if g.policy not in ('approval', 'trust') then
    raise exception 'This group is open to all — join it directly' using errcode = 'P0001';
  end if;
  if exists (select 1 from group_members m where m.group_id = gid and m.user_id = me) then
    raise exception 'You have already asked to join, been invited to, or joined this group' using errcode = '23505';
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

  insert into group_members (group_id, user_id, role, status) values (gid, me, 'member', 'pending');
  if n > 0 then
    insert into group_join_answers (group_id, user_id, answers) values (gid, me, snap);
  end if;
end $$;
revoke all on function request_to_join_group(uuid, jsonb) from public, anon;
grant execute on function request_to_join_group(uuid, jsonb) to authenticated;

-- 0178's gate, with one clause added: a pending row may be self-written only for a group that asks
-- no questions. A group with questions takes its requests through request_to_join_group().
drop policy if exists "group_members join self" on group_members;
create policy "group_members join self" on group_members for insert
  with check (
    auth.uid() = group_members.user_id
    and group_members.role = 'member'
    and (
      (group_members.status = 'active' and exists (
        select 1 from groups g
        where g.id = group_members.group_id and g.visibility = 'public' and g.policy = 'open'
      ))
      or
      (group_members.status = 'pending' and exists (
        select 1 from groups g
        where g.id = group_members.group_id and g.visibility = 'public'
          and g.policy in ('approval', 'trust')
          and jsonb_array_length(g.join_questions) = 0
      ))
    )
  );

-- ── 1. roles ────────────────────────────────────────────────────────────────────────────────────

drop policy if exists "group_members promote by manager" on group_members;
drop policy if exists "group_members promote by owner" on group_members;
create policy "group_members promote by owner" on group_members for update
  using (is_group_owner(group_members.group_id) and group_members.role <> 'owner' and group_members.status = 'active')
  with check (is_group_owner(group_members.group_id) and group_members.role in ('member', 'moderator') and group_members.status = 'active');

drop policy if exists "group_members leave or be removed" on group_members;
create policy "group_members leave or be removed" on group_members for delete
  using (
    (auth.uid() = group_members.user_id and group_members.role <> 'owner')
    or (is_group_owner(group_members.group_id) and group_members.role <> 'owner')
    or (is_group_manager(group_members.group_id) and group_members.role = 'member')
  );

-- ── 2. roster privacy ───────────────────────────────────────────────────────────────────────────

drop policy if exists "group_members read visible" on group_members;
create policy "group_members read visible" on group_members for select
  using (
    (group_members.status = 'active' and (
      is_group_member(group_members.group_id)
      or exists (select 1 from groups g where g.id = group_members.group_id and g.visibility = 'public')
    ))
    or is_group_manager(group_members.group_id)
  );

-- ── 4. comments on group posts ──────────────────────────────────────────────────────────────────

-- Can the caller read comments on target `t`? Every non-group target: yes, as before. A group post
-- ('gp_<uuid>'): only an active member of that post's group. Definer so the group_posts lookup is
-- not itself filtered; compared as text so a malformed id is a non-match, never a cast error.
-- anon keeps EXECUTE: the comments SELECT policy calls this for every row, including on public
-- route pages read signed-out.
create or replace function comment_target_readable(t text) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select case
    when t is null or t not like 'gp\_%' then true
    else exists (
      select 1 from group_posts p
      where p.id::text = substr(t, 4) and is_group_member(p.group_id)
    )
  end;
$$;

drop policy if exists "comments public read" on comments;
drop policy if exists "comments read where the target is readable" on comments;
create policy "comments read where the target is readable" on comments for select
  using (comment_target_readable(comments.target_id));

drop policy if exists "authed can comment" on comments;
create policy "authed can comment" on comments for insert
  with check (auth.uid() = comments.user_id and comment_target_readable(comments.target_id));

-- A reaction is readable where its comment is. The subquery runs under the caller's RLS on
-- comments, so it inherits the rule above rather than restating it.
drop policy if exists "comment reactions public read" on comment_reactions;
drop policy if exists "comment reactions read where the comment is" on comment_reactions;
create policy "comment reactions read where the comment is" on comment_reactions for select
  using (exists (select 1 from comments c where c.id = comment_reactions.comment_id));

drop policy if exists "comment reactions insert own" on comment_reactions;
create policy "comment reactions insert own" on comment_reactions for insert
  with check (
    auth.uid() = comment_reactions.user_id
    and comment_reactions.reaction ~ '^[a-z0-9]{1,24}$'
    and exists (select 1 from comments c where c.id = comment_reactions.comment_id)
  );

-- A group's managers may take a comment down in their group. Tombstoned, not deleted, so the
-- replies under it keep their thread — the same shape deleteComment() uses for its own author.
create or replace function remove_group_comment(cid uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare t text; gid uuid;
begin
  select c.target_id into t from comments c where c.id = cid;
  if t is null or t not like 'gp\_%' then
    raise exception 'That is not a comment in a group' using errcode = '42501';
  end if;
  select p.group_id into gid from group_posts p where p.id::text = substr(t, 4);
  if gid is null or not is_group_manager(gid) then
    raise exception 'Only the group''s organizer or a moderator can remove this comment' using errcode = '42501';
  end if;
  update comments set deleted = true, text = '' where id = cid;
end $$;
revoke all on function remove_group_comment(uuid) from public, anon;
grant execute on function remove_group_comment(uuid) to authenticated;

-- Confirm:
--   select policyname, cmd from pg_policies where tablename in ('group_members','group_join_answers','comments','comment_reactions') order by tablename, cmd, policyname;
--   expect group_members: 1 DELETE (leave or be removed), 2 INSERT, 2 SELECT, 3 UPDATE (accept own
--   invite, approve request, promote by owner); group_join_answers: 1 SELECT; comments: SELECT
--   "comments read where the target is readable"; comment_reactions: SELECT "... where the comment is".
