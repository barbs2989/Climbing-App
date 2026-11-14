-- catalog_find_area (0214) times out (57014) over the public API. 0386 indexed the state lookup. The
-- remaining cost: catalog_key(name) was computed for every area in the state, and a CTE used twice
-- was materialised, so the same-name branch could not use areas_catalog_key_idx.
--
-- This version has two branches, each cheap:
--   1. SAME NAME anywhere in the state: `catalog_key(name) = <key>` uses areas_catalog_key_idx, so no
--      key is computed for the whole state. The key is written inline, not as a shared CTE.
--   2. NAME OVERLAPS within p_km: only areas inside a bounding box around the point are considered,
--      so catalog_key runs on a handful of rows, not the whole state.
--
-- Measured on the live database (2026-10-30, healthy): Bondcliffs/NH 1.96 s -> 0.34 s. Lafayette
-- (same name) and Liberty (name overlaps) return identical rows to the 0214 body.
-- Output columns, ordering and limit are unchanged. A row matching both branches is returned once
-- (branch 2 excludes exact-key rows). Function-only: no table rewrite, no lock.
-- Rollback: re-apply the 0214 body of catalog_find_area.

create or replace function catalog_find_area(p_name text, p_state text default null,
                                             p_lat float8 default null, p_lng float8 default null,
                                             p_km float8 default 5)
returns table (area_id text, breadcrumb text, area_type text, holds text, route_count int, km numeric, match text)
language sql stable as $$
  with st as materialized (select a.path from areas a
          where p_state is not null and nlevel(a.path) = 2
            and (a.id = p_state or public.search_canon(a.name) = public.search_canon(p_state))),
  hits as (
    select a.id, a.path, a.name, a.area_type, a.lat, a.lng, a.route_count, 'same name' as m
      from areas a
     where public.catalog_key(a.name) = (select public.catalog_key(p_name))
       and (p_state is null or a.path <@ (select path from st))
    union all
    select a.id, a.path, a.name, a.area_type, a.lat, a.lng, a.route_count, 'name overlaps' as m
      from areas a
     where p_lat is not null and p_lng is not null
       and length((select public.catalog_key(p_name))) >= 4
       and a.lat between p_lat - p_km / 111.0 and p_lat + p_km / 111.0
       and a.lng between p_lng - p_km / (111.0 * cos(radians(p_lat))) and p_lng + p_km / (111.0 * cos(radians(p_lat)))
       and (p_state is null or a.path <@ (select path from st))
       and public.catalog_key(a.name) <> (select public.catalog_key(p_name))
       and length(public.catalog_key(a.name)) >= 4
       and (public.catalog_key(a.name) like '%' || (select public.catalog_key(p_name)) || '%'
            or (select public.catalog_key(p_name)) like '%' || public.catalog_key(a.name) || '%')
       and catalog_km(p_lat, p_lng, a.lat, a.lng) <= p_km
  )
  select h.id, catalog_breadcrumb(h.path), h.area_type,
         case when exists (select 1 from areas c where c.parent_id = h.id) then 'sub-areas' else 'routes' end,
         h.route_count,
         round(catalog_km(p_lat, p_lng, h.lat, h.lng)::numeric, 2),
         h.m
    from hits h
   order by catalog_km(p_lat, p_lng, h.lat, h.lng) nulls last, h.route_count desc
   limit 25
$$;
