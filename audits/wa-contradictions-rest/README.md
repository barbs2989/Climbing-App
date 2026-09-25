# Route-page contradiction audit — Washington, second half (2026-09-25)

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
