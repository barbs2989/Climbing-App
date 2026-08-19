# The approach-scope audit was giving advice that would have made things worse

2026-08-19. First triage of `audit:approach-scope`, which had no triage doc.

## What it says, and what was wrong with it

`audit:approach-scope` finds routes whose `approach` column keeps going past the base of the
climb — prose that walks you in and then, without any change of voice, carries on to the
summit. Migration `0120`/`0122` added **`climbing_route`** as the place that content belongs.

Its summary line said:

> 361 carry climbing description inside the approach — **254 of them have NO pitch table, so
> that text has nowhere else to live today.**

**That was true when it was written and is now false for almost all of them.** The
`climbing_route` backfill has since run. Measured:

| | count |
|---|---|
| findings | 361 |
| unpitched with **no** `climbing_route` yet — genuinely homeless | **15** |
| already have `climbing_route` populated | **239** |

So the audit was overstating the "nowhere to put it" population by **17×**, and instructing
whoever read it to re-home text that is *already* re-homed. Following that advice produces a
**third** copy. This is the `check:field-renders` failure exactly — an audit that keeps giving
a confident instruction it no longer has evidence for. It told an author to delete correct
bookkeeping during an outage; this one tells an author to duplicate prose that is already
duplicated.

## The defect underneath it: the pass COPIED rather than MOVED

CLAUDE.md specifies the enrichment batches as **"re-homing, never researching"**. Re-homing
means the source column gets trimmed. Nothing ever checked that it was, and mostly it was not.

Two measurements, and they answer different questions — do not quote one as the other:

- **All WA routes carrying both columns:** 240 routes; **163 repeat at least one approach
  sentence inside `climbing_route`**, **429 sentences** in total.
- **Only the routes this audit flags** (approach prose that runs past the base): 239 routes;
  **148 still repeat**, **303 sentences**.

Many are verbatim — Jaccard 1.00 on content words. Examples:

```
wa_mount_watson_scramble    "From Watson Lakes the maintained trail ends and the route becomes
                             an open, cairned/boot-path climbers' route…"          [1.00]
wa_mount_custer_standard    "From camp, scramble up the large broken buttress southwest of the
                             lake (cairned to aid the return);"                    [1.00]
wa_mount_fury_east_…        "Where the ridge crest drops away, descend a steep, narrow heather
                             chute (~500 ft) into a talus basin around 6,500 ft…"  [1.00]
```

### Confirmed on screen, not inferred from the columns

Two columns overlapping is a fact about a table. Whether it is a **defect** depends on whether
one screen states it twice, and this repo has been wrong by stopping at the column before — a
rack correction that reached the right *tab* and the wrong *box*, `descent_text` populated on
1,021 routes and rendered on none.

So the real `RouteDetail` was rendered over the real rows. `APPROACH` (RouteDetail.jsx:2192)
and `CLIMBING ROUTE` (:2210) are **both on the Planner tab**, and the shared sentences print
twice there:

```
wa_mount_watson_scramble             planner  APPROACH=true  CLIMBING ROUTE=true  3/3 twice
wa_mount_custer_standard             planner  APPROACH=true  CLIMBING ROUTE=true  2/2 twice
wa_mount_fury_east_southeast_glaciers planner APPROACH=true  CLIMBING ROUTE=true  2/2 twice
```

Absent on Overview either way, which is correct — neither section lives there.

## Why the data was NOT swept, and what would be needed

303 sentences across 148 routes is a bulk prose edit, and **which copy is wrong is a
per-sentence judgement the detector cannot make.** The obvious reading — "the climbing text
belongs in `climbing_route`, so trim the approach" — is right for some rows and backwards for
others, because the pass also copied *genuine approach content* into `climbing_route`:

> `wa_mount_watson_scramble` — *"From Watson Lakes the maintained trail ends and the route
> becomes an open, cairned/boot-path climbers' route…"* is approach prose. It appears in
> `climbing_route` because the copy was indiscriminate, so here the **`climbing_route` copy**
> is the wrong one, not the approach.

That is the same shape as the trailhead-agreement work: two records disagree, and the audit
can say *that* they disagree without saying *which* is wrong. That one was resolved by
anchoring on a third, independent record (the peak's own coordinate). There is no third record
here — only prose — so it needs reading, in reviewed batches.

Also note the paraphrases. `wa_bryant_peak_southeast_slopes` has approach *"Ascend **the gully**
favoring its far climber's-right side"* against `climbing_route` *"Ascend favoring its far
climber's-right side"* — the re-homed copy **dropped the antecedent**. Trimming the approach
sentence would lose the only mention of what is being ascended. A verbatim-only sweep would
still have to check that.

## What was changed (the instrument, not the data)

`scripts/audit-approach-scope.mjs`:

- **The summary no longer gives the stale instruction.** It splits the two populations and
  tells each what to actually do — `MOVE` for the 15 with nowhere to put it, and for the 239
  already re-homed, that the question is whether the approach was **trimmed**.
- **Per-row verdicts are actions, not facts.** `climbing_route ALREADY set` (true but useless)
  became `climbing_route set AND N approach sentence(s) repeat inside it — TRIM the approach`,
  or `climbing_route set, no repeated sentences — read before touching`.
- **It now measures the overlap**, which nothing did before. Similarity rather than string
  equality, because the re-homing pass was allowed to rewrite prose freely and only pinned
  specifics — a paraphrase is still a duplicate to a reader. Jaccard over content words at a
  deliberately high **0.6**: both columns describe the same mountain, so a shared "summit",
  "gully" and "snow" is expected and is **not** duplication.
- **Two new injection cases, as a pair.** `--inject=dup` copies an approach sentence into
  `climbing_route` and the count must rise; `--inject=nodup` replaces `climbing_route` with
  prose about something else and it must fall to zero. The second is what makes the first mean
  anything — a detector that called every sentence a duplicate would pass `dup` alone. Both
  verified, along with the two pre-existing cases (`clean` → 0 findings, `dirty` → 3 flagged).

## Still open — 148 routes, 303 sentences

Deliberately not swept. The audit now names each one with the action it needs, so this is a
readable queue rather than a number. **Do not bulk-trim `approach` against it**: some of the
repeated prose is genuine approach content wrongly copied *into* `climbing_route`, and at least
one paraphrase dropped an antecedent that only the approach copy still carries.
