# Copied-prose rewrite brief (2026-10-29)

`npm run audit:copied-prose -- --live` found live route text that repeats a run of 8+ words from a
page our own research cited for that route. The owner's rule (2026-10-01): facts may come from a
source, every word must be our own. Each item in `queue/bNN.json` is one distinct live string:

- `key` — the item id
- `text` — the string exactly as it is live
- `runs` — the copied word runs (lower-cased, punctuation stripped) found in it
- `targets` — the route rows/paths that hold it (context only)

## What to write

`out/bNN.json`: a JSON array, one entry per queue item:

```json
[{ "key": "s0281", "edits": [{ "old": "<exact substring of text>", "new": "<our own wording>" }] }]
```

Rules:
1. Reword ONLY the clause or sentence that holds each run. `old` is an EXACT substring of `text`
   (same punctuation, dashes, apostrophes) that occurs ONCE in it, and covers the run. Keep it short:
   a clause or a sentence, not the whole paragraph.
2. In `new`, no 8 consecutive words of the run may survive in order. Reorder, restructure, choose
   other words — a real rewrite, not a one-word swap.
3. Keep EVERY fact: numbers and units exactly as written (the checker compares every digit string
   in `old` and `new`; "7,830 ft" must stay "7,830 ft"), place and feature names, directions,
   grades, gear, hazards, times. Add no fact. Drop no fact.
4. Keep the voice of the text around it: plain, direct, second person where it is. No quotes from
   anyone, never name or credit a source, a website, a guidebook author or a trip-report writer.
   No ALL CAPS, no emoji.
5. Proper names may stay as they are (an agency, a road, a trail, a ranger district). If a run is
   ONLY a name or an official title you cannot reword without losing it, reword the words around it.
6. Several runs in one item: one edit each, or one edit covering them if they sit in one sentence.
   Edits apply in order and must not overlap.

## Check your own work

Run `node /Users/nathanbarber/.claude/jobs/36bb3752/tmp/validate.mjs bNN`. It refuses an item whose
`old` is not a unique substring, whose numbers changed, or whose new text still repeats a cited
page. Fix every refused item and re-run until it reports 0 refused. Do not touch the database.
