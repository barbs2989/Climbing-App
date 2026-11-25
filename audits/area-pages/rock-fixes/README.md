# Stored-rock fixes (areas.rock) — 2026-11-25

## Why
`areas.rock` came from research (`rock_basis='researched'`) or from a geologic map read at the area's coordinate
(`rock_basis='mapped'`). A map point often lands on the unit under or beside the cliff. The Gunks cliffs are
Shawangunk conglomerate sitting on Martinsburg shale, so the map said "shale". Tier-10 research kept hitting these.

## Done
- `batch-gunks.json`: APPLIED 2026-11-25. 35 Gunks rows went from mapped shale/sandstone to conglomerate, and the
  Workout Wall blurb's "sandstone" became "quartz conglomerate". Rollback: `scripts/rollback-area-page-1795634674446.json`.

## Applied 2026-11-25 (owner approved), verified 147/147 live — rollback scripts/rollback-area-page-1795637539532.json
- `batch-siblings.json`: 147 rows. The candidates were mapped rock that contradicts 3 or more researched siblings under
  the same parent, all agreeing. That gave 656 rows; dropping near-synonyms left 470 rows in 122 parents. Agents
  checked each parent against two fetched pages: 166 fix, 3 keep, 298 unsure.
- Dropped by hand from the fixes:
  - state-level parents
  - Old Rag Berry Hollow
  - Hall Creek Rock
  - Zoo Station
  - Clifford Park and 3 Great Falls MD rows (one page plus snippets)
  - 15 Lynn Woods boulders mapped rhyolite/argillite (the Lynn Volcanic Complex is real)
- No live blurb names the old rock.

## Not done
- 298 "unsure" rows: mixed-rock canyons, pages that contradict the siblings, or only one page.
- NJ syenite rows: the siblings check did not reach them.
- Area names that carry an access status: "Lonestar (closed)", "Cap des Pères (closed)", "Private Property - do not use".
