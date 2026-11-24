# Research-batch tooling (Indian Creek batches IC1–IC4)

These are the briefs and scripts that ran the coverage-driven research batches IC1–IC4 (PRs #3861, #3889,
#3897, #3917), saved here because they lived in a job's temporary folder. They are a working snapshot, not
a polished tool: copy this folder to a scratch `BATCH_DIR` per batch, rename `batch-ic4` to the new batch, and
run from the repo root. Rules and their reasons are in `.claude/skills/route-research/` and
`docs/codebase/research-ledger.md`; the coverage measure is `npm run audit:coverage` (notes in
`docs/guards/route-prose.md`).

## Where it stopped (paused by the owner, 2026-11-24)

- **Applied:** Indian Creek's 480 most-used routes (IC1 30, IC2–IC4 150 each), every batch owner-approved
  before apply. Coverage after IC4 (`audits/coverage/2026-11-24-after-ic4.json`): Indian Creek 57.1% stored,
  14.80% sourced, 7.53% locked; it is still the #1 destination (1,239 routes not yet researched).
- **Owed:** the numeric retro re-check (`mknum.mjs collect` → re-check agents → `retro-eval.mjs`) for **IC1 and
  IC2**. It found 2 wrong published racks in IC3 (fixed in #3917). IC2's verifier parts 1 and 3 kept no
  evidence phrases, so those routes need a fresh page check rather than an evidence re-test.
- **Next batch:** IC5 = Indian Creek's next 150 (`select.sql` skips every route that already has ledger rows),
  or Clear Creek Canyon (#2 on the coverage list), which needs its own official access research first.
- **For the owner:** two "Lift Kit" rows on the 4X4 wall (`ut_lift_kit`, `ut_lift_kit_right_side_of_crag`)
  look like a catalog duplicate; both are held in IC4.

## The pipeline (one batch, ~150 routes)

1. `select.sql` (DB slot: `~/dev/db-throttle/dbslot.mjs acquire <name>`), then `split.mjs` → 8 chunks.
2. 8 researcher agents with `BRIEF.md` — Mountain Project only (theCrag blocks automated reads), pages reached
   by crawling the area → wall → route pages (MP search is unusable and its query strings are filtered).
3. `stage.mjs claims` → 4 verifier agents with `VERIFY.md` (STRICT: every "confirmed" quotes its page phrase);
   `checkv.mjs N` rejects any confirmation without evidence; `numcheck.mjs N` lists numeric claims whose numbers
   are not all quoted; `mknum.mjs collect` → re-check agents → `mknum.mjs merge` (a numeric claim is kept only if
   every number is in the evidence). `demote.mjs` holds soft calls. Holds per batch: `hold.json` (identity),
   `hold-rack.json` (partly read), `hold-length.json` (page contradicts itself).
4. `stage.mjs facts` → 3 writer agents with `WRITE.md` (facts only, never the pages) → `stage.mjs prose` →
   `recheck.mjs` (words, numbers, brands).
5. `build2.mjs <dir>` → guarded SQL (old value in every WHERE), the enrich:apply batch, rollback and held lists.
   `recheck.mjs <dir>` writes a check-only copy for `enrich:apply --dry`, whose copy check also covers the rack
   and access text; `mkrewrite.mjs` collects refusals for a rewriter (never "&" for "and").
6. Row-match: every UPDATE's WHERE as a read-only count, each must be exactly 1. Dry-run the enrich-owned rows.
7. Owner approval. Apply SQL (`supabase db query --linked --yes`), `reread.mjs` (jsonb key order ignored),
   then `enrich:apply`, count the ledger rows, `audit:coverage --compare`, PR with auto-merge.
