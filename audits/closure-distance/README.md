# Closed-road distance pass (owner note 2026-10-29)

Owner's note, on Three Fingers South Peak via Lookout: "the road was washed out so it adds extra miles, but that isn't reflected in the technical stats distance... Audit this stat for all routes."

- `closure-classified.json` sorts all 415 routes whose text mentions a closure: 136 IN_FORCE, 15 NO_ACCESS, 93 SEASONAL_ONLY, 171 HISTORY_ONLY.
- `closure-by-road.json` groups the 151 IN_FORCE and NO_ACCESS routes by road.
- `BRIEF.md` is the research procedure, one road group per agent run.

## Done (written and re-read)

| Batch | Road | Written | Left unchanged |
|---|---|---|---|
| b01 | FR 41, Three Fingers | 3 (+8 mi each way, +1,400 ft) | none |
| b02 | Chiwawa FR 6200 | 14 | 5 (see verdicts) |
| b03 | Suiattle FR 26 | 7 | 10 (see verdicts) |
| b04 | Squire Creek FS 2040 | 0 | 12, all NO_CHANGE: published walk-in figures conflict, and 11 of the 12 store no distance |

Rollback files: `rollback-b01..b03.json`, plus `scripts/rollback-closure-distance-*.json`.

## Left (resume here)

1. **b05, FR 38 Middle Fork Nooksack.** The plan is researched and reviewed but NOT written: the database returned 504 on the first read.
   - Dry-run it first; a row that already has `road.walkMi` is refused.
   - Then apply: `node scripts/oneoff/apply-closure-distance.mjs audits/closure-distance/b05-fr38-mf-nooksack.json`
2. **b06 Olympic Hot Springs Rd and b07 Dosewallips.** The `*.draft.json` files were written by an agent that was stopped when the database failed. They are unreviewed and may be incomplete. Redo both from `BRIEF.md`.
3. **Still to research.** Take these from `closure-by-road.json`, in this order:
   - Monte Cristo Rd (10)
   - Middle Fork Snoqualmie FR 56 (6)
   - Depot Creek (BC) (6)
   - Glacier Creek FR 39 (5): its route texts disagree about whether it reopened in August 2026
   - Cascade River Rd (4)
   - White Chuck FR 23 (4)
   - Westside Rd (3)
   - Hannegan FR 32 (3)
   - FR 1570 (3)
   - Sibley FR 1540, Index-Galena FR 63, Anderson-Watson FR 1107 (2 each)
   - 11 single-route roads
4. **NO_ACCESS groups** (Silver-Skagit, SR 165 Fairfax Bridge, FR 8301 Holden, Baker Lake Rd, Bacon Creek, Vantage Rd SW). There is no walk to add. Only confirm that the text says there is no access, and record a verdict.

Never write more than a few hundred rows without pacing: `patchRow` paces itself. Stop if a keyed read takes more than about 10 s.

## Road research done without the database (2026-10-29, second pass)

`roads-research-1.json` (8 roads) and `roads-research-2.json` (20 roads) hold, for each road, the current status, the closure point, whether foot and bike traffic are allowed, the extra miles one way to each trailhead (each with its derivation), and the sources. The per-route decision is left to the next session, which needs database reads.

**Useful mileages:**
- Olympic Hot Springs: 6.5 mi to Whiskey Bend, 8 mi to Boulder Creek.
- Dosewallips: 5.5 mi. The NPS also says 6.5 mi; pick the figure that matches each row's own trailhead.
- Monte Cristo: 4 mi and 700 ft to the townsite.
- Cascade River: about 3 mi past the MP 20 gate.
- Westside: 3.8 mi Dry Creek to Round Pass.
- Sibley Creek: about 2 mi.
- Anderson-Watson: 6.2 mi.
- Deadhorse: 9.6 mi from the MP 3.1 washout.
- FR 9737-112: 1.0-1.4 mi.

**REOPENED:** Glacier Creek Road FR 39 reopened on 2026-08-20. Its 5 routes need their stale "closed" road text corrected, with no miles added. Baker Lake Road has probably reopened, but unconfirmed.

**No sourced distance, so record NO_CHANGE:** White Chuck, Depot Creek, Index-Galena, Stehekin, Eagle Creek, Smithbrook, Olney Creek. FR 21 Snowgrass has no closure notice, so re-check its route text.

**Still NO_ACCESS:** Silver-Skagit, SR 165 Fairfax Bridge (and so the Carbon River), Holden, Bacon Creek, Vantage Rd SW.
