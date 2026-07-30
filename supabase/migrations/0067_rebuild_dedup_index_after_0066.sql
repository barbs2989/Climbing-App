-- Rebuild routes_area_name_dedup_idx after 0066 replaced route_name_is_placeholder().
--
-- 0066 changed the function and did NOT rebuild the index. That is a correctness bug, not
-- a tidiness one.
--
-- 0063 created the index as PARTIAL:
--   ON routes (area_id, lower(btrim(name)))
--   WHERE area_id IS NOT NULL AND NOT route_name_is_placeholder(name)
--
-- Postgres stores an index predicate as a parsed expression tree in pg_index.indpred, and
-- an IMMUTABLE SQL function is INLINED at creation time. So the function body as it read
-- THEN is frozen into the stored predicate. Replacing the function afterwards does not
-- touch it, and REINDEX does not help: REINDEX rebuilds using the stored predicate, so it
-- changes nothing. That was verified on 2026-07-29 by the work in
-- 0065_widen_route_name_placeholder.sql -- after a successful REINDEX the duplicate view
-- still returned all four rows, under every plan, because a partial index's predicate is
-- assumed true for its entries and the planner never re-calls the function.
--
-- Only DROP + CREATE re-parses the predicate against the current definition.
--
-- Why this is not already fixed: 0065_widen did do the rebuild, correctly, for the function
-- as IT defined it. Then 0066 replaced the function again -- adding the "(var)" rule -- and
-- re-froze the mismatch. This is the rebuild for that second change.
--
-- Symptom if skipped: route_duplicate_names currently reports zero rows, which is the right
-- answer, but any query the planner satisfies from this index is reading a predicate that
-- encodes an older placeholder definition. It is right by luck, not by construction.
--
-- Guarded because 0063 may not be applied in every environment. CREATE INDEX takes a brief
-- SHARE lock on routes; to avoid it, run the CREATE separately as CREATE INDEX CONCURRENTLY
-- (which cannot run inside a transaction block, so it cannot live in this DO).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'routes_area_name_dedup_idx' AND relkind = 'i') THEN
    DROP INDEX routes_area_name_dedup_idx;
    CREATE INDEX routes_area_name_dedup_idx
      ON routes (area_id, lower(btrim(name)))
      WHERE area_id IS NOT NULL AND NOT route_name_is_placeholder(name);
    RAISE NOTICE 'Recreated routes_area_name_dedup_idx; its predicate now re-parses against the 0066 function.';
  ELSE
    RAISE NOTICE 'routes_area_name_dedup_idx absent (0063 not applied) -- nothing to rebuild.';
  END IF;
END $$;

-- The matview is built from routes, not from the index, so its contents do not change here.
-- Refreshing anyway proves the rebuilt index and the current function agree.
REFRESH MATERIALIZED VIEW route_duplicate_names;

-- VERIFY: expect the index to exist with the CURRENT predicate, then ZERO rows.
-- The indexdef text is the check that matters -- it should mention route_name_is_placeholder,
-- and the function it resolves to is now the 0066 one.
select indexname, indexdef from pg_indexes where indexname = 'routes_area_name_dedup_idx';

select count(*) as duplicate_families from route_duplicate_names;
