-- Guard against the duplicate-route bug: the same climb entered twice on one area.
--
-- This is what let Guye Peak carry two "South Gully/South Spur" rows (merged and
-- deduped 2026-07-29), and it is the cheap half of the wider route-identity problem:
-- ~91% of WA route ids are derived from the route NAME plus a counter
-- (wa_north_ridge, wa_north_ridge_2, ...) rather than being peak-scoped, so a
-- second copy of a route does not collide with the first and nothing complains.
--
-- A plain UNIQUE (area_id, name) is WRONG here. The OpenBeta import legitimately
-- carries many genuinely unnamed climbs per crag -- one wall has nine rows named
-- "unknown". Those are distinct real routes, not duplicates. So the guard has to
-- exclude placeholder names.
--
-- 141 duplicate (area_id, name) pairs exist today across 365 rows; 121 of those
-- pairs are placeholder names and fine. That leaves 20 real collisions, which the
-- unique index at the bottom would reject -- so this migration ships the DETECTOR
-- now and leaves the index commented out until those 20 are resolved.

-- Names that repeat within one crag by design. Kept as a function so the view and
-- the eventual index share exactly one definition of "placeholder".
CREATE OR REPLACE FUNCTION route_name_is_placeholder(n text)
RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT n IS NULL
      OR btrim(n) = ''
      OR lower(btrim(n)) ~ '^(unknown|unnamed|project|route|no name|nameless|tbd|n/?a|\?+|open project)$'
      -- "unnamed v0", "unnamed 5.10", "unnamed prow", "closed project", "5.12 face", "v2"
      OR lower(btrim(n)) ~ '^(un-?named|unknown|closed project)\s'
      OR lower(btrim(n)) ~ '^(v[0-9]+|5\.[0-9]+[a-d]?( face| slab| crack)?)$'
$$;

COMMENT ON FUNCTION route_name_is_placeholder(text) IS
  'True for import-artifact route names ("unknown", "unnamed v0", "project") that legitimately repeat within one area. Used to exclude them from duplicate detection.';

-- Real duplicates only: same area, same meaningful name, more than one row.
CREATE OR REPLACE VIEW route_duplicate_names AS
SELECT r.area_id,
       a.name                        AS area_name,
       lower(btrim(r.name))          AS route_name,
       count(*)                      AS copies,
       array_agg(r.id ORDER BY r.id) AS route_ids
FROM routes r
LEFT JOIN areas a ON a.id = r.area_id
WHERE r.area_id IS NOT NULL
  AND NOT route_name_is_placeholder(r.name)
GROUP BY r.area_id, a.name, lower(btrim(r.name))
HAVING count(*) > 1;

COMMENT ON VIEW route_duplicate_names IS
  'Routes sharing one area_id and a non-placeholder name -- i.e. the same climb entered twice. Expected to be EMPTY. Check after every enrichment/import batch; see scripts/audit-route-identity.mjs.';

-- Current offenders (run this after applying):
--   SELECT * FROM route_duplicate_names ORDER BY copies DESC, area_name;
--
-- As of 2026-07-29 this returns 20 rows, 5 of them in Washington:
--   Mount Stuart    | cascadian couloir | {stuart_cascadian_couloir, wa_mount_stuart_cascadian_couloir}
--   Mount Stuart    | west ridge        | {stuart_west_ridge, wa_mount_stuart_west_ridge}
--   Martin Peak     | west ridge        | {wa_martin_peak_southeast_slopes, wa_martin_peak_west_ridge}
--   Spider Mountain | southeast gully…  | {wa_spider_mountain_north_ridge, wa_spider_mountain_southeast_gully}
--   The Tooth       | the tooth fairy   | {wa_the_tooth_fairy, wa_the_tooth_tooth_fairy}
-- The two Mount Stuart pairs are a legacy-id vs wa_-prefixed-id split of one climb.
-- The Martin Peak and Spider Mountain pairs look like one row carrying the WRONG NAME
-- rather than a true duplicate -- confirm which before deleting either.
-- Merge each pair the way the Guye Peak dedup went: diff EVERY column, keep the richer
-- row, copy across whatever only the other one has, then delete. Do not judge by a
-- sampled few columns -- that got the survivor backwards the first time.

-- ONCE route_duplicate_names IS EMPTY, uncomment to make the invariant enforceable
-- rather than merely observable:
--
-- CREATE UNIQUE INDEX CONCURRENTLY routes_area_name_uniq
--   ON routes (area_id, lower(btrim(name)))
--   WHERE area_id IS NOT NULL AND NOT route_name_is_placeholder(name);
--
-- (CONCURRENTLY cannot run inside a transaction block -- execute it on its own.)
