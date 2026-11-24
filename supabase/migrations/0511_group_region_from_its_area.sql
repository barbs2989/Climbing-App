-- 0511 — A GROUP'S STATE COMES FROM THE AREA IT CLIMBS AT, not only from what was typed.
--
-- 0487 derived `groups.region` (the state chip Discover files a group under) from the free-text
-- `location` alone. A group typed as "Squamish" or "North Cascades" names no state, so it was
-- listed under *Other* even when its form had picked Squamish from the catalog, and the catalog
-- area's name was not searchable either. The form now asks *Where it climbs* first: a catalog
-- area, or a place the climber types with its state or province picked from a list.
--
--   groups.area_region  the state or province of the picked area: the name of its level-2 ancestor
--                       (usa.<state>, canada.<province>) when the region table knows that name.
--   groups.area_place   the picked area's name, so "squamish" finds a group placed at Squamish.
--   Both are written ONLY by the groups_place_from_area trigger (0396), like lat/lng: a client value
--   is overwritten, so a group cannot claim a state its area is not in.
--
--   groups.region       now coalesce(area_region, region_of_place(location)): the area wins, the
--                       typed text is the fallback for a place the catalog does not hold.
--   groups.search_text  now also holds the area's name and its region in both spellings.
--
-- place_regions() gains the Northwest Territories and Nunavut, the two catalog provinces it lacked
-- (lib/db.js REGION_ABBR gains them in the same PR; check:search-norm compares the two tables).
--
-- The backfill touches only area_region/area_place, which the screening text does not read, so
-- no group is re-screened (screen_should_run compares that text).

begin;

create or replace function public.place_regions()
returns table (ord integer, abbr text, name text)
language sql immutable parallel safe
set search_path = public, pg_temp
as $$
  values
    (1, 'AL', 'Alabama'), (2, 'AK', 'Alaska'), (3, 'AZ', 'Arizona'), (4, 'AR', 'Arkansas'),
    (5, 'CA', 'California'), (6, 'CO', 'Colorado'), (7, 'CT', 'Connecticut'), (8, 'DE', 'Delaware'),
    (9, 'FL', 'Florida'), (10, 'GA', 'Georgia'), (11, 'HI', 'Hawaii'), (12, 'ID', 'Idaho'),
    (13, 'IL', 'Illinois'), (14, 'IN', 'Indiana'), (15, 'IA', 'Iowa'), (16, 'KS', 'Kansas'),
    (17, 'KY', 'Kentucky'), (18, 'LA', 'Louisiana'), (19, 'ME', 'Maine'), (20, 'MD', 'Maryland'),
    (21, 'MA', 'Massachusetts'), (22, 'MI', 'Michigan'), (23, 'MN', 'Minnesota'), (24, 'MS', 'Mississippi'),
    (25, 'MO', 'Missouri'), (26, 'MT', 'Montana'), (27, 'NE', 'Nebraska'), (28, 'NV', 'Nevada'),
    (29, 'NH', 'New Hampshire'), (30, 'NJ', 'New Jersey'), (31, 'NM', 'New Mexico'), (32, 'NY', 'New York'),
    (33, 'NC', 'North Carolina'), (34, 'ND', 'North Dakota'), (35, 'OH', 'Ohio'), (36, 'OK', 'Oklahoma'),
    (37, 'OR', 'Oregon'), (38, 'PA', 'Pennsylvania'), (39, 'RI', 'Rhode Island'), (40, 'SC', 'South Carolina'),
    (41, 'SD', 'South Dakota'), (42, 'TN', 'Tennessee'), (43, 'TX', 'Texas'), (44, 'UT', 'Utah'),
    (45, 'VT', 'Vermont'), (46, 'VA', 'Virginia'), (47, 'WA', 'Washington'), (48, 'WV', 'West Virginia'),
    (49, 'WI', 'Wisconsin'), (50, 'WY', 'Wyoming'), (51, 'DC', 'District of Columbia'), (52, 'AB', 'Alberta'),
    (53, 'BC', 'British Columbia'), (54, 'MB', 'Manitoba'), (55, 'NB', 'New Brunswick'), (56, 'NL', 'Newfoundland and Labrador'),
    (57, 'NS', 'Nova Scotia'), (58, 'ON', 'Ontario'), (59, 'PE', 'Prince Edward Island'), (60, 'QC', 'Quebec'),
    (61, 'SK', 'Saskatchewan'), (62, 'YT', 'Yukon'), (63, 'NT', 'Northwest Territories'), (64, 'NU', 'Nunavut')
$$;

-- The state or province an area lies in: its level-2 ancestor's name, when the region table has it.
create or replace function public.area_state(aid text)
returns text
language sql stable
set search_path = public, pg_temp
as $$
  select r.name
  from public.areas a
  join public.areas s on s.path = subpath(a.path, 0, 2)
  join public.place_regions() r on r.name = s.name
  where a.id = aid and nlevel(a.path) >= 2
  limit 1
$$;
grant execute on function public.area_state(text) to anon, authenticated;

alter table public.groups add column if not exists area_region text;
alter table public.groups add column if not exists area_place text;

create or replace function public.groups_place_from_area()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.area_id is null then
    new.lat := null; new.lng := null; new.area_region := null; new.area_place := null;
  elsif tg_op = 'INSERT' or new.area_id is distinct from old.area_id
        or new.lat is distinct from old.lat or new.lng is distinct from old.lng
        or new.area_region is distinct from old.area_region or new.area_place is distinct from old.area_place then
    select p.lat, p.lng into new.lat, new.lng from public.area_point(new.area_id) p;
    new.area_region := public.area_state(new.area_id);
    select a.name into new.area_place from public.areas a where a.id = new.area_id;
  end if;
  return new;
end;
$$;

-- Everything the Discover box matches. The region is the area's when it has one.
create or replace function public.group_search_text(g_name text, g_disciplines text[], g_location text, g_blurb text, g_area_place text, g_area_region text)
returns text
language sql immutable parallel safe
set search_path = public, pg_temp
as $$
  with reg as (select coalesce(g_area_region, public.region_of_place(g_location)) as name)
  select public.search_norm(
    coalesce(g_name, '') || ' ' || coalesce(array_to_string(g_disciplines, ' '), '') || ' ' ||
    coalesce(g_location, '') || ' ' || coalesce(g_area_place, '') || ' ' || coalesce(reg.name, '') || ' ' ||
    coalesce((select r.abbr from public.place_regions() r where r.name = reg.name), '') || ' ' ||
    coalesce(g_blurb, ''))
  from reg
$$;

-- A generated column's expression is replaced by dropping and re-adding it (its index goes with it).
alter table public.groups drop column if exists search_text;
alter table public.groups drop column if exists region;
drop function if exists public.group_search_text(text, text[], text, text);

alter table public.groups add column region text
  generated always as (coalesce(area_region, public.region_of_place(location))) stored;
alter table public.groups add column search_text text
  generated always as (public.group_search_text(name, disciplines, location, blurb, area_place, area_region)) stored;

create index if not exists groups_region_idx on public.groups (region);
create index if not exists groups_search_text_trgm on public.groups using gin (search_text gin_trgm_ops);

-- Fill the two new columns for the groups that already picked an area (the trigger computes them).
update public.groups g
   set area_region = public.area_state(g.area_id),
       area_place = (select a.name from public.areas a where a.id = g.area_id)
 where g.area_id is not null;

commit;
