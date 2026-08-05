-- Repair for 0075: the INSERT policy is not in effect.
--
-- Verified against the live DB with the anon key: inserting a report returns
--   42501 "new row violates row-level security policy for table user_reports"
-- while SELECT correctly returns zero rows and UPDATE/DELETE correctly match
-- nothing. So the table, RLS and the read policy all applied from 0075 — only
-- the insert policy is missing.
--
-- This matters because DEMO_AUTOLOGIN leaves most sessions null, so without an
-- anon-permitted insert virtually nobody can file a report at all, and someone
-- being harassed is the last person who should be blocked by a login wall.

drop policy if exists "anyone can file a report" on user_reports;
create policy "anyone can file a report"
  on user_reports for insert
  to public
  with check (true);

-- Confirm afterwards -- expect two rows: the insert policy and the select policy.
--   select policyname, cmd, roles, permissive
--     from pg_policies where tablename = 'user_reports' order by cmd;
