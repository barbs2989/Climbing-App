-- 0193 — a photo can carry a description of what it shows (WCAG 1.1.1).
--
-- A photo that IS the content needs a text alternative, and only the climber who took it knows
-- what is in it. Most photo stores already have room: a route photo is a `contributions` row
-- whose `value` is jsonb, a trip-report photo sits in `climb_logs.photos` (jsonb, already
-- `{url, caption}`), and a chat image is sent with an empty `body`. Two stores have no room,
-- and this migration gives them one:
--
--   topos.alt          — one description per topo photo. `topos own update` (0026) already lets
--                        the uploader edit their own row, so a topo can be described later too.
--   profiles.photo_alts — `profiles.photos` is text[] (0173), so there is nowhere to put a
--                        second value per photo. A jsonb OBJECT keyed by photo URL rather than a
--                        parallel text[]: parallel arrays drift the first time one of them is
--                        filtered (removeProfilePhoto filters `photos` by value) and nothing
--                        would re-align the other.
--
-- Both NULLABLE with NO default, deliberately: NULL says "nobody has described this", which
-- is the truth for every photo that exists today. A default of '{}' or '' would be the same
-- claim spelled in a way a reader could mistake for "described as nothing".
--
-- Length is capped in the database as well as in the field (PHOTO_ALT_MAX = 250 in the app):
-- a description is a sentence read aloud, not a place for an essay, and a client-only cap is
-- a cap anyone with the anon key can step around.

alter table topos add column if not exists alt text;
alter table topos drop constraint if exists topos_alt_len;
alter table topos add constraint topos_alt_len check (alt is null or char_length(alt) <= 300);

alter table profiles add column if not exists photo_alts jsonb;
alter table profiles drop constraint if exists profiles_photo_alts_is_object;
alter table profiles add constraint profiles_photo_alts_is_object
  check (photo_alts is null or jsonb_typeof(photo_alts) = 'object');

comment on column topos.alt is
  'What the topo photo shows, written by the uploader; read aloud as the image''s text alternative. NULL = not described.';
comment on column profiles.photo_alts is
  'Descriptions of the photos in profiles.photos, keyed by photo URL. NULL = none described.';
