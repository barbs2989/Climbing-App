# Honesty of what the screen claims

Guards that hold copy to what the app can actually do: legal surfaces, the profile and résumé, offline promises, preview-only controls, the match %, the trust score and its factors, rendered sources.

Part of the guard notes — see [README.md](README.md) for the full index.

- **`check:policy-claims`** asserts that **no legal surface claims a control or a capability the
  app does not have**, and that **the version a reader SEES is the version recorded against their
  account**. Static (one esbuild bundle, one SSR render), **1.6s CPU** against 1.69s for
  `check:topo-outage-copy` beside it, so it sits in `npm run build`.
  - **THREE of the four surfaces**, and the third was added by reading this guard's own stated
    limitation as a worklist. The **in-app privacy sheet** matters more than its lack of a policy
    label suggests — the packet's Q7 calls it the place the privacy decision is actually made,
    because it opens from Settings **and from partner search**, carries no review disclaimer and
    is not versioned. It is an inline array rather than a named constant, so it is lifted by
    balancing brackets from its first heading, with the same skip-string-contents care the other
    two get. **Surface 4 (scattered copy) is covered too now, and section 5 covers what the two documents say about a crew's float plan — see the sections below.**
  - **SURFACE 4 — SCATTERED COPY: A DESTINATION MUST EXIST.** This entry read *"still by hand"*
    for the life of the guard, which is the
    [[a-stated-limitation-is-a-worklist-not-a-caveat]] shape sitting inside the guard that records
    it. Reading it as a worklist found **three** wrong claims at once, and **not one is a legal
    surface** — an ordinary sentence anywhere in the app can send a climber to a Settings section
    or a profile field, and nothing checked that the place it names is there.
    - **The FAQ promised a Settings control with three states.** *"Is my emergency contact
      private?" → "Yes. You control who can see it in Settings — keep it private, share with your
      crew only, or show it to partners."* Three claims and no control. Measured: `profiles` has
      **no `*contact*` column** (24 columns), `openEdit`'s draft has **14 keys and none is a
      contact**, and `emergencyContact` is **READ once** — the crew float plan — and **WRITTEN by
      nothing**. The sign-in reset sets it to `""`, so for every real account it is empty and
      unfillable, and the four privacy controls that DO exist are behind `PRIVACY_CONTROLS_LIVE`
      (false), i.e. **absent**, not disabled.
    - **A toast pointed at that same absent field.** *"Float plan saved. Add an emergency contact
      in your profile…"* is the branch that fires for **every real signed-in climber**, because
      `_contact` is `ME.emergencyContact` and nothing can set it. That is
      `check:profile-claims` §3's *"Raise it with: a step that CANNOT BE TAKEN"* class, arriving in
      a safety toast — and it is the **residue of a correct fix**: the handler's own comment
      records W8 refusing to store placeholder prose (*"Store what is true or store null"*), and
      having correctly stored `null` it then told the climber to go and fill in a field that does
      not exist.
    - **THE THIRD IS WHAT MAKES THIS A CLASS RATHER THAN A CLASS OF ONE, and it supplies the
      general rule.** Partner browse said *"you can list yourself under Settings → Privacy"* — the
      control is **real and works** (`List me in partner browse`, gated on
      `USE_DB&&uid&&myProfileRowQ.data`, not on the flag); the **section** is called *"Privacy &
      safety"*. A true statement about a heading that is not there is still a dead end, and it is
      the member that turns *"do not promise an absent emergency-contact control"* into
      **a Settings path must name a destination Settings renders**.
    - **THE DESTINATION VOCABULARY IS READ FROM THE APP, never restated** — the `<SL>` headings
      plus the row labels harvested from the Settings region. A restated vocabulary is how this
      codebase ended up with four grade parsers, and here it is also what keeps the rule SHARP in
      both directions: *"Privacy"* is a **prefix of** the section *"Privacy & safety"* and matches
      no label, so it fails; *"Delete my account"* is a prefix of the button *"Delete my account &
      data"*, so it passes. **A path may legitimately name a control rather than a section**, and a
      rule that demanded a section would have flagged correct copy.
    - **SETTABILITY IS DERIVED, IN BOTH DIRECTIONS, so 4b cannot rot.** The day an emergency
      contact becomes settable — a `profiles` column or an editor field — directing a climber to
      set one is **correct**, and the section reports a **MOVED PREMISE** rather than going on
      forbidding a claim that would then be true. A hardcoded *"there is no such field"* would be a
      guard forbidding the fix, which is the shape this file records for `check:profile-claims`'
      own stale assertion.
    - **4c IS THE LOAD-BEARING HALF: a rule that only forbids is satisfied by deleting the line.**
      The FAQ must still ANSWER the question a climber asked **and still name where a contact
      actually goes** (the float plan, whose own copy already says *"Nothing leaves your phone
      until you share it"* — a verified claim rather than a minted one), and the toast must still
      say plainly that ClimbMatch will not raise the alarm.
    - **THREE FALSE POSITIVES IN THE FIRST DRAFT, all flagging CORRECT work**, which is the
      direction that teaches people to ignore a guard. A greedy path match read *"Settings → Your
      data to export your data"* as a section called *"Your data to export your data"* (longest
      known prefix fixes it); the control-vs-section distinction above was missing, so a stored
      **provenance note** (`raiseDataRequest(…, "Requested from Settings → Delete my account")`,
      never shown to a climber) read as broken copy; and 4b's own skip test matched `m[0]`, which
      begins at *"emergency"*, so the **negation that makes the honest form honest sits BEFORE the
      match** and *"There is **no** emergency-contact field on your profile"* flagged itself.
    - **The window and the match must share a string.** The second attempt at that skip sliced its
      window out of the RAW source while matching on the comment-stripped one, so it printed inline
      **markup** at you instead of the sentence. One string, or the window describes a different
      file.
    - **A PREFIX-OF-A-QUOTED-STRING TEST WAS MEASURED AND REJECTED** rather than reasoned about:
      accepting a phrase that is a prefix of any quoted string would have been vacuous here,
      because `"Privacy` appears **twice** in `ClimbMatch.jsx` as an ordinary quoted string.
    - Fails **closed** four ways, each of which otherwise prints identically to a clean run: fewer
      than 5 section headings, fewer than 3 row labels (a path naming a control would then read as
      naming nothing and the section would flag correct copy), a missing `setEditDraft({…})` anchor
      or a draft that parsed short, and **zero Settings paths found anywhere** — a scan that matched
      nothing proved nothing.
    - Injection-tested **8/8** (`scripts/oneoff/inject-scattered-copy-cases.mjs`), each case proving
      its edit landed **by checksum**, restoring the file byte-identically, and judged on the
      guard's **own FAIL lines**; the harness captures the clean run first and refuses any
      expectation already present in it. Three cases are the real historical strings restored
      verbatim. **Three must stay SILENT** — a comment quoting the forbidden path (section 4 strips
      comments, or it fails on its own documentation), a path naming a **control**, and the FAQ
      answer **reworded honestly**, since a guard pinned to one phrasing forbids improving it.
  - **SURFACE 5 — THE CREW FLOAT PLAN: TWO LEGAL SURFACES PROMISED SOMETHING NO CREW MEMBER IS
    SHOWN.** Section 4 covers scattered copy; this is the same class on the surfaces that ARE legal,
    and it is the finding #1748 deliberately **reported rather than fixed** as feature work. It is
    not: the *feature* would be showing a crew the plan, and the *defect* is three sentences of copy.
    - **The Privacy Policy listed an emergency contact among what the app collects** (*"climbing
      logs, optional emergency contacts, the home area you type in"*) — while §4b's own derivation
      says nothing can set one, and while the FAQ #1748 shipped says in as many words *"There is no
      emergency-contact field on your profile."* **One app, two documents, opposite claims.**
    - **It then said the contact reaches your crew**: *"If you file a float plan with a crew, your
      emergency contact is shared with that crew so they can raise the alarm if you do not return."*
    - **The in-app sheet claimed MORE, including a field that does not exist in the record**: *"A
      float plan you share is seen by your crew so they know your route and return time — it
      includes your emergency contact, so they can raise the alarm if you do not come back."*
      `crews.float_plan` is `{filedAt, contact, returnBy}` and **carries no route at all.**
    - **MEASURED TWICE, and the second measurement is the one nothing had made.** `onSetFloatPlan`
      writes `contact: ((ME.emergencyContact||"")+"").trim() || null`, so for **every real signed-in
      account it stores null** — 24 `profiles` columns with no `*contact*`, 14 editor draft keys with
      none, and the sign-in reset setting it to `""`. And **no screen reads a property off the stored
      object**: `filedAt` and `returnBy` occur only in the write, the seed row and one comment, and
      every `crew.floatPlan` access in the app is a **truthiness test** driving one button's label,
      colour and cursor (`crew.floatPlan?"✓ Float plan set":"⚠ Set float plan"`).
    - **THE APP'S OWN SAFETY COPY WAS ALREADY HONEST, which is the unusual direction here.** The
      float-plan toast reads *"ClimbMatch can't alert anyone for you"* and the form says what you
      type stays on your phone. The two **legal** surfaces were the ones contradicting it — so a
      climber comparing them would trust the wrong one, since a policy reads as the authority.
    - **BOTH PREMISES ARE DERIVED, so section 5 INVERTS rather than rotting** — the two-directional
      shape `check:profile-claims` and §4b already use. Settability comes from the `profiles`
      snapshot and the editor's own draft; *is the plan rendered* comes from **the write**: the
      stored keys are lifted from `updateCrew(cid,{floatPlan:{…}})` and the rule asks whether any of
      them is ever taken **off** something. **`contact` is deliberately dropped from that test** —
      the eleven-field float plan FORM has a field of that name too, so it is not distinctive to the
      stored object and would report the form's own renderer as a crew-facing one.
    - **A WRITE NAMES THE KEY; A READER TAKES IT OFF SOMETHING.** That distinction is the whole
      renderer test: the write and the seed row both spell `filedAt:`, and only a screen writes
      `.filedAt`. The day one does, the section reports a **MOVED PREMISE** and stops forbidding a
      claim that would then be true. Two injection cases pin the two halves separately, because a
      settable contact and a rendered plan want **different repairs**.
    - **MENTIONS ARE JUDGED PER SENTENCE, NEVER BANNED, and the sentence that forced it is TRUE.**
      *"Emergency contacts are never shown on your public profile"* is accurate and still misleading,
      because it implies there is one being withheld; *"there is no emergency contact on your
      profile"* is the honest form and must pass. A word ban cannot separate them and a **required**
      phrasing forbids improving the copy, so a sentence naming a contact — or naming an alarm — has
      to carry its own honesty: an absence, a device-local destination, or a denial.
    - **SENTENCES ARE SPLIT INSIDE EACH STRING LITERAL, never across the lifted array source.** A
      split that ran over `"],["` would weld two policy entries together and could borrow a
      **neighbour's** honesty marker — a false pass, which is the direction that matters.
    - **THE DISCLOSURE IS THE LOAD-BEARING HALF, AND THE INJECTION FOUND MY RULE MISSING IT.** These
      sentences exist because something a climber types really does land on a **row other crew
      members can read** (`crews` RLS is `status <> 'pending'` since `0180`), and a policy silent on
      that discloses **less** than the false version did. The first version of the non-vacuity check
      asked only whether the Privacy Policy still named a float plan and still said the form is
      device-local — so `disclosure-deleted`, which removes the CREW clause and leaves the
      device-local half standing, came back **MISSED against a guard I had just written**: it had
      stopped saying anything about who else can read what you filed, and every remaining assertion
      passed. The rule now requires that sentence too. *A forbid-only rule loses the sentence about
      OTHER PEOPLE first, because that is the only one the forbidding half does not touch.*
    - **COMMENTS ARE MASKED WITH BABEL** rather than stripped by regex — this section's own
      explanation names the property access it forbids, and this file records three checkers being
      fooled in one day by the comment written to explain the fix they were checking. The
      offsets-preserving blanker is unsafe here for the reason `check:overlay-discovery` records.
      Injection case `SILENT-comment-quoting-the-access` is what proves the mask, and it is free only
      because the mask is real.
    - Fails **closed** four ways, each of which otherwise prints identically to a clean run: a moved
      `updateCrew(cid,{floatPlan:{…}})` (**ANCHOR LOST** — without the write the section cannot say
      what a crew stores), fewer than two distinctive keys parsed (the renderer test could not fire,
      and its silence would read as *"no screen shows it"*), a file Babel cannot parse or that
      reports under 50 comments, and fewer than 60 sentences lifted out of the three surfaces.
    - Injection-tested **8/8** (`scripts/oneoff/inject-crew-float-plan-claim-cases.mjs`), each case
      proving its edit landed **by checksum**, restoring the file byte-identically, and judged on the
      guard's **own FAIL lines**; the harness captures the clean run first and refuses any
      expectation already present in it. Three cases are the real historical sentences restored
      verbatim. **Two must stay SILENT** — the comment above, and the honest sentence **reworded**.
    - **REPAIRING THE COPY ROTTED AN ANCHOR IN THE OLDER SUITE, AND `check:injection-anchors` IS WHAT
      CAUGHT IT.** `inject-policy-claims-cases.mjs`' `collect` case is about **§1's absent location
      enablement** and merely used the surrounding sentence — which happened to contain *"optional
      emergency contacts"* — as its unique anchor. Taking that phrase out left the case matching
      **0 times**, i.e. proving nothing, with its guard still printing `ok`. Re-anchored on the new
      sentence with its `expect` untouched, because **the phrase was the anchor and never the
      subject**; cause 1 of that guard's own message, *"the code MOVED — repoint the case"*.
      *A case anchored on a NEIGHBOURING sentence rots when that sentence is repaired, even though
      the property it proves has not moved an inch.*
    - **AND MY OWN FIRST READING OF THAT FAILURE WAS WRONG IN THE EXPENSIVE DIRECTION.** I grepped
      the guard's output for `fail` and the top hit was
      `inject-read-failure-cases.mjs … -> 2 matches` — a line from the **informational**
      multi-match section, matched only because the word *failure* is in the **filename**. On that
      reading I nearly filed *"main's build is red and it is not mine"*, and went as far as
      stashing the work to test a pristine tree. Pristine main exits **0**: multi-match anchors are
      listed, not fatal. *A grep is only as good as its pattern* — read the guard's own FAIL
      SECTION, never a line that merely contains the word.
  - **THE FIX IT GUARDS CHANGES STRINGS AND NO IDENTIFIER, which is exactly the revert nothing else
    can see.** #1522 rewrote Privacy §4 and §1; `audit:silent-reverts` tracks named definitions and
    says in its own closing caveat that *"a merge that kept a name and dropped its guard clause is
    invisible here"*. A stale-base squash could restore four false claims **to a legal document**
    with every guard green and no name moved. Same argument that promoted
    `check:verification-fallback` and `check:topo-outage-copy`.
  - **§4 promised FOUR things the app cannot do, not one.** A location toggle that renders nowhere
    (all four privacy controls are `PRIVACY_CONTROLS_LIVE?…:null`, i.e. **absent**, not disabled);
    *"You control location sharing"* when there is no control; *"if you opt in — float plans and
    search-and-rescue"* when a float plan carries `{filedAt, contact, returnBy}` and the **route's**
    coordinates rather than the climber's position, and the only SAR content in the app is `SARS`,
    a directory of phone numbers you dial yourself. **And §1 carried the same absent enablement**
    (*"approximate or precise location when you enable it"*) — fixing §4 alone would have left it
    one section above, the *an instance fixed by hand is not a class closed* shape.
  - **Section 1 is the DURABLE half and section 2 the ANTI-REVERT half**, and they are different
    questions. Section 1 asks the general thing — does either document describe a control the flag
    withholds — so it catches the NEXT instance; section 2 pins today's exact clauses so a squash
    cannot quietly undo them. Section 1's needle is deliberately narrow: *"we use approximate
    location"* is a statement about PROCESSING and is correct, while *"you control location
    sharing"* is a claim about a switch. Matching the mere word would flag every honest sentence.
  - **A CAPABILITY claim is a different question from a CONTROL claim, and the sheet made one.**
    *"You can edit or clear anything from your profile and settings at any time"* was false twice
    over: `saveEdit` guards `name` and `username` with `if (d.x && d.x.trim())`, so a blank is
    **skipped** and the old value survives, and the avatar had a change control and no remove — so
    the sheet contradicted a product decision taken hours earlier.
    - **THE AVATAR HALF IS CLOSED, AND THE PRODUCT DECISION WENT THE OTHER WAY.** The user was
      asked directly and chose to **add the remove control** rather than narrow the sentence, so
      *"clear anything"* is now true of the avatar. `removeProfileAvatar` is `removeProfilePhoto`'s
      sibling — one column in, one column out, reference dropped before the storage object, throws
      rather than resolving on a refusal — and `check:photo-removal` section 3 proves all of it by
      EXECUTION plus the four-link control/prop chain by source. Injection-tested **6/6**
      (`scripts/oneoff/inject-avatar-removal-cases.mjs`), one of which must stay SILENT.
      **Do not re-record the absence as deliberate**; the `saveEdit` blank-guard half of this
      sentence is untouched and is what the assertion still rests on.
    The assertion has
    **two branches**, because a rewrite that stops over-claiming and also stops saying anything is
    the drift it exists to catch, and that would pass a test which only looked for the old
    sentence. Asserted as **source rather than rendered**: this sheet is inline in `App` rather
    than in `LegalView`, and standing up App is far more than the question is worth — stated in
    the guard rather than implied.
  - **Two of the sheet's claims were measured and HOLD, recorded so they are not re-derived.**
    *"Direct messages and crew chats are visible only to the people in that conversation"* is
    **RLS-enforced** rather than merely true of the UI — `0042` gives `messages` a SELECT policy of
    `auth.uid() = sender_id or auth.uid() = recipient_id` and `crews_messages`
    confirmed-member-or-creator. And the name-vs-handle claim rests on the four-surface
    inconsistency that is already an **open product decision**, so it is not this guard's to
    settle.
  - **MEASURING IT HIT THE DOCUMENTED DESTRUCTURED-PARAMS TRAP.** Balancing braces from
    `function PartnerSearch({…})` returns the **parameter list** — 196 characters — not the body,
    which is **35,762**. This file already records that exact failure making an overlay probe
    report 150 characters of signature as a component. Find the `)` that closes the params first.
  - **Section 3 was a semantic invariant living in a COMMENT.** `lib/policy.js` says the version a
    user sees and the version recorded *"cannot drift"* — and **nothing asserted it**. It now
    renders the policy and requires `policyVersionLabel(POLICY_VERSION)` to be on the screen, so a
    reader can see which version they are being asked to accept.
  - **DELETING the location section was the other option and is WORSE**, recorded so it is not
    re-derived: it leaves the policy silent on location while the app reads device position from
    four call sites. Every clause section 2 asserts is measured — `profiles` has a `location` TEXT
    column and **no lat/lng**; `useNearbyAreas`/`useNearbyPeaks` query `areas` by the map's lat/lng
    box, so the corners of the view **do** reach the backend and *"it never leaves your device"*
    would have been false; and `climb_logs.gpx_track` is written and read back, so a GPS track
    attached to a logged climb **is** stored. **The first draft of the replacement said "we store
    no device location against your account" and was itself false** — caught by reading the SCHEMA
    rather than re-reading the sentence. *Check the columns before writing a negative claim into a
    privacy policy.*
  - It supersedes two `scripts/oneoff/` probes that ran nowhere
    (`probe-privacy-location-onscreen`, `probe-policy-promises-vs-live-controls`) — the
    *a verification nobody runs is not a verification* promotion this file records for
    `check:overflow` and `check:pitch-discount`.
  - Fails **closed** six ways, and each prints identically to a clean run: a missing
    `PRIVACY_CONTROLS_LIVE`, **zero gated controls found** (with none, every promise comparison
    passes vacuously), a legal surface that lifted short, a failed bundle, a missing `LegalView`,
    and a render under 2,000 chars — against which every *"must NOT contain"* assertion passes.
  - **ITS OWN FIRST VERSION HAD TWO DEAD BRANCHES, and they read exactly like coverage.** Section 1
    paired each promise to a gated control by **fuzzy name match**, and 2 of the 4 entries never
    connected — `"Show my online status"` against the app's `Toggle online status`, and
    `"Who can see my full profile"` against `Who can see your profile`. Those two could not fire
    **whatever the documents said**, and a green run looked identical either way. Found by asking
    the guard's own table which entries resolve, not by reading it. The key is now the control's
    **exact aria-label**, and a promise naming a control that is no longer gated **fails as stale**
    — so a rename is loud instead of silently costing a question.
  - **FIXING THAT IMMEDIATELY CAUGHT A LIVE DEFECT HOURS OLD, WHICH IS THE ARGUMENT FOR THE WHOLE
    GUARD.** #1535 gated `showRealName` and `visibleWhileBrowsing` behind the flag — correctly —
    and **left Privacy §3 describing both**: *"Other climbers see your public profile **as governed
    by your privacy settings — your username or real name**, and the fields you choose to make
    visible."* Two clauses naming controls that now render as `null`. Nothing else would have
    noticed: gating a switch changes no document, and the document changes no identifier.
    - The replacement states what is measurably shown, **including the awkward part**:
      `pubName()` gates the display name, and the friends list and crew roster do **not** go
      through it, so a connection really does see the account name. Claiming *"your real name is
      not shown"* would have been a fresh false statement — the same trap the §4 rewrite fell into
      with *"we store no device location"*, twice in two days.
    - **The general lesson: gating a control is a change to the DOCUMENTS too.** The flag exists to
      make a promise honest; it makes a different promise dishonest one section over.
    - **AND THE INVERSE BIT WITHIN HOURS, WHICH IS THE HALF WORTH REMEMBERING.** #1540 gave that
      same switch a REAL column (`show_name`, `0175`): it persists, `pubName` honours it, and it
      is no longer gated. So the §3 rewrite above — which had removed the name choice because the
      control was absent — became **false in the other direction**: *"others see your username"* is
      wrong the moment a climber turns it on. **Un-gating a control changes the documents too.**
      Both edits were correct when made; a policy sentence is only true relative to a build.
    - **§3 was NOT simply restored, and measuring is what decided that.** The original implied the
      choice governs everything. It does not: `FriendsList` and `CrewCard` still mix `pubName`
      with a bare `.name`, so **a connection sees the account name whichever way the switch is
      set**. §3 now states the choice AND that limit — the part the original never said and the
      part a climber would most reasonably assume otherwise. Injection case `s3limit` pins it,
      because dropping the limit is the tempting simplification: the sentence reads more cleanly
      and is quietly misleading.
    - **The stale assertion was REMOVED, not reworded.** *"§3 must not offer a name choice"* was
      correct while the control was gated and became a guard **forbidding the policy from
      describing a live privacy control** — arguing with correct work, the failure this file
      records under half a dozen names. An assertion kept past the fact it describes is stale
      bookkeeping wherever it lives, including inside a guard.
    - **A CASE CAN REPORT `MISSED` WHILE THE GUARD IS INNOCENT.** `s3limit`'s first `expect`
      matched the text the assertion prints when it **passes** (`ok    …states the LIMIT of it`)
      rather than its failure message, so the case went red against a guard firing correctly with
      exit 1. Reproduced in isolation before anything was changed — *"the guard missed"* and *"my
      expectation was wrong"* are indistinguishable from a red case, and this repo has read one as
      the other twice.
  - **A same-day amendment does not move a DATE version**, and that is stated rather than papered
    over: §3 changed hours after §4 under the same `POLICY_VERSION`, so an account that accepted
    earlier in the day has a record pointing at slightly different words. Inherent to a date-based
    version, which `lib/policy.js` chose deliberately and for good reasons; worth knowing before a
    real launch, not worth inventing a counter for at three accounts.
  - **THAT IS NOT A RULE AGAINST BUMPING, AND IT WAS READ AS ONE.** The paragraph above is about
    an amendment a DATE version cannot express — two edits hours apart — so no bump could have
    made those records true. It says nothing about a change on a LATER day, where the date moves
    cleanly and the record becomes true by bumping. #1755 gave Privacy §3 a genuinely new
    disclosure (opening a profile names the people you have both connected with) and left
    `POLICY_VERSION` at `2026-09-03`, twenty days behind — so every stored
    `terms_accepted_version` claimed the account had agreed to words it was never shown. Bumped
    in #1767. **`lib/policy.js` states the rule in its own header — *"Bump this whenever either
    document changes materially"* — and the test is whether the DATE can express the change, not
    how many accounts exist.** The cost is real and is the mechanism working: `PolicyUpdateNotice`
    renders for every signed-in account until they accept again, which is why `check:bottom-panels`
    exists to keep it from covering the footer.
  - Injection-tested **11/11** (`scripts/oneoff/inject-policy-claims-cases.mjs`), each case proving
    its edit landed **by checksum** and restoring the file byte-identically. Case 1 is the real
    historical §4 text, restored verbatim; `s3names` is the real §3 one. **`staleentry` pins the
    dead-branch defect above** — renaming a gated control must report a BROKEN scan rather than
    quietly losing a promise. **`flaglive` must stay SILENT** — flipping `PRIVACY_CONTROLS_LIVE`
    to true makes the controls real, so describing them becomes correct, and a guard that still
    fired would forbid the fix.
- **`check:profile-claims`** asserts that the **Profile tab and the résumé it opens claim only what
  the app can support**. Three invariants, all fixed on 2026-09-03 (#1573, #1579, #1580). Static
  (one esbuild bundle + one SSR render, plus a Babel parse), **~1.5s**, so it sits in `npm run build`.
  - **THE RÉSUMÉ IS A SHARED AND EXPORTED DOCUMENT** — *Share résumé* and *Export PDF* sit on it —
    and it claimed *"partner- and community-corroborated"* **unconditionally**, so on the CI
    fixture's own résumé, with nothing logged and no courses, it was false of everything on the
    page. The same claim was also made **twice**, once in the header and once in the footer.
  - **`extra` RENDERED AS `live`, THROUGH THE SAME ROW.** EXPERIENCE is
    `[...baked, ...live, ...extra]`, where `live` is `climb_logs` rows against a route id and
    `extra` is the *Add to résumé* form — six free-text/select inputs, **no route id, no
    verification, no source marker**. Type "The Nose / El Capitan / 5.9 / Lead" and it sat there
    looking like a logged ascent.
  - **THE MARK IS "added by hand", DELIBERATELY NOT "self-reported".** A logged climb is
    self-reported too, so reusing the courses vocabulary would imply `live` rows are corroborated
    — fixing one false claim by making another. It is tagged at **composition**
    (`...((extra)||[]).map(e=>({...e,selfAdded:true}))`) rather than in `addClimb`, because
    `extra={resumeFor.id===0?resumeAdds:null}` means everything arriving that way is hand-typed by
    construction and a future caller of `onAddExtra` cannot forget the flag.
  - **THE DEMO TICK.** `onVerifyCourse` is a pure client-state flip on `resumeCourses`
    (`useState(ME.courses||[])`, never persisted) — nothing is checked — and its button already
    read **"Verify (demo)"**. What it PRODUCED did not: a green `✓ verified` chip identical to a
    real one, over a toast asserting *"Credential verified"* as fact, on avalanche and
    wilderness-first-responder certs. **It was the one outlier to a convention the app already
    has** — seven-plus toasts say *"this preview doesn't route requests to …"* or *"(simulated in
    this preview)"*, including its own two siblings on that screen — and the app has a **real**
    credential flow elsewhere (`guide_documents` + `isGuideVerified`, which re-checks expiry at
    render), so two different things wore the same ✓.
  - **THE DEMO CHIP KEEPS A LEADING ✓ AND THE GUARD ASSERTS THE CHARACTER, NOT THE WORDING.**
    Dropping it produced *"AIARE 1verified (demo)"* in the announced text — the glued-name defect
    `check:a11y-badges` exists for, since the course name is the previous inline span. The greying
    and the "(demo)" suffix carry the honesty instead. Same reasoning put the "added by hand" mark
    as plain text inside the existing muted sub-line rather than a chip after the grade.
  - **"RAISE IT WITH:" OFFERED A STEP ALREADY DONE.** The trust card renders a fixed row of three
    — Log a route / Verify email / Add a cert — and it was unconditional, so an already-verified
    climber was told verifying would raise their score. **The app knew**: the handler opens
    `if(verified){showToast("You're already verified.");return;}`, and the résumé two inches away
    reads *"✓ Email verified"* off the same value (`ME.verified=verified`; `Resume` takes
    `const ver=climber.verified` off `meLive`). **HOME ALREADY DID THIS CORRECTLY** — its setup
    checklist pushes the verify row only `if(!ME.verified)` and every other row there is
    conditional too — so this list was the outlier, not the rule.
  - **The gate is ONE, deliberately.** A third array element carries the condition and the list is
    filtered on it; "Log a route" and "Add a cert" stay unconditional, because both are always
    worth doing and hiding them would remove real advice. An injection that gates "Log a route"
    must FAIL, or a guard asserting only that the gate exists is satisfied by gating everything.
  - **SECTION 3 IS PARSED WITH BABEL, NOT MATCHED WITH A REGEX, and that is this session's most
    expensive lesson made structural.** Three separate checkers were fooled the same day by the
    comment written to explain the fix they were checking — `check:fire` and a float-plan probe
    each went RED on a correct tree from one comment quoting `{tab==="safety"?…}`, and a
    demo-verify probe went the other way, **passing on a fully-restored defect** because the
    comment contained `demo:true`. An AST does not see comments at all. Where source must be read
    textually here (the `onVerifyCourse` handler), comments are stripped first.
  - Fails **closed**: fewer than 5 app sources resolved (via `appSources`, which names any missing
    required file rather than quietly reading fewer), a render under 900 chars — every *"must NOT
    contain"* assertion passes against a page that rendered nothing — fewer than 200 array
    literals parsed, and the list or handler anchors going missing.
  - **A BUILD GATE RATHER THAN THREE PROBES, and the reason is the shape of the fixes.** All three
    change **strings and conditions, not names**, which `audit:silent-reverts` says in its own
    closing caveat it cannot see; a stale-base squash could restore every one of them with each
    existing gate green. Same argument that promoted `check:verification-fallback` and
    `check:topo-outage-copy`. It supersedes `probe-resume-self-reported-rows.mjs`,
    `probe-resume-demo-verify-says-so.mjs` and `probe-raise-it-with-hides-done-steps.mjs` —
    *a verification nobody runs is not a verification*.
  - Injection-tested **10/10**, each case proving its edit landed **by checksum** and restoring
    every file byte-identically. Cases 1, 4, 5, 7 are the real historical defects. **Three cases
    are over-reach in the other direction** — marking every row hand-added, gating "Log a route",
    and dropping the chip's leading glyph — because a mark applied to everything says nothing, and
    a guard that only ever demands MORE marking would drive exactly that.
  - **A FOURTH INVARIANT, AND THE GUARD'S OWN ASSERTION WAS FORBIDDING IT.** Section 3 was written
    for *a step already DONE*; **"Add a cert" is the same defect arriving by the other route — a
    step that CANNOT BE TAKEN.** The server model scores club/guide credentials off
    `verification_records` at `status='verified'`, and **nothing in this app can write one**: `0085`
    pins every client write to `'pending'` and `verify_my_email()` is the only definer that writes
    `'verified'`, hardcoding `'email'`. So under *"Raise it with:"* a signed-in climber was told to
    do something that could not move the number above it.
    - **IT WAS TRUE WHEN IT WAS WRITTEN, which is the whole lesson.** The card then showed
      `vScore`, and the **CLIENT** model scores `(c.certifications||[]).length` — the very array
      `openEdit` edits — so the row genuinely raised it. **#1676 pointed the card at the SERVER
      score and falsified the advice beside it without touching this file.** *A promise is only
      true relative to a build*, which this file already records for `check:policy-claims` §3 —
      arriving here as a claim broken by a change to a **different** subsystem.
    - **AND THE GUARD HAD GONE STALE WITH IT.** Section 3 asserted *"Add a cert stays
      unconditional"*, correct under the client score and, once the card moved, **an assertion
      keeping a false claim alive and failing the fix**. That is the shape `check:policy-claims`
      records (*"the stale assertion was REMOVED, not reworded"*), this time **inside a guard**.
      When a guard argues with a repair, ask what its assertion was written against.
    - **DERIVED, NEVER TYPED.** The rule asks `scripts/lib/verification-reach.mjs` which types some
      definer can set to `'verified'`, so it is **two-directional by construction**: while nothing
      can attest a credential the row must be gated, and **the day one can, the guard demands the
      row back**. `credential-becomes-verifiable` is that case — a guard holding a hardcoded *"certs
      are impossible"* stays quiet there and is wrong.
    - **`!uid` is exactly the line between the two models** (`myTrustScore` is the server score
      whenever there is a uid and `vScore` otherwise), so the **demo keeps the row** — a cert really
      does raise the number there. Gating it globally would have removed correct advice.
  - **SECTION 4 — THE BADGE BESIDE EVERY CLIMBER NAMED A SCALE THAT DOES NOT EXIST.** `TrustBadge`'s
    tooltip read *"Trust score (0–100): built from **ID verification**, partner vouches, belay
    catches logged, climbs logged and **certifications**"* — leading with the two components that
    are 0 for everybody forever, and stating a range wrong twice over: the model caps at **99**, and
    only **84** of its 104 points can be earned at all. The rule is the same derived one, plus two
    that keep it honest: a **non-vacuity** floor (the tooltip must still name ≥3 inputs a climber
    can move, or "corrected by deletion" passes) and **no hardcoded range** — a literal scale bound
    typed into a title string is a hand-copy nobody re-derives, which is how the old one came to
    describe a scale that had never been measured.
  - **THE TIERS WERE MEASURED, THE QUESTION WAS PUT TO THE USER, AND IT IS ANSWERED — this bullet
    said "deliberately NOT touched" for longer than that was true, and it was the LAST surviving
    copy of a claim two other entries had already recorded going stale.**
    `scripts/oneoff/measure-trust-goal-against-ceiling.mjs` bundles the app's own model and parses
    the migrations: **ceiling 84, day one 5, partnerless 54**, with `ID verified 0/10` and
    `Certifications 0/10` unfillable — all still true, and all still worth re-running rather than
    quoting. Against that, the card's *"/ 90 goal"*, its *"goal met"*, its *"✓ Well-trusted"* and
    the badge's *"Highly Trusted"* (≥90) **were all unreachable — no climber could ever be shown
    any of them** — and *"Trusted"* (≥70) was barely better.
    - **#1740 FIXED THEM.** One derived `TRUST_TIERS` at **65 / 33 / 15**, `TRUST_GOAL` derived
      from its top tier, and `check:trust-breakdown` **section 7**, which **BOUNDS** every bar
      (reachable, and not handed out for confirming an email) while deliberately pinning no
      particular number — so it cannot argue with the next rebalance. That entry records the
      climber states each bar is anchored to; read it rather than re-deriving them here.
    - **READING THIS PARAGRAPH AS LIVE WOULD HAVE RE-RAISED A CLOSED PRODUCT DECISION, and the
      likeliest "fix" it invites is restoring 90 and 70** — which is the one outcome memory
      records as explicitly forbidden. That is the stale-bookkeeping class this file names
      everywhere else, sitting in its own pages: *a stated gap that has since closed sits in the
      worklist looking like work.* Its own worked example had inverted too — at 33 the climber it
      describes scoring **65** now reads *"Trusted"*, not *"Building Trust"*.
    - **Nothing reconciles two entries that describe one fact**, which is why this survived while
      `check:trust-breakdown` §6 and §7 both recorded the same claim expiring. **When a limitation
      here is acted on, replace it with the measurement — and grep for the other copies**, because
      a decision stated in prose is a hand-copy wherever it lives.
  - Injection-tested **10/10** for these two sections
    (`scripts/oneoff/inject-profile-claims-reach-cases.mjs`), each case proving its edit landed **by
    checksum**, restoring byte-identically, and judged on the guard's **own FAIL lines** — the
    harness captures the clean run first and **refuses any expectation already present in it**, the
    structural form of a mistake this repo has made twice. **Three must stay SILENT**: a reworded
    tooltip (a guard pinned to one phrasing forbids improving it), a comment quoting the pre-fix
    entry (section 3 reads the list through Babel, so comments are invisible — three checkers here
    have been fooled by the comment explaining the very fix they were checking), and an unrelated
    new row.
  - **SECTION 5 — THE GRADE PYRAMID ON SOMEBODY ELSE'S PROFILE CLAIMED TO BE LOGGED CLIMBS, AND
    CONTRADICTED THE HEADING DIRECTLY BENEATH IT.** `FullProfile` renders one section two ways.
    Viewing **yourself**, `AscentPyramid` is handed `climber.__selfLogs` — real logs — and *"Your
    sends by grade"* is true of them. Viewing **anyone else** that prop is undefined, so the
    component takes its `else if(pyramid)` branch and totals `climber.pyramid`, a stored career
    summary — under a caption reading *"Climbs logged at each grade"*, with `Logged Climbs · N`
    printed a few lines below off `seedHistoryFor`.
    - **MEASURED ACROSS EVERY CLIMBER THAT RENDERS IT, rather than spotted on one**
      (`scripts/oneoff/measure-pyramid-vs-logged-climbs.mjs`, which composes the unexported
      `seedHistoryFor` out of the two exports it is built from rather than retyping the rule, and
      fails closed on an empty side — re-run it rather than quoting the figures here): 5 seed
      climbers carry a pyramid and **0 of 5 agree** with their own logged count — Sam Rivera **26
      against 4**, Riley Nguyen 42/4, Alex Torres 74/7, Maya Chen 113/9, Jordan Park **126 against
      6**. A systematic 10-20x gap is not inconsistent seed data, it is two different records, and
      the caption named the wrong one. *Compare a suspect against the rows that pass* — here none
      passed, which is what settles it.
    - **FOUND BY READING A CI `ui-screens` CAPTURE, not by a scan**, the technique this file
      already credits for the seed-identity bug and the glued `Recently climbed` row. Nothing could
      have flagged it otherwise: the column is populated, the section renders, every number is a
      number, and both halves are individually correct — only their combination is a lie.
    - **DERIVED, NOT A WORD BAN, and the SILENT cases are what prove it.** The rule holds only
      while the non-self branch is fed by `pyramid` rather than by logs; hand that branch real logs
      and *"logged"* becomes a true description and the guard goes quiet, without anyone editing the
      rule. Same shape as sections 3 and 4, which re-derive from the migrations. A guard that
      forbade the word outright would forbid the fix.
    - **NON-VACUITY, because a rule that only forbids is satisfied by deleting the sentence:** the
      caption must still run past 20 characters and still say it is about grades or sends. Two
      injection cases pin that — an emptied caption and a bare *"Grades."* both fail.
    - **THE SIBLING WAS MEASURED AND IS CLEAN, so this is a CLASS OF ONE rather than one of N.**
      The Classic climbs Leaderboards badge (the highpoints and peaks ones were removed) is `seedHistoryFor(pp).filter(…).length + (pp.X||0)` and their
      notes say *"logged"* — but **no seed climber carries a stored `classics` or
      `peaks` number**, so every badge value is entirely real ticks and the wording is correct
      there. The `+(pp.X||0)` term is inert today. *A detector for a class of one is the thing this
      repo keeps refusing to build*, which is why this is an assertion inside the guard whose
      subject it already is rather than a new one.
    - Injection-tested **6/6** (`scripts/oneoff/inject-pyramid-caption-cases.mjs`), each case
      proving its edit landed **by checksum**, restoring `ClimbMatchCore.jsx` byte-identically, and
      judged on FAIL lines only; the harness refuses any expectation already present in the green
      run. Case 1 is the real caption restored **verbatim**. **Two must stay SILENT** — a different
      honest wording, and *"logged"* once the branch really is fed logs.
- **`check:offline-claims`** asserts that **an offline promise is backed by the write that makes it
  true**. Static (Babel over the two app files plus a source read of `lib/db.js` and
  `lib/offline.js`), so it sits in `npm run build`, at **1.34x `check:policy-claims`**.
  - **QUOTED AS A RATIO, NOT A CLOCK, and that is not hedging.** Taken back to back with
    `check:policy-claims` on one box, best of three. A wall-clock figure from this machine is
    fiction — the three readings for this guard alone were **30.5s, 40.9s and 45.6s** while it
    measures ~2.3s on a quiet box, and this file already records a profile taken at load 450 that
    was off by 4x. **What survives load is where a guard sits relative to a sibling measured in the
    same minute.**
    - **THE RATIO IS MORE ROBUST THAN THE CLOCK AND IS NOT LOAD-PROOF EITHER**, which is worth
      knowing before treating one as a fact. The pre-rewrite guard was recorded at **1.65x** by the
      same method; this one measures **1.34x** having gained two source reads and lost nothing.
      Some of that gap is real and some is contention, and the measurement cannot separate them.
      Read a ratio as an order of magnitude, not a regression.
  - **THIS GUARD NOW ASSERTS THE OPPOSITE OF WHAT IT USED TO, AND THE REVERSAL IS THE ENTRY.** Its
    subject was *"a route is never on the device; only a downloaded state is"*, because the app had
    two things called offline and one was a lie: `downloadStateOffline()` writes a state's whole
    subtree to IndexedDB and four `lib/db.js` hooks read it back, while `offline` in
    `ClimbMatch.jsx` was `useState([])` — a list of route ids, never persisted, cleared by the
    sign-in reset, with **nothing about the route stored**. #1585 rewrote twelve strings to say so.
    **The trip pack is a real download now**, so the copy that guard protected became false in the
    other direction and a rule still forbidding those claims would forbid the fix. Same shape as
    `check:policy-claims` §3, where gating a control made a policy sentence true and un-gating it
    made the replacement false again: **a promise is only true relative to a build**, and a guard
    pinning one has to move with it. The old assertions were *removed*, not reworded — an
    assertion kept past the fact it describes is stale bookkeeping, including inside a guard.
  - **WHAT PACKING ACTUALLY STORES, measured rather than described.** `packRouteOffline()` fetches
    the route's own row with the same `areas` embed `useRoutesByIds` asks for and puts it in an
    IndexedDB `pack` store: description, beta, approach, descent, pitch-by-pitch, gear, hazards,
    waypoints, grades and the GPX track. **NOT** photos or topo images (`contributions`/`topos` plus
    storage), **not** other climbers' condition reports (`contributions`/`climb_logs`), and **not**
    map tiles — the service worker deliberately does not touch cross-origin requests. So the card
    that lists what you have must keep naming what you do not, which is §4 and is the load-bearing
    half: **a guard that only ever demands the mechanism EXISTS is satisfied by claiming
    everything.**
  - **...AND THE PACK CARRIES A SNAPSHOT NOW (2026-09-24, user-approved), SO §4 AND §5 MOVED AGAIN
    AND §10 WAS ADDED.** `packRouteWithSnapshot()` (lib/db.js) stores, beside the row, the latest
    **20 trip reports** with their authors' public profile fields, the route's **contributions
    minus photos**, and — taken by the route page while a packed route is open online, kept under
    3 h old — the **raw forecast responses** (`lib/forecast.js`, shared with WeatherPanel so one
    parser processes live and saved data). The climber's **own itineraries** are mirrored per
    account in `meta`. Each reader falls back through `orOfflineExact`, and the two array readers
    return a `_packedAt` stamp that survives only because their hooks set
    **`structuralSharing: false`** — drop that and the saved copy renders exactly like a live one,
    the over-claim in its worst form. §10 asserts write + read + stamp + dated copy for each; the
    `stamp-lost`, `reports-fallback-gone`, `photos-in-snapshot` and `row-write-gone` injection
    cases prove it fires. "Other climbers' reports" came OFF the §4 disclaimer and the §5 deny-list
    for the same reason reports came off the not-stored list: they are stored. Photos, topo images
    and map tiles still are not. Verified end to end as a real signed-in climber with the data
    network cut by `scripts/oneoff/verify-trip-pack-offline.mjs`.
  - **THE EMBED SHAPE IS EXPORTED FROM `lib/offline.js` AND IMPORTED BY `lib/db.js`**, not written
    twice. A pack carrying fewer area fields than the network select renders **"undefined"** where
    the peak name goes — `dbRouteToCamel` builds `_dbArea` from `r.areas` whenever it is TRUTHY, so
    a thin embed both prints the word and suppresses `openRoute`'s backfill. That is a defect this
    repo has already shipped once from exactly this kind of drift, recorded under
    `check:area-name-embed`.
  - **§2 IS THE SILENT HALF AND IS WHY THIS IS A GATE.** Every route the pack, the wishlist and the
    logbook resolve comes through `useRoutesByIds`, which had **no offline fallback** — so with no
    signal it threw, `dbRouteById` was empty, `routeById()` returned undefined for every packed
    climb, and the list dropped the rows. Remove that one fallback and the write still works, the
    copy still reads correctly, nothing renders differently, **no identifier moves** — and the pack
    empties at the trailhead. `audit:silent-reverts` says in its own closing caveat that it cannot
    see a change of that shape.
  - **§3 ASSERTS AN ORDER, NOT A CALL.** The pack list is a mirror of the store, and the sign-in
    reset clears `offline` on every `uid` transition — so a hydration effect declared **above** that
    reset fills the list and is wiped microseconds later, leaving a signed-in climber with an empty
    pack whose routes are on disk. That is precisely the defect `check:verification-fallback`
    exists for, arriving on a second feature, and no render can see it. It is also why the effect is
    keyed on `[uid]` rather than `[]`: the reset fires on the transition, so a mount-only hydration
    loses the race by construction.
  - **TWO OF THE OLD GUARD'S SIX NEEDLES WERE DEAD, and it went unnoticed for the life of the
    rule.** It excused any sentence matching `\b(?:not|no|nothing|never|…)\b` as negated — and its
    own `with no signal` and `no-signal days` needles **cannot match a sentence that does not
    contain the word "no"**. Every claim phrased the most natural way excused itself, and a clean
    run looked identical to a working one. Found by the guard passing on copy it should have caught,
    not by reading it. §5 strips the no-signal idioms **before** testing for negation so the same
    trap cannot return, and the surviving deny-list is narrowed to the things that genuinely are
    still not stored. *A dead branch in a guard reads as coverage*, which this file records for
    `check:policy-claims` and `check:screen-lists` and which arrives here a third time.
  - **`indexedDB.open` WENT 1 → 2 AND THE UPGRADE IS IDEMPOTENT PER STORE, which is not
    defensiveness.** Installs in the wild hold v1 (`areas`/`routes`/`meta`) and a fresh one starts
    at 0, so a bare `createObjectStore` for the v1 set throws `ConstraintError` on the upgrade path
    — that aborts the version-change transaction, fails the open, and takes the
    **already-downloaded catalog** away from somebody who is offline. The one moment this database
    is load-bearing is the one moment a botched upgrade would break it.
    - **PROVEN, not reasoned about**: `scripts/oneoff/probe-offline-pack-roundtrip.mjs` builds a
      **v1** database by hand — the shipped v1 shape, not whatever today's code creates — fills it
      with a complete state, then reads it back through `lib/offline.js`'s own `openDb()` at v2.
      13 assertions: the catalog survives, the pack round-trips, a seed marker never leaks into
      `offlineRoutesByIds`, a packed row carries its area embed and NOT its `packedAt`, the pack
      outlives `removeStateOffline`, and the completeness gate still refuses a half-downloaded
      state by id. **No new dependency**: there is no `fake-indexeddb` here, so it ships a shim
      implementing exactly the surface `lib/offline.js` uses — deliberately STRICT where the real
      API is (`createObjectStore` on an existing name throws), because a lenient shim would pass
      the upgrade whatever the code did and be testing itself. The real `packRouteOffline` runs:
      `./supabase` is replaced by an esbuild plugin rather than the write being re-typed.
    - Nothing else in the repo could have asked this. Every offline guard here is static, and the
      browser guards walk a healthy network against a database they never downloaded to.
  - **§7 IS THE SAME DEFECT ONE LIST OVER.** Saved areas were a `useState` seeded with two seed
    ids, cleared on sign-in and written nowhere, so Home's *"Saved areas · N areas"* tile read **0**
    after every reload however many you had saved. Now device-local and keyed by account, through
    ONE `toggleBookmark` — there were two call sites holding two copies of the same three lines,
    which is exactly how the persistence would have ended up on one of them. `savedAreaIds()`
    returns **null** for "nothing was ever stored" as distinct from an empty list, or a bookmark you
    had deliberately removed comes back on the next load.
  - **The demo pack entry came OUT**, on the argument the `downloadedStates` comment beside it
    already makes: now that packing really writes, a seeded entry claims a climb is on the device
    when nothing is, and it is the one claim a climber cannot check until they are somewhere with
    no signal.
  - **A packed id the app cannot resolve now RENDERS**, rather than being dropped by
    `if(!r)return null`. The heading counts `offline.length`; a filtered list under it is one fact
    derived two ways on one screen, the defect recorded under the group roster. The placeholder row
    stays removable, or an unreadable entry is stuck in the pack forever.
  - Fails **closed**: an unreadable or unparseable source, a missing `useRoutesByIds` (`ANCHOR
    LOST`), a sign-in reset that no longer clears `offline` (which would make the ordering test
    vacuous), per-file region/string floors, and fewer than **18 assertions RUN** — a guard that
    quietly stops asking half its questions still exits 0. That floor caught its own author
    miscounting on the first run.
  - **The floors are PER FILE.** A global floor is satisfied by the other file: renaming the trigger
    in `RouteDetail.jsx` alone leaves ClimbMatch's regions standing, so the guard would report a
    clean sweep having inspected one file of two — the `check:control-names` defect, whose floor was
    *"at least one"* and which a **partial** restyle left checking 1 of 9.
  - Injection-tested **15/15** (`scripts/oneoff/inject-offline-claim-cases.mjs`), each case proving
    its edit landed **by checksum**, restoring the file byte-identically, and **naming the text its
    own failure must carry** — a case judged on the exit code alone is satisfied by a run that died
    for an unrelated reason. Expectations are matched against **FAIL lines only**, never against the
    text an assertion prints when it passes, which is a mistake this repo has made twice.
    **`honest-claim` must stay SILENT and is the case the rewrite turns on**: before the pack was
    real that sentence was the defect and now it is the feature, so a guard still firing on it would
    tell an author to delete a true statement. `disclaimer-reworded` must stay silent too — §4 asks
    whether the fact is stated, and a guard pinned to one phrasing forbids improving it.
    `read-gone` is the one to keep: it leaves write, copy and hydration intact and removes only the
    fallback.
  - **§8 — A DOWNLOADED CATALOG YOU COULD BROWSE AND NOT SEARCH.** The browse chain (states ->
    children -> an area's own routes) has had an offline fallback since the state download
    shipped. **Search had none**: `useSubtreeRoutes`, `useSubtreeRouteCount` and `useAreaSearch`
    are RPCs, so with no signal *"View all N"*, the in-area route finder and the area filter box
    each threw — you could drill down through a catalog on your own phone and never look anything
    up. The three now fall back to `offlineSubtreeRoutes` / `offlineSubtreeRouteCount` /
    `offlineAreaSearch`.
    - **NO SCHEMA CHANGE, and measuring is what established that.** The plan of record was a
      `_path` field on stored route rows plus an index, i.e. DB_VER 2 -> 3 and existing downloads
      lacking the field. Unnecessary: `areas` rows are stored with their ltree `path` already
      (`select("*")`), and routes carry `area_id`, so a subtree is a prefix test over rows the
      device has. **Every existing download gains search without being re-downloaded.** Check
      what the store already holds before costing a migration.
    - **THEY ARE A SECOND IMPLEMENTATION OF THREE STORED FUNCTIONS, and that is stated rather
      than hidden** — an offline reader cannot call an RPC, so the choice is mirroring one or
      having no search. What they must not do is DISAGREE: a filter that admits different rows
      offline is a catalog that changes when the signal drops. Four places a naive transcription
      diverges, each one a line the migrations were explicit about:
      - **`null <= 10` is NULL in SQL and TRUE in JS.** `Number(null)` is 0, so the minimum test
        happens to agree and the MAXIMUM does not — every ungraded route floods a "5.9 and under"
        search. Same for `length_m`.
      - **`pitches: 0` means "unknown" for a roped route and "no pitches" for a boulder problem**
        (0074, which exists because reading them alike hid 86% of the catalog).
      - **`desc nulls last` is not Postgres's default for `desc`.** Miss it and every unrated
        route leads a "best first" list.
      - **`path <@ root.path` is a LABEL boundary, not a string prefix** — `wa_index` must not
        swallow `wa_index_town_wall`.
    - **`orOfflineExact` IS A SIBLING OF `orOffline`, NOT A WIDENING OF IT.** That helper treats
      an empty offline result as *"nothing is stored"*, which is right for the unfiltered readers
      already using it and wrong for a filtered search: *"no route here is under 5.6"* and *"this
      area was never downloaded"* are different facts, and reporting the first as a failed read is
      a false claim of its own kind. **The COUNT is the sharpest case** — the honest answer `0` is
      falsy, so `orOffline` would rethrow on it every single time. The new helper signals absence
      with `undefined`, so `[]` and `0` are real answers. Loosening `orOffline` itself would let
      an undownloaded area serve an empty catalog as though it were the whole one.
    - **§8 IS IN THE GUARD BECAUSE THE PROBE STRUCTURALLY CANNOT SEE THE WIRING.**
      `scripts/oneoff/probe-offline-subtree-search.mjs` proves the READERS — 29 assertions that
      the offline filters admit exactly the rows the SQL admits, including all four traps above.
      It says nothing about whether `lib/db.js` still calls them. Drop one wrapper and the readers
      stay correct, the probe stays green, **no identifier moves**, and the finder throws at the
      trailhead again — the §2 silent half, one feature over, and the shape `audit:silent-reverts`
      says in its own closing caveat it cannot see. `search-fallback-gone` is that case.
    - The probe's own suite is `scripts/oneoff/inject-offline-subtree-cases.mjs`, **8/8**, each
      case proving its edit landed **by checksum** and restoring `lib/offline.js`
      byte-identically, with the lockfile / green-tree / tree-checksum safeguards the overlapping
      run of 2026-09-09 paid for. **Two cases must stay SILENT** — a comment quoting the forbidden
      shape, and the same null rule written longhand. **One case reported WRONG FAILURE against a
      correctly-firing probe**, because its expectation was the text an assertion prints when it
      PASSES; the harness now refuses any expectation that appears in the GREEN run, which is the
      structural version of a mistake this file already records twice.
    - **The IndexedDB shim moved to `scripts/lib/idb-shim.mjs`** rather than being copied into a
      second probe — two hand-maintained IndexedDBs would disagree the first time either grew a
      method. Proven behaviour-neutral: `probe-offline-pack-roundtrip` still reports 13/13.
      Re-run BOTH after touching it; a shim defect one probe does not exercise leaves that probe
      green.
    - **WHAT THIS STILL DOES NOT DO**, since it is the part a reader would otherwise assume: the
      global search box (`useRouteSearch`) has no fallback and deliberately gets none here — it
      searches the whole catalog, so an offline answer drawn from downloaded states only would be
      a truncated result presented as a complete one, which is the silent alphabetical cut 0147
      exists to have fixed. `useCountries` still has none either, and a naive one would be **dead
      code**: `downloadStateOffline` stores only DESCENDANTS of the state, so no country row is
      ever on the device.
  - **§9 — AND THE SEARCH COULD FIND SOMETHING YOU COULD NOT OPEN, WHICH IS WORSE THAN NOT
    SEARCHING.** §8 shipped the area filter box working offline and left the thing you *do*
    with a hit throwing. `areas_in_subtree` returns a **narrow projection with no ltree
    `path`**, so `jumpToArea` runs a SEQUENCE: hydrate the full row with `fetchArea`, build
    the breadcrumb from its path with `fetchAreaBreadcrumb`, find the state in that
    breadcrumb. Neither call had a fallback, both have a `.catch` that swallows the failure,
    the breadcrumb came back `[]` — and the handler **returned after `setScreen("areas")` and
    `setStateNode(a)` had already fired**. A tap that visibly goes somewhere and lands on an
    area with no ancestors and no panels.
    - **A DEFECT INTRODUCED BY THE FIX ABOVE, not a pre-existing one.** Before §8 the offline
      area search returned nothing, so there was no hit to tap. **Ask what a newly-reachable
      surface leads to**; making a list reachable makes everything downstream of it reachable
      too, and that half is easy to leave behind.
    - **THE ASSERTION HAS TO BE THE SEQUENCE.** Either link is enough on its own to dead-end
      the tap — with no `fetchArea` the breadcrumb has no path to walk — so a guard demanding
      only one would report the other as unnecessary, and a probe testing them separately
      would pass while the tap stayed broken. §9 asserts both links, and
      `scripts/oneoff/probe-offline-area-jump.mjs` **runs the handler's own steps in order**
      against the real exports.
    - **NO SCHEMA CHANGE HERE EITHER, and the reason is an alignment worth stating.** The one
      ancestor `downloadStateOffline` never stores is the **root country** — it keeps only
      descendants of the state — and that is *exactly* the label `fetchAreaBreadcrumb` drops
      before it looks anything up, because the breadcrumb does not show the country. So every
      id that survives the slice is on the device. A future breadcrumb that kept the country
      would break offline only.
    - **`useAreaNamesByIds` uses `orOfflineExact` and that is NOT interchangeable with
      `orOffline`.** Its answer is a **map**, and an empty map is **truthy** — so `orOffline`
      would substitute it for a failed read and every area name would degrade to its
      placeholder *as though it had been looked up*. `offlineAreaNamesByIds` returns
      `undefined` for a complete miss and a **partial** map otherwise, because a partial map
      is a real answer.
    - **A `fetchArea` MISS STILL REJECTS, deliberately, rather than resolving null.** That is
      what it did before, and `jumpToArea`'s own `.catch(() => null)` already handles it.
      Resolving null instead is a quieter kind of wrong: it reports a definite *"no such
      area"* for what is really a failed read.
    - **THE PROBE HAD A VACUOUS ASSERTION AND A CRASH, AND THE INJECTION SUITE FOUND BOTH.**
      *"The country is not among the crumbs"* **cannot fail**: the lookup ends in
      `.filter(Boolean)`, so an unstored id drops out whether or not the slice removing it is
      still there — it would have passed against a breadcrumb that had stopped dropping the
      country. It asserts the **fixture** instead (the country really is absent), which is
      what makes the full-breadcrumb assertion mean something. And two `await`s were unguarded,
      so the un-wrapped case killed the run at assertion 1 with **no FAIL line to match on** —
      reported as `WRONG FAILURE` against a probe that was right.
    - **A THIRD CASE CAUGHT A REAL GAP RATHER THAN A HARNESS BUG**: `offlineAreasByIds` carries
      its **own** completeness gate, and nothing reached it — section 1's half-downloaded case
      goes through `offlineArea`, a different function — so the gate could have been deleted
      with every assertion still green.
    - 13 assertions, injection suite **6/6** (`scripts/oneoff/inject-offline-area-jump-cases.mjs`),
      across **two files**, which is the point: the sequence spans `lib/db.js` and
      `lib/offline.js`. **Two cases must stay SILENT.** The breadcrumb case **guts the
      fallback rather than removing the wrapper** — deleting `orOffline(` leaves its second
      argument dangling, the file stops parsing, and the probe dies on the BUNDLE, which is a
      different failure and one this repo has twice read as a catch.
    - **Section 4 asserts the NETWORK still wins**, on the same module the offline sections
      just exercised: a fallback consulted unconditionally would pass every other assertion
      while serving a stale local row to somebody who has a signal.
- **`check:match-percent`** asserts that **the partner Match % blends what the screen says it
  blends**. Static (one esbuild bundle of core, no browser and no database), so it sits in
  `npm run build`.
  - **THE DEFECT WAS A CLAMP DOING THE WORK OF A FORMULA.** `compat()` ended `Math.min(99, …)`
    while two of its terms were UNCAPPED — shared disciplines ×16, shared objectives ×14 — and the
    BOUNDED terms alone summed to **78 of that 99**. So a climber with a broad profile saturated
    before grade contributed anything: **16 of 30 seed pairs sat exactly on 99**, a rich profile
    scored partner **5.6 and partner 5.14a identically at 99%**, and the My-Objectives pane showed
    5.10a, 5.11a and 5.12b all at 99. Three surfaces meanwhile promised a blend of five signals.
  - **THE INVARIANT IS THE EXECUTABLE FORM OF THAT SENTENCE: every signal the screen NAMES must be
    able to move the number.** That is deliberately not a check on any WEIGHT — pinning weights
    would fail on any future rebalance, which is how a guard teaches people to ignore it. It builds
    a base pair and one variant per signal and requires the score to differ; then it parses the
    on-screen list and requires every item to be a signal it just proved moves. **Reword the copy
    and the guard follows it; add a promise without wiring it and the guard fails.**
  - **ONE-DIRECTIONAL on purpose.** Everything named must be real; the reverse is not required,
    because the sentence is a summary and legitimately leaves `pace` out. Demanding equality would
    forbid that.
  - **A MAXIMAL-PAIR ASSERTION CANNOT CATCH A SINGLE UNCAPPED TERM, and the injections are what
    established that** rather than reading. With one cap reverted the rescale OVERSHOOTS and
    re-clamps to exactly the top, so *"a maximal pair scores 99"* still passes. What catches it is
    the saturation count and the swamped-signal test. Two cases were written expecting the wrong
    assertion and reported `wrong failure` against a guard firing correctly — **the third time this
    repo has recorded that verdict meaning the NEEDLE was wrong, not the guard.**
  - Fails **closed** six ways, each of which otherwise prints identically to a clean run: a moved
    `compat()` (`ANCHOR LOST`), a body that lifted short, core not exporting one of the ten names it
    needs, a seed population too thin to judge saturation, fewer than three copy surfaces found —
    which would make the copy-to-behaviour tie vacuous — and fewer than **14 assertions RUN**.
  - Comments are stripped before every SOURCE test, because this guard's own subject is explained
    in a comment beside `compat()` that quotes the forbidden `Math.min(99,` shape. A guard that
    fails on its own documentation is a trap this file records more than once.
  - **SECTION 6 — THE BROWSE ROW CALLED EVERY REAL CLIMBER A "New profile", AND HAS SINCE #612.**
    Sections 1-5 are about the number; this is about the sentence shown when there is none, and it
    needed a separate section because the row that renders it **can never reach those signals**.
    `RealClimberRow`'s own projection `_cand` hardcodes `objectiveIds:[]`, and `profiles` has **no
    availability and no pace column for anyone** — so of the four signals `compatUnknown` counts,
    exactly one can arrive. `_unk` is **>= 3 for a maximally-complete profile and a bare one
    alike**, measured by executing the row's own literal
    (`scripts/oneoff/measure-browse-row-match-percent.mjs`): 4 rows of increasing completeness,
    **0 of 4 showed a percentage**.
    - **So the score branch has NEVER rendered, `_pct` is computed and read by nothing, and the
      "· based on limited info" caveat is unreachable** — it needs `_unk` in 1..2. #612's commit
      message states the intended three states in as many words (*"A thin profile is labelled …
      rather than dressed up as a confident percentage; a partial one says 'based on limited
      info'"*), and its 8 tests exercised `compatUnknown` **directly** rather than through `_cand`,
      which is why the cap went unseen. **A fixture that can express a state the app cannot reach
      proves nothing about the app** — the trap this file already records for `check:units`' area
      type and `check:token-boxes`' tick-list id.
    - **The sentence was false TWICE.** *"New profile"* is said about an established account with
      every field filled in — the gap is the projection's, not the climber's. And *"yet"* promises
      a resolution **nothing the climber does can bring about**, since three of the four signals
      have no column. Meanwhile the **seed** partner card beside it renders a big `{score}%`, so
      the contrast is on screen: example climbers get a percentage and real ones never do.
    - **THE REFUSAL ITSELF IS CORRECT AND MUST NOT BE "FIXED" BY MOVING THE THRESHOLD.** `compat()`
      scores an absent objectives list as **ZERO, not a neutral partial**, and #612 chose that
      deliberately — it had just removed the mirror defect from **pace**, where two absences were
      collecting a *perfect* match (*"agreement invented out of two absences"*). Absence of shared
      objectives is not evidence of sharing. So a real climber sits ~20 points below a comparable
      seed climber **legitimately**, and surfacing that as a "% match" is exactly the
      confident-percentage-over-thin-data this branch exists to refuse. The repair is the
      **sentence**, and the reason is recorded beside the code so the next reader does not undo it.
    - **6a IS THE STRUCTURAL FACT AND IT FAILS AS STALE, NOT AS A DEFECT.** It lifts `_cand`'s
      literal and **executes** it — a hand-typed copy would agree with itself whatever the row does
      — and requires `compatUnknown >= 3`. Widening `_cand` (a column arrives) is correct work, and
      the failure says so while pointing at the measurement, the standard `KNOWN` and
      `PARTIAL_ON_PURPOSE` are held to.
    - **UPDATE (0207, 2026-09-25): THE COLUMNS ARRIVED, AND 6a WAS RE-DERIVED — IT FIRED EXACTLY AS
      DESIGNED.** `profiles` gained `availability`, `avail_week` and `hiking_speed_ft_hr`
      (`partners_near` and `PARTNER_COLS` return them), and `PartnerSearch` reads every row's
      objectives in ONE batched `useObjectivesOfUsers` call and hands them in as `objIds`. 6a now
      asserts BOTH halves, executing `_cand(p, objIds)`: a **complete** row scores (`_unk < 3`) and
      a **bare** row still refuses (`_unk >= 3`). A third assertion requires the `!_objReady` gate
      to precede the refusal: **an UNREAD objectives list must never score as zero shared
      objectives** — the same failed-read-reads-as-empty class `check:read-failures` polices. The
      threshold was NOT moved; the row was given the signals. Everything above about the refusal
      being correct still holds for a climber who shares little.
    - **6b/6c test the LIFTED TEXT for two forbidden claims and a length, never for today's
      phrasing** — a guard pinned to one sentence forbids improving it, which this file records for
      `check:offline-claims`' `disclaimer-reworded`. And 6c exists because **a rule that only
      forbids is satisfied by deleting the line**, which would leave the seed card's percentage
      unexplained beside a row that has none.
    - **THE INJECTION FOUND A DEFECT IN THIS SECTION RATHER THAN IN THE APP.** An **empty** refusal
      still MATCHES the anchor, and a falsiness test read that as `ANCHOR LOST` — so the deletion
      case reported a broken guard where the sentence had been removed. *"The anchor moved,
      re-point the guard"* and *"you deleted the sentence, put it back"* want opposite repairs, so
      it distinguishes `null` from `""`.
    - A **gate** rather than a probe for the reason `check:policy-claims` and `check:profile-claims`
      were promoted: the fix changes **strings and no identifier**, which `audit:silent-reverts`
      says in its own closing caveat it cannot see.
    - **THE FLOOR HAD TO RISE WITH THE SECTION, AND 18 WOULD HAVE HIDDEN IT ENTIRELY.** Section 6
      contributes exactly **4** assertions against a clean run's 22, so at the old `FLOOR = 18`
      deleting the whole section landed on **exactly 18** and `ran < FLOOR` was false — measured,
      not reasoned: the gutted guard printed a **clean green `ok — … (18 assertions)`** and exited
      **0**, while at 20 it fails *"this run proved nothing"*. **A floor two below a clean run is
      the convention precisely because a floor set to the new total cannot see its own newest
      section stop asking.** Raise it when you add an assertion here; never lower it to make a run
      pass.
  - Injection-tested **14/14** (`scripts/oneoff/inject-match-percent-cases.mjs`), each case proving
    its edit landed **by checksum**, restoring `ClimbMatchCore.jsx` byte-identically, and judged on
    the guard's **own failure text** matched against FAIL lines only. The harness also **refuses any
    expectation that already appears in the GREEN run** — it caught one on the first run, where the
    needle was the text an assertion prints when it PASSES. Case 1 is the real defect restored
    verbatim. **Four must stay SILENT**: a legitimate rebalance
    (`CMAX_DISC` 16 -> 18), a comment quoting the forbidden `Math.min(99,` shape, a comment naming
    the old refusal wording, and **the refusal reworded truthfully and differently** — the
    load-bearing one, since it is what proves 6b/6c are not pinned to a phrase.
- **`check:trust-breakdown`** asserts that the factors under WHAT FEEDS YOUR SCORE add up to the
  number above them. Static (SSR of the real panel + a read of the migration), so it sits in
  `npm run build`.
  - **IT USED TO ASSERT AGAINST A SCORE THE SCREEN NO LONGER SHOWS, and that is the change.** One
    climber had **two** trust scores: `FullProfile` reads
    `climber._real ? realTrust : vScore(climber)`, `_real` is set only for a **uuid** id, and
    **`ME.id` is 0 signed in or out** — so your own Profile and your own *"View public profile"*
    rendered the **client** model while every other climber looking at you got the **server** one.
    Measured gap up to **36 points** on a 0-99 scale: a verified account with 5 vouches and 20
    climbs read **50** to itself and **14** to everyone else.
  - **They were never two implementations of one formula, which is why "just swap the headline" is
    wrong.** The client model scores email · reliability · response rate · vouches (4 each) ·
    catches · logs, normalised to sum to 99; the server model (`0038`) scores email 5 · id 10 ·
    certs 10 · **tenure 20** · vouches 20 (**1** each) · logs 15 (1 per 5) · reports 14 (1 per 3) ·
    catches 10, raw and capped. **Tenure** and **condition reports** exist only server-side;
    **reliability** and **response rate** only client-side. Swapping the headline alone would have
    left an itemisation of six factors under a number derived from eight different ones — and this
    guard would have stayed green, because it compared the breakdown against `vScore` rather than
    against what the screen renders.
  - **THE SERVER MAXIMA TOTAL 104 AGAINST A CAP OF 99**, so a factor list that sums past the
    headline is correct rather than a defect. The panel says so instead of hiding it; a breakdown
    quietly rescaled to hit 99 would be the [[trust-breakdown-shows-a-different-scale-from-its-headline]]
    defect committed in the other direction.
  - **TWO DEFENCES AGAINST THE TRANSCRIPTION DRIFTING, because `serverTrustFactors` is a JS copy of
    plpgsql and this file records the four-grade-parsers shape four times over.** Build-time,
    **section 3 reads the weights out of `0038` itself** — every rate, divisor and cap is parsed
    from the migration, so nothing is written down twice and a re-weight in SQL fails the build.
    Run-time, the app compares its local total against the number the server actually returned and
    **withholds the itemisation** when they disagree, showing the server number alone. *A breakdown
    that does not add up to its own headline is worse than no breakdown.*
  - **THE FIRST VERSION OF SECTION 3 WAS BLIND TO TWO REAL DRIFTS AND ONLY INJECTION SAID SO.** It
    asserted that one unit of input scores one point — which cannot see a wrong **rate** (one catch
    at 3 points still caps at 10) nor a wrong **divisor** (`floor(5/4)` is 1 exactly as `floor(5/5)`
    is). It probes **21 values per factor** now, spanning either side of the parameter and past the
    cap: *probe the whole curve, never one point on it.*
  - **AND THE HARNESS CREDITED CATCHES IT HAD NOT MADE.** It tested `/SERVER MODEL/` against the
    whole output — which matches the **`ok SERVER MODEL: …`** lines too, so it scored any run that
    merely *reached* section 3, and filed a section-4 failure as a section-3 catch. Each case
    declares the text its **own** failure must carry now, matched against `FAIL` lines; that
    immediately exposed one case being credited on the wrong message.
  - **Section 4 proves the rows REACH THE MARKUP**, which no number can: the panel takes them
    through `TrustBreakdown`'s `rows` prop, and a merge dropping that prop falls back to
    `trustContributions(climber)` **silently** — the client model rendering under a server headline,
    i.e. this whole defect restored without touching a value. It keys on *"Time on ClimbMatch"*,
    a factor the client model has no equivalent of, so a fall-through cannot satisfy it.
  - **The eight inputs are counted off the RAW query rows, not the hydrated `logs`**, and that is
    not tidiness: the hydration defaults a null `trip_report_visibility` to `"public"` while the
    SQL's `in ('public','crew')` does **not** match a null. Counting the hydrated list would
    disagree with the server on precisely the rows nobody set a visibility on — and the runtime
    check would then withhold the breakdown for a reason that is the reader's fault.
  - **`VOUCH_BOOST` reaching no screen is NOT a regression and was checked rather than assumed.**
    That session supplement gives immediate feedback when you vouch for someone; a real climber's
    headline is the server score, which counts vouches at 1 point each, so the number is right on
    the next fetch and there is no double-count.
  - Fails **closed**: a missing export, a factor count that does not match the migration's, an
    account with no inputs that already scores (which would hide a constant inside a rate), or a
    panel rendering under 200 characters are each a broken guard rather than a clean one.
  - **IT LANDED ON TOP OF #1539, WHICH CAVEATS THE SAME CARD, AND THE TWO NEEDED RECONCILING RATHER
    THAN STACKING.** That change reads three flags — `logsUnavailable`, `catchesUnavailable`,
    `vouchesInUnavailable` — and says *"Some of what feeds this couldn't load, so your score is
    showing lower than it is"*, because a failed read does not blank the client score, it silently
    **lowers** it (measured there: an established account reads 88 healthy against 32 with all three
    down). Those three reads feed the **client** model. Once the headline is the number the server
    computed, **they do not feed it** — so leaving the caveat on every account would put a false
    warning over a number that is right, and this file records in half a dozen places that a false
    warning is how a real one stops being read. `_trustUnsure` adds *"and the fallback is what is
    showing"*: `_trustPartial && myServerTrust == null`. The caveat and the withheld *"Raise it
    with"* prompt both key on it, and the probe asserts the **derivation** as well as the two uses —
    a merge keeping the uses and dropping the definition would put the caveat back everywhere.
  - **`trustGapLabels` takes a `server` flag for one reason worth stating**: the server model counts
    **logged climbs and condition reports off the ONE `climb_logs` read**, so a failed logs read
    takes both rows; in the client model *"Conditions reported"* is a separate, untracked input, and
    marking it *"Couldn't load"* there would be a false statement about a row that reads *"Not yet
    tracked"*. Same flag, two models, two correct answers.
  - **THE GROUP-JOIN GATE NOW READS THE DISPLAYED SCORE, and the SIGNATURE is the fix rather than
    the call site.** `groupTrustShortfall` took `meLive` and called `vScore` itself — the CLIENT
    model — while the Profile and every other climber see the SERVER one. So a group's *"Trust 55+
    only"* policy was enforced on a number that appears nowhere, and the app could tell you that you
    are trust 14 and then admit you. It takes a **number** now, so a second derivation is impossible
    rather than merely absent, and both byte-identical join handlers pass `myTrustScore`.
    - **THE BAR MOVES, AND THAT IS STATED RATHER THAN DISCOVERED LATER.** The two models are scaled
      differently — a vouch is 4 points in one and 1 in the other — so the same 55 is a different
      threshold. Measured over five example profiles
      (`scripts/oneoff/measure-group-trust-gate-scale.mjs`), **one changes side**: *a year in,
      active* reads **57** on the client model and **37** on the server one. On the server scale even
      email plus two years' tenure plus twenty vouches comes to **45**.
    - **THAT OPEN QUESTION IS ANSWERED, AND 55 WAS NOT MERELY STRICT — IT WAS A CLOSED DOOR.** This
      bullet read *"whether 55 is still the right number is an open product question … nothing here
      answers it"*, which is the [[a-stated-limitation-is-a-worklist-not-a-caveat]] shape sitting on
      a live gate. Measured (`scripts/oneoff/measure-real-trust-scores.mjs`, service key — an anon
      count on `verification_records` returns 0 whatever the table holds): **every real account in
      the project scores 0, 5 or 6**, and catalog-wide there are **0 vouches, 0 belay catches and 1
      climb log**, so five of the eight components are zero for everyone.
    - **THE EARNABLE CEILING IS 84, NOT 99, and that is what made 55 impossible rather than
      demanding.** `compute_trust_score` pays 10 for a government ID and 10 for club/guide
      credentials, and **nothing in the app can grant either**: `0085` pins every client write to
      `'pending'`, `verify_my_email()` is the one definer that writes `'verified'` and it hardcodes
      `'email'`, and `addVerification` is imported by both app files and **called by neither**. So
      20 of the model's 104 points are unreachable, and 55 sat **one point above the 54** a climber
      with no vouches and no belay catches can ever reach — i.e. "trust" had quietly become "somebody
      has spoken for you", which is the state every new climber starts in.
    - **20 IS NOT FITTED TO A CASE.** The verdict-preserving range for the profiles both models were
      measured over is **17..37**, and 20 sits at the end that keeps the gate walkable for the
      population that exists: a day-old verified account is 5 and is turned away, three months is 8,
      half a year of real participation clears it.
      `scripts/oneoff/measure-group-trust-threshold-candidates.mjs` re-derives all of it and prints
      what each candidate demands in things a climber can actually do — **do not quote the figures
      here without re-running it.**
    - **Section 6 BOUNDS the threshold and deliberately asserts NO particular number**, because
      where it sits between those bounds is a product decision and a guard pinning today's value
      would argue with the next one. Both bounds are derived from the model and from
      `scripts/lib/verification-reach.mjs`, so they move by themselves when the weights change or
      when a verification the app cannot currently grant becomes earnable — the direction that
      otherwise goes stale silently, since it makes the bar look more attainable than it is.
    - **The honest-refusal branch keys on `_trustUnsure`, not `_trustPartial`.** Once the gate reads
      the displayed score, the three client-side flags only make it unreliable while the
      locally-computed fallback is showing; refusing a join because an unrelated client read failed
      would be a false refusal.
    - Section 5 asserts it **as source** (the call sites are click handlers) and **at a count of
      two**, and two injection cases pin both halves — deriving a score again, and leaving one of
      the two identical handlers behind.
  - **SECTION 7 BOUNDS THE FOUR BARS THAT ONLY EVER SPEAK, and they were miscalibrated the same way
    for the same reason section 6's threshold was.** Fixing the group gate left them: the Profile
    card's **`/ 90 goal`**, its **progress denominator**, its **`✓ Well-trusted`** line and
    `TrustBadge`'s **`Highly Trusted` (90)** all sat at or above the **84** a climber can earn, so
    *"goal met"* and *"Highly Trusted"* were states **no account could ever be shown**, the progress
    bar capped at **93%** for the best possible climber, and every real account in the live project
    (0, 5 and 6) read **"New"** in red. `Trusted` at 70 was barely better — two years, 60 logs, 12
    vouches, 20 reports and 9 catches scores **65**, so that climber read *"Building Trust"*.
    - **SAME CONTRACT AS SECTION 6, and that is what keeps it from arguing with the next product
      decision:** it asserts every bar is **REACHABLE** and that none is handed out for confirming
      an email, and it deliberately pins **no particular number**. Both bounds are **DERIVED** — the
      ceiling from `earnableCeiling()` in `scripts/lib/verification-reach.mjs`, the floor from
      `dayOneScore()` — so they move by themselves the day a verification the app cannot currently
      grant becomes earnable. A guard holding today's 65 would go red on the next rebalance, which is
      how a guard teaches people to ignore it.
    - **`SERVER_TRUST_EARNABLE` MUST BE THE DERIVED CEILING, not a number typed into core once.**
      Without that assertion the constant is the hand-copy this whole section exists to remove, and
      it would go stale in the direction that makes a bar look **attainable** — the safe-looking
      direction, which is why it needs asserting rather than reading right.
    - **THE LADDER WAS WRITTEN TWICE AND THE GOAL FOUR TIMES, and no number could see it.**
      `TrustBadge` and `FullProfile` each carried their own `90/70/50` copy, so one climber could be
      called two different things depending which screen you were on; the card's goal, its
      denominator and its `Well-trusted` gate were three more literals. Every bound above is
      satisfied by a second copy that happens to agree **today**. They are one exported
      `TRUST_TIERS` table now with `TRUST_GOAL` derived from its top tier, and the count of copies is
      asserted separately. Same shape as the group roster's `_memN`, where *a hoist is not a single
      source of truth until every site uses it*.
    - **THE ONE-COPY RULE IS A BABEL AST SHAPE TEST, AND A STRING COUNT WAS MEASURABLY WRONG.** The
      first version counted the tier LABEL and reported two findings, **both correct code**: this
      guard's own comment quoting `"Highly Trusted"` while explaining the fix, and the Leaderboards
      board category `{id:"trust",label:"Trusted",val:pp=>vScore(pp)}` — a working control that
      merely shares a word. It would have told an author to delete its documentation or rename a
      control. The rule is *a `>=` comparison choosing a tier label*, and an AST sees neither a
      comment nor an object property. That is the instrument `check:profile-claims` section 3
      reaches for after three separate checkers were fooled in one day by a comment written to
      explain the fix they were checking.
    - **THE NUMBERS ARE ANCHORED TO DESCRIBED CLIMBER STATES, never to a fraction of the scale** —
      the method that produced `GROUP_TRUST_MIN` 55 → 20. `Building Trust` **15** is email + six
      months + 20 climbs (5+6+4); `Trusted` **33** is a year + 40 climbs + 3 vouches + 2 catches;
      `Highly Trusted` **65** is two years + 60 climbs + 12 vouches + 9 catches + 20 reports. Each is
      recorded in the source beside the table, because a bar justified by a fraction of a scale is a
      bar nobody can re-derive. **A score cannot guarantee CORROBORATION** and the comment says so:
      tenure plus logs plus reports reach 54 with no vouch and no catch, so the top tier is *"a long
      and full record"*, not *"somebody has spoken for you"*.
    - **THE PRODUCT CALL WAS THE USER'S, and a parallel session had explicitly deferred it.** The
      comment that stood in core said the tiers were *"deliberately NOT touched here … a product
      decision, not polish — raised rather than swept"*, and the memory entry said the same. It was
      raised; the answer came back **fix them**. What changed is only where the reachable bars sit;
      the reasoning that they were unreachable is unchanged.
    - **PROVEN ON SCREEN SEPARATELY**, because the table can be perfect while `trustTier` is wired to
      nothing: `scripts/oneoff/probe-trust-tiers-onscreen.mjs` renders the real `TrustBadge` at each
      tier's own minimum **and at one point below it** (the boundary is where an off-by-one lives,
      and a ladder wired to the bottom tier passes any test that only checks the minimum), asserts
      the progress bar can reach **100%** at the ceiling, and pins the tooltip in **both**
      directions — it must not name a scale the model lacks, and it must still say what the score is
      built from, since a rewrite that stops over-claiming and also stops saying anything would pass
      a test that only looks for the old text.
    - **The measurement is `scripts/oneoff/measure-trust-tiers-against-ceiling.mjs`**, which reads
      the bars **out of the source** rather than restating them and prints the milestone table the
      numbers were chosen from. Its sibling `measure-trust-goal-against-ceiling.mjs` answers the
      narrower *which components can nobody fill* question; both take the ceiling from the shared lib
      rather than computing it locally, since two copies of that arithmetic is how this repo ended up
      with four grade parsers.
    - Injection-tested **9/9** (`scripts/oneoff/inject-trust-tier-cases.mjs`), each case proving its
      edit landed **by checksum** and restoring the file byte-identically, judged on the guard's
      **own failure text** matched against FAIL lines only. Four are the historical defect restored
      verbatim (the 90 tier, the second ladder in `FullProfile`, the card's literal 90, a ceiling
      typed rather than derived). **`ladder-declared-and-unused` is the non-vacuity case** — every
      bound above is satisfied by a `trustTier` that ignores the table entirely. **Two must stay
      SILENT** and they are the two the string count got wrong: a comment quoting the forbidden
      shape, and an unrelated control labelled `Trusted`.
  - **SECTION 8 BOUNDS A BAR STATED IN PROSE, AND SECTION 7 IS BLIND TO ONE BY CONSTRUCTION.** That
    section walks `TRUST_TIERS` — so the same sweep that moved the card's goal, its denominator, the
    *"✓ Well-trusted"* line and the badge ladder onto that array left a **notification** reading
    *"Finish verification to lift your trust score to 90+"*: **six above the 84 a climber can earn,
    twenty-five above the top tier, and promised for an action worth five points**. *An instance
    fixed by hand is not a class closed*, with section 7's own enumeration of what it swept standing
    as the evidence for what it did not.
    - **FOUND BY READING A CI `ui-screens` CAPTURE**, the technique this file already credits for
      the seed-identity bug, the glued *Recently climbed* row and the pyramid caption. Nothing else
      could have: the column is a string literal, it renders, and the number is a number — only
      comparing it against the model says it is impossible.
    - **THE DISCRIMINATOR IS THE SCALE, NOT A VOCABULARY OF THRESHOLD WORDS, and it was MEASURED
      rather than chosen** (`scripts/oneoff/measure-trust-bars-stated-in-prose.mjs`, which
      re-derives every figure below — **re-run it rather than quoting them**). Of **36,328 string
      literals across 50 rendering sources, 91 mention trust** and, before the fix, exactly **two**
      also carried a number. **One of those two is a DATE** — *"Did your crew make Schoolroom on May
      24? … reliability feeds your trust score"* — so it is the one that survives, and a rule firing
      on any number in a trust sentence now reports **it and nothing else**. A deny-list of
      threshold phrasings (`to N`, `N+`, `at least N`) is no better: one more phrasing beats it,
      which this file records four separate times for `check:outage`'s rule 2 alone.
    - **A trust SCORE lives on the model's own scale**, so the band in which a number cannot be
      anything else is **(earnable ceiling, `SERVER_TRUST_CAP`]** — today **85..99**. A date or a
      reachable bar sits at or below the ceiling and stays silent; a year or a row count is off the
      scale entirely and stays silent. Both bounds are **DERIVED** from the model and the
      migrations, so the band moves by itself the day a verification the app cannot currently grant
      becomes earnable — and a bar that becomes reachable stops being a finding with nobody editing
      the rule, which is the contract sections 6 and 7 already hold.
    - **THE REPAIR NAMES NO NUMBER AT ALL, AND DERIVING ONE WOULD HAVE BEEN A SECOND FALSE
      PROMISE.** `email` is the one earnable verification type and it is worth **5 points**, so
      *"lift your trust score to &lt;any bar&gt;"* is false whichever bar is substituted —
      `TRUST_GOAL` included. The app already had the honest wording one surface over: Home's setup
      card reads *"Verify to boost your trust / Verified climbers get more requests."* Same
      convention-violation shape as the résumé's demo-verify tick, which this file records as *"the
      one outlier to a convention the app already has"*.
    - **ONE PARSE PER FILE, SHARED WITH SECTION 7.** These are 400 kB JSX files and a build gate is
      paid by every author and every CI run; `check:waypoint-placement` records what two independent
      traversals of one source cost. `astOf` memoises, and a parse failure is **fatal** rather than
      skipped — a file that did not parse contributes no findings and would read as a clean one.
    - **A MEASURED NON-FINDING BESIDE IT, recorded so it is not re-derived: the notification is also
      UNGATED where its sibling is gated, and that half is UNREACHABLE.** `_raiseRows` gates
      *"Verify email"* on `!verified` — section 3's own fix — and its handler even answers *"You're
      already verified."*; nothing removes `n3`, where `profile_setup` and `nrem` are both removed
      by id the moment they stop applying. It cannot bite today: the demo cannot verify without a
      `uid`, and signing in calls `setNotifs([])`, so `n3` and `verified===true` never coexist. *A
      detector for a class of zero is the thing this repo keeps refusing to build.*
    - Fails **closed** six ways, each of which otherwise prints identically to a clean run: a
      migration tree that parsed short — which **widens** the band and therefore manufactures
      findings rather than losing them — no verification type parsed as reachable, a ceiling that
      is not inside the cap, fewer than 4 rendering sources walked, fewer than 5,000 string
      literals, and **no literal mentioning trust at all**, with which the needle cannot fire and a
      clean result means nothing.
    - **IT CARRIES NO `ANCHOR LOST` ON THE CAP OR THE MODEL, AND THE INJECTION IS WHAT PROVED THOSE
      UNREACHABLE.** Both were guarded here first. Section 3 **executes** the model and section 7
      reads the same cap, so a missing `SERVER_TRUST_CAP` kills the run long before section 8 — the
      case that renamed the export died in **section 3** with *"the cap is undefined in JS and 99 in
      0038"*, which is the better message anyway. *An injection that produces a different failure is
      not a catch*, and following that verdict showed the two checks were **dead code, which reads
      as coverage** — deleted rather than given a contrived case, the same call
      `check:waypoint-dedupe` records for a self-comparison its own suite proved inert.
    - Injection-tested **8/8** (`scripts/oneoff/inject-trust-bar-prose-cases.mjs`), each case proving
      its edit landed **by checksum** and restoring every file it touches byte-identically. Case 1 is
      the real notification restored **verbatim**; a bar at **85** fires too, so the bound is the
      ceiling rather than the literal 90; and the same bar written as a **template literal** fires,
      or half the ways this app writes copy go unwatched. The eighth edits the **GUARD** rather
      than the app — the precedent `check:seed-only-surfaces`' cases 11 and 12 set — and neuters the
      trust needle, because with it matching nothing the walk still sees 36,328 literals and prints
      a cheerful *"no bar found"*, which is exactly what a clean tree prints. **Four must stay
      SILENT** — a bar **at** the ceiling is reachable and is correct work, a number **above** the
      cap is not a trust score, a comment quoting the defect is documentation, and **a bar DERIVED
      from the constant is the load-bearing one**: `"Trust "+GROUP_TRUST_MIN+"+"` puts no digit in
      any literal, so a guard firing on it would forbid the very fix section 6 records.
  - Injection-tested **13/13** (`scripts/oneoff/inject-server-trust-drift-cases.mjs`), each case
    proving its edit landed **by checksum** and restoring the file byte-identically. Section 6's
    four are the ones to read: the two bounds each fire (55 restored **verbatim**, and a bar of 5),
    and **`id-verification-becomes-earnable` must stay SILENT** — giving the database a definer that
    can attest a government ID lifts the partnerless ceiling to 64 by itself, so 55 stops being a
    finding. A guard holding a hardcoded 54 would still fail there and would be **wrong** to; that
    case is what proves the bound is derived rather than typed. `threshold-quoted-in-prose` pins the
    line-anchored, unique declaration match, since the comment above the constant explains where the
    number came from and names the one it replaced. The cases drift
    the two sides in **both** directions on purpose — a comparison that only ever read the JS would
    pass when the **migration** moves, which is the case that actually happens. **Case 7 must stay
    SILENT**: `0038`'s own header lists component *ranges* that are not the weights, and a guard
    reading those would fail on the file explaining itself.
  - **SECTION 9 — A REPORTER'S TRUST IS MEASURED OR ABSENT, NEVER A CONSTANT.** Sections 1-8 are
    about YOUR score; this is the same class one surface over, on somebody else's. `buildConsensus`
    carried a LOCAL `trustOf` shadowing the module-level one, returning a literal **50** for any
    author `seedAuthor` could not match by display NAME — i.e. every real climber — which
    `RouteDetail` rendered **raw** beside their name on the HAZARD VOTES list, coloured by a
    hand-copied pre-#1740 `>=90/70` ladder whose green sits above the **84** earnable ceiling.
    - **SECTION 8 CANNOT SEE IT EITHER, so the two rules are complementary rather than
      overlapping.** That section bounds a bar stated in PROSE by matching a number inside a
      **string literal**; a colour ternary carries its `90` as a bare NumericLiteral in the test
      with no string anywhere. A bar stated in prose and a bar stated as a COLOUR are different
      shapes, and neither scan reaches the other's.
    - **THERE IS NOTHING REAL TO PRINT INSTEAD, which is what decides the repair.**
      `useProfilesByIds` selects `id, name, avatar, show_name, username` and **no score of any
      kind**; the server score is a per-account RPC. So the honest render is **no chip**, not a
      different number, and both chips are now gated `!=null` and coloured through `trustTier`.
    - **A TRUST SCORE HAS TWO JOBS NEEDING DIFFERENT ANSWERS, and collapsing them is the tempting
      wrong fix.** WEIGHTING legitimately wants a neutral prior for an unscoreable author — the
      `dbReports` comment says so in as many words — while DISPLAY must never print a number nobody
      measured. `reporterTrust` returns a score **or null**; `reporterWeightTrust` falls back to
      **`TRUST_PRIOR`**, which is `50` because that is what **`vScore(null)`** already returns, so
      it is the app's own neutral value rather than an invented constant. The comment beside them
      says *do NOT collapse these two back into one*.
    - **A GREP FOR ONE SPELLING IS NOT A MEASUREMENT OF A CLASS.** A textual scan for the inline
      shape found **3** shadows (`buildConsensus`, `kwScan`, `routeKw`); the **Babel AST** scan for
      `a ? vScore(a) : <NumericLiteral>` found **two more in `ClimbMatch.jsx`**, written with an
      intermediate `const cl=`/`const base=` the regex could not match. Scanned with an AST, not a
      regex, for the reason section 3 records: **an AST does not see comments**, and this fix wants
      explaining — while the blanker other guards use once ate 21% of `RouteDetail.jsx`.
    - **The two `ClimbMatch.jsx` sites are WEIGHTING, not display** — `weightOf` helpers inside the
      start-location and topo-annotation consensus builders, neither of which renders a number.
      Both take `reporterWeightTrust` and the conversion is **value-identical** (50 == `TRUST_PRIOR`),
      so **only the AST scan can see a revert**; `app-weighting-site` is that injection case, and it
      is what proves the scan's third file is load-bearing rather than decorative.
    - **A GATE rather than a probe**, and section 7's tier-ladder scan is **widened to
      `RouteDetail.jsx`** in the same change (measured additive: **0** label ladders there today).
      The DISPLAY half of this fix is a JSX condition and a colour expression, so reverting it moves
      **NO identifier** and `audit:silent-reverts` says in its own closing caveat it cannot see that.
    - **A rule that only ever suppresses is satisfied by deleting the feature**, so the non-vacuity
      assertion is the load-bearing half: a SEED author must still carry a number, and a reporter at
      the earnable ceiling must still reach the ladder's top colour.
    - **THE PROBE BOUNDS THE LADDER RATHER THAN PINNING IT**, which is the contract sections 6 and
      7 already hold: it reads `SERVER_TRUST_EARNABLE` out of core and asserts the top tier is at
      or below it, so a rebalance — correct work — cannot turn it red, and the bound moves by
      itself the day a verification the app cannot currently grant becomes earnable. Its first
      version typed `=== 65` and `trustTier(84)`.
    - Probe: `scripts/oneoff/probe-reporter-trust-is-not-a-constant.mjs` (17 assertions, no browser,
      no DB), whose section 3 asserts **equivalence against the pre-change core loaded via
      `git show origin/main:`** — weighted `topTags`/`recentTags`/`confidence`/`avgStars`
      byte-identical while the DISPLAYED trust moved `[50,94,50,94] -> [null,94,null,94]` — and
      self-skips as spent once `origin/main` carries the fix.
      - **THAT FIXTURE HAD TO VARY THE THING WHOSE WEIGHT IT MEASURES, and an injection found the
        hole rather than a reading.** Every report initially carried the same tags, so every tag was
        100% whatever the weights were and `prior-becomes-zero` reported a WRONG FAILURE against a
        correctly-firing probe. **The fault was in the probe, not the app**: db authors are tagged
        `["Rockfall"]` and seed authors `["Dry"]` now.
    - Injection-tested **8/8** (`scripts/oneoff/inject-reporter-trust-cases.mjs`), each case proving
      its edit landed **by checksum** and restoring every file byte-identically, judged on FAIL
      lines only, with the harness **refusing any expectation already present in the clean run**.
      **Two must stay SILENT** — a comment quoting the forbidden shape, and the same rule written
      longhand, since a probe pinned to one spelling forbids a correct refactor.
      - **A SUITE'S OWN SHAPE DECIDES WHETHER ITS ANCHORS ARE CHECKED AT ALL, and this one was
        written in a shape `check:injection-anchors` cannot read.** That guard resolves every
        `find:` it meets, so `also: [{file, find, repl}]` — an array of OBJECTS where it expects
        an array of PAIRS — and a harness building `{ file: c.file, find: c.find }` both reported
        **UNPARSED**: four anchors it could not resolve, i.e. four rules nobody was proving while
        the suite printed 8/8. `also` carries pairs now (its file was always the case's own, so
        the key was redundant) and the harness passes `[file, find, repl]` tuples. **An anchor a
        guard cannot parse is not a checked anchor** — the same false-coverage shape this file
        records for a floor that counts work done rather than work verified.
- **`check:untracked-factors`** asserts that **a factor nobody has measured does not read as ZERO**.
  Static (one esbuild bundle plus a source read, no browser and no database), so it sits in
  `npm run build`.
  - **IT IS #1569's OTHER HALF, AND THE ONE `check:new-climber-journey` STRUCTURALLY CANNOT REACH.**
    That walk performs an action and then asks the DATABASE whether it survived; this defect leaves
    no trace in any table, because it is a claim the breakdown computes at render time. Five of the
    six defects that census found are covered by the walk; this is the sixth, and it needed a
    different instrument rather than a sixth phase.
  - **THE DEFECT.** The sign-in reset sets `relLedger` to `{honored:0, committed:0}` — correct, since
    the demo's 23/24 must not follow a real account — and App then computed
    `Math.round(relLedger.honored / Math.max(1, relLedger.committed) * 100)`, which turns *nothing
    tracked* into the NUMBER 0. `trustFactors` already had the right branch
    (`_rel != null ? … : "Not yet tracked"`, with `max: 0` so an untracked factor leaves the
    denominator), and **a 0 is not null**, so it took the tracked branch. A climber who has never
    committed to a crew was told they honour **0% of them**, on the card whose whole purpose is
    telling them how to raise their score. `relLedger` has **no persistence anywhere** — no column,
    no read, no write — so it is 0/0 for every real signed-in account.
  - **Measured rather than asserted: it costs 9 points and holds 18 points of goal the climber
    cannot fill** (denominator 120 against 102, score 53 against 62), because `max` stays 18 for a
    measurement nobody made.
  - **BOTH DIRECTIONS ARE ASSERTED, and the second is what keeps the rule honest.** A guard
    demanding only *"Not yet tracked"* is satisfied by making the row **always** untracked, which
    would hide a genuine no-show record — the *a rule that only ever suppresses is satisfied by
    deleting the feature* shape this file records for `pitchShortfall` and the impossible-leg
    suppression. So a **real** 0% must still be stated and must still count: 0 of 4 honored is a
    measurement, not a blank.
  - **THE SIBLING FACTORS ARE ASSERTED TOO, so this is a rule rather than one row's special case.**
    Four other factors already read *"Not yet tracked"* and Reliability was the **outlier** — the
    census recorded them as *"the correct twin that already existed"*. The guard requires at least
    four, and requires that anything saying *"Not yet tracked"* carries `max: 0`; without that the
    convention Reliability was measured against could erode and leave the rule resting on nothing.
  - **A COUNT OF ZERO MUST STAY A NUMBER.** *"0 trip reports shared"* is TRUE, and nulling it would
    swap one wrong answer for another by hiding a real, fillable goal. The rule is about a **ratio
    with no denominator**, never about every zero on the card, and `routesLogged`/`conditionsReported`
    are asserted to stay counts so a future sweep cannot over-apply it.
  - **SECTION 2 ASSERTS THE WIRING AS SOURCE, because executing `trustFactors` proves the BRANCH and
    not that App still hands it null.** A stale-base squash takes exactly that half: the ternary goes
    back to `Math.max(1,committed)`, every executed assertion still passes, and the accusation
    returns with **no identifier moved** — which `audit:silent-reverts` says in its own closing caveat
    it cannot see.
  - **IT ALSO CARRIES #1569's CONNECT-BUTTON HALF, and the walk does NOT cover that one.**
    `check:new-climber-journey` phase 5 drives **`FullProfile`'s** connect button, which the census
    names as the correct **TWIN** that already called `connect()`. The forked one was the **TRIP
    REPORT's**: it pushed the climber into local `connections` and toasted *"you are now friends"*,
    claiming a **MUTUAL** state the real flow cannot create, since `connect()` opens ConnectModal and
    sends a request the other person must accept. So the walk exercises the path that was always
    right, and this guard is the only thing watching the one that was wrong.
  - **PROMOTED from `scripts/oneoff/probe-reliability-zero-vs-untracked.mjs`, which ran NOWHERE** —
    the *a verification nobody runs is not a verification* shape this file records for
    `check:overflow`, `check:pitch-discount`, `check:policy-claims`, `check:offline-claims` and
    `check:photo-removal`. **The promotion is not a move: the probe PRINTED its core comparison and
    asserted only the wiring**, so the rule it exists for could not fail. Section 1 is assertions
    now. Promotion also changed its DEPTH, the trap `check:pitch-discount` records — paths are
    ROOT-anchored rather than cwd-relative, so it cannot silently measure another tree.
  - Fails **closed** four ways, each of which otherwise prints identically to a clean run: a missing
    `trustFactors` or `vScore` export, fewer than 6 factors parsed (with none, every assertion passes
    **vacuously**), a missing Reliability label, and an `app` source that read short.
- **`check:no-rendered-sources`** asserts that no screen prints a field named `source`. The app
  carries no sources — nothing asks a climber where their information came from, and nothing tells
  them where ours did. **That rule was swept by hand twice and missed three surfaces both times**,
  which is the entire argument for a script over a note: `verif.source` (rendered as
  *"Unverified · Mountain Project + AAJ"*, and on 13 DB rows an internal review note that named
  sources and leaked working language at climbers), the tick lists' own `source`, and
  `itinerary.sourceNote`. The first sweep searched for the **word** "Source" and for identifiers it
  had already found, so it walked past a field named `source` doing the same job elsewhere. Static
  (Babel), so it sits in `npm run build`.
  - **The rule is structural, and the precision is the point.** It flags a JSX expression that
    EVALUATES to a property named `source`/`sources`/`sourceNote`. It deliberately does not flag
    **"Water sources"** — a different meaning of the word, twelve times over in real climbing copy —
    nor `re.source`, nor the provenance chip's `title="How this section was sourced: …"`, which is a
    kept feature that names no source. A guard that flags correct work teaches people to ignore it.
  - **A conditional whose BRANCHES are literals passes**, because the field is only the test:
    `wp._source==="logged" ? "✓ From a logged climb" : "Submitted"` renders authored strings, not
    provenance. Internal edit provenance is fine as long as it does not reach the screen verbatim.
  - Fails **closed**: fewer than 5 files parsed, or fewer than 500 rendered expressions seen, is a
    broken traversal rather than a clean app (it sees 4,461 today).
  - Injection-tested, 4 cases at the bottom of the script; cases 1 and 2 are the REAL defects from
    #1069 and #999, and case 3 must **pass**.
- **`check:preview-claims`** asserts that a control changing only **client state** does not report
  a **real outcome**. Static (one source read — no Babel, no esbuild, no render), so it sits in
  `npm run build` at **0.04x `check:policy-claims`**, the cheapest thing in the chain.
  - **NINE CONTROLS TOLD A CLIMBER SOMETHING HAPPENED TO ANOTHER PERSON, AND NOTHING DID.**
    *"Joined Alpine Start"*, *"Approved — Reed added"*, *"Invited Sam"* (twice — the group sheet and
    the event sheet), *"You're in — see you there"*, *"RSVP cancelled"*, **"Event created — 4
    occurrences scheduled"**, *"Kudos sent to Maya"*, *"Nudged Alex"*. Every handler sets a
    `useState` — `groupMembers`, `groupReqs`, `events`, `crews[].nudged` — and there is no write
    behind any of them. Nobody is told, and a reload loses it.
  - **THE APP ALREADY HAD THE VOCABULARY, AND THESE WERE THE OUTLIERS — which is what makes this a
    convention violation rather than a design question.** *"Marked as requested — this preview
    doesn't send it to a moderator yet"*, *"Reported — this preview doesn't route group reports to a
    moderator yet"*, *"this preview doesn't deliver invites to example climbers"*: the app says this
    **27 times**. Kudos is the sharpest case — *"Kudos noted — this preview doesn't deliver it to
    X"* already existed on a **sibling** control, so one kudos path was honest and the other was
    not. Same shape as the résumé demo-verify tick, which this file records as *"the one outlier to
    a convention the app already has"*.
  - **REACHABLE TODAY, PROVEN FROM A CI CAPTURE RATHER THAN REASONED ABOUT.** `ui-screens` for
    `Crew:Requests` on main renders **GROUP INVITES (1)** — *"Alex invited you to join Alpine
    Start"*, Accept/Decline — and **REQUESTS TO JOIN YOUR GROUPS (1)** — *"Reed wants to join"*,
    Approve/Decline. Those two are on screen for every user because `DEMO_FILLERS` is on. **The
    other seven are not sample-gated at all**: kudos, nudge, both invite sheets, RSVP and event
    creation are ordinary controls on real groups and real crews that simply have no write.
  - **A PREVIOUS SESSION BUILT THE WRITE FOR ONE OF THESE AND THREW IT AWAY, correctly, and that is
    why the repair is COPY rather than wiring.** Accepting a group invite has the `joinGroupRow`
    fork, and wiring it would be dead code: `groupReqs` is seeded **only** by `DEMO_FILLERS` and
    nothing else ever pushes to it, so a real DB-group invite never lands there. Approving is worse
    than dead — **a group owner cannot add a member at all** (RLS 403; the member seats themselves),
    so there is no write to call. **Check reachability before wiring a fork.**
  - **"On this device — sign in to keep it" would have been a SECOND false claim**, and copying the
    sibling Join button blindly is the tempting mistake. That wording is right where a write exists
    behind a session; here signing in would not keep it either, because there is no write. The
    caveats say what the preview **does not do**, never what signing in would fix.
  - **THE SECTION HEADING MADE THE SAME CLAIM AND IS ON SCREEN THE WHOLE TIME** — *"Climbers asking
    to join a group you moderate — approving adds them"* is what a moderator reads **before**
    tapping, so a toast-only fix would have left the more visible half standing.
  - **Keyed on the HANDLER, never on the message**, so a reword passes and a revert fails: each
    control is located by a distinctive fragment of its own `onClick`, and the `showToast` argument
    is read by **balancing parens** from there — never a character window, the trap
    `check:camping` records three times over on a file whose longest line is 20,000 characters.
    An anchor matching **twice** fails as ambiguous rather than checking a control it was not
    aimed at.
  - **The convention is READ from the app, not restated here.** A list of accepted phrasings inside
    the guard would be a second copy of a convention that already exists — the four-grade-parsers
    shape. It fails **closed** if the app uses *"this preview"* fewer than 8 times: with the
    convention gone every assertion passes vacuously.
  - **A stale entry FAILS, and that matters more than usual here.** Each caveat is correct *until*
    the feature gains a write; when one does, its entry comes out in the same change. Without that
    this guard would rot into a demand that a working feature apologise for itself — the
    guard-argues-with-correct-work failure this file records under half a dozen names.
  - **A GATE rather than a probe** for the reason `check:topo-outage-copy`, `check:policy-claims`,
    `check:profile-claims` and `check:offline-claims` were each promoted: the repair changes
    **strings and no identifier**, and `audit:silent-reverts` says in its own closing caveat it
    cannot see that. **`check:claims` and `check:writes` are blind by construction** — one forbids
    a success message in front of a session-gated write, the other in front of a write whose failure
    is unobservable, and **both presume a write EXISTS**. A toast in front of no write at all passes
    both, which is the census-4 shape recorded for *"Remove friend"*.
  - Injection-tested **8/8** (`scripts/oneoff/inject-preview-claim-cases.mjs`), each case proving
    its edit landed **by checksum** and restoring the file byte-identically. Five restore the real
    historical strings verbatim; one renames a handler parameter and must fail **ANCHOR LOST**
    rather than quietly dropping a control; one **must stay SILENT** (a different honest wording);
    and one blanks the convention and must fail **CLOSED**. The harness also refuses any expectation
    matching the healthy run.
