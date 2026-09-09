-- A GROUP COULD NOT GATE WHO JOINED IT. The app offers three join policies and a private
-- visibility, and `groupJoinLabel` renders them as promises a climber reads before tapping:
-- "Invite only", "Trust 55+ to join", "✓ Organizer approves". Nothing was behind any of them.
--
-- 0090's insert policy is:
--     create policy "group_members join self" on group_members for insert
--       with check (auth.uid() = user_id and role = 'member');
--
-- It constrains WHO you may seat (yourself) and AT WHAT ROLE, and references neither
-- `groups.visibility` nor `groups.policy`. Measured with two real accounts in #1658
-- (scripts/oneoff/probe-a-climber-cannot-let-themselves-into-a-private-group.mjs): an outsider
-- seats themselves in a PRIVATE, trust-gated group with one INSERT, and because
-- `groups read public or member` is `visibility = 'public' or is_group_member(id)`, that row is
-- also the read capability — it hands them the group's name, blurb, location and full member
-- roster. The comment beside GROUP_TRUST_MIN already said the trust half was "A UI GUARDRAIL,
-- NOT A SECURITY BOUNDARY"; the same comment claimed "VISIBILITY WINS because it is the half the
-- app actually enforces", and that is the half this closes. Visibility was enforced against
-- READING and not against JOINING, and joining was self-service.
--
-- WHY THE POLICY EDIT COULD NOT SHIP ALONE, which is why this migration is bigger than the hole.
-- Adding `visibility`/`policy` clauses to that one policy makes a private group unjoinable by
-- ANYONE and an 'approval' group unjoinable full stop, because neither an invite flow nor an
-- approval flow existed. That is the trap this repo keeps recording: a policy that refuses
-- everything passes every attack assertion while having broken the feature. So the gate and the
-- doors through it land together.
--
-- THE SHAPE IS `crew_members`, DELIBERATELY. Crews solved this exact problem in 0086 — a status
-- column, self-seating forbidden above the lowest status, and self-promotion forbidden. Copying
-- the solved design beats inventing a second vocabulary for one idea, which is how this codebase
-- ended up with four grade parsers.
--
--   pending   a climber has ASKED to join a public gated group. Not a member.
--   invited   a manager has invited them to a group. Not a member until they accept.
--   active    a member.
--
-- MEMBERSHIP IS THE READ CAPABILITY, so `is_group_member` counting anything but `active` would
-- re-open the hole through the back door: a pending requester would read the private group they
-- had merely asked about. Both definer functions require `active`.

alter table group_members
  add column if not exists status text not null default 'active'
    check (status in ('pending','invited','active'));

comment on column group_members.status is
  'pending = asked to join, invited = a manager asked them, active = a member (0178). '
  'is_group_member() counts ONLY active: membership is the read capability for a private group, '
  'so counting a request would hand an outsider the thing they were asking permission for.';

create index if not exists group_members_status_idx on group_members (group_id, status);

-- Existing rows default to 'active', which is correct: everyone already in a group is a member.

create or replace function is_group_member(gid uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function is_group_manager(gid uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid()
      and status = 'active' and role in ('owner','moderator')
  );
$$;

-- An invitee must be able to SEE what they were invited to, or the invite is unusable: a private
-- group is unreadable to a non-member by design, so without this an invitation names a group the
-- recipient cannot look at. Deliberately narrow — it admits the group row, never the roster.
create or replace function is_group_invited(gid uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid() and status = 'invited'
  );
$$;

drop policy if exists "groups read public or member" on groups;
create policy "groups read public or member" on groups for select
  using (visibility = 'public' or is_group_member(id) or is_group_invited(id));

-- YOUR OWN ROW, ALWAYS. Without this an invited climber cannot see their own invitation to a
-- private group (the roster is hidden from non-members), and a requester cannot tell whether
-- their request exists. It discloses one row — their own — and never the roster.
drop policy if exists "group_members read own" on group_members;
create policy "group_members read own" on group_members for select
  using (auth.uid() = user_id);

-- THE GATE. Self-seating as an ACTIVE member is now permitted only where the group says anyone
-- may walk in: public AND policy 'open'. A public gated group takes a REQUEST instead. A private
-- group takes neither — its own label reads "Invite only", so the only way in is an invitation.
drop policy if exists "group_members join self" on group_members;
create policy "group_members join self" on group_members for insert
  with check (
    auth.uid() = user_id
    and role = 'member'
    and (
      (status = 'active' and exists (
        select 1 from groups g
        where g.id = group_id and g.visibility = 'public' and g.policy = 'open'
      ))
      or
      (status = 'pending' and exists (
        select 1 from groups g
        where g.id = group_id and g.visibility = 'public' and g.policy in ('approval','trust')
      ))
    )
  );

-- THE DOOR. A manager may seat somebody else, at 'invited' and nowhere further — an invitation is
-- not membership, and the recipient still has to accept. This is what keeps a private group
-- joinable at all now that self-seating cannot reach one.
drop policy if exists "group_members invite by manager" on group_members;
create policy "group_members invite by manager" on group_members for insert
  with check (
    is_group_manager(group_id)
    and auth.uid() <> user_id
    and status = 'invited'
    and role = 'member'
  );

-- ACCEPTING. USING reads the OLD row and WITH CHECK the NEW one, so this expresses exactly
-- invited -> active on your own row. Pinning role in the check stops an acceptance being used to
-- promote yourself in the same statement.
drop policy if exists "group_members accept own invite" on group_members;
create policy "group_members accept own invite" on group_members for update
  using (auth.uid() = user_id and status = 'invited')
  with check (auth.uid() = user_id and status = 'active' and role = 'member');

-- APPROVING. Only a manager, only from 'pending', and only to 'active' as a plain member. A
-- requester cannot reach this: every UPDATE policy on this table requires either
-- is_group_manager() or their own row already being 'invited'.
drop policy if exists "group_members approve request" on group_members;
create policy "group_members approve request" on group_members for update
  using (is_group_manager(group_id) and status = 'pending')
  with check (status = 'active' and role = 'member');

-- Declining a request and withdrawing one are both covered by the existing delete policy
-- ("group_members leave or be removed": your own row, or a manager on any non-owner row), so no
-- new policy is needed and none is added.

-- Confirm, in the SQL editor:
--   select policyname, cmd from pg_policies where tablename = 'group_members' order by cmd, policyname;
-- expect: 2 INSERT (join self, invite by manager), 2 SELECT (read own, read visible),
--         3 UPDATE (accept own invite, approve request, promote by manager), 1 DELETE.
