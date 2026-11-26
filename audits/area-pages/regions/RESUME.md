# Region area pages — About text (started 2026-11-26)

## Why
Census of the nightly static snapshot (`<pages>/states/index.json` + parts; `tools/census.js`), 2026-11-26:
67,528 areas. Every crag/peak tier from 20+ climbs is nearly described (tiers 10/20/30 passes), but **all
11,282 `area_type='region'` rows had no `blurb`** — Joshua Tree, Red River Gorge, Yosemite, Squamish… — because
`area-page-inputs.mjs` / `area-page-next-batch.mjs` read only `area_type in (crag,peak,wall)`.
A region page renders `blurb` (`showAbout`, src/components/AreaPage.tsx); its facts / Getting there / season
strip are formation-only, so a region needs only `blurb`.

## How
- Inputs: `node tools/build-regions.js MIN MAX out.json` over a downloaded snapshot (no DB). Stats are the
  subtree's own climbs by discipline and whole-grade bucket; `biggest_sub_areas` are its children.
- Brief: `tools/region-brief.md`. Batches of 6, busiest first: `batch-rNNN.json` (r001 = the 6 busiest).
- Apply: `scripts/enrich/area-page-apply.mjs --from <batch> --dry`, then for real, inside a dbslot.
- Verify: re-read `blurb` for every written id.

## Status
- Tier >=100 climbs: 1,494 regions = r001–r249 (inputs rebuilt by `tools/build-regions.cjs 100 1000000000`,
  split 6 per batch in route_count order; the job tmp copy is gone with the job).
- Research: r001–r064 done and reviewed (380 written, 4 skipped); r065–r080 in flight (8 agents x 2 batches).
- Skip rule settled: a region whose only pages are about ONE minority sub-area is skipped (Southern WV); one whose
  pages cover several sub-areas, or a sub-area holding most of its climbs, is kept (Highway 38, SD Desert/Culp).
- Review step per batch: `node tools/lint-batches.cjs batch-rNNN.json`, then read every sentence the agent says
  it is unsure of and cut it (fix scripts `tools/fix-wave1.cjs`, `tools/fix-wave2.cjs` record each cut).
- DB writes: r001–r006 queued via `tools/apply-regions.sh` (job tmp regions.done / regions.log); r007+ not yet.
