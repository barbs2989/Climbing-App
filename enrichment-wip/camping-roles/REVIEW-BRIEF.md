# Camping roles — SECOND-READER review brief

A first researcher sorted each Washington climbing route's camps into **main** (where a typical party
on THIS route sleeps) and **route** (a site on this route's own line — approach, climb or descent —
kept for a slow day or an emergency), and deleted the rest. On the routes in your file, that
researcher said they were UNSURE (`firstResearcherNote`). You are the independent second reader.

Research each route yourself online (WebSearch/WebFetch: trip reports, agency pages, route
descriptions). Do NOT just agree with the first researcher — and do not change things for the sake
of it. Only change what you have specific evidence for.

## Input
`enrichment-wip/camping-roles/review-input/review-NN.json` — per route: `camps` (name, current
`role`, elev, notes), `campsitePins` (map pins; `hiddenFromList` = the first reader kept it off the
camping list), `approach` text and the first researcher's note.

## Output — `enrichment-wip/camping-roles/review-output/review-NN.json`

```json
{ "routes": [
  { "id": "wa_...", "verdict": "confirm" | "change",
    "setRole": { "exact camp name": "main" | "route" },
    "remove":  ["exact camp name"],
    "add": [ { "name": "", "type": "camp|bivy|hut", "elev": 5400, "capacity": "", "water": "", "permit": "", "notes": "", "role": "main|route" } ],
    "unhidePins": ["exact pin name"],
    "evidence": "one or two sentences for the reviewer: what you found and why" }
] }
```

- Every route in your input must appear. `confirm` means leave it exactly as is (other keys empty).
- Names must be copied EXACTLY from the input. `setRole` may only name camps in `camps`; `remove`
  likewise; `unhidePins` only names pins with `hiddenFromList: true`.
- A route may end with no main camp only if it is genuinely done in a day and nobody camps for it.
- `add` needs every field; `elev` integer feet or omitted — never guessed.

## Hard rules
1. **No sources in any text that is written to the app** (`add` fields): never name a guidebook,
   author, website, forum, club or person. `evidence` is for the reviewer and may cite freely.
2. No emoji. Names are not identities — two similar names can be two places.
3. Order matters: list `setRole` main camps most-used first.

Validate with `node scripts/oneoff/check-camp-role-review.mjs NN` until it prints OK, then return a
short summary: confirmed / changed counts, and the changes that matter most.
