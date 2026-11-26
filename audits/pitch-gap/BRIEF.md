# Brief: fill missing pitch-by-pitch and rappel detail (owner note, 2026-11-26)

Owner's ask: "Audit where the route says x number of pitches, and the route breakdown doesn't show all the
info for every pitch and fill in the gap. Same for rappels."

You turn saved route descriptions into ONE batch JSON that `npm run enrich:apply -- --from <file>` applies.
You do NOT touch the database, run the apply, or edit any other file. No web research is needed: the source
text is already on disk (the owner holds a licence to it). Read nothing else on the web.

## Inputs
`<CTX_DIR>/<route_id>.json` for each route in your list:
```
{ "row": { id, name, area_id, discipline, grade, pitches, length_m, pitch_detail, rappel_detail, rappels, descent_text },
  "source_url": "https://www.mountainproject.com/route/<n>",
  "source_text_path": "/abs/path.txt" }
```
Read the row, then the source text file (Description / Protection / Location sections).

## Output: write `<OUT_FILE>` (absolute path), then Read it back to confirm it landed
```json
{
  "<route_id>": {
    "area": "<row.area_id>",
    "pitch_detail": [ { "pitch": "1", "grade": "5.8", "lengthM": 35, "bolts": 9, "anchor": "2 bolts", "crux": true,
                        "notes": "1-4 sentences in our own words" } ],
    "replace_pitch_detail": true,
    "rappel_detail": [ { "n": 1, "lengthM": 30, "anchor": "2 bolts with chains", "station": "...", "notes": "..." } ],
    "review": { "confidence": "high|medium|low",
                "sources": ["<source_url>"],
                "source_texts": { "<source_url>": "<source_text_path>" },
                "changed": "what you wrote; what you left out and why",
                "pitch_count_found": 5,
                "other_findings": "stored count/grade/descent that the text contradicts — report only" } },
  "skip_reasons": { "<route_id>": "why" }
}
```

## Rules
- Write a route ONLY when the text describes the pitches one by one (P1, P2..., "pitch 1", "first pitch"...).
  A description that only says "4 pitches of great crack climbing" is a skip ("no per-pitch text").
- Make sure the text is about THIS route (name, grade ballpark, pitch count). Doubt -> skip.
- `pitch` is a string label "1", "2"... ("1-2" when the text treats two pitches as one linked lead).
  Write one entry per pitch the text describes, in order. If it describes fewer than the stored count,
  write what it describes (no padding, no invented pitch) and say so in `changed`.
- `grade` a short token ("5.10a", "C2", "WI4", "4th class"); omit when the text gives no grade for that pitch.
  NEVER copy the route's overall grade onto a pitch the text does not grade.
  `lengthM` (feet -> metres, rounded), `bolts`, `anchor`, `crux`: ONLY when the text states it. `crux: true` only
  where the text names that pitch as the crux (or gives it the route's top grade outright), never inferred.
- Every entry has non-empty `notes`: what the climbing is, where it goes, crux and protection, where the belay is.
- If the row ALREADY has pitch_detail: keep every existing `pitch` label and every stored fact the text does
  not contradict, improve thin notes, add the missing pitches, set `"replace_pitch_detail": true`. If the stored
  table is already as good as the text allows, omit `pitch_detail` for that route.
- `rappel_detail` ONLY when the text lists the rappels station by station, in order, top to bottom. "Rap the
  route with two ropes" or "3 raps with a 70" is not a station list: write no table (say so in `changed`).
  Do not write one when the row already has rappel_detail.
- OUR OWN WORDS. Facts may come from the text; sentences may not. Never reuse a run of 5+ consecutive words
  from it; restructure, do not trim. The apply step refuses any string sharing 8 words with the text.
- Nothing in the notes names a source, a website, a guidebook, an author, "the description", "according to",
  "first ascensionists say". No first person, no "we", no ALL-CAPS words, no emoji, no URLs.
- Nothing invented: no guessed grades, lengths, bolt counts or anchors. Hedge what the text hedges.
- First-ascent history and opinions about quality are left out; write for a climber at the belay.

## Before you reply: the copy check (required)
From /Users/nathanbarber/dev/Climbing-App/.claude/worktrees/pitch-gap-a77c run
`npm run -s audit:copied-prose -- <OUT_FILE>` and rewrite every flagged string (restructure; do not just swap
one word) until it reports 0 strings. The first two batches failed this on 94 strings: write fresh sentences
from the facts, do not paraphrase the source sentence by sentence. This is the ONLY npm script you may run.

Reply with: the file path, one line per route (pitches written, rappels written, confidence), and the skips.
