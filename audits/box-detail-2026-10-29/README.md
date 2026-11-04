# More in each ROUTE BREAKDOWN box (2026-10-29)

Owner's note: "We need more information on the route beta section for each box. How can we make the
flow easier from that section to the climbing route?" Resumes the session behind #2656 (BETA → *Follow
the climb section by section*, every box opens).

## Census (live, anon read of `routes.pitch_detail`)
886 routes store a breakdown, 3,778 boxes. A box is THIN when it has no `lengthM`, `belay`, `anchor`
or `bolts` and a note under 80 characters: 290 boxes on ~190 routes. Only 14 routes are thin in
every box (13 WA, 1 Rainier). Scope here: the 61 routes where at least half the boxes are thin
(`scope-ids.txt`, context rows in `context/`).

## Pipeline
`make-batches.mjs` → 13 batches of 5 (`batches/`) → Sonnet research under `BRIEF.md` (WebSearch +
WebFetch only, no curl) → `out/bNN.json` → `merge.mjs` (re-reads the live table, adds the researched
note / length / anchor to the stored row under the same label, holds low confidence) → `apply/bNN.json`
→ `npm run enrich:apply -- --from apply/bNN.json` (refuses sources named in text and 8-word runs shared
with any listed source; keeps a rollback; verifies on re-read). Every applied note was also read by
hand and edited where it weakened a stored fact or stated something only one condition report said.

## Written (verified on re-read) — 19 boxes on 8 routes
| route | boxes |
|---|---|
| wa_glacier_peak_cool_glacier_gerdine | 3 |
| wa_gorillas_direct | 1 |
| wa_mount_rainier_ingraham_direct | 4 |
| or_krag_peak_traverse | 3 |
| co_arapaho_peaks_traverse | 3 |
| wa_colchuck_peak_north_buttress_couloir | 1 (grade token shortened to "Steep snow", qualifier moved to the note) |
| wa_southeast_ridge_se_corner | 1 |
| wa_three_fingers_south_peak_lookout | 2 |

Hand edits before writing: Glacier Peak and Krag Peak had runs copied from a source (refused by the
check, reworded). Rainier: the crater-rim height (sources give 14,100–14,180 ft) and Cathedral Gap
height (no source) were dropped; a 25–30° angle that contradicted the stored 30–40° was dropped.
Arapaho: "painted arrows" contradicted the stored "sparse marks" and was dropped. Three Fingers: the
stored "ice axe and crampons required" was kept (the draft had softened it).

## Held — low confidence, one source each (not written)
wa_cashmere_mountain_se_route, wa_big_kangaroo_kearney_thomas, wa_lincoln_peak_standard,
wa_baring_mountain_r1, wa_goode_mountain_southwest_couloir, wa_mount_terror_stoddard_buttress,
rainier_central_mowich_face, wa_east_face_3, wa_gothic_peak_standard, wa_mount_spickard_southwest,
wa_northeast_face_direct, wa_tenpeak_mountain_north_couloir, wa_wing_peak_northwest_ridge.
(b09 and b10's output files were not saved by their agents; both batches held only low-confidence
routes, listed above.)

## Skipped — no readable source beyond what is stored
The other 40 routes. Mountain Project, SummitPost, The Mountaineers, WTA and CascadeClimbers refuse
automated reads or load empty; crag sport lines have no per-pitch text anywhere online.

## Stored-row findings (report only, not changed)
- Kearney-Thomas: one report gives 5.11b; stored 5.11a.
- Baring Mountain: the roof/aid crux may belong to Step 3, not Step 2.
- Northeast Face Direct: source says 50–60° and ~80 m of dirty 4th class on P1; stored says 65°+ and rock/ice.
- North Ridge (wa_north_ridge_7): a source gives 5.3 with a 4th-class crux, no 5.5 pitch.
- Minuteman descent: one report says four double-rope rappels; stored says about three single-rope.
- Gorillas Direct: the Mountain Project pitch list runs past the stored 8 pitches.

## Why the pass stopped at 61
Yield was 8 of 61 routes (13%), consistent with the three earlier passes (`audits/pitch-beta-2026-10-25`,
`audits/belay-stations`). The remaining ~130 routes have one thin box among richer ones, mostly travel
legs (approach, walk-off, snowfield) whose only sources are the same blocked sites. More web passes
will not change that; first-hand input will, and each box now has *Edit this section* and its own comments.
