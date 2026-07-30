-- Close three gaps in route_name_is_placeholder().
--
-- Now that route_duplicate_names is readable (0065), it reports 4 families. Three are
-- placeholder names that legitimately repeat within a crag and should never have been
-- flagged — the filter just missed them by a character:
--
--   "un-named"        ny_moss_island x2
--        The exact-match list has `unnamed` but not the hyphenated `un-named`, and the
--        prefix rule `^(un-?named|...)\s` requires a TRAILING SPACE, so the bare
--        hyphenated form matches neither.
--   "closed project"  va_tunnel_turret_wall x3
--        Same shape: the exact list covers `open project` but not `closed project`, and
--        the prefix rule needs a space after it.
--   "_delete"         al_fort_rucker_climbing_wall x2
--        Not a climbing placeholder at all — a source-data junk marker.
--
-- The fourth, resolved by reading the rows rather than guessing:
--   "lost in space (var)"  az_split_rock_area x3
--        All three are bouldering, and they differ ONLY by grade -- V3-4, V2, V3 -- with
--        every other field empty. A duplicated row would carry the same grade; three
--        different grades means three distinct variations of one problem that the import
--        collapsed onto a single label. So these are real climbs and must NOT be deleted.
--        A bare "(var)" suffix is precisely a name that "repeats within one crag by
--        design", which is what this function exists to exclude, so it gets a rule below.
--        Cost of that rule: duplicate detection no longer covers names ending in "(var)".
--        That is the right trade -- the alternative flags three real problems forever, and
--        the unique index sketched in 0062 would reject them outright.

CREATE OR REPLACE FUNCTION route_name_is_placeholder(n text)
RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT n IS NULL
      OR btrim(n) = ''
      OR lower(btrim(n)) ~ '^(unknown|un-?named|project|route|no name|nameless|tbd|n/?a|\?+|(open|closed) project)$'
      -- "unnamed v0", "unnamed 5.10", "unnamed prow", "closed project 2", "5.12 face", "v2"
      OR lower(btrim(n)) ~ '^(un-?named|unknown|(open|closed) project)\s'
      OR lower(btrim(n)) ~ '^(v[0-9]+|5\.[0-9]+[a-d]?( face| slab| crack)?)$'
      -- import junk markers, not names anyone climbed
      OR lower(btrim(n)) ~ '^_?(delete|deleted|test|dummy|placeholder)$'
      -- "Lost In Space (var)" x3, distinguished only by grade: an unlabelled variation
      -- marker, so several real problems share one name by design
      OR lower(btrim(n)) ~ '\((var|var\.|variation)\)$'
$$;

COMMENT ON FUNCTION route_name_is_placeholder(text) IS
  'True for import-artifact route names ("unknown", "un-named", "closed project", "_delete") that legitimately repeat within one area. Used to exclude them from duplicate detection.';

-- The matview stores results, so the filter change has no effect until it is rebuilt.
-- Plain REFRESH (not CONCURRENTLY) so this does not depend on the unique index existing;
-- it briefly locks readers for the ~6s rebuild, which is fine for a one-off.
REFRESH MATERIALIZED VIEW route_duplicate_names;

-- VERIFY: expect ZERO rows — all four families are placeholder-shaped names.
-- If this returns 4, the refresh did not run. If it returns rows you believe are REAL
-- duplicates, send them — do not delete on the strength of this list alone.
select area_id, route_name, copies from route_duplicate_names order by copies desc;
