# Waypoint "Getting here" directions — web-researched pass, 2026-10-01

`waypoints[i].directions` renders as **"Getting here — …"** in waypoint i's card (Overview and
Planner). It means *how to reach waypoint i from waypoint i-1*; index 0 on a Trailhead is the drive.

## What was done

- **Census before:** 833 routes whose page shows a WAYPOINTS list had at least one empty entry
  (2,577 empty waypoints). 737 were writable (670 pass every ordering gate in
  `write-waypoint-directions.mjs`; 67 more could take only the drive).
- 123 research agents, ~6 routes each, read each row's own prose **and researched online**
  (land-manager pages, trail and climbing sites). Rules they followed are in `BRIEF.md`.
- Every string was linted (citation needles from `audit-prose-citations.mjs`, voice cues from
  `audit-waypoint-note-voice.mjs`, meta-talk, markdown, length, overwrite, drive-only) and then
  written **one route at a time through `scripts/oneoff/write-waypoint-directions.mjs`**, which
  re-applies its ordering gates and reconciles every row after writing.
- **Result, reconciled against the DB:** 1,642 strings on 663 routes (498 drives, 1,144 legs).
  2 refused by the writer's drive-only gate (index 0 not a Trailhead), correctly.
- **Census after:** 342 routes / 935 empty waypoints. What remains is mostly refused on purpose:
  pins on the wrong feature, spliced approaches, arrays out of travel order, rows that disagree
  with themselves, or routes with a single summit waypoint.

## Files

- `written.json` — exactly what landed, `{ route_id: [string|"" per waypoint] }`. To roll back,
  blank those slots (the writer never overwrote existing text, so every non-empty slot here was
  empty before).
- `BRIEF.md` — the rules each agent worked to.
- `defects.json` — the same defects extracted into 1,481 records on 690 routes
  (`{id, route, area, sev 1-3, cat, field, issue, fix, blocks}`), severity 1 = text on screen that
  would send a climber the wrong way. `blocks: true` marks the 271 that left legs unwritten.
- `defects-by-batch.md` — every agent's per-route report: **the defects found in the rows**
  (misplaced pins, wrong turns in on-file prose, stale closures, source names on screen). Not
  fixed in this pass; it is a worklist.
