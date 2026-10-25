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
  - **SECTIONS 4b AND 5 WERE RE-AIMED ON 2026-10-01, when 0237 made an emergency contact SETTABLE** —
    owner-only, in its own table `profile_emergency_contacts`, like `profile_zips`. Both sections were
    written to report a MOVED PREMISE that day, and did.
    - **4b's settability signals could not see it.** It looked for a `profiles` column or a draft key, and
      0237 has neither: the table is separate and the editor adds `ec` to the draft only when edited. It
      now reads the editor's two contact INPUTS plus App's `saveMyEmergencyContact(uid,` call — and fails
      if one exists without the other. Once settable, the failure TURNS ROUND: copy that still says
      "there is no emergency contact" is the false claim (the FAQ and the Privacy Policy both did). The
      "control who can see it in Settings" claim runs in BOTH branches: no such control exists either way.
    - **5's premise was never "a contact exists" but "a crew's float_plan row can carry one".** That row
      stores `contact: ME.emergencyContact`, and 0237 deliberately does NOT feed the owner-only contact
      there — a crew can still never read it. So 5 now keys on whether anything assigns `emergencyContact`
      a non-empty value; `profile-contact-fed-to-crew` is the injection that proves it.
    - **"only you can read" / "visible only to you" count as an HONEST mention**, since a contact now
      exists. Trap met: "(which only you can read)" in the collection list let 5b's `crew…can read`
      disclosure test pass with the real disclosure DELETED — the clause sits within 140 chars of "crew".
      Worded "visible only to you" for that reason; `disclosure-deleted` caught it.
- **`check:profile-claims`** asserts that the **Profile tab and the résumé it opens claim only what
  - **2026-09-30: the self-verify tick was REMOVED, not caveated.** "Verify (demo)" on the résumé and "Mark verified (demo)" on the seed guide dashboard let a climber award their own credential a tick. Under the owner decision that the app reads as the finished product (see `check:preview-claims`), section 2 now asserts that no `onVerifyCourse` handler and no self-verify button exist, and that the real "✓ verified" and "self-reported" chips still render.
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
  - **SECTIONS 3 AND 4 WERE RETIRED ON 2026-10-21 with the trust score** (owner decision). Section 3 policed the trust card's *"Raise it with:"* row and section 4 the `TrustBadge` tooltip; both surfaces are gone, so the sections, their shared verification-reach helper and the injection suites went with them. Their history is in git.
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
- **`check:offline-claims`** asserts that **an offline promise is backed by the mechanism that makes
  it true**. The offline feature is the **state download** (Home's Pinned states, Manage areas);
  there has been **no per-route trip pack since #2368**. Static (Babel over `ClimbMatch.jsx`,
  `ClimbMatchCore.jsx` and `lib/Help.jsx`, plus source reads of `RouteDetail.jsx`, `lib/db.js`,
  `lib/offline.js` and `scripts/build-state-snapshots.mjs`), so it sits in `npm run build`. The
  last timing on record, before the 2026-10-14 restore, was **1.34x `check:policy-claims`**.
  - **QUOTED AS A RATIO, NOT A CLOCK, and that is not hedging.** Taken back to back with
    `check:policy-claims` on one box, best of three. A wall-clock figure from this machine is
    fiction — the three readings for this guard alone were **30.5s, 40.9s and 45.6s** while it
    measures ~2.3s on a quiet box, and this file already records a profile taken at load 450 that
    was off by 4x. **What survives load is where a guard sits relative to a sibling measured in the
    same minute.**
    - **THE RATIO IS MORE ROBUST THAN THE CLOCK AND IS NOT LOAD-PROOF EITHER**, which is worth
      knowing before treating one as a fact. The pre-rewrite guard was recorded at **1.65x** by the
      same method; the pack-era one measured **1.34x** having gained two source reads and lost
      nothing. Some of that gap is real and some is contention, and the measurement cannot
      separate them. Read a ratio as an order of magnitude, not a regression.
  - **THIS GUARD HAS MOVED FOUR TIMES, AND EACH MOVE IS THE LESSON.** (1) Its subject was *"a route
    is never on the device; only a downloaded state is"*: `offline` in `ClimbMatch.jsx` was
    `useState([])`, a list of route ids with **nothing about the route stored**, and #1585 rewrote
    twelve strings to say so. (2) The TRIP PACK then became a real download, so that copy became
    false in the other direction and the guard reversed — **a promise is only true relative to a
    build**, the shape `check:policy-claims` §3 records. (3) #2368 removed the trip pack from every
    screen and cut this guard to the state download's own sections — and cut too much. (4) The
    2026-10-14 restore, below.
  - **WHEN A FEATURE IS REMOVED, ASK WHICH ASSERTIONS BELONGED TO IT AND WHICH TO THE MACHINERY IT
    SHARED.** #2368 deleted §4 (say what is NOT saved), §5 (claim nothing that is not) and §10 (the
    saved copy is read back and dated) along with the pack. But the readers §10 guarded —
    `offlinePackReports` / `offlinePackContribs` / `offlinePackProfiles`, the `_packedAt` stamp the
    two array hooks keep alive with **`structuralSharing: false`**, and `photosUnavailable` reading
    that stamp — are **named for the pack and are not its property**: `lib/offline.js`
    `savedForRoute` serves a downloaded state's reports, corrections and reporter names through the
    same functions. So the state download's promise *"plus recent trip reports and corrections"* had
    lost its only guard while every check stayed green. Restored, minus the pack's own links (the
    snapshot write and its photo filter, the forecast snapshot, the map's tiles and Leaflet):
    - **§10 (8 assertions)**: the reports, corrections and names hooks still fall back to the device
      with the stamp kept; `useMyItineraries` still mirrors the climber's plans; `lib/offline.js`
      still stamps the STATE copy; the route page dates the saved reports in both places it shows
      them (`savedAgo(reportsPackedAt)`); `photosUnavailable` reads the stamp; and the download
      stores **no photo rows**, on the live path AND in the nightly state file (`kind=neq.photo`).
    - **§4 (2 assertions)**: both Help surfaces that explain the download — the FAQ (`lib/Help.jsx`)
      and the tour (`HELP_FEATS`) — still say **photos and map tiles are not saved**. Asserted as a
      FACT (a negated sentence naming both), never as one wording.
    - **§5 (1 assertion)**: the deny-list, now scanning the **state-download screens**: the Manage
      areas dialog (found by its aria-label, because its intro paragraph references none of the
      download state), every region of `ClimbMatch.jsx` around `downloadedStates` / `myPins` /
      `dlBusy` / the download, remove and pin handlers (Home's Pinned states card, the setup
      checklist's download item, the toasts), the whole Help FAQ and the Help tour. It forbids a
      sentence naming photos, topo images or map tiles beside a word saying they are stored.
      Measured 2026-10-14: ClimbMatch 31 regions / 202 strings, FAQ 124, tour 75.
  - **WHAT THE TRIP PACK STORED, for the record, because its readers outlived it.** `packRouteOffline`
    put the route row in an IndexedDB `pack` store; `packRouteWithSnapshot` added the latest 20
    reports with their authors, the non-photo contributions and, separately, a raw forecast; from
    2026-10-07 it also saved USGS map tiles for the approach (`lib/offlineTiles.js`). Those writers
    are now **uncalled** and were deliberately left in place: a device that packed a route before
    #2368 still holds that row, snapshot and tiles, and `offlineRoutesByIds`, the readers above and
    `baseTileLayer`'s saved-tile fallback still read them. Whether to delete the writers and clear
    the stores is an owner decision, not a cleanup.
    - **The fresher ROW wins, not the pack (2026-09-25).** `offlineRoutesByIds` used to serve a
      packed row unconditionally, so a June pack hid a September state download. It now compares the
      pack's `refreshedAt` (else `packedAt`) with the state's COMPLETED `savedAt`; ties, unknown times
      and incomplete downloads keep the pack. `scripts/oneoff/verify-pack-vs-state-freshness.mjs`
      runs the real module against real IndexedDB in 8 cases, and fails exactly the two newer-state
      cases against the old code. Still live: an old device's pack rows are still compared.
  - **THE EMBED SHAPE IS EXPORTED FROM `lib/offline.js` AND IMPORTED BY `lib/db.js`**, not written
    twice. A stored row carrying fewer area fields than the network select renders **"undefined"**
    where the peak name goes — `dbRouteToCamel` builds `_dbArea` from `r.areas` whenever it is
    TRUTHY, so a thin embed both prints the word and suppresses `openRoute`'s backfill. That is a
    defect this repo has already shipped once from exactly this kind of drift, recorded under
    `check:area-name-embed`.
  - **§2 IS THE SILENT HALF AND IS WHY THIS IS A GATE.** Every route the wishlist, the logbook and a
    downloaded state's lists resolve by id comes through `useRoutesByIds`, which had **no offline
    fallback** — so with no signal it threw, `dbRouteById` was empty, `routeById()` returned
    undefined for every one, and the lists dropped the rows. Remove that one fallback and the write
    still works, the copy still reads correctly, nothing renders differently, **no identifier
    moves** — and the lists empty at the trailhead. `audit:silent-reverts` says in its own closing
    caveat that it cannot see a change of that shape.
  - **§1 and §3 went with the pack and are not coming back.** §1 asserted the pack's write; §3
    asserted that the pack list's hydration was declared BELOW the sign-in reset that clears
    `offline` (effects run in declaration order, so a hydration above it is wiped on the same `uid`
    transition — the `check:verification-fallback` defect on a second feature). Neither has a
    subject now. The ORDER rule itself still applies to anything hydrated on `[uid]`.
  - **TWO OF THE OLD GUARD'S SIX NEEDLES WERE DEAD, and it went unnoticed for the life of the
    rule.** It excused any sentence matching `\b(?:not|no|nothing|never|…)\b` as negated — and its
    own `with no signal` and `no-signal days` needles **cannot match a sentence that does not
    contain the word "no"**. Every claim phrased the most natural way excused itself, and a clean
    run looked identical to a working one. Found by the guard passing on copy it should have caught,
    not by reading it. §5 strips the no-signal idioms **before** testing for negation so the same
    trap cannot return. *A dead branch in a guard reads as coverage*, which this file records for
    `check:policy-claims` and `check:screen-lists` and which arrives here a third time. The
    negation list now includes *aren't*, because the Help copy's own disclaimer reads *"Photos and
    map tiles aren’t saved"* and a list without it would have scanned the disclaimer as a claim the
    moment a `downloaded` landed in the same sentence.
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
  - Fails **closed**: an unreadable or unparseable source; `ANCHOR LOST` for a missing
    `useRoutesByIds`, any §10 hook, `HELP_FEATS`, or the Manage areas dialog's aria-label; a
    **per-surface** region/string floor in §5; and fewer than **34 assertions RUN** — a guard that
    quietly stops asking half its questions still exits 0.
  - **The floors are PER SURFACE.** A global floor is satisfied by the other surface: renaming the
    download state in `ClimbMatch.jsx` alone leaves the Help strings standing, so the guard would
    report a clean sweep having inspected one surface of three — the `check:control-names` defect,
    whose floor was *"at least one"* and which a **partial** restyle left checking 1 of 9.
  - Injection-tested (`scripts/oneoff/inject-offline-claim-cases.mjs`), each case proving its edit
    landed **by checksum**, restoring the file byte-identically, and **naming the text its own
    failure must carry** — a case judged on the exit code alone is satisfied by a run that died for
    an unrelated reason. Expectations are matched against **FAIL lines only**, never against the
    text an assertion prints when it passes, which is a mistake this repo has made twice.
    **22/22** after the 2026-10-14 restore (5 kept from #2368, 17 back): seven §10 links one at a
    time, both §4 disclaimers, one §5 claim per surface (Manage areas, Home's card, the FAQ), and
    three renames that must fail CLOSED (the Manage areas aria-label, the download state, and
    `HELP_FEATS`). `check:injection-anchors` covers their anchors.
    **Two must stay SILENT**: `disclaimer-reworded` (§4 asks whether the fact is stated, and its
    reworded sentence says *"not saved to this device"*, which §5 must read as the denial it is)
    and `honest-claim` (a true claim about the catalog in the no-signal idiom). `read-gone` is the
    one to keep: it removes only the fallback.
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
  - **SECTION 7: "HOW YOU MATCH" EXPLAINS THE NUMBER IT SITS UNDER.** `compat()` is now the rescaled
    sum of `compatParts()`'s rows, and the guard lifts BOTH bodies (a `compat()` that stops calling
    `compatParts` is `ANCHOR LOST`, not a pass). It asserts the rows' maxima sum to `COMPAT_MAX`, every
    signal that moves the score also changes its checklist line, an unfilled profile reads `unk` on
    every line (never a mismatch — #612's rule, in words), and `FullProfile` renders `compatWhy()`
    with the SAME viewer object it scores with, built from `ME.matchObjectiveIds`. Injection measured:
    `compatWhy(ME,climber)` fails it. The refactor was proved score-identical on 20,036 pairs (seed
    population plus 20,000 random profiles) before the old body was dropped.
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
    - **`RealClimberRow` moved to `src/components/RealClimberRow.tsx` (PR34 of the component extraction).**
      Section 6 still reaches it through `readCoreSource()`'s `MOVED` stitch: `function RealClimberRow` is
      found, the lifted row runs to the end of the stitched text (no column-0 `function` follows a
      component), the `_cand` literal is unchanged and still EXECUTED — the regex now accepts `const` as
      well as `var`, nothing else — and the refusal branch is verbatim. The injection suite's row cases name
      the component file; two of its anchors had rotted BEFORE the move (the `_cand` literal gained
      `partnerAreaPaths` after `objectiveIds` in 0300, and the signature gained `verified`/`listing`) and are
      repaired with it — `check:injection-anchors` had not flagged them, which is a reach question for that
      guard, noted here rather than fixed. Measured by `measure:guard-reach` around the move.
    - **6a IS THE STRUCTURAL FACT AND IT FAILS AS STALE, NOT AS A DEFECT.** It lifts `_cand`'s
      literal and **executes** it — a hand-typed copy would agree with itself whatever the row does
      — and requires `compatUnknown >= 3`. Widening `_cand` (a column arrives) is correct work, and
      the failure says so while pointing at the measurement, the standard `KNOWN` and
      `PARTIAL_ON_PURPOSE` are held to.
    - **UPDATE (0209, 2026-09-25): THE COLUMNS ARRIVED, AND 6a WAS RE-DERIVED — IT FIRED EXACTLY AS
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
- **`check:trust-breakdown`** and **`check:untracked-factors`** were **RETIRED on 2026-10-21** with the trust score itself (owner decision): the app no longer computes, shows, filters, sorts or gates on a trust score, so there is no breakdown to add up and no factor to mis-read as zero. Their history is in git (`git log -- scripts/check-trust-breakdown.mjs`). Do not restore either without restoring the score.

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
    nor `re.source`. (The provenance chip once excused here was removed 2026-10-04.) A guard that flags correct work teaches people to ignore it.
  - **A conditional whose BRANCHES are literals passes**, because the field is only the test:
    `wp._source==="logged" ? "✓ From a logged climb" : "Submitted"` renders authored strings, not
    provenance. Internal edit provenance is fine as long as it does not reach the screen verbatim.
  - **RULE 2 — WORDING (2026-10-04).** The field rule could not see the surfaces the owner then asked
    to remove, because each was an authored **literal**: the per-section `Auto-generated` / `On file` /
    `Climber-verified` chip, *"Road and access last checked against a published source on …"*,
    *"Tap a row for its sources"*, a suggest-a-fix field labelled *"Why / source"*, the forecast
    caption *"via Open-Meteo … sources can legitimately disagree"*, the wildfire credits *"live from
    NIFC and the National Weather Service"* plus the `FIRE_SOURCES` footer, and *"(optional, for
    attribution)"*. So every JSX text, string and template literal in the app files and `lib/*.js`
    now fails on `auto-generated`, `source(s/d)`, `attribution` or `provenance` — after removing
    "water source(s)". Fails closed under 2,000 literals (it sees ~44,800). Injection-tested by
    restoring the old road line: FAIL, exit 1. **Kept on purpose:** the NWS/MET badges on the
    forecast's comparison rows (they label which forecast a row is) and `VerifNote`'s status. **The one credit the app DOES carry is the map-tile credit** (`TILE_CREDIT` in `lib/mapKit.jsx`), because the OSM, OpenTopoMap and Esri licences make it a condition of use; owner rule 2026-10-04 is "credit only if we are legally supposed to". Do not remove it as a source mention, and do not add credits anywhere else.
  - Fails **closed**: fewer than 5 files parsed, or fewer than 500 rendered expressions seen, is a
    broken traversal rather than a clean app (it sees 4,461 today).
  - Injection-tested, 4 cases at the bottom of the script; cases 1 and 2 are the REAL defects from
    #1069 and #999, and case 3 must **pass**.
  - **A response header's NAME is not screen text (2026-10-07).** The shade map reads which terrain
    model each height tile came from — `r.headers.get("x-amz-meta-x-imagery-sources")` — to show a
    licence credit only where one is required (Canada's CDEM, not US 3DEP). RULE 2 failed on that
    protocol key, so a string literal that is the argument of `<x>.headers.get(...)` is skipped. The
    literal count fell by exactly one (46,329 → 46,328), so nothing else left the scan.
- **`check:preview-claims`** asserts that **no toast describes the app as a preview, a demo or a
  simulation**. Static (one read of every app source, string-aware paren balancing — no Babel), so it
  sits in `npm run build`.
  - **THE RULE WAS INVERTED BY OWNER DECISION ON 2026-09-30.** The user: *"Remove the toast popup
    about being in preview mode … Just make the toast popups as if they are in the final app state
    for the users … make this the normal for the whole app."* Until then this guard ENFORCED the
    opposite convention: nine client-only controls (kudos, nudge, group/event invites, RSVP, event
    creation, accepting/approving group requests) had to carry *"this preview doesn't …"*, and the
    guard failed closed if the app said "this preview" fewer than 8 times. **Do not restore that
    convention** — it is a standing decision now, not an honesty gap to re-find.
  - **Every seed-branch toast now mirrors the copy of its real (DB) sibling** — e.g. the seed
    `sendReq` branch says *"Request sent to X"*, exactly as the `sendConnectionRequest` branch does.
    Where a toast claimed an outcome that NOTHING produced for anyone (résumé *Share* / *Export PDF*
    toasted "link copied" / "exported" and did neither), the control was WIRED to the existing
    `shareOrCopy` / `printSheet` helpers rather than reworded, so the final copy is true.
  - **What stays allowed, and why the regex is narrow:** a failed-write toast (*"Couldn't save that —
    try again"*) and the SIGNED-OUT caveat (*"on this device — sign in to keep it"*) are true in the
    finished app. So the pattern forbids *this preview*, *(simulated)*, *(demo)*, *Demo crew/profile*,
    *only for now*, *isn't live*, *switched on yet*, *example climbers* — and not *on this device*, nor
    bare *demo* (a climbing word too).
  - **The join-requests HEADING check is kept** from the old rule because it is not about preview
    wording: since 0178 the section lists real requests (which write) beside seed ones (which do not),
    so the heading must say what the section holds, not promise what approving does.
  - Fails **closed** below 150 toast calls in `ClimbMatch.jsx` or 200 overall (it reads ~293).
  - Injection-tested **7/7** (`scripts/oneoff/inject-preview-claim-cases.mjs`): four real historical
    preview strings and the historical heading must FAIL, the signed-out caveat must stay SILENT, and
    renaming `showToast` must fail CLOSED.
  - **Non-toast leftovers deliberately NOT swept** (the ask was toasts): the résumé's
    *Verify (demo)* button and *✓ verified (demo)* chip, and the seed `GuideDashboard`'s
    *Mark verified (demo)* (renders only when `USE_DB` is off, i.e. never in production).

- **`check:conditions-score`** asserts that the crag **CONDITIONS SCORE** (Conditions tab, sport /
  trad / top-rope / bouldering only — `lib/conditionsScore.js`, card `ConditionsScoreCard` in
  `RouteDetail.jsx`) **adds up, leaves out what it did not measure, and is offered nowhere it cannot
  judge**. Static, no network, no credentials; in `npm run build`.
  - **Arithmetic**: each factor is rounded to whole points BEFORE summing, so the "x of y points"
    line is exactly the sum of the rows printed under it, and stars are exactly 5 × points / measured
    points. There is **no clamp** anywhere — the same lesson as `compat()` (docs/codebase/algorithms.md).
  - **...except a NAMED CAP (§7, 2026-10-07)**: summed factors gave an hour of RAIN 53-59 points
    ("Fair"), because temperature, wind and sun still scored. Rain in the past hour, rock under 30%
    dried, ANY wet sandstone (not conglomerate — see below), and AQI > 200 cap the hour at 1 ★; air
    within 5°F of its dew point and AQI > 150 cap it at 2 ★.
  - **...and DRYING rock is held down until it is dry (`WET_BANDS`, 2026-10-15)**: under 30% dry 1 ★,
    under 70% 2 ★, under 100% 3.5 ★. One cap at 30% was the whole rule before, and Dry rock is only 25
    of 100 points, so the hour the card itself called "about 50% dry" scored 4.3 ★ "Good" in green beside
    a red morning (Exit 38 the day after 0.2" of rain: 11 not-yet-dry hours at 3.0–4.7 ★, day 4.6 ★
    Good; after: 3.5 ★ Fair). Measured on live forecasts for 12 crags: dry days are unchanged. The
    guard walks 12 rain fixtures and fails if any hour 30–99% dry exceeds its band or reads "Good";
    reverting the bands to the single 30% cap fails it (75% dry -> 4.6 ★).
  - **...and the rock DRIES FASTER (`DRY_RATE`, same day, owner: "probably speed it up")**: the dew point
    gave NO drying, night 0.6 and 90% RH 0.3, so a Northwest night after rain dried almost nothing.
    Now dew point 0.6, night 1, 90% RH 0.6, 75% RH 0.9. Fitted to CragReport's hourly surface dryness
    (Index, Exit 38, Mt Erie, Squamish; 169 hours, one storm): mean error 0.21 -> 0.12, bias -0.16 ->
    -0.05. Sunday after the storm now scores 4.0–4.9 ★, matching Climbit (~3.5–4.6) and CragReport
    (81–95). A full fit wants night faster than day — not physical, refused; `DRY_HOURS` is untouched.
    The guard pins only the ORDER (dew point ≤ 90% ≤ 75% ≤ 1, night ≤ day, dew point > 0).
  - **...and the PAST rain is MEASURED where a measurement reaches (`mergeMeasuredRain`, 2026-10-15)**:
    `lib/forecast.js fetchMeasuredRain` tries a 6-h radar-and-gauge analysis (HRDPA; northern US + Canada:
    WA, OR, KY, WV, WI, NY answer; the South, Southwest, CA and CO return no feature), then an hourly one
    (Stage IV via Iowa State) ONLY east of 104°W — west of it the hours are split from 6-h totals and put
    the 2026-10-09 Index storm 18 h late — else null, and the score keeps the model. Both crag readers
    (Conditions card, Home tile) go through `fetchCragForecastMeasured`, so they cannot disagree. Measured
    on 2026-10-15: RRG's past 96 h 3.46" modelled vs 2.34" measured, Gunks 0.98" vs 1.48". A time not yet
    analysed is an XML error, a point outside the analysis is `{}`: both are "not measured", never zero.
    The guard pins the merge (amount from the measurement, timing from the model inside a window, gaps keep
    the model, a measured dry window dries a modelled soaking). The two crag-fetch URL checks now match
    `fetchCragForecast\(` exactly — `fetchCragForecastMeasured` shares the prefix and was read in its place.
  - **The thresholds were checked against published guidance (2026-10-07)**, so do not re-tune them
    on feel:
    - DAMP_SPREAD 5°F is the 3 °C surface-condensation margin (ISO 8502-4).
    - The AQI caps follow EPA's bands: at 151–200 those active outdoors avoid heavy exertion; above 200, everyone does.
    - DRY_HOURS follow the climbing bodies (rockType.js lists each one): granite and quartzite 12,
      limestone and metamorphic 24, sandstone 48. In the model, 48 h of credit works out to the
      Southern Nevada coalition's "36 h with sun, 3–4 days in winter".
    - A wet day is ≥ 1 mm, the ETCCDI convention.
    - Wet sandstone "can lose up to 75% of its strength" (Access Fund). Conglomerate keeps
      sandstone's drying but NOT that cap: quartz-cemented conglomerate (the Gunks, 1,548 areas)
      is hard rock, and the guard pins this.
    - Still conventions, NOT measured: the friction thresholds (no peer-reviewed study fixes one),
      the drying-rate multipliers, and the 12/16 wet-day month cut-offs. Stars are `min(5 × points / measured, lowest cap)`; every cap carries
    its reason, the card prints it under the factor rows with "The factors alone would give x", and
    the day strip says "Held down by: …". That is not the saturating clamp `compat()` lost — it
    is a stated verdict, and the rows still add up to the points line. Do not "simplify" it back
    into a factor weight: a weight can only cost points, never say "don't climb".
  - **Defects fixed with §7 (each checked against a live Open-Meteo response)**: drizzle under 0.01"
    was ignored (Open-Meteo reports 0.1 mm = 0.004" steps — any `> 0` now counts); `dew_point_2m`
    was fetched and never read (now condensation + the friction reading); today's best window and
    default hour could already be past (hours with `utc + 1h <= now` are not offered); one
    `utc_offset_seconds` was applied to the whole series, an hour off after a DST change (now
    `timeformat=unixtime` + the response's `timezone` through Intl, and `is_day` for daylight);
    drying ignored how much rain fell and the weather since (now credit per hour, scaled by the
    24 h rain total). `precipitation[T]` is the rain of the hour BEFORE T and is labelled "in the
    past hour", not "this hour".
  - **Prefs are ONE store** (`lib/CondPrefs.jsx`, `useSyncExternalStore`): the Home tile read
    localStorage during render and went stale after a change on a route page. Settings has a *Your
    conditions* section (menu and profile both open Settings); the tile links to it. All four band
    chips render, so a saved band equal to the discipline default is pressed as itself.
  - **Air quality, sun on the wall, seepage and season** are on the card too. A failed air read
    says "not measured … not a clean-air reading" and caps nothing; a failed climate read says it
    "says nothing about its season". Seepage is a RISK from 7/14-day rain totals, worded as such.
    Aspect `'varies'` (0249) says the wall faces several ways, not "no wall direction on file".
  - **Not measured is not zero**: an unknown aspect (532 of ~300k crag routes have one, measured
    2026-10-07) drops sun/shade and the max becomes 85. Scoring it 0 would mark every such crag a
    star worse; scoring it full would mark it better. Both were the tempting default.
  - **Crag-only is a USER DECISION (2026-10-07)**: no score on alpine, scrambling, mountaineering,
    ice or mixed. A dry-rock friction number is wrong there, and a wrong number is worse than none.
    Section 4 fails if `CRAG_SCORE_DISCIPLINES` ever grows one of them.
  - **Rock type**: the drying factor reads `routeRock()` (lib/rockType.js): a route's own `rock`,
    else its area's (`areas.rock`, 0248). `rock_basis='mapped'` is the bedrock at the crag's
    coordinate (scripts/derive-area-rock.mjs) and **agrees with what routes state on rock FAMILY
    for 174 of 215 areas (81%)**. Until 2026-10-15 §5 required a "(mapped)" marker wherever it
    rendered; **the owner removed that word** (note item "Remove mapped word from rock type
    mention"), matching Mountain Project / theCrag, which print a crag's rock with no qualifier.
    §5 now fails if "(mapped)" comes back. `basis` still distinguishes the two in `routeRock()`.
  - **What it cannot see**: the drying hours per rock family (`DRY_HOURS`) are rules of thumb, not
    measurements, and the card says which rock it assumed. How a particular wall holds water is
    not modelled — seepage is only a risk from recent rain — and the card says so.
  - **Menu tile (§6)**: *Best day to climb* (`lib/BestDayTile.jsx`, opened from Menu › Plan & log; it left Home 2026-10-14) is the SAME
    `scoreForecast` over the saved crag climbs, with a compare table of each one's 7 days. It renders
    nothing with no saved crag climb, says "not a rating" when the forecast fails, and lists an
    unlocated climb as "No score: …" rather than dropping it. At most 8 crags are fetched, and it says so.
  - **Wall direction (0249)**: `areas.aspect` is written ONLY from an online statement about the wall
    or its crag (agents: `research-data/crag-aspects/`, `scripts/apply-crag-research.mjs`; page text:
    `scripts/extract-wall-aspects.mjs`), never from terrain. Both the card and the tile fall back to
    it when the route has no `aspect`. Agent research on the 10 biggest crags confirmed only 34 of
    ~566 walls (6%, 2026-10-07): pages rarely state a facing, so do not read the low coverage as a bug.
    `rock_basis='researched'` (the crag's rock as stated online) reads as stated, not mapped.
  - **§8 — THE WEATHER BESIDE THE SCORE (2026-10-07, modelled on climbitscore.com's crag page).**
    The card gained *Day by day* (each day's high/low and feels-like, its RAIN total "0.05" of rain
    over 4 h" with the top chance, and daylight wind/gusts, humidity range and cloud cover), *Hour by
    hour* (five panels on one axis — temperature with feels-like and dew point, rain AMOUNT, chance
    of rain with cloud cover, humidity, wind with gusts and direction arrows — for one day or all 7),
    feels-like, cloud cover and wind direction under *Right now*, and a **Shade map**.
    - **Rain by day** counts each hour's rain on the day that hour BEGAN (`precipitation[T]` is the
      hour before T, so midnight's is the evening before). A day with no precipitation values is
      null ("Rain not measured"), never "No rain"; a day under 0.01" reads "A trace of rain", not
      `0.00"`. Checked live against Climbit at Smith Rock: the same 0.05" over 4 h on the same day.
    - **Gusts print only when stronger than the wind** (after unit rounding): the model sometimes
      gives a gust below the mean wind, and "4 mph, gusts 3 mph" reads as a bug.
    - **The shade map** (`lib/ShadeMap.jsx`, arithmetic in `lib/terrainShade.js`) is the TERRAIN's
      shadow for the sun at a slider time, sunrise to sunset of the chosen day, over the app's own
      base layers. Heights are the open Terrain Tiles (terrarium) at zoom 14, a 4×4 block that keeps
      the pin ≥ 1.5 tiles from every edge. A SWEEP along lines away from the sun (each pixel once)
      costs ~60 ms for the 1024² grid; a ray per pixel at a low sun costs hundreds of millions of
      steps. The guard pins it on a 100 m ridge: exactly 100 m of shade on the far side at a 45° sun.
    - **It is NOT scored and does NOT write `areas.aspect`.** It is geometry under a clear sky from a
      ~7 m model, and the card says so (not trees, not overhangs, not which way one face points; the
      pin is the crag's location on file). "Sun reaches the pin 7:29 AM – 4:39 PM" is the ground at
      the pin, worded as such. Climbit feeds its shade into its score; that was deliberately not
      copied — a crag coordinate is often the parking or the crag's centre, not the wall.
    - **Terrain credit only where a licence requires it**: each tile names its model in
      `x-amz-meta-x-imagery-sources`; `TERRAIN_LICENCE_CREDIT` maps the folders checked against live
      tiles (nrcan_cdem, eudem, uk_lidar, kartverket, nzlinz, austria, pgdc_5m). US 3DEP/NED and SRTM
      are public domain and add nothing. Checked live: an Alberta crag shows the OGL – Canada line,
      Smith Rock shows only the imagery credit.
    - **It loads only near the screen** (IntersectionObserver): sixteen height tiles are ~1.5 MB.

- **`check:alpine-conditions`** asserts that the **alpine Conditions tab** (sub-tab `forecast` on
  alpine, mountaineering, scrambling, ice and mixed routes — `lib/AlpineConditionsCard.jsx`, logic in
  `lib/alpineConditions.js`) reads each discipline's OWN conditions, counts its start time back from
  the Planner's own estimate (`lib/planTimes.js`), and never claims what it did not read. Static, so
  it sits in `npm run build`; injection suite `scripts/oneoff/inject-alpine-conditions-cases.mjs`
  (22 cases, 21 caught + 1 silent).
  - **OWNER DECISIONS, 2026-10-07:** its own Conditions tab; FLAGS, never stars (no published alpine
    go/no-go standard exists to score against); the start gets a party back DOWN off the snow before it
    softens ("going down is more dangerous"); and "mixed and ice climbing needs a check because they can
    be different… same with scrambling and mountaineering, research online".
  - **THE DISCIPLINES DISAGREE ON DIRECTION, which is why there is one KIND per route and not one flag
    set.** Researched online the same day (guide services, avalanche centres, Parks Canada, AAC
    Accidents, Weiss et al. 2011 in the *Journal of Glaciology*, practitioner threads):
    | kind (how told apart) | leads with | start counts back from |
    |---|---|---|
    | glacier — mountaineering | no overnight freeze at the SNOW's height (forecast freezing level, not a clear sky); softening from ~7-9 AM | back DOWN below the snow before it softens: soften − (up + down), or the summit leg × 1.69 from camp |
    | alpine ice — `ice` with AI, snow in the grade, or on a peak; `mixed` with snow, 4+ pitches or 820+ ft | the same, off the face AND its descent before it warms (ACMG: "before noon") | as glacier |
    | waterfall ice — `ice`, WI, no snow, crag | temperature HISTORY: a night above freezing, 3+ days over 34 °F, +20 °F in 48 h, a sharp fall, rain, too few cold days to form, new snow and wind loading above the gully | **none** — there is no daily softening deadline |
    | crag mixed — `mixed` otherwise | weeks of freeze to lock blocks and turf in; a thaw is NOT a warning (thaw-freeze builds snow-ice) | **none** |
    | scrambling | thunder; WET ROCK; cold + wet = verglas (a cold night is BAD here) | off the summit by noon on a storm day, or the forecast onset if earlier |
    | alpine rock — `alpine` (incl. trad the page calls alpine) | showers and storms mid-climb; verglas | the START OF THE DESCENT before the storm |
    Alpine rock and scrambles also get the snow logic when the route's own text says it crosses snow
    (`routeTerrain().snow === "yes"`).
  - **THRESHOLDS AND THEIR STATUS — the screen calls every one a rule of thumb, never a standard:**
    published: thunder by WMO weather code 95-99; NWS wind chill (frostbite in ~30 min from about
    −18 °F); prolonged above-freezing including at NIGHT destabilises waterfall ice (Weiss et al.);
    avalanche the top ice hazard (Parks Canada). Rule of thumb: off summits by noon (CFI 2026, Roach;
    CFI's 2020 deck said 10 AM); summit gusts 30 mph caution / 50 warn (Met Office gale = 50); a foot
    of new snow in a day = obvious instability. Single source: CAPE ≥ 400 J/kg as a lightning
    predictor (1994 New Mexico study — NWS says no CAPE value makes storms certain, so it only ever
    reads "possible", and only with rain in the air); DeBruin's ice chart (night over 32 °F, 3+ days
    over 34 °F, +20 °F in 48 h); Gadd (2 / 4 in of new snow, 25 mph loading); Abacus (blocks need ~2
    weeks of sub-zero). Ours: a 15 °F fall in 6 h as "sudden cooling" (Weiss gives the mechanism, not
    a number); snow assumed down to HALFWAY up the gain when the route has no camp pin (the card says
    so). Not found anywhere, so not flagged: refreeze hours, bridge strength, rock drying time, a
    scramble wind limit, a whiteout visibility.
  - **NO REFREEZE GIVES NO SNOW START.** Found live on Easton Glacier (2026-10-07): with the freezing
    level above the snow all night, `softensAt()` returned the first daylight hour, so the card said
    "be back down by 8:00 AM, when the snow starts to soften" beside its own warning that the snow
    starts soft. A night with no refreeze now gives no snow-anchored start, and the card says there is
    no frozen window. A storm deadline can still set one.
  - **A FLOOR GIVES NO START.** `planTimes().legsFloor` — part of the walk or the climb is not on
    file, so the Planner marks it "≥". A start counted back from a minimum is too LATE, the dangerous
    direction, so the card says why there is no start instead. That is ~11,989 of the 12,685
    alpine-type routes (only 696 carry distance and gain).
  - **NEVER "SAFE".** A day with no flags says *Nothing in the forecast flags this day* and every kind
    states what a forecast cannot see (bridges, whether the ice is in, wet rock…). A failed fetch shows
    no flags and says it is not a reading. Flags carry VALUES only and the card words them through
    `uTemp`/`uElev`/`uWind`/`uSnowfall`, so section 6 renders every flag in both unit systems.
  - **The weather panel moved here from Safety** for these disciplines, and a route with NO placed
    waypoints now gets its area's coordinate at the route's high point instead of "No forecast yet".
  - **LIVE READS (section 8).** Avalanche danger (`lib/avalanche.js`: the public map layer's zone
    polygons, then that zone's forecast by elevation band) shows unless the route's own terrain says
    `avalanche: "no"`. Its headline is the HIGHEST of the three bands, because a zone's treeline
    height is not in the data and most climbs cross them. Off season, in season with no rating
    (Colorado's and Shasta's feeds carried no band ratings on 2026-10-07), outside every zone (all of
    Canada) and a failed read are FOUR answers, each says "not a rating", and none carries a number,
    so none can be drawn as Low. Two of the 84 zones are NAMED after their forecasting centre ("CAIC zone",
    "Bridgeport Avalanche Center"), so `zoneName()` reads those as "this zone": the card-source check
    for provider names cannot see a name that arrives in the DATA. Snow on the ground (`lib/snotel.js`) is the nearest snow station
    within 30 km, from one all-states station list cached on the device for 30 days. A route's state
    is not on its row, and a border climb can be nearer the next state's station. The section always
    says how far away the station is and how far below the top. Recent outcomes are the last 60 days of
    Summit / Attempt / Turned around reports, read from the tick and its outcome reasons. With none,
    the section is absent, never "0 summited". The alpine tick list gained "Turned around" (the walk list already had
    it, and `leaderboard()` has never counted it as a send), so every discipline on the tab can log
    one.
  - **SEASON AT THE TOP** (`fetchAlpineClimate`): the crag card's five-year archive climate, but read
    at the route's high point (`elevation=` in metres; without it the archive reads the grid cell's
    own height, which on an area coordinate can sit thousands of feet below the summit) and with
    snowfall. Each month shows high/low and snowfall, or wet days in a month under an inch of snow.
    Live on 2026-10-07: Baker's summit July 44/25 °F and January 9/−2 °F with 76 in. `monthlyClimate`
    adds a `snow` key ONLY when snowfall was asked for, so a crag's reading is byte-for-byte unchanged.
    The guard stubs `fetch` to prove the archive is asked for the summit's height, not inferred from
    the code's spelling.
  - **MODELS DISAGREE** (`fetchAlpineSpread` + `modelSpread`): the same 7 days from GFS, ICON and
    ECMWF (ECMWF sends no freezing level, so that is compared across two). A day whose models sit 40
    mph apart on the top gust, 12 °F on the high or 3,000 ft on the mean freezing level gets a caution
    worded with the range ("read its flags as low confidence"). The cuts are OURS. Nothing is
    published, and summit gusts disagree by a median 21 mph on ORDINARY days (six summits × 7 days,
    2026-10-07). So each cut sits near the 90th percentile; a lower one flagged most days and meant
    nothing. One model answering is NULL, not agreement. A failed spread read adds nothing, and the
    card never says the models agree.
  - **WHAT IT CANNOT SEE:** whether a threshold is RIGHT for a given range (Cascades numbers are rare —
    most ice and mixed material is Rockies, Colorado and Scotland); the card's runtime fetches (SSR
    renders only the loading state, so the fixtures exercise the logic directly, and the two feeds'
    live shapes were checked by hand on 2026-10-07, not by the build); which BAND a route is in.
  - **§9 — SUN AND SHADE (2026-10-08).** The crag shade map (`lib/ShadeMap.jsx`, arithmetic in
    `lib/terrainShade.js`) now renders under the alpine forecast too, on the route's OWN pins —
    summit (or top-out), base, and the HIGHEST camp (`sunPins`), never the trailhead — with each
    pin's sun hours for the selected day, and the terrain block centred on the climb (base, else top).
    - **Why (online research, 2026-10-08):** rockfall, icefall and wet slides start when the sun
      reaches the slopes ABOVE a party, so the advice everywhere is to work back from sun arrival —
      the AAC's Torreys Peak couloir accident, the Goûter couloir monitoring on Mont Blanc (the safe
      hour is specific to each couloir), Portland Mountain Rescue on Hood, a Devil's Kitchen report
      where rime let go as the sun hit the walls. Wet loose snow follows the sun round the aspects
      (east first, west in the warm afternoon), and centres put the slope that lets go at ~35°
      (Utah: stay off and out from under slopes approaching 35° once the sun wets them). CalTopo's
      sun-exposure layer and point chart are the tool climbers use for this today, by hand.
    - **No per-kind sun line, and no caveat footer under the map** (removed 2026-10-15 at the owner's
      request, with the forecast, smoke and hourly-wind caveat footers): the section is the map and
      its readouts only. Do not re-add them as a guard requirement.
    - **STEEP (35°+) AND IN SUN** is an overlay offered only where snow or ice is in play (glacier,
      alpine ice, waterfall, mixed, or a kind with snow legs). The slope comes from the same ~7 m
      heights, so a short steep step reads gentler than it is.
    - **A SUMMIT is read at the model's own high point** (`highestNear`, within 30 m). Measured
      live before it shipped: Colchuck Peak's summit pin sat one pixel off the model's top, 2 m
      lower, so the top "shaded" it until the sun was ~17° up — first sun 8:30 AM against a 7:10
      sunrise and a horizon under 2°. The Tooth's pin sits 20 m down its north face, 31 m below
      the top, and a 20 m radius stopped a pixel short: the top then took the midday sun off it
      (sun 7:23–11:13, 12:13–1:43, 2:43–6:32 on a pinnacle). Hence 30 m. Only the summit is snapped: beside a base or camp pin, a wall
      one pixel away is REAL shade, and the crag map has always read its pin's own pixel.
    - **The pins move no flag.** `lib/alpineConditions.js` IMPORTS no terrain (the guard reads its
      import lines); since §10 the card hands it the face's sun times as plain numbers.
  - **§10 — SUN ON THE FACE (2026-10-08; owner: "do what you recommend based on deep online
    research").** Glacier and alpine-ice starts also count back from the sun on the face.
    - **The rule, from the research:** be past a section before direct sun reaches the steep slopes
      above it — Portland Mountain Rescue on Hood ("as soon as the sun hits the upper slopes"), the
      AAC's Dead Dog (Torreys) and Whitehorn analyses, the Goûter couloir seismic record (Mourey et al.
      2022). The lag runs from minutes to hours and depends on the refreeze, so NONE is counted. No
      existing tool (CalTopo, ShadeMap, PeakVisor, FATMAP) turns sun into a start time.
    - **Where the slopes are.** The research's answer is the ground that DRAINS ONTO the line. With 1
      of ~935 snow/ice routes carrying a base pin (measured), the line is the fall line from 20 m
      below the summit down the route's `aspect` (`faceBearing`: one direction or two neighbours,
      else none), ended at the camp's height (else the trailhead's: lower, so it errs early). D8
      steepest descent finds what sheds onto it and WHERE (`faceSunBands`); a source binds at its
      ENTRY height, since debris entering below a party passes below it. The party is taken to gain
      all its height on the climb, evenly (`sunClimbStart`): errs early.
    - **Four measured corrections, each pinned by a test.** (1) A ±45° wedge seen from the summit took
      in the top of Willis Wall beside Liberty Ridge, lit at sunrise: "leave camp 7:15 PM" for a 12 h
      climb — hence drainage. (2) Terrain occlusion alone lit slopes turned AWAY from the sun (a
      pyramid's west face read sunrise): direct sun now needs the slope to face it. (3) One NE-facing
      ridge pixel beside a pyramid's top drained onto its NORTH line by a D8 tie: a height counts as
      sunlit only once 8 sampled steep sources (~1,500 m²) feeding it are lit — the model's own floor,
      NOT a published number. (4) On a 10 °F day the strict rule still read "7:45 PM": the sun sets
      the hour on a warm day and does not make a cold one warm (Goûter: rockfall rose ~3 h after the
      air at the top passed 0 °C; Dischma, 20 years: air temperature mattered, radiation did not), so
      a height counts only if that day's freezing level rises above it.
    - **Not counted, and said:** after a night that never froze (nothing frozen in place to begin
      with); on RIDGE routes (78 of 325 by name — what sheds off a flank falls away from the crest;
      a name that also says face, couloir, gully or glacier is read as that); on rock, scrambles and
      waterfall ice. The card names what it could not read (no summit pin, no one-direction aspect,
      no start height, no terrain) and carries the limits: fall line not a traced route, clear-sky
      ~7 m terrain, misses cornices/seracs/narrow walls, shade isn't proof of frozen, no lag, sun can
      shed rime on a cold day, and on a glacier that no timing reduces serac fall.
    - **Adding a deadline can only make a start EARLIER**, never later: the start is the earliest of
      snow, storm and sun. Seen live: Easton on a cold Saturday had no start before (snow frozen all
      day) and now reads a latest start to be past the thawing ground above camp.
    - **...and that latest start read "leave camp by 7:30 AM" (owner, 2026-10-16: "no one leaves camp
      at 7:30am").** Every forecast deadline says how LATE a party may start, with no margin; on a cold
      clear day they all fall mid-morning. Glacier and alpine ice now add a PRACTICE candidate
      (`snow-noon`, `LIMITS.snowBackBy` = 12): back off the snow by noon, need = the same up+down the
      snow deadline uses. Evidence: guided Easton summit days leave camp 2-5 AM for a 6.5-9 h round
      trip, club/self-guided parties midnight-2 AM; bridges weaken from late morning; the sun softens a
      sunlit slope while the free air is below 0 C (the freezing level cannot see it). Not after a night
      that never froze (no frozen window), and not on scrambles or alpine rock (their parties do not
      start in the dark for snow). The candidate carries `forecast`, the latest start the forecast alone
      allows, and the card prints it so the day-to-day signal is not lost. Easton (push-shaped 10.5 h,
      from camp) now reads about 1:30 AM; its own stored `recommendedStart` is "2:30 AM from camp",
      shown beside it.
  - **ICE-GRADED ALPINE ROUTES (2026-10-08).** `condKind` read every `discipline=alpine` route as
    alpine rock, so 18 of 5,147 with AI/WI grades (Triple Couloirs, Chair Peak N Face, Liberty Ridge,
    the Lane Peak couloirs, Cutthroat's Cauthorn-Wilson) got rock-dryness flags and the warm-rock sun
    note — backwards on a couloir, where sun is the hazard (a Norman Clyde party found the couloir in
    full sun by 11 AM). Researched route by route: all are snow/ice lines whose hazards are refreeze,
    thaw, sun-released rock and ice and avalanche; the few with rock (Holsten-Hilden, Gerber-Sink,
    Thread of Ice) are winter or couloir routes where dry rock is secondary. Now alpine ice.
  - **§11 — WHOLE-DAY ROWS (2026-10-08; owner: "2 and 3" to the offer to look at it).** 188 rows
    (81 alpine, 58 scrambling, 47 mountaineering, 2 ice) publish ONE car-to-car time and no split.
    - **The card said something false.** It gave no start and told the climber the Plan tab's
      estimate "is only a minimum (part of the approach or the climbing isn't on file)". A published
      total is not a minimum. Whole-day rows now say what they are.
    - **A start is possible where the kind needs only the way up and the whole day.** A scramble or
      alpine rock route has two deadlines, the thunder noon (`noon - way up`) and, with snow, the
      softening hour (`softening - (up + down)`, which IS the total). `wholeDayLegs` splits the total
      at `LIMITS.wholeDayUpShare` = 0.8. The card says the split is assumed and that it errs early.
    - **Why 0.8.** On the 311 catalog rows with all three legs stored, (approach + summit) / total is
      0.72 at the median and 0.82 at the 90th percentile (0.80 on the 79 one-day rows that sum to
      their total). 0.8 sits at that percentile: early enough for nine routes in ten, and early is
      the safe error. Checked against an independent record: the clock start stored on 151 of these
      rows implies a summit around noon (median 12.0, middle half 11.6-12.9) at the median share, and
      `noon - 0.72 x total` lands on the guide's start at the median (0 h; middle 80% from 1.0 h
      later to 1.6 h earlier). At 0.8 it is a median 1.0 h earlier, earlier than the guide's on 85%.
    - **Left without a start, and said:** glacier and alpine ice (their sun deadline counts the walk
      in and the climb separately, and a total cannot give it; a start missing a candidate could be
      LATER than the sun allows), and a whole-day total on a multi-day itinerary (no summit day
      from camp to count back from).
    - **Do not re-derive:** `techH` IS the published total on a whole-day row (pinned by a test), so
      the split is applied to the right number; the Plan tab's walk model is NOT added on top.

## A glaciated ALPINE route keeps the glacier card (2026-10-08)

`condKind` (lib/alpineConditions.js) used to send `alpine` to `alpinerock` and only `mountaineering` to `glacier`.
Re-filing a glaciated route as alpine (El Dorado East Ridge: Inspiration Glacier, then 5.7) would have stripped its
crevasse-bridge, snow-deadline, sun-on-face and avalanche-panel logic. An alpine route whose own terrain read says
`glacier: "yes"` is now kind `glacier`, and `ctx.rockToo` keeps the rock-weather flags (verglas, wet rock, showers)
on it. The evidence is the terrain read, never the discipline. `check:alpine-conditions` holds it.

  - **HOUR BY HOUR + THE GUST WINDOW (2026-10-08, owner: "clear and exact and accurate science").**
    Section 12 of the guard. Three things it holds, each measured, not assumed:
    - **Every box names its OWN period.** Open-Meteo (open-meteo.com/en/docs) stamps hour T and means the
      reading AT T for temperature, wind speed, cloud and the freezing level, but the sum / probability /
      maximum of the hour BEFORE T for rain, snow, the chance of precipitation and the 10 m gust. The
      boxes in `lib/HourTiles.jsx` carry `at(T)` or `spanEnding(T)` and never share one hour label.
      The crag chart's old sentence ("rain in the hour before") was the same fact, said once for a
      whole sentence of numbers.
    - **The day's gust is ONE number with its window stated.** The alpine card's top "Gusts" tile counted
      DAYLIGHT hours; the summit forecast under it counted all 24. Same API, same variable, same point
      (live at Rainier: 4 vs 13 mph and 17.7 vs 25.1 on two of seven days), so a climber saw two numbers
      for one thing. The tile now reads "Gusts, any hour" with the daylight figure under it, and the
      wind FLAG says "in daylight", because daylight is the window its 30/50 mph cuts are judged on.
    - **No hour is ever marked safe.** NWS publishes no CAPE cut and calls the noon rule nothing; mountain
      models run low in strong wind (HRRR over Wyoming and Colorado: large negative bias at the strongest
      speeds). Thunder hours say "forecast" or "possible"; a quiet hour carries the caveat.
    - **Verified against independent sources (2026-10-08, one route per discipline, same 24-hour window):**
      sunrise/sunset within 1–2 min of the NOAA solar-calculator equations; the freezing level within
      ~75–630 ft of the level implied by MET Norway's temperature at the same height; highs agree with
      NWS once its grid height is lapse-corrected; winds agree with NWS (Rainier 31 mph sustained / 58 gust
      vs NWS 44) and MET Norway runs low on wind everywhere (9–13 mph where NWS says 20–44), which is the
      known mountain pattern, not our error.
    - **Not shipped, on research:** switching the wind flag to 700/500 hPa wind. No source verifies that
      free-air wind predicts summit wind (inversions, gust factor, rime on the anemometer break it).
  - **SMOKE AND AIR QUALITY on the alpine card (2026-10-08, owner: "yes for smoke and air quality").** Section 13 of
    the guard. The crag card had an AQI section; the alpine card had none. `airDay()` takes the worst hourly US
    AQI of the LOCAL day (null, never 0, when the ~5-day forecast does not reach it); `smokeFlag()` flags above 100
    (caution) and 150 (warning), the EPA's own bands (unhealthy for sensitive groups starts at 101, everyone at 151).
    What the number is (Open-Meteo air-quality docs): PM is a rolling average over the PRECEDING 24 hours, so an
    hour lags a plume's arrival and clearing; the grid is ~45 km global, ~11 km Europe; nothing is claimed for
    mountains. So the flag and the section both say "a forecast for the area, not a reading at the route; smoke
    aloft or pooled in a valley is not seen", and a failed read says "not measured", never "clean". Checked live on
    Rainier, Wenatchee and Boulder (all Good today); the smoky case is covered by synthetic series, since October
    is clean.
  - **WEATHER ALERTS on the alpine card (2026-10-08, owner: "do weather alerts").** Section 14 of the guard. Active
    watches, warnings and advisories at the route's point (api.weather.gov/alerts/active?point=, US only, open to
    the browser). Each alert is shown AS ISSUED: its event name, severity, urgency, certainty, window, and its
    `WHAT...` line verbatim (in the units it was issued in; a paraphrase of a wind speed is a wrong wind speed).
    Extreme/Severe flag as a warning, everything else issued as a caution, and the flag joins the day chips.
    - **Use `ends`, never `expires`, for the event window.** A live Blowing Dust Advisory had `expires` 07:15 and
      `ends` 19:00: the MESSAGE expires hours before the EVENT ends, because it is due to be reissued. Reading
      `expires` drops a live alert hours early. Pinned by a test built on that shape.
    - **Outside the US the service answers HTTP 400 "out of bounds"**: that reads "not checked", never "none". A
      failed read is "not measured" with a retry. A quiet day says none is NOT an all-clear (alerts are issued a
      day or two ahead) and that an alert covers a forecast ZONE, far larger than a route and across very
      different heights. Cached for 10 minutes, not the session: alerts are issued and cancelled within the hour.
    - **The alert's own `headline` is NOT printed**: it ends "...by NWS <office>", which names the issuer and
      would break `check:no-sources`' rule that no screen names a provider.
    - **Not shown, on research:** WSDOT pass status (needs an access code; unauthenticated request is HTTP 401).
  - **FOG, SNOWFALL, SNOW LEVEL, STREAM FLOW, REPORT FRESHNESS on the alpine card (2026-10-08, owner: "do the unbuilt
    ideas now too, research online for scientifically correct information").** Section 15 of the guard. Each states
    what it is and what it cannot see:
    - **Fog:** a daylight hour whose model visibility is under 1 km (the published meteorological definition; the UK
      public-forecast cut is 180 m). A CAUTION flag that says the model's accuracy in mountains is unchecked and that
      no fog hour is not a clear day. No whiteout standard exists, so the card never says "whiteout". Visibility is
      capped on screen at 10 mi / 16 km (the model returns 200+ km). Low cloud shows beside it.
    - **Snowfall:** days since the last MEASURABLE snow (the NWS's 0.1 in/day; less is a trace) from the forecast model's
      own past hours (modelled, not measured), plus the modelled total. It flags NOTHING: no validated
      days-since-snowfall cut exists, and stability depends on the weak layers beneath new snow for days to weeks.
    - **Snow level:** the freezing level over the day's WET hours less 500 to 1,500 ft (NWS-cited studies; "about
      300 m" is the textbook rule), shown as a range; "not applicable" on a dry day. A rule of thumb, not a forecast.
    - **Stream flow:** the nearest gauge within 25 km of the trailhead (else the forecast point), last 24 h, shown in
      the GAUGE's own local clock. Provisional readings say so; a reading the gauge marks (ice-affected, equipment
      malfunction...) shows NO number; the no-data sentinel (-999999) is never a reading. Trend is read over 3 h and
      "steady" is under 10% (ours: no published cut). NO safe/unsafe verdict, because a gauge reads its own cross-section
      (often another stream; the distance is stated), discharge is a fitted curve, and adults lose footing at depth x
      speed of about 10 to 20 ft²/s (0.9 to 1.9 m²/s), which no gauge sees. The agency's name never prints.
    - **Report freshness:** the age of the newest trip report and how many are in the last 14 days. A failed read of
      the reports is "not known", never "none on file".
    - **TRAP (found only by opening the page):** the Snowfall section was handed the card's per-day SUMMARY object, which
      carries no `hours`, and `snowLevel()` crashed the whole route page ("Cannot read properties of undefined
      (reading 'filter')"). Every static guard and the synthetic tests passed, because the tests built the day in the
      right shape. The section now looks the raw local day up by date, and the guard pins both the lookup and that
      a shape without `hours` throws. LESSON: a card that mounts only after a fetch resolves is invisible to the
      static render walks. Open it on a real route in Chrome before calling it done.
    - **VISIBILITY ARRIVES IN FEET (fixed 2026-10-14).** `precipitation_unit=inch` switches EVERY length Open-Meteo
      returns to feet -- the freezing level (known) and visibility with it (`hourly_units.visibility` is `"ft"`,
      checked live). The card read it as metres, so a 3,000 ft (914 m) fog hour read as 3 km and never flagged, and
      every visibility on screen was 3.3x too long. `visibilityInMetres()` (lib/forecast.js) converts at fetch BY THE
      UNIT THE RESPONSE STATES and drops a series in an unstated or unknown unit (the tile then reads "Not measured").
      TRAP: the section 15 fixture fed metres with no `hourly_units`, the same assumption as the code, so it passed
      the bug; it is now shaped like the live response (feet + unit) and goes through the conversion. LESSON: a fixture
      written from the code's assumptions cannot test them -- build it from a live response's units block.
    - **A CLOCK CHANGE MID-SERIES (guard section 17, fixed 2026-10-14).** The alpine card read all 21 days (14 past +
      7 ahead) through ONE `utc_offset_seconds` -- the offset at fetch time -- so across 2025-11-02 the Nov 2 sunrise
      (6:51 AM PST) read 7:51, local days were cut at 1 AM, and "today" turned over at 11 PM; from late October and
      in March every series crosses a change. It now reads local time through the crag card's zone-aware `localFn`
      (lib/conditionsScore.js) via `localAt` / `localDays` / `dayStartMs` (an alert's day is 23-25 h). Fixtures with no
      `timezone` keep their fixed offset. The same section pins #2342: the start's days-early is counted ONCE per day
      (`day.daysEarly`), so the hour strip no longer prints "Start by 7 PM (the night before)" under a box that says
      the push is too long for one day.
    - **STREAMS (2026-10-14):** a WATER LEVEL's trend is read in feet (`STEADY_STAGE_FT`, 0.1 ft in 3 h, ours), never as a
      percent of a height above an arbitrary datum; a "now" reading more than 2 h old says how old; gauge names spell
      out the naming abbreviations (R, CR, NR, BL, AB, NF/SF/MF...) and keep the state code in capitals (`gaugeName`).
      Report freshness counts CALENDAR days on this device (a report dated today read "yesterday" from 5 PM Pacific).
    - **TEMPERATURE GAPS (guard section 16, measured 2026-10-14):** a temperature is for ONE height, and a screen that
      sets two numbers side by side has to say whose. (1) The NWS grid cell under a summit sits 150 to 850 m BELOW
      it (Rainier: cell 3,890 m, pin 4,392 m), so its raw temperatures read up to 9 F warmer than the
      height-adjusted Open-Meteo and MET Norway series beside them, and the weather panel's "differs" flag fired
      on a difference of height, not of forecast. `nwsHeightShiftF()` (lib/forecast.js) shifts them by the standard
      lapse rate (6.5 C per km, an average: inversions break it) and the row says "adjusted N° colder for this
      height". An unknown height shifts nothing and is never guessed. (2) The "Open-Meteo reads cold at summits"
      suspicion is NOT supported: against five SNOTEL stations (4,900 to 11,310 ft, 121 hours each) its bias was
      -3.7 to +1.9 F with a typical hourly error of 3.3 to 4.8 F, about -1 F at 11,300 ft. Services still differ
      by 2 to 4 C at a summit in BOTH directions (Open-Meteo minus MET Norway: -3.8 C Rainier, +2.0 C Hood), so the
      card states the typical error and that services can differ by more. NOT MEASURABLE: which service is right
      at a summit itself, since no station sits on one. MET Norway has no past series, so only Open-Meteo was
      checked against stations.
      RESEARCH (2026-10-14, what the lapse rate can and cannot claim): 6.5 C/km is the standard atmosphere's global
      annual AVERAGE for free air. Measured slope rates differ: Mount Washington's own record averages 5.5 C/km
      (3.0 F per 1,000 ft), agreeing with earlier New England studies, and 6.5 fit poorly in every season, worst in
      winter; maximum-temperature rates run steeper than minimum, and summer steeper than winter (Himalaya and
      Tianshan studies agree it varies by season and slope). Over Rainier's 1,650 ft cell-to-pin gap the two figures
      differ by about 1 F (5.9 vs 5.0), inside the 3 to 5 F typical hourly error, so the standard 6.5 stays
      (it is what weather services use) and the row says "adjusted", never "corrected". Open-Meteo's docs say its
      `elevation` parameter does "statistical downscaling" (default: a 90 m terrain model) but publish no method
      or lapse rate, so what it does between cell and pin is UNVERIFIED beyond the station check above.
      NWS publishes no lapse rate for its own cell either (gridded MOS adjusts for elevation in passes of
      varying strength).
      WIDER CHECK (2026-10-14, after the first five stations): Open-Meteo's ARCHIVED FORECASTS (not analysis) against
      SNOTEL hourly air temperature at 53 distinct station-seasons (about 20 stations in WA, OR, CA, ID, MT, WY, UT, CO, NM, AK,
      5,040 to 11,680 ft; 14 days in January, 14 in July, 13 in October). Median absolute error 3.3 F overall: 3.2 F
      in summer and in autumn (90th percentile 4.8 and 4.4), but 4.6 F in WINTER with a 90th percentile of 8.5 F, and
      14 of 17 winter stations read too COLD (median bias -1.9 F, to -7.2 F at Harts Pass, Leavitt Lake, Smiley Mountain,
      Webster Flat, Look Eyrie). It is not removable: the bias runs -7 to +2 F by site. The card says so ("in winter by
      up to N, most often reading too cold") rather than correcting for it. CAVEAT: a snow station stands in a clearing
      or basin, so a ridge or summit may differ from it in either direction; the figures describe stations, not summits.
      The first five-station run (all autumn) was too optimistic to state alone.

- **Ideal temperature and wind are RANGES, not presets (2026-10-14, owner's request).** The four chips (Default / Cool /
  Mild / Warm) were exclusive, so a climber happy from cool to warm could not say so. Both are now a two-handle
  slider (`lib/RangeSlider.jsx`): drag either end, so a wide range is one choice. Cool / Mild / Warm stay as
  SHORTCUTS that set a range. Stored in deg F and mph (`defineRangePref` in lib/prefs.js, keys `climbmatch-cond-temp`
  and `-wind`, validated on read: two finite numbers in bounds at least 4 F / 3 mph apart, anything else reads as
  "nothing chosen"), so a change of display units never moves the choice; the handles SNAP to a number the climber
  can see (whole degrees C when metric) through `uTempIn(uTempN())`. A band saved in the old chips is the starting
  range. Wind had no preference before: it was the fixed rule full at 10 mph, nothing at 35. Unchosen it is still
  that rule EXACTLY (range [0,10], fade 25 mph above), pinned in `check:conditions-score`; a climber who wants a
  breeze can raise the bottom (fades over 10 mph below). Each handle is a real slider (named, arrow keys,
  Home/End). TOUCH (2026-10-24, owner: "Settings page is difficult to scroll"): handles AND track are
  `touch-action:pan-y`, so a sideways drag moves a handle and an up-down swipe scrolls the page, as a native range
  input does. It was `none`, which made each slider's 44 px row a dead zone for scrolling, and the track jumped a
  handle on POINTERDOWN, so a swipe begun on it CHANGED the range (measured: 45°-68° became 18°-68° by scrolling).
  The track now jumps on a TAP that lifts within 10 px of where it began (a touch the browser takes for a scroll
  is cancelled and never lifts; an onClick would do the same but `check:clickable` counts it as a mouse-only control) and a handle drag the browser cancels
  for a scroll puts the range back; all three pinned in `check:conditions-score`. WHICH HANDLE IS ON TOP where their 44 px hit areas overlap: the LOW one once the
  range sits past the middle of the track, the high one before it (pinned in `check:conditions-score`). A fixed
  "high on top" stranded the low handle at the top of the scale: every touch landed on the high handle, which
  cannot go further right, so the range could not be widened again. TRAP: the Conditions browser window may be hidden (`visibilityState` hidden,
  `innerWidth` 0) in an automation session, which makes screenshots fail with "0 width"; a NEW tab got a real size.

- **The two "Your conditions" builds, MERGED (2026-10-14).** The drag-both-ends ranges above and the
  per-discipline / account-saved store were built in parallel. One store now: `lib/CondPrefs.jsx`
  (`climbmatch-cond-prefs-v2`, saved to `profile_condition_prefs`), whose every temperature scope (all, each crag
  discipline, alpine, ice & mixed) and whose wind are `RangeSlider`s. Wind is a RANGE in the store (`wind: [lo, hi]`).
  The single-range keys above (`climbmatch-cond-temp`, `-wind`) and the old preset key are READ ONCE, when the v2
  key is absent, and become the all-climbing range and the wind range, so a climber who set either keeps it. The
  scorer still takes the older shapes (`tempRange`, reported as bandKey `custom`; `windRange`; `windMax` read as
  calm to that limit), and `check:conditions-score` holds each.

  - **YOUR TEMPERATURE RANGE ON ALPINE, ICE AND MIXED (2026-10-14, owner: "alpine would be a different
    discipline that only affects alpine routes"; "do what you recommend based on your online research").**
    Researched twice, the second time in extended mode: **no published temperature range exists for
    alpine, mountaineering, scrambling, ice or mixed.** Ice guidance is qualitative (sustained cold keeps
    it in; a thaw is the hazard, which `iceWarmNight` and friends already flag); the only numbers are one
    regional forum's "chewy at about -5 to -15 C" and "brittle at -26 C" (single source, Celsius, one range);
    mixed on turf wants frozen ground, and dry-tooling works at any temperature; alpine summits are simply
    mostly below freezing and the comfort figures on offer are Everest/Denali frostbite reports. So:
    the ranges are the climber's OWN, there is **no preset and no default** (an unset range shows no line),
    and the result is ONE neutral sentence under the day's flags (`RangeLine`, `rangeNote`). Two scopes,
    **Alpine** (alpine, mountaineering, scrambling) and **Ice & mixed**, neither inheriting the
    all-climbing range. It never reaches `dayFlags`, a flag level, a day-tab dot, a count or a start time,
    and uses no red or amber. `check:alpine-conditions` section 17 holds each of those. Do not add a
    default range or a preset here without a source that states one.
