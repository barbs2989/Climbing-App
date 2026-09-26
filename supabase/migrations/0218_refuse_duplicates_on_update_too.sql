-- 0218: 0216's duplicate refusal covers UPDATES too, and a same-named SIBLING.
--
-- Requested: "make sure the duplicate routes don't happen again". 0216 fired on INSERT only, so
-- two writes still made a duplicate without adding a row:
--   - MOVING a route into an area that already holds it (update routes set area_id = …) — the shape
--     0213/0215 used, and any future merge or re-file script will use;
--   - RENAMING a route or an area onto a name its neighbour already has.
-- It fires only when the name or the parent actually CHANGES, so the enrichment pipeline's
-- ordinary column updates never reach it.
--
-- And the area test skipped any candidate under the SAME parent ("a.parent_id is distinct from
-- new.parent_id"), so "Mt. Baker" beside "Mount Baker" as siblings passed. A same-named area within
-- 1.5 km is a duplicate whoever its parent is. The row itself is now excluded (a.id <> new.id),
-- which INSERT never needed and UPDATE does.
--
-- Bypass unchanged: set local catalog.allow_duplicate = 'on'.

begin;

create or replace function refuse_duplicate_area() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare hit record; st ltree;
begin
  if coalesce(current_setting('catalog.allow_duplicate', true), '') = 'on' then return new; end if;
  if tg_op = 'UPDATE' and new.name is not distinct from old.name
                      and new.parent_id is not distinct from old.parent_id then return new; end if;
  select subpath(path, 0, 2) into st from areas where id = new.parent_id;
  if st is null or nlevel(st) < 2 then return new; end if;

  if new.lat is not null and new.lng is not null then
    select a.id, catalog_breadcrumb(a.path) bc, round(catalog_km(new.lat, new.lng, a.lat, a.lng)::numeric, 2) km into hit
      from areas a
     where a.path <@ st
       and a.id <> new.id
       and catalog_key(a.name) = catalog_key(new.name)
       and a.lat between new.lat - 0.02 and new.lat + 0.02
       and catalog_km(new.lat, new.lng, a.lat, a.lng) <= 1.5
     order by catalog_km(new.lat, new.lng, a.lat, a.lng) limit 1;
  else
    select a.id, catalog_breadcrumb(a.path) bc, null::numeric km into hit
      from areas a
     where a.path <@ st
       and a.id <> new.id
       and a.area_type = 'peak'
       and search_canon(a.name) = search_canon(new.name)
     limit 1;
  end if;

  if hit.id is not null then
    raise exception 'area "%" (under %) already exists as % — % %',
      new.name, new.parent_id, hit.id, hit.bc, coalesce('(' || hit.km || ' km away)', '')
      using hint = 'Add routes to the existing area. If this really is a different place: set local catalog.allow_duplicate = ''on''.';
  end if;
  return new;
end $$;

create or replace function refuse_duplicate_route() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare hit record; t record;
begin
  if coalesce(current_setting('catalog.allow_duplicate', true), '') = 'on' then return new; end if;
  if tg_op = 'UPDATE' and new.name is not distinct from old.name
                      and new.area_id is not distinct from old.area_id then return new; end if;
  if new.area_id is null or route_name_is_placeholder(new.name) then return new; end if;
  select a.id, a.name, a.lat, a.lng, subpath(a.path, 0, 2) st into t from areas a where a.id = new.area_id;
  if t.id is null or nlevel(t.st) < 2 then return new; end if;

  select r.id, catalog_breadcrumb(a.path) || ' › ' || r.name bc into hit
    from areas a
    join routes r on r.area_id = a.id
   where a.path <@ t.st
     and (a.id = t.id
          or (catalog_key(a.name) = catalog_key(t.name)
              and (t.lat is null or a.lat is null or catalog_km(t.lat, t.lng, a.lat, a.lng) <= 5))
          or (t.lat is not null and a.lat between t.lat - 0.005 and t.lat + 0.005
              and catalog_km(t.lat, t.lng, a.lat, a.lng) <= 0.3))
     and catalog_key(r.name) = catalog_key(new.name)
     and r.id <> new.id
     and not route_name_is_placeholder(r.name)
   limit 1;

  if hit.id is not null then
    raise exception 'route "%" (into %) already exists as % — %', new.name, new.area_id, hit.id, hit.bc
      using hint = 'Fill the existing route''s blank columns instead. If this really is a different climb: set local catalog.allow_duplicate = ''on''.';
  end if;
  return new;
end $$;

drop trigger if exists trg_refuse_duplicate_area on areas;
create trigger trg_refuse_duplicate_area before insert or update of name, parent_id on areas
  for each row execute function refuse_duplicate_area();

drop trigger if exists trg_refuse_duplicate_route on routes;
create trigger trg_refuse_duplicate_route before insert or update of name, area_id on routes
  for each row execute function refuse_duplicate_route();

commit;
