-- 0219: the route half of the duplicate refusal compares a STRICTER key, so a variant is not a copy.
--
-- 0216/0218 compared route names by catalog_key (0214), which is built for AREA names: it drops
-- "ice", "route", "area", "climbing", "and", "of" and every punctuation mark. Reading the 48
-- same-area groups that key found on 2026-09-26 (asked: "do the rest" — merge them), FIVE were one
-- climb twice and 43 were DIFFERENT climbs the key could not tell apart:
--   - boulder variants named by primes: "Problem A", "Problem A'", "Problem A''" (V0, V0-, V-easy);
--   - a word that matters on a route: "Apron" (M5) / "Apron Ice" (WI3), "Spray" (5.11) / "Ice Spray"
--     (WI4), "Guides Area" / "Guides Route", "Chimney" / "Chimney Route", "The Gourd" / "The Gourd and…";
--   - a trailing mark: "Grand Slab" / "Grand Slab+", "Lobehole V3" / "V3+", "Barbie's [-]" / "[--]".
-- So the trigger would have REFUSED a climber's real "Problem A''" beside "Problem A".
--
-- route_name_key(name) = search_canon (0190: "Mt." = "Mount", apostrophes and case ignored) with
-- only "the" dropped, plus the TRAILING run of variant marks (' ′ ’ " + - ? ! [ ]), which is where
-- this catalog names a variant. Still one key: "Dragon's Teeth" / "Dragons Teeth", "North Face of
-- the Northwest Ridge" / "North Face of NW Ridge", "Rizla's Crack" / "Rizlas Crack".
-- Areas keep catalog_key: "Mt. Baker" / "Mount Baker Area" is one place.
--
-- The JS twin is routeNameKey in scripts/check-catalog-duplicates.mjs; keep them one rule.

begin;

create or replace function route_name_key(n text) returns text
language sql immutable parallel safe set search_path = public, pg_temp as $$
  select coalesce(nullif(btrim(regexp_replace(' ' || public.search_canon(n) || ' ', '( the)+ ', ' ', 'g')), ''),
                  lower(btrim(n)))
      || '|' ||
         replace(replace(regexp_replace(coalesce(substring(btrim(n) from '[[:space:]''’′"+?!\[\]-]*$'), ''),
                                        '[[:space:]]', '', 'g'), '’', ''''), '′', '''')
$$;

create or replace function refuse_duplicate_route() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare hit record; t record; k text;
begin
  if coalesce(current_setting('catalog.allow_duplicate', true), '') = 'on' then return new; end if;
  if tg_op = 'UPDATE' and new.name is not distinct from old.name
                      and new.area_id is not distinct from old.area_id then return new; end if;
  if new.area_id is null or route_name_is_placeholder(new.name) then return new; end if;
  select a.id, a.name, a.lat, a.lng, subpath(a.path, 0, 2) st into t from areas a where a.id = new.area_id;
  if t.id is null or nlevel(t.st) < 2 then return new; end if;
  k := route_name_key(new.name);

  select r.id, catalog_breadcrumb(a.path) || ' › ' || r.name bc into hit
    from areas a
    join routes r on r.area_id = a.id
   where a.path <@ t.st
     and (a.id = t.id
          or (catalog_key(a.name) = catalog_key(t.name)
              and (t.lat is null or a.lat is null or catalog_km(t.lat, t.lng, a.lat, a.lng) <= 5))
          or (t.lat is not null and a.lat between t.lat - 0.005 and t.lat + 0.005
              and catalog_km(t.lat, t.lng, a.lat, a.lng) <= 0.3))
     and route_name_key(r.name) = k
     and r.id <> new.id
     and not route_name_is_placeholder(r.name)
   limit 1;

  if hit.id is not null then
    raise exception 'route "%" (into %) already exists as % — %', new.name, new.area_id, hit.id, hit.bc
      using hint = 'Fill the existing route''s blank columns instead. If this really is a different climb: set local catalog.allow_duplicate = ''on''.';
  end if;
  return new;
end $$;

commit;
