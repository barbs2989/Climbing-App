# Seed data and identity

Seed history must never be attributed to a real account, and seed-only surfaces must be declared: seed-history, crew-member-readers, real-profile-rows, dead-flag-gates, sample-content-removable, seed-only-surfaces, DEMO_FILLERS.

Part of the guard notes — see [README.md](README.md) for the full index.

- **THE SEED-IDENTITY DEFECT CAME BACK IN `FriendsList`, AND `check:seed-history` IS BLIND TO A
  THIRD OF THE APP — the second half is the serious one.** The friends overlay's FRIENDS' RECENT
  ACTIVITY section does exactly what #735 fixed on Home, both halves:

      friends.some(function(c){return c.name===x.a.user;})          // which rows to show
      var fr=friends.find(function(c){return c.name===x.a.user;});  // Kudos / Message / VOUCH

  `friends` is the DB-backed connections list and `a.user` is a seed author's DISPLAY NAME, so a
  real climber called "Maya Chen" is shown that seed climber's 11 climbs as her own activity — and
  `fr` drives the row's **Vouch** button, so she could be vouched for off somebody else's climb.
  `seedIdentity` appeared **zero** times within 4,000 characters of either site.
  - **THE GATE COULD NOT SEE IT, and that is measured rather than inferred.** `blank()` wipes
    comments and strings in one stateful pass, treating **every quote as a string delimiter** — and
    JSX body text is full of apostrophes (`don't`), so it desynchronises and wipes real code:

        ClimbMatchCore.jsx   41.4% of the file wiped   54 of 283 `function NAME` declarations GONE
        RouteDetail.jsx      46.2% wiped               33 of 129 GONE
        ClimbMatch.jsx       37.4% wiped                2 of  10 GONE

    Those 54 sit at **column 0** — `GearTiers`, `CatchLedger`, `EmergencyRescueCard`, `SpeedProfile`,
    `ReportStats`, `BailoutForm` — and a declaration at column 0 cannot be inside a string or a
    comment. **Wiping comment text is the point; wiping CODE is a false pass**, and finding that
    code is this gate's entire job. `check:overlay-discovery`'s entry already records the same
    blanker returning *"0 overlays where raw returns 22"*.
  - **SO A GREEN RUN HERE IS A STATEMENT ABOUT TWO THIRDS OF THE APP**, and `FriendsList` is in the
    wiped third. That is why the defect survived the gate built for it.
  - **IT WAS FOUND BY ACCIDENT, WHICH IS THE PART TO INTERNALISE.** An apostrophe in an unrelated
    comment shifted where the desync lands and the two sites became visible for the first time.
    **Rewording the comment made the guard green again — the tempting fix, and the wrong one**: it
    would have hidden a live defect and left the gate reporting a clean sweep. The apostrophe was
    kept until the sites were genuinely gated.
  - **The gate goes AFTER the comparison** (`c.name===x.a.user&&seedIdentity(c)`), matching the form
    `ClimbMatch.jsx` uses, because the scan tests the **90 characters following** the match. A gate
    written *before* it is correct code the guard rejects — worth knowing before "fixing" a red by
    reordering the wrong way.
  - **Verified on RAW source, not through the gate**, because a green from the gate proves nothing
    here: `scripts/oneoff/probe-friendslist-activity-is-seed-gated.mjs` asserts both gated forms and
    that the two UNGATED strings are absent, plus a non-vacuity check that the 43 seed activity
    authors still exist. Nothing it reads is blanked, so nothing can be silently skipped.
  - **THE BLANKER IS NOT REWRITTEN HERE, deliberately.** It is shared with `check:dead-flag-gates`,
    whose own entry records that a regex strip *"ate real code"* there, so a careless fix is worse
    than the hole. It needs a JSX-aware pass and its own injection suite — and until it has one,
    treat this gate's verdict as partial.
- **`check:seed-history`** asserts that seed climbing history is only ever attributed to a
  **seed** identity. `ticksFor(name)` scans `ROUTES[].activity` for `a.user === name` — it
  matches a **display name**, which belongs to neither id space, so it hands one person's
  climbing record to anyone who shares their name. Eleven names author seed activity (Maya
  Chen 11 rows, Alex Torres 8, Jordan Park 7 … and "Nathan Barber", the seed `ME`). Two real
  identities collide with them: **`ME`**, whose `id` is *never* reassigned — it is `0` signed
  in or out — while `ME.name` becomes the real account's profile name; and a **DB-backed
  friend**, a uuid that the friends list hands to `FullProfile`. Before #735 a real account
  named "Nathan Barber" saw *Angels Landing, Oct 2024, Summit, 5★* on its own résumé. Not
  cosmetic: the `classics_b` Leaderboards badge **counts**
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
  - **A THIRD SHAPE SHIPPED ON HOME, and both tests above are blind to it BY CONSTRUCTION.**
    `_friendFeed` matched connections to seed activity by display name —
    `ROUTES.flatMap(…).filter(x => connections.some(c => c.name === x.a.user))` — so a DB-backed
    friend called **"Maya Chen" was shown her 11 seed climbs as their recent activity**. It never
    calls `ticksFor` and never writes `===ME.name`, so the guard built for exactly this class
    passed throughout. Crew:Friends does the same job correctly, through `seedHistoryFor(f)`.
    - **Found by READING CI's `ui-screens` artifact, not by a scan.** Home says *"Recent friend
      activity · 11 updates"* and Crew:Friends says *"Show all 14"* — two derivations of one
      feature. Chasing the count disagreement found the identity bug under it. The walk asserts no
      NaN and no `undefined`; nobody reads the copy for sense, and `gh run download <id> -n
      ui-screens` costs nothing locally, which matters when the box is too loaded to walk.
    - **The gate is now ONE exported predicate**, `seedIdentity(c)`, used by `seedHistoryFor` and
      by both Home readers. It was inline before, so it existed in exactly one place and every
      other reader had to re-derive it — and one did not.
    - **Section 3 found a SECOND instance the hand-fix missed, and it is the worse one.**
      `var fr = connections.find(c => c.name === x.a.user)` resolves the friend object behind each
      row and drives its Kudos, **Message** and **Vouch** buttons — so a real connection sharing a
      seed author's name could be **vouched for off somebody else's climb**. Fixing the display
      and stopping would have left it.
    - The rule is exact rather than a keyword sweep: a comparison whose two sides are a `.name`
      and a seed row's `.user` is **always** an identity claim, and nothing else in this codebase
      compares those two fields.
    - **AND THE COUNT DISAGREEMENT THAT FOUND THIS BUG IS STILL ON SCREEN, MEASURED 2026-09-04.**
      The entry above records Home saying *"Recent friend activity · 11 updates"* while Crew:Friends
      says *"Show all 14"*; the identity bug beneath it was fixed and **the numbers were never
      reconciled**, so a fresh CI capture still reads 11 and 14. They are **different lists behind
      near-identical headings**: Home's `_friendFeed` is seed route `activity` authored by your
      connections, filtered to `isRecent` and capped at 12; `FriendsFeed`'s rows are
      `seedHistoryFor(f)` **plus that friend's vouches**, unfiltered by date. Neither is wrong
      about its own list — do not "fix" one to match the other.
    - **BOTH ARE SEED-ONLY, AND THAT IS THE FINDING THE COUNTS POINT AT.** `seedHistoryFor` is
      `seedIdentity(c) ? ticksFor(c.name) : []`, and `seedIdentity` requires `typeof c.id ===
      "number"` — a DB-derived connection carries a **uuid string**, so it returns `[]`. Measured
      by rendering (`scripts/oneoff/probe-friends-feed-reads-seed-history.mjs`, no browser, no DB):
      a seed friend renders **8,179 characters**, the *same person* as a real connection renders
      **0**, and attaching real `logs` to that connection changes nothing. **A real friend's logged
      climb cannot reach either feed.**
      - It renders **nothing at all** rather than an empty section, so no false claim is made —
        which is why no honesty guard sees it and why this is reported rather than captioned.
      - **`TickList` two hundred characters away does it correctly**: `base = seedHistoryFor(climber)`
        **plus** `extra` built from real `logs`. So the app already has the pattern and this surface
        simply never gained it — the same asymmetry as *PEOPLE YOU'VE CLIMBED WITH* directly above
        it on Crew:Friends, which #713 revived onto real `logs`.
      - **NOT BUILT, deliberately.** Showing a real friend's climbs needs a hook reading **other
        users'** `climb_logs` — a query, an RLS question and a visibility rule that do not exist —
        and `climb_logs` holds **1 row catalog-wide**, so it would render an empty feed for
        everybody. That is the `three-climbs-tab-sections-dead-in-production` shape: feature work
        gated on data that does not exist, not a wiring fix.
      - **It also corrects a recorded census verdict.** The discovery-surface census filed
        `FriendsFeed` as *healthy* because its `connections` prop is DB-backed. That is a verdict
        about what feeds the **list**, not about what feeds the **rows**. *Ask what fills the rows,
        not what fills the list.* The gate must be in the **same expression**, not merely somewhere
      in the file.
    - **The probe that proved it RETYPED the predicate instead of lifting it**, so it kept failing
      after the fix landed — the exact trap its own header warns about. Its extraction also cut at
      the first `;`, which sits *inside* the flatMap body, so it never contained the filter at all;
      that stayed invisible while the copy was doing the deciding.
      `scripts/oneoff/probe-home-friend-feed-name-match.mjs` now executes the predicate from source
      and is injection-tested: removing `seedIdentity(c)` fails it, restoring passes.
  - **AND THE MIRROR: THE VOUCH PICKER *OFFERED* A REAL CLIMBER THE SEED CATALOG.** Everything above
    asks whether seed history is ATTRIBUTED to a real account. `GiveVouch` asks *"which climb did
    you two do together?"* and its list was `ROUTES.filter(...)` — the seed demo catalog — while
    `useRouteSearch(USE_DB ? q : "")` is **disabled on an empty query**, so the real catalog was
    never consulted for the default view. With nothing typed the filter keeps everything, and even
    a search put seed matches **ahead** of the real ones.
    - **THE PICK IS PERSISTED, which is what makes it more than cosmetic.** The call site does
      `giveVouch(uid, targetId, JSON.stringify({route: v.route, …}))` and `route` is the route's
      **NAME** (`setRoute(sel?"":r.name)`) — so a demo climb was written onto a **vouch**, a trust
      artefact about somebody else.
    - **The empty state had to change with it.** Withholding the seed list leaves an empty picker,
      and the existing copy said *"No climbs match."* — false when nothing has been searched, the
      same class as everything else here. It now distinguishes the two.
    - **The prompt is DERIVED from the source, never restated in the guard**, because both
      alternatives fail: a loose `/search/i` is **vacuous** (the picker's own input placeholder is
      *"Search by climb name or area…"*, 13 `earch` matches in that component) and pinning the exact
      words would forbid rewording it. A reword now updates one place; deleting the branch fails
      **closed**.
    - **THE CONTROL IS THE LOAD-BEARING HALF.** *"No seed climb offered"* is equally true of a
      component that rendered nothing, so the seed build must still list them — and a rule that only
      ever withholds would be satisfied by emptying the picker for everyone, which is injection case
      4. `USE_DB` is set by **stubbing `./lib/supabase`** through an esbuild plugin rather than
      standing up a client, which on node 20 would also need the `WebSocket` constructor
      RealtimeClient builds at construction.
    - Measured by `scripts/oneoff/measure-vouch-picker-offers-demo-routes.mjs` and injection-tested
      **6/6** (`scripts/oneoff/inject-vouch-picker-cases.mjs`), each edit proven by checksum and the
      file restored byte-identically. **Two must stay SILENT.**
    - **THE SECTION RUNS BEFORE THE SUMMARY, and the first version did not** — appended after the
      `console.log`, a failure inside it was counted while the run had already printed *"ok"*. The
      exit code stayed correct and the OUTPUT lied, which is the footgun `check:overlay-absence`
      had for its whole life — recorded here as unfixed, and fixed in #1753 once prose alone had
      failed to stop it recurring. Put a new section above the summary it is counted in.
  - Injection-tested; the five cases are listed at the bottom of the script. Case 4 is the one
    that shaped it: gating on `!c.id` looks equivalent and silently empties every seed
    climber, so the seed-climber assertion is **comparative** (against a name with no seed
    activity) rather than a length threshold that a résumé shell would satisfy anyway.
- **`DEMO_FILLERS` IS `true`, AND FOUR ENTRIES IN THIS FILE STILL SAID IT WAS AN UNCONDITIONAL
  `false`.** #1566 (*"Sample content ON: every empty surface now shows one example, behind one
  flag"*) flipped it, and nothing propagated that to the four guard entries that REASON from it —
  `check:dead-flag-gates` (*"an unconditional `false`"*), `check:overlay-discovery` (*"`events` and
  the club `GROUPS` … permanently false"*), `check:toast-reachable` (*"`GROUPS` is empty behind
  `DEMO_FILLERS`"*) and `check:anniversary`. All four corrected.
  - **IT HAD ALREADY COST SOMETHING, WHICH IS HOW IT WAS FOUND.**
    `probe-leaderboard-example-caveat` empties `CLIMBERS` to ask whether the *"Example profiles are
    included"* caveat goes quiet on an all-real board. With the flag on, **twelve `FILLER_CLIMBERS`
    with numeric ids survive that**, so the caveat correctly stayed — and the probe reported the app
    as *"unconditional, not counted"* when the app was right. It empties both pools now.
  - The flip also silently widened `check:overlay-discovery`'s payload coverage: `events` and
    `GROUPS` resolve where the entry says they are skipped. **A flag flip is a change to every
    conclusion that was reasoned from the old value**, and this file's own entries are where those
    conclusions live.
- **`check:real-profile-rows`** enforces one sentence: **a row must not print a level or a
  trust score for someone who has neither.** Seed climbers carry `level` and enough history
  for `vScore()` to mean something; a real profile carries neither, so the subtitle renders
  **"undefined · 0"**. #715 fixed ONE row of this and left the rest — they survived for months
  and were found only by driving a real account through the friend-request screen, where the
  row asking you to accept a stranger showed `@handle` above `undefined · 0`. Gated by
  `npm run build`.
  - It flags the **text** shape only: a level or score concatenated into a rendered string.
    `vScore()` used for sorting, filtering, or handed to `<TrustBadge score={…}>` is a
    different question — a badge can gate on `_real`, and the crew invite picker does.
    - **THIS BULLET USED TO SAY `FullProfile` DID TOO, AND IT NEVER HAS.** Its badge was an
      unconditional `<TrustBadge score={vScore(climber)} compact/>` under the climber's name, so a
      reader was sent past a live defect by a sentence claiming it was already handled. Measured
      (`scripts/oneoff/measure-fullprofile-badge-vs-the-ring.mjs`): FullProfile's memo hydrates
      **received vouches and none of the other client-model inputs**, while their denominators still
      count — so that badge was **capped at 25** for every real climber however trusted, making
      **"Trusted" (33) and "Highly Trusted" (65) unreachable**, and anyone with three vouches or
      fewer read **"New" in red**. The control rules out a flat model: seed climbers span 29-98 and
      do reach the top tier. Meanwhile the avatar RING inches above it is the **server** score and
      reaches **84**, so one screen stated one climber's trust twice, from two models.
    - Fixed by reading the ring's own `ts` — one derivation, so the two cannot disagree — gated on a
      known score. **`check:trust-breakdown` section 10** pins both halves: 10a is DERIVED and
      **fails as STALE** if the memo ever hydrates the rest (at which point the client model becomes
      defensible again), 10b is the wiring, which no execution can see because reverting it moves no
      identifier. Injection-tested in `inject-fullprofile-trust-ring-cases.mjs`.
    - **`Resume` HAD THE SAME CAP AND IS FIXED TOO — this bullet read "DELIBERATELY NOT FIXED HERE"
      for as long as that was true, one bullet below a sentence this same entry records going stale
      in the other direction.** `onResume(climber)` is called with the memo-hydrated climber, so the
      **shared and exported** résumé printed the same capped client score — and it matters more
      there than on the profile, because that document is the one a climber sends to somebody.
      - **IT FETCHES ITS OWN SCORE RATHER THAN TAKING A PROP, and the two entry points are why.**
        `Resume` is opened from `FullProfile` (which holds a server score) **and** from
        PartnerSearch's stat tile (which does not), so a prop would leave the same climber's résumé
        stating a different number depending which way you came in — the #1203 shape on a document
        rather than a screen. Threading it from both call sites is the tidier-looking option and is
        the one that reintroduces the defect.
      - **ONE test for who is real, exported as `realProfileId(id)`.** `_real` is unreliable (a
        browse row object need not carry it) and the id is the signal, so both trust surfaces ask one
        function rather than each re-inlining the uuid shape. Deliberately **not** a sweep of
        `ClimbMatch.jsx`'s own copies — App has its own `isDbId`, and that is a separate refactor.
      - Sections **10c/10d** pin it: the résumé badge reads its gated `rts`, no `TrustBadge` in
        `Resume` is fed `vScore(climber)`, and neither surface re-inlines the real-id test. 10c
        strips only `{/* */}` for the reason 10b does.
      - **The own-résumé path is UNCHANGED and is not this defect.** `setResumeFor(meLive)` passes
        `ME`, whose `id` is the integer **0** signed in or out, so `realProfileId` returns null and
        your own résumé keeps the client model. Nothing is capped there — the memo is not involved —
        so it is the documented "4 screens, 3 trust scores" residue rather than a stand-in, and
        closing it means the sign-in reset rather than this badge. Stated rather than swept.
    - **AND THE ENUMERATION WAS SHORT AGAIN: NINE badge sites, not seven, and TWO more were live —
      the crew JOIN-REQUEST card and the CHAT HEADER.** Fixed in the change after the résumé. The
      class is now closed with every site classified: FullProfile (`ts`) and Resume (`rts`) fixed;
      TripReport already gated; CrewCard's invite-search row already **correct**; ShareCard
      (`climber={meLive}`) and PartnerSearch's example card documented non-findings; and these two.
      - **THE JOIN-REQUEST CARD HAD ITS NAME FIXED HOURS EARLIER AND THE BADGE BESIDE IT LEFT.** That
        expression carries a comment recording the repair — *"this fell to a fallback that named them
        'Climber' AND handed them a trustScore of 50 nobody earned"* — and the next JSX element along
        was `<TrustBadge score={vScore(c)}/>`, which for a `useProfilesByIds` shape is **0, "New",
        in red, on the card an organiser accepts or declines a stranger from**. *An instance fixed by
        hand is not a class closed*, with the fixer's own comment as the evidence for what it missed.
      - **THE CORRECT PATTERN WAS 200 CHARACTERS AWAY IN THE SAME COMPONENT**, on CrewCard's
        invite-search row: `c._real?(realTrust[c.id]!=null?<badge/>:null):<badge score={vScore(c)}/>`,
        served by a **batched, memoized `fetchTrustScore` map** that only the invite SEARCH fed. So
        the repair is not a new mechanism — it widens that fetch to the requesters' ids and applies
        the component's own gate. **The seed branch is kept and moved behind `seedIdentity`**, which
        also catches the unresolvable `{name:"Climber"}` fallback: that scores 0 too, and its
        `trustScore:50` is inert because `vScore` never reads that field.
      - **THE CHAT HEADER** read `vScore(chatWith)`, and **four of its eight setters can hand it a
        real profile** — FullProfile, FriendsList, Resume and an inbox thread partner. CLAUDE.md
        already records FriendsList rendering **`undefined · 0`** for a real connection from exactly
        that shape, so this is the same defect one surface over from a recorded one.
      - **THREE COPIES OF ONE EFFECT COLLAPSED INTO `useRealTrustScore`, because the chat header
        would have been a fourth.** FullProfile's and Resume's fetches were **byte-identical but for
        the variable names** (222 and 204 characters) — the four-grade-parsers shape. The hook also
        fixes something neither copy did: it **resets to null when the id changes**. Neither
        `<FullProfile>` nor `<Resume>` is keyed, so reconciling either from climber A to climber B
        keeps the same instance and **B's badge showed A's score until the fetch resolved** — a
        measured number attributed to the wrong person. App's own `myServerTrust` already reset;
        the two component copies did not.
      - **CrewCard's batched map is deliberately NOT folded in**, and that is a distinction rather
        than an exception: N rows cannot each call a hook, so a map is a different SHAPE of the
        question, not a second answer to it. Section 10g counts the `fetchTrustScore(` calls — **2**,
        the hook and that map — so a fifth surface writing its own copy fails rather than a list of
        surface names that would rot.
      - Sections **10e/10f/10g** pin all of it, and `inject-fullprofile-trust-ring-cases.mjs` goes
        **11 → 20**, judged on the guard's own FAIL lines with the tree restored byte-identically.
      - **A MEASURED NON-FINDING worth not re-deriving:** a server score of **0** is real and earned,
        so every gate tests `!=null` rather than truthiness. An injection case pins it, because a
        gate written `realTrust[c.id]?…` looks identical and silently suppresses a measured 0.
    - **AND A BLANKER MEASUREMENT SHARPER THAN THE ONE THIS FILE ALREADY RECORDS: the `{/* */}`
      strip removes 58.8% of `ClimbMatch.jsx`.** Section 10f reads that file RAW, and adding the
      strip 10b/10c use looked like consistency. Measured: **329,776 characters gone, one phantom
      match running 169,287**, because an opening JSX-comment sequence inside an ordinary JS comment
      or a string runs to the next closing one thousands of lines away. It took `const chatTs=` and
      `useRealTrustScore(` to **zero occurrences** and the guard failed on a correct app. The
      existing entry records the same regex eating **21% of `RouteDetail.jsx`**; on a 560 kB file it
      is nearly three times worse. **The strip is safe on a small SLICE of core, which is all
      10b/10c apply it to, and never on a whole app file.** Reverted, with the measurement recorded
      beside the read so nobody adds it back.
  - A site passes when the same expression is **gated** on `_conn`/`_real`/`_profile`, or goes
    through **`climberLine(c)`** — the single honest answer (location · @handle, falling back
    to "On ClimbMatch" rather than to fabricated numbers).
  - **THREE exemptions** — PartnerSearch's ALL_CLIMBERS example card and two rows of the seed
    GuideDashboard — each **measured** by reading the collection that feeds the row. A **stale**
    exemption fails.
  - **THIS BULLET SAID "FIVE" AND NAMED A CARD THAT NEVER HAD THE SHAPE, and both halves of that
    are the entry.** It listed the OPEN_CREWS organiser chip, whose exemption the guard had
    already removed and *recorded removing in its own file*, so the doc was stale by one; and it
    led with *"the seed crew-invite card"*, which was the `why` on an exemption keyed
    `who?" · "+who.level`. **At the commit that ADDED that entry (#876) the key matched exactly
    ONE site — the GROUP join-request card — byte-identical to today, and neither crew-invite card
    has ever rendered a level or a score; both print a name and a route.** So the guard's own
    header (*"Each reason MEASURED, not assumed"*) was false for that entry, the doc copied the
    error, and **"a stale entry fails" never fired, because the key still matched — just a
    DIFFERENT card.** *A key can outlive the surface it was written for, and matching is not
    proof.*
  - **The stated MECHANISM was wrong too, and that is the dangerous half.** *"crewReqIn is
    seeded"* is false for a group join request: the Approve handler branches on `rq._db`, so
    `rq.climberId` can be a uuid. The site was safe from a REAL profile only because `cById`
    resolves against seed `CLIMBERS` by integer id, so a uuid made `who` null and the `who?`
    ternary collapsed to `""` — an **accident**, and one `check:crew-member-readers` exists to
    push authors into removing. And it was not safe from a SEED climber either: `cById` falls
    back to `FILLER_CLIMBERS`, whose 12 generated objects carry **no `level` key**, so a request
    naming one rendered `undefined`. Latent rather than live — today's seeded request names a
    `CLIMBERS` entry — which by `check:field-renders`' `SENTINELS` reasoning is the best moment to
    fix a writer, not the worst. The card calls `climberLine(who)` now, which is the remedy the
    guard's **own failure message** prescribes, so the site is gated and the exemption is gone.
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
    in a one-off nobody runs. Same reasoning as `check:correction-readers`.
  - A site passes when the **same expression** also consults real profiles — what `CrewCard`'s
    `mem` does (the #569 fix). That is a correct answer, not an exemption.
  - **Comments are stripped before any test**, and it is load-bearing: two call sites explain
    this rule in a comment that *names* `crewMemberById`, so leaving comments in would let a
    site pass on prose about the fix rather than the fix. The false pass
    `check:correction-readers` already records.
  - Six exemptions, each with a **measured** reason (seed-only lists: `crewReqIn`,
    `crewJoinIn` twice, the seed invite card, `GuideDashboard`'s inquiries, and a
    notification whose result is guarded by `if(c)` so a miss opens nothing). A **stale**
    exemption fails, so the list cannot rot into a description of code that is gone.
  - Fails **closed**: zero member-id lookups means the walk broke, never that the app is clean.
  - Injection-tested, 6 cases at the bottom of the script: reverting each of the three #778
    fixes fails and names the file and line; deleting a live exemption reports it as a finding;
    an exemption matching nothing reports as stale; and breaking the scan vocabulary reports
    "found NO member-id lookups at all" rather than passing.
- **`check:dead-flag-gates`** finds UI that can never render because the only thing feeding
  it is a constant seeded from a permanently-false flag. `DEMO_FILLERS` was an unconditional
  `false` when this was written — **#1566 flipped it to TRUE** ("Sample content ON"), so the
  constants below are no longer empty and this guard's subject is now the SHAPE rather than that
  particular flag. #704/#707 found **three** surfaces gated on such a constant with no other
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
- **`check:sample-content-removable`** asserts that the sample content really does come **out**
  with the flag. `DEMO_FILLERS` was turned on temporarily and explicitly — *"I will eventually
  remove the examples before the app goes live"* — and the flag's own comment states the removal
  contract in one sentence: *"That is the whole switch."* Rules 1-3 check that: every promised
  constant is initialised through a `DEMO_FILLERS` conditional whose OFF branch is **empty** (so
  the gate is at the SOURCE and every consumer inherits it), the registry is not stale, and nothing
  is gated that the guard does not know about. Static (Babel over the two app files), so it sits in
  `npm run build`.
  - **ALL THREE OF THOSE RULES KEY ON A `DEMO_FILLERS` MARKER, SO UNGATED SAMPLE CONTENT IS
    INVISIBLE TO THEM BY CONSTRUCTION.** A constant that is ungated entirely has no marker for the
    traversal to find, and that is not a hypothetical gap: `notifs`, `crews`, `logs`, `msgs`,
    `friendReqIn`, `contribs` and sixteen more start populated and are gated by nothing.
  - **They are not a defect, because there is a SECOND mechanism, and the app says so at the reset
    itself**: *"STARTING VALUE of this app's state, gated by nothing (DEMO_FILLERS does not cover
    them) … Keyed on the SESSION rather than on a build flag."* The flag covers a **logged-out
    demo**; the `if(uid){…}` sign-in reset covers a **real account**. Two complementary mechanisms,
    and only one of them was checked.
  - **WHAT WOULD BE LIVE is a seeded `useState` that is ungated AND missing from the reset.** A
    real signed-in climber would keep seeing it beside their own rows — every hydration path here
    is **additive** (`concat`, `new Set([...seed, ...db])`), so no amount of real data displaces
    it. That is the **#735** shape — seed history attributed to a real account — arriving through a
    different door.
  - **Section 4 ships GREEN and its whole job is the NEXT one.** Measured: **22** ungated seeded
    declarations, **21** cleared by the sign-in reset, and **1** declared in `NOT_SEED_CONTENT`
    (`filters` — route-search defaults, a UI starting position rather than sample data, which must
    survive sign-in like any other preference). A stale entry there fails in both directions.
  - **ITS OWN SUMMARY LINE FIRST CREDITED THE REGISTRY AS COVERAGE, and that is the vacuous
    direction.** It printed *"22 cleared by the sign-in reset"* by computing `total - uncovered`,
    which counts an **excused** declaration as a **cleared** one — so a growing exemption list
    would have read as growing coverage. The two are counted separately now. *A count is only as
    good as the thing it is a count OF*, applied to a guard's own output.
  - The reset is located by **anchor**, fail-closed at three points (`setNotifs([])`, its `if(uid){`
    head, and the brace walk closing), plus floors of 10 setters and 10 seeded declarations — with
    a broken walk, every name reads as covered and the run prints a clean sweep.
  - Injection-tested **2/2** (`scripts/oneoff/inject-sample-content-reset-cases.mjs`), each case
    proving its edit landed **by checksum** and restoring `ClimbMatch.jsx` byte-identically: removing one setter from the reset fails naming the
    declaration, and renaming the anchor fails **ANCHOR LOST** rather than passing over a reset it
    could not read.
- **`check:seed-only-surfaces`** asserts that every component reachable **only** through the
  `!USE_DB` branch is declared as production-dead. The Climbs tab is
  `USE_DB ? <DbAreaBrowser/> : <AreaView/>` and `deploy.yml` sets `VITE_USE_DB: "true"`, so the
  whole seed half renders for **nobody** — while rendering perfectly in every local demo. Static
  (Babel over the app sources, ~1s), so it sits in `npm run build`.
  - **THE MEMORY NOTE IT REPLACES HAD ALREADY COST DAYS, THREE SEPARATE TIMES.** #714 shipped a
    fire map gated on the seed-only `selArea` and it reached nobody until #731 read
    `dbAreaCtx || selArea`. An offline-honesty item sat on a backlog for **19 days** as *"AreaView
    gates children/routes behind `!error`"* — true in the code and worthless to fix, because
    `AreaView` is one of these. And **four browser attempts** were spent trying to make a guard
    reach `AreaLatest`, on the assumption that the walk was broken; the walk was reporting reality.
    `QuickMatch` carries a hand-written comment saying it is unreachable — **a comment is not a
    guard**, and the nine components beside it carried no such note.
  - **The recorded count was THREE and the measured count is TEN.** `AreaBrowse`, `AreaCrags`,
    `OverviewMap`, `RouteFinder` and `SuggestedClimbs` were dead too and nothing said so. All five
    have live DB counterparts (`DbAreaTreeRoots`/`StatePicker`, `DbAreaTree`, `NearMePanel`,
    `RouteFinderPanel`, `DbSuggestedClimbs`), so they are superseded rather than lost — but *"it
    was replaced"* and *"we forgot to wire it"* are the two things a reader cannot tell apart
    without a reason written down, which is what `SEED_ONLY` is for.
  - **AND TEN WAS ITSELF SHORT, BECAUSE THE GUARD COULD SEE ONLY ONE SPELLING OF THE SEED BRANCH.
    It is FOURTEEN.** The pruning anchored on `!USE_DB && …`, and there is exactly **one** of those
    in `ClimbMatch.jsx` — against **22 `USE_DB ? live : SEED` ternaries and 6 `if`/`else` branches**
    across the three app files, measured by
    `scripts/oneoff/measure-usedb-branch-spellings.mjs`. A component rendered only in a
    ternary's **alternate** is exactly as dead as one inside the `&&` region, and four were counted
    **live**: `Guides`, `GuideDashboard`, `GuideApply`, and `AvailCal` transitively through
    `Guides`. Its own header described the Climbs tab as a ternary while its code matched the `&&`
    form — *the shape it was written to catch, one level up, in the guard itself.*
  - **THE HOLE COST SOMETHING WITHIN THE HOUR, WHICH IS WHY IT EARNS THE ENTRY.** The units work
    left *"the FILTER labels"* open and named the guide radius chips — `Within 50 / 100 / 250 mi` —
    among them. Those chips are inside `Guides`. **This guard's green output was the evidence they
    were reachable**, so converting them would have been a change no climber could ever see: the
    exact failure the guard exists to prevent, arrived at by trusting the guard. Check the branch
    before polishing a control, and check that the guard can SEE the branch.
    `scripts/oneoff/measure-imperial-control-labels.mjs` is what asked the question — it classifies
    every imperial unit written as a string LITERAL by the component that owns it, which is how the
    RouteFinder length buckets turned out to be dead and the live ones turned out to be elsewhere.
    Re-running it after the widening moves the guide radius chips from *reachable* to *dead*,
    101 → 98: the same instrument, a different answer, because the census under it got wider.
  - **AND IT HAD ALREADY HAPPENED, IN A PR MERGED THE SAME AFTERNOON.** #1670 opens *"the units
    question is what put me in the file"* — the identical open item — and fixes a real off-by-one in
    the length-bucket labels plus a genuine two-copy consolidation into `ROUTE_LENGTHS` /
    `routeLengthLabel()`. Every one of those sites is in **`RouteFinder`** and `passesFilters`, i.e.
    the seed path, and `lib/DbAreaBrowser.jsx` — which owns the **live** length filter — never
    imports either helper and still carries its own `LEN_BUCKETS` vocabulary. Correct work, on a
    surface no climber reaches, from an author the census told was reachable.
    **The live twin does NOT share the off-by-one, checked rather than assumed**: its bounds are
    half-open in METRES (`61/183/457`), so 600 ft = 182.88 m lands in `200–600 ft` exactly as that
    label claims.
    - **AND THE UNITS QUESTION THAT WAS LEFT OPEN THERE IS NOW CLOSED**, on the filter every
      DB-catalog climber actually uses. The bucket table carries **numbers** now — label bounds in
      feet, query bounds in the metres the column is stored in — and `lenLabel()` renders them
      through `uElevN`/`uElevUnit`, which arrive **as props** because this file must not import core
      (core lazy-imports it, and a static import would make that cycle static — the file's own
      recorded rule, the same reason `C` and `ActionIcon` are props).
    - **The imperial rendering is byte-for-byte what it was**, asserted rather than eyeballed: this
      is a units fix, not a copy change. Metric now reads `< 61 m / 61–183 m / 183–457 m / 457+ m`,
      which are **the filter's own half-open cut points** rather than a re-rounding of the feet.
    - **DELIBERATELY NOT consolidated onto `routeLengthLabel`**, and the measurement is why: that
      helper's bounds are **inclusive FEET** (201–599, 600–1499) while these are **half-open
      METRES**, so it would label a 600 ft route — which IS in this bucket — as `201–599 ft`.
      Sharing the vocabulary would trade a units defect for an off-by-one one. Reconciling the two
      bound sets is a separate change, and the seed twin is dead code either way.
    - **`check:units` had the same blind spot and now has section 5 of `filters`.** Sections 1-4 all
      assert `ROUTE_LENGTHS`/`routeLengthLabel`, whose every call site is in seed-only `RouteFinder`
      — so the guard could report the units class green while the only reachable length filter said
      `600–1500 ft` to a metric climber. The section lifts the table and the formatter from
      `lib/DbAreaBrowser.jsx` rather than bundling it (that file drags in supabase and the whole DB
      layer, and the question needs neither), and its load-bearing assertion is that **each metric
      label states the bucket's own metre bounds** — converting the unit word while leaving the
      numbers is the half a units fix most easily half-does.
      - **SECTION 6 IS THE PROP CHAIN, and it is not ceremony.** Executing the formatter proves it
        CONVERTS and says nothing about whether the helpers reach it — they are props, `lenLabel`
        calls `uElevUnit()`, and a merge dropping them from any of the four links leaves that call
        undefined and takes the whole panel down. **Neither direction of `check:dead-props` sees
        it**: the component references the prop, and the call site passes nothing unread — the exact
        hole this file records for the float plan.
      - **A JSX tag here cannot be sliced with `[^>]*`**, and that failed on a correct app before it
        was fixed: these props hold ARROW FUNCTIONS, so `=>` puts a `>` inside the tag and the match
        stops mid-way. It slices to the `/>` that closes the tag at brace depth 0 — never a fixed
        window, which this file records as encoding a guess about the size of the thing sought.
      - Injection-tested **8/8** (`scripts/oneoff/inject-live-length-filter-cases.mjs`), a sibling
        suite because the existing one's `FILE` is a single constant pointing at core. **Two must
        stay SILENT** — a comment quoting the forbidden literal, and a renamed local. The floor
        rises 28 → 38 with the section: a floor left at the old count cannot see the new half stop
        asking.
    - **`AddRoute`'s approach buckets were the one control group left, AND I RECORDED A FALSE
      REASON FOR LEAVING THEM.** This entry read *"they are display-only — the control stores the
      KEY (`u1`) beside a separately canonicalised numeric `dist` — so nothing is written wrong"*.
      **The second half is wrong, and the wrong reason is the dangerous half.** The key WAS written
      wrong: it went into the proposal as `approach`, and `approve_new_route` (`0135`) inserts
      `v->>'approach'` straight into `routes.approach`, **which is PROSE** — the walk-in narrative
      the Planner renders. So an approved contribution put `u1` where a paragraph belongs.
      - **I traced the submit payload and stopped there.** `approach: approach||null` really is
        unit-neutral at the call site, and that is exactly as far as I looked; what the RPC then
        does with it is where the defect lived. *Read the whole writer* — the rule this file already
        records for `descentText`, where three sessions in a row derived a rule from one line of
        `var M` without reading the fix-ups below it.
      - Another session **removed the chips** rather than relabelling them, which is the right fix:
        a units conversion would have left an opaque key going into a prose column. A defect can be
        hidden by a worse defect in the same control — the shape `check:a11y-badges` records for
        `AreaLatest`, where a glued name was masked by the row not being a control at all.
      - What survives of my reasoning is only the narrow part, and it is now moot: converting them
        would have needed a **two-decimal** distance helper, and `1.61–4.83 km` on a coarse bucket
        states a precision the bucket does not have.
      - `scripts/oneoff/measure-imperial-control-labels.mjs` is the census. **91 → 86 literals, and
        ZERO control groups remain** — every survivor is prose, an object key, or already
        unit-aware. Read its output before treating a count here as work.
  - **THE ANSWER WAS ALREADY WRITTEN DOWN IN A SIBLING GUARD, WHICH IS THE SHARPEST FORM OF THIS
    LESSON.** `check:crew-member-readers` carries an exemption reading, in as many words,
    *"GuideDashboard is the SEED dashboard; DbGuideDashboard is the DB-backed one"* — so one guard
    had the fact in its own declaration list while the guard whose entire subject is that fact
    reported the component live. Nothing reconciles two guards' vocabularies, and a census is only
    as good as the branches it can see.
  - **STRICTLY ADDITIVE, asserted rather than assumed.** Pruning more edges can only move a
    component from live to seed-only, because `seedOnly` filters on `!live.has(n)` — a component
    with any live path is untouched, including one rendered in **both** halves of a ternary.
    Measured before and after: all ten already-declared entries still report `ok` and the four new
    ones are the entire difference.
  - **THE FOUR ARE DECLARED, NOT REVIVED, and `AvailCal` is the one worth reading.** The other
    three are superseded (`DbGuides`, `DbGuideDashboard`, `DbGuideApply`, all in `lib/`). `AvailCal`
    has no counterpart and **could not have one**: the live inquiry flow in `lib/DbGuides.jsx`
    takes dates as a **free-text field** (`placeholder="Dates you're thinking of"`) rather than from
    a guide's published availability, and **no availability, calendar, slot or booking column exists
    anywhere in `scripts/schema-snapshot.json`** — so a revived calendar would have nothing to draw
    and would render empty for every guide. The `AreaLatest` shape exactly: feature work gated on
    data that does not exist, not a wiring fix. **Checked by reading the live form rather than by
    grepping for "calendar"** — a first pass concluded "no date picker" and nearly wrote a negative
    claim that was half wrong.
  - **REACHABILITY MUST BE TRANSITIVE, and a one-hop version is wrong in BOTH directions.**
    Measured while writing it: a direct *"is it rendered outside the region?"* test called
    `SearchSplit` and `ViewToggle` dead, and both are live — the
    [[a-dead-seed-component-is-not-a-dead-feature]] trap that already caused `DbAreaTree` to be
    rebuilt when it existed. The mirror is just as real: a component rendered only **inside** a
    seed-only host is itself seed-only, and a one-hop scan calls it live. The live closure is
    computed from `App` with the seed region's edges **pruned** — that pruning is the whole
    mechanism, since an edge from `App` into the seed branch is exactly the edge production does
    not have.
  - **Reviving one of the three with no counterpart was COSTED and is not viable — the blocker is
    DATA, and it is the same defect wearing the other hat.** `AreaLatest` needs a
    `climb_logs`-by-subtree query that does not exist, and `climb_logs` holds **1 row**
    catalog-wide (service key, 2026-08-27 — re-measure with
    `scripts/oneoff/probe-latent-claims-anon-vs-service.mjs`, which already owns that count; an
    **anon** read returns 0 for it whatever the table holds) — so the section would be empty for every area in the
    catalog. `ClassicClimbs` filters on `classic`, true on **56 of 205,543 routes (0.03%)**, and
    `routes_in_subtree` takes no such parameter, so it needs a migration to render 0.03% of a
    catalog. Both would recreate the very defect they were meant to fix, which is what
    `probe-top-rated-subtree.mjs` already stopped once for a *"Best rated here"* section.
    `GettingThere` needs no counterpart: its one unique capability — a directions link to the crag
    — is already ported into `DbAreaBrowser`, and the rest showed one arbitrary representative
    route's `access` as the **area's** fact.
  - Fails **closed** six ways, each of which prints identically to a clean app: a missing or
    duplicated `!USE_DB &&` branch (`ANCHOR LOST`), **no `USE_DB ? … : …` conditional found at
    all**, a file that does not parse, fewer than 100 components, fewer than 100 render sites, and
    a located-but-empty seed region. The ternary floor matters for the same reason the `&&` anchor
    does: with that recogniser broken, four dead components read as live and the run prints a clean
    sweep — which is exactly what it did for this guard's whole life before the widening.
  - Injection-tested **12/12** (`scripts/oneoff/inject-seed-only-cases.mjs`), each case proving its
    edit landed **by checksum** and restoring byte-identically. **Cases 6 and 9 must stay SILENT** —
    a component rendered on *both* paths, or in the LIVE half of a ternary, is correct work, and a
    guard flagging either would tell authors to un-wire live code. Case 5 pins the transitivity.
    Cases 7 and 8 are the two spellings the widening closed. **Cases 11 and 12 edit the GUARD
    rather than the app, because that is where the defect was**: 11 removes the ternary pruning and
    requires the four new declarations to go **stale**, which is the A/B proving the widening is
    load-bearing rather than decorative, and 12 breaks the recogniser and requires a **closed**
    failure. The first six were **re-run after the traversal change** before anything else was
    believed — this file's own rule for `check:dead-props`, applied here. Two harness bugs read as guard misses
    first: injected names beginning `_` are not matched by the `/^[A-Z]/` component test, and
    renaming a definition without renaming its entry in Core's export list makes the file
    unparseable — *an injection that produces a different failure is not a catch.*
- **MUTUAL FRIENDS WAS A STUB FOR THE LIFE OF THE APP, AND RLS IS WHY — IMPLEMENTED IN 0182, so
  read this as history.** `mutualIds()` took **no arguments** and returned a literal `[]`, so
  `mutualCount()` was 0 for every climber, always. Every consumer renders as
  `mutualCount(...) ? control : null`, so the *"N mutual friends ›"* row never appeared and the
  **Mutual friends** sheet had no reachable entry point in the app — only `?z=mutualModal`, the
  overlay guards' own opener, could mount it.
  - **NOT a regression, which is why `audit:silent-reverts` was right to say nothing:**
    `git log -S "function mutualIds"` returned only the original upload and the monolith split
    (#497). Never implemented, never reverted.
  - **The cost was a session polishing copy no user could read.** #1637 corrected the sheet's
    subtitle (*"You and Alex both know 0"*), a real string defect on a surface with no reachable
    entry point. The walk that found it opens overlays **by name**, which is exactly how an
    unreachable modal looks reachable. **Before fixing copy found by an overlay walk, check the
    surface has an entry point that can render.**
  - **IT COULD NEVER HAVE BEEN DONE FROM THE APP.** `0087` says it outright — *"Read: only the
    two people involved. A connection is not public."* — so the other climber's edges are
    unreadable from the client **by construction**, and no amount of app code computes the
    intersection. That is why the stub sat there: not an oversight, a wall. `0182` supplies a
    `SECURITY DEFINER` function, the same escape `0095` took. See `check:mutual-friends`.
  - **CLOSING IT BROKE THE GUARD THAT WATCHED FOR IT, correctly, and the repair generalises.**
    `check:crew-member-readers` anchored section 2's non-vacuity on a LIVE instance — the
    mutualIds stub was the only `.map(cById)` left — so removing it made that guard fail on a
    **clean** app. A floor whose only anchor is a live defect stops working the day the defect is
    fixed, which is the one day it must not. It exercises the pattern on **constructed samples**
    now, positive and negative, so *"the pattern broke"* and *"the class is empty"* stop being
    the same verdict. `probe-mutual-friends-is-a-stub.mjs` is deleted: it was built to fail the
    day this shipped, and it did.
- **WITH `DEMO_FILLERS` ON, A HANDFUL OF ABSENCE CLAIMS ARE STILL ON SCREEN, AND THEY ARE THE
  RIGHT ONES — RE-RUN THE PROBE RATHER THAN QUOTING A COUNT HERE.**
  `scripts/oneoff/probe-surfaces-with-no-example.mjs` walks the 7 tabs and all 57 overlays and
  reports which *"No X yet"* sentence actually renders — the question the sample-data request
  poses, and the one to re-run when the examples come **out** before launch.
  - **THIS HEADLINE USED TO CARRY "7 OF 60", AND THE NUMBER WENT STALE UNDER IT — which is the
    class this file names everywhere else, committed by this entry.** A count quoted in prose is a
    hand-copy of a measurement: the reading below was taken **2026-09-09** (64 screens walked, 0
    unmounted), and the app has since gained `0182`'s real mutual-friends implementation, `0184`'s
    visibility switch and #1780's privacy-flag correction — every one of which can move what an
    empty surface says. The enumeration is the durable part; the total is not, so it is gone rather
    than corrected to a second number that would go stale the same way.
  - **THE PROBE REFUSES ON A LOUD BOX, BY DESIGN, and that is why this is not simply re-measured
    here.** `quiet-box.mjs` declines above 6x oversubscribed because a browser result is evidence in
    neither direction there — a miss reads as a live defect and a pass can be vacuous because
    screens never settled. Forcing it with `--anyway` stamps the output NOT EVIDENCE, so it cannot
    settle this. **Re-run it on a quiet box before writing any number back into this entry.**
  Reading the items themselves:
  - **Three are the Crew tab, and they are CORRECT DATA.** *"No days proposed yet"*, *"No meeting
    spot or time set yet"*, *"No weekly slot works for the whole crew yet"* all come from
    `crew_seed_octo` — the **only** one of the five seed crews with no `dates` and no `meetPlace`,
    and the only one carrying an `openNote`. It is the still-recruiting crew, so a crew that has
    proposed nothing is the state being demonstrated. Four of five crews are fully planned; having
    both stages on screen is the better example, not a gap. **Do not "fix" this by seeding dates.**
  - **Two are a payload artifact, not a surface.** *"No events scheduled yet"* appears only under
    `postMenuFor`/`reactPickerFor`, whose payload injects a **synthetic** group into
    `createdGroups`; the seeded events belong to `group_wasatch_trad`, so the synthetic group
    correctly has none. No climber can reach that state.
  - **One is `"No topo yet"`** — topos are DB-backed (`topos`), not seed content, so `DEMO_FILLERS`
    cannot supply one.
  - **One is the mutual-friends sheet — AND ITS REASON IS NOW STALE, which is the clearest evidence
    the total above had to go.** It was listed as *"the stub above"*: `mutualIds()` returned a
    literal `[]`, so the sheet had no reachable entry point and only the overlay walk's own `?z=`
    opener could mount it. `0182` implements it behind a `SECURITY DEFINER` function, so it is a
    real surface now and its empty state is an ordinary empty state — a demo account simply has no
    mutual friends. **Whether the sentence still renders in the walk has NOT been re-measured**;
    what is certain is that the explanation attached to it here no longer holds.
  - A **static** version of this was written first and discarded: it tried to resolve each claim
    back to its state variable through 400kB of single-line JSX and reported *"0 of 61 seeded"*,
    which is plainly wrong. Whether a sentence is ON SCREEN needs no resolution at all — the
    [[a-partial-measurement-agrees-with-what-you-expect]] shape, caught because the verdict
    disagreed with a fact already known.
