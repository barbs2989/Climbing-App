# Three follow-on audits: permit links, rappel counts, class-graded crag rows

**Date:** 2026-08-08 · follow-on to #687 / #690

---

## 1. Permit links — 67% named the wrong agency (FIXED)

The Plan tab chose its official-permits link with a regex chain over
`landManager + access.permit + fees`, lowercased. 1,282 WA routes carry the fees line
*"None — no climbing fee (National Forest, **not** Mount Rainier NP)"*, which contains
`rainier`, so `/rainier/.test(...)` passed and the route linked to Mount Rainier's
climbing-permit page — contradicting the sentence that triggered it.

Measured over all 205,492 routes (`scripts/oneoff/audit-permit-link-negation.mjs`):

| | count |
|---|---|
| routes that show a permit link | 1,941 |
| **…whose link came only from a negated mention** | **1,308 (67%)** |
| → Mount Rainier climbing permits | 1,282 |
| → North Cascades NP backcountry permits | 18 |
| → Enchantment Permit Area lottery | 6 |
| → Olympic NP wilderness permits | 1 |
| → Reserve on Recreation.gov | 1 |

Fixed with `_pmSays()`, which accepts a keyword only where it is **asserted**, scanning every
occurrence rather than the whole string — because *"not North Cascades NP, but Enchantment
permits apply"* holds a real mention beside a disclaimed one. Same defect `RACK_NEG` already
guards for gear. 8 cases both directions in
`scripts/oneoff/test-permit-link-negation.mjs`; verified in the real component that Red
Mountain loses the link while Rainier / Enchantment / North Cascades routes keep theirs.

---

## 2. Rappel count vs rappel table — 3 real conflicts (FIXED)

#687 put the rappel summary and the pitch-by-pitch table on the same screen, making any
disagreement visible at a glance.

**A prose parser was tried and abandoned.** It first reported **56** conflicts, of which most
were its own error — *"Two ~200-ft rappels"* read as 200, *"Three 75-ft rappels"* as 75. A
tightened version reported 26 and still misread *"6 total: 3 rappels… 3 rappels"* as 3. Not a
trustworthy basis for writes; `scripts/oneoff/audit-rappel-count-conflicts.mjs` ships as a
report only.

Restricting to summaries that are a **bare integer** — nothing to misparse — gives 24 rows,
of which exactly **3** disagree with their table. In all three the table is the researched
artifact and the row's own `rappel_count_note` resolves it:

| route | was | now | why |
|---|---|---|---|
| `wa_liberty_bell_nw_face` | 2 | **3** | note: descent text describes 3 (a short ~20 ft lower plus two longer); table 5 m + 55 m + 30 m |
| `wa_liberty_crack` | 4 | **2** | note: standard descent is two 25-30 m raps; *"The four-rap M&M Ledge/East-Face line … belongs to Thin Red Line"* — contamination from another route |
| `wa_pernod_spire_standard` | 5 | **3** | note: 1 rap off the summit + 2 double-rope raps = 3; table 65 m + 30 m + 30 m |

Applied via `patchRow` with a guard on the stale value **and** the table row count, each
reconciled by read-back. `scripts/oneoff/fix-rappel-count-conflicts.mjs`.

---

## 3. The 225 class-graded crag rows — 41 fixed, 184 left alone

Previously (2026-08-07) these were left untouched wholesale, on the grounds that the **grade**
is the broken field, not the discipline. That holds for real crag climbs, but the 225 are not
homogeneous. A large share **are not climbs at all** — they are the crag's descent and
approach written up as routes. For those the class grade is *correct* and the **discipline**
is what is wrong: a 3rd-class descent gully genuinely is scrambling.

Bucketed on the only trustworthy signal available (none of them has an overview, gear or
length), and skipping anything showing signs of research:

- **A — 41 rows → `scrambling`.** Names that state outright what they are: *Descent Route*,
  *Radcliffe Descent*, *Downclimb*, *Balcony Descent*, *Poison Ivy Gully (descent)*,
  *Approach Gully*, *Access Scramble*, *Access Integrale*, *Rap and Catwalk Approach*,
  *Scramble to "Launch Ledge"*, *Talus Scramble*, *4th Class Gully*, *rap station*, and
  class-graded gullies (*LeConte*, *Scottish*, *Walrus*, *SE Gully (Standard Route)* …).
  Every one reviewed by hand before writing.
- **B — 184 rows left alone.** Real crag climbs whose grade merely arrived as "3rd"/"4th"
  (*Prism Roof*, *Klettersteig*, *Deus ex Machina*, *Bond Hall Project* …). Setting these to
  `scrambling` would bury real routes under the wrong filter chip and fix nothing. There is
  still no trustworthy source to correct their grades from.

**Reversible:** the exact before-state of all 225 is committed at
`audits/2026-08-08-class-graded-crag-rows-before.json`. To roll back, write `discipline`
back from `bucketA`.

Result: `wrote 41, failed 0 · reconciled 41/41 now scrambling`.

Note this one crosses state lines (CA, CT, MD, ME, NH, NM, NV, NY, OR, PA, VA, WA, WI). That
does not reopen the paused out-of-state *enrichment* work — no content was researched or
added, only a single mis-set field corrected.
