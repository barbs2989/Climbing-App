-- 0178 LEFT A HOLE THAT ONLY A TWO-ACCOUNT PROBE COULD SEE, and the mechanism is worth stating
-- because it is a property of RLS rather than of these policies.
--
-- POSTGRES EVALUATES `USING` AND `WITH CHECK` INDEPENDENTLY ACROSS PERMISSIVE POLICIES. For an
-- UPDATE it asks two separate questions: does SOME policy's USING admit the old row, and does
-- SOME policy's WITH CHECK admit the new one. They need not be the same policy. So a set of
-- policies that each read correctly in isolation can compose into a permission none of them
-- grants.
--
-- Measured by scripts/oneoff/probe-a-climber-cannot-let-themselves-into-a-private-group.mjs: an
-- invited climber accepting an invitation sent `{status:'active', role:'moderator'}` and BECAME A
-- MODERATOR of a private group they had just been let into.
--
--   USING      "group_members accept own invite"  -- their own row, status 'invited'   -> passes
--   WITH CHECK "group_members promote by manager" -- role in ('member','moderator')     -> passes
--
-- 0178's own accept policy pins `role = 'member'` in its check precisely to stop this, and that
-- clause was correct and irrelevant: the row only had to satisfy SOME check, and the promote
-- policy — which has said `with check (role in ('member','moderator'))` since 0090 — was happy to
-- supply it. The probe then reported two further failures (a member changing visibility, a member
-- promoting themselves) which were CONSEQUENCES rather than separate defects: by that point the
-- climber genuinely was a moderator, so those refusals were correctly not refusing.
--
-- THE RULE: a WITH CHECK must name its ACTOR, not only the shape of the row it will allow.
-- Restricting who may perform an update in USING alone is not a restriction at all once a second
-- policy exists on the same command.
--
-- Both manager-side checks therefore repeat `is_group_manager(group_id)`. That looks redundant
-- beside their own USING clauses and is exactly the point: the redundancy is what stops another
-- policy's USING borrowing this policy's check. `group_members accept own invite` already names
-- its actor in both halves and is left alone.

drop policy if exists "group_members promote by manager" on group_members;
create policy "group_members promote by manager" on group_members for update
  using (is_group_manager(group_id) and role <> 'owner')
  with check (is_group_manager(group_id) and role in ('member','moderator'));

drop policy if exists "group_members approve request" on group_members;
create policy "group_members approve request" on group_members for update
  using (is_group_manager(group_id) and status = 'pending')
  with check (is_group_manager(group_id) and status = 'active' and role = 'member');

-- Confirm, in the SQL editor — every UPDATE policy's WITH CHECK must name an actor:
--   select policyname, qual, with_check from pg_policies
--    where tablename = 'group_members' and cmd = 'UPDATE' order by policyname;
