# Conditions (route page `forecast` sub-tab, "Your conditions", Best day to climb)

## 1. What it does today
- On a route page the sub-tab id `forecast` is labelled **Conditions**. It shows two different things by discipline:
  - **Crag disciplines (sport, trad, top-rope, bouldering):** a 0-5 star **conditions score**, hour by hour and day by day, with the factor rows, the reason for any cap, the weather tiles (rain amount headline, chance beneath), and a rain timing line ("4 h, 7 PM-11 PM"). The *Day by day* list is drawn as a table: each day is a full-width row with its date beside its name, divided from the next by a `C.border` rule (not the near-invisible `C.borderLight`), and the selected day marked by a green bar on its left edge as well as its tint. Rendered by `ConditionsScoreCard` in `RouteDetail.jsx`. Each hourly chart (`HourChartCard`) reads an hour on a **tap**, or on **touch and hold (350 ms) then slide**; a swipe that starts on a chart always scrolls the page and never changes the boxes above it (a mouse reads by hover or drag).
  - **Alpine, mountaineering, scrambling, ice, mixed:** **flags and a start time, no stars** (`lib/AlpineConditionsCard.jsx`). The start is counted back from the Planner's estimate. On glacier and alpine-ice routes, after a night that froze, it is also never later than one that has the party back off the snow by noon (`LIMITS.snowBackBy`, the guides' practice: Easton leaves high camp 2-5 AM); the card then names the later start the forecast alone would allow, and shows the route's own `timing.recommendedStart` when it has one. The day strip says which day every section below shows, and each day section's heading (alerts, hour by hour, snowfall, air) has its own ‹ › that steps the same day for all of them (`DayHead`). It is not sticky: `#appscroll` grows to its content and the document scrolls, so a sticky child cannot stick inside it. Also fog/visibility, snowfall and snow level, nearest USGS stream gauge, and report freshness.
- Under the score (crag) or the flags card (alpine), above the weather forecasts, the Conditions tab carries **ASPECT & SUN** (which way the face points, in sun or shade now, climber sun reports) and **SEASONAL GUIDANCE** (the best window and month by month), moved there from Overview / Plan on 2026-10-23. Placement is decided in `RouteDetail.jsx` (`condPanels`, `condTab`). After the weather forecasts comes **CLIMATE & SEASON** (`ClimateSeasonCard`, `climateEl`: the route's `climate` column — typical weather, spring/summer/fall/winter, forecast zone — or the *No season guidance* note), moved there from Plan / a crag's Overview on 2026-10-24; a discipline with no Conditions tab (aid) keeps it on Overview.
- **Weather & mountain forecasts** (the outside-forecast link list under the live forecast, `wxEl` → `forecastLinksOf()` in `RouteDetail.jsx`) opens every site that takes a coordinate at ONE point: the point the in-app forecast above it reads (`cragWxPointOf()` — the crag's coordinate — on a crag route, else `forecastPoint()`, the summit pin or the area at the high point). NWS point forecast + hourly graph (`MapClick.php?lat=&lon=`), Mountain-Forecast.com through the site's nearest-peak redirect (`/location_search?lat=&lon=`), and AirNow's fire-and-smoke map centred there (`fire.airnow.gov/#9/lat/lng`). The country comes from the area's `path` (`countryOf()`; seed areas walk `MOUNTAINS`): a Canadian climb gets Environment Canada's point forecast (`weather.gc.ca/en/location/index.html?coords=`) instead of NWS, and InciWeb (US incidents only) is offered only in the US; an unknown country keeps the US links. OpenSnow was removed (2026-10-24): it has no coordinate URL, so it could only open a search box. With no coordinate at all the sites open on their home pages.
- **Best time to climb** (crag): the big number is the **overall score at the hour you pick**, captioned "Overall score at 3 PM"; the strip under it is headed **Pick an hour** ("daylight hours · colour is the overall score") — one tile per daylight hour, each the same blended score, never a separate per-hour metric (owner's note, 2026-10-24: "Score by hour" read as a different score). The tiles sit on **one clock axis shared by all seven days** (`hrLo`/`hrCol`/`hrGrid` in `ConditionsScoreCard`), so every tile is the same width and an hour is in the same column every day — sized by the day's own count, an evening's last hour stretched across the card. The best 3 hours are a green underline row, not a shadow on the tiles (it made them look taller). Surfline's hourly rating bars are the model: equal bars on a fixed time axis, colour = the overall rating.
- `conditions` (labelled **Reports** / "Send Reports") is a different sub-tab: what climbers reported, summarised by `buildConsensus(route.activity)`. It is not forecast-driven and does not feed the score.
- **Your conditions** (`lib/CondPrefs.jsx`): temperature range (all climbing, plus optional per-discipline for sport/trad/toprope/bouldering), wind range, humidity ceiling, sun/shade preference, smoke sensitivity, daylight window, and rain caution ("normal"/"cautious"). **Alpine** and **Ice & mixed** are two further scopes with no presets and no default; if set they add one plain line on the alpine card and never change a flag or start time.
- **Best day to climb** (`lib/BestDayTile.jsx`): the same score run over the climber's saved (`wishlist`) crag routes **and saved areas** (`bookmarks`). A saved crag is scored when one of its `disciplines` is a crag one (for `dominant_discipline` if that is one); a saved region, whose own row has no disciplines, when crag climbs are at least half of the climbs under it (`area_climb_stats`, read by `useAreasClimbDiscs` in `lib/db.js`), for its most-climbed crag discipline. An area is scored at its own coordinate with its own `aspect` and `rock`; peaks, ranges and states are left out. Area rows share the 8-crag forecast limit and open the area page, not a day. It renders inline on Home under Jump back in, and the Menu (Plan & log) opens it as a full-screen overlay (`bestDayOpen` in `ClimbMatch.jsx`) with a Back button; saved climbs with no crag location are listed as unscored; with no saved crag climb it shows only how to add one.

## 2. How it works
1. **Fetch** (`lib/forecast.js`): `fetchCragForecast(lat,lng)` (Open-Meteo hourly; every Open-Meteo forecast fetch asks for `BLEND` — the NWS National Blend of Models first, the default model filling what it lacks — folded back into plain series by `blendModels`, so a forecast does not swing between visits) plus `fetchCragAir` (air quality) and `fetchCragClimate` (archive, monthly climate). Results are cached per crag in module maps in `RouteDetail.jsx` (`_cragAir`, `_cragClim`) and in `BestDayTile.jsx` (`_wx`, max `MAX_CRAGS` = 8 crags; routes on one crag share a forecast).
2. **Score** (`scoreForecast(forecast, wall, prefs, nowMs, air)` in `lib/conditionsScore.js`): five factors with `WEIGHTS` temp 30, humidity 20, dry rock 25, wind 10, sun 15. Each is rounded to whole points before summing; a factor with a missing input is left out and stars = 5 x points / measured points. No clamp.
3. **Dry rock**: a drying credit accumulates since the last rain at `DRY_RATE` (damp 0.6, night 1, rh90 0.6, rh75 0.9, rhDry 1.15, wind 1.15, sun 1.3), scaled by `rainScale(rain24)` and compared to `DRY_HOURS` for the rock family (`lib/rockType.js`: granite/quartzite 12 h, basalt/limestone/metamorphic 24, volcanic 36, sandstone/shale 48, unknown 36; x1.5 if rain caution is "cautious"). Rock type comes from the route's own `routes.rock`, then `areas.rock` (`routeRock`).
4. **Caps** (stars = min(factor stars, lowest cap)): rain in the past hour -> 1; wet sandstone -> 1; `WET_BANDS` = under 30% dry -> 1, under 70% -> 2, not fully dry -> 3.5; air at dew point -> 2; AQI over the limit -> 1, over the lower limit -> 2 (`AQ_LIMITS`, per climber sensitivity). Label via `starsLabel`: 4+ Good, 2.5+ Fair, else Poor.
5. **Wall in sun**: `aspectBearing`, `sunPosition`, `wallInSun`, `sunRiseSet` use the date, the wall aspect and cloud.
6. **Alpine** (`lib/alpineConditions.js`): `condKind` picks the kind per route; `dayFlags` builds flags from `LIMITS`; helpers `fogHours`, `snowHistory`, `snowLevel`, `softensAt`, `freezeHours`, `thunderOnset`, `modelSpread` (3 models), `alertsForDay` (NWS alerts), `sunClimbStart`, `wholeDayLegs`. Local time is zone-aware via `localFn` (so DST days are 23-25 h). `lib/streams.js` finds the nearest gauge within 25 km and reports the last 24 h; it states no safe/unsafe verdict.
7. **Prefs store**: `updateCondPrefs` -> `cleanPrefs` -> device localStorage + subscribers + debounced save to the account (`useCondPrefsAccount(uid)`; `saveMyCondPrefs`/`useMyCondPrefs` in `lib/db.js`). Account copy wins on sign-in; an account with none adopts the device's; a device last owned by another account starts from defaults. Temps are stored in F and wind in mph regardless of display units. Sync states: local/loading/saving/saved/failed.

## 3. Files
| File | What lives there |
|---|---|
| `lib/conditionsScore.js` | `scoreForecast`, `WEIGHTS`, `DRY_RATE`, `WET_BANDS`, `rainScale`, `TEMP_BANDS`, `resolveRange/resolveWind`, sun helpers, `starsLabel`, `monthlyClimate/monthFit`, `OPEN_DAY`, pref definitions |
| `lib/rockType.js` | `DRY_HOURS`, `DRY_HOURS_UNKNOWN`, `routeRock` |
| `lib/forecast.js` | Open-Meteo/NWS/USGS fetchers, `visibilityInMetres`, `SPREAD_MODELS`, `blendModels` |
| `lib/alpineConditions.js` | alpine kinds, flags, snow, fog, alerts, start-time helpers |
| `lib/AlpineConditionsCard.jsx` | alpine Conditions UI |
| `lib/streams.js` | USGS gauge parsing, `nearestGauge`, `flowReading` |
| `lib/CondPrefs.jsx` | "Your conditions" store, `CondPrefsControls`, `scorePrefs`, `useCondPrefsAccount` |
| `lib/BestDayTile.jsx` | Best day to climb |
| `RouteDetail.jsx` | `ConditionsScoreCard`, sub-tab wiring, `AlpineConditionsCard` mount, Reports tab |
| `ClimbMatch.jsx` | `bestDayOpen` overlay, `condsOpen`, Settings "Your conditions" |
| `scripts/check-conditions-score.mjs`, `scripts/check-alpine-conditions.mjs` | guards |

## 4. Data
- **External, called from the browser:** Open-Meteo forecast, air-quality and archive APIs; `api.weather.gov` (points, alerts); `waterservices.usgs.gov` (site list and `iv` flow, parameters 00060/00065).
- **Supabase:** `areas.rock`, `areas.rock_basis` (migration 0248; 'stated' or 'mapped', read by the Rock tile and the score; both render the same, with no "(mapped)" label since 2026-10-15); `areas` aspect (0249); `profile_condition_prefs` (migration 0290: one owner-only row per climber, `prefs jsonb` with keys rain, temp{all,sport,trad,toprope,bouldering,alpine,ice}, wind, rhMax, sun, aq, window).
- **Not stored:** forecasts, scores and flags are computed per view and cached only in memory; nothing is written to the DB. The `conditions` tab's consensus is derived, not stored.

## 5. Connections
- Route page: sub-tab `forecast`; BestDayTile's `onOpen(r, sub)` sets a pending sub-tab and calls `openRoute`.
- Planner: alpine start time uses `planTimes` (`lib/planTimes.js`).
- Settings/Menu: `CondPrefsControls` (`only="temp"` on the alpine card); BestDayTile `onPrefs` opens it.
- Units: displays through `uTemp/uWind/uElev/uSnowfall/uTempDelta`; `check:units` covers it.
- Reports: separate tab; alpine card shows report freshness from trip reports.
- Crag routes have no Plan tab (conditions live on Overview/Conditions, per project notes).

## 6. Guards
`check:conditions-score`, `check:alpine-conditions` (both in build; entries in `docs/guards/honesty-claims.md`), plus `check:units`, `check:untracked-factors`, `check:date-locale`, `check:no-sources`, `check:a11y-names`, `check:clickable`.

## 7. Last significant change
#2406 — graded wet-rock caps (`WET_BANDS`) and a faster `DRY_RATE`, fitted to CragReport. Full history is in the PRs and the commit log for the files above.

## 8. Known gaps / open decisions
- No forecast is saved for offline use (owner, 2026-10-21): offline, every forecast surface says it could not load. Past ~day 11, and for freezing level/UV/low cloud past day 4, the series is the default model (GFS in the US), which swings more.
- `DRY_HOURS` is published guidance and was left unchanged in #2406; the best fit wanted night to dry faster than day and was not adopted (PR text).
- No alpine go/no-go standard exists, so alpine is flags only by owner decision (2026-10-07).
- No published fog/whiteout standard for model visibility in mountains; the card never says "whiteout" (PR #2352).
- Gauges may be on another stream; no wadeability verdict is given (`lib/streams.js`).
- #2406 notes a full local build was killed for low memory; CI was the full run.

The forecast carries no "read it yourself" or "sources can disagree" caveats (owner, 2026-10-15 #2425 and 2026-10-24): the only footer kept is the alpine hour-by-hour's measured station temperature error.
