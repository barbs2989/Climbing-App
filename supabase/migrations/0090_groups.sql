-- Groups have never existed for a real climber.
--
-- `GROUPS` in ClimbMatchCore.jsx is `DEMO_FILLERS ? [...] : []`, and DEMO_FILLERS is false,
-- so production ships an empty seed list. The only other source is `createdGroups`, a
-- useState array -- create a group, refresh, gone. Two real climbers could never be in the
-- same group, because no group outlived the tab that made it.
--
-- SCOPE: groups + membership only. Posts, events, RSVPs and the approval-to-join flow are
-- deliberately NOT here -- they are meaningless until a group can persist and hold two
-- people, and each needs its own policy thinking. `policy` is stored so the UI keeps
-- rendering it, but nothing enforces 'approval' yet; joining is open. Do not read the column
-- as a guarantee.

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  blurb text,
  location text,
  disciplines text[] not null default '{}',
  accent text,
  policy text not null default 'open' check (policy in ('open','approval','trust')),
  event_policy text not null default 'anyone' check (event_policy in ('anyone','mods')),
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','moderator','owner')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index if not exists group_members_user_idx on group_members (user_id);
create index if not exists group_members_group_idx on group_members (group_id);
create index if not exists groups_created_by_idx on groups (created_by);

-- Membership test used by the policies below. It MUST be SECURITY DEFINER, and not because of
-- privilege: `groups`'s select policy needs to ask "am I a member", and `group_members`'s
-- select policy needs to ask "can I see this group". Expressed as plain subqueries those two
-- policies reference each other's tables and Postgres raises
-- `infinite recursion detected in policy for relation ...` on the first read. A SECURITY
-- DEFINER function runs with RLS bypassed inside, which breaks the cycle.
create or replace function is_group_member(gid uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid());
$$;

create or replace function is_group_manager(gid uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid() and role in ('owner','moderator')
  );
$$;

alter table groups enable row level security;
alter table group_members enable row level security;

-- Read: public groups are discoverable by anyone signed in -- that is the point of a group.
-- Private ones only by members.
drop policy if exists "groups read public or member" on groups;
create policy "groups read public or member" on groups for select
  using (visibility = 'public' or is_group_member(id));

-- Insert: you may only create a group as yourself. The owner membership row is created by the
-- trigger below rather than by the client, so there is no window where a group has no owner.
drop policy if exists "groups insert own" on groups;
create policy "groups insert own" on groups for insert
  with check (auth.uid() = created_by);

-- Update: owners and moderators only. WITH CHECK cannot pin columns it does not mention, so
-- `created_by` is guarded by the trigger below -- the 0085/0087 lesson.
drop policy if exists "groups update by manager" on groups;
create policy "groups update by manager" on groups for update
  using (is_group_manager(id)) with check (is_group_manager(id));

-- Delete: the creator only. A moderator can moderate; they cannot dissolve someone's group.
drop policy if exists "groups delete by creator" on groups;
create policy "groups delete by creator" on groups for delete
  using (auth.uid() = created_by);

-- Roster is visible to anyone who can see the group.
drop policy if exists "group_members read visible" on group_members;
create policy "group_members read visible" on group_members for select
  using (
    is_group_member(group_id)
    or exists (select 1 from groups g where g.id = group_id and g.visibility = 'public')
  );

-- Join: yourself only, and ONLY as 'member'. This is 0086's lesson applied -- an insert policy
-- that gated who but not what let a stranger write role='owner' on someone else's group and
-- inherit management rights over it.
drop policy if exists "group_members join self" on group_members;
create policy "group_members join self" on group_members for insert
  with check (auth.uid() = user_id and role = 'member');

-- Leave: yourself. Or a manager removing someone -- but never the owner, so a moderator
-- cannot evict the person whose group it is.
drop policy if exists "group_members leave or be removed" on group_members;
create policy "group_members leave or be removed" on group_members for delete
  using (auth.uid() = user_id or (is_group_manager(group_id) and role <> 'owner'));

-- Role changes: managers only, and never to or from 'owner'. Promotion to moderator is a
-- manager's call; ownership is not transferable through this path.
drop policy if exists "group_members promote by manager" on group_members;
create policy "group_members promote by manager" on group_members for update
  using (is_group_manager(group_id) and role <> 'owner')
  with check (role in ('member','moderator'));

-- The creator becomes owner atomically with the group. Doing this client-side leaves a window
-- where the group exists with no owner, and the insert policy above would not let the creator
-- add themselves as one (it pins role to 'member').
create or replace function add_group_creator_as_owner() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into group_members (group_id, user_id, role) values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

drop trigger if exists groups_add_owner on groups;
create trigger groups_add_owner after insert on groups
  for each row execute function add_group_creator_as_owner();

-- Guard the columns the UPDATE policy cannot pin.
create or replace function guard_group_immutable_owner() returns trigger
language plpgsql as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'a group cannot change who created it';
  end if;
  return new;
end;
$$;

drop trigger if exists groups_guard_creator on groups;
create trigger groups_guard_creator before update on groups
  for each row execute function guard_group_immutable_owner();

-- Confirm -- expect 2 tables, 4 policies on groups, 4 on group_members, and 4 functions:
--   select tablename, policyname, cmd from pg_policies
--     where tablename in ('groups','group_members') order by tablename, cmd;
--   select proname from pg_proc
--     where proname in ('is_group_member','is_group_manager','add_group_creator_as_owner','guard_group_immutable_owner');
--
-- Then prove the behaviour rather than trusting "Success":
--   insert into groups (name, created_by) values ('probe','<A>') returning id;
--   select role from group_members where group_id = '<id>';   -- expect exactly one 'owner'
--   -- as B, attempting to join as a manager must fail the WITH CHECK:
--   insert into group_members (group_id, user_id, role) values ('<id>','<B>','moderator');
--   delete from groups where id = '<id>';                     -- cascades the roster
