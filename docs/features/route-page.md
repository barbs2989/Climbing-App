# The route page

Part of the current-state docs. The Conditions tab has its own doc: [conditions.md](conditions.md).

## 1. What it does today

- Tapping a climb anywhere in the app opens its page (`tab="routes"` with `selRoute` set). The header carries the five rating stars, a ★ cell with "★ N rated", grade, discipline and save/log actions.
- Sub-tabs: `overview`, `planner`, `forecast` (labelled "Conditions"), `conditions` ("Reports" / "Send Reports"), `safety`, `partners`, `photos`. **Crag routes have no Plan tab** (see `CRAG_CATS`, `showPlan`); the Safety tab is unconditional.
- Your header stars persist. Tapping another star changes your rating; tapping your own star again withdraws it. Signed out, it asks you to sign in rather than pretending to save.
- Every figure built from several climbers' input states how many climbers it comes from and over what window (e.g. "avg of N ratings", "N climbers logged it", "N in the last 45 days", "N of 3 suggested").
- Planner (alpine layout) has a **Full Trip Time** card: Approach, Climbing, Descent, Total trip (approach + climb + descent).
- Climbers can edit/correct route fields through edit pencils; every edit is held until the owner approves it (see [route-quality-control.md](route-quality-control.md)).
- Crag routes show `CragLocationCard` (crag + parking coordinates, Google/Apple Maps). Its *Add parking*, *Add the pin* and the pencil on a parking pin open the `waypoints` pin editor (map picker + lat/lng). That editor is offered on every crag discipline. On a crag it is labelled *Parking spot* and its only type is the parking pin (`WP_TYPES_CRAG`; a crag climb carries no waypoints), and the stored `Trailhead` type is shown as *Parking* (`wpTypeLbl`). `trailheadPoint()` reads that pin before the crag-wide `areas.parking_*` pin.
- **Base of the climb** (`BaseCheckinPanel`, 0188) sits directly under the route map (ROUTE TRACK on the alpine Plan, TRAIL TO THE CRAG on crag Overview). A climber standing at the start taps *I’m at the base — check in*; the phone takes a steady GPS fix and `check_in_at_route_base()` decides whether it is at this climb (within 500 m of a crag, 5 km of a peak, or 600 m of a Base/Start pin). Accepted check-ins are stored per ROUTE, one per climber, and clustered into spots (`clusterBasePoints`). Those spots are drawn ON the map as ringed Base pins (`GPXMap`'s `baseSpots`), and *How far am I from the base?* gives a live distance and compass direction from the phone to the most-confirmed spot, else the route's own Base/Start pin, else (crags only) the crag's coordinate, labelled as such (`baseGuide` in `lib/baseCheckin.js`). Inside GPS error it says you are there and shows the route's `location` note, which is what tells neighbouring lines apart.
- On a crag route the map section is headed **TRAIL TO THE CRAG** (alpine family: ROUTE TRACK). Its GPX line is the walk from parking to the base of the crag, on to this climb's start when it sits apart from the main wall; the climb itself is not part of it. The empty state is *No trail to the crag yet* → *Add the trail*, which opens `GpsSubmissionModal` with `crag` set (heading *Add the trail to the crag*, and where to start and stop recording).
- Safety tab: **EMERGENCY & RESCUE** (`EmergencyRescueCard`) names the COUNTY the climb is in (the route's `emergency.county`, else `useCountyAt` on `climbPoint`'s coordinate — the FCC census-area lookup, cached per ~100 m cell in localStorage) and shows only that county's verified non-emergency dispatch line from `SAR_BY_COUNTY` (`sarFor`); a county with no verified number shows 911 guidance and none. Its Edit pencil opens *Add or fix info* at the `emergency` field (`setAutoFix(id+"#emergency")`).
- Photos tab: route photos, lightbox, likes, report. Its `TopoDrawer` is exported for the log form (`lib/LogAscent.jsx`), so a topo can be drawn while logging a climb. A line can be named (`topo_lines.label`, optional); the name is the line's chip in `TopoPhotoModal` and a caption on `TopoThumb`.

## 2. How it works

1. **Open.** `openRoute(x)` in `ClimbMatch.jsx` sets `routeFrom`, `selRoute` and `tab="routes"`. `App` renders `RouteDetail` (a lazy screen).
2. **Load (DB path, `USE_DB`).** `useAreaRoutes` (lib/db.js) backs the area browser's route list from `areas`/`routes`; `fetchRouteRow` fetches a single full row. `dbRouteToCamel()` converts a snake_case row to the camelCase shape the page reads. Seed `ROUTES` are only the fallback/demo set.
3. **Overlay of climber input.** `App` merges contributions onto the route inside its route memo: `useRouteContributions` supplies the route's contribution rows; only `status='approved'` rows are applied (value = `applied_value` else `value`), producing `_contribFields` (approved fields), `_pendingEdits` (the caller's OWN pending suggestions, shown as "Awaiting review") and `_contribAgreed` (how many climbers submitted the approved value; drives "✓ N climbers, checked" in the edit form). `useRouteDifficultyRatings` feeds the difficulty breakdown.
4. **Stars.** `useMyRouteRating(routeId, userId)` reads your `route_ratings` row into `myStars` (a failed read never clears the stars). `setRouteRating(userId, routeId, stars)` upserts, or deletes when `stars` is null, then invalidates `route-rating-mine` and `route-star-summary`. `useRouteStarSummary(routeId)` calls RPC `route_star_summary` for the shared average and rater count shown in the ★ cell.
5. **Sub-tabs** are rendered by `RouteDetail.jsx` off its `tab` state. Overview carries the consensus (`buildConsensus` over `route.activity`), hazard flags, route breakdown, approach/descent, social chips (`useRoutePairings`, `useRouteLoggedWith`). `FireNearRoute` is the first section of Safety on every route. A start of climb is filed from the *Start of climb* section of Add or fix info (or the log form) and shown as START OF CLIMB on Overview; Safety has no start-location button (removed 2026-10-15 as a duplicate).
6. **Planner.** Time estimates come from `scarfHrs(...)` (Naismith-style approach by fitness tier and pack weight) and `techHrs(...)` (pitch-by-pitch climbing, exponential slowdown by grade); `lib/planTimes.js` (`planTimes`, `realPitches`) assembles the stage totals. A route's stored legs win over computed ones (`check:return-leg`).
7. **Glacier terrain.** Alpine routes whose terrain read says glacier get the glacier conditions card plus the rock-weather flags (#2336).
8. **Photos.** `submitRoutePhoto` writes a `contributions` row of kind `photo`; `reportPhoto` reports one; `lib/PhotoReports.jsx` holds the moderation queue; `lib/photoPrivacy.js` / `lib/photoEvidence.js` support gating.

## 3. Files

| File | What lives there |
|---|---|
| `RouteDetail.jsx` | The page: sub-tabs, `CRAG_CATS` (imported from core since 0300), `showPlan`, `cragOnly`, header stars UI, planner, photos tab and `photoLightbox`, edit pencils, `DiffRadar`, the crag Partners sub-tab (`usePartnersInArea`, `areaPartners`) |
| `ClimbMatch.jsx` | `openRoute`, `selRoute`, `myStars`/`myRateQ`, route memo that merges `_contribFields`/`_pendingEdits`/`_contribAgreed` |
| `ClimbMatchCore.jsx` | `scarfHrs`, `techHrs`, `buildConsensus`, `catOf`, `wpPlaced`, `WP_STYLE` |
| `src/components/GPXMap.tsx` | `GPXMap` — the route map: track, pins, one shared popup card, derived trailhead, base check-ins (extracted from core, PR13) |
| `src/components/ElevChart.tsx` | `ElevChart` — the elevation profile under the route map (extracted from core, PR10) |
| `lib/db.js` | `useAreaRoutes`, `fetchRouteRow`, `dbRouteToCamel`, `useRouteContributions`, `useRouteDifficultyRatings`, `useMyRouteRating`, `useRouteStarSummary`, `setRouteRating`, `submitRoutePhoto`, `reportPhoto`, `submitContribution` |
| `lib/planTimes.js` | `planTimes`, `realPitches` |
| `lib/rack.js` | `routeRackFor`, `rackLeftovers`, `isRackEntry`, `isNonRackGear`, `DISC_RACK` — what the RACK card prints (rack only) and what moves to GEAR & ESSENTIALS |
| `lib/baseCheckin.js` | `acquireBaseFix`, `clusterBasePoints`, `baseCheckinMessage`, `baseGuide`, `bearingDeg`: the base check-in's GPS rules and the find-the-base readout |
| `lib/rescueCounty.js` | `useCountyAt`, `countyAt`, `climbPoint`, `sarFor`, `SAR_BY_COUNTY` — the Safety tab's county and its dispatch line |
| `lib/FireNearRoute.jsx` | Nearby-fire panel (Safety tab) |
| `lib/PhotoReports.jsx` | Photo report queue |
| `EnrichmentPanels.jsx` | Panels for enriched route columns |
| `lib/DbAreaBrowser.jsx` | The Climbs area browser that opens routes |
| `supabase/migrations/0294_route_star_ratings_persist.sql` | `route_ratings`, `route_star_summary`, triggers |

## 4. Data

- **`routes`** (thousands of rows; `dbRouteToCamel` reads it). `routes.stars` is a cache kept by triggers on `route_ratings` and `climb_logs`; the Climbs list, min-stars filter and stars sort read it.
- **`route_ratings`** (0294): PK `(route_id, user_id)`, `stars` 1-5, RLS own-row read/insert/update/delete. Nothing renders who rated what.
- **`route_star_summary(p_route_id)`**: average of one vote per climber: header rating, else their most recent public, visible trip report's stars; returns `stars` and `raters`.
- **`route_base_checkins`** (0188): one row per climber per route, written only through `check_in_at_route_base()`; others read unattributed points through `route_base_checkin_points()` (`useRouteBaseCheckins`, read once in `RouteDetail` and shared by the map and the panel).
- **`contributions`**: corrections (held `pending` until the owner approves; 0307–0309) and route photos (kind `photo`). **`climb_logs`**: trip reports/stars.
- **Still seed/in-memory:** `ROUTES` fallback set and demo trip reports when not on the DB path.

## 5. Connections

- **Climbs browser:** `lib/DbAreaBrowser.jsx` and `openRoute` are the entry; the list's stars come from `routes.stars`.
- **Crews:** crew gear list reaches a real route (`check:crew-gear`); crews are built around a `routeId`.
- **Logbook:** logging a climb (`climb_logs`) feeds trip reports, consensus and, as fallback vote, the rating.
- **Partners:** the `partners` sub-tab; `useRoutePairings` / `useRouteLoggedWith` show who logged it. On a crag route (0300) the sub-tab is "Climbers at <crag>":
  `usePartnersInArea` on the route's area, List me at <crag> (`onListMe`, into the My listed areas sheet), See all (`onFindPartnersInArea`), and the seed example cards are off;
  "Sessions at <crag>" lists open crews bound to exactly this route's area (`dbCrews` rows with an `areaId`), joinable like a route crew.
  On an alpine route it is still the climbers who saved it (`usePartnersByObjective`, match objectives only since 0303).
- **Conditions:** see [conditions.md](conditions.md).

## 6. Guards

`check:bare` (route with no enrichment, every discipline x sub-tab), `check:field-renders`, `check:token-boxes`, `check:pitch-split`, `check:approach-section`, `check:approach-overlay`, `check:trailhead-directions`, `check:trailhead-direction-shape`, `check:access-checked-line`, `check:fire`, `check:summit-briefing`, `check:photo-contract`, `check:crew-gear`, `check:camping`, `check:correction-readers`, `check:return-leg`, `check:write-readers` (rating writes refresh both cached readers), `check:schema`, `check:rls`, `check:migration-replay`, `check:ui`, `check:zero`, `check:overflow`. Notes: `docs/guards/route-page.md`. `audit:rack-items` (hand-run: no rack column files non-rack gear).

## 7. Last significant change
Real climbers, batch 3: comment authors are public names (`publicNameOf`, comments select `show_name`); @mention chips, matching and insertion use `mentionName`/`mentionToken`; TOP CONTRIBUTORS names real contributors by `pubName` and opens their profile; "viewing now" broadcasts your public name and opens a real viewer's own profile; Share → Send to a partner names real friends publicly without a client-made score.
The RACK card is rack-only: `detailed_rack`/`pro_needs`/`rack` re-homed on ~400 WA routes (ice axe, crampons, helmet, boots moved to `what_to_bring`), `DISC_RACK` stripped to protection and ropes, and `routeRackFor` splits every source (`rackLeftovers` to GEAR & ESSENTIALS). Before that: #2407 — header stars persist, count once per climber and feed the route rating (0294). Full history is in the PRs and the commit log for the files above.

## 8. Known gaps / open decisions

- `SAR_BY_COUNTY` holds 3 Utah counties (Grand, Utah, Salt Lake), each checked against the agency's own page on 2026-10-15; every other county shows 911 guidance only until a climber adds its line through the pencil. Emergency contacts are per ROUTE, so a climber's edit on one Castleton line does not reach its neighbours.

- A base check-in at a CRAG is judged against the crag's coordinate (500 m), so the server cannot tell which of two neighbouring lines a climber stood under; a spot is trustworthy only as far as several climbers agree on it. The find-the-base readout says so by handing over to the `location` note inside GPS error.

- #2403 states the corrections merge sits inside App's route memo and was not exercised against live contributions; only build guards cover it. It also records a database-path gap in `docs/guards/contributions-and-logbook.md`.
- #2336 did not run `check:ui` or `check:overflow` after the Total row grew from 3 to 4 tiles.
- Only 5 of 314,599 routes held a `stars` value when 0294 was written; a route's value is replaced only when a climber votes (per migration comment).
