-- Restructure route_duplicate_names so 0063's index can actually be used.
--
-- 0063 added routes (area_id, lower(btrim(name))) expecting it to speed the view
-- up. It did not: EXPLAIN ANALYZE shows the planner ignoring it and picking
-- routes_area_idx instead, because the view's GROUP BY includes a.name — a
-- column from the JOINED table:
--
--   Group Key: r.area_id, a.name, (lower(btrim(r.name)))
--
-- That forces the whole join before any aggregation. The measured plan:
--
--   Merge Left Join  201,341 routes x 47,599 areas  -> 1522 ms
--   Incremental Sort (adds a.name to the sort key)  -> 1795 ms
--   GroupAggregate, Rows Removed by Filter: 201,327 -> 1935 ms
--   Execution Time: 1936 ms
--
-- 201,341 rows are joined and sorted to produce 6. And note where it runs:
-- 1.9 s is fine in the SQL editor (role postgres, no statement_timeout) but
-- exceeds the 3 s statement_timeout Supabase applies to the anon role, which is
-- why the same view returns 57014 through PostgREST while looking healthy by
-- hand.
--
-- The fix is ordering, not indexing: aggregate routes ALONE — which the 0063
-- index does cover, since the group key is then exactly its columns — and join
-- areas afterwards, to the six surviving rows instead of all 201,341.

CREATE OR REPLACE VIEW route_duplicate_names AS
SELECT d.area_id,
       a.name AS area_name,
       d.route_name,
       d.copies,
       d.route_ids
FROM (
  SELECT r.area_id,
         lower(btrim(r.name))          AS route_name,
         count(*)                      AS copies,
         array_agg(r.id ORDER BY r.id) AS route_ids
  FROM routes r
  WHERE r.area_id IS NOT NULL
    AND NOT route_name_is_placeholder(r.name)
  GROUP BY r.area_id, lower(btrim(r.name))
  HAVING count(*) > 1
) d
LEFT JOIN areas a ON a.id = d.area_id;

COMMENT ON VIEW route_duplicate_names IS
  'Routes sharing one area_id and a non-placeholder name -- i.e. the same climb entered twice. Expected to be EMPTY. Aggregates routes before joining areas so routes_area_name_dedup_idx (0063) is usable and the view stays under the anon statement_timeout. Check after every enrichment/import batch; see scripts/audit-route-identity.mjs.';

-- VERIFY: should now return promptly, unfiltered, through the API and not only
-- in the editor.
--   EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM route_duplicate_names ORDER BY copies DESC;
-- Expect the inner aggregate to use routes_area_name_dedup_idx, with the
-- areas join reduced from 47,599 rows to one per surviving group.
