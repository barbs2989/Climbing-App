# Tier 10 (crags with 10–19 climbs) — where it stopped (2026-11-05, ~4:15 pm MST)

## Done
- Applied + verified + merged: v001–v498 and redo v901–v909 (PRs #3146 #3149 #3178 #3179 #3180 #3181 #3189).
- Applied, NOT yet verified/PR'd: California v499–v563 (except refused entries listed below).
- Researched, NOT applied: v564–v605 (California), v606–v687 (ME, NV, NJ, NY, ND, NWT, PA, QC), redo v910–v912.
  All passed scan_access / rock_clash / fix_catalog. ~451 entries + 198 skips in v606–v912.
- Research is COMPLETE. No more agents needed.

## Still to do (in order)
1. Apply what's left. Tools are copied into `tools/` (originals were in the job tmp dir, which may be gone).
   Edit the `T=` path at the top of `tools/resume_list10.sh` to a dir that exists, then from the worktree root:
   ```
   bash audits/area-pages/tier10/tools/resume_list10.sh 545 546 547 549 560 563 $(seq 564 687) 910 911 912
   ```
   - It acquires a dbslot, applies batch by batch, records finished batches in its DONE file, backs off 10 min
     when `dbslot check` fails, and resumes. The apply only fills EMPTY columns, so re-running finished batches is harmless.
   - 545 546 547 549 560 563 are RE-APPLIES: entries there were refused for copied text and have since been reworded.
   - If the background runs from this session are still alive (`pgrep -fl resume_list10`), let them finish instead:
     `resume10.done` / `resume10b.done` in the job tmp dir list finished batches.
2. Grep the apply log for `✗` (refused). Reword the sentence by hand (copy refusals = 8-word run shared with a source)
   or drop the column (`tools/drop_col.py file id col`), then re-apply that batch.
3. Verify live rows: `node audits/area-pages/tier10/tools/verify10.mjs <worktree> 499 912`.
4. Stage + PR: `bash audits/area-pages/tier10/tools/stage10c.sh area-pages-tier10-8 499 912`, commit, push,
   `gh pr create`, `gh pr merge --squash --auto` (owner: merge own PRs without asking).
5. Update memory `area-pages-sections-and-edits.md` TIER 10 line: tier 10 DONE.

## Follow-ups (not blocking) — see ROCK-QUESTIONS.txt
- Stored rock wrong as a CLASS: Gunks/Catskills rows stored shale/sandstone (pages: quartz conglomerate);
  NJ Highlands rows stored syenite (pages: granite/gneiss). Sugarloaf NY: two pages say granite.
- Area names that carry access status ("Lonestar (closed)", "Cap des Pères (closed)") or are junk
  ("Private Property - do not use") — owner rule: no area-level access text.
- 18 regions timed out building inputs even with --split earlier (see memory) — only matters if a tier-10 sweep
  of those regions is wanted beyond what's here.

## Rules (owner)
All prod DB work through `~/dev/db-throttle/dbslot.mjs`; throttle bulk writes; NO area-level access/closure/fee/permit
text; never name a source; skip crags that are closed; two fetched pages (one about the crag itself).
