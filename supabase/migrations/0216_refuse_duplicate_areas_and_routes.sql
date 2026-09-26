-- 0216: the database refuses to ADD a peak, area or route it already has.
--
-- Requested directly: "we need to make sure that you don't add routes or peaks in areas and such
-- that we already have", then "yes" to a trigger that enforces it. 0214 built the directory to
-- look things up in; this makes the look-up impossible to skip. A convention is exactly what the
-- MP importer did not follow; a trigger covers the importers, one-off scripts, the SQL Editor and
-- approve_new_route alike.
--
-- INSERT only — moving an existing row (as 0213 did) is not an addition.
--
--   AREA with a coordinate: an existing area in the same state with the same catalog_key (0214:
--     "Mt. Baker" = "Mount Baker", "Colfax Peak" = "Colfax") within 1.5 km, under a DIFFERENT
--     parent. 0213's copies sat 0.00–0.4 km from the originals.
--   AREA without one (importers create intermediate levels with none — how "Mt. Shuksan" came):
--     an existing PEAK in the state spelled the same (search_canon). Only peaks: "North Face" or
--     "Upper Wall" legitimately exist in many places, a named summit does not.
--   ROUTE: a route with the same catalog_key in the target area, in any area sharing the target's
--     catalog_key within 5 km (our "Mount Baker" vs MP's "Mt. Baker"), or in any area within
--     0.3 km. Placeholder names ("Unknown", "Project") are never compared.
--
-- STATE SCOPE is the parent's own path prefix (usa.<state>). The importer's first guard scoped to
-- 'washington'::ltree, which no path matches, and passed everything (#1933's dry run caught it).
--
-- DELIBERATE EXCEPTION — a writer that has READ the candidate and knows it is a different place or
-- climb says so for its own transaction:
--     set local catalog.allow_duplicate = 'on';
-- The error names the existing row and its breadcrumb, so the reader can decide.

begin;

create index if not exists areas_lat_idx on areas (lat);

create or replace function refuse_duplicate_area() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare hit record; st ltree;
begin
  if coalesce(current_setting('catalog.allow_duplicate', true), '') = 'on' then return new; end if;
  select subpath(path, 0, 2) into st from areas where id = new.parent_id;
  if st is null or nlevel(st) < 2 then return new; end if;

  if new.lat is not null and new.lng is not null then
    select a.id, catalog_breadcrumb(a.path) bc, round(catalog_km(new.lat, new.lng, a.lat, a.lng)::numeric, 2) km into hit
      from areas a
     where a.path <@ st
       and catalog_key(a.name) = catalog_key(new.name)
       and a.parent_id is distinct from new.parent_id
       and a.lat between new.lat - 0.02 and new.lat + 0.02
       and catalog_km(new.lat, new.lng, a.lat, a.lng) <= 1.5
     order by catalog_km(new.lat, new.lng, a.lat, a.lng) limit 1;
  else
    select a.id, catalog_breadcrumb(a.path) bc, null::numeric km into hit
      from areas a
     where a.path <@ st
       and a.area_type = 'peak'
       and search_canon(a.name) = search_canon(new.name)
       and a.parent_id is distinct from new.parent_id
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
create trigger trg_refuse_duplicate_area before insert on areas
  for each row execute function refuse_duplicate_area();

drop trigger if exists trg_refuse_duplicate_route on routes;
create trigger trg_refuse_duplicate_route before insert on routes
  for each row execute function refuse_duplicate_route();

commit;
