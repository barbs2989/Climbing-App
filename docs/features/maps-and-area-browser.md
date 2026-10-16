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
- **Search** (`DbSearchSplit`): finds areas and routes under the current scope; typing "mt baker" finds Mount Baker.
- **Route finder** (`RouteFinderPanel`): filters over the area's whole subtree - discipline, grade (system + low/high),
  min stars, min pitches, length band, sort (`DEF = { disc, sortBy, minStars, minPitches, len, gSys, gLo, gHi }`). Active filters show as chips.
  Mirrors Mountain Project's set, nothing extra (standing decision).
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
