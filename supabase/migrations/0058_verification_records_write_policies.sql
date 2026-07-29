-- Fix: verification_records has been read-only for users since 0038 created it.
-- 0038 only added a SELECT policy ("view own verification"), so the client-side
-- email-verification persist (addVerification + verifyRecord, wired in PR #326)
-- has silently failed RLS on every attempt — confirmed directly in the Postgres
-- logs: 'new row violates row-level security policy for table "verification_records"'.
-- Users could never insert or update their own verification rows.

create policy "add own verification" on verification_records for insert
  with check (auth.uid() = user_id);

create policy "update own verification" on verification_records for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
