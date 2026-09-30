-- Make route_duplicate_names (0062) usable at full scale.
--
-- The view aggregates all 205k routes with a LEFT JOIN and a function call in
-- the WHERE, against no supporting index. Queried through PostgREST it exceeds
-- the statement timeout — six consecutive unfiltered attempts on 2026-07-29 all
-- returned "57014 canceling statement due to statement timeout". It only
-- succeeds when scoped:
--
--   route_duplicate_names?area_id=like.wa_*   -> 200, 2 rows, 2.8s
--   route_duplicate_names  (unfiltered)       -> 500, timeout
--
-- The SQL editor's longer timeout hides this, so the view looks fine when run by
-- hand and fails as the automated "check after every enrichment batch" it is
-- meant to be.
--
-- This is the unique index 0062 leaves commented out, minus the uniqueness. Same
-- expression and same predicate, so it can be created NOW — while duplicates
-- still exist — and it serves both the view today and the unique index later.

CREATE INDEX IF NOT EXISTS routes_area_name_dedup_idx
  ON routes (area_id, lower(btrim(name)))
  WHERE area_id IS NOT NULL AND NOT route_name_is_placeholder(name);

COMMENT ON INDEX routes_area_name_dedup_idx IS
  'Supports route_duplicate_names (0062) and any (area_id, name) lookup. Non-unique on purpose: real collisions still exist. Superseded by routes_area_name_uniq once they are resolved — drop this one then.';

-- Building this takes a SHARE lock, which blocks writes for the few seconds the
-- build takes on a table this size. To avoid that entirely, run instead — on its
-- own, as CONCURRENTLY cannot run inside a transaction block:
--
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS routes_area_name_dedup_idx
--     ON routes (area_id, lower(btrim(name)))
--     WHERE area_id IS NOT NULL AND NOT route_name_is_placeholder(name);

-- VERIFY: should now return quickly, unfiltered.
--   SELECT * FROM route_duplicate_names ORDER BY copies DESC, area_name;
--
-- 0062's header says to expect 20 rows, 5 in Washington. That was already stale
-- when it merged — the dedup work of 2026-07-29 (#398/#400) resolved most of it.
-- Measured against live data after 0062 was applied: 6 groups total, 2 in WA.
-- Of 0062's five listed WA offenders, three no longer exist:
--   wa_the_tooth_tooth_fairy, stuart_west_ridge, stuart_cascadian_couloir
--
-- The two that remain are NOT simple double-entries — in each pair one row's id
-- contradicts its own name, which is the route-identity bug itself:
--   Martin Peak      "West Ridge"                    {wa_martin_peak_southeast_slopes, wa_martin_peak_west_ridge}
--   Spider Mountain  "southeast gully / east ridge"  {wa_spider_mountain_north_ridge, wa_spider_mountain_southeast_gully}
-- Diff every column before choosing a survivor; deleting by id alone will drop
-- the wrong row.
