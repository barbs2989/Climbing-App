# Browser walks

Guards that drive the real app in Chrome: the screen walks (ui, zero, signed-in), the two-account guards, overlay discovery and scrolling, accessibility names and selected state, overflow, anniversary.

Part of the guard notes — see [README.md](README.md) for the full index.

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
    has the seeded demo (a crew — `events` and the club `GROUPS` sit behind `DEMO_FILLERS`,
    which was permanently FALSE when this was written and is **TRUE since #1566**, so those
    payloads resolve now where they used to be skipped), and `check:signed-in` has a real
    account owning a crew and a DB group. The opener records `window.__overlayNoPayload` and the guards report
    *skipped* rather than *mounted nothing*. A modal whose payload **did** resolve still has
    to render, so this cannot excuse a broken one.
  - **`postMenuFor` and `reactPickerFor` were exempt as unreachable, and were not.** They
    render *inside* the `openGroupId` view and the `posts` they read is a local of that IIFE —
    but every piece of that screen is App state, so a payload can build it. A `prep` statement
    injects a group into `createdGroups` (`ownerId: 0` satisfies the view's non-`_db`
    `isCreator` branch), gives it a post via `setGroupPosts`, opens it with `setOpenGroupId`,
    and only then sets the modal's own id. Both now mount — measured at 2,006 and 2,190 chars
    by `check:zero`, which fails anything that adds nothing.
    - Nothing here is DB-backed: group posts are client state, so **no fixture could seed
      them**. A synthetic payload is the only way to reach these two in any of the walks.
    - The lesson is the exemption, not the fix: "no App-scope expression can open them" was
      true of the modal's *own* setter and false of the screen it lives in. An exemption is a
      claim about reachability, and this one had not been tested.
  - **The hole it used to print as a note is CLOSED**, and the note is why it got closed: the
    opener injects into `App`, so no `?z=` could reach an overlay whose state lives in
    `RouteDetail.jsx`, and those were walked only insofar as `check:ui` happens to open a route.
    `routeDetailTransform()` now injects a second opener into RouteDetail's own component, so
    they are opened directly like any other. All **54** (51 in App, 3 in RouteDetail) are
    reachable. *A known quantity beats an absence nobody can see* — the count sat in the output
    as a `note` until somebody fixed it, which is the argument for printing what you cannot yet
    do rather than omitting it.
  - **The count went five to three because DISCOVERY changed, not because overlays were
    removed.** The five came from the old name shape (`[xOpen,setX]=useState(false)`); asking
    instead what a state actually *renders* dropped two that were never modals. Do not read the
    smaller number as a regression.
  - **`shareOpen` exists in BOTH files, and that collision silently un-walked the App one.**
    Overlay names are keys, so the second file's `shareOpen` overwrote the first and App's share
    sheet stopped being opened while the summary still counted one. RouteDetail's states are
    namespaced **`rd:`** for that reason. Any future second component needs the same treatment —
    a bare name is not unique across files.
  - Every vite config that calls `buildOpener` **must** also call `routeDetailTransform`, and the
    guard asserts it (**11** today — the guard DISCOVERS them with a readdir, so this number is
    a fact about the tree rather than a list to maintain; it read 5 for months after the tree had
    moved on). Wiring that a config can forget is wiring that one eventually
    will: the configs already drifted once on which files they transformed.
    - **ARE ANY OF THOSE ANCHORS ALREADY ROTTED? NO — 17 anchors across 12 files, 0 LOST, 0
      AMBIGUOUS** (`scripts/oneoff/measure-config-anchor-rot.mjs`, 2026-09-09). Worth asking
      because **five configs are exercised by no wired guard at all** — `camping-expand`,
      `derived-trailhead`, `group-trust`, `metric-units`, `policy-notice` — so a rotted anchor
      there throws only when somebody remembers to run the probe, and this file already records
      the scaffold as a STRING no static gate reads. It needs **no browser**: whether an anchor
      still occurs in the source is deterministic, so it can be answered honestly on a box too
      loaded for a walk to be evidence.
    - **THE CONTROLS ARE THE RESULT, NOT THE HEADLINE.** Seven of the twelve are exercised by a
      guard that runs in CI, and the run **fails closed** unless all nine of their anchors resolve
      **exactly once** — because "0 LOST" is precisely what a broken scan prints. It earned that
      four times over: the first four versions each printed a plausible number while being wrong,
      and every failure is a different way a text scan lies about the source it is reading.
      **(1)** Bounding a declaration at the first raw `;` cuts INSIDE the anchor — an anchor is a
      fragment of JavaScript — so two CONTROL configs read as UNPARSED and journey's single-quoted
      anchor yielded the `"true"` nested within it. **(2)** A COMMENT inside `zero-state`'s
      `ANCHORS` array contributes literals of its own, which shifted the from/to parity so the TO
      halves — replacements, correctly absent from the app — were counted and reported LOST.
      **(3)** Counting across every app file answers the wrong question: `code.split(ANCHOR)` runs
      on the ONE file the transform admits, so it is scoped to the files the config's own
      `id.endsWith` names. **(4)** Discovery by NAME missed `policy-notice`, which calls its anchor
      **`GATE`** — the too-narrow-proxy failure a third time, so anchors are discovered by **use**
      (`code.split`/`code.replace` is handed it) as well as by name, the argument this guard
      already makes for discovering overlays by behaviour rather than by a name shape.
    - Proven **non-vacuous in both directions** rather than trusted: a fixture config carrying a
      deliberately rotted anchor is reported LOST while every control stays clean, and one that
      splits the app with no findable declaration **fails as a hole in the instrument** rather than
      printing a reassuring *"rewrites nothing"* — which is exactly how `GATE` went unseen twice.
    - **Not promoted to a build gate.** It answers a question about `scripts/oneoff/` probes rather
      than about the app, every config already fails loudly with ANCHOR LOST the moment it runs,
      and a class with zero findings is the detector this repo keeps declining to build. Re-run it
      after any edit to the two dense app lines these anchors sit on.
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
  - **That `--url` walk now runs on a SCHEDULE** (`.github/workflows/live-site-check.yml`,
    every 6h + `workflow_dispatch`), closing the gap between "the code passes on a runner"
    and "the app people load works". Every other browser guard walks a dev server built from
    the checkout; `check:drift` asks about production but only compares **SHAs**, so it
    reports "production serves the current tip" while the served bundle is blank — a correct
    SHA and a broken app are identical from there. Between them sit the failures only
    production has: a bad base path, a lazy chunk that 404s off the Pages base, a stale
    service-worker precache, a build/runner env difference. The walk was possible for weeks
    and ran only when somebody remembered, which is the #724 lesson exactly.
    - It holds **no secrets**, and that is a property of `--url` rather than luck: with it
      `check:ui` spawns no dev server and skips `assertDbReachable` (local env describes a
      different deployment than the one being walked), so no Supabase credentials are needed.
    - The URL is read from the **Pages deployment** (`gh api repos/.../pages`), never
      hardcoded, so a repo rename cannot leave it walking a 404 and reporting whatever an
      error page renders. It fails closed if that lookup returns nothing rather than guessing.
    - `cancel-in-progress: true` is right **here and nowhere near a push-to-main guard**: a
      superseded production walk asks about a site that has since been redeployed, so it has
      no value. `check:ci-cancel` governs the push-triggered workflows; this is not one.
  - **It also asserts that two screens counting the SAME list agree** (`scripts/lib/screen-counts.mjs`),
    on the text it has already captured, so it costs no extra walk. #1203 is why: the Profile said
    *"My objectives · 3 active"* while the Logbook said *"4 climbs to go"* about one list, because the
    Profile had forked the app's completion test and counted a route you TURNED AROUND on as done.
    Every assertion here passed — each number was well-formed, each screen rendered, nothing was
    `NaN`. Nobody was comparing them.
    - **The relations are NOT all equality, and an equality would have gone red on correct
      behaviour.** Home's *"N routes"* is the TOTAL; *"N climbs to go"* and *"N active"* are
      total-minus-completed. They coincide today only because nothing in the seed demo is completed,
      so the rule is `to go == active` and `routes >= active` — the day a climber ticks an objective,
      a three-way equality fires on working code.
    - **Scope a read by SECTION, never by a character window.** The Logbook renders a *"1 climb to
      go"* badge per CUSTOM LIST, so an unanchored read compares a different list. A `{0,400}` window
      was tried and silently stopped finding the badge on the one snapshot carrying the defect —
      #1181's leaked comment sits between the heading and the number and pushes it out of range.
    - Fails **closed**: a heading that moved, a screen the walk never captured, or a relation with a
      missing side is reported as `NOT COMPARED`, never as agreement. Deleting the Profile from a
      snapshot made an early version report *nothing*, because the group still had two readable
      counts and the pair quietly had an undefined half.
    - Case-tested 7/7 against REAL captures, no browser needed
      (`scripts/oneoff/inject-screen-count-cases.mjs`). Case 2 is not synthetic — it is the actual
      pre-#1203 recording, the standard `check:rls` case 1 is held to.
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
- **`check:zero`** walks all six tabs and every overlay the app declares (49 today) as a
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
    seed app. Not in `build` (browser automation). It **runs in CI** via `render-guards.yml`.
  - **It went red on main the day it was wired in (#919), was unwired (#935), and the red was
    RIGHT** — which is the most useful thing in this entry. The one failing assertion,
    `modal:inboxOpen: added nothing on any of 6 tabs`, was reporting a genuine defect: #890 had
    left the Calendar's JSX fragment unclosed, so `;if(inboxOpen)return ` became **text inside
    that fragment** and the Messages screen could not be opened at all. Confirmed with the
    app's own button, not just the `?z=` opener. Fixed in #941; re-wired in #947 with a local
    run green on main first (`modal:inboxOpen: 48 chars`, 59 screens, 119 assertions).
    - **48 is the healthy number and 117 is the broken one**, as the settle note below already
      records: the populated Inbox is just `← Back / Messages / Friends / Crews / START A CHAT
      / Robin`, while the EMPTY state is longer because it carries explanatory copy.
    - Two wrong hypotheses were shipped before the right one, and both are worth not
      re-deriving. The **durable accounts colliding between concurrent CI runs** — dead, it
      failed alone and failed on main. And **"the Inbox's empty-state copy changed, so the
      assertion is stale"** — the copy really had changed, which made a fixture artifact look
      likely; the modal was simply unreachable. A guard reporting one assertion against 117
      passing ones reads like a flake and was not.
    - So the rule this pays for: **a lone failing assertion in a guard whose whole purpose is
      real data under a uuid is evidence, not noise.** Two sibling guards that need no auth
      (`check:overlay-scroll`, `check:a11y-badges`) were reporting `inboxOpen` as never
      mounting the entire time. When a guard that needs secrets looks flaky, check whether one
      that does not already sees the same thing.
  - **It has two fixture modes, and which one runs says where it is.** Locally it creates a
    pair per run with the **service key** and destroys them after. In CI it signs in to two
    **durable** accounts with the **anon key only** — CI must never hold the service key, and
    that requirement is exactly why this guard sat outside CI and went **~40 merged commits
    without running**. "Hand-run" means "not run" on a loaded machine. The privileged half now
    happens once, locally: `scripts/oneoff/create-ci-test-accounts.mjs` then
    `seed-ci-test-fixture.mjs`.
  - The durable pair is only acceptable because both profiles are **`discoverable=false`**, so
    they cannot appear in partner browse — the objection against a permanent QA account.
    `scripts/lib/durable-fixture.mjs` **re-asserts that on every run**, not just at setup: a later
    migration or column-default change could flip it.
  - **AND THE TWO FIXTURE MODES DESCRIBED DIFFERENT ACCOUNTS, WHICH IS HOW A CI-ONLY RED ARRIVES
    ON A CHANGE THAT IS GREEN LOCALLY.** `ui-fixture.mjs` patches the per-run pair into an
    established shape — a location, `disciplines`, a grade — and the durable pair had **never**
    been given one, so `profiles.disciplines` was empty on the very accounts every guard here
    calls ESTABLISHED. Nothing read that column until the onboarding sheet keyed on it (see
    `check:onboarding-reach`), and then the sheet auto-opened over **every screen of every CI
    walk**: `check:outage` measured a uniform **+633 characters** on all seven tabs and both Crew
    sub-views, against **0** on the three route-page screens. Being an overlay it also swallowed
    the Logbook's *Areas* sub-tab click, so the HEALTHY capture was the default Logbook view while
    the FAILING one — no sheet, because a failed profile read refuses to onboard — was the real
    Areas view, and rule 2 correctly reported as *introduced* two empty states that are on screen
    in **both** runs. `durable-fixture.mjs` re-asserts the onboarded shape on every run now, on the
    account's own JWT, idempotently, exactly as the policy stamp above it does.
    - **The local run cannot see it, by construction**, which is the part to carry forward: these
      two guards use per-run accounts locally and the durable pair in CI, so an account PROPERTY
      that only one mode sets is a permanent CI/local disagreement waiting for the first thing to
      read it. When adding a fixture property, ask which mode gets it.
    - **AND `check:outage`'s LANDING CHECK FOR THAT SUB-TAB WAS VACUOUS, so the red named the wrong
      screen. FIXED — the landmark is `/saved searches|trip pack/i` now.** It led with `saved
      areas`, and the Logbook's **header** — which sits ABOVE the sub-tab bar and therefore renders
      on all four sub-tabs — reads *"Your objectives, completed climbs, challenges and saved areas
      — all in one place."* One alternative matching is enough, so a capture that never left the
      default view passed the landing check: precisely the outcome the comment directly above that
      landmark warns against. Measured, not inferred — healthy `Logbook:Areas` came back
      **byte-identical in length to healthy `Logbook`** on two consecutive runs.
      - **THE RECORDED CAUSE WAS WRONG, AND THE CORRECTION IS THE USEFUL HALF.** This entry used to
        blame *"the case-insensitivity added to it"*. It is not that: the HEADINGS are uppercased in
        CSS, but the **header prose is not**, and it is written lowercase in the source — so a
        case-SENSITIVE `/saved areas/` matches it just as well. **The vacuity predates the `/i` flag
        and would have survived removing it**, which is why the repair had to be the TERM rather
        than the flag. A plausible mechanism nobody measured is a hypothesis, and this one would
        have sent the next reader to delete a flag that is doing real work — `innerText` returns
        `SAVED SEARCHES` for the card heading, so without `/i` the *new* landmark would miss.
      - **`offline library` appeared ZERO times anywhere in the app**, so a third of the alternation
        had never matched once and could only ever report a false miss.
      - Both survivors are `<MeH>` headings rendered **unconditionally** inside the
        `logbookTab==="lists"` region, so neither moves with the data or with the outage — which is
        the rule the comment states and the old landmark broke. `saved searches` is unique
        app-wide; `trip pack` also heads two cards on the **Profile** tab, which a Logbook capture
        cannot contain, and is kept as a second landmark so a single rename fails CLOSED rather
        than silently.
      - Proven by **`check:outage-landmark`**, which is **a BUILD GATE rather than a probe** on the
        two grounds `check:waypoint-dedupe` records for a class of one. *Anti-revert*: the repair
        changes a REGEX and **no identifier**, so `audit:silent-reverts` is blind to it by its own
        closing caveat and a stale-base squash could restore the vacuous landmark with every other
        guard green. *Class growth*: `check:outage` has other landing checks and the rule
        generalises — **a landmark must not appear outside the view it identifies**. It is in the
        chain rather than in `scripts/oneoff/` because this file already records that an
        extracted-from-source probe with a fail-closed anchor **is** the behaviour-revert detector
        for exactly this shape, and *"is worth nothing in `scripts/oneoff/`, which nothing runs"*.
        **No browser and no database**,
        because which region of the source a string lives in is answerable statically and therefore
        on a box too loaded for a walk to be evidence. It **lifts the landmark out of the guard**
        with `ANCHOR LOST` rather than retyping it (a copy would agree with itself whatever the
        guard did, which is the entire question), and it is proven non-vacuous the only way that
        counts: against the old landmark it reports **5 failures**, one per defect. Its floors are
        **measured, not guessed** — a first draft put the Logbook region at 20,000 characters and
        failed on a correct carve, because that tab renders most of its content through components
        and its own JSX is ~7.7k. The floor that actually matters is on **rest-of-Logbook**: were
        the two regions ever to carve to the same span, every *"appears nowhere else"* assertion
        would pass **vacuously**.
  - **That rule was applied to the ACCOUNTS and missed on what the accounts CREATE**, which is
    the transferable half. All three fixture paths made their group `visibility:"public"`, and
    `groups read public or member` plus `useMyGroups()` — which selects **every** group with no
    filter, `order=created_at.desc` — put it at the **top** of every real climber's Groups tab.
    Measured 2026-08-19: the live project held two groups and **both were fixtures**, so that
    screen was 100% test data. All three now flip to private (#1015). *When you make a fixture
    invisible, ask what it creates, not only what it is.*
    - **Creating it private is refused — `42501`, RLS.** The live INSERT policy requires a group
      to *start* public; `0090_groups.sql` says only `with check (auth.uid() = created_by)` and
      no later insert policy exists in the migrations, so **the file and the live policy
      disagree**. Create public, then `PATCH`. The owner still sees it: `groups_add_owner` seats
      the creator, so `is_group_member` holds.
    - **The mate joins BEFORE the flip**, deliberately. `group_members`' insert policy carries no
      visibility clause *in the file* — and the file had just been shown wrong about the sibling
      table, so the join stays on the path already proven. Exposure is ~1s, not the ~4min walk.
    - **Crews are NOT affected**: `crews` RLS is `created_by = me OR I am a member`, with no
      public class at all. Checked rather than assumed.
  - **THE CREW HAD NO SWEEP, AND THE TABLE WITHOUT A BACKSTOP IS THE ONE WHOSE LEAKS YOU CAN
    SEE.** Measured 2026-08-26: the live project held **15 crews, 13 of them owned by `CI Fixture
    Mate`** — one per guard run from 16:06 to 19:41 on a single day, plus one from 2026-08-13.
    Groups looked clean over exactly the same period, and that was the **stale-group sweep** doing
    its job rather than teardown doing its job. A failed group delete is quietly repaired 45
    minutes later; a failed crew delete was forever.
    - **`sweepOrphans()` structurally cannot reach these.** It removes `@climbmatch-qa.invalid`
      ACCOUNTS and deletes what they created first — but the invite crew belongs to the **durable
      mate**, which must never be deleted. Precisely the reason the group sweep exists, one table
      over, and nobody carried it across when the invite crew was added.
    - Swept **as the mate**, who created them: the delete policy is `auth.uid() = created_by`
      (`0036`), and the owner is only an invited member. Age-gated at the same 45 minutes, since
      ungated it deletes the crew of a run already in flight.
    - **The selector is dry-run against live rows rather than reasoned about**
      (`scripts/oneoff/probe-stale-fixture-crew-sweep.mjs`), because the sweep only ever executes
      in CI — it needs the durable mate's session, and a local machine cannot sign in as the mate.
      That is exactly the situation where a sweep quietly matches the wrong rows. Measured: 10
      matched, 2 held back by the age gate, and the **permanent seeded crew** — owned by `CI
      Fixture Owner`, the one `check:signed-in` walks — correctly **not** matched. Over-matching
      here would delete real climbers' trip parties, which is far worse than the leak.
    - A sweep that finds rows and removes none now says so. *"found 11, removed 0"* and *"found
      0"* need opposite reactions and print identically if only one number is logged.
  - **`check:outage` THREW AWAY THE LEAK REPORT, which is why this went unseen.** `cleanup()`
    returns a list of what it could not remove; `check:signed-in` prints that list and exits 1,
    while `check:outage` called it for its side effect alone. So a teardown failure was
    undetectable from the outside and the thing that eventually found it was a hand count of live
    rows. It now reports and exits 1, and catches a throw rather than letting it replace the run's
    real verdict.
  - **`sweepOrphans()` is age-gated (45 min), and must stay so.** It deletes every
    `@climbmatch-qa.invalid` account and runs BEFORE each fixture, so ungated it deletes the
    accounts of a run already in flight — two runs were observed overlapping in this project on
    2026-08-19. The victim's rows simply stop existing, so its failure lands nowhere near the
    cause **and passes on re-run**, which is exactly how a real defect gets filed as a flake. 45
    minutes clears the 25-minute job wall, so a leak still has a bounded lifetime.
  - **The ACCOUNTS are durable; their DATA is not, and that distinction is load-bearing.** The
    accounts have to persist (CI holds no service key, and Supabase has no self-delete, so
    per-run *accounts* would leak forever). A shared *group* is a different matter: the walk
    opens group modals that mutate state, and the assertions it makes are precisely about that
    state. Two concurrent runs would therefore read each other's writes.
    - **This is defence in depth, NOT the fix for #969, and the difference matters.** #976 was
      merged claiming it was, and that claim was wrong. #969's `isCreator`/`isMod` failure was
      **identity hydration lagging a settled screen** — diagnosed and fixed separately. The
      tell rules the race out cleanly: of the five `Group:detail` assertions, `Owner` **passed**
      while `+ Mod` and `Make private` failed. `Owner` is a property of the member ROW; the
      other two are properties of **who is looking**. A concurrent run signed in as the same
      owner cannot strip that owner's own creator status. Two runs starting 61 seconds apart
      was correlation, and it was believed twice before the assertion detail settled it.
    - **CONFIRMED 2026-09-10, and the confirming artifact is a controlled same-commit PAIR.**
      #969's *"identity hydration lagging"* stood for months as a diagnosis nothing could
      reproduce. It is now executed rather than inferred: with `_profMap` (the
      `useProfilesByIds` result) still unresolved, `_asMember` returns null for **every** id, so
      the roster's fallbacks fire — your own row falls back to `ME`, whose `id` is **0 signed in
      or out**, and every other row to the `"A climber"` placeholder. That is one cause producing
      all four `Group:detail` symptoms at once: the creator labelled `Member`, no `MOD` badge,
      `+ Mod` and remove `✕` on **your own row**, and the whole `Moderators` strip gone (`mods`
      is `modIds.map(_asMember).filter(Boolean)` with **no** fallback, so an unresolved read
      empties it).
      - **THE OBJECTION THAT KEPT THIS OPEN WAS A FALSE PREMISE, and it was written into the
        fix's own comment.** That comment said the fallback fires *"by CONSTRUCTION … only when
        `mem` does NOT contain you"* — true of the APPEND path, where your row is **last**, and
        read as if it were the only path. It is not: an unresolved read misses your id too, so
        the fallback fires on a row that came out of `mem`, **in `mem` order**. The failing
        dump's owner row is FIRST, which is exactly what that path predicts and what the append
        path cannot produce. *When a comment says a branch fires "only when X", ask whether the
        thing it depends on can be empty for an unrelated reason.*
      - Proven by executing the app's own lifted `_roster` **and** `mods`
        (`scripts/oneoff/probe-group-self-row-is-not-only-the-append-path.mjs`, 9 assertions,
        with a resolved control so none of it passes vacuously), injection-tested **2/2**
        (`inject-group-self-row-non-append-cases.mjs`): reverting the fallback to bare `ME`
        reproduces the failing dump's signature **in the dump's row order**. The sibling probe
        is NOT superseded — it pins the append path, this one the unresolved-read path.
      - **`0178`'s `status` column is RULED OUT as the trigger**, which matters because this
        file's own pointer sent the next reader there. Two arguments: `add_group_creator_as_owner`
        is an **AFTER INSERT trigger in the same transaction**, so there is no window in which a
        group is visible without its owner row, and it inserts no status so it takes the
        `'active'` default; and `group_members` carries a `read own` policy
        (`auth.uid() = user_id`) that is unconditional on status, role and visibility, so the
        owner's own row cannot be filtered out of the owner's own read. Measured alongside, with
        four fixture groups caught **mid-run**: every group in the project has exactly one
        `active` owner row.
    - So each run **creates its own group**, named from `GITHUB_RUN_ID` (or pid+time locally),
      seats the mate in it, and **deletes it in teardown**. Groups are safe to make per-run
      because an owner can delete their own — measured: create 201, mate-joins 201,
      owner-deletes 200, row gone. Verified after a full local run: one group left in the
      project, the permanent seeded one, no per-run leak.
    - `check:signed-in` opens **`fixture.group.name`**, not a hardcoded string. A constant there
      is what made every run open the same group in the first place.
    - The mate **seats themselves** — a group owner cannot add a member (403). Seeding it any
      other way manufactures a state the app's own flow cannot reach.
    - Serialising the job with a `concurrency` group would also work, at the cost of queueing
      every PR behind one browser walk. Isolation is cheaper and does not hide a real race.
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
- **`check:message-delivery`** is the **first guard here that involves two people**. Every other
  browser guard signs in as at most one account and reads its own screens — `check:ui` walks the
  demo logged out, `check:zero` a new account with nothing, `check:signed-in` and `check:outage` a
  real account reading its OWN data — so **a fact written by a SECOND climber has been outside CI
  by construction**. That is not a hypothetical seam: it is where **#1497** came from, a vouch you
  had received reaching no screen and no number, with every gate green throughout.
  - **What it walks:** the mate sends a direct message under the mate's own JWT, through the same
    `users can send messages` policy (`auth.uid() = sender_id`) the app's `sendDirectMessage` uses;
    the owner then signs in and opens the inbox. It asserts the inbox does not claim to be empty,
    the sender is **identified**, the body is previewed, the thread opens, and the body renders in
    the words the sender wrote — 9 assertions.
  - **Never the service key.** It bypasses RLS, and *what a second REAL account can do* is the
    entire question; a service-key insert would manufacture a state the app's own flow may not
    reach. This is the rule `check:signed-in` already records from the other side, where seeding as
    the users found that RLS refuses an `accepted` connection written directly.
  - **IDENTIFIED, NOT NAMED, and getting that wrong is how this walk nearly asserted a defect as
    the contract.** The inbox renders the sender through `pubName()`, which falls back to the handle
    unless `showName` is set. An assertion on one specific form fails against a correct app, so it
    accepts **either** — and that is now MORE necessary than when it was written, not less, because
    which form appears is a per-climber choice.
    - **THIS BULLET USED TO SAY `profiles` HAS NO `show_name` COLUMN AND THAT NOTHING WRITES ONE.
      BOTH HALVES ARE FALSE**, and the correction matters because the sentence argued against a
      setting the app really has. `0175` added the column, the Settings switch persists to it, and
      `pubName` honours it. It also said the friends list and crew roster do not gate through
      `pubName` — they were unified on it once `0175` made the setting real.
    - **What replaced the inconsistency is a subtler one, fixed in #1619**: `useProfilesByIds`
      returned RAW postgrest rows, so `pubName` read `showName` against a `show_name` field and
      every consumer silently answered "no" — while `vouchRowsFrom`, which skipped `pubName`
      entirely, published the real name whatever the switch said. The hook maps `showName` and
      selects `username` now, additively.
    - The general lesson is the one this file records elsewhere as stale bookkeeping: **a claim
      about the schema is only true relative to a migration.** When one lands, the prose that
      reasoned from its absence has to move too.
  - It also asserts the sender did **not** degrade to `"Climber"`. `useProfilesByIds` has a
    different miss behaviour at every call site and this one is `{id, name:"Climber"}` — not a lie,
    and not a name either: a climber cannot tell which of their partners wrote to them.
  - **IT RUNS IN CI, AND THE ROUTE THERE IS THE ENTRY WORTH READING.** `messages` has select/insert/update policies in `0042` and **no DELETE policy at
    all**, so the teardown's DELETE is refused by RLS — and PostgREST answers a zero-row DELETE
    with **204**, which `res.ok` reads as success. Measured directly (insert → delete → re-read):
    HTTP 204, `res.ok` true, **row still there**. The guard printed *"removed the message: ok"* off
    that status and was reporting a success it did not have — *a 200 is not evidence the data
    changed*, which this file records for hand-written SQL and for `patchRow` and which arrived
    here in a third place. It reads the row back now and says plainly when it could not remove it.
  - **Locally that was harmless and in CI it would not have been.** The per-run accounts cascade;
    the durable CI pair is permanent, so **every run would have leaked a message into a live
    project forever** — the shape recorded under *"the table without a backstop is the one whose
    leaks you can see"*, where 13 crews accumulated one per run. And **unlike crews no sweep was
    possible**, because a sweep needs the same DELETE the policy refused. So the job was written,
    measured, and **pulled before it merged**.
  - **`0176` is what let it back in**, and it closes a gap that was never about testing: a climber
    could not delete a message they had sent *or received*, ever. The policy covers **both
    parties**, deliberately — a recipient of an unwanted message has the stronger claim to clear
    it, and they could already block the sender while being unable to remove what they wrote.
    Verified by insert → delete → re-read rather than by reading the SQL, which is how the absence
    was found in the first place. **The read-back in teardown stays** even now: a policy can be
    dropped again, and a status code cannot be trusted about rows.
  - **The concurrency work is what MADE it promotable, and it is why the promotion was safe.** Two
    `messages` rows coexist; every assertion holds with either or both present; teardown targets a
    single **id**, never a sender; and the body carries **`GITHUB_RUN_ID`** so a run asserts on
    **its own** message. Without that last part run A passes on run B's row — a **false pass in the
    exact window this guard watches**. It had all of that while it sat in `scripts/oneoff/`; the
    only missing piece was the ability to clean up, and `0176` supplied it.
  - **...AND ONE ASSERTION WAS NEVER IN THAT ENUMERATION, which is how a concurrency hole hid in
    the half of the guard that is ABOUT concurrency.** The three named above really are safe. The
    **thread-list preview** was a fourth, and a preview **cannot** be run-attributable: both runs
    send mate→owner, so there is **one thread**, and its preview shows only the **newest** message.
    A second run inserting between this run's insert and its assertion makes the run assert on its
    own `GITHUB_RUN_ID` and see the other's body.
    - **Observed rather than theorised**: on #1595 `render-guards` started **06:06:09** on a branch
      and **06:12:23** on main, and this was the **only one of nine** assertions to fail, with main
      green on that workflow either side. A re-run went green.
    - The fix keeps both properties by splitting them. `BODY_PROSE` is the shared, distinctive
      sentence and the **preview** asserts that — delivery is still provable before anything is
      opened. This run's own tag stays pinned by the **OPEN THREAD**, which lists *every* message,
      so `thread.includes(BODY)` was concurrency-safe all along.
    - **Loosening an assertion is only correct if it can still FAIL**, so that is what is tested:
      `scripts/oneoff/probe-message-preview-concurrency.mjs` lifts the strings from source with
      `ANCHOR LOST` and checks the raced inbox passes **and** that an empty inbox and an unrelated
      conversation still fail. A change that made the assertion unfailable would be worse than the
      flake it cures.
    - **The lesson is the enumeration.** The header listed what holds under concurrency and the
      code had one more assertion than the list. When adding one here, check it against that list
      rather than assuming the header covers it.
  - **THE PRODUCT QUESTION WAS ANSWERED, AND NOT FOR THE TEST'S SAKE — which is the distinction
    this bullet used to be about.** It read *"a climber cannot delete a message they sent or
    received, ever … adding a policy to make a test tidy would be the wrong reason to answer it"*,
    and that stayed on the page after `0176` shipped the policy — so two bullets apart this file
    said the capability exists and that it does not. The principle survives the correction:
    `0176`'s own header opens *"a climber could not delete a message they sent or received.
    Ever"* and closes a **user-facing** gap, with the test tidiness a by-product. It covers both
    parties rather than sender-only unsend, because a recipient of an unwanted message has the
    stronger claim to clear it and could already block the sender while being unable to remove
    what they wrote. What it does **not** do is hide a deletion from the other party: a row is a
    row, and a per-side unsend needs state this table does not have.
  - **The leak is now OBSERVABLE rather than merely fixed.** Nothing in the repo can see teardown
    being refused again — the guard prints *"removed the message: ok"* either way, which is exactly
    how the original defect hid — so `messages` is in
    `scripts/oneoff/probe-latent-claims-anon-vs-service.mjs`, where a **rising row count is the
    regression**. Read it with the **service key**: `messages`' select policy is sender-or-recipient,
    so an anon count returns 0 whatever the table holds. Measured after the promotion: **0**.
  - **Its two siblings are NOT safe and stay in `scripts/oneoff/`**, each for its own reason:
    `vouches` is `UNIQUE(from_id, to_id)`, so a second run's insert is refused with a 409 *and*
    teardown removes the single shared row under the first run — an upsert fixes only the first
    half; and the logged-climb walk asserts `fresh.length === 1`, which a concurrent row breaks.
  - **A CLAIM THAT KEPT THIS OUT OF CI FOR A WEEK WAS FALSE, and it was mine.** Three merged PRs
    said these walks were local-only because *"the mate's password is not exposed to CI"*.
    `durable-fixture.mjs` signs in **as the mate** with `CI_TEST_MATE_PASSWORD` and holds
    `mateSession` throughout — it uses it to sweep stale crews — and simply never **returned** it.
    The blocker was a missing property on a return object, not a missing credential. *Read what a
    module does, not only what it hands back.*
  - **Promotion changed its DEPTH**, the trap `check:pitch-discount` records: it kept `../..` from
    `scripts/oneoff/` and would have resolved the wrong tree. `ROOT` is one level now.
  - **Length is worthless here and every assertion is on text.** The populated inbox is ~48
    characters and the EMPTY one ~117, because the empty state carries the explanatory copy — the
    numbers run backwards from the intuition, which `check:signed-in`'s entry already records.
- **`check:block-guarantees`** runs the three block promises **as two real climbers**. The
  Blocked-climbers screen says a blocked climber *"can't message you, add you to a crew, or open
  your profile from their account"*, and three migrations implement that — **and all three say in
  their own text that the behaviour was never exercised.** `0095` is explicit: *"BEHAVIOUR CANNOT
  BE PROVEN WITH ONE ACCOUNT … Until that is run, this is reviewed and reasoned, NOT verified."*
  That is a stated limitation, and this repo reads one as a worklist. **The machinery already
  existed** — `scripts/lib/ui-fixture.mjs` creates two real accounts for `check:signed-in` — it had
  simply never been pointed at these. **Result: all three hold.**
  - **WHY ONE ACCOUNT CANNOT ANSWER IT, from `0095`'s own header, and it is the most transferable
    thing here.** An RLS subquery is evaluated as the **calling** role, and `0088` restricts reading
    `blocked_users` to the **blocker** — so the obvious policy runs its subquery *as the blocked
    party*, finds nothing, `not exists` is true, and the profile is returned. *"The policy would
    look present, pass review, and enforce nothing."* The escape is a `SECURITY DEFINER` function.
    None of that is observable from one account, and the **service role bypasses RLS entirely**, so
    a service-key probe reports success either way.
  - **The service key creates the two accounts and touches nothing else.** Every read and write
    under test goes through the **anon key plus that climber's own JWT**, which is the entire
    question — the rule `check:signed-in` already records from the other side.
  - **CONTROLS RUN FIRST, BEFORE ANY BLOCK, and they are the non-vacuity proof.** *"0 rows after
    blocking"* means nothing unless the same read returned a row before it: RLS could be refusing
    for an unrelated reason, which is precisely the always-passing guard `0095` warns about. And
    the profile read is re-checked **after unblocking**, so a refusal is attributable to the block
    rather than to something else breaking mid-run.
  - It also asserts **neither refusal names the block**. Confirming a block *to the blocked party*
    is the leak the read policy exists to prevent, and both migrations say so in their own comments.
  - **`crews` HAS NO `name` COLUMN** — the first run died `PGRST204` on a guessed payload. Read
    `scripts/schema-snapshot.json` rather than assuming; the columns are `created_by`, `route_id`,
    `dates`, `cap`, `meet_place`, `meet_time`, `float_plan`, `agreed_date`, `date_forced`,
    `dismissed`.
  - **`process.exit()` SKIPS `finally`**, so the first failure leaked two accounts and a crew — the
    teardown never ran. Its `dead()` throws now. `sweepOrphans` is the backstop and is age-gated at
    45 minutes, so a leak is bounded rather than permanent, but a script that cannot clean up after
    its own failure is one that leaks every time it is useful.
  - **Hand-run, and declared in `check:guard-wiring`'s `EXCLUDED` with the measurement.** CI must
    never hold the service key; and the durable CI pair is **not** a substitute, because the run
    **blocks one of them** — a concurrent guard signed in as that account would be locked out of
    the other's profile mid-walk. Its control leg also inserts a `messages` row, and `messages` has
    **no DELETE policy**: on per-run accounts that goes with the cascade, against the durable pair
    it would leak one per run forever, exactly as `check:message-delivery` records.
  - Run it after touching `0088`/`0094`/`0095`, or any policy on `profiles`, `messages` or
    `crew_members`.
  - **RE-RUN 2026-09-10 after `0180` put a new INSERT policy on `crew_members` — all three still
    hold.** That is this entry's own trigger firing (*"any policy on `profiles`, `messages` or
    `crew_members`"*) and being answered rather than noted: `0178`/`0179`/`0180` landed in one day,
    all three are policy work, and `0180`'s `crew_members` insert gate is the one that arms this.
    Controls fired first — B could read, message AND crew-invite A **before** the block — so the
    refusals are attributable; neither refusal disclosed the block; unblocking restored the read.
    **Teardown verified from OUTSIDE again** rather than trusted, since this guard still prints no
    teardown line: **0** accounts on the `.invalid` QA domain afterwards, 3 auth users total.
    - **The three hand-run DB guards were clean in the same sweep** (they have no CI to run them):
      `check:column-drift` ok, `check:function-columns` ok over 11 writing functions,
      `check:function-drift` 46 agreeing with 1 declared benign. `check:rls` (static, in the build)
      ok too — worth running by hand anyway when three policy migrations land at once, because it
      is the guard those migrations are most likely to break.
  - **RE-RUN 2026-09-04 after `0176` gave `messages` a DELETE policy — all three hold**, and that
    migration is exactly the trigger this line names. Controls fired first (B could read, message
    and crew-invite A **before** the block, so the refusals are attributable), neither refusal
    disclosed the block to the blocked party, and unblocking restored the profile read. Teardown
    was verified from **outside** rather than trusted: the guard prints no teardown line at all, so
    the auth users were counted afterwards — **0 on the `.invalid` QA domain**. That is the
    `check:outage` lesson, which threw its leak report away and made a teardown failure invisible
    until somebody counted rows by hand.
- **`check:new-climber-journey`** performs what a brand-new climber actually does and then asks the
  **DATABASE**, not the screen. Hand-run: it creates a real account and rewrites its profile, so it
  needs the service key — which CI must never hold — and the durable CI pair is **not** a
  substitute, because a concurrent guard signed in as that account would be walking a profile this
  rewrites mid-run. Declared in `check:guard-wiring`'s `EXCLUDED`.
  - **WHY A WALK RATHER THAN A GATE.** Four static censuses found six defects a real account hits in
    its first hour (#1554, #1563, #1569, #1576), and every one shared ONE shape: state changed on
    screen and nothing was stored. **Every screen assertion passed throughout** — the optimistic
    local state renders perfectly — which is precisely why each needed its own census to find.
    `check:signed-in` walks an account that ALREADY OWNS THINGS and asserts what renders; this one
    performs an action and then asks whether it survived.
  - **FIVE of the six are covered, and the count is stated in the script so the gap cannot quietly
    stall.** Onboarding (#1576): disciplines and a grade typed into the real modal, read back out of
    `profiles` **and** off the Profile tab after a reload. The crew (#1554): a row one real account
    opens, found by a **different** real account through `crew_listings` — the only test of that
    with two accounts, where `probe-crewfinder-shows-a-real-crew.mjs` proves the component over a
    synthetic crew. The route share (#1576): a route sent from the real share sheet, asked of
    `messages`. Remove-friend (#1563): a connection removed in the real overlay, asked of
    `connections` and then of the screen after a reload, where
    `scripts/oneoff/probe-remove-friend-persists.mjs` is scoped to the handler's source. The connect
    button (#1569): a request one real account sends another, asked of `connections` — and it must be
    **PENDING** — and then of the screen after a reload.
  - **THE CONNECT PHASE MUST FOLLOW THE REMOVE-FRIEND PHASE, which is the ORDERING CONSTRAINT
    INVERTED from the share phase's.** `friendState` reads `"friends"` while the connection exists,
    so the profile renders a **disabled** *"✓ Friend"* and there is no Connect control to click at
    all. Phase 3 must run while the pair is connected and phase 5 only once they are not, so the two
    ordering constraints point in opposite directions and the sequence is forced rather than chosen.
  - **PENDING IS THE HONESTY ASSERTION.** `0087`'s insert policy is
    `auth.uid() = requester and status = 'pending'`, so a request landing as `accepted` would be one
    climber putting themselves into another climber's friends without being asked. **The button is a
    second, independent claim**: it must read *"Requested"* and be **disabled** after a reload,
    because `friendState` is rebuilt from the database on every load and a control offering
    *"+ Friend"* again tells a climber the request never happened.
  - **THE SURFACE WAS CHOSEN BY A CONSTRAINT RATHER THAN BY CONVENIENCE.** `0110` defaults
    `profiles.discoverable` to **false**, so the fixture's accounts are correctly absent from partner
    browse and the obvious path is shut. The **crew roster** is the real one — you climbed with
    somebody, you open them from the crew — and it needs no visibility flip, so nothing about the
    fixture is manufactured to make this reachable.
  - **THE ROSTER ROW IS FOUND STRUCTURALLY — the one member who is not "You" — and never by a name.**
    It renders `p.name.split(" ")[0]`, the member's FIRST NAME, so the `@robinbelay` handle phase 4
    read off the friends row matches nothing on this screen. That mix of `pubName` and a bare
    `.name` across `FriendsList` and `CrewCard` is the **documented limit Privacy §3 states**, not a
    defect this walk found. Re-deriving the rule (`fixture.mate.name.split(" ")[0]`) would make the
    walk agree with itself whatever the app rendered, which is what reading a name off the screen
    exists to avoid; "not me" needs no naming rule at all.
  - **THREE RUNS WERE SPENT ON CONFIDENT WRONG READINGS OF THIS ONE SCREEN — the four-attempts shape
    this file records for `AreaLatest`, and every one was a pattern too narrow to see what was
    there.** Recorded individually because they are three different narrownesses, not one mistake:
    - **A call site rendering `pubName` was assumed to be the roster and is the INVITE PICKER** —
      `connections.filter(c => !inCrew(c.id))`, i.e. climbers explicitly NOT in the crew, collapsed
      behind *"+ Add"*. Both surfaces call `onViewMember`; only one is the roster.
    - **`grep "toggleC()"` found one call site and concluded a COLLAPSED crew card can never be
      expanded** — which would have been a real defect. The collapsed card's control is
      `onClick={toggleC}`, a **reference rather than a call**, labelled *"View plan ▾"*. A grep for
      an invocation cannot see a handler passed by name.
    - **The heading carries `textTransform:"uppercase"` and `innerText` returns the CSS-TRANSFORMED
      text** — it reads `"CREW · 2 MEMBERS"`, so `/^Crew · \d+ member/` matched nothing while the
      roster was on screen the whole time. This file already records that trap for `check:ui`'s
      `PEOPLE YOU'VE CLIMBED WITH`, and it was walked into anyway.
    - **And `find` took the FIRST heading when the fixture renders TWO crew cards** (the shared crew,
      and the one the mate owns where this account is only INVITED), so a roster holding no other
      member answered for a page where the mate's row sat further down. It reads every card now.
  - **A MISS NOW CARRIES THE SCREEN, and the instrumentation gap was the expensive part.** The first
    diagnostic was added to the no-heading branch and NOT to the zero-rows branch, so the next
    failure cost a full run to learn almost nothing. Both paths now report the card count, the labels
    they saw and 400 characters of what was rendered — a further miss arrives as evidence rather than
    as a fourth guess.
  - Injection-tested **2/2** (`scripts/oneoff/inject-connect-request-journey-cases.mjs`), each case
    proving its edit landed **by checksum**, restoring byte-identically, and judged on **which
    assertion fired**. `write-gone` makes `sendConnectionRequest` unreachable with the optimistic
    state and toast standing — the #1569 shape. **`hydra-gone` is the one that earns the reload
    half**: it drops only the OUTGOING side of the connection hydration, so the row is written,
    addressed correctly and pending — **every database assertion passes** — while the profile offers
    *"+ Friend"* again on the next load. No table check can see that.
    - **ONE CASE IS DELIBERATELY NOT WRITTEN: forcing the row to `accepted`.** RLS refuses it
      outright, so the injection would fire *"NO connection row exists"* and read as a catch while
      proving something else. The policy makes that defect unreachable from a client, which is worth
      recording rather than faking.
    - **Do not pipe this suite through `tail`.** The per-case verdicts ARE the deliverable, and a
      truncated view leaves the run's own accounting (`N/N behaved as declared`) as the only
      evidence — which is sound, and is not the same as having read each verdict.
  - **THE SHARE PHASE MUST PRECEDE THE REMOVE-FRIEND PHASE, and that ordering is load-bearing
    rather than tidy.** The share sheet's pool is `connections` **plus seed `CLIMBERS`**, and a
    seed climber's id is an **integer** — `sendMsg` gates its write on `isDbId(pid)`, so sending
    to one correctly takes the honest *"Demo profile — messages here stay on this device"* branch
    and writes nothing. **Only the mate exercises the real write**, and the mate is in that pool
    only while the connection exists. Appended after remove-friend, the phase would filter an empty
    pool and pass having sent nothing — the vacuous shape this walk has now produced twice.
  - **The sheet is FILTERED to the mate by name before the click**, for the same
    attributability reason phase 4 demands exactly one Remove control: every climber in the pool
    carries a `Send` button, and the first one belongs to a seed integer id. The name comes from
    the fixture, not from a string typed into the guard.
  - **The message must NAME THE ROUTE THAT WAS OPEN**, cross-checked against that page's own
    rendered text rather than against a name written into the walk — a share carrying somebody
    else's route is a defect that *"a row exists"* cannot see. `check:message-delivery` proves a DM
    renders in the recipient's inbox and never touches the share control, so this asserts the
    **write** and leaves the render to that guard rather than covering it twice.
  - **THE ROUTE PAGE IS REACHED WITH THE SHARED `?zr=1` OPENER, never by driving the browse
    navigation.** `scripts/journey.config.mjs` gained `buildOpener` for this, and
    `routeDetailTransform` with it because `check:overlay-discovery` requires every config calling
    one to call the other. Driving the drill-in instead is the path this file records costing
    **four consecutive browser attempts** on `AreaLatest`; `?zr=1` calls the app's own
    `openRoute()`, and the walk waits on `window.__routeOpen` as well as on the text settling —
    settling says nothing about whether the navigation has happened yet.
  - **EVERY BASELINE IS LOAD-BEARING and each is asserted before the thing it makes meaningful.**
    The fixture seeds disciplines and grades (it serves `check:signed-in`, whose account is meant to
    own things), so this walk **blanks them and re-reads them as empty**; the connection is counted
    as exactly 1 before Remove. *"The column is populated afterwards"* and *"the row is gone
    afterwards"* both pass **vacuously** against an account that never had the thing.
  - **THE CREW MUST CONTAIN NEITHER CLIMBER, which is why it is created rather than reused.** App
    excludes crews you organise or are already in — correctly, a row you can never act on is noise —
    and both fixture crews seat both accounts, so asserting on one would assert on a row the finder
    is **right** to hide. It is torn down in a `finally`.
  - **EXACTLY ONE Remove control is required before the click, so the removal is ATTRIBUTABLE.**
    With two friends on screen the walk would remove an arbitrary one and then assert about the
    pair. The friend's name is read **as the app renders it** rather than derived: `pubName()` gates
    the display name on `show_name` and otherwise builds a handle, so a walk that computed the
    expected string would be re-implementing a rule that can move and would then agree with itself
    whatever the app did.
  - **NAVIGATION GOES BY ACCESSIBLE NAME WHEREVER A BADGE CAN APPEAR.** The **Crew nav button**
    renders `crewBadgeN` inside itself, and this fixture seats the owner as INVITED in a second
    crew — so `innerText` is not `"Crew"` for exactly the account this walk uses. The Crew sub-tab
    bar labels itself `"Friends, 1"`. `tapByName`'s `^label(,|$)` anchoring accepts both spellings,
    and a click that does not land is **fatal** rather than a quietly shorter walk that reports on
    whatever screen stayed up.
  - **THE FLAG IS READ, NEVER ASSUMED.** `scripts/journey.config.mjs` publishes `__DEMO_AUTOLOGIN`
    and the walk asserts it is defined and **false** before describing anything. Two earlier runs
    reasoned about that flag from the config and were wrong both times — and a vite `define` on
    `import.meta.env.X` substitutes **nothing**, so adding one changes nothing, which reads
    identically to *"the override already worked"*.
  - **ITS TWO DECLARED KNOWNS ARE ASSERTIONS NOW, and the mechanism that retired them is the point.**
    Each was written to **FAIL AS STALE the day it was fixed** — the standard `check:field-renders`'
    `KNOWN` map is held to — so when the product decision was taken, the guard went red by itself
    rather than quietly agreeing with whatever shipped. Nobody had to remember the declarations
    existed, which is the whole argument for a declaration that fails when it stops being true.
  - **ONBOARDING AUTO-OPENS FOR A NEW ACCOUNT, AND THE REPAIR THIS GUARD WARNED AGAINST IS STILL
    WRONG.** The old effect keyed on `authed`, set true in exactly one place (LoginScreen's DEMO
    branch), so it could never fire for a real session. Re-keying it on `signedIn` — the obvious
    fix — would nag **every** climber on **every** load, because `onboarded` is
    `useState(DEMO_AUTOLOGIN)` and does not persist either. What shipped splits the question:
    - the **ACCOUNT** decides whether onboarding is still needed — `accountNeedsOnboarding` reads
      the profile row, and onboarding's first question is required and its finish handler persists
      `disciplines`, so an account with none never completed it. That is right on a second device,
      and it self-heals if the write failed;
    - a **DEVICE** preference (`lib/onboard-pref.js`) decides whether this browser has already
      opened the sheet once, so it is an invitation rather than a nag.
    - **IT WAITS FOR THE READ AND REFUSES A FAILED ONE.** `profileLoaded` separates *"no
      disciplines"* from *"not asked yet"*; without it every established climber matches for the
      moments before their profile arrives and the sheet flashes at them on every load. And a FAILED
      read leaves exactly the empty profile a new account has, so the predicate gates on
      `!profileReadFailed` — `check:profile-edit-gate`'s rule one surface over, since opening a
      blank onboarding sheet over a profile the app could not load is how that profile gets
      overwritten.
  - **THE SETUP CARD MOVED TO HOME, AND ITS GATE WAS A SECOND DEFECT NOBODY HAD NAMED.** It was
    gated on `!onboarded` — false forever for a real account — so **every established climber with
    a complete profile was being offered *"Set up your climbing profile"* on every load**. It shares
    `accountNeedsOnboarding` with the sheet now, so the number and the prompt cannot disagree. The
    evidence Home was always the intent is the card's own dismiss state: `homeDismiss`, keyed
    `"climbsetup"` — on Climbs its ✕ wrote to a list no Climbs surface reads. The walk asserts it is
    on Home **and not on Climbs**, because a card in two places is worse than one in the wrong
    place: both would read one dismissal key, so dismissing either would blank both.
  - **The walk SKIPS the sheet rather than completing it**, which is what makes the card assertion
    possible: `onSkip` is `()=>setOnboardOpen(false)` and does **not** mark them onboarded, so a
    climber who skips still needs the card — exactly the state worth measuring. It then re-enters
    through Settings, which is also the path on a second device, where the device preference stops
    the sheet opening again.
  - Fails **closed** throughout: a dev server that never came up, a fixture that already carries the
    columns under test, a nav or sub-tab click that did not land, a `Crew:Friends` view that
    rendered under 200 characters (against which every *"is absent"* assertion passes), and a crew
    on a route id `routes` lacks — which renders blank and is indistinguishable from a crew that
    never loaded, so `JOURNEY_ROUTE` is a real catalog row.
  - Injection-tested per phase, because the healthy output here is *"everything passed"*, which is
    also what a walk asserting nothing prints. Reverting `CrewFinder`'s `_crewPool` merge back to
    `OPEN_CREWS` fails **exactly** the crew assertion;
    `scripts/oneoff/inject-remove-friend-journey-case.mjs` makes `removeConnection` unreachable —
    the real #1563 defect, leaving the optimistic filter and the success toast in place — and
    requires phase 4 to fail on the removal assertion **and nothing else**;
    `scripts/oneoff/inject-share-route-journey-case.mjs` does the same to `sendMsg` for #1576,
    and phase 3 then fails on **exactly one** assertion while *"shared the open route with …"*
    still passes — which is the defect's own shape, the click landing and only the write missing.
    All of them edit the app in place, so **do not commit while one is running**.
    - **THAT INJECTION CAUGHT A VACUOUS ASSERTION IN THE GUARD ITSELF, which is the whole reason
      for judging on WHICH assertions fired rather than on an exit code.** Phase 4's third
      assertion counted controls reading `Remove` — and those live in the **overlay**, which is not
      open after a reload, so it printed a cheerful `ok` beside two failures and **could not have
      failed in that position**. Dead code in a guard reads as coverage, the shape
      `check:screen-lists` already records, committed in a guard written the same hour. Replaced
      with the `See all` opener, which renders only on `connections.length > 0`, and re-verified
      in BOTH directions: absent on a clean run, present under the injection.
  - **FOUR FAILS ON A LOADED BOX WERE THE WALK READING TOO EARLY, NOT THE APP (2026-09-25).** The
    auto-open and the Home card both wait on `profileLoaded`, which turns true only when
    `getProfile` resolves, and nothing spins while it is pending — so `settledText` returned first
    and the walk read a screen the sheet had not reached yet. The DB check slept a fixed 2.5s and
    read the row once, before a slow write had landed. Now it waits up to 60s for the sheet, 30s
    for the card, and polls the row for 30s. Every FAIL also prints the app's own `/profiles`
    requests with their timing and status, so the next red run says whether the read or the write
    went out at all. Re-run after the change: all green, disciplines and grade in the row.
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
- **`check:a11y-badges`** asks whether any control announces **two fragments welded into one
  token** — a badge count glued to its label, or one word glued to the next. The Crew sub-tab
  bar rendered `<button>{label}{n?<span>{n}</span>:null}</button>`, so Chrome computed the name
  as **`"Friends2"`** — one token. Sighted users see a gap because it
  is CSS margin, and *the accessibility tree has no margins*. #740 fixed that one bar but could
  not answer the next question — is there another? There was: the **Inbox modal's own tab bar**,
  `"Friends2"` and `"Crews1"`, fixed in the same commit as this check.
  - **SECTION 2 ASKS THE SAME QUESTION OFF A CONTROL, because the scope above let a real defect
    through.** Section 1 judges by the **computed control name**, which is what makes it
    trustworthy — an `aria-label` fix changes no structure at all and correctly reads as fixed —
    and it is also why it is scoped to controls: a plain `<div>` has no computed name, so a
    widened selector would find candidates and drop every one at the confirm step. The route
    page's conditions list rendered `{pat.label}{pat.when?<span style={{marginLeft:7}}>…</span>
    :null}` as **"Best windowmid-Jul to early Sep"** on a plain heading div. Same shape as #740,
    invisible here by construction.
    - **The instrument is `innerText`, and the obvious alternative was tested and REJECTED.** The
      tempting judgement is the AX tree's `StaticText` nodes, on the theory that Chrome merges
      adjacent inline text into one. Measured on four synthetic shapes,
      `Accessibility.getPartialAXTree` with `fetchRelatives` returned **no StaticText at all** for
      both inline cases — the two that matter. `innerText` separates all four correctly, because
      it is computed from **layout**, which is the same thing that decides whether a separator
      exists.
    - **Three filters, and every one is a false positive the scan actually produced.** *Not
      rendered*: a `display:none` **grandparent** is missed by checking the parent's display, and
      inside one `innerText` falls back to `textContent`, which carries no separators — so every
      boundary in the subtree looks glued (all three findings of one early run were the seed area
      browser, dead under `USE_DB`, with zero-area rects). *Local text*: a body-wide `includes()`
      matches a short numeric needle like `"31"` elsewhere on a busy page. *Visual gap*: the app
      wordmark is two spans, `Climb` and `Match`, flush against each other, and "ClimbMatch" is
      exactly what the eye reads — the defect is a gap the eye **gets** and the accessibility tree
      does not.
    - **A SHARED VISUAL LINE IS NOT REQUIRED, and requiring it MISSED the real defect.** At 390px
      that chip **wraps**, and a soft inline wrap puts no separator into `innerText` — measured,
      the wrapped case still reads `"Best windowlate spring to fall"`. A block child does get a
      newline and is already excluded by the text test. So the only thing excused is the
      *contiguous* case.
    - **IT SHIPPED BROKEN AND EVERY SIGNAL SAID OTHERWISE.** The first version was a template
      literal, and inside one `\w` is an escape that collapses to a literal `w` — so the needle
      regex was `/w/` and the scan matched almost nothing while reporting a clean app across 65
      screens. The guard was green before the widening and after it; the fail-closed floor was
      satisfied, because **it counts boundaries EXAMINED, which is a real number whether or not
      the needle logic works**; and "0 findings" was the expected answer. Only the injection
      against a defect that had genuinely shipped told the truth. The scan is a **function**
      passed to `page.evaluate` now, as `findCandidates` is, so neither the escaping trap nor the
      backtick trap can return. *A floor that counts work done is not evidence the work was
      correct* — the same lesson `check:dup-attrs` records for its element counter.
    - **The verdict names BOTH sections**, so the next reader can tell from the output that the
      off-control scan exists rather than rediscovering the hole.
    - **`--only=route` reduces the walk for the injection suite and can never print a pass.** The
      full sweep is 65 screens and an injection needs two runs of it; a flag that let a partial run
      look complete would be the exact false pass this file is built to refuse, so it prints
      `PARTIAL RUN … tabs and overlays SKIPPED` and says outright that it is not a pass.
  - **Structural, not lexical, and that distinction is the whole check.** Scanning names for a
    digit beside a letter returns a haystack in a climbing app — `5.10a`, `V4`, `WI3`, `M6`,
    `Class 4` are all correct names. The defect is that the digit and the word come from
    **different DOM nodes**. A grade is one authored string in one text node; a badge is a
    separate element. So it walks each control's text nodes, finds a word-character transition
    **across a node boundary**, and only then asks Chrome what it computed. An earlier
    string-matching attempt reported "none" while direct measurement showed three, and was
    binned rather than shipped.
  - Confirmed by **measurement, never markup**: a candidate is reported only if the name Chrome
    actually computed still holds the two fragments glued. That is why an `aria-label` fix —
    which changes no structure at all — reads as fixed, and why rearranging JSX cannot satisfy it.
  - Runs against the **populated** demo. A badge is `count ? <span>…`, so at zero there is no
    badge and nothing to find; check:zero's config would make this vacuous.
  - **The needle was letter↔digit until 2026-08-19, and that narrowness let a whole class
    through for as long as the check had existed.** #740 was a *count* welded to a label, so
    the rule was written about digits. The route page's "Recently climbed" rows are the same
    defect with a **word** on the right: `{aa.user}<span style={{marginLeft:7}}>{outcome}</span>`
    announced as **`"Nathan BarberAttempt"`**. It is now `\w` on both sides, which subsumes the
    original rule.
    - **Punctuation between the fragments is a real separator and must NOT be flagged.**
      `"Alex Torres" + "✓ Summited"` announces as `"Alex Torres✓ Summited"`, where the ✓ keeps
      the words apart — so the test is `\w` on both sides, deliberately **not** "no whitespace
      at the boundary". That looser rule reports correct rows, measured against the live app.
    - **Chrome blockifies flex and block children and inserts a space between them**, which is
      why the widening is far less noisy than it sounds: the crag-sibling nav's stacked
      `Routes` / `next door ›` spans *look* like the same bug and announce correctly. Reasoning
      from the markup called that a defect; the measurement overruled it. Only the inline
      `marginLeft` shape actually glues.
  - **The route detail screen IS covered, on all six sub-tabs**, and the exclusion that used to
    sit here — *"reached by clicking a card, not by URL, and the shared scaffold only opens tabs
    and overlays"* — was **stale rather than wrong when written**: the scaffold gained `?zr=1`
    for `check:overflow`, which calls the app's own `openRoute()` from inside the opener. The
    exclusion outlived its reason by months, and the one defect the widening found was **on that
    screen**. Not reaching it is an exit-1, not a note, for the same reason `check:overflow`
    upgraded it. Sub-tab clicks skip fixed/sticky chrome, because a sub-tab name collides with
    the bottom nav and a global text match silently leaves the route page.
  - **The sibling instance in `AreaLatest` needed TWO fixes, and one hid the other.** The same
    row in `ClimbMatchCore.jsx` glued identically but was a bare `<div onClick>` — no role, so
    a screen reader computed no control name for it and this guard's selector could not see it
    at all. Making it a real control via `clickable()` is what **exposed** the glue, so both
    had to land together; `check:clickable`'s baseline drops by one. A defect can be hidden by
    a worse defect in the same element.
  - **That `AreaLatest` fix is UNGUARDED, and the gap is pinned rather than described.** It
    renders as `selArea && …` on the Climbs tab and `selArea` starts null, so across a full
    63-screen walk the component returns null every time — reverting its `aria-label` is
    **MISSED**. `ClassicClimbs` and `GettingThere` are invisible for the same reason. These are
    not screens with no findings; they are **not screens**.
    - **One obvious fix was built, measured, and REJECTED**, so nobody re-derives it: a `?za=1`
      opener calling `setSelArea`. It genuinely put an area in state — verified, it selected
      *Kings Peak* — and the Climbs tab **still rendered 979 characters with no report rows**,
      because that tab drives its own browse navigation rather than reading `selArea` alone.
      Shipping it would have added a **false reachability claim** to the shared scaffold, which
      is the very defect class this entry is about. Closing this needs the browse navigation
      driven (country → state → area), not one setter called.
      `scripts/oneoff/probe-area-latest-reachable.mjs` is the measurement — a single page load,
      because the full walk kept being reaped on a loaded box.
    - The gap is **asserted**, not just written down: case `arealatest` in
      `scripts/oneoff/inject-glued-name-cases.mjs` expects a **pass** and therefore fails as
      **stale** the moment that coverage arrives. A gap nothing asserts is a gap that rots —
      the standard `NEEDS_EXTRA_STATE` and `KNOWN` are already held to.
    - Twice during this work a plausible story about this screen was wrong and only measurement
      settled it (the flex-stacked `Routes` / `next door ›` spans; and "+5 controls must be the
      four report rows"). On this component, do not reason from the markup or the counts.
    - **NARROWED 2026-08-20: the COMPONENT is sound, so the remaining unknown is app wiring
      alone.** `scripts/oneoff/probe-arealatest-ssr.mjs` renders `AreaLatest` directly with
      `renderToStaticMarkup` — no browser, no dev server — and it produces a full section for
      every seed area tried: `kings` 5,539 chars, `olympus` 3,435, `lcc` 4,488, `lcc_egg`
      3,449, heading present in all four. So *"the component will not render for this data"* is
      **dead**, and every browser attempt that failed was failing on the mount, not the render.
      That distinction is what four consecutive browser attempts could not separate.
    - **The gate is `routeView==="areas" && selArea`, and `routeView` DEFAULTS to `"areas"`** —
      so that half is satisfied out of the box, and `selArea` is the only variable. Which makes
      the `?za=1` result stranger, not clearer: it set `selArea` (verified: *Kings Peak*) and the
      tab still rendered 979 characters, i.e. the `{selArea?null:<AreaBrowse/>}` branch — the one
      that only shows when `selArea` is **falsy** at render time. Something is clearing or not
      committing it; that is where the next attempt should start.
    - **Four attempts, all measured, none reaching it**: the `?za=1` opener; and driven browse
      paths to *Mount Olympus* (peak), *Little Cottonwood Canyon* (canyon) and *The Egg* (crag —
      whose row is not even present under LCC). The drive itself works and navigates correctly
      (`scripts/oneoff/probe-drive-to-area-latest.mjs` reports body length and heading at every
      step); the first version of it simply aimed wrong, descending greedily into *White Pine
      Boulders*, which carries no `activity` at all.
    - **Aim at an area that HAS reports, computed rather than guessed.**
      `scripts/oneoff/probe-which-area-has-activity.mjs` bundles core with esbuild and prints
      every seed area whose subtree holds dated activity, with its click path: `kings` (5),
      `mount_baker` (3), `olympus` (3), `angels` (2), `lcc_egg` / `lcc_crescent` /
      `lcc_secret_garden` (3 each), `lcc_hellgate` (2), `co_telluride` (2). Two esbuild traps it
      encodes: `--platform=neutral` cannot resolve Supabase's subpackages (use `node`), and
      `lib/supabase.js` reads `import.meta.env` at module scope, so `--define:import.meta.env={}`
      is required or the import throws before `ROUTES` is reachable.
    - **ANSWERED 2026-08-20, and it is not a coverage gap at all: NO REAL USER EVER SEES THIS
      SECTION.** `AreaLatest`, and its neighbours `ClassicClimbs` and `GettingThere`, are gated
      on `selArea` — which is written **only on the seed catalog path**. `deploy.yml` sets
      `VITE_USE_DB: "true"`, so production renders `DbAreaBrowser`, which receives
      `onAreaContext={setDbAreaCtx}` and **never** `setSelArea`. This is the documented trap that
      shipped #714's unreachable fire map (fixed in #731 by reading `dbAreaCtx || selArea`).
      **The guard was reporting reality, not missing a screen.**
    - **The tell was in the probe output all along.** The drive reported `country: ok` /
      `state: ok` against selects labelled *"Select a country"* / *"Select a state"* — those are
      **`DbAreaBrowser`'s**. The seed `AreaBrowse` has a single select labelled **"Jump to a
      state"**. So the walk was in DB mode (the worktree symlinks `.env`/`.env.local` and vite
      loads them) and `selArea` could never be set. Reading which select answered would have
      ended four browser attempts immediately.
    - **It is NOT the `dbAreaCtx || selArea` one-liner, and that is the part worth knowing before
      quoting an estimate.** All three are also bound to the **seed `ROUTES`/`MOUNTAINS` arrays**:
      `AreaLatest` early-returns on `ROUTES.some(r=>r.mountainId===area.id)` and builds rows from
      `ROUTES.filter(r=>inArea(...))`; `GettingThere` walks `MOUNTAINS` by `parentId`, which
      `dbAreaCtx`'s flat `{id,name,lat,lng,areaType}` does not carry. So a DB area renders nothing
      even once the prop is fixed. Reviving them needs an area-subtree query over `climb_logs`
      that does not exist — **feature work**, recorded in
      `memory/three-climbs-tab-sections-dead-in-production.md` as an open decision.
    - So **driving the browse navigation would not have helped either**, and the earlier note
      here saying it would was wrong. The `arealatest` injection case still expects a pass, but
      for this reason rather than for walk coverage.
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
    no role has no computed control name — a different defect, see `scripts/audit-a11y.mjs`),
    nor a name glued by something that is not a word character on both sides.
  - Zero candidates anywhere is treated as a **failure**, not a pass: every control here is
    multi-node, so an empty scan means the scan broke.
  - Injection-tested: reverting #740's aria-label fails naming all three sub-tabs by their
    announced text; breaking the scaffold anchor fails on the 58-character boot shell rather
    than passing over a blank app — the trap `check:overlay-scroll` documents above.
  - Runs on every PR via `render-guards.yml`; not a build gate (browser automation).
- **`check:selected-state`** asks whether a control that **looks** selected **says** it is.
  Until #1041 the primary nav was the only one that did — `aria-current={tab===n.id?"page":undefined}`,
  literally the only `aria-current` in the codebase, against **zero** `aria-selected` and **zero**
  `role="tab"`. Every other tab bar and every toggle chip marked its state with a background
  colour and nothing else, so a screen reader announced `"Crews, 1"` identically whether or not
  it was the view you were on. #1041 and #1062 fixed **21 controls** across 4 tab bars (Crew,
  both Logbook bars, RouteDetail's sub-tabs) and 4 toggle groups (onboarding's disciplines and
  availability, PartnerSearch's availability filter and its ✓ Verified / Speed match pair).
  Runs on every PR via `render-guards.yml`; not a build gate (browser automation).
  - **No sibling guard asks this, and the two nearest ones show why it is separate.**
    `check:a11y-names` asks whether a control **has** a name; `check:a11y-badges` asks whether
    that name has a count welded into it. A mute tab bar passes both. #740 gave these exact
    buttons their `aria-label`s *because* the announced name was wrong — and left the **state**
    out in the same commit, which is how a fix and its own gap shipped together.
  - **BEHAVIOURAL, NOT VISUAL, and the first draft was wrong in the direction that matters.**
    "A sibling row where exactly one control has a different background" also describes a
    **primary action button**: that draft reported `[Accept | Decline]`,
    `[Edit profile | Settings]` and `[Share profile | View public profile]` as tab bars with an
    unannounced selection. None has a selected state to announce, and a guard that flags correct
    work is one people learn to ignore. The shape is identified by **doing** it — click a
    control, then look at its **siblings**: siblings also changed → a tab bar, wants
    `aria-current`; siblings unchanged → an independent toggle, wants `aria-pressed`; the
    control vanished → it navigated and is not stateful at all. Markup cannot separate those —
    all three are a `<button>` with a conditional background.
  - **Fails closed in BOTH directions, and the second test earned itself immediately.** "No
    stateful controls found" is a broken detector; so is "nothing announces its selection",
    because the primary nav is known to. The colour-only draft was blind to the nav — it marks
    its active tab with weight and colour rather than a background — and that assertion is what
    caught the blindness instead of a clean-looking run.
  - It reuses `scripts/overlay-scroll.config.mjs` verbatim rather than adding a fifth scaffold,
    which is also how it reaches **onboarding**: the `WHAT DO YOU DO?` chips are the first thing
    a new climber is asked, the field is marked required, and no tab walk can reach them.
  - **ITS CI TIMEOUT WAS DERIVED FROM THE FAST KIND OF SCREEN AND THE JOB WAS CANCELLED AT THE
    WALL — which reported NO FAILURE.** 40 minutes was extrapolated from the 8-screen version
    (3m27s in CI), giving ~22s/screen; but those 8 were all **tabs**, and an overlay costs
    roughly double because it renders *over* a tab and the guard probes both. Measured on the
    real run: **49 of 58 screens in 38m01s, 367 groups, 6.2s/group, 46.6s/screen** — ~47m for a
    full walk. The PR read green with 14 checks passing and this one silently having measured
    nothing, which is the `check:ci-cancel` hole arriving by a different route. Now 75m.
    **Sample the slow kind of screen before deriving a timeout from the fast kind**, and treat a
    `cancel` bucket as a red, never as an absence.
  - **Overlays are DISCOVERED, not listed, and a hand-picked list is what put this guard wrong
    twice in one day.** It shipped walking six tabs and onboarding, which left RouteDetail's
    sub-tab bar uncovered — one of the four #1041 fixed — and left the **Inbox** modal's
    `Friends / Crews` bar, a sixth mute bar of exactly the shape #1041 fixed, undiscovered
    until somebody grepped for it by hand. Discovery is shared with `check:zero`,
    `check:signed-in` and `check:overlay-scroll`, so the four cannot drift on which modals
    exist. Walking all 58 screens found **19 more mute controls across 11 overlays**, including
    the shared map layer bar, the units toggle, the profile modal's sub-tabs, five groups
    inside the log-a-climb modal, and the belay ledger's `I caught X / X caught me` — the
    direction of a safety record, conveyed by colour alone.
  - **ANY of the four attributes counts, and demanding a specific one was a real
    over-strictness.** An early verdict required `aria-current` of anything shaped like a tab
    bar, and reported the log modal's `[Everyone | Just me]` — which already carries
    `aria-pressed` — as mute, i.e. it told the author to swap working markup for different
    working markup. `aria-expanded` is a genuine third answer too: *Climb with them again* is
    a disclosure, so `aria-pressed` would have been the wrong fix. The guard asks only whether
    the state is announced **at all**, which is the part that was missing across all 21.
  - **A TWO-member bar breaks a majority tie-break**, so it tries more than one member. On
    `[Friends | Crews]` the signature counts tie 1-1; picking the already-selected tab means
    the click changes nothing and the whole bar drops silently out of coverage as "not
    stateful". That is exactly how the Inbox bar measured 0 stateful while being mute.
  - **Its own comments must contain no backticks**: `says()` lives inside the `SCAN` template
    literal, and one backtick ends the string. It failed loudly on parse, which is the right
    direction, but the trap is easy to re-introduce.
  - **Route detail is walked, and failing to reach it is an exit-1.** Its sub-tab bar
    (`Overview / Plan / Reports / Safety / Partners / Photos`) is one of the four #1041 fixed,
    and no tab walk reaches that screen — so for one commit the fix was guarded everywhere
    except where it was made. Navigated rather than driven: `?zr=1` calls the app's own
    `openRoute()` from inside the shared opener, the same mechanism `check:overflow` uses and
    for the same reason. It waits on `window.__routeOpen` **as well as** on the text settling,
    because settling says nothing about whether the navigation has happened yet. The
    not-reached test runs **before any verdict is interpreted**, so a screen the guard silently
    failed to open can never read as a screen with nothing wrong (injection case 4 pins that
    ordering — it fires even though a healthy bar has already passed).
  - It found the route page's star-rating group **already correct** (`aria-pressed`), which is
    the useful shape of a negative result: the convention was there to follow.
  - Injection-tested, 3 cases at the bottom of the script, driven by `--strip-aria=` because the
    regression lives in the app rather than in the checker. Case 3 (break the scaffold anchor)
    must fail on the 58-character boot shell rather than pass over a blank app — the trap
    `check:overlay-scroll` records.
- **`check:control-names`** asserts that a control says **what it is**, and that a switch says
  **what it is set to**. Static (Babel over the app sources), so it sits in `npm run build`.
  - **Found by reading a sibling guard's own SKIPPED counter.** `check:selected-state` printed
    *"14 control(s) skipped as unnameable"* on the Crew tab and pointed at `check:a11y-names` —
    **wrong advice**, and the wrongness is why this guard exists. That guard covers **form**
    controls (input/select/textarea) and can never report a `<button>`; `check:clickable` covers
    **non-native** clickables (a div with onClick) and cannot either; and `check:selected-state`
    needs **two** button-like siblings on one row to form a group, so a lone switch beside its
    text label is a group of one and drops out before it is ever measured. Three guards, and the
    nine switches were outside all of them. Same shape as [[a-stated-limitation-is-a-worklist]]:
    the number was printed for months and read as bookkeeping.
  - **The nine switches are ALL privacy or visibility settings** — leaderboards, real name,
    precise location, partner-browse listing, online status, résumé visibility. **Three announced
    no name at all and eight announced no state**, so a screen reader said `"button"` and the user
    could not learn whether their real name was being shown. The visible label sits in a **sibling
    div**, so nothing links the two. Now `role="switch"` + `aria-checked`, taken from each
    control's **own background condition** — never a second one invented beside it, the mistake
    that produced `UNITS===u[0]` in #1233.
  - **`aria-pressed` is ACCEPTED, not rewritten.** One switch already announced correctly; a guard
    demanding a single spelling tells the author to swap working markup for different working
    markup, which `check:selected-state` had already done once.
  - **THE NAMING RULE WAS TOO NARROW AND REPORTED 11 WHERE THE TRUTH WAS 3.** An accessible name
    comes from **all descendant text**, and components are opaque — correctly, since `<Av/>` and
    `<ActionIcon/>` render none, which is exactly why an icon-only button announces as nothing.
    But `<Lbl s={"← Back"}/>` is this app's **own label component**: it maps a leading icon
    character to an `ActionIcon` and renders **the rest of the string**, so those buttons really
    do announce as *"Back"*. Treating it as opaque condemned **eight correctly-named controls**.
    It must be recognised in **both child positions** — these are written `{<Lbl …/>}`, inside an
    expression container, and a version handling only bare children still reported all eight.
    Third time this repo has recorded the same too-narrow name test; see `check:clickable`.
  - **Fails closed on BOTH floors, and the second one was measurably not enough at first.** Fewer
    than 200 button-like elements is a broken traversal. The switch floor was `!switches`, i.e.
    "at least one" — and **injection case 6 restyled the geometry in `ClimbMatch.jsx` only, the
    single switch in `ClimbMatchCore.jsx` satisfied that test, and the guard reported `ok` having
    checked 1 of 9.** A **partial** restyle is how a shape test actually dies, not a simultaneous
    one. The floor is 5: well below 9 so ordinary churn does not trip it, well above what a
    partial restyle leaves.
  - Injection-tested **6/6** (`scripts/oneoff/inject-control-name-cases.mjs`), each case proving
    its edit landed **by checksum**. **Case 5 must PASS** (aria-pressed accepted). **Case 4 makes
    two claims in one edit** — it swaps a `<Lbl>` for a text-less component and must **fail**,
    which proves both that the button is scanned at all and that `Lbl` is what names it; the
    no-op attribute edit it replaced proved neither and would have passed against a guard that
    never looked at that button.
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
  #713 revived it — it used to map over `MY_CLIMBS`, a constant `DEMO_FILLERS` emptied **while
  that flag was false**, so `_anniv` produced `[]` and no anniversary could **ever** fire. Being spread into
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
