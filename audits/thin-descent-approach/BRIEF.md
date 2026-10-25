# Brief: thicken thin DESCENT and APPROACH text on Washington alpine routes

Owner's request (2026-10-24): "Descent is still thin on many routes. Also thicken up approach for thin routes."

You research ONE batch: `audits/thin-descent-approach/context-NN.json`. It has:

- `targets`: the routes to work on. Each one says what it needs: `need_descent` (the descent text
  a climber reads is under 150 characters) and/or `need_approach` (the approach paragraph is under 150
  characters and the route has no approach variants). The current text is in `descent`, `descent_text` and `approach`;
  `siblings` lists every other route on the same peak.
- `richSiblingsOnSamePeak`: other routes on the same peak that already have a good descent/approach.
  Many peaks are descended by one standard way whatever you climbed, so a sibling's descent is often
  the right descent for the target too. You may re-use its FACTS when a source confirms that
  this route ends where that sibling's descent starts. Write new sentences; don't paste the old ones.

## What to write, per target

Write your result to `audits/thin-descent-approach/batch-NN.json` (same NN as your context file) in exactly this shape:

```json
{
  "wa_some_route_id": {
    "area": "<the target's area_id, copied exactly>",
    "set": {
      "descent_text": "...",
      "approach": "..."
    },
    "review": {
      "sources": ["https://...", "https://..."],
      "confidence": "high|medium",
      "notes": "one or two lines for the reviewer: what each source supported"
    }
  },
  "wa_other_route_id": { "area": "...", "skip_reason": "why nothing was written" }
}
```

Every target gets an entry, either a `set` or a `skip_reason`. Include `descent_text` only if
`need_descent`, and `approach` only if `need_approach`.

### descent_text: how a party gets DOWN, from the top of the route back to the trailhead or camp
- Say where the descent goes (which ridge, gully, glacier, or the route reversed), how hard it is (class,
  downclimbing vs rappels, how many rappels and off what if known, single vs double rope if known), the
  landmarks that keep you on line, where it rejoins the approach, and the descent's real hazards
  (loose gullies, moats, rockfall, cornices, steep snow needing an axe).
- 2–5 sentences, usually 300–900 characters. It MUST be longer than the target's current `descent`
  (the page shows whichever of `descent`/`descent_text` is longer), and keep every true fact the current text has.
- If the top of the route is not the summit (a buttress or a face that tops out on a ridge), say where it ends and how you get off from there.

### approach: how a party WALKS from the trailhead to the BASE of the climb
- Name the trailhead and trail (with trail numbers where sources give them), rough distance and gain when sourced,
  the camp if it is usually a two-day trip, the off-trail line (basin, gully, glacier, col), and how
  you recognise the start of the route.
- It ENDS at the base of the route. Don't describe the climb itself, and don't give driving directions
  (one clause naming the road the trailhead is on is fine).
- 2–5 sentences, usually 300–900 characters.

## Hard rules: the applier refuses a breach, or a guard fails the build

1. **Every word is your own.** No run of 8+ words may match any page you list in `review.sources`;
   the applier checks this mechanically and refuses the entry. Read for facts, then write fresh sentences.
2. **No sources in the prose.** Never write "per SummitPost", "Beckey says", "according to the
   guidebook", "trip reports note", "MP users", a website's name, or a person's name as an authority.
   Just state the fact. Sources go ONLY in `review.sources`.
3. **No pipeline voice.** Never "no data", "unknown per sources", "auto-generated", "researched",
   "not documented". If a fact isn't known, leave it out.
4. **Sentence case.** No ALL CAPS words except real acronyms (USFS, FS, PCT, SR, GPS).
5. **Never invent.** Every fact needs a source you actually read. If no reliable source describes this
   route's descent (or approach), use `skip_reason`; a missing paragraph is better than a made-up one. Use
   "typically", "often" and "in early season" for things that vary; don't state a number you didn't read.
6. **Right peak.** The context gives the peak's lat/lng and parent area. Make sure each source
   is about THIS peak (WA has several Goat Mountains, Red Mountains, Castle Peaks, South Peaks, Main Peaks, North Peaks).
   Use the parent area to tell them apart. If the target looks misfiled (a peak that isn't in
   Washington, or a "route" that is really an area or a wall name like "Toketie Lake Area" or "Approach Routes"),
   skip it and say so.
7. **Duplicates.** If the target is plainly the same climb as one of its `siblings` (same line, a
   different name or spelling, e.g. "Ingraham Glacier Direct" vs "Ingraham Direct"), skip it with
   `"skip_reason": "duplicate of <sibling id>"`. Don't research it.
8. Keep it practical, in the voice of a climbing guidebook. No marketing language.
9. **Don't assume where a route tops out.** If the descent depends on it and no source says, skip.
10. **Grade must match.** If your source's line doesn't fit the row's stored grade or discipline
    (rappels and a fatal-fall crux on a row graded Class 2), it may be a different route: skip it.
11. **No testimony.** Don't write "the guidebook says", "one party found" or "was tried by us".
    Turn it into a plain fact ("downclimbing east does not go").

## Sources
Use reputable climbing sources: mountainproject.com (`curl -sL` reads it; WebFetch may be blocked),
summitpost.org, cascadeclimbers.com, nwhikers.net, wta.org (trail numbers/distances), peakbagger.com, stephabegg.com,
mountaineers.org, nps.gov / fs.usda.gov (trails, trailheads), americanalpineclub.org, and Beckey's
*Cascade Alpine Guide* scans on archive.org if you can reach them. Prefer two agreeing sources.
List the exact URLs you used, so the copy check can read them.

## When done
Run `node scripts/enrich-approach-rappel-bivy.mjs --dry --from audits/thin-descent-approach/batch-NN.json`
from the worktree root. Fix and rerun every REFUSING line until you get none. Do NOT run it without `--dry`;
the lead session applies it. Reply with a three-line summary: how many routes were written, how many were skipped (and why, grouped),
and any wrong-peak or duplicate findings.
