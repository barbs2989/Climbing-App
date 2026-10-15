# ClimbMatch — current state

What each area of the app does **now**, where its code lives, and what changed recently.
Architecture, commands and working rules are in [CLAUDE.md](CLAUDE.md); this file does not repeat them.

## Area docs

Each doc covers: what the area does today · how it works (data flow) · files and key symbols ·
database tables · connections to other areas · the guards that protect it · known gaps.

| Area | Doc | Covers |
|---|---|---|
| Partners | [docs/features/partners.md](docs/features/partners.md) | Discover tab: partner search (zip + radius), filters, availability, match %, crews/guides modes |
| Conditions | [docs/features/conditions.md](docs/features/conditions.md) | Route page "Conditions" tab: crag score, alpine flags + start time, "Your conditions", Best day to climb |
| Route page | [docs/features/route-page.md](docs/features/route-page.md) | `RouteDetail.jsx`: loading a route, sub-tabs, stars/ratings, crowd counts, contributions, photos, Planner |
| Maps & area browser | [docs/features/maps-and-area-browser.md](docs/features/maps-and-area-browser.md) | Climbs tab: area tree, area map, place search, filters, search normalisation, route map |
| Profile & settings | [docs/features/profile-and-settings.md](docs/features/profile-and-settings.md) | Profile, résumé, trust/verification, photos, units/date/visibility/notification settings |
| Route quality control | [docs/features/route-quality-control.md](docs/features/route-quality-control.md) | Held edits and owner review, per-field confidence and locks, strikes and contribution standing, flags, notices |
| Logbook, crews & Home | [docs/features/logbook-crews-home.md](docs/features/logbook-crews-home.md) | Objectives, logged climbs, crews and their Ready state, messaging, the Home dashboard |

Not yet documented here (add a doc when you next work in one): Groups, moderation/safety,
the catalog import pipeline (see [docs/BACKEND.md](docs/BACKEND.md)).

## Recent changes

Newest first. Keep about 15 lines; older entries live in the PRs and the commit log.

- **Area pages** (0304): ABOUT, AREA FACTS, CLIMBS HERE (climbs per discipline, over the subtree) + GRADE SPREAD, GETTING THERE, TOP RATED, and **Suggest an edit** on crags/peaks/walls — seven fields, applied by trigger, counted by Ranks (`lib/AreaPageSections.jsx`, `lib/AreaSuggestFix.jsx`, `lib/areaFields.js`).
- **Crag parking can be added and edited**: on sport/trad/bouldering/aid/top-rope routes, *Add parking* used to open a text-only section with no pin. It now opens the pin editor (map + lat/lng, the Trailhead type shown as *Parking*), and a parking pin already on file gets an edit pencil.
- **Route quality control, step 1** (0307–0309): every field edit is held for the owner; per-field confidence levels with a server-side lock on high; rejection strikes → warned/restricted/banned; route flags; in-app notices; `check:contrib-field-columns`.
- **Trip report shows only what the reporter entered**, sectioned like the log form; the route's grade/gain/distance tiles and its GPS line are gone from it, a reporter's own track is read on open (`useLogTrack`), the route page's *Recently climbed* row opens the whole report, and the log form offers *Add topo photo* (`lib/TripReport.jsx`, `lib/LogAscent.jsx`).
- **Real climbers, batch 3**: real names stay private everywhere (comments, mentions, crew chips, contributors, presence, résumé, share card, guides' reviews); real friends' objectives, ✓, activity feed and kudos work.
- **Area page order**: areas/climbs list → *Don’t see a climb?* → suggested climbs → nearby peaks → Top contributors → Discussion. Discussion now renders on areas with no coordinate (Florida’s Artificial Boulders); *Partners here*’s dates/types control is a real card button (it had no style at all).
- **RACK is rack-only, every state** — ~400 WA + ~140 other-state routes re-homed (ice axe, crampons, helmet, boots out of `detailed_rack`/`pro_needs`/`rack` into `what_to_bring`), `DISC_RACK` stripped to protection and ropes, `routeRackFor` splits every source and `rackLeftovers` feeds GEAR & ESSENTIALS; `audit:rack-items`.
- **Objectives chips** Alpine is the left-most discipline chip; Mountaineering and Aid are their own chips instead of folding into Alpine and Trad (`lib/ListsManager.jsx`).
- **PR5** `TrustBadge` extracted to `src/components/TrustBadge.tsx` (five consumers plus core itself, which imports it back).
- **#2457** `DiscBadges` extracted to `src/components/DiscBadges.tsx` (consumers `lib/Calendar.jsx`, `lib/GiveVouch.jsx`).
- **#2449** `DiscBadge` extracted to `src/components/DiscBadge.tsx` (core imports it back for `DiscBadges`; the guard stitch drops a parent's own import of a moved file).
- **Email verification** ✓ needs an emailed code (or the link in it), checked server-side (0306); the 2 autoconfirm ✓s were reset.
- **#2437 → #2446** Crag partners are found by AREA (0300, 0302, 0303): `partner_areas` listings and the My listed areas sheet; Partners opens on Near my areas; listing-based By Area; the area page's Partners here card; crag route pages and Logbook rows point at the crag; `CMAX_AREA` in the match %; crag-route objectives leave matching; a crew has one place (route or area) through `crewPlace()`; crag SESSIONS (area crews) are started from the area page, the Crews tab and a past crew (`StartCrewSheet`), found under "My climbs & areas" / By Area, and listed on a crag route's Partners sub-tab.
- **#2427** TypeScript + `src/components/`: strict `tsconfig`, `check:types` in the build, guards made TS-aware, `measure:guard-reach`; first extraction `RiskBadge` (procedure: `docs/refactor-progress.md`).
- **#2415** Résumé Experience: Sport and Trad groups; Scrambling replaces Other.
- **#2416** Area map place search covers Canada: provinces, towns, postal codes.
- **#2413** Partner search: Experience, Min trust, Speed match and Discipline narrow the real lists (`partner_signals`, 0295); ✓ Verified filter removed; Min trust max 80.
- **#2411** Maps: zoom buttons clear the layer row; your location dot draws above area bubbles.
- **#2409** Objectives filter: Crag split into Sport and Trad; Other renamed Scrambling.
- **#2408** Logbook Saved: Pinned states card removed (Home already shows it).
- **#2407** Route header stars persist, count once per climber, feed the route rating (0294).
- **#2406** Conditions: graded wet-rock caps (`WET_BANDS`), faster `DRY_RATE` fitted to CragReport, rain amount and timing first.
- **#2405** Partner availability: Weekend AM / Weekend PM; the filter narrows real lists.
- **#2403** Every crowd number says how many climbers stand behind it; agreed DB corrections now reach the page.
- **#2395** Crews: vouching for past crews, honest Archive/Clear, serialised gear writes (0291).
- **#2390** Conditions audit: visibility units, DST-aware clocks, chart pinning, touch targets.
- **#2352** Alpine conditions: fog hours, snowfall and snow level, stream flow, report freshness.
- **#2336** Plan card is Full Trip Time; glaciated alpine routes keep glacier conditions.

## Keeping this current

- A PR that changes how an area works **edits that area's doc in the same PR**, and adds one line
  to *Recent changes* above (drop the oldest past ~15).
- A new area gets a new doc and a row in the table above.
- `npm run check:feature-docs` (in the build) fails if a doc names a file or symbol that no longer
  exists, or if a doc and this index disagree. It cannot tell whether a *description* is still
  right — that half is the rule above.
