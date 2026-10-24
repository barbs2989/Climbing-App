# Partners — the Discover tab

`tab==="discover"` in `ClimbMatch.jsx`. A three-way switch on `partnersMode` (`useState("partners")`):
`"partners"` (Find partners), `"crews"` (Join a crew), anything else = guides (Hire a guide, `DbGuides`/`Guides`).
This doc covers the partners mode (`lib/PartnerSearch.jsx`); crews and guides are only noted under Connections.

## 1. What it does today
- **Crag partners are found by AREA** (owner decision 2026-10-15; 0300): a climber lists themselves at the crags, canyons or
  ranges they climb (`lib/MyPartnerAreas.jsx` — crag types, one optional date window, a note; a peak is refused), and others
  find them under any area that contains, equals or sits inside those (two-way ltree reach, with an ancestor listing
  reaching down only from below the state since 0311). Under Near my areas and By Area a listed climber's row carries
  *Plan a session at <area>*, which opens the Start-a-crew sheet at that area with them invited. Alpine, mountaineering,
  scrambling, ice and mixed stay route-based through saved objectives. A crag-route objective is a tick list, not a match signal.
- **Find someone by name** (DB only): a search box (min 2 chars) over real profiles.
- **Search for partners by** six modes: **Near my areas** (the signed-in default — climbers whose listings overlap yours, most
  in common first; with no listing, a one-tap "List me here" banner over the nearest-by-zip list), **Saved areas** (signed in: the
  areas you saved with Save area as the search — a chip row *All saved · N* plus one chip per saved crag, canyon, range or state;
  climbers listed at, inside, or across a wider area containing any of them, listed in the most of them first; saved peaks are left
  out, since alpine partners are found by route; at most the first 12 saved areas; with none saved it says how to save one; an
  *Edit saved areas* link opens Logbook › Saved › Areas), My Objectives (mountain
  objectives only), By Area (listing-based; the region dropdown plus a search box for any crag, canyon or range inside the chosen
  state), By Route (a crag route redirects to its area), Anyone. By Route can pick from a search, your saved objectives,
  recently opened routes (the 3 newest; up to 2 more behind a "Show N more" toggle), crew routes, or a country > state > crag drill-down.
- **Climbers on ClimbMatch** (signed-in + DB): real, listed climbers (`profiles.discoverable`, on by default since 0195;
  opt out in Settings). Distance chips: Near my zip / Near me now (browser geolocation, rounded to 2 decimals) / Anywhere,
  with a 10-500 mi radius slider (steps of 5, debounced 400 ms). Others see a **distance only**, never a zip.
- **Only climbers of my gender** (0359, 2026-10-24): a switch under *Climbers on ClimbMatch*'s distance chips, worded by
  your own gender (*Only women* / *Only men* / *Only non-binary climbers*), offered once you have set one (otherwise a line
  points to Edit profile). On, every real browse list shows only climbers who stated the same gender (`usePartnerGenders`, one
  read of `profiles.gender` for the rows on screen); someone who has not stated one is not shown. A loading or failed read
  shows nobody and says so, never everyone. Name search is not narrowed. Remembered on this device
  (`lib/partner-gender-pref.js`). The same filter RockBase and GoWith offer; there is no filter by any OTHER gender.
- **Filters** (all narrow the real lists as well as the example profiles): Discipline, Experience (level)
  (slider max 80), Speed match, Available to climb (Weekend AM / Weekend PM / Weekday AM / Weekday PM / Flexible), Max distance (examples).
  The panel starts CLOSED behind the Filters button (its badge counts the active filters), on Find partners and on Join a crew alike, so the results come first.
  A filter that empties a list says so; a failed signals read says the list is not narrowed by experience.
- **Rows**: real climbers render as `RealClimberRow` (match %, verified tick, shared objectives, and a "Listed at Hellgate · Sport · free Oct 18–19"
  line — "Listed across Utah" for an ancestor match); example climbers render as full cards
  (match %, shared objectives, "Likely free your date" badge, "Plan <route> together", Connect, message, mutuals).
  On both, every fact about the climber is primary white (`C.text`), down to the stats chips and the *Full Profile & Vouches*
  button at the bottom (owner, 2026-10-24: grey made the cards hard to read); grey (`C.textSub`) is kept only for a status note
  ("Scoring match…", "Not enough shared info…", "résumé private").
- Blocked climbers are filtered from every list, on both id spaces (seed numbers, real uuids, compared as strings).
- Sort for examples: match or distance; a climber free on a crew/objective date sorts first.

## 2. How it works
1. `App` mounts `PartnerSearch` lazily (`React.lazy` + `Suspense`) when `partnersMode==="partners"`, passing `mutuals`, `friendState`, `blocked`, `objDates`, `crews`, `routeById`, `onConnect`, `onViewProfile`, `onPlan`, `onInvite`, `initialClimb` (deep link from a route page), etc.
2. Real lists, each a React Query hook in `lib/db.js`: `useProfileSearch(q)` (by name); `useDiscoverableProfiles(meId,24)` (browse, `PARTNER_COLS`);
   `usePartnersNear(origin,radiusMi)` -> RPC `partners_near`; `usePartnersByObjective(routeIds,areaId,origin,radiusMi)` -> RPC `partners_by_objective`
   (My Objectives / By Route; since 0303 it counts only objectives whose route is not crag-family or climbs a peak; with an origin it is also a radius search);
   `usePartnersForMyAreas(origin,radiusMi)` -> RPC `partners_for_my_areas` (Near my areas); `usePartnersInArea(areaId,origin,radiusMi)` -> RPC `partners_in_area` (By Area, the area page, a crag route's Partners sub-tab);
   `usePartnersInAreas(areaIds,origin,radiusMi)` -> one `partners_in_area` read per saved area under the same query key, merged by climber with `via_area_ids` (Saved areas; `SAVED_SEARCH_LIM` = 12).
   The saved list (`bookmarks`, owner-only `saved_areas`) never leaves the viewer: only climbers who LISTED themselves come back, so Saved areas exposes nothing a By Area search does not.
   Listings: `useMyPartnerAreas`, `savePartnerArea`, `removePartnerArea` (owner-only table `partner_areas`), `usePartnerAreaCounts` -> RPC `partner_area_counts`.
3. Origin: `_nearBy` = `nearBy || (zip ? "zip" : "any")`. Zip comes from `useMyZip` (owner-only `profile_zips` joined to `zip_centroids`); "here" comes from `hereLoc`. Neither is stored.
4. Per-row enrichment, one read each for every row on screen: `useMatchObjectivesOfUsers` (the objectives that still count for a match — RPC `match_objectives_of_users`), `usePartnerAreasOfUsers` (their listed areas — RPC `partner_areas_of_users`), `useVerifiedUsers` (verified tick, 0232), `usePartnerSignals` (level via RPC `partner_signals`, only fetched when Experience is active).
5. Client filtering: `_realFits(p)` applies discipline, availability (`availFits` against `availWeek`/`avail_week`) and speed (`paceOf`; an unrecorded pace is unknown, not a mismatch); `_vRows` also applies level from `sigQ`.
   A climber who never set level/discipline/availability does not match a filter on it. Name search is not narrowed.
6. Match %: `compat(a,b)` in `ClimbMatchCore.jsx` (bounded terms `CMAX_DISC/GRADE/OBJ/VERIF/PACE/AVAIL/AREA`, summed to `COMPAT_MAX`, rescaled onto 20..99; see `docs/codebase/algorithms.md`).
   **HOW YOU MATCH** (the profile's COMPATIBILITY WITH YOU panel, `FullProfile`): one line per term, heaviest first, each marked ✓ counts / ~ partly / ✕ does not / ? not said by both. Built by `compatWhy()` from `compatParts()`, the same rows `compat()` sums, so the explanation cannot disagree with the number. The profile scores with ME's MOUNTAIN objectives (`ME.matchObjectiveIds`), as the partner row does — it used to use `ME.objectiveIds`, so a crag-route objective could make one climber read two different match %s.
   `RealClimberRow` feeds it real signals (0209): availability, `avail_week`, `hiking_speed_ft_hr`, match objectives, listed-area paths (`partnerAreaPaths`, `areaPathsOverlap`), verified.
   The viewer's side is `ME.matchObjectiveIds` (the wishlist minus crag-family routes, `CRAG_CATS` + `catOf`) plus `ME.partnerAreaPaths`.
7. Example list: `ALL_CLIMBERS.filter(...)` then sort by `compat`/`distMiles`/`vScore`. Availability helpers (`AVAIL_FILTER_OPTS`, `weekOf`, `availFits`, `availMatch`, `availOf`, `availLabel`) live in core;
   the week grid `weekOf(c)` falls back to coarse `availability` tags (flexible = every slot) when `availWeek` is absent.

## 3. Files
| File | What lives there |
|---|---|
| `lib/PartnerSearch.jsx` | `PartnerSearch` (modes incl. Near my areas, Saved areas (`savedAreaIds`, `onOpenSaved`, `SAVED_SEARCH_LIM`) and listing-based By Area, filters, near/objective/area/browse lists, example cards, route picker, `initialArea` deep link) |
| `lib/MyPartnerAreas.jsx` | `MyPartnerAreas` — the My listed areas screen (add/edit/remove a listing, `windowText`): a full-screen view in the 520px column, search first (pre-set to the home state via `useMyHomeStatePaths`), one-tap suggestions from the climber's own crag climbs and saved areas (`suggestIds`, a wall offered as its crag), date presets This weekend / Next weekend / Pick dates, an ended window flagged on its card |
| `ClimbMatch.jsx` | `partnersMode` state and mode switch, hero/help copy, mounts `PartnerSearch`, `CrewFinder`, `DbGuides`/`Guides`, `MyPartnerAreas`; `myAreasOpen`, `openMyAreas`, `onFindPartnersInArea`, `ME.matchObjectiveIds` |
| `ClimbMatchCore.jsx` | `compat`, `compatParts`, `compatWhy`, `CMAX_*`/`COMPAT_*`, `CMAX_AREA`, `areaPathsOverlap`, `CRAG_CATS`, `AVAIL_OPTS`, `AVAIL_FILTER_OPTS`, `weekOf`, `availFits`, `availMatch`, `availOf`, `ALL_CLIMBERS`/`CLIMBERS`, `ME`, `distMiles`, `paceOf`, `PARTNER_NUMBERS` (also read by `lib/Help.jsx`) |
| `src/components/RealClimberRow.tsx` | `RealClimberRow` — the browse and name-search row for a REAL profile: match % or its refusal, ✓ Verified, the listed-areas line, pace and discipline chips |
| `lib/partner-gender-pref.js` | `partnersMyGenderPref`, `savePartnersMyGender` |
| `lib/db.js` | `PARTNER_COLS`, `usePartnerGenders`, `useDiscoverableProfiles`, `useProfileSearch`, `useMyZip`, `usePartnersNear`, `usePartnersByObjective`, `usePartnerSignals`, `useMatchObjectivesOfUsers`, `useVerifiedUsers`, `useMyPartnerAreas`, `savePartnerArea`, `removePartnerArea`, `usePartnersInArea`, `usePartnersInAreas`, `usePartnersForMyAreas`, `usePartnerAreaCounts`, `usePartnerAreasOfUsers`, zip save/delete |
| `lib/EditProfileScreen.jsx` | Zip code field (owner-only, feeds the origin; a typed zip is checked live by `useZipCentroid`). The home city is a label only — it places nobody |
| `supabase/migrations/0189, 0211, 0232, 0295, 0300, 0303, 0311` | RPCs and tables below |
| `docs/codebase/algorithms.md` | `compat()` design history |

## 4. Data
- **Supabase**: `profiles` (public read; `discoverable`, `level`, `avail_week`, `availability`, `hiking_speed_ft_hr`, grades), `profile_zips` (owner-only), `zip_centroids` (public Census gazetteer),
  objectives per user, `verification_records` (owner-only; read via 0232).
- **`partner_areas`** (0300): one row per climber and area (`disciplines text[]` within the crag family, one optional `free_from`/`free_to` window, `note`);
  owner-only RLS; a trigger refuses peak/world/country and caps 30 per climber. An expired window reads back as no window.
- **RPCs**: `partners_near` (0189; SECURITY DEFINER, distance rounded up to next 5 mi, radius floor 10 mi, only discoverable, never self, never users who blocked the caller);
  `partners_by_objective` (0211, re-created 0303 with the match rule); `partner_signals(uuid[])` (0295; returns `level` and `climbing_since` — its `trust_score` column was dropped in 0335 — max 200 rows, authenticated only);
  `partners_in_area`, `partners_for_my_areas`, `partner_area_counts`, `partner_areas_of_users`, `match_objectives_of_users` (0300; same visibility rule as `partners_near`; reach is `path <@ T or (path @> T and the listing is below the state)` since 0311 — a state listing answers a search at the state only).
- **Still seed / in-memory**: `ALL_CLIMBERS` example profiles (`CLIMBERS`/`FILLER_CLIMBERS`, gated by `DEMO_FILLERS`); mode, filters, radius and origin are component state (not persisted).
  Production has `FILLER_CLIMBERS` off, so real climbers are the only people there.

## 5. Connections
- **Profile**: `onViewProfile` opens a climber's profile/résumé; the zip is edited in `EditProfileScreen`; `discoverable` is a Settings privacy control.
- **Crews / Planner**: `onPlan(c,route)` starts a plan with that partner; `onInvite` invites to a crew; `crews` prop drives suggested crews on example cards and By Route picks; `objDates` drives the date-fit badge.
- **Social**: `friendState`/`onConnect` (connections), `mutuals`/`onShowMutuals`, `blocked` (block list), message button.
  The card's friend button has one look per state: **+ Add friend** filled blue, **✓ Accept friend** filled green, **Requested · tap to undo** amber outline (tapping it again withdraws, after a confirm), **✓ Friends** quiet green outline. A sent request also lists under Crew › Requests › Waiting on others with Withdraw.
- **Route page**: `initialClimb` + `onConsumeInitial` open By Route preselected; `useRecentRouteIds` supplies recent picks. `initialArea` + `onConsumeInitialArea`
  open By Area on an area (from the area page's "See all", a crag route's Partners sub-tab, a Logbook crag row — all through App's `onFindPartnersInArea`).
- **Menu**: the *Yours* group has a **Listed areas · N** tile (`openMyAreas`; signed out it asks to sign in).
- **Area page / crews pane**: `PartnersHereCard` (`docs/features/maps-and-area-browser.md`) and the crews pane both open the My listed areas sheet (`openMyAreas`).
- **Siblings in the tab**: `CrewFinder` (crews), `DbGuides`/`Guides` (guides).

## 6. Guards
`check:partner-areas` (two-way reach in every listing reader, the match rule in both search functions, one crag list, owner-only table + definer readers, no raw objectives hook),
`check:match-percent` (blend copy matches `compat()`), `check:real-profile-rows`, `check:mutual-friends`, `check:crew-member-readers`, `check:seed-only-surfaces`,
`check:dead-flag-gates`, `check:visibility-switches`, `check:schema` (db.js columns exist), `check:rls`, `check:read-failures` / `check:outage-flag-reach`, `check:screen-lists`, `check:clickable`,
`check:units`. Notes in `docs/guards/honesty-claims.md`, `seed-and-identity.md`, `social-and-crews.md`, `outage-and-read-failures.md`.
(Matched by grep of `docs/guards/` for PartnerSearch/partners_near/match-percent; not individually re-run.)

## 7. Last significant change
Find partners and crews by SAVED areas: Find partners has a *Saved areas* mode (chips: all saved areas, or one), and Join a crew's *My climbs & areas* also matches a session at, or inside, an area you saved ("★ In an area you saved").
Partner-area reach stops at the state (0311): a listing at Utah no longer appears on every Utah crag; *Plan a session at <area>* on listed climbers' rows under Near my areas / By Area; the new-climber journey asserts friend removal against the Friends rows, not the whole page.
Real climbers, batch 3: real friends carry their match objectives and ✓ (`useMatchObjectivesOfUsers` / `useVerifiedUsers` in App's connections hydration), so shared-objective counts, "You both want", the DM banner and suggested crews work for them; Leaderboards shows a real row's ✓; the signed-in header counts "example climbers" and the real-list copy says the filters narrow it.
#2437 / #2444 / #2445 / #2446 (0300, 0303) — crag partners are found by AREA: `partner_areas` listings, the My listed areas sheet, Near my areas as the signed-in default,
listing-based By Area, the area page's Partners here card, crag route pages and Logbook rows pointing at the crag, `CMAX_AREA` in the match %, and crag-route objectives
leaving matching. Before that #2413 — every partner filter narrows the real lists; the ✓ Verified filter was removed (0295).

## 8. Known gaps / open decisions
- `✓ Verified` filter intentionally absent until email verification means something (PR #2413 text).
- Name search (`useProfileSearch`) is not narrowed by any filter by design.
- Experience filtering depends on one `partner_signals` read; on failure it is skipped with an amber note.
- Distance disclosure is reduced, not zero (0189 states the rounding/floor trade-off).
- *When you're free to climb* (Menu card, Profile tab, the editor's quick row, and another climber's profile) offers the same four groups as the search: `AVAIL_SLOT_OPTS` — Weekday mornings, Weekday evenings, Weekend mornings, Weekend evenings. Each is a block of the week grid (`availSlotOn`/`availSlotToggle`); `availTagsOf` derives the coarse `profiles.availability` tags from the grid, so no migration was needed. `AVAIL_FILTER_OPTS` is those four plus Flexible; the search matches through `weekOf`. `AVAIL_OPTS` survives only as the label table for the coarse tags (`compatWhy`).
