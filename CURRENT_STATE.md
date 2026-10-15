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
| Logbook, crews & Home | [docs/features/logbook-crews-home.md](docs/features/logbook-crews-home.md) | Objectives, logged climbs, crews and their Ready state, messaging, the Home dashboard |

Not yet documented here (add a doc when you next work in one): Groups, moderation/safety,
the catalog import pipeline (see [docs/BACKEND.md](docs/BACKEND.md)).

## Recent changes

Newest first. Keep about 15 lines; older entries live in the PRs and the commit log.

- **#2437 → #2446** Crag partners are found by AREA (0300, 0302, 0303): `partner_areas` listings and the My listed areas sheet; Partners opens on Near my areas; listing-based By Area; the area page's Partners here card; crag route pages and Logbook rows point at the crag; `CMAX_AREA` in the match %; crag-route objectives leave matching; a crew has one place (route or area) through `crewPlace()`.
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
