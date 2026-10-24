# Research brief: pitch-by-pitch and rappel detail (2026-10-23)

Owner's ask: "add more detail text for each pitch if available. Same for rappels section."

You research a handful of climbing routes online and write ONE batch JSON file that
`node scripts/enrich-approach-rappel-bivy.mjs --from <file>` will apply to the live catalog.
You do NOT write to the database and you do NOT edit any other file.

## Inputs
- `audits/pitch-rappel-detail/context/<route_id>.json` — the route row as stored now (name, area,
  grade, pitches, overview, descent, rappels, any existing `pitch_detail` / `rappel_detail`).
  Read it first. Make sure the route you research is THIS route (same crag, same line, same grade
  ballpark). If you cannot be sure, skip it and say why.

## Output: `audits/pitch-rappel-detail/2026-10-23-batch-<LETTER>.json`
```json
{
  "<route_id>": {
    "area": "<area_id copied from the context file>",
    "pitch_detail": [
      { "pitch": "1", "grade": "5.8", "lengthM": 35, "bolts": 9, "anchor": "2 bolts", "crux": true,
        "notes": "2–5 sentences: what the climbing is (crack size, face, chimney, roof), where it goes, the crux and how it is protected, where the belay is, gear quirks, rope-drag or route-finding traps." }
    ],
    "rappel_detail": [
      { "n": 1, "lengthM": 30, "anchor": "2 bolts with chains",
        "station": "how to find this station",
        "notes": "where this rappel lands / where to go next",
        "hazards": ["stuck-rope flake below", "..."] }
    ],
    "review": {
      "confidence": "high|medium|low",
      "sources": ["full URLs you actually read"],
      "changed": "what you wrote and why; what you left out because sources disagreed",
      "pitch_count_found": 13,
      "other_findings": "anything in the stored row that looks WRONG (grade, pitch count, descent) — report only, do not fix"
    }
  },
  "skip_reasons": { "<route_id>": "why it was skipped" }
}
```

### Field rules
- `pitch` is a string label "1", "2", … (or "1-2" if the sources describe two pitches as one linked lead).
- `grade` is a short TOKEN ("5.10a", "C2", "WI4", "4th class") — qualifiers go in notes. ≤ 30 chars.
- `lengthM` (metres, number), `bolts` (integer), `anchor`, `crux` (boolean, only on the crux pitch):
  include ONLY when a source states it. Feet → metres, rounded. Sources disagree → leave it out and say so in review.changed.
- Every pitch / rappel needs non-empty `notes`.
- `rappel_detail` ONLY if the normal descent is by rappel (or the route is commonly rappelled). A walk-off route gets no rappel table — say so in review.
  One entry per rappel, top to bottom. `lengthM` only if stated (a "60 m rope reaches" statement means ≤ 30 m, not 60).
- If the context row ALREADY has `pitch_detail`: keep every existing label (comments are keyed on them).
  Improve and extend the notes; add the missing pitches; set `"replace_pitch_detail": true`. Never drop
  a stored fact unless a source contradicts it (say so). If the stored table is already rich and you have
  nothing to add, omit `pitch_detail` for that route.
- If the context row already has `rappel_detail`, do not write one unless you set `"replace_rappels": true` and explain why.

## Writing rules (hard — the apply script refuses violations)
1. **No sources in the text.** Never name Mountain Project, SummitPost, a guidebook, an author, "trip report",
   "according to", "per X", "reportedly said by". Sources go ONLY in `review.sources`.
2. **Your own words.** Facts are facts, but do not copy any run of 4+ words from a source. Rewrite.
   Trimming words out of the source's sentence is not a rewrite. Run `npm run audit:copied-prose -- <your file>`
   before you finish: the apply step fetches every URL in `review.sources` and refuses a string sharing
   8+ words with one (this wave shipped 74 such strings before that check existed).
3. **Nothing invented.** Every fact must come from a source you read. No guessed grades, bolt counts, or lengths.
   If only one weak source describes a pitch, keep the note short and factual.
4. No ALL-CAPS words. No first-person, no "we", no testimony ("I found…"). Write for a climber standing at the belay.
5. Conditions-dependent or contested facts: say so plainly ("can be wet early season", "some rate it 5.10a").

## How to research
Use WebSearch (mode "standard"; "extended" if standard is thin) and WebFetch. Good sources: Mountain Project
route page (the description often has P1/P2… text) and its comments, SummitPost, theCrag, climber blogs and
trip reports, local guide services, Supertopo archive. Aim for 2+ sources per route. Spend effort proportionate
to the route: ~5–10 fetches per route is plenty. If a page 403s, move on.

**If WebFetch 403s on Mountain Project, use Bash curl — it works (measured 200):**
`curl -sL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36" https://www.mountainproject.com/route/<id> | sed 's/<[^>]*>/ /g' | tr -s ' \n' | grep -i -A3 -E "P[0-9]|pitch|rappel|descent" | head -150`
(SummitPost and theCrag 403 even to curl.) Do not write a route from search-result snippets alone — read at least one full page.

When done, reply with: the file path, per-route one line (pitches written, rappels written, confidence), and skips.
