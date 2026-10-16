-- 0214: the catalog directory — look here BEFORE adding a peak, area or route.
--
-- Requested directly: "we need to make sure that you don't add routes or peaks in areas and
-- such that we already have. Can you create a table that has all this information stored by
-- hierarchy so that you can reference it before adding new peaks, routes, etc? Make it
-- formatted to how we structured the climbs search so it's easy to understand and navigate."
--
-- Why: 0213. The MP importer created `North Cascades > Mt. Baker` beside our
-- `Bellingham and Mt Baker Hwy > Mount Baker` because it only ever asked "does THIS PARENT
-- have a child with this exact name?". The same peak under a different parent, or spelled
-- "Mt." instead of "Mount", was invisible to it. Everything here answers the wider question:
-- "does this place or climb already exist ANYWHERE nearby, under ANY spelling?"
--
-- VIEWS, NOT COPIED TABLES: a second table would drift from `areas`/`routes` the moment an
-- importer wrote to one and not the other, which is the bug this is meant to prevent. These
-- read the live tree on every query, so they cannot be stale.
--
--   catalog_directory   one row per area, laid out like the Climbs tab:
--                         breadcrumb  "Washington › Northwest › Bellingham and Mt Baker Hwy › Mount Baker"
--                         outline     the same tree indented, for reading a whole state top-down:
--                                       select outline from catalog_directory
--                                        where state = 'Washington' order by sort_key;
--   catalog_routes      one row per route, with its area's breadcrumb
--   catalog_find_area(name, state, lat, lng, km)  -> existing areas this name would duplicate
--   catalog_find_route(name, area_id, km)          -> existing routes this climb would duplicate
--
-- MATCHING. `catalog_key` is search_canon (0190: "Mt. Baker" = "Mount Baker", "Ford's" =
-- "Fords", accents folded) with the generic words that MP and our tree disagree about removed:
-- "Colfax Peak" = "Colfax", "++ Ice climbing North Cascades" = "north cascades". Removing them
-- makes the key LOOSER, so a find_* hit is a CANDIDATE to read, never proof of a duplicate.
-- Three short names ("Main Peak", "North Face") collide everywhere; that is why area matches
-- are ranked by distance and route matches are confined to the neighbourhood.

begin;

-- search_path is PINNED: an index build runs with an empty one, and search_canon's own body
-- calls search_clean/search_forms unqualified, so without this the CREATE INDEX below fails.
create or replace function catalog_key(t text) returns text
language sql immutable parallel safe set search_path = public, pg_temp as $$
  select coalesce(nullif(string_agg(u.w, ' ' order by u.i), ''), public.search_canon(t))
    from unnest(string_to_array(public.search_canon(t), ' ')) with ordinality as u(w, i)
   where u.w not in ('the', 'mount', 'mountain', 'mountains', 'peak', 'peaks', 'area', 'areas',
                     'climbing', 'climbs', 'crag', 'crags', 'ice', 'route', 'via', 'and', 'of')
$$;

create index if not exists areas_catalog_key_idx  on areas  (public.catalog_key(name));
create index if not exists routes_catalog_key_idx on routes (public.catalog_key(name));

-- Great-circle distance in km; no PostGIS in this project.
create or replace function catalog_km(lat1 float8, lng1 float8, lat2 float8, lng2 float8) returns float8
language sql immutable parallel safe as $$
  select case when lat1 is null or lat2 is null then null else
    6371 * 2 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2)
      + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))) end
$$;

-- Breadcrumb exactly as the Climbs tab prints it: state downwards, "›" between levels.
-- The path's labels ARE area ids, so each level is a primary-key lookup.
create or replace function catalog_breadcrumb(p ltree) returns text
language sql stable parallel safe as $$
  select string_agg(a.name, ' › ' order by l.i)
    from unnest(string_to_array(p::text, '.')) with ordinality as l(id, i)
    join areas a on a.id = l.id
   where l.i >= 2
$$;

create or replace view catalog_directory as
select (select s.name from areas s where s.id = subpath(a.path, 1, 1)::text) as state,
       catalog_breadcrumb(a.path)                                             as breadcrumb,
       repeat('    ', greatest(nlevel(a.path) - 2, 0)) || a.name
         || '  [' || coalesce(a.area_type, 'area') || ', ' || a.route_count || ' routes]'   as outline,
       nlevel(a.path) - 2                                                     as depth,
       a.id                                                                   as area_id,
       a.name,
       a.area_type,
       case when exists (select 1 from areas c where c.parent_id = a.id) then 'sub-areas'
            else 'routes' end                                                 as holds,
       a.route_count,
       a.lat, a.lng,
       a.parent_id,
       public.catalog_key(a.name)                                                    as key,
       lower(catalog_breadcrumb(a.path))                                      as sort_key,
       a.path
  from areas a
 where nlevel(a.path) >= 2;

create or replace view catalog_routes as
select d.state,
       d.breadcrumb || ' › ' || r.name as breadcrumb,
       r.id   as route_id,
       r.name,
       r.grade,
       r.discipline,
       r.area_id,
       d.breadcrumb as area_breadcrumb,
       public.catalog_key(r.name) as key
  from routes r
  join catalog_directory d on d.area_id = r.area_id;

-- Existing areas a new area called p_name would duplicate. Same key anywhere in the state, or
-- a key that contains / is contained by it within p_km. Nearest first; `km` is null when
-- either side has no coordinate.
create or replace function catalog_find_area(p_name text, p_state text default null,
                                             p_lat float8 default null, p_lng float8 default null,
                                             p_km float8 default 5)
returns table (area_id text, breadcrumb text, area_type text, holds text, route_count int, km numeric, match text)
language sql stable as $$
  with q as (select public.catalog_key(p_name) k),
  st as (select a.path from areas a
          where p_state is not null and nlevel(a.path) = 2
            and (a.id = p_state or public.search_canon(a.name) = public.search_canon(p_state)))
  select a.id, catalog_breadcrumb(a.path), a.area_type,
         case when exists (select 1 from areas c where c.parent_id = a.id) then 'sub-areas' else 'routes' end,
         a.route_count,
         round(catalog_km(p_lat, p_lng, a.lat, a.lng)::numeric, 2),
         case when public.catalog_key(a.name) = q.k then 'same name' else 'name overlaps' end
    from areas a, q
   where (p_state is null or a.path <@ (select path from st))
     and (public.catalog_key(a.name) = q.k
          or (length(q.k) >= 4 and catalog_km(p_lat, p_lng, a.lat, a.lng) <= p_km
              and (public.catalog_key(a.name) like '%' || q.k || '%' or q.k like '%' || public.catalog_key(a.name) || '%')
              and length(public.catalog_key(a.name)) >= 4))
   order by catalog_km(p_lat, p_lng, a.lat, a.lng) nulls last, a.route_count desc
   limit 25
$$;

-- Existing routes a new climb called p_name, going into area p_area_id, would duplicate. Looks
-- in the target area, in every area within p_km of it, and in every same-named area in the
-- state (so "Mt. Baker" finds "Mount Baker"'s climbs even when the two coordinates disagree).
create or replace function catalog_find_route(p_name text, p_area_id text, p_km float8 default 3)
returns table (route_id text, name text, grade text, breadcrumb text, km numeric, match text)
language sql stable as $$
  with t as (select a.id, a.name, a.lat, a.lng, subpath(a.path, 0, 2) st from areas a where a.id = p_area_id),
  q as (select public.catalog_key(p_name) k),
  near as (
    select a.id, catalog_km(t.lat, t.lng, a.lat, a.lng) km
      from areas a, t
     where a.path <@ t.st
       and (a.id = t.id
            or catalog_km(t.lat, t.lng, a.lat, a.lng) <= p_km
            or public.catalog_key(a.name) = public.catalog_key(t.name)))
  select r.id, r.name, r.grade, catalog_breadcrumb(a.path) || ' › ' || r.name,
         round(n.km::numeric, 2),
         case when public.catalog_key(r.name) = q.k then 'same name' else 'name overlaps' end
    from near n
    join routes r on r.area_id = n.id
    join areas a on a.id = r.area_id, q
   where public.catalog_key(r.name) = q.k
      or (length(q.k) >= 5 and length(public.catalog_key(r.name)) >= 5
          and (public.catalog_key(r.name) like '%' || q.k || '%' or q.k like '%' || public.catalog_key(r.name) || '%'))
   order by (public.catalog_key(r.name) = q.k) desc, n.km nulls last
   limit 25
$$;

grant select on catalog_directory, catalog_routes to anon, authenticated;
grant execute on function catalog_find_area(text, text, float8, float8, float8),
                          catalog_find_route(text, text, float8) to anon, authenticated;

commit;

-- Verify (each must return the row named):
--   select * from catalog_find_area('Mt. Baker', 'Washington', 48.7768, -121.8144);  -> wa_mount_baker
--   select * from catalog_find_route('Cosley-Houston', 'wa_colfax_peak');             -> wa_colfax_peak_cosley_houston
--   select outline from catalog_directory where state = 'Washington' order by sort_key limit 40;
