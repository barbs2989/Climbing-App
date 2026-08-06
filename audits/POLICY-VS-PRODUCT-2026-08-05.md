# Policy vs product — what the legal text promises that the app does not do

Read against `main` on 2026-08-05. **This is a factual consistency check, not legal advice.**
Every row is "the document says X; the code does Y" with the evidence. The remedy for each —
build the mechanism, or amend the text — is a decision for the legal review, not for this file.

Terms and Privacy are **substantive drafts**, not stubs: 12 and 11 sections, ~2.5k and ~2.1k
characters, no placeholder markers. So the review is a review of real text.

---

## The Terms were right, and the app's marketing copy contradicted them

Worth stating first because it inverts the usual assumption. On two safety claims the legal
text was the honest one, and the in-app copy wrote cheques the Terms explicitly refused:

| Terms say | The app used to say | Resolved |
|---|---|---|
| "Belay catches, vouches, and trust scores are **community-reported signals, not guarantees** of anyone's skill or reliability." | "Catches are **confirmed by both climbers**, so a belay record **can't be faked**." | #541 |
| "We verify credentials **on a best-effort basis** but **do not guarantee** any guide's qualifications, insurance, or conduct." | "**Every guide** is identity- and credential-verified." | #564 |

Both are now consistent with the Terms. Anyone reviewing marketing copy against these
documents should treat the Terms as the baseline, not the other way round.

---

## Open gaps — Privacy Policy promises without a mechanism

### 1. Account deletion — the policy and the product state opposite things

> **Privacy → Your rights:** "You can access, correct, export, or delete your data… **Account
> deletion is available in Settings** and removes your profile and personal data, subject to
> limited legal retention."

The delete-account modal in Settings says, verbatim:

> "Signs you out of this preview. **We don't yet support full account & data deletion** —
> contact support to request it."

The handler calls `signOut()` and nothing else. This is the sharpest gap: the published
policy asserts a capability the product explicitly disclaims in the same screen the policy
points at. Right-to-erasure exposure is the reviewer's call; the factual contradiction is not
in doubt.

### 2. Data export — promised, no mechanism

"access, correct, **export**… your data" — there is no export control anywhere in the app
(`export data` / `downloadMyData` / equivalent: zero call sites). Access and correction are
satisfied by the profile editor; export is not.

### 3. "Opt out of non-essential processing" — promised, no control

No opt-out surface exists.

### 4. The privacy controls the policy describes are switched off

`PRIVACY_CONTROLS_LIVE = false` (`ClimbMatchCore.jsx`) gates **four** controls out of the UI:

- precise vs **"Approximate location only"** toggle
- **who can see my full profile**
- show-online / presence
- who can invite me to crews

Against:

> **Privacy → Location:** "You control location sharing. *'Approximate location only'* shares
> your city rather than your exact spot."
>
> **Privacy → What others can see:** "Other climbers see your public profile **as governed by
> your privacy settings** — the fields you choose to make visible."

Both describe controls the user cannot currently reach. **Do not simply flip the flag** —
that would expose four controls whose persistence has not been verified, which is the exact
anti-pattern the rest of this audit has been removing. Verify each one writes and reads back
before enabling.

---

## Checked and consistent

- **Terms → Climbing is dangerous / assumption of risk** — matches the app's posture: route
  data is community-sourced and the UI says so.
- **Privacy → What others can see: "Emergency contacts are never shown on your public
  profile."** Confirmed — `emergencyContact` is not rendered on any public profile path.
- **Privacy → Security: encryption in transit and at rest, limited internal access.**
  Supabase-provided; no contradicting client behaviour.
- **Privacy → Children (under 13).** No age gate exists, but the policy only claims the
  service is "not directed to" children and that data will be deleted on report — which is a
  statement of posture, not a mechanism claim.

---

## Suggested agenda for the legal review

1. **Deletion and export** (gaps 1–2) are the substantive ones — they are enumerated user
   rights with no implementation. Decide build-vs-amend before launch.
2. **Gap 4** is cheap to close in the product's favour: the controls exist in code and are
   flag-gated. Verify persistence, then enable, and the Location and What-others-can-see
   sections become true as written.
3. **Gap 3** is likely an amend — there is no non-essential processing to opt out of today.
