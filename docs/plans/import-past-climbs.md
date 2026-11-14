# Importing past climbs and trip reports from other sites — feasibility and plan

Status: **DECLINED by the owner on 2026-10-21 — do not build any of it.** The research below is kept for reference only. Plan written 2026-10-16. The owner asked whether climbers should be able
to upload past trip reports from other websites, so that they land in the app automatically, feed the
app's conditions feedback, and appear on the climber's completed list. This doc answers that, and
lays out the build for the owner to approve. New capability needs the owner's approval before it is
built.

## 1. Answer

**Yes, it is feasible. Build it as a file the climber brings, not a link the app scrapes.** Every
serious competitor does it this way:

| App | What it imports | How |
|---|---|---|
| KAYA | Mountain Project, 8a.nu and Sendage tick CSVs, plus a personal spreadsheet | The climber exports a CSV, pastes it into KAYA's template and uploads it. Routes are matched by **exact area name**, so "LCC" fails to match Little Cottonwood Canyon. |
| theCrag | 8a.nu CSV (a dedicated mapping), or any UTF-8 CSV with crag + route (+ country) columns | Upload, then a **preview showing how tick types were mapped** before anything is saved. theCrag has no mapping for Mountain Project files and tells climbers to ask Mountain Project. |
| Betabook (2026) | Mountain Project ticks from a pasted profile link | A server proxy downloads the climber's public tick export (one response, 1,318 ticks in their test). Names are matched exactly, then by close spelling only when the location agrees, and **every fuzzy match goes to review**. Mountain Project's 4 stars are spread onto 5. |
| OpenBeta | Mountain Project ticks (2022 onward) | Imported by profile. OpenBeta also had its scraped catalog repo taken down by a DMCA notice from onX, Mountain Project's owner, in 2024. |
| Peakbagger | Exports your ascent list to CSV/Excel. No bulk import: one ascent at a time, one GPX track per ascent (3,000 points max). | — |
| Strava | Bulk export of your whole archive (a zip; can take days). Uploads of GPX/FIT files in batches of 25 (15 for free users). Manual activities never count on segment leaderboards. | — |

So the market standard is a CSV ticks import with a review step, plus a GPX track per climb. Nobody
imports *trip-report prose* from forums or trip-report sites. There is no export to import from, and
scraping it is off the table (§4).

## 2. What the climber gets

The climber goes to **Logbook > Completed** and taps **Import past climbs**. A sheet asks for one file:

1. **A ticks file (CSV).** This is the Mountain Project tick export, which is the only one most
   US climbers have (Profile > Ticks > View all > Export CSV). Its header row is fixed:
   `Date, Route, Rating, Notes, URL, Pitches, Location, Avg Stars, Your Stars, Style, Lead Style,
   Route Type, Your Rating, Length, Rating Code`. The importer also takes 8a.nu's logbook CSV and a
   plain template (date, route, area, state, style, stars, notes) for a personal spreadsheet.
2. **Review screen** (theCrag's preview, done better). Every row lands in one of three groups:
   - **Matched**: one of our routes, certain. These are ticked by default.
   - **Check these**: a likely match (name close, area agrees). These are shown with the route's
     area path and are unticked until the climber confirms them.
   - **Not in the catalog**: the climber can search for the route, add it through the existing
     add-a-climb flow, or skip it.

   The screen shows how each style was mapped (e.g. `Lead / Redpoint → Redpoint`, `Solo → Solo`)
   and lets the climber change it, which is what theCrag's mapping summary does. It also says how
   many rows are **already logged** (same route and same date). Those are skipped, so re-importing
   a newer export only adds what is new.
3. **Save** writes one `climb_logs` row per ticked line. Each row carries the date climbed, the tick
   type, stars, the climber's notes and the pitch count. Rows that already exist are skipped.
4. **Undo this import**: one button removes every row the batch created. No competitor we found
   offers this. It makes a bad mapping cheap to recover from.

A GPX track (Strava, Gaia GPS, AllTrails or a watch) attaches to one log through the log form's
existing **Attach GPX**. That control is already built. Phase 2 below adds the bulk version.

## 3. How it feeds the rest of the app

| Surface | Effect of an imported log | Why |
|---|---|---|
| Logbook > Completed (`MyAscents`) | Listed like any log, in date order | That is the request |
| Objectives | Behaves exactly as a hand-logged climb of that route does | Same rule as a hand-logged climb |
| Challenges (`lib/lists.js`, `peakClimbed`) | Counts toward tick-lists | Same rule as a hand-logged climb |
| Planner logged times (`check:logged-times`) | No effect: tick exports carry no times | Nothing to feed |
| Conditions consensus (`buildConsensus`) | Feeds **best months** and the report history. Never "recent": a past climb is older than `RECENT_DAYS` (45). It adds no condition tags or hazards, because no export carries them. | The months climbers actually go are the real feedback an old tick list gives |
| Public trip report | **Private by default.** The notes on Mountain Project may have been private there, so making them public is the climber's choice on the review screen: one switch for the batch, defaulting to their Settings report visibility only if they turn it on. | Publishing someone's old notes without asking would breach their trust |
| Ranks and trust score (`rankable_logs`, 0203) | Count at the lowest, self-reported tier. Same as an unconfirmed hand log; a partner confirming it later lifts it as usual. | Strava keeps manual activities off leaderboards for the same reason: a 1,300-row file must not buy a rank |

**No "imported" label on screen.** The owner's rule is that the app shows no source or provenance
label, even an unnamed one. So the batch id lives in a column that no screen renders. It is used only
for Undo and for the ranks rule.

## 4. What we will not do, and why

- **Scrape trip-report sites, forum posts or Mountain Project pages for the climber.** Mountain
  Project's terms forbid "spiders, crawlers, robots, scrapers, automated tools" (§8(g), as quoted in
  onX's 2024 letter to OpenBeta), and onX has used a DMCA notice before. Other sites' trip reports
  also contain other people's writing and photos.
- **Fetch a Mountain Project profile link on the climber's behalf (Betabook's way).** It would need a
  server proxy, because the export sends no CORS headers. It would also be exactly the automated
  access those terms forbid. A three-tap export plus an upload gets the same file with none of that risk.
  Revisit only if Mountain Project publishes an API.
- **Paste-a-URL for one trip report.** The climber can paste their **own** write-up text into the
  log form's report box today. Their words are theirs to bring.

## 5. Feasibility: what exists, what is missing

**Exists already:**
- `climb_logs` holds every field a tick carries (`date_climbed`, `tick_type` (00730), `stars`,
  `notes`, pitches, `gpx_track`, `trip_report_visibility`).
- `createClimbLog` is in `lib/db.js`, and the log form already attaches a GPX file.
- `catalog_find_route(name, area_id)` (0214) does fuzzy name matching.
- `rankable_logs` (0203) decides how much each log counts.

**Missing, and this is the hard part: matching.** Most of our rock, boulder, ice, mixed and aid routes outside WA alpine came from Mountain
Project's own route-finder export (#1882, #1956, #1983). `scripts/pipeline/import-route-grades.mjs
--map` can write `{their route id: our route id}` for every one of them, but that map has only ever
been a local file, and none is on disk now. A tick's `URL` column carries the same route id. So:

1. **A `route_aliases` table** `(ext_route_id text primary key, route_id text)`, filled by
   re-running the importer with `--map` per state and loading the maps. Then a Mountain Project
   tick matches **exactly, by id**, for every route we imported from there, whatever its name.
   KAYA cannot do this: it matches by area name.
2. For everything else (WA alpine, which predates that import, and 8a.nu or spreadsheet rows), match by
   name within the Location path's state and area through `catalog_find_route`. These always go to
   "Check these", never straight in (Betabook's rule).

Other gaps:
- **Grades:** an imported log stores the climber's tick, not a grade. The route's grade stays the
  route's. The climber's `Your Rating` can go on the review screen as their grade opinion only if
  the owner wants one. Default: drop it.
- **Stars:** Mountain Project uses 0–4 stars (−1 when unrated). Map 4→5, 3→4, 2→3, 1→2, 0→1 and
  unrated→none, which is Betabook's mapping, and leave it editable on the review screen.
- **Style mapping:** MP `Style` = Lead/Follow/TR/Solo/Send/Attempt/Flash; `Lead Style` =
  Onsight/Flash/Redpoint/Pinkpoint/Fell/Hung. These map onto `tickTypesFor()`'s vocabulary.
  Anything unmapped shows as "Logged", and the climber can change it.
- **Excel damage:** a file re-saved in Excel turns `5.10` into `5.1`. The importer reads the
  grade from our route, never from the file, so this cannot corrupt anything.
- **Parsing:** notes span lines inside quotes, so a real CSV parser is needed, not `split(",")`.

## 6. Build plan (for approval)

| Phase | What | Size |
|---|---|---|
| 1 | Migration: `route_aliases`, plus `climb_logs.import_batch uuid` (not rendered). Load the alias maps (the `--map` re-run, per state, service key). | 1 PR, mostly the data run |
| 2 | `lib/importTicks.js`: parse the CSV, detect the format from its header, map styles and stars, match each row (alias, then `catalog_find_route`), dedupe against the climber's logs. Pure, with a `--selftest` on a sample export. | 1 PR |
| 3 | `ImportClimbs` sheet in Logbook > Completed: upload → review (Matched / Check these / Not in the catalog) → save in batches → toast with the count actually written, re-read after the write → Undo. Feature doc `docs/features/logbook-crews-home.md` updated. | 1 PR |
| 4 | Ranks: `rankable_logs` treats an `import_batch` row as self-reported until a partner confirms it. | 1 small migration |
| 5 (later) | Bulk GPX: drop several tracks, each matched to a logged climb by date and by start point near the route's trailhead. Peakbagger ascent CSV for peaks (a peak-level ascent asks which route). | Later |

Guards: `check:writes` and `check:claims` already cover a success toast in front of a write. The
importer's toast must state the re-read count, not the number of rows it tried to write.
`check:schema` covers the new columns.

## 7. Decisions taken on the owner's behalf (owner's standing instruction for this item)

1. **Feasible: yes. Recommended: yes, as an upload of the climber's own file** (KAYA, theCrag),
   **not a fetched link** (Betabook) and never scraped pages. Reason: Mountain Project's terms and
   onX's DMCA against OpenBeta.
2. **Mountain Project ticks first.** They are the file almost every US climber already has.
   8a.nu and a plain template come in the same PR, because they cost a column map each.
3. **Review before save, with fuzzy matches unticked** (theCrag's preview, Betabook's review rule).
4. **Match by the route id in the tick's URL**, through a stored alias table. This is better than
   KAYA's name matching.
5. **Imported notes are private until the climber publishes them.**
6. **Imported logs count for Completed, objectives, challenges and best months. They count at the
   self-reported tier for ranks and trust.** Strava keeps manual entries off leaderboards for the
   same reason.
7. **Undo a whole import**, which no competitor offers.
8. **No "imported" label anywhere on screen**, under the no-sources rule.
