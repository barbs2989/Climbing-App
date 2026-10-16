# `check:rappel-lengths` rule 3 — the two open candidates, read 2026-08-14

`npm run check:rappel-lengths` exits **ok** and prints two advisory candidates from **rule 3**
(*"describes SINGLE-ROPE rappels on an Nm rope but stores a station longer than that rope reaches
doubled"*). Rule 3 is report-only by construction: its own comment records that the discriminator
is **which configuration the stored table corresponds to**, that no regex can see that, and that
running it as a failure flagged 22 routes of which several were correct. It surfaces candidates
for a human. This is that human pass.

**Both are CORRECT. No data was changed, and none should be.**

---

## 1. `wa_southeast_mox_peak_se_rib` — West Ridge (Beckey Route), Southeast Mox Peak

Flagged because the row names a 60 m rope alongside "single-rope" and stores a 60 m station.

The 60 m station is **explicitly the double-rope one**, and all four fields say so independently:

| field | what it says |
|---|---|
| `rappel_detail[4].notes` | "Longer **double-rope** rappel from the notch down into the gully/glacier below" |
| `rappel_detail[1..3].lengthM` | 30, 30, 30 — each noted "single-rope (30 m)" |
| `rappel_count_note` | "three 30m single-rope + one 60m **double-rope**" |
| `descent_text` | "three single-rope (30 m) rappels down the tower … then one longer **double-rope (60 m)** rappel" |

`descent_text` also states the rope choice in as many words: *"Bring a single 60 m rope (or two
ropes if you want to do the notch-to-glacier drop as one clean pull rather than downclimbing part
of it)."* So a single-60 party downclimbs that last section; a two-rope party rappels it. The
table stores the two-rope sequence and labels it.

**Verdict: internally consistent, correctly adjudicated, nothing to fix.** The route is a *mixed*
descent — three single-rope stations plus one double-rope station — which is the one shape rule 3
cannot distinguish from an error, because the route legitimately names both configurations.

## 2. `wa_ultramega_ok` — Ultramega OK, Burgundy Spire

Flagged because the row mentions a 70 m single and stores a 60 m station.

`rappel_count_note` opens by declaring the answer outright: **"Five stations is the DOUBLE-ROPE
count."** It goes on to record that the same ground is 9–10 rappels on a single rope, that a
two-60 party does "a doubled first rappel, one single rappel to the ledge … then three more double
rappels", and that *"all three counts describe one descent under different rope setups"*.
`descent_text` agrees: *"Double 60 m ropes make this clean; parties with a single 70 m have
reported getting down with some downclimbing between stances."*

So the stored 5×(40, 55, 55, 40, 60) table is the double-rope sequence. The single-70 party does
not do these stations; it does 9–10 shorter ones. **Verdict: correct, nothing to fix.**

### One secondary observation, recorded and deliberately NOT actioned

Station 1 stores `lengthM: 40`, and `descent_text` says "~40 m from a heavily slung summit
boulder". But that station's own hazard note says *"A single 60 m rope comes up about 10 ft short
of the bolts … a 70 m single reaches."* Work it through: a doubled 60 reaches 30 m and a doubled
70 reaches 35 m, so "60 is ~3 m short, 70 reaches" describes a rappel of roughly **33 m**, not
40 m. Either the 40 m figure is rounded long, or the trip-report detail refers to a different
anchor.

It is **not** corrected here, for two reasons. The error direction is *conservative* — a stored
length longer than the true one makes a party carry more rope, never less, so nothing unsafe
follows from it. And no source read for this entry publishes a per-station distance
(`rappel_count_note` says so explicitly), so changing 40 to 33 would replace one unsourced number
with another — the exact mistake the rope-capacity "just halve it" fix makes, which this repo has
already rejected once. `null` or the existing figure both beat an invented one.

---

## Do not "fix" rule 3 by consulting `rappel_count_note`

The obvious improvement — suppress the finding when the count note already declares the
configuration — was considered here and rejected, because **the guard's author already measured
and rejected it**, and the reasoning is in the script: *"the count note sometimes says in prose,
and sometimes does not."* Both routes above happen to carry an explicit note; that is what makes
them resolvable, not what makes them typical. Building a regex over that prose would put English
parsing in front of a safety guard to silence two findings that a human can close in ten minutes,
and would risk silencing a real one on a route whose note is worded differently.

Rule 3 firing on correct data is not a defect in rule 3. It is rule 3 doing the only thing it can
honestly do, and the correct response is a triage pass like this one — recorded so the next
session reads the verdict instead of re-deriving it.

**Rules 1, 2 and 4 remain hard failures and are green.**
