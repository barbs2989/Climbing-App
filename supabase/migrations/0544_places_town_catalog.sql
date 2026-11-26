-- 0544 — a TOWN CATALOG for the profile's Home city box (owner note: "should we have a catalog that
-- indexes all towns and cities so when you type it auto-populates and knows exactly the city it is").
--
-- Before this the box was free text over a 60-city datalist: "Mt Vernon", "Mount Vernon WA" and
-- "Mount Vernon, WA" were three different homes, and a climber in Mazama or Index typed a town the
-- list did not know. `places` holds every US Census place (incorporated + CDP, 2025 Gazetteer), the
-- USGS GNIS populated places the Census does not draw (hamlets), and Canada's census subdivisions
-- and settlements from Wikidata -- all public domain or CC0, so nothing on screen credits them.
-- Loaded by scripts/oneoff/load-places.mjs with the service key; public, read-only data.
--
-- `profiles.home_place_id` records WHICH town the climber picked. It is a label's identity only:
-- the zip is still the one thing that places a climber (partners_near, CrewFinder), and nothing reads
-- a place's coordinate for a profile. Owner-only, like the zip: other climbers read `location`.

create table if not exists places (
  id text primary key check (id ~ '^(us|ca)-[a-z0-9-]+$'),
  name text not null check (length(name) between 1 and 120),
  region text not null check (region ~ '^[A-Z]{2}$'),
  country text not null check (country in ('US', 'CA')),
  county text,
  pop integer,             -- a RANKING key only (the big Springfield first); never shown
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  name_search text,        -- every spelling of every word (search_norm), what a query matches
  name_canon text          -- one spelling per word (search_canon), what ranks an exact/prefix hit
);
comment on table places is 'Towns and cities a climber can pick as their home (0544). US Census places + GNIS hamlets + Wikidata Canada. pop ranks namesakes; it is never displayed.';

create or replace function places_set_search() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.name_search := search_norm(new.name);
  new.name_canon := search_canon(new.name);
  return new;
end $$;
drop trigger if exists trg_places_name_search on places;
create trigger trg_places_name_search before insert or update of name, name_search, name_canon on places
  for each row execute function places_set_search();

create index if not exists places_name_search_trgm on places using gin (name_search gin_trgm_ops);
create index if not exists places_name_canon_prefix on places (name_canon text_pattern_ops);

alter table places enable row level security;
drop policy if exists "places are public" on places;
create policy "places are public" on places for select using (true);
revoke insert, update, delete, truncate on places from anon, authenticated;
grant select on places to anon, authenticated;

-- Towns matching what was typed, best first: a name that IS the query, then the climber's own
-- state/province, then the bigger town. Under the same spelling rules as every other search
-- (search_canon / search_patterns: "mt vernon" finds Mount Vernon, "st george" finds St. George).
--   1. Names that START with the query (name_canon prefix, a btree range) -- what a type-ahead is.
--   2. Only when that leaves room, and the query has 3+ letters: names holding every word anywhere
--      (name_search, the trigram index on its longest word), so "vernon" or "ventura" still finds
--      Mount Vernon and San Buenaventura (Ventura).
-- Both legs run as literal SQL (EXECUTE format %L): a plpgsql variable in a LIKE gets a generic plan
-- that can use neither index -- measured 2.3 s for every query as one SQL function, a few ms this way.
-- Cleaned words are [a-z0-9] only, so nothing typed can reach a LIKE as a wildcard.
create or replace function places_search(q text, st text default null, lim integer default 8)
returns table (id text, name text, region text, country text, county text)
language plpgsql stable security invoker set search_path = public, pg_temp as $$
declare
  c text := search_canon(q);
  pats text[] := search_patterns(q);
  longest text;
  n integer := least(greatest(coalesce(lim, 8), 1), 20);
  got integer := 0;
  rk text := format('(pl.name_canon = %L) desc, (pl.region = %L) desc, pl.pop desc nulls last, pl.name, pl.id', c, upper(coalesce(st, '')));
begin
  if c = '' then return; end if;
  return query execute format(
    'select pl.id, pl.name, pl.region, pl.country, pl.county from places pl where pl.name_canon like %L order by %s limit %s',
    c || '%', rk, n);
  get diagnostics got = row_count;
  if got < n and length(c) >= 3 then
    select p into longest from unnest(pats) p order by length(p) desc limit 1;
    return query execute format(
      'select pl.id, pl.name, pl.region, pl.country, pl.county from places pl where pl.name_search ilike %L and pl.name_search ilike all (%L::text[]) and pl.name_canon not like %L order by %s limit %s',
      longest, pats, c || '%', rk, n - got);
  end if;
end $$;
revoke all on function places_search(text, text, integer) from public;
grant execute on function places_search(text, text, integer) to anon, authenticated;

alter table profiles add column if not exists home_place_id text references places(id) on delete set null;
comment on column profiles.home_place_id is 'The town the climber PICKED for location (0544). Owner-only (read through my_profile). A label''s identity: nothing places a climber by it -- the zip does.';
