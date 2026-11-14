# Ice and mixed long tail (2026-10-29)

Read `audits/thin-descent-approach/BRIEF.md` (rules and output shape) and `oos/OOS-BRIEF.md` (out-of-state method and sources) first.
This adds the rules that review of about 40 earlier batches turned up. Every one of them caught a real problem.

Your context is `oos/ctx-ice-<st>-<n>.json`; write `oos/batch-ice-<st>-<n>.json`. Every target gets an entry (a `set` or a `skip_reason`),
and its `area` is copied exactly from the target. Each target carries its own area, peak/crag name and coordinates. Make sure each
source is about THAT place: many ice areas share names (several "Hidden Falls", "Bridal Veil", "The Ribbon").

## What to write for an ice or mixed route
- **approach**: from the parking spot or trailhead to the base of the ice: the trail or drainage, landmarks, and how to tell which
  flow is which. Seasonal or winter-gated roads may be called seasonal, with no dates. Mention avalanche terrain in general
  terms where a source says the approach or climb is exposed to it, and add "check the avalanche forecast".
- **descent_text**: how parties get off: V-thread or tree rappels, a walk-off to one side, or lowering. Give rappel counts only if two
  independent sources agree. If no source says how parties get down, write no descent.

## Rules (review found each of these in earlier batches)
1. No party's time or experience ("took one party four hours"). No unsourced superlatives ("among the worst in the park").
2. No source names in the prose, not even "the park lists". Don't refer to another route's "description" or "page".
3. Counts (miles, km, gain, elevations, rappels, pitches, rope lengths) need two INDEPENDENT sources. Several pages that repeat one
   wording count as one source. If they disagree, give the range they agree on, or leave the count out.
4. A single reliable source is enough for a non-numeric route fact. Mark it `medium` confidence.
5. Never infer a top-out or a descent ("probably the standard route reversed"). If it isn't stated, leave it out.
6. If a route's own page says its description may belong to another line, skip the route.
7. No current conditions (closures, landslides, road status, "in 2024 the ice was thin").
8. Don't echo a source's distinctive wording. The copy check refuses any 8-word run shared with a listed source, and at write time it
   once refused 19 entries in one go.
9. Don't list a page you couldn't read. SummitPost and Mountaineers.org usually block scripts, so leave them out unless you read
   them in the browser and saved the text (`review.source_texts`, see `retry/RETRY-BRIEF.md`). stephabegg.com is firewalled; cite
   its web.archive.org copy.
10. Bouldering rows, if any appear, get `skip_reason: "bouldering, out of scope"`.

## Checks
`node scripts/oneoff/thin-da-offline-check.mjs <your batch>` must print no COPY or CAPS lines. Don't run the applier, not even with
`--dry`; the lead session runs it.

Reply with a short summary: how many written, how many skipped (grouped reasons), and any duplicate or misfiled findings.
