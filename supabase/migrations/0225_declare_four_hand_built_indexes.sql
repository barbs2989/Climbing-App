-- Make the indexes a rebuild produces match the live ones: three built by hand, one duplicate dropped.
--
-- Found on 2026-09-30 by replaying every migration into an empty database (as a Supabase preview
-- branch does) and diffing the result against the live catalog: 560/560 columns, 49/49 tables and
-- views, 130/130 policies and 33/33 triggers agree, and these four indexes are the only difference.
--
--   routes_area_name_uniq     0062 left it commented out, to run by hand with CONCURRENTLY once
--                             route_duplicate_names was empty. It was, and it was built by hand.
--   areas_name_search_trgm    0190 left both as a comment for the same reason: CONCURRENTLY cannot
--   routes_name_search_trgm   run inside a migration's transaction. Both were built by hand.
--   routes_lists_gin_idx      the other way round: 0134 created it as a second copy of 0011's
--                             `routes_lists_gin` (the same GIN index on `lists`), and live has only
--                             0011's. Dropped here so a rebuild matches, and so it isn't maintained twice.
--
-- NO-OP ON PRODUCTION. Every statement is `if not exists` / `if exists`: the three exist live under
-- exactly these definitions (read from pg_indexes), and routes_lists_gin_idx does not exist live. Not CONCURRENTLY, so it runs in a
-- migration's transaction; on an empty preview database there is nothing to build around.

create unique index if not exists routes_area_name_uniq
  on public.routes using btree (area_id, lower(btrim(name)))
  where area_id is not null and not route_name_is_placeholder(name);

create index if not exists areas_name_search_trgm  on public.areas  using gin (name_search gin_trgm_ops);
create index if not exists routes_name_search_trgm on public.routes using gin (name_search gin_trgm_ops);

drop index if exists public.routes_lists_gin_idx;
