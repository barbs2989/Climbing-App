# `audit:rappel-claims` — all three candidates read, 2026-08-14

`npm run audit:rappel-claims` reports **3 candidates**. It is report-only by design, and its
own closing advice is the method: *read both fields in full before changing one*, because a
walk-off descent can still involve a real rappel elsewhere on the day and rappelling is often
a conditional alternative to downclimbing rather than a contradiction. Measured precision on
its first run was **6 flagged, 1 real**.

All three were read in full. **Two are correct data. One had a real contradiction, in the
summary rather than the count.**

---

## Correct — no change

**`wa_buckner_mountain_north_face`** — already documented in CLAUDE.md as the worked example of
this audit's false-positive shape. The standard descent does not reverse the North Face; parties
continue over the summit and down the southwest slopes, and the route's single rappel is the
**Sharkfin Col step on the return leg**. A rappel elsewhere on the day is not a contradiction of
a walk-off summit descent.

**`wa_mount_mystery_standard`** — flagged because its `descent_text` is full of downclimbing
prose. Read in full, all three fields agree: `rappels: 2`, and both the count note and the
descent text cite the same Mountaineers trip report describing *"two single-rope rappels from
near the summit down to the saddle/notch rather than downclimbing the whole thing"*. The
downclimbing language describes the **remaining class 2–3 terrain below the notch**, which is a
different part of the descent. Correct as stored.

Worth noting the row also records a genuinely distinct alternative — a longer high-route exit
over Gunsight Pass toward Constance Pass *"with no rappels required"* — and correctly labels it
a variant rather than the standard descent. That is the discrimination this audit exists to
protect, done right.

---

## Fixed — `wa_overcoat_peak_southeast_route`

The **count** was right and the **summary sentence** was wrong. Stored:

> `rappels` = "2 rappels on a 60m rope, **plus a downclimbed dihedral**, back to the top of the
> Overcoat Glacier"

"plus a downclimbed dihedral" presents the dihedral as descended *in addition to* the rappels.
Both other fields say the two rappels **are** the dihedral:

- `descent_text` — *"Where the ledges pinch down at a dihedral feature (a damp, water-streaked
  corner …), most parties do NOT free-downclimb the full corner — instead, build two rappels …
  **down the dihedral** to regain the glacier below."*
- `rappel_count_note` — *"Two rappels of roughly 30m each … the commonly reported method where
  the descent ledges pinch out at the damp dihedral."*

Two fields against one, and the outlier is the summary rather than the detail, so the summary
is what changed. **This is not cosmetic.** `rappels` is what the route header leads with, and as
written it told a party to rappel twice and *then* downclimb a damp, water-streaked corner —
precisely the thing the other two fields say parties rappel in order to avoid.

Now reads *"2 rappels on a 60m rope down the damp dihedral, back to the top of the Overcoat
Glacier"*. No count changed; `check:rappel-lengths` stays ok, since this is prose and not a
station length. Applied via `audits/sql/2026-08-14-overcoat-rappels-summary.sql`.

---

## The audit still reports 3, and that is correct

Fixing Overcoat's prose does **not** clear it from the report, because the detector matches a
leading number in `rappels` against downclimbing language in the descent — and both are still
legitimately present on all three rows. **Do not "fix" that by tightening the detector to make
this report empty.** An empty report here would mean the audit had stopped being able to see
the shape it exists for; the three candidates are candidates, and this file is the answer to
them. Re-read this before treating the count of 3 as new work.
