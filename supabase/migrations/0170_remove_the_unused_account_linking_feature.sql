-- Remove account linking. It was built end to end and never wired to anything.
--
-- 0035 shipped a table, two RPCs and RLS policies for linking a secondary account to a primary
-- one, and lib/auth.js shipped eight client helpers for it across "Phase 3" (linking) and
-- "Phase 4" (simultaneous login). NOTHING EVER CALLED ANY OF IT. Measured before removing:
--
--   account_links                                    0 rows
--   profiles with account_type <> 'primary'          0
--   profiles with primary_account_id set             0
--   callers of the 8 helpers, outside lib/auth.js    0
--   RLS policies referencing any of the three names  0
--
-- REMOVING BEATS REPAIRING HERE, and `merge_accounts` is why. It reassigns climb_logs.user_id,
-- vouches.from_id and profiles.account_type for two ARBITRARY uuids with no auth.uid() check —
-- an account-takeover primitive. It is currently inert only by accident: the live body drifted
-- from 0035 and writes crews.user_id, a column that does not exist, so the first statement throws.
-- 0136 closed the exposure by revoking it to service_role, and check:function-columns has carried
-- a `known` entry ever since saying it must not be repaired without an ownership gate.
--
-- That gate is only worth writing if the feature is wanted. It is not: there is no UI, no caller,
-- and no data. So the liability goes instead of being made safe, which is the same call 0167 made
-- for the two dead crew functions.
--
-- `get_linked_profiles` goes with it — it reads account_links, and its only caller was one of the
-- removed helpers.
--
-- KEPT DELIBERATELY: profiles.account_type and profiles.primary_account_id. They are empty and now
-- unreferenced, but they sit on a table with live rows, and dropping columns there is a bigger and
-- separate call than removing a feature nobody used. They are recorded here so the next person
-- knows they are orphans rather than load-bearing.
--
-- Both function bodies are already in git — 0035 defines them — so unlike 0167 there is nothing
-- to preserve here beyond this note.

drop function if exists public.merge_accounts(uuid, uuid);
drop function if exists public.get_linked_profiles(uuid);

drop table if exists public.account_links;
