# WA alpine and mountaineering: pitch-by-pitch and route beta audit (2026-10-25)

Owner's note: audit ROUTE BETA and the pitch-by-pitch section for all WA alpine routes; check that
multipitch alpine climbs have pitch data that is accurate; check beta for mountaineering and scrambling.

## Census (live catalog, read-only) — `census.json`
- WA alpine + mountaineering: 837 (alpine 586, mountaineering 251). Scrambling 186.
- Multipitch (pitches >= 2) alpine/mountaineering: 355. With no ROUTE BREAKDOWN at all: 26.
- Pitch-count mismatches (breakdown does not match stored `pitches`): 109.
  - 38 numbered tables whose pitch numbers disagree with the stored count (e.g. Clean Break: 13 stored,
    table numbered to 15; Buckner N Face: 12 stored, table to 13; Forbidden E Ridge: 6 stored, table to 8).
    NOT changed: each needs a route-level decision. Full list in `pitch-count-mismatch.json`.
  - 71 section-style breakdowns (rows labelled Approach / Summit block / Section 3…) with no pitch numbers.
    Section tables are a legitimate form (the 2026-09 merge), so these are not counted as errors.
- Beta (`routes.beta`) missing: alpine 117, mountaineering 17, scrambling 7. Not researched this session.

## Research this session (26 missing breakdowns, Sonnet agents, brief = audits/pitch-rappel-detail/BRIEF.md)
- APPLIED (verified on re-read):
  - wa_bonanza_peak_cascadian_route — 16 pitches, stored 16. Medium confidence, one AAC first-ascent article.
  - wa_himmelhorn_stonehenge — 8 pitches, stored 8. Medium confidence, one AAC article; grades only on 1,2,4,6.
- HELD for owner review (in this folder, not written):
  - wa_chimney_rock_east_face_direct — source counts 10 pitches, stored 9; low confidence (`chimney-rock-held.json`).
  - wa_phantom_peak_west_ridge — pitch 7 undescribed in the only source; rappel numbering ambiguous (`phantom-peak-held.json`).
  - wa_playing_not_spraying — low confidence, one page, pitches 1–4 merged (`playing-not-spraying-held.json`).
- SKIPPED, no usable pitch-level source (19): argonaut_peak_east_ridge, bulls_tooth_south_ridge,
  dome_peak_indian_summer, dragontail boving + colchuck col + northwest face, east_mcmillan_spire_ne_buttress,
  east_twin_needle_north_buttress, garfield east rib + southeast face, golden_horn_ne_arete,
  little_mac_spire_sw_route, lundin_peak_south_face_left, north_peak_north_ridge, northeast_ridge_1963_route,
  plan_9_from_outer_space, prusik_peak_taylor_wood_route, sw_ridge, the_chalice,
  the_chopping_block_ne_ridge, witches_tower_west_buttress. Reasons are in each batch file's skip_reasons.
  Mountain Project and SummitPost returned 403 to WebFetch in most of these; curl was refused for one agent.

## Answer to the note's question
Route beta and pitch-by-pitch are ONE ordered ROUTE BREAKDOWN on the Plan tab (since #1450), with CLIMBING ROUTE
(the beta, section by section) above it (#2648). A route that mixes approach/traverse stages with pitches is
shown in one list. Nothing here changes that.

## Still open
- The 38 numbered count mismatches and the 3 held tables need owner decisions.
- The 19 skipped routes need a source that gives pitch-level text (print guidebook or first-hand input).
- Beta is missing on 141 WA alpine/mountaineering/scramble routes; not started.

## Session 2 (2026-10-25): resumed, research wave, what changed

Verified first: the two session-1 writes are live and match their stored counts (`wa_bonanza_peak_cascadian_route` 16, `wa_himmelhorn_stonehenge` 8). PR #2836 is merged.

The census was re-run live and matches session 1: 1,023 WA alpine, mountaineering and scrambling rows; 141 with no beta; 24 multipitch routes with no breakdown; 38 numbered-count mismatches. The 196 routes in scope have context files under `context/` (ids in `scope-ids.txt`).

### Written to the live catalog this session (one write)
- `wa_live_free_or_die`: ROUTE BREAKDOWN now covers all 11 stored pitches. Pitches 1 to 8 were already stored; `9-11` is a grouped row for the shared finish with no grade or length (no source states them). Source: `mismatch-batch-mm-04.json`, applied with `apply-mm-04-fix.json` (dry run first, re-read verified).

### Decided and NOT written
- **Breakdowns, 24 routes (bd-00, bd-01, and the three held from session 1):** no online source gives pitch-by-pitch text matching the stored count. Mountain Project, SummitPost, Mountaineers and WTA return 403 or no matching pages. Skips are in `breakdown-batch-bd-00.json` and `breakdown-batch-bd-01.json`.
- **Count mismatches, 38 routes (mm-00 to mm-07):** 18 KEEP (false positives, such as range labels that sum correctly, or a legitimate section-style table), 18 HOLD (sources disagree with the stored count, or do not give one), and 2 FIX. One FIX (Live Free or Die) was applied. The other (Tatoosh La Villa) was REJECTED: its one-pitch count was inferred, and no source states a pitch count.
- **Beta, 141 routes:** not finished. Only two batches ran (`beta-batch-bt-00.json`, `beta-batch-bt-001.json`). Batches bt-00 and bt-001 wrote nothing (all 10 skipped). 113 of the 141 rows have no stored overview, approach or descent to start from, so the web is the only source, and the web sources were blocked. Remaining beta batches were stopped on purpose; resume plan below.

### Owner decisions needed
- **Stored `pitches` disagrees with a full source (never changed by this session):**
  - `wa_clean_break`: sources say 15, stored 13 (`mismatch-batch-mm-01.json`).
  - `wa_east_mcmillan_spire_northeast_buttress`: AAC says 29, stored 25.
  - `wa_dragontail_peak_serpentine_arete`: Mountain Project says 13, stored 14.
  - `wa_dorado_needle_east_ridge`: one guide says about 10, stored 14.
  - `wa_forbidden_peak_west_ridge`: Mountaineers says 4, Mountain School says 8, stored 8.
  - `wa_north_face_left_buttress`: source ends at P12, stored 14.
  - `wa_skeena26`: sources give 12, stored 12 matches; the table skips pitches 8, 10, 11, so the table is incomplete.
  - Full list of HOLD routes with counts: `mismatch-batch-mm-*.json` (review.decision = HOLD).
- **Possible misfiled rows:** `wa_dragontail_peak_boving_route` has no overview, beta or approach, and a Boving-Christensen 5.10 with 4 pitches exists on Prusik Peak. `wa_bald_eagle_peak_daniel_glacier` has an empty row; Daniel Glacier is on Mount Daniel. `wa_big_chiwaukum_three_musketeers_ridge` may be on Nada Lake. These need a look before any text is written.

### How to resume
1. Beta: list the 141 routes with no `beta` (`routes.beta` empty, WA alpine, mountaineering and scrambling), write context files with `gen-context.mjs`, and run batches of 5 with the bt brief, two at a time. Stop when the skip rate stays near 100%: the sources, not the effort, are the limit.
2. Breakdowns: the 21 skipped routes need print guidebook text or first-hand input. Do not spend more web tokens on them.
3. Owner: decide the HOLD list above, then either re-run those routes or change `pitches` through the owner's SQL path.
4. Accuracy of existing mountaineering and scrambling beta (about 413 rows with beta) was not audited in this session.
