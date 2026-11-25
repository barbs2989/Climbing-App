# Crag rows filed alpine: audit (2026-11-18, draft only, nothing applied)

## Scope
- Rows stored discipline = 'alpine' with a grade starting "5.", no alpine_grade, no Summit waypoint and no gain_ft, from the wave-2 queue (chunks 62..190, load.js): **3,857 rows** (the brief's ~3,862).
- rows.json (snapshot of 2026-11-14) holds **4,754** rows matching the same filter. The other 897 (ak 468, bc 82, ca 125, co 100, wa 96, ab 16, others) were queued in wave 1 / research and are **not judged here**.
- merged/facts.json covers **none** of the 3,857 (0 ids), and neither do the wave-1/2 research outputs. Research never reached the back of the queue. The only outside evidence is the Mountain Project area research in research/*.txt: 47 area records from the earlier agent, plus 11 added on 2026-11-18 in extra-2026-11-18.txt.

## Rule applied
This is the owner's rule from 2026-11-11 (RULE.md): "crag for trad is just a short approach".

**to_trad / to_sport / to_tr** needs every one of these:
1. An MP area page (or its parent) puts the crag at **<= 45 min on foot** from the car, with a return to the base.
2. The route is named on that page's route list. The match is exact or a *unique* prefix, and Unknown / Unnamed / project names are never matched.
3. MP gives the route a Sport, Trad or TR type. Trad wins over Sport (TS -> trad with sport also listed), and Sport wins over TR.
4. The row's own text carries no strong alpine signal: glacier, snow, crampons, bivy, multi-hour or multi-mile walk, pass, backcountry, or a summit that is not a formation top.
5. The row was not moved to alpine by 0413/0418, and its area holds no route that 0413/0418 moved to alpine. If 0413/0418 conflicts with crag research, the row goes to **unsure**.

MP's own "Alpine" tag on these crags is an area-level label, so it was ignored. It is the reason these rows were imported as alpine.

**stay_alpine** covers four cases:
- the row is protected by 0413/0418 (219 rows);
- its area was decided alpine there (265);
- area research found it alpine: Ibantik Lake, Hayden Peak and Twin Bridges (50);
- the row text carries a strong alpine signal (492).

**unsure** means no source settled it. These rows stay alpine.

## Buckets by state
| state | to_trad | to_sport | to_tr | stay_alpine | unsure | total |
|---|---|---|---|---|---|---|
| bc | 0 | 0 | 0 | 65 | 0 | 65 |
| ca | 116 | 49 | 0 | 330 | 642 | 1137 |
| co | 0 | 0 | 0 | 277 | 387 | 664 |
| id | 0 | 0 | 0 | 16 | 153 | 169 |
| md | 0 | 0 | 0 | 0 | 6 | 6 |
| me | 0 | 0 | 0 | 3 | 13 | 16 |
| mt | 0 | 0 | 0 | 28 | 112 | 140 |
| nh | 0 | 0 | 0 | 5 | 182 | 187 |
| nm | 0 | 0 | 0 | 11 | 101 | 112 |
| nt | 0 | 0 | 0 | 2 | 0 | 2 |
| nu | 0 | 0 | 0 | 3 | 0 | 3 |
| nv | 0 | 0 | 0 | 5 | 48 | 53 |
| ny | 0 | 0 | 0 | 2 | 21 | 23 |
| or | 0 | 0 | 0 | 13 | 30 | 43 |
| pa | 0 | 0 | 0 | 0 | 2 | 2 |
| tx | 0 | 0 | 0 | 0 | 6 | 6 |
| ut | 238 | 183 | 0 | 64 | 136 | 621 |
| vt | 0 | 0 | 0 | 0 | 1 | 1 |
| wy | 8 | 78 | 0 | 199 | 319 | 604 |
| yt | 0 | 0 | 0 | 3 | 0 | 3 |
| **all** | **362** | **310** | **0** | **1026** | **2159** | **3857** |

No route came out as to_tr: every TR-only route also carries Sport or Trad. The 672 moves fall in 46 crags:
- **Utah:** the Jungle/Pangaea plateau crags, Uinta Moosehorn, Bald Mountain, Butterfly Lake, Reids Basin, Green Meadow, Brian Head's Overlook, and Indian Creek's Suburbia.
- **Wyoming:** Blacktail Butte, plus Shoshone Canyon's Tunnel Wall and The Island.
- **California:** Courtright (Spring Dome, Tiger Cage/Wall, Voyager, Power Dome W, Trapper Dome, Penstemon, Punk Rock), Tuolumne's Stately Pleasure Dome, and Mammoth's Horseshoe Piles (Spring, Stream and Wavy Gravy walls).

### Why the 2,159 unsure rows stay unsure
| reason | rows |
|---|---|
| no evidence at all: no approach text, no research for the crag | 1,812 |
| area researched but the approach is ambiguous | 311 |
| row text hints at a crag but no source backs it | 17 |
| crag confirmed but the route is not on MP's list, or is an Unknown/Unnamed line | 15 |
| crag research vs a 0413/0418 alpine move in the same area | 4 |

The 311 ambiguous rows break down as follows:
- **Mt Willard (NH):** roadside, but the slab runs up the mountain's face.
- **Cannon Cliff:** "long talus approach", no time stated.
- **Rumney's Utopia/Wonderland:** about 1 h.
- **Rock Springs Buttress:** a tram, or 1.5-3 h on foot.
- **Power Dome East, Dusy Dome, Punk Rock East:** no time stated.
- **Mt Blue Sky's Black Wall, Tan Buttresses, Lincoln Lake Slabs:** RULE.md names the Black Wall a roadside crag, but the AAC gives 2-3 h, and the road was closed in 2024-25.
- **Bear Creek Wall (ID):** "roughly an hour".

The biggest no-evidence clusters are worth a research pass if more coverage is wanted:
- Lone Peak Cirque, Elephant's Perch, Ship's Prow and The Diamond. These are probably alpine.
- Hole in the Wall (NM), Cottage Domes, Red Pine Crag, Myrtle 2 (ID), Lamoille Sport Wall and Lembert Dome East Wall. These are probably crags.

## Sample check: 40 random to_* calls
- **Errors: 0 of 40 (0%)** against the evidence. The sample was drawn with seed 20261118 and is saved in sample40.json.
  - Each call was checked for: area approach time, the MP type on the matched route, no alpine signal in the row text, and the disciplines list.
  - The previous agent's MP transcriptions were re-fetched live for the Lower Jungle (7 types plus the 35-45 min trail) and Upper Blacktail Butte (4 types plus the 15-30 min approach). All 11 matched.
- **One call tightened.** ca_unknown_5_10c had matched an "Unknown 5.10c" entry. The earlier code's /^unknown/ guard held a literal backspace character, so it never fired. Unknown names now go to unsure, and 4 rows left the move set.
- **Two calls are judgment calls, not errors.** ut_dead_bolt and ut_baby_thor have bolts in the row text, but MP types both as Trad. Following MP, they move to trad.
- **Not tested:** that the 45-min crag times hold for every wall in an area. Only the parent page states a time for Horseshoe Piles' Stream Wall and Wavy Gravy Wall, both "15-20 min".

## Examples
- **to_sport:** wy_spider_pig, Tunnel Wall, Shoshone Canyon. "about 30 seconds from your car". MP type Sport.
- **to_trad:** ut_me_tarzan, Distant Drum, the Jungle. 35-45 min cliff-base trail. MP type Trad.
- **to_trad:** ca_quiet_desperation_2, Stately Pleasure Dome. Multi-pitch, but parking runs along the base and you walk off to the road. A long route is not alpine.
- **stay_alpine:** bc_snowpatch_spire_furry_pink_arete. Protected by 0413 and has a snow descent.
- **unsure:** nh_slabs routes on Cannon Cliff. "long talus approach", no time stated.

## What blocks or constrains the migration
1. **Not applied, and not checked against the live DB.** There are no credentials here, and rows.json dates from 2026-11-14. The draft therefore aborts if any id is missing or has moved to another area. It also skips a row that is no longer alpine (assert-then-set, as 0413/0418 do).
2. **0280/0366 trigger** (routes_mountaineering_with_rock_is_alpine):
   - It only turns mountaineering/scrambling with a 5.x grade into alpine, so setting trad or sport is not reverted.
   - It prepends the primary to disciplines when it is missing. Setting discipline alone would therefore leave a stale "alpine" badge in any non-null list.
   - So the draft writes disciplines explicitly: the new primary first, then the MP types, then other existing tags minus alpine, mountaineering and scrambling.
   - In the snapshot, all 672 lists are null.
3. **0406 (discipline locked):**
   - **Climber edits:** discipline and rockStyle answer HIGH, so climbers cannot change these rows. The migration is the owner's edit, as in 0413.
   - **Hand locks:** the draft also skips any row that has a hand lock (route_field_confidence on discipline/rockStyle) or an approved climber edit of either field. Neither could be checked offline.
   - **Grade lock:** once a row is trad or sport, grade also turns HIGH, because _route_field_level_for locks grade on crag disciplines. Climbers lose grade edits on these 672 rows.
   - **Flags:** any open route_flags on discipline for these rows should be closed after the migration.
4. **Number:** 0451 is the brief's name, and the worktree's migrations stop at 0449. Run npm run check:migration-claims and renumber if it is taken.
5. **Size:** the file is about 84 KB. hand-written-sql.md warns that check:sql flags files large enough to be truncated on paste, so ship it as a migration file, not an SQL Editor paste. Before pushing, run npm run check:sql -- <file> and check:migration-replay. After applying, record the version and run npm run gen:schema.
6. **Coverage:** the 897 matching rows outside the wave-2 queue were not judged.

## Files
- decisions.json holds one record per route: id, area_id, name, grade, state, verdict, new_discipline, new_disciplines, old_disciplines, signals and evidence_urls.
- classify.js and signals.js hold the logic. research/*.txt holds the area evidence.
- gen-sql.js produces 0451_crag_rows_out_of_alpine.DRAFT.sql. classify.prev.js is the earlier version.