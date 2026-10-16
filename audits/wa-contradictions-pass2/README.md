# WA route-tab contradictions: pass 2 (retries + re-read)

Follows pass 1 (`audits/wa-contradictions-rest/`, #1965). The same 505-route half; the other 617 are #1909's.

## What ran
1. **Retry** (research files `s001`–`s082`): the 596 contradictions pass 1 left "unresolved" for lack of two agreeing sources were researched again with sources pass 1 had not tried. **391 patches.**
2. **Re-read** (reader groups `reread/rg_00`–`rg_18`, research files `t…`): every route either pass had changed (426) was read again, field by field, against a fresh snapshot, to catch contradictions a fix introduced or left behind. `prior-settled.json` told the readers which facts were already researched and deliberately left alone.
   - 1,050 contradictions found; 942 research results: 421 fixed (2+ agreeing sources), 71 fixed from the row itself plus one source, 94 not a contradiction, 70 camp-card items (the camping clean-up owns `bivy`), 286 unresolved.
   - **914 patches.**

**Pass 2 total: 1,305 patches**, all compare-and-set against the live row and re-read after writing. Previous values are in `applied-*.json` for rollback.

## Held back by review (not applied)
- `summitTimeHrs` → null on rows with no published approach/descent leg (settled rule; now enforced by `scripts/oneoff/wa-contradictions-pass2/hold-summit-null.mjs`, which also refuses any `_raw` edit).
- Computed values: day miles derived by subtraction, a `distMi` interpolated from a round trip (set to null instead), a 4.0 km `dist_km` that would contradict three rows' own itineraries, a camp-to-summit distance from coordinates against two sources.
- An Osceola descent figure that would have broken its itinerary day.

`gain_ft` changes were applied only after review and only where two outside sources state the figure (Kangaroo Temple N Face 2,500; Boulder Glacier 8,100; Buckhorn 4,477).

## Needs an owner
See `notes.md`: pins in the wrong place, route names that disagree with their content, a `discipline` value, the Rainier per-climb fee on 10 rows (`access.fees` is an open decision), camp-card errors for the camping clean-up, and two lines of source wording still on screen.

## Checks
check:summit-briefing, pitch-split, grade-parser, rappel-single-rope, gain-floor-stated, impossible-leg, return-leg and no-sources all pass against the live data after the last write.
