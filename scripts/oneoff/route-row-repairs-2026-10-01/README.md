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

## Owner decisions — settled from research, 2026-10-04

The owner asked for these to be decided from the research rather than left open. Each one:

| decision | outcome |
|---|---|
| Cutthroat SE Buttress / South Buttress, Bonanza North Ridge / Mary Green | already deleted as duplicates by #2167 |
| `wa_cutthroat_cauthorn_wilson` / `wa_cutthroat_peak_cauthorn_wilson_couloir` | **same route** (same FA, grade, pitches, length); keep the Couloir row, a strict superset. Plan in `audits/route-identity-2026-10-04/merge-plan.json`, dry run clean, nothing references the row — **the delete itself was not run**: the session's permission check stopped it, so it waits on the owner (`node scripts/oneoff/route-identity-merge.mjs --plan=audits/route-identity-2026-10-04/merge-plan.json`) |
| Mount Meany: Elwha or North Fork Quinault | **North Fork Quinault / Low Divide / Seattle Basin** — the usual way in, and what the row's logistics, itinerary, variant and road already said. Pins rebuilt on it (Low Divide = end of the OSM Elwha River Trail, USGS 3,637 ft; NPS 16 mi, 3,602 ft) with a leg on every card |
| Chikamin SE Slopes: Mineral Creek or PCT | **PCT from Snoqualmie Pass** marked primary (the Mountaineers' standard route; the pins, trailhead, itinerary and drive all follow it); Mineral Creek kept as the shorter alternate |
| Forbidden NW Face: rock rib or ice line | **one route** — the Beckey-Cooper rib starts with ~900 ft of snow/ice from the Forbidden Glacier's north arm. Fixed the three cards that contradicted it (moat note, a "North Ridge" knife-edge, a blank leg) |
| Frostbite Ridge hike-out | the White Chuck River Trail was destroyed in 2003 and is listed inaccessible; descent and day-4 hike-out rerouted to the PCT, White Pass and the North Fork Sauk, and the White Chuck variant marked unusable |
| Kyes Peak: glacier or ridge | the **South Ridge** from Virgin Lake is the standard line (and what the row's approach, primary variant and descent describe); pins rebuilt on it, Columbia Glacier kept as the alternate variant |
| Rainier Mowich start | NPS: no public access to Mowich Lake from SR 165, no alternate route; reachable only on foot via the Wonderland Trail (~27 mi from Westside Road). Mowich Lake stays the start pin, and all four Mowich rows now say this on their trailhead card |
| Names | Queets "South Slopes" → **North Ridge**; Hopper → **Standard Scramble** (`rename-routes-2026-10-04.mjs`, old names in `name-backups/`). Skookum's name and grade were already right (only its id says "scramble") |
| Lyall filing | left under Chiwawa-Entiat: every neighbouring peak (Bonanza, Cloudy, Dark, Martin, North Star) is filed there; the Stehekin approach is in the prose |
| Amphitheater/Amphitheatre areas, Wine Spires areas | not changed: merging areas is a delete and needs the owner; the Wine Spires rows are close because the spires are adjacent towers |
| Mount Lago approach picker | not changed: per-variant legs are a product feature |

## Open items — done 2026-10-04

- Little Tahoma: the trailhead card now says the Fryingpan Creek parking is closed for the bridge replacement
  (NPS, into late 2029) and to start from White River Campground.
- Price Lake directions on Shuksan Hanging Glacier and North Face corrected (OSM: the lake is north of the summit,
  the White Salmon valley west of it); Sunset Ridge's descent sentence closed; Lane Peak's impossible gain dropped.
- Pins on the wrong ground cleared: Stuart Cascadian false-summit notch and North Ridge Great Gendarme, Fisher
  Chimneys lower bivouac (5,602 ft ground vs 6,700), Goode High Camp (5,542 vs 6,600), McMillan Terror Glacier
  crossing (below its own camp), Prophet "Point 6071" (5,591 ft ground).
- Road claims checked against the land managers' current alert pages: Indian Head reworded durably (no current
  Mountain Loop closure); Berge's two closures are still posted and were reworded without order numbers or end
  dates; Waterfall Buttress's "7 miles" corrected to the ~2-mile washout parking.
- Chimney Peak "The Chimney" now ends at the tower's top, not the main summit; Mount Anderson's descent no longer
  names Echo Rock on the wrong side.
- Not a defect: the Monk rows' "Boundary Trail east" (Upper Cathedral Lake is east of Spanish Camp); Prophet's
  saddle camp (within ~180 ft of the ground).
- Not fixed: Chimney Peak's Enchanted Valley pin (the row's own approach consistently uses the chalet; no better
  line established); Stuart West Ridge crest height (the pin has no coordinate to check).
