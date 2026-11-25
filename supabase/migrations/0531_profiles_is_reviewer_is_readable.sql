-- 0531: profiles.is_reviewer is readable, as is_admin is.
--
-- 0530 added profiles.is_reviewer, but 0435 made profiles COLUMN-privileged: "A profiles COLUMN ADDED AFTER THIS is
-- readable by no client until its migration grants it." 0530 did not grant it, so the Review desk's sign-in check
-- (useCanReview: select is_admin, is_reviewer) failed for everyone with "permission denied for table profiles",
-- and the owner could not open the desk. Found by opening the live desk right after 0530 deployed (2026-11-24).
-- Granted exactly as is_admin is (0435): whether an account may review is not private.

begin;
grant select (is_reviewer) on public.profiles to anon, authenticated;
commit;
