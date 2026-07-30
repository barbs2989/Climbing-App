-- STEP 3 of 5 — unique index, required for REFRESH ... CONCURRENTLY (which is what lets a
-- refresh run without blocking readers). (area_id, route_name) is the group-by key, so it
-- is unique by construction; if this fails on duplicate keys, something is wrong with
-- step 2's definition and I want to know.

create unique index route_duplicate_names_key
  on route_duplicate_names (area_id, route_name);

-- VERIFY: expect one row.
select indexname from pg_indexes where tablename = 'route_duplicate_names';
