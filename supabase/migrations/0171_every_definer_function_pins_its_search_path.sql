-- Every SECURITY DEFINER function now pins search_path = public, pg_temp. 14 did not.
--
-- A SECURITY DEFINER function runs with the definer's privileges, so which schema an unqualified
-- name resolves to is a security decision. 7 of these functions pinned nothing at all, and 5 of
-- those reference unqualified tables:
--
--   approve_new_route             routes, areas, contributions
--   reject_new_route              contributions
--   sync_active_disciplines       guide_credentials, guide_profiles, cert_track_disciplines
--   reconcile_guide_verification  guide_credentials
--   (guard_contribution_status, guard_guide_status, prevent_self_admin reference none)
--
-- THE HALF THAT IS EASY TO GET WRONG, and 7 more functions had it wrong: `search_path = public`
-- IS NOT ENOUGH. Postgres searches the temporary schema FIRST — ahead of everything in
-- search_path — whenever pg_temp is not itself listed. Naming it explicitly is what demotes it to
-- last. So claim_crew_email_invites, claim_my_crew_email_invites, guard_review_content_immutable,
-- handle_new_user, refresh_route_duplicate_names, stamp_policy_acceptance and verify_my_email
-- read as hardened and were not. For those seven this migration only moves pg_temp from first to
-- last, which can change name resolution ONLY in the case that is itself the vulnerability.
--
-- WHAT THIS IS AND IS NOT. `anon` and `authenticated` have CREATE on NO schema (measured, both
-- false everywhere including public), so the usual shadowing attack is unavailable. They DO hold
-- TEMPORARY on the database, which is the pg_temp half. No exploit was demonstrated here and none
-- is claimed: pg_temp is session-scoped, and approve_new_route gates on is_admin() in its first
-- statement. This is the hardening gap Supabase's own linter calls function_search_path_mutable,
-- fixed because it is cheap, not because an exploit was proven.
--
-- ALTER FUNCTION ... SET does NOT touch a function body. That distinction is the whole reason
-- this was safe to do: 0070's header records that changing search_path here "broke ALL signups
-- for a day", but that incident came from REBUILDING a function out of an old migration file and
-- losing the live body. Nothing here rewrites a body. Never re-create these from file text to
-- change a setting.
--
-- VERIFIED AFTER APPLYING, not assumed — 5 probes, 22 assertions, all green, signup first
-- because it is the documented casualty:
--
--   probe-terms-acceptance-trigger-fires   signup 200, profile created, version stamped
--                                          (handle_new_user + stamp_policy_acceptance)
--   probe-contributor-forgery              contributions insert path (guard_contribution_status)
--   probe-crew-message-insert-rls          crew chat, 0163 still holds
--   probe-data-requests-rls                6/6
--   probe-self-counterparty                vouches + belay_catches, 0169 still holds
--
-- Read back afterwards: 20 of 20 SECURITY DEFINER functions in public report
-- search_path=public, pg_temp. Zero unpinned.
--
-- merge_accounts was in the unpinned set when this audit began and is absent now — dropped by the
-- account-linking removal (#1141) while this was being written. Nothing to pin; noted so its
-- absence from this list does not read as an oversight.

alter function public.approve_new_route(uuid, numeric)   set search_path = public, pg_temp;
alter function public.reject_new_route(uuid, text)       set search_path = public, pg_temp;
alter function public.reconcile_guide_verification(uuid) set search_path = public, pg_temp;
alter function public.guard_contribution_status()        set search_path = public, pg_temp;
alter function public.guard_guide_status()               set search_path = public, pg_temp;
alter function public.prevent_self_admin()               set search_path = public, pg_temp;
alter function public.sync_active_disciplines()          set search_path = public, pg_temp;

-- these seven already said `public`, which reads as pinned and is not
alter function public.claim_crew_email_invites()         set search_path = public, pg_temp;
alter function public.claim_my_crew_email_invites()      set search_path = public, pg_temp;
alter function public.guard_review_content_immutable()   set search_path = public, pg_temp;
alter function public.handle_new_user()                  set search_path = public, pg_temp;
alter function public.refresh_route_duplicate_names()    set search_path = public, pg_temp;
alter function public.stamp_policy_acceptance()          set search_path = public, pg_temp;
alter function public.verify_my_email()                  set search_path = public, pg_temp;
