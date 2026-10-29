-- catalog_find_area (0214) timed out (57014) under the anon key. Measured on the live
-- plan: the state lookup was a sequential scan of every area, computing search_canon(name)
-- on each row (estimated cost ~23,000 of ~24,800). This indexes exactly that expression for
-- the top-level state rows only, so the lookup becomes an index probe. The function is
-- unchanged. search_canon and catalog_key are declared IMMUTABLE, so the index is valid.
-- Rollback: drop index if exists areas_state_search_canon_idx;

-- search_path is PINNED first: an index build runs with an empty one, and search_canon's body
-- calls search_clean/search_forms unqualified (same fix as 0214's catalog_key). Changes no logic.
alter function public.search_canon(text) set search_path = public, pg_temp;

create index if not exists areas_state_search_canon_idx
  on areas (public.search_canon(name))
  where nlevel(path) = 2;

comment on index areas_state_search_canon_idx is
  'Partial index for catalog_find_area''s state lookup (0386). Top-level state rows only.';
