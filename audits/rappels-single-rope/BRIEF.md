# Single-rope rappels — research brief (owner's note, 2026-11-26)

> "Let's fix the rappels so that the default is only using 1 rope. ... fill in the rappels section
> and audit and review so that the info given is always and only using 1 rope."

ClimbMatch's route page has a RAPPELS section built from three `routes` columns:

- `rappels` — a short summary line (text).
- `rappel_count_note` — a paragraph under it (text).
- `rappel_detail` — the station table: an array of
  `{ n, lengthM, anchor, station, hazards: [..], pull, notes }` (every key but `n` optional;
  `lengthM` is metres, a number, or null when no source gives a per-station distance).

Most parties carry ONE rope. Many of these routes describe the descent for TWO ropes tied together
(stations 40–60 m apart, "double-rope rappels", "2 x 60 m ropes", "with two ropes it halves").
Your job: for each route in your work file, research the descent and rewrite those three columns so
they describe what a party with ONE rope does — and nothing about two ropes.

## What to find (research online — never from memory)

Use web search / fetch. Good sources: Mountain Project route and area pages (descent + comments),
SummitPost, Cascade Climbers trip reports, stephabegg.com, The Mountaineers route pages, AAJ,
NWHikers, Peakbagger trip reports, guidebook excerpts, other climbers' blogs. Two independent
sources where they exist. For each route:

1. Is there a single-rope descent? Usually yes: a single 60 m (or 70 m) rope with intermediate
   stations, or a walk-off / downclimb that avoids the long rappels.
2. How many rappels on ONE rope, and which rope length (60 m or 70 m)?
3. A station list for one rope if sources give one (where each station is, anchor, length).

## What to write

Default rope: a single 60 m rope. Say 70 m only when the single-rope line needs it (a station
over ~30 m). Stations in `rappel_detail` must each be reachable on that one rope: `lengthM` ≤ 30
for a 60 m rope, ≤ 35 for a 70 m rope.

- **Single-rope station list found** → write it as `rappel_detail` with `"replace_rappels": true`.
  `lengthM` only where a source gives it (null otherwise). NEVER compute a station by halving a
  two-rope length or invent an intermediate anchor nobody describes.
- **Single-rope COUNT found, but no station list** → `"clear_rappels": true` (drops the two-rope
  table) and say the count in `set.rappels`, e.g. "About 8 rappels on a single 60 m rope". If the
  existing table is ALREADY a valid single-rope list (all stations ≤ 30/35 m), keep it — do not
  clear it; just fix prose.
- **Mixed table** (some single-rope stations + one long two-rope station) → keep the single-rope
  stations; replace the long one with the documented single-rope stations for that section if a
  source gives them; otherwise end the list there and say in the note what one rope does for that
  section (e.g. "below the notch, one rope does not reach the glacier; parties downclimb the
  gully").
- **No single-rope way is documented at all** → say so in single-rope terms, plainly, as a
  safety fact: "One 60 m rope does not reach from the saddle to the glacier (about 60 m), and no
  intermediate station is known." Then the single-rope alternative if one exists (walk-off,
  downclimb, another rappel line). `clear_rappels: true` if the table is the two-rope stations.
- **Already single-rope**, with only an aside about two ropes ("two ropes make it one rappel",
  "double ropes recommended", "carry two ropes") → remove the aside; keep the rest verbatim.
- `descent_text`: change it ONLY if it states a two-rope rappel setup; rewrite just that sentence
  for one rope and keep every other word as it is. Otherwise leave it out of `set`.

Do not write ANY of these in any column: two ropes, double rope(s), double-rope, twin ropes,
2 x 60 m, a pair of ropes, a second rope, tag line, "halves the number", "doubled ropes". (A
single rope "doubled through the anchor" is fine — that is how every rappel works — but prefer
"on a single 60 m rope".)

## Writing rules (hard — the applier refuses violations)

- Our own words. Facts come from sources; sentences may not. No run of 8+ words copied from any
  page you cite.
- Never name a source in the text: no "Mountain Project", "SummitPost", "Beckey", "Nelson",
  "guidebook", "trip report", "according to", "per X", "one party reported", "the first-ascent
  party". State the fact. ("Parties have …" is fine.)
- Sentence case, no ALL CAPS, no emoji.
- `set.rappels` is short: a count and the rope, one line (e.g. "4 rappels on a single 60 m rope
  down the line of ascent, from bolted anchors").
- If sources disagree on a count, give the range ("5–6") and say why in the note.
- Keep facts already in the row that are not about the second rope (anchors, hazards, the pull,
  which gully) unless research shows they are wrong.

## Output

Write `audits/rappels-single-rope/batch-NN.json` (NN = your work file's number) in the worktree,
a JSON object keyed by route id:

```json
{
  "wa_example": {
    "area": "<the work item's area, copied exactly>",
    "set": { "rappels": "…", "rappel_count_note": "…", "descent_text": "… (only if changed)" },
    "rappel_detail": [ { "n": 1, "lengthM": 30, "anchor": "2 bolts", "station": "…", "notes": "…" } ],
    "replace_rappels": true,
    "review": {
      "confidence": "high | medium | low",
      "sources": ["https://…", "https://…"],
      "single_rope": "one line: what one rope does here and what the sources said",
      "changed": "one line: what you changed and why"
    }
  }
}
```

Use EITHER `rappel_detail` + `replace_rappels` OR `clear_rappels: true` OR neither (keep the
table). `set.rappels` / `set.rappel_count_note` may be `null` only if the column should be empty.
Every route in your work file gets an entry. If research finds nothing at all about a single-rope
descent, still remove the two-rope wording and say plainly what is and is not known for one rope;
mark `confidence: "low"`.

Do NOT write to the database and do not run any npm scripts. Do not edit any other file. When done,
reply with a short table: id, confidence, single-rope count, what you did.
