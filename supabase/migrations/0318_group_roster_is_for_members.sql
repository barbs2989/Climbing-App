-- A GROUP'S ROSTER IS FOR ITS MEMBERS (owner, 2026-10-15: "you shouldn't be able to view other
-- members of groups if you aren't in the group yourself").
--
-- 0258's "group_members read visible" let ANYONE read the active roster of a PUBLIC group, so a
-- climber who had never joined could list every member — and the app did, on the group page.
-- Facebook draws the line the same way for a private group: only members see who else is in it,
-- while the group's member COUNT stays visible. Here it holds for every group, public or private.
--
-- What stays readable to a non-member, unchanged: your own row and invitations you sent
-- ("group_members read own", 0260), and every row for the group's managers (they approve
-- requests). The count a non-member sees comes from group_member_counts() below, which returns
-- numbers only — never an id.

drop policy if exists "group_members read visible" on group_members;
create policy "group_members read visible" on group_members for select
  using (
    (group_members.status = 'active' and is_group_member(group_members.group_id))
    or is_group_manager(group_members.group_id)
  );

-- Active member count per group, for the groups the caller can SEE (public, or one they are in —
-- the same test as the `groups` select policy), so it cannot be used to probe a hidden group.
-- Definer so it can count rows the caller may no longer read.
create or replace function group_member_counts(gids uuid[])
returns table (group_id uuid, member_count integer)
language sql security definer stable set search_path = public, pg_temp as $$
  select g.id, (select count(*)::int from group_members m where m.group_id = g.id and m.status = 'active')
  from groups g
  where g.id = any(gids) and (g.visibility = 'public' or is_group_member(g.id));
$$;
revoke all on function group_member_counts(uuid[]) from public, anon;
grant execute on function group_member_counts(uuid[]) to authenticated;

-- Verify:
--   select policyname, qual from pg_policies where tablename = 'group_members' and cmd = 'SELECT';
--   select * from group_member_counts(array(select id from groups));
