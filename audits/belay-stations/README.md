# Belay stations, pitch by pitch (owner's note, 2026-10-25)

"For pitch by pitch, we need to give more detail about where to find the place to belay, ie belay
stations. Do online research." Each `routes.pitch_detail` entry may carry `belay`: one sentence, in
our own words, saying where the belayer stands at the END of that pitch and how to find it. It shows
as *Belay station* in the pitch's Pitch gear card (PR #2851) and is editable in the pitch editor.

## Pipeline (one batch = 5 routes)
1. **Research** (Sonnet subagent, `DEEP-BRIEF.md`): reads full pages with WebSearch/WebFetch only.
   Never curl or a spoofed user agent (bot-check circumvention is refused). Writes
   `{ id: { review: { sources }, belay: { label: sentence } } }`.
2. **Verify** (a second Sonnet subagent, `VERIFY-BRIEF.md`): rereads each source and must QUOTE the
   passage that puts the belay at the END of the stored pitch. Unsupported detail is cut, a belay
   under a different pitch number is dropped. Stock-phrase verdicts are not accepted: batch 01's first
   verifier gave them, so it was re-verified strictly (`batch-01.reverify.json`) and corrected
   (`batch-01-fix.json`).
3. **Apply** (`scripts/oneoff/apply-belay-stations.mjs`): dry run by default. Refuses a label that is
   not exactly one stored entry, an existing belay (unless `--fix`), > 220 chars, a source name, ALL
   CAPS, and any 8-word run shared with a listed source. Sources are fetched with a PLAIN request, and
   a route with any unreadable source is refused. Writes one row at a time, >= 1 s apart, a minute's
   back-off on a 5xx/timeout, stop on a second; rollback file first; every row re-read.

## Files
`batch-NN.json` = what was applied · `batch-NN.verify.json` = the verdicts behind it ·
`rollback-*.json` = each route's table before the write.

## Coverage (measured on the live table, 2026-10-28)
Target set: the 424 routes that store per-pitch detail (2,275 entries). **449 pitches on 162 routes
now carry a belay station**, every one researched, independently verified and copy-checked.
- Every route with 2+ numbered (roped) pitches had a deep pass. What is left blank is blank because
  no readable source places the belay, sources disagree, or the source numbers pitches differently.
- Routes whose table is travel legs (approach, snowfield, glacier, walk-off) were not researched: a
  leg has no belay station unless a source names a stance there.
- Second pass (`SECOND-PASS.md`, batches 51–57): extended search, trip reports, journal articles and
  blogs on the 303 routes still holding 2+ open numbered pitches, partly filled routes first. 30 routes
  researched → 34 more pitches (S3+S4, partly filled routes, gave most; T1–T6 gave 2 after
  verification). Stopped there: the sources that place belays plainly are used up, and what remains
  fails on pitch numbering or inference. Reading SummitPost/CascadeClimbers/SuperTopo in a browser was
  refused as working around their block on automated reads, and archive.org guidebook search is
  loan-gated, so neither is an option.
- `batch-10.json` is a peer session's checked set (818a462c verify-out), re-checked by this script.
  Its rows on routes already written here were skipped, so two sources never mix on one route.
- Refused by the apply checks (not written): 8-word copies of a source (~8 sentences) and routes
  whose source would not load with a plain request (~6 routes). Listed in the apply output per batch.

## Resuming
To add more: research a batch with `DEEP-BRIEF.md`, verify it with `VERIFY-BRIEF.md`, build
`{id: {review:{sources}, belay:{label: text}}}` from the kept verdicts, dry-run, then `--apply`.
Climbers can also add or fix a belay station themselves in the pitch editor.
