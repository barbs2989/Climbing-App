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
npm run check:seed-history # seed climbs must never be attributed to a real account (in build)
npm run check:overlay-discovery # every modal the app declares is still reachable by the guards (in build)
npm run check:zero # walks every tab and all 27 modals as a BRAND-NEW account sees them
npm run check:dead-flag-gates # UI fed only by a constant a false flag empties (in build)
npm run check:icons # the app declares an icon, and every icon it names exists (in build)
npm run check:contrib-fields # every field the contribute form offers is actually applied (in build)
npm run check:grade-parser  # grade_num is parsed in exactly one place (in build)
npm run check:approve-route-columns # nothing may fork approve_new_route again (in build)
npm run check:rappel-readers # no rappelDetail reader out-votes an agreed correction (in build)
npm run check:crew-member-readers # no crew member id resolved against seed CLIMBERS (in build)
npm run check:real-profile-rows # no row prints a level/trust a real profile lacks (in build)
npm run check:provenance   # every wired section heading still shows how it was sourced (in build)
npm run check:wp-styles    # the app can DRAW every waypoint type it recognises (in build)
npm run check:logged-times # a climber’s logged time reaches the planner (in build)
npm run check:camping      # CAMPING & BIVY reaches Planner, and merges both stores (in build)
npm run check:toast-reachable # every screen App returns can SHOW a toast (in build)
npm run check:log  # BOTH climb_logs hydrations keep every column worth showing (in build)
npm run check:fire # the wildfire surfaces cannot claim what they don't know (in build)
npm run check:signed-in # walks a REAL signed-in account that owns a crew and a group
npm run check:overlay-scroll # no overlay pane may chain its scroll to the page behind
npm run check:field-renders # every enriched route column actually reaches a screen
npm run check:a11y-badges # no control announces its badge count welded to its label
npm run check:overflow # nothing runs off the right-hand edge of a 390px phone
npm run check:anniversary # the climb-anniversary notification still reaches a screen
npm run check:challenge-rows # tick-list rows say something true, and the tick matches the row
npm run check:clickable # no NEW control that only a mouse can operate (in build)
npm run check:drift# does the live site actually serve the current tip of main?
npm run check:counts# does every areas.route_count still match the truth?
npm run check:migration-claims # do two OPEN PRs claim the same migration number?
npm run check:sql -- fix.sql # would this hand-written SQL actually match anything? (run before handing it over)
npm run check:merge-survival # did a merge silently DELETE what a parent added?
npm run check:ci-cancel # can a guard running on main be cancelled by the next merge? (in build)
npm run check:overlays # every overlay inside #appscroll is portalled to document.body (in build)
npm run check:disc-labels # one spelling per discipline, everywhere (in build)
npm run check:claims # no success toast for a write that only runs signed-in (in build)
npm run check:a11y-names # every control a screen reader reaches has a name (in build)
npm run check:pitch-split # a pitch_detail entry reaches the section describing it (in build)
npm run check:route-tags # real list prose still reaches a list key, and each key renders (in build)
npm run check:contrib-shapes # what the contribute form SUBMITS is the shape its readers READ (in build)
npm run check:rappel-single-rope # the headline rappel count is the single-rope one (in build)
npm run check:flex-scroll # no scroll pane in a flex column that cannot actually scroll (in build)
npm run check:dialog-dismiss # every dialog can be left without guessing (in build)
npm run check:guard-wiring # every guard on disk actually RUNS, and is named here (in build)
npm run check:action-versions # no workflow pins an action below the version we moved to (in build)
npm run check:schema # lib/db.js never reads a table or column the database lacks (in build)
npm run check:writes # no success message in front of a write whose failure is unobservable (in build)
npm run check:zindex # the toast stays above every overlay, so an error can be read (in build)
npm run check:crew  # guards the crew "Ready" calculation (in build)
npm run check:migrations # two migrations must never share a number (in build)
npm run check:add-route-fields # add-a-climb asks what the discipline needs, and nothing unstorable (in build)
npm run audit:area-parents # is every area filed under the place it belongs to?
npm run audit:waypoints    # is each waypoint actually on the route's own gpx track?
npm run audit:waypoint-order # is the waypoint LIST sensible — order and duplicate pins?
npm run audit:waypoint-track # THIRD waypoint audit — same question as audit:waypoints, different answer
npm run audit:trailhead-agreement # a route stores its trailhead TWICE — do the two copies agree?
npm run audit:approach-scope # does a route's approach text run past the base of the climb?
npm run check:rappel-lengths # can the rope a route describes actually reach the rappel it states?
npm run audit:rappel-claims  # does `rappels` claim raps the route's own descent_text denies?
npm run enrich:next-batch  # next unpitched routes still needing a climbing_route
npm run check:enrichment-traceable # does a climbing_route batch invent anything?
npm run audit:terrain      # does a route's safety advice match the terrain it crosses?
npm run audit:rappels      # do a route's rappel fields agree with each other?
npm run audit:hazard-redundancy # how often does KNOWN HAZARDS say the same thing twice?
npm run audit:fifty-classics # which Fifty Classics does the catalog hold, and are they tagged?
npm run audit:list-coverage # how full is each named tick-list against the total it advertises?
npm run enrich:apply       # write approach_variants / climbing_route / bivy (--dry first)
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
  which was hidden for exactly those three disciplines — that tab is unconditional now, so the
  advice is asserted on it rather than inline on Overview). Both were invisible to a guard that
  only renders a populated route. Gated by `npm run build`. Injection-tested: restoring the
  pre-#641 file trips 6 assertions, and renaming a UI anchor trips `ANCHOR LOST` rather than
  silently passing. **Effects do not run under `renderToStaticMarkup`**, so anything animated
  (`CountUp`) renders its initial `0` — never assert on those numbers.
  - It also pins **where the nearby-fire panel lives**: first section of the Safety tab, on every
    route, and nowhere else. That needed a **located** fixture — `bare()`'s area has no `lat`/`lng`
    and `FireNearRoute` renders nothing without a coordinate, so every other render here is of a
    route where the panel is correctly absent. Match its loading line, **never its "Fire & smoke"
    heading**: the Safety tab's forecast list links `Fire & smoke — AirNow`, and an injection that
    removed the panel from Safety entirely passed on the strength of that link.
  - **Plan and Safety are gated differently, and it asserts both.** `showPlan` is content-gated;
    the Safety tab is **unconditional**. An empty Plan tab promises an approach and a descent and
    delivers a blank, but the Safety tab is never empty — the per-discipline advice, the forecast
    links and the fire panel all render without the route carrying one safety field of its own.
    While Safety was content-gated too, 99.5% of the catalog had nowhere to show a live wildfire.
    `hasSafetyContent()` is gone; `hasPlanContent()` stays.
- **`check:seed-history`** asserts that seed climbing history is only ever attributed to a
  **seed** identity. `ticksFor(name)` scans `ROUTES[].activity` for `a.user === name` — it
  matches a **display name**, which belongs to neither id space, so it hands one person's
  climbing record to anyone who shares their name. Eleven names author seed activity (Maya
  Chen 11 rows, Alex Torres 8, Jordan Park 7 … and "Nathan Barber", the seed `ME`). Two real
  identities collide with them: **`ME`**, whose `id` is *never* reassigned — it is `0` signed
  in or out — while `ME.name` becomes the real account's profile name; and a **DB-backed
  friend**, a uuid that the friends list hands to `FullProfile`. Before #735 a real account
  named "Nathan Barber" saw *Angels Landing, Oct 2024, Summit, 5★* on its own résumé. Not
  cosmetic: three `Leaderboards` badges (`classics_b`, `highpoints_b`, `peaks_b`) **count**
  those rows and `me` is in the pool whenever `showOnRanks` is set, so a collision **scores**.
  Gated by `npm run build`.
  - The id test alone cannot work, for the reason #680 records: **`0` is a real id.** The gate
    is `typeof c.id==="number" && (c.id!==0 || !DB_UID)`, where `DB_UID` is a module global
    written by `__set_DB_UID(uid)` — keyed on the **session**, exactly like the sign-in reset
    (`useEffect(…,[uid])`), not on a build flag. With `DEMO_AUTOLOGIN` on, a visitor browsing
    the demo has no `uid` and the demo is untouched.
  - Ironically the sign-in reset is what **exposes** this: it clears `ME.ticks`, and clearing
    it is what makes `Resume`/`TickList` fall *through* to the name scan.
  - The same root cause runs in **both directions**, and the second one is easier to miss.
    Eight places resolved a seed report's *author* as `a.user===ME.name?ME:CLIMBERS.find(…)`.
    Seed `activity` never holds a real account's own entries — those live in `logs` — so once
    you are signed in that branch can only ever be a **false** match. It is not a label: it
    feeds `trustOf` in `buildConsensus`/`kwScan` and the start-location and topo weightings,
    and a signed-in `ME` carries `trustScore:0` from the reset, so a name collision would
    quietly **re-weight the derived conditions consensus**. All eight now go through
    `seedAuthor(name)`, which falls through to `CLIMBERS` because the row really is the seed
    climber's.
  - The **static** half matters more than the render half — rendering can only prove today's
    call sites, while the real regression is a twelfth `ticksFor(x.name)` added next month. So
    it fails if `ticksFor` has any caller other than `seedHistoryFor`, and if any
    `===ME.name?ME` survives, naming file:line. Comments and string contents are blanked in
    **one stateful pass** (offsets preserved) for the reason `check:dead-flag-gates` records —
    a regex strip ate real code there — so prose that merely *mentions* the pattern is safe.
  - Injection-tested; the five cases are listed at the bottom of the script. Case 4 is the one
    that shaped it: gating on `!c.id` looks equivalent and silently empties every seed
    climber, so the seed-climber assertion is **comparative** (against a name with no seed
    activity) rather than a length threshold that a résumé shell would satisfy anyway.
- **`check:overlay-discovery`** asks whether every modal the app declares can still be
  *reached* by the three browser guards. They all walk "every overlay" and all get that list
  from `scripts/lib/overlay-scaffold.mjs`, which until 2026-08-09 discovered overlays by a
  **name** shape — `[xOpen,setX]=useState(false)`. #725 counted 28 found against **22 more**
  that carry `role="dialog"` and could be opened by **none of the three**: `LogAscent` (the
  largest component in the app, and where a climber records a climb), `FullProfile`, `Resume`,
  `GiveVouch`, `LogCatch`, `ReportModal`, `ConnectModal` and the rest — trust-and-safety
  surfaces heavily over-represented. Discovery is now **behavioural**: a state whose JSX
  renders a dialog, whatever it is called. Gated by `npm run build`, so unlike the browser
  guards it runs on every machine rather than only in CI.
  - **Nothing reported the omission, and could not have.** Those guards count overlays
    *opened*, so a modal the regex could not see was never a missing row — it was not a row.
    A coverage hole in a guard is invisible by construction unless something asks from
    outside, which is what this script is. Same lesson as `check:drift`: *a workflow cannot
    report on a run that never existed.*
  - Two precision rules, both wrong in the first draft. **Balance the braces, never take a
    fixed window** — half these modals are wrapped in an IIFE (`{crewInvite&&(()=>{…})()}`)
    so the dialog can be thousands of characters past the state name, and on a 428,000-char
    file there is no safe window size. And **the dialog must be the region's own first
    element**: `openGroupId` renders a full-screen group view whose nested `ReactionPicker`
    puts `role="dialog"` **24,227 characters in, behind 107 open tags**. Counting that would
    classify every screen large enough to contain a modal as a modal.
  - Brace-matching runs over **raw source**, deliberately *not* the comment/string blanker
    that `check:seed-history` and `check:dead-flag-gates` use. That blanker treats every
    quote as a string delimiter and JSX body text is full of apostrophes (`don't`), so it
    desynchronises and swallows braces — it is safe for *does this pattern appear*, and not
    for balancing. Blanking here returned **0 overlays** where raw returns 22.
  - Payloads live in `OVERLAY_PAYLOADS`, and the registry is **fail-closed**: a dialog state
    that is neither registered nor exempt in `NEEDS_EXTRA_STATE` fails the run. Discovery
    stays automatic; only the payload is registered, and an unregistered one is loud. Each
    expression is lifted from the app's **own setter call sites** rather than invented,
    because these modals hold the thing they are about and several resolve an id and
    `return null` on a miss — a wrong payload does not throw, it renders nothing and reads
    exactly like a broken modal.
  - A dialog state initialised to `false` needs no payload — it is a flag whatever it is
    called (`confirmDelete`, `pastExpand`). The **initial value** says how to open a state;
    the name says nothing. That is the point of discovering these by behaviour.
  - Whether the payload can actually resolve is **measured at runtime, not declared**,
    because the answer differs per guard: `check:zero` has nothing, `check:overlay-scroll`
    has the seeded demo (a crew — but `events` and the club `GROUPS` sit behind
    `DEMO_FILLERS`, permanently false), and `check:signed-in` has a real account owning a
    crew and a DB group. The opener records `window.__overlayNoPayload` and the guards report
    *skipped* rather than *mounted nothing*. A modal whose payload **did** resolve still has
    to render, so this cannot excuse a broken one.
  - `postMenuFor` and `reactPickerFor` are exempt: they render **inside** the `openGroupId`
    view and the `posts` they look up is a local of that IIFE, so no App-scope expression can
    open them.
  - **The hole it does not close, printed rather than hidden:** five overlay states live in
    `RouteDetail.jsx`, and the opener injects into `App`, so no `?z=` can ever reach another
    component's local state. They are walked only insofar as `check:ui` opens a route. The
    script reports the count as a `note` — a known quantity beats an absence nobody can see,
    which is the failure this whole guard is about.
  - Injection-tested; the five cases are at the bottom of the script. Case 1 (rename an
    overlay off the convention) must **pass**, and it is the one that drove a fix.
- **`check:ui`** spawns a dev server, walks 20 screens in headless Chrome, and
  asserts: nothing blanked, no uncaught page errors, no `NaN`/`undefined`/`null`/
  `[object Object]` in rendered copy, and named sections still present. It is the
  broadest of the browser guards and it runs on every PR via
  `.github/workflows/render-guards.yml` (~5m35s). It stays **out of `deploy.yml`** and
  out of `npm run build` — browser automation is too slow and flaky to sit in front of
  a production deploy, and a flake must not read as "the build is broken".
  - It was hand-run only until 2026-08-09, for a reason that no longer holds: it was too
    flaky to gate on. Both causes are fixed rather than tolerated — #464 made it claim a
    genuinely free port instead of adopting whatever answered 5190 (it had reported a
    failure in code it never loaded, and could equally have passed), and #742 made it
    settle on the text having stopped changing. Wiring it in only made sense *after* both.
  - `--snapshot before.json` / `--snapshot after.json` dumps per-screen text so you can
    prove a refactor is behaviour-neutral; only the clock inside ASPECT & SUN should differ
    between two runs. CI uploads that dump as the `ui-screens` artifact, because the failure
    line names the screen and the offending text but the surrounding copy is what tells you
    whether it is a real bug.
  - `--url <live URL>` points the same walk at the deployed site instead of a dev server.
  - **The sample route detail is pinned by name** (`North Ridge (Complete)` in Washington
    under `USE_DB`, `West Slabs` in Utah on seed), so a rename or delete in the live DB
    turns this red on a PR whose author changed nothing. The failure separates the two
    cases by reading the app's own `No routes match.` empty state rather than guessing from
    body length, and says which it is; `--route` repoints it.
  - **That discrimination is FIVE-way since #902, and the branch it gained is the one that
    was being answered wrongly.** The old fall-through asserted *"the list did not report an
    empty search, so this is the route list or the search box, **not missing data**"* — a
    confident claim it had no evidence for. A list that never POPULATED looks identical: no
    rows, no empty state. On 2026-08-13 that message sent a session hunting through
    `DbAreaBrowser` while Postgres was taking seconds per query; the route opened fine on the
    same commit once the database recovered. It now asks instead of inferring — is a spinner
    still up (`looksLikeSpinner`), and how fast is the database **right now**
    (`probeDbLatency`, a non-fatal sibling of `assertDbReachable`) — and every branch prints
    the measured latency rather than a guess.
    - `assertDbReachable` cannot cover this: it proves the project was alive **before** the
      walk. A **degraded** project answers `routes?limit=1` in under a second, passes the
      preflight comfortably, and still cannot fill a route list inside a settle timeout.
      Dead versus slow are different failures and the preflight only sees the first.
    - Skipped under `--url`, where local env describes a different deployment than the one
      being walked — the same exemption the preflight already carries.
    - The slow-DB wording is deliberately **advisory, not a verdict**: it says re-run once the
      project answers in well under a second and only investigate the list if it fails again
      on a healthy one. A guard that cannot be certain should say what it measured, not pick.
    - Injection-tested: neutering the empty-state regex falls through to the new branches and
      prints the latency; forcing the threshold to 0 fires the slow-DB branch; a nonexistent
      `--route` still takes the renamed-or-deleted branch, so the ordering did not regress.
      The still-loading branch is **not** injection-proven — forcing it needs a genuinely
      degraded database, and that is recorded rather than claimed.
  - **The Crew sub-views were unreachable until #740/#755 named their buttons**, and that is
    four screens of a six-tab app no render guard had ever opened. `tap()` matches control
    text exactly, and these buttons carry the badge *inside* the control, so `textContent` is
    `"Friends2"` and every exact-text strategy missed — while `tap()` returned `false`
    **silently**, so a caller that ignored it went on clicking whatever was on screen. Six
    attempts failed that way before the cause was clear. `tapByName()` clicks by **accessible
    name** instead, which is authored (`aria-label`) and so does not move when the count does.
    Crews is *not* captured: `crewView` defaults to it, so it is the `Crew` screen already
    captured, and that equality is asserted as a round-trip rather than dodged.
    `Crew:Friends` landmarks **`PEOPLE YOU’VE CLIMBED WITH`** — the surface #713 revived onto
    real `logs`, which until now nothing rendered in any guard (`check:dead-flag-gates` proves
    the constant feeding it is not dead, a different question from whether it reaches a
    screen). Uppercase with a curly apostrophe because `innerText` returns the CSS-transformed
    text, not the source string. `Crew:Groups` gets a 300-char floor: at 353 it is the app's
    shortest screen and a **correct** empty state, so the 400 default would fail working code.
    Injection-tested: removing the aria-label fails naming the sub-tab, and neutering the
    revived block fails naming the missing landmark.
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
    is named in the output rather than silently skipped. Discovery, the `?z=` opener and the
    lazy-chunk warm list are shared with `check:signed-in` via
    `scripts/lib/overlay-scaffold.mjs`, so the two cannot drift on which modals exist.
  - **No single tab hosts them all**, and until 2026-08-08 this walked every overlay from
    `?zt=me` and asserted nothing about whether it opened — so `areaTreeOpen`,
    `crewListOpen`, `unfinishedOpen` and `alertsOpen` rendered *identically to the bare
    profile tab* and were counted as walked. One of them is the Unfinished business dropdown,
    i.e. the guard written for **#637** never opened the thing #637 broke. It now tries each
    tab and **fails** if opening an overlay changes nothing on any of them. Two are exempt by
    name in `NEEDS_EXTRA_STATE`, each recording its real gate (`areaTreeOpen` renders as
    `areaTreeOpen && selArea`; `crewListOpen` is a disclosure inside the crew finder's
    results) — and a name there that stops being an overlay **fails**, so the exemption list
    cannot rot. The summary counts overlays **opened**, not declared.
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
  - Needs `VITE_USE_DB=true` plus the Supabase url/anon key; it exits 1 rather than walking a
    seed app. Not in `build` (browser automation), but it **does run in CI** since 2026-08-13.
  - **It has two fixture modes, and which one runs says where it is.** Locally it creates a
    pair per run with the **service key** and destroys them after. In CI it signs in to two
    **durable** accounts with the **anon key only** — CI must never hold the service key, and
    that requirement is exactly why this guard sat outside CI and went **~40 merged commits
    without running**. "Hand-run" means "not run" on a loaded machine. The privileged half now
    happens once, locally: `scripts/oneoff/create-ci-test-accounts.mjs` then
    `seed-ci-test-fixture.mjs`.
  - The durable pair is only acceptable because both profiles are **`discoverable=false`**, so
    they cannot appear in partner browse — the objection against a permanent QA account.
    `lib/durable-fixture.mjs` **re-asserts that on every run**, not just at setup: a later
    migration or column-default change could flip it.
  - **Seeding as the users found something the service key had been hiding.** RLS refuses an
    `INSERT` of a connection with `status:"accepted"` for *both* accounts (42501) — a real pair
    must request, then accept. The old fixture wrote that row directly with the service key, so
    it manufactured a state the app's own flow cannot produce. A group owner also cannot add a
    member (403); the member seats themselves. This is what CLAUDE.md already warned about —
    setup that bypasses RLS answers "does the screen render", never "is the policy right".
  - Ruled out on the way, so nobody re-derives them: a dedicated test **project** (rejected),
    and **per-run accounts on the anon key** — tempting since `mailer_autoconfirm` is true, but
    there is no `delete_own_account` RPC and Supabase has no self-delete, so every run would
    leak an auth user forever.
  - Setup uses the service key, which **bypasses RLS** — so a row existing here is no
    evidence a policy would have let a user create it. This answers "does the screen render
    correctly", never "is the policy right".
  - It then opens **every overlay** with that account signed in — the same set `check:zero`
    opens at zero, but with real people behind them. That is where its first
    overlay run landed a finding: the friends list rendered `undefined · 0` for a real connection, because a
    DB-derived friend carries only `{id,name,avatar,location,username}` and the row printed
    `c.level` plus `vScore(c)`, which invents a trust score from an object with no vouches.
    The hydration that builds those objects says so in its own comment — *"carries no grades
    or trust it never had"* — and the row rendered exactly that. Invisible at zero, where you
    have no friends.
  - Injection-tested: reverting each of the five defects it claims to catch fails the run,
    and each case requires a failure message that *names* that defect — a run that dies from
    a port race must not count as a catch. One early assertion tested
    `/Mod\b|Remove|Visibility|Public|Private/`, which matches the words "Public group" in a
    label everyone sees, so reverting the `isCreator` fix left it **green**. Only injection
    found that. `+ Mod` is gated on `isCreator`, the visibility toggle on `isMod`; they are
    different questions and must be asserted separately.
- **`check:overlay-scroll`** opens every overlay and asserts that no scrollable region
  inside one chains its scroll to the page behind it. An overlay is `position:fixed` over a
  document that is still scrollable — the Crew tab is ~5,600px — so with the default
  `overscroll-behavior: auto` a drag that runs out of sheet keeps going on the page
  underneath, and the sheet appears frozen. That is the "Past crews scroll is sticky"
  report: 851px of viewport over 968px of content, **117px of travel**, against a 5,615px
  page. #684 fixed that sheet and the trip report, #702 swept the 23 overlays that are
  *themselves* the scroller — and neither could reach the shape this catches: an overlay
  that does not scroll wrapping an inner pane that does. Those two style objects sit in
  different JSX elements hundreds of characters apart, so no regex over style literals can
  pair them; only layout knows. It found 11, four of them overflowing on demo data already
  (the friends list by 498px, notifications by 378, the Privacy sheet by 245, and the share
  sheet's summary `<textarea>` by 112).
  - **Two ways a region qualifies.** Overflowing *right now* is the proven case; a pane with
    a bounded `max-height` is the latent one — not overflowing with the demo's data, but it
    will the moment a real account has more, and then it chains identically. Requiring
    current overflow would make coverage a function of how much seed data happens to exist.
  - Overlay discovery and the `?z=` opener are shared with `check:zero` and
    `check:signed-in` via `scripts/lib/overlay-scaffold.mjs`, so the three cannot drift on
    which modals exist. It runs against the **populated** demo, not the zero state: at zero
    almost nothing has enough content to scroll.
  - Injection-tested, and the second case is the one that matters. Removing containment from
    the friends list fails the run *naming* `friendsOpen` and its 498px. Breaking the
    scaffold anchor **used to pass** — vite reports a throwing transform as a per-request
    internal error and keeps serving, so the app was blank, every overlay landed in "never
    mounted", and the check exited 0 having verified nothing. It now asserts the app is on
    screen first. Watch the detail there: the blank app reported *nav present* because
    `index.html`'s boot placeholder mirrors the real nav — 58 characters of text was the
    only thing that gave it away.
  - Failures print a **locator** (the element's inline style), because in a codebase with no
    class names a failure without one sends you hunting through a 40,000-character line.
  - Not in `npm run build` — browser automation, same reasoning as `check:ui`. It **does** run
    on every PR, via `.github/workflows/render-guards.yml`, and that is not decoration: it was
    hand-run only until 2026-08-09, by which point it had **already gone red on main** and
    nobody knew (#724, the guide application sheet). A guard that runs only when somebody
    remembers is a guard you do not have.
- **`check:field-renders`** asks, for every enriched `routes` column, whether its value ever
  reaches a screen. A column can be mapped in `dbRouteToCamel`, offered in the fix form, and
  displayed **nowhere**: `descent_text` was populated on 1,021 routes and rendered on none
  while the form invited climbers to write into it (#707). Grep cannot find that — every
  identifier is referenced. Only rendering can. It pulls a **real value from the live DB** per
  column, injects it onto a bare route, renders all six sub-tabs, and looks for it on screen.
  Runs on every PR via `render-guards.yml`; not a build gate (it reads the DB).
  - It replaced `scripts/oneoff/measure-which-tab-renders-each-field.mjs`, which hardcoded
    `ROOT` to the `rappels-rack-filter-class-audit` worktree — so it silently measured a
    different branch's code than the one you ran it in.
  - **Six ways this kind of probe reports a healthy column as dead.** All six were live in the
    first drafts and the count went 15 → 3 as each was fixed, so distrust a first run: a
    hardcoded root; too few sub-tabs (`climate` renders on *conditions*); rendering
    `<RouteDetail/>` alone when `ClimbMatch.jsx` also mounts sibling panels that own whole
    columns (`EnrichmentPanels` owns crowds/partner_requirements/seasonal_guidance/data_quality,
    `EmergencyRescueCard` owns emergency); one discipline base, when `RouteGearCheck` is
    `cragOnly`; testing only the longest string leaf, which condemns a column over one hidden
    sub-key (it called `pitch_detail` dead, and that visibly renders); and confusing **used**
    with **echoed** — the RACK box prints `rackSummary()`, so raw `gear` prose never appears
    verbatim though the column drives the screen.
  - The `KNOWN` map records **reasons, not passes**, and a name in it that starts rendering
    fails as stale bookkeeping.
  - **The `FIELDS` list is hand-maintained, and that was checked rather than assumed —
    deriving it automatically was measured and REJECTED.** `dbRouteToCamel` reads 61 columns
    against the 54 walked here, so 21 are unwalked; each was probed with a sentinel across all
    three bases and six sub-tabs. **Every one reaches a screen.** Six are numeric and judged
    only on "did the page change" (`length_m`, `gain_ft`, `loss_ft`, `dist_km`, `max_angle`,
    `high_point_ft`, plus `alpine_draws`/`rope_length_m`), the four grade variants and
    `rope_type`/`ascender` render outright, and the two that *looked* dead are both
    **used-not-echoed**: `grade_system` selects a format via `gradeSystemFor()` and is never
    printed, and `auto_generated` picks a provenance chip label in `lib/provenance.js` which
    needs section content a bare route does not have. So a derived list would carry ~10
    exemptions to report **zero** findings — bookkeeping that rots, in exchange for nothing.
    Add a column here by hand when one is added, and re-run that measurement before automating
    it. `check:field-renders`' subject is columns that reach a screen, not list maintenance.
  - **A column with ZERO populated rows was unguarded by construction, which is the worst
    possible moment for it.** The method pulls a REAL value, so a column nothing has written
    yet has nothing to pull: it reported `NO DATA` and was never checked — exactly when you
    most want to know the reader is wired, i.e. just after a migration adds the column and
    before any backfill. `0135` shipped the write for `prot_rating`, `start_type`, `landing`,
    `pads`, `rock` and `crux`, and #855 then had to prove they reach a screen with a **106-line
    one-off**, because this guard structurally could not answer it. That one-off is now folded
    in and deleted — a verification nobody runs is not a verification.
    - `SENTINELS` injects a distinctive value (`ZZCRUXZZ`) onto a bare route and looks for it,
      proving the **reader** independently of whether any row is populated. All six render, on
      Overview, in the TECH STATS tiles.
    - **Two traps, inherited from #855's probe rather than rediscovered.** `dbRouteToCamel`
      emits **both** `rock` and `rockType` from the single `rock` column, so patching one
      reports a healthy column as dead — mimic the MAPPER, never the column. And `pads` is
      numeric: the tiles render through `<CountUp/>`, which is `useState(0)` reaching its
      target only inside a `useEffect`, and effects do not run under `renderToStaticMarkup`.
      So a numeric tile renders **0** and its value can never be asserted here — those are
      judged on "did the page change", never on the number. Same warning `check:bare` carries.
    - A third base (`BOULDER`) exists because `landing`, `pads` and `start_type` are shown on a
      boulder problem and nowhere else; probing them from `crag` reports live columns as dead —
      the discipline-gating trap this file already records for `RouteGearCheck`.
    - `NEVER RENDERS (sentinel)` fails the run like any other unrendered column — matched with
      `startsWith`, not `===`, or the whole sentinel class could report a defect and still exit
      0. Injection-tested: deleting the `Crux` tile from `RouteDetail` fails naming `crux` and
      printing the injected patch, and restoring it goes green.
  - **A FAILED QUERY IS NOT AN EMPTY COLUMN, and conflating the two produced wrong advice
    rather than silence.** `if (!r.ok) return []` made a dead database indistinguishable from
    "no route has this column populated". Main went red twice on 2026-08-12 with all 46
    columns reading `NO DATA`, and the only line either run printed was
    `STALE allowlist entries (these now render — remove them): data_quality` — i.e. it told
    the author to delete correct bookkeeping from `KNOWN` because the DB was down. Following
    it would have removed the recorded reason a column is not rendered and the guard would
    then have called that column dead forever after. #863 fixed it.
    - That red was an **accident**, and the default was a **false pass**: the stale test is
      the only thing on that path that exits non-zero when nothing rendered, so with an empty
      allowlist the identical outage prints `ok — every measurable enriched column reaches a
      screen` and exits **0**. Measured, not argued.
    - **It was already lying on GREEN runs**, which matters more. Against the last green main
      run: 44 verdict rows identical, and `approach` reported `NO DATA` in CI while it
      demonstrably renders on three tabs. A silent timeout laundered into a coverage gap on a
      *passing* run. Do not read green here as "it read the data".
    - It now fails closed **before any verdict is interpreted** — ahead of the stale test in
      particular, since that is what turned an outage into an accusation. A thrown fetch is a
      separate path from `!r.ok` (connection refused used to escape as a raw `ECONNREFUSED`
      stack, which reads as a broken guard rather than a broken database), and a healthy `200`
      with `[]` for **every** column fails too — that is RLS rejecting every row or a wrong
      project, not a clean catalog.
    - **A `42703` gets its own message.** "This guard names a column that does not exist" and
      "the database is unreachable" need opposite repairs. That paid immediately: `permit_url`
      **is not a column** — `routes` has 95 and exactly one permit-ish one, `permit` — so every
      run had queried a phantom, got a 400, and filed it as `NO DATA`. Removed — this guard's
      subject is column → screen, and with no column there is nothing to query.
      - **The reason first given for that removal was wrong, and the wrong reason is the
        dangerous half.** It said the form does not offer `permitUrl` and no DB route can have
        one; both are false, and together they would justify deleting a working feature. It
        **is** offered — `{k:"permitUrl",label:"Permit link"}` lives in **`RouteDetail`'s own
        `FIELDS`** list, not `ClimbMatch.jsx`'s, which is exactly how the first check missed
        it — it is in `SS`, and RouteDetail renders `<a href={route.permitUrl}>` beside the
        permit prose. A DB route reaches it through the **contribution overlay**, which needs
        no column at all: `dbContribs` rows are grouped by field, gated on `SS[rc.field]` and
        applied onto the route object client-side once the 3-agree gate passes. Not every
        contributable field is column-backed, so "absent from `routes`" does **not** mean
        "unreachable" — check `SS` and the overlay before concluding a field is dead.
    - **Retries are five, and the number is measured.** The failure being retried is `57014`,
      the 3s anon statement timeout, so the *client* timeout is irrelevant — the server gives
      up on its own and only a later attempt against a warmer cache can succeed. A run
      recorded `season — succeeded on attempt 3` and still lost 17 of 45 columns, so three was
      the boundary rather than a margin. The same query measured 233–654ms for
      access/hazards/gear and timed out for approach/descent/road **minutes apart, with the
      slow set moving between runs**. Backoff is exponential because a fixed 400ms re-asks
      inside the same busy moment, and a total retry budget still caps the run so a
      wholesale-slow project degrades to one attempt per column, ends, and fails closed. A
      retry that **succeeds** is printed: absorbing it would turn a measurable flake into an
      invisible one.
    - **`order=id.asc` is what costs, NOT a missing index on the filtered column** — and the
      difference matters because it sends you to opposite repairs. Measured on the live
      project, same column, seconds apart: `descent` **timed out** with the order and returned
      **200 in 193ms** without it; `road` 3131ms → **123ms**; `approach` 13654ms → 6231ms.
      With `order=id.asc&limit=8` Postgres walks the id index and filters row by row until it
      finds 8 matches, so a **sparse** column traverses most of the table; unordered it can
      stop at the first 8 it meets. Narrowing with `id=like.wa_*` does **not** rescue it
      (still timed out on all three).
      - **Read those numbers as a RATIO, not an absolute, and here is the baseline that says
        why.** Every figure above was taken while the project was already degrading. Measured
        again the minute Postgres came back healthy, same three columns, ordering still in
        place: `approach` **206ms**, `descent` **215ms**, `road` **205ms** — against timeouts
        for all three an hour earlier. So the ordering is genuinely the more expensive plan
        and the A/B stands, but it is ~200ms on a healthy database, comfortably inside the 3s
        anon ceiling. It only becomes fatal when the database is *already* sick. Do not read
        this note as "the ordered query is slow" and go optimise it; the query is fine, and on
        2026-08-13 the actual fault was Postgres being unreachable
        (`503 PGRST002`) while Storage and the gateway stayed healthy.
    - **Indexes were considered and rejected, deliberately.** Partial indexes
      (`(id) WHERE col IS NOT NULL`) would make the ordered query instant, but that is ~45 of
      them on a 205k-row table, maintained on every route write, serving **only this guard**:
      `lib/db.js` issues **zero** `not.is.null` queries, so the app gains nothing. Dropping
      the ordering is the other obvious fix and is worse — it is the exact non-determinism the
      note above this one exists to prevent. Retries are the cheap correct answer here, since
      the row genuinely exists and only cache warmth decides whether this attempt sees it.
      **Do not "fix" this with an index without first re-measuring whether the app has started
      issuing this query shape.**
    - CI timeout is 25 minutes for this reason, not because a healthy run is slow (~40–85s).
  - Injection-tested: removing the TURNAROUND section fails naming `turnaround`; neutering the
    long-beta block fails naming `beta`. The fail-closed half is injection-tested against a
    **local HTTP server standing in for PostgREST** — 500s, connection refused, `200 []`,
    `400 42703`, and fail-once-then-succeed — which needs no database and caught the
    wrong-advice path directly. Trap when doing that: `scripts/lib/supabase-env.mjs` makes the
    **dotfiles win over `process.env`**, so a `VITE_SUPABASE_URL=…` prefix is silently ignored
    if `.env.local` exists in the worktree and the injection quietly hits the real DB.
- **`check:a11y-badges`** asks whether any control announces its badge count welded to its
  label. The Crew sub-tab bar rendered `<button>{label}{n?<span>{n}</span>:null}</button>`, so
  Chrome computed the name as **`"Friends2"`** — one token. Sighted users see a gap because it
  is CSS margin, and *the accessibility tree has no margins*. #740 fixed that one bar but could
  not answer the next question — is there another? There was: the **Inbox modal's own tab bar**,
  `"Friends2"` and `"Crews1"`, fixed in the same commit as this check.
  - **Structural, not lexical, and that distinction is the whole check.** Scanning names for a
    digit beside a letter returns a haystack in a climbing app — `5.10a`, `V4`, `WI3`, `M6`,
    `Class 4` are all correct names. The defect is that the digit and the word come from
    **different DOM nodes**. A grade is one authored string in one text node; a badge is a
    separate element. So it walks each control's text nodes, finds a letter↔digit transition
    **across a node boundary**, and only then asks Chrome what it computed. An earlier
    string-matching attempt reported "none" while direct measurement showed three, and was
    binned rather than shipped.
  - Confirmed by **measurement, never markup**: a candidate is reported only if the name Chrome
    actually computed still holds the two fragments glued. That is why an `aria-label` fix —
    which changes no structure at all — reads as fixed, and why rearranging JSX cannot satisfy it.
  - Runs against the **populated** demo. A badge is `count ? <span>…`, so at zero there is no
    badge and nothing to find; check:zero's config would make this vacuous.
  - Overlay discovery and the `?z=` opener come from `scripts/lib/overlay-scaffold.mjs`, shared
    with the checks above, so they cannot drift on which modals exist — and when #748 widened
    that discovery from a name shape to **behaviour**, this check inherited the wider walk for
    free: **50 screens, 44 overlays, 116 controls**, against 32/26/77 on the run that found the
    Inbox bar. `LogAscent`, `FullProfile`, `Resume`, `GiveVouch` and `ConnectModal` were swept
    for the first time by that widening, and are clean. Sharing the scaffold rather than
    copying it is what made that automatic.
  - Mount detection compares **line sets, not text length** — `Inbox` *replaces* the screen
    rather than adding to it, so a length test read it as never mounted and silently dropped it
    from the sweep. That was not hypothetical: it is why the second defect went unseen on the
    first run.
  - Does **not** cover clickable `<div>`s (React's onClick leaves no attribute, and a div with
    no role has no computed control name — a different defect, see `scripts/audit-a11y.mjs`) or
    the route detail screen, which is reached by clicking rather than by URL.
  - Zero candidates anywhere is treated as a **failure**, not a pass: every control here is
    multi-node, so an empty scan means the scan broke.
  - Injection-tested: reverting #740's aria-label fails naming all three sub-tabs by their
    announced text; breaking the scaffold anchor fails on the 58-character boot shell rather
    than passing over a blank app — the trap `check:overlay-scroll` documents above.
  - Runs on every PR via `render-guards.yml`; not a build gate (browser automation).
- **`check:overflow`** asks whether the app still fits the phone it is built for. Every
  control here is hand-positioned with inline styles and there is no CSS framework, which is
  exactly the setup where one fixed `minWidth`, a `flex` row with `nowrap`, or a single
  unbroken string pushes the page wider than the screen — the user gets a page that slides
  left-right under the thumb with a control's right edge simply gone. **No other guard can
  see it:** `check:ui` reads text, and a screen whose right-hand edge is off-viewport
  reports the same characters as a correct one. Two bugs of this shape are already on record
  and both were found by eye. It walks the 6 tabs and every openable overlay at 390×844.
  Runs on every PR and every push to main via `render-guards.yml`; not a build gate
  (browser automation).
  - **The precision rule is what makes it usable.** A chip row with `overflowX:auto` is a
    *correct* pattern that is supposed to scroll sideways, so an element is reported only if
    no ancestor is an intentional horizontal scroller.
  - **Authored intent and clipping are read from different places, and the asymmetry is
    load-bearing.** `auto`/`scroll` must come from the **inline style**, because CSS coerces
    a `visible` overflow-x to `auto` whenever overflow-y is not visible — and nearly every
    pane in this app sets `overflowY:"auto"`. Reading computed style there excluded almost
    the entire app: the first draft reported a clean sweep across 51 screens while a 520px
    `minWidth` injected into the Home tab sat there unflagged. Clipping is the opposite —
    nothing coerces *to* `hidden`, so `hidden`/`clip` is read from **computed** style, which
    is also the only way to catch it reliably: reading the clip inline made the run **flaky**,
    with FireMap's 256px tiles reporting 0 offenders on one tab and 3 on another.
  - Two more exclusions, both measured rather than assumed: the inside of an `<svg>` is
    skipped (`<g>`/`<path>` carry their own coordinate system, so their client rects are not
    page geometry), and only the **right** edge counts — an element off to the left cannot
    widen a left-to-right document, and including it reported map tiles at `left=-220`.
  - **The self-test is not optional and runs before any screen is walked.** The expected
    result of this check is "no findings", which is exactly what a broken detector prints.
    It injects three shapes into a real page — a plain over-wide box, one pushed out by a
    fixed `minWidth`, and one inside an `overflow-x:auto` parent — and the first two must be
    caught and the third must not, or the run fails having measured nothing.
  - Fails closed in the other direction too: an empty `__overlays` or fewer than 26 screens
    walked is a failure, not a pass. The openable count varies run to run (42–46 of 50)
    because some payloads resolve only on some tabs, so the floor is deliberately well below
    it rather than pinned.
  - Mount detection compares **line sets, not text length** — the trap `check:a11y-badges`
    records, and one this repeated in draft: with a `>120 chars` test every modal reported
    the Home tab's numbers, because that was true on the first tab every time.
  - Failures group by the **offending element**, not by screen. An overlay renders over the
    tab behind it, so one bad row on Home otherwise reads as eleven findings.
  - Injection-tested: a `minWidth:520` on the Home "Unfinished business" row fails the run
    naming `tab:today`, the element, and its inline style as a locator.
  - **It replaces `scripts/oneoff/measure-horizontal-overflow.mjs` (#818), whose "13 screens
    clean" result should not be relied on.** That probe excluded an ancestor whose
    **computed** `overflowX` matched `auto|scroll|hidden` — the coercion trap above — so on
    a codebase where nearly every pane sets `overflowY:"auto"` it was blind to most of the
    app. Its self-test passed anyway because it injected into `document.body`, outside the
    app tree: the `injection passes because the fault is out of frame` shape exactly. #818
    asked for the promotion to be done "from a quiet machine"; this is it, with the
    exclusion corrected.
  - **Route detail IS covered, and failing to reach it is now a hard failure.** This used to
    be the known gap — the drill-in (state select → Routes → open a row) did not complete
    under the scaffold config, so the richest layout in the app, and the one where both
    recorded bugs of this class lived, printed `NOT REACHED` on every run. It is reached by
    **navigation rather than by driving the UI**: `?zr=1` calls the app's own `openRoute()`
    from inside the opener, which no slow list, differently-rendered row or moved `<select>`
    label can defeat, and all six sub-tabs are then walked.
    - The status was **upgraded from a note to an exit-1**, and the reasoning is worth
      keeping: while it was a UI drill-in it could miss for reasons that were nobody's
      fault, so a note was the honest call. Now the only ways `?zr=1` fails to land are a
      broken opener or a broken route page — both worth going red for. The screen where
      this defect has actually happened must not be able to go unmeasured in silence.
    - It waits on `window.__routeOpen` **as well as** on the text settling. Tying the two
      together is what the first CI run got wrong: `load()` returns on `__overlaysReady`,
      which says nothing about whether the navigation has happened yet.
- **`check:anniversary`** asserts the climb-anniversary notification still reaches a screen.
  #713 revived it — it used to map over `MY_CLIMBS`, a constant `DEMO_FILLERS` empties, so
  `_anniv` produced `[]` and no anniversary could **ever** fire. Being spread into
  `mergedNotifs` beside four live sources hid that completely: the notification list worked,
  so nothing looked wrong. It now derives from the user's real `logs`.
  - **Nothing rendered it afterwards, and nothing easily could, because the feature is
    date-gated.** `_anniv` only fires for a log whose yearly anchor is within **two days** of
    today, and the seed logbook holds one entry dated 2026-05-24 — so on ~360 days of the year
    it renders nothing, and every other guard walks the app on one of those days. A feature
    invisible to your guards 98% of the time will break silently and stay broken for a year.
  - `scripts/anniversary.config.mjs` injects a log dated **exactly one year ago today**,
    computed at config load so it never rots. The date is built in **local** time, because
    `_anniv` compares `new Date(y,m,d)` against `new Date()`; a UTC-derived date is a day off
    west of Greenwich and would still pass the ±2-day gate while proving less than it claims.
    Feb 29 needs no special case — `"2027-02-29T12:00:00"` parses to Mar 1, one day off, still
    inside the window (measured, not assumed).
  - The injected entry is a **clone of the seed entry with only its date rewritten**, lifted
    out of the source by balancing braces rather than hand-written. A hand-written literal is a
    second copy of a shape that lives elsewhere: add a field to the seed log and the clone
    silently stops matching, and `logs` also feeds `Resume`, `TickList` and `_pastClimbs`. The
    brace walk runs over **raw source but skips string contents** — the opposite care from
    `check:overlay-discovery`, which must not blank strings; here a `{` *inside* a string must
    not be counted or the walk ends in the wrong place, truncating the literal mid-prose.
  - It refuses to run a probe that cannot fire: if the date rewrite is a no-op, the config
    throws rather than injecting an entry carrying the original date.
  - Checks **both** surfaces that render `mergedNotifs` (the notifications panel and Home's
    alerts dropdown), because #713's defect was invisible precisely *because* the list around
    it worked — "some notification rendered" is not the question. It asserts the head **and**
    the tail of the composed string, so a truncation fails; it does not assert the route name,
    which resolves differently on seed vs `USE_DB` and would go red for reasons that are not
    this feature's fault.
  - **Browserless self-tests run first**, because both helpers fail by producing a *wrong
    probe* rather than an error, and a wrong probe fails the browser assertions — sending
    whoever reads it hunting for a bug in the feature that does not exist. They cover the
    calendar cases a single run cannot (a run only ever exercises today) and, with a synthetic
    entry, the brace-in-a-string case **real data does not exercise**: the seed prose happens
    to contain no braces today, so nothing else would notice that logic breaking.
  - What a pass does **not** mean: that the date arithmetic is right for every calendar case.
    The probe sits one year back to the day, the easy case. It proves the path from `logs` to
    the screen is not severed, which is the failure that actually shipped.
  - Injection-tested, three cases: dating the probe outside the ±2-day window fails on both
    surfaces (so the check is **not** vacuous — it depends on the injection doing its job);
    reverting `_anniv` to `MY_CLIMBS.map` fails; breaking the opener anchor fails on the
    58-character boot shell rather than passing over a blank app.
  - Runs on every PR via `render-guards.yml`; not a build gate (browser automation).
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
- **`check:migration-claims`** asks whether two **open PRs** claim the same migration
  number. `check:migrations` already refuses two files sharing a number in the checkout and
  runs inside `npm run build` — but it cannot see this failure, because when either PR is
  written there is no duplicate to find: each branch holds exactly one `0103`, and the
  collision only exists once the second one merges. On 2026-08-09 **#728 and #727 merged
  three seconds apart**, both green, and main stopped building — `check:migrations` is a
  build gate, so **every deploy was blocked** until #737 renumbered the file. Later that day
  #752 and #753 both claimed 0108 *and* 0109; that one was survived only because somebody
  looked.
  - The recorded lesson had been "checking open PRs before numbering is not enough, the other
    PR may not be open yet" — which is an argument for asking at **merge** time rather than
    authoring time. This re-asks on every PR run against whatever is open right now.
  - It fails **both** PRs, deliberately: they cannot both merge as they are, and naming only
    one would be picking a winner the script has no basis to pick.
  - **Fails closed with no token** — "nothing was checked" is reported as a failure, never as
    a pass. Same reasoning as `check:counts` refusing an empty read: the realistic failure
    mode of this guard is a false green about a repo it never looked at.
  - Compares against the **merge base**, not the working tree. On a PR the checkout already
    contains the branch's own new migration, so comparing against the tree would make every
    PR collide with itself.
  - Not in `npm run build` (network + token). Runs on every PR as its **own job** in
    `build-check.yml`, so a failure reads as "Migration numbers are unclaimed" rather than
    hiding in a build log.
  - Injection-tested; the four cases are named at the bottom of the script and are driven by
    `--inject=`, since the fault lives on GitHub and the checker cannot open pull requests.
- **`check:ci-cancel`** asks whether a guard running on `main` can be **cancelled by the next
  merge**. It exists because the comment that promised it could not be was wrong, and stayed
  believed until somebody measured a run. `render-guards.yml` and `zero-state.yml` both said
  *"Superseded PR runs are cancellable; a main run is not"* above
  `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` — the flag is right and
  the claim is false. **`cancel-in-progress: false` only protects a run that is already IN
  PROGRESS; GitHub cancels a still-PENDING run unconditionally when a newer run joins its
  concurrency group, and no flag disables that.** Static, so it sits in `npm run build`.
  - Measured on run `31644233526` (event `push`, sha `7fb4e65`): `18e6265`'s run sat pending
    for **15 minutes** (created 21:33:48, started 21:48:44), `7fb4e65`'s was created 21:48:58
    and correctly went pending *behind* it, then `9d441d3`'s was created 21:50:48 and
    `7fb4e65`'s was **cancelled two seconds later**. A cancelled run reports **no failure**,
    so **#835's merge read as checked by a guard that never ran on it** — precisely the
    outcome #616's note said was impossible here.
  - **The fix is structural, not a stricter flag**: group by `github.sha` on a push
    (`github.head_ref || github.sha`) so main runs never share a group and so never queue
    behind one another. Sharing one group across main pushes is what *built* the queue that
    made a run cancellable. The cost is that main pushes now run in parallel — the right
    trade, since a skipped check is worth less than a runner minute.
  - **`deploy.yml` is the one exemption, and it is checked rather than trusted.** A superseded
    *deploy* is harmless (deploying a newer tip includes the older commits) and `check:drift`
    asks from outside whether the live site serves the current tip. A superseded *check* is
    different: nothing ever asks that question again. The exemption is keyed to
    `group: pages`, so if that group changes the run **fails as stale bookkeeping** — the same
    standard as `NEEDS_EXTRA_STATE`.
  - It also pins the **#795** invariant it depends on: both browser guards must still trigger
    on push to main. A workflow that stops being push-triggered would otherwise drop out of
    the scan silently, which is the invisible-coverage-hole shape `check:overlay-discovery`
    exists for. And it **fails closed** — finding no push-triggered workflow is reported as a
    broken scan, never as safe CI.
  - **Comments are stripped before anything is matched**, and that is load-bearing here: both
    workflows now explain this rule in prose that *names* `github.sha` and `github.ref`, so a
    scan that read comments would pass on the strength of an explanation. Same trap
    `check:schema-drift` records from the other side, where prose naming a column failed the
    build.
  - Injection-tested 6/6, listed at the bottom of the script. Case 6 must **pass**: a comment
    mentioning the forbidden `group: ${{ github.ref }}` is documentation, not a regression.
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

- **`check:clickable`** finds controls only a mouse can operate. This app has no CSS
  framework, so controls are hand-built divs with inline styles — and a `<div onClick>` is
  not in the tab order, does nothing on Enter or Space, and is announced as prose. **279
  clickable non-native elements** exist; when the check was written **not one** of them had
  a `role`, and the whole app contained **zero** `role="button"`. That is not a markup
  nitpick: the route rows, the area rows and the search results are all `<div onClick>`, so
  *opening a climb could not be done from a keyboard at all*.
  - `lib/clickable.js` supplies the triad — `role`, `tabIndex`, and an `onKeyDown` firing on
    Enter and Space. All three are load-bearing: `role` alone is **worse** than a bare div,
    because it announces a button that still cannot be reached. Spread it as
    `<div {...clickable(go)}>`. It is a helper rather than a swap to real `<button>`s
    because a button brings its own font, padding and box metrics, and this codebase
    positions everything by hand — see the `<select>`-vs-`<button>` note.
  - `preventDefault` on Space is required (Space scrolls the page), and the handler ignores
    events whose `target` is not the row itself, so a nested delete button keeps its Enter.
  - **The baseline is a per-file count, i.e. a ratchet** — the number may go down, never up.
    It deliberately cannot see a one-for-one swap in the same file. A stable per-control key
    would be better and is not available: this codebase packs many declarations onto one
    physical line, so a line number does not identify a control, and handler text repeats
    verbatim (`()=>openRoute(r)` many times over). A stale baseline (higher than reality)
    **fails**, so bookkeeping cannot quietly re-open room for regressions.
  - Two exemptions, both measured rather than assumed. `onClick={e=>e.stopPropagation()}` is
    a **shield**, not a control — it stops a click inside a sheet reaching the backdrop, and
    demanding a tab stop there would put a focusable "button" that does nothing in front of
    every modal. And `{...clickable(fn)}` is recognised **explicitly**: a spread carries no
    attribute names, so without that a *fixed* control would stop looking like a control and
    read as one fewer thing to check rather than one more thing fixed.
  - **The shield exemption matched a SYNTAX, and this codebase writes the other one.** It
    tested for an arrow function with an expression body, while every shield in the app is
    `function(e){e.stopPropagation();}` — a `FunctionExpression` with a **block** body — so
    all **13** were counted as mouse-only controls and the baseline read 247 where the truth
    was **234**. The too-narrow proxy again, and note which way it points: it hid no defect,
    it *manufactured* 13, each one an element the note below says must **never** be given a
    tab stop. Somebody working the baseline down would have been told, by the guard, to break
    precisely what the exemption exists to protect — the same shape as `check:field-renders`
    telling an author to delete correct bookkeeping during an outage.
  - Matched on **what the handler does, not how it is written**: any function whose body is
    that one call. The body must be that call and **nothing else** — a handler that stops
    propagation and *then does real work* is a control, and widening far enough to swallow it
    would hide a genuine defect, which is the direction that actually matters. Injection case
    1 in `scripts/oneoff/inject-clickable-shield-cases.mjs` pins exactly that, and case 2
    pins the third syntax (`(e)=>{e.stopPropagation();}`) staying exempt.
  - Fails closed: zero clickable non-native elements means the scan broke, not that the app
    is clean. It also fails on a **stale** baseline (higher than reality), so lowering it is a
    deliberate step rather than something a fix does silently.
  - **The `lib/` remainder is deliberate, and it is all one shape.** After the guide screens
    were fixed, the five left in `lib/` — `AuthModal`, `DbAreaBrowser`, `FireMap`, and two in
    `GpsSubmissionModal` — are every one of them a **modal backdrop**: a `position:fixed;
    inset:0` overlay whose `onClick` closes, wrapping a panel that calls `stopPropagation`.
    A backdrop must **not** be a tab stop; each of those modals carries its own close control,
    and making the backdrop focusable would put a "button" that reads as nothing in front of
    every sheet. Do not "finish" `lib/` by spreading `clickable()` over them.
  - **Two of the fixed controls are checkboxes, not buttons** (`Check` in `DbGuides`, the
    mandatory attestations in `DbGuideApply`). They take `role="checkbox"` plus
    `aria-checked`, because a button role announces the control and silently drops the one
    thing that matters about it — whether it is currently ticked. `clickable(fn,{role})`
    exists for exactly this; the `aria-checked` is written beside it.
  - Verified in a browser, not just statically — a focused area row (`South Central Utah ·
    1365 climbs`) opens on Enter. The static check cannot prove that; it only proves the
    attributes are present.
  - Injection-tested: reverting one `{...clickable(…)}` to a bare `onClick` fails naming the
    file and line. Gated by `npm run build`.
- **`check:icons`** asserts the app declares an icon at all, and that every icon it names
  exists and is the size it claims. Vite does **not** verify references into `public/` — a
  missing or renamed file there is emitted as a rewritten href and 404s at runtime, with a
  silently iconless tab as the only symptom. That was the app's state until 2026-08-09: zero
  `<link rel="icon">` elements, so no tab icon, no home-screen icon, nothing for an installer.
  Static (no browser, no dev server), so it sits in `build` with the other gates. Ported from
  **#746**, a parallel session's independent take on the same task, after #745 shipped two
  defects it would have caught.
  - **The two path conventions are opposite**, which is the trap: `index.html` must use
    `%BASE_URL%x` or root-absolute `/x` (Vite rebases both); `manifest.webmanifest` must use
    **relative** (`icon.svg`), because `public/` is copied verbatim and Vite never rewrites
    inside it, so a root-absolute path resolves off-base and every icon 404s. Relative also
    survives a repo rename. `id` is exempt and stays root-absolute — the spec resolves it
    against the **origin**, so a relative `./` would resolve to `/` and silently change the
    installed app's identity.
  - It reads each PNG's width/height straight out of the **IHDR** rather than trusting the
    declared `sizes`, since a launcher handed a 192 where it asked for 512 just upscales it.
  - It rejects a manifest that reuses one file for both `any` and `maskable` — exactly what
    #745 shipped. A maskable icon must be **full bleed** and separately scaled; see the
    `favicon-maskable.svg` note above.
  - A claim it deliberately does **not** make: that a page with no icon has the browser probe
    `/favicon.ico` and 404. #745 asserted that; probed with a request-logging server and
    Chrome via playwright, headless **and** headed, a page declaring no icon requested `/`
    and nothing else. The missing icon is directly observable and needs no such story.
  - Injection-tested; the 8 cases are named at the bottom of the script.
- **`check:grade-parser`** asserts `routes.grade_num` is parsed in exactly one place. That
  column is the sortable grade — both finder RPCs (`0018`/`0019`) rank and filter on it — and a
  wrong value is invisible: the route just sits in the wrong place in a list nobody
  cross-checks. The arithmetic existed **four** times (`load-state.mjs`,
  `load-wa-rock-safe.mjs`, `import-alpine.mjs`, `oneoff/import-class2-3-routes.mjs`) and had
  already drifted into **three** behaviours — three agreed, the oneoff returned `5.1` for
  `"5.10"` where the catalog convention is `10`, and **none** handled a bare ordinal (`"4th"`,
  `"Easy 5th"`) that the live column nonetheless had right. All four now import `gradeNumFrom`
  from `lib/grade.js`. Static, so it sits in `npm run build`.
  - **The swap was proven before it was made, not after.** `verify-grade-parser-equivalence.mjs`
    ran both implementations over every distinct `(grade, system)` pair in the live WA catalog
    plus hand-written edge cases — **348 inputs, identical on every one** — because these
    scripts write `grade_num` for the whole catalog and "I reformatted it and it looks the same"
    is not evidence. Adding the bare-ordinal branch then differed on exactly **4** inputs, all
    `null` → a correct value. Agreement with the stored column went 98.09% → 98.49%.
  - That equivalence script keeps a **verbatim copy** of the pipeline parser on purpose — its
    job is to be a second opinion, and importing the function under test would make it vacuous.
    It is the one exemption, named explicitly so it cannot quietly widen.
  - Matches a **declaration**, not the word `gradeNum` — every importer mentions it. It also
    skips comment lines, because this guard has to *say* `function gradeNum(` to explain
    itself and flagged itself on the first run. Deliberately not the comment/string blanker
    other guards use: that one eats real code when a string contains `//` (a URL), and a
    declaration is never inside a string literal.
  - Fails closed: fewer than 20 files walked means the walk broke, not that the tree is clean.
    Injection-tested (4 cases at the bottom of the script); re-inlining a parser fails naming
    the file and line, and renaming the export fails with "every importer is broken".
- **`check:approve-route-columns`** asserts that nothing may fork `approve_new_route` again.
  That function is the whole consume half of the add-a-route flow: it turns a pending
  `new_route` contribution into a row in `routes`, and it is a `SECURITY DEFINER` RPC precisely
  so the id convention and the `(area_id, name)` duplicate refusal cannot be skipped by a
  caller. **`0128` and `0132` both rewrote it from the same ancestor (`0127`) hours apart**, and
  each kept only what it came for — 0128 added `grade_num`, 0132 added the six tech-stat columns
  and **silently dropped `grade_num`**. Static (migration files + `lib/db.js`, no DB, no
  browser), so it sits in `npm run build`. `0135` is the merge.
  - **Nothing could have caught it, and the reason is worth internalising.** The merge was
    clean — different files entirely, so git had nothing to report. Every gate stayed green.
    Both bodies are valid SQL that inserts a route. `check:migrations` is satisfied because
    they carry different numbers. And the live probe each author ran — *does a non-admin still
    get `P0001`?* — is answered **identically by either fork**, because the admin gate is the
    first statement in both. A behavioural check that passes on the broken version is worse
    than no check, which is why this guard is **structural rather than behavioural**.
  - **The symptom was six columns written by nothing.** `prot_rating`, `start_type`, `landing`,
    `pads`, `rock`, `crux` exist on `routes`, are allow-listed in `SS`, are collected by the
    form, are mapped by `dbRouteToCamel` (`rockType: r.rock`), and four already render in the
    TECH STATS tiles. Storage, form and display were all correct; only the write between them
    was missing, so **every layer reviews as finished**. Measured live: all six existed with
    **0 populated rows**.
  - **Three rules, each an actual defect from the episode.** (1) *Monotonic columns* — the
    newest definition's insert must be a superset of every earlier one's; a function that
    accretes fields may gain them and must never lose one. (2) *One live signature* — it
    replays every create/drop in file order and requires exactly one to survive, because
    `create or replace` **cannot replace across argument lists** and 0132 created a 1-arg
    version without dropping 0128's 2-arg one. (3) *The client matches* — `lib/db.js` names its
    RPC arguments and PostgREST resolves by name, so a mismatch is `PGRST202` and approval is
    impossible. Rules 1 and 2 are independent on purpose: a correct column list behind a
    lingering overload is still broken, and injection case 3 pins exactly that.
  - It strips **`--` line comments only**, deliberately not the blanker other guards use: these
    files are prose-heavy and 0135's own header names every column it writes, so a comment that
    *mentions* `grade_num` must not read as the insert writing it.
  - Fails **closed** three ways: fewer than 20 migration files, zero parsable definitions, or
    an empty column list. And when the insert regex breaks it reports **that** rather than
    blaming a rename — the generic "no definition found" message sent the first run hunting for
    a function sitting right there (injection case 6).
  - **Two of its own rules were wrong in the first draft, and neither was visible by reading
    it.** A `DROP` names bare **types** (`approve_new_route(uuid)`) where a `CREATE` names
    `name type`, so parsing both the same way made every drop delete a signature no file
    creates — rule 2 then reported two live overloads against correct migrations. And matching
    every `word:` for the client's argument names picked up `gradeNum` out of the ternary
    `Number.isFinite(gradeNum) ? gradeNum : null`, failing rule 3 on a correct call. Both were
    false **failures** rather than false passes, which is the safer direction, but they are the
    reason the injection cases must be re-run after any parsing change.
  - Injection-tested, 6 cases at the bottom of the script. **Case 1 is not synthetic** — it is
    the real historical fault, reproduced by deleting `0135`, and all three rules fire on it
    naming `grade_num`, the two overloads, and the broken client call.
  - It does **not** overlap `check:add-route-fields`, which guards the other end: what the form
    asks and whether its keys are in `SS`. A key can be in `SS` — so session-state merging
    works — and still be dropped by approval. That gap is exactly what shipped.
- **`check:contrib-fields`** asserts that every field a climber can submit is a field the
  merge will actually apply. `var SS={…}` in `ClimbMatch.jsx` is an **allow-list**, consulted
  by both merge paths (the local `routeEdits` one and the DB one that counts distinct
  contributors). A key offered by `SuggestFix` and absent from `SS` is accepted, toasted as
  recorded, written to the `contributions` table, and then read by nothing — the climber gets
  a success message and the route never changes. Static, so it sits in `npm run build`.
  - **Two submission paths, and checking only one was this guard's own first-draft bug.**
    Besides the `FIELDS` list, `RouteDetail` calls `onSubmit` with a literal field name; that
    is how `bailout` and `startLocation` are filed, and neither is in `FIELDS`, so a
    FIELDS-only scan cannot see that path at all. Those two are the only `EXEMPT` names,
    because `onContribute` returns before the field-edit path for them (they are additive,
    geo-clustered lists read back through `bailoutEdits`/`startLocationConsensus`). An
    exemption that stops being submitted anywhere **fails**, so the list cannot rot.
  - **It asks the same question one level down for the two jsonb fields.** `road` and `access`
    are objects, so passing the column check proves nothing about the individual sub-keys the
    form offers. `ROAD_KEYS` / `ACCESS_KEYS` are checked against the file for a reader, because
    the readers and the key lists sit ~400 lines apart and nothing else ties them together —
    and `access` carries **two spellings of the same fact** (`land_manager` on 399 of 400
    sampled rows, `landManager` on 8, display reading `ac.land_manager||ac.landManager`), so
    "which spelling does the form write?" has a right answer and a silently-wrong one.
    Deliberately a substring test: a sub-key is legitimately read as `ac.foo`, `road.foo` or
    destructured, and demanding one shape would fail on correct code. Writing the *legacy*
    spelling **passes** on purpose — it is read, so it is worse rather than broken, and the
    editorial preference lives in the comment beside `ACCESS_KEYS` where it will be read.
  - Reports the reverse direction as information, not failure: 4 keys are in `SS` without
    being in the form (`gpxPts`, `discipline`, `rockStyle`, `topo`), each set by another flow.
  - Fails closed on an empty parse of either side, and `ANCHOR LOST` if `const FIELDS=[{k:`
    or `var SS={` is renamed — an empty set on either side would make every comparison pass
    vacuously, which is the failure mode `guard-sources.mjs` exists to stop.
  - Injection-tested; the 4 cases are named at the bottom of the script.
- **`check:rappel-lengths`** asks whether a rappel table states a distance the rope it describes
  can actually reach. **A rope doubled through an anchor reaches HALF its length** — one 60m rope
  gives 30m rappels, two 70m ropes give 70m — and where a source published no per-station
  distance, an earlier enrichment pass wrote the rope's *capacity* into `lengthM` instead of null.
  `wa_ellation` stored 8 x 70m, i.e. 560m of rappel down an 8-pitch route, while its own prose said
  the raps "approach the rope's full 35m reach". `wa_overcoat_peak_southeast_route` had the
  identical 2x error. A climber rigs for a rappel twice as long as the rope allows; this is the
  rope-off-the-end shape, and it is the worst thing in this dataset to get wrong.
  - **It is not a "does every rappel have a length" check, and must never become one.** `null` is
    the CORRECT value where no source gives a distance, and writing nulls rather than inventing
    numbers is what the repair did. **Halving is also wrong**: a rappel with no published distance
    may be 35m or 15m, so a halved figure replaces one fabricated number with another.
  - **30m is both a rope size and the correct half of a 60m rope**, so the rope-size rule is scoped
    to stations >=50m. Including 30 flagged 22 correct routes. Separately, any station over 60m is
    impossible on less than two ropes, and that rule does not need a rope to be *named*.
  - Two false-positive classes were found by running it, and both were regexes that flagged correct
    work — which teaches people to ignore a guard. `/double[- ]rope\b/` does not match "double
    **ropes**", so it condemned `wa_action_potential`, whose descent text lists all five lengths
    individually *and* names double ropes. And matching "rope length" in the count note flagged
    three routes whose notes accurately said things like "depending on rope length/number of ropes
    carried"; the admission being looked for is specifically the rope's **capacity** standing in
    for a measurement.
  - The third rule is about the **note, not the numbers**: a table can be corrected while
    `rappel_count_note` still states the method that produced the wrong value, and the next pass
    then re-derives it. That is why `enrich:apply` grew a `set` path for the scalar prose columns.
  - Read-only, anon key, fails closed on an empty read *and* on zero rappel tables. **Not a build
    gate** — a property of the DB, not the checkout, so no code change can cause or fix it; same
    reasoning as `check:counts`. Injection-tested, 4 cases at the bottom of the script; note that
    `--inject=clean` (every length nulled) must **PASS**.
  - Reader-side, `RappelTable` prints `—` for a null length. Its total was summed with `||0`, which
    turns "unknown" into "zero": a table with two known 30m rappels and one unknown printed "60 m
    total" and read as the whole descent. It now sums only known stations and says "60 m across 2
    of 3" when the line is partial.
- **`audit:rappel-claims`** asks whether a route's `rappels` field claims rappels its own
  `descent_text` says are not made. Both describe the same descent of the same climb, so a
  disagreement means one is wrong. `wa_mount_stuart_north_ridge` — the route `check:ui` pins as its
  sample — stored **"6 raps to 30m"** while its descent text said the Cascadian Couloir walk-off
  needs "no rappelling required (0 rappels)" and that the only rappel is an optional bypass taken on
  the way **up**. `wa_mount_baker_coleman_headwall` stored "2-3 rappels to 30m" against a text
  saying no trip report describes a fixed rappel on its descent at all.
  - **No coverage check can see this.** They ask whether the column is populated, and it is — a
    wrong claim and a right one are identical from there.
  - **Report-only, and it must stay that way.** Measured precision on the first run was **6
    flagged, 1 real**. A walk-off descent can still involve a real rappel elsewhere on the day
    (Buckner's North Face rappels the Sharkfin Col step on the *return leg*, and its text says to
    treat that, not the summit slopes, as the route's rappel hazard), and rappelling is often a
    conditional alternative to downclimbing rather than a contradiction (Stickney). Read both
    fields in full before changing either. The exit code says "things to look at", never "bugs".
  - The claim regex matches only a **leading** number. Prose that merely mentions a rappel is not
    an assertion that the descent has N of them, and matching it buries the real hits.
  - Two of the six were fixed as **phrasing** rather than errors: Colchuck's Northeast Couloir led
    with a rappel sequence its own text calls an emergency option while discouraging that descent
    entirely, and Stickney's bare "1" became "0-1, conditions- and party-dependent". Leading with
    the wrong descent is its own defect even when every fact is true.
**A climber's agreed correction must out-vote the enrichment — and the rule has now been
broken three times, in three different shapes.** `_rapEdited` (rappels, #787/#791),
`_descEdited` (descent text, #897) and `_rackEdited` (rack, #907) all say the same sentence about a
different column, and each was found separately because *the failure never looks like a bug*:
the column is populated, the section renders, and a plausible value is on screen. Only the
climber who made the correction knows the screen is wrong, and they have no way to report it.
  - The three failed **differently**, which is why finding one did not find the next.
    `rappelDetail` displayed **nothing**; `descentText` was out-voted **by string length**, so a
    shorter correction lost to longer stale prose; `rack` was not discarded at all — the
    contribute form's `rack` key merges into **`gearTiers.required`**, which `routeRackFor` does
    not read, so the correction rendered in the GearTiers panel while the RACK box **kept
    showing the value it replaced**. One Overview tab asserting two different racks for one
    route, with nothing saying which is current, and the form still offering the superseded
    text as "current" to the next climber.
  - **The gate is load-bearing, not defensive**, and the rack case is the clearest example:
    `gearTiers.required` is populated by seed data and enrichment on routes nobody has touched,
    so preferring it unconditionally inverts the rule for the whole catalog. Proven rather than
    argued — dropping `_rackEdited` fails two controls in
    `scripts/oneoff/probe-rack-correction-reaches-the-rack-box.mjs`.
  - **Only rendering can settle these.** Every identifier is bound, every column is populated,
    and grep cannot tell "the correction reaches a screen" from "the correction reaches *the*
    screen it was made on". The rack probe finds the hosting sub-tab rather than assuming it,
    then slices the markup around the RACK heading — because the correction *was* on the tab,
    just not in the box, and a tab-wide match reports that as fixed. Same vacuous-pass shape as
    `check:bare` matching the Safety tab's "Fire & smoke" link.
  - `check:rappel-readers` guards the first of the three statically. **The other two are guarded
    only by their probes**, which is recorded here rather than implied: the general rule
    ("a reader of an enrichment column that has a contribute-form key must consult
    `_contribFields`") is not yet enforced anywhere, and a fourth instance would ship silently.

- **`check:rappel-readers`** enforces one sentence: **a function that reads
  `route.rappelDetail` must gate it on `_rapEdited(route)`**, so a climber's agreed
  correction out-votes the station-by-station enrichment rather than the reverse. #787 found
  every reader preferred the enrichment, so on the 155 routes carrying a station list a
  correction could pass the 3-agree gate and display **nothing**; it fixed the three readers
  that existed and wrote the rule in a comment above them. #784 then added two more readers
  and neither carried the guard — five readers, three guarded, and `rappelHeadingCount`
  renders the section heading, which states a **number**. #791 repaired both.
  - **Nothing caught it and nothing could**, which is the entire argument for a script over a
    better comment: the merge was **clean** (the two PRs touch different lines), every gate
    stayed **green** (the invariant is semantic — an unguarded reader is valid JS that renders
    a number), and both new functions read as **correct in isolation**. Only a comment three
    functions above them said otherwise, and nobody adding a sixth reader has to scroll there.
  - Scans **per function**, not per file, and that scoping is what keeps it honest: the long
    explanatory comment about this very rule sits at top level between functions, so a
    whole-file grep would report a phantom sixth reader. Function bodies come from balancing
    braces over **raw** source — the blanker used elsewhere desynchronises on JSX apostrophes.
  - **Comments are stripped before either test, and that is load-bearing.** Two of the five
    readers explain the rule in a comment that *names* `_rapEdited`, so deleting their real
    guard still left the token in the body. Injection case 2 unguarded all five and the first
    draft reported **four** — the two best-documented readers were the two that would have
    slipped. Presence is not use, the same false pass `check:fire` records for `zoneInEffect`.
  - Fails **closed**: zero readers means the column was renamed or the walk broke, never that
    the app is clean. A plain `includes(".rappelDetail")` also matches `.rappelDetailX`, so
    that branch could never fire until the match was word-bounded (injection case 3, the
    second first-draft false pass).
  - Injection-tested, 7 cases at the bottom of the script; **two of them failed on the first
    draft and both were false passes**. Neither was visible by reading the script.
- **`check:real-profile-rows`** enforces one sentence: **a row must not print a level or a
  trust score for someone who has neither.** Seed climbers carry `level` and enough history
  for `vScore()` to mean something; a real profile carries neither, so the subtitle renders
  **"undefined · 0"**. #715 fixed ONE row of this and left the rest — they survived for months
  and were found only by driving a real account through the friend-request screen, where the
  row asking you to accept a stranger showed `@handle` above `undefined · 0`. Gated by
  `npm run build`.
  - It flags the **text** shape only: a level or score concatenated into a rendered string.
    `vScore()` used for sorting, filtering, or handed to `<TrustBadge score={…}>` is a
    different question — a badge can gate on `_real`, and `FullProfile` already does.
  - A site passes when the same expression is **gated** on `_conn`/`_real`/`_profile`, or goes
    through **`climberLine(c)`** — the single honest answer (location · @handle, falling back
    to "On ClimbMatch" rather than to fabricated numbers).
  - Five exemptions, each **measured** by reading the collection that feeds the row (the seed
    crew-invite card, PartnerSearch's ALL_CLIMBERS example card, two rows of the seed
    GuideDashboard, and the OPEN_CREWS organiser chip). A **stale** exemption fails.
  - Fails **closed**: zero concatenations means the vocabulary moved, never a clean app.
  - Injection-tested 5/5. It found **9 unswept rows** when written, five reachable with a real
    profile — including `ConnectModal`'s own subtitle, which read "undefined · Bellingham, WA"
    on the sheet that asks you to connect.
- **`check:crew-member-readers`** enforces one sentence: **a crew member's id must never be
  resolved against the seed `CLIMBERS` array.** Seed climbers carry integer ids; a DB crew's
  other members carry uuids, which `CLIMBERS.find` matches never. It does not throw and does
  not blank the screen — it renders a placeholder that reads like a person, or drops them.
  Seven rounds of this have shipped: **#569** ("You + 0 climbers"), **#680** (a DB group's own
  owner got no controls), **#715** ("undefined · 0"), **#734** (a real invite under the words
  "No crew invites"), **#756** (the day-agreement row said "Climber"), **#778** (the FLOAT PLAN
  dropped real partners — the screen recording who is on the mountain listed one of two — and
  the trip recap said "Member") and **#826** (a past crew card listed no partners, so
  "reconnect" could never suggest whoever you actually climbed with). Each was found by walking
  one more surface; this asks statically, across all of them at once. Gated by `npm run build`.
  - **Why a script and not a comment**, and this is the whole argument: #778 shipped the
    resolver plus three fixes, and #776 then merged from a branch based on **pre-#778 main** —
    its squash silently **reverted all of it**. Clean merge, no conflict, every check green,
    and main went back to shipping the bugs. The only thing that would have noticed was a step
    in a one-off nobody runs. Same reasoning as `check:rappel-readers`.
  - A site passes when the **same expression** also consults real profiles — what `CrewCard`'s
    `mem` does (the #569 fix). That is a correct answer, not an exemption.
  - **Comments are stripped before any test**, and it is load-bearing: two call sites explain
    this rule in a comment that *names* `crewMemberById`, so leaving comments in would let a
    site pass on prose about the fix rather than the fix. The false pass
    `check:rappel-readers` already records.
  - Six exemptions, each with a **measured** reason (seed-only lists: `crewReqIn`,
    `crewJoinIn` twice, the seed invite card, `GuideDashboard`'s inquiries, and a
    notification whose result is guarded by `if(c)` so a miss opens nothing). A **stale**
    exemption fails, so the list cannot rot into a description of code that is gone.
  - Fails **closed**: zero member-id lookups means the walk broke, never that the app is clean.
  - Injection-tested, 6 cases at the bottom of the script: reverting each of the three #778
    fixes fails and names the file and line; deleting a live exemption reports it as a finding;
    an exemption matching nothing reports as stale; and breaking the scan vocabulary reports
    "found NO member-id lookups at all" rather than passing.
- **`check:provenance`** asserts that every route-page section that carries a provenance chip
  still renders one, and that a section with **no data carries none**. The chip says how a
  section was **sourced** — `Climber-verified` / `On file` / `Auto-generated` — and deliberately
  not how *true* it is, because nothing in `routes` can support that claim:
  `data_quality.confidence` is **94.0% "MEDIUM"** across 8,367 WA routes (58 LOW, 57 HIGH), and
  89% of the `gaps` arrays are one boilerplate sentence repeated 8,021 times. A chip fed by
  either says one word everywhere. Static apart from a `renderToStaticMarkup` pass, so it sits
  in `npm run build`. See `lib/provenance.js`.
  - **Adding the prop is not enough, and that is the whole reason this renders rather than
    greps.** Five of the first ten wired headings showed no chip, each for its own reason:
    `rappels` was wired to the wrong one of **two** surfaces that both render the text
    "RAPPELS" (grep cannot separate them; only one is the heading users see); `gpx` and
    `waypoints` are **alpine-gated** and invisible to a `trad` fixture — the `cragOnly` trap
    `check:field-renders` already records; `pitch_detail` splits **per entry** across
    PITCH-BY-PITCH and ROUTE BETA, so wiring one left the other bare; and the
    "CLIMATE & SEASON" box is gated on `route.climate`, **not** `route.season`, so a
    season-keyed chip there rendered nothing at all.
  - A failing row distinguishes **"its heading never rendered — fixture too thin"** from a chip
    bug, because those need opposite fixes. Match a heading, never the chip label alone.
  - **`gear` is deliberately NOT wired.** #806's RACK caption owns that section, reads the real
    per-section column (`gear_confidence`) and stays **silent on the verified majority** —
    praise on every route is what got two page-level graders (`ProvenancePanel`'s DATA
    CONFIDENCE, `EnrichmentPanels`' DATA QUALITY) deleted. `sectionProvenance("gear")` is still
    unit-tested; **do not add a second label to RACK**.
  - **A per-section signal must beat the route-level flag**, and `sectionProvenance` checks
    `auto_generated` **last** for that reason: 138 WA routes are `auto_generated=true` AND
    `gear_confidence=verified` — the audit went back and confirmed a generated rack. #810 added
    the three assertions that exercise the ordering, because every other case in the file sets
    one signal or the other and would still pass if the two blocks were swapped.
  - **"`auto_generated` is 5.4% true" is catalog-wide and understates it badly.** Among routes
    that actually carry these fields — the only ones that render these sections — it is true on
    **39–66%** (66% of the 584 with a gpx track). So the chip discriminates: 64.4% "On file"
    across 13,790 chips, not one word everywhere. `scripts/oneoff/measure-provenance-spread.mjs`
    is the measurement. Judge a signal on the subset that reaches a screen, never on the table.
  - **Counting chips: count the `title` attribute, not the label text.** `ProvChip` renders its
    label in both `title="How this section was sourced: …"` and the text node, so counting
    `"On file"` returns exactly **double**. That artifact read as duplicate labelling on a tab
    and was very nearly reported as a defect.
  - One assertion is **marked WEAK in the script on purpose**: "a bare route renders no chip"
    passes even when `sectionProvenance` is broken to rate absent data, because a bare route's
    sections are content-gated and never render, so no heading exists to hang a chip on. The
    honesty rule is pinned by the unit assertions, not by that one.
  - Injection-tested three times, all caught: neutering `ProvChip` fails **every** reachability
    row (10 today, real exit code 1); disabling the chip inside `SL` fails its rows; rating
    absent data fails the four emptiness assertions.
- **`check:wp-styles`** asks whether the app can *draw* every kind of waypoint it *recognises*.
  Two maps in `ClimbMatchCore.jsx` describe waypoint types and were maintained separately:
  `WP_TYPE_MAP` turns ~30 raw spellings into a canonical type (`"lake"` → `Water`), and
  `WP_STYLE` turns a canonical type into `{color, glyph}`. Nothing tied them together and they
  drifted: `WP_TYPE_MAP` emitted five canonical types — **`Base`, `Crag`, `Pass`, `Approach`,
  `Landmark`** — that `WP_STYLE` had an entry for **none** of, so all five fell through
  `wpGlyph`'s `||"📍"` fallback and rendered as one identical grey emoji pin. **141 waypoints on
  130 WA routes**, with a route's Base indistinguishable from its Landmark. Static apart from
  one `renderToStaticMarkup` pass, so it sits in `npm run build`.
  - **Invisible to every gate that already existed**, which is the argument for this one: both
    maps are valid JS, every identifier is bound, the screen renders, and a pin appears — it is
    just the wrong pin. `check:refs`, `check:dead-props` and `check:field-renders` are all
    structurally blind to it (the column is populated *and* rendered; only the glyph is wrong).
  - It also caught a **second** defect of the same family: the two Leaflet marker call sites did
    `wc[wp.type]`, indexing the colour map with the **RAW** string and bypassing the normaliser
    the rest of the app goes through. `WP_TYPE_MAP` is keyed lowercase, so `"Lake"`, `"camp"`,
    `"Base/bivy"`, `"Trailhead/pass"` all missed and drew grey — **20 more waypoints whose
    colour this app already knew**. A raw lookup is a *silent* miss: it yields `undefined`,
    falls to the default, and throws nothing. Section 3 forbids the shape outright.
  - **Parsed with Babel, deliberately not with the comment/string blanker the sibling guards
    use.** A raw regex would match the explanatory comments (which quote `wc[wp.type]` as the
    defect) and report phantoms; but the blanker is unsafe *here in the other direction* — it
    treats every straight quote as a string delimiter and JSX body text is full of them, so it
    can desynchronise and wipe a **real** `wc[w.type]`. That is a false pass, the one outcome a
    guard must never produce. An AST has neither failure mode. Note the split from section 1,
    which reads **raw** source because every value there *is* a string literal and blanking
    would report two empty maps as two agreeing maps.
  - **A glyph must be a text-presentation character**, tested with `\p{Emoji_Presentation}`. A
    codepoint with emoji presentation is painted by the font's colour glyph and **ignores the
    CSS `color` beside it** — which is exactly what 📍 did. A hand-rolled codepoint range was
    tried first and called the existing, working `⚑` and `⚠` defects (both are `Emoji=Yes` but
    `Emoji_Presentation=No`); widening it by name would have hidden the next real one. `U+FE0F`
    is checked separately, so `"⚠️"` fails where bare `"⚠"` passes.
  - **The five new types share one neutral colour on purpose.** The palette carries nine
    chromatic hues and the eight existing types spend them; minting near-duplicates would damage
    the eight that work, and **reusing** a hue would be worse than grey — a Crag drawn in
    Campsite purple is not ambiguous, it is a wrong navigational claim. These five are
    descriptive rather than navigational, so the glyph carries the distinction, which is the
    principle the `WP_STYLE` comment already states rather than an exception to it.
  - **`Approach` is the dashed `⇢`, not `→`** — the plain arrow appears **104 times** in this app
    as ordinary copy (`See all →`), so as a pin glyph it reads as punctuation, *and* no render
    assertion could tell the pin from a link. A glyph used elsewhere as prose is not a glyph.
  - Section 4 renders the real `RouteDetail` over waypoints carrying **raw** spellings
    (`"Climbing area"`, `"col"`, `"Lake"`) and requires the glyph the *normaliser* should reach,
    exercising `WP_TYPE_MAP → wpType → WP_STYLE` end to end. It demands **two** occurrences of
    each, not one: every type renders on two surfaces (the list row and the map legend) and an
    "at least once" test is satisfied by **either** — measured, after blanking the list's glyph
    left the assertion green on the legend alone. Same vacuous-pass shape as `check:bare`
    matching the Safety tab's "Fire & smoke" link.
  - The legend now lists only the types **the route actually uses**. It printed all of `WP_STYLE`
    unconditionally, which already described types the map did not draw; at 13 styled types that
    becomes a wall of pills mostly about other routes.
  - `WP_TYPES` (what the editor offers) is deliberately **not** widened — the reverse direction is
    fine and precedented, since `Bailout` has always been styled without being offered. The guard
    only forbids offering a type that cannot be drawn.
  - Injection-tested, 8 cases at the bottom of the script, all caught. **Two were harness bugs
    first, and both are the `injection logged, counter didn't move` shape:** the glyphs were
    written as perl `\x{22A5}` escapes and perl without `-CSD` works on **bytes**, so three cases
    reported "not caught" while the file was never modified; and case 7 aimed at `wpGlyph(_wty)`
    when the surface rendering on Overview is `wpGlyph(_wt)` — `RouteDetail` has **three**
    waypoint glyph surfaces, not one. Every case now proves the edit landed *by checksum* before
    it judges the guard.
- **`check:log`** guards the climb-log read path against silently dropping fields, and since
  #861 it guards **both** of them. `climb_logs` is hydrated **twice** — `ClimbMatch.jsx` builds
  `logs` (your own logbook), `RouteDetail.jsx` builds `dbReports` (the same rows as a route's
  `activity`) — and a route's `activity` dedupes `route.activity → myReports → dbReports` by
  `_dbId`, so **your** row arrives via `myReports` carrying the full ClimbMatch shape while
  every **other** climber's row exists only as `dbReports`. Both are opened into the same
  components (`ReportStats`, `TripReport`). So a column one hydration drops is a fact on
  screen for its author and for nobody else. Gated by `npm run build`.
  - It has now caught that in **both directions**. #843: `car_to_car_minutes` was read by
    RouteDetail and not by ClimbMatch, so your car-to-car time showed while you typed (the
    form computes it), vanished on reload, and stayed visible to everyone else. #861: the
    reverse — `fa_ascent` and `developed` were read by ClimbMatch and not by RouteDetail, so
    `buildConsensus`' `faCredits`/`isDeveloped` could only ever credit a First Ascent to
    **yourself**, on a panel whose entire purpose is public attribution. The same hydration
    was also starving `TripReport` of `itinerary`, `sun_vote` and `sun_note`.
  - **`DERIVED` is the dangerous list, and #843 is why.** `car_to_car_minutes` sat there as
    "derived on both sides rather than round-tripped" — a claim requiring something to
    re-derive it on read, and nothing did (the only place `carToCar` is computed from the
    three legs is the LogAscent form, while typing). Proved by injection: restore that
    exemption *and* delete the read, and the script prints `ok`. **An exemption is a claim
    about the code**; if you cannot point at the deriving expression, it is not derived, it
    is dropped. Same standard as `check:field-renders`' `KNOWN` map.
  - `ROUTE_THIN` is the second hydration's exemption list and a **stale entry fails** — a
    column that starts being read there, or stops being written, is reported rather than
    tolerated. Only two entries are live; each names the reader it was checked for.
  - **`partners` is deliberately not hydrated onto the route page**, and this is measured
    rather than a taste call: `matchClimber` does
    `CLIMBERS.find(c=>c.name===nm&&ascent.partnerIds.includes(c.id))` against seed **integer**
    ids, so feeding it uuids takes that branch and returns `null` for **every** partner —
    strictly worse than the name fallback it uses today. The class
    `check:crew-member-readers` exists for.
  - Scope trap worth knowing: `written` comes from the depth-1 keys of the payload **literal**,
    so the three columns `syncLogToDb` appends conditionally afterwards (`partners`,
    `belayed_by`, `gpx_track`) are not in it. They are tracked by `UNWRITTEN_OK` instead.
    Exempting them in `ROUTE_THIN` fails as stale — which is how that was discovered.
  - Fails closed twice over: `ANCHOR LOST` if RouteDetail's `return _tripRows.map(function(r){`
    is renamed, and a parse yielding fewer than 10 column reads is reported as a broken scan
    rather than a clean app.
  - Injection-tested, 4 cases for the second-hydration section, listed at the bottom of the
    script. Case 2 (drop a single column) took two attempts: `stars:r.stars,` occurs **twice**
    in `RouteDetail.jsx` and the first hit is unrelated, so a bare `.replace()` edited the
    wrong line and the run passed. It reported *"edit landed: false"* rather than *"guard
    missed"* — **prove the injection landed before believing what the guard says about it.**
- **`check:toast-reachable`** asserts that every screen `App` returns can **show a toast**.
  `showToast` sets state, but the toast only appears if its renderer is mounted in whatever
  `App` returned — and `App` returns **early on nine screens** (legal, session restore, auth,
  password recovery, the profile editor, both guide screens, the calendar) while the toast
  rendered only in the **final** return. On those nine the message went into state nothing was
  rendering and the 2.6s timer then cleared it. **13 messages could never reach a user.** Static,
  so it sits in `npm run build`.
  - The three that matter: **all 11 guide-dashboard messages**, including four RLS-failure
    warnings (a guide taps Save and the screen does nothing whether the write succeeded or the
    database refused it — and those handlers were wrapped in try/catch *precisely* because "the
    rejection became an unhandled promise and the button did nothing at all", so the wrap landed
    and the toast still could not render); the guide application's **submit failure and only the
    failure** (its success path calls `onClose()` so its toast appears, the `catch` does not);
    and **"Join a group to create events"**, which is the *default* outcome of the Calendar's
    "+ Create an event" button — `GROUPS` is empty behind `DEMO_FILLERS` and `joinedGroups`
    starts empty, and the early `return` skips `setCalOpen(false)`. That is the **zero state**,
    not an edge case.
  - The fix is **one** `const _toastEl` hoisted above the early returns and referenced by all
    nine — one definition, nine renderers, nothing to drift. The nine returns were edited **by
    condition, never by line number**: this file packs many declarations onto one physical line,
    and an unmatched anchor was made fatal rather than a silently shorter edit list.
  - **No existing guard could see this, and the near-misses are the point.** `check:zindex`
    enforces that the toast beats every other z-index; `check:overlay-portals` enforces that it
    escapes the stacking context. Both ask whether a **mounted** toast is *visible*. Neither asks
    whether it is mounted. A toast can satisfy every ceiling and portal rule in the app and still
    be absent from the screen that fired it.
  - **`check:zindex` went red the moment the fix landed**, because its anchor was the inline
    `{toast&&` shape at the render site. That is the guard working — it refused to report on a
    file it no longer understood. It now accepts the hoisted `_toastEl=toast&&` shape too, and
    matching **neither** stays fatal.
  - Scoped with Babel to **App's own top-level returns** — a `return null` inside a nested
    component is not a screen. Fails **closed** three ways: a renamed `App`, a renamed
    declaration, or fewer than five returns found each report a *broken scan*, never a clean app.
  - Injection-tested 4/4, cases at the bottom of the script, each proving its edit landed **by
    checksum** before judging the guard. Case 4 must **pass**: a guard clause returning `null` is
    not a screen.
- **`check:logged-times`** asserts that a climber's logged time reaches the planner. Since #787
  a trip report carries approach / climb / descent minutes and a car-to-car total, and other
  climbers can read them — but the planner still answered "how long will this take?" with
  Scarf's Rule alone, so the app held evidence of how long a route takes and printed a formula
  beside it. The panel now sits **above** the estimate, because ordering is a claim about
  authority: measurement first, model second.
  - **No existing guard could ever see it.** `check:bare` renders a route with no activity;
    `check:ui` walks the seeded demo, whose `cond.carToCar` is **prose** ("7 hr", "3 days",
    "Turned around") and therefore deliberately ignored; `check:zero` has nothing logged; and
    `check:field-renders` covers `routes` columns while these are `climb_logs` ones. That is the
    `check:anniversary` shape — a surface nothing exercises breaks silently and stays broken.
  - **Numeric minutes only, never the `carToCar` string.** Parsing it would read `3` out of
    "3 days", which is the mistake `rappels` and `season` already record. `carToCarMin` is the
    integer; the legs are integers; their sum is a real car-to-car. One assertion exists purely
    to fail if anything ever starts parsing English durations.
  - It does **not** feed the model. `scarfHrs` is parameterised by the READER's fitness and pack
    weight, and a logged time comes from a party whose fitness nobody recorded; blending them
    would give a number that is neither measurement nor prediction. A median with the spread and
    the party count says what it is. A **turned-around** party is excluded from the total — they
    covered real ground, but not the route — and the count on screen is what proves it.
  - Static SSR (no browser, no DB), so it sits in `npm run build`. Injection-tested, 5 cases at
    the bottom of the script; dropping the `activity` prop, counting non-completions, parsing the
    prose, and swapping the median for a mean each fail it by name.
- **`check:camping`** asserts that **CAMPING & BIVY reaches the Planner tab**, on every
  discipline that can benight a party, and that it merges its **two** stores into one section.
  Static SSR, so it sits in `npm run build`.
  - **The mount has already been silently lost once**, which is why this is a script and not the
    comment it replaces. It lived on a dense line, main changed the same line, and the merge kept
    main's copy — leaving the panel **defined and rendered nowhere**. Nothing caught it:
    `check:dead-props` sees props, not unmounted components; `check:refs` sees bindings, and every
    binding was fine; and `routes.bivy` was populated, so any coverage check looked healthy. The
    repair left a comment saying "confirm BIVY still reaches the screen" — the exact shape
    [[semantic-invariants-need-a-script]] records as rotting.
  - **Two stores, one section.** `route.bivy` holds researched sites (capacity/water/permit/notes);
    a **Campsite waypoint** is the same fact recorded on the track. Rendered apart, a route could
    show a camp pin under WAYPOINTS while this panel said nothing — two answers to one question.
    `campSites()` merges them and dedupes on **name**, the only field both stores reliably carry.
  - **It moved off the Safety tab (2026-08-13) and gained `scrambling`.** Where you sleep is a
    planning decision, not a hazard; on Safety it sat behind a tab nobody opens for logistics. And
    a scramble that overruns benights a party exactly like an alpine route. The gate reads
    `catOf(route)`, **not** `route.discipline`, because `catOf` folds `rock` into trad/sport first.
  - It renders on a day-trippable route too, deliberately: the party that gets benighted on a
    "car-to-car" route is precisely who needs it, so *no bivy plan* is not *no bivy*.
  - **Count inside the panel, never across the tab.** The Planner also renders ROUTE TRACK and its
    map legend, which name the same waypoint legitimately — a whole-tab count reads 2 for correct
    code. The first run of this script did exactly that and reported a dedupe bug that did not
    exist. The slice is bounded by the next heading, and a missing `ROUTE TRACK` fails as
    `ANCHOR LOST` rather than passing.
  - **Match the un-escaped text.** `renderToStaticMarkup` emits `CAMPING &amp; BIVY`; see
    [[ssr-probes-must-match-escaped-html]]. Assertion 0 proves the probe can fire at all, so a
    renamed heading reports `ANCHOR LOST` instead of a vacuously green run.
  - **Known gap, printed rather than hidden:** `bivy` is **not contributable** — it is in neither
    `FIELDS` nor `SS`, and the panel's edit pencil opens the *waypoints* editor. A climber cannot
    add or correct a camp. That needs a structured array editor and is not built.
  - Injection-tested, 5 cases at the bottom of the script; 4 were run and each failed naming its
    own defect (deleted mount → `ANCHOR LOST` + exit 1; dropped `scrambling`; removed dedupe;
    dropped the waypoint half of the merge).
- **`audit:trailhead-agreement`** asks whether a route's two copies of its own trailhead agree.
  Every route stores it **twice** — a `waypoints[]` entry of `type:"Trailhead"` with a name and
  coordinate, and `approach_logistics.trailhead`/`trailheadLat`/`trailheadLng` — written by
  different enrichment passes, neither reading the other, and nothing had ever compared them.
  **155 of 630 WA routes disagreed by more than 500 m**, p95 15 km, worst 216 km. No coverage
  check can see this: both columns are populated, both values are plausible coordinates.
  - **The cause is name collision**, the same root cause as the route-id note above, one level up:
    there are two "White River Trailhead"s in WA **130 km apart** and two "Lake Ann"s **79 km**
    apart, so Little Tahoma carried the Lake Wenatchee White River and Black Peak carried Mount
    Baker's Lake Ann. **A name is not an identity.**
  - **It is user-visible, and the two surfaces disagree on which record wins.** `TrailheadCard`
    (the only directions control on the Plan tab) reads `approach_logistics` **first**; the crag
    Overview "Directions to crag" button reads the **pin** first. So on a disagreeing route the
    trailhead you are sent to depends on which screen you are looking at. **Deliberately not
    "fixed" by swapping a priority** — which record is right varies per route, so that would only
    move the error. The repair is the data.
  - **Distance to the peak names the guilty record; the pin-vs-blob comparison cannot.** Two
    coordinates disagreeing says only that one is wrong. `scripts/oneoff/probe-logistics-trailhead-vs-peak.mjs`
    anchors on the route's own peak from `areas` — a third, independent record — exactly as
    `trackOffItsPeak` does in `audit:waypoints`. That settled the 7 gross cases in #886.
    **Its MIRROR is empty**: at that scale the *pin* is never the far one, so the blob is the
    wrong record every time. That asymmetry does **not** generalise downward — below 25 km the
    pin is wrong at least as often, which is why the rest had to be read rather than measured.
  - **Distance alone never condemns a trailhead.** 236 WA routes sit >8 km from their peak and
    almost all are correct: Hozomeen, the Mox Peaks, Ragged Ridge and the Pasayten summits are
    genuinely 28-31 km from the road. Eight such routes were deliberately left alone.
  - **A shared `trailheadDirection` string is NOT a contamination fingerprint**, and the first
    draft said it was. Measured, those repeats are mostly legitimate — "From the Ross Dam
    Trailhead on SR-20" really is the access for **ten** routes across the Pickets and Ross Lake,
    the Stehekin ferry really does serve Flora/Trapper/Tupshin. **Remote peaks share one distant
    trailhead; that is what remote means.** Printed as context, never counted.
  - The repairs (#878, #886, #898, #900) took it to **42**, 93.3% agreeing, p95 701 m. What
    remains is sub-kilometre slop plus peaks with two genuine approaches where **both records are
    correct** — `wa_lundin_peak_west_ridge` is the clean example. Do not sweep those to zero.
  - **The applier pattern is the transferable part.** `fix-trailhead-disagreements-batch4/5.mjs`
    declare a **winner, never a coordinate**: the script reads both records off the row and copies
    the winner into the loser. So nothing can be invented, no coordinate is retyped, and **a fix
    needing a THIRD coordinate cannot be expressed at all** — the exclusion is structural rather
    than a judgement made correctly 102 times. That is what made unreviewed subagent triage safe
    to ship, with `scripts/oneoff/verify-slice-ac-fixes-reference-the-row.mjs` measuring which
    recommendations actually referenced the row (26 of 34; the 8 that did not were one group, all
    off by exactly 454 m).
  - Read-only and fails closed on an empty read. **Not a build gate** — a property of the DB, not
    the checkout, so no code change can cause or fix it; same reasoning as `check:counts`. It uses
    the service key only because the anon role's 3s `statement_timeout` cannot complete a read of
    two jsonb columns over 8k rows, and it issues no write. Retries are printed, not absorbed.
- **`audit:waypoints`** asks whether each waypoint actually sits on the route's own gpx track —
  a geometry question no column-coverage check can reach, since every field is populated and
  every value is a plausible coordinate. Read-only, anon key, fails closed on an empty read.
  `audit:waypoint-order` is its **sibling, not a duplicate**: that one asks whether the *list* is
  sensible (ordering, duplicate pins) and needs no gpx at all. Run both.
  - **THERE ARE THREE WAYPOINT AUDITS, AND TWO OF THEM ASK THE SAME QUESTION.**
    `audit:waypoint-track` measures the *same* thing this does — is each pin on the route's own
    line — with its own thresholds, and **neither script mentioned the other**. Against WA they
    flag **218 and 240 routes with only 178 in common**. Read the two together or you are reading
    one arbitrary half; do not quote either count as "the" number of waypoint problems.
    - The divergence is mostly **tolerance, not disagreement about facts**: this one uses a flat
      500 m for any non-trailhead/summit pin, `waypoint-track` uses **120 m by default with
      per-type exemptions** (Bailout 2000, Hazard 600, Water 400, Campsite 500) — because a
      Bailout pin is *supposed* to be off the line. So 53 routes visible to it and not to this
      one are pins 120–500 m out, which is a judgement call rather than a miss.
    - It is **ahead** of this script in two ways worth copying rather than duplicating: those
      per-type tolerances, and a **blame column** (TRACK / PARTIAL / PIN) that separates "the
      line is wrong" and "the track only covers the climb, so approach pins are legitimately
      off it — NOT a defect" from the pins actually worth fixing. Its PARTIAL bucket is 38
      routes this script reports as defects.
    - It was **behind** in one, and it was the same defect twice: it had **no placeholder gate**,
      so it measured pins against 2-point stubs and dots. `wa_sky_mountain_s_route` stores nine
      points spanning **four metres** and it reported a pin "2,237 m off"; `wa_mount_terror_
      stoddard_buttress` is 55 m of extent and reported 9,966 m. That is exactly what #834 fixed
      in this file and nobody carried across — **the four-grade-parsers shape, one level up**.
      Fixed: 240 → 231, and its lone "WRONG TRACK" was itself a 17 m placeholder.
    - A point-count gate cannot see this (**nine points is not a suspicious number**) — the test
      has to be **extent**. Skipped routes are now named and counted, not dropped.
  - **It has twice reported far more problems than exist, and both times the fix was to the
    audit rather than to the data.** #834 took 878 → 753 (a backwards summit predicate flagging
    every out-and-back, a point-count placeholder test, a whole class of positionless waypoints
    it could not see). This pass took it to 646 the same way, so **treat a headline count here as
    a hypothesis until it has been deduplicated** — see [[waypoint-audit-overcounted-by-126]].
  - **The categories must be disjoint, and two were not.** `waypointOffLine` walks every pin, so
    a trailhead or summit already judged by its own category was reported a second time — 100
    pins double-counted, Curtis Ridge producing six findings from three waypoints. Worse,
    `summitOffLine` and `trackNotEndingAtSummit` both fired on the same pin, which is not merely
    a double count: it put 20 routes whose summit pin is *correct* and whose gpx simply stops
    short into a category titled "SUMMIT IS NOT ON THE TRACK". Those need the **opposite** repair,
    which is the distinction note (3) already draws for trailheads. They are now exclusive.
  - **A dedupe that loses a finding is worse than the double count it replaces**, so it is
    verified by comparing distinct `(route, waypoint)` pairs across dumps rather than totals:
    `verify-waypoint-dedupe-lost-nothing.mjs`, 449 before and 449 after, nothing lost, 100 pins
    moved to the more specific category.
  - **`trackOffItsPeak` is the one test not measured against the route's own track**, which is
    why it is worth having: every other category asks "is this pin on this line?" and therefore
    cannot say which of the two is wrong. When the *track* is the misplaced thing, the route's
    correct pins are all faithfully reported as broken and the gpx is never suspected.
    `wa_mount_rainier_curtis_ridge` carried five points beside **Rattlesnake Lake, ~65 km from
    Rainier and 734 m from a bouldering crag**, and all six of its findings blamed the waypoints.
    Anchoring on the area's own coordinate settles it with no pins, prose or judgement.
  - **Its title says "never comes within 2 km", not "is not this peak's track", and the
    difference is measured.** Of 8 WA hits only **one** is a foreign track; the other seven
    start at the **correct trailhead** and merely stop short (Himmelhorn and West Twin Needle
    from Goodell Creek, Fuhrer Finger from Paradise, Barnes up the Elwha). Naming it for the
    stronger claim would have been false of seven of eight. It is **informational** for the same
    reason — 6 of its 8 are already counted elsewhere, so counting it would re-inflate the total
    this pass deflated. Confirm each with `probe-whose-track-is-it.mjs`, which names the peak a
    stray track actually reaches; the threshold comes from the measured distribution (closest
    approach is **13 m at the median, 1,038 m at p95**), not from a guess.
  - The placeholder-coordinate guard (`COORD_DP`) **excludes zero WA routes today** and says so
    in the script: both peaks it would protect are already filtered as `unrouted`. It is kept
    for the eight 3-decimal Picket summits, not because live data has exercised it.
  - The opening read pays a **warm-up request** because the first call of a run costs ~3.7s of
    connection setup against 0.3–0.7s warm, and anon carries a 3s `statement_timeout` — so it
    intermittently died with `57014` before fetching anything. Shrinking the page does **not**
    fix that: measured, 1,000 areas *with* lat/lng takes 725 ms warm while 400 still failed cold.
  - Injection-tested, three cases: neutering the dedupe guard restores 100 duplicates, re-merging
    the summit categories restores 20, and disabling `COORD_DP` changes nothing — which is how
    that guard was found to be inert and got documented as such rather than presumed working.
- **The `climbing_route` sweep** is a pipeline, not a single script, and the three parts are
  separate on purpose. `audit:approach-scope` REPORTS (for a human to read);
  `enrich:next-batch` emits a WORKLIST (for a batch to consume); `enrich:apply` WRITES. Keeping
  them apart stops the audit growing flags only a pipeline cares about.
  - The problem it exists for: `approach` is meant to describe the walk in, but a route with no
    pitch table had nowhere else to put a description of the climbing, so that description went
    into the approach and the prose runs past the base and keeps going to the summit. 360 WA
    routes carry it; 254 had no pitch table. Migration 0122's `climbing_route` is where it goes.
  - Batches are produced by **re-homing, never researching** — every fact must already be in
    that route's own `approach`. That instruction is worth nothing unless something checks it,
    so **`check:enrichment-traceable`** verifies that every number and every load-bearing
    feature/direction word in a segment also appears in the source. Prose may be rewritten
    freely; specifics may not be invented. Run it on a batch BEFORE `enrich:apply`.
  - It took two rounds to make that guard right, and both are the same lesson. It first flagged
    "Traverse to the summit gully" as untraceable where the source said "travers**ing** higher"
    — a guard that flags correct work teaches people to ignore it. The fix (stem both sides)
    still failed because the stemmer never stripped a trailing `e`, so "traverse" and
    "traversing" never met. Over-stemming is safe here: the same function runs on both sides.
  - Injection-tested: adding *"Rappel 45 m from a bolted anchor on the cornice above the
    chimney"* to a Buckner segment is caught on the number, "cornice" and "chimney" — and
    correctly does NOT flag "rappel", which that route's approach really does mention.
  - **An empty result is a real result.** Eldorado's Northwest Couloir gets zero segments
    because its approach stops at the couloir base; Mount Anderson gets two despite `pitches:7`
    because the text stops at Flypaper Pass. Those routes stay on the candidate list. They are a
    gap in the data, and leaving the gap visible beats filling it from imagination.
  - `enrich:apply` is the single write path and must stay so: it asserts each route's `area_id`
    before writing (only ~9% of route ids are peak-scoped, so a name-shaped id proves nothing),
    writes through `patchRow`, then **re-reads and reconciles**. Its verification builds the
    check list from what was actually written — an earlier version omitted `climbing_route`, so
    a route setting only that column satisfied every remaining clause vacuously and printed
    "verified" having confirmed nothing.
  - A populated column is not a rendered one. `CLIMBING ROUTE` and `PITCH-BY-PITCH` are mutually
    exclusive through `isPitched()`; both halves have been confirmed on screen, and the bivy
    section was found **defined and mounted nowhere** after a merge kept main's copy of the
    dense line its mount lived on.
- **`audit:area-parents`** asks whether each area is filed under the place it belongs to —
  the question `check:counts` cannot reach. `route_count` is verified against the subtree an
  area *has*, so it is exactly correct about a **wrong tree**; the ltree paths were
  self-consistent too. The Liberty Bell Group is one ridge of five towers and three of them
  (Lexington Tower, North Early Winters Spire, South Early Winters Spire — 23 routes) were
  parented as the group's **siblings**, so it advertised 27 routes against a true 50 and the
  best-known lines at Washington Pass rendered outside the formation every guidebook files
  them under. Kangaroo Ridge (`route_count` 0, holding two empty stubs while all five
  populated formations sat outside) and "Silver Star and Wine spires" (containing neither
  Silver Star nor three of the four Wine Spires) had the identical defect. `0106` repaired
  all three.
  - **The mechanism will recur on any import.** Two loads that were never joined: an
    OpenBeta-derived crag tree supplied the grouping rows plus hollow `crag` stubs, and a
    separate alpine peak list attached every real summit **flat** to the region above. The
    fingerprint is a 0-route stub sitting metres from a populated peak of the same name —
    `wa_north_early_winter_spire` was **8 m** from `wa_north_early_winters_spire`.
  - **Report-only, like `audit:identity`** — not a pass/fail gate, and the exit code says
    "things to look at", never "these are bugs". Earned: D1's first draft flagged 41
    candidates of which 12 were real. Coordinates cannot decide parentage in crag terrain
    (at the Icicle boulders every formation is within 500 m of every other) and generic
    tokens like "dome"/"face"/"buttress" match across unrelated crags. **Confirm each hit
    against the group's own name before moving anything.**
  - Read-only, anon key, fails closed on an empty read — zero areas makes every tree look
    perfect, so the realistic failure mode is a false pass.
  - Injection-tested, and **three separate defects each made all four injections report a
    clean tree** — none visible by reading the detector. The index was built before
    injection (so a "moved" peak stayed in its frozen child list); victims were drawn from
    the whole 47k-row catalog (so `--inject=path` perturbed an *Alaska* row while the scope
    is WA); and scope from a single source hid one fault each way — by `parent_id` an orphan
    has already left the walk, by `path` a rewritten path no longer says `washington`, so
    scope is now the **union of both**. The tell every time: the injection logged, the
    counter did not move.
  - **Six detectors now, and they are not the same kind of claim** — the summary says so per
    detector rather than labelling everything a candidate. D1/D2/D4 are hypotheses; D3/D6 are
    exact defects; D5 is exact about a *declaration*, not about the tree.
  - **D4 — a container whose ONLY child carries the identical name**, i.e. a level that says
    nothing: the browser shows "Last Unicorn, The", then "Last Unicorn, The", then two boulder
    problems. Exact, no route counts involved — 12 hits catalog-wide, 1 in WA, all 12 a
    `region` whose lone child is a same-named `crag`. Matched on the **raw** name, so a
    singular child inside a plural parent ("Aries Boulder" in "Aries Boulders" — one boulder in
    a named cluster) is correctly ignored; `--inject=twinplural` pins that.
    - **Reported, never repaired, and the repair is genuinely awkward rather than merely
      risky:** `routes_require_leaf` refuses to move the routes up while the child still
      exists, and the FK refuses to drop the child while routes point at it. It needs a
      deferred constraint or two transactions.
    - **D4's FIRST version, shipped in #820, was vacuous, and the reason generalises.** It
      looked for a same-named parent/child pair where *both* held routes and reported 3 WA hits
      that all looked real. Every one was false and the test could never have found a true one:
      `route_count` is a **subtree aggregate**, so the parent's count came entirely from the
      child (all 3 WA parents, and all 58 catalog-wide, held **zero** direct routes); and
      `trg_areas_leaf_xor` means **0 of 47,590** areas hold child areas and direct routes at
      once, so "both halves populated" cannot exist. A same-named container/leaf pair is the
      *correct* way to say "this crag has its own problems and also contains other boulders" —
      `wa_fuzz_wall` holds Span Man and Haunted Shack beside `wa_fuzz_wall_2`. **Ask what a
      detector cannot report, not only what it does**, and never read a subtree aggregate as
      evidence about a row.
  - **D5 — region-level children against `scripts/wa-region-shape.json`**, the only detector
    that consults anything outside the DB, and the only one that can see the `0118` class: MP
    groups a scatter of small crags under a container, our import drops them flat, and
    Olympics ended up with **18 direct children against MP's 10**. No stub, no duplicate,
    nothing co-located — every geometric detector is structurally blind to it.
    - It is an **allow-list keyed on our own names**, not a snapshot equality test. Each
      region-level child must be declared either as corresponding to an MP area (`mp`) or as a
      deliberate divergence **with a reason** (`extra`). So a legitimate restructure is
      recorded in the same commit, instead of fighting a diff that fires on every change —
      which is how a snapshot baseline ends up regenerated blindly until it asserts nothing.
    - It fails on a **stale** entry too: a declared name that is no longer a child means the
      file describes a tree that has moved on. Same rule as `check:field-renders`' `KNOWN` map.
    - Route counts are deliberately **not** recorded — they move whenever anyone adds a climb
      on either side, so pinning them would guarantee a stale file. Names are the durable claim.
    - WA only, and it **says it skipped** for any other scope rather than passing silently.
      `--inject=shapeblind` covers the fail-closed case: if no declaration matches any live
      child, it reports that the reference is not describing this tree.
  - **Three further detectors were written, measured, and deliberately not shipped** — the
    reasons are recorded at the bottom of the script so nobody re-derives them. Sibling name
    containment (the `0119` shape) gave 8 WA hits and **0 real**: "Central Olympic Mountains"
    vs "North-Central Olympic Mountains", "Chelan" vs "Sawtooth / Lake Chelan" and "West Face"
    vs "North West Face" are all correct, so legitimate sibling naming is not separable from
    the defect by name alone. Flat-leaves-beside-containers (the Olympics shape) gave 29 and
    **0 real** — North Cascades Core, Washington Pass and Snoqualmie Pass Area are all
    deliberate, which is exactly why D5 has to consult an external reference. Identical
    sibling names gave **0 catalog-wide**, i.e. dead code. *Measure a detector's precision
    before shipping it, not after.*
- **`check:dead-flag-gates`** finds UI that can never render because the only thing feeding
  it is a constant seeded from a permanently-false flag. `DEMO_FILLERS` is an unconditional
  `false`, and #704/#707 found **three** surfaces gated on such a constant with no other
  writer: the Year in Climbing modal (its one opener read `MY_CLIMBS.length`), climb
  anniversaries (`_anniv` mapped over `MY_CLIMBS`), and the Local Legend badge. None looked
  like a bug — each sat beside live code that worked, so the screen was fine and the feature
  simply never happened. Gated by `npm run build`.
  - The distinction it encodes: five **other** constants on the same flag are healthy
    because every consumer is **additive** — `createdGroups.concat(GROUPS)`,
    `useState(COMMENTS)`, `CLIMBERS.concat(FILLER_CLIMBERS)`. The question is never "is this
    constant empty?" but **"is there another writer?"**
  - Comments and string contents are blanked in **one stateful pass**, not by regex, and
    that is not fussiness: stripping comments first *ate real code* (seed prose contains
    `//`, so the rest of a dense line vanished) and `MY_CLIMBS` and `GROUPS` dropped out of
    the analysis entirely — the check then reported "every one read additively" having never
    seen the two constants it existed for. Offsets are preserved so line numbers stay true.
  - It fails closed when a source file cannot be read. An earlier draft printed **ok** while
    having loaded nothing at all.
  - Injection-tested: reverting each of the three dead gates fails the run and names the
    line; restoring makes it green.

- **`check:fire`** enforces the honesty invariants of the wildfire surfaces (`lib/fire.js`,
  `lib/FireMap.jsx`, `lib/FireNearRoute.jsx`). It exists because those screens were each
  verified by hand in a browser against live federal services, and every one of those runs
  was throwaway — while what they proved was not *rendering* (`check:ui`/`check:zero` cover
  that) but a set of rules about what the screens may **claim**. Six of those rules had
  already been broken at least once, and a wildfire screen is the worst place in the app to
  quietly re-break one. Static — no browser, no dev server, and no calls to NIFC or NOAA —
  so it sits in `npm run build`, cannot flake, and does not hammer a public federal service
  on every commit.
  - What it locks down, each a shipped defect: **`uDistMi` used as a boolean** (it is a
    *formatter*, so the branch is always truthy and every metric user saw "mi" — invisible
    to `check:dead-props` and `check:refs`, since the prop is both read and bound, and
    imperial is the default); **`resultRecordCount` with no `orderByFields`** (the server
    returns an arbitrary OBJECTID slice while the UI says "showing the largest", and
    truncation is the *normal* case on the default viewport); **`onset` fetched and dropped**
    (a Red Flag Warning starting tomorrow rendered as current danger — 15 of 48 live products
    had a future onset); **`where: "1=1"` on the perimeters query** (prescribed burns drawing
    as wildfires, dormant out of burn season); **`Date.parse(z.ends || 0)`** (stringifies null
    to `"0"`, parses as the year 2000, so a product with *no* end time outranked every real one
    and became the headline); and **`placeholderData` on the per-route query** (the key is the
    route's coordinate, so it would print the previous route's fires under this route's heading).
  - It also asserts the two caveats are still on screen — there is **no national closures API**,
    so both surfaces must say so, and the per-route panel must say its distances are to the
    fire's *reported point of origin* (a 138,000-acre fire is ~24km across, so its edge can be
    far closer than that number).
  - **An empty result and a failed read are checked by source ORDER, not proximity**: an error
    branch and a `.data` read must both precede the "No active wildfires" claim. A first draft
    used "look at the preceding 600 characters" and reported the route panel's real gate —
    early returns 40 lines up — as missing.
  - Injection-tested, 13/13, each naming its own defect. **Two started as false passes and both
    were scope mistakes rather than missing rules**: the `body.error` check looked for `throw`
    within 200 characters and found the *next statement's* throw, and the `zoneInEffect` check
    only asked whether the name appeared in the file, so neutering the draw while leaving the
    in-effect/upcoming split intact kept it green. Presence is not use, and proximity is not
    scope — the `injection logged, counter didn't move` shape again.
  - Writing it found a live gap nobody had noticed: the **fire-weather query was the one capped
    request still going out unordered**. Size is meaningless for a weather zone, but
    "which of these ends first" is exactly what you want to keep, so it now orders `ends ASC`.
  - It also reads `RouteDetail.jsx`, for **reachability only**. The first version had the same
    hole one level up: it asserted a great deal about the panel's contents and nothing about
    whether the panel was *mounted*. Measured rather than assumed — neutering the mount left it
    green, which is the `descent_text` shape (populated on 1,021 routes, rendered on none).
    Since **#769** the placement is two mutually exclusive mounts (`{fireEl}` on Safety;
    `{showSafety?null:fireEl}` on Overview) because `showSafety` is **content-gated** — a bare
    crag route is offered no Safety tab at all. So *neither* is a reachable state and would be
    #655 again, and *both* would double-render a red hazard box; the guard pins exactly one.
    That block reads **raw** source, because the discriminator is a string literal
    (`tab==="safety"`) and the blanker wipes string contents, collapsing every branch to
    `tab===""` — the first run failed with "gone blind" for precisely that reason.

**When is a screen finished rendering?** Every browser guard has to answer that before it
reads the DOM, and `scripts/lib/render-settle.mjs` is the single answer they share
(`check:ui`, `check:zero`, `check:signed-in`). It settles on the text having **stopped
changing** — `stable` consecutive identical samples, with digits masked so the ASPECT & SUN
clock and a `CountUp` do not prevent settling — rather than on spotting a spinner.
  - The three guards previously each decided this by hand, and two decided it wrong. They
    polled for the literal strings `Loading climbs` and `Loading…`, which are **2 of the 13
    user-visible spinners in the app** — `Loading dashboard…`, `Loading forecast…`,
    `Loading topo photos…` and eight more were invisible to them. Worse, nothing waited at
    all for a screen that was merely *slow* rather than spinning.
  - That was not theoretical. `check:signed-in` read the Inbox as **`No friend chats yet` on
    an account that has a friend**, intermittently — measured at 48/117/48/117 chars over
    four runs, passing every time. A guard whose whole purpose is real data under a uuid was
    sometimes asserting against the empty state, and the `undefined`/`NaN` scan is only as
    good as the completeness of the text it scans. Now 48 four runs out of four.
    - **48 is the healthy number and 117 is the broken one** — the counts run backwards from
      the intuition, so check which is which before re-investigating. Populated is
      `← Back / Messages / Friends / Crews / START A CHAT / Robin`, just a name. The EMPTY
      state is longer because it carries explanatory copy: `No friend chats yet` plus
      "Message a partner from their profile and your chats will live here." Read
      `--dump`'s text, never the char count, when deciding whether a screen has data.
  - **Deciding from motion, not vocabulary, is the point.** Widening the regex to every "…"
    verb is wrong: `Analyzing…` is a *terminal* crew-readiness state, and `Working…` and
    `Downloading…` are button labels gated on `busy` — a guard waiting for those to clear
    would burn its timeout on a finished screen. `SPINNER_RE` survives only to label a short
    screen "still fetching" rather than "blank", where a miss costs a clear message, not a
    verdict.
  - `spinnerCoverage()` is deliberately modest about what it proves: it **cannot** prove
    coverage of a future spinner worded `Fetching photos…` (it searches for `Loading`, so
    testing those hits against a `Loading` pattern would be circular). It proves `SPINNER_RE`
    has not been *narrowed* until it matches nothing, and that the scan read some files at
    all. Injection-tested: narrowing it to `/\bLoading\b\s/` fails `check:ui` naming
    `"Loading…"`.

**Did the guard actually read the app?** Every static guard has to answer that before it
prints `ok`, and until 2026-08-09 none of them asked. `scripts/lib/guard-sources.mjs` is the
shared answer, used by the nine guards that scan source: `appSources()` for the ones that
name their inputs, `assertCovered()` for the ones that walk the tree.
  - **#547 is the case on record**, and the point is that its *fix* preserved the failure.
    The three-way split (#497/#508) moved most of the app into `ClimbMatchCore.jsx` and
    `RouteDetail.jsx` while `check:refs`/`check:hooks` still named only the entry files, so
    for a week the guard that exists to stop production blank screens read **24% of the app**.
    The repair added the names and then filtered the list with
    `.filter(f => fs.existsSync(...))` — so a renamed file still did not fail the guard, it
    dropped out of the list and the run went green on what was left. A missing required
    source is now **fatal**, never a quietly shorter list.
  - Walking the tree is the safer design and every newer guard does it, but it fails open in
    the other direction: a `SKIP` list that grows, a moved root, or an extension filter that
    stops matching yields `[]`, and every "no findings" check then passes **vacuously**.
  - `check:writes` had a second, closer instance. Its write vocabulary is derived at runtime
    from `export async function <name>` in `lib/db.js` — good design, because a new write is
    covered without editing the guard — but every check begins "is this a known write?", so an
    **empty** set makes each one return early. Measured, not argued: with the vocabulary
    emptied it printed `ok — no write failure is swallowed` and exited **0**. Only a style
    change in `db.js` (to `export const x = async () =>`) is needed to cause that.
  - Same family as `check:dead-flag-gates` printing **ok** having loaded no files, and
    `check:overlay-scroll`'s anchor-lost case exiting 0 having verified nothing: a guard you
    believe you have and do not.
  - Injection-tested: adding a bogus name to `REQUIRED` fails **all nine** guards, each naming
    the missing file and its own file count; breaking the `db.js` vocabulary regex fails
    `check:writes`. The file counts differ legitimately (15 for the `.jsx`-only walkers, 65 for
    `check:zindex`) because the guards have different `SKIP` sets — do not "normalise" them.

**Can the database even answer, before a guard spends half an hour finding out?**
`scripts/lib/db-preflight.mjs` asks once, up front, and is used by `check:ui`, `check:zero`
and `check:overflow` (#865). `check:field-renders` answers the same question its own way,
per column.
  - **The failure it exists for.** When Supabase went unreachable on 2026-08-13,
    `check:overflow` was **cancelled at its 25-minute job wall** having walked 6 tabs, 6 route
    sub-tabs and **29 of 53 overlays** — producing no diagnosis at all. A cancelled job, no
    failure message, and no way for the next author to tell an outage from their own
    regression. It was never *stuck*: these guards decide a screen is done by waiting for its
    text to stop changing (`render-settle.mjs`), and with no data arriving **nothing ever
    settles**, so every screen burns its full 45s timeout. 53 overlays at 45s is ~40 minutes
    on its own — fifty futile waits at full price.
  - Measured, before → after: `check:overflow` 25m16s cancelled → **31s**; `check:ui` 6m6s →
    **38s**; `check:zero` 6m34s → **40s**, all naming the database.
  - **Wired into three guards, NOT all of them, and the restraint is the point.**
    `check:overlay-scroll` (2m59s) and `check:a11y-badges` (6m35s) both **passed** during the
    same total outage: their verdicts are about layout and announced names and do not need
    catalog data on screen. A preflight there would convert honest passes into false failures.
    Only a guard whose assertions need the data gets one — `check:ui` opens a DB route **by
    name**, and `check:zero` asserts no screen is still loading.
  - **What each of those printed instead, which is why the message matters.** `check:ui` said
    `could not choose a country — "United States" was not among the options`, which reads as a
    broken area picker. `check:zero` said `2 problem(s) a brand-new account would see: still
    showing a loading state after 45s` — the symptom honest, the attribution not: no
    brand-new account would see that, the database was down.
  - Three exemptions, each deliberate: `--selftest-only` on `check:overflow` needs no data and
    the detector must stay provable while the DB is down; `--url` on `check:ui`, because local
    env describes the server that script **spawns** and says nothing about an app served
    elsewhere; and **no DB configured returns "skipped", not a failure**, so seed-mode runs in
    a fresh clone or a worktree with no dotfiles keep working.
  - **The tolerance was wrong first, and CI proved it within the hour.** At 10s × 2 it
    **false-aborted** the moment the project came back — `check:overflow` gave up at 37s while
    `check:zero`, same commit and minutes apart, got its answer and passed. That is the one
    outcome this must never produce, since the whole job is telling dead from slow, and people
    would learn to re-run it blindly. Measured immediately after recovery:
    `db preflight: ok (7913ms)`. Warm is 554ms and cold 2.7s, so the typical case was never
    the problem — a project that has just come back has empty caches. Now **3 attempts at 20s
    with backoff**, ~65s worst case before abandoning. The asymmetry is the reasoning: being
    slow to declare an outage costs a minute, declaring one wrongly costs a red job somebody
    has to investigate.
  - It fails **closed**, and it claims nothing about rendering — only "could the data have
    arrived at all".

**Does anything check `main` itself?** Now, yes — and until 2026-08-10 nothing did. Every
green tick this repo collects is earned on a **pull request**, and a `pull_request` run
tests `merge(head, base)` as base stood **when that run started**. So a PR that went green
an hour ago is a statement about an hour-old main, and two PRs that are each green can
still break main between them.
  - **Not hypothetical, twice over.** #728 and #727 merged three seconds apart, both green,
    and main stopped building — every deploy blocked until #737. `check:migration-claims`
    now catches that one collision by asking about open PRs; it says nothing about the
    general case. The general case had no guard at all, because until now **no browser
    guard had ever run against main**: `render-guards.yml` and `zero-state.yml` were
    `pull_request`-only, so `check:ui`, `check:zero`, `check:overlay-scroll`,
    `check:a11y-badges`, `check:field-renders` and `check:anniversary` had literally never
    been asked about the branch that ships.
  - The **static** gates were already covered and stay as they are: `deploy.yml` runs
    `npm run build` on push to main, so a `check:refs` regression fails the deploy loudly.
    It is only the rendered-screen half that main never saw.
  - Both workflows now also trigger on `push: [main, master]`. The failure they prevent is
    not "main is broken" but **"main is broken and the next PR author gets the red"** —
    which is the shape `check:drift` exists for and the one #724 actually took.
  - **`cancel-in-progress` had to become conditional**, and this is the trap: the group
    falls back to `github.ref`, so on push every merge would land in one group and cancel
    the one before it — #616 exactly, where merges killed each other's deploys and
    production sat eight commits behind for five hours. Here it would be quieter and worse:
    a cancelled run reports **no failure**, so the merge that was never checked would read
    as checked. It is now
    `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` — supersede PR runs,
    never a main run.
  - Measured before shipping, since a preventive guard should not also be a bug report: all
    six were green on `8401e05` (`check:ui` 20 screens, `check:zero`, `check:overlay-scroll`
    47 regions across 44 overlays, `check:a11y-badges` 116 controls, `check:field-renders`,
    `check:anniversary`). So this closes a hole rather than fixing a live break.

Landmark assertions in `check:ui` match whole lines, never substrings — a
substring test passes `"RACK"` on the strength of `"ROUTE TRACK"`, which is exactly
how a live section gets deleted while the check stays green.

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

The rule generalises: **before writing a researched string into an existing column, look at
where that column renders.** `npm run check:field-renders` will tell you; a column that
reaches a header, a pill, a chip or a table cell takes a value, and its explanation belongs
in the prose column beside it.
