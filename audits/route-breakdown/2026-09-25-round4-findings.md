# Route breakdown research, round 4 — 2026-09-25 (partial)

Researched online by five agents and applied through `enrich:apply` (`--from` each batch file in this
folder). Every write asserted the route's `area_id`, went through `patchRow`, and verified on re-read;
`scripts/oneoff/verify-route-breakdown-renders.mjs` then confirmed every entry's notes reach the Plan
tab (18/18 routes, 85 entries). The replaced tables are in the `rollback-*.json` files beside this one.

The batch files are the review surface: each entry's `review` block carries its sources and confidence,
and is never written to the row (the app names no sources).

## Written (18)

| Route | Batch | Section | Entries | Confidence |
|---|---|---|---|---|
| `wa_the_monk_west_cracks_right_crack` | A | ROUTE BREAKDOWN | 2 | medium |
| `wa_the_monk_le_gibet` | A | ROUTE BREAKDOWN | 3 | medium |
| `wa_the_monk_scabo` | A | ROUTE BREAKDOWN | 2 | medium |
| `wa_ne_ridge` | A | ROUTE BREAKDOWN | 3 | medium |
| `wa_concerto_in_c_for_drill_and_hammer` | B | ROUTE BREAKDOWN | 14 | medium |
| `wa_skeena26` | B | ROUTE BREAKDOWN | 6 | medium |
| `wa_prey` | C | ROUTE BREAKDOWN | 5 | medium |
| `wa_rise_and_fall` | C | ROUTE BREAKDOWN | 5 | medium |
| `wa_and_say` | C | ROUTE BREAKDOWN | 5 | medium |
| `wa_steel_pulse_2` | C | ROUTE BREAKDOWN | 3 | medium |
| `wa_liberty_cap_ptarmigan_ridge_finish` | D | ROUTE BREAKDOWN | 7 | medium |
| `wa_northwest_ridge_2` | D | ROUTE BREAKDOWN | 3 | medium |
| `wa_south_ridge_4` | D | ROUTE BREAKDOWN | 4 | medium |
| `wa_austera_peak` | D | ROUTE BREAKDOWN | 4 | medium |
| `wa_sinister_peak_north_face` | D | ROUTE BREAKDOWN | 3 | medium |
| `wa_big_four_mountain_spindrift_couloir` | D | ROUTE BREAKDOWN | 7 | medium |
| `wa_fortress_mountain_east_ridge` | D | ROUTE BREAKDOWN | 4 | medium |
| `wa_lane_peak_r3` | E | ROUTE BREAKDOWN | 5 | medium |

## Skipped — no credible section-level description found (22)

Left as they are. Sparse is better than invented on a climbing route.

| Route | Batch | Why |
|---|---|---|
| `wa_north_face_left_buttress` | A | Not researched: the web search and fetch tools hit a session limit before this route could be looked up. Retry in a later batch. The stored table (8 entries) is untouched. |
| `wa_gato_negro` | A | Not researched: the web search and fetch tools hit a session limit before this route could be looked up. Retry in a later batch. The stored table (12 entries, 6 of them empty) is untouched. |
| `wa_ellation` | A | Not researched: the web search and fetch tools hit a session limit before this route could be looked up. Retry in a later batch. The stored table (8 entries) is untouched. |
| `wa_garfield_mountain_infinite_bliss` | A | Not researched: the web search and fetch tools hit a session limit before this route could be looked up. Retry in a later batch. The stored table (4 entries) is untouched. |
| `wa_zool_patch` | B | NOT RESEARCHED (tool limit, not a data finding): web search/fetch hit a session limit after the first search, which found no pitch-level page for Zool Patch. Re-run this route. |
| `wa_primal_scream` | B | NOT RESEARCHED (tool limit, not a data finding): web search/fetch hit a session limit before the route could be researched. Re-run this route. |
| `wa_big_kangaroo_going_down_under` | B | NOT RESEARCHED (tool limit, not a data finding): web search/fetch hit a session limit before the route could be researched. Note for the re-run: every stored grade has a parenthetical ('5.10 (open-book corner)') that must be reduced to a grade token. Re-run this route. |
| `wa_accendo_lunae_lib_west_face_var` | B | NOT RESEARCHED (tool limit, not a data finding): web search/fetch hit a session limit before the route could be researched. Stored rows carry lengthM: null on every pitch. Re-run this route. |
| `wa_sherpa_balanced_rock_north_ridge` | B | NOT RESEARCHED (tool limit, not a data finding): web search/fetch hit a session limit before the route could be researched. Re-run this route. |
| `wa_nooksack_tower_south_face` | B | NOT RESEARCHED (tool limit, not a data finding): web search/fetch hit a session limit before the route could be researched. Re-run this route. |
| `wa_dirty_sanchez` | C | Not researched this round: the web search/fetch tools hit a session limit before any source for this route could be read. Retry in a later batch. |
| `wa_summertime` | C | Not researched this round: the web search/fetch tools hit a session limit before any source for this route could be read. Retry in a later batch. |
| `wa_wild_wild_west` | C | Not researched this round: the web search/fetch tools hit a session limit before any source for this route could be read. Retry in a later batch. |
| `wa_cascade_peak_nw_chimney` | C | Not researched this round: the web search/fetch tools hit a session limit before any source for this route could be read. Retry in a later batch. Note for the retry: stored pitch grades are sentences ('5.8 published / felt closer to 5.10 to a 2013 party', '5th class, loose/variable') and the stored route grade carries testimony — both break the grade-token and no-testimony rules. |
| `wa_mount_carrie_standard` | D | Route identity is unclear: the row mixes two climbs. Its name and beta describe a Carrie Glacier variation (roped glacier travel in the northeast cirque), but its approach and pitch_detail are the standard High Divide → Catwalk → Boston Charlie's line. Sources describe that standard line as a non-glacial scramble up Carrie's southwest ridge/basin, about 2,000 ft from Boston Charlie's and mostly walking, with the Catwalk as the crux. The Carrie Glacier flows north-northeast from the summit, away from that approach. Per the brief, a row that mixes two climbs is skipped. Consulted: trailcatjim.com/mt-carrie-via-southwest-ridge-seven-lakes-loop-bogachiel-peak/, turns-all-year.com/trip-reports/august-4-8-2011-onp-mt-carrie-mt-ruth (summitpost blocked). Finding for a human: decide whether this row is the SW-ridge standard route (then drop the glacier/rope language from name, grade and beta) or a real Carrie Glacier route (then it needs a glacier approach, not the Catwalk description). |
| `wa_morning_star_peak_standard` | E | Research could not be finished: WebFetch/WebSearch hit a session limit (resets 6:40pm America/Denver) before any page for this route could be read. The Mountaineers page was also blocked (403/Cloudflare). Re-queue; the table was not changed. |
| `wa_mount_constance_north_chute` | E | Research could not be finished: the Mountaineers North Chute page and SummitPost returned 403, the NWHikers North Chute/Finger Traverse report would not load, and then the research tools hit a session limit. No pitch-level description of the North Chute was read. Re-queue. |
| `wa_mount_maude_r3` | E | A search for 'Nothing Couloir' on Mount Maude found no source (SummitPost, WTA and Wenatchee Outdoors hits list other routes), and the research tools then hit a session limit before more could be tried. The route's identity/name is unverified; re-queue and confirm it exists before rewriting. |
| `wa_mount_constance_finger_traverse` | E | Not researched: the research tools hit a session limit (resets 6:40pm America/Denver) before this route was reached. Re-queue. |
| `wa_south_twin_sister_scramble` | E | Not researched: the research tools hit a session limit before this route was reached. Re-queue. |
| `wa_mount_lyall_south_route` | E | Not researched: the research tools hit a session limit before this route was reached. Re-queue. |
| `wa_gilbert_peak_west_route` | E | Not researched: the research tools hit a session limit before this route was reached. Re-queue. |

## Findings in OTHER columns — NOT acted on (17 routes)

Each one is a research agent's reading of the sources against what the row stores. None was
written: grade, pitch count, discipline, `fa`, `beta`, `rappels` and `descent_text` are outside
this pass, and some of these are identity questions (which climb is this row?) that need a human.

- **`wa_the_monk_west_cracks_right_crack`** — descent_text opens with 'Rappel the route on gear from the top of the second pitch — quickest and simplest'. The one source I could reach says nothing about rappelling this line; worth a reviewer's look.
- **`wa_the_monk_scabo`** — The source's own prose spells the name 'Scarbo' while its title says 'Scabo'; the catalog uses 'Scabo'. I did not verify which is correct.
- **`wa_ne_ridge`** — The approach column says NE Ridge 'is gained by continuing up and around toward the ridgeline running north' from the South Face base. The source instead has climbers scramble the grassy SE slope up from the Boundary Trail to join the ridge. The rappels and descent_text columns say a short rappel is 'often useful' to get off the summit ridge. The source says only to descend the regular walk-up route to the west, with no mention of a rappel.
- **`wa_concerto_in_c_for_drill_and_hammer`** — Stored grade 5.8; the FA description grades it 5.8+. Stored climbing descent note says parties rappel to 'the Pitch 13 chain anchor' — the source names chain anchors at the tops of P11 and P14; P13's anchor type is not stated. Stored beta's 'Middle C' name and 'roughly pitches 7-10' could not be confirmed. The start is a two-bolt anchor on a short wall mid-apron, reached by scrambling down 20-30 m of ramps from the grassy saddle (useful for the approach column).
- **`wa_skeena26`** — Stored P7 grade 5.6 conflicts with a report placing a 5.8 section at the start of P7. Mountain Project gives the approach as about 3 hours to the start; the stored approach says the basin is ~2 hours from the car. The route tops out on a forested ledge; reaching the wall's summit involves further brushy scrambling (a trip report also describes two sparsely protected leads and a 30 m directional rappel on that exit).
- **`wa_prey`** — Stored route grade is '5.10'; the pitch grades top out at 5.10c and MP lists 5.10+. Descent per source is a double 60 m rope rappel trending slightly left from a tree anchor, consistent with the stored descent_text.
- **`wa_rise_and_fall`** — One trip report describes the route as four pitches at 5.12b ('sport-crag' 5.13b); the stored 5 pitches / 5.12 matches the MP page. Discipline 'trad' is arguable — the route is mostly bolted with finger-size cams required.
- **`wa_and_say`** — Stored route grade 5.11b is the P2 grade; P4 and P5 are both given as 5.11+, so the hardest pitches exceed the stored headline grade (MP headline is just '5.11'). A search-engine summary of the MP page lists four pitches, but the page itself lists five.
- **`wa_steel_pulse_2`** — Route grade is contested: an older guide rates 5.10c, a later one 5.10b (rakkup listing shows 5.10b). Stored 5.10c is supportable. Stored length_m 91 (300 ft) exceeds the sum of the stated pitch lengths (100+60+100 ft = 79 m).
- **`wa_liberty_cap_ptarmigan_ridge_finish`** — Stored beta and the old pitch_detail give the rising traverse as '50-60°'. Mountain Project gives 40-45° snow for the same slope, so 50-60° is one icy year, not the norm. The stored pitch lengths 250/30/60/40/199 (which sum with 305 to length_m 884) look back-filled from length_m, not taken from a source.
- **`wa_northwest_ridge_2`** — 1) `rappels` says '3–5 rappels on the ridge itself to get past its gendarmes, off threaded cord', and climbing_route row 3 repeats the gendarme rappels. The AAJ account mentions rappelling only between Sharkfin Tower and the ridge, not on the ridge, so the count and the gendarmes look invented. 2) `approach` says the Sharkfin–Boston col approach reaches 'the low (southwest) end of this ridge'. A northwest ridge's low end is at its northwest (Sharkfin) end, and the ascent came from Sharkfin. 3) `grade` '5.5 X' matches the source.
- **`wa_south_ridge_4`** — `rappels` says 'Several rappels used to bypass gendarmes along the ridge crest'. Both sources describe a short downclimb and a descent of the east ridge, with no rappels on the ridge. That field looks invented. Mountain Project lists the route as Trad/Alpine, ~1,000 ft, 4 pitches, Grade II; stored length_m 305 and pitches 4 agree.
- **`wa_austera_peak`** — 1) `beta` says the 50 ft '(reported as well-protected 5.5)' pitch is on the summit tower. The source puts the well-protected 5.5 at the col on the return; the summit tower is ungraded and described as loose and contrived. 2) `descent_text` calls the return climb 'the ~75 ft rappel pitch (well-protected 5.5)', which is consistent with the sources, so only `beta` conflates the two. 3) `grade` 'Easy 5th' is fine for the sub-summit; the true summit is rarely climbed.
- **`wa_sinister_peak_north_face`** — `grade` and `pitches` are null. The AAJ note gives NCCS II and 45–50° névé/ice, which could fill `grade` (for example 'II, 45–50° snow/ice'). `descent_text` says parties 'often' walk off via the west ridge. The only west-side description found is a class 3 gully to a notch on the lower west ridge, then class 2 to the summit, which supports a west-side descent, but 'often' is not sourced.
- **`wa_big_four_mountain_spindrift_couloir`** — The AAJ gives 4,000 ft, IV+ 5.9 95°; a later description gives IV AI4. Stored `grade` '5.9' drops the commitment grade and the ice grade, and `length_m` 1219 matches 4,000 ft. The old lower-slab angle '~75°' is contradicted by the first-ascent account (65° with a short 85° step). The route may have been climbed before 1996 (unconfirmed reports of a late-1980s ascent), which is relevant to `fa`.
- **`wa_fortress_mountain_east_ridge`** — 1) `approach` and the old pitch_detail put the bench at ~6,580 ft; the source gives ~6,300 ft for the bench camps. 2) `approach` starts 'From Trinity Trailhead, hike the Chiwawa River Trail (#1550)'. The route actually starts on the Buck Creek Trail, with the Chiwawa River Trail branching off at 1.4 mi (`descent_text` has this right). 3) `descent_text` says to down-climb 'the exposed 4th-class step' just below the summit. The source places the crux chimney mid-ridge, with easy ground to the summit. 4) `grade` is null; sources call it class 3–4.
- **`wa_lane_peak_r3`** — `grade` is null; the published grade is Grade II, AI1 / moderate snow up to 60°. `rappels` and `descent_text` say one rappel from the ridge top counts as the descent, but it is really part of the ASCENT (into the Zipper to reach the summit). The published descent downclimbs or raps from a tree below the summit, then plunge-steps to the Lane–Denman saddle and exits down a steep gully. One trip report describes two double-rope rappels on the way down.

## Partial round: re-queue these

The research agents' web tools hit a usage limit partway through. Most of the 22 skipped routes above were **never
researched**. Their `skip_reason` says so, and they are NOT "no source" findings. Re-run them. The exceptions:
`wa_mount_carrie_standard` is skipped because the row mixes two climbs (Carrie Glacier vs the High Divide scramble),
and `wa_mount_maude_r3` ("Nothing Couloir") is skipped because no source was found under that name, so check its identity first.

## Round-3 findings verified and applied (same day)

`2026-09-25-verify-6.json` (batches P–S) and `-verify-7.json` (T–V). Every claim was re-checked against the LIVE value,
because another session edits these rows. Only CONFIRMED findings were written. The tool limit cut research short, so
many UNCLEAR verdicts here mean "not checked", not "sources disagree".

- **Prose corrections, 15 routes.** Golden Age: every belay is bolted, so it rappels on one 70 m rope, and there is a
  direct gully approach. Mount Fairchild: the approach and descent had come from a party that walked past the peak; they
  now describe the Carrie Glacier / Southwest Ridge line, flagged as thinly described. The other 13: Freedom or Death P4
  is 5.11c; Up in Arms is all free; Spontaneous Distraction's 70 m rope reaches only on P1–2; Castle in the Sky's
  unsupported emergency-descent sentence is removed; Fortune Peak (Lake Ann, not Ingalls Way); Klawatti; Remmel (rappel
  order); Shuksan SW Couloir (the lower icefall); Snostril fa (the 2010 first ascent); Mount Maude (no testimony); Mount
  Stone via Putvin (the standard traverse under St. Peter's Gate); Jack Mountain North and Southwest Ridges.
- **No-sources** (`2026-09-25-no-sources-2.json`): the Jack Mountain North Ridge approach ("read the 2006 trip report")
  and the Star Peak descent ("a trip report warns") are restated in plain voice. Two source phrases inside the verifiers'
  own corrections were also restated before writing (Freedom or Death "on the topo", Putvin "from a trip report").
- **Grades by SQL** (`2026-09-25-classification-3.sql`, rollback beside it): Walkabout 5.11 A2, Shuksan SW Couloir WI3 5.2,
  Snostril WI4+ M5+, Fantasy Falls WI5, Olympus summit block 5.4. grade_num equals `gradeNumFor()`.
  - Held back: Mount Maude "AI2-3" (no source for the ice grades) and the Accidental Discharge discipline (no source checked).

**Needs the owner:** Mount Carrie and Elephant Head (each mixes two climbs), plus the earlier identity list in
`2026-09-25-round3-findings.md`.

**Not ours, flagged:** `check:field-renders` fails on main because #1940 removed the route-tag row, and `lists` now
reaches no screen. The guard needs a KNOWN entry (or the reader back) from whoever owns #1940.
