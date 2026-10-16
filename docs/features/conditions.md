# Conditions (route page `forecast` sub-tab, "Your conditions", Best day to climb)

## 1. What it does today
- On a route page the sub-tab id `forecast` is labelled **Conditions**. It shows two different things by discipline:
  - **Crag disciplines (sport, trad, top-rope, bouldering):** a 0-5 star **conditions score**, hour by hour and day by day, with the factor rows, the reason for any cap, the weather tiles (rain amount headline, chance beneath), and a rain timing line ("4 h, 7 PM-11 PM"). Rendered by `ConditionsScoreCard` in `RouteDetail.jsx`.
  - **Alpine, mountaineering, scrambling, ice, mixed:** **flags and a start time, no stars** (`lib/AlpineConditionsCard.jsx`). The start is counted back from the Planner's estimate. Also fog/visibility, snowfall and snow level, nearest USGS stream gauge, and report freshness.
- `conditions` (labelled **Reports** / "Send Reports") is a different sub-tab: what climbers reported, summarised by `buildConsensus(route.activity)`. It is not forecast-driven and does not feed the score.
- **Your conditions** (`lib/CondPrefs.jsx`): temperature range (all climbing, plus optional per-discipline for sport/trad/toprope/bouldering), wind range, humidity ceiling, sun/shade preference, smoke sensitivity, daylight window, and rain caution ("normal"/"cautious"). **Alpine** and **Ice & mixed** are two further scopes with no presets and no default; if set they add one plain line on the alpine card and never change a flag or start time.
- **Best day to climb** (`lib/BestDayTile.jsx`): the same score run over the climber's saved (`wishlist`) crag routes. It is opened as a full-screen overlay (`bestDayOpen` in `ClimbMatch.jsx`) with a Back button, not an inline Home tile; saved climbs with no crag location are listed as unscored; with no saved crag climb it shows only how to add one.

## 2. How it works
1. **Fetch** (`lib/forecast.js`): `fetchCragForecast(lat,lng)` (Open-Meteo hourly) plus `fetchCragAir` (air quality) and `fetchCragClimate` (archive, monthly climate). Results are cached per crag in module maps in `RouteDetail.jsx` (`_cragAir`, `_cragClim`) and in `BestDayTile.jsx` (`_wx`, max `MAX_CRAGS` = 8 crags; routes on one crag share a forecast).
2. **Score** (`scoreForecast(forecast, wall, prefs, nowMs, air)` in `lib/conditionsScore.js`): five factors with `WEIGHTS` temp 30, humidity 20, dry rock 25, wind 10, sun 15. Each is rounded to whole points before summing; a factor with a missing input is left out and stars = 5 x points / measured points. No clamp.
3. **Dry rock**: a drying credit accumulates since the last rain at `DRY_RATE` (damp 0.6, night 1, rh90 0.6, rh75 0.9, rhDry 1.15, wind 1.15, sun 1.3), scaled by `rainScale(rain24)` and compared to `DRY_HOURS` for the rock family (`lib/rockType.js`: granite/quartzite 12 h, basalt/limestone/metamorphic 24, volcanic 36, sandstone/shale 48, unknown 36; x1.5 if rain caution is "cautious"). Rock type comes from the route's own `routes.rock`, then `areas.rock` (`routeRock`).
4. **Caps** (stars = min(factor stars, lowest cap)): rain in the past hour -> 1; wet sandstone -> 1; `WET_BANDS` = under 30% dry -> 1, under 70% -> 2, not fully dry -> 3.5; air at dew point -> 2; AQI over the limit -> 1, over the lower limit -> 2 (`AQ_LIMITS`, per climber sensitivity). Label via `starsLabel`: 4+ Good, 2.5+ Fair, else Poor.
5. **Wall in sun**: `aspectBearing`, `sunPosition`, `wallInSun`, `sunRiseSet` use the date, the wall aspect and cloud.
6. **Alpine** (`lib/alpineConditions.js`): `condKind` picks the kind per route; `dayFlags` builds flags from `LIMITS`; helpers `fogHours`, `snowHistory`, `snowLevel`, `softensAt`, `freezeHours`, `thunderOnset`, `modelSpread` (3 models), `alertsForDay` (NWS alerts), `sunClimbStart`, `wholeDayLegs`. Local time is zone-aware via `localFn` (so DST days are 23-25 h). `lib/streams.js` finds the nearest gauge within 25 km and reports the last 24 h; it states no safe/unsafe verdict.
7. **Prefs store**: `updateCondPrefs` -> `cleanPrefs` -> device localStorage + subscribers + debounced save to the account (`useCondPrefsAccount(uid)`; `saveMyCondPrefs`/`useMyCondPrefs` in `lib/db.js`). Account copy wins on sign-in; an account with none adopts the device's; a device last owned by another account starts from defaults. Temps are stored in F and wind in mph regardless of display units. Sync states: local/loading/saving/saved/failed.
8. **Season** (`SeasonChart` in `RouteDetail.jsx`, crag disciplines): `fetchCragClimate` gives twelve months of average high/low and wet days (≥ 1 mm). `monthFit` judges a month by `hoursInRange` — the hours from 6 AM to 9 PM of an average day (a curve from the low at 5 AM to the high at 3 PM) inside the climber's range. **Prime**: a 4-hour session (`SESSION_HRS`) in range and under 15 wet days; **Good**: a session within 6° colder or 10° warmer and under 18; else **Off season**. It used to compare only the average HIGH with the range, which called a Canadian July (Squamish 79/56°F) off season.

## 3. Files
| File | What lives there |
|---|---|
| `lib/conditionsScore.js` | `scoreForecast`, `WEIGHTS`, `DRY_RATE`, `WET_BANDS`, `rainScale`, `TEMP_BANDS`, `resolveRange/resolveWind`, sun helpers, `starsLabel`, `monthlyClimate/monthFit`, `OPEN_DAY`, pref definitions |
| `lib/rockType.js` | `DRY_HOURS`, `DRY_HOURS_UNKNOWN`, `routeRock` |
| `lib/forecast.js` | Open-Meteo/NWS/USGS fetchers, `visibilityInMetres`, `SPREAD_MODELS`, `snapshotPackForecast` |
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
- **Supabase:** `areas.rock`, `areas.rock_basis` (migration 0248; 'stated' or 'mapped', read by the Rock tile and the score); `areas` aspect (0249); `profile_condition_prefs` (migration 0290: one owner-only row per climber, `prefs jsonb` with keys rain, temp{all,sport,trad,toprope,bouldering,alpine,ice}, wind, rhMax, sun, aq, window).
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
- `DRY_HOURS` is published guidance and was left unchanged in #2406; the best fit wanted night to dry faster than day and was not adopted (PR text).
- No alpine go/no-go standard exists, so alpine is flags only by owner decision (2026-10-07).
- No published fog/whiteout standard for model visibility in mountains; the card never says "whiteout" (PR #2352).
- Gauges may be on another stream; no wadeability verdict is given (`lib/streams.js`).
- #2406 notes a full local build was killed for low memory; CI was the full run.
- `CLAUDE.md` still calls Best day a Home tile; code shows an overlay opened via `bestDayOpen`.
