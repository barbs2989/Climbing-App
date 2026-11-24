-- 0532: the date a route's usual line goes dry, for the alpine Conditions tab.
--
-- Owner, 2026-11-24: "Forbidden West Ridge for example has 2 routes to get to the ridge and one of them is the
-- couloir which is early season snow only, and then when it melts out you have to take the Cat Scratch Gully."
-- 0490's snow_in_season is one answer for the whole season, so a route that is a snow climb in June and a dry rock
-- route by late August read as one or the other all season. The Conditions card knows today's date.
--
--   snow_free_from  'MM-DD': from this date to the end of the season the usual line (taking its late-season way in)
--                   needs no snow and no glacier travel. null = no such date (snow all season, dry all season, or
--                   not researched). A real glacier never gets one.
--                   (research-data/glacier-travel-2026-11-23/SEASONAL-RULE.md)
-- lib/terrain.js snowFreeOn() reads it; the card treats the route as dry from that date to 31 October.
-- Editable from the route's edit sheet: its contribution_fields row is 0533, which ships with the code that reads
-- it (the column lands first, so the schema snapshot the guards read can include it).
-- The values are loaded by scripts/oneoff/load-snow-free-from.mjs, not here: an UPDATE by id in a migration is a
-- no-op on a preview database and would hide a wrong id on production.

alter table public.routes add column if not exists snow_free_from text;

alter table public.routes drop constraint if exists routes_snow_free_from_mmdd;
alter table public.routes add constraint routes_snow_free_from_mmdd
  check (snow_free_from is null or snow_free_from ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$');

comment on column public.routes.snow_free_from is
  'Reviewed: MM-DD from which, to the end of the season, the usual line needs no snow or glacier travel. null = no such date (0532).';
