-- 0136 — three SECURITY DEFINER functions were executable by `anon` and PUBLIC.
--
-- Found by asking a question that was impossible until 2026-08-12: `pg_proc.proacl` and
-- `prosrc` are readable now (see the note in 0135's session), so "who can execute this, and
-- what does it do" can finally be answered by MEASUREMENT rather than by reading the migration
-- that was supposed to have set it. The first function inspected — `approve_new_route` — turned
-- out to be carrying `{=X/postgres,…,anon=X/postgres,…}` after a partial apply of 0135. That is
-- what prompted the sweep; these three are what it found.
--
-- SECURITY DEFINER runs with the OWNER's rights and bypasses RLS, so for these functions the
-- gate inside the body is the ONLY thing in front of the data. None of these three has one.
--
-- MEASURED, not inferred. Of 20 SECURITY DEFINER functions in `public`, 10 return `trigger`
-- (never exposed as an RPC — anon EXECUTE on those is normal and is NOT touched here) and 10
-- are callable. 8 of the 10 were reachable by anon/PUBLIC; 5 of those carry their own
-- `is_admin`/`auth.uid()`/`raise exception` gate. These are the 3 that do not.
--
--   refresh_route_duplicate_names()   LIVE. Anon POST returned 500 `57014` — it reached the
--                                     function and ran until the anon role's 3s statement
--                                     timeout killed it. `refresh materialized view
--                                     concurrently route_duplicate_names` over 205k routes was
--                                     measured at ~6s in 0065. So any unauthenticated caller can
--                                     burn database CPU on demand, repeatedly. No app caller —
--                                     only scripts, which use the service key.
--
--   merge_accounts(uuid,uuid)         LATENT CRITICAL. Reassigns `climb_logs.user_id`,
--                                     `vouches.from_id`, sets `profiles.account_type='secondary'`
--                                     + `primary_account_id`, and inserts `account_links` — for
--                                     TWO ARBITRARY uuids supplied by the caller, with no check
--                                     that the caller owns either one. Not exploitable today for
--                                     an accidental reason: its FIRST statement is
--                                     `update crews set user_id = …` and **`crews.user_id` does
--                                     not exist** (verified against information_schema; every
--                                     other column it touches does), so it throws and the whole
--                                     function rolls back. That is luck, not design — repairing
--                                     that one statement would turn it into an unauthenticated
--                                     account-takeover primitive.
--
--   reconcile_guide_verification(uuid) Writes `guide_credentials.status='lapsed'`. Low severity
--                                     (it only lapses rows already past `verified_expires_at`),
--                                     but it is still an unauthenticated write.
--
-- WHAT THIS DOES NOT FIX, deliberately. `merge_accounts` has a second, deeper hole that a grant
-- cannot close: even for a legitimately signed-in caller there is no `auth.uid()` check tying
-- the caller to `primary_id` or `secondary_id`, so any authenticated user could merge any other
-- user into themselves. The right fix is an ownership gate in the body. It is NOT written here
-- because the function is already inert (see above) and account linking is unfinished
-- (0035 Phase 3/4) — writing a gate for a body that cannot run would be guessing at the shape of
-- a feature nobody has built. Revoking to service_role only closes the exposure completely in
-- the meantime and loses nothing, since the function cannot succeed for anyone today.
--
-- CALLERS CHECKED before revoking, so this cannot break a working path:
--   lib/auth.js:129   rpc('merge_accounts', …)              — reaches a function that always throws
--   lib/db.js:1218    rpc('reconcile_guide_verification',…) — signed-in only, keeps `authenticated`
--   refresh_route_duplicate_names                            — no app caller; scripts use the service key
--
-- Idempotent: revoke/grant are declarative, so re-running is a no-op.

-- LIVE finding: unauthenticated CPU burn. Scripts call this with the service key.
revoke all on function refresh_route_duplicate_names() from public, anon, authenticated;
grant execute on function refresh_route_duplicate_names() to service_role;

-- LATENT CRITICAL: no ownership check, and SECURITY DEFINER bypasses RLS. service_role only
-- until the body carries a real gate.
revoke all on function merge_accounts(uuid, uuid) from public, anon, authenticated;
grant execute on function merge_accounts(uuid, uuid) to service_role;

-- Unauthenticated write. `lib/db.js` calls it from a signed-in session, so `authenticated` stays.
revoke all on function reconcile_guide_verification(uuid) from public, anon;
grant execute on function reconcile_guide_verification(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------- confirm (run SEPARATELY)
--
-- A pasted script is ONE transaction: a failing SELECT rolls back everything above it.
--
--   select p.oid::regprocedure::text as signature,
--          has_function_privilege('anon',          p.oid, 'EXECUTE') as anon_exec,
--          has_function_privilege('public',        p.oid, 'EXECUTE') as public_exec,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('refresh_route_duplicate_names','merge_accounts','reconcile_guide_verification');
--
--   -- expect anon_exec = false and public_exec = false on all three;
--   -- auth_exec true ONLY for reconcile_guide_verification.
