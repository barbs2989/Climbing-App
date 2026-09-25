# Social, crews and groups

Crews, groups, connections and presence: who is on a crew, how a climber is named, mutual friends, notifications that navigate, meetups, viewer counts, partner filters.

Part of the guard notes — see [README.md](README.md) for the full index.

- **A NOTIFICATION THAT NAVIGATES RENDERED AS INERT, because one screen derived "where does this
  go" TWICE and the two disagreed.** `NotifPanel` had an if/else chain for the CLICK and a separate
  boolean for the AFFORDANCE:

      const tappable = n.climberId!=null || !!n.tab || !!n.route || !!n.group;

  That list omits **`recap`** and **`goto`**, both of which the click chain immediately beside it
  handled. So a recap notification **navigated on tap while rendering no `→` and
  `cursor:"default"`** — a row that works and signposts itself as inert.
  - **FOUND BY READING A CI CAPTURE, not by a scan**, which is what the technique is for. In
    `Home:Unfinished-business-9` every ACTIVITY row is followed by `→` except one — *"Did your crew
    make Schoolroom on May 24? Mark who showed"* — and that is the seed's only `recap` alert. The
    one row without an arrow is the whole finding.
  - **THERE ARE THREE DERIVATIONS OF THIS ONE FACT**, which is why the fix is a helper rather than
    a longer list: NotifPanel's affordance test, NotifPanel's click chain, and **Home's own chain**.
    `notifTarget(n)` now returns a destination or null, and NotifPanel derives **both** the
    affordance and the dispatch from it, so they cannot disagree again.
  - **HOME IS LEFT ALONE DELIBERATELY, and the reason is recorded rather than assumed.** Its rows
    are `clickable()` unconditionally, which is honest ONLY because its chain ends in a fallback
    that opens this panel — not because its list of kinds is complete. Lose that fallback and Home
    inherits exactly this defect, so the probe pins it. It also navigates the app directly rather
    than delegating through `onGo`, so it shares the DESTINATION question and not the acting on it.
  - **The spread is CONDITIONAL now** (`{...(_t?clickable(…):{})}`), so a notification with no
    destination is not announced as a control that does nothing — the inert-control class this file
    holds at **zero**. None exists today (every seeded kind has a target), so that closes it
    latently rather than fixing a live instance, and the probe says so.
  - **THE INJECTION FOUND TWO HOLES IN THE PROBE RATHER THAN IN THE APP**, which is what a suite is
    for. Its Home assertion used a bare `includes()` on a string that occurs **twice** in the file,
    so deleting Home's fallback left the other occurrence and the case reported MISSED — this
    probe's own *"matched N times, so the assertion is about an unknown site"* trap, in the one
    assertion that had not guarded against it. It counts against Home's own chain now.
  - **AND THE SUITE NOW REFUSES AN EXPECTATION THAT MATCHES THE CLEAN RUN, because I made that
    mistake FIVE times in one session.** An expectation written against the text an assertion
    prints when it PASSES reports MISSED against a probe firing correctly, and this file already
    records the same error twice before today. Making it structural caught three of the five before
    a single run was wasted. It is exact here only because the probe's wiring failures carry a
    `[wiring]` marker so a failure never reads as its own pass — the sibling suite cannot use the
    check for exactly that reason and says so instead.
  - `scripts/oneoff/probe-a-notification-that-goes-somewhere-says-so.mjs` — 15 assertions, no
    browser, no DB, `notifTarget` lifted from source. Injection-tested **8/8**
    (`scripts/oneoff/inject-notif-target-cases.mjs`); case 1 is the shipped defect restored verbatim,
    and **two must stay SILENT** — a comment quoting the old list, and adding a NEW destination kind,
    which is ordinary work an affordance guard must not forbid.
- **FOUR MORE MAPPINGS NAMED A CLIMBER THE WAY THEY DID NOT ASK, AND THE OBVIOUS SWEEP WOULD HAVE
  MISSED THE WORST ONE.** `PARTNER_COLS` states the contract in its own comment — *"`show_name` is on
  every list that becomes a CLIMBER OBJECT, because `pubName()` decides between the display name and
  the @handle from it — a select that omits it makes the column arrive undefined, which reads as
  false, which silently ignores the climber's own setting."* #1619 fixed the HOOK and #1681 fixed
  `_asMember` for groups. Four more mappings **had the fields and dropped or forged them**.
  - **THE SWEEP TO RUN IS "does this mapping carry the fields", NOT "does this call `pubName`".** The
    four fail in three different directions and only one of them is a missing `pubName` call:
    - **A — the crew INVITE SEARCH pool hardcoded `showName:true` and then called `pubName(c)`.** It
      goes THROUGH the protective function with a forged input, so it publishes the real name of
      every climber in the results who turned the switch off **while reading as compliant at the
      call site**. Worse than skipping `pubName`, because nothing about the code looks wrong. This
      is the one a grep for missing `pubName` calls cannot see, and it is the widest audience —
      anyone can type a name into the crew invite search.
    - **B — `crewMemberById` dropped `username` AND `showName`**, so `pubName` fell through to a
      handle **derived from the real name**: *"Robin Belay"* → `@robinbelay`, which need not be
      theirs. That object feeds the chat header, the avatar strip, the safety brief and the trip
      recap. Same defect `RealClimberRow` already records, in a third place.
    - **C — the crew JOIN-REQUEST card rendered a bare `{c.name}`** for a real profile. The requester
      is a stranger to the organiser, which is exactly when a climber would have the switch off.
    - **D — the open-crew ORGANISER chip carried `username` but not `showName`**, so a climber who
      WANTS their name shown was always reduced to a handle. Under-claiming rather than a leak — and
      the same field, the same contract, and the reason the rule must be stated as *carry the
      fields* rather than *hide the name*.
  - **THE TWO HOOKS HAVE DIFFERENT SHAPES AND THE FIX DEPENDS ON WHICH.** `useProfilesByIds` MAPS
    camelCase (`showName: !!p.show_name`, additive since #1619), so B and D read `pr.showName`;
    `useProfileSearch` returns **RAW** rows, so A reads `rp.show_name`. Get that backwards and the
    field is `undefined`, reads as false, and **the fix is INERT while every call site still looks
    correct**. The probe pins the hook's mapping for that reason, and `hook-stops-mapping` is the
    injection case that matters most — it leaves all four call sites untouched and makes three of
    the four fixes do nothing.
  - **SECTION 4 IS THE LOAD-BEARING HALF.** A "fix" that made everything a handle satisfies every
    leak assertion above and quietly deletes a feature climbers opted into, so a climber with the
    switch ON must still be shown by **both** helpers, and a row with nothing usable must still
    degrade to a label rather than to empty.
  - `scripts/oneoff/probe-a-climber-is-named-the-way-they-asked.mjs` — 16 assertions, no browser, no
    DB, `pubName`/`pubFirst` lifted from source by balancing braces. Injection-tested **8/8**
    (`scripts/oneoff/inject-named-as-they-asked-cases.mjs`), each case proving its edit landed **by
    checksum** and restoring byte-identically. **Two must stay SILENT** — a comment quoting the
    forged constant, and the snake_case read in the invite pool, which is CORRECT there.
  - The usual *"refuse an expectation that matches the clean run"* guard is deliberately NOT the
    mechanism in that suite, and it says so: this probe prints the same LABEL on its ok line and its
    FAIL line, so every expectation legitimately appears in a green run. What protects against the
    mistake instead is matching **FAIL lines only** — an expectation written against passing text
    then never matches and the case reports MISSED rather than a false catch.
- **A REQUEST TO JOIN WAS A MEMBERSHIP, AND IT READ THE FLOAT PLAN.** `0036` writes the intended
  model into its own comment — *"crews holds float_plan/meet_place/meet_time (**sensitive** … 'shared
  with your emergency contact… can call for help if you're overdue'). **Base-table read is
  organizer-or-confirmed-member ONLY, never public.**"* — and `0068_crews_readable_by_invited_members`
  widened that SELECT to **any** `crew_members` row of **any** status, so an INVITED climber could see
  the crew they were invited to. That intent is right. What it also admitted is `pending`, which is the
  climber's **own request**, and `0086` let anybody insert one for themselves on **any** crew. `0180`
  closes both halves.
  - **THE COMMENT STATING THE MODEL STAYED IN `0036` WHILE THE POLICY MOVED AWAY FROM IT.** That is
    this file's own stale-bookkeeping class landing on a security model: the sentence describing the
    rule and the rule itself lived in different files, and only one of them was edited. When you widen
    a policy, the comment that states its model is part of the change.
  - **MEASURED WITH THREE REAL ACCOUNTS, never reasoned about**
    (`scripts/oneoff/probe-a-stranger-can-read-your-float-plan.mjs`). `0095`'s header already records
    why reading the SQL is not enough — an RLS subquery runs as the **calling** role, so a policy can
    *"look present, pass review, and enforce nothing"*, and the service role bypasses RLS entirely, so
    a service-key probe reports success either way. Before `0180`: control 0 rows, self-insert
    `pending` **201**, self-insert `invited` **201**, and the crew row came back with `float_plan`,
    `meet_place` and `meet_time`. Self-insert `confirmed` was **403**, which is the only reason the
    **chat** never leaked (`crews_messages` is confirmed-or-creator).
  - **THE CHAIN NEEDED NO INVITE AND NO OPEN CREW.** `crew_members` SELECT is `using (true)`, so crew
    ids are enumerable; `0086`'s `invited_by = auth.uid()` is satisfied on a self-insert by naming
    **yourself** as your own inviter, so on that branch it constrained nothing; and its `status <>
    'confirmed'` let a stranger award themselves `invited`. So: pick any crew id, seat yourself, read
    the safety document — vehicle, parking, emergency contact, departure and hard-return times.
  - **EACH HALF ALONE IS DEFEATED BY THE OTHER, which is why `0180` changes two policies.** Narrowing
    only the SELECT leaves a stranger claiming `invited`; constraining only the INSERT leaves them
    reading as `pending`. The first draft of the fix was the SELECT alone, and **the test found the
    hole, not the reading** — the `invited` self-insert walked straight through it.
  - **The INSERT now pins the STATUS, not the inviter.** A self-insert may be `pending` and nothing
    else: being *invited* is the organiser's act, and a climber who can write it for themselves has
    invited themselves. The organiser branch is untouched.
  - **The SELECT is now `status <> 'pending'`, which is the SAME predicate the app uses** (`crewInCrew`,
    #1687) — so the database and the screen answer *"who is on this crew"* the same way, rather than
    two derivations of one rule. Keeps `0036`'s organiser and confirmed member and `0068`'s invited
    member; excludes the one status a climber can mint for themselves.
  - **A POLICY CHANGE THAT ONLY DENIES IS SATISFIED BY DENYING EVERYTHING**, so the probe's sections
    4-6 are the load-bearing half and were green **before and after**: the organiser reads their own
    crew, a confirmed member reads the crew and the chat, an **invited** member reads the crew,
    `useMyCrewInvites`' `status=eq.invited&select=*,crews(*)` embed still resolves, and the app's own
    request-to-join (`dbAddCrewMember(id, uid, "pending")`) still returns 201. A requester loses the
    crew ROW and keeps the finder, which is served by `crew_listings` — a safe column subset by
    construction, untouched here.
  - **Three harness bugs read as app findings first**, all in the probe: a `409` that was the probe's
    own leftover membership row from the previous section colliding on the unique index (each attempt
    now clears it, so a refusal is attributable); `text` where `crews_messages` stores **`body`**, which
    returns 400 and reads as a policy refusal; and section 3 initially measuring the row left by section
    2's *successful* `invited` insert rather than a pending one. *An injection that produces a different
    failure is not a catch* — the same rule, applied to a live-database probe.
  - Verified by reading the LIVE policy text back out of `pg_policies` afterwards, not by trusting the
    apply: *existence is not agreement*, the rule `check:function-drift` exists for. `check:rls` green
    (127 policies checked).
- **A CLIMBER WHO HAD ONLY ASKED TO JOIN COUNTED AS A CREW MEMBER, AND HELD A SPOT.** `#1554`
  introduced the third crew status and the comment beside `allConfirmed` states the rule outright
  — *"Someone who has asked to join is not in the crew yet"* — and **enumerates the four readers it
  was applied to** (`pendCrew` and three *"Remind all N"* expressions). Three more read the roster
  whole, and the enumeration is what made them findable: *an instance fixed by hand is not a class
  closed*, with the author's own list as the evidence.
  - **The heading** read *"Crew · 2 members"* for you plus one requester — live on CI's demo
    capture, beside a roster row saying *"Asked to join"*.
  - **`size` drives capacity**, so a requester consumed a spot. **At enough requests a crew reads
    "✓ Crew full — 3/3" while nobody has been accepted**, which stops other climbers asking — the
    worst of the three, and the one that is not merely cosmetic.
  - **The amber denominator** (*"1 of 2 confirmed"*) is latent: it needs an **invited** member and
    a **requester** at once, because `allConfirmed` — already fixed — gates whether it renders at
    all. #1554 identified that sentence as a symptom and fixed it by gating rather than at the
    count, which is why it survived.
  - **Fixed through ONE list**, `inCrew`, with `allConfirmed` expressed from it, so *who is in the
    crew* has a single definition. Three filters saying the same thing is how this codebase ended
    up with four grade parsers.
  - **The requester stays VISIBLE in the roster.** Only the counting changed — the organiser has to
    see somebody to accept or decline them, so dropping the row would be worse than counting it.
    The probe asserts that directly.
  - `scripts/oneoff/probe-pending-requester-is-not-a-member.mjs` — 12 assertions. It **lifts the
    predicate out of the source** rather than retyping it (a copy agrees with itself whatever the
    app does), executes it over rosters, and asserts every reader as **source**: a merge keeping
    `inCrew` and leaving one reader on `roster` restores that reader's defect with every expression
    assertion still green. That is the shape that bit #1643's own merge an hour earlier.
  - **AND THE SAME ENUMERATION FOUND SEVEN MORE, WHICH IS THE PART WORTH READING.** #1647 named
    the three readers it fixed; reading *that* list and looking for what it did not name found
    seven others still counting a climber who had only asked to join. **The count on the heading was
    the mildest of them** — the three worst are not counts at all:
    - **`risks` LISTED a requester's risk tolerance as the crew's**, and could flip an aligned crew
      to *"Risk tolerance: … — mixed; talk through your turnaround before you commit."* in an amber
      box. A **false warning on a safety surface**, which this file records everywhere else as how a
      real warning stops being read.
    - **The backcountry safety brief compared `done` against `roster.length`**, and a requester can
      never be in `safetyDone`. So *"Whole crew has reviewed the safety plan"* was **unreachable**
      for as long as any request stood — a readiness state a non-member could hold shut
      indefinitely, with the amber *"not everyone has reviewed"* standing in its place.
    - **`pendDay` — the variable IMMEDIATELY RIGHT of the `pendCrew` #1554 did fix, on the same
      line** — named a requester as somebody the crew was waiting on to pick a day.
    The other four are counts and control gates: the collapsed card's *"Ready · N climbers"* and its
    *"N/M confirmed"* denominator, the *"Usually free for everyone"* / *"No weekly slot works for the
    whole crew yet"* banner, *"Nudge N to pick a day"*, and the `roster.length>2` gate that decides
    whether a two-person crew is offered a removal **vote** instead of *"Just the two of you — use
    Leave below instead of voting someone out."*
  - **A NON-ORGANISER SEES THE WRONG NUMBERS WITH NO WAY TO UNDERSTAND THEM.** `dbJoinReqs` only
    surfaces the Accept/Decline card on crews **I organise**, while the pending roster row and every
    one of these counts renders for **every** member. So an ordinary member read *"3/4 confirmed"*
    above a row saying *"Asked to join"* and no control anywhere explaining it.
  - **SO THE USEFUL ENUMERATION IS THE OTHER ONE, and the comment beside `inCrew` now carries it.**
    Listing what was *fixed* is what left seven behind twice over; listing what deliberately keeps
    the whole roster is a **closed set**, so a new `roster` reader that is not one of these is a
    defect. Five: the member LIST, the weekly-availability **grid rows**, name resolution in the day
    chips and inside `GearTiers`, and the itinerary numerator — which counts people who HAVE an
    itinerary rather than measuring against the crew.
  - **The grid ROWS keep the requester and the banner above them does not count them**, and that
    asymmetry is the point rather than an inconsistency: seeing when somebody is free is how you
    decide whether to accept them, while *"works for the whole crew"* is a claim about the crew.
  - **Two measured NON-findings, recorded so they are not re-derived.** `GearTiers` takes `roster`
    only for `nameOf(id)`, so resolving a name maximally is correct. And `kit` — `roster.flatMap(p
    => p.gear || [])` — is **defined and read by nothing**: dead, not wrong.
  - **A SECOND `inCrew` SHADOWS THIS ONE, and it is an id-PREDICATE rather than the array.** The
    invite-member block declares `const inCrew=id=>crew.members.some(...)`, spanning ~730243-732906.
    None of the seven sites falls inside it — **checked by brace-matching before any edit**, not
    assumed, because this file already records `clickable` being shadowed by a boolean and taking
    out a whole panel with *"clickable2 is not a function"* while `check:refs` stayed green.
  - The probe grew to **27 assertions** across five sections, and **section 5 is the load-bearing
    one**: a fix that only ever moves readers onto `inCrew` is satisfied by sweeping the deliberate
    four as well, which would hide a requester from the organiser who has to accept them.
    Injection-tested **6/6** (`scripts/oneoff/inject-roster-reader-cases.mjs`), each case proving
    its edit landed **by checksum** and restoring the file byte-identically; the over-reach case
    must fail on section 5, and a comment quoting the pre-fix expression must stay **SILENT**.
    The harness captures the clean run first and refuses any expectation that already matches it.
- **...AND THE ENUMERATION STOPPED AT THE COMPONENT WHILE THE RULE DID NOT: TEN MORE READERS, IN
  TWO FILES, OUTSIDE `CrewCard`.** Every sweep above was scoped to that component's local `roster`
  — #1554 named four readers, #1647 read that list and found three, #1664 read THAT list and found
  seven — so all fourteen fixes landed inside one component while `crew.members` is read whole in
  ten other places — four in core (the Partners chip, the invite-to-your-crew cap filter, the inbox
  preview, `isReady`) and six in `ClimbMatch.jsx`. **A closed list is only closed over the SCOPE somebody actually swept**, and
  the scope was never stated. Fixed by exporting the rule (`crewInCrew` / `crewSize` /
  `crewAskedToJoin`), the `seedIdentity()` shape this file already records: *it was inline before,
  so it existed in exactly one place and every other reader had to re-derive it — and one did not.*
  Here ten did.
  - **FOUND BY READING A FRESH `ui-screens` CAPTURE, NOT BY DIFFING ONE**, which is what the note
    on that technique says to do. Partners rendered Sam as **"✓ On crew"** for the Octopussy crew
    while the Crew tab one tap away rendered Sam as **"Asked to join"** — two screens, one crew,
    two answers, both from the same `crews` array. Nothing in the repo compares them.
  - **THE WORST IS NOT A COUNT, and it is the twin of the `risks` fix #1664 made one component
    over.** `safetyMembers` fed `analyzeAlignment`, which raises a **critical** flag —
    *"Conservative and Aggressive members in same party. Explicit conversation required before
    confirming."* — from every listed member's risk tolerance, and gates *"Team Ready to Climb"* on
    all of them having answered the questionnaire. So **a stranger's REQUEST to join could put a
    critical safety flag on your crew naming a conflict with somebody who is not on the trip, and
    hold the ready state shut for as long as the request stood.** A false warning is how a real one
    stops being read. Different screen, different variable, different FILE — which is precisely why
    a sweep scoped to `roster` could not reach it.
  - **`isReady` HAD IT TOO, so the Crew tab disagreed with itself.** The crew card's STEPS panel
    read *"✓ Crew — Everyone has confirmed they're in"* off `inCrew` while `isReady` required every
    `members` row to be `confirmed`, so the same crew badged **"Forming"** in the quick list. It has
    the widest reach of any consumer here (the Ready badge, the profile invite list, the archive
    test), which is why one line moved the most.
  - **THE SIZE WAS WRONG TWICE OVER, and writing the rule once is what removed the second half.**
    `members` carries a `climberId: 0` row on a DB-hydrated or app-created crew and **not** on three
    of the five seed crews, so `members.length` is one convention and `members.length+1` is the
    other and **each is wrong for half the data**. The invite prompt used the second: for
    `crew_seed_octo` it read *"3/3 climbers"* — a requester counted, and **you counted twice** — for
    a crew of one. The comment beside `activeCrewOthers` records fixing exactly that double-count in
    the chat header (*"a crew of two people announced three"*) and it survived here. `crewSize()`
    counts YOU once plus the others who are in, which is what every call site meant; every caller is
    a crew you are in (*"one of your crews"*, *"crews you run"*), and that is asserted.
  - **A REFUSAL WITH A FALSE REASON is worse than a wrong number.** The invite prompt answered
    *"Sam is already in your crew for this climb"* and offered **Go to crew** — and the ACTION is
    right, because accepting them is what you do there. Only the sentence was false, so only the
    sentence changed. Same shape as `check:preview-claims`: make the copy describe what is true
    rather than rewiring a control that already works.
  - **THE INVITE BUTTON STAYS SUPPRESSED FOR A REQUESTER, DELIBERATELY.** The tempting reading of
    this rule is *"they are not a member, so offer to invite them"*. Inviting somebody who has
    already asked is the wrong action; accepting them is. So the chip says **"Asked to join"** in
    amber — the crew card's own wording — and no new control was invented. **The same expression
    does two different jobs** (*is this person on the crew* versus *should I offer to invite them*),
    which is exactly why the enumeration matters more than the fix.
  - **The CLOSED list is the useful one**, and it is written beside the helper rather than as a list
    of what was fixed — the fixed list is what left readers behind three times. Five readers keep
    the whole roster on purpose: the crew card's member **LIST**, the invite sheet's own pool and the
    `addable` connections beside it (you must not be offered somebody who has already asked), the
    per-crew **profile lookups** (you need their profile to draw the roster row), and the organiser's
    **join-request** surface. Probe section 4 pins all five, and it is the load-bearing half: a rule
    that only ever removes requesters is satisfied by removing them everywhere, which would hide a
    requester from the organiser who has to accept them.
  - **TWO THINGS ARE REPORTED, NOT FIXED, because each is a DIFFERENT rule and mixing them in would
    make this change unreviewable.** The crew **chat** participant strip and header (`"You + N
    climbers"`) list everyone, and `crews_messages`' select policy — read from `0042`, not from
    prose — is `m.status = 'confirmed'` **or the creator**, so an `invited` member cannot read the
    chat either. That is a stricter rule than *non-pending* and it is a claim about privacy, so it
    wants its own change with the migration cited. And the **"Crew ready!" celebration** is a second
    derivation of readiness sitting beside `isReady` with different guards; only its pending
    blindness is fixed here, because consolidating it would change WHEN the celebration fires.
  - `scripts/oneoff/probe-a-requester-is-not-on-the-crew.mjs` — 26 assertions, no browser, no DB. It
    **lifts the three helpers from source** by balancing braces (a retyped copy would agree with
    itself whatever the app did, which is the whole question), executes the rule, and asserts all
    twelve readers as **SOURCE** beside it: a merge that keeps the helper and leaves one reader on
    `crew.members` restores that reader's defect with every execution assertion still green.
  - **The injection found a real robustness hole in the probe rather than in the app**, which is
    what a suite is for. The lift anchored on `^function` at the start of a LINE, so a comment
    written beside the helper made the probe report **ANCHOR LOST** — a probe refusing to run
    because somebody documented the thing it checks, the `check:ci-cancel` trap. It balances braces
    now, skipping string contents. Injection-tested **9/9**
    (`scripts/oneoff/inject-requester-not-on-crew-cases.mjs`), each case proving its edit landed **by
    checksum** and restoring the file byte-identically. **Two must stay SILENT**, and one case had
    to be re-aimed at the probe's FAIL text rather than the text an assertion prints when it PASSES
    — the mistake this file already records twice, made a third time and caught by the harness's own
    refusal to accept an expectation that matches the clean run.
- **THE "NEXT MEETUP" WAS THE EARLIEST ONE, NOT THE NEXT ONE — three copies of one expression, and
  the group calendar contradicted its own heading.** Both group surfaces rendered
  `(events[cl.id]||[]).slice().sort(byDate)[0]` under the label **"Next meet"**, with no test for
  whether it had happened, so a group whose meetups are all behind it advertised its **oldest** as
  upcoming. Seen on a CI `ui-screens` capture as **"Next meet Jun 27"** and **"Next meet Jun 28"**,
  rendered on **4 September**.
  - **The upcoming rule was NOT invented here.** `daysUntil(d) >= 0` is the app's own test, already
    used for crews in `upcomingClimbs` two hundred lines away. `nextMeetup(evs)` in core is that
    rule applied to events, and **today counts as upcoming** — a meet this evening has not gone.
  - **A THIRD COPY EXISTED AND THE PROBE FOUND IT, NOT THE SWEEP.** The group's
    **"Calendar · upcoming events"** listed **every** event oldest-first, so an upcoming calendar
    opened with a meetup from June. The probe asserts the pre-fix expression is gone from the file
    rather than only that the two known sites were fixed, and that assertion failed on its first
    run. *A fix keyed on the sites you found is not a fix for the expression.*
  - **FILTERING THE CALENDAR MADE THE EMPTY STATE FALSE, so the copy gained a branch in the same
    change.** *"No events scheduled yet — plan the first one"* is true of a group that has never
    held one and false of a group that has held four; `groupEventsEmptyLine(total, upcoming)`
    returns *"No upcoming events — plan the next one."* for the second. **A fix that trades one
    wrong claim for another is not a fix**, which is why both branches are asserted and asserted to
    DIFFER — a rewrite collapsing them satisfies any test that only checks one.
  - **Both helpers are pure functions in core for the reason `stateCatalogLine` is**: all three call
    sites live inside `App`, which no SSR guard stands up, so the branches are **executed** while
    the wiring is asserted as **source** beside them. That split matters here — a merge keeping the
    helpers and dropping a call site restores the defect with every branch assertion green, and
    `audit:silent-reverts` says in its own closing caveat that it cannot see a change of this shape.
  - **Not made a build gate.** The class is a date claim on ONE feature, the surfaces are gated on
    group events (client state today), and the probe needs an esbuild bundle it does not share with
    a sibling. `scripts/oneoff/probe-next-meetup-is-ahead.mjs` — 14 assertions, no browser, no
    database, dates built relative to today so it cannot rot into a fixture about 2026. Promote it
    if a second date-labelled surface joins the class.
- **`check:mutual-friends`** asserts that a mutual friend is **real**, **named the way they asked**,
  and **counted as the list that renders**. Static (one esbuild bundle of core plus two Babel
  parses — no browser, no database), so it sits in `npm run build`.
  - **THE FEATURE WAS A STUB AND EVERY ENTRY POINT WAS CORRECTLY GATED OFF IT, which is why nothing
    ever reported it.** `mutualIds()` took **no arguments** and returned a literal `[]`, so
    `mutualCount()` was 0 for every climber, always. Every consumer renders as
    `mutualCount(...) ? control : null`, so the *"N mutual friends"* row never drew and the **Mutual
    friends sheet had no reachable entry point in the app** — only `?z=mutualModal`, the overlay
    guards' own opener, could mount it. The feature was **ABSENT rather than lying**, so no honesty
    guard could see it, and `audit:silent-reverts` correctly says nothing: `git log -S` shows it was
    never implemented, so nothing was reverted.
  - **IT HAD ALREADY COST A PR.** #1637 corrected the sheet's subtitle — a real string defect, on a
    surface with no reachable entry point. The walk that found it opens overlays **by name**, which
    is exactly how an unreachable modal looks reachable. *Before fixing copy found by an overlay
    walk, check the surface has an entry point that can render.*
  - **IT COULD NOT BE DONE CLIENT-SIDE, AND THAT IS THE WHOLE DESIGN.** `0087` says it outright —
    *"Read: only the two people involved. A connection is not public."* — so the other climber's
    edges are unreadable from the app by construction and **no client-side query can compute the
    intersection**. `0182` supplies a `SECURITY DEFINER` function, the same escape `0095` took.
  - **THE SAFETY PROPERTY IS INHERENT RATHER THAN BOLTED ON.** Whatever ids are passed, the result
    is a subset of the CALLER's own accepted connections — the function can never return a climber
    the caller does not already know. So the most a caller learns by passing many ids is *which of
    their own friends know those people*, which is what a mutual-friends feature IS. The array is
    capped at 64 so a friend list cannot be swept in one call.
  - **BLOCKS ARE HONOURED OR THIS IS A WAY AROUND ONE**, and `profile_owner_blocked_me` is reused
    rather than re-implemented — a second copy of a block test is how two of them drift.
  - **`set search_path = public, pg_temp`, never `= public`**, which READS AS PINNED AND IS NOT.
  - **REVOKING FROM `public` LEFT `anon=X` STANDING, and reading the ACL back is what showed it.**
    Postgres grants EXECUTE to PUBLIC and Supabase's default privileges ALSO grant it explicitly to
    `anon` — an explicit role grant a revoke from PUBLIC does not touch. A signed-out caller could
    not have learned anything (`auth.uid()` is null, so the caller's own friend set is empty), but
    *"it happens to return nothing"* is the wrong footing for a definer. **Read `proacl` after
    applying one; a `grant` that looks right in the file may not be what landed.**
  - **PROVEN WITH THREE REAL ACCOUNTS, because two is not enough to have a mutual friend.**
    `scripts/oneoff/probe-mutual-connections-with-three-real-accounts.mjs` — 9 assertions, service
    key for account creation only, every read and write under test on the anon key plus that
    climber's own JWT. Connections are made the way the app makes them (request, then accept), never
    written as `accepted` with the service key, which would manufacture a state RLS refuses.
    **The CONTROL runs first and is the non-vacuity proof**: with nothing connected the same call
    returns nothing, so the later result is attributable. It also asserts the block is
    **one-directional** — the climber who did the blocking still sees theirs — because every
    deny-side assertion is equally satisfied by a function that quietly returns nothing.
  - **THE HELPERS TAKE RESOLVED FRIEND OBJECTS, NOT IDS, and that removed a latent defect rather
    than merely tidying.** `mutualFirstNames` did `CLIMBERS.find(x => x.id === f)` — an INTEGER seed
    lookup that matches no uuid — so on a real account every mutual friend would have silently lost
    their name. Names now go through **`pubFirst`**, or the feature publishes the real name of a
    climber who asked to be shown as a handle: the *named the way they asked* class, which has
    already caught four mappings.
  - **A MUTUAL FRIEND'S PROFILE IS ALREADY IN HAND**, so nothing is refetched: by definition they
    are one of the caller's own accepted connections, and `useMyConnections` already selects
    `show_name`. Resolving from that list is what lets the helpers name them without re-deriving
    the show-name rule somewhere new.
  - **SEED IDS MUST NEVER REACH A `uuid[]` RPC.** PostgREST answers a type mismatch with a **400**,
    so an unfiltered ask set does not degrade for the seed rows — it takes mutual friends down for
    every real account too. The guard asserts a **COUNT EQUALITY** (every id added to the ask set is
    string-checked) rather than the presence of one such test: with four sources feeding it,
    *"at least one is guarded"* is satisfied while three are not, and the injection case reported
    **MISSED** against the presence version.
  - **IT PARSES RATHER THAN STRIPS, AND THAT IS A DEFECT THIS GUARD SHIPPED WITH FOR ONE
    ITERATION.** The first version blanked comments with the obvious `/\/\*[\s\S]*?\*\//g`. A
    comment-opening sequence inside a **string literal** starts a phantom comment running to the
    next real terminator, so that strip removed **23.7% of `ClimbMatch.jsx` and 49.1% of
    `lib/db.js`**, took `<FullProfile` from 2 occurrences to **0**, and reported a correctly-wired
    call site as MISSING — the direction that sends an author to "fix" working code. CLAUDE.md
    already records the identical strip eating 21% of `RouteDetail.jsx` and calling a live flag
    dead. **An AST does not see comments at all.** One injection case is a comment quoting the
    forbidden shapes and must stay SILENT, which is what pays for the rewrite.
  - **`fedge()` IS REMOVED**: declared, exported, and called by nothing.
  - Fails **closed**: a bundle that does not build, any of the five helpers missing from core's
    exports, either app source unparseable, a missing `useMutualConnections` or `_mutualAsk`
    (`ANCHOR LOST`), a migration that strips to nothing, no migration adding `mutuals_visible`, and fewer than **29** assertions run.
  - Injection-tested **10/10** (`scripts/oneoff/inject-mutual-friends-cases.mjs`), each case proving
    its edit landed **by checksum** and restoring the file byte-identically. **Two must stay
    SILENT.** The harness's usual *refuse an expectation that matches the clean run* check is
    **inverted here**, and the reason is a property of this guard rather than a weakening: it prints
    the same LABEL on its `ok` and `FAIL` lines, so every legitimate expectation appears in a green
    run and the blanket refusal rejects all of them — it fired on the first case. Judging matches
    **FAIL lines only**, and the refusal is turned round: an expectation must NAME an assertion the
    guard actually makes, which still catches the typo'd case that can never fire.
  - **A CASE REPORTED MISSED WHILE THE GUARD WAS INNOCENT**, for the reason this file records
    elsewhere: `String.replace` with a STRING pattern replaces only the FIRST occurrence, and the
    first `set search_path = public, pg_temp` in that migration is inside its own header. The
    checksum moved, the case reported `landed=true`, and the function was untouched. *Checksum
    movement proves an edit happened, not that it was the right one.*
  - **THE DOCUMENTS MOVED IN THE SAME CHANGE**, because this is an un-gating: a fact that reached
    nobody now reaches other climbers. What is disclosed, stated precisely rather than glossed: that
    **a climber the reader is already connected to is also connected to the climber whose profile
    they are viewing**. No identity is revealed that the reader did not already have — every name
    shown is one of their own connections — but the EDGE is, and neither party published it to them.
  - **THE PRIVACY SWITCH EXISTS NOW (`0184`), and this bullet used to say it did not.** It read
    *"no privacy switch was invented … needs the definer to filter on a column that does not
    exist"* — correct for one day, and exactly the stale-bookkeeping shape this file records
    everywhere else: a stated gap that has since closed sits in the worklist looking like work.
    The user approved it; `profiles.mutuals_visible` is that column.
  - **ONE COLUMN, FILTERED AT TWO POINTS, because two different climbers have an edge revealed by
    any row** — the person **NAMED** (they learn C knows B) and the profile being **OPENED** (they
    learn B's connections). So `mutuals_visible` is joined twice in `mutual_connections`: turn it
    off and you are not named as a mutual on anybody's profile, AND your own stops showing a reader
    who you both know. Dropping either half leaves somebody who opted out exposed on one of the two
    surfaces, and **no render can see it** — the map just comes back fuller, which looks like the
    feature working. Both halves are asserted.
  - **IT GOVERNS EXPOSURE, NOT ACCESS, and that asymmetry is deliberate rather than an oversight.**
    Hiding yourself does not blind you, which is how `resume_public` and `show_on_ranks` already
    behave. Reciprocity (*"hide yours and you lose theirs"*) is a defensible product rule and a
    DIFFERENT one; it would need its own sentence in the documents, so it was not smuggled in.
    Probe section 4 pins it, because it is the half most likely to be "fixed" into reciprocity by
    somebody who has not read `0184`'s header.
  - **DEFAULT TRUE, AND `0110` IS THE PRECEDENT THAT ARGUES THE OTHER WAY** — so the migration
    states the comparison rather than asserting the answer. That one flipped `discoverable` to
    default **false** because *"being listed is the direction that cannot be walked back"*; what
    made it urgent was exposure level — production autologin put a real climber's **name, handle
    and city in front of ANONYMOUS VISITORS on the open web**. This is not that: the RPC needs
    `auth.uid() is not null` and is granted to `authenticated` only, and every name it returns is
    already one of the reader's own connections. By exposure it sits with `resume_public`,
    `show_on_ranks` and `photos_public`, all three `not null default true`. The one column that
    defaults FALSE is `show_name`, where the default would publish a legal name. **If that trade is
    ever judged wrong, `0110` is the model: change the default AND reset the existing rows**,
    because the accounts that never opted in are precisely the ones at issue.
  - **NOT NULL, so there is no third state** for the switch, the filter and the documents to
    disagree about. `resume_public` needs its `!== false` / `!!` asymmetry precisely *because* it
    can be absent. Were this ever made nullable the bare `pm.mutuals_visible` evaluates NULL as
    false and **hides**, which is the safe direction by construction.
  - **THE GUARD WAS READING THE WRONG MIGRATION THE MOMENT A SECOND ONE EXISTED.** It picked its
    file with `.find((f) => /mutual/.test(f))` — the **oldest** match — and `create or replace`
    means the live function is whichever migration defines it **last**. So once `0184` landed, a
    first-match scan would have gone on asserting against `0182`: green, against a body the
    database no longer runs. It filters to files that actually DEFINE the function, sorts, and
    takes the last. **A guard that names its input by a substring has a clustering key, and a
    second file changes what it can see.**
  - **`read()`'s LENGTH FLOOR IS FOR A FILE YOU ASSERT AGAINST, NOT A DIRECTORY YOU SCAN.** Pointed
    at all ~185 migrations it tripped on a 340-character one and killed the run. `readRaw` scans;
    the file the scan SELECTS still goes through `read()`, so the protection is where it belongs.
  - **THE DOCUMENTS NAME THE CONTROL, and the guard asserts it in both.** A privacy document that
    describes the exposure and not the switch is the half-told version — and `check:policy-claims`
    asks the **opposite** question (does a surface claim a control the app LACKS), so it is
    structurally blind to a control the app HAS going undescribed.
  - **PROVEN ON THE LIVE DATABASE WITH THREE REAL ACCOUNTS**
    (`scripts/oneoff/probe-mutuals-visible-switch.mjs`, 8 assertions). The service key creates the
    accounts and touches nothing else; every read and every write under test goes through the anon
    key plus that climber's own JWT, because whether a climber can set their **own** preference
    under RLS is part of the question. **Every suppression is sandwiched by a control** — the row
    is asserted present, the switch goes off, the row is asserted gone, the switch goes back on and
    the row is asserted returned — so the disappearance is attributable to the flag rather than to
    a broken function, a connection that never landed or an expired JWT.
- **"1 VIEWING NOW" WAS COUNTING THE READER, on every DB-backed route, permanently.** The route
  page's social strip is four chips, and `presence.count` was `entries.length` — every tracked
  presence **including your own**, since you call `track()` — while the `viewers` list beside it
  filtered you out. So **one strip carried two rules about whether the reader is in it**: the number
  counted you and the avatars did not. A climber alone on a route read a pulsing green **"1 viewing
  now"** with no avatar next to it, and the whole strip is `clickable(() => setTab("partners"))`, so
  it is an invitation to go and find the person it just invented.
  - **CONFIRMED ON A REAL RUN, not reasoned about.** CI's `ui-screens` capture of `route:Overview`
    shows *"1 viewing now"* and **zero** viewer avatars, from a walk that is the only client on that
    route. The chip is gated `{vw ? … : null}` and `vw` could not be 0 while the channel was
    subscribed, so it was on for **every** climber on **every** route, always.
  - **THE OTHER THREE CHIPS ARE ABOUT OTHER PEOPLE, WHICH IS WHAT MAKES THIS A MISS RATHER THAN A
    MISSING CONVENTION** — the same argument the résumé's demo-verify tick turns on. `popInterest`
    filters seed `CLIMBERS`, which `ME` is **not in**; open crews are ones you are not on; and an
    ascent logged is an ascent logged. *"Viewing now"* was the outlier.
  - **THE FIX IS ONE EXCLUSION, NOT A SUBTRACTION.** `presenceSplit(entries, myId)` in
    `lib/presence.js` derives **both** halves from the same filter, so the count is the superset of
    the avatars **by construction** and they can never disagree again — the
    `check:count-matches-its-list` principle (*one definition rather than a matching rule*). A
    `count - 1` would have been a matching rule, and wrong the moment you are not tracked.
  - **IT IS A PURE EXPORTED FUNCTION FOR THE REASON `topoEmptyCopy` AND `stateCatalogLine` ARE: it
    can be RUN.** Standing up a Realtime channel to ask *"does this count include me"* is far more
    than the question is worth, and a decision taken inside a hook is unreachable to any static
    check.
  - **THE NEIGHBOURING PROMISE WAS CHECKED BEFORE THE CHANGE, and it is what stops the obvious
    over-fix.** Settings says *"Off still counts you in 'climbers viewing now', just without your
    name or photo"* — a claim about what **OTHERS** see. You are still `track()`ed when invisible, so
    it stays true; a fix that stopped tracking you would have made that copy false.
    [[changing-which-record-wins-leaves-the-neighbouring-field-behind]].
  - **AND A COMMENT BESIDE THE GATED SWITCH ASSERTED THE OPPOSITE OF THE TRUTH FOR AS LONG AS BOTH
    EXISTED.** It read *"`visibleWhileBrowsing` has NO consumer at all — nothing reads it but the
    switch's own `aria-checked`, so it is announced and inert"*, while `useRoutePresence` is handed
    it as `visible` two hundred thousand characters away and it decides whether your name and photo
    ride your presence entry. The switch is inert **because the flag hides it**, not because nothing
    consumes it. **CLAUDE.md repeated the claim** — `check:visibility-switches`' own entry said
    *"whose every reference was its own knob"* — so the error was in two places at once, which is
    how a session ends up deleting live wiring. Both corrected.
  - **NOT A PRIVACY DEFECT, checked rather than assumed**: the flag is `useState(false)`, so a
    climber is counted and never named, and a control nobody can reach could only ever make them
    MORE visible. Recorded so it is not re-derived as one.
  - Proven by `scripts/oneoff/probe-viewing-now-counts-others.mjs` — 18 assertions, **no browser, no
    database, no Realtime channel**, executing the real `presenceSplit` out of an esbuild bundle with
    the client stubbed (`lib/presence.js` imports `./supabase` **extensionless**, which vite resolves
    and node does not). **Both halves are proven load-bearing by A/B**: reverting the exclusion fails
    6 execution assertions, and reverting only the chip's field name fails 2 **while all 6 still
    pass** — which is exactly why the wiring is asserted as source beside the behaviour.
- **THE PARTNERS FILTERS NARROW THE EXAMPLE PROFILES AND NOTHING ELSE, AND THE LIST OF REAL ACCOUNTS
  SITS BETWEEN THE SENTENCE PROMISING THEM AND THE FILTERS THEMSELVES.** In *"Anyone"* mode the app
  says **"Use the filters below to narrow by level, discipline, trust, and distance"** — and the very
  next block is **"Climbers on ClimbMatch"**, the real accounts, which **none of those four narrows**.
  Measured by source offset, the order is: intro sentence -> **REAL accounts** -> the example caveat
  -> *Hide filters* -> the filter panel. **The first list below the promise is the one list the
  promise does not cover**, and the filters are two lists further down.
  - **IT IS NOT A WIRING BUG AND MUST NOT BE "FIXED" BY APPLYING THE FILTERS**, which is the tempting
    reading and the damaging one. Most of them **cannot reach a real profile with the data that
    exists**: `RealClimberRow`'s own `_cand` hardcodes `objectiveIds: []`, and `profiles` has no
    availability, no pace and no `level` column for anyone — `check:real-profile-rows` exists because
    rendering one invents a value a real account lacks. Applying them would **exclude every real
    climber**: absence read as a mismatch, which is the defect #612 removed from pace and which the
    comment directly above the speed filter still warns about in as many words (*"a pace nobody
    recorded is UNKNOWN, not a mismatch"*).
  - **SO THE FIX IS ONE SENTENCE, AT THE LIST IN QUESTION** rather than at the promise: the
    real-accounts caption now ends *"The filters below narrow the example profiles, not this list."*
    A reader meets it exactly where the question arises, and it resolves **both** intro sentences at
    once — the objectives one (*"Climbers who share one of your saved objectives — your tightest
    matches"*) mis-describes the interposed list for the same reason, since `_cand` cannot carry an
    objective.
  - **REMOVED 2026-09-25 at the user's request** ("I don't need any text like this in the app"): every note telling a climber that profiles or listings are EXAMPLES, including the caveats above. The probes that asserted them (`probe-leaderboard-example-caveat`, `probe-partner-filters-say-what-they-narrow`) are deleted. The Partners intro ("Use the filters below…" / "Climbers who share one of your saved objectives…") now renders only when no real-accounts list sits between it and the filters, so it cannot describe the wrong list. Do not re-add an example caveat.
  - **THE AVAILABILITY FILTER EXCLUDING UNKNOWNS IS A DOCUMENTED DECISION AND WAS DELIBERATELY LEFT
    ALONE.** `if(!_av.length||!availMatch(...))return false` drops a climber whose availability is
    unknown — the mirror of the pace defect — but #532 chose that, the comment above `dateFit` records
    the reasoning, and **the list it governs is seed-only**, so it cannot empty a real search.
    *Reversing a documented decision needs evidence*, and a measurement showing 12 of 13 example
    climbers carry no availability is a product argument, not evidence of a defect. Recorded so it is
    not re-derived as one — and note the five `availability:` fields that look like counter-examples
    are **guides**, where it is a STRING (*"Booking ~2 weeks out"*) that `availOf` correctly refuses.
  - Was proven by `probe-partner-filters-say-what-they-narrow` (deleted 2026-09-25 with the caption it checked) — 23 assertions,
    **source-only**, and the reason is stated rather than implied: the real-accounts block is gated on
    `USE_DB && DB_UID`, so reaching it means stubbing `./lib/supabase` to flip a module constant AND
    standing up PartnerSearch's full prop set, which is far more than a copy claim is worth.
    `check:policy-claims` takes the same decision for the in-app privacy sheet.
    - **IT ASSERTS THE ORDER, because the order IS the defect** — a probe that only checked the
      sentence would pass against a layout where the real list had moved out from under it.
    - **AND IT ASSERTS THAT THE EXAMPLE LIST IS STILL NARROWED BY ALL SEVEN CHIPS.** A rule that only
      says the real list is unfiltered is satisfied by a filter panel that narrows **nothing**, which
      would make the new sentence false in the other direction.
- **PARTNER SEARCH BY DISTANCE: A ZIP CODE AND "WITHIN N MILES", MODELLED ON MOUNTAIN PROJECT AND
  FIXING THE ONE THING IT GETS WRONG (`0189`).** Before this, every distance control on Partners
  filtered the **seed example profiles only**: `profiles` carries free-text `location` and no
  coordinate, and the sign-in reset clears `ME.lat/lng`, so for a real account every *"within N mi"*
  read *"Needs your location"* and no real climber was ever filtered, sorted or shown a distance.
  - **Mountain Project's partner finder** takes a zip and a 25/50/100-mile radius, then displays each
    result's **self-typed city** — so a *"live within 25 miles of 98101"* search lists somebody in
    *Las Vegas, NV*. The radius and the displayed place come from different records. Here the
    distance shown is computed from the **same** record the radius filtered on.
  - **THE ZIP IS NEVER ON `profiles`, which is public-read.** It lives in `profile_zips`, readable and
    writable by its owner only. Others learn a **distance rounded UP to the next 5 miles**, and only
    through `partners_near`, a `SECURITY DEFINER` function that is the one door onto that table. It
    returns listed (`discoverable`) climbers only, never the caller, and never a climber who blocked
    the caller (`profile_owner_blocked_me`, reused).
  - **The radius has a 10-mile FLOOR**, because arbitrary origins plus a tiny radius let a caller walk
    a circle around somebody. **Distance-only REDUCES disclosure and does not eliminate it**, and the
    Privacy Policy says so in as many words — `check:policy-claims` pins that limit, since it is the
    clause a tidier rewrite would drop first.
  - **"Near me now" reads the phone once, rounds to 2 decimals (~1 km) before it enters state, and
    sends it only as the query argument** — nothing stores it. **It landed the same hour as #1812's
    base check-in, which rewrote the same Location section** (and retired *"We do not record where
    you are"*, since a check-in IS stored). The two were woven into one section rather than one side
    chosen at merge, and both sets of pins sit side by side in `check:policy-claims`.
  - `zip_centroids` is the 2020 Census ZCTA gazetteer, **33,144 rows**, loaded by
    `scripts/oneoff/load-zip-centroids.mjs`, which counts the table afterwards rather than trusting
    the 200s. A zip with no ZCTA (PO-box-only) is refused by the foreign key and reported as
    unrecognised rather than stored unplaceable.
  - **Proven with five real accounts on their own JWTs** —
    `scripts/oneoff/probe-partners-near-with-real-accounts.mjs`, 21 assertions: owner-only reads and
    writes, the 23503 refusal, the signed-out refusal, radius in and out, unlisted excluded, no
    zip/coordinate/exact distance returned, 5-mile rounding, nearest first, the floor, and the block.
    **The service key creates and deletes accounts and nothing else**, since it bypasses RLS.
  - **`disciplines` IS `jsonb`, NOT `text[]`**, and the first draft of the function's return type said
    `text[]`. `return query` checks types at RUN time, so it would have created cleanly and failed on
    the first search. Read `information_schema.columns` before declaring a `returns table`.
  - **The editor withholds the zip field until the read SUCCEEDS** (`draft.zip===undefined`), because
    a blank draft saved clears the stored zip — the `check:profile-edit-gate` shape on a new field.
  - **The onboarding sheet wrote an AREA ID into `profiles.location`** (`homeArea:home`, e.g. `lcc`),
    which partner rows print as the climber's city. It now sends what the box shows, falling back to
    the existing value so an untouched box never blanks it.
