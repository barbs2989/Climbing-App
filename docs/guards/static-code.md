# Static code guards

Build-chain guards that read source with Babel or a directory walk: bindings, hooks, props, duplicate attributes, screen lists, NUL bytes, script roots, doc paths, injection anchors, clickables, fixed panels, overlay widths, icons, toasts.

Part of the guard notes — see [README.md](README.md) for the full index.

- **`check:refs`** parses with Babel and fails on any identifier with no binding in
  an enclosing scope — the bug that blank-screened production in #317 and #359.
  It runs inside `npm run build`, so it gates CI too. Keep
  `scripts/undefined-refs-baseline.json` empty.
- **`check:boot`** compares the inline boot placeholder in `index.html` (the app
  shell painted while the bundle loads) against the real `NAV` array. It is a
  hand-copy, so a renamed or reordered tab would otherwise flicker stale chrome
  before React swaps it out, and nothing else would catch it. Gated by `npm run build`.
  - **SECTION 2 COVERS A SECOND HAND-COPY OF `NAV`, and the guard's NAME is now narrower than its
    contents** — the rename is deliberately not done in the same change, the precedent
    `check:topo-outage-copy` records. The Help modal's `feats` array tours the tabs in prose under a
    heading that read **"A quick tour of each tab"**, and it had drifted **three ways at once**:
    **Home** — the tab a new climber lands on — had no entry at all; the tab labelled **`Crew`** was
    called **"My Crew"**, so somebody scanning the nav bar for it would not find it; and three
    entries named things that are not tabs (`Groups` is a `crewView` sub-view, `Guides` is outside
    `NAV`, and **"Safety & Trust" appeared exactly ONCE in the whole codebase — inside that
    modal**, so it named no surface). Help is the one screen somebody opens *because* they are
    already lost.
  - **The rule is a SUPERSET test, not section 1's equality**, and that distinction is what keeps it
    honest: the tour may legitimately describe sections that are not tabs and may order them its own
    way. What it may not do is omit a tab, or spell one differently from the nav bar the reader is
    looking at while they read it. Injection case 5 pins that — **a new non-tab section must stay
    SILENT**, or the guard would instruct authors to delete correct content.
  - The repair added a **Home** entry written strictly from what that screen renders (the setup
    checklist's own items, the *Jump back in* tiles, the alerts bell and *Unfinished business*), and
    reworded the heading to *"A quick tour of the app"* / *"Tap a section to expand"* so the three
    non-tab entries stop being described as tabs. **Nothing was invented** — the alternative, writing
    plausible tour copy, is the fabrication class this file records everywhere else.
  - **CASE 3 IS WHY THE HARNESS TAKES MULTI-FILE EDITS, and its first version was a FALSE CATCH.**
    Renaming a tab in `NAV` also breaks the boot shell, so **section 1 fails first and exits** — the
    case reported `guard=fail` while section 2 had never run. It renames the tab in `index.html` too,
    leaving section 2 as the only thing that can fail, and every case now asserts the failure text
    came from **section 2 specifically**. *An injection that produces a different failure is not a
    catch* — this repo has read one as the other twice before.
  - Injection-tested **5/5** (`scripts/oneoff/inject-help-tour-cases.mjs`), each case proving its
    edit landed **by checksum** and restoring every file it touched byte-identically. Fails
    **closed** on a renamed `feats`, an array that does not close, or fewer than 5 entries parsed —
    a tour the guard cannot read must never report as a tour with nothing missing.
- **`check:screen-lists`** asserts that a guard's list of screens matches the app's own. **The app
  has SEVEN tabs and five browser guards walked six.** `NAV` is
  today/routes/discover/crew/logbook/**ranks**/me, and `check:a11y-badges`, `check:overflow`,
  `check:overlay-scroll`, `check:signed-in` and `check:zero` each hard-coded the same six, omitting
  `ranks`. Static — migration-free, no browser, no DB — so it sits in `npm run build`.
  - **Not drift: the same wrong list copied five times.** `ranks` has been in `NAV` since the first
    commit and every one of those guards was written long afterwards, so none of them ever lost the
    tab — they never had it. `check:outage` had the identical hole and it was fixed **by hand** (its
    own header records walking *"five tabs and a duplicate"*); nothing carried that across, and
    nothing could. Same argument for a script over a note as `check:crew-member-readers`.
  - **The Leaderboards screen was not empty, which is the point.** Its `YOU` badge is a separate
    `<span>` held off the climber's name by `marginLeft`, and the row is a `clickable()` control, so
    Chrome announced **`"@nathanclimbsYOU"`** — precisely the #740 defect `check:a11y-badges` exists
    for, on the one screen it could not see. A coverage hole is invisible by construction: *a screen
    nobody opens is not a screen with no findings, it is not a screen.*
  - **It caught a foreign entry the other way round too.** `check:token-boxes` walked a ROUTE
    sub-tab called `ranks`, which does not exist — the bar is
    overview/planner/conditions/safety/partners/photos — so it spent a walk on an id the route page
    has no branch for and **never inspected Partners at all**, while its own header claimed six
    sub-tabs.
  - **SECTION 4 READS CLAUDE.md's OWN ARCHITECTURE BULLET, because the rule above is scoped to
    `scripts/` and the DOCS hold a hand-copy of the same vocabulary.** That is not hypothetical:
    the Architecture bullet listed the route sub-tabs as
    overview/conditions/planner/safety/photos/**`ranks`** — the identical wrong list recorded two
    bullets up as costing `check:token-boxes` a whole walk, with `partners` missing the same way.
    **The guard was fixed at the time and the sentence that seeded it was not**, so for months a
    reader starting from Architecture would have copied it straight back out. A stated vocabulary
    is a hand-copy wherever it lives.
    - Scoped to that ONE bullet, deliberately — CLAUDE.md discusses these ids in prose throughout
      (this entry does), so a document-wide scan fires on every correct mention. It reads the
      bullet's own LINE, and the explanation naming the absent id lives on a sub-bullet beneath
      it: a version that scanned the whole entry **failed on its own documentation**, the trap
      `check:ci-cancel` records from the other side. Keep the list on one line.
    - **An IGNORE list is how this check goes vacuous, and the first draft proved it**: it excused
      `ranks` as "the NAV tab it names", which is precisely the id the defect consisted of — it
      would have passed the original wrong bullet. The bullet's SUBJECT is stripped structurally
      instead, and only genuine app-state names (`selRoute`, `tab`) are excused.
    - Injection-tested **4/4** (`scripts/oneoff/inject-architecture-subtab-cases.mjs`), each case
      proving its edit landed **by checksum**, restoring byte-identically, and asserting the
      failure came from section 4 rather than a script-list section above it. Case 1 is the real
      bullet, restored verbatim. **Case 4 must PASS** — the sub-bullet names `Ranks` while
      explaining it, and a guard flagging that would forbid its own explanation.
  - **Both vocabularies are READ from the app, never restated**: `NAV` from `ClimbMatch.jsx`, the
    sub-tab bar from `RouteDetail.jsx`, each with `ANCHOR LOST` if it moves. Any array of string
    literals under `scripts/` holding **three or more** members of one vocabulary is a list *of* that
    vocabulary and must then hold all of it and nothing foreign. Three is the threshold because a
    list naming three of these ids is not doing so by accident, while a lone `"today"` or `"photos"`
    is more likely a different concept entirely.
  - `scripts/oneoff/` is excluded: a one-off probe is scoped to whatever it was written to measure
    and has no business being held to full coverage.
  - **`PARTIAL_ON_PURPOSE` records reasons, not passes**, and is keyed on the exact values —
    an exemption is a claim about *one* list, so any edit has to be re-justified rather than
    inheriting somebody else's reasoning. Three entries today (`check:anniversary`'s notification
    surfaces, `check:camping`'s can-this-probe-fail list, `check:ui`'s second interactive sweep). A
    **stale** entry fails three ways — completed, changed, or gone — and the diagnosis names which,
    because *"you finished it, drop the exemption"* and *"you changed it, say why"* need different
    repairs.
  - **An earlier version had the COMPLETE branch behind the values key, where nothing could reach
    it.** Dead code in a guard reads as coverage and is not; **only the injection found it**, since
    the branch never fired on a clean tree either.
  - Fails **closed** four ways: a missing `NAV`, a missing sub-tab bar, a vocabulary that parsed
    short (a two-entry `NAV` would make every list look complete), fewer than 20 scripts walked, or
    zero lists classified.
  - Injection-tested **9/9** (`scripts/oneoff/inject-screen-list-cases.mjs`), each case proving its
    edit landed **by checksum** and restoring the file byte-identically. Cases 1 and 2 are the real
    historical defects. **Cases 5 and 8 must stay SILENT** — a complete list and a below-threshold
    list are both correct work, and a guard that flagged them would tell authors to break it.
  - The `YOU` badge sits on **two** controls and a walk can only ever see one: the list row, and a
    your-rank card gated on `meIdx >= 100`. Six climbers are on the demo board and six on the
    `check:signed-in` fixture, so **no fixture in the repo can reach that card**. Both go through one
    `lbRowName()` so they cannot drift, and
    `scripts/oneoff/probe-leaderboard-your-rank-card.mjs` seeds 120 climbers into the exported seed
    array (in the probe, never in the app) to render it — `"#126, Nathan Barber, you, Salt Lake City,
    UT, 0 pts"`. It also asserts the badge **still renders**: a probe that passed because the badge
    was deleted would be certifying the feature's removal.
- **`check:dup-attrs`** asserts that no declaration is written **twice in one place** — a JSX
  attribute on one element, or a key in one object literal. The later one wins and the earlier one
  is **dead**. Static (Babel), so it sits in `npm run build`.
  - **esbuild ALREADY REPORTS BOTH, AND THAT IS EXACTLY WHY THREE SHIPPED.** `npm run build`
    printed `Duplicate "aria-current" attribute in JSX element` and `Duplicate key "border" in
    object literal` on every run, and still exited **0** — a warning inside a sixty-second log is
    indistinguishable from noise. This whole file exists on the premise that the failure mode here
    is not a build error but a screen that renders wrong; a warning is not a check.
  - **One of the three was a real override.** The crew date chip set `border:"1px solid "+C.blueDim`
    and then `border:"1.5px solid "+C.blueDim` in the same style object, so the 1px never ran. The
    rendered value matches the float-plan button beside it, which is what says 1.5px was meant.
  - **The other two are the fingerprint of an applier that double-applied**, and they were mine:
    #1308 and #1322 both reached the same two controls and neither asked whether `aria-current` was
    already there. Identical expressions, so nothing announces wrongly today — and the same slip
    with two **different** expressions silently drops the first and announces the wrong state, with
    nothing on screen to show for it. Batch 5's first version *did* check; rewriting it to
    enumerate-then-insert dropped the idempotence guard.
  - **No exemptions, deliberately.** There is no correct reason to write one name twice in one
    element or one object literal, so there is no list here that can rot. Overriding a **spread** is
    a different shape (`{...base, color:"red"}` is a spread and a key, not two keys) and is not
    reported; nor are two **computed** keys, which are not knowably the same key.
  - The repair (`scripts/oneoff/fix-duplicate-declarations.mjs`) removes the dead half **by AST byte
    range, never by text** — `aria-current={sel?…}` and `aria-current={on?…}` occur four and six
    times across these files, so a textual replace would cut a different, correct control. It always
    removes the **earlier** declaration, which makes the rewrite behaviour-neutral by construction:
    whatever the file does today it does with the later one, and that is the one left standing.
  - Fails **closed** on a parse error and on an element/object floor. **What that floor does NOT
    prove, learned from injection case 6 rather than assumed:** it asks whether the traversal *ran*,
    not whether the *detection* ran. The case first returned after `elements++`, so the counter saw
    thousands and the guard passed with duplicate-finding disabled — correct for what a floor means,
    and not a substitute for the cases.
  - Injection-tested **6/6**, each proving its edit landed **by checksum**. Cases 1 and 2 are the
    real defects, reproduced by re-inserting exactly what the fixer removed. **Cases 4 and 5 must
    PASS** — a spread override and a pair of computed keys are both correct code.
- **`check:bottom-panels`** asserts that a **fixed panel anchored to the bottom of the viewport
  reserves the space it covers**. `position:fixed` takes a panel out of the layout, so nothing below
  it moves and scrolling never gets content out from under it — the panel is pinned to the
  **viewport**, not the page. A dismissible one is fine; one that cannot be dismissed makes the
  bottom of every screen unreachable for as long as it is up. Static, so it sits in `npm run build`.
  - **`PolicyUpdateNotice` was that panel.** Measured at 390×844 by
    `scripts/oneoff/probe-policy-notice-covers-content.mjs`: **201px of an 844px viewport, hiding 39
    controls across six tabs** — the whole app footer (**Settings, Privacy, About us**) on every one
    of them, so the notice asking you to review the Privacy Policy was covering the Privacy link.
    Home also lost *Recent friend activity*, the Logbook *Show 1 more report*, the Profile *Edit
    profile*.
  - **Not a legacy-account state.** It fires whenever `profiles.terms_accepted_version` differs from
    `POLICY_VERSION` — i.e. **every signed-in account, every time the policy is bumped**, which its
    own copy has a branch for (*"Our Terms and Privacy Policy have changed"*). Its
    non-dismissibility is deliberate and correct; the missing reservation was the defect.
  - **THE PROBE MEASURED THE WRONG SCROLLER FIRST, AND REPORTED A SMALLER, DIFFERENT FINDING.** It
    scrolled `#appscroll` — which is `overflowY:auto` and looks like the scroller — and got
    `905/905`, "fits, no scroll", on every tab. The **document** is the scroller here
    (`documentElement` 1115 against an 844 viewport). So the first run's 25 findings were about the
    **default** scroll position dressed up as a statement about the bottom of the screen. Scrolling
    the real scroller took it to **39**, and moved the covered set from mid-page tiles to the
    footer. **Report the scroll you performed, or a claim about "the bottom" is unfalsifiable.**
  - **HIT-TESTED, NOT COMPARED BY RECTANGLE**, and only a **fixed** blocker counts. A bare
    centre-point test reported 6 "covered" controls in the **control** run, with no panel on screen
    at all — a button whose centre lands on a sibling chip, a span over an icon, a select under a
    relative button. Every one is ordinary layout adjacency and every one of their blockers is
    `static`/`relative`/`absolute`. Counting them made the probe's own fail-closed branch say **NOT
    ATTRIBUTABLE** about a finding that is real.
  - **The control run is the load-bearing half**: the same walk against the ordinary config, where
    the notice does not exist. It reports **0 on every tab**, so the 39 are attributable. The probe
    also refuses a run in which the notice never rendered — which would otherwise print a clean
    sweep about a screen with no panel on it.
  - **A GUARD FOR A CLASS OF ONE, AND THE SECOND RULE IS WHY IT EARNS ITS PLACE.** There is exactly
    one bottom-anchored fixed panel in the app (the other `position:"fixed"` match is a full-screen
    overlay, which covers everything on purpose and is out of scope). Rule 1 is **anti-revert**: the
    reservation is one `paddingBottom` on `#appscroll` driven by the same flag that mounts the
    panel, and a stale-base squash that keeps the flag and drops that clause changes **no
    identifier** — invisible to `audit:silent-reverts`, which says so in its own closing caveat.
    Rule 2 is **class growth**: a second such panel must be declared here with a reason, so the next
    author answers the question rather than rediscovering it.
  - **Its own declaration rule was too loose and injection case 2 caught it.** Testing
    `text.includes(style)` let a brand-new panel whose style merely *starts* the same way
    (`…bottom:0,height:40`) inherit the existing declaration and pass silently — the exact failure
    the rule exists to prevent, committed by the rule. Declarations are matched **by offset** now,
    and a declared style that appears more than once in its file fails as **ambiguous**.
  - Fails **closed**: finding no bottom-anchored panel at all is a broken scan, and a declared panel
    that no longer exists fails as **stale**. Injection-tested **5/5**; **case 3 must PASS** (a
    full-screen overlay is out of scope) and case 1 is the real revert.
- **`check:no-nul`** asserts that no source file holds a **literal NUL byte**. Git classifies a file
  containing one as **binary**, so the whole file renders in a pull request as `Bin 0 -> 12464 bytes`
  or as `+0/-0` and **nobody can read the diff**. Static — no browser, no DB, no network — so it sits
  in `npm run build`, and it runs **first** in the chain: a reviewability defect is the cheapest
  possible check and has no reason to sit behind fifty others.
  - **THE CODE IS USUALLY CORRECT, WHICH IS EXACTLY WHY NOTHING CAUGHT IT.** NUL is the right
    composite-key separator (`f + "\x00" + n`) and the right hold-aside sentinel *precisely because*
    it cannot occur in the data. All three surviving instances were consistent, parsed, and ran. The
    cost was never to behaviour — it was to **review**, and review is what this repo runs on: every
    guard in this file exists because somebody read a diff.
  - **The repair is never to remove the NUL**, and the guard's failure message says so. Write it as
    the two-character escape `\x00`: identical at runtime, readable in a diff. A guard that pushed
    authors to delete the byte would be telling them to break correct code.
  - **#1213 FIXED ONE FILE OF FOUR, and that is the argument for a script over a fix.** #1210 shipped
    `fix-approach-variants-working-language.mjs` with four NULs, on a change whose entire risk was
    that a mechanical transform might damage good prose; #1213 repaired it by hand. Main still
    carried **three more** — `audit-enrichment-bleed.mjs`, `measure-waypoint-finding-overlap.mjs`,
    `verify-grade-parser-equivalence.mjs` — and a **fifth arrived the next day**, in a different file
    by a different route: a `.join(" \x00 ")` where three spaces were intended. Two mechanisms
    (deliberate sentinel, accidental separator), two days, five instances. *An instance fixed by hand
    is not a class closed.*
  - **The rewrite is VERIFIED EQUIVALENT rather than assumed, and a textual diff cannot show it** —
    the whole point of the change is that the old text is undiffable.
    `scripts/oneoff/fix-literal-nul-bytes.mjs` parses both versions with Babel and compares **every
    `StringLiteral` and `TemplateElement` value in source order**, accepting the rewrite only if the
    strings the program builds are identical (44, 34 and 63 strings, all matching). It refuses rather
    than writes on any mismatch, an unparseable side, or a surviving NUL.
  - **A commit that removes NULs still renders as binary**, because git marks a diff binary if
    **either** side is and the parent blob is the one holding them. Proven rather than asserted: a
    further edit against the de-NULed blob diffs as ordinary text.
  - The guard **names the byte it forbids and must not contain one**, which is the cheapest possible
    self-test — and it is asserted, not assumed. The fix script and the injection harness obey the
    same rule through `String.fromCharCode(0)`.
  - **IT WALKED TRACKED FILES ONLY, SO IT COULD NOT SEE THE FILE YOU ARE ABOUT TO COMMIT.** The
    enumeration was a bare `git ls-files`, which lists the index — and an untracked file is exactly
    the one whose diff this guard exists to protect. #1449 failed CI on a literal NUL in a script
    written minutes earlier while this guard had **passed locally on the same tree**; the counts
    said so and nobody read them (2003 files before `git add`, 2009 after, 2041 today).
    - **Worst possible shape for THIS guard**, which is what makes it worth fixing rather than
      noting: it runs **first** in the chain, so when it does fire in CI nothing else runs and the
      PR shows one red check carrying no other information. Locally green, remotely red, on a file
      the author has in front of them.
    - `--cached --others --exclude-standard` adds untracked files while still honouring
      `.gitignore`, so `node_modules`, `dist` and the `.env` dotfiles stay out; `EXTS` already
      limits the walk to source types, so nothing binary is dragged in either.
    - **`audit:silent-reverts` uses a BARE `ls-files` and must keep doing so** — it asks what
      exists at HEAD, and an untracked file has no history to have been reverted from. Measured:
      those two are the only `ls-files` callers in the repo, so this is a **class of one** and no
      sweep is warranted.
    - Injection-tested **4/4** (`scripts/oneoff/inject-no-nul-untracked-cases.mjs`). The defect is
      reproduced by **reverting** the fix rather than by assuming the unfixed tree, so the suite
      keeps meaning something once the fix is in — the first version asserted "BEFORE the fix the
      guard passes", went red the moment the fix landed, and was testing the tree rather than the
      guard. **Case 3 must stay SILENT**: a widening that fired on ordinary untracked files would
      be worse than the gap it closes.
  - Fails **closed**: fewer than 500 source files found is reported as a broken walk, never as a
    clean tree. Injection-tested 4/4 (`scripts/oneoff/inject-nul-byte-cases.mjs`), each case proving
    its edit landed **by checksum** and restoring the file byte-identically. **Case 2 must PASS** —
    `\x00` written as an escape is the prescribed repair, so a guard flagging it would forbid its own
    fix.
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
- **A FULL-SCREEN VIEW THAT RENDERS OVER THE APP IS A DIALOG; ONE THE APP RETURNS INSTEAD OF
  ITSELF IS A SCREEN.** 13 opaque full-screen views exist **in the three app files** — the count
  is **24** once `lib/*.jsx` is included and the detector can read a TERNARY style, re-measured
  2026-09-09; see `check:overlay-width-cap`, which reads both scopes — (`position:fixed` + `inset:0` +
  `background:C.bg`) across the three app files and only **one** carried `role="dialog"`, so the
  rest announced as nothing and `check:overlay-discovery` — which finds overlays *behaviourally*,
  by a dialog role as the region's own first element — could not see them. That blind spot is what
  hid the Manage areas outage defect (#1365).
  - **The split is structural, not a taste call.** `App` returns five of them EARLY — Edit profile,
    Guide dashboard, Calendar, Messages, Become a listed guide — so the rest of the app is not in
    the DOM at all and there is nothing behind them to be modal over. Those are **screens** and a
    dialog role would be wrong. The other seven render inside App's main return, over an app that
    is still there, and are genuinely modal.
  - **One of the seven was neither, and only reading inside the element caught it.** The `zIndex:3000`
    match is the FireMap **`Suspense` fallback** (*"Loading fire map…"*), a loading state rather than
    a dialog. It was mislabelled *"Trip recap"* by a scan that took the first capitalised text after
    the tag and ran past the element's own end — the proximity trap this file records for dense
    lines, arriving in a labeller instead of a detector. **Read what is INSIDE the element, not what
    follows it.**
  - Six therefore gained `role="dialog" aria-modal="true"` and an `aria-label` taken from their own
    visible title. Overlay count went **54 → 57**, and exactly one newly-discovered state needed a
    payload (`openEvent`) — far less than the whole set, because most were already discovered by
    their boolean flag and only the role was missing.
  - **`check:dialog-dismiss` then reported the full-screen route map as having no way out, and it
    was WRONG in a way worth keeping.** That map's exit reads **`✕ Close`** — the clearest dismiss
    control in the app. The guard allowed a BACK glyph as a prefix to a word (`>← Back<`) but
    matched the CLOSE glyph only alone (`>✕<`), so a glyph-plus-word close button matched nothing.
    Made symmetric. The widening was verified not to silence the real question: it cleared the map
    and **kept** the other finding until that one was separately shown to be the Suspense fallback.
- **`check:popup-chrome`** asserts that **every popup's close and back controls look the same** —
  styled by `POP_CLOSE` / `POP_CLOSE_MEDIA` / `POP_BACK` from `lib/popupChrome.js`. Static, so it
  sits in `npm run build`. Reported 2026-09-24 as *"sloppy"* and *"not consistent with popups"*.
  - **Measured before the fix: 8+ close looks and 6 back looks across ~73 popup dismiss controls**
    — a bare muted `×` at 22px with no visible hit area, 36px circles and squares in three fills,
    32px and 34px variants, a bordered 16px `×`; back as a zero-padding blue text link or a bordered
    pill at 13/15/16/17px, spelled `← Back` or `‹ Back`. All 73 moved to the tokens (52 close,
    21 back); the glyphs were normalised to `✕` and `← Back`.
  - **Style OBJECTS, not a component, deliberately.** Each popup keeps its own `<button>`, its own
    `aria-label` and its visible label, which is what `check:dialog-dismiss`, `check:a11y-names`
    and `check:control-names` read. A `<CloseX/>` wrapper would hide the label from all three.
  - **The aria-label is what tells a popup's ✕ from a chip's ×.** Rule 1 fires only on a lone
    glyph whose `aria-label` starts with *Close*; the dozens of *Remove… / Dismiss… / Delete…*
    ×'s are small by design and out of scope. That made the guard a label audit too: on its first
    run it flagged the Climbs tab's **delete-saved-search** ×, announced to a screen reader as
    *"Close"*. Relabelled — it was never a close. (Log a climb's remove-partner × carried the same
    wrong label and was fixed independently on main while this was in flight.)
  - Back is scoped to buttons that CLOSE a popup (`onClick={onClose}` or `aria-label="Back"`);
    in-page navigation (`onBack`, the Climbs tab's area back) keeps its own look.
  - Injection-tested **3/3** (restyle a close, restyle a back, spell `‹ Back`), restored by checksum.
    Fails closed under 40 `POP_CLOSE` / 15 `POP_BACK` uses.
- **`check:script-roots`** asserts that **no script reads the app files of somebody ELSE's
  worktree**. Static — one directory walk and a regex, milliseconds — so it sits in `npm run build`.
  - **THE DEFECT WAS ALREADY DOCUMENTED AND NOBODY HAD ASKED HOW BIG IT WAS.** This file records
    `measure-which-tab-renders-each-field.mjs` hardcoding `ROOT` to the
    `rappels-rack-filter-class-audit` worktree, *"so it silently measured a different branch's code
    than the one you ran it in"*. Measured: **SIXTEEN scripts across ELEVEN worktrees**, all now
    fixed. *A documented instance is not a measured class* — the same discipline this file applies
    to audits, applied to its own bug reports.
  - **SILENT WHILE THE WORKTREE EXISTS, LOUD ONLY ONCE IT IS DELETED.** That asymmetry is the whole
    danger: the script runs, prints numbers, and every one of them is about another branch. Eleven
    of these had gone loud (`ENOENT`), which is the only reason they were findable at all — and a
    NEW worktree with the same name silently revives the quiet failure.
  - **FOUND BY RUNNING `scripts/oneoff/`, WHICH NOTHING RUNS.** Of the **77 static probes** there
    (no DB, no browser, no network), **71 passed and 6 did not**: two pinned to dead worktrees,
    three stale, one a CLI tool that wants arguments. This file already says an
    extracted-from-source probe with a fail-closed anchor **is** a behaviour-revert detector and
    *"is worth nothing in `scripts/oneoff/`, which nothing runs"*. Running them is the cheapest way
    to collect that.
    - **QUOTE THE RUN, NEVER THIS LINE.** The denominator moves with ordinary work: #1677 promoted
      six of these into `check:units` in the same hour and deleted them, so the same sweep against
      the merged tree reads **73 static probes, 72 passing** — the one remaining being that CLI
      tool. Both numbers are correct about their own tree. Re-derive it:
      run every `scripts/oneoff/probe-*.mjs` that mentions no supabase, browser or network.
    - **`timeout(1)` DOES NOT EXIST ON macOS**, which is what made the first attempt useless.
  - **THE STATIC SWEEP WAS ONE THIRD OF THE CORPUS, AND THE OTHER TWO THIRDS HAD NEVER BEEN RUN
    EITHER.** *Static* was the scope that made the sweep cheap, not a claim about where the rot is.
    Measured 2026-09-09: **202 probes read the DB without a browser and without writing**, and
    running all of them found **six red** — plus nine CLI tools correctly wanting arguments, one
    anon statement timeout and three scans slower than the sweep's 90s cap, **all four of which ran
    clean when re-run alone**. A concurrent sweep against one Postgres will manufacture a 57014;
    re-run a failure before believing it, the rule this file already records for a loaded box.
    - **Five were STALE BOOKKEEPING and one was a probe out of step with a fix, and NOT ONE was an
      app defect.** That matters more than the count: every one of the six *read* like a live
      regression on the surface it watches, and following any of them would have sent somebody to
      edit working code. `probe-gain-caveat-on-live-rows` predicted the pre-#1533 rule and reported
      12 misses on a safety caveat; `probe-elev-above-summit`'s self-check demanded a route that
      had since been **repaired** and printed *"the probe is broken"*; `probe-pipeline-voice-onscreen`
      reported *"does NOT render"* about a phrase a later prose sweep had removed from the **row**;
      `probe-trailhead-point-equivalence` died on `wpPlaced is not defined` because the function it
      lifts gained a dependency; `probe-segment-times-from-absent-inputs` **crashed on the answer**
      (`routes` has no `segments` column, so the shape it worried about is unreachable by
      construction); and `probe-pitch-count-vs-what-renders` lost its `splitPitchDetail` anchor to
      the ROUTE BREAKDOWN merge, which removed the split it was written to measure — deleted, since
      `check:pitch-split` covers what survives.
    - **THE REPAIR THAT GENERALISES IS TELLING THE TWO APART IN THE OUTPUT.** A `keeps` phrase that
      is no longer in the ROW is stale bookkeeping; the same phrase present in the row and absent
      from the screen is a render defect. They want opposite repairs, and reporting them alike is
      how a probe sends somebody to edit correct code. `probe-pipeline-voice-onscreen` now checks
      the row before it blames the app and prints `STALE …: update this list, do not chase the app`.
    - Likewise a **pinned example** is a claim about one ROW and rots the day the row is fixed;
      non-vacuity belongs on the SCAN (`probe-elev-above-summit` now asserts the population is
      non-empty and reports its old example as repaired, naming the script that repaired it).
    - **A SEVENTH WAS FOUND BY READING ITS OUTPUT, NOT ITS EXIT CODE, and that is the sharper
      lesson.** `probe-terrain-corpus-blind-columns` exited **0** while printing
      *"LIVE (the classifier is suppressing on that blind spot): 7"* — correct behaviour reported
      as a live defect on a safety classifier. Its blind list was a hand copy of `CORPUS_COLUMNS`
      taken **before** the blind-column repair, so it went on calling `climbing_route` unread after
      that column joined the list, and `approach_variants` unread after the classifier learned to
      read it BY KEY. Every one of the 7 quoted *"Roughly July through the first snow of October"*
      out of `approach_variants.season` — the one key the repair excludes on purpose, because
      reading it re-imports the Highway 20 mistake where a winter road closure made every route
      read as avalanche terrain.
      - It **imports** `CORPUS_COLUMNS` and `AV_PROSE_KEYS` now rather than restating them, so a
        column the app starts reading leaves the blind set by itself, and it separates *a wholly
        unread COLUMN* (a real blind spot) from *an excluded KEY* (a decision). Reads **0 LIVE**,
        with the 7 reported as deliberate and flagged `(would flip)` so the cost of the exclusion
        stays visible.
      - Injection-tested by dropping `climbing_route` from `CORPUS_COLUMNS` in place: all 7 go
        LIVE, so the probe still detects the revert the class exists for.
      - **An exit code is not evidence a probe is telling the truth.** A sweep that judges on
        status will pass over a probe whose every printed finding is wrong.
    - **THE `verify-`/`audit-`/`test-` ONE-OFFS ARE A THIRD POPULATION AND 14 OF 61 DID NOT EXIT
      0.** Nine are the same repairs one prefix over — two selecting `routes.source`, which #1020
      DROPPED; one importing `dotenv`, which this repo does not depend on; one whose import path
      was repo-root-relative (`./scripts/lib/…`), which ESM resolves against the FILE, so it had
      never once loaded; one pinning a route id that has left the catalog; one comparing the whole
      `trailheadPoint()` object and calling all 940 resolving routes different because #1231 added
      an `alt` field the destination does not depend on. Two are spent for good and were deleted:
      a Phase-3 import verifier written against `routes.state` and `routes.hazard_tags`, neither of
      which exists, and a `grade_num` parity check superseded by `audit:grade-num-drift`, which
      asks the same question and is REPORT-ONLY because most disagreements are not defects.
    - **A ONE-SHOT BEFORE/AFTER VERIFIER MUST KNOW WHEN IT IS SPENT, and two did not.** These diff
      the working tree against `origin/main`, so the day the change merges every *"was meant to
      change and did not"* fires — about work that is already on main. `verify-policy-edit`'s own
      header **predicted exactly this** (*"pinned to one edit's set, it goes stale the moment that
      edit merges"*) and then shipped that edit's set as the default, so running it bare reproduced
      the failure it warns of; it reports **SPENT** now, and the gone/present assertions, which are
      true forever, still run. `verify-sling-rack-synonym-widening` guarded only against the whole
      FILE being identical — so any unrelated edit to `RouteDetail.jsx` got past it and the run
      ended on *"the widening changed nothing it was aimed at"*. It compares the three lifted
      FUNCTIONS now. **Spent and failed want opposite reactions**, and a verifier that cannot tell
      them apart sends somebody to look at a renderer that is fine.
    - **AND A PINNED VALUE ROTS THE SAME WAY A PINNED ROW DOES.** `verify-policy-edit` tested for
      the literal `POLICY_VERSION = "2026-08-19"` and so reported *"not bumped"* the moment the
      NEXT policy edit bumped it — the exact opposite of what it means. It reads both sides and
      requires the tree's version to be newer than the base's.
      `verify-grade-parser-equivalence` exited 1 on **4 differences this file records as the
      intended improvement** (*"differed on exactly 4 inputs, all `null` -> a correct value"*);
      they are declared now, so an UNEXPECTED difference is still loud and a declared one that
      stops differing fails as **stale**.
  - **THE FIRST SWEEP MEASURED NOTHING AND SAID SO UNIFORMLY: all 77 exited 127.** macOS has no
    `timeout(1)`. *When every case in a sweep shares one result, suspect the sweep* — the rule this
    file already records for a case-sensitive `LIKE` that refused 25 of 39 pins.
  - **`node --check` PROVES A FILE PARSES, NOT THAT IT RUNS**, and the repair relied on that
    distinction twice. Inserting the two imports after the last `import` line put them **after
    first use**, because these probes carry an `ENTRY` template literal full of `import` lines
    further down — every file parsed, and `path is not defined` at runtime. The applier anchors on
    the last import ABOVE the pinned path and then asserts, structurally, that both bindings are
    declared before first use.
  - **AND CHECK WHAT THE CONSTANT IS CONCATENATED WITH.** One pinned root ended in a slash, so
    `ROOT + "ClimbMatchCore.jsx"` became `/repoClimbMatchCore.jsx` the moment it was replaced with
    the slashless module-relative form — including once inside a template literal that esbuild
    resolved. `path.join`, and run the file.
  - **The guard would fire on its own injection harness, and that is the harness's problem.** A
    literal pinned path in `inject-script-root-cases.mjs` is exactly what the guard forbids, so the
    case builds the string from parts. Comments are stripped before matching, so this entry and the
    guard's own header do not trip it. Injection-tested **5/5**; **two cases must stay SILENT** — a
    comment naming the shape is documentation, and the module-relative form is the prescribed
    repair.
  - Fails **closed** on a walk that finds fewer than 200 scripts: a walk that matched almost nothing
    prints the same clean line as a clean tree.
- **`check:doc-paths`** asserts that every file path THIS DOCUMENT names still exists. The ~133
  paths under `scripts/`, `lib/`, `.github/workflows/` and `supabase/migrations/` are not
  decoration — they are the **evidence** for the claims around them (*"proven by
  `scripts/oneoff/probe-gain-caveat-on-live-rows.mjs`"*), so a path that has gone is a claim
  nobody can check. Static, no
  browser, no DB, milliseconds, so it sits in `npm run build`.
  - **THE DOMINANT CAUSE IS PROMOTION, AND THE WORST OUTCOME IS REBUILDING SOMETHING THAT EXISTS.**
    A probe proves a class, gets promoted to a `check:` and **renamed in the same commit**, and the
    citation keeps the dead path. Measured when this was written: **5 of 108 `scripts/` paths were
    stale and FOUR were promotions** — `probe-overlays-that-assert-absence` → `check-overlay-absence`
    (#1319), `probe-inbox-outage-copy` and `probe-friends-outage-copy` → `check-outage-copy`
    (#1293), `probe-verification-survives-its-own-read` → `check-verification-fallback` (#1289).
    A reader chasing any of them finds nothing and may write it again, which this file records
    happening to `DbAreaTree`. The failure message therefore **names that cause first and suggests
    the successor by basename**, rather than only reporting the absence — the lesson
    `check:column-drift` paid for, where the remedy was the half nothing tested.
  - **`check:guard-wiring` asks the REVERSE direction and cannot see this**: it proves every guard
    on disk is *named* in the command block. These are ordinary script paths in prose, not
    `npm run` names.
  - **The roots are limited deliberately.** `catalog/` is gitignored (~52MB of regenerable JSON,
    `cc1461f3`) and `research-data/` holds triage dumps, so a path there is legitimately absent
    from a fresh checkout and flagging it would be reporting correct work. Scoped to what git
    always carries, an absence is always a defect.
  - **ORDER AN EXTENSION ALTERNATION LONGEST-FIRST — the measurement behind this guard got it
    wrong TWICE.** `(?:mjs|js|json)` matches `.js` inside `.json` and reported
    `schema-snapshot.js` missing; `(?:…|js|jsx)` did the same to every `.jsx`. Both printed a
    confident wrong count. *A count is only as good as its tokeniser*, which this file already
    records for `audit:approach-scope` — arriving here in a doc scan.
  - `GONE` records paths named deliberately though absent, and a **stale** entry fails, so it
    cannot rot into a description of files that are back. One today: the notice that reads *"It
    replaces `scripts/oneoff/measure-horizontal-overflow.mjs` (#818)"*, where the sentence is
    ABOUT the file being gone and deleting the citation would delete why `check:overflow` exists.
  - **IT CAUGHT ITS OWN DOCUMENTATION ON THE FIRST RUN, and that is a constraint rather than a
    bug**: this entry originally illustrated the point with a made-up `probe-x` path under
    `scripts/oneoff/` — written out in full, which is why it matched — and a
    guard that asserts every named path exists cannot tell an illustration from a citation.
    **Name a REAL file when you need an example** — there is always one, and a real name is more
    useful to a reader than a placeholder. The failure message says so.
  - Fails **closed** on a pattern that parses fewer than 80 paths: a doc scan matching nothing
    prints the same clean result as a correct one.
- **`check:injection-anchors`** asks whether every **injection case still LANDS**. A suite is the
  PROOF that a guard can fail, so a case whose anchor no longer occurs in its target file proves
  nothing: the harness reports *"edit never landed"* or `HARNESS BUG`, **nothing runs
  `scripts/oneoff/`**, and the guard goes on printing `ok` with one of its rules exercised by
  nobody. Static — one Babel parse per suite, no browser, no database, and **no guard executed** —
  so it sits in `npm run build`, at **0.86x `check:policy-claims`** taken back to back on one box,
  best of two. **Quoted as a ratio because the clock here is fiction**: that reading was taken at
  load average 446 on 4 cores, where this file already records a profile being off by 4x.
  - **NEVER RUN `npm run build` WHILE AN INJECTION SUITE IS IN FLIGHT — this gate made a third
    kind of overlap fatal.** This file already forbids **committing** mid-suite (#1190 shipped
    whichever revert happened to be live) and forbids **two runs of one suite** overlapping. This
    guard adds a build gate that reads the very files suites MUTATE, so an ordinary build now
    collides with them: run concurrently with `inject-overlay-absence-cases`, it reported
    `ROTTED … "  calOpen: 'Calendar" -> 0 matches` — on a tree where that string is present, because
    case 2 replaces exactly that string and the scan read the file mid-edit.
    - **A rotted anchor and a mid-edit read print IDENTICALLY**, and the failure message's three
      causes cannot separate them, so it sends a reader to repoint a case that is fine. `grep` the
      anchor on the clean tree before acting on this guard's verdict.
    - Deliberately **not** fixed by having the guard detect concurrency: a lock would have to be
      shared by 89 suites and this file already records a lock being the fix for the sibling
      hazard. The rule is the repair — one at a time.
  - **THIS HAD HAPPENED FOUR TIMES AND EVERY ONE WAS FOUND BY ACCIDENT.** This file already records
    the `check:units` promotion finding **two** cases still naming `lib/units-pref.js` after the
    guarded read/write folded into `lib/prefs.js` — *"reported HARNESS BUG on every run, of which
    there were none"* — and `audit:rappel-claims`' `--inject=capacity` handing its guard a
    self-contradictory route and printing `ok`. *A suite nobody runs rots exactly like a guard
    nobody runs*, so the rot has to be visible from somewhere that DOES run.
  - **FIRST RUN: 12 ROTTED ANCHORS ACROSS 6 SUITES, AND NOT ONE WAS AN APP DEFECT.** Every one was
    a proof that had quietly stopped existing, and each rotted a different way — which is why no
    single reading would have found them:
    - **A FOLD.** `inject-date-format-cases` ×3 anchored on the validated read, the validated write
      and the try/catch when all three were INLINE in `lib/date-pref.js`; that file's own comment
      records the fold. **Superseded, not a coverage hole** — `inject-prefs-fold-cases` proves the
      same three properties against `lib/prefs.js`, where the code now lives, so the three were
      deleted with that citation rather than repointed. Re-adding them would be two suites
      asserting one question, the four-grade-parsers shape.
    - **A REFACTOR, three times.** The `toposUnavailable` inline ternary became the exported pure
      `topoEmptyCopy()` (the change `check:topo-outage-copy` records), rotting **all four** cases in
      `inject-outage-flag-reach-cases` at once, since they share one `READ` constant — so that
      guard's entire rule set was proven by nobody. `trailheadFt()` split into
      `trailheadPin()` + `trailheadFt()`. `TrustBreakdown` gained its `rows`/`failed` props,
      changing both its signature and the expression it maps.
    - **A UI TIER ADDED.** The compatibility card gained a third branch (*"Limited overlap"*), so a
      two-branch anchor missed.
    - **A RULE REWRITTEN, and this is the one to read.** `0178` gave approving a group request a
      REAL write for real rows, so `check:preview-claims` stopped demanding the caveat and started
      forbidding any CLAIM, and the caveat moved to the card. The heading correctly dropped its
      claim — which left the case anchored on text that no longer exists, so **the new rule's FAIL
      branch was proven by nothing**. Its `expect` had gone stale in the same way and would have
      read `WRONG FAILURE` even had the anchor matched. **Rotted twice over**, which is why the
      failure message says to check the case's expectation against the guard's CURRENT failure text.
  - **WHAT IT DOES NOT PROVE, stated in the guard rather than implied:** that a case still
    reproduces the defect it names. An anchor can match while the surrounding code has moved on —
    the `--inject=capacity` shape — and only RUNNING the suite finds that. It is also silent about
    a stale `expect`. It answers the mechanical half, which is the half answerable without running
    anything; every repointed case here was then verified by running its suite.
  - **MY OWN SCANNER REPORTED THE WRONG THING THREE TIMES, which is the entry's own subject
    arriving in the instrument.** A first count of **28** rotted was **78% my own resolver** — the
    suites address their targets through module consts, `path.join`, bare `join`, `new URL(…)`,
    `FILES` maps and key strings, and every shape I had not handled read as a dead anchor.
    **Babel's `traverse` never visits the node it is given**, so for the common
    `edit: (s) => s.replace(A, B)` the OUTERMOST replace was skipped and its anchor silently
    unchecked — it walks manually now, and that fix is what surfaced four of the twelve. And a
    `ROOT + "lib/ground-checked-pins.js"` concatenation left the path sentinel glued to the front; stripping it
    introduced a **TDZ** crash that made the guard exit non-zero while printing **0 rotted**, a
    false clean caught only because a fixed count changing to zero was implausible.
  - **DO NOT MEASURE WHILE A SUITE IS RUNNING.** This file already says not to COMMIT mid-injection
    (#1190) and the same applies to reading: a run of this guard that overlapped a suite reported
    **7 rotted** against an app file the suite had mid-edit. Both hazards are the same one.
  - **AMBIGUITY IS A READING LIST, NOT A DEFECT, AND IT IS REPORTED RATHER THAN COUNTED.** 18
    anchors match more than once. Anchors from `split`/`replaceAll` are excluded outright, being
    global by construction; of the rest, the **7 present before the `edit:` shape was covered were
    read** and every one is a first-match `replace` where any of the matches serves the case. The
    other 11 are NOT claimed to have been read — which is exactly why they print as a list for a
    person rather than failing the build. **A guard failing on these would argue with correct
    work**, and a count here would imply a verdict nobody has reached.
  - Fails **closed** three ways, each of which otherwise prints identically to a clean sweep: fewer
    than 50 suites walked, fewer than 250 cases or 300 anchors parsed (the conventions could be
    renamed out from under it), and any anchor it cannot resolve — an unreadable case is reported,
    never skipped.
  - **It prints what it does NOT cover**, the *a known quantity beats an absence nobody can see*
    precedent `check:overlay-discovery` sets: **554 anchors across 535 cases in 86 of the 96
    suites** on the day it shipped, plus the count of cases that replace a whole file and so have
    no anchor to rot. The rest declare no case object it can read. **Quote the run, not this
    line** — every one of those numbers moves with ordinary work.
  - Injection-tested **7/7** (`scripts/oneoff/inject-injection-anchor-cases.mjs`). **Its corpus
    cases use a DISPOSABLE FIXTURE suite rather than a real one, and that is forced rather than
    tidy**: the guard scans every `inject-*.mjs`, so a case mutating a real suite mutates the very
    anchor the guard reads out of it — the first version did that and the guard truthfully reported
    the injecting suite as rotted on every case. The fixture is asserted absent before and after.
    **Two cases must stay SILENT** (a comment quoting a dead anchor, and an anchor matching more
    than once), and the harness refuses any expectation that already appears in the healthy run.
  - **READING ITS OWN "what it does NOT prove" AS A WORKLIST FOUND ONE SUITE SCORING ON THE EXIT
    CODE ALONE.** The header above says it is silent about a case that fails for a different
    reason, and this file records that rule twice over — *a case judged on the exit code alone is
    satisfied by a run that died for an unrelated reason*, and *an injection that produces a
    different failure is not a catch*. `inject-area-surface-cases.mjs` was that case: it ran
    `check:area-surfaces` with `stdio: "pipe"` and **discarded the output** (`catch { failed =
    true; }`), so its six failing cases — which cut six different links: the fetch, the render
    gate, the world/country/state scope, the Directions link, its `area_type` gate, the caveat —
    were all scored identically as *"the guard exited 1"*. That guard also fails **closed** with
    its own exit 1 (*"Nothing below was actually checked"*), so a case that merely truncated the
    source would have read `ok`.
    - **LATENT, NOT LIVE, and saying which is the point.** Measured before anything was changed:
      all six cases fired **exactly their own rule and exactly one rule each**, so nothing was
      being mis-reported that day. What was missing was the harness's ability to TELL — the defect
      arms itself the moment a case's edit starts tripping a neighbour, or the guard grows another
      closed path. **A suite that cannot say WHICH rule it proved has not proved one.**
    - Each case now names the guard's own sentence for its rule, and **EXACTLY ONE problem is
      required** rather than *"mine is among them"*: a case tripping its own rule and something
      else is not a clean attribution either, and demanding one is what makes the fail-closed
      branch visible.
    - **Non-vacuity proven three ways and every one OBSERVED, because a change that only ever
      prints more `true` is worth nothing**: a deliberately mis-aimed expectation reports the rule
      that really fired; an edit renaming the declaration outright is refused; and an edit that
      truncates the source is reported as *"the guard hit its FAIL-CLOSED branch"*. **The old
      harness printed `ok` for all three** — each exits 1, which was all it read.
    - **A CLASS OF ONE, so no detector.** All 107 suites were swept for one that never reads the
      guard's stdout: **2 hits, and one is a FALSE POSITIVE of the scan** —
      `inject-strip-subquery-cases.mjs` lifts a pure function and asserts its return values
      directly, so it spawns nothing and has no output to read, which is the *stronger* form.
    - **AND THE DETECTOR THAT LOOKED BIGGER WAS MEASURED AND REJECTED — do not re-derive it.**
      CLAUDE.md carries **85** `injection-tested N/N` citations, 60 of which name a suite, and a
      guard comparing each N against that suite's case count sounds like the *a stated number is a
      hand-copy* class. It is not worth building: **5 genuinely drifted and 4 of the 5 UNDERSTATE**
      the coverage that exists, which is the harmless direction — a doc claiming 6 cases where the
      suite runs 7 misleads nobody about a rule going unexercised. **The instrument was wrong on a
      sixth**, which is the more useful half: `inject-nul-byte-cases.mjs` runs its fourth case
      **written inline below the `CASES` array**, so a counter reading only the declared array
      reports a correct citation as drifted. *Measure the class, and then measure the instrument,
      before building the detector.*
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
    A stable per-control key would be better and is not available: this codebase packs many
    declarations onto one physical line, so a line number does not identify a control, and
    handler text repeats verbatim (`()=>openRoute(r)` many times over). A stale baseline
    (higher than reality) **fails**, so bookkeeping cannot quietly re-open room for
    regressions.
  - **THE ONE-FOR-ONE SWAP IS NO LONGER A BLIND SPOT, because the sweep finishing made a
    stronger assertion possible.** A count cannot see "fix one control, add another in the
    same file" — the number does not move. That was unavoidable at 247 remaining. It is not
    now: every one of the 62 left is classified, so the guard asserts the CLASSIFICATION
    rather than the number. **A control that is neither a BACKDROP (measured style,
    `{...styles.x}` spreads resolved and quotes normalised) nor listed in `DUPLICATES` with a
    reason is a NEW defect whatever the count says.** A stale `DUPLICATES` entry fails too.
  - **ORDER IS LOAD-BEARING HERE FOR THE SECOND TIME.** The count blocks call
    `process.exit(1)`, so with the classification test placed after them a swap that also
    perturbed the count fired the *regression* block and exited before the classification
    ran — the injections reported **`guard pass` on the very case it exists for**. It runs
    first now, the same fix the inert check needed. Whichever block exits first is the only
    one anyone reads.
  - Injection-tested 4/4 (`scripts/oneoff/inject-clickable-swap-cases.mjs`). Case 2 is the
    swap: convert a declared duplicate AND un-convert another control, so the count is
    unchanged and only the classification can see it. Case 3 must **pass** — a new backdrop
    is correct. **A parse error is not a catch**: the first harness scored two cases on
    malformed JSX that never reached the guard's logic, so invalid JSX is now rejected as a
    harness bug rather than counted.
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
  - **A separate, WORSE class is held at ZERO rather than baselined: a control that
    ANNOUNCES itself and does not work.** A bare `<div onClick>` is invisible to a screen
    reader — announced as prose and skipped. An element carrying an **interactive** role is
    announced as a usable control, so the app asserts it works; with no key handler, or no
    tab stop, that assertion is false. Being told a button exists and having it do nothing is
    worse than never being offered it, so it does not get to sit in a baseline and be worked
    off later. There was exactly one — the reaction chip in `ClimbMatchCore`, announced
    "Add a reaction", reachable by Tab, inert on Enter — and it is fixed, so zero is holdable.
  - **Scoped to INTERACTIVE roles on purpose** (`button`, `checkbox`, `link`, `tab`,
    `menuitem`, `switch`, `radio`, `option`). `role="dialog"` on a modal container needs
    neither a tab stop nor a key handler and there are **~54** of those across these files; a
    check that flagged them would be instructing authors to break correct markup — the same
    failure as the 13 phantom shields, from the other direction. Injection case 3 pins it.
  - **ORDER IS LOAD-BEARING, and it shipped wrong first.** The count blocks call
    `process.exit(1)`, so with the inert test placed after them, a commit that both added a
    mouse-only control *and* announced an inert one reported only the count — the inert
    finding was unreachable in exactly the situation it exists for. It reported zero on a
    clean tree throughout, which is indistinguishable from working. **Only the injections
    caught it**: both real-defect cases came back `guard pass`. It now runs FIRST. Same
    principle `check:field-renders` records — whichever block exits first is the only one
    anyone reads.
  - Injection-tested 4/4 (`scripts/oneoff/inject-inert-control-cases.mjs`), judged on whether
    the **inert section specifically** fired rather than on exit code: these edits also perturb
    the mouse-only count, and judging on exit code made a correct run read as a failure.
  - **The baseline is a count, so it does not say what is LEFT — measured, because the
    difference decides what the next sweep should touch.** `scripts/oneoff/measure-clickable-remainder.mjs`
    classifies every remaining control by its **measured inline style**. Do not read the
    baseline as a to-do list.
  - **THE SWEEP IS FINISHED, and the 62 that remain are all deliberate.** Measured: **58 are
    modal backdrops** that must never get a tab stop, and the other **4 are avatars sitting
    beside a sibling that runs the IDENTICAL handler and is already named** — a second tab
    stop to the same destination is noise, not access. `scripts/oneoff/apply-keyboard-triad.mjs`
    reports **0 convertible, 0 shadowed callees, 0 undefined handlers** across all three app
    files. A number here is not a backlog; check what it is a number OF before sweeping.
  - **The applier resolves the CALLEE through Babel scope, and that is not defensive.** Two
    scopes in `ClimbMatchCore` declared a **local `clickable` that is a boolean gate**, so
    wrapping their handlers produced `clickable(<boolean>)` — `"clickable2 is not a function"`,
    and the error boundary replaced the entire Challenges panel. **`check:refs` passed the
    whole time**: the identifier WAS bound. A binding check cannot tell *bound* from *bound to
    something callable*, so scope resolution is the only thing that catches it.
  - **`onClick={cond?undefined:fn}` is inert as a handler and a CRASH once converted**, because
    `clickable()`'s key handler calls `onClick(e)` unconditionally. Make the SPREAD conditional
    (`{...(cond?{}:clickable(fn))}`), which says what the ternary said: with no handler, this is
    not a control.
  - **THE NAME CHECK WAS TOO NARROW THREE TIMES, and every one failed CAUTIOUSLY** — a smaller
    sweep, a plausible-sounding backlog, nothing red. That is why none of them announced itself,
    and why all three were found by reading real markup rather than by reasoning about the
    checker. An accessible name is computed from **all descendant text**:
      - **direct children only** called `<div><div>{pubName(c)}</div></div>` unnamed and hid
        **22 convertible controls**, which #1054 then reported as needing editorial decisions.
      - **components stay opaque** — `<Av/>` renders an image with no text, and that IS why the
        avatar announced as an unnamed button. This one is correct; keep it.
      - **fragments were not descended** — `<>…</>` has no element name, so a labelled chip read
        as unnamed.
  - **Name a control from the expression the row ALREADY renders**, never a restatement:
    `aria-label={"View "+pubName(c)+"’s profile"}`, so the announced name cannot drift from the
    visible text when one is edited. Where several identical controls sit in a row, take the
    index they already have (`"Open photo "+(i+1)`) — a row of identically-named buttons
    announces as indistinguishable.
  - **Classify by style, never by the handler's name.** Proven on `RouteDetail`:
    `setView(null)` reads like a close button and **is a backdrop**, while
    `setPhotoLightbox({ph,key})` reads the same shape and **is a real control**. Naming would
    have put both in the wrong bucket, in opposite directions. The measuring script resolves
    `style={{...styles.overlay}}` spreads and normalises quotes — without that it contradicted
    this file about `GpsSubmissionModal`'s two overlays, and **this file was right**: their
    style lives in a shared object and is written `position:'fixed'`, single-quoted.
  - **A `role` without a tab stop is usually `role="dialog"` and is CORRECT.** A scan for
    "role but no tabIndex" returns 54 across these files and ~all are dialog containers, which
    need no tab stop. Flagging them would be a guard that tells you to break working markup.
    The shape actually worth finding is **role + tabIndex + NO key handler** — announced,
    reachable, and inert, which is worse than a bare div because the app claims it works.
    There was exactly one (the reaction chip in `ClimbMatchCore`, `aria-label="Add a
    reaction"`), and it is fixed. That element is also why the guard counted 130 where a
    role+tabIndex-skipping scan counted 129 — **the two scans disagreeing is what found it.**
  - Verified in a browser, not just statically — a focused area row (`South Central Utah ·
    1365 climbs`) opens on Enter. The static check cannot prove that; it only proves the
    attributes are present.
  - Injection-tested: reverting one `{...clickable(…)}` to a bare `onClick` fails naming the
    file and line. Gated by `npm run build`.
- **`check:overlay-width-cap`** asserts that every **opaque full-screen view is drawn in the app's
  own 520px column**. Static, so it sits in `npm run build`.
  - **THE APP HAS NO RESPONSIVE LAYOUT, and that is the finding this rests on.** Measured across
    `index.html` and the three app files: **one** width media query in the whole codebase — and it
    is `prefers-reduced-motion` — and **zero** `:hover` rules (the single `hover` hit in core is a
    comment recording a tooltip that was *removed* for phones). The app is one 520px column,
    centred, declared twice: `maxWidth:520,margin:"0 auto"` on App's root and `max-width: 520px` on
    `#cm-boot`. On a phone it fills the screen; on a 1440px monitor it is the identical column with
    ~460px of bare `C.bg` each side.
  - **`position:fixed` is positioned against the VIEWPORT, not that column**, so an opaque
    full-screen view with no cap stretches the whole window while the app behind it is a strip.
    **21 did** — Manage areas, Edit profile, Guide dashboard, Calendar, Messages, Become a listed
    guide, All areas, Challenges and lists, Moderators, Event, Blocked climbers, Past crews, and
    the guide screens' own loading and error states.
  - **THE CLASS IS 23, NOT THE 13 THIS FILE USED TO RECORD, and the difference is SCOPE.** The
    "13 opaque full-screen views" counted elsewhere in this document is scoped to the three app
    files; **`lib/*.jsx` holds nine more**, several of them the loading and error states of screens
    whose wrapper lives in core. Capping a wrapper and not its loading state makes the screen
    visibly **jump width** as the lazy chunk lands. Same [[grep-the-app-not-just-the-db-layer]]
    shape, applied to a layout census.
  - **THREE properties are required and the third is the one that was missed.** `max-width` sizes
    the **content** box, and this app sets no global `* { box-sizing: border-box }` — `index.html`'s
    reset covers html/body/button only. So a capped view that also carries padding renders at
    **520 + padding*2**. Measured in Chrome: `DbGuideDashboard` and `DbGuideApply` came back at
    **552px** (520 + 16 + 16) while a scan checking only `maxWidth`+`margin` reported them capped.
    **The static check only agrees with the rendered box once `boxSizing` is required.**
  - **The same defect was already live on a panel nobody had touched.** `PolicyUpdateNotice`
    carried `maxWidth:520,margin:"0 auto"` **and** `padding:"14px 16px …"`, so it had been
    rendering at 552px — overhanging the column it was meant to line up with by 16px each side.
    Its height is unaffected (no height is set), so `check:bottom-panels`' reservation is untouched.
  - **THREE exemptions, each with a reason, and a STALE one FAILS.** A **media** surface is
    full-bleed on purpose here — the photo lightboxes already are — so `lib/FireMap.jsx` keeps the
    whole window, and its **Suspense fallback** is exempt with it because the two must match or the
    screen jumps width the moment the chunk lands. The map is matched **by file**, since its zIndex
    is a variable (`zIndex: Z`) and there is no literal to key on. The third is the **full-screen
    route map** (`GPXMap`'s fullscreen branch), and the reason it is exempt rather than capped is
    **consistency**: capping it would put two maps in one app at two different widths, which is a
    worse desktop/phone difference than the one the cap exists to fix.
  - **THE DETECTOR ANCHORED ON `style={{` AND THE ROUTE MAP WAS OUTSIDE ITS CENSUS ENTIRELY.**
    That matches a **literal** style object, and `GPXMap` writes
    `style={fullscreen?{position:"fixed",inset:0,…}:{position:"relative"}}` — a **ternary**. So the
    guard reported *"23 views, 21 capped, 2 exempt"* while the app has **24**, and the missing one
    was a genuine member of the class carrying `inset:0` and `background:C.bg`. **A coverage hole in
    a guard prints identically to a clean tree**, which is the `check:overlay-discovery` shape
    arriving inside a guard I had shipped four days earlier.
    - **It was found by asking the geometric question INDEPENDENTLY, not by reading the guard.**
      `scripts/oneoff/census-fixed-position-elements.mjs` classifies **every** `position:fixed`
      style object in the app — 83 of them, by balancing braces from the declaration rather than
      relying on any attribute shape — into CAPPED / SCRIM / CENTRED-NARROW / FULL-BLEED. Six of
      the seven full-bleed ones are documented scrims, lightboxes or the fire map; the seventh was
      the route map. **A guard's own census cannot be the thing that audits the guard's reach.**
    - The anchor is `style={` now, and each top-level object inside the expression is judged
      **separately**. Judging the **union** of a ternary's branches would be wrong in the dangerous
      direction: one branch can carry the cap while the other is the full-bleed one, and the union
      would read as capped.
    - **Strictly additive, measured before shipping**
      (`scripts/oneoff/measure-ternary-style-blind-spot.mjs`): fixed style objects **81 → 82**,
      views **23 → 24**, and **exactly one** newly reachable view. Nothing that was passing starts
      failing, so the widening cannot be hiding a regression behind a bigger number.
    - Brace balancing now **skips string and template contents**, so a `` `1px solid ${C.border}` ``
      cannot desynchronise the depth counter. The old scanner survived that by luck — `${` and `}`
      happen to balance — and would have broken on a brace inside a plain string.
  - **A GATE rather than a probe**, for the reason `check:verification-fallback` and
    `check:topo-outage-copy` record: this fix changes only style **properties** and no identifier,
    so `audit:silent-reverts` is blind to it by its own closing caveat. A stale-base squash could
    put all 21 back to full-bleed with no name moved and every other guard green.
  - **TWO floors, because ONE cannot see a PARTIAL break** — and a partial break is how a shape
    test actually dies, which `check:control-names` already records. Reformatting **one** file's
    `style={{` to `style = {{` renders identically in React — whitespace around a JSX attribute's
    `=` is legal — is invisible to `check:refs`, and drops that file's views silently; on
    `ClimbMatchCore` alone that is **24 → 17** views, so the view floor trips. The first draft had
    a single floor of 15 and the injection **MISSED**, which is what sized them. **Residual, stated
    rather than papered over:** a file holding a *single* view can be reformatted without tripping
    either floor; a per-file expectation would catch it and would be bookkeeping that rots.
    - **The mutation the case injects HAD to change with the anchor.** It used to be
      `style={{` → `style={ {`, and the widened anchor **survives that**, so the case started
      reporting MISSED against a guard that had just got stricter. It is kept, expectation flipped
      to **must stay SILENT**, so the robustness is asserted rather than incidental: a future
      rewrite back to the literal shape fails it. **When a detector is widened, its injection cases
      are claims about the OLD detector until they are re-aimed.**
  - **Proven in a browser rather than argued.** `scripts/oneoff/probe-overlay-width-cap.mjs`
    measures the rendered rect at 1440 and 390: **14 measurements, 520px at left 460 on desktop,
    390px on a phone.** It waits on the overlay APPEARING rather than on a timer — the first run
    had one overlay mount on a phone and not on desktop at a flat 1400ms, and *a skipped overlay is
    indistinguishable from a passing one*. It fails closed under 6 measurements, which is what
    caught that.
  - Injection-tested **8/8** (`scripts/oneoff/inject-overlay-width-cap-cases.mjs`), each case
    proving its edit landed **by checksum** and restoring the file byte-identically. **Three must
    stay SILENT** — a backdrop scrim is *meant* to cover the whole window and its inner panel
    carries its own cap, a capped view that gains an unrelated property is still capped, and the
    inner-brace reformat above is one the widened anchor now survives.
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
    "+ Create an event" button — `GROUPS` was empty behind `DEMO_FILLERS` **and that flag is TRUE
    since #1566**, so today it is `joinedGroups` starting empty that produces this, and the early
    `return` skips `setCalOpen(false)`. Still the **zero state**, not an edge case; the toast
    fix is unaffected either way.
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
