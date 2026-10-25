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
