# Route-page contradiction audit — Washington (started 2026-09-24)

**Ask:** every field on a route's tabs (Overview · Plan · Reports · Safety · Partners) must agree with
every other field. Audit all WA routes; where two fields disagree, settle it with at least two external
sources and fix every copy of the wrong value.

## Status — PAUSED at the account's weekly usage limit (resets 2026-09-30)

| Stage | Done | Total |
|---|---|---|
| Enriched WA routes read in full (reader groups) | 373 routes (29 groups) | 1,122 routes (95 groups) |
| Contradictions found by the readers | 648 | — |
| Contradictions researched (incl. 46 found during research) | 166 | — |
| Patches applied to the live DB, each re-read and verified | **306 on 42 routes** | — |

Research verdicts so far: 96 fixed (2+ sources), 12 fixed from the row plus one source, 21 not a
contradiction, 31 unresolved (sources disagree — deliberately left unchanged, listed in
`unresolved.txt`), 6 regional camp lists (see below).

Scope is the WA area SUBTREE (`areas.path` under `usa.washington`): 8,447 routes, of which 1,122 carry
the enrichment that can contradict itself. The other ~7,300 are crag stubs (grade / pitches / FA only).

## What kept turning up
- A block copied from a SIBLING route: an itinerary, timing breakdown, road or access block naming
  another trailhead, pass or road (Mount Stuart West Ridge's itinerary started at Stuart Lake TH; True
  Grit, a Vantage sport route, carried a Mountain Loop alpine road block).
- `gain_ft` / `loss_ft` / `dist_km` disagreeing with the row's own itinerary day totals.
- `permit` vs `access.permit` (lottery required vs not).
- The commitment numeral in `grade` vs `commitment` / `alpine_grade`.
- A route grade that disagrees with its own crux pitch.

## Decided, not swept
- **CAMPING & BIVY is a regional zone list** on 610 of the 799 WA routes that have one; each entry says
  which peaks it serves, and only 4 of 4,958 entries have coordinates. It is not a per-route
  contradiction and is not edited here. Showing a route's own camps first is a UI decision.
- `high_point_ft` on crag routes tracks the base of the climb (settled convention).

## How it works (`scripts/oneoff/route-tab-contradictions/`)
`snapshot.mjs` (live rows) → `detect.mjs` (mechanical hints) → `dossiers.mjs` (batches + `groups.txt`)
→ READER agents (`reader-instructions.md`, read-only) write `read/gNNN.json` → `mkresearch.mjs` →
RESEARCH agents (`research-instructions.md`, web) write `research/out/rNNN.json` → `go.sh rNNN`
(`extract.mjs` keeps only sourced fixes; `apply.mjs` compare-and-sets against the LIVE row, rejects
any new text that cites a source, PATCHes one row at a time and re-reads it). Every applied change's
previous value is in `applied/` for rollback. `status.mjs` shows progress; `tally.mjs` the totals.

## Resuming
1. Symlink `.env`, `.env.local` from the main checkout (a worktree has no credentials).
2. `node scripts/oneoff/route-tab-contradictions/snapshot.mjs && node .../detect.mjs && node .../dossiers.mjs`
   — re-snapshot, because 306 fixes changed the rows. `dossiers.mjs` rewrites `groups.txt` the same way
   only if the enriched set is unchanged; compare before trusting old group numbers.
3. Readers still to run: groups **29-31 and 33-95** (29-31 were cut off by the limit and discarded).
4. Research: rebuild inputs with `node .../mkresearch.mjs "g0(0[3-9]|1[0-9]|2[0-8]|32)"` for the read-but-
   unresearched contradictions (r009, r012, r013, r017-r021 and r023-r049 never completed), then for each
   new reader group. Replace `<AUDIT_DIR>` in the two instruction files with this folder's absolute path.
5. Apply each finished research file with `bash .../go.sh rNNN`.
