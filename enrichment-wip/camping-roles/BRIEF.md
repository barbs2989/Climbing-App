# Camping roles research brief

ClimbMatch is a climbing app for Washington State. Each route page has a CAMPING & BIVY panel.
Today most routes list 6–16 camps because one list was handed to every route in a whole
corridor, so a climber cannot tell which camp to use. Your job: for EVERY route in your batch,
research online what a typical party on THAT route actually does, and sort its camps.

## Input

`enrichment-wip/camping-roles/input/batch-NN.json` — an array of zones; each zone has `routes`,
each route has `id`, `name`, `peak`, `discipline`, `grade`, short `overview`/`approach`, and
`camps` (the list the panel shows now: `name`, `store` = bivy|waypoint, `type`, `elev` ft, `notes`).

## Research

Use WebSearch / WebFetch (trip reports, guidebook summaries, agency pages, climbing forums).
Research per APPROACH / PEAK, not per route — routes sharing an approach usually share a camp,
but NOT always (e.g. Rainier's Disappointment Cleaver uses Camp Muir, Emmons uses Camp Schurman;
a north-side route may use a different basin than the standard route). Check each route.

## Classify every existing camp for every route into exactly one bucket

- **main** — the camp(s) a typical party on THIS route sleeps at: the standard base/high camp,
  or for a route normally done as a long day, the camp people use when they do split it (or the
  trailhead/car campground most parties stage from if that is the norm). Usually 1–2, max 3.
  Order them most-used first.
- **onRoute** — sites physically ON this route's own line (its approach trail, the climb itself,
  or its descent) that a party could use as an alternative, a slower-party camp or an emergency
  bivy. Keep these — a climber may need them. Order them in the order you reach them.
- **drop** — anything else: camps serving a different peak or a different approach/valley, far-off
  campgrounds not on the way, closed/defunct sites, and duplicates (two entries for one place —
  keep the better one, drop the other and say "duplicate of <name>").

Every camp name in the input must appear in exactly ONE bucket, spelled EXACTLY as given
(copy/paste — the names are matched literally).

## Add a camp ONLY if the route's real main camp is missing

`add` entries need all fields: `name`, `type` (camp|bivy|hut), `elev` (integer FEET), `capacity`,
`water`, `permit`, `notes`, and `role` ("main" or "onRoute"). Short plain sentences.

## Overnight permit — per ZONE (override per route if a route differs)

What does a party need to camp overnight here, WHERE do they get it, and the official link:
- `what`: one short line, e.g. "Free self-issue Alpine Lakes Wilderness permit" or
  "North Cascades NP wilderness permit — quota, not free" or "No overnight permit required".
- `where`: one or two short sentences on how/where to obtain it, e.g. "Fill one out at the
  trailhead kiosk" or "Reserve on Recreation.gov; walk-up permits in person at the Marblemount
  Wilderness Information Center".
- `url`: the ISSUING AGENCY's official page for that permit (nps.gov, fs.usda.gov, recreation.gov,
  dnr.wa.gov, parks.wa.gov, wdfw.wa.gov) — FETCH IT to confirm it loads and is the right page.
  `null` for self-issue-at-trailhead permits with no useful page, or no permit.

## HARD RULES (the app enforces these)

1. **No sources anywhere in any text you write.** Never name a guidebook, author, website,
   forum, trip report, club or person ("per Beckey", "SummitPost says", "according to NPS").
   State facts plainly. The only URL allowed is `url` in an overnight permit.
2. No emoji. Elevations in feet. No invented precision — omit `elev` rather than guess.
3. Do not re-home a camp by name similarity: "Whatcom Pass" and "Whatcom Camp" are different
   places. Names are not identities.
4. If a route's ENTIRE camp list belongs to another approach, still classify it (likely all drop),
   add the right main camp, and put a line in `misassigned`.
5. Be honest about uncertainty in `note` (one short sentence per route) — it is for the reviewer,
   not the app.

## Output — write `enrichment-wip/camping-roles/output/batch-NN.json` (same NN as your input)

```json
{
  "zones": [
    { "zone": "enchantments", "overnightPermit": { "what": "...", "where": "...", "url": "https://..." } }
  ],
  "routes": [
    { "id": "wa_...", "main": ["exact name"], "onRoute": ["exact name"], "drop": ["exact name"],
      "add": [], "overnightPermit": null, "note": "one sentence" }
  ],
  "misassigned": ["wa_...: why"]
}
```

`routes` must contain EVERY route id in your input. Validate before finishing:
every input camp name appears exactly once across main/onRoute/drop for its route. Then return a
short summary: routes done, camps kept main / onRoute / dropped / added, anything you were unsure of.

Run `node scripts/oneoff/check-camp-role-output.mjs NN` from the worktree root and fix every problem it reports before you finish.
