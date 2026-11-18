-- 0454: a group's own AVATAR and COVER photo (owner, 2026-11-18: "Allow groups avatar photo to be a
-- custom image. Let's also allow them to add custom thumbnail photo").
--
-- Until now a group was drawn from its name alone: `groupMark` (the square avatar on every list row)
-- printed its initial, and `groupBand` (the cover across the top of a Discover card) a colour picked
-- from the name. These two columns hold a picture for each instead; null keeps the drawn one.
--
-- WHO MAY SET THEM needs nothing new. The creator writes them on INSERT (0090's insert policy), and
-- afterwards only a manager can change a group row at all (`groups update by manager`, 0090).
--
-- WHERE THEY MAY POINT is the one rule added here. The file is uploaded to the app's own public
-- `topo-photos` bucket under the uploader's `{uid}/` prefix (0026's storage RLS, 0150's size and type
-- cap), the same path every other photo in the app takes. The check refuses any other address, so a
-- group's picture cannot be aimed at an outside server -- an image every Discover visitor's browser
-- would fetch, which is a tracking pixel.

alter table public.groups add column if not exists avatar_url text;
alter table public.groups add column if not exists cover_url text;

alter table public.groups drop constraint if exists groups_avatar_url_ours;
alter table public.groups add constraint groups_avatar_url_ours check (
  avatar_url is null or (length(avatar_url) <= 1000
    and avatar_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/topo-photos/[0-9a-f-]{36}/[^?#]+$'));

alter table public.groups drop constraint if exists groups_cover_url_ours;
alter table public.groups add constraint groups_cover_url_ours check (
  cover_url is null or (length(cover_url) <= 1000
    and cover_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/topo-photos/[0-9a-f-]{36}/[^?#]+$'));

comment on column public.groups.avatar_url is 'The group''s own square avatar (0454): a public topo-photos URL, or null for its initial.';
comment on column public.groups.cover_url is 'The group''s own cover photo (0454): a public topo-photos URL, or null for the colour band.';
