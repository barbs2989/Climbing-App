# Route-row repairs, 2026-10-01 → 10-04

The waypoint-directions fill (#2145) produced a defect list (`../waypoint-directions-research-2026-10-01/defects.json`,
#2146): 1,481 defects on 690 routes that blocked a "Getting here" leg or would mislead a climber on screen —
pins on the wrong feature, waypoint lists out of travel order, prose that contradicts the pins, wrong numbers,
stale closures, text that names a source or talks about our data. This pass verified and repaired them.

## What was done

| pass | scope | result |
|---|---|---|
| A | 96 severity-1 on-screen misdirections, 15 batches | all verified; fixed or neutralised |
| B | the remaining ~1,385 defects, 118 batches (`b001`–`b118`) | each researched by an agent (land-manager pages, WTA, trip reports, OSM, USGS EPQS), fixed / neutralised / refused as not real |
| follow-ups | 59 out-of-list findings the B agents reported (`f0`–`f7`), plus distance fixes | applied |
| directions fill 2 | routes whose rows the repairs made writable | **260 strings on 114 routes** (`directions-fill-2.json`, agent reports in `directions-fill-2-reports/`) |

Measured against the DB (census of routes whose page RENDERS waypoints): routes with an empty "Getting here"
leg went **833 → 342** (#2145) **→ 145**, empty legs **2,577 → 935 → 355**. What is left is 54 single-pin routes
(nothing to write between pins), ~50 routes whose geometry still fails an ordering gate, and legs agents left
blank because the row contradicts itself — those are listed in the agent reports.

`backups/<id>.json` holds every touched column as it was before this pass's FIRST write to that route (never
overwritten); 633 routes. `applied.jsonl` is the write ledger.

## The writer: `scripts/oneoff/apply-route-row-repairs.mjs`

Ops are `{path, find, replace}` (find must occur exactly once), `{path, set}` (a shape guard refuses a type
change), and `{op: "reorderWaypoints", order: [...]}` (original indices or new waypoint objects; omitted =
deleted; stale `directions` cleared where a card's predecessor changed). New text is linted with the citation
needles of `audit-prose-citations` and the voice cues of `audit-waypoint-note-voice`. Every write is re-read and
compared canonically.

**An entry applies at most once.** A reorder that inserts or deletes is not idempotent: a batch that crashed
half-way on a DB timeout and was re-run inserted Painted Traverse's new pins twice and deleted Black Mountain
(restored). The writer records each entry `pending`/`done` around its PATCH and settles a `pending` one against
the live row; `--settle` judges a pre-ledger crash against the backup. Under load the DB times out often
(57014, 503 PGRST002) — never re-run a crashed batch without the ledger.

## Checked after the pass

- double-write audit over all 633 repaired routes: 0 duplicate pins, 0 doubled text, 0 waypoint-count drift;
- `audit:waypoint-distances` (service key, 200-row pages): 0 impossible legs — moving a pin strands its
  `distMi`, and 12 such legs were nulled or corrected (the audit's `#N` is 1-based; match pins by name);
- `fix-stranded-track-vertices.mjs`: 8 sketched lines carried onto their moved pins (one route had lost its
  "not a recorded track" caption); the script gained `--skip=` and a gpx backup per route.

## Owner decisions (not made here)

- Duplicates: `wa_cutthroat_peak_southeast_buttress` / `wa_cutthroat_south_buttress`;
  `wa_cutthroat_cauthorn_wilson` / `wa_cutthroat_peak_cauthorn_wilson_couloir`; `wa_bonanza_peak_north_ridge`
  describes the Mary Green Glacier.
- Duplicate areas: `wa_amphitheater_mountain` / `wa_amphitheatre_mountain` (~150 m apart); the four Wine Spires
  area rows sit within ~100 m of each other and Chablis has no elevation.
- Which approach a row is: Mount Meany (Elwha vs North Fork Quinault), Chikamin SE Slopes (Mineral Creek vs
  PCT), Forbidden NW Face (1959 rock rib vs NW-face ice), Glacier Peak Frostbite Ridge (White Chuck hike-out vs
  Suiattle), Kyes Peak (Columbia Glacier line vs the Blanca Lake warning).
- Rainier Mowich routes: where the start should be while the Fairfax Bridge is closed.
- Mount Lago: the approach picker's legs are not per-variant.
- Names / filing outside the editable columns: Queets "South Slopes" is the North Ridge; Hopper's name names two
  approaches; Skookum's "scramble" id/grade vs a roped 5.4 ridge; Lyall filed under Chiwawa-Entiat but approached
  from Stehekin.

## Still open (found, not yet researched)

Agent work hit the account's weekly limit before these were done:

- Mount Prophet: the 6,600 ft saddle is not on the USGS grid; Point 6071 pin samples 5,591 ft.
- McMillan Spire West: camp and glacier-crossing pin heights wrong; the crossing sits below camp.
- Dated road claims unchecked: Indian Head ("reopened mid-May 2026"), Berge (FR 6200), Waterfall Buttress
  (4WD, "about 7 miles to its end").
- Fisher Chimneys: "White Salmon Glacier Lower Bivouac" pin is south of Lake Ann (5,600 ft ground vs 6,700);
  Hanging Glacier / North Face give Price Lake's direction backwards. Goode High Camp pin 6,600 vs 5,540 ground.
- The Monk rows: "follow the Boundary Trail east … to Upper Cathedral Lake" — check the direction.
- Mount Stuart: Cascadian "False Summit Notch" and North Ridge "Great Gendarme" pins are on the wrong side;
  West Ridge "West Ridge Crest" at 7,200 ft is the ~8,600 ft notch.
- Chimney Peak The Chimney ends at the main summit (the route tops a 100 ft tower); the Enchanted Valley pin is
  past the Pyrites Creek turnoff. Mount Anderson Eel Glacier names Echo Rock on the wrong side.
- Little Tahoma starts at the Fryingpan Creek trailhead that its own variant says is closed until ~2029; Sunset
  Ridge's descent text is cut off mid-sentence; Lane Peak's "~2,000 ft gain" is impossible.
