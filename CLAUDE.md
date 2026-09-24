# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install deps (React 18 + Vite)
npm run dev        # local dev server with HMR
npm run build      # production build to dist/ (runs check:refs + check:hooks first)
npm run preview    # serve the built dist/ locally
npm run check:refs # identifiers referenced but never bound (runs in build + CI)
npm run check:jsx-comments # a comment in JSX children position renders to the USER (in build)
npm run check:no-nul  # no source file git would treat as BINARY, so diffs stay readable (in build)
npm run check:script-roots # no script reads the app files of somebody ELSE's worktree (in build)
npm run check:dup-attrs # a declaration written TWICE: the later wins, the earlier is dead (in build)
npm run check:bottom-panels # a fixed panel at the bottom must RESERVE the space it covers (in build)
npm run check:hooks# React hooks-rules violations (runs in build + CI)
npm run check:dead-props # props passed or declared but never read (runs in build + CI)
npm run check:ui   # drives the real app in Chrome and asserts per-screen invariants
npm run check:boot # index.html's boot placeholder AND the Help tour still match the real nav
npm run check:screen-lists # every guard walks EVERY tab the app has, and no tab it hasn't (in build)
npm run check:bare # renders a route with NO enrichment — the shape 99.5% of them have
npm run check:seed-history # seed climbs must never be attributed to a real account (in build)
npm run check:overlay-discovery # every modal the app declares is still reachable by the guards (in build)
npm run check:zero # walks every tab and all 27 modals as a BRAND-NEW account sees them
npm run check:dead-flag-gates # UI fed only by a constant a false flag empties (in build)
npm run check:sample-content-removable # the sample content really does come out with the flag (in build)
npm run check:seed-only-surfaces # a component reachable ONLY on the seed path renders for nobody (in build)
npm run check:icons # the app declares an icon, and every icon it names exists (in build)
npm run check:contrib-fields # every field the contribute form offers is actually applied (in build)
npm run check:contrib-summary # ...and its CURRENT-VALUE line never prints [object Object] (in build)
npm run check:grade-parser  # grade_num is parsed in one place, and so is the DISPLAYED grade (in build)
npm run audit:grade-num-drift # ...and does the STORED grade_num still agree with that parser?
npm run check:approve-route-columns # nothing may fork approve_new_route again (in build)
npm run check:correction-readers # no enrichment column out-votes an agreed correction (in build)
npm run check:crew-member-readers # no crew member id resolved against seed CLIMBERS (in build)
npm run check:real-profile-rows # no row prints a level/trust a real profile lacks (in build)
npm run check:trust-breakdown # the factors under WHAT FEEDS YOUR SCORE add up to it (in build)
npm run check:untracked-factors # a factor nobody has measured must not read as ZERO (in build)
npm run check:provenance   # every wired section heading still shows how it was sourced (in build)
npm run check:wp-styles    # the app can DRAW every waypoint type it recognises (in build)
npm run check:waypoint-placement # an undrawable waypoint says so, and one test decides (in build)
npm run check:waypoint-dedupe # a route has ONE summit, MORE THAN ONE trailhead, and an upper AND a lower (in build)
npm run check:logged-times # a climber’s logged time reaches the planner (in build)
npm run check:pitch-discount # the climbing-time discount is bounded, and the planner SAYS it applied (in build)
npm run check:camping      # CAMPING & BIVY reaches Planner, and merges both stores (in build)
npm run check:access-checked-line # the road/access CHECKED DATE reaches a screen (in build)
npm run check:trailhead-directions # ONE way to drive there, coordinates with it, labels that match (in build)
npm run check:track-caveat # a line drawn between waypoints must not pose as a GPS track (in build)
npm run check:gpx-caveats  # ...and the DOWNLOADED file must carry that same caveat (in build)
npm run check:waypoint-caveat # manufactured waypoint COORDINATES must say so — incl. vs the GROUND (in build)
npm run check:no-sources  # no screen prints a field named source (in build)
npm run check:area-name-embed # an areas() embed missing `name` prints "undefined" at a climber (in build)
npm run check:suggestion-discs # suggestions cover EVERY discipline you climb (in build)
npm run check:crew-gear    # the crew's gear list reaches a REAL route (in build)
npm run check:area-surfaces # a climber can DISCUSS an area and NAVIGATE to a crag (in build)
npm run check:photo-contract # route photos keep their ordering, refusal and gating promises (in build)
npm run check:photo-removal # a climber can take their OWN photo down, and only their own (in build)
npm run check:mutual-friends # a mutual friend is real, named as they asked, and counted as the list that renders (in build)
npm run check:preview-claims # a control that changes only CLIENT STATE must not claim a real outcome (in build)
npm run check:toast-reachable # every screen App returns can SHOW a toast (in build)
npm run check:verification-fallback # a failed verification read must not un-verify you (in build)
npm run check:profile-edit-gate # a failed profile read must not open an editor that WIPES it (in build)
npm run check:onboarding-reach # a climber who has not onboarded is ASKED; one who has is left alone (in build)
npm run check:outage-copy  # an OVERLAY must not read a failed read as an empty account (in build)
npm run check:topo-outage-copy # the topo box must not invite the FIRST topo when the read failed (in build)
npm run check:outage-landmark # ...and check:outage's own sub-tab landmark must identify that view (in build)
npm run check:policy-claims # no legal surface claims a control or a capability the app lacks (in build)
npm run check:offline-claims # an offline promise is backed by the write that makes it true (in build)
npm run check:units # a surface renders in the climber's units, and a control that WRITES converts first (in build)
npm run check:match-percent # the match % blends what the screen SAYS it blends; no term may saturate it (in build)
npm run check:profile-draft-persists # a profile field the editor collects and the DB can hold must be SENT (in build)
npm run check:visibility-switches # a rendered visibility switch must PERSIST, or it promises nobody (in build)
npm run check:notification-switches # ...and a notification switch must SUPPRESS something, or it hides nobody (in build)
npm run check:count-matches-its-list # a count and the list under it must agree — on ONE screen (in build)
npm run check:profile-claims # the résumé and the trust card claim only what they can support (in build)
npm run check:float-plan-persistence # a form on a sub-tab must survive leaving it — float plan AND planner (in build)
npm run check:overlay-absence # every overlay that claims you have none is gated or explained
npm run check:log  # BOTH climb_logs hydrations keep every column worth showing (in build)
npm run check:fire # the wildfire surfaces cannot claim what they don't know (in build)
npm run check:signed-in # walks a REAL signed-in account that owns a crew and a group
npm run check:message-delivery # a message from a SECOND real account arrives, and names its sender
npm run check:block-guarantees # blocked: cannot read, message or crew-invite you (2 real accounts; hand-run)
npm run check:new-climber-journey # a new climber onboards, opens a crew, removes a friend — did any of it reach the DB? (hand-run)
npm run check:outage # with the database down, does any screen say you have nothing?
npm run check:overlay-scroll # no overlay pane may chain its scroll to the page behind
npm run check:field-renders # every enriched route column actually reaches a screen
npm run check:summit-briefing # a peak page states only what its routes AGREE on — and does not withhold what they do
npm run check:token-boxes  # no element shaped like a chip holds a paragraph
npm run check:a11y-badges # no control announces two fragments welded into one token
npm run check:selected-state # a control that LOOKS selected must SAY it is selected
npm run check:control-names # a control says WHAT IT IS; a switch says what it is SET TO (in build)
npm run check:overflow # nothing runs off the right-hand edge of a 390px phone
npm run check:anniversary # the climb-anniversary notification still reaches a screen
npm run check:challenge-rows # tick-list rows say something true, and the tick matches the row
npm run check:clickable # no NEW control that only a mouse can operate (in build)
npm run check:drift# does the live site actually serve the current tip of main?
npm run check:counts# does every areas.route_count still match the truth?
npm run check:function-columns # does every column a stored FUNCTION writes still exist?
npm run check:function-drift # is the LIVE function the one the migrations describe?
npm run check:column-drift # ...and is the LIVE TABLE? (a column git has never seen)
npm run check:migration-claims # do two OPEN PRs claim the same migration number?
npm run check:sql -- fix.sql # would this hand-written SQL actually match anything? (run before handing it over)
npm run check:merge-survival # did a merge silently DELETE what a parent added?
npm run audit:silent-reverts # ...and did a SQUASH, which leaves no merge commit?
npm run check:ci-cancel # can a guard running on main be cancelled by the next merge? (in build)
npm run check:overlays # every overlay inside #appscroll is portalled to document.body (in build)
npm run check:overlay-width-cap # a full-screen view must be drawn in the app's own 520px column (in build)
npm run check:disc-labels # one spelling per discipline, everywhere (in build)
npm run check:claims # no success toast for a write that only runs signed-in (in build)
npm run check:a11y-names # every control a screen reader reaches has a name (in build)
npm run check:pitch-split # every pitch_detail entry is a row of ROUTE BREAKDOWN, in order (in build)
npm run check:route-tags # real list prose still reaches a list key, and each key renders (in build)
npm run check:contrib-shapes # what the contribute form SUBMITS is the shape its readers READ (in build)
npm run check:consensus-clustering # three climbers who agree must be COUNTED as agreeing (in build)
npm run check:rappel-single-rope # the headline rappel count is the single-rope one (in build)
npm run check:gain-floor-stated # a gain the route's own PINS contradict is stated (in build)
npm run check:impossible-leg # ...and no leg prints a distance its own two pins make impossible (in build)
npm run check:return-leg      # a walk that already covers the day is not re-added, and each red warning names the DAY it lands on (in build)
npm run check:flex-scroll # no scroll pane in a flex column that cannot actually scroll (in build)
npm run check:dialog-dismiss # every dialog can be left without guessing (in build)
npm run check:doc-paths # every file path this document names still EXISTS (in build)
npm run check:injection-anchors # every INJECTION CASE still LANDS, so a guard's proof cannot rot (in build)
npm run check:guard-wiring # every guard RUNS, is named here, and this file agrees about its CREDENTIAL (in build)
npm run check:action-versions # no workflow pins an action below the version we moved to (in build)
npm run check:schema # lib/db.js never reads a table or column the database lacks (in build)
npm run check:writes # no success message in front of a write whose failure is unobservable (in build)
npm run check:read-failures # no failed read that a caller reads as an empty one (in build)
npm run check:outage-flag-reach # no outage flag that is computed and then read by nothing (in build)
npm run check:zindex # the toast stays above every overlay, so an error can be read (in build)
npm run check:crew  # guards the crew "Ready" calculation (in build)
npm run check:migrations # two migrations must never share a number (in build)
npm run check:rls   # policies bind the right column; definer fns pin pg_temp; every table has RLS (in build)
npm run check:add-route-fields # add-a-climb asks what the discipline needs, and nothing unstorable (in build)
npm run audit:area-parents # is every area filed under the place it belongs to?
npm run audit:coord-origin # is every coordinate a route stores actually NEAR the route?
npm run audit:waypoints    # is each waypoint actually on the route's own gpx track?
npm run audit:waypoint-order # is the waypoint LIST sensible — order and duplicate pins?
npm run audit:waypoint-track # THIRD waypoint audit — same question as audit:waypoints, different answer
npm run audit:map-pins     # what the route MAP draws: two trailheads, and pins it silently drops
npm run audit:access-prose # road/permit sentences filed in a column that renders elsewhere
npm run audit:road-coverage # a route that describes a WALK but nothing about the ROAD to it
npm run audit:waypoint-distances # a trail cannot be SHORTER than the straight line — needs no gpx
npm run audit:gain         # is a route gaining LESS than its own waypoints demand?
npm run audit:note-voice   # a waypoint note RENDERS — is it written for a climber or for the pipeline?
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
npm run audit:trailhead-agreement # a route stores its trailhead TWICE — do the two copies agree?
npm run audit:expiring-closures # does a route state a closure that has already expired? (--json for consumers)
npm run audit:prose-citations   # does rendered prose still name a third party as its SOURCE?
npm run audit:trailhead-road # routes sharing ONE trailhead/road — open? same road? same gate?
npm run audit:approach-scope # does a route's approach text run past the base of the climb?
npm run check:rappel-lengths # can the rope a route describes actually reach the rappel it states?
npm run audit:rappel-claims  # does `rappels` claim raps the route's own descent_text denies?
npm run audit:aspect-name    # does a route's NAME point the same way as its `aspect`?
npm run audit:camp-elevations # are the camp elevations already ON SCREEN right? (99% are)
npm run audit:camp-route-fit  # is this camp plausibly usable FOR THIS ROUTE? (6 candidates)
npm run enrich:next-batch  # next unpitched routes still needing a climbing_route
npm run check:enrichment-traceable # does a climbing_route batch invent anything?
npm run audit:terrain      # does a route's safety advice match the terrain it crosses?
npm run audit:rappels      # do a route's rappel fields agree with each other?
npm run audit:hazard-redundancy # how much repetition the KNOWN HAZARDS merge removes (NOT a backlog)
npm run audit:fifty-classics # which Fifty Classics does the catalog hold, and are they tagged?
npm run audit:list-coverage # how full is each named tick-list against the total it advertises?
npm run enrich:apply       # write approach_variants / climbing_route / bivy (--dry first)
```

There is no unit test suite, linter, or type checker. The `check:` scripts are what
stands in for one, and they target the failure mode this codebase actually ships: not
a build error, but a screen that renders wrong or not at all.

**Per-guard notes live in `docs/guards.md`** (~330k tokens, deliberately NOT loaded every
session). Before changing, removing, or reasoning about any `check:` / `audit:` script, or
before building a new one, grep that file for the guard's name and read its entry: each records
why the guard exists, what it structurally cannot see, the measured non-findings not to
re-derive, and the traps met building it. The rules they encode still apply. **New guard
entries go in `docs/guards.md`, not here** — only the one-line command index belongs in this file.

Pushing to `main` (or `master`) triggers `.github/workflows/deploy.yml`, which builds and publishes `dist/` to GitHub Pages at https://barbs2989.github.io/Climbing-App/. `vite.config.js` sets `base: "/Climbing-App/"` to match the repo name — this must stay in sync with the repo name or asset links break on Pages.

That base has a trap worth knowing before adding anything to `public/`. Vite substitutes
`%BASE_URL%` inside `index.html`, so icon and manifest `<link>`s written that way come out
correct. It does **not** rewrite the *contents* of files in `public/` — so the paths inside
`manifest.webmanifest` (`start_url`, `scope`, every icon `src`) are hardcoded with the
`/Climbing-App/` prefix and would silently 404 on Pages if written as bare `/`. Nothing
fails the build if they are wrong; the icons just never appear and the app becomes
non-installable, which is exactly the class of thing nobody notices. `public/favicon.svg` is
the single source for the mark — the PNGs beside it are generated from it by
`node scripts/oneoff/render-app-icons.mjs`, so change the SVG and re-run rather than editing
a PNG.

`favicon-maskable.svg` is a **separate** file on purpose, and #745 shipped the bug that
explains why: it tagged the ordinary rounded icon `purpose: "maskable"`. A maskable icon must
be **full bleed** (the launcher supplies the shape; a pre-rounded tile inside its mask reads
as a small badge floating on the launcher background) and its ink must stay inside the safe
zone, which is the central circle of 80% the width — **not** the inner 80% square, whose
corners sit at ~113% of that radius. The mark is a wide triangle, so its lower corners are
the binding constraint. The generator **measures the rendered pixels** and fails if any ink
lands outside that circle, because the arithmetic is easy to get wrong: the first corrected
scale still overshot at 82.9% and only the measurement caught it.

## Architecture

This is **ClimbMatch**, a mobile-first social app for finding climbing partners, planning objectives, and sharing route conditions. The entire application is a single React component file.

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
  - **IT SATURATES, AND THE SCREEN'S OWN COPY IS FALSE EXACTLY WHERE THE SEARCH POINTS YOU.**
    Partners says *"Match % blends your shared objectives, grade range, disciplines, availability
    overlap and verified trust"* — and the demo walk shows three climbers at **5.10a, 5.11a and
    5.12b all reading 99%**. Measured with `scripts/oneoff/measure-compat-saturation.mjs`
    (report-only, no DB, no browser): **11 of 20 ordered seed pairs (55%) sit on the 99 ceiling**,
    the highest uncapped score is **157**, and **3 of the 5** climbers on the demo's My-Objectives
    pane are pinned.
  - **The cause is that TWO terms are UNCAPPED while every other one is bounded.** Shared
    disciplines score **×16** and shared objectives **×14** with no ceiling, against grade 28,
    availability 12, pace 10 and verified 8. So 3 shared disciplines plus 2 shared objectives is
    `20 + 48 + 28 = 96` **before grade, pace or availability contribute anything**.
  - **The consequence is that grade stops mattering for exactly the climbers the search
    surfaces.** Holding 3 shared disciplines and 2 shared objectives and varying only the
    partner's grade, **5.6 and 5.14a both read 99%** (uncapped 122 vs 116 — the arithmetic moves,
    the clamp eats it). Thin the profile to one shared discipline and no shared objectives and
    grade discriminates properly: 62 / 68 / 80 / 65 / 56. **The mechanism works; the saturation
    hides it**, and a 5.6 climber reading as a 99% match to a 5.11a leader is partner-safety
    adjacent.
  - **FIXED, and this bullet used to say REPORTED-NOT-FIXED — read the design before re-opening
    it.** Every term is now BOUNDED, the maxima are NAMED constants (`CMAX_*`), `COMPAT_MAX` is
    DERIVED by summing them, and the return RESCALES the above-base portion onto 20..99 instead of
    clamping. Measured after: the ceiling went **16 of 30 seed pairs to 0**, the rich-profile grade
    sweep went from **spread 0 to spread 20**, and the My-Objectives pane went from **3 distinct
    values across 5 climbers to 5**, ordered by grade proximity to ME's 5.10c.
  - **THE TWO CAPS ARE STATEMENTS, NOT NUMBERS.** Disciplines are a **yes/no** (`CMAX_DISC` 16):
    the 4th shared discipline does not make somebody a better partner than the 3rd. Objectives keep
    a little count-sensitivity and stop at 20: a second shared objective adds, a tenth does not.
  - **THE DESIGN WAS MEASURED RATHER THAN ARGUED**
    (`scripts/oneoff/measure-compat-designs.mjs`, report-only). Seven candidates were run over the
    seed population, and two results decided it. **Capping alone does not work** — bounding both
    terms while keeping the clamp still left 14 of 30 on the ceiling with grade spread **0**,
    because the bounded maxima summed to 138 against a ceiling of 99. And **the aggregate is not
    the test**: three candidates removed the ceiling while still ranking the pane by something
    other than grade proximity. Only the two tightest orderings put Sam (5.10a, closest to ME's
    5.10c) top and Maya (5.13a) bottom; the shipped one does it with **16 order flips against the
    alternative's 29**.
  - **RESCALING IS MONOTONIC, so it reorders nobody who was not already tied on the ceiling** —
    the flips come from the CAPS, and are reported per candidate so the cost is visible rather than
    implied. That script also **asserts the shipped `compat()` reproduces the chosen candidate on
    every pair**, so it stays a live check that the design measured is the design running.
  - **THE FIX MADE THE EXISTING COPY TRUE RATHER THAN NEEDING NEW COPY.** Three surfaces (the
    glossary, the Partners explainer and the score tooltip) already said the number *"blends your
    shared objectives, grade range, disciplines, availability overlap and verified trust"*. That
    sentence was false while the blend was swamped and is now accurate — and `check:match-percent`
    ties it to behaviour so it cannot drift again.
  - The script **lifts `compat()` from source with a fail-closed `ANCHOR LOST`** rather than
    re-typing it — a copy would agree with itself whatever the app did, which is the whole
    question — and keeps a deliberate second, unclamped transcription beside it purely to show
    how far past 99 a pair lands.
- `buildConsensus(activity)` (~L344) — distills a route's trip reports into a conditions summary, weighting each report by the author's `trustScore` and recency; separates all-time vs recent tags and surfaces hazards.
- `datesAgreed(c)` / `agreedDate(c)` (~L382/384) — a crew reaches "Ready" only when every confirmed member (including ME = id `0`) has acked the same proposed day (`dayAcks`).
- `scarfHrs(...)` + `techHrs(...)` (~L336/337) — planner time estimates: Naismith-style approach time (fitness tier + pack weight) plus pitch-by-pitch climbing time (exponential slowdown by grade).

## Working in this codebase

- When adding a feature, follow the existing pattern: add seed data to the relevant top-level `const`, add `useState` in `App`, and add a `tab===...`/sub-view branch in the render tree. Match the dense, inline-style formatting of surrounding code.
- Styling is always inline `style={{...}}` referencing the `C` palette — do not introduce CSS files or a styling library.
- For anything outside the DB-backed routes/areas/contributions/auth path (crews, messages, connections, vouches, logs, trip reports, etc.), "saving" means updating React state — don't reach for storage APIs unless explicitly asked to add persistence. For DB-backed data, use the existing `lib/db.js`/`lib/supabase.js` patterns (e.g. `submitContribution`) rather than writing new ad-hoc persistence.

### One-off scripts that touch Supabase

**THE `--linked` GUARDS CANNOT RUN FROM A WORKTREE UNTIL YOU SYMLINK THE LINK STATE, and they
fail in a way that reads like a broken guard rather than a missing file.** `check:function-drift`
and `check:function-columns` shell out to `npx supabase db query --linked`, whose project ref lives
in `supabase/.temp/` — gitignored, so a worktree does not have it. The CLI answers
`LegacyProjectNotLinkedError: Cannot find project ref`, and the guard correctly refuses (*"cannot
report on a database it did not reach. Not a pass."*). Fix it the way `.env` and `.env.local`
already are:

    ln -s /ABSOLUTE/PATH/TO/Climbing-App/supabase/.temp supabase/.temp

That directory holds a project ref, a pooler host and component versions — no credentials; the
access token lives in the CLI's own config. The ignore pattern is `supabase/.temp` with **no
trailing slash** on purpose: the slashed form matches a DIRECTORY only, so the symlink showed up as
untracked and was one `git add .` away from committing one developer's linked project. Verified
that the slashless form still ignores the real directory in the main checkout.

Both guards were run this way on 2026-09-02 and both are clean — 45 of 46 live functions match
their newest migration (1 declared benign), and every column the 11 writing functions touch exists.
`check:column-drift` needs **no link** — it does not shell out to the CLI — but it is **not**
anon-safe: it fetches PostgREST's OpenAPI root, which answers the anon key **401**, so it needs
the **service key**, exactly as its own `EXCLUDED` reason in `check:guard-wiring` says. This
file carried *"needs no link (anon key)"* from 2026-09-02 until 2026-09-04 — half right, which
is the most misleading shape, and it sat in the paragraph telling you how to run the three
hand-run guards, two sentences after the rule that CI must never hold that credential. Section 5
of `check:guard-wiring` now reads this document against those reasons, because **a stated
credential is a hand-copy wherever it lives** — the argument section 4 of `check:screen-lists`
already makes for a stated vocabulary. Injection-tested **4/4**
(`scripts/oneoff/inject-credential-claim-cases.mjs`), each case proving its edit landed **by
checksum** and restoring the file byte-identically; the first case is the real sentence restored
verbatim, and **two must stay SILENT** — citing `check:signed-in`'s anon-key accounts as the
PRECEDENT for an exemption is correct prose, and so is saying `check:counts` is anon-key, which
it genuinely is. The harness also refuses any expectation matching the HEALTHY run, because a
case written against the text an assertion prints when it PASSES reports MISSED against a guard
firing correctly — a mistake I made twice in one day before making it structural. Re-run
2026-09-04 with the key: **41 tables / 484
columns** (0174 and 0175 account for the growth from 480), all three sections clean, snapshot
current.

**ALL THREE RE-RUN 2026-09-10, AFTER 0176-0180 LANDED — CLEAN, and the point of recording it is
that the numbers above had gone stale.** Five migrations merged since that run, four of them RLS
and policy work, and `check:rls` is **static** — it replays the migration FILES and never asks the
live database — so these three are the only things that compare the two. Results:
`check:column-drift` **41 tables / 485 columns**, all three sections clean and the committed
snapshot matching; `check:function-columns` **11 writing functions, 6 insert lists, 9 update
lists**, every column exists; `check:function-drift` **47 live functions, 46 agreeing** plus the
one declared `handle_new_user`. A negative result, which is what these exist to produce — and it
is worth writing down, because otherwise the next session either re-derives it or quotes 484.

**A worktree has no `.env` either, and that is the same trap one file over.** The instruction
above says to fix the link *"the way `.env` and `.env.local` already are"* — which presumes they
are symlinked, and in a fresh worktree they are not, so every DB-touching guard and audit dies on
`SUPABASE_SERVICE_KEY missing`. Symlink all three:

    ln -s /ABSOLUTE/PATH/TO/Climbing-App/.env       .env
    ln -s /ABSOLUTE/PATH/TO/Climbing-App/.env.local .env.local

Both patterns are in `.gitignore` and a symlink is not a directory to git, so neither shows up as
untracked.

Import `scripts/lib/supabase-env.mjs` — do not hand-roll env loading. The
credentials are split across two gitignored files (`SUPABASE_SERVICE_KEY` in
`.env`, the `VITE_*` url/anon key in `.env.local`), so a script that reads only
one file gets `undefined` for the other half. That fails silently in the worst
way: PostgREST accepts a PATCH sent with the anon key and returns **200 with an
empty array**, because RLS rejected every row. The write reports success and
changes nothing.

**The same trap runs on the READ side, and there it corrupts DECISIONS rather than writes.**
An anon `count=exact` on an RLS-protected table returns **0 with a 200** whatever the table
holds, indistinguishable from a genuinely empty table. Measured 2026-08-20: `climb_logs` reads
**0 to anon and 2 to the service key**, while `guide_documents`, `guide_profiles`,
`user_reports`, `contributions`, `vouches` and `belay_catches` are genuinely empty on both.

That distinction is load-bearing here, because several decisions rest on a table being empty —
the guide application review queue was deliberately **not built** because `guide_documents` had
"0 rows live". That call is *verified correct* by the numbers above and should not be
re-litigated; it was also one RLS policy away from being a decision made on nothing. So **when a
row count is going to decide something, read it with `requireServiceKey()` and print the anon
number beside it**, rather than assuming they agree.
`scripts/oneoff/probe-latent-claims-anon-vs-service.mjs` does that for the tables whose
emptiness is load-bearing; extend its list rather than writing another one-off.

Pass `{ pageSize: 1000 }` to `selectAll` for anything scanning the whole `routes`
table — the default 60 means ~3,400 round trips and takes over ten minutes.

- `requireServiceKey()` throws instead of degrading to the anon key. Use it for anything that writes.
- `patchRow(table, id, body)` throws unless exactly one row came back, so a wrong id or an RLS rejection can't read as success.
- `selectAll(table, select, filter)` paginates by keyset. Offset paging over a filtered, unindexed column times out on the 200k-row `routes` table, and an unordered `.range()` silently skips/duplicates rows.

After any batch write, re-read the affected ids and reconcile counts. A 200 is not evidence the data changed.

### Hand-written SQL pasted into the Supabase SQL Editor

`patchRow` only guards writes that go through a script. Structural changes here are
routinely handed to the user as copy-paste SQL, and that path has no such guard: the
SQL Editor reports **success for an UPDATE or DELETE that matched zero rows**. Success
means the statement parsed, not that anything changed.

**Run `npm run check:sql -- fix.sql` before handing any .sql file over.** It reads the
live DB and fails on:

- target ids that do not exist — the statement would report success and do nothing
- a `DELETE` removing the last row with that name on its peak — the only copy
- files or statements large enough to be truncated on paste

Pass `--table areas` for an area file. It **fails closed** if the file writes to a table it
was not checked against, so a structural edit cannot be silently verified as "nothing to
check" — the `areas` mode had never once worked before that, since it asked PostgREST for
`areas.area_id`.

**Dissolving an emptied container is a distinct operation from a dedup**, and the only-copy
rule could not express it. `0119` moves 15 peaks out of a region and then deletes the
region: there is no twin, because the row is a grouping node being retired, not half of a
duplicate pair. Before this the delete could only pass by naming some unrelated row as its
"twin" — a false claim the script would then print as though verified, and *a rule you can
only satisfy by lying is worse than no rule*. Such a `DELETE` is now allowed **only when the
statement proves the row is empty in SQL**: a `NOT EXISTS` guard on child areas *and* one on
routes, both naming the row being deleted. That cannot be checked against the live DB — the
row still has its children until the transaction runs — so it is matched in the statement
text, and it makes the delete fail-safe by construction: if any move above it matched
nothing, the guard holds and zero rows go. Both guards are required and each is tested
separately; half a proof is not a proof, since an area with no children can still hold
routes directly and one with no direct routes can still have a populated subtree. The rule
is scoped to `--table areas` — deleting a *climb* always needs its twin.

On 2026-07-28 five fixes were reported applied that had matched nothing, because their
ids were composed from route display names instead of looked up. One of them caused data
loss: `wa_dragontail_peak_r4` and `wa_dragontail_peak_triple_couloirs` were flagged as a
duplicate pair, so the plan was "keep r4, delete triple_couloirs" — but r4 was not in the
live DB, so triple_couloirs was the only copy, and Triple Couloirs was destroyed. It was
rebuilt from `catalog/wa-alpine/routes.json`.

Two habits that follow from it: a duplicate flag is a hypothesis, so confirm **both** ids
return rows before deleting either half; and when anything may be writing concurrently,
write `col = coalesce(col, <value>)` so a restore can only fill blanks — a plain
assignment overwrote a richer `hazards` enrichment during that recovery.

### Route identity — why one peak's data keeps landing on another

Only ~9% of WA route ids are peak-scoped (`wa_mount_baker_north_ridge`, i.e. the id
starts with its `area_id`). The other ~91% are derived from the **route name** plus a
counter: `wa_north_ridge`, `wa_north_ridge_2`, `wa_north_face_3`, `wa_south_face`. So
"the North Ridge route" does not identify a peak — `wa_north_ridge*` spans Steeple Rock,
Whatcom, Cutthroat, Primus and Main Peak, and `wa_south_face` spans ten unrelated
formations.

That is the shared root cause of migrations 0044–0046 writing to nothing, of a Mount
Adams permit block appearing on Mount Baker and Forbidden, and of Guye Peak carrying two
copies of one route. **Peak names live on `areas.name`; route names are just the line.**

- Resolve route ids by joining through `areas`, and assert the target row's `area_id`
  is the peak you meant **before** writing. Never trust a name-shaped id.
- `npm run audit:identity -- --state wa` reports id-collision families, cross-region
  duplicate field values (the contamination fingerprint), and duplicate route rows.
  Run it after any enrichment or import batch.
- `npm run audit:distances -- --state wa` audits `routes.dist_km`. Read-only. It exists
  because **that column holds two conventions at once**: the app renders round trip as
  `distKm * 2`, so values are meant to be one-way, but 61 WA rows store *half a round
  trip* instead (the tell: only the doubled figure lands on a whole number of miles).
  Both populations display correctly, so **never normalize this column in bulk** — a
  blanket transform breaks as many rows as it fixes. The script also flags non-alpine
  routes filed under a peak's `area_id`; all 6 WA hits have `source: null`. A wide
  per-peak min/max spread is printed as context only: Rainier's 25x is legitimate, since
  Camp Muir and the Carbon River are different trailheads on one mountain.
- `route_duplicate_names` should return zero rows. As of `0065` it is a **materialized
  view**, so it is stale until refreshed — call `refresh_route_duplicate_names()` with the
  service key first, then read, or you will get a clean answer about yesterday's data.
  It was a plain view (`0062`, reworked in `0064`) until the live aggregate over 201k
  routes was measured at ~6s, which exceeds the 3s `statement_timeout` on the anon role:
  every read from the app returned `57014` while the same query looked healthy in the SQL
  editor, where the `postgres` role has no timeout. A guard that always errors is a guard
  you do not have.
- `id like 'wa_%'` is the reflex filter and it misses legacy ids. **Re-measured 2026-08-19: FOUR,
  not six, and `stuart_west_ridge` is no longer one of them** — it was renamed to a peak-scoped id,
  so the example this entry used to give sends you hunting for a row that does not exist. The live
  four are `adams_avalanche_glacier`, `adams_northwest_ridge`, `rainier_central_mowich_face` and
  `rainier_north_mowich_headwall`. Filter by the area subtree when a coverage percentage matters.
  - **Match the state as a PATH SEGMENT, never a substring.** `path.includes("washington")` also
    matches `ca_i_washington_column` (Washington Column, Yosemite) and `mo_washington_state_park`
    (Missouri): it reported **64** missed routes where the truth is 4, i.e. 94% noise. An ltree path
    is dot-separated — `split(".").includes("washington")`.
  - **A per-row audit degrades gracefully under a narrow scope; a COMPARATIVE one fails in the
    false-pass direction.** Dropping a row does not merely lose that row's finding, it removes the
    evidence its neighbours are judged against. `audit:trailhead-road-agreement` lost a fifth Mowich
    route that way — `rainier_central_mowich_face` holds the bridge-closure record, the prefix filter
    dropped it, and `wa_liberty_cap_ptarmigan_ridge_finish` was left with nothing to contradict. It
    now scans the whole catalog by default.
  - **The remaining prefix-scoped audits were checked and are FINE, so do not sweep them.**
    `audit:aspect-vs-name` and `audit:trailhead-agreement` are per-row — each compares a route
    against *itself*. All four blind-spot routes were audited by hand: three agree to **0 m** and the
    fourth carries no coordinate to compare. Rescoping them would gain nothing measurable.

**The origin was one line in `scripts/pipeline/etl-state.mjs`**, which minted route ids as
`PREFIX + "_" + slug(route name)` while the crag id (`mid`) sat unused in the same
expression. `uniq()` then appended `_2`, `_3` in walk order, so the counter records nothing
but the order OpenBeta happened to be crawled. It now emits `mid + "_" + slug(name)`, and
`uniq` only fires for a genuine same-name-same-crag clash. `load-state.mjs` was never at
fault — it passes `r.id` straight through from `catalog/`.

> **Re-importing a legacy state would duplicate it, not update it.** `load-state.mjs`
> upserts with `Prefer: resolution=merge-duplicates`, which resolves on the PRIMARY KEY.
> Every route in an already-loaded state is stored under an old state-scoped id, so a
> re-run after the ETL fix hands PostgREST a *new* peak-scoped id and it INSERTs a second
> copy — 8,000+ rows for WA, ~200,000 catalog-wide.
>
> `load-state.mjs` now runs a preflight that fails closed: it looks up existing routes by
> `(area_id, name)` — the identity that actually means "the same climb" — and refuses to
> load if any incoming route matches one under a different id, printing both ids.
> `--allow-duplicate-names` overrides it, and should only be used once you have confirmed
> the rows really are distinct climbs. Before re-importing any state loaded under the old
> scheme, migrate its ids first.

### Enrichment prose must not be written into a display field

A research pass has one job that keeps going wrong: it answers the question it was asked
and writes the *answer paragraph* into a column the UI renders as a **label**. The column
is then correct — the prose is accurate, sourced and useful — and the screen is broken,
which is why nothing catches it. Every guard the repo has asks whether a column is
populated; none asks whether what is in it is the right *shape*.

Three columns have taken this and all three now have a reader-side defence. **Write the
value, put the reasoning somewhere else.**

- **`season` is a WINDOW, not an explanation.** It is rendered in the route header strap
  beside elevation and pitch count (`8,815 ft · 6p · Jul-Sep`). Enrichment has written up
  to 232 characters into it (`wa_hourglass_gully_winter`), and a paragraph about snow
  bridges then wrapped over the cover photo and pushed the header open. WA currently has
  **14 `season` values containing a parenthetical** and many more that are a whole
  sentence — `"Late May–June is most commonly reported, when snow still covers the couloir
  and brush; by mid-summer the couloir is loose talus/scree"`. Write `"late May-Jun"` there
  and put that sentence in **`best_season`** or `seasonal_guidance.monthBreakdown`, which
  exist for exactly this and are rendered as prose on the Conditions tab.
  `seasonShort()` in `RouteDetail.jsx` defends the header by matching a month range and
  falling back to a cut at `;`/`.`/`(` — but it is a *repair*, and it can only ever show
  less than what was written.
  - **Shortening is only half a fix; audit what the box ACTUALLY SAYS afterwards.** When the
    same defence was pointed at `approach_variants[].season`, **15% (132 of 885)** fell through
    to its last-resort truncation and read as nonsense — `"Roughly January through the e…"`,
    `"Same window, and only with th…"`. Three causes wanting three different repairs: **25%
    already fitted 48 characters** (the 30-char budget is a HEADER-STRAP constraint, and the
    approach pill owns its own row — `seasonShort(s, max)` now takes a per-call budget); **38%
    had a real window whose ends are SEASONS not months** (`"August to autumn"`, `"Late summer
    into early September"`); **37% genuinely long**, which now truncate on a **word boundary**
    so the pill reads as a sentence that stops rather than a bug. **132 → 44 (15% → 5%)**, both
    mechanical causes at zero.
  - **WIDENING THE PRIMARY PATTERN CAUSED A REGRESSION, and only measuring the OTHER caller
    caught it.** The rungs run window → clause-cut → truncate, so a widened window **preempts**
    values whose first clause was already the better answer:
    `"Summer (rock) or late winter-spring (ice/mixed)"` showed `"Summer"` and became
    `"late winter-spring"` — the strap telling a climber a summer rock route is a winter route.
    The season-word pattern is therefore a **separate, later** fallback tried only after the
    clause cut fails, never a widening of the first. Header diffs went 13 → 8, and the remaining
    8 are all word-boundary improvements.
    **When you change a shared display helper, diff the other caller's output over real data** —
    `scripts/oneoff/verify-season-short-header-unchanged.mjs` loads the function from a git ref
    and from the working tree and compares across every distinct catalog value.
  - **Point the audit at the surface it claims to describe.** That audit called
    `seasonShort(full)` with the default 30 while the app passes 48, so it was measuring the
    header strap while reporting on the approach panel — its "already fits" bucket stayed stuck
    at 33 until that was corrected.
- **`grade` is a GRADE.** It reaches the compact route rows on an area page and the header
  pill, where there is room for `5.9` and not for `"5.11b/c (6c+ French, E4 6a British)"`
  or `"4th class, described by guidebook sources as 'probably low 5th to most'"`.
  `shortGrade()`/`gradeDetail()` in `lib/grade.js` split them, and the qualifier renders in
  the GRADES panel on the route page — so the words are not lost, but the split is done by
  a list of cut tokens and a new phrasing can defeat it. Put the qualifier in
  `pitch_detail[].notes` or `beta`.
- **`rappels` is prose today and reads like a count.** Every WA value is a sentence
  (`"~5 single-rope rappels, approximately 400 ft total, down the NE Face"`,
  `"Variable — downclimb/short rappels on West Ridge itself, or ~5 single-rope raps via
  East Ledges/NE Face"`). There are also `rappel_count_note` and `rappel_detail` columns.
  A UI that wants "how many rappels" cannot get it from any of them without parsing
  English, and a parse that reads "~5" out of the second example is **wrong** — that route
  is a downclimb unless you choose the East Ledges descent. If a numeric rappel count is
  ever needed it has to be a new, explicitly-nullable column, and `null` must mean
  "depends on the descent chosen" rather than defaulting to 0. See
  [[fail-open-coercion-hides-missing-data]] for why the 0 would be the dangerous part.
  - **"Every WA value is a sentence" is MEASURED NOW, and understated: it is every value in the
    CATALOG.** `scripts/oneoff/measure-rappels-column-shape.mjs` reads the whole column rather than
    the WA subtree — **733 of 733 rows are strings**, no objects, no numbers, no arrays.
  - **That is what makes `fmtRappels`' unit branch DEAD, and it is why the unit census flags it.**
    That helper returns early on `typeof r!=="object"` and otherwise renders `r.lengthM+"m"` or
    `r.lengthFt+"ft"` — a unit chosen by WHICH COLUMN the value came from rather than by the
    climber's setting — reaching `rappelNoteText` and the TECH STATS *Rappels* tile. It is a
    **false positive** of `measure-imperial-unit-literals.mjs`, not a defect to convert, because no
    row can reach it. **The measurement is the tripwire**: the day something writes an object here,
    the branch arms itself and shows metres to an imperial climber, so re-run the script rather
    than re-reading this sentence. Same discipline as the `sling_rack` shapes — *a claim about the
    stored shape is a claim about the DATA*, and this file records being wrong about that before.

- **`bivy[].capacity` / `.water` / `.permit` are CHIPS, and the camping enrichment filled all
  three with paragraphs.** Measured on the live catalog: median **130 / 136 / 297** characters
  and up to **1,386**, so **5,001 / 5,008 / 5,020 of 5,083** sites carried prose inside a
  rounded pill (`borderRadius:20, padding:"2px 9px"`). The panel reached **15,796 characters**
  on one route and was always fully expanded on a 390px phone. This is the same defect as
  `season` and `grade` above, committed by a pass that had *read this section* — the two named
  columns were avoided and three unnamed ones took the identical hit, because the rule was
  remembered as a fact about `season` and `grade` rather than as a question to ask of any
  column. **Ask the question of the column you are actually writing.**
  - Defended reader-side, the way `seasonShort()` and `shortGrade()` defend theirs: the pill is
    gone, the sites are **collapsed** to name + elevation + type, and the prose renders as a
    labelled block inside the disclosure. `check:camping` pins both directions — prose out of
    the default view, and prose still *selected* by `campDetail()`, since a disclosure that
    stops selecting has not hidden the data, it has deleted it.
  - **A derived "water · no permit" summary line was designed, measured and REJECTED**, and the
    measurement is worth not repeating (`scripts/oneoff/measure-camping-verdict-vocabulary.mjs`).
    A keyword rule leaves **44% of permits and 30% of waters** in no bucket at all, and where it
    *does* fire it is wrong in the dangerous direction: *"Free self-issued wilderness permit at
    the Killen Creek trailhead"* reads as **no permit** to any negation rule, and a self-issued
    permit is one you still have to fill in. Being wrong about a permit costs a fine; being
    wrong about water sends a party up dry. Same refusal as `rappels` above — **do not read a
    fact out of English prose**, least of all a safety- or money-adjacent one.
  - The measuring script's own first-clause splitter cut *"Cascade Volcano Pass (Mt. Adams)"* at
    the abbreviation, which is the tokeniser trap `audit:approach-scope` already records. **A
    count is only as good as its tokeniser**, including the count you are using to decide
    whether a rule is safe.

The rule generalises: **before writing a researched string into an existing column, look at
where that column renders.** `npm run check:field-renders` will tell you; a column that
reaches a header, a pill, a chip or a table cell takes a value, and its explanation belongs
in the prose column beside it. Note what that guard could **not** catch here: it asks whether a
column reaches a screen, and all three of these did — correctly, in full, in the wrong shape.
**Reaching a screen and fitting the element it reaches are different questions.**
