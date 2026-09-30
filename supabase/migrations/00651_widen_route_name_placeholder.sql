-- Bring route_name_is_placeholder in line with the audit script's classifier.
--
-- 0062 kept this as a function so "the view and the eventual index share exactly
-- one definition of placeholder". There are currently TWO definitions and they
-- disagree: PR #415 widened the JS classifier in scripts/audit-route-identity.mjs
-- after a full-catalog run, and this SQL function was left as it was.
--
-- The disagreement is not academic. The script reports 1 real duplicate-name
-- collision catalog-wide; the live view reports 4, because three import artifacts
-- fall through this function:
--
--   _delete           x2   -- matched by nothing here
--   un-named          x2   -- line 26 lists "unnamed", not "un-named"; line 28 needs trailing \s
--   closed project    x3   -- line 26 lists "open project" only; line 28 needs trailing \s
--   lost in space (var) x3 -- genuinely two+ routes sharing a name, in Arizona
--
-- So the unique index 0062/0063 are building toward stays blocked on 4 collisions
-- rather than the 1 the audit reports. This aligns the function; the remaining
-- Arizona pair is a real data question, not a classifier one.
--
-- Mirrors the JS patterns deliberately: each placeholder word must stand alone or
-- be followed only by a generic noun or grade token, so a real route that merely
-- CONTAINS one of these words is untouched. "Unknown Soldier" must stay a real
-- route — the failure mode here is a unique index that silently skips real climbs.

CREATE OR REPLACE FUNCTION route_name_is_placeholder(n text)
RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT n IS NULL
      OR btrim(n) = ''
      -- no letters at all: pure digits/punctuation ("?", "---", "5.10").
      -- [[:alpha:]] rather than [a-z] so an accented or non-Latin route name is not
      -- mistaken for punctuation and quietly excluded from duplicate detection.
      OR btrim(n) !~ '[[:alpha:]]'
      OR lower(btrim(n)) ~ '^_?delete$'
      OR lower(btrim(n)) ~ '^un-?named(\s+(route|climb|problem|boulder|line|prow|arete|crack|slab|face|corner|dihedral|lfc|v\d+|5\.\d+[a-d]?|\d+))?$'
      OR lower(btrim(n)) ~ '^unknown(\s+(route|climb|problem|boulder|line|prow|arete|crack|slab|face|corner|dihedral|lfc|v\d+|5\.\d+[a-d]?|\d+))?$'
      OR lower(btrim(n)) ~ '^(open|closed) project$'
      OR lower(btrim(n)) ~ '^(project|route|no name|nameless|tbd|n/?a)$'
      OR lower(btrim(n)) ~ '^v\d+[+-]?$'
      OR lower(btrim(n)) ~ '^5\.\d+[a-d]?(\s+(face|slab|crack|prow|arete|dihedral|corner))?$'
$$;

COMMENT ON FUNCTION route_name_is_placeholder(text) IS
  'True for import-artifact route names ("unknown", "unnamed v0", "closed project", "_delete") that legitimately repeat within one area. Excluded from duplicate detection. Kept in sync with PLACEHOLDER in scripts/audit-route-identity.mjs -- if you change one, change both.';

-- REBUILD THE PARTIAL INDEX -- and it must be DROP + CREATE, not REINDEX.
-- 0063 created routes_area_name_dedup_idx with
-- "WHERE ... NOT route_name_is_placeholder(name)" in its predicate. Postgres
-- stores an index predicate as a parsed expression tree in pg_index.indpred, and
-- an IMMUTABLE SQL function is INLINED when the index is created -- so the old
-- regex is frozen into the stored predicate. REINDEX rebuilds using that stored
-- predicate and therefore changes nothing: verified on 2026-07-29, the view still
-- returned all four rows after a successful REINDEX, under every query plan,
-- because a partial index's predicate is assumed true for its entries and the
-- planner never re-calls the function.
--
-- Dropping and recreating re-parses the predicate against the function as it now
-- reads. Guarded because 0063 may not be applied here.
--
-- CREATE INDEX takes a brief SHARE lock on routes. To avoid it, run this block's
-- CREATE as "CREATE INDEX CONCURRENTLY ..." on its own -- CONCURRENTLY cannot run
-- inside a transaction block, so it cannot live in this DO.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'routes_area_name_dedup_idx' AND relkind = 'i') THEN
    DROP INDEX routes_area_name_dedup_idx;
    CREATE INDEX routes_area_name_dedup_idx
      ON routes (area_id, lower(btrim(name)))
      WHERE area_id IS NOT NULL AND NOT route_name_is_placeholder(name);
    RAISE NOTICE 'Recreated routes_area_name_dedup_idx so its predicate re-parses against the new function.';
  ELSE
    RAISE NOTICE 'routes_area_name_dedup_idx absent (0063 not applied) -- nothing to rebuild.';
  END IF;
END $$;

-- VERIFY: expect exactly ONE row, "lost in space (var)". If _delete, un-named or
-- closed project still appear, the function did not replace. If no result table
-- appears at all, your paste was truncated.
SELECT route_name, copies, route_ids
FROM route_duplicate_names
ORDER BY copies DESC, route_name;

-- Sanity check the anchoring: every one of these must come back false, i.e. real
-- routes are NOT reclassified as placeholders.
SELECT name, route_name_is_placeholder(name) AS should_all_be_false
FROM (VALUES ('Unknown Soldier'), ('Project Wall'), ('Nameless Tower'),
             ('Route 66'), ('Deleted Scene'), ('Unnamed Aspirations')) AS t(name);
