# Policy vs product — refreshed against `main`, 2026-08-07

**This is a factual consistency check, not legal advice, and no legal text was edited.**
Every row is "the document says X; the code does Y", with the evidence. The remedy for each —
build the mechanism, or amend the text — is the reviewer's decision, not this file's.

This refreshes `POLICY-VS-PRODUCT-2026-08-05.md`, which was read against `main` two days and
~40 merged PRs ago. **Re-verified because a review of stale facts is worse than no review**:
one gap has materially changed character, and one was partly fixed.

The Privacy Policy text lives in `ClimbMatchCore.jsx` as structured data (section title +
body), so "the policy" and "the app" ship in the same bundle and can be diffed directly.

---

## Status of the four open gaps

| # | Gap | 2026-08-05 | 2026-08-07 |
|---|---|---|---|
| 1 | Account deletion | contradiction | **still open**, guest half fixed |
| 2 | Data export | promised, no control at all | **still open**, but a control now exists and *explicitly denies* it |
| 3 | Opt out of non-essential processing | promised, no control | **still open**, unchanged |
| 4 | Privacy controls switched off | `PRIVACY_CONTROLS_LIVE=false` | **still open**, unchanged (8 references) |

---

### 1. Account deletion — the contradiction is now inside a single screen

Privacy → *Your rights*:

> "You can access, correct, export, or delete your data… **Account deletion is available in
> Settings** and removes your profile and personal data, subject to limited legal retention."

Settings, when a real session exists:

- the button reads **"Delete my account & data"**
- it opens a modal titled **"Sign out & delete?"**
- whose body reads: *"This signs you out of this preview. **We don't yet support full account
  & data deletion** — contact support to request it."*

So the control's own label promises deletion and its own body withdraws the promise.

**Partly fixed since the last audit.** #621 made the path session-aware, so a *guest* now gets
"Leave the demo" / "You're browsing as a guest, so there is no account and nothing stored to
delete." That closed the wart where a guest's only exit was labelled account deletion. **The
signed-in branch is unchanged**, and it is the branch the Privacy Policy is talking about.

Worth noting for the reviewer: the signed-in branch has never been exercised by anyone — there
is no test account — so this is read from source, not from a click-through.

### 2. Data export — a control now exists, and it denies the policy

The 2026-08-05 audit recorded "there is no export control anywhere in the app". That is no
longer true. Settings → *Your data* now has an **"Export my data"** button. Its entire handler:

    onClick={() => showToast("Data export isn't available yet in this preview.", 3200)}

This is an improvement in one sense — it is an honest disclosure rather than a silent no-op or
a fake affordance, which this codebase has a history of (#610, #651). But it changes the shape
of the gap: the product now **explicitly tells the user in writing** that a capability the
published policy grants them is unavailable. There is no exporter behind it — no
`exportMyData`, no `buildExport`, no JSON blob assembly.

### 3. Opt out of non-essential processing — no control, unchanged

Privacy → *Your rights* promises the user can "opt out of non-essential processing". The string
**"opt out" appears exactly once in the entire application, inside the policy text itself.**
There is no opt-out surface, and no analytics/marketing toggle of any kind.

### 4. The privacy controls the policy describes are gated off — unchanged

`const PRIVACY_CONTROLS_LIVE = false` in `ClimbMatchCore.jsx`, referenced 8 times across the two
app files, still hides the controls the Location and What-others-can-see sections describe.
Per [[privacy-controls-need-server-enforcement]] this flag is **deliberately** false — the
controls are not server-enforced, so shipping them would promise a protection the backend does
not deliver. That is the correct engineering call and should not be flipped to satisfy this
audit; it is listed because the policy describes controls a user cannot currently see.

---

## What the reviewer needs to decide

For each of 1-4, the same binary: **build the mechanism, or amend the text.** Nothing here
requires code changes before the review, and none should be made to the policy text
pre-emptively — on two prior occasions (#541 belay signals, #564 guide verification) the Terms
were the *honest* document and the in-app copy was the thing that needed fixing. Treat the
legal text as the baseline.

Two practical notes:

- Gaps 1 and 2 are both "the app says, in its own UI, that it cannot do what the policy says it
  does". They are the same decision and can be taken together.
- Gap 4 is different in kind: the mechanism is written and deliberately disabled for a good
  reason. It may need only a wording change in the policy.
