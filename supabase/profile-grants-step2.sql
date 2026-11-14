-- STEP 2 of 0434 (profiles column privileges). NOT a migration: copy it into the next free migration
-- number once the step-1 client (PR #3347's) has been live long enough for open tabs to update.
-- check:profile-privacy applies this file itself while the table-level grant still stands, so the
-- client is proven ready for it before it ships.

revoke select on public.profiles from anon, authenticated;

grant select (
  id, username, public_name, avatar, bio, sport_grade, trad_grade, boulder_grade, disciplines, level,
  climbing_since, created_at, show_name, photos_public, public_photos, public_photo_alts, resume_public,
  show_on_ranks, is_admin
) on public.profiles to anon, authenticated;

grant select (
  location, availability, avail_week, free_until, gender, climb_grades, hiking_speed_ft_hr, discoverable,
  certifications, cert_expiry, skills, belay_devices
) on public.profiles to authenticated;

