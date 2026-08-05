-- Repair for 0077 (written as 0076, both renumbered — see 0077's header).
-- The INSERT policy from that migration was not in effect.
-- APPLIED 2026-08-05: the policy now exists (pg_policies confirms INSERT / {public} /
-- PERMISSIVE / with_check true), but anon inserts STILL fail 42501 — see the note at
-- the foot of this file.
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

-- OUTCOME, recorded 2026-08-05 after applying this file and re-testing live:
-- the policy exists and is correct, grants are correct (anon holds INSERT), yet an
-- anon insert still returns 42501 with HTTP 401. `contributions` — an unrelated table
-- with the same "anyone can insert" shape — fails identically, and it has zero rows.
-- So this is NOT specific to user_reports and not fixable from a policy file.
--
-- 401 rather than 403 points at the auth layer rather than at RLS. The likely cause is
-- that VITE_SUPABASE_ANON_KEY is a newer `sb_publishable_...` key which does not resolve
-- to the anon Postgres role for writes. Signed-in writes are unaffected.
--
-- Do not "fix" this by loosening policies — they are already `with check (true)`.
