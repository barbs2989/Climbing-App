-- URGENT: revert 0079. It re-opened anonymous INSERT on `contributions`, undoing a
-- deliberate security fix. Run this as soon as possible.
--
-- 0009_auth_profiles.sql closed anonymous contributions on purpose:
--
--     -- bind contributions to the caller's identity (fixes the spoofing HIGH from the audit)
--     alter table contributions alter column contributor set default auth.uid()::text;
--     drop policy if exists "anyone can contribute" on contributions;
--     create policy "authed can contribute" on contributions for insert
--       with check (auth.uid() is not null);
--
-- The live database was CORRECT. 0079 read 0002 (the original open policy), saw that
-- anon inserts were rejected, and concluded the policy had gone missing — without
-- checking whether a later migration had changed it deliberately. It had. Requiring a
-- session is what stops one person filing contributions under another's identity, and
-- `contributor` defaults to auth.uid() precisely so the row cannot lie about its author.
--
-- 0079 was also unnecessary. The app never attempts an anonymous contribution: the
-- contribute path checks the session first and shows "Log in to contribute — your edit
-- was applied locally only". Nothing was blocked that the app actually tried to do.
--
-- The claim in 0079 that `contributions` is empty because signed-out writes were being
-- rejected is therefore wrong too. The app does not send them. The table is empty
-- because there are no accounts yet.
--
-- What was genuinely broken, and stays fixed, is the OTHER half of that investigation:
-- user_reports failed because `.select()` on the insert made it INSERT ... RETURNING,
-- which is evaluated against the SELECT policy. That is unrelated to this table.

drop policy if exists "anyone can contribute" on contributions;

drop policy if exists "authed can contribute" on contributions;
create policy "authed can contribute"
  on contributions for insert
  with check (auth.uid() is not null);

-- Confirm: expect exactly one INSERT policy, "authed can contribute", and NO
-- "anyone can contribute".
--   select policyname, cmd, roles, permissive, with_check
--     from pg_policies where tablename = 'contributions' order by cmd;
--
-- Then anon inserts SHOULD fail again with 42501. That is correct behaviour here.
