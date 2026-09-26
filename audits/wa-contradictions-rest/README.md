# Route-page contradiction audit — Washington, second half (2026-09-25/26)

## Result
All **505** enriched WA routes this half owns were read field by field. Readers found **2,826**
contradictions; **2,531** went to web research (the rest the reader judged not worth a source).

| Verdict | Count |
|---|---|
| fixed (2+ agreeing outside sources) | 1,314 |
| fixed_internal_plus_one (row's own fields + 1 source) | 257 |
| unresolved — sources disagree or only one exists; **left unchanged on purpose** | 786 |
| not a contradiction | 116 |
| camping list (`bivy`, owned by the camping clean-up) | 58 |

**~3,370 patches live on 419 routes**, every one compare-and-set against the live row, re-read after
writing, previous value kept in `applied-*.json` / `applied/` for rollback. Plus 8 `summitTimeHrs`
nulls (car-to-car total written into the summit leg while an approach/descent leg is also published —
the settled repair).

**Owner decisions and hand-offs are in `handoffs.md`**: routes that mix two climbs, route names that
now disagree with their sourced aspect, wrong `discipline` values (column not writable here), pins to
move, camping-card errors for the camping clean-up, and prose that still names a source.

### Rules added during the run (in the research instructions)
- never set `loss_ft` = `gain_ft` for an out-and-back, and never edit a day's gain/loss to force totals;
- never compute a new `gain_ft` from trailhead/summit arithmetic — only a stated figure;
- never interpolate a waypoint `distMi`; null it if unsourced and out of order;
- a research agent that hits the web usage limit writes nothing (so the item is re-queued, not marked unresolved).
`done.sh` also HOLDS any file changing `gain_ft`/`loss_ft` for a human look before applying; two such
changes were reverted (Rake Traverse, Boulder Glacier) and two were applied after checking the stated figures.


**Ask (user, 2026-09-24/25):** every field on a route's tabs must agree with every other field. Audit all WA
routes; where two fields disagree, settle it with at least two external sources and fix every copy.

**Split with the first session.** The first session (branch `worktree-route-tab-consistency`, PR #1909)
owns the 617 enriched routes in its batches b001-b212. This folder owns the other **505** enriched WA
routes (`theirs-ids.json` is excluded by construction). Neither touches the other's routes.

`superseded/` holds reads and research this session ran on the first session's routes BEFORE the split
was agreed. Most of those patches were rejected by compare-and-set because that session had already fixed
the rows; the 20 that landed are in `applied/` with their previous values for rollback.

## Pipeline (`scripts/oneoff/wa-contradictions-rest/`)
Same as #1909, plus:
- `dossiers.mjs --exclude <ids.json> --start N` — batch only the routes this folder owns.
- `mkresearch.mjs <regex> <start> [--skip ids.json]`.
- `refresh.mjs rNNN` — re-reads the LIVE rows into a research file just before its agent starts. Other
  sessions edit these rows all day; research against a stale row is wasted (every patch gets rejected).
- `apply.mjs` refuses any write to `bivy` — the camping clean-up owns it (show only camps on or near the route).

Reader groups are g001-g036 (4 batches each). Research files for group gNNN are numbered from NNN*20.
