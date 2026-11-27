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
- Research: COMPLETE 2026-11-26 16:45 — all 249 batches reviewed: 1,392 written, 102 skipped (= all 1,494 regions; full lint clean except the known false positive "Raptor Ridge" in r205). Skips are: no page of the region's own, only the parent's page, closed to climbing (access), wrapper holding one other input region, buildering. The 17 fetch-outage skips were redone (redo/) and merged back. Review rules that grew in waves r129+ are in the agent prompts: scope parent/sub-area/article facts to their place; drop a claim when a page and our stats disagree (style mix, grade concentration, boulder vs crag); no land status ("on national parkland"); no "biggest/busiest/major/quiet" from our counts; sub-area names in natural order ("The Wash", never "Wash, The"); no agent framing or advice. r001–r006 applied 2026-11-26 13:19 (36/36 written, 0 refused) and verified live (`tools/verify-regions.mjs 1 6`).
- REDO DONE: the 17 r123–r126 skips caused by a WebFetch outage (~13:40 2026-11-26) were redone and merged. Old note: every `_skipped`
  entry in r123–r126 whose reason says "fetch tool refused", "only search snippets" or "only one page could be
  fetched" is a tool failure, not a judgement — re-research those once fetching works (list them with
  `grep -h -A20 _skipped batch-r12[3-6].json`).
- Skip rule settled: a region whose only pages are about ONE minority sub-area is skipped (Southern WV); one whose
  pages cover several sub-areas, or a sub-area holding most of its climbs, is kept (Highway 38, SD Desert/Culp).
- Review step per batch: `node tools/lint-batches.cjs batch-rNNN.json`, then read every sentence the agent says
  it is unsure of and cut it (fix scripts `tools/fix-wave1.cjs`, `tools/fix-wave2.cjs` record each cut).
- DB writes NEXT: r129–r249 have NO write run yet. When the r008–r128 run exits ("ALL DONE" in its log), from the worktree root: `DONE=$CLAUDE_JOB_DIR/tmp/regions.done LOG=<log> bash audits/area-pages/regions/tools/apply-regions.sh $(seq -f "%03g" 8 249)` (DONE skips what landed), grep the log for ✗, reword + re-apply refusals, then `node audits/area-pages/regions/tools/verify-regions.mjs 1 249`. Run one apply at a time (shared 2-slot DB throttle).
- REAPPLY LIST (copy-check refusals, reworded in the batch file; re-run apply on these batch numbers at the end — apply writes only empty columns, so the rest show "unchanged"): r010 (ca_western_sierra), r011 (ut_southern_wasatch), r013 (wv_new_river_gorge_proper), r014 (ma_cape_ann).
- DB writes: r001–r007 APPLIED + verified live 2026-11-26 16:19 (41/41, 0 refused). r008–r011 applied 18:34 (22 written, 2 refused → REAPPLY LIST). r012–r018 applied 21:17 (40 written, 2 refused → REAPPLY LIST). r019–r128 queued (apply-regions.sh restarted 15:3x, DONE=$CLAUDE_JOB_DIR/tmp/regions.done; it backs off 10 min when the DB is slow). Earlier note: the chained driver was killed by Claude Code for low system memory (2026-11-26 ~14:20) while still queued, before any write. Restart from the worktree root: `DONE=<file listing 001..006> LOG=<log> bash audits/area-pages/regions/tools/apply-regions.sh $(seq -f "%03g" 7 128)`, then grep the log for ✗, reword, re-apply, and `node audits/area-pages/regions/tools/verify-regions.mjs 7 128`. Lint with INR=<input dir> also checks coverage.
