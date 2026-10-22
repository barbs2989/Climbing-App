# Maps and the Climbs area browser

The `routes` tab before a route is selected (`selRoute` empty), plus the maps the app draws.
On the DB path the browser is `lib/DbAreaBrowser.jsx` (default export `DbAreaBrowser`, lazy-imported in `ClimbMatchCore.jsx`);
the seed path (in-memory `MOUNTAINS`/`ROUTES`) is the fallback and uses `OverviewMap` in `ClimbMatchCore.jsx`.
Shared map plumbing is `lib/mapKit.jsx`. The route page is documented in `docs/features/route-page.md`.

## 1. What it does today
- **Area browser**: world > country > state > range > crag/peak drill-down. `StatePicker` is the entry; `AreaPage` shows one area
  (`SummitBriefing` on peaks, its children or its routes, then — in this order — *Don’t see a climb? Add it*, `DbSuggestedClimbs`
  "More climbs in this area", `NearbyPeaks`, Top contributors; App mounts the area Discussion straight after, so it ends the page).
  `DbAreaTree` / `DbAreaTreeNode` / `DbAreaTreeRoots` give an expandable tree to jump around.
- **Area page sections** (0304, `lib/AreaPageSections.jsx`): on a crag, peak or wall — **ABOUT** (`areas.blurb`, or an invitation to write one),
  **AREA FACTS** (rock, which way it faces, elevation, walk-in minutes, parking name, and a 12-month **Season** strip from `areas.season_months`;
  a fact that is not stored is not printed), **CLIMBS HERE** (`ClimbsChart`: one bar per discipline over the whole subtree via the
  `area_climb_stats` RPC, headline = the sum of its bars; a bar opens the Route finder preset to that discipline) with **GRADE SPREAD**
  (`GradeSpread`: columns over the area's main grading scale, saying how many climbs it left out), **GETTING THERE** (`AreaGettingThere`:
  `parking_note` + the parking pin, `approach` + `approach_min`, Google/Apple Maps links — the page's ONE drive control), **TOP RATED HERE**
  (up to five routes by `stars`), and **Suggest an edit** (`lib/AreaSuggestFix.jsx`: seven fields from `AREA_EDIT_FIELDS` in `lib/areaFields.js`,
  each one a `contributions` row with `area_id`, HELD for the owner like a route edit (0319) and written to the `areas` column by `apply_approved_area_field` on approval;
  the climber's own held edits show as "Awaiting review" (`PendingAreaEdits`); the owner reviews them in `lib/RouteQualityQueues.jsx`). The chart also runs on states, ranges and regions; not on
  world/country (the whole catalog in one call is ~2 s). Access stays on the route page (owner, 2026-10-04 / 2026-10-15).
- **Climb rows** (`RouteRow`, every route list in the browser): name, stars, discipline, then the **pitch count** ("Trad · 5 pitches",
  Mountain Project's order; the stored `routes.pitches`, as the route page's Pitches stat shows it; none on a boulder or with no count stored),
  the crag's left-to-right number, and the grade at the right. `useAreaRoutes`' thin row selects `pitches` for it.
- **Sorting a crag's own climb list** (`AREA_LIST_SORTS` / `sortAreaRoutes`, leaf areas only): chips over the list read **Left → right**
  (default, as Mountain Project and theCrag list a wall), **Right → left**, **A → Z**, **Z → A**. The wall orders read `routes.sort_order` and are
  offered only when at least one climb in the list has one; climbs without a position go last, by name, under a line counting them.
  Neither import kept a position (the OpenBeta ETL dropped `metadata.leftRightIndex`; MP's route-finder CSV has none), so on 2026-10-21
  **1 of 314,360 routes** had one.
- **Where the wall order comes from** (`scripts/pipeline/order-from-mp.mjs`, one area per run; the owner's reference is **Mountain Project**,
  which holds more routes than OpenBeta). Each row of an MP area page's route table carries `data-lr`, its left-to-right index
  (999999 = MP does not place it); the cached tree walk kept the rows but not that attribute, so the page is read again (paced by
  `scripts/lib/paced-fetch.mjs`, cached under `catalog/_mp/_pages/`). Per MP route: **MATCHED** to ours by the import's exact MP-id map
  (`catalog/_mp/_map/<state>.json`), else by name on the wall ("Brat, The" = "The Brat"), and given MP's position; **ADD** — a sport,
  trad or top-rope route MP lists and the wall lacks is added (grade and type from the page) in its place; **REVIEW** — a missing name
  contained in, or containing, one of our routes not matched to another MP route ("Fancy Idiot" / our "Fancy I") is printed, not added.
  Ours that MP does not list are **ANCHORED** right of their nearest left-hand neighbour in OpenBeta's older copy of MP's order, else
  **UNPLACED** (empty, listed last). Positions are renumbered 1..n. Dry run by default; `--apply` writes and reads back.
  First run, 2026-10-21: The Uberfall – left (Gunks), 45 matched, 3 added, 3 anchored, 1 for review, 6 unplaced (MP places 45 of 51).
  - **Whole state** (`--state <slug>`, resumable through `catalog/_mp/_order/<state>.jsonl`): every MP wall with a rock route
    (roped, not tagged Ice/Mixed/Snow — MP keeps a parallel "Ice & Mixed" tree under the same crag names) is matched to the area of
    ours its routes vote for (MP-id map, else a name unique in the state; ≥60% of votes). Two MP walls voting for one area: the one
    with twice the votes keeps it, else both are logged `shared`. Only 5.x climbs are added (MP files slides as Trad). An add is NOT
    made when the id map files it on another wall of ours (`ELSEWHERE`), its name contains or sits inside an unmatched name on the
    wall, MP repeats the name, it names the wall itself, or `refuse_duplicate_route` (0216) refuses it — those go on the review list.
    Walls only ordered, never sub-areas (owner: ordering walls is too confusing).
  - **Added climbs get full details**: `--state <slug> --facts --apply` reads each added climb's route page and stores length,
    pitches, GPS and the star average where empty; `extract-route-details.mjs <state> --adds` batches the description, protection,
    location and first ascent for REWRITING (under `_details/<state>/adds/`), and `apply-route-details.mjs` refuses any field that
    repeats four words of the page. Nothing is stored as fetched.
  - New York, 2026-10-21: 406 walls ordered (3,780 matched, 68 anchored, 102 unplaced), 25 climbs added, 11 adds refused by the
    duplicate trigger (all on near-duplicate walls of ours, e.g. "The Guides' Wall" beside "The Guides' Wall (Madame G's)"),
    21 for review, 6 walls skipped (2 shared, 3 with no area of ours, 1 split).
  - **Whole-catalog run, 2026-10-21/22 — STOPPED by the owner partway through Utah** (it saturated the production
    database: one REST write per route back to back, with retries piling on; the live app's reads 504'd). Done and
    rewritten: New York, California, Oregon, New Hampshire, Colorado. Ordered, facts/prose pending: Quebec,
    Kentucky. Partly ordered: Utah, Arizona, Washington, BC, Wyoming, Nevada, New Mexico, Idaho, Montana. Every
    wall is logged under `_order/<state>.jsonl`, so a re-run skips finished walls (and a state whose walls are all
    done skips its database load). Writes now wait `--pace-ms` (default 400) after each one and back off a minute
    on failure; **do not restart without the owner's OK.**
- **Search** (`DbSearchSplit`): finds areas and routes under the current scope; typing "mt baker" finds Mount Baker.
- **Route finder** (`RouteFinderPanel`): filters over the area's whole subtree - disciplines, grade (system + low/high),
  min stars, min pitches, length band, sort (`DEF = { discs, sortBy, minStars, minPitches, len, gSys, gLo, gHi }`). Active filters show as chips.
  The **Filters** sheet is a full-height screen (since 2026-10-21; it was an 88vh bottom sheet, which on iOS overflowed off the
  top and hid the title, ✕ and Discipline row): title row clears the notch, the list scrolls, and **Clear all / Show N routes**
  are pinned at the bottom. N is the DRAFT's count (`finderArgs()` builds the RPC args for both the draft and the applied query, so
  the button and the list agree). The page behind is scroll-locked while it is open.
  Since 0334 (owner, 2026-10-21):
  - **Several disciplines at once** (Sport + Trad, the way Mountain Project ticks types): `disc` reaches `routes_in_subtree(_count)` as a
    comma list. A grade range is offered on the scales every ticked discipline shares (`gradeScalesFor`); Sport + Bouldering share none, and the sheet says so.
  - **A star minimum keeps unrated climbs**: only a climb RATED below it is hidden (2 of 90,084 sport climbs had a rating, so the old rule
    emptied every star search). The sheet and the results both say unrated climbs still show.
  - **Grouped by wall by default**: the default sort is `lr`, and on a wall sort each wall gets a heading (opens its page, *Save area*).
  - **A state needs an area first** (`FINDER_NEEDS_AREA`): on a state or larger, the finder lists the state's areas to pick from (the
    finder's own Location, `loc`; *Change area* goes back) unless a name is typed. An unfiltered California list took 3.3 s in the database.
    The search box is debounced 250 ms. With no name typed, both RPCs now read the subtree's areas first and each area's routes
    through `routes_area_idx`: Sport + Trad 5.6–5.10a in Central-East Cascades used to walk the grade index across every state and hit
    the 3 s anon timeout. A name search keeps 0244/0245's name-index plan.
  - **Pinned search bar** (`usePinnedBar`): Routes | Areas, the box, Filters and the chips pin under the app's top bar once you scroll
    past them. Fixed-position with a placeholder, not CSS sticky: on a phone the document scrolls while `#appscroll` (overflow:auto) only grows.
  - **Save from the list**: a ☆ beside each row opens a save sheet: My Objectives (`toggleWish`), your own lists (`toggleListRoute` in
    App, the same `onUpdateList` write ListsManager makes) and the climb's wall (`toggleBookmark`).
  Mirrors Mountain Project's set, nothing extra (standing decision), except the sort, which offers **Left → right** / **Right → left**
  in place of *By area* (owner, 2026-10-21): `routes_in_subtree` `sort_by` `lr` / `rl` (0332) group the climbs by wall and order each wall
  by `sort_order`, no position last; `area` is still accepted. The offline twin is `subtreeComparer` in `lib/offline.js`.
- **Near me / area map** (`NearMePanel`): Leaflet map of peak/crag area bubbles with route counts, list/map toggle (`ViewToggle`),
  Street / Satellite / Topo / snow base layers (`BaseLayerToggle`), a live location dot, and a place search box
  ("Go to a town, county or zip/postal code") covering the US and Canada (provinces, towns, US zip, Canadian postal codes).
- **Objectives panel** (`ObjectivesPanel`): wishlisted routes under the current area.
- **Route page map** (`GPXMap`, `src/components/GPXMap.tsx`): track + waypoints + peak coordinate on the same base layers; a line
  drawn between waypoints carries a "sketch" caveat rather than posing as GPS.

## 2. How it works
1. `App` mounts `DbAreaBrowser` (props include `onOpenRoute`, `bookmarks`, `wishlist`, `completedIds`, `jumpToState`) when `USE_DB`; otherwise the seed tree.
2. Areas: `useCountries`, `useStates`, `useAreaChildren(parentId)`, `useArea(id)` / `fetchArea`, `useAreaPath(s)` (breadcrumb) in `lib/db.js`.
   Routes for one area: `useAreaRoutes(areaId, { full })` (thin row by default; `check:list-row-columns` guards the columns).
3. Subtree queries use RPCs: `routes_in_subtree` (`useSubtreeRoutes`, paged, 40 per page), `routes_in_subtree_count` (`useSubtreeRouteCount`),
   `areas_in_subtree` (`useAreaSearch(rootId, q, lim)`). Subtree membership rides the `areas.path` ltree.
4. Map bubbles: `useNearbyAreas(bounds)` selects `areas` where lat/lng fall in the live bounds box, `area_type` in (peak, crag),
   ordered by `route_count` desc, limit 500, and returns `{ rows, total }` so the UI can say it is capped. Refetches on pan/zoom. `useNearbyPeaks(bounds)` backs `NearbyPeaks`.
5. Search spelling: `lib/search.js` (`SEARCH_FORMS`, `SEARCH_COMPOUND`, `searchNorm`, `searchCanon`, `searchMatches`, `searchBare`) is the JS twin of SQL `search_norm()`
   (0190/0200/0201): every word is replaced by all its forms ("Mt Baker" -> "mount mt baker"). `check:search-norm` fails if the two diverge.
   Fuzzy fallback: RPC `search_names_fuzzy`.
6. Map kit (`lib/mapKit.jsx`): `loadLeaflet` (lazy, with `warmLeafletOffline`), `baseTileLayer` (street/sat/topo from `MAP_TILE_URLS`, or a NASA GIBS snow layer via `isSnowLayer`),
   `applyBaseLayer` (swaps the layer and drops Leaflet's zoom control 56px below the layer row so "+" is not hidden - #2411),
   `fitZoomToLayer`/`layerSharpZoom` (zoom limits per layer), `pinHtml` (bubble markup).
7. Location dot: `useFollowMe(mapRef, { C, zoom, onFix })` watches geolocation, `acceptFix` discards stale/worse fixes (`FIX_STALE_MS`, `FIX_LOST_MS`),
   `fmtFixAcc`/`locateLabel` word the status. The dot is an HTML marker lifted above all other markers; the accuracy ring stays under them (#2411).
   `NearMePanel` re-centres only on the first fix.
8. Place search: `searchPlaces(q, bounds)` calls Nominatim with `countrycodes=us,ca&limit=5&dedupe=1`, `postalcode=` for a 5-digit zip else `q=`, and a `viewbox` from the map bounds.
   It returns `{ name, sub, lat, lng, bbox }`; `NearMePanel` flies the map there.
9. Offline: `lib/offlineTiles.js` (`saveRouteMapOffline`, `routeTileKeys`, `OFFLINE_MAX_Z`) caches tiles along a route's way in (USGS layers); `offlineFallbackLayer` in the kit falls back to the cache.

## 3. Files
| File | Key symbols |
|---|---|
| `lib/DbAreaBrowser.jsx` | `DbAreaBrowser`, `AreaPage`, `PartnersHereCard`, `PARTNER_CARD_TYPES`, `StatePicker`, `DbSearchSplit`, `RouteFinderPanel`, `NearMePanel`, `NearbyPeaks`, `ObjectivesPanel`, `DbAreaTree`, `DbSuggestedClimbs`, `SummitBriefing`, `nearbyPeaksBounds` |
| `lib/mapKit.jsx` | `MAP_TILE_URLS`, `TILE_CREDIT`, `loadLeaflet`, `baseTileLayer`, `applyBaseLayer`, `BaseLayerToggle`, `ViewToggle`, `pinHtml`, `useFollowMe`, `acceptFix`, `searchPlaces` |
| `lib/AreaPageSections.jsx` | `AboutCard`, `AreaFactsCard`, `ClimbsChart`, `GradeSpread`, `MonthStrip`, `PendingAreaEdits`, `bucketLabel` |
| `lib/AreaSuggestFix.jsx` | default export `AreaSuggestFix` (mounted by App from its areaFixOpen / areaFixArea / areaFixField state in `ClimbMatch.jsx`) |
| `lib/areaFields.js` | `AREA_EDIT_FIELDS`, `AREA_EDIT_KEYS`, `ASPECTS`, `MONTH_ABBR`, `monthsLabel`, `myPendingAreaEdits` |
| `lib/areaChrome.jsx` | `EditIconButton`, `CopyCoordButton` (shared with `RouteDetail.jsx`), `NO_PARKING_PIN_LINE` |
| `lib/db.js` | `useAreaClimbStats`, `useAreaContributions`, `useArea`, `useAreaRoutes`, `useAreaChildren`, `useNearbyAreas`, `useNearbyPeaks`, `useSubtreeRoutes`, `useSubtreeRouteCount`, `useAreaSearch`, `useStates`, `useCountries`, `useAreaPath` |
| `lib/search.js` | `SEARCH_FORMS`, `searchNorm`, `searchCanon`, `searchMatches` |
| `lib/offlineTiles.js` | `saveRouteMapOffline`, `removeRouteMapOffline`, `routeMapLines` |
| `src/components/GPXMap.tsx` | `GPXMap` — the route page map (extracted from core, PR13) |
| `ClimbMatchCore.jsx` | `OverviewMap` (seed/overview map), lazy `DbAreaBrowser` import |
| `RouteDetail.jsx` | imports the kit (`loadLeaflet`, `applyBaseLayer`, `BaseLayerToggle`) for the route and waypoint-picker maps |

## 4. Data
- Supabase tables `areas` (parent_id, `path` ltree set by trigger, `area_type`, lat/lng, `route_count`; 0001; `blurb`; `approach`, `approach_min` (0247); `rock`, `rock_basis` (0248);
  `aspect` (0249); `parking_lat/lng/name` (0255), `parking_note` (0282); `season_months smallint[]` (0304)) and `routes`.
- Area edits: `contributions` rows with `area_id` and `route_id null`, `kind = 'field'`, `field` constrained to the seven editable columns
  (`contributions_area_field_ck`, 0304); `apply_agreed_area_field()` runs AFTER INSERT, writes the area column when the field was empty or
  3 distinct climbers agree, and marks the rows `approved` (through the `catalog.applier` GUC in `guard_contribution_status`), which is what
  makes `leaderboard()` (0235) count them.
- RPCs: `area_climb_stats` (0304; `{ total, graded, by_disc, by_grade }` over the subtree, one grouped scan), `routes_in_subtree`, `routes_in_subtree_count`, `areas_in_subtree`, `search_names_fuzzy`; SQL `search_norm()` (0190, 0200, 0201).
- `catalog_directory` view and `catalog_find_area` / `catalog_find_route` (0214) - a browse-outline and duplicate lookup used by data work, not by this UI.
- External: OpenStreetMap, ArcGIS World_Imagery and OpenTopoMap tiles (`MAP_TILE_URLS`); NASA GIBS for snow layers; USGS basemap tiles for offline (`OFFLINE_TILE_URLS`);
  Nominatim for place search (no key). Tile credits live in `TILE_CREDIT`.
- Seed: `MOUNTAINS` / `ROUTES` fallback when `USE_DB` is off.

## 5. Connections
- `openRoute(x)` / `onOpenRoute` hand a route to the route page; `wishlist`, `bookmarks`, `completedIds` flow in from `App` (objectives, saved, done).
- `jumpToState` and `onAreaContext` let other screens deep-link to or read the current area. `onAreaContext` reports every area, with
  `lat`/`lng` null when the row has none — it used to go silent without a coordinate, which hid the Discussion on such areas.
- Conditions score, alpine flags and fire layers use the same Leaflet kit (`FireMap`, `ShadeMap`).
- Units: distances and elevations render through `uDistMi` / `uElev` (`check:units`).
- Partners: By Area search picks an area from the same tree (see `docs/features/partners.md`). **Partners here** (0300): every crag-family area page and its
  ancestors below the state (`PARTNER_CARD_TYPES` — never a peak or a state) draws `PartnersHereCard`: how many climbers are listed here or nearby, up to three rows
  (the row component arrives from App as the `PartnerRow` prop — this file does not import core), a one-tap **List me here / Listed ✓** that writes this area's listing,
  "Add dates or climbing types" (a full-width card button, shown once listed) into the My listed areas sheet (`onListMe`), and "See all →" into the Partners tab on this area (`onFindPartnersInArea`). Signed out it asks for sign-in.
  `check:area-surfaces` rule 3 pins it. Its crews row (0302): **Start a crew here** (`onStartCrew` → `StartCrewSheet` prefilled with this area) and **Crews here · N**
  (`onCrewsHere` → Join a crew, By Area preset to this area; `openCrewCountAt` counts open crews bound to exactly this area).

## 6. Guards
`check:search-norm`, `check:list-row-columns`, `check:schema`, `check:counts` (`areas.route_count`), `check:area-surfaces`, `check:area-name-embed`,
`check:area-duplicates`, `check:area-sort-labels`, `check:generic-area-names`, `check:wp-styles`, `check:waypoint-placement`, `check:waypoint-dedupe`,
`check:track-caveat`, `check:gpx-caveats`, `check:waypoint-caveat`, `check:bottom-panels`, `check:overlays`, `check:overflow`, `check:ui`, `check:zero`,
`check:area-edit-fields` (the seven editable fields are one list), `check:area-page-honest` (gated facts, chart headline = its bars, one drive control), `check:write-readers`.
A place filed twice is refused at insert by `refuse_duplicate_area` (0216/0218, a same-named area within 1.5 km) and `refuse_bucket_copy_area` (0340, an area NAMED by a list of two or more places the state already files — MP's "Cascade River Drainage (Eldorado, Forbidden, …)" beside North Cascades Core); `check:area-duplicates` sweeps for both daily.
Notes: `docs/guards/README.md`.

## 7. Last significant change
Area pages (0304): ABOUT, AREA FACTS, CLIMBS HERE + GRADE SPREAD, GETTING THERE, TOP RATED and Suggest an edit, after an audit of Mountain Project's and theCrag's area pages (Castleton Tower was the model).
#2416 before it - area map place search covers Canada (provinces, towns, postal codes); #2411 just before it fixed hidden zoom buttons and the buried location dot.

## 8. Known gaps
- `searchPlaces` depends on public Nominatim with no key or fallback; a non-OK response throws "place search <status>".
- The area bubbles query is capped at 500 rows (`limit(500)`), so a zoomed-out view shows only the highest route counts; the UI is told via `total`.
- Place search is restricted to `us,ca`; anywhere else returns nothing.
- 462 of 67,276 areas carry a `blurb`, 529 an `approach`, 9,637 a parking pin (2026-10-15); the sections invite the edit on the rest, and a research pass fills the busiest areas first.
- The chart runs on the area's stored `discipline`; a route filed with none is counted in the headline's "+N filed with no type" line, not in a bar.
- Only 5-digit values are sent as `postalcode=`; Canadian postal codes go through the free-text `q=` path.
