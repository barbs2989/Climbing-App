# Route-page contradiction audit — Washington (2026-09-24 → 2026-09-25)

**Ask:** every field on a route's tabs (Overview · Plan · Reports · Safety · Partners) must agree with
every other field. Audit all WA routes; where two fields disagree, settle it with at least two external
sources and fix every copy of the wrong value.

## Status — COMPLETE for this session's half of the catalog

The work was split by route id with a second session ("wa routes data validation", branch
`wa-contradictions-rest`). **This record covers reader groups g001–g053 (batches b001–b212): 617 of the
1,122 enriched WA routes.** The other 505 are that session's.

| | |
|---|---|
| Routes read in full | **617** (every one accounted for) |
| Contradictions found by the readers | 1,198 |
| Research results (incl. 303 found during research) | 1,297 |
| Fixed, 2+ agreeing external sources | 648 |
| Fixed, row's own fields + 1 external source | 121 |
| Not actually a contradiction | 154 |
| **Unresolved — sources disagree or too few** (left unchanged by design, see `unresolved.txt`) | 327 |
| Regional camp-list entries (handled by the camp session) | 47 |
| **Patches applied live** | **1,913 on 346 routes** |
| Re-verified against the live DB at the end | 1,845 of 1,868 patched values hold; 23 since changed by other sessions |

Every write was compare-and-set against the live row, re-read after writing, and its previous value is in
`applied/` for rollback. New text never names a source (the app shows none).

## What kept turning up
- **A block copied from a sibling route** — the single biggest class: an itinerary, timing breakdown,
  road, access or permit block naming another route's trailhead, pass, road, wilderness or ranger
  district (e.g. True Grit, a Vantage sport route, carried a Mountain Loop alpine road block; North Star
  Mountain's summit day described a Colorado peak of the same name; Vesper Peak called itself Glacier
  Peak Wilderness).
- `gain_ft` / `loss_ft` / `dist_km` disagreeing with the row's own itinerary — often a stored gain below
  the trailhead-to-summit rise, which is impossible.
- `permit` vs `access.permit`; `access.fees` "None" beside a charged pass.
- Grades: the commitment numeral in `grade` vs `commitment`, and route grade vs its own crux pitch.
- `summitTimeHrs` holding the car-to-car total (repaired by nulling, per the settled convention).

## Needs an owner decision (research can't settle these; no patch written)
These rows describe **two different routes or approaches at once**, so there is no single fact to fix:
- `wa_chimney_rock_west_face` — pitch/rappel text describes a Chimney Rock in **Idaho**; should the row exist?
- Mount Index North Norwegian Buttress — top stats are Jötnar, the pitch table is Bluebell.
- `wa_east_ridge_7` — is Lundin Peak's East Ridge, filed under Red Mountain (re-file).
- Tepeh Towers — header shows Eldorado's elevation because the row is filed under Eldorado (re-file).
- Duplicate or merged lines: Agnes West Route (≈ South Ridge body), Needle Peak "South Route" (= North
  Ridge), Gunn Peak Lewis Creek (≈ Southeast Route), Guye West Face (ramp route + Improbable Traverse),
  Davis Peak North Face (Burdo/Cairns + Kloke-Simon), Little Big Chief West Route.
- Two genuine approaches blended: Buck Mountain, Esmeralda Peaks, Bryant Peak, Iron Cap, Lizard Mountain,
  Bear Mountain (both routes), Hard Mox, CJ Couloir, Sitkum Spire (White Chuck trail is gone).
- Naming vs content: Mount Saul "Southeast Slopes" (every account climbs the east side), Old Guard Peak
  "Southwest Route" (couloir is on the northwest side), Deep Blue filed `trad` (reported bolted).

## Out of this pass's scope (flagged in the research outputs)
- **Map pins** — several trailhead/camp pins sit at the wrong place (Poltergeist Pinnacle at Ross Dam,
  Primus South Ridge, Buckner North Face, Grotto Mountain, Trapper Mountain, Hibox "Rampart Lakes").
  Coordinates were never edited here.
- **CAMPING & BIVY lists** — owned by the camp session (user decision: show only camps on/near the route).

## How it works (`scripts/oneoff/route-tab-contradictions/`)
`snapshot.mjs` (live rows) → `detect.mjs` (mechanical hints) → `dossiers.mjs` (batches + `groups.txt`)
→ READER agents (`reader-instructions.md`, read-only) write `read/gNNN.json` → `mkresearch.mjs` →
RESEARCH agents (`research-instructions.md`, web, 2-source rule, settled conventions listed) write
`research/out/rNNN.json` → `go.sh rNNN` (`extract.mjs` keeps only sourced fixes; `apply.mjs`
compare-and-sets against the LIVE row with a key-order-insensitive check, rejects any new text that cites
a source, PATCHes one row at a time and re-reads it). `verify-live.mjs` re-reads every patched path;
`status.mjs` / `tally.mjs` report progress.
