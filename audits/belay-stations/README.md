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

## Coverage and where to resume
Target set: the 424 routes that store per-pitch detail (2,275 entries). A quick pass by another
session (job 818a462c, exited) covered 210 routes and filled 104 pitches, but its output lists no
sources, so it cannot pass the copy check and was not applied. Its 162 empty routes are being worked
here, most-pitches first (`deep-A`…). Remaining after this session: see the report for the item.
Travel legs (approach, snowfield, walk-off) are skipped unless a source names a stance there.
