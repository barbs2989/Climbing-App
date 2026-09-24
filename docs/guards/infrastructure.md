# Guard infrastructure

How the guard chain runs and what every guard must establish before it believes itself: build-chain cost and concurrency, CI cancellation, deploy drift, render settling, source coverage, the DB preflight, the quiet-box gate, and checking `main` itself.

Part of the guard notes — see [README.md](README.md) for the full index.

**WHAT THE GUARD CHAIN COSTS, measured 2026-09-02 rather than guessed.** `npm run build` runs
**71 guards for ~161s of CPU** before vite starts, and the shape of that number matters more than
the total when deciding where a new guard belongs.
- **THE COUNT IS STALE — 81 GUARDS TODAY, NOT 71 — AND THE TOOL THAT REFRESHES IT HAD BEEN BROKEN
  BY #1546, WHICH IS WHY NOBODY NOTICED.** That change moved the `&&` chain to `build:guards` so
  the concurrent runner could read it, leaving `build` as `node scripts/run-build-guards.mjs &&
  vite build`. `measure-build-gate-cost.mjs` parsed `pkg.scripts.build`, so it found **one** guard
  and **failed closed on every run** — correct behaviour, and invisible, because nothing runs
  `scripts/oneoff/`. `check:guard-wiring` was taught to read both keys in the same PR; the
  measurer was not. It reads both now. *A verification nobody runs is not a verification* — here
  the un-run thing was the instrument that keeps a documented number true.
- **DO NOT QUOTE A TOTAL TAKEN ON A LOADED BOX, and there is now direct evidence of the factor.**
  A run at load ~110 reported **320s across 81 guards**, which is not comparable to the 161s above:
  `check:offline-claims` measures **3.7s CPU at load 3.8** and **12.06s** in that same run, on
  identical code — about **3x inflation from contention alone**. CPU time is more load-robust than
  wall clock, which is why this script reports it, but it is not load-*proof*: the same work costs
  more cycles when the caches are being thrashed. **The RANKING survives a loaded run; the TOTAL
  does not.** Re-measure on a genuinely quiet box before writing a new figure here.
- **The top of the list is FLAT, and that is the finding.** The 14 most expensive guards all sit
  between 6.5s and 10.4s — not because they do proportionally more work, but because each pays the
  same fixed cost: a node start (~0.8s) plus a Babel parse of the app (**2.10s** for all three
  files, 2.0 MB of JSX). Those 14 are ~104s, **65% of the chain**, and at least **41s of it is
  per-process overhead** that one shared runner would pay once.
- **That is a real prize and it is NOT free to collect.** Merging 14 guards into one process means
  merging 14 fail-closed contracts and 14 injection suites, and this file records what happens when
  a guard's traversal is refactored without re-running its cases — `check:dead-props` had three
  defects that each made it report a clean sweep. Recorded as a measured opportunity, not a task.
- **MOST OF THE WALL-CLOCK WIN WAS TAKEN WITHOUT THAT REFACTOR: the guards now run CONCURRENTLY.**
  `npm run build` calls `scripts/run-build-guards.mjs`, which reads the same `&&` chain — moved
  verbatim to `build:guards`, so there is no second list to rot — and runs it with bounded
  concurrency. **Nothing about any guard changes**: each still runs in its own process with its own
  contract, its own fail-closed paths and its own injection suite. Only the orchestration moved.
  - **Safe to parallelise, measured before it was written.** On a normal run no guard writes a
    fixed path — all six `BASELINE` writes sit behind `--update`, which the chain never passes —
    every temp file is pid- or `mkdtemp`-scoped, and none mutates cwd or `process.env`. **Re-check
    that before adding a guard that writes anything.**
  - **It reports MORE than the chain did.** `a && b && c` stops at the first failure, so a tree with
    three broken guards showed one. The runner runs them all and lists every failure — strictly more
    information for the same work.
  - **The dangerous direction is a runner that passes while a guard fails**, so it fails closed four
    ways: fewer than 20 guards parsed out of the chain, a child exiting non-zero, a child killed by
    a SIGNAL (where `code` is null and a naive check reads it as a pass), and a child that could not
    be spawned. Injection-tested 3/3 — one failing guard, TWO failing guards with both listed, and a
    gutted guard list — each judged on the message as well as the exit code.
  - `check:guard-wiring` reads **both** `build` and `build:guards`, and fails closed if the latter
    goes missing or names fewer than 20 guards. Without that, moving the chain would have made
    every guard read as running nowhere.
  - Output is printed in **chain order**, not completion order, so two runs of one tree produce the
    same log and a CI diff stays readable.
  - What this does NOT do is remove the duplicated Babel parses; those 14 guards still each parse
    the app. The shared-runner refactor above is still the way to collect that, and is still not
    free.
- **The cheap version has already been taken three times**, and is what to try first on any new
  guard: `check:waypoint-placement` went 37s → 20s by parsing each file **once** for two visitors
  instead of twice; `check:overlay-absence` was kept out of the build chain entirely (a CI job
  instead) once its ~10s proved to be almost all Babel; and `check:wp-styles` — the most expensive
  guard in the chain — had the identical double-parse and now parses **3 times instead of 6**.
  - **That was the LAST one, measured rather than assumed.** Every build-chain guard was scanned
    for a second `parse()` of the same source and `check:wp-styles` was the only genuine hit. The
    other three the scan reported are false positives of its own regex — two are `JSON.parse` of a
    baseline file and one is `Date.parse` quoted inside a comment. So there is no remaining
    free saving of this kind; what is left is the shared-runner refactor above, which is not free.
  - **Verify such a change by OUTPUT, and by the PARSE COUNT — not by the clock.** The before/after
    timing was attempted at load average 227 and read 110s against the 10.4s the same guard measures
    on a quiet box, which is useless in both directions. What is load-independent is that the
    guard's own counter goes 6 → 3 and its output is byte-identical.
- **Measure it with `scripts/oneoff/measure-build-gate-cost.mjs`, on a quiet machine.** The number
  above is CPU-ish rather than wall clock deliberately: this box routinely runs several sessions at
  once, and a wall-clock profile taken at load average ~450 was off by 4x — recorded under
  `check:waypoint-placement`, where it also blamed the wrong two suspects.
- **Not every expensive guard is wasteful.** `check:flex-scroll` costs 7.4s with no Babel parse at
  all: it resolves real JSX ancestry through `scripts/lib/jsx-ancestors.mjs`, because a fixed
  character window missed 28 of 50 panes. Cost bought coverage there. Read what a guard is doing
  before treating its position in this list as a defect.
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
  - **THE GRACE CLOCK WAS TIED TO THE WRONG COMMIT, AND THAT MADE THIS GUARD STRUCTURALLY
    UNABLE TO REPORT THE THING IT EXISTS FOR.** It excused any gap where the **newest** commit
    on main was younger than the grace — and in a repo where several sessions merge every few
    minutes, there is ALWAYS a commit younger than 45 minutes, so **the grace never expired**.
    Measured 2026-09-02: production sat **17 commits and ~80 minutes behind** while this printed
    *"ok — a deploy is probably still in flight"* on every run. Same shape as
    `check:field-renders` reporting `NO DATA` during an outage: a green that is a statement
    about the guard rather than about production.
  - The clock is now **how long the OLDEST unpublished commit has waited**, from
    `compare/<published>...<main>`, whose `commits` are oldest-first. That number is unaffected
    by later merges, so a busy repo can no longer excuse itself, and the run also prints **how
    many commits behind** production is — which the old output never said.
  - **It fails SOFT, not closed, if the comparison cannot be made**, and that is deliberate: the
    answer is still *"production is behind"*, and refusing to report that would be worse than
    reporting it on the weaker clock. The output names which clock it used.
  - **WHAT WAS STARVING THE DEPLOYS is now cause 1 in the failure message**, because it is the
    one that actually happened and it is invisible from the run list: `deploy.yml` gates every
    step on the SHA still being the tip of main (`tip_early`/`tip_final`), so a merge landing
    during the ~1 minute build makes the **deploy job SKIP while the run still reports
    `success`**. Over 25 consecutive runs: **10 skipped, 10 cancelled while queued**, and the
    last run that actually published was 5 runs earlier. **Read the JOB, never the run** —
    `gh run view <id> --json jobs --jq '.jobs[] | "\(.name) \(.conclusion)"'`.
  - It resolved itself when the merge rate dropped and one build finished before the next merge,
    which is exactly why nobody notices it: the failure is intermittent and load-driven.
  - `SIMULATE_PUBLISHED=<sha>` is the injection hook, and it exists because the healthy state of
    this guard is *"in sync"* — which is also what a broken clock prints, so the stale path
    cannot be exercised without pretending production is behind. Verified against the REAL stall
    (`published=700f125a`): **19 commits behind, oldest unpublished waited 284 min**. The A/B
    that proves the fix is `GRACE_MINUTES=240` — the old clock (newest commit, 191 min) would
    have **passed**, the new clock (285 min) **fails** — with `GRACE_MINUTES=400` passing, so
    the guard is not simply always red.
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
  - **TWO MORE WAYS A RUN GOES MISSING WITHOUT REPORTING A FAILURE, both met on #1229 and both
    the same shape as the cancellation above: `gh pr checks` can only report on runs that
    EXIST.** Neither is a flake to re-run past — each needs a different action.
    - **A PR opened while CONFLICTING gets NO checks at all**, because GitHub cannot build the
      merge ref, and resolving the conflict later does **not** retroactively trigger them —
      only a fresh `synchronize` (a push) does. `gh pr checks` prints *"no checks reported"*
      and **exits 0**, which a waiter loop reads as "nothing pending, therefore done". Wait for
      checks to **appear** before waiting for them to finish, and treat none-ever-appearing as
      its own failure.
    - **A `startup_failure` run has ZERO jobs, so it contributes zero checks** — the PR showed
      **4 passing of the 15 every other PR gets**, with nothing red. `Render guards` had failed
      to start; the workflow file was byte-identical to main's and parsed with all six jobs, so
      it was transient rather than a bad file on the branch. It **cannot be re-run**
      (`This workflow run cannot be retried`), so it also needs a new push.
    - The tell in both cases is the **count**, never the colour. Compare the number of checks
      against a sibling PR before reading green as green, and `gh run list --branch <b>` to see
      whether a workflow ran **at all** — a run that never existed is invisible from the PR.
  - **Comments are stripped before anything is matched**, and that is load-bearing here: both
    workflows now explain this rule in prose that *names* `github.sha` and `github.ref`, so a
    scan that read comments would pass on the strength of an explanation. Same trap
    `check:schema-drift` records from the other side, where prose naming a column failed the
    build.
  - Injection-tested 6/6, listed at the bottom of the script. Case 6 must **pass**: a comment
    mentioning the forbidden `group: ${{ github.ref }}` is documentation, not a regression.
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
**Is the box quiet enough for a browser result to MEAN anything?** `scripts/lib/quiet-box.mjs`
asks before a probe spends anything, and it is the fourth precondition in this family — after
"when is a screen finished", "did the guard read the app" and "can the database answer".
  - **THE RULE EXISTED IN PROSE IN FOUR PLACES AND NOTHING ASKED THE MACHINE.** `check:outage`
    records its `ranks` case reporting **MISSED at load ~450 and CAUGHT at ~260 on the same
    commit**; `check:waypoint-placement` records a profile at ~450 being **off by 4x** *and
    blaming the wrong two suspects*; `check:wp-styles`' cost was quoted at 2m29s against a real
    37s; and memory carries *"browser/build failures = the box is oversubscribed"*. Every one is
    a sentence somebody has to remember, which is the argument this file makes for a script over
    a comment everywhere else.
  - **BOTH DIRECTIONS ARE UNSAFE, which is why it REFUSES rather than warning.** A probe that
    MISSES on a loaded box reads as a live defect and sends somebody to edit correct code. One
    that PASSES can be **vacuous** — `probe-overlay-width-cap` already records that *"a skipped
    overlay is indistinguishable from a passing one"* when nothing settles. A loaded run is
    worthless both ways, so the honest output is no verdict at all.
  - **THE THRESHOLDS COME FROM THIS FILE'S OWN RECORDED RUNS, NOT FROM A BAD NIGHT.** This box has
    **4 cores**, so load-per-core is the meaningful figure: the runs CLAUDE.md calls quiet are load
    **3.8 and 4.7 (~1x)**, and the ones it says invalidated a result are **110, 227, 250, 450 —
    27x, 57x, 62x, 112x**. There is a wide empty band between them. It is quiet at **≤2x**, stamps
    the output between 2x and 6x, and refuses above **6x** — an order of magnitude below the
    cheapest recorded bad run, so it cannot fire on a borderline-fine machine.
  - **SCOPED TO HAND-RUN PROBES, AND CI-NEUTRAL BY CONSTRUCTION.** No workflow executes anything
    under `scripts/oneoff/` — both mentions in `.github/workflows/` are comments — and
    `package.json` names no probe. **Do NOT wire this into a `check:` guard**: a CI runner is small
    and legitimately busy, and a guard that declines to run is a guard you do not have.
  - **WIRED INTO EVERY BROWSER PROBE, AND IT WAS 10 OF 56 FOR TWO WEEKS.** The original scoping was
    *"the ones this file points at as the proof of a claim"* — which is the wrong axis for the
    failure this prevents. A stale verdict does not hurt because CLAUDE.md quotes it; it hurts
    because a session months later runs a probe **by hand** while investigating a surface, reads a
    MISS, and goes off to edit correct code. Whether that probe is cited has nothing to do with it.
    Found by trying to run the sweep: **46 of the 56 then on disk** would have produced a verdict
    at **14.6x**. Quote the guard's own line, not this one — it printed **57** within the hour,
    because another session landed one while this sat in CI (already wired, which is the
    convention holding; the gate is for the one that is not).
    The import goes first (ESM imports hoist, so their order cannot matter) and the
    CALL after the leading contiguous import block — never after *"the last import line"*, which is
    the trap `check:script-roots` records, where a probe's `ENTRY` template literal carries import
    lines far below the real ones. Verified per file: parses, exactly one call, and the call
    precedes `chromium.launch`.
  - **`check:quiet-box-wiring` is what stops that rotting**, and it is a gate rather than a note
    for the reason this file gives everywhere else: the wiring is one call site per probe and one sentence of
    reasoning, and a missing one is **invisible** — the probe runs, prints a verdict, and the
    verdict is wrong in a way that reads exactly like a finding. It does **not** contradict the
    *"do NOT wire this into a `check:` guard"* rule above: that forbids a guard **evaluating the
    load**, and this one only asks whether the CALL IS PRESENT. It never declines anything, and no
    workflow can reach the refusal because none executes `scripts/oneoff/`.
    - Discovery is **behavioural** — a probe that launches a browser, never one whose NAME suggests
      it — the rule `check:overlay-discovery` already pays for.
    - **The sharpest assertion is the one nothing else could make**: the refusal message NAMES a
      probe, and a copy-paste from a sibling makes it name the wrong one. That is silent — the
      guard still refuses, and the message sends the next reader to a file they are not running.
    - **ORDER, not merely presence.** The whole point is to spend nothing on an unbelievable run,
      so a call placed below `chromium.launch` still refuses — after paying for Chrome, and on
      several of these a dev server and an esbuild bundle too.
    - Full-line comments are **masked before counting**, because this guard's own failure message
      prescribes `assertQuietBox("probe-x.mjs");` and a probe quoting that repair in its header
      would read as calling it twice — a guard failing on its own documentation, the trap
      `check:ci-cancel` records. Full-line **only**: these probes are full of `https://localhost`,
      and a mid-line strip is how the offsets-preserving blanker once ate 21% of a file. The
      residual (a call quoted in a TRAILING same-line comment) is stated in the source.
    - Fails **closed** four ways, each of which otherwise prints the same clean line as a clean
      tree: `scripts/lib/quiet-box.mjs` missing, that module no longer exporting `assertQuietBox`
      (with which every probe's import is dead while every call still parses), an unreadable
      directory, and fewer than 40 browser probes discovered.
    - Injection-tested **7/7** (`scripts/oneoff/inject-quiet-box-wiring-cases.mjs`), each case
      proving its edit landed **by checksum**, restoring the file byte-identically, and judged on
      the guard's **own FAIL lines** — never the word *"FAIL"*, which this guard's prose contains.
      The harness refuses any expectation that already appears in the healthy run. Case 1 is the
      real historical state of 46 files. **Two must stay SILENT**, and the comment one is proven
      load-bearing by A/B: with the mask neutered **exactly that case flips** and the other six are
      unmoved.
    - **`check:injection-anchors` READS 6 OF THE 7, and that was checked rather than assumed** —
      A/B by removing the suite: 97 → 96 suites, 650 → 644 cases. The seventh (`call-after-launch`)
      moves a line rather than replacing one, so it declares no anchor that guard can resolve. It
      is not unwatched: its edit returns the source **unchanged** if its string rots, and the
      harness reports that as `HARNESS BUG — the edit changed nothing` and exits 1. Worth stating
      because *a suite's own SHAPE decides whether its anchors are checked at all*, and this file
      already records a suite whose four anchors were silently UNPARSED while it printed 8/8.
  - **`--anyway` (or `QUIET_BOX=0`) runs regardless and STAMPS the output** *"NOT EVIDENCE"*, so a
    forced run cannot be read back later as a clean result. An override that left no trace would
    just move the defect into the transcript.
  - **`box` is a TEST SEAM** — the `--fixture`/`--known` idiom — because two of the three branches
    could otherwise only be exercised on a quiet machine, which is exactly the machine this repo
    does not reliably have. All five branches are proven: quiet, degraded-stamp, unknown-load
    (fail-OPEN, since a platform that cannot report load must not block everybody), forced, and the
    real refusal.
  - **WHAT IT DOES NOT DO**: it says nothing about whether a probe is correct, only whether this
    machine can produce a believable answer. And **the whole browser corpus remains UN-SWEPT** — #1678
    swept the 100 static one-offs and #1695 the 210 DB-reading ones, and neither could reach a
    browser probe. Attempted again 2026-09-23 at **14.6x oversubscribed** and refused, which is the
    guard working rather than a setback: the two previous sweeps each found probes that were red
    and **not one was an app defect**, so a sweep run at this load would produce exactly that
    reading list with no way to tell it from a real one. *Sweep them from a quiet box; the refusal
    is what stops that run being wasted.*
  - **THE RUNNER FOR THAT SWEEP IS `scripts/oneoff/run-browser-probe-sweep.mjs`**, so the next
    quiet box does not start from nothing. It exists as a script rather than a shell one-liner for
    three measured reasons: it **DERIVES** its list behaviourally (the first attempt carried a hand
    list that was wrong in both directions — 7 entries launching no browser, and stale the day
    probe #57 lands); it **refuses the box itself**, because a sweep is where a loaded run does the
    most damage, arriving as one unbelievable verdict per probe formatted as a reading list; and macOS has
    **no `timeout(1)`**, which made the first static sweep return exit 127 for all 77 — a uniform,
    plausible, catastrophic-looking result that measured nothing, so each probe gets its own
    watchdog. `--dir` is a test seam: all **five** verdict branches (PASS/FAIL/TIMEOUT/BROKEN/
    REFUSED) are proven against a fixture of one-line probes, which is the only way to exercise
    them without making the very run this refuses.
    - **ITS FIRST REAL RUN DEFEATED ITSELF, AND THE RUNNER REPORTED THE WRECKAGE AS FINDINGS.**
      A sweep of browser probes **IS** the load: each spawns a dev server and a Chrome, so the box
      went from **1.0x at probe 1 to 8.6x by probe 16**, after which every probe hit its own
      refusal. The runner classified by **exit code**, and `assertQuietBox` exits 1 — so **42 of
      the 45 "FAIL"s were refusals**, i.e. precisely the reading list of non-findings this whole
      mechanism exists to prevent, manufactured by the tool built to collect it. *A refusal is the
      ABSENCE of a result, never a result* — and an exit code cannot tell the two apart.
    - Fixed two ways, both needed. The runner **waits for the box to come back under `QUIET_X`
      before each probe**, so a sweep paces itself instead of eating its own threshold; and a
      refusal is now its own verdict, **retried** rather than recorded, with the summary saying
      outright that any survivor is not a finding.
    - **The honest yield of that first partial run: 12 pass, 3 real failures, 42 refusals.** One of
      the three is a setup fact rather than a finding — **7 browser probes expect a dev server on
      `localhost:5199` and NOT ONE of them starts it**, so they die on `ERR_CONNECTION_REFUSED`
      unless something else is already serving. Start one before sweeping; the other 38 spawn their
      own.
    - **The two real failures are BOTH STAMPED `DEGRADED BOX`, so neither is attributable** — and
      the stamp is the mechanism working mid-sweep, since the load was already climbing when they
      ran. Recorded as read, not as diagnosed: `probe-a-real-profile-seen-by-a-real-climber` fails
      **3 of 14** assertions, all one cascade (the owner is not listed as a friend, so the row
      cannot be tapped, so no profile dialog opens) at 2.0x; `probe-dead-controls-overlays` dies on
      `page.evaluate: Execution context was destroyed, most likely because of a navigation` at
      2.4x, which is a probe-side race of exactly the kind a loaded box produces. **Re-run both
      alone on a quiet box before believing either.**
    - **AND THE SWEEP IS RESUMABLE, BECAUSE WAITING FOR A QUIET HOUR IS NOT A STRATEGY ON THIS
      BOX.** Measured 2026-09-24 with a watcher armed to fire at `QUIET_X`: it waited **52
      minutes**, fired at **1.8x**, got **ONE probe through in 78s**, and the box was back at
      **76-97x by the second** — so probes 2-6 refused through every retry and a reboot ended the
      run at 6 of 57. The windows here are a probe long, not an hour. So each run **banks** what it
      managed and the next continues; a run now costs whatever quiet it finds instead of needing a
      window this machine does not produce.
      - **A REFUSAL IS NEVER BANKED**, which is the same principle the summary already encodes:
        persisting one would convert *"we could not look"* into *"we looked"*, arriving through
        the state file instead of the tally. Only PASS/FAIL/TIMEOUT/BROKEN are results, and the
        cumulative line reports the remainder as **UNRESOLVED** rather than folding it into a
        pass rate.
      - Banked **after each probe**, not at the end — the run this was written for died to a
        reboot. A state file that will not parse is **reported and ignored**, never guessed at.
      - `--fresh` ignores the bank. All of it is proven against the `--dir` fixture: bank, resume,
        retry-a-refusal, `--fresh`, and the corrupt-state path.
    - **IT ALSO PRINTED A VERDICT IT DID NOT RECORD.** The row was built from the FIRST attempt
      while the tally used the LAST, so a probe that refused and then passed on retry printed
      `REFUSED` and counted as `PASS` — a row disagreeing with the summary it is part of, which is
      `check:count-matches-its-list`' subject arriving in a guard's own output. Latent in the run
      that exposed it, because every retry there also refused. Proven by A/B: revert the one
      variable and the fixture prints `REFUSED` above `3 pass`.
    - **The sweep is STILL not complete** — 1 of 57 has a result. It now accumulates rather than
      restarting, so the remaining 56 are a matter of runs rather than of one improbable window.
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
