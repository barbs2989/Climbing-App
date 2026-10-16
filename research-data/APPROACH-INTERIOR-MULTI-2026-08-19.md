# Successive removals, one route, and a hypothesis of mine that the data refused

2026-08-19. Third approach-duplication batch: the routes needing more than one interior removal.

## The capability

The single-removal applier refuses a route with two or more interior duplicates, because
sentence indices shift after a cut and a half-done route is worse than an untouched one.
`apply-approach-multi-trim.mjs` does them successively, and the load-bearing part is that it
**re-derives everything after each removal** — spans, similarities, and every seam gate run
against the text *as it then stands*, never against the original. A seam that was clean before
the first cut need not be after it.

It shares `stepOnce` with the lister rather than reimplementing it, so what a human approved
from the listing is exactly what runs. Two copies of that logic drifting apart is how a reviewed
batch stops meaning anything. Still deletion-only, asserted **at every step** rather than once at
the end, so a later step cannot introduce text a final comparison would miss.

## The batch was one route

**8 routes** take two or more successive removals — not the 26 recorded in batch 2, which was
counted before the antecedent gate existed. Of those 8, exactly **one** passed the content rule:

- **`wa_point_success_south_side`** — both cuts restate named sections ("Lower Success Cleaver",
  "Upper cleaver and crest to ~10,700 ft"). Applied, 2 removals, verified by re-read.

The other seven were refused, and `wa_burnt_boot_peak_north_route` is the one worth recording:
its second cut is a clean section restatement, but its **first** carries *"an ice axe
(crampons/microspikes in early season) is required for this section — it is genuine self-arrest
terrain."* That is gear and safety, which both earlier batches rejected on sight. The applier
runs cuts in order, so a route whose first cut fails takes the whole route out — correctly.
Pinnacle Peak, Three Queens, Katsuk and Old Snowy were all rejected the same way.

## The hypothesis the data refused

Reading those eight, I formed a view worth stating because it was **wrong**: that the remaining
118 interior cases were mostly hazard and conditions prose, so the backlog badly overstated the
actionable work — the same reframing the `distMi` and approach-scope work produced.

`classify-interior-duplicate-kinds.mjs` measured it across all 98 near-verbatim interior
duplicates:

| kind | n |
|---|---|
| **route description** | **37** |
| hazard / warning | 18 |
| mixed | 15 |
| other | 15 |
| gear | 9 |
| timing / stats | 2 |
| conditions | 2 |

So **roughly 53% is actionable by content** (route description plus mixed), not the small
fraction I expected. My sample of eight was unrepresentative, and I would have written a
confident, wrong summary from it.

## What that means for the remainder

The limiter is **not** content — it is the seam. Two reviewed batches judged 50 candidates and
accepted 10, and the rejections that were *not* about content were antecedent orphans: a
following sentence saying "the col", "the plateau", "the ridge" whose noun the cut introduced.

Fixing those means repairing the connective — writing a word to replace the antecedent — which
is precisely the prose rewriting every applier here has been built to make impossible. So the
honest position is that the remaining ~40 route-description duplicates are **not** blocked on
tooling or on judgement; they are blocked on a decision about whether an automated pass may
alter prose at all. That is a product call, and it has not been made.

## Running total across the three batches

| batch | routes | sentences |
|---|---|---|
| tails (1 and 2) | 14 | 14 |
| interior singles | 9 | 9 |
| interior multi | 1 | 2 |
| **total** | **24** | **25** |

Every write verified byte-exact against its plan. Aggregates across the live catalog are context
rather than proof while other sessions are merging route changes concurrently.
