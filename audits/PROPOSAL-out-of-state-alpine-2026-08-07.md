# Proposal — out-of-state alpine enrichment

**Status: proposal, not started. Needs a go/no-go.** Written 2026-08-07 against live data.

## Why this is worth re-reading even if you've seen the idea before

The job is **about a third the size it has been described as**. Every prior estimate used the
`discipline` column at face value — 5,477 alpine-scope routes, 4,831 outside Washington. That
column is unreliable outside WA, and an area-level audit (`disc-audit.json`, 1,207 areas; agent
verdicts on the 120 largest) puts the real figure at **roughly 1,700 out-of-state alpine
objectives, ~1,900-2,300 including WA.**

The rest are crags wearing an alpine tag: "The Jungle" on Utah's Aquarius Plateau is one
bolted-tuff sport crag split across ~8 alpine-tagged sub-areas; the Valdez Area Rock cluster in
Alaska is roadside sport crags with names that merely *sound* alpine.

**Do not re-derive this from `discipline` counts.** See
`memory/alpine-scope-denominator-is-inflated.md`.

## The actual gap

| | routes | gear | planner-ready |
|---|---:|---:|---:|
| Washington (alpine scope) | 618 | **614** | 483 |
| Everywhere else | 4,831 tagged / **~1,700 real** | **4** | 3 |

The enrichment *is* Washington. Outside it, an alpine route is a name, a grade and a pitch
count. A climber planning anything in the Sierra, the Tetons, the Winds or Alaska gets a page
that honestly says it knows nothing — verified live on an Alaska route: "Low confidence · 0 trip
reports", "No day-by-day plan on file yet", N/A across the whole time-to-summit calculator.
Correct behaviour, and completely useless to them.

## What "enriched" means, measured from WA rather than guessed

WA's 618 routes carry, in rough order of effort: `gear` + `detailed_rack`, `approach`,
`dist_km`/`gain_ft`/`loss_ft` (the planner inputs), `descent_text`, `hazards`/`obj_haz`,
`best_season`, `waypoints`, `pitch_detail`, `beta`/`pro_tips`. Coverage: gear 99%, planner-ready
78%.

**Grounded cost signal from this session:** a *gear-only* pass over ~130 WA routes — routes that
already had approach, hazard and beta data — took ~20 subagents at ~70k tokens each, ≈1.4M
subagent tokens, across roughly a dozen orchestrated batches. Full enrichment is several times
that per route, because approach distance/gain, descent and waypoints each need their own
sourcing and none can be inferred.

So: **1,700 routes at full WA depth is a multi-million-token, multi-week project.** That is the
honest number, and it is why this needs a decision rather than a "keep going".

## Recommended shape — marquee first, three phases

**Phase 1 — the objectives people actually climb (~150-250 routes).** Grand Teton, Middle Teton,
Mount Moran, Symmetry Spire, the Enclosure; Mt. Whitney, Temple Crag, Incredible Hulk, Lone Pine
Peak; The Diamond and Hallett Peak; Cirque of the Towers (Pingora, Warbonnet, Wolf's Head);
Mount Hood, Shasta, Rainier's neighbours. These are heavily documented, so sourcing is fast and
verification is easy — the opposite of the 28 WA routes we had to leave sizeless because nobody
has published a rack for them.

**Phase 2 — the rest of the confident-alpine set**, state by state, starting where the taxonomy
already helps (Colorado) and where the peaks cluster (WY, CA).

**Phase 3 — the uncertain tail**, only if Phases 1-2 prove the format lands.

Stop after any phase. Each is independently useful.

## Quality gates — all of these already exist and must be used

- `patchRow` (throws unless exactly one row) and `requireServiceKey` — never hand-rolled writes.
- `npm run check:sql` before any pasted SQL; a dry-run of the exact predicate afterwards, because
  **an UPDATE matching zero rows reports success**.
- `npm run check:bare` and `check:ui --url … --route "<name>" --snapshot` for render verification.
- `npm run audit:identity` after every batch.
- A validation gate on agent output before writing: this session's caught malformed payloads,
  content that lost information, and two "improvements" that added nothing.

## Risks, each one already observed

1. **Cross-state name collisions.** Agents repeatedly surfaced Seneca Rocks WV for a Gunsight
   Range route, and Liberty *Crack* for Liberty *Traverse*. Resolve identity through the area,
   never a name.
2. **`area_type` does not work outside WA.** All 397 `peak` areas are in Washington; Grand Teton
   and Mt. Whitney are typed `crag`. See `memory/area-type-peak-is-wa-only.md`.
3. **Route names do not classify.** A name heuristic called The Diamond a crag.
4. **Unsourceable routes are normal, not failure.** 28 WA routes still have no published rack
   after two passes from different sources. Budget for a tail that stays empty, and leave it
   empty rather than inventing numbers.
5. **Parallel sessions.** Re-check `origin/main` immediately before pushing.

## What I need from you

A go/no-go on **Phase 1 only**, plus a token ceiling. I will not start any of this off a
general instruction to continue.
