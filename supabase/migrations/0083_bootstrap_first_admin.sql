-- Create the first admin. Nobody has ever held is_admin, and the method 0020 documents
-- in its own trailing comment CANNOT work:
--
--   update profiles set is_admin = true where id = '<owner uuid>';
--
-- 0020's guard_self_admin trigger raises unless is_admin(auth.uid()) is already true. In
-- the SQL editor auth.uid() is NULL (the postgres role carries no JWT), so is_admin(null)
-- is false and the statement aborts. Verified against the live database 2026-08-06 by
-- attempting the grant with the service key: P0001 "only an admin can change is_admin",
-- profiles unchanged. The service role has no JWT either, so it hits the same wall.
--
-- Bootstrapping requires an existing admin, and there is none — a closed loop. Triggers
-- are not bypassed by superuser, so the only way through is to disable the trigger for the
-- one statement. Deliberately NOT "loosen the guard when no admin exists": profiles' own
-- RLS lets a user update their own row, so that version would let any signed-up user make
-- themselves admin during the window before the first one is created.

alter table profiles disable trigger guard_self_admin;

update profiles set is_admin = true
  where id = '36612763-33a4-442b-8f5b-c8a550cda48a';  -- barbs2989@gmail.com

alter table profiles enable trigger guard_self_admin;

-- Confirm before trusting it — an UPDATE that matched zero rows reports success too.
-- Expect exactly one row, is_admin = true.
select id, is_admin from profiles where is_admin;
