# Database, migrations and git history

Guards over the schema, RLS, stored functions and history: rls, migration claims, approve_new_route, function and column drift, route counts, silent reverts.

Part of the guard notes — see [README.md](README.md) for the full index.

- **`audit:silent-reverts`** asks the question `check:merge-survival` structurally cannot: **did a
  SQUASH silently delete what an earlier PR added?** **It RUNS on every push to main now**
  (`.github/workflows/silent-reverts.yml`), which it did not for most of its life — see the
  wiring note at the end of this entry. That guard interrogates a **merge commit** —
  *"every identifier either parent introduced survives"* — but PRs here land as **squash** merges,
  so main's history contains no merge commit for them and the guard never runs on the thing that
  actually ships. The recorded incident is exactly that shape: **#778** added a resolver plus three
  fixes, **#776** was branched from *pre-#778* main, and its squash **reverted all of it** — clean
  merge, no conflict, every check green, and main went back to shipping the bugs. Report-only,
  read-only on git; **not a build gate**, because it is a property of HISTORY rather than of the
  checkout, so no code change can cause or fix it (the reasoning that keeps `check:counts` out).
  - **TWO SESSIONS WIRED IT WITHIN THE HOUR AND BOTH MERGED**, so for a while every push to main
    ran the same audit twice (#1288 `silent-reverts.yml`, #1290 `silent-revert-check.yml`).
    Consolidated into one workflow (#1321), then **corrected by #1328 — and the correction is the
    part worth reading, because the first consolidation kept a redundancy on a claim that was
    wrong.** #1321 ran BOTH flags, arguing they *"failed on different halves and neither is a
    superset"*. That is false: `--fail-on-silent` also fires on a SILENT definition removal, and it
    is tested **before** the `--fail-on` block, so a non-empty `silentKinds` exits there first and
    the `--fail-on` comparison is unreachable. Measured on the real incidents rather than argued —
    `--fail-on-silent` **alone** exits 1 at `2bd9a5d` (#1267, four reverted flags, **no files
    deleted at all**, verified with `git show 2bd9a5d --diff-filter=D`), exits 1 at `68bb307`
    (#1248, four files across three commits) and exits **0** on healthy main. One flag, both
    incidents. See [[parallel-sessions-cause-redundant-prs]] — and note the shape: *"neither
    subsumes the other" is a control-flow claim about the script, so read the script rather than
    reasoning from what each flag is named for.*
  - **IT NOW RUNS ON EVERY MERGE (`.github/workflows/silent-reverts.yml`), and until then it ran
    when somebody REMEMBERED — which is how three of these shipped in a single day.** #1248 dropped
    two outage flags belonging to #1239; #1253 restored them; #1267 dropped four, three of them the
    same ones, **57 minutes later**. Every one was found by hand. Same lesson `check:overlay-scroll`
    records: *a guard that runs only when somebody remembers is a guard you do not have.*
    - **On PUSH, not on a pull request**, because a stale-base squash is created **by the merge**:
      the branch's copy of a dense line is the old one, git resolves the line in its favour, and an
      earlier PR's additions vanish. Nothing about the branch in isolation is wrong, so a
      `pull_request` run has nothing to see. It gates nothing — the merge has already happened;
      going red *is* the mechanism, and it lands on whoever merged, which is whoever caused it.
    - **`fetch-depth: 0` is not a nicety.** The default depth of 1 makes this audit **vacuous
      rather than merely limited**: its subject is history, so a one-commit clone gives it one
      commit to walk and it reports a clean tree having examined nothing.
    - **IT WAS WIRED TWICE, BY TWO SESSIONS, AND BOTH RAN ON EVERY MERGE.** `silent-reverts.yml`
      (`--commits 120 --fail-on outage-flag`) and `silent-revert-check.yml`
      (`--commits 80 --fail-on-silent`) asked one question with two runners and two similarly-named
      checks, and a reader had no way to know they were the same thing. They were **not**
      complementary, and the proof is control flow rather than a measurement: `silentKinds` is only
      added to inside the same `if(!deliberate)` branch that increments `silent`, and
      `if(silent) GATE.push(…)` runs **before** the `--fail-on` block — so a non-empty `silentKinds`
      always exits under `--fail-on-silent` first and the `--fail-on` comparison is **unreachable**.
      `--fail-on-silent` also gates on the multi-commit file fingerprint, which `--fail-on` never
      does. So it is strictly broader in kind; the only thing the other file had was the **larger
      window**, and that is what survives the merge. One workflow now: `--commits 120
      --fail-on-silent`, no `npm ci` (the script shells out to git, so it keeps working when the
      build is broken — which is when a bad merge is most likely to have landed).
    - **`--fail-on outage-flag` is still supported and is what to reach for by hand**, because the
      default stays report-only and that is deliberate — over 500 commits every hit of the file rule
      has been a **promotion** and every generic-token finding a supersession or a rename, so
      failing on those would make the audit argue with correct work. `outage-flag` is the one class
      with a different **measured** precision: 3 for 3 genuine reverts, and **0 findings across 300
      first-parent commits** of a healthy tree. Proven in both directions before shipping — exit 0
      on today's main at 120 commits, exit 1 on `--ref 2bd9a5d` naming the kind, and exit 0 there
      **without** the flag, so the documented report-only behaviour is unchanged.
    - **The window must reach the ADDING commit or a clean result means nothing** — the trap this
      entry already records, where `--commits 6` reported clean on an incident `--commits 10`
      caught. A stale branch can be weeks old: #1238's flag was added **30** first-parent commits
      before the merge that dropped it. 120 costs seconds, because presence is one pass over the
      checkout.
  - **VALIDATED AGAINST THE REAL INCIDENT, NOT A SYNTHETIC ONE.** Pointed at `53d563e` (#776's
    commit) with a 3-commit window it reports **`crewMemberById` and `crewMemberUids`, added by
    #778, removed by #776**, both classified SILENT. That is the strongest form of proof available
    for a detector whose healthy output is "nothing found": it reproduces a defect that genuinely
    happened, from history, with no injection.
  - **AND THE FIRST DRAFT COULD NOT HAVE CAUGHT IT — only that validation showed why.** The patterns
    tracked `export function` / `export const` / `package.json` entries, while #778's resolver was
    `const crewMemberById=useCallback(function(id){…})` **inside the App component** — not exported,
    not top-level. Every pattern walked straight past the one thing that was reverted. A
    component-scoped helper is *precisely* what a stale-base squash drops, because it is the kind of
    thing one PR adds and another's copy of the file never had. `hook-const` and a capitalised
    `fn-decl` were added for that reason.
  - **A REMOVAL IS NOT A DEFECT**, and that separation is the whole design — code is deleted
    deliberately all the time, and an audit reporting every deletion is noise nobody reads. It asks
    whether the removing commit was **about** the thing: named in its subject → *deliberate*; gone
    in a commit about something else → **SILENT**, which is the shape worth reading.
  - **Two presence backends, and the fast one is only correct when the checkout IS the ref.** Reading
    the tree from disk is one pass; `git show` per file was ~1,500 subprocesses and took minutes.
    Pointing it at any other commit falls back to `git grep` at that sha — slower, and how the
    historical validation is possible at all. It **fails closed** if the checkout does not match the
    ref (presence tested against the wrong tree reads as a revert that never happened) and if the
    grep backend finds nothing at all.
  - What it does **not** prove, stated in the script rather than implied: that no *behaviour* was
    reverted. It tracks named definitions, not function bodies, so a merge that keeps a name and
    drops its guard clause is invisible here — `check:correction-readers` exists for that shape.
  - **IT ALSO TRACKS WHOLE FILES, and until 2026-08-26 it did not — which is how it missed the
    biggest instance of the thing it exists for.** `#1248` merged from a stale base and **deleted
    four files belonging to three merged PRs** (#1244, #1239, #1240), *and* reverted #1239's live
    app fix — and this audit printed `0 of them are ABSENT at HEAD`. Every pattern matches a NAMED
    DEFINITION, and a deleted file only leaves one behind if it happened to **export** something.
    Neither deleted waypoint-repair script does: one is top-level statements, the other's helpers
    are lowercase and unexported. **The blindness scaled with how ORDINARY the file was**, which is
    the worst direction — a script that exports nothing is the kind this repo writes most of.
  - **VALIDATED AGAINST THE REAL INCIDENT, not a synthetic one.** `--ref 68bb307 --commits 12`
    reports all four deleted files, each attributed to #1248 and each named with the merged PR that
    added it. Same standard the definition half already meets by reproducing #776.
  - **The file rule needed a discriminator, because on subject matching alone its precision is 0%.**
    Over 500 commits it reports **7 files and all seven are PROMOTIONS** — a one-off probe becoming
    a named guard (`measure-horizontal-overflow` → `check:overflow`, `probe-trailhead-vs-logistics`
    → `audit:trailhead-agreement`, `probe-signed-in-db-failure` → `check:outage`, and four more). A
    detector whose every hit is correct work is one people learn to ignore.
    - The discriminator is **structural, and deliberately NOT a similarity test** — the entry above
      records why that would have excused #776. **A promotion removes ONE file, added by ONE earlier
      commit; a stale-base squash removes SEVERAL, added by SEVERAL DIFFERENT PRs**, because it is
      carrying a whole old tree forward. Measured both ways: none of the 7 promotions trips it,
      #1248 trips it with 4 files from 3 commits.
    - It is **emphasis, never suppression**. Single-file removals are still printed in full, and the
      run still exits 0 — a removal is not a defect, and going red on a promotion would make the
      audit argue with correct work.
    - **THE CONSOLIDATION ESCAPE DEPENDS ON THE COMMIT MESSAGE, AND ON 2026-09-09 THAT PUT MAIN RED
      FOR THREE HOURS AND SIX MERGES.** The rule already excuses a commit that NAMES every file it
      removes, on the stated reasoning that *"a consolidation names them because that is what its
      commit message is FOR"* — so a consolidation that does **not** name them is indistinguishable
      from a stale-base squash and trips the gate. **#1677 is that case**: it promoted six
      `scripts/oneoff/` unit probes into `check:units` (852 lines, wired in `package.json` in the
      same commit) and its message names **one** probe — the Chrome-driven one it KEPT. Every push
      after it went red on a workflow whose own header exists to stop a red landing on *"whoever
      merged next, which is whoever caused it"* — produced by the workflow, on six authors who had
      not caused it.
      - **It would not have cleared on its own.** The six adding commits sat at depth 8, 14, 30, 90,
        107 and 117, and the fingerprint needs only **two** to survive — so it persists until the
        shallowest leaves the 120-commit window, i.e. ~112 further merges.
      - **`REVIEWED` is the escape for a commit already merged**, keyed on the **FULL sha** so an
        entry can never reach a commit that has not happened yet. It **suppresses the gate and not
        the row**: the finding still prints with its reason, because this rule is documented as
        *emphasis, never suppression* and a reader who cannot see what was excused cannot check it.
      - **An entry matching nothing is PRINTED AND NOT FATAL — a deliberate departure from this
        file's own "a stale entry FAILS" idiom**, and the exception is worth reading before copying
        either way. That idiom exists because a rotted declaration silently **excuses** something;
        this one cannot, since it names one immutable sha and is inert the day its finding stops
        being reported. What made a fatal version actually **wrong** rather than merely strict is
        the **window**: run by hand at `--commits 20` the adding commits are out of frame, the
        finding is correctly not reported, and a fatal rule then fails a **clean tree** for
        bookkeeping. *"Not flagged"* and *"not in frame"* are indistinguishable from inside the
        audit, so it says so rather than gating on it.
      - **THE DURABLE CURE IS NOT THE MAP: name the files you delete in the commit message** and the
        existing escape fires with no bookkeeping at all. The failure message now says so — it
        printed the findings and **no repair**, which is the `check:column-drift` lesson (*it fired
        correctly and prescribed the wrong repair*) in its harsher form, since the likeliest correct
        answer here is the one a reader is least likely to reach for while looking at a message
        about reverts. Three causes now, in likelihood order, with the promotion case second.
      - Injection-tested **4/4** (`scripts/oneoff/inject-reviewed-gate-cases.mjs`), each case proving
        its edit landed **by checksum** and restoring the file byte-identically. **The BASELINE case
        is the load-bearing one** — this map makes a *passing* run the interesting one, so a suite
        that only proved the gate can fail would say nothing about it. `entry-gone-gate-returns` is
        the non-vacuity case, and `unmatched-entry-is-not-fatal` pins the paragraph above. The
        harness refuses any expectation that already appears in the healthy run, the structural form
        of a mistake this repo has made twice.
      - Cases run at **`--commits 40`, measured rather than assumed**: three of the six adders sit
        inside it, so *"several files added by several different commits"* still reproduces at a
        third of the cost. If it stops reproducing, widen the window before believing the guard
        changed.
  - **IT TRACKS `.yml` NOW, AND NOT DOING SO WAS A HOLE IN ITS OWN SUBJECT.** The extension list was
    `jsx|mjs|json|sql`, so a merge deleting a **workflow** was invisible — and CI wiring is the one
    kind of loss that reports nothing by itself: a guard whose workflow vanishes does not go red, the
    PR check list merely gets shorter, and `check:ci-cancel` already records that *the tell is the
    COUNT, never the colour*. Not hypothetical: `silent-revert-check.yml` was **added (#1290) and
    deleted (#1321) inside this audit's own 120-commit window**, and the audit — running on every
    merge, over that exact window — reported nothing either time. **It could not see its own sibling
    workflow disappear.**
    - Measured before widening, over ALL first-parent history: **10 `.yml` added, 1 absent**, and it
      classifies SILENT because #1321 names the workflows it consolidated by PR number rather than by
      filename. One extra printed row, **zero** extra gate trips — a single-file SILENT removal does
      not trip `--fail-on-silent`. What WOULD trip it is the case worth catching: a stale-base squash
      carrying a workflow away alongside files from other commits, the #1248 shape with CI wiring in it.
    - **The stronger version — tracking individual JOBS — was measured and REJECTED.** Across 46
      commits touching `.github/workflows/`, exactly two jobs have ever been removed (`reverts`,
      `signed-in`) and **both are named in their own commit subject**, so a detector would report 2
      findings and 0 real. A 2-space YAML key is not specific to a job either: `push`,
      `workflow_dispatch` and `group` sit at that indent, and two of the four keys the scan found were
      `on:` entries. Re-measure before re-deriving it.
    - **A COUNT FROM THIS AUDIT IS A STATEMENT ABOUT A WINDOW.** The before/after looked like 158
      files added then 179 — twenty-one more, against the two `.yml` the window actually holds. The
      window had **slid fourteen commits** between the two runs and that slide is the whole
      difference. Hold the ref fixed, or compute the delta with `git log --diff-filter=A` over one
      range.
  - **A RENAME IS NOT A DELETION.** Additions are detected by git's `new file mode` marker, which a
    rename does not carry, so a moved file is never recorded as added and can never be reported as
    gone; the removal lookup also passes `-M --name-status` so an `R` reads as a rename. This repo
    renames guards (`check-rappel-readers.mjs` → `check-correction-readers.mjs`, #926).
  - **500 COMMITS DEEP: 4 absent, 3 flagged SILENT, and NONE is a defect — the precision is recorded
    rather than tuned away.** `activeCrewMemberIds` was **#776's own** local helper, dropped by #826
    when it restored the resolvers #776 had reverted; `listSlug` was consolidated into
    `routeInList` by #789 (*"One list vocabulary, not two"*), still guarded by `check:route-tags`,
    120 assertions green; `check-rappel-readers.mjs` was **renamed** to `check-correction-readers.mjs`
    by #926; `BivyPanel` was correctly classified deliberate and re-mounted. Four items across 500
    commits is a reading list, not noise — the point is that each is settled in a minute.
  - **IT HAPPENED AGAIN ON 2026-08-26, THIS AUDIT REPORTED `0`, AND THAT IS WHY IT NOW HAS AN
    `outage-flag` PATTERN.** #1239 shipped `filedReportsUnavailable` and `catchesUnavailable` at
    10:17; **#1248 merged 57 minutes later from a branch based before it and removed both** — plus
    `CatchLedger`'s matching prop and #1239's own probe file. #1248's subject and body are entirely
    about milepost clustering in `audit:trailhead-road` and never mention the app. Restored by
    cherry-picking #1239 onto main.
    - **Every pattern above walked past it, for a reason worth stating precisely:** an
      `xUnavailable` flag is not exported, not top-level, and not a `useCallback`/`useMemo`. It is
      declared **mid-declarator** on a dense line —
      `const myFiledQ=useMyFiledReports(!!uid),filedReportsUnavailable=!!(uid&&myFiledQ&&myFiledQ.isError),…`
      — so no start-of-line anchor can reach it. This is the audit's own header's point (*"a
      component-scoped helper is exactly what a stale-base squash drops"*) landing on a shape its
      patterns could not express.
    - **NOTHING ELSE COULD SEE IT EITHER, because the revert was internally CONSISTENT**: the
      component lost `unavailable` from its signature *and* the call site lost the argument, so
      `check:dead-props` stayed green, the screen still rendered, and the only symptom is a
      sentence that is false exactly when nobody is looking. That consistency is the general reason
      a stale-base squash is invisible — it reverts a whole change, not half of one.
    - **Worth its own pattern rather than a general widening.** These are the most collision-prone
      declarations in the repo right now: **11 of them, added across ~6 PRs by parallel sessions
      all editing the SAME two dense lines** in `ClimbMatch.jsx`. Measured for noise before
      shipping — against #1239's diff it finds precisely the two reverted names, and across **150
      first-parent commits it adds 0 findings** (114 tracked, 0 absent). `<noun>Unavailable` is an
      established convention, so this is a named class rather than the haystack the header warns
      about.
    - **Validated against the real incident**, the standard this audit already sets: pointed at
      `68bb307` with a 10-commit window it names both flags, the PR that added them and the PR that
      removed them, classified SILENT. A 6-commit window reports clean — **the window has to reach
      the ADDING commit**, which is the operational trap when using this audit to check a suspicion.
  - **THE OBVIOUS TIGHTENING WOULD HAVE EXCUSED #776 ITSELF, so it was measured and REJECTED.** All
    three false SILENTs look like supersessions, which suggests excusing a removal when the same
    commit ADDS a token sharing a significant word (`listSlug`→`routeInList` share *list*;
    `check-rappel-readers`→`check-correction-readers` share *readers*). But **#776 removed
    `crewMemberById`/`crewMemberUids` and added `activeCrewMemberIds` in the same commit** — sharing
    *crew* and *member* — so that rule would have labelled the one real incident a rename and said
    nothing. A detector tightened until its healthy output is empty is one that no longer fires.
  - **IT RAN NOWHERE UNTIL 2026-08-26, and the day it was wired is the argument for wiring it.**
    On that one day: `#1248` removed four files and two flags belonging to three merged PRs,
    `#1267` removed four more flags (restored by `#1277` an hour later), and `#1249` changed a
    timeout back that nothing noticed for hours. Every one was found by a person happening to
    look — the #724 shape exactly, where `check:overlay-scroll` had gone red on main and nobody
    knew because nothing ran it.
    - **PUSH-triggered, not scheduled, unlike the other drift workflows.** Drift in a database
      appears at an unknown time, so you poll. A silent revert appears at a KNOWN one — the merge
      — and the useful report names that merge while its author is still around. A schedule would
      tell you tomorrow morning.
    - **`--fail-on-silent` is OPT-IN, so the report-only contract is untouched.** Run by hand it
      still exits 0 for any finding and 1 only for a broken scan. The gate is deliberately
      narrower than "any SILENT row" and reuses the audit's own two discriminators: a SILENT
      **definition** removal, or one commit removing files added by **several different** commits
      (the stale-base fingerprint). A **single-file** removal never trips it — over 500 commits
      every hit of that rule was a PROMOTION, and a gate that argues with correct work is one
      people learn to ignore.
    - Proven against the real history rather than a fixture, both ways: `--ref 2bd9a5d --commits 40`
      exits **1** naming 4 reverted definitions, `--ref 68bb307 --commits 12` exits **1** naming
      `68bb3074 removed 4 file(s) added by 3 different commits`, current main exits **0**, and the
      same #1267 window WITHOUT the flag exits **0**.
    - **`fetch-depth: 0` is load-bearing and the script now enforces it.** `actions/checkout`
      defaults to depth 1, so the audit would walk ONE commit, find nothing missing and report
      green having asked almost nothing — a fail-open introduced BY the wiring. A walk shorter
      than `--commits` is a note by default and **fatal** under `--fail-on-silent`.
    - **80 commits, because the window must reach the ADDING commit.** #1239 was reverted 27
      commits later; a 12-commit window reports that exact history clean. Measured across nine
      12-commit windows of recent history: 0 findings, i.e. a short window is quiet *and blind*.
- **`check:migration-replay`** asks whether `supabase/migrations/` rebuilds an **empty** database —
  what a Supabase preview branch does on every migration PR since the GitHub integration went on
  (2026-09-26) — and, with `--compare-live`, whether what it builds **is the live schema**.
  Hand-run (~30s, PGlite WASM, no Docker), because it only matters for a change under `supabase/`.
  - **The first PR that added a migration after the integration went on (#1992) failed "Supabase
    Preview" in 13s, and the preview's logs are not reachable from a session.** This replay is how
    the cause was found, and it was not one cause but five, each of which reads as fine on production
    because production applied these files BY HAND, in its own order, around columns made in the SQL
    editor: 13 numbers shared by 28 files (the tracking table's primary key refuses the second);
    data files writing columns that never existed (`routes.updated_at`, `routes.state`, `route_id`)
    or not SQL at all (`alpine_draws = [object Object]`); a grant naming a signature that never
    existed, so **0037 never created `climb_logs`** and everything after it cascaded; catalog
    inserts whose parents only an import creates; and two columns plus four indexes made by hand.
    All repaired 2026-09-30, each with a `REPLAY NOTE` in the file saying what and why.
  - **The duplicates were RENUMBERED, not grandfathered**, reversing `check:migrations`' original
    call ("renumbering applied migrations churns history to no benefit"). The integration is the
    benefit: a shared number went from a documentation problem to a hard failure. Each group became
    NNNN0, NNNN1, … in filename order (5 digits, so the order holds under BOTH filename sort and
    version-string sort); production's history was re-recorded to match. `check:migrations`,
    `check:migration-claims` and `check:trust-breakdown` accept 4 or 5 digits; the baseline is empty.
  - **`--compare-live` is the real claim.** A replay that succeeds into the WRONG schema is not a
    rebuild. It diffs columns (with type and nullability), tables/views, functions, policies,
    triggers and indexes. That is what caught `rack` coming out `jsonb` (0043 added it before 0050
    could, the reverse of production's order) and 0134's duplicate `lists` index that production
    had dropped. First clean run: 560/560 columns, 49/49 relations, 130/130 policies, 33/33 triggers,
    136/136 indexes; the one difference was another session's `withdraw_inquiry()`, applied live
    before its migration merged — which is exactly what "live only" is for.
  - **What it cannot see:** it stands in for Supabase's `auth`/`storage` schemas, roles and realtime
    publication with minimal copies, so a migration depending on a Supabase-internal object it lacks
    fails here and not on a preview (fix the stand-in, not the migration). And it cannot see DATA:
    catalog data files are no-ops on an empty database by design.
  - **Injection cases (run 2026-09-30):** a migration writing a nonexistent column → FAILED at that
    file; a second file taking an existing number → FAILED; the clean tree → pass.
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
  - **It used to fail EVERY open PR, and that sentence above was describing an intention the
    code did not implement.** `openPrMigrations()` reads `/pulls?state=open` and compares every
    claim against every other with **nothing referencing the PR being built** — so a collision
    between two other people's branches turned your unrelated PR red. Observed on **#1023**, an
    accessibility fix adding **no migration at all**, red because #1016 and #1022 both claimed
    `0153`; every other open PR was red for the same reason.
    - That is exactly the objection this file uses to keep `check:counts` **out** of the build —
      *"whoever caused it is not who sees red"* — and the natural reading of a red check on your
      own PR is that you broke something. It was survivable only because `build` is the sole
      **required** status check, so the red was noise rather than a gate.
    - Now scoped: the run fails for a collision **this PR is party to**, and a collision between
      other PRs is **printed and not fatal**. Scoping the failure must not become hiding the
      finding — the two PRs that actually clash each go red on their own runs, which is what the
      sentence above always claimed. The PR number comes from `GITHUB_REF`
      (`refs/pull/N/merge`), falling back to the event payload; Actions sets it on every
      `pull_request` run, so no workflow change was needed.
    - **With no PR context at all — a local run — every collision is still fatal.** That is the
      right default for a hand audit and it preserves the behaviour anyone has relied on.
    - `--self=N` stands in for that context so the scoping is injection-testable without
      opening pull requests. **The (a)/(c) pair is what makes the test meaningful:** an
      always-pass implementation satisfies "unrelated PR passes" on its own, and an always-fail
      one satisfies both "a party fails" and "the hand audit fails". Only the pair pins it.
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
- **`check:rls`** guards three database-security invariants that were each broken in production,
  and which **58 existing guards could not see** — not one of them was about RLS. All six defects
  the 2026-08-19/20 audit found were on tables holding **zero rows**: a policy that has never been
  asked to refuse anything has never been tested, and 21 of the 32 tables `lib/db.js` writes were
  in that state. Static (migration files only — no DB, no network), so it sits in `npm run build`.
  - **Rule 1 — a self-comparison inside a policy (`0163`).** `0042` wrote
    `exists (select 1 from crew_members m where m.crew_id = crew_id ...)` meaning
    *`crews_messages`*`.crew_id`. The subquery selects **from `crew_members`**, so the bare name
    binds to the **inner** table and Postgres stored `m.crew_id = m.crew_id` — true for every row.
    The membership test collapsed from "a member of THIS crew" to "a member of ANY crew", so any
    confirmed member could post into any crew's chat. The SELECT policy two lines above qualified
    its column and was correct, which is why **reads were scoped and writes were not**. The rule is
    precise rather than heuristic: `alias.col = col` never means anything, so there is no correct
    code it can flag.
  - **Rule 2 — a `SECURITY DEFINER` function that does not list `pg_temp` (`0171`).** 14 were
    wrong, and **seven of those said `set search_path = public`, which READS AS PINNED AND IS
    NOT** — Postgres searches the temp schema **first**, ahead of everything in `search_path`,
    whenever `pg_temp` is not itself named. `handle_new_user` was in that false-comfort group.
    Injection case 3 exists for exactly this half, because a first draft only tests for *absent*.
  - **Rule 3 — a table that never enables RLS.** No defect found (all 39 were enabled), but the
    anon key ships in the bundle, so a table without RLS is world-readable. Cheap to assert,
    unrecoverable to miss.
  - **End-state REPLAY, never a syntax lint.** Most `create function ... security definer` in these
    files set no `search_path`, because `0171` pinned them with `ALTER` afterwards — a rule
    demanding the setting inside each `CREATE` would fail ~17 correct historical migrations, the
    [[a-new-gate-breaks-work-already-in-flight]] trap. Every rule replays all files in order and
    judges each object's **final** state, the technique `check:approve-route-columns` already uses.
  - **It went BLIND to 35 policies in draft and still printed `ok`** — including the two it exists
    to protect. Migrations are written `drop policy if exists "x"; create policy "x"`, and the
    first version collected every CREATE and *then* applied every DROP, so the drop deleted the
    policy the file had just rewritten. Events are now applied **in statement order**. Nothing
    about the run looked wrong; it was caught only by diffing the parsed set against `pg_policy` on
    the live database — **79 parsed against 114 live**. Now 122 = 114 public + 8 `storage.objects`,
    with **zero** live-but-unparsed. Re-run that diff after any change to the parsing.
  - A dropped table takes its policies with it, or the guard keeps checking policies on tables
    nobody can fix (measured: `account_links` kept two after #1141 removed account linking).
  - Fails **closed** three ways — zero tables, zero policies or zero definer functions parsed are
    each reported as a broken scan, never a clean tree. `RLS_EXEMPT` is empty today and a **stale**
    entry fails in both directions.
  - **The live-catalog version of this check cannot run in CI**, which is why it is static:
    PostgREST does not expose `pg_catalog`, and this repo's rule is that CI never holds privileged
    credentials. Catching the shape where it is *written* is better than catching it in the
    database a day later anyway.
  - Injection-tested 6/6, listed at the bottom of the script. Case 1 is the real historical defect,
    reproduced by un-qualifying `0163`.
- **`check:catalog-duplicates`** asks whether the catalog can gain a **duplicate route** again, and
  whether one already has. Built 2026-09-25 after `import-route-grades --create-areas` filed MP's
  `North Cascades › Mt. Baker` beside our `Bellingham and Mt Baker Hwy › Mount Baker` (~225 copy
  areas, 27 states; cleaned by 0213/0215/0217). The user: *"make sure the duplicate routes don't
  happen again"*. **Hand-run, not in build** — a property of the DATABASE, not the checkout (same
  reasoning as `check:counts`). Two halves:
  - **The refusal is still there.** `trg_refuse_duplicate_area` / `trg_refuse_duplicate_route`
    exist, are enabled, BEFORE, and fire on **INSERT and UPDATE** (0216 was INSERT-only; 0218 adds
    moves and renames). Read through `supabase db query --linked` — a worktree needs
    `supabase/.temp` symlinked, or it exits 2 with that instruction.
  - **None got past it.** Two routes in ONE area with the same `route_name_key` (0219),
    placeholders excluded — against a LIST in `scripts/data/catalog-duplicates-baseline.json`,
    never a count (a count holds level when one is fixed and another lands). Routes have no
    `created_at`, which is why it is a list at all.
  - **The first key was WRONG for routes, and reading the groups is what showed it.** Version 1
    used 0214's `catalog_key`, built for AREA names: it drops "ice", "route", "area", "and" and
    every mark. It listed 48 groups; read one by one, **43 were different climbs** — boulder
    variants named by primes ("Problem A" / "A'" / "A''"), "Apron" M5 / "Apron Ice" WI3,
    "Spray" 5.11 / "Ice Spray" WI4, "Grand Slab" / "Grand Slab+". So the TRIGGER would have refused a
    climber's real "Problem A''". 0219's `route_name_key` keeps those words and the trailing
    variant marks; 14 groups remained, **5 were one climb twice and were merged (0220)**, and the
    rest differ in grade or discipline ("5.12 Face" trad 5.12c/d vs sport 5.12a, "Charlie's Arete"
    V4 vs V2) and stay listed as READ. Do not re-read them; do not "merge" them on the key alone.
  - **0221 added three, on purpose.** Folding Mountain Project's parallel ice/bouldering trees into
    the main tree put a summer route and a winter line of the same name in one area: Centerfold
    5.4 / WI3 and Percolator 5.7 / WI3+ (Rumney's Parking Lot Wall), The Sundial 5.12a / Sundial V0.
    Different climbs, listed as READ. The fold kept every cross-discipline same-name pair apart for
    the same reason; only same-discipline twins were merged.
  - **The area folds left 13 more (2026-10-08).** Folding two copies of one wall (0251, 0256, 0261)
    brought both imports' row for each climb into one area — one row the FA, the other the pitches
    and length. 0271 merged 10 (higher grade kept); listed as READ: Discord 5.8 trad / WI4+ ice,
    Headless Horseman 5.10b / V7, "Unknown Left" 5.10c/d / 5.10b (placeholder, different grades). A
    future fold should expect this guard to name its leftovers.
  - **catalog_key is recomputed in JS** (`lib/search.js` `searchCanon` + 0214's stoplist). In SQL
    it does not finish over 211k routes: measured `57014` at the default timeout, then a gateway
    **524** with `statement_timeout = 300s`. `check:search-norm` keeps the JS and SQL tables one.
  - **Cannot see** a copy filed under a DIFFERENT area (MP's copy area beside ours) — a pairwise
    neighbourhood scan is too costly here; that shape is what the trigger's 5 km / 0.3 km test
    refuses, so half 1 is its coverage. Anon key for routes; refuses a read under 100k rows.
  - Never add a new duplicate to the baseline: merge it (0213 is the pattern), then
    `--write-baseline` only to record groups that were FIXED.

- **`check:area-duplicates`** asks whether any PLACE is filed twice — the area-level twin of
  `check:catalog-duplicates`, which cannot see a copy under a different parent. Built 2026-09-30
  after 0221 folded 268 same-place pairs, most of them Mountain Project's parallel discipline trees
  ("*Joshua Tree Bouldering* › Hidden Valley Area Bouldering" beside "Hidden Valley Area"). The user:
  *"fold into 1 area … i don't want duplicates"*. Runs **daily** in `area-count-drift.yml`, not in
  build — a property of the database, and the MP import is still adding states.
  - **A pair**: one state, different parents, neither inside the other, both holding climbs, under
    3 km apart, same 0214 `catalog_key` — or that key with bouldering/boulders/mixed/problems also
    ignored when one name carries such a word. An ICE name never pairs with a BOULDERING name.
    Computed in JS from `areas` with the anon key; refuses a read under 40k rows.
  - **100 pairs are LISTED as read** (`scripts/data/area-duplicates-baseline.json`), all different
    places sharing a generic name: the West Face of Daff / Fairview / Cottage Domes, Warm-Up
    Boulders in several canyons, Kraft Boulders / Kraft Crags, Cathedral Boulders / Cathedral Peak.
    Do not re-read them. A pair NOT on the list is either one place twice (fold it; 0221's planner
    is `audits/area-pairs-2026-09-26/fold.mjs`) or a newly READ different place (`--write-baseline`).
  - **Proven to fail**: with Kraft Boulders / Kraft Crags removed from the list it exits 1 naming
    exactly that pair.
  - **SAME PARENT, second pass (0256, 2026-10-07)**: two children of one area under the plain
    `catalog_key` pair at ANY distance, with or without a coordinate or climbs. The first pass skips
    a shared parent, and 209 groups had collected there unseen — one import's "Pawn, The" beside
    another's "The Pawn" at the same coordinate (The Needles of Rushmore 1,503 + 33 climbs, The
    Tennessee Wall, The Callahans, The Near Trapps), "Mount X" / "Mt. X", "X" / "X Area", and an ICE
    tree's copy of a crag ("Catskills (Ice)", Poke-O-Moonshine's copy with NO coordinate). 0256 folded
    them (0251's planner, adapted). Read as different places and LISTED: Index / Mount Index, Baker
    Crags / Mount Baker, Mount Wilson / Wilson Peak, Jump For Jesus / its Area (0251's reading).
    - Across two copies of one wall the climbs pair up as ONE climb in halves: one import carries
      the FA, the other the pitches and length, and the grades drifted ("The Mordor Wall" 5.6 /
      5.7 A3). A placeholder with the SAME grade on both copies is one climb; with different grades
      it stays two (owner rule). The higher grade is kept.
    - **Not paired** by the guard: a crag beside its own "X Bouldering" / "X Boulders" / "X Ice"
      SECTION under one parent (the wide key). Not a duplicate — one place split by discipline. The
      owner (2026-10-07): **NEST it** — the section goes inside the crag with its own name; a crag
      listing its climbs flat first gets "<Crag> Routes"; two flat lists join; an empty twin goes.
      0261 did 52 (The Trapps › Trapps Bouldering, Peterskill, Dierkes Lake…). A new one is not a
      guard failure; nest it the same way. Bouldering-vs-ice sub-areas of one mountain stay apart.
  - **0261 also folded** the guard's 2026-10-05 backlog under DIFFERENT parents: parallel trees'
    copies (Camp 4 Boulders / Camp 4 Area, Mt. Willard (Ice) / Mt. Willard, Mount Blanca / Blanca
    Peak 93 km off) fold; a copy whose shape differs nests. 18 generic face names on different
    formations ("Main Face", "North Face", nothing shared) are LISTED as read.
  - **Cannot see** a copy under another parent over 3 km off, one with no coordinate, one holding no
    climbs yet, or a spelling the key does not fold. The trigger (0216/0218) refuses a same-key area
    within 1.5 km at insert; this sweeps what got past it. Long Hill Conservation Area was a copy of
    Hidden in Plain Sight Boulders under another parent 4 km off with other boulder names — found by
    its CLIMBS (Megaman V3, Dick Move V1-2, Party Foul V3+ on both), folded in 0256.
  - **The 6 pairs 0261 held as UNSURE were settled from the source by 0274** (2026-10-08). Read so
    nobody re-researches them:
    - **West Kootenay** was not a pair but a mis-import: the source keeps three PARALLEL trees under
      the region (roped crags by town, boulders, a 2-climb ice tree), and ours split the TOWN tree
      across "West Kootenay Boulders" and "West Kootenay Ice", so Nelson, Castlegar and Slocan Valley
      stood twice and "Ice" held 134 rock routes. Now one tree by place; both buckets are gone. Ymir's
      and Poison River's boulders went inside their crags (Ymir Swimming Hole, Poison River Bluffs).
      Different places, LEFT APART: the two Grohman Narrows (Highway 3A boulders / box canyon across
      the river, 2.7 km) and "Valhalla" (boulders, 49.45 N) / Valhalla Mountains (40 km north). The
      Grohman boulders carry no coordinate, so the cross-parent pass cannot pair them; it needs none.
    - Olympia (WA) sat on Huntamer Park's exact coordinate: folded. Cascade Canyon Bouldering: nested.
    - DIFFERENT places: Jobs Peak / Jobs Peak Bouldering (range foot, 4 km), Pine Mountain (Bartow Co.)
      / Pine Mountain Boulders (Harris Co., 190 km, empty), Big Water's towers / Big Water Boulders,
      Lightning Bolt Boulder / Dynamic Blocks.
    - A fold that RAISES a keeper's grade must set `grade_num` too (lib/grade.js): 0251–0271 kept the
      keeper's old one, which left Unknown Shores (V7-8 at 7) and Spaceballs (5.11a at 10.75) out of
      their sort slot; 0274 fixed both. Aid and multi-system strings ("5.9 C2", "5.8 WI4 M5") disagree
      with the parser by convention, not by defect.
  - **What the guard cannot see, MEASURED and swept by 0276** (2026-10-08): same-named areas in one
    level-3 region that are not ancestor/descendant, kept when one side has no pin, or no climbs, or
    sits 3–25 km off — 900 pairs; 386 not already listed were READ (`res/verdicts-*.json` in that job,
    each with its evidence). Most were **parallel trees**, one place imported twice under two parents,
    folded from the top: Grand Canyon / Grand Canyon National Park, Mount Charleston Ice (every falls an
    empty copy) / Winter, Olympic / Olympic Peninsula Bouldering, Widgi Creek / Widgi Boulders, Mt. Evans /
    Mt. Blue Sky Bouldering, Wyalusing Ice / State Park, the two Frenchman Coulees, the two Seattles,
    Wayne's World, Banks Lake / Northrup Canyon, Castle Rock / Castle Rock and Sanborn, Tum Tum / Tumtum,
    Sandia (West Side), Wine Country / Northeast Bay, La Madre Range / Area, Dumplingtown / Dumplington Hill;
    Utah's San Juan / Grand County copies of Indian Creek, Potash Road, La Sal…; Montana's Kalispell /
    Bozeman / Butte Area copies of Stone Hill, Gallatin, Hyalite… The copies share few climb NAMES (Banks
    Lake 1 of 119, Dumplington 1 of 55): the two imports hold complementary halves of one place.
    - Read, so nobody re-reads them: **The VC's Main Wall** climbs (Babushka Boy, Kabuki Mask…) were also
      filed on Falling Rock's "Main Wall" — Mountain Project's VC page lists all 34; 20 merged, 12 moved,
      Falling Rock kept its own 16. Corps Wall reopened 2024-11 (WMCC): its empty "(CLOSED TO CLIMBING)"
      copy went. Everett Ruess Memorial Boulder: the source keeps only the "(CLOSED)" listing, so the
      closed copy was the keeper. Carlton Peak's numbered climbs ("16") are the named "(aka #16)" ones.
    - **LEFT**, read: Boulder N / Pimp Juice and Lake of the Woods (still unsure after the source),
      Klettergarten / Gilly Monsters (two sub-areas at the source), Joshua Tree's Pinto Basin bouldering,
      the empty "Cone, The" at Fairview (another sub-area), and every pair read DIFFERENT — named faces
      ("(North Face)" / "(South Face)"), generic names on different formations.
    - **The sweep's own blind spot**: it paired only inside one LEVEL-3 region, so a state whose trees
      start at level 3 (Minnesota's "Duluth Area" / "Duluth Area (Rock and Ice)") never met itself.
      Measured the same way across a whole state: **861 more pairs** (California 459); 337 READ
      (`res/p2-verdicts-*.json`), swept by **0277**. Again nearly all second imports of whole regions:
      "Eastern Sierra" (414 climbs, no pins) / "Sierra Eastside" (6,624); "Southern-Western Sierra" /
      "Western Sierra" (its highway GROUPING nodes, "Hwy 41: Fresno Dome, Shuteye Ridge", dissolved so their
      places meet their twins); "South Central Alaska" / "Anchorage & South Central Alaska" and its ice tree
      (ours held the falls only as EMPTY copies); "South-Central & Yakima"; Duluth; Bangor; Jemez; Sage
      Mountain; New River Gorge; Wyoming's "Laramie Area" copies of Vedauwoo. Read, so nobody re-reads them:
      Palo Duro Canyon State Park keeps its copy's "{PROHIBITED}" (the source's current name); Keystone
      Canyon's Tunnel Wall rock routes and the same lines climbed as winter mixed are TWO climbs each (M8 /
      5.12a); "Black Ice" in Owens River Gorge and at Great Falls Basin are two climbs 190 km apart.
    - A pair is found by NAME, so a copy renamed by its import still hides: Duluth's "North Hartley" held
      exactly "Hartley"'s 10 problems, and "Casket Quarry (ICE/MIXED)" held the 30 climbs its empty twin
      "Casket Quarry ICE" lacked — both found only by their CLIMBS when the trees were laid side by side.
      **Swept by 0278** the other way round: every two areas in one state sharing 3+ distinctive climb
      names, whatever they are called — 115 pairs, all READ (`res/p3-verdicts-*.json`). Two kinds:
      one place under two names or pins (Mission Gorge's two "Main Wall"s, 59 of 63 climbs, pins 37 km
      apart; "Indian Wars Wall" / "Wars Wall"; a second import's Pemberton boulders on ONE placeholder pin)
      — folded; and **one crag listing its climbs twice**, on the wall and again on a catch-all list
      ("Rose Ledge Routes", "T-Wall West", "Winter-Spring (ice, snow, mixed)") — both areas stay, each
      climb is one, the wall's copy kept. "Temp HP40" was a 98-problem holding list under the Alabama
      root: its problems merged into Horse Pens 40's boulders, the rest went inside as "Horse Pens 40
      Routes". LEFT, read: 7 Mile Rock / Coal Mt. Crag (27 climbs on both, which crag is unsettled);
      Missouri's two boulders whose copies sit under "Closed Areas" (a fold could erase a closure).
    - **The 16 pairs the sweeps LEFT were researched on the source and settled by 0279** (2026-10-08),
      so nobody re-researches them. Merged: 7 Mile Rock's 27 routes (Coal Mt. Crag is a second crag that
      listed them too); Marlow Profile = Bald Mountain Preserve (folded; Main Face's pin moved 100 km to
      Marlow, approximate); The Cube's problems (Clamshell Cave, not Twisted Tree's Ice Cube); Walker Texas
      Ranger's boulder (Buttermilks, not James River Park System's list); Blow-Hard Wall's three (not Main
      Wall - West End's); Pawtuckaway's one Lower Cliff (the copy's ROCK climbs only — its two ice entries
      sit on Stonehouse Pond's wrong pin and are not Pawtuckaway's). "High Bluffs" renamed "(South)".
      Two places / climbs AT THE SOURCE, left apart: Boulder N / Pimp Juice Boulder; the two Lake of the
      Woods; High Bluffs North / South; Lewis Creek's two Upper Falls (9 km); Montezuma Tower / White Twin;
      Slicksides (a trad crack and a pothole boulder problem). Not settled: Missouri's Hide and Seek and
      Hiker's boulders (the copies sit under "Closed Areas", one with a private-land notice); Tongue
      River's Happy Trails / Snag Wall (the source itself lists the three routes on both); the empty
      "Cone, The" (no page) — all three settled by 0281, below.
    - **The source's own AREA TREE (the crawl's `catalog/_mp/_tree/<id>.json`) settles what its pages
      cannot — 0281** (2026-10-08). Missouri's Hide and seek, Hiker's and Solus boulders are each ONE source
      area id read twice: the park copy is an old crawl, and the source has since moved the same ids into
      "EM: (closed)", a private area it calls not open yet. A same-name pair 52 km apart is not "two places"
      when the ids match; read the tree before calling it. The park copies folded into the current ones, and
      the park's PARKING was kept off them (generator `noPark`): a fold must not carry a trailhead onto an
      area the source has closed. Their pins first stayed the closed area's placeholder (~52 km off); 0283,
      on the owner's word, gave each its own earlier pin back from the rollback file. Happy Trails' pin was the source's own "best guess" (its page says "near
      bridge"); Snag Wall is the guidebook's wall by the bridge, so the three shared climbs are Snag Wall's.
      The empty "Cone, The" is the source's empty The Cone, gone. Joshua Tree's "Pinto Basin (aka Eastern
      Territorries)" bouldering nested into Split Rocks and Jumbo Rock Area (pins line up), Cottonwood
      Springs' into Cottonwood Area; Black Rock Canyon and Wonderland of Rocks North bouldering have no rock
      twin and stay under "Joshua Tree Bouldering". Still two climbs, on purpose: Keystone Canyon Tunnel
      Wall's M6–M8 mixed lines vs Valdez's Tunnel Wall rock routes of the same names.
    - **A tie the grade parser cannot break**: `gradeNumFor` scores "5.9" and "5.9+" alike, so "keep
      the HIGHER grade" needs a tie-break on the suffix ("+" over none over "-") or a fold quietly keeps
      the lower-reading one. 0278's planner (`higher.mjs`) applies it.

- **`check:area-sort-labels`** asks whether any area NAME still carries the source export's sort
  label. Built 2026-10-07: the owner found the Trapps' walls named "a1. The Uberfall - left" …
  "l. Sleepy Hollow" — *"We don't want the letters before the name of the area"* — and ~3,900
  areas in 49 states and provinces had one ("B: …", "(3) …", "12 - …", "* …", "- …").
  `scripts/oneoff/strip-area-sort-prefixes.mjs` renamed them; the importer strips as it creates.
  Runs **daily** in `area-count-drift.yml`, anon key, refuses a read under 40k rows.
  - **ONE rule**, `scripts/lib/area-sort-prefix.mjs`, shared by the rename, the importer and this
    guard. The importer needs it on BOTH sides: the export's location path still carries the label,
    so comparing it raw against a renamed area misses it and mints a duplicate. It asks the EXACT
    spelling first, then the stripped one, because the held areas below would otherwise make two
    same-named children and refuse every route for either.
  - **Measured NON-labels** (read, not guessed): "J. Paul Pebble", "L. Ron Hubbard's Boulder",
    "N. Fork Moorman's Area" (North Fork) — excepted by name; every other lone "E." / "N." is one
    step of a lettered series. A number that is the name stays ("19 Mile Wall", ".50 Cal Tower").
    The letter/number label comes off ONCE: "g. V3 - Middle Earth" keeps "V3". The owner then asked
    for online research where the letter may be the name; settled so: "B - Word" → "B Word" (the
    wall's name), Horse Flats' "Y Crack Boulder" / "A Boulder", "Y - North/South Side" kept (the crag
    is The Y), "N. Red-Yellow" and "B. School" kept as unsettled. Only 150 renames had no labelled
    sibling to vouch for them; those were the ones read.
  - **The rule must be IDEMPOTENT** — the importer strips names the rename already stripped. The
    first run broke it three ways ("V3 - " read as a letter-dash label, ". . more" as dot markers,
    "Z1:1:" stacked); tested since: f(f(x)) === f(x) for all 58,515 distinct names.
  - **HELD, listed** (`scripts/data/area-sort-labels-held.json`, each with its `why`), 474 on
    2026-10-07 — all duplicate places the label was hiding, needing a fold (0221's pattern), not a
    rename; after one, `--write-held` shrinks the list:
    - `sibling` (274): the stripped name is a SIBLING's — "(a) Hook" beside "Hook" (230 groups, 220
      with climbs in every copy). `check:area-duplicates` cannot see these: it pairs DIFFERENT parents.
    - `refused` (199): the rename's PATCH was refused by `refuse_duplicate_area` (0218) — a same-named
      area within 1.5 km. Often the same parent, spelled "White Wall, The" against "(E) The White
      Wall", which the sibling test missed because it does not fold a trailing ", The".
  - **FOLDED by 0251** (2026-10-07; held list now EMPTY, check:counts clean): 393 copies folded into their keeper, 47 climbs merged, ~1,800
    moved, 83 keepers renamed. Applied live in pieces by `scripts/oneoff/apply-0251-in-parts.mjs`,
    because three per-row triggers on `routes` make one transaction outlast the SQL gateway. Met
    on the way, each a trap for the next fold:
    - an area holds climbs OR sub-areas (`routes_require_leaf`, `areas_leaf_xor`): 9 groups had one
      of each, so the flat climbs sit under the place as "Other Climbs" (0221's name);
    - `refuse_duplicate_route` checks the whole NEIGHBOURHOOD, not the target area: predicted over
      every move out of band (3 hits, read: Muir one climb, merged; two pairs different climbs);
    - a climber's TOPO sat on a copy (`topos` cascades on an area delete): moved to the keeper;
    - re-parenting fires `refuse_duplicate_area` too, which found 3 pairs the planner missed
      (Acadia's ice tree, Mount Erie's Adventure Crags) — folded.
  - **Cannot see** a label spelling the function does not know, or a ROUTE name: 1,184 route names
    carry a topo number ("(01) Chicken Crack"), but route names also hold real initials ("R. Crumb",
    "T. Rex", "C. Bailey"), so they were not swept by the same rule. ROUTE names have their own rule
    since 2026-10-07, `scripts/lib/route-topo-label.mjs` (shared with `import-route-grades.mjs` so a
    re-import still matches): a NUMBER label comes off everywhere, a LETTER label only where the area
    runs a letter series (3+ letters, 9 areas); `scripts/oneoff/strip-route-topo-labels.mjs` renames
    875 and HOLDS 42 whose bare name a sibling already has (five "Slab" V1s, six "Project"s).
    Researched 2026-10-08: the source names NONE of them (open projects, "Unnamed", problems really
    called "Slab" or "V2"), so the number stays. One was a stale copy — Shawshank's "8.  5.12?" is
    the source's #8 renamed "Current Project - newly bolted" — merged by 0274; 41 remain held.
  - **Spelling twins MERGED by 0253** (2026-10-07): same-area climbs whose names differ by a typo or
    by spacing, same discipline and base grade — 2,775 candidates, READ pair by pair — 179 merged
    ("Manhattan / Manhatten Project"), plus 8 rows the source named "to be deleted" / "_delete".
    NOT merged, on purpose: pairs that read as two climbs ("The Last / The Lost Gardener"), the
    UNSURE ones, and names whose grade or mark IS the difference ("The 5.7 / 5.7+ Corner"). Same-named
    placeholders with different grades ("Unnamed" 5.6 / 5.9) are different climbs, never candidates.
  - Area children are ordered by `route_count`, then name (`useAreaChildren`), so the labels never
    set the order on screen and removing them lost no guidebook sequence.

- **`check:generic-area-names`** asks whether any area is named only by DISCIPLINE — "Bouldering",
  "Ice", "Misc", "Other Climbs", "Boulders, The", or a state bucket like "CO Ice & Mixed" (which reads
  as just "Ice & Mixed" inside Colorado). Built 2026-10-07: the owner — *"an area will be just called
  bouldering, ice climbing, mixed, etc. these are too generic. The climbs need to be in specific named
  areas"*. Measured that day: **147** (37 named exactly "Bouldering"), seven state buckets ("CT
  Bouldering" 1,823 climbs, "CO Ice & Mixed" 1,163), and Illinois' biggest ROCK area, Jackson Falls
  (566 climbs), filed under "Illinois > Ice Climbing". **0259** folded every one; runs **daily** in
  `area-count-drift.yml`, anon key, refuses a read under 40k rows.
  - **ONE rule**, `scripts/lib/generic-area-name.mjs`, shared with the importer, which steps THROUGH a
    generic level of the source's path instead of re-creating the bucket (a climb filed on the bucket
    itself lands on the place above, or is refused if that place has sub-areas). NOT generic, on
    purpose: a name that also names a place ("Smith Rock Bouldering" — 902 such areas, the importer's
    own convention), a single feature ("Sport Wall", "Dry Wall", "Top Rock"), a name with a number. A
    STATE counts only whole — "North Boulders" under North Dakota is the north end of Sentinel Butte.
  - **Exempt**, listed with a reason each in `scripts/data/generic-area-names-exempt.json`: Dedham's
    "The General" (among The Captain, The Colonel, The Major, The Private) and San Rafael Reef's
    lettered "A Crags" … "N Crags". A stale entry (renamed or gone) is reported.
  - **How 0259 was planned** — `scripts/oneoff/plan-generic-area-fold.mjs` simulates every step on the
    live tree under the database's own rules and writes the migration; research decisions with their
    evidence are in `audits/generic-area-names-2026-10-07/`. Five dry runs, each stopped by
    `refuse_duplicate_area` on something real, each now a rule in the planner: a re-parented area with a
    same-named TWIN deeper in the state folds into it (the ice tree's "“On the Rocks” Mixed Wall" vs
    the one under North Cheyenne Canyon; two whole copies of Lake City); twins are found by the
    DATABASE's `catalog_key` (it drops "ice", "climbing", "area" — "Ice Climbing by the Covered Bridge"
    IS "By the Covered Bridge"); a match only inside the area's own line ("Hard boiled egg area" holds
    "Hard boiled egg"; "Piatt Park Ice Climbs" under Piatt Park) runs that one statement with the bypass.
  - **Research ceiling, measured**: 91 of 799 catch-all climbs could be placed on a named wall or
    boulder (Index's Central Wall 18, The Mill 25, Mount Woodson's Cave Area 19, the Moonstone 9). The
    rest are filed by every source only under the catch-all — a bouldering area's problems with no
    boulder named — so they stay together, named for their place ("Yellow Bluff Bouldering", "Jockey
    Cap Routes"), or "Other <place>" where the place is itself a boulder group. Do not re-research them
    from the same sources; a new placement needs a source that names the boulder.
  - **Climbs filed twice** surfaced by the folds: 11 merged (the copy already in the place kept, its
    blanks filled from every `routes` column the catalog lists); Grand Ledge's "Hollywood" V4 vs
    "Hollywood" 5.12a (11 such pairs) are bouldering vs top-rope — NOT merged; its two buckets became
    "Grand Ledge (aka Oak Park) Bouldering" / "… Routes" rather than one area.
  - Rollback: `scripts/rollback-generic-area-fold-<ms>.json` (every touched area's full row, every moved
    climb's prior area, every merged-away climb's full row).
  - **A name made of generic words can still be a PLACE** — owner, after 0259: *"if it actually names a
    place then keep it"*. Every name 0259 removed that could be a proper name was researched
    (`real-names.json`); **0262** put back the ones a source USES as a place: "The Crags" (Twin Sisters'
    west face, 16 crags re-nested), "The Areas" (Main Elsewhere's right two-thirds), Table Rock's and
    Fossil Rock's "The Boulders", Borderland's boulder "The General" — all now exempt. Left folded, no
    source naming them: "The Boulders" at Boulder Mountain AZ, Puoux, Fork Run, Crag In The Clouds,
    Salt Fork's "The General Boulders". The rule cannot tell these apart by spelling — **research, then
    exempt; never widen the vocabulary to dodge one**.
  - **Replay trap**: a Supabase preview runs every migration in ONE session, so a `pg_temp` helper two
    migrations both define must be `create or replace` (`check:migration-replay` caught 0262 redefining
    0259's `pg_temp.mv_area`).
  - **The guard caught its own regression within hours** (2026-10-08): the snow import, run with the
    importer from BEFORE #2265, added one climb (Potosi Peak's North Couloir) and re-created "CO Ice &
    Mixed > Ouray (Ice/Mixed)" under their old ids to hold it. **0268** moved Potosi Peak beside Teakettle
    Mountain (San Juans > Northern San Juans) and deleted the two buckets. The same run reached Vermont
    too: "VT Ice and Mixed" came back holding "Mansfield - the Chin" (Hourglass Chute) — **0275** moved
    it under Northern Vermont > Mt Mansfield, keeping its name so the importer's same-name-nearby match
    finds it next time. Any import must run from a checkout that has `scripts/lib/generic-area-name.mjs`;
    a red here after an import means it did not. Fold a re-created bucket by hand: move what it holds to
    its geographic home (`catalog_find_area` first), keep the child's own name, delete the bucket.

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
  - **Rule 1's one exemption is a column the TABLE no longer has, and it is DERIVED rather than
    declared.** #1020 dropped `routes.source`, swept the three pipeline loaders and two readers it
    named in 0155's header, and missed this function — so the live approval inserted into a column
    that did not exist. **plpgsql resolves column names when a statement first RUNS**, so nothing
    failed at deploy time, no guard went red, and the failure was reserved for the next admin to
    approve a route. Worst possible place for it: approval is admin-only and exercised by hand
    rather than by CI. `0157` removed it.
    - The exemption replays every `add column`/`drop column` on `routes` in file order and keeps
      the **last** one. A hand-maintained list would be a second source of truth for the schema and
      would rot the moment the column came back; this appears and disappears by itself. Re-adding
      the column **re-arms** the rule, which is the safe direction — it then demands more of the
      approval rather than less. Injection cases 7 and 8 pin both directions.
    - Before dropping any column, ask `pg_proc` which functions still name it, **comments
      stripped**. `check:schema` cannot answer this — it only asserts `lib/db.js` never reads a
      missing column, and never looks inside a function body. Views need no such check: a
      non-CASCADE `drop column` is *refused* if a view depends on it.
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
  - **AND THERE IS A THIRD GAP BETWEEN THEM, WHICH `approach` FELL INTO: A KEY CAN BE IN `SS`,
    SURVIVE APPROVAL, AND STILL BE THE WRONG SHAPE FOR THE COLUMN IT LANDS IN.** Add-a-climb's
    Approach control was four chips writing an opaque bucket key — `u1` / `1to3` / `3to6` /
    `6plus` — and this function inserts `v->>'approach'` **straight into `routes.approach`**,
    which is **prose**: the walk-in narrative the Planner renders, and the column
    `audit:approach-scope` and the whole `climbing_route` re-homing work are about. An approved
    contribution would have rendered its APPROACH section as the literal text **`3to6`**.
    - **`check:add-route-fields` asks whether a field is STORABLE — a column exists — never
      whether the value FITS it.** That is the same distinction `check:field-renders` draws
      against `check:token-boxes`: reaching a screen and fitting the element it reaches are
      different questions, and here it is *having a column* versus *being the kind of thing that
      column holds*.
    - **Measured before acting, and the answer is why it was worth fixing NOW:** those four keys
      appeared at **exactly one place in the whole app** — the chip array itself — and nothing
      read them back; and the live catalog is **clean** (0 rows hold a bucket key, and 0 of 1,069
      populated approaches are 8 characters or shorter,
      `scripts/oneoff/probe-approach-bucket-keys-in-prose-column.mjs`). Latent, not yet damaging
      — which by `check:field-renders`' own `SENTINELS` lesson is the best moment to fix a writer
      and the worst moment to assume it is fine.
    - **The control was REMOVED, not relabelled**, and that follows from `check:add-route-fields`
      existing at all: it forbids asking a question you cannot store, so a chip left as a "hint"
      that submits nothing fails it by design. Nothing is lost — no reader existed, and the
      disciplines that need a number already have `dist`. **No migration is needed**: with the key
      absent, `nullif(btrim(coalesce(v->>'approach','')),'')` is simply NULL.
    - The **imperial labels** on those chips (`< 1 mi` … `6+ mi`) were the reason I opened the
      file, and they are the smaller half — a control whose value lands in the wrong column is not
      worth relabelling.
    - **`source`/`sourceNote` are caught for free by the `SS` test and `approach` is NOT**, because
      `approach` genuinely is in `SS`. So a re-added chip group would satisfy every other assertion
      in that guard; it now has a dedicated one, and **that assertion fired on its own explanation
      first** — the JSX comment left where the control used to be names all four keys, so a raw
      scan reads the removal as a re-introduction. Comments are stripped, the trap
      `check:ci-cancel` records. Injection-tested **4/4**
      (`scripts/oneoff/inject-approach-bucket-cases.mjs`); **case 3 must stay SILENT** and is that
      near-miss.
    - **AND `approach` WAS NOT THE ONLY ONE — CENSUSED 2026-09-10, IT IS THREE OF THE FIVE CHIP
      CONTROLS IN THE FORM.** Asking the same question of every one of them rather than stopping at
      the instance found:

          approach     u1/1to3/3to6/6plus      -> routes.approach      PROSE   removed  #1713
          descentText  rappel/walkoff          -> routes.descent_text  PROSE   LIVE, now free text
          pitchCount   single/multi            -> routes.pitches       INT     LIVE, now a number
          outingShape  outback/loop/point      -> routes.outing_shape  KEY + CHECK   CORRECT
          rockStyle    trad/sport/bouldering   -> (no column)          declared in 0135

      *An instance fixed by hand is not a class closed*, on the very guard whose entry records that
      lesson — and the two live ones reached **further than the one already fixed**: `descent` is
      offered on **7 of 9** disciplines and `pitches` on **4 of 9**.
    - **`pitchCount` WAS THE WORSE OF THE TWO, and it is a shape this file has no other example
      of: a REQUIRED question that stores NOTHING.** `proposal_num` returns NULL for anything not
      matching `^-?\d+(\.\d+)?$`, so `"single"` became NULL on the DB path, while the seed path's
      `parseInt(pitch)||1` made **every multi-pitch route 1 pitch**. The completeness gate
      (`sf("pitches")?!!pitch:null`) meant the form *insisted* on an answer it then discarded. It
      is a number input now, which is what the column holds; the `||1` fallback is correct again
      rather than a silent constant.
    - **`descentText` is the same shape as `approach` and lands somewhere worse-measured.**
      `descent_text` is populated on **1,013 live routes at a median of 530 characters** and the
      shortest is **129** (`scripts/oneoff/probe-descent-bucket-keys-in-prose-column.mjs`, service
      key), so it is unambiguously prose — and `descentBeta()` returns the longer of `descent` and
      `descentText`, so an approved contribution would have rendered a **Descent card containing
      the single lowercase word `rappel`**. Catalog **clean**: 0 rows hold a bucket key. Latent,
      exactly like `approach`, which by `check:field-renders`' own `SENTINELS` lesson is the best
      moment to fix a writer.
    - **`outing_shape` IS THE MODEL, AND IT IS THE LOAD-BEARING NEGATIVE OF THE NEW ASSERTION.**
      `0087` gives it `check (outing_shape is null or outing_shape in ('outback','loop','point'))`
      — the exact keys its chips write — so there the bucket key is the RIGHT shape and the app
      already had the pattern. A rule that merely forbade chip groups would forbid the correct one,
      which is this file's *a rule demanding only ABSENCE is satisfied by deleting the feature*
      lesson; the guard therefore asserts those chips are **still offered**.
    - **SCOPED TO `AddRoute`'s BODY, because the bare keys are ordinary English elsewhere.**
      `"rappel"` occurs **8 times in core alone** — a vouch `skills` array, and `passesFilters`'
      own **FINDER** filter (`f.descent==="rappel"`, which derives from `r.rappels != null` and
      reads nothing this control stored). The `["key","Label"]` pair shape also occurs correctly in
      `TIME_BUDGETS`, a crag filter and `RouteDetail`'s `PIN_CATEGORIES`. **The fingerprint is the
      pair shape inside that one component**, and the older `approach` rule stays file-wide because
      `u1`/`1to3`/`3to6`/`6plus` are unique tokens that occur nowhere else.
    - **THAT CENSUS'S OWN GUARD WAS A BLACKLIST, WHICH IS BEATEN BY ONE MORE CONTROL — so it now
      carries a WHITELIST over chip GROUPS as well.** The rule above names the three key sets that
      were actually wrong, so a BRAND-NEW bucket group — different keys, same defect — is invisible
      to it. That is the too-narrow-proxy trap this file records under a dozen names, arriving
      inside the guard written to close this very class. Every chip group in `AddRoute` must now be
      **declared** with its target column and why the shape fits; an undeclared group fails, and a
      **stale** declaration fails too, so the correct control cannot be swept away in silence.
      - **THE GROUP SHAPE IS WHAT MAKES IT PRECISE, AND THE KEYS CANNOT CARRY THE RULE.**
        `["cams","nuts"]` is a bare two-string list and is **character-identical** to a
        `[key,"Label"]` pair — the same ambiguity that made an injection case inject the forbidden
        shape while claiming to be innocent. An array **of arrays** is unambiguous. Measured:
        exactly **2** groups in AddRoute, both legitimate (`rockStyle`, `outingShape`), with
        `["cams","nuts"]` correctly not matched.
      - The two rules are **complementary, not duplicated**: the blacklist gives a specific message
        naming the historical defect and the column it corrupted, the whitelist catches the next one.
      - **PROVEN LOAD-BEARING BY A/B rather than asserted.** With the whitelist neutered and nothing
        else changed, **exactly the two cases it adds go MISS** (a novel group, and the correct
        control swept away) while the other six are unmoved — so it is not decorative, and it is not
        firing on anything the blacklist already covered. *When an A/B moves more than the thing
        under test, it is measuring the harness.*
    - **AND THE SIBLING FORM NEEDS NO SUCH RULE, measured 2026-09-10 — a NEGATIVE result worth
      recording so nobody re-derives it.** `check:contrib-fields` guards `SuggestFix` and asks the
      same one-layer-too-shallow question (*is the field APPLIED*, *is the sub-key READ*), so the
      class could have been there too. It is not, and the reason is **structural**: SuggestFix
      builds its 15 `single` controls as `.map(x => [x, x])`, so key EQUALS label and the stored
      value IS the display string — safe by construction. Its one key-not-label control is
      `outingShape`, targeting the same CHECK-constrained key column. **The two forms use different
      conventions for one control type, and only AddRoute's can be wrong.**
      - `ropeLen` looks like a counter-example and is **already handled**: it is the contributed
        spelling (`"60 m"`) against the enrichment column `rope_length_m`, they can disagree because
        nothing mirrors one onto the other, and the reader gates on `_ropeEdited` with a comment
        ending *"Never print two rope lines."* — the `check:correction-readers` pattern already
        applied.
    - Injection-tested **8/8** (`scripts/oneoff/inject-bucket-key-shape-cases.mjs`), each case
      proving its edit landed **by checksum** and restoring byte-identically. **Three must stay
      SILENT**, and **two of them failed as HARNESS BUGS first** — which is the same
      *checksum movement proves an edit happened, not that it was the right one* lesson: a decoy
      written as a bare array of keys (`["rappel","walkoff"]`) is **character-identical to a pair
      head**, so it injected the forbidden shape while claiming to be innocent; and an
      outside-the-form decoy that included `u1` tripped the older file-wide rule instead, saying
      nothing about the new one. **A case that fails for its own reasons proves nothing.**
- **`check:function-columns`** asks the general form of the question `check:approve-route-columns`
  rule 1 asks about one function: **does every column a stored function WRITES still exist?**
  #1020 dropped `routes.source`, swept the five call sites its header names, and missed
  `approve_new_route` — so the live approval inserted into a column that was gone. **plpgsql
  resolves column names when a statement first RUNS**, so the drop deployed clean, `create or
  replace` would also have succeeded, every gate stayed green, and the failure was reserved for
  the next admin to approve a route. Reads the live DB, so **not** a build gate.
  - **Two near misses explain why it had to be new.** `check:schema` asserts `lib/db.js` never
    READS a missing column and never looks inside a function body — a function is the one place
    SQL is *stored* rather than executed, which is exactly where this hides. And
    `verify-migrations-applied.mjs` checks that objects EXIST by name: `merge_accounts` exists,
    so it passes, while the live body is an older and broken version of the one 0035 defines.
    **Existence is not agreement.**
  - **It found two on its first run, both latent — and BOTH ARE NOW GONE, so read this as history.**
    `auto_archive_crews` wrote `crews.archived_at`/`crews.status`, neither of which exists, and was
    in **no migration at all** (hand-made in the SQL editor, called by nothing); `0167` dropped it,
    reproducing its body verbatim so the intent stays in version control. `merge_accounts` wrote
    `crews.user_id`, which does not exist, and `0170` dropped it with the whole account-linking
    feature — `account_links` held **0 rows**.
    - **The reason it was removed rather than repaired is the part worth keeping.** It reassigned
      `climb_logs.user_id`, `vouches.from_id` and `profiles.account_type` for two arbitrary uuids
      with **no `auth.uid()` check**, and the throw on that first statement was the only thing
      making it inert. *Fixing the column would have armed an account-takeover primitive*, so a
      repair had to add an ownership gate in the same change — and removing an unused feature beat
      writing that gate. **Do not go looking for this function; it is not there.** `KNOWN` in both
      guards is down to `handle_new_user` alone, verified by running them: `check:function-columns`
      ok over 11 writing functions, `check:function-drift` 45 of 46 agreeing with 1 declared.
    - The obvious repair — re-apply 0035, which has `created_by` and is plainly the intended
      body — is precisely the dangerous one. *Read what a migration deliberately did NOT fix
      before finishing the job for it.*
  - **Scope is the WRITE targets only** (`insert into t (cols)`, `update t set col=`), stated in
    the script rather than implied. Resolving arbitrary column references in WHERE clauses and
    expressions needs real name resolution — aliases, CTEs, record variables — and a regex that
    guesses reports correct code as broken, which is how a guard gets ignored. In practice a
    function broken this way names the column on both sides: `auto_archive_crews` reads `status`
    in its WHERE and was caught by its SET list.
  - **It cannot run in CI, and that is a credential rule rather than a preference.** `pg_proc` is
    not exposed through PostgREST, so it goes through `supabase db query --linked`, which needs
    the **management API token** — a credential that can run arbitrary DDL. CI must not hold it,
    the same rule that keeps `check:signed-in` on two durable anon-key accounts. There is no
    anon-key route to a function body, so unlike `check:counts` this cannot be put on a schedule
    with what CI is allowed. Declared in `check:guard-wiring`'s `EXCLUDED` with that reason.
    **Run it by hand after any `drop column`** — the moment it exists for.
  - Fails **closed** four ways, and the first is the one that matters: an unreachable database, no
    JSON, an empty schema, or a write vocabulary that parses nothing are each reported as *nothing
    was checked*, never as a clean catalog. Injection-tested; the 7 cases are at the bottom of the
    script. Cases 6 and 7 pin the `KNOWN` map in both directions — removing a live entry must
    surface it as a real failure, and a bogus name must report as stale.
- **THE THREE HAND-RUN DB GUARDS WERE RUN, AND TWO OF THEM COULD NOT START.** CLAUDE.md asks for
  `check:column-drift`, `check:function-columns` and `check:function-drift` to be run **by hand
  after any migration**, because CI must not hold the service or management key. Doing that found
  the database healthy — and found that the instruction could not be followed.
  - **A FRESH WORKTREE IS NOT LINKED.** Both function guards go through
    `supabase db query --linked`, and `supabase link` writes `supabase/.temp`, which is
    **gitignored** and therefore absent from every new worktree. So a session that does exactly
    what this file asks gets `FAIL: could not read the live catalog`, reads it as a missing
    credential, and stops. **A guard nobody CAN run is worse than one nobody remembers to run** —
    the remembering is at least fixable by a note.
  - The link needs **no database password**: it authenticates against the Management API with the
    token the CLI already holds, and `npx supabase projects list` succeeding is the tell that the
    credential is present while the link is not. Both guards now print that remedy, verified by
    unlinking and re-running rather than asserted.
  - **RESULTS, so the next reader knows what a clean run looks like.** `check:function-columns` ok
    (11 writing functions, 6 insert lists, 9 update lists). `check:function-drift` ok — **46 live
    functions, 45 agreeing with their newest migration** plus the one declared `handle_new_user`.
    `check:column-drift` reported `profiles.photos_public` as live and undescribed, and that is
    **NOT a defect**: it belongs to an open PR that carries its migration. The guard compares live
    schema against MERGED migrations, so any session applying DDL before its PR lands makes it
    fail — expected, and the reason it must not be declared in `KNOWN`, which would go stale the
    moment that PR merges.
- **`check:function-drift`** is the sibling question, and the one no gate on the checkout can
  answer: **is the function running in production the one this repository describes?**
  `verify-migrations-applied.mjs` checks objects EXIST by name — `merge_accounts` exists, so it
  passes, while the live body is an OLDER version than 0035 defines (it writes `crews.user_id`
  where 0035 writes `created_by`, and lacks 0035's whole crew_members merge). **Existence is not
  agreement.** Reads the live DB, so **not** a build gate.
  - Two findings: **DRIFT** (a live body differing from the newest migration that defines it) and
    **UNTRACKED** (a live function no migration creates at all — nothing in git describes it,
    nobody reviewed it, and rebuilding from migrations would not produce it).
  - **The first run reported SEVEN drifting functions and FIVE were false**, which is the entry
    worth reading before trusting a count here. Five differed only by **two spaces of leading
    indent** per line, re-applied from a differently-indented source; and `compute_trust_score`
    differed by exactly its `--` **comment lines**, the live copy having been created
    comment-free, every statement byte-for-byte identical. Whitespace runs are collapsed and
    comments stripped before comparing — 7 → 3 → 2 as each class came out. A detector that
    reports a function correct in every statement is one people learn to ignore.
  - **It found `is_crew_ready`, which `check:function-columns` structurally cannot.** That
    function reads `crew.members` and `crews` has no `members` column — but it only READS, and
    the sibling guard's stated scope is write targets. Untracked, uncalled, hand-made; crew
    readiness is computed client-side by `datesAgreed`/`agreedDate`. The two guards' scopes are
    complementary rather than overlapping, and this is the case that shows it.
  - **`auto_archive_crews` and `is_crew_ready` are GONE — dropped by `0167`, and the two bullets
    above are history rather than current state.** Both were hand-made, broken on columns that
    do not exist, referenced by nothing (checked against `pg_trigger`, `pg_proc.prosrc`,
    `pg_policy` and the whole repo), and duplicated by working client-side code — the app
    archives crews with `CREW_ARCHIVE_GRACE_DAYS = 3` and `isArchivedCrew()`, and computes
    readiness with `isReady()`. The recorded reason for keeping them was that dropping a
    function git has never seen destroys the only record of the intent; `0167` answers that by
    reproducing **both bodies verbatim in the migration**, which puts them in version control
    for the first time. `KNOWN` is now **empty** here and `handle_new_user` alone in the drift
    guard — `merge_accounts` was the last entry and `0170` dropped it.
  - **ITS `UNTRACKED` BRANCH HAD `check:column-drift`'s ADVICE DEFECT VERBATIM** — *"Either write
    the migration or drop the function"*. Same wrong first move for the same likely cause (an open
    PR carrying the migration), and here the **second** option is the dangerous one: `0167` dropped
    two functions this way and one of them, `merge_accounts`, reassigned `climb_logs.user_id` and
    `vouches.from_id` for two arbitrary uuids with **no `auth.uid()` check** — an account-takeover
    primitive kept inert only by naming a column that did not exist. *Read the body before dropping
    a function git has never seen* is now cause 3's warning rather than a bare instruction.
  - **ONE `KNOWN` entry** now, a claim about the live database that fails when **stale**:
    `handle_new_user` (benign — live writes `public.profiles` where 0009 writes `profiles`, so the
    **live** copy is the safer one, since it does not depend on `search_path`). `merge_accounts`
    and the two untracked hand-made functions were declared here and are gone: `0167` dropped
    `auto_archive_crews` and `is_crew_ready`, `0170` dropped `merge_accounts`. **An applied
    migration is history and must not be rewritten** — aligning `handle_new_user` would take a new
    migration, not an edit to 0009.
  - Fails **closed**: an unreachable database, no JSON, an empty catalog, fewer than 20 migrations,
    or a definition pattern that parses nothing are each *nothing was checked*. Injection-tested;
    the 7 cases are at the bottom of the script, and cases 6 and 7 pin the two false-positive
    classes the first run actually produced.
- **`check:column-drift`** asks `check:function-drift`'s question of **tables**: is the live schema
  the one the migrations describe? Reads the live DB, so **not** a build gate.
  - **THE INCIDENT IT WAS WRITTEN FOR: `routes.access_checked_at` is live, holds 39 stamped rows,
    is anon-readable — and NO migration, NO commit anywhere in history, and NO reader mentions
    it.** The DATA shipped to production; the CODE did not. Found by verifying a memory note that
    claimed the feature had landed: migration `0172`, `lib/road.js`, `accessCheckedLine()` and a
    guard are all described in that note and none exists. *Verify a memory's file and column names
    before recommending work on them* — the rule was already written down and this is what it
    catches.
  - **Three guards sit beside this and none can see it.** `check:schema` is a build gate asking
    exactly one direction — does `lib/db.js` READ a column the snapshot lacks; an EXTRA column
    breaks nothing it tests. `check:function-columns` asks whether columns a stored FUNCTION writes
    still exist, again only looking for absence. `check:migrations` refuses two files sharing a
    number, and a migration nobody wrote has no number to collide with. Schema described nowhere is
    invisible by construction — the `check:overlay-discovery` shape.
  - **REFRESHING THE SNAPSHOT WOULD HAVE MADE IT WORSE, which is why section A asks the MIGRATIONS
    rather than the cache.** `scripts/schema-snapshot.json` is a committed cache of the live schema
    and the only record of the database inside the repo, so `npm run schema:refresh` silently
    **absorbs** an undescribed column — after which `lib/db.js` may legally read a column no
    migration creates, a rebuild from migrations produces an app reading a column that does not
    exist, and every gate stays green. The baseline-regenerated-until-it-asserts-nothing failure,
    with teeth.
  - **Section C found the snapshot stale from THREE separate merged migrations** — `areas.source`
    and `account_links` dropped but still listed, `areas.coords_approx` and `access_checked_at`
    live but absent. Nothing had noticed, because the refresh instruction is a comment in a script
    header. That staleness is not inert: `check:schema` is a **build gate**, so a column live but
    missing from the snapshot makes a **correct reader fail the build**, while a column dropped
    live but still in the snapshot lets a reader of a DROPPED column **pass** — which is the #372
    defect that guard exists to prevent. Snapshot refreshed in the same commit; the guard is what
    stops it rotting again.
  - **Precision was measured before it shipped**, because a detector over 179 migration files is
    exactly the kind that returns a page of noise: across 41 live tables and 479 live columns,
    section A reports **1**, section B reports **0**. The migration directory describes the
    database almost exactly, which is what makes the one exception worth reading.
  - **Replays statements in SOURCE ORDER, and the first version did not.** `0036_crews_persistence`
    does `drop table if exists crews cascade;` and re-creates it **in the same file**, so applying
    every CREATE and then every DROP wiped the table the file had just built and reported all ten
    of its columns as undescribed. `check:rls` records the identical defect from the policy side.
  - Fails **closed** five ways: no migrations directory, fewer than 20 migrations, fewer than 100
    parsed columns, an unreachable database, and a live schema exposing zero tables.
  - **IT FIRED CORRECTLY AND THEN PRESCRIBED THE WRONG REPAIR — all three plausible actions, for
    its most likely cause.** Section A said *"Write the migration, or declare it in KNOWN with the
    reason"*. Sessions here apply DDL while their PR is still open, so the commonest reason a
    column is live-and-undescribed is that **an open PR already carries its migration** — and then
    writing one duplicates a number that PR claims (`check:migrations` fails the build), declaring
    it in KNOWN goes stale the moment the PR merges and fails this guard on the stale entry, and
    the third thing a reader reaches for, `npm run schema:refresh`, is the destructive one section
    A exists to prevent. Three causes now, in likelihood order, the open-PR one **first and saying
    to do NOTHING**, with the object interpolated into the `gh pr list --search` that settles it.
    The whole-TABLE branch carried **no advice at all** and now carries the same three.
  - **The remedy is the half nothing tests.** An injection case asserts the guard FIRED; none of
    them reads the sentence it printed. Same shape as `check:field-renders` telling an author to
    delete correct bookkeeping during an outage. **Neither of these branches fires on a clean
    tree**, so both messages were RENDERED before shipping rather than only written — the table
    branch through `--fixture` with a synthetic table, and `check:function-drift`'s sibling by
    hiding ONE parsed definition on a throwaway copy. Emptying that map entirely was the first
    attempt and it hit the guard's own fail-closed branch instead, which is that branch working.
  - **`KNOWN` IS EMPTY, AND THE ONE ENTRY IT EVER HELD PROVED THE CONTRACT AGAINST A REAL EVENT.**
    `routes.access_checked_at` was declared for exactly one day, with a reason predicting that the
    repair would be another session's migration landing. **#1347** landed it
    (`0172_road_access_can_carry_a_date.sql`, `lib/road.js`, `check:access-checked-line`), the next
    run went red as **stale bookkeeping**, and the entry came out. Nobody had to remember it
    existed — which is the whole point of a declaration that fails when it stops being true, and
    it is validation an injection cannot give.
  - **The stale assertion needs a TEST HOOK precisely because the healthy state is an empty map.**
    `--known table.column=reason` adds a declaration at run time and is used only by the injection
    harness. An assertion that can run only while the tree is unhealthy is not an assertion —
    the same reason `check:field-renders` injects `SENTINELS` for columns with zero rows.
  - **A STALE CHECKOUT REPORTED A LIVE COLUMN AS DESCRIBED BY NOTHING, and the guard's ADVICE was
    then wrong in the expensive direction.** Section A compares the live database against the
    migrations **in the working tree**, so a tree that is merely BEHIND main is indistinguishable
    from a column nobody wrote. Met for real on 2026-09-03: a worktree stopped at `0174` while
    main carried `0175_a_climber_can_choose_to_show_their_name.sql`, and it reported
    `profiles.show_name`.
    - **The three causes it prints could not rescue it, and cause 1 actively misdirects.** *"An
      open PR already carries its migration"* came back **empty**, because #1540 had already
      merged — which routes the reader to cause 2, *"write the migration"*, for a migration that
      exists, under a number `check:migrations` would then reject. That is the
      `check:field-renders`-during-an-outage shape: the guard is right to fail and its repair
      advice points at the wrong half.
    - **So it is now a FACT the guard checks, not a fourth guess.** `git ls-tree origin/main` on
      the migrations directory against the local one; if main has files this tree lacks, the note
      names them and says to pull before acting. **Advisory only — it never suppresses a
      finding**, because a stale tree and a genuinely undescribed column can be true at once.
      Fail-soft: no git, no `origin/main`, or a different layout just means no hint.
    - `--migrations <dir>` is the test seam, alongside `--fixture` and `--known` and for the same
      stated reason — the note fires only on a stale tree, so without it the assertion could run
      only while the checkout happened to be stale. The harness manufactures that tree by copying
      the real migrations minus the two newest.
    - **The SILENT case needs `absent`, not `expect: null`.** The plain silent test asks whether
      the section says `FAIL`, and this note carries none — so a spuriously-firing note would slip
      straight past it. A case has to name the thing that must not appear.
  - Injection-tested **8/8** (`scripts/oneoff/inject-column-drift-cases.mjs`), driven by
    `--fixture` from the committed snapshot so the whole harness runs **offline**. Judged **per
    section**, never on the exit code — a mutation that adds a column also makes the fixture
    disagree with the snapshot, so section C fires too and every case would look alike from an
    exit status. **Three cases must stay SILENT** (a materialized view is not an untracked table;
    a dropped-and-recreated table is not undescribed; the staleness note must not fire on a
    current tree) and **each was proven non-vacuous** by
    breaking their mechanism and confirming they then fire. The `stale-known` case supplies its
    own declaration through `--known`, since there is no longer one in the file to make stale.

- **`check:search-norm`** asserts that the two halves of "how a typed name is matched" are one
  rule. Migration `0190` made every DB-backed search forgive spelling — before it, all of them
  matched `name ilike '%q%'`, one verbatim substring, and the catalog spells one word several
  ways: **243** area names start "Mount" and **149** start "Mt", **1,910** carry an apostrophe,
  **118** a non-ASCII letter. "mt baker" returned one area, a highway ("Bellingham and Mt Baker
  Hwy"), never the mountain; "mount st helens" returned nothing. The seed matcher `_norm` had
  expanded mt → mount for months — the demo found what the real catalog could not.
  - **The design: the NAME carries every spelling; the QUERY is only cleaned.** `name_search`
    holds each word replaced by all its forms (`Mt Baker` → `mount mt baker`), and a query
    matches when every one of its words occurs in it. Rewriting the query instead
    (`st` → `saint`) is the obvious fix and is wrong: "mount st" stops finding Mount Stuart
    halfway through the word. Word order, punctuation, apostrophes and accents stop mattering,
    and **nothing that matched before stops matching**, because every form string contains the
    word it came from.
  - **Why it must be a guard.** The rule exists twice by necessity: SQL (`search_forms`,
    `search_clean`) builds `name_search` and tokenises for the RPCs; `lib/search.js` tokenises
    for the global route search, the offline fallbacks and the seed `fuzzyMatch`.
    `useRouteSearch` filters the SQL-built column with JS-built words, and its exact-area leg is
    an `eq` between `name_search` and a JS `searchNorm()` — so a spelling added on one side
    only matches in one box and silently misses in the next, the defect `0190` exists to fix.
  - Reads the NEWEST migration defining `search_forms()` and compares every row both ways,
    compares `search_clean()`'s accent-fold strings with JS, then asserts behaviour (the
    reported "mt baker" case among them) and that tokens never carry a LIKE metacharacter,
    since they go into `ilike` patterns unescaped. Fails closed with `ANCHOR LOST` if it parses
    fewer than 10 table rows.
  - **Section 4 — every search FUNCTION still uses the rule.** `0196` re-created
    `routes_in_subtree` / `_count` to add `grade_sys`, copying "0074's verbatim" bodies, and put
    `r.name ilike '%' || q || '%'` back 17 minutes after `0190` shipped. Sections 1-3 passed
    throughout, because they read the spelling table and never the finders. A climber then typed
    "NE Buttress" in an area's route list and got nothing, while the global search found it.
    `0200` restored the match. Section 4 now reads the NEWEST definition of `routes_in_subtree`,
    `routes_in_subtree_count`, `areas_in_subtree` and `search_names_fuzzy` and fails on a
    verbatim `name ilike … q`. Injection: delete `0200` and it names both 0196 finders.
    **Lesson: a migration that re-creates a function must start from the NEWEST body, not the
    one its author last read.**
  - **`0201` widened the table to every abbreviation route names were MEASURED to use** (whole-word
    counts over 205k names): dir/var/rte/ext/alt/orig, rdg/gl/ck/lk/cyn/pt/rd, lt/rt/upr/lwr/mid/ctr,
    1st–5th, one–ten ↔ digits, dr/mr/jr/sr, gulley/coulior misspellings, NNE-style points one way,
    and a direction written in two parts ("South East", "North-East", "N.E.") joined in
    `search_clean`. Deliberately NOT mapped: L/R/I/V/X, tr, ft, no, sec, cr — each means
    something else in a route name first. Section **1b** compares the join patterns SQL vs JS
    (injection: drift one → fails naming it). Backfill touched 16,220 areas and 22,582 routes;
    SQL and JS `search_norm` agreed on 27 edge names live. Offline packs now derive the form from
    the NAME, not their stored `name_search`, so an old pack cannot keep the old rule. The three
    remaining verbatim route/area-name boxes (add-route dupes seed half, AreaTree filter, inbox
    crew-thread route name) now use `searchMatches`.
  - **Structurally cannot see** whether the live database runs that migration —
    `check:function-drift` does.
  - Injection-tested **4/4** (SQL drops a row, JS adds an alias SQL lacks, the SQL accent fold
    drifts, JS stops folding mt), each restored byte-identically.
  - **Traps met building 0190, recorded so they are not re-met.** A stored GENERATED column is
    the obvious storage and cannot be applied here: it rewrites 205k routes under ACCESS
    EXCLUSIVE, outlived the Management API's 100 s limit (HTTP 524), and blocked every live
    read while it ran. Altering `areas` then `routes` in sequence deadlocked (40P01) against a
    live reader holding them the other way round. And Supabase refuses
    `set pg_trgm.word_similarity_threshold` on a function (42501), so the typo fallback
    prefilters with `<%` OR `%` at their defaults and applies `word_similarity >= 0.5` itself —
    measured: "shucksan" scores 0.55 (missed by `<%` alone), "stuard" 0.29 similarity (missed
    by `%` alone).

- **`check:list-row-columns`** — the Climbs list's THIN ROW carries every column its readers read,
  and no column they do not. **Why it exists (MEASURED 2026-10-08).** `useAreaRoutes` selected
  `ROUTE_AREA_EMBED` (`*` plus the area embed) for a list that renders a name, a grade, stars and a
  sub-line. `scripts/oneoff/measure-list-row-bytes.mjs` over the live catalog: a full row averages
  **2,384 bytes and the list reads 332** (40 typical areas, 238 rows); the enriched peaks are the
  real cost — Liberty Bell's 20 routes were **635 KB** (gpx 195 KB, approach_variants 43,
  rappel_detail 40, access 36, pitch_detail 35) for a list that renders 17 KB, Rainier's 26 were
  551 KB for 29, and the largest fan-out, Stone Fort's 356 boulders, 824 KB for 119 — 131 KB of
  that the SAME area embed repeated 356 times. The query is also one of the persisted ones
  (`lib/query-persist.js`), so the whole of it was being written to IndexedDB on every area opened.
  **The fix:** `useAreaRoutes` selects a literal column list (`id,name,…,approach_variants,
  areas(name,area_type)`, 18 columns) and stamps each network row `_thin`; `openRoute()` sees the
  stamp and reads the full row by id through `fetchRouteRow()` (the one by-id reader, which the
  `?route=` shared link now uses too) behind a "Loading climb…" placeholder, and a failed read
  closes the page with a toast rather than rendering a row that would read as "not recorded" for
  everything the list left out. `scripts/oneoff/probe-thin-list-select.mjs` runs the literal that
  ships against the live database: Baker 260 → 39 KB, Liberty Bell 635 → 62, Stone Fort 824 → 151,
  same order as the full select, name and area_type on every row. **Who else held that row and
  what they needed:** the route page's sibling list (`useAreaRoutes(route.mountainId)` — the
  prev/next cells and "More on this peak" rows read name, discipline, the grade chain, and
  `_dbArea.areaType` through `catOf → climbsAPeak`, which is why the embed keeps `area_type`); its
  approach picker, whose VIA route needs approach data, so every via id is now read in full by id
  (`useRoutesByIds`) and its thin sibling drops out of `_apSibs` until that lands — the picker's
  own "Loading the route this approach follows…" covers the gap; the reverse link
  (`approachFinishes`) reads siblings' `approach_variants`, so that column stays in the list; and
  the climb picker (`DbClimbPicker`), which hands a row to the LOG FORM rather than to openRoute,
  so it asks for `{ full: true }` under its own key. **What the guard does:** parses the readers
  (RouteRow, SummitBriefing, the sibling cells and rows, ApproachPicker, the two approach memos)
  and every function they hand a row to, across lib/DbAreaBrowser.jsx, lib/grade.js,
  lib/outing.js, ClimbMatchCore.jsx and RouteDetail.jsx; maps camelCase reads back to columns
  through dbRouteToCamel's own object; decides what IS a column from `scripts/schema-snapshot.json`
  (so `r.stars` is a column read and `r.cover`, seed-only, is not); and fails on a column read but
  not selected, selected but read by nobody, selected but not in the snapshot, or an embed without
  `name`/`area_type`. 55 reads over 22 readers resolve to the 18 columns, exactly. **Traps met
  building it:** Babel's `path.traverse` visits descendants only, so a property whose value is a
  bare `r.gain_ft` was invisible until the walk started from the property; RouteRow takes its row
  as a destructured prop, and ApproachPicker's `route` prop is the page's FULL route, so each entry
  names which props are rows rather than guessing from names; SummitBriefing aliases `routes` to
  `rs` and passes `effDistKm` by reference, so a local alias of the rows is a row and a function
  passed beside a row is walked. Before the snapshot was the column source, the suite's
  "select-drops-a-column" case was MISSED: `stars` left the select and stopped being "known", so the
  read was filed as seed-only — a guard that learns what a column is from the select it is checking
  cannot see the select lose one. **What it cannot see:** a NEW consumer of `useAreaRoutes` that this
  file does not list (add it to ENTRIES); a read spelled `row[expr]` beyond the string arrays it
  resolves (GRADE_SOURCES); a column the live schema gained since the snapshot. Suite:
  `scripts/oneoff/inject-list-row-columns-cases.mjs` (6/6: a reader gaining `length_m`, the select
  losing `stars`, the select carrying `descent_text`, the embed losing `area_type`, RouteRow renamed
  — all caught and named; a camelCase read of a selected column stays silent).
