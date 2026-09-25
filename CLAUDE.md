# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
It is loaded into every session, so it holds only what nearly every task needs: the command index,
the architecture, and the working rules. The detail lives in `docs/`:

| Read this | Before you… |
|---|---|
| [docs/guards/README.md](docs/guards/README.md) | change, remove, reason about, or add any `check:` / `audit:` script (one notes file per area) |
| [docs/codebase/supabase-scripts.md](docs/codebase/supabase-scripts.md) | write a script that reads or writes Supabase, or run a DB guard from a worktree |
| [docs/codebase/hand-written-sql.md](docs/codebase/hand-written-sql.md) | hand the user SQL to paste into the Supabase SQL Editor |
| [docs/codebase/route-identity.md](docs/codebase/route-identity.md) | resolve, dedupe, import or write to route rows by id |
| [docs/codebase/enrichment-prose.md](docs/codebase/enrichment-prose.md) | write researched text into any existing `routes` column |
| [docs/codebase/deploy-and-icons.md](docs/codebase/deploy-and-icons.md) | touch `public/`, the manifest, the icons, or the Pages base path |
| [docs/codebase/algorithms.md](docs/codebase/algorithms.md) | change the partner match score (`compat()`) |
| [docs/BACKEND.md](docs/BACKEND.md) | work on the schema or the catalog pipeline (its "still simulated" lists run stale — re-derive from `lib/db.js`) |

## Commands

The index is grouped by area; each heading names the notes file for the guards under it.

```bash
# ── Build and run ──
npm install        # install deps (React 18 + Vite)
npm run dev        # local dev server with HMR
npm run build      # production build to dist/ — runs every guard in build:guards first (concurrently), then vite
npm run preview    # serve the built dist/ locally

# ── Guard infrastructure — notes: docs/guards/infrastructure.md ──
npm run check:drift# does the live site actually serve the current tip of main?
npm run check:ci-cancel # can a guard running on main be cancelled by the next merge? (in build)
npm run check:quiet-box-wiring # every BROWSER probe refuses an oversubscribed box BEFORE launching one (in build)
npm run check:guard-wiring # every guard RUNS, is named here, and this file agrees about its CREDENTIAL (in build)
npm run check:action-versions # no workflow pins an action below the version we moved to (in build)

# ── Static code guards — notes: docs/guards/static-code.md ──
npm run check:refs # identifiers referenced but never bound (runs in build + CI)
npm run check:jsx-comments # a comment in JSX children position renders to the USER (in build)
npm run check:no-nul  # no source file git would treat as BINARY, so diffs stay readable (in build)
npm run check:script-roots # no script reads the app files of somebody ELSE's worktree (in build)
npm run check:dup-attrs # a declaration written TWICE: the later wins, the earlier is dead (in build)
npm run check:bottom-panels # a fixed panel at the bottom must RESERVE the space it covers (in build)
npm run check:hooks# React hooks-rules violations (runs in build + CI)
npm run check:dead-props # props passed or declared but never read (runs in build + CI)
npm run check:boot # index.html's boot placeholder AND the Help tour still match the real nav
npm run check:screen-lists # every guard walks EVERY tab the app has, and no tab it hasn't (in build)
npm run check:icons # the app declares an icon, and every icon it names exists (in build)
npm run check:toast-reachable # every screen App returns can SHOW a toast (in build)
npm run check:clickable # no NEW control that only a mouse can operate (in build)
npm run check:overlays # every overlay inside #appscroll is portalled to document.body (in build)
npm run check:overlay-width-cap # a full-screen view must be drawn in the app's own 520px column (in build)
npm run check:disc-labels # one spelling per discipline, everywhere (in build)
npm run check:a11y-names # every control a screen reader reaches has a name (in build)
npm run check:flex-scroll # no scroll pane in a flex column that cannot actually scroll (in build)
npm run check:dialog-dismiss # every dialog can be left without guessing (in build)
npm run check:popup-chrome # ...and every popup's ✕ and ← Back look the SAME — lib/popupChrome.js (in build)
npm run check:doc-paths # every file path this document names still EXISTS (in build)
npm run check:injection-anchors # every INJECTION CASE still LANDS, so a guard's proof cannot rot (in build)
npm run check:zindex # the toast stays above every overlay, so an error can be read (in build)

# ── Browser walks — notes: docs/guards/browser-walks.md ──
npm run check:ui   # drives the real app in Chrome and asserts per-screen invariants
npm run check:overlay-discovery # every modal the app declares is still reachable by the guards (in build)
npm run check:zero # walks every tab and all 27 modals as a BRAND-NEW account sees them
npm run check:signed-in # walks a REAL signed-in account that owns a crew and a group
npm run check:message-delivery # a message from a SECOND real account arrives, and names its sender
npm run check:block-guarantees # blocked: cannot read, message or crew-invite you (2 real accounts; hand-run)
npm run check:new-climber-journey # a new climber onboards, opens a crew, removes a friend — did any of it reach the DB? (hand-run)
npm run check:overlay-scroll # no overlay pane may chain its scroll to the page behind
npm run check:a11y-badges # no control announces two fragments welded into one token
npm run check:selected-state # a control that LOOKS selected must SAY it is selected
npm run check:control-names # a control says WHAT IT IS; a switch says what it is SET TO (in build)
npm run check:overflow # nothing runs off the right-hand edge of a 390px phone
npm run check:anniversary # the climb-anniversary notification still reaches a screen

# ── Outages and failed reads — notes: docs/guards/outage-and-read-failures.md ──
npm run check:verification-fallback # a failed verification read must not un-verify you (in build)
npm run check:profile-edit-gate # a failed profile read must not open an editor that WIPES it (in build)
npm run check:outage-copy  # an OVERLAY must not read a failed read as an empty account (in build)
npm run check:topo-outage-copy # the topo box must not invite the FIRST topo when the read failed (in build)
npm run check:outage-landmark # ...and check:outage's own sub-tab landmark must identify that view (in build)
npm run check:overlay-absence # every overlay that claims you have none is gated or explained
npm run check:outage # with the database down, does any screen say you have nothing?
npm run check:read-failures # no failed read that a caller reads as an empty one (in build)
npm run check:outage-flag-reach # no outage flag that is computed and then read by nothing (in build)
npm run check:chunk-reload # a lazy screen whose file a DEPLOY removed reloads once, not "This screen hit a bug" (in build)

# ── Honesty of what the screen claims — notes: docs/guards/honesty-claims.md ──
npm run check:trust-breakdown # the factors under WHAT FEEDS YOUR SCORE add up to it (in build)
npm run check:untracked-factors # a factor nobody has measured must not read as ZERO (in build)
npm run check:no-sources  # no screen prints a field named source (in build)
npm run check:preview-claims # a control that changes only CLIENT STATE must not claim a real outcome (in build)
npm run check:policy-claims # no legal surface claims a control or a capability the app lacks (in build)
npm run check:offline-claims # an offline promise is backed by the write that makes it true (in build)
npm run check:match-percent # the match % blends what the screen SAYS it blends; no term may saturate it (in build)
npm run check:profile-claims # the résumé and the trust card claim only what they can support (in build)
npm run check:claims # no success toast for a write that only runs signed-in (in build)
npm run check:writes # no success message in front of a write whose failure is unobservable (in build)

# ── Settings, forms and persistence — notes: docs/guards/settings-and-persistence.md ──
npm run check:photo-removal # a climber can take their OWN photo down, and only their own (in build)
npm run check:onboarding-reach # a climber who has not onboarded is ASKED; one who has is left alone (in build)
npm run check:profile-draft-persists # a profile field the editor collects and the DB can hold must be SENT (in build)
npm run check:visibility-switches # a rendered visibility switch must PERSIST, or it promises nobody (in build)
npm run check:notification-switches # ...and a notification switch must SUPPRESS something, or it hides nobody (in build)
npm run check:count-matches-its-list # a count and the list under it must agree — on ONE screen (in build)
npm run check:float-plan-persistence # a form on a sub-tab must survive leaving it — float plan AND planner (in build)

# ── Units and formatting — notes: docs/guards/units-and-formatting.md ──
npm run check:units # a surface renders in the climber's units, and a control that WRITES converts first (in build)

# ── Seed data and identity — notes: docs/guards/seed-and-identity.md ──
npm run check:seed-history # seed climbs must never be attributed to a real account (in build)
npm run check:dead-flag-gates # UI fed only by a constant a false flag empties (in build)
npm run check:sample-content-removable # the sample content really does come out with the flag (in build)
npm run check:seed-only-surfaces # a component reachable ONLY on the seed path renders for nobody (in build)
npm run check:crew-member-readers # no crew member id resolved against seed CLIMBERS (in build)
npm run check:real-profile-rows # no row prints a level/trust a real profile lacks (in build)

# ── Social, crews and groups — notes: docs/guards/social-and-crews.md ──
npm run check:mutual-friends # a mutual friend is real, named as they asked, and counted as the list that renders (in build)
npm run check:crew  # guards the crew "Ready" calculation (in build)

# ── The route page — notes: docs/guards/route-page.md ──
npm run check:bare # renders a route with NO enrichment — the shape 99.5% of them have
npm run check:provenance   # every wired section heading still shows how it was sourced (in build)
npm run check:access-checked-line # the road/access CHECKED DATE reaches a screen (in build)
npm run check:trailhead-directions # ONE way to drive there, coordinates with it, labels that match (in build)
npm run check:trailhead-direction-shape # ...and those directions END AT THE TRAILHEAD, not a hike narrative (in build; --live daily)
npm run check:approach-section # ONE approach section; the most-used way in is first, marked, and carries the paragraph (in build)
npm run check:area-name-embed # an areas() embed missing `name` prints "undefined" at a climber (in build)
npm run check:crew-gear    # the crew's gear list reaches a REAL route (in build)
npm run check:area-surfaces # a climber can DISCUSS an area and NAVIGATE to a crag (in build)
npm run check:photo-contract # route photos keep their ordering, refusal and gating promises (in build)
npm run check:fire # the wildfire surfaces cannot claim what they don't know (in build)
npm run check:field-renders # every enriched route column actually reaches a screen
npm run check:summit-briefing # a peak page states only what its routes AGREE on — and does not withhold what they do
npm run check:token-boxes  # no element shaped like a chip holds a paragraph
npm run check:pitch-split # every pitch_detail entry is a row of ROUTE BREAKDOWN, in order (in build)

# ── Camping and bivy — notes: docs/guards/camping.md ──
npm run check:camping      # CAMPING & BIVY reaches Planner, and merges both stores (in build)
npm run audit:camp-elevations # are the camp elevations already ON SCREEN right? (99% are)
npm run audit:camp-route-fit  # is this camp plausibly usable FOR THIS ROUTE? (6 candidates)

# ── Planner estimates, gain and rappels — notes: docs/guards/planner-and-rappels.md ──
npm run check:logged-times # a climber’s logged time reaches the planner (in build)
npm run check:pitch-discount # the climbing-time discount is bounded, and the planner SAYS it applied (in build)
npm run check:rappel-single-rope # the headline rappel count is the single-rope one (in build)
npm run check:gain-floor-stated # a gain the route's own PINS contradict is stated (in build)
npm run check:impossible-leg # ...and no leg prints a distance its own two pins make impossible (in build)
npm run check:return-leg      # a walk that already covers the day is not re-added, and each red warning names the DAY it lands on (in build)
npm run audit:gain         # is a route gaining LESS than its own waypoints demand?
npm run check:rappel-lengths # can the rope a route describes actually reach the rappel it states?
npm run audit:rappel-claims  # does `rappels` claim raps the route's own descent_text denies?
npm run audit:rappels      # do a route's rappel fields agree with each other?

# ── Waypoints and tracks — notes: docs/guards/waypoints-and-tracks.md ──
npm run check:wp-styles    # the app can DRAW every waypoint type it recognises (in build)
npm run check:waypoint-placement # an undrawable waypoint says so, and one test decides (in build)
npm run check:waypoint-dedupe # a route has ONE summit, MORE THAN ONE trailhead, and an upper AND a lower (in build)
npm run check:track-caveat # a line drawn between waypoints must not pose as a GPS track (in build)
npm run check:gpx-caveats  # ...and the DOWNLOADED file must carry that same caveat (in build)
npm run check:waypoint-caveat # manufactured waypoint COORDINATES must say so — incl. vs the GROUND (in build)
npm run audit:coord-origin # is every coordinate a route stores actually NEAR the route?
npm run audit:waypoints    # is each waypoint actually on the route's own gpx track?
npm run audit:waypoint-order # is the waypoint LIST sensible — order and duplicate pins?
npm run audit:waypoint-track # THIRD waypoint audit — same question as audit:waypoints, different answer
npm run audit:map-pins     # what the route MAP draws: two trailheads, and pins it silently drops
npm run audit:waypoint-distances # a trail cannot be SHORTER than the straight line — needs no gpx
npm run audit:summit-pins  # is the SUMMIT pin on the summit? (pin vs the peak's own coordinate)
npm run audit:peak-coords  # is the PEAK itself where we say it is? (its coordinate vs the ground)
npm run audit:summit-splits # ...and do a peak's OWN routes agree where it is? (SIXTH pin audit — the ground decides)
npm run audit:pin-elev-vs-own-prose # ...and does a trailhead pin agree with the height its OWN prose states? (--ground adjudicates)
npm run audit:waypoint-elevations # is EVERY waypoint at the height it claims? (no track needed)
npm run audit:waypoint-elevations -- --ground # ...with the TERRAIN setting the tolerance, not a constant
npm run audit:ground-index # is the SHIPPED ground measurement still describing this catalog?
npm run audit:waypoint-geometry # FOURTH waypoint audit — pins vs EACH OTHER, so it reaches routes with no gpx
npm run audit:waypoint-geometry -- --ground # ...and asks the TERRAIN which of two clashing pins is the wrong one
npm run audit:stranded-track-vertices # a pin repair left the DRAWN LINE behind, so the sketch caveat vanished
npm run audit:cross-route-pins # FIFTH waypoint audit — do TWO ROUTES disagree about one named point? (place, and height)
npm run audit:travel-bearings # does the prose send a party the way its OWN pins say the summit is?
npm run audit:synthetic-waypoints # are the pins REAL, or computed? (3 tests; --selftest needs no DB)

# ── Roads, trailheads and access — notes: docs/guards/roads-and-access.md ──
npm run audit:access-prose # road/permit sentences filed in a column that renders elsewhere
npm run audit:road-coverage # a route that describes a WALK but nothing about the ROAD to it
npm run audit:trailhead-agreement # a route stores its trailhead TWICE — do the two copies agree?
npm run audit:expiring-closures # does a route state a closure that has already expired? (--json for consumers)
npm run audit:trailhead-road # routes sharing ONE trailhead/road — open? same road? same gate?

# ── Route prose and catalog structure — notes: docs/guards/route-prose.md ──
npm run audit:area-parents # is every area filed under the place it belongs to?
npm run audit:note-voice   # a waypoint note RENDERS — is it written for a climber or for the pipeline?
npm run audit:prose-citations   # does rendered prose still name a third party as its SOURCE?
npm run audit:misplaced-prose # ...is ANY rendered string the pipeline talking, NAMING A SOURCE (every state + area blurbs), or a FIRST ASCENT that argues?
npm run audit:approach-scope # does a route's approach text run past the base of the climb?
npm run audit:aspect-name    # does a route's NAME point the same way as its `aspect`?
npm run enrich:next-batch  # next unpitched routes still needing a climbing_route
npm run check:enrichment-traceable # does a climbing_route batch invent anything?
npm run audit:terrain      # does a route's safety advice match the terrain it crosses?
npm run audit:hazard-redundancy # how much repetition the KNOWN HAZARDS merge removes (NOT a backlog)
npm run enrich:apply       # write approach_variants / climbing_route / bivy (--dry first)

# ── Contributions and the logbook — notes: docs/guards/contributions-and-logbook.md ──
npm run check:contrib-fields # every field the contribute form offers is actually applied (in build)
npm run check:contrib-summary # ...and its CURRENT-VALUE line never prints [object Object] (in build)
npm run check:correction-readers # no enrichment column out-votes an agreed correction (in build)
npm run check:suggestion-discs # suggestions cover EVERY discipline you climb (in build)
npm run check:log  # BOTH climb_logs hydrations keep every column worth showing (in build)
npm run check:challenge-rows # tick-list rows say something true, and the tick matches the row
npm run check:route-tags # real list prose still reaches a list key, and each key renders (in build)
npm run check:contrib-shapes # what the contribute form SUBMITS is the shape its readers READ (in build)
npm run check:consensus-clustering # three climbers who agree must be COUNTED as agreeing (in build)
npm run check:add-route-fields # add-a-climb asks what the discipline needs, and nothing unstorable (in build)
npm run audit:fifty-classics # which Fifty Classics does the catalog hold, and are they tagged?
npm run audit:list-coverage # how full is each named tick-list against the total it advertises?

# ── Grades — notes: docs/guards/grades.md ──
npm run check:grade-parser  # grade_num is parsed in one place, and so is the DISPLAYED grade (in build)
npm run audit:grade-num-drift # ...and does the STORED grade_num still agree with that parser?

# ── Database, migrations and git history — notes: docs/guards/database-and-history.md ──
npm run check:search-norm # "mt baker" finds Mount Baker — the JS and SQL spelling rules are ONE table (in build)
npm run check:approve-route-columns # nothing may fork approve_new_route again (in build)
npm run check:counts# does every areas.route_count still match the truth?
npm run check:function-columns # does every column a stored FUNCTION writes still exist?
npm run check:function-drift # is the LIVE function the one the migrations describe?
npm run check:column-drift # ...and is the LIVE TABLE? (a column git has never seen)
npm run check:migration-claims # do two OPEN PRs claim the same migration number?
npm run check:sql -- fix.sql # would this hand-written SQL actually match anything? (run before handing it over)
npm run check:merge-survival # did a merge silently DELETE what a parent added?
npm run audit:silent-reverts # ...and did a SQUASH, which leaves no merge commit?
npm run check:schema # lib/db.js never reads a table or column the database lacks (in build)
npm run check:migrations # two migrations must never share a number (in build)
npm run check:rls   # policies bind the right column; definer fns pin pg_temp; every table has RLS (in build)
```

There is no unit test suite, linter, or type checker. The `check:` scripts are what
stands in for one, and they target the failure mode this codebase actually ships: not
a build error, but a screen that renders wrong or not at all.

**Per-guard notes live in `docs/guards/`**, one file per area, indexed by
[docs/guards/README.md](docs/guards/README.md) — deliberately NOT loaded every session. Before
changing, removing, or reasoning about any `check:` / `audit:` script, or before building a new
one, run `grep -rn "check:NAME" docs/guards/` and read its entry: each records why the guard exists,
what it structurally cannot see, the measured non-findings not to re-derive, and the traps met
building it. The rules they encode still apply. **New guard entries go in the matching
`docs/guards/<area>.md`, not here** — only the one-line command index belongs in this file.

Pushing to `main` (or `master`) triggers `.github/workflows/deploy.yml`, which builds and publishes `dist/` to GitHub Pages at https://barbs2989.github.io/Climbing-App/. `vite.config.js` sets `base: "/Climbing-App/"` to match the repo name — this must stay in sync with the repo name or asset links break on Pages.
Anything under `public/` has two traps — Vite does not rewrite paths *inside* `public/` files, and
the maskable icon is a separate, full-bleed file — so read
[docs/codebase/deploy-and-icons.md](docs/codebase/deploy-and-icons.md) before touching it.

## Architecture

This is **ClimbMatch**, a mobile-first social app for finding climbing partners, planning objectives, and sharing route conditions. Nearly all of it lives in three dense JSX files — `ClimbMatch.jsx` (the `App` component), `ClimbMatchCore.jsx` (constants, helpers, presentational components) and `RouteDetail.jsx` (the route page) — plus `EnrichmentPanels.jsx` and the DB-backed modules in `lib/`.

- `index.html` → loads `main.jsx` → renders `<App/>` from `ClimbMatch.jsx`.
- **`ClimbMatch.jsx` + `ClimbMatchCore.jsx` are essentially the whole app.** `ClimbMatchCore.jsx` holds bands 1-2 (constants, seed data, pure helpers, presentational components — everything that used to sit above `App`); `ClimbMatch.jsx` holds the `App` component and imports the rest from core. Module globals that `App` reassigns (`UNITS`, `DLOCALE`, `RESPONSE_RATES`, toast/celebration timers) are written through `__set_*` shims exported by core, because ESM import bindings are read-only. Both files keep the deliberately dense, single-line-per-declaration style (many `const`s and components packed onto one physical line). Expect very long lines; use `grep -n` with the symbol name rather than scrolling.

### A real Supabase backend exists, but most of the app still runs on in-memory seed data

A `USE_DB` flag (`lib/supabase.js`, on when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`/`VITE_USE_DB=true` are all set) gates a real DB path: `lib/db.js` (`useAreaRoutes`, `submitContribution`, `dbRouteToCamel`) and `lib/DbAreaBrowser.jsx` back the Climbs tab's area browser + route list from Supabase's `areas`/`routes` tables, which hold Washington's full alpine + rock catalog (thousands of routes — see `docs/BACKEND.md` for the schema and pipeline). `lib/auth.js`/`lib/AuthModal.jsx` provide real login. See `docs/BACKEND.md` for the schema and the pipeline — but note that its "still simulated" lists were **over a month stale** when corrected on 2026-09-02, so re-derive what is DB-backed from `lib/db.js` rather than reading it off that page.

Everything else — crews, messages, connections, vouches, logs, trip reports, and any state outside a DB-backed route's own fields — is still **seeded from module-level `const` arrays/objects at the top of the file and lives only in React state for the session** (refreshing resets everything). Key seed data structures:

- `ROUTES` — the in-memory climbs fallback/demo set (each has an `id`, `mountainId`, grade, `activity`/trip reports, gear, hazards, GPX points, etc.). DB-backed routes bypass this via `dbRouteToCamel()`.
- `MOUNTAINS` — a **hierarchical area tree** (world → country → state → range → canyon → peak/crag/wall) linked by `parentId`, for the in-memory fallback. Routes reference areas via `mountainId`. `inArea(mid, sid)` walks parents to test membership; `areaPathNames(mid)` builds the breadcrumb. The DB-backed path uses the equivalent `areas`/`routes` tables and `ltree` instead.
- `CLIMBERS` / `FILLER_CLIMBERS` — other users; `ME` is the current user. Not migrated to the DB yet (see the note below on real profiles).
- `DEMO_FILLERS` — a boolean toggle that gates a lot of seed content (clubs, crews, my-climbs, etc.). Turning it off empties those sections.

`ME`, and the globals `UNITS` and `DLOCALE`, are **mutated directly** (not via `setState`) inside `App` — e.g. `ME.objectiveIds = wishlist` at the top of the component (~line 2212). Be aware that some state lives on these mutable module globals rather than purely in hooks.

> **Do not write to `ME` directly.** Profile/user state is owned by React hooks (`wishlist`, `myAvail`, `profile`, and the `editDraft`/`saveEdit` flow) — always update it through those setters (`setWishlist`, `setProfile`, etc.). The existing `ME.* = ...` assignments at ~line 2212 are a legacy sync hack that copies state back onto the global each render so the rest of the code can read `ME`; they are not a pattern to extend. Mutating `ME` directly is invisible to React, won't trigger a re-render, and creates a second source of truth that silently drifts from the hooks.

### The single `App` component

`export default function App()` (near the bottom, ~line 2208) holds **~100 `useState` hooks** and every screen. Navigation is driven by a single `tab` state string. Main tabs:

- `today` — home dashboard (greeting, a setup checklist, alerts, *Unfinished business*, *Jump back in* tiles, recent condition reports, recent friend activity). **Not suggestions** — the only suggestion surface is `DbSuggestedClimbs` (*More climbs in this area*), which takes an `area` and renders inside the Climbs area browser.
- `routes` — explore climbs by area, and (when `selRoute` is set) the route detail screen. Route detail has its own sub-`tab` state: `overview`, `conditions`, `planner`, `safety`, `partners`, `photos`.
  - **Six, and Ranks is NOT one of them** — that is a top-level NAV tab. This bullet used to say so, omitting Partners,
    which is the same wrong list `check:screen-lists` records as costing `check:token-boxes` a whole walk. The guard was
    fixed then and this sentence was not, so a reader starting here would reintroduce it; section 4 of that guard now
    reads this bullet and fails on a foreign or missing id. Keep the list on ONE line — the check reads that line, and
    prose naming the absent id would fail on its own explanation.
- `discover` — find partners, crews **or guides** (`partnersMode` is `"partners"` / `"crews"` / `"guides"`, whose controls read *Find partners* / *Join a crew* / *Hire a guide*). Only the first two are tested with `partnersMode===`; **`guides` is the else branch**, so grepping for the comparison finds two of three.
- `crew` — your crews and direct/crew messaging (`crewView`).
- `logbook` — your objectives, completed climbs, trip reports.
- `me` — profile, settings, verification, trust score.

`openRoute(x)` is the standard way to navigate into a route (sets `routeFrom`, `selRoute`, and `tab="routes"`).

### File layout across the two app files

Read it in three bands:

1. **`ClimbMatchCore.jsx`, top: constants + pure helpers.** The `C` object is the shared dark-theme color palette used everywhere via inline styles (there are no CSS files or Tailwind). Domain helpers live here: `catOf`/`tripOf` (discipline categorization), `compat` (partner compatibility scoring), `scarfHrs`/`techHrs` (time estimates), `sunReadout`/`aspectDirs` (sun/shade by wall aspect and time of day), `buildConsensus` (aggregates trip reports into conditions consensus weighted by `trustScore`), `gpxDownload`, `passesFilters`, `distMiles`, `fuzzyMatch`.
2. **`ClimbMatchCore.jsx`, bottom: presentational components** — small functions like `DiscBadge`, `TrustBadge`, `VerifyBadge`, `RiskBadge`, `ProvenancePanel`, `RouteGearCheck`, `ElevChart`, `GPXMap`, `DiffRadar`, plus icon components (`DiscIcon`, `ActionIcon`).
3. **`ClimbMatch.jsx`: `App`** — all stateful screen logic and the big inline-JSX render tree, gated by `tab===...` and `selRoute`.

### Domain concepts to know

- **Trust & safety** is a first-class theme: `trustScore`/`safetyScore`, vouches, belay catch ledgers, `VERIF` verification states, `RISK_LEVELS`, `SAFETY_ESSENTIALS`/`WATCH` (per-discipline safety advice), and float plans on crews.
- **Crews** are trip parties around a `routeId` with members, proposed `dates`/`dayAcks`, and a "Ready" state computed by `datesAgreed`/`agreedDate` (everyone confirmed + a day everyone acked).
- **Conditions consensus** is derived, not stored: `buildConsensus(route.activity)` weights reports by reporter trust and recency (`RECENT_DAYS`, `isRecent`) and extracts top condition tags, hazards (`HAZARD_TAGS`), and best months.

### Key algorithms (the computational core)

Four functions do the real work; everything else is UI around them. The code is the source of truth for the exact constants/formulas — these are just pointers.

- `compat(a, b)` (~L335) — partner compatibility score (20–99) from shared disciplines, grade closeness, shared objectives, verification, pace (`hikingSpeedFtHr`), and availability overlap. Every term is BOUNDED and the total is RESCALED onto that range; it does not clamp.
  Its design history — why the terms are bounded and rescaled rather than clamped, and how the
  design was measured — is in [docs/codebase/algorithms.md](docs/codebase/algorithms.md).
- `buildConsensus(activity)` (~L344) — distills a route's trip reports into a conditions summary, weighting each report by the author's `trustScore` and recency; separates all-time vs recent tags and surfaces hazards.
- `datesAgreed(c)` / `agreedDate(c)` (~L382/384) — a crew reaches "Ready" only when every confirmed member (including ME = id `0`) has acked the same proposed day (`dayAcks`).
- `scarfHrs(...)` + `techHrs(...)` (~L336/337) — planner time estimates: Naismith-style approach time (fitness tier + pack weight) plus pitch-by-pitch climbing time (exponential slowdown by grade).

## Working in this codebase

- When adding a feature, follow the existing pattern: add seed data to the relevant top-level `const`, add `useState` in `App`, and add a `tab===...`/sub-view branch in the render tree. Match the dense, inline-style formatting of surrounding code.
- Styling is always inline `style={{...}}` referencing the `C` palette — do not introduce CSS files or a styling library.
- For anything outside the DB-backed routes/areas/contributions/auth path (crews, messages, connections, vouches, logs, trip reports, etc.), "saving" means updating React state — don't reach for storage APIs unless explicitly asked to add persistence. For DB-backed data, use the existing `lib/db.js`/`lib/supabase.js` patterns (e.g. `submitContribution`) rather than writing new ad-hoc persistence.

### Data work: the rules that apply every time

Each rule below is a summary; the linked file has the incidents behind it and the full procedure.

- **A worktree has no credentials.** Before any DB-touching script, audit or guard, symlink
  `.env`, `.env.local` and `supabase/.temp` from the main checkout, or they fail in ways that read
  like broken guards. → [supabase-scripts.md](docs/codebase/supabase-scripts.md)
- **Use `scripts/lib/supabase-env.mjs`, never hand-rolled env loading.** `requireServiceKey()` for
  anything that writes, `patchRow()` (throws unless exactly one row changed), `selectAll()` with
  `{ pageSize: 1000 }` for whole-table scans. RLS turns a wrong-key write into **200 with an empty
  array**, so after any batch write, re-read and reconcile: a 200 is not evidence the data changed.
- **A row count that decides something must be read with the service key.** An RLS-protected table
  answers `count=exact` with **0 and a 200** under the public key, whatever it holds.
- **Run `npm run check:sql -- fix.sql` before handing over any SQL.** The SQL Editor reports
  success for an UPDATE or DELETE that matched zero rows; a wrong id has already destroyed the only
  copy of a route. → [hand-written-sql.md](docs/codebase/hand-written-sql.md)
- **~91% of route ids are derived from the route NAME, not the peak.** Resolve ids through
  `areas` and assert the row's `area_id` before writing; never trust a name-shaped id. `dist_km`
  holds two conventions at once — never normalise it in bulk — and re-importing a legacy state
  duplicates it rather than updating it. → [route-identity.md](docs/codebase/route-identity.md)
- **Before ADDING any area, peak or route, look it up in the catalog directory (0214).** An
  import filed MP's `North Cascades › Mt. Baker` beside our `Bellingham and Mt Baker Hwy › Mount
  Baker` because it only checked the one parent — ~225 copies across 27 states. Ask the whole
  state, under every spelling: `select * from catalog_find_area('<name>', '<State>', lat, lng)` and
  `select * from catalog_find_route('<name>', '<target area_id>')`; a hit is a candidate to READ,
  not proof. Browse a state as the Climbs tab lays it out:
  `select outline from catalog_directory where state = 'Washington' order by sort_key`.
- **Before writing a researched string into an existing column, look at where it renders.** A
  column that reaches a header, pill, chip or table cell takes a *value* (`season` is a window,
  `grade` is a grade); its explanation belongs in the prose column beside it. `rappels` is prose
  and must never be parsed for a count. → [enrichment-prose.md](docs/codebase/enrichment-prose.md)
