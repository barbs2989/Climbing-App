-- catalog_find_area (0214) recomputes catalog_key(name) for every area in the state, several times per
-- row, and times out (57014) over the public API. 0386 fixed the state lookup. The remaining cost is
-- the name match. catalog_key is IMMUTABLE, so the key can be a STORED GENERATED column: Postgres keeps
-- it current on every insert and rename, with no trigger, and it can be indexed.
--
-- WARNING: ADD COLUMN ... STORED rewrites the whole areas table and holds an ACCESS EXCLUSIVE lock for
-- the rewrite. Apply in a quiet window, after checking the table size.
--
-- The function is NOT changed here. It still calls catalog_key(); a follow-up will read this column.
-- Rollback: alter table areas drop column catalog_key_stored;

alter table areas
  add column if not exists catalog_key_stored text
  generated always as (public.catalog_key(name)) stored;

create index if not exists areas_catalog_key_stored_idx
  on areas (catalog_key_stored);
