# Route breakdown research, round 5 — 2026-09-26

Researched online by three agents and applied through `enrich:apply` (`--from` each batch file in this
folder). Every write asserted the route's `area_id`, went through `patchRow`, and verified on re-read;
`scripts/oneoff/verify-route-breakdown-renders.mjs` then confirmed every entry's notes reach the Plan
tab (19/19 routes, 94 entries). The replaced tables are in the `rollback-*.json` files beside this one.

The batch files are the review surface: each entry's `review` block carries its sources and confidence,
and is never written to the row (the app names no sources).

## Written (19)

| Route | Batch | Section | Entries | Confidence |
|---|---|---|---|---|
| `wa_west_ridge_2` | F | ROUTE BREAKDOWN | 7 | high |
| `wa_ellen_pea` | F | ROUTE BREAKDOWN | 7 | high |
| `wa_south_face_4` | F | ROUTE BREAKDOWN | 7 | medium |
| `wa_the_l_h_route_free_variation` | F | ROUTE BREAKDOWN | 8 | medium |
| `wa_prusik_peak_prayer_for_a_friend` | F | ROUTE BREAKDOWN | 7 | high |
| `wa_solitude_3` | F | ROUTE BREAKDOWN | 5 | high |
| `wa_davis_holland_route` | F | ROUTE BREAKDOWN | 3 | high |
| `wa_one_piece_at_a_time` | F | ROUTE BREAKDOWN | 6 | high |
| `wa_davis_peak_nc_north_face` | G | ROUTE BREAKDOWN | 4 | medium |
| `wa_south_spur` | G | ROUTE BREAKDOWN | 3 | medium |
| `wa_little_sister_southeast_ridge` | G | ROUTE BREAKDOWN | 2 | medium |
| `wa_south_ridge` | G | ROUTE BREAKDOWN | 3 | medium |
| `wa_gunsight_peak_standard` | G | ROUTE BREAKDOWN | 6 | medium |
| `wa_mount_johnson_standard` | H | ROUTE BREAKDOWN | 3 | medium |
| `wa_tower_mountain_southwest_route` | H | ROUTE BREAKDOWN | 6 | medium |
| `wa_mount_logan_r2` | H | ROUTE BREAKDOWN | 6 | medium |
| `wa_big_snow_mountain_east_ridge_hardscrabble_route` | H | ROUTE BREAKDOWN | 3 | high |
| `wa_ruby_mountain_northwest_ridge` | H | ROUTE BREAKDOWN | 4 | medium |
| `wa_mount_carrie_se_route` | H | ROUTE BREAKDOWN | 4 | high |

## Skipped — no credible section-level description found (2)

Left as they are. Sparse is better than invented on a climbing route.

| Route | Batch | Why |
|---|---|---|
| `wa_mount_degenhardt_southwest_route` | G | The row mixes two climbs and its identity is unclear. It is named 'Southwest Route'. Its pitch_detail and beta describe the line from Crescent Creek Basin to the summit horn, which one trip report calls the 'Corkscrew Route' (Class 4 slot to the north ridge, Class 4-5 face to the west ridge, Class 3 ledge to the south ridge); descent_text also follows that line. climbing_route instead describes a different line: up choss to the notch south of the summit (the upper Barrier crossing), then the south ridge, which is what other sources call the South Route. The 'Southwest Route' name could not be matched to either line in any source found, so neither was picked. Research found: the South Route (via the Barrier notch) is 4th class to low 5th, and traversing too low puts parties on roped 5.7 ground. On the Corkscrew line, a single rappel or downclimb is used from the summit step. |
| `wa_robinson_mountain_north_couloir` | G | No pitch-level (or any) description of a North Couloir on Robinson Mountain was found. The peak page, three trip reports and several searches mention only the Southeast Ridge standard route and an east-face couloir. The stored lengthM values (91 + 305 + 30 m) add up exactly to length_m 427 and look back-filled. The angle ranges (30-35°, 40-50°) have no traceable source either. A human should consider whether this row's existing table can be trusted. |

## Findings in OTHER columns — NOT acted on (19 routes)

Each one is a research agent's reading of the sources against what the row stores. None was
written: grade, pitch count, discipline, `fa`, `beta`, `rappels` and `descent_text` are outside
this pass, and some of these are identity questions (which climb is this row?) that need a human.

- **`wa_west_ridge_2`** — The stored route is 7 pitches; the route description and trip reports count 8 (P1 and P2 are often linked, which gives 7 leads). The route is 600 ft (about 183 m), which matches length_m. Grade 5.8+ is the consensus; some reports call it 5.9-.
- **`wa_ellen_pea`** — The stored grade is '5.11'; the route is consistently given as 5.11c (MP lists it as 5.11 PG13). One source calls it 'originally climbed in 8 pitches'; the standard description is 6 pitches plus the optional short 7th, which matches the 7 stored.
- **`wa_south_face_4`** — The stored approach text contradicts itself. It first describes the Kangaroo Pass approach, then says this route 'never cross[es] Kangaroo Pass' and goes southeast along the creek. The MP route page says to hike to Kangaroo Pass, drop some elevation and traverse to the South Face (2-4 hrs). SuperTopo gives 800 ft and 7 pitches; length_m 244 matches.
- **`wa_the_l_h_route_free_variation`** — The description says the pitch grades are 'a little theoretical' because the route sees few ascents, and a 2020 comment notes the pitches above P4 are dirtier and see little traffic. The stored beta text says the original 1969 line used '1.5 billion pitons', which is nonsensical, and it names people as sources ('grades are described by the first free ascensionists as...'), which may breach the no-sources rule for beta prose. The FA field lists only the aid line; the free variation was climbed in 2015 by Herrington and Tepfer (per the overview).
- **`wa_prusik_peak_prayer_for_a_friend`** — The AAJ gives 600 ft and 7 pitches on the southwest face; the stored length_m 183 (600 ft) matches, and the stored count is 6. The stored overview calls it a 'south face' route; the AAJ says southwest face. A 2024 comment (from a visit made before the free ascent) reported seeing no bolt at the top of the crux pitch, so the single-bolt belay should be checked.
- **`wa_solitude_3`** — length_m is null; no source gives an overall length. Taking the P3 bypass variation drops the route to about 5.11a overall.
- **`wa_davis_holland_route`** — The route technically has 6 pitches (the original continues left up a vegetated weakness), but nearly everyone climbs the first 3 and rappels or finishes on Lovin' Arms, so the stored 3 is the right working count. Descent note: the P3 anchor cannot be rappelled straight to the ground with a 60 m rope. Rappel about 25-27 m to a hanging three-bolt anchor directly below, then make one double-rope or two single-rope raps trending climber's left.
- **`wa_one_piece_at_a_time`** — The route is consistently graded 5.10d (MP header; the trip-report title); the stored '5.10+' is looser but not wrong. The FA trip report says the route was first climbed in 5 pitches plus a scramble, which matches the stored 6 entries.
- **`wa_davis_peak_nc_north_face`** — The FA year is uncertain. The stored fa says July 1974 or 1976; a peak page gives 1972 for Kloke and Simon. The AAJ dates the first winter ascent to March 13, 2005, and the trip report is headed 3/12/2005 (the stored fa has March 13). descent_text quotes a climber ('The 2005 party's words: ...') and rappels quotes a report. Both are testimony and credit a party, so a human should reword them.
- **`wa_south_spur`** — The stored route grade '4th' is on the high side: three recent trip reports call the summit ridge Class 3 (one says Class 2+ on descent), with 4th class coming from the older guidebook grading. climbing_route step 3 says the crest is 'on the order of a hundred feet'; that figure could not be confirmed.
- **`wa_little_sister_southeast_ridge`** — The stored lengthM values (70/71/71) look back-filled from length_m 213 ÷ 3, and no source gives pitch lengths. pitches=3 and length_m=213 match the route description (3 pitches, 700 ft). The area page gives Little Sister's elevation as 6,017 ft, but a Mountaineers page says 6,600 ft. Check the stored summit elevation.
- **`wa_south_ridge`** — The stored discipline is 'mountaineering', but this is a 3-pitch trad alpine rock route (Grade II, 5.8), so 'alpine' fits better. The recent report calls the route poor-quality rock throughout and found P3's 'low 5th' needing a 5.8–5.9 step. The stored overview's 'clean granite climbing' is contradicted: it should be 'marginal rock'. The approach column says the standard approach is from Downey Creek via the Ptarmigan Traverse, while the route description says the corners are approached from Blue Lake. A human should look at both.
- **`wa_gunsight_peak_standard`** — The grade 'Class 5.6 / glacier' is not a clean grade value. Other parties describe a different line on the same summit as 'the classic SW (Beckey) route': about 5 short pitches of low to mid 5th on knobby rock, starting from a small cave above the moat. Whether this 'Standard Route' is that line or the dike-and-notch line in the table is not settled by any source. A human may want to confirm the row's name. The overview says 'Chikamin Glacier to the west and Blue Glacier to the east'; that is correct.
- **`wa_mount_johnson_standard`** — beta says the route keeps to class 3 'by skirting right of Gasp Pinnacle'; both trip reports go LEFT of / behind the Sweat-Gasp spires (the notch between them is the separate 5th-class variant). descent_text's optional 30-50 ft rappel below the summit block is not supported by any source read (parties downclimbed the chimney and east face) - not contradicted either.
- **`wa_tower_mountain_southwest_route`** — Stored grade 'Class 3-4': the standard-route description rates it class 3 ('should never exceed class 3'); the 5.6 'SW Gully Upper South Ridge' is a different line. beta's 'second gully containing roughly 15 ft of slabby class 4 (sometimes wet)' is unsourced. Two published descriptions differ on how the gully is entered (cave ledge vs. a notch in the west ridge and a gully marked by a gendarme); the table follows the cave-ledge version, which the approach column and three trip reports also describe.
- **`wa_mount_logan_r2`** — Stored grade 'Grade II, Class 4': the route description rates it Grade III, class 3 rock (a trip report calls the summit 3rd/4th class) - worth a look. beta says the route 'traverses to meet Banded Glacier' before the summit block: the Douglas route tops out at the ~8,550 ft notch at the Douglas Glacier's head (the Douglas/Banded col) and then climbs rock - there is no Banded Glacier traverse. descent_text offers 'Descend the Banded Glacier via the Banded-Douglas col to reach the Fisher Creek basin' as a routine alternative; not researched, but the Banded is described as badly broken (crevasse band spanning most of its width), so presenting it as a casual descent option deserves checking. rappels=1 is consistent (a minor summit-ridge rappel is mentioned as possible).
- **`wa_big_snow_mountain_east_ridge_hardscrabble_route`** — grade is null; every source rates this route class 2 (the upper gully to the gap is snow early season). The same ridge is called the 'east ridge' in one source and the 'northeast shoulder' in another - same ground.
- **`wa_ruby_mountain_northwest_ridge`** — The label '(7,426 ft)' disagreed with the 7,408 ft summit elevation the route sources give; the area row's elevation may want checking. Note that the other popular snow-season line (Happy Creek from Ross Dam, with its boulder field at ~3,500-3,600 ft) is a different route; its beta should not be merged into this row.
- **`wa_mount_carrie_se_route`** — Name 'Southeast Route via Hurricane Ridge / Cat Basin' is wrong on both counts (see classification.name); the overview and approach already say so in prose. Summit elevation differs between sources (6,995 ft vs 7,156 ft) - not researched further. The route row's own discipline/grade ('scrambling', 'Class 2-3 with steep snow early season') match the sources.

## Round-4 and re-run findings verified and applied (same day)

`2026-09-26-verify-8.json` (round-4 batches A–E) and `-verify-9.json` (re-run batches r4b A–C and follow-ups). Each claim
was checked against the LIVE value. Only CONFIRMED findings were written.

- **Prose corrections, 24 routes.**
  - verify-8: Boston NW Ridge (no rappels on the ridge; northwest end), Eldorado S Ridge (no rappels), Austera (the 5.5
    pitch is the return to the col), Fortress (Buck Creek start, ~6,300 ft bench, chimney partway along the ridge), Big
    Four Spindrift (65° slabs), Liberty Cap Ptarmigan (40–45°), Lane Peak (the Zipper rappel is on the ascent, and the
    real descent is now written), Monk West Cracks (an unsupported gear-rappel descent is removed), NE Ridge approach.
  - verify-9: Morning Star (the Sunrise Mine Trail / South Fork valley start, not Headlee Pass; approach, descent,
    overview and climbing section; the approach is trimmed so it ends at the ridge notch), Gilbert West (Cispus Basin,
    Class 3), South Twin (bypass location), Constance North Chute, Constance Finger Traverse (east, not south, in both
    the approach and the climbing section), Goatshead Spire (the undocumented Lemah Two scramble is removed), Nooksack
    fa (2001), Sherpa N Ridge, Accendo Lunae (pin gone, two-bolt anchor; the unsupported two-rope rappel is removed),
    Going Down Under, The Dirty, Infinite Bliss, Cascade Peak (testimony restated), Summertime, Ellation.
- **Plain-voice fixes** (`2026-09-26-no-sources-3.json`): Davis Peak descent and rappels (quoted and narrated a 2005
  party), Nooksack descent, the Goatshead descent line, the Morning Star overview (a quoted source phrase and an unsourced
  T5/S4), and L&H beta (credited the first free ascensionists; a "1.5 billion pitons" joke carried as fact). Also the
  Morning Star breakdown direction: northwest → east.
- **Classification SQL** (`2026-09-26-classification-4.sql`, `-5.sql`, rollbacks beside them), grade_num = `gradeNumFor()`:
  - Grades: Concerto 5.8+, Prey 5.10c, Ellen Pea 5.11c, Spindrift IV+ 5.9 WI5, Cascade Peak 5.8 (grade_num 10 → 8; the
    10 had been parsed out of a testimony sentence), Fortress Class 3-4, Gilbert Class 3, South Twin Class 2-3, Big Snow
    Class 2.
  - Other columns: Fight or Flight pitches 12; Dirty Sanchez renamed "The Dirty" (the first ascensionist asked for the
    rename). Mount Carrie's remaining route is renamed "Southwest Ridge via High Divide and the Catwalk" (three sources;
    no southeast route exists).
  - Held back: And Say "5.11+" (the parser reads it as 11, which would LOWER its sort below 5.11b's 11.5), Lane Peak and
    Sinister (proposed values are not grades), Mount Lyall (single source).
- **Mount Maude "Nothing Couloir": EXISTS** (added to Mountain Project Dec 2025, which is why earlier searches missed it).
  Its stored lengths (152/46/198/61 m) have no source.
- **Left for a human:**
  - Robinson Mountain "North Couloir": no source documents the route at all. Its lengths (91+305+30 = 426 m against
    length_m 427) look like a split of ~1,400 ft, but they do not sum exactly, so they were not stripped.
  - Mount Degenhardt: the row mixes the "Corkscrew" line with the South Route.
  - The Boston NW Ridge climbing section still repeats the gendarme-rappel claim.

## Still pending from 2026-09-26-findings.md
Four row deletions (Index "North Approach", Lemah Two Scramble, Mount Carrie Standard, Elephant Head). The session's
permission settings block the delete; the owner has the SQL.
