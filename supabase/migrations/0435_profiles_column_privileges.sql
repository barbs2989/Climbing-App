-- 0435 — profiles column privileges: STEP 2 of 0434. The API itself now keeps what a climber hid.
--
-- 0434 (step 1, live since 2026-11-14 14:40 UTC) added public_name / public_photos / public_photo_alts,
-- my_profile() and a client that reads other climbers only through those and named columns. The
-- table-level SELECT stayed so open tabs on the previous build kept working. This removes it:
--   anon (signed out): the public card only.
--   authenticated: the card plus partner-matching and résumé columns.
--   nobody but the owner (via my_profile()): name, photos, photo_alts, account_type, primary_account_id,
--     terms_*, pinned_states, requests_from, mutuals_visible, trip_reports_default, and 0432's
--     username_set_at / username_changes (read only from the owner's own row).
-- A tab still running a build from before 0434 fails its profile reads until it reloads; nothing is lost.
--
-- A profiles COLUMN ADDED AFTER THIS is readable by no client until its migration grants it.

revoke select on public.profiles from anon, authenticated;

grant select (
  id, username, public_name, avatar, bio, sport_grade, trad_grade, boulder_grade, disciplines, level,
  climbing_since, created_at, show_name, photos_public, public_photos, public_photo_alts, resume_public,
  show_on_ranks, is_admin
) on public.profiles to anon, authenticated;

grant select (
  location, availability, avail_week, free_until, gender, climb_grades, hiking_speed_ft_hr, discoverable,
  certifications, cert_expiry, skills, belay_devices, skill_practiced
) on public.profiles to authenticated;

