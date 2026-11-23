-- 0490: two reviewed terrain facts per route, for the alpine Conditions tab.
--
-- Owner, 2026-11-23: "Some routes that don't have a glacier don't need overnight freeze warnings ... We don't
-- want to be giving warnings about snow bridges etc when there's usually not those when people typically climb
-- that route." The Conditions card decided "glacier" from the discipline (every mountaineering route) and from
-- a word match on the route's text. Washington audit: 409 routes on the glacier card, 130 with no glacier
-- travel, 72 of those dry in their normal season; 296 of the 661 routes told "bridges are weak" have no glacier.
--
-- Each fact is about the route's NORMAL line (approach, climb, normal descent) in its NORMAL season
-- (research-data/glacier-travel-2026-11-23/RULE.md):
--   glacier_travel  'yes' = the party travels a glacier with crevasse hazard; 'no' = it does not
--   snow_in_season  'yes' = the party crosses or climbs snow; 'no' = the route is dry
--   null            = nobody has settled it; lib/terrain.js falls back to reading the route's text, and the
--                     card keeps the careful wording.
-- Both are editable from the route's edit sheet (contribution_fields rows below), owner-reviewed like every edit.
-- The values are loaded by scripts/oneoff/load-glacier-travel.mjs, not here: an UPDATE by id in a migration is a
-- no-op on a preview database and would hide a wrong id on production.

alter table public.routes add column if not exists glacier_travel text;
alter table public.routes add column if not exists snow_in_season text;

alter table public.routes drop constraint if exists routes_glacier_travel_yn;
alter table public.routes add constraint routes_glacier_travel_yn
  check (glacier_travel is null or glacier_travel in ('yes', 'no'));

alter table public.routes drop constraint if exists routes_snow_in_season_yn;
alter table public.routes add constraint routes_snow_in_season_yn
  check (snow_in_season is null or snow_in_season in ('yes', 'no'));

comment on column public.routes.glacier_travel is
  'Reviewed: does the NORMAL line in its NORMAL season travel a glacier with crevasse hazard? yes | no | null = not settled (0490).';
comment on column public.routes.snow_in_season is
  'Reviewed: does the NORMAL line in its NORMAL season cross or climb snow? yes | no | null = not settled (0490).';

insert into contribution_fields (form_key, column_name, is_prose, is_gear, label) values
  ('glacierTravel', 'glacier_travel', false, false, 'Glacier travel'),
  ('snowInSeason', 'snow_in_season', false, false, 'Snow in season')
on conflict (form_key) do update
  set column_name = excluded.column_name, is_prose = excluded.is_prose, is_gear = excluded.is_gear, label = excluded.label;
