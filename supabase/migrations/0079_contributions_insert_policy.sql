-- Restore the INSERT policy on `contributions` — signed-out contributions have
-- never been able to land.
--
-- 0002_contributions.sql declares:
--     create policy "anyone can contribute" on contributions for insert with check (true);
-- but that policy is NOT in effect on the live database. A migration file is not
-- applied state, and this is what that costs.
--
-- Diagnosed live 2026-08-05, anon key:
--     SELECT contributions            200, sees a seeded row   -> read policy fine, RLS on
--     INSERT contributions            401 42501                -> no usable INSERT policy
--     INSERT with a minimal payload   401 42501                -> not a NOT NULL / FK problem
--     INSERT with the service key     201                      -> table itself is fine
--
-- Ruled out first, so nobody re-runs these:
--   * NOT the key format — the legacy `eyJ...` anon JWT fails identically to the
--     newer `sb_publishable_...` key.
--   * NOT missing grants — information_schema.role_table_grants shows `anon` holding
--     INSERT on this table.
--   * NOT the RETURNING trap that affected user_reports — this fails with and without
--     `Prefer: return=representation`, whereas user_reports only failed WITH it
--     (see 0078 and the comment in submitReport).
--
-- Consequence: `contributions` holds zero rows. That has been read as "nobody has
-- contributed yet"; the likelier reading is that every signed-out contribution was
-- rejected at the database and fell back to session-local state, which is exactly what
-- the app does when the write throws.

drop policy if exists "anyone can contribute" on contributions;
create policy "anyone can contribute"
  on contributions for insert
  to public
  with check (true);

-- Confirm afterwards -- expect an INSERT row alongside the existing public-read SELECT:
--   select policyname, cmd, roles, permissive, with_check
--     from pg_policies where tablename = 'contributions' order by cmd;
--
-- If INSERT is present and anon inserts STILL fail, look for a RESTRICTIVE policy
-- (permissive = 'RESTRICTIVE'): those AND together with permissive ones, so adding
-- another permissive policy cannot override one.
