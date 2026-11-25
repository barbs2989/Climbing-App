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
