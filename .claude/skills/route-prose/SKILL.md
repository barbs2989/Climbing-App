---
name: route-prose
description: Write ClimbMatch route text (overview, approach, descent, pitch notes, hazards, tips) in our own words from confirmed facts only, so it is accurate and never copied. Use whenever a research batch or a fix writes any rendered route sentence.
---

# Route prose: our words, confirmed facts

> **DRAFT (2026-11-14), decided with the owner.** Part of the `route-research` system. The
> shape rules (what fits a header, pill, chip) are in `docs/codebase/enrichment-prose.md` —
> read them before writing any column.

## Method: a separate writer that never sees the sources
1. The researcher and verifier produce a **fact list** in the ledger (each fact locked or not,
   with evidence).
2. A **separate writer agent** receives only that fact list — never the source pages, never
   their sentences. It cannot copy what it never read.
3. Every sentence must trace to a fact in the list. A sentence with no fact behind it is cut.
   Unlocked facts may be written only if the field is allowed to show unconfirmed data; a
   paragraph **locks when every fact in it is locked**.
4. Every number in the text must equal a ledger fact (miles, gain, pitches, grades, times).

## Voice: direct guidebook
Short, imperative, numbers first, the climber's next decision first.
> From the Cascade Pass trailhead, follow the trail 3.7 mi to the pass, then turn north up
> the Sahale Arm.

- No source names, no "according to", no pipeline voice ("verify", "TBD", "data shows").
- No ALL CAPS. Units per `docs/guards/units-and-formatting.md`.
- **Opinion words** (classic, stunning, chossy, sandbagged, loose) only when 2 independent
  sources say it — treat them as facts.

## Copy check
`enrich:apply` refuses a string sharing a run of **6+ words** with any page in the batch's
`review.sources` (tightened from 8 on 2026-11-14; trail and feature names exempt — *needs
the change in `scripts/lib/source-overlap.mjs`*). Run `npm run audit:copied-prose -- <batch.json>`
before applying. Deleting words from a source sentence while keeping its order is not a
rewrite.
