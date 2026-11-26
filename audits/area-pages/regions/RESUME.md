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
- Tier >=100 climbs: 1,494 regions = r001–r249.
