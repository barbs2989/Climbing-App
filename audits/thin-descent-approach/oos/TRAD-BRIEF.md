# Trad routes on peaks (2026-10-30)

Read `audits/thin-descent-approach/BRIEF.md` (rules and output shape) and `oos/OOS-BRIEF.md` (out-of-state method and sources) first.
This brief adds what the lead review found in about 70 earlier batches. Every rule below caught a real problem.

## Scope

Your context is `oos/ctx-trad-<st>-<n>.json`; write `oos/batch-trad-<st>-<n>.json`.
- Every target gets an entry: a `set`, or a `skip_reason`.
- Copy each target's `area` exactly from the target.
- Copy each target's `id` from the context as the batch key. Never retype it: a mistyped key is silently skipped at write time.

The targets are trad routes whose area looks like a peak: a peak word in its name, or a stored prominence. The test is mechanical, so some
targets will be valley domes or cliffs that only carry a peak-like name.
- If the route is a one-pitch crag line, skip it with `skip_reason: "crag route; descent is lowering off"`.
- If the route tops out on a formation and the descent is a real walk-off or rappel line, research it as usual.

## What to write
- **approach:** from the trailhead to the base of the route. Cover the trail or drainage, the landmarks, and how to tell which face or
  buttress is which. A seasonal road may be called seasonal, with no dates.
- **descent_text:** how parties get off the top. That may be a walk-off (which ridge or gully), a rappel line, a downclimb, or the peak's
  standard descent route, named. Give rappel counts only if two independent sources agree. If no source says how parties get down, write no descent.

## Rules (each one caught a real error in earlier batches)
1. **No testimony.** No party's time or experience, no "parties report", no "a party that...".
2. **No superlatives** a source does not state.
3. **No source names in the prose**, not even "the park map" or "the guide". Don't refer to another route's "page" or "description".
4. **Counts need two INDEPENDENT sources.** This covers miles, km, gain, elevations, rappels, pitches and rope lengths.
   - Pages that repeat one wording count as one source.
   - If the sources disagree, give the range they agree on, or leave the count out.
5. **One reliable source is enough for a non-numeric fact.** Mark that entry `medium` confidence.
6. **Never infer a top-out or a descent** ("probably the standard route reversed").
   - Never take a descent, or any other fact, from a neighbouring route's page for this route.
   - A peak's standard descent may be used only when a source says this route's parties use it.
7. **Skip the route if its identity is in doubt:** its own page says the description may belong to another line, or no source confirms that
   a line is this route.
8. **No current conditions:** no closures, landslides, road status or fire closures.
9. **Don't echo a source's distinctive wording.** The copy check refuses any 8-word run shared with a listed source.
10. **Don't list a page you couldn't read.**
    - SummitPost and Mountaineers.org usually block scripts.
    - stephabegg.com is firewalled; cite its web.archive.org copy.
    - NEVER fetch with a faked browser user agent. Use WebFetch or plain fetches.
11. **Avalanche terrain:** mention it only where a source does, and add "check the avalanche forecast".
12. **Already covered:** check whether an existing `oos/batch-*.json` covers the row (grep for its id). If it does, skip it and name that batch.

## Checks

`node scripts/oneoff/thin-da-offline-check.mjs <your batch>` must print no COPY or CAPS lines.
- Don't run the applier, not even with `--dry`; the lead session runs it.
- Don't commit, and don't touch git.
- Keep any helper scripts in `oos/scratch/`.

Reply with:
- how many written;
- how many skipped, grouped by reason;
- any duplicate or misfiled findings.
