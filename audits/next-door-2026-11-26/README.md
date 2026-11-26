# NEXT DOOR audit — 2026-11-26

Owner note: *"Are routes next door correct? Audit all"*. Tool: `npm run audit:next-door`
(`scripts/audit-next-door.mjs`); notes in `docs/guards/route-page.md`.

| File | What it is |
|---|---|
| `adjudicate-all.json` | the 550 name-alike pairs (a climb MP no longer lists beside one it does), with both rows, MP's current wall list, the MP page and OpenBeta's older entries |
| `verdict-A.json`, `verdict-B.json` | two Sonnet reviewers' SAME / DIFFERENT / UNSURE per pair (`n`) |
| `plan-all.json` | the 195 pairs merged (every reviewer SAME re-read by hand; #9, #60, #498 overridden to kept-apart) |
| `plan-renames.json` | 6 full renames (no shared words) found next to a climb the wall-order run ADDED |
| `merge-log.jsonl` | what `merge-next-door-twins.mjs` did with each pair (201 merged) |
| `walls.json` | 5 walls re-ordered to MP's current page (`reorder-walls.mjs`) |

Rollback rows (the full rows before each write) are in the main checkout's `scripts/rollback-next-door-*.json`
and `scripts/rollback-reorder-walls-*.json`.

Before: 18,807 walls, 153,607 left/right pairs; after: 18,806 walls, 153,418 pairs, 0 ORDER / GAP / TIE.
