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
| App shell & layout | [docs/features/app-shell-and-layout.md](docs/features/app-shell-and-layout.md) | The app column, the primary nav (bottom bar on phones, left sidebar on desktop), the boot placeholder |
| Ranks | [docs/features/ranks.md](docs/features/ranks.md) | Leaderboards tab: scopes, climbing types, boards, how each metric is scored (`leaderboard()`), the table, your standing |

Not yet documented here (add a doc when you next work in one): Groups, moderation/safety,
the catalog import pipeline (see [docs/BACKEND.md](docs/BACKEND.md)).

## Recent changes

Newest first. Keep about 15 lines; older entries live in the PRs and the commit log.

- **Desktop layout, phase 1**: at 1024px and wider the bottom tab bar becomes a fixed left sidebar and the column widens from 520 to 720px, the two centred together. Phones are unchanged. See `docs/features/app-shell-and-layout.md`.
- **Quick log**: the route page offers *✓ Quick log* beside *Full log* — pick a style or outcome, the date, an optional rating, save. The rest can be added later from the logbook. A crew quick log no longer writes two `climb_logs` rows. See `docs/features/logbook-crews-home.md`.
- **Route edits: an empty field fills at once, two climbers agreeing change a filled one** (0325): the database approves the edit itself; the edit sheet shows other climbers' waiting suggestions with an Agree button; anything else still waits for the owner. Area edits are still held.
- Route page: the *Brought different gear? Suggest a gear update* box sits directly under the RACK card (alpine GEAR section, before ROPEWORK and GEAR & ESSENTIALS; crag Overview, under its RACK card) instead of at the end of the gear section or the page.
- **Best day on Home again + Menu tiles**: Home shows the Best day to climb tile right under Jump back in (it also stays in the Menu). The Menu's Plan & log adds **Downloads** (scrolls Home to the pinned/downloaded states card, `#pinned-downloads`) and **Hire a guide** (Partners in guides mode).
- Route page: the duplicate *+ Add start location* button on Safety is gone; start of climb is filed from Add or fix info and the log form, shown on Overview.
- **Profile tabs** The Profile screen splits under its header into Profile · Activity · Review (admins): one long scroll became three short views; jumps into a section open its tab.
- **Résumé past climbs: style fits the discipline**: *Add a past climb* on the résumé offered Lead / Follow / Sent / Summit / Top rope / Solo for every discipline; it now lists Mountain Project's styles for the chosen discipline (`RESUME_STYLES`) — a scramble offers Summit / Completed / Solo, a boulder Send / Flash.
- **`npm run lint` + `npm run type-check`** (tooling, no screen changes): ESLint (`eslint.config.js`) holds unused variables, `any` and hook dependency arrays at zero for new code, in the build; findings already in the code are held in `eslint-suppressions.json`, which only shrinks. TypeScript strict gained `noUnusedParameters`. Run both before finalizing any feature.
- **Best day to climb scores saved areas**: a saved crag, or a saved region where crag climbs are at least half of what it holds, is scored at its own location beside your saved crag climbs; tapping it opens the area. See `docs/features/conditions.md`.
- **Emergency & rescue is the climb's own county**: the Safety tab card names the county the climb sits in (Castleton Tower → Grand County, Utah) and shows only that county's sheriff line, not every Utah county; it has an Edit pencil into *Add or fix info*; every route-page pencil crashed the screen since #2467 (`openFix` called itself) and is fixed (`lib/rescueCounty.js`).
- **Challenges count honestly, and other climbers' show**: *Climb 100 pitches* and the *50 pitches* badge (`pitchesClimbed`) no longer add a pitch for a turned-around attempt, a boulder, a walk-up or a route that has not loaded; another climber's profile now shows *Their challenges* (climbs this year, pitches, conditions, streak) from the logs you may read, beside their lists and badges; the vouch and catch rows show only where they were measured; *Bulger bagger* uses the peak roster like The Bulgers card.
- **Saved areas and peaks follow the account** (0322): Save area / Save peak and Logbook › Saved's ✕ write `saved_areas`, so unsaving on one device unsaves the area page on every device; the device list stays as the offline copy, and earlier device-only saves upload on first sign-in there.
- **A group's members are for its members** (0318): a climber who is not in a group sees its member count, never who is in it — no roster, no Moderators strip, no "N of your friends are in this group". RLS no longer lets anyone read a public group's roster; the count comes from `group_member_counts()` (numbers only). The Menu's **Wildfire map** tile is gone; the fire map still opens from an area page and a route's Safety tab.
- **Ranks audit (0323)**: send/onsight points weigh V, WI and M grades on one rock-equivalent scale (a V12 scored like a 5.12), a top-rope or follow scores a letter lower, conditions reports count nowhere, Vert counts finished climbs and a crag route's length, and every type board reads that type's Logged/Days/Vert/Classics/Peaks. Top rope, Mixed and Aid get boards; zero scores are unranked; ties share a rank; the list is a table with ⚑ in its own column; the scoring text moved to Help › Ranks behind the header's `?`. Ice/mixed/top-rope/aid log forms offer the roped ticks.
- **Crag map section is TRAIL TO THE CRAG**: on sport/trad/bouldering/aid/top-rope routes the map section (was ROUTE TRACK) says the GPX line is the walk from parking to the base of the crag (on to this climb if it sits apart), invites *Add the trail*, and the submit sheet says where to start and stop recording. Crags carry no waypoints: the pin editor there is *Parking spot* only.
- **Listed areas in the Menu**: a *Listed areas · N* tile under Yours; the My listed areas sheet became a full screen with search first (home state pre-set), one-tap suggestions from your own crag climbs and saved areas, This weekend / Next weekend date presets, and an ended window flagged on its card. See `docs/features/partners.md`.
- **No ⚑ Flag button on the route page's section headings**: `SL`/`CardHead` show only the confidence level now; flagging stays on a locked field's pencil and on the *Add or fix info* sheet's rows (`ClimbMatchCore.jsx`).
- **Base of the climb sits under the route map**: the check-in card moved from far down Overview to right under ROUTE TRACK; check-in spots are drawn on the map as ringed Base pins; *How far am I from the base?* gives a live distance and direction to the start, and the route's location note once you are there (`lib/baseCheckin.js` `baseGuide`).
- **Real climbers, batch 4**: a real crew's safety questionnaire and safety-ready marks persist, private (0314: owner-only answers, server counts, anonymous flags); another climber's belay record (0315).
- **Route quality control, steps 2–5**: seven more editable fields + `check:editable-coverage` (0317), a flag link on the log form; per-pitch "Edit this pitch", pitch reordering, the rappel-table editor (`rappelDetail`); the owner's queues in the Me tab (held edits with clusters and diffs, flags, contributor standing), the climber's standing notice on the edit sheet, confidence chips (High · locked / Medium / Low) with a ⚑ Flag on every editable section, and the flag sheet (`lib/RouteQualityQueues.jsx`, `lib/confidence.jsx`, `lib/FlagRouteInfo.jsx`).
- **Area edits are held for the owner** (0319): the same review queue, notices and strikes as route edits; approval writes the `areas` column. One contribution rule, not two.
- **Area pages** (0304): ABOUT, AREA FACTS, CLIMBS HERE (climbs per discipline, over the subtree) + GRADE SPREAD, GETTING THERE, TOP RATED, and **Suggest an edit** on crags/peaks/walls — seven fields, applied by trigger, counted by Ranks (`lib/AreaPageSections.jsx`, `lib/AreaSuggestFix.jsx`, `lib/areaFields.js`).
- **Crag parking can be added and edited**: on sport/trad/bouldering/aid/top-rope routes, *Add parking* used to open a text-only section with no pin. It now opens the pin editor (map + lat/lng, the Trailhead type shown as *Parking*), and a parking pin already on file gets an edit pencil.
- **Route quality control, step 1** (0307–0309): every field edit is held for the owner; per-field confidence levels with a server-side lock on high; rejection strikes → warned/restricted/banned; route flags; in-app notices; `check:contrib-field-columns`.
- **Trip report follow-ups**: the write-up is one section so the report's seven headings match the log form's; the descent draws the three legs as a bar with the total; Avy: Low/Moderate file as readings, not hazards; typed partner names get a "can't confirm" note in the form; a topo line can be named and the name shows on the thumbnail and in the viewer (`lib/TripReport.jsx`, `lib/LogAscent.jsx`, `RouteDetail.jsx`).
- **Trip report shows only what the reporter entered**, sectioned like the log form; the route's grade/gain/distance tiles and its GPS line are gone from it, a reporter's own track is read on open (`useLogTrack`), the route page's *Recently climbed* row opens the whole report, and the log form offers *Add topo photo* (`lib/TripReport.jsx`, `lib/LogAscent.jsx`).
- **Partner-area reach stops at the state** (0311): a listing at Utah no longer surfaces on every Utah crag — an ancestor listing reaches down only from below the state. Listed climbers' rows under Near my areas / By Area carry *Plan a session at <area>* (Start-a-crew sheet, that climber invited). `check:new-climber-journey` asserts friend removal against the Friends rows, not the whole page (it was red on a "People you may know" suggestion).
- **Real climbers, batch 3**: real names stay private everywhere (comments, mentions, crew chips, contributors, presence, résumé, share card, guides' reviews); real friends' objectives, ✓, activity feed and kudos work.
- **Area page order**: areas/climbs list → *Don’t see a climb?* → suggested climbs → nearby peaks → Top contributors → Discussion. Discussion now renders on areas with no coordinate (Florida’s Artificial Boulders); *Partners here*’s dates/types control is a real card button (it had no style at all).
- **RACK is rack-only, every state** — ~400 WA + ~140 other-state routes re-homed (ice axe, crampons, helmet, boots out of `detailed_rack`/`pro_needs`/`rack` into `what_to_bring`), `DISC_RACK` stripped to protection and ropes, `routeRackFor` splits every source and `rackLeftovers` feeds GEAR & ESSENTIALS; `audit:rack-items`.
- **Objectives chips** Alpine is the left-most discipline chip; Mountaineering and Aid are their own chips instead of folding into Alpine and Trad (`lib/ListsManager.jsx`).
- **PR14** `SwipeRow` extracted to `src/components/SwipeRow.tsx` (three consumers; core never rendered it, so no import back).
- **#2495** `GPXMap` extracted to `src/components/GPXMap.tsx` (three consumers; core never rendered it, so no import back; Leaflet's `window.L` declared once in `src/types/`).
- **#2490** `Av` extracted to `src/components/Av.tsx` (fifteen consumers plus core itself, which imports it back).
- **#2489** `DiscIcon` extracted to `src/components/DiscIcon.tsx` (thirteen consumers plus core itself, which imports it back).
- **#2484** `ElevChart` extracted to `src/components/ElevChart.tsx` (one consumer; core never rendered it, so no import back); CLAUDE.md's band-2 list brought up to date.
- **#2478** `ActionIcon` extracted to `src/components/ActionIcon.tsx` (fifteen consumers plus core itself, which imports it back; `check:field-renders` now imports the file).
- **#2472** `Pill` extracted to `src/components/Pill.tsx` (four consumers, the three earlier `.tsx` components, and core itself, which imports it back).
- **#2468** `CountUp` extracted to `src/components/CountUp.tsx` (three consumers plus core itself, which imports it back).
- **#2466** `Lbl` extracted to `src/components/Lbl.tsx` (ten consumers plus core itself, which imports it back).
- **#2463** `TrustBadge` extracted to `src/components/TrustBadge.tsx` (five consumers plus core itself, which imports it back).
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
