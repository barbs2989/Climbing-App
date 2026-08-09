# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install deps (React 18 + Vite)
npm run dev        # local dev server with HMR
npm run build      # production build to dist/ (runs check:refs + check:hooks first)
npm run preview    # serve the built dist/ locally
npm run check:refs # identifiers referenced but never bound (runs in build + CI)
npm run check:hooks# React hooks-rules violations (runs in build + CI)
npm run check:dead-props # props passed or declared but never read (runs in build + CI)
npm run check:ui   # drives the real app in Chrome and asserts per-screen invariants
npm run check:boot # index.html's boot placeholder still matches the real nav
npm run check:bare # renders a route with NO enrichment — the shape 99.5% of them have
npm run check:zero # walks every tab and all 27 modals as a BRAND-NEW account sees them
npm run check:signed-in # walks a REAL signed-in account that owns a crew and a group
npm run check:drift# does the live site actually serve the current tip of main?
npm run check:counts# does every areas.route_count still match the truth?
```

There is no unit test suite, linter, or type checker. The `check:` scripts are what
stands in for one, and they target the failure mode this codebase actually ships: not
a build error, but a screen that renders wrong or not at all.

- **`check:refs`** parses with Babel and fails on any identifier with no binding in
  an enclosing scope — the bug that blank-screened production in #317 and #359.
  It runs inside `npm run build`, so it gates CI too. Keep
  `scripts/undefined-refs-baseline.json` empty.
- **`check:boot`** compares the inline boot placeholder in `index.html` (the app
  shell painted while the bundle loads) against the real `NAV` array. It is a
  hand-copy, so a renamed or reordered tab would otherwise flicker stale chrome
  before React swaps it out, and nothing else would catch it. Gated by `npm run build`.
- **`check:hooks`** catches hooks called outside a component body — the #377 bug
  (an invalid hook call inside a click handler). Also gated by `npm run build`.
- **`check:dead-props`** asks two questions of every component: does it destructure a prop
  it never references, and does a call site pass a prop it never destructures? The second
  is the runtime bug — `<Foo onSave={…}/>` where `Foo` reads `onSubmit` looks correct at
  both ends and silently does nothing. The first is slower-acting: #656 deferred list
  persistence partly because `Challenges` received `setUserLists` and **never called it**,
  so dead wiring read as a feature already plumbed. #667 swept both to zero. A pass does
  **not** mean a prop is used meaningfully — a prop forwarded straight to a child counts as
  referenced, so this cannot see a handler wired to a button that never renders. Removals
  **cascade** (deleting a param strands the wiring that fed it), so re-run to a fixpoint
  rather than once. Gated by `npm run build`. Injection-tested, and worth knowing why: three
  defects in the first draft each made it report a clean sweep while real findings existed —
  Babel's shorthand `{foo}` gives the property a key node *and* a value node that **is** the
  binding, so every prop marked itself referenced; `<ActionIcon/>` is a `JSXIdentifier`, not
  an `Identifier`, so an Identifier-only visitor called 6 live props dead; and keying
  components by name alone silently picks one of the two `LoginScreen`/`Pill`/`SL`
  definitions. Re-run the injections named at the bottom of the script before trusting a
  green result after any traversal change.
- **`check:bare`** renders the real `RouteDetail` with `react-dom/server` for a route that
  has **no enrichment** — name, grade, pitches and nothing else — across every discipline ×
  sub-tab, and asserts the screen states what it does not know. It exists because `check:ui`
  walks exactly **one** route detail and the route it samples is an *enriched* one, so the
  shape almost every route actually has was the one shape nothing rendered. Enrichment
  reaches ~648 of 5,477 alpine-scope routes; catalog-wide it is 1,023 of 205,492. Two bugs
  shipped straight through that hole: **#641** (`scarfHrs` coerces `+distKm||0`, so "no
  approach data" and "a zero approach" were identical — Total/Est. summit/Est. return added
  a 0.0hr hike leg and the return tile went **green**, an affirmative "you're down before
  dark" with the walk in *and* out counted as zero, and the "After dark" warning could never
  fire) and **#655** (the sport/trad/bouldering safety advice sat behind the Safety tab,
  which is hidden for exactly those three disciplines). Both were invisible to a guard that
  only renders a populated route. Gated by `npm run build`. Injection-tested: restoring the
  pre-#641 file trips 6 assertions, and renaming a UI anchor trips `ANCHOR LOST` rather than
  silently passing. **Effects do not run under `renderToStaticMarkup`**, so anything animated
  (`CountUp`) renders its initial `0` — never assert on those numbers.
- **`check:ui`** spawns a dev server, walks 12 screens in headless Chrome, and
  asserts: nothing blanked, no uncaught page errors, no `NaN`/`undefined`/`null`/
  `[object Object]` in rendered copy, and named sections still present. It is
  **not** wired into `deploy.yml` — browser automation is too slow and flaky to
  sit in front of production deploys. Run it by hand before merging anything that
  touches the render tree. `--snapshot before.json` / `--snapshot after.json` dumps
  per-screen text so you can prove a refactor is behaviour-neutral; only the clock
  inside ASPECT & SUN should differ between two runs. `--url <live URL>` points the
  same walk at the deployed site instead of a dev server.
- **`check:zero`** walks all six tabs and every overlay the app declares (27 today) as a
  **brand-new account** sees them — every count zero, every list empty. It exists because
  `check:ui` walks the *seeded demo*: `bookmarks` is `["lcc","wasatch"]`, a crew exists,
  `friendReqIn` is `[5]`, `crewUnread` is `{crew_seed_tingey:2}`. So every branch that only
  runs when a count is zero is dead ground to it, and it never opens a modal at all. Four
  rounds of bugs lived in that gap, all with `check:ui` green: **#637** (Home dropped 3 of 4
  tiles and the whole Unfinished business dropdown), **#654** (`Last verified catch: · 0
  partners confirmed`; the demo climber's 950 ft/hr shown as a new user's own pace),
  **#662** (four `Suspense fallback={null}` boundaries — a blank content area), and **#674**
  (the share card putting the word `undefined` into the clipboard copy, the `mailto:` body,
  the `sms:` body and the tweet). The pattern in all four: *a section that is correct with
  data becomes a lie, a dangling label, or a dead end at zero.*
  - The zero state is forced by `scripts/zero-state.config.mjs`, a Vite config used only by
    this check. It rewrites three anchors **in memory** to replay the app's own sign-in
    reset — never edit the source, and never hand-copy that reset: a copy that omits
    `setProfile` or the `Object.assign(ME,…)` manufactures leaks that were never there.
    Each anchor must match **exactly once** or the run dies with `ANCHOR LOST`, so a moved
    anchor cannot quietly walk the populated app and pass.
  - Overlays are **discovered from the source**, not listed in the script, so a modal added
    tomorrow is walked without anyone registering it. One declared below the injection point
    is named in the output rather than silently skipped.
  - Injection-tested: restoring the four #674 defects trips 7 assertions, and breaking an
    anchor fails with `ANCHOR LOST` **plus** "nothing below was actually checked".
  - Runs on every PR via `.github/workflows/zero-state.yml` — its **own** workflow, not a
    step in `build-check.yml` and not in `deploy.yml`, so a browser flake cannot read as
    "the build is broken" or block a deploy. It is **not** in `npm run build`, so a local
    build will not catch a regression here; run it by hand, CI is the backstop.
    `playwright-core` downloads no browser, so it drives the Google Chrome that ships on
    the `ubuntu-latest` image — the workflow asserts Chrome is present before starting.
  - Opening an overlay by name reaches some the UI would not offer at zero (e.g.
    `vouchesGivenOpen` only opens from a *See all N →* button needing >3 vouches). Check the
    setter's call sites before treating an empty one as a bug.
- **`check:signed-in`** walks the app as a **real signed-in account that already owns
  things** — a crew and a group, each with a *second real member*. It fills the one gap the
  two checks either side of it cannot reach: `check:ui` walks the seeded demo logged out, so
  every id it resolves is a seed integer; `check:zero` walks a new account with every list
  empty, so there is nothing to resolve. **Real data under a uuid** is neither, and it has
  shipped bugs three times — **#569** (crew roster resolved members against seed `CLIMBERS`,
  so a uuid matched nothing and a populated crew read `You + 0 climbers`), **#680** (group
  management compared `ownerId` against the seed id `0`, so a DB group's own owner got no
  controls), and **#688** (four more, below). Same shape every time: *seed-id logic meeting a
  uuid.*
  - Two accounts, created and destroyed **per run** (`scripts/lib/ui-fixture.mjs`). The
    second one is the point — a solo fixture reproduces none of the bugs above, which is why
    the 2026-08-05 `--signed-in` attempt was injection-tested, **missed**, and was reverted.
    Per-run rather than one permanent QA account, because a fake climber left in `profiles`
    surfaces in partner search for real users.
  - Emails are on the reserved `.invalid` domain, so a stray confirmation can never route.
    `sweepOrphans()` runs before each fixture and removes anything an earlier run left, so a
    killed process leaks at most until the next run — teardown retries are not enough on
    their own, because a killed process never reaches its `finally` block.
  - The session is **injected into `localStorage` under `climbmatch-auth`**, not typed into
    the sign-in modal: deterministic, and not coupled to that modal's markup.
  - It deliberately does **not** set `VITE_DEMO_AUTOLOGIN`, so `realAuthGate` is live and the
    injected session must satisfy the same gate a production user does. It asserts *who* it
    is signed in as before anything else — otherwise a rejected session would quietly walk a
    demo identity and report green about the wrong account.
  - Requires the **service key** and `VITE_USE_DB=true`; it exits 1 rather than walking a
    seed app. Not in `build` or CI, and CI should not hold a service key.
  - Setup uses the service key, which **bypasses RLS** — so a row existing here is no
    evidence a policy would have let a user create it. This answers "does the screen render
    correctly", never "is the policy right".
  - Injection-tested: reverting each of the five defects it claims to catch fails the run,
    and each case requires a failure message that *names* that defect — a run that dies from
    a port race must not count as a catch.
- **`check:drift`** asks whether the live site is actually serving the current tip
  of `main`, and runs on a schedule (`.github/workflows/deploy-drift.yml`), not in
  the build. It exists because on 2026-08-06 production sat **8 commits behind for
  five hours** and nothing said so: `cancel-in-progress: true` had merges killing
  each other's builds (fixed in #616), and during a GitHub Actions outage nine
  merges produced **no deploy run at all**. A workflow cannot report on a run that
  never existed, so the question has to be asked from outside. Two traps it encodes:
  the newest deployment record is **not** necessarily the live one — a stale run can
  put a `failure` record on top of a healthy site, so it walks back to the most
  recent deployment whose status is actually `success`; and it holds a 45-minute
  grace window, because a commit that landed two minutes ago is lag, not drift.
  It reports rather than self-heals: a `workflow_dispatch` made with the built-in
  `GITHUB_TOKEN` does not start a new run, so an auto-redeploy step would look like
  it worked and do nothing. The fix is `gh workflow run deploy.yml --ref main`.
- **`check:counts`** asks whether every `areas.route_count` still matches a fresh
  count of its subtree, and runs daily (`.github/workflows/area-count-drift.yml`),
  not in the build. `route_count` is maintained by a trigger on the **routes**
  table, so it is correct for route inserts/deletes/moves but nothing maintains it
  when an **area** moves, is merged, or is deleted — each of those silently leaves
  every ancestor above it wrong. 0017, 0027 and 0098 each repaired a round of this,
  and each round was found by somebody auditing by hand. It is not cosmetic:
  `route_count` is what the area browser prints beside an area name and what
  `lib/db.js` orders areas by, so a stale value both misstates the number and
  misplaces the area — before 0098, Liberty Bell Group cached **6 against a true
  27** and sorted as though it were tiny.
  - **Not a build gate, deliberately.** Drift is a property of the database, not
    the checkout: no code change can cause it and none can fix it, so failing
    `npm run build` would block unrelated PRs on a condition their author cannot
    affect, and whoever caused it (by running a migration) is not who sees red.
  - Read-only, anon key only — a checker that could write is a checker that can
    corrupt what it is checking. It also fails closed on an empty read, because
    this guard's realistic failure mode is a **false pass**: zero routes makes
    every area look consistent.
  - Walks the tree once (post-order DFS, O(n)) instead of running one `path <@`
    subtree count per area, which is 47k aggregate queries over 205k rows — that
    cost is why the invariant went unchecked for so long.
  - Injection-tested; the four cases are named at the bottom of the script and are
    driven by `--inject=`, since the fault lives in the DB and the checker cannot
    write. `--sql` prints the repair as a **recount**, never as literal numbers.

Landmark assertions in `check:ui` match whole lines, never substrings — a
substring test passes `"RACK"` on the strength of `"ROUTE TRACK"`, which is exactly
how a live section gets deleted while the check stays green.

Pushing to `main` (or `master`) triggers `.github/workflows/deploy.yml`, which builds and publishes `dist/` to GitHub Pages at https://barbs2989.github.io/Climbing-App/. `vite.config.js` sets `base: "/Climbing-App/"` to match the repo name — this must stay in sync with the repo name or asset links break on Pages.

## Architecture

This is **ClimbMatch**, a mobile-first social app for finding climbing partners, planning objectives, and sharing route conditions. The entire application is a single React component file.

- `index.html` → loads `main.jsx` → renders `<App/>` from `ClimbMatch.jsx`.
- **`ClimbMatch.jsx` + `ClimbMatchCore.jsx` are essentially the whole app.** `ClimbMatchCore.jsx` holds bands 1-2 (constants, seed data, pure helpers, presentational components — everything that used to sit above `App`); `ClimbMatch.jsx` holds the `App` component and imports the rest from core. Module globals that `App` reassigns (`UNITS`, `DLOCALE`, `RESPONSE_RATES`, toast/celebration timers) are written through `__set_*` shims exported by core, because ESM import bindings are read-only. Both files keep the deliberately dense, single-line-per-declaration style (many `const`s and components packed onto one physical line). Expect very long lines; use `grep -n` with the symbol name rather than scrolling.

### A real Supabase backend exists, but most of the app still runs on in-memory seed data

A `USE_DB` flag (`lib/supabase.js`, on when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`/`VITE_USE_DB=true` are all set) gates a real DB path: `lib/db.js` (`useAreaRoutes`, `submitContribution`, `dbRouteToCamel`) and `lib/DbAreaBrowser.jsx` back the Climbs tab's area browser + route list from Supabase's `areas`/`routes` tables, which hold Washington's full alpine + rock catalog (thousands of routes — see `BACKEND.md` for the schema and pipeline). `lib/auth.js`/`lib/AuthModal.jsx` provide real login. See `BACKEND.md` for what's DB-backed vs. still simulated.

Everything else — crews, messages, connections, vouches, logs, trip reports, and any state outside a DB-backed route's own fields — is still **seeded from module-level `const` arrays/objects at the top of the file and lives only in React state for the session** (refreshing resets everything). Key seed data structures:

- `ROUTES` — the in-memory climbs fallback/demo set (each has an `id`, `mountainId`, grade, `activity`/trip reports, gear, hazards, GPX points, etc.). DB-backed routes bypass this via `dbRouteToCamel()`.
- `MOUNTAINS` — a **hierarchical area tree** (world → country → state → range → canyon → peak/crag/wall) linked by `parentId`, for the in-memory fallback. Routes reference areas via `mountainId`. `inArea(mid, sid)` walks parents to test membership; `areaPathNames(mid)` builds the breadcrumb. The DB-backed path uses the equivalent `areas`/`routes` tables and `ltree` instead.
- `CLIMBERS` / `FILLER_CLIMBERS` — other users; `ME` is the current user. Not migrated to the DB yet (see the note below on real profiles).
- `DEMO_FILLERS` — a boolean toggle that gates a lot of seed content (clubs, crews, my-climbs, etc.). Turning it off empties those sections.

`ME`, and the globals `UNITS` and `DLOCALE`, are **mutated directly** (not via `setState`) inside `App` — e.g. `ME.objectiveIds = wishlist` at the top of the component (~line 2212). Be aware that some state lives on these mutable module globals rather than purely in hooks.

> **Do not write to `ME` directly.** Profile/user state is owned by React hooks (`wishlist`, `myAvail`, `profile`, and the `editDraft`/`saveEdit` flow) — always update it through those setters (`setWishlist`, `setProfile`, etc.). The existing `ME.* = ...` assignments at ~line 2212 are a legacy sync hack that copies state back onto the global each render so the rest of the code can read `ME`; they are not a pattern to extend. Mutating `ME` directly is invisible to React, won't trigger a re-render, and creates a second source of truth that silently drifts from the hooks.

### The single `App` component

`export default function App()` (near the bottom, ~line 2208) holds **~100 `useState` hooks** and every screen. Navigation is driven by a single `tab` state string. Main tabs:

- `today` — home dashboard (greeting, recent condition reports, your crews, suggestions).
- `routes` — explore climbs by area, and (when `selRoute` is set) the route detail screen. Route detail has its own sub-`tab` state: `overview`, `conditions`, `planner`, `safety`, `photos`, `ranks`.
- `discover` — find partners or crews (`partnersMode` toggles `"partners"` / `"crews"`).
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

- `compat(a, b)` (~L335) — partner compatibility score (clamped 20–99) from shared disciplines, grade closeness, shared objectives, verification, pace (`hikingSpeedFtHr`), and availability overlap.
- `buildConsensus(activity)` (~L344) — distills a route's trip reports into a conditions summary, weighting each report by the author's `trustScore` and recency; separates all-time vs recent tags and surfaces hazards.
- `datesAgreed(c)` / `agreedDate(c)` (~L382/384) — a crew reaches "Ready" only when every confirmed member (including ME = id `0`) has acked the same proposed day (`dayAcks`).
- `scarfHrs(...)` + `techHrs(...)` (~L336/337) — planner time estimates: Naismith-style approach time (fitness tier + pack weight) plus pitch-by-pitch climbing time (exponential slowdown by grade).

## Working in this codebase

- When adding a feature, follow the existing pattern: add seed data to the relevant top-level `const`, add `useState` in `App`, and add a `tab===...`/sub-view branch in the render tree. Match the dense, inline-style formatting of surrounding code.
- Styling is always inline `style={{...}}` referencing the `C` palette — do not introduce CSS files or a styling library.
- For anything outside the DB-backed routes/areas/contributions/auth path (crews, messages, connections, vouches, logs, trip reports, etc.), "saving" means updating React state — don't reach for storage APIs unless explicitly asked to add persistence. For DB-backed data, use the existing `lib/db.js`/`lib/supabase.js` patterns (e.g. `submitContribution`) rather than writing new ad-hoc persistence.

### One-off scripts that touch Supabase

Import `scripts/lib/supabase-env.mjs` — do not hand-roll env loading. The
credentials are split across two gitignored files (`SUPABASE_SERVICE_KEY` in
`.env`, the `VITE_*` url/anon key in `.env.local`), so a script that reads only
one file gets `undefined` for the other half. That fails silently in the worst
way: PostgREST accepts a PATCH sent with the anon key and returns **200 with an
empty array**, because RLS rejected every row. The write reports success and
changes nothing.

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
- `id like 'wa_%'` is the reflex filter and it misses legacy ids like
  `stuart_west_ridge` — 6 WA routes today. Filter by the area subtree when a coverage
  percentage matters.

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
