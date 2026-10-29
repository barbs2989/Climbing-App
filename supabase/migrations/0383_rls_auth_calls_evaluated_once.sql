-- RLS policies call auth.uid() / auth.jwt() / auth.role() ONCE per statement, not once per row.
--
-- Supabase's performance advisor (lint 0003, auth_rls_initplan) flagged 232 public policies that
-- call an auth function bare: `user_id = auth.uid()`. Postgres treats the call as volatile per row,
-- so a scan of N rows evaluates it N times. Wrapped in a scalar subquery, `(select auth.uid())`, the
-- planner hoists it into an InitPlan evaluated once. The value is identical within a statement, so
-- WHO CAN READ OR WRITE WHAT does not change — only how often the check is computed. This is the
-- fix Supabase documents for the lint. Written 2026-10-28, after the database stalled (40 s reads)
-- and was restarted.
--
-- Written as a LOOP over pg_policies rather than 232 hand-written ALTERs so that it:
--   * replays on an empty preview database, where every policy was just created by the earlier
--     migrations (and any policy production lacks is simply not visited);
--   * is idempotent — an already-wrapped call deparses as `( SELECT auth.uid() AS uid)`, which the
--     negative lookbehind skips, so a second run alters nothing;
--   * leaves each policy's name, command, roles and PERMISSIVE/RESTRICTIVE untouched: ALTER POLICY
--     with only USING / WITH CHECK replaces just those expressions.
-- The storage schema's policies are left alone (not flagged; owned by Supabase's storage roles).

set lock_timeout = '5s';

do $$
declare
  p record;
  pat constant text := '(?<!SELECT )auth\.(uid|jwt|role|email)\(\)';
  new_qual text;
  new_check text;
  n int := 0;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~ pat or coalesce(with_check, '') ~ pat)
  loop
    new_qual  := regexp_replace(p.qual,       pat, '(select auth.\1())', 'g');
    new_check := regexp_replace(p.with_check, pat, '(select auth.\1())', 'g');
    execute format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename)
      || case when new_qual  is not null then format(' using (%s)', new_qual) else '' end
      || case when new_check is not null then format(' with check (%s)', new_check) else '' end;
    n := n + 1;
  end loop;
  raise notice 'rewrote % policies', n;
end
$$;

reset lock_timeout;
