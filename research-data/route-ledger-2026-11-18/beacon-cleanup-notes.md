# Beacon Rock clean-up, 2026-11-24

Applied to production after batches AF and AG (owner approved "Apply all"). Re-read after writing: 5 deletes, 4 patches, 0 mismatches.
Full prior values and the deleted rows are in `beacon-cleanup-rollback.json`.

## Duplicate rows deleted (none had references in any route_id table, list, link-up or comment)

| Deleted | Kept | Why |
|---|---|---|
| wa_false_profits | wa_northwest_face_false_prophets | misspelt copy of the same NW Face route |
| wa_pioneer_spike_route | wa_northwest_face_pioneer_iron_spike_route | same route, older import |
| wa_south_face_4_ten_a_cee_stemming | wa_tennessee_walker | variation name of the same line |
| wa_south_face_4_av_s_route | wa_tennessee_walker | same line |
| wa_south_face_4_south_face | wa_aging_fruits | same line (grade, FA, Fall Guy start) |

`areas.route_count` follows automatically (routes_bump_counts trigger).

## Single-field fixes

- wa_aging_fruits: merged from the South Face row: pitches 1, length 20 m, grade 5.11- R, access + permit = the approved South Face object (from wa_jill_s_thrill). One comment calls the runout closer to X; R kept, owner may revisit.
- wa_bluebird (SAFETY): overview rewritten to send climbers up the bolted starts, not the original start whose leaning pillar top is detached. Own words; 0 shared 6-grams with the source page. Gear text ("to 6 in for the offwidth", original start) still held.
- wa_northwest_face_winters_passage: length_m 11 -> null (P1 alone is ~30 m; sources give 250 ft and 295 ft, so left blank).
- wa_left_gull: commitment III -> null (one 80 ft pitch; no source gives a commitment grade).

## Kept on purpose (variations / link-ups, not duplicates)

Maiden Voyage, Armada, It Takes a Village, Rogue Wave, Arete in the Sky, Sunrise Direct, Second Wind, Uprising, The Stowaway.
