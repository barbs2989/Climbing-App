# Root-level files archived 2026-10-15

Until this folder existed, the repository root held 194 files that were not app code or
configuration: session reports, research status files, consolidated research JSON and the one-off
Python/JS/shell scripts that produced them, nearly all from July 2026. They were left where the sessions
that wrote them had put them.

**How the set was chosen — a measurement, not a judgement.** Each root file's name was searched across
`scripts/`, `docs/`, `.github/`, `supabase/`, `lib/`, `public/` and the root config files
(`scripts/oneoff/root-census-2026-10-15.cjs` — run it again before archiving anything else). 172 files were named nowhere; one more
(`alpine_trailhead_enrichment.sql`) was named only by our own docs, whose reference now points here.
Those 173 files are in this folder, moved with `git mv` so `git log --follow` still works. Nothing was
edited.

**What the first census missed.** It matched each file's *full name*, so `enrichment-db.js` read as
"named only by two docs" and was archived — but `ClimbMatchCore.jsx` imports it **without the
extension** (`import("./enrichment-db")`, the normal form here), and every guard that bundles core then
failed with `Could not resolve "./enrichment-db"`. It is back at the root, and the census now also
matches a stem in a path-prefixed import position with the file's own extension or none. A name-only
search under-counts references; the build is the check that catches a bundler-resolved import.

**Left at the root on purpose (21) — each is read by a one-off script, named in a migration, or imported
by the app, and moving it would break a re-run, orphan a citation, or break the bundle:**

- `AUDIT_REPORT_NC_HIERARCHY.md` ← supabase/migrations/0028_structured_rack_fields.sql
- `DRAGONTAIL_GEAR.json` ← scripts/oneoff/consolidate_batch4.mjs, supabase/migrations/0047_gear_audit_enchantments.sql
- `TRACK-1-RESULTS.json` ← scripts/oneoff/TRACK-1-ROUTE-INSERTION.mjs, scripts/oneoff/TRACK-3-VERIFICATION.mjs
- `TRACK-2-RESULTS.json` ← scripts/oneoff/TRACK-2-HAZARD-IMPORT.mjs, scripts/oneoff/TRACK-3-VERIFICATION.mjs
- `TRACK-3-RESULTS.json` ← scripts/oneoff/TRACK-3-VERIFICATION.mjs
- `WASHINGTON_CRAGS_COMPREHENSIVE.json` ← scripts/oneoff/consolidate-climbing-phases.mjs, scripts/oneoff/deploy-climbing-research.mjs
- `beginner-alpine-routes.json` ← scripts/oneoff/consolidate-climbing-phases.mjs, scripts/oneoff/deploy-climbing-research.mjs
- `enrichment-db.js` ← ClimbMatchCore.jsx (`import("./enrichment-db")`), docs/BACKEND.md, docs/ENRICHMENT_INTEGRATION_GUIDE.md
- `master-climbing-research-final.json` ← scripts/oneoff/consolidate-climbing-phases.mjs
- `phase3-deployment-execution-report.json` ← scripts/oneoff/deploy-phase3-routes-and-hazards.mjs
- `phase3-deployment-manifest.json` ← scripts/oneoff/execute-phase3-deployment.mjs
- `phase3-master-consolidated.json` ← scripts/oneoff/consolidate-phase3-findings.mjs, scripts/oneoff/execute-phase3-deployment.mjs
- `phase3-master-extracted-data.json` ← scripts/oneoff/TRACK-1-ROUTE-INSERTION.mjs, scripts/oneoff/TRACK-2-HAZARD-IMPORT.mjs, scripts/oneoff/TRACK-3-VERIFICATION.mjs, scripts/oneoff/deploy-phase3-routes-and-hazards.mjs, scripts/oneoff/extract-all-phase3-data.mjs, scripts/oneoff/phase4-consolidate-all-data.mjs
- `phase3-shuksan-3routes.json` ← scripts/oneoff/execute-phase3-deployment.mjs
- `phase4-consolidation-manifest.json` ← scripts/oneoff/phase4-final-consolidate.mjs
- `phase4-master-final.json` ← scripts/oneoff/phase4-consolidate-all-data.mjs
- `rack_features_data.json` ← scripts/oneoff/apply_rack_features.mjs
- `real_remaining_routes.json` ← scripts/oneoff/apply_batches_5_11.mjs, scripts/oneoff/consolidate_batch10_real.mjs, scripts/oneoff/consolidate_batch11_real.mjs, scripts/oneoff/consolidate_batch5_real.mjs, scripts/oneoff/consolidate_batch6_real.mjs, scripts/oneoff/consolidate_batch7_real.mjs, scripts/oneoff/consolidate_batch8_real.mjs, scripts/oneoff/consolidate_batch9_real.mjs
- `supabase-climbing-routes-final.json` ← scripts/oneoff/deploy-climbing-research.mjs, scripts/oneoff/import-climbing-hazards.mjs, scripts/oneoff/import-climbing-research-to-supabase.mjs
- `wa-class2-3-routes.json` ← scripts/oneoff/import-class2-3-routes.mjs, scripts/oneoff/phase4-consolidate-all-data.mjs
- `wa-trad-climbing-research.json` ← scripts/oneoff/consolidate-climbing-phases.mjs, scripts/oneoff/deploy-climbing-research.mjs

**Contents by type:** 112 .md, 20 .json, 17 .txt, 11 .py, 4 .js, 4 .sh, 3 .sql, 1 .csv, 1 .html.

Three of the archived scripts contain absolute paths from the machine they ran on, and three open their
data by relative path — which is why everything is in one folder rather than sorted by kind. None of this
is run by anything; it is history.
