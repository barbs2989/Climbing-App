-- Align route_name_is_placeholder() with the JS definition in
-- scripts/audit-route-identity.mjs, and record why the unique index 0062 left
-- commented out is NOT going to be enabled.
--
-- 0062's function was narrower than the audit script's, so route_duplicate_names
-- reported 4 rows where the script reported 1. Three were import artifacts the SQL
-- side did not recognise: "_delete", "un-named", "closed project".

CREATE OR REPLACE FUNCTION route_name_is_placeholder(n text)
RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT n IS NULL
      OR btrim(n) = ''
      -- stands alone
      OR lower(btrim(n)) ~ '^(project|route|no name|nameless|tbd|n/?a|\?+|open project|closed project)$'
      OR lower(btrim(n)) ~ '^_?delete$'
      -- "unnamed", "un-named", "unnamed route", "unnamed v0", "unnamed 5.10", "unnamed prow", "unnamed lfc",
      -- "unknown", "unknown route" ... but NOT a real name that merely starts with the word,
      -- e.g. "Unknown Soldier" is a real climb and must stay visible to duplicate detection.
      OR lower(btrim(n)) ~ '^un-?named(\s+(route|climb|problem|boulder|line|prow|arete|crack|slab|face|corner|dihedral|lfc|v[0-9]+|5\.[0-9]+[a-d]?|[0-9]+))?$'
      OR lower(btrim(n)) ~ '^unknown(\s+(route|climb|problem|boulder|line|prow|arete|crack|slab|face|corner|dihedral|lfc|v[0-9]+|5\.[0-9]+[a-d]?|[0-9]+))?$'
      -- bare grade as a name: "v2", "5.12 face"
      OR lower(btrim(n)) ~ '^v[0-9]+[+-]?$'
      OR lower(btrim(n)) ~ '^5\.[0-9]+[a-d]?(\s+(face|slab|crack|prow|arete|dihedral|corner))?$'
      -- punctuation / digits only
      OR lower(btrim(n)) ~ '^[0-9[:punct:][:space:]]+$'
$$;

COMMENT ON FUNCTION route_name_is_placeholder(text) IS
  'True for import-artifact route names ("unknown route", "unnamed v0", "closed project", "v2", "_delete") that legitimately repeat within one area. Anchored so a real name merely containing such a word ("Unknown Soldier") is NOT excluded. Keep in sync with PLACEHOLDER in scripts/audit-route-identity.mjs.';

-- After this, route_duplicate_names returns exactly one row:
--
--   Split Rock Area | "lost in space (var)" | 3 copies
--     az_lost_in_space_var, az_lost_in_space_var_2, az_lost_in_space_var_3
--
-- Those are graded V3-4, V2 and V3 — THREE DISTINCT boulder problems that share a
-- name, differing only by grade. They are not duplicates and must not be merged.
--
-- ==> THE UNIQUE INDEX SKETCHED IN 0062 IS ABANDONED, not merely deferred.
-- (area_id, lower(name)) is demonstrably NOT a unique identity in this catalog:
-- bouldering areas carry multiple same-named variations distinguished only by grade.
-- Adding `grade` to the index key would not help either — it would have permitted the
-- Guye Peak and Martin Peak duplicates that actually mattered, since in both of those
-- one copy had a grade and the other did not.
--
-- Duplicate detection therefore stays ADVISORY: this view plus
-- `npm run audit:identity`, run after every enrichment or import batch. The real
-- structural guard is upstream — peak-scoped route ids (etl-state.mjs) and the
-- (area_id, name) preflight in load-state.mjs, which refuses a load that would
-- insert a second copy.
