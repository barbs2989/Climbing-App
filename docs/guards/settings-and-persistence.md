# Settings, forms and persistence

A control that claims to remember something must store it: float plans and planner forms, profile drafts, visibility and notification switches, counts against their lists, onboarding, photo removal.

Part of the guard notes — see [README.md](README.md) for the full index.

- **`check:float-plan-persistence`** asserts that a filed float plan survives leaving the tab.
  `FloatPlan` holds **eleven** fields and both its render sites are conditional branches —
  `{tab==="safety"?…:null}` on the route page and `{view==="float"?…}` on the crew safety screen —
  so React discarded the state on the way out and tapping **Plan** to check the descent wiped
  route, partner, party size, vehicle, parking, depart, turnaround, hard return, comms, emergency
  contact and notes. The copy invites exactly that workflow: *"File a float plan below before you
  lose cell service."* Static (esbuild + SSR + a source read, **0.9s** against
  `check:policy-claims`' 1.6s beside it), so it sits in `npm run build`.
  - **IT IS A GATE BECAUSE THE FIX'S OWN DESIGN MAKES THE REGRESSION SILENT.** `plan`/`onPlan` are
    **optional**, with the component's internal state kept as the fallback so an un-migrated call
    site still renders. Drop `plan={…}` from a tag and FloatPlan quietly reverts to that fallback:
    the screen looks identical, **every render assertion still passes**, and the form starts being
    lost again. *A prop that is optional by design cannot be caught by its absence.*
  - **Three sibling guards are each blind to it, for three different reasons.**
    `check:dead-props` asks whether a component reads a prop it declares and whether a call site
    passes one nothing reads — both directions are satisfied here, because the prop **is** read and
    when it stops being passed there is no call site left to complain about.
    `audit:silent-reverts` tracks named **definitions**, and removing `plan={floatPlan}` from a JSX
    tag removes no name, so it reports **0** — the gap its own closing caveat states. And no
    browser guard reaches either surface: the route one needs a route opened *and* a sub-tab
    clicked, the crew one a crew with the Float Plan view selected.
  - **IT HAS ALREADY BEEN INCOMPLETE ONCE, WHICH IS THE ARGUMENT RATHER THAN A HYPOTHETICAL.**
    #1577 lifted the route tab; the crew `SafetyTab` call site *"never opted in"* and kept losing
    the form until #1581 — two PRs, the same day, the second titled *"still lost eleven fields"*.
    A fix whose second half was missed on the first attempt, on a **safety** record, verified only
    by a `scripts/oneoff/` probe that nothing runs. The promotion is the
    *a verification nobody runs is not a verification* rule this file records for `check:overflow`,
    `check:pitch-discount` and `check:policy-claims`.
  - **THE TAG MATCH WAS ASYMMETRIC AND AN INJECTION CASE CAUGHT IT.** Section 8 stripped comments
    before matching the crew tag — core carries **three** comments quoting `<FloatPlan/>` to
    explain the defect — while section 6 read **raw** `RouteDetail` source. So a comment mentioning
    the tag above the real call site would make the guard match the **explanation** and report a
    correctly wired app as broken: a guard failing on its own documentation, the trap
    `check:ci-cancel` records from the other side. RouteDetail carries no such comment *today*,
    which is exactly why nothing else would have found it. Both sides strip now.
  - Fails **closed** five ways, each printing identically to a clean tree: a thin controlled render
    (every *must contain* assertion passes against markup that rendered nothing), a missing
    `<FloatPlan>` at either call site, a crew declaration that cannot be read back, and **fewer
    than 16 assertions RUN** — a guard that quietly stops asking half its questions still exits 0.
    Raise that floor when you add an assertion; never lower it to make a run pass.
  - Injection-tested **6/6** (`scripts/oneoff/inject-float-plan-cases.mjs`), each case proving its
    edit landed **by checksum** and restoring the file byte-identically. Cases 1 and 2 are the real
    shape once per call site, case 2 being the historical miss. **Two must stay SILENT** — a
    comment naming the gate, and an extra unrelated prop on the tag, which is ordinary work a
    wiring assertion must not forbid.
  - **Three harness bugs read as guard misses first, and all three are the same lesson:** the edit
    must land on the thing the guard *reads*. Targeting the first `<FloatPlan` hit a **comment** in
    core and moved no byte the guard looks at; the crew seed is a **lazy** initialiser
    (`useState(()=>floatPlanState())`) so a regex expecting the eager form matched nothing; and the
    ordering case inserted the declaration before the **first** `tab==="safety"`, which is inside
    the fix's own explanatory comment, leaving it correctly above the real gate once comments were
    stripped. *Checksum movement proves an edit happened, not that it was the right one.*
  - **The A/B that makes the cases mean something was CONFOUNDED on the first attempt.** Sections 6
    and 7 share one stripped `rd`, so disabling the stripping broke both and **two** cases flipped.
    Isolating section 6 flips **exactly one** — `comment-naming-the-gate` — with the other five
    unmoved. *When an A/B moves more than the thing under test, it is measuring the harness.*  - **THE SAME DEFECT ONE SUB-TAB OVER, and the guard's name is now narrower than its contents.**
    `<Calculator/>` — the planner's fitness, pack weight, party size and departure — renders ~17k
    characters inside the `tab==='planner'` branch, so tapping **Safety** to check the hazards
    unmounted it and reverted all four to `pack 10kg, party 2, depart 06:00`. The climber came back
    to a **different estimated summit time** than the one they had just read, with nothing on screen
    saying it had changed — and a lighter pack reads **faster**, the optimistic direction #641
    records for the return tile. The rename is deliberately not done in the same change, the
    precedent `check:topo-outage-copy` records.
    - **ONE OF THE FOUR WAS ALREADY LIFTABLE AND NOBODY HAD WIRED IT.** `fit`/`setFit` props existed
      on `Calculator` and the single call site passed **neither**, so `fitProp` was undefined and
      fitness fell back to local state like the rest. **A lift nothing hands state to is not a
      lift** — and its presence made the component *look* migrated, which is why the other three
      were never questioned.
    - The fix is this entry's own shape: `calc`/`onCalc`, optional, with the local state as the
      fallback, and the state owned by `RouteDetail` beside `floatPlan` — outside the branch a
      sub-tab switch unmounts, keyed per route by its own `key={selRoute.id}`.
    - **Section 9 is SOURCE-ONLY, and deliberately so.** The props are optional *by design*, so
      dropping them at the call site reverts Calculator to local state **silently**: it still
      renders and every render assertion still passes. That is this file's own header reasoning,
      applied to the second member of the class — and the reason a render probe would not have
      caught it.
    - Three cases added (10/10), one of which must stay **SILENT**: adding an unrelated prop to the
      tag is ordinary work, and a wiring assertion that fired on any edit would tell authors to
      stop touching it.
  - **THIRD MEMBER, AND THE FIRST WHERE THE WORK IS LOST TO A DISMISSAL RATHER THAN AN UNMOUNT:
    `<SuggestFix/>`'s BACKDROP.** The contribute form holds up to **35 inputs** and its backdrop
    closed unconditionally — `createPortal(<div onClick={onClose} role="dialog" …>` — so **one tap
    beside the panel discarded everything a climber had written**, with no warning and no undo. On
    an app whose whole value is contributed beta.
    - The inner panel already calls `stopPropagation`, so only a **genuine outside tap** reaches it.
    - Gated on the form's OWN emptiness signal, `canSubmit` (`totalUpdates > 0`), which the submit
      button already computes — **not a second notion of "dirty" that could drift from it**. An
      untouched form still dismisses on a backdrop tap, which is what keeps an accidental open cheap
      to leave; once there is work to lose, leaving is a deliberate act via the ✕ or Cancel.
    - **`check:dialog-dismiss` is satisfied either way** (63 dialogs, every one still leavable),
      which is what makes gating the backdrop safe rather than a way of trapping somebody. Checked,
      not assumed.
    - Section 10 is source-only for section 9's reason: removing the condition restores a working,
      *rendering* dialog that simply throws work away, so no render assertion can see it.
  - **AND SURVIVING A SUB-TAB SWITCH IS NOT SURVIVING A RELOAD — the form reached NO STORAGE AT
    ALL, which nothing had ever asked.** #1577 and #1581 lifted the state out of a conditional
    branch so leaving the sub-tab stopped discarding it. Both call sites still held it in a plain
    `useState`, so eleven fields of a safety document — vehicle, parking, depart, TURNAROUND, HARD
    RETURN, comms, emergency contact — were gone on the next load. This guard's own name is about
    persistence and its 21 assertions are all about the unmount; the second question was never put.
    - **TWO DIFFERENT OBJECTS ARE CALLED "THE FLOAT PLAN", and only the small one was stored.**
      `floatPlanState()` declares the **eleven**; `crews.float_plan` holds a **three**-field
      `{filedAt, contact, returnBy}` written by a different control through `updateCrew`. The only
      float-plan write in `lib/` was **`createCrew`'s parameter** — crew CREATION — with no update
      path for the form, no localStorage and nothing in the offline store. Reading one object's
      persistence as the other's is how this stayed invisible.
    - **Device-local and KEYED BY ACCOUNT** (`savedFloatPlan`/`saveFloatPlan` in `lib/offline.js`),
      following `savedAreaIds` exactly, and keyed by **scope** as well — `route:<id>` or
      `crew:<id>` — because a float plan belongs to one trip. Account keying matters more here
      than for bookmarks: this form holds somebody's **emergency contact**, so signing out must
      not hand it to the next person on the same phone. Not a `profiles` column — that is a schema
      change and a sync story, and the plan is for the phone you are carrying.
    - **`checkedIn` IS DELIBERATELY NOT STORED, and the asymmetry is the reason.** It is a claim
      about one trip's OUTCOME, so reviving it for a later trip on the same route would render
      **"✓ Checked In Safe"** for a trip that has not happened. Losing it across a reload
      under-claims and costs a tap. Those two are not equally bad, so the safe branch is not the
      one that preserves more.
    - **`scope` IS OPTIONAL AND ABSENT MEANS EXACTLY TODAY'S BEHAVIOUR**, so a call site that has
      not opted in cannot be broken by this — the same additive shape `plan`/`onPlan` already use.
    - Two ordering rules, both from traps this file already records: the hydrate latch is set
      **AFTER** the read resolves (`check:profile-edit-gate`, where latching first made one
      transient failure permanent for the session), and a stored plan **must not clobber what is
      already typed** while the read is in flight.
    - **THE ROUND TRIP PROVES THE STORE AND NOT THE WIRING**, so
      `scripts/oneoff/probe-float-plan-survives-a-reload.mjs` asserts both — 25 assertions, no
      browser and no database, running the REAL exports over `scripts/lib/idb-shim.mjs` rather
      than a retyped copy. Dropping a prop at a call site changes **no identifier**, which
      `audit:silent-reverts` says in its own closing caveat it cannot see, and every round-trip
      assertion would stay green while the form went back to losing eleven fields.
    - **ITS FIRST BROKEN-STORE CASE TOOK THE REST OF THE PROBE DOWN, and the cause is in
      `lib/offline.js`'s own comment.** A stub throwing **synchronously** out of `open()` is
      unfaithful — IndexedDB fails asynchronously via `req.onerror`, which is the only path that
      resets the memoised `_dbPromise`. A synchronous throw leaves every later caller awaiting the
      same dead promise. The stub fails async now, so it exercises the real error path AND leaves
      the store usable for the sections below it.
    - **It also leaked a bundle directory into `git status`** on the run that crashed mid-probe,
      because the cleanup sat only on the happy path and the bundle-failure path — the trap
      recorded for a sibling probe that leaked nine. Cleanup is on `process.on("exit")` now.
  - **The guard's SUBJECT is now "a form must not lose your work", across three mechanisms** — a
    sub-tab unmount (FloatPlan), a sibling sub-tab unmount (Calculator) and an accidental dismissal
    (SuggestFix). The name still says float plan; the rename stays deliberately out of these
    changes, the precedent `check:topo-outage-copy` records.
- **`check:profile-draft-persists`** asserts that **a profile field the editor collects, and the
  database can hold, is actually SENT**. Static (two source reads plus the committed schema
  snapshot — no browser, no database), so it sits in `npm run build`.
  - **THE DEFECT: THE EDITOR COLLECTED CERTIFICATIONS AND SKILLS AND NOTHING STORED THEM.** Both
    have been offered since the profile screen existed — *"No certifications added yet"*, *"No
    skills added yet"* — `openEdit` seeds the draft from live state, the Profile renders them under
    **CERTIFICATIONS & SKILLS**, and `trustFactors` pays **3 points per certification up to 10**.
    Everything except storage: `saveEdit` set them on local state and its DB payload carried
    neither, because `profiles` had **no column for either under any spelling** — confirmed three
    ways (the snapshot, every migration, and `lib/db.js`, whose only `certification` hits are
    GUIDE comments for a different feature).
  - **SILENT, AND REACHABLE.** The save itself succeeds, since every other field in the payload is
    real, so there is no error and no false success toast — the two fields simply vanish on the
    next load. And the sign-in reset clears both to `[]`, so a real account cannot inherit the seed
    values: it starts empty, fills them in, and reloads to empty again. `0181` added
    `certifications text[]` and `skills text[]` and wired both ends.
  - **NULLABLE WITH NO DEFAULT, deliberately.** A default of `'{}'` would rewrite every existing
    row to assert *"this climber has no certifications"*; NULL says nobody has been asked. The app
    already reads both through `|| []`, so an absent value renders as empty either way — checked
    rather than assumed, and pinned by the round-trip probe.
  - **THE RULE IS GENERAL RATHER THAN A PAIR OF NAMES, which is what makes it worth a gate:** every
    key in `openEdit`'s draft that has a matching `profiles` column must appear in `saveEdit`'s
    payload. It would have caught this the day the field was added, and it covers the **12**
    storable fields today. A draft key with **no** column says nothing, so the rule cannot nag
    about a field the schema cannot hold.
  - **`NOT_A_COLUMN` records the two that genuinely have none** — `availWeek` (there is no
    availability column for anyone, which is *also* why `compatUnknown` caps the browse row at 3
    unknowns) and `level` (`check:real-profile-rows` exists because rendering one invents a value a
    real account does not have). **A stale entry fails in BOTH directions**: a key the editor stops
    collecting, and — the useful one — a key that GAINS a column, where the guard flips from silent
    to demanding it be wired.
  - **`ALIAS` is declared, never derived.** `showRealName` stores as `show_name`, and
    `check:visibility-switches` records getting exactly this wrong: it derived `show_real_name`,
    found no column, and reported a healthy control as broken.
  - **THE PAYLOAD IS THE LITERAL *PLUS* THE CONDITIONAL ADDS.** `name` and `username` are appended
    as `f.name=…` only when non-blank, so a literal-only scan calls two live fields unsent — the
    guard would have manufactured two findings on correct code.
  - **SECTION 6 ASKS THE READ-BACK, because a write with no reader round-trips to nothing.** The
    sign-in hydration is an **allow-list**, so a column it does not name never reaches state however
    faithfully it was stored — the write and the read are two separate ways for this to be broken.
  - **A GATE rather than a probe**, for the reason `check:policy-claims` and `check:profile-claims`
    were promoted: the fix is a **key in an object literal**, so dropping it changes **no
    identifier** and `audit:silent-reverts` is blind to it by its own closing caveat.
  - **THE FIVE UNWIRED-WRITE CENSUSES ARE BLIND TO THIS BY CONSTRUCTION**, which is why it survived
    them. Census 4 looks for a handler that claims with **no write anywhere in it**, and `saveEdit`
    contains a real `saveProfile` call. **A PARTIAL write — a payload missing two of the fields its
    own form collects — is a sixth shape none of the five asks about.**
  - **Proven end to end against the live database, under RLS, with a real account's own JWT**
    (`scripts/oneoff/probe-certifications-round-trip.mjs`, 7 assertions). The service key bypasses
    RLS entirely, so a service-key probe reports success either way — `0095`'s own header records
    that trap. It creates a throwaway account, signs in **as them with the anon key**, writes what
    `saveEdit` now sends, reads it back the way `getProfile` does, and tears the account down (QA
    accounts verified at **0** afterwards). It also pins the two directions a naive fix gets wrong:
    **clearing your last certification must stick** (which is why the payload sends `|| []` rather
    than omitting the key — an omitted key leaves the stored value standing, so the deletion would
    be silently ignored), and **a brand-new account must read NULL on both**.
  - Fails **closed** six ways, each of which otherwise prints identically to a clean run: a moved
    `openEdit` or `saveEdit`, a draft literal that does not close, fewer than 8 draft keys or 5
    payload keys parsed (with none, every comparison passes **vacuously**), a `profiles` that
    parsed short, fewer than 6 storable fields actually compared, and a missing hydration.
  - **Its own first run parsed ZERO draft keys**, because the slice began at `setEditDraft(` — the
    call's own paren opens a level, so the keys sat at depth 2 and a depth-1 scan found none. The
    fail-closed floor caught it rather than the guard printing a clean sweep over nothing.
  - Injection-tested **8/8** (`scripts/oneoff/inject-profile-draft-cases.mjs`), each case proving
    its edit landed **by checksum** and restoring `ClimbMatch.jsx` byte-identically. Case 1 is the
    real defect; case 2 drops **only** `skills`, so one field of a pair cannot hide behind the
    other; case 3 keeps the write and drops the READ BACK. **Two must stay SILENT** — a comment
    naming the forbidden shape, and a no-op that leaves `level`/`availWeek` undeclared, which is
    the load-bearing one: a rule that fired on a draft key with no column would demand a migration
    for every field the editor collects.
  - It supersedes `probe-certifications-are-never-persisted.mjs`, which is deleted rather than left
    green — *a verification nobody runs is not a verification*, and a probe whose NAME describes a
    fixed defect is stale bookkeeping.
- **`check:visibility-switches`** asserts that **a visibility switch the app RENDERS reaches the
  database**, and that a column governing what OTHERS see rides every climber-object select.
  Static (no browser, no DB), so it sits in `npm run build`.
  - **THE PROMISE IS ABOUT SOMEBODY ELSE, WHICH IS WHY A COLUMN IS WHAT MAKES IT TRUE.** *"Off keeps
    you out of every ranking."* *"When public, other climbers can open your résumé from your
    profile."* With the state in `useState`, the setting resets on the next load **and no other
    climber's app can ever read it** — so the control is a promise to nobody.
  - **TWO SWITCHES WERE INERT AND VISIBLE, AND 0177 MADE BOTH REAL.** `showOnRanks` and
    `resumePublic` had **no column, no write, and defaulted to `true`** — so a climber who turned
    either OFF got it back ON at the next load, silently. Measured against the live schema:
    `profiles` had `discoverable`, `photos_public` and `show_name`, and nothing for these two under
    any name.
  - **THE RÉSUMÉ ONE FAILED IN THE DANGEROUS DIRECTION, and that is rule 2's whole reason.**
    `FullProfile` renders its button on `climber.resumePublic !== false`, so an **absent** field
    reads as **PUBLIC**. A DB-derived climber carried no such field, so the button rendered for
    every real climber whatever they had set — and the same shape returns the moment a new
    `profiles` select forgets the column. Hence `PARTNER_COLS` and the connections select both
    carry it, and hydration uses `!!p.resume_public` rather than `!== false`: an omitted column
    then **hides a button** instead of exposing a résumé. The two mistakes do not cost the same,
    so the default is not symmetric.
  - **THAT PREDICTION CAME TRUE AND NAMED THE WRONG MECHANISM — IT WAS THE MAPPING, NOT THE
    SELECT, AND IT HAD TWO INSTANCES.** *"The same shape returns the moment a new `profiles` select
    forgets the column"* is what the bullet above says to watch for; both selects still carry it and
    the leak was live anyway, because a row has to be *mapped* onto a climber before anything reads
    it and **two mappings dropped the field the select had gone to the trouble of fetching**.
    - **`RealClimberRow`** — the row in partner BROWSE *and* in a name SEARCH, so every signed-in
      climber. Its `_cand` carried no `resumePublic`, so `undefined !== false` offered the résumé of
      a climber who had made it private. It also printed a **bare `{p.name}`**, showing the real
      name of a climber who had turned *"Show my real name publicly"* off — with their handle
      rendered underneath it — and dropped `username`, so opening that profile put it through
      `pubName`, which then derives a handle **from the real name** (`"Robin Belay"` →
      `@robinbelay`, which need not be theirs). #1619's second defect, one surface over.
    - **`FullProfile`'s own real-profile memo**, which is the general case. It re-hydrates `name`,
      `username`, `bio`, `location`, grades and disciplines from an authoritative `select("*")` and
      re-hydrated **neither privacy field** — so `climber.resumePublic` was whatever the CALL SITE
      happened to carry, and the component's own comment says call sites arrive with *"only a few
      fields (id/name/avatar from a member chip or search row)"*. Reading both there closes it for
      every caller at once rather than one chip at a time.
    - **The fallback is asymmetric on purpose**, and it is the half a reviewer should check:
      `p.resume_public != null ? !!p.resume_public : !!climber.resumePublic`. While the row is
      loading `p` is `{}`, so an unknown column degrades to **hide**. Being briefly wrong about a
      button costs a reload; being wrong the other way publishes a résumé somebody made private.
      Reachable rather than permanent — `profiles public read` is `using (true)` (`0009`, refined
      by `0095`), so the loaded branch really does arrive.
    - **TWO FIXES THAT MASK EACH OTHER READ AS TWO UNNECESSARY FIXES.** Reverting `_cand` alone
      leaves the screen correct (the memo catches it) and reverting the memo alone leaves it
      correct (`_cand` catches it), so a suite testing them one at a time reports **both** as
      redundant. Defence in depth is invisible to a one-at-a-time suite **by construction** — that
      is what depth means. Two things fix it: the historical case reverts **every** half at once,
      and there is a fixture only ONE guard can protect — a bare member chip carrying
      `{id,name,avatar}`, where `_cand` is out of the picture and the memo is all that is left.
      Without that fixture the memo half is untestable and reads as dead code.
    - Proven by `scripts/oneoff/probe-partner-browse-row-honours-privacy.mjs`, which asserts the
      mapping as SOURCE and then **renders** `FullProfile` to prove the consequence — the source
      half alone rests on a reading of a gate rather than on its behaviour. It executes the row's
      own `_cand` literal with `new Function` rather than re-typing it, because a hand-typed copy
      would agree with itself whatever `RealClimberRow` does, which is the entire question.
      Injection-tested **9/9**, each edit proven **by checksum** and the file restored
      byte-identically; **two cases must stay SILENT** (a reordered field list and the fallback
      written longhand are both correct work).
    - **Three SSR traps, all recorded elsewhere in this file and all met again here.** `react` and
      `@tanstack/react-query` must be **external** or esbuild inlines a second copy and every hook
      throws *"Invalid hook call"*; the bundle must be written **inside the project**, because with
      react external node resolves it from the nearest `node_modules` and a temp dir has none; and
      `FullProfile` ends in `createPortal(…, document.body)`, which SSR cannot do — the portal is
      flattened and `document` stubbed, since portals are PLACEMENT (`check:overlays`' subject) and
      this probe asks about CONTENT. **The 400-char floor is what exposed the first of those**: it
      reported a 68-char render *while the next assertion printed a vacuous `ok`*.
    - **Scope the assertion to the BUTTON's own label, not the word.** A profile says *"résumé"* in
      several places, so a whole-markup match reported a correct render as broken.
  - **THE OWNER'S OWN READ-BACK USES `!== false`, DELIBERATELY THE OTHER WAY.** Until 0177 is
    applied the column is simply absent, and reading that as *private* would silently withdraw a
    résumé the account has always shown. **An absent column must not look like a choice.**
  - **THE CLASS RECURRED, WHICH IS WHY IT IS A GUARD.** #1535 hid five controls that could not work
    behind `PRIVACY_CONTROLS_LIVE`; #1540 made `show_name` real (0175) and gated
    `visibleWhileBrowsing` — whose every reference was **believed** to be its own knob, and is not:
    `useRoutePresence` is handed it as `visible`, and it decides whether your name and photo ride
    your presence entry. That switch is inert **because the flag hides it**, not because nothing
    consumes it, and the claim stood here and in a comment beside the control at once. These two
    were left outside the
    gate while being just as inert — the *an instance fixed by hand is not a class closed* shape.
  - **`visibleWhileBrowsing` HAS SINCE SHIPPED, AND IT IS THE ONLY ONE OF THE FIVE THAT COULD.**
    Reading the paragraph above as a worklist rather than a caveat settled it by MEASURING each
    gated control's consumers: **only this one is read outside its own switch.** `locPrecise`,
    `profileVis`, `showOnline` and `crewInviteFrom` are each read by nothing but their own
    `aria-checked`, background and thumb offset — so shipping one of those would durably keep a
    promise the app cannot keep, which is what the flag is for. **The count in this file was
    wrong the whole time**: the flag gated **five**, while CLAUDE.md, the audits and a comment in
    `ClimbMatchCore.jsx` all said four. Shipping the one that works made the stale number true by
    accident, which is the worst way for a hand-copied count to end up correct — the one in Core
    was removed rather than left to rot again.
    - **ITS ENFORCEMENT IS STRONGER THAN A COLUMN, which is why it needed no migration.**
      `useRoutePresence` calls `channel.track(visible ? {id,name,avatar,visible:true} :
      {id,visible:false})`, so with it off a climber's name and avatar are **never transmitted** —
      omission at source, with no row anywhere for a policy to protect. Its column-backed siblings
      are weaker: the value sits in a publicly-readable `profiles` row and the switch governs only
      whether a reader's app surfaces it.
    - **DEVICE-SCOPED (`lib/browse-visibility-pref.js`), and the asymmetry is deliberate.**
      Presence is already per-device — you are "viewing now" from the browser you are browsing in —
      and the cost of not travelling falls in the SAFE direction: the default is "no", so a second
      device starts invisible and the climber opts in again there. A column that travelled would
      carry an opt-in onto a device they had not thought about, which is the direction
      `resume_public` guards against with `!!p.resume_public`.
    - **A NEW `how` KIND, `device`, WITH FOUR CLAUSES THAT STOP IT BECOMING AN ESCAPE HATCH.** It is
      the first kind here that rests on no column, so it is the first that could bless a switch
      nobody notices: the value must go through `definePref` (validated on READ, and safe when
      localStorage throws or is absent under SSR), come BACK on reload, be SAVED on toggle, and
      **reach a consumer that is not the switch's own rendering** — plus that consumer must really
      act on it. **Clause 4 is load-bearing**: every control still behind the flag fails it.
    - **A COMMENT COULD SATISFY THAT CLAUSE, MEASURED RATHER THAN FEARED.** The first version
      matched `visible:<flag>` file-wide, and the injection case that writes exactly that into a
      COMMENT while deleting the real wiring **passed** — the *presence is not use* false pass. The
      test is scoped to the consumer call's own argument list now, walked with a state machine that
      tracks strings and comments. That is safe HERE and not over a whole file for a stated reason:
      a call's arguments are a pure JS expression, so every quote really is a delimiter, where the
      offsets-preserving blanker desynchronises on JSX **body text** apostrophes.
    - **UN-GATING CHANGES THE DOCUMENTS TOO**, and this file's own rule is what caught it: **no
      legal surface described route presence at all**, before or after. Privacy §3 is written
      ENUMERATIVELY (*"Connecting is also visible in one more way"*), so silence about a new way a
      climber's name reaches others reads as a complete list that is not. One clause was added to
      §3 and to the in-app sheet. It says **"without your name or photo"** rather than
      *"anonymously"* — the presence entry still carries a user id, so an anonymity claim would
      over-state it, and that is the wording the control's own sub-copy already uses. **A same-day
      amendment cannot move a DATE version**: `POLICY_VERSION` was bumped to `2026-09-23` hours
      earlier by #1767, so an account that accepted this morning has a record pointing at slightly
      different words — the limitation this file already records, not a new one.
    - Injection-tested **9/9** (`scripts/oneoff/inject-device-switch-cases.mjs`), each case proving
      its edit landed **by checksum**, restoring every touched file byte-identically, and judged on
      the guard's **own FAIL lines**; the harness refuses any expectation already present in the
      clean run. `consumer-gone` is the load-bearing one — it persists perfectly and governs
      nothing. `enforcement-broken` is the one no wiring test can see: the consumer receives the
      flag and broadcasts the name anyway. **One must stay SILENT** — a comment quoting the shape
      BESIDE live wiring is documentation, and a guard firing there would forbid explaining itself.
    - The feature itself is proven by `scripts/oneoff/probe-browse-visibility-round-trip.mjs` (13
      assertions, no browser and no database), which lifts the broadcast expression from
      `lib/presence.js` with `ANCHOR LOST` rather than retyping it and asserts the ON case carries
      the name **first** — *"the name is absent"* is equally true of an expression that sends
      nothing at all.
  - **DECLARED, NOT DERIVED, and that is a correction to this guard's own first draft.** It mapped
    a flag to a column by camelCase→snake_case and demanded ONE persistence shape, then reported
    **four healthy controls**: `showRealName` is `show_name`, not `show_real_name`; and
    `discoverable`/`photosPublic` use a **better** pattern than the one it required — derived
    straight off `myProfileRowQ.data` every render rather than hydrated into state, so they need no
    read-back at all. *A guard that flags correct work teaches people to ignore it.* `SWITCHES`
    fails **stale in both directions**, so the declaration cannot rot.
  - **`NOT_VISIBILITY` holds one entry with a reason**: the notification-preference toggles, which
    render from a `.map` over `notifPrefs` and are a claim about what THIS phone shows its owner,
    not about what others see. **That exemption is still right and the SENTENCE THAT FOLLOWED IT
    WAS READ AS A WORKLIST, which is what it should be.** It used to close *"they do not persist
    either — a separate, lesser defect, because it costs a re-toggle rather than an exposure"*.
    They persist now (`lib/notif-pref.js`), and the lesser defect turned out not to be the
    interesting one: **one of the four switches suppressed nothing at all**, which no persistence
    question could have found. See `check:notification-switches`, and note that an exemption
    recording a KNOWN defect beside its reason is how the next reader finds it.
  - **A WRITE NAMES THE COLUMN AS A KEY; A SELECT NAMES IT INSIDE A STRING.** That distinction is
    the persistence test, and **only the injection found it**: the first version accepted the
    column merely *appearing* in `lib/db.js`, where it appears in a **select** — so deleting the
    write left the guard satisfied by a read, and the `resume-write` case reported the real
    pre-0177 defect as a pass.
  - **RULE 3 — A SWITCH THAT PERSISTS IS STILL A FALSE PROMISE IF A SECOND ENTRY POINT IGNORES IT,
    and that was live in this very change.** There are TWO ways into another climber's résumé and
    only one was gated: the profile's *"open résumé"* button, and a **STAT TILE** — the *climbs*
    chip on a partner card — which called `onResume()` unconditionally. Gating the button alone
    would have left a private résumé reachable **by tapping a number**. Found by asking what else
    calls `onResume`, not by reading the fix.
    - A **COUNT**, never a proximity window: this file packs a whole component onto one physical
      line, so *"near the call"* is not a scope — the trap recorded for the camping panel, the
      Logbook badge and the seed-route discipline read. A third entry point makes the count
      disagree and must be declared, which is the loud outcome.
    - Your OWN résumé is out of scope (`setResumeFor(meLive)`): you may always read your own.
  - Fails **closed**: a missing `PRIVACY_CONTROLS_LIVE`, no gated block found (every switch would
    read as ungated), fewer than 7 switches parsed, fewer than 3 ungated, or either climber-select
    anchor going missing.
  - **IT READ ONE FILE AND THE PREFERENCE HAS A CONTROL IN TWO, which is a reach limitation found
    by measuring rather than by reading.** `show_name` also has a switch in the profile EDITOR, in
    `ClimbMatchCore.jsx` — a file the first version did not open. **Not a defect**: `openEdit` seeds
    `showRealName: showRealName` from live state and `saveEdit` writes the column *and* calls
    `setShowRealName`, so the pair round-trips. Verified rather than assumed. But a guard that
    cannot SEE it would not notice a future editor switch doing none of that.
    - A third persistence kind, `draft`, with its own rule: the draft must be **seeded from the live
      value on open** (or opening the editor and saving silently resets the preference — the shape
      #1581 records for the float plan losing eleven fields) and **pushed back on save** (or Settings
      and the editor disagree until reload).
    - Core carries no `PRIVACY_CONTROLS_LIVE` ternary — that is an App construct — so a Core switch
      is always rendered and always has to be declared. A `role="checkbox"` is deliberately not
      collected: an attestation or an also-block tickbox is a form input, not a claim about what
      others can see.
  - Injection-tested **14/14** (`scripts/oneoff/inject-visibility-switch-cases.mjs`), each case
    proving its edit landed **by checksum** and restoring the file byte-identically. Five are the
    real pre-0177 defects, two pin rule 2, two pin rule 3 — including the stat tile exactly as it
    shipped — and three pin the `draft` kind and the Core scope. **Two must stay SILENT** — a
    `derived` switch that is genuinely derived, and an undeclared flag inside a gated block, which
    promises nothing.
- **`check:notification-switches`** asserts that a switch under **Settings > Notifications**
  **governs something it names**, and **remembers what it was told**. Static (two source reads, no
  Babel, no browser, no DB), so it sits in `npm run build`.
  - **THE WHOLE EFFECT OF THAT CONTROL GROUP IS ONE LINE**, and reading it is what makes the defect
    obvious: `const notifAllowed = n => !n.cat || notifPrefs[n.cat] !== false`. A switch therefore
    reaches exactly those notifications tagged with **its own key**, an untagged notification is
    shown whatever the switches say, and **a switch whose key no notification carries suppresses
    nothing at all**.
  - **ONE OF THE FOUR WAS INERT AND HAD ALWAYS BEEN.** `cat:"messages"` appears on **no notification
    anywhere in the app**, signed in or signed out — unread direct and crew messages surface as
    **badges** on the Crew tab, never as entries in this list — so *"Messages / New direct & crew
    messages"* was a switch that animated, announced its state through `aria-checked`, and did
    nothing. It is gone: a control offered for a delivery the app does not have is the
    *appears to work and silently does not* shape `lib/units-pref.js` was written to remove,
    wearing a settings label.
  - **AND THE OTHER THREE REACHED ONLY YOUR OWN RECEIPTS.** Measured with
    `scripts/oneoff/measure-notification-switch-reach.mjs` (no DB, no browser — every notification
    in the merged list is an object literal): *"Requests & vouches — Friend / crew requests and
    vouches"* reached **1** notification, *"You vouched for X"*, i.e. the receipt for something you
    had just done — while the actual **friend request**, **crew invite** and **received vouch**
    carried no `cat` and showed with the switch off. Those three are tagged now (1 → 4, three of
    them incoming), and *"Condition reports"* — which reaches only your own report and log receipts
    and has no incoming trip-report notification to reach — now **says so** rather than promising
    *"New trip reports on your saved climbs"*. That is the #1625 repair: **make the label describe
    what the control does**, the same move that made the inbox filter safe to remember.
  - **THE ORDER IS THE POINT: HONESTY BEFORE PERSISTENCE.** `lib/inbox-pref.js` records the rule —
    it is safe to remember a preference only once the control is honest, because remembering a
    switch that governs nothing **durably keeps a promise the app cannot keep**. So the inert switch
    came out in the same change that gave the survivors a home in `lib/notif-pref.js`.
  - **FOUR SIBLING GUARDS ARE EACH BLIND TO IT, and the near misses are the argument.**
    `check:dead-props` asks about props and this is a local. `check:visibility-switches` asks
    whether a switch governing what **others** see persists — and these govern only what this
    browser shows its owner, so that guard excludes them **by name** in `NOT_VISIBILITY`, with a
    reason that says outright they do not persist either. `check:dead-flag-gates` asks whether a
    constant a false flag empties feeds some UI; `notifPrefs` is neither. And `check:preview-claims`
    asks whether a control **claims a real outcome** — this one claims nothing in words, it just
    silently fails to act.
  - **THE CENSUS THAT EXISTS FOR EXACTLY THIS QUESTION REPORTED `0 volatile`, and its blind spot is
    the transferable half.** `measure-settings-that-do-not-persist.mjs` had already been *"confidently
    wrong four times"* by its own header, and the fourth fix replaced a hand-typed setting list with
    a list **derived off the screen**. The derivation reads controls **one JSX site at a time** and
    keys on a **string-literal `aria-label`** — and these four are `[[key,label,sub],…].map(…)` with
    `aria-label={"Toggle "+o[1]}`, so the whole GROUP was dropped by an early return and nothing in
    the output said a group had been skipped. **A control group rendered from a loop is one site and
    several controls**, which is invisible to every scan of that shape. Mechanism 5, and the first
    that is a hole in the derivation rather than in somebody's list. It reports groups now — members,
    state and storage — and it was proven non-vacuous by reverting the fix, where it reports the
    three as volatile rather than printing the same clean summary.
  - **`lib/inbox-pref.js` CLAIMED IT HAD CLOSED "THE LAST SETTING" that did not survive a page load**,
    on the strength of that census. It had not; the claim is corrected in the file rather than left
    to be read as true. Stale bookkeeping in a comment is the class this document keeps recording.
  - **`defineFlagSet` is a SECOND function in `lib/prefs.js`, not a widening of `definePref`**, and
    the difference is what validating-on-read is for: a scalar preference is one of a short list,
    while this one is an **object** whose keys are known and whose values must each be a **boolean**
    — reading a stored `{crew:"yes"}` back as truthy would persist junk as a preference. An unknown
    key is **dropped** on read, so the `messages` key already sitting in a returning climber's
    `localStorage` stops being read back rather than lingering as a preference for a switch that no
    longer exists.
  - **UNSET MEANS SHOWN, and it is asserted.** A default of `false` would mute alerts for every
    climber who has never opened the screen — the one failure of this feature nobody would report,
    because they would simply never learn a crew invite had arrived.
  - Fails **closed** five ways, each of which otherwise prints identically to a clean run: a moved
    Notifications heading, a control group that is no longer an array followed by `.map`, fewer than
    two switches parsed (with none, every *governs something* assertion passes **vacuously**), **no
    notification carrying a `cat` at all**, and a `notifAllowed` that no longer treats an untagged
    notification as always-shown. The wiring assertion balances braces rather than using a character
    class — the handler body contains `Object.assign({},p)`, and a `[^}]*` stops at that brace and
    reports a **correct** toggle as unwired, which is what the first version did.
  - Injection-tested **8/8** (`scripts/oneoff/inject-notification-switch-cases.mjs`), each case
    proving its edit landed **by checksum**, restoring the file byte-identically, and judged on the
    guard's **own failure text** rather than on an exit code. Case 1 is the real defect, the
    `messages` switch restored verbatim. **Two must stay SILENT** — an app prompt that no switch
    names is correctly untagged and always shown, and tagging one more notification into an existing
    category is ordinary work; a guard that fired on either would tell authors to break it.
  - **CASE 5 WAS TESTING THE WRONG RULE AND REPORTED A MISS AGAINST A WORKING GUARD.** It added a
    switch whose key no notification carried, which trips *rule 1* — so the run said nothing about
    the stored-keys comparison the case was named for. It tags a notification with the new key too
    now, which is what an author adding a switch properly would do, leaving the module as the only
    thing out of step. **Checksum movement proves an edit happened, not that it was the right one** —
    the fourth time this file records that.
- **`check:count-matches-its-list`** asserts that **a count agrees with the list under it**, on one
  screen. Static (one source read), so it sits in `npm run build`.
  - **`check:ui` ALREADY ASSERTS THIS ACROSS TWO SCREENS** — #1203, where the Profile said *"3
    active"* and the Logbook *"4 climbs to go"* about one list. **Home does it to ITSELF, twice**,
    and no browser walk can see either: both surfaces are correct in isolation, and only their
    combination is a lie.
  - **HOME SAID "NOTHING NEEDS YOU RIGHT NOW" WHILE LISTING WHAT DID.** Its *UNFINISHED BUSINESS*
    list builds from **eight** sources; the empty-state gate tested **five**. The two that were
    missing are the ones a real account actually has: **`myCrewInvitesQ`**, the DB-backed crews
    another climber has invited you to, and **`crewsNeedingMyDay`**, a crew waiting on you to
    confirm a date. So a climber with a pending invite got *"Nothing needs you right now"* rendered
    **directly above the invite that needed them**.
  - **THREE SURFACES DERIVE "WHAT NEEDS YOU" AND ONLY ONE WAS COMPLETE.** `crewBadgeN` (the Crew tab
    badge) counted all five request kinds plus the day confirmations; the bell counted three of
    them; Home's `reqN` counted four. Three longhand expressions, written out separately, agreeing
    by luck where they agreed at all. `_pendingForMe` is now the one definition the Crew badge and
    Home's gate both use — **a hoist is not a single source of truth until every site uses it**,
    the lesson the group roster's `_memN` already records, where the heading held a second copy of
    the expression it was hoisted to remove.
  - **AND THE BELL BADGED A NUMBER ITS PANEL DOES NOT LIST.** The badge counted
    `friendReqIn.length+crewReqIn.length+groupReqs.length+<unread notifs>`, while `NotifPanel`
    renders only `requests` and `notifs` — **neither crew invites nor group requests**. On the
    seeded demo that is three phantom items, and with only those pending the bell reads **3** over
    a panel whose own `empty` test says you have nothing. `_reqClimber` returns **null** for a seed
    id absent from `CLIMBERS`, so even the friend half could exceed its own list. The badge counts
    `_notifRequests.length` now — **the same array the panel is handed**, so the number and the list
    cannot disagree by construction.
  - **AND A THIRD CONTROL OPENED THAT SAME PANEL WHILE COUNTING HALF OF IT — the bell fix
    enumerated one control and there were two.** Home's alerts dropdown lists
    `mergedNotifs.slice(0,8)` and closes with **"View all N alerts"**, which does not expand the
    dropdown: it calls `setNotifOpen(true)` and **leaves** for `NotifPanel`, which is handed
    **both** `_notifRequests` and `mergedNotifs`. The N counted only the second. So on the seeded
    demo Home rendered a red **15** on the bell and **"View all 14 alerts"** inches below it, both
    leading to one 15-row panel. *An instance fixed by hand is not a class closed*, and the
    enumeration that would have caught it is the one this file keeps recording: list the controls
    that reach the thing, not the ones you fixed.
    - **FOUND BY READING A FRESH CI `ui-screens` CAPTURE**, which is the third finding that
      technique has produced. The tell was the header strip reading `★ 4 15 2` — the saved-climbs
      badge, the **bell badge** and the calendar badge — against *"Alerts · 14 new"* on the same
      screen. **Identify an unexplained number before dismissing it**: two of those three were
      immediately explicable and the middle one was the defect.
    - **THE COUNT DESCRIBES THE DESTINATION, because the control is a "go to the full list" one.**
      Its handler closes the dropdown, so *"view all N of these"* is not a reading the app
      supports — and the 8-row cap already means the number is promising more than is on screen.
    - **THE GATE MOVED WITH IT, and that is the half a count-only fix leaves behind.** The
      condition was `mergedNotifs.length>8` — one list — while the number now describes two, so
      the control's condition and its count would have been about different things: this defect
      one level down. Both are now the same derivation (`_all > _shown`).
    - **Section 3 is SCOPED TO THE ALERTS BLOCK, not to the expression that happens to wrap the
      control today.** A first version searched backwards for the enclosing `(function(){` — which
      exists *only because the fix put one there* — so against the real historical defect it scoped
      the wrong expression and died **fail-closed** instead of naming it. **A guard that cannot
      fail on the defect it was written for is not a guard**, and only the injection said so.
    - **The anchor is the NOUN (`" alerts"`), never `"View all "`** — that phrase is shared with
      the *Past crews* control, and the first version died `ambiguous` on it. A SILENT case pins
      that editing the sibling changes nothing here.
    - **THE "refuse an expectation that matches the CLEAN run" GUARD IS DELIBERATELY ABSENT FROM
      THIS SUITE, and trying it is what established why.** This guard prints the array's NAME on
      its `ok` line and its `FAIL` line alike, so every correct expectation legitimately appears in
      a green run — wired in, it refused a **pre-existing, correct** case. What protects against a
      needle written against passing text is judging on **FAIL lines only**, which this harness
      already did. Same reasoning `check:visibility-switches`' sibling suite records.
    - The floor rose **6 → 11**, two below a clean run's 13: at 6, deleting section 3 landed on
      **10** and passed, which is precisely what a floor is for.
    - Injection-tested **12/12** (`scripts/oneoff/inject-count-matches-its-list-cases.mjs`), each
      case proving its edit landed **by checksum** and restoring the file byte-identically. Case 4
      is the real defect **spliced back verbatim**. **Two must stay SILENT** — a reworded label
      (a guard pinned to one phrasing forbids improving the copy) and the Past crews control.
  - **WIDENING THE PANEL WOULD BE THE OTHER FIX AND IS NOT THIS ONE.** Making `NotifPanel` list crew
    invites and group requests is a change to what that screen is; making the badge stop promising
    them is not. Recorded so the smaller fix is not read as a verdict on the larger question.
  - **THE RULE IS ONE-DIRECTIONAL, and that is what keeps it quiet.** A gate may legitimately cover
    MORE than the list beneath it — Home also tests unread notifications and the friend feed, which
    *UNFINISHED BUSINESS* does not build from. What it may never do is cover **less**: claim
    emptiness while something it renders is waiting. Injection case
    `SILENT-gate-covers-more-than-the-list` pins that, and without it this guard would fire on
    correct work.
  - **THE SOURCES ARE READ OFF THE LIST, never listed in the guard** — so a source added to
    *UNFINISHED BUSINESS* is covered without editing this file, which is the whole point, since
    every one of the live defects was a source added to the list and not to the gate. The
    `(x.data||[]).forEach` shape is matched as well as the bare identifier: matching only the
    identifier misses **exactly** the react-query list that was the defect.
  - **IT FOUND ITS THIRD INSTANCE BEFORE IT WAS WRITTEN.** Two were found by reading; enumerating
    the list's sources mechanically produced `crewsNeedingMyDay`, which nobody had noticed. *Ask the
    list what it builds from rather than reading the gate for what looks missing.*
  - **ITS FIRST VERSION REPORTED COVERAGE IT DID NOT HAVE, and only the injection said so.** It
    appended `reqN`'s and `_pendingForMe`'s definitions to the gate text **unconditionally** — so
    with `reqN` reverted to its longhand the gate no longer reached `_pendingForMe`, and the guard
    still credited it with everything `_pendingForMe` counts. It printed a clean sweep over a gate
    that had just lost a source. Expansion is **transitive from what the gate actually names** now,
    bounded by a short-definition cap so an arithmetic helper is followed and a component never is.
  - Fails **closed** six ways, each of which otherwise prints identically to a clean run: a moved
    *UNFINISHED BUSINESS* builder, one that parses short, fewer than five sources out of it (with
    none, every comparison passes **vacuously**), a moved empty-state gate, a `requests` prop that
    does not close, and a missing bell. It also fails if the *"Nothing needs you"* copy is gone —
    a gate guarding nothing is not a gate.
  - **A WIDER DETECTOR WAS MEASURED AND REJECTED — do not re-derive it.**
    `scripts/oneoff/measure-controls-rendered-from-a-loop.mjs` sizes the general blind spot this
    came from: **349 of 1,133 interactive JSX sites (31%) sit inside a `.map`**, so a scan reading
    controls one site at a time sees one control where the screen has several. The tempting
    generalisation is *"a looped control whose accessible name cannot vary with the member
    announces identically for every member"* — built, measured, **137 findings and almost all
    correct work**: a row's *Accept* / *Decline* / *Message* button is named by its own text and is
    ordinary, ubiquitous UI. The class is not separable from correct code by that test, so no
    detector was shipped. **Visiting a looped site once is the RIGHT answer for "does this control
    have a name"; it is the wrong answer only for a question about the MEMBERS**, and a census is
    the case where that bites.
  - Injection-tested **7/7** (`scripts/oneoff/inject-count-matches-its-list-cases.mjs`), each case
    proving its edit landed **by checksum**, restoring byte-identically, and judged on the guard's
    **own failure text**. Cases 1-3 are the three real defects. **Case 5 invents a source nobody has
    thought of** and adds it to the list only, which is what shows the rule generalises past the
    three it was written from. **Two must stay SILENT** — a source added to both, and a gate that
    covers more than its list.
- **`check:onboarding-reach`** asserts that **a climber who has not onboarded is offered
  onboarding, and one who has is left alone**. Static (one Babel parse plus two executions, no
  browser and no database), so it sits in `npm run build`.
  - **THE APP MANAGED TO ASK NOBODY AND EVERYBODY AT ONCE, which is why both halves are asserted.**
    The effect written to onboard a new climber keyed on `authed` — set true in exactly ONE place,
    LoginScreen's `!realAuthGate` DEMO branch — so with a real session it could **never fire**.
    Meanwhile the *"Set up your climbing profile"* card was gated on `!onboarded`, which is
    `useState(DEMO_AUTOLOGIN)` and therefore false on **every** load for a real account, so it was
    offered forever to climbers whose profile had been complete for months. One defect was declared
    as a KNOWN by `check:new-climber-journey`; **the other had never been named at all**, and was
    found only by asking what the card's gate actually evaluates to.
  - **THE PREDICATE SPLITS AN ACCOUNT FACT FROM A DEVICE PREFERENCE, and that split is the fix.**
    *Has this climber onboarded?* is a property of the **account**, so `accountNeedsOnboarding`
    reads the profile row — onboarding's first question is required and its finish handler persists
    `disciplines` through `saveProfile`, so an account with none never completed it. That is right
    on a second device and self-heals if the write failed. *Has this browser already opened the
    sheet?* is a property of the **device**, so it lives in `lib/onboard-pref.js`. Keying the sheet
    on the account fact alone would reopen it on **every page load** — the nag the journey walk
    warned about when it declined to build this.
  - **IT WAITS FOR THE READ AND REFUSES A FAILED ONE**, and those are separate assertions because
    they fail differently. `profileLoaded` separates *"no disciplines"* from *"not asked yet"*;
    without it every established climber matches for the moments before their profile arrives and
    the sheet flashes at them on each load. And a **failed** read leaves exactly the empty profile a
    new account has — so `!profileReadFailed` is `check:profile-edit-gate`'s rule one surface over:
    opening a blank onboarding sheet over a profile the app could not load is how that profile gets
    overwritten, since onboarding writes `location`, `disciplines` and all three grades.
  - **THE PREDICATE IS LIFTED FROM SOURCE AND EXECUTED, never retyped** — a hand-typed copy would
    agree with itself whatever the app did, which is the entire question — with `ANCHOR LOST` if it
    moves and a **refusal if it is declared twice**, since then the guard cannot say which one is
    deciding. It is executed over eight states rather than one, including the two that must stay
    silent: the seed path, where `authed` is still the sign-in and no profile read ever happens.
  - **PLACEMENT IS ASSERTED AS ORDER BETWEEN TWO ANCHORS**, never a character window — this file
    packs a whole screen onto one physical line, so *"near the greeting"* is not a scope, the trap
    `check:camping` records three times over.
  - **A GATE RATHER THAN A PROBE, and `check:new-climber-journey` is why it is not enough on its
    own.** That walk drives this for real and is the stronger test, but it is **hand-run**: it
    creates a real account, so it needs the service key, which CI must never hold. What CI can see
    is the wiring — and the wiring is exactly the half a stale-base squash takes, because re-keying
    the effect back to `authed` or reverting the card's gate moves **no identifier**, which
    `audit:silent-reverts` says in its own closing caveat it cannot see. Both reverts would leave
    every render assertion green, so section 1 asserts the old forms are **gone** rather than merely
    outnumbered.
  - Fails **closed** five ways, each of which otherwise prints identically to a clean run: an app
    source that read short, a missing or duplicated predicate declaration, a lifted expression that
    parses under 40 characters or does not mention all seven of its inputs, a moved Home anchor, and
    a preference module that does not export the pair.
  - Injection-tested **8/8** (`scripts/oneoff/inject-onboarding-reach-cases.mjs`), each case proving
    its edit landed **by checksum** and restoring `ClimbMatch.jsx` byte-identically. Two of the six
    firing cases are the real historical defects restored verbatim. **Two must stay SILENT** — a
    comment quoting the old effect (which is what the Babel masking is FOR, and what the sibling
    guard next door does in its own header) and the predicate's two independent conjuncts written in
    the other order, since a guard pinned to one spelling forbids a correct refactor.
    - **The suite found three bugs in ITSELF before it found anything about the guard**, and all
      three are traps this file already records. Four expectations were the text an assertion prints
      when it **PASSES** — caught by the harness's own refusal to accept an expectation that already
      matches the healthy run, which is the structural version of a mistake made three times before.
      Both SILENT cases then reported *FIRED ON CORRECT WORK* against an **`ok` line**, because the
      guard's own label reads *"a FAILED profile read"* and a bare `includes("FAIL")` matches it:
      **match a FAIL LINE, never the word**, exactly as `check:waypoint-dedupe` records. And deleting
      `profileLoaded` outright tripped the guard's fail-closed branch *before any assertion ran*, so
      the case proved nothing about the semantics — the injection neuters the conjunct **in place**
      now, keeping the name so the executed assertion is what fires.
- **`check:photo-removal`** asserts that a climber can take their **own** profile photo back down,
  that **only** their own strip offers the control, and that a **failed** removal does not destroy
  the file. Static (a source read plus one execution against a stubbed transport), **1.15s**, so it
  sits in `npm run build`.
  - **SECTION 3 COVERS THE AVATAR, WHICH IS THE PHOTO A CLIMBER CANNOT ESCAPE.** The strip gained a
    remove control and the avatar did not — so the one image shown beside your name in partner
    search, on every crew roster and against every comment could be REPLACED and never CLEARED.
    The in-app privacy sheet meanwhile promises you can *"edit or clear anything from your profile
    and settings at any time"*, which `check:policy-claims` already records as the sentence that
    contradicted it. **The product decision went the other way when asked: add the control.**
    - `removeProfileAvatar(userId, url)` is `removeProfilePhoto`'s sibling and inherits its whole
      contract — **one column in, one column out** (never routed through `saveProfile`, which
      PATCHes whatever object it is handed: the `check:profile-edit-gate` shape), the **reference
      dropped before the storage object**, and a throw rather than a resolve on a refusal so no
      "Photo removed" sits in front of a write that did not land. An RLS refusal rejects by matching
      zero rows, which `.single()` surfaces as an error.
    - **IT TAKES A userId RATHER THAN READING THE SESSION, and that was chosen FOR TESTABILITY.**
      Mirroring `uploadProfilePhoto`'s own `auth.getSession()` read was the tidier-looking option
      and would have made the function **unexecutable by this guard** — with no session in node it
      throws "Sign in" before touching anything, so every property could only be asserted as source.
      One prop on `EditProfileScreen` buys execution instead.
    - **Removal acts IMMEDIATELY rather than on Save**, unlike every other field in that editor.
      "Change photo" already uploads on selection, so the storage half was never drafted either —
      and clearing your face off a partner-search screen is a PRIVACY action, where leaving it
      pending behind a button the climber may never press fails in the wrong direction.
    - Injection-tested **6/6** (`scripts/oneoff/inject-avatar-removal-cases.mjs`), each case proving
      its edit landed by checksum and restoring byte-identically. **One must stay SILENT** — a
      comment quoting the forbidden ordering. **Its first version matched the text the assertions
      print when they PASS and reported WRONG FAILURE on all three cases against a guard firing
      perfectly** — the mistake this file already records twice, made a third time. The harness now
      **refuses any expectation that matches the clean run**, which is the structural fix.
  - **THE FEATURE EXISTS BECAUSE HIDING WAS NEVER A REMOVAL.** `PhotoStrip` offered `onAdd` and
    nothing to undo it, so a climber who regretted a photo could only **hide** it — and `0174` says
    in its own header that `photos_public` is **surfacing only, not access control**, so the row
    was still served to anyone holding the anon key. #1521 shipped the remove path; this is what
    stops it going quietly.
  - **BOTH INVARIANTS ARE INVISIBLE TO EVERY OTHER GUARD, and they fail in opposite directions**, so
    they are asked separately.
    - **WHO GETS THE CONTROL is the ABSENCE of a prop at two of three call sites.** `PhotoStrip`
      renders three different people's photos — your own profile, `FullProfile` (somebody else's),
      `TripReport` (a report author's) — and exactly one passes `onRemove`. Adding it to another
      lets one climber take down another's photo. Dropping it from your own removes **no
      identifier**, so `audit:silent-reverts` is blind to it by its own closing caveat; and
      `check:dead-props` asks whether a prop is *read* (it is) and whether a call site passes one
      nothing reads (the opposite direction). Static, because the gate is an absence and a render
      can only ever show the sites that DO pass it.
    - **WHAT THE REMOVAL DOES is a property of two awaits in one function**: drop the **reference**
      first, then the storage object — `deleteRoutePhoto`'s ordering. Reversed, a refused write
      leaves the profile listing a file that is gone: a broken image, and an **unrecoverable** one,
      because the object was deleted before anything knew the reference survived. Executed rather
      than read, because the dangerous case is a **failed write**, which a live database will not
      produce on demand.
  - **It asserts the array WRITTEN, not the array returned**, which is not pedantry: a function that
    returns the right list and persists a different one satisfies every return-value assertion while
    losing the climber's change. And it asserts a no-op removal **throws before writing anything** —
    a removal matching nothing that writes the array back and reports success is the
    `check:writes` shape on a delete.
  - **`photoStorageKey` was extracted rather than re-typed**, so the public-URL → object-key
    reversal has one implementation. A second copy is how this codebase ended up with four grade
    parsers.
  - **A `blob:` preview is a REAL case, not an edge one**: a photo added and removed before the
    upload settles has no object of ours, so the strip must drop it and ask storage to delete
    **nothing**. Both halves are asserted.
  - **READ-ONLY**: it writes to no database and uploads nothing — every request is answered by a
    stub — so it is safe in the build chain and on a contributor's machine with no credentials.
  - It ran nowhere as a `scripts/oneoff/` probe, which is the *a verification nobody runs is not a
    verification* promotion this file records for `check:overflow`, `check:pitch-discount` and
    `check:policy-claims`. **Promotion changed its DEPTH** — `ROOT` was `../..` — the trap
    `check:pitch-discount` records; a promoted one-off that resolves the wrong tree measures a
    different branch's code, as `measure-which-tab-renders-each-field` did for weeks.
  - Fails **closed** five ways, each of which otherwise prints identically to a clean app: fewer
    than the three `<PhotoStrip>` call sites this app has (with none, every *must not offer
    removal* assertion passes **vacuously**), an unterminated tag, a moved `PhotoStrip` signature,
    a bundle esbuild cannot build, and either export missing from `lib/db.js`. **A missing
    `onRemove` is a FAILURE, not a broken scan** — the distinction matters, because the two want
    opposite repairs.
  - Injection-tested **4/4** (`scripts/oneoff/inject-photo-removal-cases.mjs`), each case proving its
    edit landed **by checksum** and restoring the file byte-identically: reverse the write order,
    drop `onRemove` from the profile call site, add it to somebody **else's**, and make a no-op
    removal report success.
