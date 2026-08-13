# Policy vs product — full review against `main` @ c7b25d3, 2026-08-13

**This is a factual consistency check, not legal advice, and no legal text was edited.**
Every row is "the document says X; the code does Y", with the evidence. The remedy for each —
build the mechanism, or amend the text — is the reviewer's decision, not this file's.

Supersedes `POLICY-VS-PRODUCT-2026-08-07.md`, which was read six days and ~50 merged PRs ago.
Its four gaps are **all re-verified as still open and unchanged** (§D). But that audit read
only two of the app's *four* legal-ish surfaces, so most of what follows is new.

**Every claim below was confirmed present in the live production bundle**
(`/Climbing-App/assets/index-za9sKtJ3.js`, 1,332,427 bytes), not just in source. A
contradiction that exists only in a source file is a bug; one that ships is a disclosure.

---

## The four surfaces

The app makes privacy and terms representations in **four** places, written at different
times by different hands, and nothing ties them together:

| # | Surface | Where | Reached from |
|---|---------|-------|--------------|
| 1 | **Terms of Service** — 12 sections | `LegalView` / `TERMS`, `ClimbMatchCore.jsx:1438` | Settings → Legal |
| 2 | **Privacy Policy** — 11 sections | `LegalView` / `PRIVACY`, `ClimbMatchCore.jsx:1439` | Settings → Legal |
| 3 | **"Privacy" sheet** — 11 entries | `privacyOpen`, `ClimbMatch.jsx:568` | Settings footer **and** partner search |
| 4 | Scattered in-app copy | deletion modal, export button, feedback sheet | various |

1 and 2 are the considered documents and carry the disclaimer *"Plain-language template for
the ClimbMatch prototype. Before launch, have a lawyer review it… Last updated June 2026."*
**3 carries no such disclaimer, is not labelled a policy, and contradicts 2 on five points.**

---

## A. The "Privacy" sheet tells the user there is no server. There is a server. — NEW, most serious

`ClimbMatch.jsx:568`, first entry, shipping:

> **What we store** — "Your profile, climbs, crews and availability stay on your device for
> this demo — **there is no server and nothing leaves your phone**."

That is false in production, and the same bundle carries the proof:

- the bundle contains the Supabase project URL and the publishable API key (`supabase.co` ×1,
  key ×2)
- `lib/db.js` reads and writes **35 tables**, among them `profiles`, `climb_logs`, `messages`,
  `crews_messages`, `connections`, `vouches`, `belay_catches`, `verification_records`,
  `user_reports`, `guide_documents`
- so a signed-in climber's profile, logbook, direct messages and crew chats are written to a
  hosted database — while the screen labelled *Privacy* says nothing leaves their phone

Confirmed in a real browser against the live site, not inferred from the bundle: the Climbs
tab renders **"PICK A COUNTRY / Loading countries…"**, which is `DbAreaBrowser` — a screen that
exists only on the DB path (the seed path walks the in-memory `MOUNTAINS` tree and has no
country picker). The production app is visibly sitting on a pending Supabase request. `USE_DB`
is on in production; this is not a demo build.

*(Aside, not a finding: Supabase was returning `504` during this check and the countries never
finished loading. That is the transient backend condition already on record, not evidence
about the policy.)*

**It is not demo-gated.** Two entry points, neither behind `DEMO_FILLERS` or `USE_DB`:

- `ClimbMatch.jsx:686` — a **Privacy** link in the Settings footer, beside Feedback
- `ClimbMatch.jsx:620` — `PartnerSearch`'s `onOpenPrivacy`, i.e. the sheet a climber opens
  from the *discovery* screen while deciding whether to be visible to strangers

The "for this demo" wording suggests it was written when the claim was true and never revisited
once the backend landed. Six of its eleven entries are still framed as demo copy.

**This is the one item I would not wait on the legal review for.** The other findings are
promises the product cannot yet keep; this one is an affirmative statement about data handling
that is untrue at the moment it is read, on the screen a privacy-conscious user goes to.

## B. Two different minimum ages ship, and neither is enforced — NEW

| Surface | Says |
|---|---|
| Terms §2 *Who can use ClimbMatch* | "You must be at least **13** to create an account, and 18 or older to book a guide or be verified for belay catches." |
| Privacy sheet, *Age* | "ClimbMatch is intended for climbers **18 and older**." |

Both strings ship. They cannot both be the rule.

And **no age is collected anywhere.** `lib/AuthModal.jsx` — the real sign-up — takes exactly
three fields: display name, email, password. There is no birthdate, no age, no 13+ or 18+
attestation, in sign-up or in the profile editor. So:

- Terms §2's 13+ floor is unenforced
- its 18+ condition on guide booking and belay verification is unchecked at both gates
- Privacy §9 *Children* ("we do not knowingly collect their data") is the one claim here that
  **is** consistent — you cannot knowingly collect an age you never ask for. Whether that is
  the posture you want is a reviewer question, not a code question.

## C. Every route to exercise a data right is a dead end — NEW

The Privacy Policy §6 grants five rights: access, correct, export, delete, opt out. It offers
four ways to reach a human. All four are non-functional:

| Route offered | Where | Reality |
|---|---|---|
| `privacy@climbmatch.example` | Privacy §11 | `.example` is an RFC 2606 reserved TLD. It resolves nowhere by design; mail can never be delivered. |
| `legal@climbmatch.example` | Terms §12 | same |
| "contact **support** to request it" | deletion modal | no support address, form, or link exists anywhere in the app |
| "Reach us through the **Feedback** button" | Privacy sheet, *Questions* | the Feedback button sends nothing. Its own source comment: *"No inbox exists for this build… nothing is sent."* Its toast: **"Copied to your clipboard — nothing was sent"** |

The Privacy sheet also says *"A dedicated privacy address is not set up in this demo build
yet"* — directly contradicting Privacy §11, which prints one.

So the documents grant rights whose only exercise mechanism is four dead ends, one of which
tells the user to their face that nothing was sent. **Fixing gaps 1–3 below by pointing at a
contact channel requires that channel to exist first** — today it does not, so these are
sequenced, not parallel.

## D. The four gaps from 2026-08-07 — all re-verified, all still open

| # | Gap | Status today | Evidence |
|---|---|---|---|
| 1 | **Account deletion** | still open, unchanged | button reads "Delete my account & data"; modal titled "Sign out & delete?"; body: *"We don't yet support full account & data deletion — contact support to request it."* Promised by Privacy §6 **and** Terms §10 ("You can delete your account at any time in Settings"). |
| 2 | **Data export** | still open, unchanged | "Export my data" button; whole handler is `showToast("Data export isn't available yet in this preview.")`. No `exportMyData`, no `buildExport`, no blob assembly. |
| 3 | **Opt out of non-essential processing** | still open, unchanged | "opt out" appears **once** in the entire app — inside the policy text promising it. No toggle of any kind. |
| 4 | **`PRIVACY_CONTROLS_LIVE = false`** | still open, unchanged | still 8 references across the two app files. |

Gap 4 remains **deliberate and correct** — the controls are not server-enforced, so shipping
them would promise a protection the backend does not deliver. Per
`privacy-controls-need-server-enforcement`, **do not flip this flag to satisfy an audit.** It
is listed only because the policy describes controls a user cannot see.

Also unchanged and worth repeating: the signed-in deletion branch has never been exercised by
anyone — there is no standing test account — so gap 1 is read from source, not from a click.

## E. Nobody is told the Terms exist at the moment they accept them — NEW

Terms §1: *"By creating an account or using ClimbMatch you agree to these Terms."*

`lib/AuthModal.jsx` — the real sign-up form — contains **zero** occurrences of "terms". No
link, no checkbox, no line of notice. The documents are reachable only from Settings → Legal,
after the account exists.

The sharp detail: the **demo** `LoginScreen` *does* link them — `onLegal={setLegal}` at
`ClimbMatch.jsx:540`. So the fake sign-in screen gives the notice and the real one does not.

Related, same section: there is **no version or acceptance record at all**. Zero matches for
`policyVersion`, `termsVersion`, `acceptedTerms`, `policy_version` across both app files and
`lib/db.js`. So:

- Terms §11 *"we will notify you of material changes"* — no mechanism
- Privacy §10 *"material changes will be highlighted in the app"* — no mechanism
- and there is no record of which version any user accepted, which is the thing that makes
  §1 enforceable in the first place

## F. Smaller factual mismatches — NEW

Each is one sentence in a document describing something the product does not do. None is
harmful; all are wrong, and three of them over-disclose (they imply collection that is not
happening, which is the safer direction to be wrong but still worth cutting).

1. **Payments.** Privacy §5 discloses sharing data with providers for "hosting, maps,
   **payments**". There is no payment processing. The guide flow says *"No payment now"* twice;
   `lib/db.js:978` comments the whole feature as *"directory/lead-gen, no payment"*. No
   processor is integrated. Cutting the word is the whole fix.
2. **Passkeys.** Privacy §8 advises *"use a strong, unique password or a passkey."* There is no
   passkey support — 0 matches for `passkey`/`webauthn` in `AuthModal.jsx`. A fake "Sign in
   with a passkey" button was *deliberately removed* (see the comment at
   `ClimbMatchCore.jsx:1706`) precisely because it promised something that did not exist. The
   policy still recommends it.
3. **Third parties.** Privacy sheet: *"We don't sell your data, run ads, or share your
   information with third parties. There are no third-party trackers."* Privacy §5:
   *"We share data with service providers… (hosting, maps, payments) under contract."* These
   are opposite claims about the same fact. The app does contact third parties — Supabase,
   map tiles, and the NOAA/NIFC/AirNow fire and weather services.
4. **ID verification.** Privacy sheet: *"Optional ID verification confirms you are a real
   person… the document itself is never shown to anyone."* No document is ever collected —
   `addVerification` (`lib/db.js:1854`) writes exactly `{user_id, verification_type, status}`.
   The sentence is vacuously true and implies a document upload that does not exist.
5. **Emergency contacts.** Privacy §3 says they are "never shown on your public profile" —
   that holds; no public-profile render exists. But §1 lists them as collected without
   disclosing that filing a float plan **shares the contact with your crew**
   (`ClimbMatch.jsx:632`). The Privacy *sheet* discloses this; the Policy does not.

---

## What the reviewer needs to decide

Grouped by the kind of decision, because they are not all the same kind.

**Decide nothing — just fix (my recommendation, pending your go-ahead):**
A (the "no server" claim) and F1–F4. These are statements that are simply untrue or describe
removed features. No legal judgement is involved in deleting a sentence about a payment
processor that does not exist. A is urgent for the reason given in §A.

**One decision, four consequences — the age question:**
B. Pick 13+ or 18+, then: make the two surfaces agree, decide whether to collect an age at
sign-up, and decide whether the 18+ gates on guide booking and belay verification are checked
or dropped from the Terms.

**Sequenced, not parallel — the data rights:**
C then D1–D3. A contact channel has to exist before "email us to request deletion" is a real
answer. Once one exists, gaps 1–3 each become the same binary: **build the mechanism, or amend
the text.** Gaps 1 and 2 are the same decision (the app's own UI says it cannot do what the
policy says it does) and can be taken together.

**Structural, and the one with legal teeth:**
E. Notice at sign-up plus a version/acceptance record. This is what makes §1 mean anything,
and it is a small piece of work — a link and a checkbox in `AuthModal`, a version constant, and
a column.

**Leave alone:**
D4. Deliberately disabled for a good engineering reason. If anything, the *policy* wording
should soften to match, not the flag flip to match the policy.

Two standing notes carried forward from the 2026-08-07 audit, both still true:

- Do not pre-emptively amend the legal text. On two prior occasions (#541 belay signals, #564
  guide verification) the Terms were the **honest** document and the in-app copy was the thing
  that needed fixing. **§A and §F3 are that same shape again** — the considered Privacy Policy
  is right and the casual in-app sheet is wrong. Treat 1 and 2 as the baseline; suspect 3 and 4.
- Nothing here required a code change to discover, and none was made.
