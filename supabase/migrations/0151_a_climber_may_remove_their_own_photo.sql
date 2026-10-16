-- 0151 — let a climber delete a PHOTO they contributed, and nothing else.
--
-- 0002 made `contributions` append-only on purpose and said so: "the ledger is append-only;
-- edits/moderation are service-role only. Consensus ('3 climbers agree') is computed from the
-- rows." That is exactly right for a FIELD correction. Retracting one would erase evidence
-- another climber's displayed value depends on, and it would let somebody move a consensus by
-- deleting rather than by contributing.
--
-- A photo is not that. #971 made the "Add a photo" sheet real, which means a climber can now
-- publish an image to a PUBLIC bucket at a stable URL from a button on any route — and until
-- this migration there was no way for them to take it back, in the UI or in the database. The
-- append-only rule was protecting a property photos do not have, while denying a person the
-- ability to withdraw something they published about themselves or their party. That is the
-- wrong trade, and it was introduced by #971, so it is #971's to fix.
--
-- SCOPED TWO WAYS, and both halves are load-bearing:
--   kind = 'photo'                     -- a field correction still cannot be retracted
--   contributor = auth.uid()::text     -- and only your own, never anyone else's
-- Drop either and this stops being "withdraw what you published" and becomes "edit the
-- ledger". `contributor` is TEXT (it has always held either a uid or the string 'anon'), so
-- the cast is required; without it Postgres cannot compare the two and the policy would fail
-- to apply rather than silently pass, but it is worth naming so nobody "tidies" it away.
--
-- Anonymous rows are unreachable by this on purpose: `auth.uid()` is null for a signed-out
-- caller, `contributor` is 'anon' or null, and null = null is not true — so no policy branch
-- lets an anonymous visitor delete an anonymous row. Withdrawing those stays service-role.
--
-- This does NOT add moderation. Nobody can remove anybody else's photo, and there is still no
-- report-a-photo path. That needs a decision about who reviews and on what basis; deleting
-- your own upload does not.
--
-- The storage object is removed by the client in the same operation. It cannot be done here:
-- storage.objects is a separate table with its own RLS (0026 gates delete on the first path
-- segment matching auth.uid(), which is the same person this policy allows), and a trigger
-- reaching across would run as the definer rather than as the caller.

drop policy if exists "contributors may delete their own photo" on contributions;
create policy "contributors may delete their own photo" on contributions
  for delete using (
    kind = 'photo'
    and contributor is not null
    and contributor = (auth.uid())::text
  );

-- Confirm — expect four policies on contributions (INSERT, SELECT, and this DELETE):
--   select policyname, cmd from pg_policies where tablename = 'contributions' order by cmd;
