# Migration numbers collide — read this before adding one

There is no migration tracking table in this project, numbers are assigned by whoever writes
the file, and several jobs write in parallel. As of 2026-07-29 the folder contains **two
`0063`s and two `0065`s**:

| number | files |
|---|---|
| 0063 | `0063_route_dedup_index.sql`, `0063_widen_route_name_placeholder.sql` |
| 0065 | `0065_route_duplicate_names_materialized.sql`, `0065_widen_route_name_placeholder.sql` |

Nothing breaks mechanically — the files are applied by hand, so the number is a label rather
than an ordering key. But it makes "has 0065 been applied?" an unanswerable question, which
is precisely the confusion that let the same function be rewritten twice in one afternoon:

- `0065_widen_route_name_placeholder.sql` widened `route_name_is_placeholder()` to cover
  `_delete`, `un-named` and `closed project`, **and correctly rebuilt the partial index**.
- `0066_placeholder_names_gaps.sql` then widened the same function again — duplicating most
  of that work, adding only the `(var)` rule, and **not** rebuilding the index, which
  re-froze the predicate mismatch. `0067` is the repair.

## Before adding a migration

1. `ls supabase/migrations/ | tail -20` and take a number nobody has used.
2. Search for the thing you are about to change: `grep -rn "<function or table>" supabase/migrations/`.
   If a recent migration already touches it, read that file first — it may already do what
   you are planning, or explain why it wasn't done.
3. If you replace a function used in an index predicate, the index must be **DROP + CREATE**.
   `REINDEX` is a no-op: the predicate is stored inlined in `pg_index.indpred`, and REINDEX
   rebuilds from that stored copy. See `0067` for the detail and the verified evidence.

## Related habit

`CLAUDE.md` already covers the bigger version of this: a migration file is not applied state,
and "success" in the SQL editor means the statement parsed, not that anything changed. Run
`npm run check:sql -- file.sql` before handing SQL over.
