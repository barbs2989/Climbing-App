-- 0552 — an image address in a message or a photo contribution is an IMAGE address
-- (security audit, owner note 2026-11-26: "Audit security risks to my app for getting hacked").
--
-- messages.image_url, crews_messages.image_url and a photo contribution's value->>'url' are free
-- text written by the sender through the public API. The app's own composer writes a data:image
-- URL (chat photos are stored in the row, lib/db-messaging.js) or an https Storage URL, but the API
-- does not ask the composer: `javascript:…` was accepted, and those values reach an <a href> — the
-- chat photo's Save link, and on the Review desk the reported-photo thumbnail and a reported
-- message's snapshot_media, which the owner opens signed in as admin. The client now refuses such
-- links (safeHref, check:safe-href, #4054) and a CSP refuses the script; this is the third wall, so
-- no client — an old cached build, a script, a future screen — can store one.
--
-- Measured before writing (service role, 2026-11-26): messages 2 image rows, both data:image
-- (jpeg, png); crews_messages 0; photo contributions 1, https. Every row passes, so each constraint
-- is added NOT VALID and then validated (a full check, without the long lock of a plain ADD).
-- groups.avatar_url / cover_url / links were already pinned (groups_*_ours, group_links_valid).

alter table public.messages drop constraint if exists messages_image_url_is_image;
alter table public.messages add constraint messages_image_url_is_image check (
  image_url is null or image_url = ''
  or image_url ~* '^https://'
  or image_url ~* '^data:image/(png|jpe?g|gif|webp|heic|heif|avif);base64,') not valid;
alter table public.messages validate constraint messages_image_url_is_image;

alter table public.crews_messages drop constraint if exists crews_messages_image_url_is_image;
alter table public.crews_messages add constraint crews_messages_image_url_is_image check (
  image_url is null or image_url = ''
  or image_url ~* '^https://'
  or image_url ~* '^data:image/(png|jpe?g|gif|webp|heic|heif|avif);base64,') not valid;
alter table public.crews_messages validate constraint crews_messages_image_url_is_image;

-- A photo contribution's value is an object whose url, when present, is https (Storage). The
-- Review desk also reads a bare-string value as the url, so that shape is held to https too.
alter table public.contributions drop constraint if exists contributions_photo_url_is_https;
alter table public.contributions add constraint contributions_photo_url_is_https check (
  kind is distinct from 'photo'
  or case jsonb_typeof(value)
       when 'object' then coalesce(value->>'url', '') = '' or value->>'url' ~* '^https://'
       when 'string' then (value #>> '{}') ~* '^https://'
       else true end) not valid;
alter table public.contributions validate constraint contributions_photo_url_is_https;
