# Approach-trim batch 1 — six routes, nine sentences, and a count that was wrong

2026-08-19. First reviewed batch against the duplication queue from
`APPROACH-SCOPE-TRIAGE-2026-08-19.md`.

## The applier cannot invent prose, and that is the whole design

The trailhead work made unreviewed batch triage safe by making the *fix* structurally
inexpressible if it were wrong: an applier declared a **winner**, never a coordinate, so no
value could be typed in and a repair needing a third coordinate could not be written down at
all. The analogue here:

```
approach := approach.slice(0, cut)
```

`apply-approach-tail-trim.mjs` asserts `oldApproach.startsWith(newApproach)` before sending.
**Truncation only** — no insertion, no substitution, no rewriting. The worst possible outcome
is a sentence removed that should have stayed, and its text still exists in `climbing_route`.
A fix that needs new prose cannot be expressed.

The human decision is **the id list and nothing else**. Offsets, sentence boundaries and the
similarity check are all re-derived from the **live row** at apply time, so a stale worklist
cannot write; if the live row yields a different tail length than the worklist recorded, the
row is refused as moved.

## Why only tails

Excising a sentence from the middle of a paragraph is prose surgery — it strands connectives
("From there…", "Beyond the rib…") and leaves text that reads worse than the duplication did.
A contiguous **tail** cannot do that, and the tail is what the audit is about anyway: the
approach "keeps going past the base", so the offending text is a suffix by construction.

Of 148 duplicating routes, **34** have a contiguous near-verbatim tail an applier can express.
The other 114 have interior duplicates and need a person rewriting the paragraph.

## Reading the batch caught a data-corrupting bug

The first listing proposed trimming `wa_lake_mountain_pasayten_scramble` after
*"From here a subsidiary rock knob (Pk."* — because the sentence splitter broke at **"Pk."**.
The trim would have left the approach ending mid-sentence on an unclosed parenthesis.

Guidebook prose is full of these: `Pk.`, `Mt.`, `Hwy.`, `FR.`, `ft.`, `approx.` The fix is
general rather than a list of abbreviations: **a real sentence starts with a capital or an
opening quote**, so if the next non-space character is a digit or lowercase the period was an
abbreviation or a decimal. Two structural guards were added alongside it — the surviving
prefix must have balanced brackets and quotes, must end on a full stop, and must not end on a
dangling connective.

**Nothing would have caught this except reading the batch.** It is the argument for reviewed
batches in one line.

## …and a published count that was inflated

Correcting the splitter changed the headline. The overlap probe had the same abbreviation bug,
so it was **fragmenting sentences and counting the pieces**:

| | routes | sentences |
|---|---|---|
| as published in PR #1034 | 163 of 240 | **429** |
| corrected splitter, before this batch | 149 of 240 | **303** |
| after this batch | 147 of 240 | **294** |

The audit's own splitter was always right, which is why both scopes agreed at 303 once the
probe was fixed. `CLAUDE.md` and the triage doc are corrected. **A count is only as good as
its tokeniser** — and here the same bug was both an inflated number and a data-corrupting
trim, which is a useful reminder that a measurement error and a write error can have one root.

## The batch

Six routes, nine sentences. Each cut was checked against the route's `climbing_route`
**section labels** — the test of whether a structurally-safe trim is also a *correct* one.

| route | cut | corresponds to section |
|---|---|---|
| `wa_dome_peak_dome_glacier` | 1 | "Dome Glacier to the 8,560 ft notch" |
| `wa_east_mcmillan_spire_west_ridge` | 3 | all three sections, in order |
| `wa_mount_fury_east_southeast_glaciers` | 2 | "Southeast Glacier", "Summit snowfield and arête" |
| `wa_bedal_peak_standard` | 1 | "Final slab traverse below the summit cliffs" |
| `wa_lemah_mountain_east_route` | 1 | "Summit block step from the col" |
| `wa_mount_custer_standard` | 1 | "South Ridge to the summit" |

Applied, re-read and reconciled: **6 applied, 6 verified**. A 200 is not evidence the data
changed. Pre-write values are snapshotted in
`research-data/approach-trim-batch1-before-2026-08-19.txt`, so any of the six can be restored
verbatim.

### Rejected from the batch, and why

- **`wa_three_fingers_south_peak_lookout`** — structurally eligible, and excluded. Its two cut
  sentences correspond to sections **1 and 4** out of order, so trimming them still leaves the
  approach ending at the lookout deck: it does not fix the row. One of the cuts is also a
  fixed-gear safety warning ("treat it as unverified"), which is the last thing to move on a
  marginal call.
- Most of the other 28 eligible tails are **not climbing description at all** — they are hazard
  notes, alternative lines, or camping info the enrichment copied indiscriminately.
  `wa_mix_up_peak_east_face`'s cut is explicitly about *"the upper **approach** gullies"*. For
  those rows the wrong copy is the one in `climbing_route`, and the trim would go the other way.

**Structural eligibility is not correctness.** The applier makes an edit safe to *express*; a
person still decides whether it should be made. That distinction is why this batch is six
routes and not thirty-four.

## What a trim does and does not achieve

Mount Custer still prints two duplicated sentences after its trim, because only its **tail**
was removed and its other duplicates are interior. That is expected, and worth stating plainly
so the next batch is not judged against "the route is now clean": the tail applier reduces
duplication, it does not eliminate it. Two of the six routes did go to zero.

## Remaining

**147 routes, 294 sentences.** 28 more have applier-expressible tails that need reading first;
the rest need a person rewriting a paragraph. Do not bulk-trim against the list.
