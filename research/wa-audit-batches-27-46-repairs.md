# WA audit batches 27–46 — the statements that needed repair before they would run

`wa-audit-batches-27-46-repairs.sql` in this directory. **Already applied** — this is a
record, not pending work. Verified against the live DB on 2026-08-06:

| repair | check | result |
|---|---|---|
| 1 — `length_m = 182.9 → 183` | `wa_stanley_burgner.length_m` | `183` ✓ |
| 2 — `LIKE → ILIKE` | `wa_spectre_peak_south_route.data_quality->gaps` | target text gone ✓ |
| batch-34 date fix | `wa_news_nw_corner.hazards` | says "May 10, 2025", not May 11 ✓ |
| batch-35 waypoint fill | `wa_north_gardner_mountain_nw_couloir.waypoints` | contains `48.5792` ✓ |

It was rescued from an untracked file in the `fix-climbs-browser-cluster` worktree, where it
would have been destroyed whenever that worktree was cleaned. The generated batch SQL
alongside it (`PENDING-SQL.sql`, `pending-sql/`) is reproducible from the audit in #468 and was
deliberately **not** copied; this file is not, because it records three defects found by hand
and the reasoning that fixed them.

## Why it is worth keeping

Each of the three is a way SQL can report success and change nothing, or fail outright — the
failure mode `check:sql` and `patchRow` exist to catch:

1. **A float into an integer column.** `length_m = 182.9` raises *invalid input syntax for type
   integer*. 600 ft is 182.88 m, so the value is 183. The statement did not silently no-op — it
   errored — but the whole batch went with it.
2. **`LIKE` is case-sensitive.** The guard tested `'%on-file%'` while the stored text begins
   `On-file`, so it matched **zero rows** and the SQL editor still reported success. This is the
   exact shape described in `SQL "success" is not verification` — the statement parsed, and
   nothing changed.
3. **A column that does not exist.** Two batch-40 statements set `group_limit = 12` as a
   top-level column on `routes`. There is no such column; elsewhere (batches 42/43)
   `group_limit` is a key **inside** the `access` jsonb. The clause was dropped and the rest of
   each statement preserved — so whether that limit should be recorded inside `access` is still
   an open question, not something these statements settled.

## Also recorded here, and still open

Two residual inconsistencies the batch flagged rather than resolved:

- `wa_stanley_burgner` — external sources agree on 600 ft (183 m), but the row's own
  `pitch_detail` lengths sum to 237 m (777 ft). The length was corrected; the discrepancy was
  not reconciled.
- `wa_news_nw_corner` — the accident date was corrected from May 11 to May 10 2025 (the fall
  was Saturday evening; the 911 call was Sunday late morning, which is the likely source of the
  one-day drift on file).
