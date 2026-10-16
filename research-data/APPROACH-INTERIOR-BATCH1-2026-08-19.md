# The interior duplicates, and the gate that reading the output produced

2026-08-19. First batch against the 118 interior cases left by
`APPROACH-TRIM-BATCH2-2026-08-19.md`, which recorded that the truncate-only applier
structurally could not touch them.

## What an interior removal can and cannot inherit

The tail applier's safety came from one line — `approach.slice(0, cut)` — which made inventing
prose impossible. An interior removal takes a span out of the middle and the two halves must
meet, so it cannot have that property in full. It keeps the half that matters:

```
approach := approach[:cutStart] + approach[cutEnd:]
```

**No word is ever added or altered**, and the applier asserts the result is two substrings of
the original joined. A fix needing new prose still cannot be expressed. What it cannot inherit
is freedom from **seams**, so the seam is gated instead.

## The gate that mattered was not the one I designed

The first gate was a list of stock back-references — *"Beyond that…"*, *"From there…"*,
*"Above it…"* — on the theory that those are how a sentence points backwards. It was too
narrow, and **reading the dry run caught it**, not the gate:

```
wa_devore_peak_west_ridge
  cut   "...climb loose talus/scree southeast to a col (~7,500 ft) on Devore's southeast ridge..."
  seam  "...before the summit ridge). From the col, the route turns west..."
                                        ^^^^^^^^ no col has been mentioned

wa_cannon_mountain_south_slopes
  cut   "...climb steep talus/scree up onto the Druid Plateau (~8,350 ft)..."
  seam  "...a broad rib at about 7,900-8,000 ft. Cross the plateau and take the western slopes..."
                                                        ^^^^^^^^^^^^ nor a plateau
```

Both would have shipped grammatical prose that refers to something no longer there — worse than
the duplication being fixed, because it reads as a missing step rather than a repetition.

The real test is **antecedents, not phrasing**: a definite noun phrase in the following sentence
whose noun appears in the cut and **nowhere before it**. That gate refused **8 of the 18**
candidates I had accepted on content.

**And its first version still missed Devore**, because the noun pattern required four or more
letters and *"col"* is three. That was caught by re-reading the surviving seams rather than by
trusting the fix — the same discipline that found the original problem, applied to its repair.

## The batch

Of 240 WA routes carrying both columns:

| | |
|---|---|
| exactly one near-verbatim interior duplicate, clean seam | 42 |
| …whose cut restates a **named** `climbing_route` section | 18 |
| …surviving the antecedent gate | **9** |
| deferred — more than one interior duplicate (indices shift) | 26 |

The acceptance rule is the one the tail batches settled on and it held: hazard notes, timing
estimates, conditions and gear advice were rejected regardless of similarity score.
`wa_alta_mountain_scramble` scored 0.75 against *"Final ridge scramble to the 6,274 ft summit"*
and was still refused — the cut is *"A helmet is commonly recommended…"*, which is a hazard note
that happens to share vocabulary with a section name. **A high score is a pointer, not a
verdict.**

Applied and verified by re-read, 9 of 9, byte-for-byte against the planned text. Pre-write
values snapshotted in `research-data/approach-interior-batch1-before-2026-08-19.txt`.

## What the numbers do and do not say

Aggregate afterwards: **138 of 240 routes, 279 duplicated sentences.**

**4 of the 9 trimmed routes still appear**, and that is correct rather than a partial failure:
the applier removes exactly **one** near-verbatim (≥0.9) interior duplicate per route, and those
four carry a second duplicate in the 0.6–0.9 paraphrase band that it deliberately does not
touch. A paraphrase may have dropped something the approach still carries — the Bryant Peak
case — so those need reading, not a threshold.

The aggregate moved by less than nine because of that, and because other sessions merged route
changes during this work. The claim worth making is the one that was verified directly: **nine
writes, each byte-exact against its plan.** Aggregates measured across a live catalog with
concurrent writers are context, not proof.

## Remaining

The 26 multi-duplicate routes are the obvious next tranche and need the applier to handle
successive removals — the indices shift after the first, so it currently refuses them whole
rather than half-doing a route. The rest need a person reading a paragraph.
