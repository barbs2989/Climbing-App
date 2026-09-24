# Outages and failed reads

A failed read must never read as an empty account: `check:outage`, the outage-copy guards, `check:read-failures`, outage flag reach, overlay absence, and the reads that gate a write.

Part of the guard notes — see [README.md](README.md) for the full index.

- **`check:outage`** asks what a signed-in climber sees when the database is down, and asserts
  one sentence: **if an outage changes what a screen renders, that screen must SAY something went
  wrong.** It layers PostgREST interception under `check:signed-in`'s fixture and runs the same
  walk twice, healthy then failing, so a screen that is identical either way is seed-backed and
  proves nothing while a screen that CHANGES is where the outage is visible. Runs on every PR via
  `render-guards.yml`; not a build gate (browser + DB).
  - **The assertion is in the POSITIVE form, and that is the whole design.** The tempting version
    — *no screen may claim to be empty* — needs a list of every phrasing of nothing, and such a
    list has already missed two real defects found by this very script: the Home tiles read
    **"0 routes"** and **"0 crews"**, which no pattern of `no X yet` will ever match. Asking
    whether the screen *acknowledges the fault* needs no vocabulary of absence. The empty-phrase
    regex survives as a **reported** column and is never asserted on.
  - **`check:read-failures` is the near miss, and its own comment states the gap.** That build
    gate proves a failed read THROWS, and does not ask whether anything downstream concludes
    absence from the resulting emptiness. Something does: the caller catches and no-ops, state
    stays `[]`, and every render tests `!x.length` — so loaded-and-empty and never-loaded are the
    same screen. **Nothing lies; the truth never arrives.** Every other browser guard walks a
    healthy database, where the distinction does not exist.
  - **`isError` IS FALSE WHILE REACT-QUERY RETRIES, so the first screen walked is evidence of
    nothing.** That is the property making an `xUnavailable` flag safe — a slow read reads as
    loading, not as broken — and it means a walk starting immediately measures every screen
    before any read has given up, reporting a correctly-wired app as clean. Observed with
    `ONLY=objectives`: **Home said "0 routes" while Partners and Logbook, later in the same run,
    both said broken.** Taken at face value that sends somebody debugging a working fix. It now
    waits for the outage to become **observable** rather than for a fixed number of seconds, and
    re-walks Home at the end; the pair counts as ONE screen, so a single defect cannot fail the
    run twice.
  - **`says-broken` could not match the app's own copy.** The pattern carried a **straight**
    apostrophe (`couldn't`) while every string in this app uses a **curly** one, so that
    alternative had never matched once — every `says-broken=YES` it printed for months came from
    *"try again"* or *"unavailable"* instead, and a screen whose only honest sentence is
    *"Couldn’t load …"* read as clean. Same class as [[ssr-probes-must-match-escaped-html]].
  - **`ONLY=<table>` fails exactly one PostgREST table** and is what makes a verdict attributable
    to ONE query rather than to a blanket outage — with everything blocked, three flags on one
    screen go true together and no run can say which produced which sentence. Matched on the path
    segment after `/rest/v1/`, **never as a substring**: PostgREST names EMBEDDED tables in the
    query string (`select=*,crew_members(*)`), so a substring test fails requests aimed elsewhere.
    It isolates a **table, not a hook** — several hooks reading one table fail together.
  - **#1467 EXPLAINED A CI/LOCAL DISAGREEMENT WITH A REASON THAT IS FALSE, and the correction
    matters more than the original claim.** A blanket local run failed `Profile — the outage
    introduced ["0 logged"]` while the same commit passed all 16 checks in CI, and that commit
    message attributed it to the durable CI fixture having no logged climb — so "0 logged" would
    appear in BOTH runs and rule 2 would have nothing *introduced* to report. **It has one.**
    Measured with the service key (`scripts/oneoff/probe-durable-fixture-has-a-log.mjs`, read-only,
    because an anon count on an RLS-protected table returns 0 with a 200 whatever the table holds):
    `climb_logs` holds exactly one row, owned by **CI Fixture Owner**, on
    `wa_mount_baker_north_ridge`, noted *"CI fixture log."* — inserted by
    `seed-ci-test-fixture.mjs`, which has done so all along.
    - **THAT CORRECTION WAS TRUE OF THE TABLE AND FALSE OF WHAT THE APP COUNTS, so #1467's original
      reason was right after all.** Measured 2026-09-09: the row carries **`stars: null`**, and the
      hydration splits `climb_logs` on exactly that column —
      `if (row.stars == null) dbConds.push(item); else dbAscents.push(item);` — with only
      `dbAscents` reaching `logs`. So the fixture's "logged climb" was a CONDITIONS REPORT,
      `logs.length` was 0, and Profile read **"0 Climbs logged"** on a healthy run. *"0 logged"
      really did appear in BOTH runs*, which is what makes it unmeasurable, exactly as that commit
      said. **Having a ROW is not having a LOGGED CLIMB** — the correction settled the wrong
      artifact, which is this file's own *ask what a count is a count OF* lesson landing on a
      correction rather than on an audit.
    - **The fixture was writing a state the app's own form cannot produce**, which is why nothing
      noticed: `LogAscent` defaults `stars` to 5 and sends `undefined` only for a scout/"Conditions"
      report, so a `tick_type:"lead"` with null stars is unreachable through the UI. The seeder now
      writes `stars: 5`. **An existing fixture row is NOT updated by re-running the seeder** (it
      skips on its `user_id`+`route_id` filter), so the LIVE row was patched by hand at the same
      time (`stars: 5`, verified by read-back — a 200 is not evidence the data changed). The durable
      account now has a real logged climb, which is what makes the Profile tile measurable at all. Same class as
      [[the-fixture-manufactured-a-state-signup-cannot]].
    - **So the disagreement is REAL and its cause is UNKNOWN.** Recording it that way is the point:
      a plausible mechanism that has not been measured is a hypothesis, and this file already
      records three of those shipping as facts. The likeliest remaining candidate is the settle —
      `isError` is false while react-query retries, and this entry already documents the healthy
      capture racing a read — but nothing has measured it, so nothing here claims it.
    - **The lesson is about WHERE the claim was made.** It was written into a commit message, which
      is the one place this repo cannot edit afterwards without a force-push. A causal claim about
      CI belongs where it can be corrected; the correction lives here because the commit cannot.
  - Two fixture modes, exactly as `check:signed-in`: per-run accounts on the **service key**
    locally, two **durable** accounts on the **anon key** in CI. That rule is why this could not
    be lifted out of `scripts/oneoff/` unchanged — it called `createFixture` unconditionally.
  - Fails **closed** six ways, because every one of them prints identically to a clean app: the
    healthy run not booting (no control), the failing run not booting (a boot failure is not a
    data verdict), nothing intercepted, fewer than three screens differing, a sub-tab click that
    did not land, and an unreachable database — `assertDbReachable` runs first so an outage reads
    as *the database is down* rather than as the author's regression.
  - **THE COVERAGE GAP IT DECLARED WAS NOT EMPTY, and closing one sentence of it found four more
    false statements.** The entry below used to say a further sub-tab is out of frame. The Crew
    tab has **four** sub-views and this walked one: `crewView` defaults to `"crews"`, so Friends,
    Groups and Requests were three screens no outage run had ever opened — and a screen that is
    never opened has no findings for the same reason an empty query has no rows. Each is fed by
    its own unflagged query, and each asserts absence in its own words: *"No friends yet"*,
    *"0 joined"* / *"No groups yet"*, and **"No crew invites"** — which is the very sentence #734
    already shipped over a real invite, arrived at from the read side this time.
    - All three fail the same way and it is the shape this file keeps recording: the state is
      hydrated by an effect that **returns early on a miss** (`if(accepted.length)`,
      `if(!uid||!myGroupsQ.data)return;`) or read through a `||[]`, and sign-in clears it — so a
      failed read and a genuinely empty account leave byte-identical state.
    - Reached by **accessible name**, never by text: the badge count renders inside the button, so
      `textContent` is `"Friends2"`. The count is in the `aria-label` too, and an outage empties it
      back to a bare `"Friends"` — so the selector must accept both, which is what `tapByName`'s
      `^label(,|$)` anchoring is for. **A selector demanding the count could not find the control
      in exactly the state this guard creates.** That helper moved to `scripts/lib/tap-by-name.mjs`
      rather than being copied, so `check:ui` and this cannot drift on how a sub-tab is reached.
    - A sub-tab click that does not land leaves the **previous** view on screen, which compares
      clean against its healthy twin and reads as a screen with nothing wrong. That is a
      fail-closed path, not a note.
  - **IT WAS WALKING FIVE TABS AND A DUPLICATE, NOT SIX, AND `NAV` HAS SEVEN.** `TABS` ended with
    `"Me"` — and there is no control anywhere named "Me": `NAV`'s last two entries are labelled
    **"Ranks"** and **"Profile"**. So that click matched nothing, the previous screen stayed up,
    the **Logbook was measured twice under two names**, and two real tabs had never been opened.
    - **The guard's own header called this a LIMITATION and left it**: *"Logbook and Me returned
      identical text, so the Me click did not land"* — inherited from the probe, true, and read as
      a quirk of two similar screens rather than as a missing tab. Identical char counts on two
      different screens is not a coincidence to note, it is a navigation failure.
    - **The evidence was in the output the whole time.** The per-screen preview filters out every
      name in `TABS`, and `"Ranks"` and `"Profile"` kept appearing in it — they survived the
      filter *because the guard did not know they were tabs*.
    - Nav is clicked **by accessible name** now, and a nav click that does not land is fail-closed
      like a sub-tab one. Correcting it also fixed a quieter thing: the healthy **Climbs** screen
      went 554 → 1,293 chars, because the old text-click had been landing somewhere less complete
      than the real area browser.
    - **It found a defect on the first run of the corrected list.** `Leaderboards` builds your own
      row as `{...ME,routesLogged:logs.length,vertYr,daysYr,…}`, so a failed `climb_logs` read does
      not blank the board — it reports you as having climbed **nothing** and drops you down it,
      silently. The `"0 climbs to go"` shape on a screen whose entire subject is counts.
  - What it does **not** prove: that the wording is good, or that a screen the walk never reaches
    is honest. It covers **all seven tabs**, the Logbook's Completed sub-tab, the three Crew
    sub-views, the Home revisit, the **route page** and its **Photos** sub-tab — 14 screens; a
    surface behind an **overlay** is still out of frame, and the flag coverage is **measured, not quoted**:
    run `scripts/oneoff/measure-outage-flag-coverage.mjs`, which reads the handles and the flags out
    of the source. It said **41 handles, 21 flagged, 20 not** on 2026-09-03. **This file carried the
    number in THREE places and they disagreed** — "13 of the 25", "4 of 28" and "34 handles, 14
    flagged" — which is why it is a script now. The unflagged rest are mostly lookups where
    emptiness is never asserted, and that is a list to READ, not a coverage claim.
    - **The two unflagged ones that were CHECKED rather than assumed** (2026-08-26), so nobody
      re-derives them as defects: `useProfilesByIds` falls back to `user: p&&p.name||"A climber"`,
      so a missing reporter degrades to a generic label rather than printing `undefined` or
      inventing a level; and `useFullProfile`'s "Listed in partner search" toggle sits inside a
      `myProfileRowQ.data` gate, while the value it hands PartnerSearch is read as
      **`meListed===false`** — a strict check written precisely so UNKNOWN is not treated as OFF.
      That tri-state prop plus `===` at the reader is the pattern to copy.
    - **The route page reaches OVERVIEW and PHOTOS only**, because `?zr=1` opens `ROUTES[0]`.
      Overview is enough for `reportsUnavailable` (two of its six render sites are in that branch,
      and the first CI run measured healthy 5239ch against failing 5013ch). **Photos was added for
      `toposUnavailable` and that premise was WRONG** — topos render in `TopoSection` on **Overview**,
      and the Photos tab's own copy says so. The click is kept because it caught a different defect
      on its first run: the tab said *"No photos yet — be the first to add one."* under an outage,
      from `routePhotos` (composed from `useRouteTripReports`) plus `dbPhotos`
      (`useRouteContributions`) — two reads, one sentence, now gated by `photosUnavailable`.
      **Walking a screen nothing has walked is worth doing independently of why you walked it.**
      - **`toposUnavailable` is MASKED to THIS guard, and it has now been PROVEN both ways.**
        Overview is already `says-broken=YES` from `reportsUnavailable`, so rule 1 passes whether
        or not the topos copy flips, and `check:topo-outage-copy` proves the copy statically.
        Isolating it here needs a run failing only that read — **`ONLY=topos`**, not
        `topo_photos`: `useAreaTopos` selects `from("topos")`, and ONLY is matched on the path
        segment after `/rest/v1/`, so a wrong table name intercepts nothing and now says so.
        - **Measured over three runs, 2026-09-02**: it intercepts (4 blocked, 80 through) and
          reports `RouteDetail` **5,018 → 5,031 says-broken=YES** identically every time, with
          `RouteDetail:Conditions` and `:Photos` IDENTICAL — so the flag flips on Overview, the
          screen acknowledges the fault, and neither sub-tab is fed by that read. The guard's own
          comment had said `ONLY=topo_photos` (a storage bucket, not a PostgREST path at all) and
          that the mode could not clear a `>=3` floor, which **#1262 had already scoped to 1**.
          Two stale reasons kept a five-minute measurement unmade for months.
        - **`ONLY=` ALSO FAILS ON ONE ARBITRARY UNRELATED SCREEN PER RUN, so read the table rather
          than the exit code.** Those three runs failed on Ranks, Ranks and Crew:Groups — and Ranks
          reproduced its exact counts (1,170 → 1,148) **twice** before coming back IDENTICAL on the
          third. *Two agreeing runs are not determinism*, and a **catch** on a loaded box is no
          more evidence than the miss this file already records. Nothing on those screens can read
          topos: `useAreaTopos` has one call site, in `RouteDetail`, and Ranks is captured before
          the route page is opened. The mechanism is `waitOutFetch`, which in the failing run
          re-settles only while a **spinner** is on screen — enough under a blanket outage where
          every read fails fast, not enough under `ONLY=` where the other 80 reads are still in
          flight with no spinner to wait out. Deliberately unfixed: the repair is a more patient
          settle, it costs a settle per screen in the CI blanket run that has already timed out
          once, and CI never invokes `ONLY=`.
      - The other four sub-tabs are a **cost** decision — two more settles each, in each of two runs
        — and no flag lives on them. Click one when a flag lands on it.
      - **A FLAG HAS LANDED ON CONDITIONS, AND CLICKING IT IS HARDER THAN THIS NOTE IMPLIES.**
        `<ConsensusPanel … reportsUnavailable={reportsUnavailable}/>` renders behind
        `tab==="conditions"`, so the Overview walk proves the **flag** flips while that panel's own
        copy (*"Couldn't load this route's reports — try again in a moment."*) stays unexercised.
        Attempted 2026-09-02 and **reverted**; three things were learned, each caught by this
        guard's own fail-closed paths rather than by a red CI run, and each worth having before the
        next attempt:
        - **THE SUB-TAB ID IS NOT ITS LABEL.** The bar is `[["conditions", cragOnly ? "Send
          Reports" : "Reports"], …]`, so there is no control reading "Conditions" — clicking that
          name matched nothing and reported `__navFail`, 0ch. The label is also **conditional on
          the route's discipline**, so no single string is right for every fixture.
        - **A CLICK THAT RETURNS TRUE IS NOT EVIDENCE IT NAVIGATED.** `tapByText` clicks `hit[0]`
          of whatever matches; clicking "Reports" returned true and left the page on **Photos**, so
          the capture came back **byte-identical at 678ch** — indistinguishable from a screen with
          nothing wrong. This is the same failure the nav-click guard exists for, one level down,
          and the reason to compare the capture against the PREVIOUS screen rather than trust the
          return value.
        - **Neither label changes the screen when clicked AFTER Photos**, and the buttons carry no
          `textTransform`, so the innerText really is verbatim.
        - **ORDER IS THE ANSWER TO HALF OF IT, AND `check:overflow` HAD IT ALL ALONG.** That guard
          walks all six as `["Overview","Reports","Photos","Partners","Plan","Safety"]` and has
          done since #818 — **from Overview, "Reports" clicks fine**; from Photos it does not.
          Looking at the working sibling before writing a new walk would have skipped two runs.
        - **It is still NOT shippable, and the remaining reason is the interesting one.** Reordered,
          the click lands (no `__navFail`) — but the Conditions capture comes back **5026ch, exactly
          Overview's**, in both the healthy and failing runs. The inequality assertion passes, so
          the strings differ while the lengths match, and nothing available explains that. Coverage
          that cannot be explained is the false-coverage defect this file exists to prevent, so it
          was reverted a second time rather than shipped.
        - **SSR ANSWERS MOST OF WHAT THE BROWSER COULD NOT** (`probe-conditions-tab-unique-text.mjs`
          — no browser, no DB, so it runs on a box too loaded for a walk to be evidence).
          `RouteDetail` takes `initialSubTab`, so each sub-tab renders directly. On a bare route:
          **Overview 2,817 chars, Conditions 487, Photos 476**, all three distinct. So a correct
          walk should capture Conditions at roughly Photos' size — **not at Overview's 5,026**, and
          the 5,026 reading was Overview after all, whatever let the inequality assertion through.
          It also names the text an assertion can key on: *logbook*, *ascents*, *automatically* are
          unique to the Conditions render, and ConsensusPanel's outage sentence is correctly
          **absent** from the healthy one.
        - **SOLVED, AND IT WAS NEVER THE CLOCK: `tapByText` WAS CLICKING THE WRONG ELEMENT.**
          Dumping every match on a quiet box settled it. **Two** elements have the exact text
          `Reports` — the rating summary label (*"4.2 ★ 5 Reports"*, a **DIV**) and the sub-tab
          **BUTTON** — and the DIV comes first in DOM order, so `hit[0]` clicked the label, which
          does nothing, and returned **true**. The capture was 5,026 because it *was* Overview. The
          clock hypothesis is **withdrawn**.
        - **`check:overflow` HAS HAD THE SAME DEFECT SINCE #818**, which is the part worth keeping:
          it calls `tapByText(page, "Reports")` for that sub-tab, gets `true`, and reports a
          `route:Reports` row that is **Overview measured twice** — false coverage in a shipped
          guard, invisible because the row is present and green. Fixed in the shared helper, which
          fixes both callers: when several elements share the text it prefers a real control
          (`BUTTON`/`A`/`role="button"`) over the first match. Verified on a quiet box (load 4.7)
          — `check:overflow` still passes and now reaches that sub-tab for real, and with the walk
          applied `check:outage` captured Conditions at **3,388 chars**, distinct from Overview's
          5,026 and Photos' 678.
        - **THE WALK FOUND A REAL DEFECT ON ITS FIRST CI RUN, AND BOTH HALVES SHIPPED TOGETHER IN
          #1453.** Under a blanket outage `RouteDetail:Conditions` **CHANGED (3,388 → 3,384) and
          said nothing was wrong** — rule 1, on the very screen the walk was added to cover. The
          cause: `activity` is `route.activity + myReports + dbReports`, so a failed reports read
          drops the DB half and `buildConsensus` runs on what is left, presenting a **partial**
          derived safety judgement as complete. `ConsensusPanel` already received
          `reportsUnavailable` and consulted it **only on the empty branch**, so exactly this case
          was silent. It now carries *"Some reports couldn't load, so this is based on the ones
          that did — not on everything filed for this route."*
          - **This entry read "STILL NOT SHIPPED … land the caveat first, then the walk" for as
            long as both were live on main**, which is the
            [[an-audits-advice-rots-faster-than-its-counts]] shape landing on a guard entry rather
            than on an audit. A stated blocker that has since cleared is worse than no note: it
            sits in the worklist looking like work, and the next session re-derives a fix that is
            already there. When a limitation here is acted on, come back and replace it with the
            measurement.
    - **Photos is clicked by TEXT, not by accessible name**, and that is the opposite of every
      other sub-tab here: `tapByName` queries `[aria-label]` ONLY, and those six buttons carry
      `aria-current` plus their own text and no label. `scripts/lib/tap-by-text.mjs` is shared with
      `check:overflow` — extracted verbatim (proven byte-identical with whitespace stripped) rather
      than copied, because its **fixed/sticky filter** is the load-bearing half: a route sub-tab
      name collides with the bottom nav, so a global text match does not miss, it returns **true**
      having navigated elsewhere, and the caller then measures a tab believing it is on the route
      page. Settling stays with the caller.
  - **RULE 2's VOCABULARY HAS NOW BEEN SHORT FOUR TIMES, and the fourth is the instructive one
    because the fix for the third did not prevent it.** `"0 routes"`/`"0 crews"` (the Home tiles),
    `"0 climbs to go"`/`"0 logged"` (the Logbook), `"0 joined"` (Crew:Groups), and **`"No crew
    invites"`** (Crew:Requests) — the last two found by injections that **MISSED**, not by reading.
    The `no X` branch demanded the noun **immediately** after `no`, so it matched `"no crews"` and
    could not match `"no CREW INVITES"`: **one intervening word defeated it.** It now allows up to
    two words between, singular or plural. This is the
    [[a-deny-list-detector-is-defeated-by-one-more-adjective]] shape and it fails as a *shorter
    worklist*, silently — nothing about a quiet run looks wrong. It is still a deny-list and will
    be short again; when a screen is added, check what its emptiness is CALLED.
  - **THE STALE-BOOKKEEPING ALARM FIRED, AND CLOSING IT TOOK TWO FIXES, NOT ONE.** The
    crew-invites heading used to be unmeasurable: `"No crew invites"` was on screen in the
    **healthy** run too, because the fixture's mate JOINS the crew rather than staying invited, so
    rule 2 saw nothing introduced and rule 1 was satisfied by the friend-requests section beside
    it. A real gate on main that no guard could see. Its injection case therefore expected a
    **PASS**, as an alarm rather than a success.
    - The fixture now seats the owner as **INVITED in a second crew owned by the mate** — it has
      to be a second crew, since the owner is already *confirmed* in the first and there is
      nowhere in it to hang a pending invite. The **mate** does the inviting because that is what
      the live policy requires (`join or invite` demands `invited_by = auth.uid()` AND that you
      created the crew, or are seating yourself at a status other than confirmed); seeding it as
      the owner would manufacture a state the app's own flow cannot reach.
    - **The fixture alone did not close it** — the case still MISSED, because rule 2's vocabulary
      could not spell `"No crew invites"` either. *Two independent reasons a surface is invisible
      can hide behind one another*; fixing the one you predicted does not prove the other is not
      there. Only re-running the injection showed it.
    - Per-run and deleted in teardown, like the group and for the same reason: it is state the
      walk asserts on, so two concurrent runs would read each other's writes. Unlike the group it
      needs no visibility flip — `crews` RLS is `created_by = me OR I am a member`, with no public
      class, so it cannot surface in a real climber's app.
  - **A GUARD THAT THREW IS NOT A GUARD THAT DISAGREED.** Exit 1 from a crash — a dev server that
    never came up on a loaded box — was being filed by the harness as *"failed for the wrong
    reason"*, which reads as a defect in the checker and sends you editing a correct file. A run
    that produced **no per-screen table** is now reported INCONCLUSIVE, and every bad outcome
    prints the guard's own table: *"it did not catch it"*, *"that screen never settled so it
    compared equal and was skipped"* and *"it failed on a DIFFERENT screen"* are identical from an
    exit code and need three different repairs.
  - **A MISS ON A LOADED BOX IS NOT EVIDENCE.** The `ranks` case reported MISSED at a load average
    of ~450 and CAUGHT at ~260 **on the same commit**. Re-run a miss on a quiet machine before
    believing it — [[chrome-ext-has-no-site-permissions]] is the same lesson from the other end.
  - **THE INJECTION HARNESS EDITS THE APP FILES IN PLACE, so do not commit while it runs.** #1190
    was committed mid-suite and captured whichever revert happened to be live, shipping to main
    without the crew-invites gate — the branch was not what the green run measured. Check
    `git status` is clean *and* that no injection job is in flight before `git add`.
    - **AND TWO RUNS OF ONE SUITE MUST NEVER OVERLAP, which is the same hazard and strictly
      worse.** Both snapshot, edit and restore the same files, so run B's snapshot can capture
      run A's injected text and then **"restore" it permanently**. Met for real on 2026-09-09:
      a second `inject-offline-claim-cases` run was started while the first was still going, and
      the working tree ended up holding `setTripPack`, `tripPack`, `dlPending`, a gutted
      `saveAreaIds` call, the hydration effect **moved above the sign-in reset**, and one
      reworded sentence in `RouteDetail.jsx` — each written back as though it were the original.
    - **The RESULTS being worthless is the harmless half.** Cases reported `HARNESS BUG — 0
      matches for its find string` and `MISSED` against a guard that was fine, which reads as a
      guard defect and sends you editing correct code; the run before it had reported 12/15 for
      the same reason. The corrupt **working tree** is the part that outlives the run, and one
      leftover was found only because a later case's find string stopped matching.
    - **A note was not enough, so it is now a LOCK.** `inject-offline-claim-cases.mjs` takes an
      exclusive `wx` lockfile (released on exit, throw and SIGINT), **refuses to start unless the
      guard is already green** — a dirty tree makes every case unattributable — and checksums
      every file it may touch before and after, reporting `TREE NOT RESTORED` rather than
      exiting 0 on a tree it has damaged. Copy those three when writing the next suite.
  - **THE PROFILE TAB'S OWN SECTIONS ARE NOW ASKED AND PROVEN, and this entry used to say the
    opposite in two different ways.** It read *"NOTHING HAS YET ASKED … `MyFiledReports` and
    `CatchLedger` are DB-backed and **unflagged** … an absence the fixture happens to share is
    **unmeasurable**"*. Both halves are wrong now, and they were wrong for different reasons.
    - **"Unflagged" went stale.** `filedReportsUnavailable` and `catchesUnavailable` shipped in
      #1239, were dropped by #1248's stale-base squash, and were restored in #1253. Both are read
      today — the first gates a *Reports you've filed* block, the second drives the AT A GLANCE
      tile (`"—"` / *"couldn't load"*) and is handed to `CatchLedger` as a prop.
    - **"Unmeasurable" was never true once the flags existed**, and the paragraph's own sub-bullet
      said why without applying it to itself: the flag keys on `isError`, **not on whether any row
      exists**, so a failed read CHANGES the screen whether or not the fixture has data. The
      sections being empty in both runs is beside the point; what the outage adds is copy that was
      not there.
    - **Measured, one query at a time, which is what makes each verdict attributable:**

          ONLY=user_reports    Profile 1797ch -> 1882ch  CHANGED  says-broken=YES
          ONLY=belay_catches   Profile 1797ch -> 1780ch  CHANGED  says-broken=YES

      Every other screen was IDENTICAL in the first run, so nothing else can account for it. The
      two move the length in **opposite directions** — one adds a *couldn't load* block, the other
      collapses a tile — which is independent evidence they are different code paths rather than
      one flag being seen twice. `belay_catches` also changes **RouteDetail** at the same character
      count, caught because this guard compares LINE SETS rather than length.
    - **Guarded by the DEFAULT run, not only by a hand-typed `ONLY=`.** Under a blanket outage both
      reads fail like every other, so the Profile changes and rule 1 demands it acknowledge the
      fault — which it does. `ONLY=` was needed to make the verdict ATTRIBUTABLE to one query
      apiece, not to make it visible; with everything blocked, three flags on one screen go true
      together and no run can say which produced which sentence.
    - **The lesson is the entry, not the flags.** A stated gap that has since closed is worse than
      no note: it sits in the worklist looking like work. When a limitation here is acted on, come
      back and either delete it or replace it with the measurement — the same standard
      `PARTIAL_ON_PURPOSE` and `KNOWN` are held to, applied to prose.
- **`check:outage-copy`** asserts that an overlay tells a **failed read** apart from an **empty
  account**, by rendering the real component in both states. Two overlays today (`Inbox`,
  `FriendsList`), plus one surface that is neither an overlay nor a tab. Static (SSR of
  `ClimbMatchCore.jsx`), so it sits in `npm run build`.
  - **IT NOW COVERS A SURFACE EVERY GUARD WAS OUT OF FRAME FOR.** The **Manage areas** screen lists
    all 50 `US_STATES` with a line under each, driven by `cnt` =
    `dbSt ? dbSt.route_count : (st ? areaMatchCount(st.id) : 0)`, where `dbSt` comes from
    `useStates()`. When that read **fails**, `dbSt` is undefined for every state and the seed
    `MOUNTAINS` fallback holds only **four** (California, Colorado, Utah, Washington) — so **46 of
    50** read *"Catalog coming soon"*, dimmed, with the row's own click handler returning early so
    it could not even be tapped.
    - **Worse than the usual shape of this class, twice over.** It is a false claim about the
      **product** rather than about the climber's own data; and it lands on the one screen whose
      whole purpose is downloading a catalog **for use without a signal**, so it was wrong exactly
      when somebody needed it.
    - **Three near misses, each instructive.** `check:outage` walks seven tabs and this is not a
      tab. `check:overlay-absence` walks what `check:overlay-discovery` finds, and that discovery is
      **behavioural** — it wants `role="dialog"` as the region's first element, while this is a
      `position:fixed; inset:0; zIndex:200` full-screen view with **no role**: an overlay to a
      climber and not one to any guard. And even had it been discovered, that guard's `CLAIMS`
      vocabulary is a deny-list of *"no X yet"* / *"0 X"* / *"nothing here"* shapes — **"Catalog
      coming soon" matches none of them**, the
      [[a-deny-list-detector-is-defeated-by-one-more-adjective]] failure this file already records
      **four** times for `check:outage`'s rule 2, arriving a fifth time in a different guard.
    - **Adding `role="dialog"` would pull the screen into four separate walks** and is a bigger
      change than the fix; recorded rather than done.
    - The copy is a **pure function** (`stateCatalogLine`, in core) so all three branches are
      **executed** rather than rendered — this line lives in `App`, which no SSR guard stands up.
    - **THE WIRING IS ASSERTED AS SOURCE BESIDE IT**, because executing the function proves the
      sentence and not that App still calls it. A stale-base squash takes exactly that half: the
      flag arrives `undefined`, reads as falsy, and every copy assertion still passes while 46
      states go back to having no catalog.
    - Injection-tested: removing the outage branch fails **2**; dropping the flag at the call site
      fails exactly **1**, naming the broken link. The healthy-side cases stay green in both — a
      state whose catalog genuinely is not built yet must still say so, and a count already in hand
      must not be overwritten by an error.
  - **AND AN EARLY-RETURN SCREEN, which is the other half of the same blind spot.** `App` returns
    early for nine screens and the **guide dashboard** is one, so it is not a tab `check:outage`
    walks — and being a `position:fixed; inset:0` full-screen view with no `role="dialog"`,
    `check:overlay-discovery` does not classify it as an overlay either.
    - `useGuideProfile(uid)` handed back `undefined` for **two opposite states**: a climber who has
      genuinely never applied, and a read that **failed** (react-query leaves `data` undefined on
      error). The screen collapsed them, so an approved guide whose profile did not load was told
      *"You haven't applied to guide yet."* above *"Settings → Become a guide starts an
      application."* — a false claim about the user's own **history**, offering the wrong remedy.
      Worse than the usual *"you have none"*.
    - `check:read-failures` cannot see it: that guard scans **`lib/db.js`** and proves a failed read
      throws, which `useGuideProfile` does. The conclusion is drawn at the reader.
    - **The rest of the guide surfaces are CLEAN, checked rather than assumed** — `DbGuideDashboard`
      already gates *"No inquiries yet."* and *"No reviews yet."* on `inqError`/`revError`, and
      `DbGuides` gates *"No guides listed yet."* and *"No reviews yet."* on `guidesError`/`revError`.
      Only the profile read was ungated.
    - **`isGuideVerified(credentials || [])` is deliberately NOT gated**: a failed credentials read
      drops the ✓ badge, which is **under**-claiming rather than a false statement. `verified` is
      consumed at exactly three places and every one is that badge and nothing else
      (`DbGuideDashboard` once, `DbGuides` twice) — nothing downstream gates an action, a price, a
      booking, or a claim in words. Recorded so it is not re-derived as a defect.
    - **THE REASON FIRST RECORDED HERE WAS WRONG, and the wrong reason is the dangerous half.** It
      said *"there is no second source to fall back to"*. There is: `guide_profiles.active_disciplines`
      is maintained by the `sync_active_disciplines()` trigger whose WHERE clause is **exactly**
      `isGuideVerified`'s predicate (`kind='primary_track'`, `status='verified'`, unexpired), and it
      arrives on a **different query**, so a failed credentials read does not lose it.
      - **Falling back to it would be a REGRESSION, which is why the conclusion survives the
        correction.** `0021` says outright that it is a denormalised **cache** with **no cron** —
        reconciliation is opportunistic, *"the cache is never more than one page-load stale"* — so a
        credential that has quietly crossed `verified_expires_at` leaves `active_disciplines`
        non-empty until `reconcile_guide_verification()` runs. `isGuideVerified` re-checks expiry at
        render, which is precisely why the badge is honest. Substituting the cache would risk showing
        **✓ for a lapsed credential**: over-claiming a safety credential, which is worse than the
        under-claim it would cure.
      - So the rule is **not** *"no second source exists"* but *"the second source cannot re-check
        expiry"*. Written the old way, a future session that goes looking, finds `active_disciplines`
        and "fixes" the badge with it would ship exactly the defect this bullet exists to prevent.
    - Executed rather than rendered, and here that is not convenience: the dashboard needs a session,
      a portal and four queries, and it lives in `lib/` so it is not in the core bundle. `lib/db.js`
      is ~164kB against core's ~1.1MB, so the second esbuild is cheap.
    - Injection-tested: reverting the copy fails **3**; dropping the flag at the call site fails
      exactly **1**, naming the broken link. The three never-applied cases stay green in both — a
      climber who really has not applied must still be told where to.
  - **THE SAME READ, ONE SCREEN OVER, COSTS DATA RATHER THAN TRUST — and that one is the reason to
    finish a census rather than stop at the first finding.** `DbGuideApply` reads the same guide
    profile to decide what to show:

        if (existing && existing.status !== "draft" && existing.status !== "rejected") → status screen
        otherwise                                                                     → the FORM

    `existing` is undefined both when nobody has applied **and** when the read failed, so a failed
    read fell through and showed an approved guide a **blank application**.
    `submitGuideApplication()` is an **`upsert` on `guide_profiles` keyed by the user's own id**, so
    submitting it would overwrite a live listing back to `"submitted"` — title, base location and
    all — with whatever was typed into the empty form.
    - So the screen **refuses** rather than guessing. Blocking a first-time applicant during a
      transient error costs a retry; letting an approved guide overwrite their own listing costs
      the listing. Not symmetric, so the safe branch is not the permissive one.
    - **ORDER IS THE INVARIANT, and it is asserted rather than assumed.** The refusal must come
      **before** the branch that tests `existing`, because `existing` is exactly the value that
      could not be read — a guard placed after it is unreachable in the case it exists for. That is
      the ordering trap `check:clickable` already records, where a block after an exiting one never
      ran. Injection-tested by **moving the guard after** the status branch, leaving it present:
      exactly **1** assertion fires, and the presence-only ones stay green, so the ordering check is
      not redundant with them.
  - **AND SO IS THE CLASS THE SECOND ONE BELONGS TO: a WRITE that destroys data after a failed
    read. Measured across all 45 write functions in `lib/db.js`; the answer is ONE, and it is
    fixed, so no detector is warranted.** A detector for a class of one is the thing this repo
    keeps refusing to build.
    - **Six `upsert`s, and five cannot destroy anything by construction**: `addVerification`,
      `castHazardVote`, `giveVouch`, `markCrewRead` and `setCommentReaction` each build a small
      self-contained row **entirely from their own arguments** and consult no existing data.
      `submitGuideApplication` was the only one taking an opaque `fields` object that IS the whole
      row — which is exactly why it could overwrite a live listing.
    - **Of 24 `update`s, 17 name their own columns** (`{ status }`, `{ read: true }`,
      `{ likes: next }`) and are deltas that cannot blank a neighbouring field. Of the 7 that take a
      caller-supplied object, two build the patch internally, and the remaining five are safe for a
      reason worth stating precisely: **their entry point is a ROW produced by the very read in
      question**, so a failed read leaves no row to tap and the form is unreachable.
    - **THAT is what made the guide application different, and it is the transferable rule.** Its
      entry point is a Settings button offered **unconditionally**, so the form was reachable while
      the read that would have blocked it had failed. When auditing this class, ask whether the
      ENTRY POINT is gated on the read, not whether the form is.
    - Incidental, recorded rather than acted on: `updateTopoLine` is imported by all three app
      files and **called by none of them**. Dead wiring, not a defect.
  - **THE MIRROR CLASS IS ALSO EMPTY: an OPTIMISTIC change that survives a failed write.** Every
    `.catch` on a `lib/db.js` write call was read (69 write functions, 84 call sites). **29 restore
    state** — a setter, a named undo handler, or a `refetch`. **Four are optimistic and say so**,
    which is correct rather than a defect: `sendCrewMessage`/`sendDirectMessage` toast *"it's on
    your screen but not saved"*, and `markCrewRead`/`markDmThreadRead` clear a read badge that a
    reload restores from the server — a read marker is not the climber's content, and there is no
    success message in front of it, so `check:writes`' rule is untouched.
    - **The remaining candidates were PROXIMITY NOISE, and the cause is worth naming.** A first
      scan reported eight, on the rule *"a `set*` call appears within 500 characters before the
      write"*. On a file that packs a whole component's props onto one physical line, "before" is
      not "in the same handler": `onInviteByEmail`'s catch was scored against `onInviteMember`'s
      `setCrewInvite`, several props away. Both crew-invite sites in fact call their `done()`
      callback **only inside `.then`**, so no optimistic mutation exists to revert.
    - The first version of that scan also called five genuine reverts unguarded, because it looked
      for `set[A-Z]` and the app writes `_setVis(_pv)`, `_setMods(cmod)`, `catch(_undoLeave)`,
      `catch(cmFail)` and `_restore(setCondReports, …)`. **A too-narrow proxy manufactures
      findings here rather than hiding them** — it would have sent somebody to "fix" five correct
      handlers.
  - **AND THE THIRD DIRECTION IS EMPTY TOO, so the write side is closed: a write that SUCCEEDS
    whose result never reaches the screen.** That is the mirror of the two above — the climber's
    change vanishes until reload, so a successful write reads as a failure. Of 43 write call sites
    carrying a `.then`, **40 update the screen** (a setter, a `refetch`, an `invalidate`) and the
    three that do not are non-findings: both crew-invite sites pass `done`, which is
    `()=>emailInvitesQ.refetch()` at the call site, and `reportPhoto`'s toast is the only sensible
    feedback for a write that goes to a moderation queue the reporter cannot see.
  - **THE REST OF THAT SCAN WAS RECORDED AS UNMEASURABLE THIS WAY, AND IT IS MEASURED NOW: 70 write
    call sites, ZERO with the result unhandled.** It also flagged 13 writes with no `.then` and no
    optimistic update "before" the call — including `saveObjective`, `addComment` and
    `createClimbLog` — and concluded *"every one is a false positive"* **while admitting the
    instrument could not tell**: the optimistic `setUserLists(...)` for `saveObjective` sits **~700
    characters earlier on the same physical line**, outside the 260-character window the scan used.
    On a file whose longest line is 58,365 characters, *"before the call"* is not a scope — the same
    failure as [[a-partial-measurement-agrees-with-what-you-expect]] — and answering it properly
    needs the enclosing HANDLER resolved rather than a window.
    `scripts/oneoff/measure-optimistic-writes-by-handler.mjs` resolves it with Babel, and **the
    claim holds**: 5 of the 13 have their optimistic setter in the same handler and simply sat
    outside the window, and the climb-log pair is handled downstream through `op.catch(...)` /
    `return op.then(...)`, which the source says in its own comment. *A plausible mechanism nobody
    measured is a hypothesis*, and this one survived the measurement.
  - **TWO THINGS IN THAT MEASUREMENT ARE WORTH MORE THAN ITS COUNT.** **A NAME IS NOT THE
    FUNCTION**: v1 matched the callee's name against the write vocabulary and reported **10
    `addComment` sites** as unhandled, because `ClimbMatch.jsx` declares a LOCAL wrapper whose
    `.then(cmRefetch)` / `.catch(cmFail)` — including a *"Could not save your comment"* toast —
    lives one level in, with the db function imported under an **alias** the name test could never
    see. Only `scope.getBinding` separates the two, the trap this file already records for
    `clickable`, where a local boolean shadowed the helper while `check:refs` stayed green because
    the identifier WAS bound. And **a report of 0 is exactly what a scan that can no longer fire
    prints** — a risk that grew the moment `handled()` learned to follow a variable, since every
    widening of *handled* shrinks what can be reported — so the classifier is exercised on **four
    constructed shapes first** and refuses to report on the app unless it reproduces them.
    Fixtures rather than live code, deliberately: three of the four do not exist in the tree, which
    is the finding, and a self-test drawn from the code under test cannot show that.
  - **THE EARLY-RETURN CLASS IS NOW CLOSED, 2 defects in 9.** `App` returns early for nine screens
    and both defects were the guide pair above. The other seven are non-findings with reasons, so
    nobody re-derives them: **Calendar**'s *"No events yet"* reads `events`, a `useState` seeded
    from `DEMO_FILLERS` — client state, no read to fail; **EditProfileScreen**'s *"No certifications
    added yet"* / *"No skills added yet"* describe `editDraft`, a `useState(null)` seeded when the
    climber taps Edit; **LegalView** asserts no absence at all; **AuthModal**'s *"no account to
    federate yet"* is explanatory OAuth copy, not a claim about stored data; and **Inbox** was
    already gated. *Ask what fills a list before treating its empty state as an outage lie.*
- **`check:topo-outage-copy`** asserts the TOPO box tells a failed read from a route with no topo.
  - **IT COVERS A SECOND SURFACE IN THE SAME FILE NOW — PITCH COMMENTS — and shares the bundle rather
    than paying for a second 400,000-character esbuild run**, which is the cost this entry already
    weighs below when it declines to fold into `check:outage-copy`. The name is narrower than the
    contents; the rename was deliberately NOT done in the same change, because this guard shipped
    hours earlier from another session and this repo has now recorded **three** collisions in one day
    from two sessions editing one thing.
    - `comments` on the route page is `(dbComments.data||[])`, so a failed `useComments` read and a
      pitch nobody has commented on left **byte-identical** state, and the box said *"No comments yet
      — be the first to add beta for this exact pitch."* to a climber whose pitch may already carry
      beta. `check:read-failures` passes on `useComments` — it throws exactly as required — which is
      that guard's own stated limitation: it never asks whether anything downstream concludes ABSENCE.
    - **NOTHING ELSE REACHES THIS BOX.** `check:outage` walks the route page but only Overview and
      Photos, and `PitchComments` renders inside an **expanded** pitch — `PitchTable` holds
      `useState(null)`, so no pitch is open until somebody taps one, and no SSR guard can click.
      Rendering the COMPONENT directly steps around the expansion state entirely.
    - It takes the flag as a **prop**, which is what makes both branches reachable at all: this
      guard's own header records that react-query does not surface a cached error under
      `renderToStaticMarkup`, so a flag read off a hook *inside* the component under test is
      unprovable.
    - **THE RENDER PROVES THE COPY AND NOT THE WIRING, and the wiring is the half a stale-base squash
      takes.** The component is rendered with the prop handed to it directly, so a merge dropping
      `commentsUnavailable={…}` from any call site would deliver `undefined`, read as falsy, and every
      copy assertion would still pass while the box went back to lying. The four-link chain across two
      files is asserted as **source** for that reason — `check:dead-props` covers *a call site passes
      a prop nothing destructures*, and the exact opposite is covered by neither of its directions.
    - Injection-tested both halves: reverting the copy fails **3** cases and leaves the healthy-side
      three green (specific, not firing on any change); dropping the prop from the `<RouteDetail>`
      call site fails exactly **1**, naming the broken link.
    - **The shared `Comments` component is deliberately NOT gated**, checked rather than assumed: it
      renders the list when non-empty and **nothing** when empty — no absence copy anywhere in it — so
      a failed read makes it render less, never make a false claim.
  `toposUnavailable` was the one outage flag **nothing had ever proven**, and `check:outage`'s own
  header said why: rule 1 asks whether a screen ACKNOWLEDGES the fault, and Overview is already
  `says-broken=YES` from `reportsUnavailable`, so the topo copy is **masked** — rule 1 passes
  whether or not it flips. Reading that stated frame as a worklist found the flag **half-wired**.
  Static (SSR + a pure function), so it sits in `npm run build`.
  - **The headline flipped and the explanation under it did not.** An outage read *"Couldn’t load
    the topos"* and then *"A topo overlays the route line… **Got a clear shot? Add it** and draw the
    line so the next party can follow it."* above an **Add a topo photo** button — an honest
    headline over a body still presuming there is nothing there.
  - **It is the ONLY one, measured rather than assumed, so no detector for the class was built.**
    All 17 `xUnavailable` flags and every render site were swept: every sibling conditions its
    explanation too, several saying so outright (`sibsUnavailable` *"this is not a claim that there
    are none"*, `crewInvitesUnavailable` *"do not read this as none waiting"*). A `groupsUnavailable`
    hit was a **false positive of the sweep's own heuristic** — its body really is conditioned. *A
    detector for a class of one is the thing this repo keeps refusing to build.*
  - **REACT-QUERY DOES NOT SURFACE A CACHED ERROR UNDER `renderToStaticMarkup`, and that is why
    this had never been proven.** Measured directly: with the cache in `status:"error"` the hook
    returns `{status:"pending", isError:false, isLoading:true}`, so `TopoSection` takes its
    *"Loading topo photos…"* branch and never reaches the empty state — neither `retry:false` nor
    `refetchOnMount:false` nor `staleTime:Infinity` changes it. **That is why every provable sibling
    (`ConsensusPanel`, `CatchLedger`, `FriendsList`, `Inbox`) takes its flag as a PROP**: a flag read
    off a hook INSIDE the component under test is unreachable to SSR. Same family as *effects do not
    run under `renderToStaticMarkup`*.
    - So the decision comes out instead of the query going up: **`topoEmptyCopy(unavailable)`** is a
      pure exported function, the way `seasonShort()` and `campDetail()` are. Half one **executes**
      both branches; half two **renders** the healthy one end to end, which proves that function's
      output reaches the markup. What it does **not** prove — that the failing branch's markup
      appears in a browser — is stated in the script rather than implied.
    - **The two renders came back BYTE-IDENTICAL at 505 characters first**, because a cache with no
      entry is `pending` and both sides were measuring the loading branch. Four assertions failed
      against a branch that was never under test. The tell was the lengths matching *exactly*; the
      guard now fails closed under 900 characters for that reason.
  - Two traps beyond the ones its siblings record. `RouteDetail.jsx` **imports `USE_DB` without
    re-exporting it**, so reading it off that bundle gives `undefined` — the fail-closed check then
    reported *"the flag can never fire"*, catching the guard rather than the app; a generated entry
    re-exports both. And **`createClient` builds a RealtimeClient AT CONSTRUCTION**, which needs a
    `WebSocket` constructor — native on node 22, absent on 20 — so it is stubbed explicitly rather
    than passing in CI and dying on a contributor's machine.
  - **A GATE, NOT A PROBE, because this exact fix is the invisible kind**: it changes a string and a
    call, not a NAME, so `audit:silent-reverts` cannot see a stale-base squash undoing it — that
    audit says so in its own caveat and #1267 is the recorded incident. Deliberately **not** folded
    into `check:outage-copy`: that guard merged two probes to stop esbuild reading one 400kB file
    twice, and `TopoSection` is in a different file, so there is no bundle to share.
  - Fails **closed**: a missing export, a thin render, or fewer than 8 cases are each a broken
    guard. Injection-tested **5/5** (`scripts/oneoff/inject-topo-outage-cases.mjs`), each case
    proving its edit landed **by checksum** and restoring the file byte-identically. Case 1 is the
    real historical defect. **Case 3 must fail on the HEALTHY side** — deleting the invitation from
    both states also silences case 1, so a guard asserting only the outage half would go green on a
    blanket rewrite that turned a correct empty state into an error message.
**A failed READ must not read as an empty one — and `check:read-failures` now enforces it.**
That rule sat here as prose for exactly one commit, which is one longer than it should have:
a semantic invariant in a comment rots, and this file records that lesson twice over
(`check:correction-readers`, `check:crew-member-readers`). The script is the enforcement.
  - It fails on any exported function in `lib/db.js` that answers a PostgREST `error` with an
    **empty** value — `[]`, `{}`, `""`, `0`, `false`, or a bare `return` — unless the function is
    in `DECLARED` **with a reason**. A **stale** declaration fails too, so the list cannot rot
    into a description of code that is gone. One entry today: `claimMyCrewEmailInvites` degrades
    on `PGRST202` specifically, which is an unapplied migration rather than a failed query.
  - `null` and `undefined` are deliberately NOT "empty": a caller has to null-check them, so the
    failure stays visible. Only values that read as *"there is nothing"* are forbidden.
  - **It does not attempt the strong form** — *does anything downstream conclude absence from
    this emptiness?* — which needs caller analysis across two 400kB files and would flag correct
    guard clauses. A guard that flags correct work teaches people to ignore it, which is worse
    than the hole it closes. It checks the half that is checkable.
  - Matches the `error` **identifier** via the AST, never the word, so the prose above cannot
    trip it — the false pass `check:ci-cancel` records from the other side. Fails **closed**:
    fewer than 50 exported functions found, or an unparseable file, is reported as a broken scan
    rather than a clean one.
  - Injection-tested 5/5, each case proving its edit landed **by checksum** first. Cases 1 and 2
    reproduce the real historical defect. **Both initially read as MISSED and the guard was
    innocent** — the injection had left a comment fragment dangling, producing invalid JS, and
    the guard failed closed on the parse instead of naming the function. *An injection that
    produces a different failure is not a catch;* fix the case before doubting the check.
  - Case 4 must **PASS**: a comment describing the forbidden shape is documentation.
  - **SECTION 2 — ONE `queryKey`, ONE IMPLEMENTATION**, because section 1 asks what a function
    returns on an error and is blind to a read **whose body is not the one that runs**. React Query
    keeps one Query object per key and executes the `queryFn` belonging to whichever observer
    triggers the fetch, so two call sites sharing a constant key are interchangeable at runtime.
    - **It was live.** `useMyHomeStatePath` — reached from the search box via `useRouteSearch` —
      declared its own body on **`useStates`' key** `["area-children","roots"]`, with a comment
      saying it shared that cache entry *"rather than adding a fetch"*: true about the **cache**,
      false about the **body**. The two disagreed on both things that matter — `useStates` binds and
      throws both errors and wraps in `orOffline(…, offlineStates)`; the copy discarded both errors,
      returned `[]`, and had no offline fallback. They also disagreed on `staleTime`.
    - **The consequence is a defect this file already documents at length, reached around the flag
      that fixes it.** If the copy's body fetched, a failed read produced `[]` with `isError`
      **false**, so `statesUnavailable` stayed false and **Manage areas told a climber 46 of 50
      states have no catalog** — `check:outage-copy`'s founding case, re-armed. Being offline took
      the same path and silently bypassed the downloaded catalog, which is the one screen whose
      whole purpose is working without a signal.
    - **NOT A NEW GUARD, and the measurement is why**: 12 constant keys in `lib/db.js`, exactly
      **one** clash (`scripts/oneoff/measure-shared-query-keys.mjs`). A detector for a class of one
      is what this repo keeps refusing to build, so it is an assertion inside the guard whose
      subject it already is — a body that cannot throw *is* a failed read a caller reads as an empty
      one — costing one traversal and no new file.
    - **Only CONSTANT keys are compared.** A key holding a variable (`["route-search", qq, lim]`) is
      per-call, so two such sites are different queries and flagging them would report correct code.
    - **The repair is to COLLAPSE, never to make the two bodies match** — matching restarts the
      drift, which is the whole lesson of the four grade parsers. `useMyHomeStatePath` now calls
      `useStates()`. `enabled` was `!!loc` there and is unconditional in `useStates`, and App mounts
      `useStates` already, so this adds no fetch.
    - Fails **closed**: parsing no constant key at all would make every comparison vacuous.
      Injection-tested 2/2 (`scripts/oneoff/inject-shared-query-key-cases.mjs`); **case 2 must stay
      SILENT** — two call sites with an identical body are a legitimately shared query. Its first
      version lifted `useStates`' body and balanced parens from `queryFn:`, which stops at the
      arrow's own `()` and emitted `queryFn: ()`; the guard then failed on a **parse error** and the
      case read as a miss. *An injection that produces a different failure is not a catch.*
  - **SECTION 3 — inside a `queryFn`, a supabase await must BIND `error`.** Sections 1 and 2 both
    need the error in scope before they can say anything: one asks what you return when you test it,
    the other whether a sibling body throws. A read that **never binds `error`** is invisible to
    both — and that is how #1404 reached production from `lib/auth.js`, and how `useMyFiledReports`
    handed the Profile an empty list without throwing, leaving `filedReportsUnavailable` unable to
    fire for half its failures.
    - **Exact rather than stylistic inside a queryFn**: react-query's `isError` is the ONLY channel
      a query has to report failure, and every `xUnavailable` flag in the app keys on it. An error
      discarded there is a failure the UI structurally *cannot* learn about.
    - **It codifies what the file already did.** Measured before proposing it: **58 supabase awaits
      inside a queryFn bound `error` and exactly 1 did not**
      (`scripts/oneoff/measure-queryfn-discarded-errors.mjs`). That one — `useMyHomeStatePath`'s
      `my-uid` lookup — was **fixed rather than exempted**, so the rule ships with **no exemption
      list and therefore nothing that can rot**. Add one only when a genuine exception appears.
    - **Scoped to queryFns deliberately.** The same shape before a WRITE is correct: a null uid
      meets RLS and the write's own error surfaces, so flagging all 15 such sites in `lib/db.js`
      would report correct work. Injection case 5 pins that silence.
  - **THE SCOPE WAS `lib/db.js` ALONE, AND THAT WAS A STATED FACT READ AS A GUARANTEE.** This entry
    used to record that applying the predicate to `lib/auth.js` finds **zero sites** — true of the
    predicate, and not a statement about the file. #1404 was a read in exactly that file. Both
    scopes are **discovered**, never listed: section 1 walks every `lib/` file touching `supabase`
    (**6**), sections 2 and 3 walk every file declaring a `useQuery` (**2** — the four admin panels
    match on `useQueryClient`, which is invalidation, not a declaration). The reach went **187
    exported functions in 1 file → 229 across 6**.
    - **Section 2 compares keys ACROSS files, and must**: a `queryKey` is global to the QueryClient,
      so one declared in `lib/db.js` and again elsewhere is ONE Query object with one winning body.
      A per-file comparison reports clean on precisely the fork hardest to spot by reading.
    - Fails **closed** four ways: `lib/db.js` missing from either scan, fewer than 3 read files or 2
      query files discovered, no constant key parsed, and fewer than 20 supabase awaits examined
      inside queryFns. `DECLARED` is keyed **`file:function`** now, so two same-named exports in
      different files cannot excuse each other.
    - Injection-tested **5/5** (`scripts/oneoff/inject-read-failures-scope-cases.mjs`), each edit
      proven **by checksum**. Cases 1 and 2 prove the guard can now SEE the other files — which is
      the point, since it already fired inside `lib/db.js`. **Cases 3 and 5 must stay SILENT**: a
      key holding a variable is per-call, and a discarded session error before a write is correct.
**The three that prompted it.** `check:writes` already forbids a success
message in front of a write whose failure is unobservable; the read side had no such rule, and
`lib/db.js` held three message fetches that answered a database error with `[]`. Every caller
drew a conclusion from that emptiness:

  - the two pagers (`fetchOlderCrewMessages`, `fetchOlderDirectMessages`) set
    `crewMsgMore`/`dmMore` false — **permanently hiding the "load older" control** for that chat —
    and toasted **"No earlier messages"**, while the `.catch` carrying the correct
    *"Couldn't load earlier messages"* was **UNREACHABLE** because the fetch swallowed the error.
    An error handler nobody can reach, already phrased right, is the tell that the distinction
    was intended and lost.
  - `fetchMyDirectMessages` feeds the Inbox, where `[]` renders **"No friend chats yet"** and
    invites the user to go message somebody. Its caller latches `msgHydratedRef.current._threads`
    **before** fetching, so that wrong answer stood for the whole session and never retried.

  All three now throw, and the inbox caller releases its guard on failure so the next open
  retries. **The old comment said returning `[]` was deliberate** — *"so a failed page-load can
  never blank the chat"* — and that property is preserved, because the return value was never
  what provided it: **no caller clears message state on rejection** (checked at all five sites
  before changing it; both pagers catch/toast/reset, both hydration callers catch and no-op).
  Reversing a documented decision needs evidence, and the evidence is the call sites.

  Found by a deliberate sweep, not by luck: `scripts/oneoff/probe-silent-noop-preconditions.mjs`
  walks `lib/*.js` and reports every conditional return in an exported function whose value a
  caller cannot tell from a clean result — the input unchanged, `[]`, `{}`, `""`, `0`, `false`.
  **205 conditional returns, 59 of that shape, 3 real.** The rest are correct guard clauses, so
  it is a list to READ and must never become a defect count. Two were read and deliberately left:
  `trackIsJustTheWaypoints()` returns "genuine track" for any line over 40 points, and
  `claimMyCrewEmailInvites()` returns `0` for a missing RPC, so a broken deploy and an empty
  inbox are the same number.
- **`check:outage-flag-reach`** asks the last question in that chain: **is the flag read by
  anything at all?** 17 `xUnavailable` flags now live across the three app files, added by ~10 PRs
  from parallel sessions all editing the **same two dense lines**. Declaring one is the easy half;
  it only does something if a component consumes it. Static (Babel over the app sources), so it
  sits in `npm run build`.
  - **Three sibling guards are each structurally blind to a dead one**, which is the whole argument.
    `check:outage` compares a healthy walk against a failing one — a flag reaching no screen changes
    no copy, so that screen compares **equal** and is *skipped*, reported as "seed-backed, proves
    nothing" rather than as a defect; its verdict on a dead flag is silence. `check:dead-props` asks
    about props a component declares or a call site passes, never about a local `const`.
  - **And `audit:silent-reverts` cannot see it either, by its own admission.** That audit gained an
    `outage-flag` pattern precisely because these are the shape a stale-base squash drops — but it
    tracks **names**, so a merge that keeps the declaration and drops the JSX *read* leaves the name
    in place and it reports **0**. Its closing caveat already says so: *"a merge that kept a name and
    dropped its guard clause is invisible here."* This is that shape, one column over, and injection
    case 1 is exactly it.
  - **COUNTED AS IDENTIFIER NODES, NEVER AS TEXT — a measured defect in this guard's own first
    draft, not caution.** It began as a regex over comment-stripped source, and the lazy block-comment
    strip removed **101,636 characters from `RouteDetail.jsx` — 21% of the file** — because a
    comment-opening sequence inside a **string literal** starts a phantom comment running to the next
    real terminator. One casualty was the live read of `toposUnavailable`, so the scan reported a
    **working flag as DEAD**: the direction that sends an author to "fix" correct code. A hand-rolled
    scanner tracking quotes to dodge that desynchronises on an apostrophe in JSX text. An AST has
    neither failure mode **and needs no mask at all** — a comment naming a flag is not an identifier,
    and neither is a string. Cases 3 and 4 pin both.
  - **The declaration is resolved through Babel SCOPE, never by matching `VariableDeclarator.id`,
    and the narrow test was wrong in BOTH shapes this app uses.** `const [x,setX]=useState()` puts
    the name inside an `ArrayPattern`, and a flag delivered as a **prop** is declared by destructuring
    in the receiving component's parameter list. Both `dmThreadsUnavailable` and `dmUnavailable`
    reported as *"referenced but never declared"* — a confident accusation against two healthy flags.
    A **JSX attribute name** is also not a variable reference: `<Inbox dmUnavailable={dmThreadsUnavailable}/>`
    holds **one** read, and counting the attribute credited a prop-passed flag with a phantom read at
    its own call site.
  - A setter is **not** a flag (`setDmThreadsUnavailable` matches the name shape), and a dead setter
    wants a different repair. Fails **closed**: fewer than 10 flags found is a broken scan or a moved
    convention, never a clean sweep.
  - **SECTION 2 ENFORCES THE NAMING KEY RATHER THAN ASSUMING IT.** Section 1 finds flags by the
    `*Unavailable` suffix, so a future flag called `photosBroken` is invisible to it and the guard
    prints **ok** — the false-pass direction, and the too-narrow-proxy trap this file records
    repeatedly. So an `isError`-derived **binding** that does not carry the convention is itself a
    failure. Measured before shipping: **18 `.isError` references, 14 of them named bindings and all
    14 already on the convention** — zero counterexamples, so the rule is new without being
    retroactive. The other 4 are inline uses in an `if`/`return`, consumed on the spot; not bindings,
    so they cannot go dead and are out of scope **by construction** rather than by exemption, which
    is why this needs no allow-list to rot. Injection case 6 renames one flag consistently — the app
    still works, section 1 goes blind, and section 2 must catch it.
  - **What a pass does NOT mean**, stated in the script rather than implied: that the receiving
    component reads the prop (`check:dead-props`' question), or that the copy it flips is honest
    (`check:outage`'s). It answers exactly one thing.
  - **Cheaper than a gate already in the chain, measured rather than assumed** — and the first
    reading was load, not cost. 37s wall on a box at load average **221** is not a profile; the real
    figure is **6.2s CPU**, against **7.5s** for `check:refs` on the same box moments later. Compare
    against a sibling on the same box, never against a clock.
  - Injection-tested **6/6** (`scripts/oneoff/inject-outage-flag-reach-cases.mjs`), each case proving
    its edit landed **by checksum** and restoring the file byte-identically. **Case 2 must stay
    QUIET**: a flag removed *entirely* is `audit:silent-reverts`' subject, and failing on it would
    make two guards argue over one commit.
**Throwing is NECESSARY AND NOT SUFFICIENT — the screen can still say you have none.**
`check:read-failures` **passes** for `useMyObjectives`, `useMyLists` and `useUserLogs`: all three
already `throw error`, exactly as it demands. And during an outage the Logbook told an account
that HAS an objective, a log and a custom list, verbatim — *"0 climbs to go"*, *"Nothing here yet
— find a route in the Climbs tab and tap the bookmark"*, *"No custom lists yet"*, *"No recent
condition reports"*, and one sub-tab over *"0 logged"* above *"Log your completed climbs here"*.
**Six false statements from three reads that all failed correctly.** #1140 measured four and
recorded them; #1124 fixed the crew instance and #1147 the lists one, each taken one query at a
time as those commits said it should be; this is the remaining two queries. The Completed pair is
one click past where the probe walks, so nothing had reported it at all.
  - **The guard's own stated limitation IS this hole**, and it says so: it does not attempt the
    strong form, *"does anything downstream conclude absence from this emptiness?"* Something
    does. The caller's `.catch` no-ops, the hydration `useEffect` returns on `!data`, state stays
    `[]`, and every render tests `!x.length` — so **loaded-and-empty and never-loaded are the same
    screen**. Nothing lied; the truth simply never arrived.
  - **THE CLASS RAN THREE SUB-VIEWS DEEPER, and it was `check:outage`'s own declared coverage gap
    that said where.** The Crew tab's Friends, Groups and Requests views are each fed by an
    unflagged query (`useMyConnections`, `useMyGroups`, `useMyCrewInvites`) and each asserts
    absence: *"No friends yet"*, *"0 joined"* / *"No groups yet"*, *"No crew invites"*. Four more
    false statements, on a tab the guard already walked — one click in.
    - **The lesson is about the gap, not the defect.** That guard's closing paragraph named
      exactly one unchecked thing ("a further sub-tab is out of frame"), and reading it as a
      worklist rather than as a caveat found real bugs within the hour. A stated limitation is a
      pointer to work, and this repo has now had the same experience three times — the
      `AreaLatest` note, the `check:field-renders` zero-row hole, and this.
    - **A stated gap is only a pointer if somebody re-reads it.** Write coverage limits as
      *"nothing has asked X"*, never as *"X is out of scope"*: the first invites the next session
      to go and ask.
  - The repair is `xUnavailable` from that query's **`isError`**, one flag per query — the shape
    #1124 established for crews. `isError` deliberately rather than a blanket "the database is
    down": it is false while a query is in flight, so a slow read still reads as loading. #1140's
    warning was that a blanket flag replaces one false statement with another.
  - **Flags do not map one-to-one onto sentences, so find the query rather than the string.**
    `objectivesUnavailable` drives five surfaces, because RECENT CONDITION REPORTS is built from
    `wishlist` — i.e. from that same read, two derivations away. `logsUnavailable` drives four,
    `listsUnavailable` (#1147) one.
  - **A FLAG'S REACH IS NOT THE TAB ITS QUERY IS READ ON, and that is what made the Logbook fix look
    finished when it was not.** Two of those five are on **Partners**, a different tab, reached
    through `ME.objectiveIds = wishlist` — the legacy sync hack this file already warns not to
    extend. It launders a failed read across the app: nothing on the Partners screen names the
    objectives query, so grepping the Logbook for readers could never have found it. Measured under
    a total outage, that screen told an account holding one objective **"You have no saved
    objectives yet"** and then asked it to go save one. Same class, one screen further out.
    - The heading above it, *"0 climbers found"*, is the **"0 climbs to go"** defect again:
      `filtered` is matched against that same empty list, so the count is a consequence of the
      failure rather than a search result. It reads `"Matches unavailable"` instead.
  - **HOME carries two more, and they are the SIXTH and SEVENTH surface.** The JUMP BACK IN tiles
    read *"My objectives · 0 routes"* and *"My crews · 0 crews"* to an account holding one of each
    — `objs` is `wishlist.map(...)` and `activeCrews` is `crews.filter(...)`, so both are counts of
    a list that never arrived. The `"0 climbs to go"` defect a third and fourth time. The tile
    layout is **locked** by user decision, so only the caption changes; the two-row 3+4 grid is
    untouched.
    - **THE FIRST TAB WALKED IS EVIDENCE OF NOTHING, and this probe had been reporting it as
      evidence since it was written.** `isError` is false while react-query is still retrying —
      the property that makes the flag safe — so whichever tab settles first is read *before any
      query has given up*. Observed in one run with `ONLY=objectives`: **Home said "0 routes"
      while Partners and Logbook, later in the same run, both said broken.** The wiring was
      correct and the measurement was not; taken at face value it would have sent somebody
      debugging a working fix. The probe now re-walks Home at the end as `Home:revisited`, and it
      reads *"couldn’t load"* there.
    - **`says-broken` could not match the app's own copy.** The regex carried a **straight**
      apostrophe (`couldn't`) and every string in this app uses a **curly** one, so that
      alternative had never matched once — every `says-broken=YES` it has ever printed came from
      *"try again"* or *"unavailable"* instead. A screen whose only honest sentence is
      *"Couldn’t load …"* therefore read as `says-broken=no`. Same class as
      [[ssr-probes-must-match-escaped-html]]: match the form the app actually renders.
    - **The third tile, *"Saved areas · 0 areas"*, is HONEST and was left alone** — `bookmarks` is
      client-only `useState` with no DB hydration at all, reset on sign-in, so there is no read to
      fail. That it never persists for a real account is a separate gap, not an outage lie. Check
      whether a count has a query behind it before flagging it.
      - **THAT SEPARATE GAP IS CLOSED and the verdict above is unchanged**, which is why the note
        is amended rather than deleted. Bookmarks persist to IndexedDB keyed by account
        (`savedAreaIds`/`saveAreaIds`, guarded by `check:offline-claims` §7), so the tile no longer
        reads 0 after a reload — and it is still not a query, so an outage still cannot make it
        lie. A stated gap that has since closed sits in the worklist looking like work.
    - **Two neighbouring strings on that screen were checked and deliberately left alone.**
      *"Loading climbers…"* is not a defect — the real-accounts panel already branches on
      `browseRes.error` with honest copy, and react-query was still retrying at settle time, so
      *loading* was true. And *"No climbers match these filters"* is correct: that pool is the seed
      example set, so the filters really do apply. Widening the fix to either would have been a
      guard flagging correct work.
  - **A sentence with TWO inputs lies in two directions.** *"N climbs to go"* is list length minus
    logged climbs: objectives down gives *"0 climbs to go"* to somebody who has objectives; LOGS
    down counts nothing as done and over-states what is left. The list case drops the badge (the
    body already says why); the logs case falls back to what is still known — how many climbs are
    on the list — and a line says nothing below is marked done, because the copy right above
    promises that logged climbs show a ✓ and a missing tick otherwise reads as an unclimbed route.
    One label serves the badge and the `aria-label`, so they cannot drift.
  - **`ONLY=<table>` is what makes a per-flag verdict possible**, and it was added for this:
    `probe-signed-in-db-failure.mjs` blocked `**/rest/v1/**` wholesale, so all three flags went
    true together and no run could say which produced which sentence — nor whether one was a
    blanket flag. Measured: `ONLY=objectives` (4 blocked, 34 through) leaves CUSTOM LISTS
    rendering its real content, and `ONLY=user_lists` leaves MY OBJECTIVES rendering the real
    objective **and RECENT CONDITION REPORTS showing its honest empty state**. That last clause is
    the proof, not the fix.
    - It isolates a **table, not a hook** — several hooks reading one table fail together
      (blocking `objectives` also fails `useObjectiveCounts`). Stated rather than overclaimed.
    - Matched on the path segment after `/rest/v1/`, **never as a substring**: PostgREST names
      EMBEDDED tables in the query string (`select=*,crew_members(*)`), so a substring test fails
      requests aimed at a different table. A run blocking **zero** requests now exits 1 — otherwise
      every `IDENTICAL` verdict is a statement about a healthy app.
  - **Measured non-finding, recorded so it is not re-derived:** the dumps show the fixture ticklist
    as *"1 climb to go"* though the fixture seeds a log for that same route. `routeCompleted`
    matches **capitalised** tick types (`Lead`, `Summit`, `Send`) and the fixture writes `"lead"`.
    The app's own write path is capitalised, so this is a **fixture artifact**; confirmed against
    the table, which holds exactly one row — the fixture's own. Deliberately not "fixed" by
    lowercasing the reader: that is changing app behaviour to suit a fixture, and it would move
    what `check:signed-in` sees.
  - **Not closed, and not made a guard.** the counts have moved several times since and live in
    `scripts/oneoff/measure-outage-flag-coverage.mjs` rather than here (crews #1124, lists #1147,
    objectives and logs were the first four); the unflagged rest are a **list to READ**, not a defect count — most are lookups
    (profiles by id, area names) where emptiness is never asserted to the user. A guard for the
    strong form needs caller analysis across two 400kB files and would flag correct guard clauses,
    which is worse than the hole it closes. The probe is the mechanism, and it is now per-query.
**A GUARD CLAUSE ON A FAILED READ CAN BLOCK A BRANCH THAT NEEDS NO READ — and that is not an
honesty defect, it is a correctness one.** Every entry above is about a screen *saying* something
false. This is the shape one step worse: the app already held the answer, off the **session**, and
a database guard clause stopped it reaching the branch that used it. App's verification hydration
opened `if(!uid||verifHydratedRef.current||myVerificationQ.data==null)return;` — and two lines
down computed `sessionEmailConfirmed` from `session.user.email_confirmed_at`, which needs no query
at all. So a `verification_records` read that failed for its own reasons left a verified climber
reading as **unverified**: Home's setup checklist told them *"Verify to boost your trust"*, and
their own Résumé showed an amber **"Unverified"** chip.
  - **It also blocked the REPAIR.** `verifyMyEmail()` is called only inside that effect, so the one
    write that would have created the missing record could not fire either. The state could not
    recover for the rest of the session — a failed read that makes itself permanent.
  - **THE RECORD READ IS REDUNDANT, AND THAT IS PROVEN FROM THE MIGRATION RATHER THAN FROM A
    CONFIG SETTING.** `0085`'s `verify_my_email()` reads `auth.users` itself and raises *"email is
    not confirmed"* unless `email_confirmed_at` is set, so an email record with status `verified`
    **cannot exist** for an unconfirmed account. The record is derivable from the session; the
    session is not derivable from the record. That makes the session the authority and the record
    a **fallback** — the exact inversion the guard clause had. It was tempting to argue this from
    `mailer_autoconfirm` being true, which is weaker: that is a project setting somebody can change,
    while the RPC's precondition is a property of the schema.
  - The record read **stays**, for the reverse case: a stale session issued before confirmation. So
    the change is strictly more permissive in **both** directions and can un-verify nobody. Only
    give up when neither source has anything to say.
  - **IT WAS SILENTLY REVERTED IN FULL, AND THE RESTORE THAT FOLLOWED THE SAME SQUASH MISSED IT.**
    #1267 — a switch-accessibility PR whose subject and body never mention any of this — merged
    from a stale base and put this effect back to `if(!uid||verifHydratedRef.current||
    myVerificationQ.data==null)return`. #1277 restored the four outage FLAGS that same squash
    dropped and did not touch this, because **this revert changed no NAME**: `myVerificationQ`
    still exists, the effect still exists, and only its guard clause and dependency array went
    back. `audit:silent-reverts` reports **0** on it — and says so in its own closing caveat,
    *"a merge that kept a name and dropped its guard clause is invisible here"*. That caveat is
    now a recorded incident rather than a hypothetical.
    - **What caught it was `ANCHOR LOST`**, from the probe written beside the fix, run by hand.
      An extracted-from-source probe with a fail-closed anchor **is** a behaviour-revert detector
      — the one mechanism that works where a name-based audit cannot — and it is worth nothing in
      `scripts/oneoff/`, which nothing runs. So it is promoted to
      **`check:verification-fallback`** and sits in the build chain: static, no browser, no
      database, milliseconds.
    - Its failure message names **both** causes and their opposite repairs (a deliberate refactor
      wants a re-anchor; a stale-base squash wants a restore) and gives the `git log -S` that
      separates them. A guard that can only say *"something moved"* sends the next reader to
      edit correct code.
    - Injection-tested against the **real historical revert**, not a synthetic edit: both forms
      are lifted from the commits themselves (`35b923d` and `35b923d^`), so the case reproduces
      exactly what #1267 did, and the restore returns the file to its pre-injection checksum.
  - **THE FALLBACK ALONE IS DEAD CODE, AND ONLY A RUNTIME MEASUREMENT SHOWED IT.** With the session
    fallback in place and nothing else changed, the browser walk still reported the outage
    INTRODUCING *"Verify to boost your trust"*. The logic reads correctly, an extracted-from-source
    probe passed 5/5, and the screen was unmoved — because **the sign-in reset erases this effect's
    work microseconds after it happens**. Effects fire in declaration order, and the `[uid]` reset
    is declared ~200 lines below: on the uid transition it clears `verifHydratedRef` *and* calls
    `setVerified(false)`. So the fallback decides, and the reset immediately unmakes the decision
    **and** the latch that would have stopped it being remade.
    - What gets it running again is a dependency changing **after** the reset. On the healthy path
      that is `data` going `undefined -> []`. On the failing path `data` stays `undefined` forever
      and nothing else moves — so the effect never ran a third time and a verified climber stayed
      unverified for the whole session. `myVerificationQ.status` goes `"pending" -> "error"`, after
      the reset, and is the trigger the failing path was missing.
    - **The tell was in the invocation log, not in the screen**: the HEALTHY run's third invocation
      records `latched=false`, though its second invocation had already met the condition that sets
      the latch. A ref that is false after something set it true is somebody else clearing it. No
      amount of reading the effect could produce that — it is a fact about two effects' ordering.
    - `scripts/oneoff/probe-verification-under-outage.mjs` + `verif-debug.config.mjs` are what
      measured it: an **in-memory** transform (the source is never edited, as
      `zero-state.config.mjs` and `anniversary.config.mjs` do it) injects a render reporter *and*
      an invocation log, and one page load per run answers it. Both fail closed — a moved anchor
      throws rather than yielding an empty log, which would read as *"the effect never ran"*, one
      of the answers it exists to distinguish.
    - **THREE HYPOTHESES DIED ON MEASUREMENT BEFORE THE RIGHT ONE**, and all three were plausible
      from reading: *the fixture session lacks `email_confirmed_at`* (it does not — a probe creates
      an account and signs in exactly as the fixture does, and the token endpoint returns it); *the
      sign-in reset clobbers it* — **half right, and the half that was wrong is instructive**: the
      `if(prev!=null){setVerified(false)…}` branch really cannot fire on a first load, but a
      *second* `setVerified(false)` sits in the same effect under a plain `if(uid)`, which does;
      and *a trigger seeds a verified record* (no migration inserts into `verification_records`
      except `verify_my_email()` itself). **Reading found the right effect and the wrong line in
      it.**
  - **NO FLAG WAS ADDED, deliberately.** The one case a `verifUnavailable` flag would cover —
    session not confirmed *and* the read failed — cannot arise while every account's email is
    confirmed, so the flag would be unmeasurable by construction: the
    `check:field-renders` zero-row hole in a new place. The fix removes the dependency instead of
    captioning it.
  - **The sweep for a second instance found ONE, and it is this one.** Six other hydration effects
    open on a query (`if(!uid||!myCrewsQ.data)return` and friends), and every one of their bodies
    reads only that query's rows — there is no non-DB branch to strand. Mechanically:
    `myVerificationQ` is the **only** effect in `App` whose dependency array names `session`. So
    this is a closed class, not a backlog.
  - Proven by **`check:verification-fallback`** (`scripts/check-verification-fallback.mjs`, which
    is this probe promoted and renamed in #1289) — **no browser, no
    database**, which is the point: its five cases include ones live data cannot produce on demand
    (an unconfirmed session, a stale session). It **extracts the effect body from `ClimbMatch.jsx`
    with `ANCHOR LOST`** rather than copying it, and fails closed on a short slice — every case
    would "pass" against a body that does nothing. Injection-tested by reverting the inner guard to
    `if(recs==null)return;`, which keeps the anchor intact and reproduces the defect exactly:
    **one** case fails and the other four stay green, so the probe is specific rather than firing
    on any change.
- **`check:profile-edit-gate`** — **a failed profile read turned "Edit profile" into a WIPE, and the
  class CLAUDE.md records as CLOSED AT ONE is therefore TWO.** Static (source + one executed
  expression), so it sits in `npm run build`.
  - **The chain, every link verified rather than assumed.** `lib/auth.js`'s `getProfile` returned
    `(await …single()).data`, **discarding `error`** — so a failed read resolved to `null`, exactly
    like a brand-new account with no row. The sign-in reset empties `profile` to `bio:""`,
    `location:""`, `disciplines:[]`, grades `undefined`, and its own comment says why: *"Emptying the
    draft first makes the DB the only source."* The hydration set `profileHydratedRef.current=true`
    **before** awaiting, did `if(!p)return`, and ended `.catch(function(){})`. `openEdit()` was
    offered unconditionally from Settings. `saveEdit` PATCHes that draft back **unconditionally**.
  - **Measured, not argued: seven columns.** Executing the app's own draft literal and PATCH payload
    against the post-reset state yields
    `{bio:"",location:"",disciplines:[],sport_grade:null,trad_grade:null,boulder_grade:null,avatar:null}`
    over a live `profiles` row. `name` and `username` are the only two guarded — which is itself
    evidence somebody considered this for two fields and not the other seven.
  - **One transient failure at boot was PERMANENT for the session**, because the latch was set before
    the await and the rejection was swallowed. Same shape as the verification hydration one section
    up, and it is what makes this reachable without a sustained outage.
  - **THE CENSUS WAS RIGHT ABOUT ITS SCOPE AND THE SCOPE WAS WRONG.** *"a WRITE that destroys data
    after a failed read … measured across all 45 write functions in `lib/db.js`; the answer is
    ONE"* — and `getProfile`/`saveProfile` live in **`lib/auth.js`**. `check:read-failures` cannot
    see it either, twice over: it scans `lib/db.js` only, **and** its predicate matches on the
    `error` identifier, while this function never names `error` at all. *A class is closed only over
    the files somebody actually looked at* — [[grep-the-app-not-just-the-db-layer]], applied to a
    census rather than to a grep.
  - **The fix is the guide-application precedent verbatim: REFUSE, and refuse BEFORE the branch that
    needs the value.** Blocking an edit during a transient error costs a retry; the other way costs
    the profile. Not symmetric, so the safe branch is not the permissive one. `PGRST116` is
    excluded deliberately — `.single()` reporting zero rows is a real answer about the world, and
    throwing on it would stop a brand-new account filling in its profile.
  - **A build gate, not a probe**, for the reason `check:verification-fallback` records: the fix is a
    guard clause and a latch position, so it changes **no identifier** and `audit:silent-reverts` is
    blind to it by its own closing caveat.
  - Injection-tested **5/5** (`scripts/oneoff/inject-profile-edit-gate-cases.mjs`), each case proving
    its edit landed **by checksum** and restoring the file byte-identically. Cases 1-4 take the real
    defect apart one link at a time, so the guard cannot pass on the strength of its neighbours;
    **case 5 must stay SILENT** — a comment naming the flag is documentation.
  - What it does **not** prove: that the toast is legible, or that a climber ever meets the refusal.
- **`check:overlay-absence` was CREDITING AN OVERLAY WITH ITS NEIGHBOUR'S FLAG**, and it had written
  the reason down itself. Its closing note says *"an overlay rendered NEXT TO others picks up their
  copy … the count is an upper bound"* — then fed that same 3000-char window to `gated`, and fed
  `gated` to two verdicts.
  - **The false pass is the serious half.** `ungatedAll = rows.filter(x => !x.gated.length)`, so an
    overlay credited with somebody else's flag was dropped **before anything examined it**. Four
    were: `editDraft`, `dashOpen`, `guideAppOpen` and `calOpen`, all carrying the **Inbox's**
    `dmThreadsUnavailable`/`dmUnavailable`. `inboxOpen` was also credited with `statesUnavailable`,
    whose owner is literally the next render site along.
  - **The false accusation is the half that shows up in the output.** It reported `logPickOpen`
    STALE against `resumeLogsUnavailable` — which belongs to the `resumeFor` overlay next door
    (measured: render site at 298626, flag at 300094) — i.e. *"delete this CHECKED entry"* about an
    entry that is **correct**, after which a genuinely ungated overlay would have passed as gated.
    Reverting the fix shows the old behaviour would accuse **all five** current entries.
  - **The boundary must be a RENDER site**, never a bare `name&&`: the loose form matches handlers
    and inline conditionals, and truncating at one cuts a real region short — measured, it severed
    the Inbox from its own component body. Brace-balancing was tried first and is worse here, because
    the render-site regex often lands on a handler rather than the JSX.
  - **The two scopings are deliberately ASYMMETRIC and both err toward examining MORE**: claims stay
    on the wide window (documented upper bound), gating is scoped to the boundary. Narrowing the
    claims too is the other false pass — an overlay whose own copy sits past a nested render site
    would stop being reported at all.
  - **A stale entry now FAILS**, like every other registry here; while the gating was contaminated it
    could not, because its one accusation was wrong. The census line was also wrong in a way the fix
    made glaring — it printed *"16 gated"* above a list of three, because it counted
    `rows.length - ungated.length` and folded the CHECKED rows in. All three numbers now come from
    one partition and sum to the total.
  - **It found a real defect on its first run afterwards**: reading `editDraft` is what surfaced the
    profile wipe above.
  - **THE `lib/` SCOPE GAP IS CLOSED, and the note that stated it is replaced rather than left
    standing.** It said the guard scanned the two app files only, that an overlay rendering a `lib/`
    component had its gating invisible, and that nothing had yet asked the question of `lib/`. All
    three are false now: the body lookup follows `lib/*.jsx`.
    - **The answer is a NEGATIVE RESULT, measured before the widening**
      (`scripts/oneoff/measure-lib-component-absence.mjs`): across 14 lib components, **7 assert
      absence**, and every one of those claims is gated on an error, filter copy that stays TRUE
      during an outage (*"No areas match."*), a fallback label, a statement about a row's own data,
      or a comment. **No findings — and it still bought something**: `dashOpen` and `guideAppOpen`
      no longer need hand-written CHECKED entries, because the guard reads their real gate. *A
      declaration that exists because a guard cannot see something is not a reason; it is an excuse
      with a shelf life.*
    - **`lib/` SPELLS ITS GATE DIFFERENTLY, and following those bodies without knowing that would
      have reported correctly-gated components as ungated** — the guard-flags-correct-work failure,
      introduced by the very change meant to widen coverage. The app derives `xUnavailable` from
      `isError`; lib destructures the binding off the hook (`{ data, isError: inqError }`). Detected
      on the **followed body**, never on the window: adding `isError` to the global `FLAGS` list
      would let any app-side window containing `.isError` read as gated, **weakening** the detection
      this guard exists for.
    - `maskComments`' comment floor became a **parameter**: 50 was calibrated for two 400kB files,
      and a lib component is legitimately terse, so applying it there fails a correct file. A parse
      error stays fatal for every file — that is the real fail-closed test.
    - **The measurement's own first version accused the wrong line**, and it is the same attribution
      defect this guard had: it took `indexOf(claim)`, so `"No areas"` resolved to
      `DbAreaBrowser`'s *"No areas match."* filter copy while the row was really about line 1072 —
      which is correctly gated, with `if (error)` returning **ahead of** the empty branch. *A weak
      locator is not merely imprecise; it accuses code that is fine.*
  - **A FAILING RUN ENDED ON `ok`, AND THE SENTENCE WAS TRUE — which is what made it survive.** The
    summary was the `else` of the ungated test **alone**, while the STALE and VANISHED sections set
    the exit code seventy lines above it. So a stale CHECKED entry gave **EXIT=1 with
    `ok — 18 overlay(s) assert absence: 5 gated, 13 explained, 0 unexamined.` as the LAST line**,
    and the real failure on stderr near the top of a long output. Measured by injecting one entry,
    not reasoned about.
    - **The ok line is not even wrong**: *0 unexamined* really was true. It answers a different
      question from the one the run failed on, so a reader cannot catch it by disbelieving the
      sentence — only by reading the exit code, which is exactly what `tail` does not show.
    - **It had already cost a wrong reading of this very file.** A run was read as clean from
      `tail -5`; re-running and checking the status gave EXIT=1 and `STALE … helpOpen, aboutOpen`.
    - **THE GATE CONSULTS `process.exitCode`, NOT A LOCAL TALLY**, so a section added later that
      sets it and forgets to record a reason still cannot be followed by an `ok`; the `FAILED`
      array only supplies the wording. Keying it on the tally would put the two back in a position
      to disagree, which is the defect.
    - **NO DETECTOR — THE CLASS IS ONE, MEASURED.** Seven guards assign `process.exitCode = 1`
      rather than calling `process.exit(1)`, and **six were already correct**: `check:signed-in`
      gates its success line on `else if (!fails.length)`, `check:outage-copy`'s `dead()` calls
      `process.exit(1)` and terminates, `check:deploy-drift` is one if/else-if chain,
      `audit:prose-citations` sets `exitCode = 0` in its else, and `audit:expiring-closures` ends
      on `exitCode || 0`.
    - **`check:outage` LOOKED LIKE A SECOND INSTANCE AND IS NOT, and reading the code rather than
      the shape is what settled it.** Its NOTHING-WAS-BLOCKED section sets the exit code and then
      an `ok` prints far below — but the `dead` chain in between tests `!bad.__blocked` **itself**
      (one `else if` earlier than the screens-differed floor), so the `ok` is unreachable in that
      state. A detector built on the first reading would have been a detector for a class of one
      wearing a class of two's clothes.
    - Injection-tested **4/4**, and **the count is the smaller half of the change**: every failing
      case now asserts the run prints **no `ok` verdict**, judged on the OUTPUT rather than on the
      exit code, because those two disagreed for this guard's whole life. Proven load-bearing by
      A/B rather than asserted — against the pre-fix guard, cases 1 and 4 report `claimed ok: true`
      and FAIL while cases 2 and 3 are unmoved, since those leave `ungated` non-empty and the old
      `else` was skipped. **Case 1 passed the old suite while the run ended on `ok`**: it asked only
      whether the exit code was non-zero and whether the message appeared, and an exit code says
      nothing about what the output claims.
    - Case 4 reproduces the STALE branch **directly** (a CHECKED entry for an overlay that already
      names a flag of its own) rather than through case 1's wide-window revert, so the branch is
      exercised by a case whose subject it is.
    - **A green run's output is byte-identical to before**, checked by diff rather than by eye: this
      changes what a FAILING run says and nothing else.
  - Injection-tested 4/4 (`scripts/oneoff/inject-overlay-absence-cases.mjs`), each proving its edit
    landed by checksum and restoring the file byte-identically.
**THE INBOX SAID YOU HAD NO CHATS WHEN THE READ HAD FAILED, and it is the first OVERLAY found
doing it.** `fetchMyDirectMessages` throws on a database error — `check:read-failures` made sure of
that — and its caller's `.catch` releases the retry latch so a reopen can recover. Neither told the
SCREEN: `msgs` stays `{}` and the Inbox renders *"No friend chats yet"* over *"Message a partner
from their profile and your chats will live here."* A climber who HAS conversations is told they
have none and invited to start one. `dmThreadsUnavailable` is set in that same catch and cleared at
the top of the success path — **before** its `if(!rows.length)return`, because an account with
genuinely no threads takes that early return and a flag left set there swaps one false statement
for another.
  - **`check:outage` cannot measure this, twice over.** It is behind an **overlay**, which no
    outage walk opens; and the fixture has no DM threads, so the section is empty in the healthy
    run too and rule 2 sees nothing introduced. **`check:outage-copy`** (this probe promoted in #1293)
    renders the real `Inbox` instead — 3 cases, injection-tested by reverting the gate (exactly one
    case fails, the other two stay green), with a **1,818-character** render asserted so the
    negative cases cannot pass vacuously.
    - Two bundling traps, both of which read as the fix not working: `Inbox` calls a react-query
      hook, so the render needs a `QueryClientProvider`; and **`@tanstack/react-query` must be
      `--external`**, or esbuild inlines its own copy and the provider you wrapped around the
      component is a different module instance with a different context. The error is still
      *"No QueryClient set"* with a provider plainly in place.
  - **The crew half is NOT the same defect, and that was checked rather than assumed.**
    *"No crew chats yet"* is driven by `crewMsgs`, hydrated per **opened crew** rather than by a
    bulk read, so an account that has never opened a crew chat is legitimately empty there. One
    query at a time, as this file's outage entries already insist.
  - **`check:overlay-absence` (`scripts/check-overlay-absence.mjs`, this probe promoted and renamed
    in #1319) sizes the remaining gap**, and its
    version history is the useful part because every earlier version printed a SMALL, reassuring
    number and was blind:
    - **v1 said 1 of 53** — an overlay rendered `if(x)return <>…` has no `x&&`/`x?` marker at all,
      and the copy lives in the COMPONENT rather than in the region.
    - **v2 still said 1** — brace-balancing FROM that early return meets `{_toastEl}` and closes
      immediately, so the component the overlay renders is never reached.
    - **v3 said 7, still missing the Inbox** — `function Inbox({…})` has DESTRUCTURED PARAMS whose
      braces open and close before the body, so the balancer returned **150 characters of
      parameter list** as the component. That is exactly the trap
      [[a-guard-can-scan-13-percent-and-report-green]] records.
    - Each was caught only by a **fail-closed assertion that a KNOWN instance must appear**.
      Without it the first number would have been reported as a finding.
    - The honest figure is **23 of 53 overlays assert absence, and only one was gated**. Read the
      attribution rather than the count: components are collected from a 3,000-character window,
      so an overlay rendered beside others picks up their copy too. The rows naming ONE component
      are the clean ones.
**AN OUTAGE FLAG KEYED ON ONE QUERY, WHERE THE RENDER DEPENDS ON TWO.** The belay ledger hydrates
from `myCatchesQ` (the rows) **and** `catchFriendProfilesQ` (the names), and its effect bails on
either — `if(catchFriendIds.length&&!catchFriendProfilesQ.data)return;`. A failed query's `.data`
stays `undefined` forever, so with the rows up and the profiles down that line returns every time,
`catchesHydratedRef` is never set, and the ledger stays empty. `catchesUnavailable` keyed on
`myCatchesQ.isError` **alone**, so it was **false**, and `CatchLedger` renders `unavailable?"—":v`
— presenting 0 catches as a measurement.
  - **The component's own comment describes this outcome exactly**: *"without it this card tells a
    climber who has caught falls that they have caught none, and invites them to go log one."* The
    flag was right; its input was one query short. **Ask what a render DEPENDS on, not which query
    it is named after.**
  - The flag had to **move below both queries**: it sat above `catchFriendProfilesQ`, and the note
    beside it already warns that a flag reading a `const` from higher up the component is the
    **#1206 TDZ blank screen**.
  - **No `catchFriendIds.length` guard is needed**, and that is a fact about the hook rather than a
    simplification: `useProfilesByIds` is `enabled: !!key`, so with no ids it never runs and a
    disabled react-query cannot be in error.
  - Proven by `scripts/oneoff/probe-two-query-renders-one-flag.mjs` — no browser, no DB, since "one
    query up and one down" is not a state live data produces on demand. Guard clauses are matched
    **exactly and asserted unique** rather than sliced to the next `return;`: the anchor itself ends
    in one, so slicing ran on and swallowed hundreds of lines.
  - **Its fourth case failed until the FIXTURE was corrected, not the fix.** Setting `profilesError`
    with an empty id list manufactures a state the hook cannot reach, and made a correct fix look
    over-eager. Same trap as the seed-climber `level` below — *check whether the fixture can occur
    before changing the app to satisfy it.*
  - **The vouches hydration has the identical shape and is NOT the same defect** — measured, so it
    is not re-derived. `givenVouches` initialises to **seed** data, so a failed hydration falls back
    to a seed vouch rather than to an empty list. That is the seed-shown-to-a-real-account concern
    `check:seed-history` covers, not an emptiness lie, and it needs no flag.
  - Sweep result for the sibling call sites of `useProfilesByIds`: `dmUnreadProfilesQ` degrades
    (`||{id:id,name:"Climber"}`), `dbPhotoProfiles` deliberately renders the photo unattributed,
    `crewProfilesQ` returns null by documented design. **The miss behaviour is per-call-site**, so
    a rule about "what `useProfilesByIds` does on a miss" cannot be stated once.
  - **THE STATED WORKLIST IS NOW READ, AND IT WAS ONE DEFECT IN TWENTY.** This entry's own header
    used to say *"10 of 28 query handles in `App` carry a flag … the rest are a list to READ"*.
    Measured **that day**: 34 handles, 14 flagged, 20 not — of which exactly **one** was a real
    defect (the catches one above) and 19 are non-findings, each for its own reason. **That count is
    HISTORY — it read 41/21/20 on 2026-09-03**; re-run
    `scripts/oneoff/measure-outage-flag-coverage.mjs` rather than quoting either figure.
    - **TWO HANDLES THE EARLIER SWEEPS NEVER NAMED were read on 2026-09-03 and are NON-FINDINGS**,
      recorded so the next census does not re-derive them. `myVouchesGivenQ` looks like the
      catches defect and is not: `givenVouches` initialises to **seed** data, so a failed
      hydration falls back to a seed vouch rather than to an empty list — the concern there is
      seed-shown-to-a-real-account, which `check:seed-history` covers, not an emptiness lie. And
      `adminQueueQ` yields `(…data.total)||0`, which renders as `adminQueueN ? badge : null` — a
      failed read **hides a badge** rather than claiming a clean queue. It is structurally the
      `myGuideInquiriesQ` shape this file already cleared, it is admin-only, and it self-corrects
      on the next load. **The stakes are higher (an unseen safety report), so it was read rather
      than waved through** — but the same shape cannot be a non-finding in one place and a defect
      in another.
    The ones worth not
    re-deriving: `dbBookmarkNamesQ` renders `{nm||"Saved area"}`; `resumeLogsQ` has no absence copy
    at all **— WRONG, and corrected by RENDERING it.** That is true of `AscentPyramid`, which gates
    on `logs.length` before falling back to the stored pyramid, and the sweep stopped there.
    `resumeLogs` also feeds **`Resume`**, a different component, where `all=[...baked,...live]` is
    empty for a real DB climber and the not-editable branch says *"<Name> hasn't shared any climbs
    here."* `scripts/oneoff/probe-resume-outage-copy.mjs` renders all three states and proves it:
    the string is present with `unavailable:false` and gone with `unavailable:true`. **One handle
    can feed two components, and a verdict about one of them is not a verdict about the handle.**
    Now flagged with `resumeLogsUnavailable`;
    `crewInviteRoutesQ` falls back through `routeById` to null; `hzVotesQ` leaves prior votes in
    place rather than clearing them; and **`policyQ` handles its own error inline**
    (`!policyQ.error` in `_needsPolicy`), correctly declining to nag about the terms when the read
    failed — the only handle that already did this.
  - **RE-VERIFIED BY THE GATE AT THE RENDER SITE, not by the fallback at the call site**, which is
    the method that catches the resumeLogsQ class. All 12 remaining unflagged handles are safe:
    `policyQ` checks `!policyQ.error` inline; `hzVotesQ` early-returns leaving prior votes;
    `myGuideInquiriesQ` yields a count of 0 and the badge hides; `dbBookmarkNamesQ` renders
    `{nm||"Saved area"}`; `crewInviteRoutesQ` falls through `routeById` to null; `crewProfilesQ`
    returns null by design; `dmUnreadProfilesQ` degrades to `{name:"Climber"}`; `myVerificationQ`
    has the session fallback `check:verification-fallback` pins.
    - **`myProfileRowQ` is the one worth knowing about, because its CALL SITE is wrong and only its
      RENDER SITE saves it.** `discoverable` falls back to **`false`** on a failed read, and that
      value drives *"You are not listed while others browse."* plus a switch announcing OFF — a
      false claim about a PRIVACY setting, and `toggleDiscoverable` computes `!discoverable`, so it
      would write from a state nobody chose. It is safe purely because the whole row is gated
      `{(USE_DB&&uid&&myProfileRowQ.data)?…}`, so a failed read renders no row at all. The sibling
      consumer four lines down does it properly with `:undefined` — the same value, handled two
      ways in one component. **Ask whether a failed read can REACH the copy, never whether the
      value has a sensible default.**
  - **NO DETECTOR FOR THE TWO-QUERY SHAPE, because the class is TWO and both are settled.** Every
    `useEffect` in the three app files that bails on more than one `X.data` was enumerated: exactly
    **2** exist — the catches one (now covered) and the vouches one (uncovered **by design**, since
    its fallback is seed data rather than an empty list). Same refusal as the forest-order-number
    detector: *a detector for a class this small is the thing this repo keeps declining to build.*
    A per-handle "needs no flag" registry was also rejected — there are **63** such handles across
    the three files, most not DB reads at all, so it would be ~49 justifications that rot.
**A COUNT AND THE LIST UNDER IT WERE TWO DERIVATIONS OF ONE FACT, ON ONE SCREEN.** `check:ui`
asserts that two SCREENS counting the same list agree (#1203). The group detail view did it to
itself: the heading was `mem.length + (isMod && mem.indexOf(_meGid) < 0 ? 1 : 0)` while the roster
below was `mem` **minus anything that failed to resolve**. They agreed only by luck. Measured with
the app's own lifted expressions, **4 of 5 cases disagreed**
(`scripts/oneoff/probe-group-roster-vs-count.mjs`).
  - **The reachable one is the DEFAULT state of every group you create.** A locally-created group
    is `memberIds:[], ownerId:0, moderatorIds:[0]` — so `mem` is empty, `isMod` is true, the fudge
    fires, and the screen reads **"Members · 1" above an empty list**. The fudge existed *because*
    the creator is not in `memberIds`; it added them to the NUMBER, and nothing could add them to
    the ROWS, because the roster called `cById(id)` directly and `cById(0)` is `undefined` — `ME`
    is not in `CLIMBERS`. `_asMember` had the `id===0?ME` branch the roster needed and the roster
    did not call it.
  - **A failed profiles read emptied the roster while the heading still claimed N.**
    `useProfilesByIds` correctly throws, so `.data` is undefined, `||[]` leaves `_profMap` empty,
    and `_asMember` returns **null for every member** — "Members · 2" above nothing at all. The
    same query's OTHER call site degrades to a generic label instead (`p&&p.name||"A climber"`,
    which this file already blesses), so **one query had two miss behaviours: one degrades, one
    silently drops the person.**
  - Fixed **by construction**, not by a matching rule: `_roster` is the list that renders and
    `_memN` is its length, so the number and the rows cannot disagree. A member who cannot be
    resolved renders as a placeholder rather than vanishing, and the creator is added to the LIST
    rather than to the number.
  - **`membObjs` is deliberately left alone as the MENTION list.** It also feeds
    `mentionCandidates` and `notifyMentions`, and a placeholder must never become an @-mention
    candidate — so the display roster is a second array rather than a widening of that one.
  - **The `_memN` hoist was already there and said it existed "so the compound count is written
    once" — and the roster heading held a second copy of the same expression.** A hoist is not a
    single source of truth until every site uses it. The "Show all N members" button was a **third**
    number, taking the roster length while the heading took the fudged one.
  - `grpProfilesUnavailable` says so when the read failed, because with the placeholder the count is
    right either way and the screen would otherwise present *"A climber"* as if it were the name.
  - **SHOWING YOU AT ALL WOKE A LATENT `check:real-profile-rows` DEFECT, and CI caught it.** The
    row's subtitle is `c._profile ? "Owner"/"Moderator"/"Member" : (c.level+" · "+vScore(c))`, and
    `_asMember` hands back **bare `ME`**, which carries no `_profile`. A real signed-in account has
    no seed `level` and no vouches, so your own row rendered **"undefined · 0"** — invisible until
    this roster started listing you. `check:signed-in` failed on `postMenuFor`/`reactPickerFor`,
    whose payload opens a synthetic `ownerId:0` group with **no members**, i.e. precisely the
    fudge case.
    - **`check:real-profile-rows` passes either way and structurally cannot see it.** That gate asks
      whether the concatenation is **gated**; this one is. The defect was handing it an object that
      **fails** the gate. *Gating an expression and satisfying that gate are different questions* —
      the same distinction as `check:field-renders` (does the column reach a screen) versus
      `check:token-boxes` (does it fit the element it reaches).
    - **The first fix keyed on `m.id===_meGid` and never fired.** `ME.id` is **0 signed in or out**,
      so the resolved object can never equal a uuid `_meGid`; it has to key on the id being
      **mapped**. Caught by the probe, not by reading it.
    - The probe's own fixture was wrong in the other direction: seed climbers really do carry
      `level:"Intermediate"`, so test climbers without one made every seed row look like the defect.
      **Check the seed shape before "fixing" the app to satisfy a fixture.**
  - **`mods` has the same root cause with a different symptom: a DANGLING LABEL.** It is
    `modIds.map(_asMember).filter(Boolean)`, so a failed profiles read empties it — and the word
    **"Moderators"** rendered with nothing after it, the #654 shape (*"Last verified catch: · 0
    partners confirmed"*). The whole **span** is gated, not just its text: an empty span is still a
    flex item and still adds the row gap. Asserted in **both** directions — a failed read really
    does empty `mods` (so the gate is not decorative) and a healthy one keeps them (so it is not
    over-eager).
  - **A DETECTOR FOR THIS CLASS WAS MEASURED AND REJECTED — do not re-derive it.** The tempting
    generalisation is *"a heading counts one array while the next sibling renders another"*, since
    `check:ui` only compares counts across two SCREENS and nothing compares a heading against the
    rows beneath it on ONE. Two scopings were tried against the three app files: whole-subtree gave
    **14,538** distinct (counts, renders) pairs and adjacent-sibling gave **1,308**. Neither is a
    reading list. The cause is structural rather than a tuning problem — this app is one ~400 kB
    line of deeply-nested JSX, so a "sibling" is routinely an entire screen and collects every
    `.length` and every `.map` beneath it.
    - **And a `.length`-based scan could not have found the real defect anyway**: the count was the
      hoisted variable `_memN`, so it has to be resolved through scope to the array it measures —
      after which legitimate cases (*"3 of 12 selected"*, *"showing 6 of 40"*, a filtered subset
      counted beside its parent list) still dominate. A guard that flags correct work is one people
      learn to ignore.
  - **This is NOT what produced `check:signed-in`'s intermittent red** — that was the guard reading
    the whole capture, browse list included, and is fixed. `memory/group-member-count-intermittent-reads-1.md`
    recorded that the underlying disagreement was still real; this is that, closed.
**A FLAG THAT ALREADY EXISTED REACHED SIX PLACES AND NOT THE TWO OVERLAYS IT IS ABOUT.**
`connectionsUnavailable` has been in `ClimbMatch.jsx` since #1224. Both surfaces fed by
`connections` are overlays, and neither had it: `FriendsList` renders *"No friends yet."* and the
mutual-friends sheet renders *"No mutual friends yet."*, so an outage told a climber with partners
that they had none — on the one screen whose whole subject is who you climb with.
  - **Found by the overlay measurement, not by grep**
    (the probe now shipped as **`check:overlay-absence`**): `friendsOpen` came out ungated, and
    following its component into `ClimbMatchCore.jsx` confirmed both the empty state and a prop
    list with no flag in it. Adding a flag is not the same as *delivering* it, and the delivery is
    what a per-screen measurement asks about.
  - **ONLY THE NO-FRIENDS BRANCH IS GATED, and the other two must stay ungated.** `FriendsList`
    has three empty strings; *"None of your friends share your saved objectives yet"* and *"No
    friends match"* are claims about the **filter the user just set**, applied to whatever did
    load. They are true during an outage. Gating them would replace correct copy with an error,
    which is the direction that teaches people to ignore a fix. The probe asserts it directly —
    it renders with friends present AND the flag on, and fails if the outage copy appears.
  - **Two candidates were checked and REJECTED, which is the more useful half.**
    - `areaTreeOpen` -> `AreaTree({selArea,…})`. `selArea` is seed-only and dead in production
      ([[three-climbs-tab-sections-dead-in-production]]), so there is no DB read to fail. Its
      *"No areas"* cannot be an outage lie.
    - `profileModal`/`eventInvite` -> `FullProfile`'s *"No vouches yet"* / *"No objectives listed
      yet"* come from `climber.vouches` and `climber.objectiveIds`, which a DB-derived profile
      **never carries**. Those lists are empty for a real profile always, not because of an
      outage — the `check:real-profile-rows` class, which already has a guard. **An empty section
      is not evidence of this defect; ask what fills it.**
  - **`check:outage-copy`** (this probe promoted in #1293) renders the real `FriendsList`: 3 cases plus
    the filter assertion, injection-tested (reverting the gate fails exactly one case), with a
    1,036-character render asserted so the negative cases cannot pass vacuously. Same two bundling
    traps as the Inbox probe — the provider, and `@tanstack/react-query` as `--external`.
