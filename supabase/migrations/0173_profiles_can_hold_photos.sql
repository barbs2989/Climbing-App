-- 0173 — a profile can hold photos, because the app has been offering to add them.
--
-- THE PROFILE PHOTO STRIP HAD NOWHERE TO SAVE ANYTHING. The Profile tab renders
-- `<PhotoStrip photos={profilePhotos} onAdd={...}/>`, so a climber sees a "+ Add photo" tile,
-- picks a photo, and gets the toast "Photo added ✓". `profilePhotos` is a `useState` array and
-- `profiles` has no `photos` column, so the photo lived until the next reload and reached
-- nobody. A success message in front of a write that never happened is the class
-- `check:writes` exists for, arriving from the side it cannot see: there is no write to
-- inspect, because there was no column to write to.
--
-- Worse, what the strip stored was a **blob: URL** from `URL.createObjectURL(f)` — an
-- in-memory handle, valid only inside the tab that made it. The avatar took the same value and
-- DID persist it: measured on the live project before this change, `profiles.avatar` for a real
-- account held
--
--     blob:https://barbs2989.github.io/b1ac7240-94cd-45e4-86d6-a1ff66076c68
--
-- which resolves to nothing for the owner after a reload and to nothing for every other
-- climber, always. That half needs no migration — it needs the file uploaded, which is what
-- `uploadProfilePhoto` now does — but it is the same root cause and worth recording here.
--
-- WHY text[] AND NOT A TABLE. These are a handful of images with no per-row facts of their
-- own: no caption, no ordering beyond the array's, no votes, no moderation state, nothing that
-- would ever be queried across profiles. `disciplines` next to it is already text[] for the
-- same reason. A `profile_photos` table would need its own RLS, its own read hook and its own
-- join on a screen that always wants all of them at once. If a caption or a report flow is ever
-- wanted, that is the moment to promote it — and 0090's own header makes the same call about
-- group posts.
--
-- NOT NULL DEFAULT '{}' so a reader never has to tell "no photos" from "column absent", which
-- is the distinction that made the strip dishonest in the first place. Existing rows take the
-- default; nothing is backfilled and nothing can fail partway.
--
-- RLS is unchanged and needs no clause: `profiles` already scopes UPDATE to the owner, and the
-- read policy already governs who sees a profile at all. A photo added here is exactly as
-- visible as the bio beside it.
--
-- The FILES live in the `topo-photos` bucket, not a new one. That bucket is public, gated by
-- 0026's `{uid}/…` first-path-segment RLS, and limited by 0150 to 15 MiB of the five image
-- types a phone actually produces. The route "Add a photo" sheet already writes there for the
-- same reasons; a second bucket would need all three of those decided again.

alter table profiles
  add column if not exists photos text[] not null default '{}';

comment on column profiles.photos is
  'Public URLs of the climber''s own profile photos, newest first, in the topo-photos bucket. '
  'Written by the Profile tab''s photo strip. Never a blob: URL — those are in-memory handles '
  'that resolve to nothing outside the tab that created them (see 0173''s header).';

-- Confirm — expect one row, photos = text[], not null, default '{}':
--   select column_name, data_type, is_nullable, column_default
--     from information_schema.columns
--    where table_name = 'profiles' and column_name = 'photos';
