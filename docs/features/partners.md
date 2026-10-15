# Partners — the Discover tab

`tab==="discover"` in `ClimbMatch.jsx`. A three-way switch on `partnersMode` (`useState("partners")`):
`"partners"` (Find partners), `"crews"` (Join a crew), anything else = guides (Hire a guide, `DbGuides`/`Guides`).
This doc covers the partners mode (`lib/PartnerSearch.jsx`); crews and guides are only noted under Connections.

## 1. What it does today
- **Find someone by name** (DB only): a search box (min 2 chars) over real profiles.
- **Search for partners by** four modes: My Objectives, By Route, By Area, Anyone. By Route can pick from a search,
  your saved objectives, recently opened routes, crew routes, or a country > state > crag drill-down.
- **Climbers on ClimbMatch** (signed-in + DB): real, listed climbers (`profiles.discoverable`, on by default since 0195;
  opt out in Settings). Distance chips: Near my zip / Near me now (browser geolocation, rounded to 2 decimals) / Anywhere,
  with a 10-500 mi radius slider (steps of 5, debounced 400 ms). Others see a **distance only**, never a zip.
- **Filters** (all narrow the real lists as well as the example profiles): Discipline, Experience (level), Min trust
  (slider max 80), Speed match, Available to climb (Weekend AM / Weekend PM / Weekday AM / Weekday PM / Flexible), Max distance (examples).
  A filter that empties a list says so; a failed signals read says the list is not narrowed by experience/trust.
- **Rows**: real climbers render as `RealClimberRow` (match %, verified tick, shared objectives); example climbers render as full cards
  (match %, shared objectives, "Likely free your date" badge, "Plan <route> together", Connect, message, mutuals).
- Blocked climbers are filtered from every list, on both id spaces (seed numbers, real uuids, compared as strings).
- Sort for examples: match, distance, or trust; a climber free on a crew/objective date sorts first.

## 2. How it works
1. `App` mounts `PartnerSearch` lazily (`React.lazy` + `Suspense`) when `partnersMode==="partners"`, passing `mutuals`, `friendState`, `blocked`, `objDates`, `crews`, `routeById`, `onConnect`, `onViewProfile`, `onPlan`, `onInvite`, `initialClimb` (deep link from a route page), etc.
2. Real lists, each a React Query hook in `lib/db.js`: `useProfileSearch(q)` (by name); `useDiscoverableProfiles(meId,24)` (browse, `PARTNER_COLS`);
   `usePartnersNear(origin,radiusMi)` -> RPC `partners_near`; `usePartnersByObjective(routeIds,areaId,origin,radiusMi)` -> RPC `partners_by_objective`
   (My Objectives / By Route / By Area; with an origin it is also a radius search).
3. Origin: `_nearBy` = `nearBy || (zip ? "zip" : "any")`. Zip comes from `useMyZip` (owner-only `profile_zips` joined to `zip_centroids`); "here" comes from `hereLoc`. Neither is stored.
4. Per-row enrichment, one read each for every row on screen: `useObjectivesOfUsers` (objectives for match %), `useVerifiedUsers` (verified tick, 0232), `usePartnerSignals` (level + server trust via RPC `partner_signals`, only fetched when Experience or Min trust is active).
5. Client filtering: `_realFits(p)` applies discipline, availability (`availFits` against `availWeek`/`avail_week`) and speed (`paceOf`; an unrecorded pace is unknown, not a mismatch); `_vRows` also applies level and trust from `sigQ`.
   A climber who never set level/discipline/availability does not match a filter on it. Name search is not narrowed.
6. Match %: `compat(a,b)` in `ClimbMatchCore.jsx` (bounded terms `CMAX_DISC/GRADE/OBJ/VERIF/PACE/AVAIL`, summed to `COMPAT_MAX`, rescaled onto 20..99; see `docs/codebase/algorithms.md`).
   `RealClimberRow` feeds it real signals (0209): availability, `avail_week`, `hiking_speed_ft_hr`, objectives, verified.
7. Example list: `ALL_CLIMBERS.filter(...)` then sort by `compat`/`distMiles`/`vScore`. Availability helpers (`AVAIL_FILTER_OPTS`, `weekOf`, `availFits`, `availMatch`, `availOf`, `availLabel`) live in core;
   the week grid `weekOf(c)` falls back to coarse `availability` tags (flexible = every slot) when `availWeek` is absent.

## 3. Files
| File | What lives there |
|---|---|
| `lib/PartnerSearch.jsx` | `PartnerSearch` (modes, filters, near/objective/browse lists, example cards, route picker) |
| `ClimbMatch.jsx` | `partnersMode` state and mode switch, hero/help copy, mounts `PartnerSearch`, `CrewFinder`, `DbGuides`/`Guides`; `PARTNER_NUMBERS` |
| `ClimbMatchCore.jsx` | `compat`, `CMAX_*`/`COMPAT_*`, `RealClimberRow`, `AVAIL_OPTS`, `AVAIL_FILTER_OPTS`, `weekOf`, `availFits`, `availMatch`, `availOf`, `ALL_CLIMBERS`/`CLIMBERS`, `ME`, `distMiles`, `paceOf` |
| `lib/db.js` | `PARTNER_COLS`, `useDiscoverableProfiles`, `useProfileSearch`, `useMyZip`, `usePartnersNear`, `usePartnersByObjective`, `usePartnerSignals`, `useObjectivesOfUsers`, `useVerifiedUsers`, zip save/delete |
| `lib/EditProfileScreen.jsx` | Zip code field (owner-only, feeds the origin) |
| `supabase/migrations/0189, 0211, 0232, 0295` | RPCs and tables below |
| `docs/codebase/algorithms.md` | `compat()` design history |

## 4. Data
- **Supabase**: `profiles` (public read; `discoverable`, `level`, `avail_week`, `availability`, `hiking_speed_ft_hr`, grades), `profile_zips` (owner-only), `zip_centroids` (public Census gazetteer),
  objectives per user, `verification_records` (owner-only; read via 0232).
- **RPCs**: `partners_near` (0189; SECURITY DEFINER, distance rounded up to next 5 mi, radius floor 10 mi, only discoverable, never self, never users who blocked the caller);
  `partners_by_objective` (0211); `partner_signals(uuid[])` (0295; returns `level`, `trust_score` via `compute_trust_score`, max 200 rows, authenticated only).
- **Still seed / in-memory**: `ALL_CLIMBERS` example profiles (`CLIMBERS`/`FILLER_CLIMBERS`, gated by `DEMO_FILLERS`); mode, filters, radius and origin are component state (not persisted).
  Production has `FILLER_CLIMBERS` off, so real climbers are the only people there.

## 5. Connections
- **Profile**: `onViewProfile` opens a climber's profile/résumé; the zip is edited in `EditProfileScreen`; `discoverable` is a Settings privacy control.
- **Crews / Planner**: `onPlan(c,route)` starts a plan with that partner; `onInvite` invites to a crew; `crews` prop drives suggested crews on example cards and By Route picks; `objDates` drives the date-fit badge.
- **Social**: `friendState`/`onConnect` (connections), `mutuals`/`onShowMutuals`, `blocked` (block list), message button.
- **Route page**: `initialClimb` + `onConsumeInitial` open By Route preselected; `useRecentRouteIds` supplies recent picks.
- **Siblings in the tab**: `CrewFinder` (crews), `DbGuides`/`Guides` (guides).

## 6. Guards
`check:match-percent` (blend copy matches `compat()`), `check:real-profile-rows`, `check:mutual-friends`, `check:crew-member-readers`, `check:seed-only-surfaces`,
`check:dead-flag-gates`, `check:visibility-switches`, `check:schema` (db.js columns exist), `check:rls`, `check:read-failures` / `check:outage-flag-reach`, `check:screen-lists`, `check:clickable`,
`check:units`. Notes in `docs/guards/honesty-claims.md`, `seed-and-identity.md`, `social-and-crews.md`, `outage-and-read-failures.md`.
(Matched by grep of `docs/guards/` for PartnerSearch/partners_near/match-percent; not individually re-run.)

## 7. Last significant change
#2413 — every partner filter narrows the real lists; the ✓ Verified filter was removed (0295). Full history is in the PRs and the commit log for the files above.

## 8. Known gaps / open decisions
- `✓ Verified` filter intentionally absent until email verification means something (PR #2413 text).
- Name search (`useProfileSearch`) is not narrowed by any filter by design.
- Trust/experience filtering depends on one `partner_signals` read; on failure those two filters are skipped with an amber note.
- Distance disclosure is reduced, not zero (0189 states the rounding/floor trade-off).
- `AVAIL_OPTS` (profile editor, no weekend AM/PM split) differs from `AVAIL_FILTER_OPTS` (search); the search matches through `weekOf`.
