-- Apply the one policy the 2026-08-05 declared-vs-live audit found genuinely missing.
--
-- `0037_logs_persistence.sql` declares three policies on climb_logs. Two are live:
--     "view own logs"     SELECT   user_id = auth.uid()          LIVE
--     "manage own logs"   ALL      user_id = auth.uid()          LIVE
--     "view crew logs"    SELECT   public / crew visibility      *** NOT LIVE ***
--
-- No migration anywhere drops "view crew logs" — grepped the full folder. Its two
-- siblings from the same file did apply, so this looks like a create that never landed
-- rather than a deliberate removal. That distinction matters: 0079 was a regression
-- precisely because the policy it "restored" HAD been dropped on purpose, with a comment
-- saying why (see 0080 and [[absent-policy-may-be-deliberate]]). Nothing of the sort
-- exists here.
--
-- Body copied verbatim from 0037 — this restores the declared intent, it does not
-- redesign it.
--
-- SCOPE OF WHAT THIS OPENS, stated plainly, because it widens read access:
--   * trip_report_visibility = 'public'  -> readable by anyone, including signed-out
--   * trip_report_visibility = 'crew'    -> readable by CONFIRMED members of that crew
--   * anything else (incl. NULL/private) -> unchanged, author-only via "view own logs"
--
-- No current behavioural change: the app queries climb_logs only with
-- .eq("user_id", userId), and `trip_report_visibility` appears nowhere in client code.
-- The feature this serves has not been built. Applying it now means the rule is in place
-- and tested before anything depends on it.

drop policy if exists "view crew logs" on climb_logs;
create policy "view crew logs" on climb_logs for select
  using (
    trip_report_visibility = 'public'
    or (trip_report_visibility = 'crew' and crew_id in (
      select crew_id from crew_members where user_id = auth.uid() and status = 'confirmed'
    ))
  );

-- Confirm -- expect three policies on climb_logs (view own logs, view crew logs, manage own logs):
--   select policyname, cmd from pg_policies
--    where tablename = 'climb_logs' order by cmd, policyname;
