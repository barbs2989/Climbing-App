# Class C measured: the truncation is 28 rows, not 10 — and the audit's blind spot is 176, not 14

The [defect index](DATA-DEFECTS-INDEX-2026-08-19.md) recorded both of these from what six enrichment
batches happened to notice. Measured against all **8,365 WA routes** (767 of which carry a
`trailheadDirection`), both counts are substantially larger.

## 1. There is no splitter to find

The index says this is *"a sentence splitter breaking on abbreviations"* and that it *"will do it again
on the next import"*. **No such splitter exists in the repo.** `trailheadDirection` is written by
enrichment batch files through `enrich:apply`, not by anything in `scripts/pipeline/`. Whatever cut
these strings was upstream of the JSON, so there is no code change that prevents a recurrence — the
guard would have to be on the batch, not on an importer.

## 2. The truncation is 28 rows and **two different failures**

| cut at | rows | what was lost |
|---|---|---|
| `elev.` | 17 | a number |
| `Mt.` | 9 | a road name |
| `ft.` | 1 | a number |
| `no.` | 1 | — |

**These need opposite treatment, which is why a mechanical trim would be wrong.**

The `elev.` class lost only a figure, and the sentence still reads without it:

> `wa_cathedral_rock_standard` — *"Park at the Cathedral Rock Trailhead (elev."*

The `Mt.` class lost **navigational content**:

> `wa_hadley_peak_cougar_divide` — *"From Glacier, WA, drive Mt."*

That is the Mount Baker Highway, and trimming the fragment leaves *"From Glacier, WA, drive"* — a
sentence that has lost the road it names. A blanket trim also breaks a third shape, where the cut falls
**inside** a parenthesis that is never closed:

> `wa_gilbert_peak_meade_glacier` — *"Drive to the Conrad Meadows / South Fork Tieton Trailhead (Trail #1120, elev."*

Trimming `, elev.` there leaves an unbalanced `(Trail #1120`. So this is **not** a one-regex sweep, and
it is deliberately not attempted here.

**None of the 28 misdirects.** They stop early; they do not point anywhere wrong. That is why this sits
below Class A in priority despite being nearly three times the recorded size.

## 3. The audit's blind spot is 176 rows

**176 WA routes carry a trailhead NAME in `approach_logistics` with no coordinate** — against the 14 the
index recorded. `audit:trailhead-agreement` compares a pin against a coordinate, so every one of these
is invisible to it: there is nothing to compare. That is **23% of the 767 rows that have a direction at
all**, and it is the single largest reason that audit's coverage looks better than it is.

Worth reading beside the note already in `audit-trailhead-agreement.mjs` about *shadowed* rows — a
typed-but-uncoordinated pin short-circuiting the reader's `||` chain. That is the same defect seen from
the pin side; this is the count from the logistics side.

## Method note

`id=like.wa_%` **times out** — it is a scan of the 205k-row `routes` table and PostgREST answers with a
500 HTML error page, not a JSON error. The working query is the one
`scripts/audit-trailhead-agreement.mjs` already uses: `id=like.wa_*` with `pageSize: 150` and the
**service key**, because the anon role's 3s `statement_timeout` cannot complete this read. Read-only;
no write is issued.
