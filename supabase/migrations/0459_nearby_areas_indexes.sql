-- 0459: indexes for the Near me / area map read (useNearbyAreas in lib/db.js).
--
-- The read: peaks and crags inside a lat/lng box, busiest first, 500 at most, plus an exact count of
-- the box. Home's Near me (2026-11-18) opens on the whole country, and there the only usable index,
-- areas_lat_idx, is skipped: measured 2026-11-18 on production, both the rows read and the count were
-- a sequential scan of every area (67,535 rows, ~5,000 pages, ~40 MB). Warm that is 30-40 ms; cold
-- it hit the anon role's 3 s statement timeout (57014 at 3.5 s), and the map said "Couldn't load
-- nearby areas".
--
-- Both indexes cover only peaks and crags (56,152 of the rows), the only types the read asks for.
--   areas_nearby_busiest_idx: route_count DESC (PostgREST's order=route_count.desc is DESC NULLS
--     FIRST, the btree default), with lat/lng INCLUDEd so the box is checked inside the index and
--     only the rows returned are fetched from the table.
--   areas_nearby_ll_idx: (lat, lng), so the count is an index-only scan of a small index, and a city
--     box filters on both coordinates instead of lat alone.
--
-- Built CONCURRENTLY by hand on production first (README-numbering.md); here a plain IF NOT EXISTS,
-- so a preview database replays it and production finds them already there.
create index if not exists areas_nearby_busiest_idx
  on public.areas (route_count desc) include (lat, lng)
  where area_type in ('peak', 'crag');

create index if not exists areas_nearby_ll_idx
  on public.areas (lat, lng)
  where area_type in ('peak', 'crag');
