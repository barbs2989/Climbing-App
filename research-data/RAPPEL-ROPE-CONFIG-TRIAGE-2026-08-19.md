# `check:rappel-lengths` rule 3 — the two candidates NEITHER earlier writeup covers

`npm run check:rappel-lengths` prints **16** rule-3 candidates today. Fourteen are already
read: `RAPPEL-RULE3-TRIAGE-2026-08-13.md` (22 flagged, 8 real, 13 correct two-rope sequences)
and `RAPPEL-ROPE-CONFIG-TRIAGE-2026-08-14.md` (2 candidates, both correct). Comparing the ids
rather than the counts, **exactly two have never been triaged**:

    comm -23 <today's 16> <ids named in both writeups>
      wa_chimney_rock_west_face
      wa_west_face_2

Do not re-read the other fourteen. The headline count is not the work — this repo has already
recorded that trap twice ([[route-data-triages-2026-08-13]]).

Rule 3 is report-only by construction: the discriminator is *which rope configuration the
stored table corresponds to*, which no regex can see. This is the human pass on the two.

**Both are REAL, and neither is the "stored table is really a two-rope sequence" false alarm
that accounted for 13 of the first 22.** In both, the row contradicts itself, and in both the
value the app DISPLAYS is the one a party could not achieve with the rope the row itself
specifies. Nothing here is repaired by halving a length — that swaps one fabricated number for
another, and `null` is correct where no source publishes a distance.

---

## 1. `wa_chimney_rock_west_face` — West Face / South Summit (Standard), Chimney Rock

Flagged: *describes SINGLE-ROPE rappels on a 50m rope (reaching 25m doubled) but stores a 30m
station.*

**The stored table is fine. The GEAR LIST and the `rappels` summary are wrong.**

| field | what it says |
|---|---|
| `rappel_detail[1]` | 30 m, "Full **double-rope** rappel down the Rappel Chimney" |
| `descent_text` | "make a full **double-rope (two-strand)** rappel down the aptly named 'Rappel Chimney'" |
| `descent_text` | "**bring a full second rope** long enough to comfortably reach the lower stance" |
| `rappels` | "**Single rope**; downclimb ledges between rappels" |
| `gear` | "rope (**single 50m sufficient**)" |
| `rope_length_m` | 60 |

A 50 m rope rigged two-strand reaches **25 m**. The stored station is **30 m**. So a party that
follows the gear list — which says a single 50 m rope is sufficient — arrives at the Rappel
Chimney 5 m short, on the one rappel the descent text says is the committing one. The descent
text tells them to bring a second rope; the gear list and the `rappels` summary tell them they
do not need one. **Two fields in the same row give opposite instructions about the rope that
gets you off this peak.**

The 30 m itself is also flagged as an estimate in its own note — *"Exact length not stated in
source, estimated as a typical double-rope pitch"* — which by the rule this repo already
follows should be `null`, not a plausible-looking number.

**Recommended:** correct `gear` and `rappels` to agree with `descent_text` (a second rope or a
tag line is required), and null the estimated 30 m unless a source publishes it. Do not touch
`rappel_detail[0]` (10 m, single-strand, explicitly sourced).

Unrelated but worth carrying: `rappel_count_note` records that the "bolts replaced in 2001"
claim is misattributed from a same-named Chimney Rock in **North Idaho** and should be dropped.
That is the name-collision failure mode this codebase has hit repeatedly — a name is not an
identity.

---

## 2. `wa_west_face_2` — West Face, North Peak  **(the serious one)**

Flagged: *describes SINGLE-ROPE rappels on a 60m rope (reaching 30m doubled) but stores a 50m
station.*

**The row states two different rappel lengths for the same four rappels.**

| field | what it says |
|---|---|
| `rappels` | "4 double-rope rappels (**~50m, 50m, 50m, 20m**)" |
| `rappel_detail` | 50, 50, 50, 20 |
| `descent_text` | "four consecutive double-rope rappels of approximately **30 meters each**" |
| `gear` | "60m dynamic ropes (**single rope technique**)" |

50 + 50 + 50 + 20 = 170 m of rappelling; 4 x 30 = 120 m. These are not roundings of each other.

The two independent fields agree with each other and **against** the table: `descent_text` says
30 m, and a 60 m rope by "single rope technique" reaches exactly **30 m** doubled. The table's
50 m matches nothing in the row.

**Why this is the dangerous direction.** `RappelTable` renders the stored lengths, so the app
shows a climber *50 m*. A party carrying what this route's own gear list specifies — a 60 m
rope, single-rope technique — reaches 30 m. Rigging for 50 m on that rope is **20 m short**:
the rope-off-the-end failure this guard was written for, and the worst thing in this dataset to
get wrong.

**Recommended:** treat the table as unsupported. Either reconcile the lengths to the sourced
figure in `descent_text`, or null them and let `RappelTable` print "—". **Do not** simply halve
50 to 25 — that is a third invented number, and the row already tells you the sourced one.

Flagging rather than writing: this rule is report-only precisely because a human has to pick
which configuration the table describes, and no external source is cited for either figure
here. A data change on a rappel length should be made by someone who can consult the source.

---

## Method note

The useful move was **comparing ids, not counts**. The count went 22 -> 2 -> 16 across three
runs, which reads like a regression and is not one: the 13 known-correct two-rope sequences are
still flagged every run, by design, because rule 3 cannot see what a human decided. Only the
set difference against the earlier writeups shows what is actually new.

---

## APPLIED 2026-08-19

`scripts/oneoff/fix-two-rope-config-contradictions.mjs --apply`. It asserts every value against
what this triage read and **refuses to write if a row has moved**, so it cannot overwrite
someone else's edit; it then re-reads and reconciles, because a 200 is not evidence the data
changed.

| route | column | before | after |
|---|---|---|---|
| `wa_west_face_2` | `rappel_detail[].lengthM` | 50, 50, 50, 20 | null x4 |
| | `rappels` | "4 double-rope rappels (~50m, 50m, 50m, 20m)" | "4 double-rope rappels down the West Face; per-station lengths unconfirmed" |
| | `rappel_count_note` | null | records the contradiction and why both figures were dropped |
| `wa_chimney_rock_west_face` | `gear` | "rope (single 50m sufficient)" | "two ropes, or a 60m lead rope plus a tag line (the Rappel Chimney rappel is rigged two-strand)" |
| | `rappels` | "Single rope; downclimb ledges between rappels" | "2 rappels: … a second rope or tag line is required" |
| | `rappel_detail[1].lengthM` | 30 | null (its own note calls the 30 m an estimate, not a source) |

**No number was invented.** `wa_west_face_2`'s prose figure (30 m) was *not* written in place of
the table's 50 m — substituting one unsourced number for another is the failure this rule
already records. Both were dropped; `RappelTable` prints "—" for a null length and its total
line says "N m across X of Y" when partial.

Verified after the write:

    check:rappel-lengths     rule-3 candidates 16 -> 14; neither route flagged.
                             The remaining 14 are the known-correct two-rope
                             sequences from the two earlier writeups.
    check:rappel-single-rope ok — the headline count still cannot come from a
                             length or an unstated rope setup.
    audit:rappel-claims      3 flagged, unchanged, neither of these two among
                             them (Buckner is the documented false positive).
