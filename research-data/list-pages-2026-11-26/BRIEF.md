# Thin tick-list route pages — research brief (2026-11-26)

Owner note: audit every named list (Bulgers, Colorado 14ers and Centennials, ADK 46, Sierra Peaks
Section, California 14ers, Cascade volcanoes, Desert Towers, Fifty Classics), check that each has a
route page, and fill in the missing or thin sections. `npm run audit:list-pages` measures it; this
folder holds the worklists (`ctx/ctx-NN.json`) and the researched batches (`batch-NN.json`).

## Your job (one ctx file)

Each entry in `ctx/ctx-NN.json` is a route: `row` is what the database holds now, and `fill` lists
the sections that are empty or thin. Research ONLY those sections, for THAT route (the line named
by `row.name` on the peak `row.areas.name`). Write `batch-NN.json` beside it.

Read first: `.claude/skills/route-research/SKILL.md` and `disciplines.md` (evidence rules), and
`docs/codebase/enrichment-prose.md` (where each column renders).

| fill | column to set | what it holds |
|---|---|---|
| description | `overview` | 2-4 sentences: what the climb is, where, the character of the terrain, the grade's crux. ≥ 200 chars. |
| approach | `approach` | trailhead (name, the road it is on), trail and junctions, distances, where the climbing starts. ≥ 150 chars. |
| descent | `descent_text` | how a party gets down from the top to the trailhead: reverse the route, a named descent, rappels (count only if two sources agree). ≥ 100 chars. |
| season | `season` | a WINDOW only, like `Jun-Sep` or `Oct-Apr`; no words, no parentheses. |
| hazards | `hazards` | array of 2-5 short strings specific to this route (rockfall in X gully, lightning on the exposed ridge, river crossing at Y). Never generic filler. |
| gain | `gain_ft` | total elevation gain trailhead to summit, whole feet, needs a `ledger` entry. |
| distance | `dist_km` | ONE-WAY distance trailhead to summit in km (2 decimals ok), needs a `ledger` entry. |

If `row` already holds a value for a column but it is thin, you may write a fuller one that keeps
every fact the old one had. Never touch a column not in `fill`. If you cannot find the facts in at
least one real page you opened, leave the column out. Skipping is fine and is better than guessing.

## Rules that get a batch refused (they are checked by machine and by review)

- **Our own words.** No run of 8+ words copied from any page. Facts can come from a source; sentences cannot.
- **No sources in the text.** Never name a website, guidebook, author, agency-as-source ("per NPS"), or say "reportedly" or "according to".
- **No testimony.** Never write "parties report", "one party took", "climbers say".
- Sentence case, no ALL CAPS, no emoji, imperial units in prose (miles, feet).
- A search-engine summary is not evidence. Open the page itself.
- Mountain Project and OpenBeta count as ONE publisher. Hiking Project counts as Mountain Project too.
- gain/distance: two independent sources within 10% gives `method: "agree-2", level: "locked"`.
  One source gives `method: "single-source", level: "unconfirmed"`. A track-measured figure is
  `method: "measured"`. Check it is possible: gain ≥ summit elevation minus trailhead elevation.
  Round trip ÷ 2 for one-way; say so in the fact.
- A distance or gain must be for THIS line from THIS trailhead: never a loop over neighbouring
  peaks, never another route's figure. A hazard must be one a page states for this route or peak.
- Do NOT run any script (it would read the production database, which is gated). The lead runs the
  machine copy check; write every string fresh so it passes: no run of 8+ words from any page.
- Desert towers and crag-style Fifty Classics: gain and distance are optional (a short walk-in), but
  approach, descent (the rappel line) and hazards matter.

Only these keys may appear in `set`: overview, approach, descent_text, season, hazards, gain_ft, dist_km (the description goes in `overview`, never `description`).

## Batch format

```json
{
  "<route id>": {
    "area": "<row.area_id exactly>",
    "set": { "overview": "...", "approach": "...", "descent_text": "...", "season": "Jun-Sep",
             "hazards": ["...", "..."], "gain_ft": 4500, "dist_km": 7.24 },
    "ledger": [
      { "field": "gain_ft", "value": 4500, "method": "agree-2", "level": "locked",
        "evidence": [ { "url": "https://...", "retrieved_at": "2026-11-26", "fact": "4,500 ft gain" },
                      { "url": "https://...", "retrieved_at": "2026-11-26", "fact": "4,450 ft" } ] }
    ],
    "review": { "sources": ["https://...every page you read facts from..."], "confidence": "high|medium|low",
                "notes": "anything doubtful, what you skipped and why" }
  }
}
```

Every URL you took a fact from goes in `review.sources`, because the writer re-reads those pages
and refuses any string that repeats them.
