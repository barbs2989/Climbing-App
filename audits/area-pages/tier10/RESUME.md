# Tier 10 (crags with 10–19 climbs) — DONE (2026-11-25)

- v001–v912 researched, applied (paced through dbslot) and verified against production.
- Final PR covers v499–v912: 1,106 written entries all match the live rows (`tools/verify10.mjs <worktree> 499 912`).
- Entries refused by the copy check were reworded by hand and re-applied; entries that kept repeating their
  source were skipped. Skips are recorded per batch under `_skipped`.
- `tools/` holds the helper scripts used (apply/resume/verify/checks) for a future tier.

## Follow-ups (not blocking) — see ROCK-QUESTIONS.txt
- Stored rock wrong as a CLASS: Gunks/Catskills rows stored shale/sandstone (pages: quartz conglomerate);
  NJ Highlands rows stored syenite (pages: granite/gneiss). Sugarloaf NY: two pages say granite.
- Area names that carry access status ("Lonestar (closed)", "Cap des Pères (closed)") or are junk
  ("Private Property - do not use") — owner rule: no area-level access text.
- Redo leftovers that still have no page about the crag: see `_skipped` in batch-v910..v912.

## Round 2 (2026-11-25): remaining regions, v913-v1073
- Inputs: every 10-19-climb crag with no blurb that no earlier batch handled (1,279 crags; UT, WA, VA, WI,
  AR, CT, RI, VT, KS, YT and a few others). Research is COMPLETE: 922 written, 357 skipped, branch
  `area-pages-tier10-b` (pushed).
- Writes: v913-v918 applied; v919-v1073 (+ re-apply of reworded v914) queued through dbslot by
  `tools/resume_list10.sh` (DONE files resume10d.done / resume10e.done in the job tmp dir). If those runs are gone,
  re-run from the worktree root:
  `DONE=/tmp/r10.done ALL=/tmp/r10.log bash audits/area-pages/tier10/tools/resume_list10.sh 914 $(seq 919 1073)`
  (fix the `T=` path at the top first). Then grep the log for refusals, reword, re-apply, then
  `node audits/area-pages/tier10/tools/verify10.mjs <worktree> 913 1073`, then PR from `area-pages-tier10-b` and auto-merge.
- Also done in this round: 25 LIVE blurbs (tiers 10/20/30) that read like the pipeline ("N problems are recorded
  here", "in our catalog") were reworded and overwritten; verified 25/25 live (`tier10/fix-pipeline-words.json`).
- Redo candidates are listed at the end of ROCK-QUESTIONS.txt (seasonal-raptor-banner skips that were too strict,
  two Washington "Routes" rows).
