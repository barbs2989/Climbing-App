# Leftovers (verify-12 / verify-13): the items held back in earlier rounds

The bar: change a stored value only when two independent sources agree. Research is in
`2026-09-27-verify-12.json` (ice/snow/alpine grades, counts) and `2026-09-27-verify-13.json` (rock grades, FA, facts).

## Applied

Classification — `2026-09-27-classification-8.sql` (rollback beside it), grade_num = gradeNumFor(); all 8 re-read:

| Route | Change |
|---|---|
| wa_accidental_discharge_east_face | discipline mountaineering → alpine (3-pitch II 5.10 rock route) |
| wa_traverse_of_mount_index | pitches 4 → null (one header; section counts exceed it; no source gives a total) |
| wa_glacier_peak_kennedy_glacier | 'Class 2-3, Glacier' → 'Glacier, steep snow/ice 40–45°', grade_num 3 → null |
| wa_sherpa_glacier | '3rd' → 'Class 3, steep snow to 40°' (grade_num 3) |
| wa_mount_maude_r2 | null → 'Grade III, alpine ice' |
| wa_sinister_peak_north_face | null → 'Steep snow/ice 45–50°' |
| wa_lane_peak_r3 | null → 'Grade II, steep snow/ice' |
| wa_mount_logan_r2 | 'Grade II, Class 4' → 'Grade III, Class 4' (2 sources vs 1) |

Prose — `2026-09-27-leftovers.json` through the guarded writer, verified on re-read:

- wa_davis_holland_route: descent_text and rappels were empty; now the bolted P3 anchor rappel (4 sources).
- wa_south_spur: climbing_route step 3 no longer states "on the order of a hundred feet" (no source gives a length).
- wa_mount_logan_r2: overview's grade matches the new Grade III.

## Held — no change

- Megalodon Ridge pitches 8 → 20: the 20 is the count *if pitched out*; the first party belayed 7–8 and simul-climbed
  the rest. 20 would roughly double the planner estimate and sit over a 6-row breakdown. Grade IV+, 5.10 confirmed.
- South Spur grade '4th' → 'Class 3': 2 sources say Class 3 and 2 lean easier, but one listing says 4th PG13. Owner call.
- Unclear (sources missing or disagreeing): And Say letter grade, Bonanza NE Buttress grade, Little Tahoma
  Cowlitz–Ingraham grade, Sitkum Grade II vs III, Lyall Class 3-4, Davis Peak NC FA year and winter date,
  Davis–Holland FA year (1964 vs 1965).
- Refuted (stored value stands): Tower Mountain Class 3-4, Prayer for a Friend 6 pitches, Kangaroo Temple South Face
  7 pitches, Logan's Banded Glacier descent.

## Report only

- wa_little_sister (area): stored elevation 6,017 ft; three sources give ~6,600 ft (40-ft closed contour 6,600–6,640).
  Area columns were outside this batch.
