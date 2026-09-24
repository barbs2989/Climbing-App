-- 0187 — a pinned state follows the ACCOUNT, not the browser.
--
-- "Pinned states" on Home was the list of states downloaded for offline use into ONE browser's
-- IndexedDB. Nothing about it reached the account, so a climber who pinned Washington and then
-- signed in on another browser found nothing there. Two different things had one name:
--
--   * the PIN      — "I climb in Washington"             — a fact about the climber  -> here
--   * the DOWNLOAD — "Washington's catalog is on disk"   — a fact about the device   -> IndexedDB
--
-- The download cannot move to the account (it is the whole catalog, and its entire purpose is
-- being on the phone with no signal). The pin can, and now does. A new browser shows the pin with
-- a Download button beside it rather than showing nothing.
--
-- NULLABLE, NO DEFAULT, deliberately. NULL means "this account has never had a pin list", which
-- the app uses exactly once: to seed the list from what this browser already downloaded, so a
-- climber who pinned before this column existed keeps their pins. A default of '{}' would erase
-- that distinction for every existing row and silently drop those pins.
--
-- No policy change: `profiles` updates are already owner-only, and the column is not sensitive —
-- which US states somebody climbs in is less than their profile's `location` already says. It is
-- still not added to any cross-account select; nothing but the owner reads it.

alter table public.profiles add column if not exists pinned_states text[];

comment on column public.profiles.pinned_states is
  'State names the climber pinned (e.g. {Washington}). Account-level; the offline catalog for a pinned state is downloaded per device. NULL = never set.';
