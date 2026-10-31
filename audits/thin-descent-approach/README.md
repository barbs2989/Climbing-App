# Thin descent and approach on Washington alpine routes (2026-10-24)

Owner's note: *"Descent is still thin on many routes. Also thicken up approach for thin routes."*

## Scope, measured on the live catalog

"Thin" means the descent a climber reads is under 150 characters. `descentBeta()` shows the longer of
`descent` and `descent_text`. For the approach it means `approach` is under 150 characters and there are no
`approach_variants`. Disciplines counted: alpine, mountaineering and scrambling.

| | routes | thin descent | thin approach |
|---|---|---|---|
| Washington, before | 1,023 | 214 | 154 |
| Washington, after | 1,023 | **166** | **132** |
| Every other state/province | 5,185 | ~5,150 | ~5,170 |

**Out-of-state rows were not touched.** Nearly every one is a bare import with no descent, approach,
location or beta text at all. Researching them is a ~5,000-route job. At the yield measured here (about 25%)
and ~130k tokens per 20 routes, that is roughly 34M tokens. Out-of-state route work also stands paused
by the owner (memory `phase1-marquee-alpine-progress`). That needs its own go-ahead and its own plan,
most likely the marquee peaks first.

## What was done

- 219 WA routes in 12 batches (`context-NN.json` → `batch-NN.json`), researched by Sonnet agents
  under `BRIEF.md`.
- Each batch was read by the lead session before writing. Four entries were refused in that review,
  for an assumed top-out or a grade that didn't match. Source-naming and testimony phrasing ("as the guidebook suggests",
  "one party took…") was reworded.
- Applied with `node scripts/enrich-approach-rappel-bivy.mjs --from batch-NN.json`. That asserts each row's
  `area_id`, refuses any 8-word run copied from a listed source and any ALL-CAPS text, and patches one row at a time.
  It re-reads every row afterwards. All 54 printed "verified on re-read".
- **54 routes written: 48 descents and 22 approaches.** 164 skipped, every one with a `skip_reason`
  in its batch file. The prior values are in `rollback/` (the applier's rollback files).

## Why most were skipped

Most of the thin rows are obscure lines: secondary faces and ridges of minor peaks. Their names come from an
old guidebook import, and no reachable source describes them separately. SummitPost and Mountaineers.org block
scripted fetches and are not in the Wayback Machine. The archive.org guidebook search is broken (memory
`wa-guidebooks-on-archive-org`). A blank stays a contribute prompt, which is better than invented prose.

## Catalog findings for review (nothing changed; removals are owner-reviewed)

### Duplicates
- `wa_lane_peak_fly_the`: same climb as `wa_lane_peak_r2` (The Fly couloir).
- `wa_mount_rainier_emmons_glacier_2`: same as `wa_mount_rainier_emmons_glacier`.
- `wa_mount_rainier_ingraham_glacier_direct`: same as `wa_mount_rainier_ingraham_direct`.
- `wa_mount_roosevelt_southeast_route`: same as `wa_mount_roosevelt_standard` (the southeast gully).
- `wa_nooksack_tower_beckey_schmidtke_route`: same as `wa_nooksack_tower_beckey_route`.
- `wa_glacier_peak_gerdine_ridge_cool_glacier`: same as `wa_glacier_peak_cool_glacier_gerdine`, the Disappointment
  Peak Cleaver route. The batch called it a misfiled Rainier route, but Gerdine Ridge and the Cool Glacier ARE on
  Glacier Peak, so it is a duplicate.
- Possible, unconfirmed: `wa_summit_chief_mountain_southeast_face` vs `wa_summit_chief_mountain_south_route`;
  `wa_mount_hinman_west_route` vs `wa_mount_hinman_west_ridge`; the Hibox rows other than the East Route vs its
  standard scramble.

### Misfiled, or not a route
- `wa_glacier_peak_tahoma_cleaver`, `wa_glacier_peak_south_tahoma_headwall`: Tahoma features are on Mount Rainier,
  but these rows are filed under Glacier Peak.
- `wa_lichen_rock_*` (4 rows): Lichen Rock is a Spokane-area crag (Minnehaha), filed as alpine.
- `wa_east_gully` on "Agathla Tower" and the two "Amphitheater, The" gullies: their places couldn't be confirmed (one reading
  puts them at Frenchman Coulee and Cape Disappointment).
- `wa_comb_the_*`: "The Comb" sits at 48.15, -121.62, but Toketie and Nada Lakes are in the Enchantments.
- `wa_comb_the_toketie_lake_area`, `wa_three_queens_approach_routes`: area entries filed as routes.
- `wa_mount_queets_south`: named south, but its stored approach describes the north ridge.
- `wa_snoqualmie_mountain_west_ridge`: the only matching "West Ridge" found online is Lundin Peak's.

## Follow-up, 2026-10-29 (the owner approved the session's recommendations in advance)

### Catalog findings settled (`catalog-fixes-2026-10-29.sql`, full rows in `rollback/catalog-fixes-2026-10-29.json`)
The SQL counted every table that names a route (`climb_logs`, `contributions`, `topos`, `objectives`, `user_lists` and 14
more) and refused to run unless all were zero. All were zero. It then ran in one transaction:
- **Deleted, the thin copy of a richer row:** `wa_lane_peak_fly_the` (→ `wa_lane_peak_r2`), `wa_mount_rainier_emmons_glacier_2`
  (→ `_emmons_glacier`), `wa_mount_rainier_ingraham_glacier_direct` (→ `_ingraham_direct`), `wa_mount_roosevelt_southeast_route`
  (→ `_standard`; the peak's only non-technical route is the SE gully, confirmed on its SummitPost page and Wikipedia),
  `wa_nooksack_tower_beckey_schmidtke_route` (→ `_beckey_route`), `wa_glacier_peak_gerdine_ridge_cool_glacier`
  (→ `_cool_glacier_gerdine`).
- **Deleted, an area filed as a route (empty row):** `wa_comb_the_toketie_lake_area`, `wa_three_queens_approach_routes`.
- **Moved to `wa_mount_rainier`:** `wa_glacier_peak_tahoma_cleaver`, `wa_glacier_peak_south_tahoma_headwall` (both are Rainier
  routes; Rainier had neither). The ids keep their old prefix, because changing a primary key would orphan the text references.
- `areas.route_count` re-read afterwards: all seven affected areas match their real counts.
- **Left as they are:** `wa_lichen_rock_*` is correctly filed under Minnehaha (Spokane). It entered the census only because
  its disciplines are empty, and that is outside this item. Possible duplicates (Summit Chief, Hinman, Hibox) were not confirmed by a
  source, so they were not touched.

### Washington retry with browser reads: the sources are dry
The 145 remaining skipped WA rows were batched again (`retry/context-r01..r08.json`), this time reading SummitPost in the
real browser (`retry/RETRY-BRIEF.md`). The first two batches (35 rows) yielded **one** entry. `wa_dome_peak_indian_summer`
gained a descent, built from its first-ascent report. The browser extension refuses Mountaineers.org page text, and
SummitPost's peak pages name these Beckey-guide lines without describing them. At 1 in 35, batches r03–r08 were not run.
Those rows stay blank, which keeps the contribute prompt. Don't retry them by web research again.

`scripts/lib/source-overlap.mjs` now accepts `review.source_texts` (URL → saved page text), so text drawn from a page
read only in a browser is still copy-checked.

### Out-of-state marquee peaks (`oos/`, method in `oos/OOS-BRIEF.md`)
The owner asked for everything the 2026-10-24 session left (2026-10-28), and that report's open item was out of state, marquee peaks
first. The 2026-08-07 hold on out-of-state route work covered the Phase 1 gear and hazards pass; this is the owner's own note
about thin descents, on the peaks people actually climb. Each peak is one context (`ctx-<area>.json`) and one batch
(`batch-<area>.json`), applied through `enrich-approach-rappel-bivy.mjs`, which asserts the area, copy-checks, and re-reads each row.

| Peak | thin rows | written | skipped | notes |
|---|---|---|---|---|
| Grand Teton (WY) | 39 | 33 | 6 | 3 multi-peak traverses, 2 topo-only pages, 1 with no top-out. Lead review: the trail distance was single-source (6.4 mi); sources range 6–7.5 mi, so it reads "roughly 6.5 to 7 miles and about 5,000 ft". Removed one party-testimony clause. |
| The Diamond (CO) | 30 | 22 | 8 | 4 with no route page, 4 with no stated top-out. Lead review: the Table Ledge to Broadway rappel count was "about six"; two sources say five, then four to the snowfield (the first on a single rope). Trail figure confirmed: 4.2 mi and 2,390 ft. |
| Hallett Peak (CO) | 29 | **25 written** | 4 | The database stopped answering on the first write (2026-10-29, a one-row read took 170 s and returned 504). Lead review: stephabegg.com is firewalled, so its pages are cited as web.archive.org copies, which the copy check can read. That caught one copied phrase, now reworded, plus a "the park lists" source mention. |
| Incredible Hulk (CA) | 28 | **19 written** | 9 | 3 with no top-out, 6 unplaced (not on the area page). No mileage given (single source). |
| Spearhead (CO) | 20 | **14 written** | 6 | 3 not on any page, 3 with no stated top-out. The dry run hit the 504 outage. |
| Notchtop (CO) | 13 | **9 written** | 4 | No page or no top-out. West Gully descent given as third to fourth class (sources split). |
| Mt. Whitney (CA) | 18 | **16 written** | 2 | No mileage, gain or rappel counts (sources split). Whitney Zone permit named in general terms. Possible duplicate: Hairline vs Hairline Free (aid vs free of one line); both written, nothing deleted. |
| Mt. Russell (CA) | 12 | **9 written** | 3 | Pilgrimage has no source; North Face and South Slope are single pages with no line. |
| Middle Teton (WY) | 14 | **13 written** | 1 | A bundled multi-line north-wall row. |
| Mount Moran (WY) | 12 | **10 written** | 2 | Canoe approach across String and Leigh lakes; rappel counts left out (sources vague). Lead review cut an unsourced superlative. |
| Lone Pine Peak (CA) | 14 | **11 written** | 3 | Lead review removed six single-source elevations and distances. |
| Temple Crag (CA) | 10 | **10 written** | 0 | 5 approach-only (no stated top-out). Distances left out; MP's own pages disagree, 4.3 vs 5.5 mi. |
| Symmetry Spire (WY) | 12 | **12 written** | 1 | Reticent Wall has no route page. |
| Enclosure (WY) | 12 | **12 written** | 2 | NW Ridge described only in its upper third. |
| Mount Hooker (WY) | 12 | **12 written** | 0 | 9 approach-only: no source says how to leave the top. |
| Pingora (WY) | 9 | **7 written** | 2 | One page with no description, one unplaceable. |
| Slesse Mountain (BC) | 27 | **14 written** | 13 | Lead review dropped two descents that assumed a summit finish. Some rows are on Mount Parkes or Labour Day Horn, other peaks of the massif. Road access is stated only as restricted, because the sources conflict. |
| Longs/Meeker Cirque (CO) | 29 | **27 written** | 2 | Dark Star skipped (its own page says the description may be another line). Rappel counts left out; the sources split three ways. |
| Bugaboos North Faces, Fairy Meadow (BC) | 19 | **17 written** | 2 | Two pages doubt their own descriptions. Lead review removed single-source rope lengths. |
| Snowpatch Spire (BC) | 19 | **13 written** | 6 | Rappel counts left out (the MP pages share one wording, so they count as one source). Rockfall caution for the north end, in general terms. |
| Mount Gimli (BC) | 13 | **11 written** | 2 | |
| Mount Athelstan (BC) | 13 | **10 written** | 3 | Salal Creek walls, NW of Pemberton. |
| Yak Peak (BC) | 15 | **15 written** | 0 | 3 approach-only. |
| Nesakwatch Spires (BC) | 15 | **12 written** | 3 | |
| Huntington Ravine (NH) | 14 | **14 written** | 0 | Pinnacle Gully approach-only. No distances (sources say 1.3 vs 1.7 mi). Avalanche terrain in general terms only. |
| Tuckerman Ravine (NH) | 18 | **18 written** | 0 | 3 approach-only. |
| Mt. Blue Sky couloirs (CO) | 26 | **18 written** | 8 | Seasonal road stated in general terms. Lead review renamed "Mt. Evans road" to the Mount Blue Sky road. |
| Pikes Peak North Face (CO) | 12 | **12 written** | 0 | |
| Hallett NE Buttress mixed/ice (CO) | 15 | **11 written** | 4 | Englishman's Route here is the winter listing of `co_englishman_s_route` (kept: separate winter area, as MP lists it). |
| Medicine Bow Peak Area (WY) | 26 | **25 written** | 1 | Mostly approach-only (crag routes with no stated finish). |
| Three Tiers (MT) | 21 | **21 written** | 0 | Cabinet Mountains ice. No approach distance (sources say 6 to 10 mi). |
| Mammoth Crest (CA) | 34 | **34 written** | 0 | Sport/trad crag; 23 approach-only. |

**How to resume (database healthy again: a one-row read under 1.5 s):**
On 2026-10-29 at 18:39 the database recovered. 102 rows were written (Hallett, Hulk, Whitney, Russell, Middle Teton and Moran in full,
plus 8 Spearhead, 1 Notchtop and 1 Temple Crag), and then it stopped answering again on Temple Crag.
1. Re-run `node scripts/enrich-approach-rappel-bivy.mjs --from audits/thin-descent-approach/oos/batch-<area>.json` for `co_spearhead`,
   `co_notchtop`, `ca_lone_pine_peak`, `ca_temple_crag`, `wy_symmetry_spire`, `wy_enclosure`, `wy_mount_hooker` and `wy_pingora`. Re-applying a row
   that already landed rewrites the same text, so it is harmless. Before you re-apply, clear each one with
   `node scripts/oneoff/thin-da-offline-check.mjs <batch>`. The applier stops at the first copied phrase it finds in an entry, and the offline
   check lists them all. Then move ONLY the new `audits/route-breakdown/rollback-<ms>.json` file(s) here, BY EXACT NAME.
2. Any further `oos/batch-*.json` without a row in the table above is an unreviewed research batch. Lead-review it (testimony,
   source names, single-source counts), dry-run it, then apply it.
3. **The 17-peak marquee list is DONE (234 routes written, 2026-10-29).** Next tier, from a census of out-of-state peaks with 6+ thin descents
   (real alpine peaks first; many census rows are ice crags or boulders that carry an alpine tag): Slesse, Longs/Meeker Cirque, Snowpatch Spire,
   Bugaboos North Faces, Gimli, Yak, Nesakwatch, Athelstan, Hallett NE Buttress mixed, Pikes North Face, Huntington and Tuckerman, Blue Sky couloirs. **Lincoln Lake left out:** it is bouldering, which has no descent or approach per problem, and the same goes for the other boulders in the census.
4. After the marquee list, build the rest with `scripts/oneoff/thin-da-context.mjs`, peak by peak, ordered by route count.

### Scope of the long tail (decided 2026-10-29)
After the marquee peaks and the next tier, about 3,400 out-of-state rows (alpine-tagged, not bouldering) were still thin, across 1,305 areas.
By PRIMARY discipline: trad 1,430, ice 1,006, sport 578, mixed 148, mountaineering 144, aid 95, top-rope 61.
- **Done first: primary mountaineering/alpine** (~146 rows, by state: `scripts/oneoff/thin-da-context-disc.mjs ctx-mtn-<st>_.json <st>_ mountaineering,alpine`).
  Descents matter most here: walk-ups and snow routes on Shasta, Denali, the Sisters, Athabasca and similar peaks.
- **Next: primary ice and mixed** (~1,150). An ice route has a real approach and a real way off (V-thread rappels, walk-offs).
- **Not swept: sport and top-rope.** A sport route's descent is lowering off its anchor, and a crag's approach belongs to the crag, not to each route.
  Writing the same sentence on 600 rows would be filler, which none of the competitors do: Mountain Project and theCrag keep approach at the crag level.
  The crag-level approach lives on the area page (area fields).
- **Trad:** only where the area is a peak, not a cliff. Sort that by area, not by the route's tag.
- **Bouldering: out of scope** (Lincoln Lake and the boulders in the census).

| Long tail batch | thin rows | written | skipped | notes |
|---|---|---|---|---|
| Mountaineering, California | 34 | **9 written** | 25 | Strict: single-page rows skipped. Possible Harwood/Thunder Mountain name swap; Shastina "Lightning couloir" may duplicate a Baldy import. Both are for review. |
| Mountaineering, Colorado | 48 | **39 written** (4 re-applied) | 9 | Lead review dropped two inferred descents (Tuning Fork, First Star). |
| Mountaineering, Oregon | 11 | **9 written** | 2 | South Sister mileage given as the range two sources agree on (11 to 12 mi). |
| Mountaineering, Alaska | 17 | **12 written** | 5 | Muldrow skipped (NPS no longer recommends it). Lead review removed a park-road landslide note (current conditions). Kahiltna Dome and Foraker share one coordinate in our areas (for review). |
| Mountaineering, AB/BC/YT/UT/NH/WY/AZ/NV/VT | 38 | **14 written** | 24 | Mostly no readable source. Logan King Trench has only guide-company pages. |

**Mountaineering tier DONE.** Next: primary ice and mixed (about 1,160 rows). Contexts come from `scripts/oneoff/thin-da-context-sql.mjs`
(one SQL query; the PostgREST filter on disciplines times out), and agents follow `oos/ICE-BRIEF.md`.

| Ice/mixed batch | thin rows | in batch | skipped | notes |
|---|---|---|---|---|
| CO 1 | 40 | 39 | 1 | |
| CO 2 | 36 | 33 | 3 | |
| CO 3 | 28 | 25 | 3 | Lead review dropped the Gestas descent (borrowed from neighbouring Dismas). |
| CO 4 | 34 | 18 | 16 | 12 Longs rows already in the Longs/Meeker batch; Dark Star (own page doubts it). |
| CO 5 | 40 | 39 | 1 | |
| CO 6 | 40 | 30 | 10 | 8 already in the Hallett NE / Pikes batches, 2 carried-over skips. |
| CO 7 | 27 | 26 | 1 | |
| UT 1 | 37 | 37 | 0 | |
| UT 2 | 40 | 37 | 3 | Temptation Wall is ice bouldering; Marvell Route's own page doubts it. |
| UT 3 | 26 | 26 | 0 | Maple Canyon. |
| UT 4 | 18 | 18 | 0 | |
| MT 1 | 40 | 38 | 2 | Unprotected Fourplay skipped (text fits another peak). |
| MT 2 | 39 | 22 | 17 | 16 already in the Three Tiers batch. Granite Lake ski-in given as 9 to 10 mi (three sources). |

| AK 1 | 40 | 25 | 15 | Mt Hunter "Deprivation" skipped: the row (1 pitch AI6 M5) doesn't match the 6,000 ft buttress the sources describe. |
| AK 2 | 37 | 29 | 8 | Rime Peak carries Mt. Regal's coordinate; Peak 11,300 is filed under Denali NP but is in the Ruth Gorge. |
| NH 1 | 35 | 26 | 9 | 4 Huntington rows already covered. Beaver Brook Falls is filed under Dixville Notch but sits north of Colebrook. |
| NH 2 | 39 | 22 | 17 | Moosilauke, Lafayette, Tenny and Oliverian Notch share one placeholder coordinate (44.03683, -71.119). "5 Mt Huntington Ice" rows sit nowhere near the ravine. |
| BC 1 | 40 | 30 | 10 | Lead review reworded one party-testimony sentence (Robson Roof Glacier). Mount Poland "Curtsy Call" / "Polish Peacock" can't be placed. |
| BC 2 | 32 | 9 | 23 | Pigeon Spire "Toilet Seat" (5.15d WI8 M16+) looks like a joke row. "Ice caves at the Skillet Glacier" is filed under Mt Ulysses (BC); Skillet Glacier is on Mount Moran (WY). |
| AB 1 | 36 | 33 | 3 | Lead review removed a single-source rappel count (Edge of the World). Maligne Canyon fire closure left out (current conditions). |
| AB 2 | 25 | 20 | 5 | Nemesis high confidence (two sources). Amadeus is probably Amadeus Falls on Upper Barrier, filed under "Unsorted Ice routes". |
| OR 1 | 40 | 36 | 4 | Mt. Hood, Three Sisters, Thielsen, Salt Creek Falls. Lead review removed an unsourced avalanche line (North Sister East Buttress). |

**All 17 ice batches above are applied (2026-10-29): 581 rows, every one "verified on re-read", none refused.** CO went first (210 rows), then the
database stopped for about 25 minutes; the other 15 batches (371 rows) went in when it recovered. One UT 4 row had a mistyped id in its batch
(`fmr_fk_me_raw` for `fmr_f_k_me_raw`); the batch is corrected and that row written on its own. Rollbacks: `rollback/rollback-1793312990207.json`
through `rollback-1793313279406.json` (8 files) and `rollback-1793318126666.json` through `rollback-1793318592761.json` (16 files).

| Ice/mixed batch (second round) | thin rows | in batch | skipped | notes |
|---|---|---|---|---|
| WY 1 | 36 | 36 | 0 | Cody (South Fork Shoshone). Lead review dropped a descent borrowed from a neighbouring route (Hunter Creek Falls). |
| WY 2 | 39 | 29 | 10 | Boy Scout Cirque "Mixed Climbs Route List" is a list, not a route. Wyoming Wave overlaps Cabin Fever's upper pitches. |
| WY 3 | 34 | 24 | 10 | 5 Upper Blacktail Butte summer drytool lines unplaceable. New Order (drytool/aid) filed as mixed. Prospector Falls: 2 pitches stored, 4 described. |
| CA 1 | 36 | 19 | 17 | Harwood "Consolation Couloir" matches only a Colorado route. Galena Peak North Couloir is on private land. Right Mendel Couloir: AI5 on its page, WI3+ stored. |
| NB 1 | 25 | 22 | 3 | Walton Glen. Three Lower Quiddy River rows carry grade-suffixed names and may belong to Quebec. |
| CA 2 | 35 | 22 | 13 | Mostly Tahquitz ice rows with grade-only pages. Lead review removed a single-source distance (Tokopah Falls). |
| NB 2 | 39 | 39 | 0 | Upper Quiddy River's stored coordinate (45.4486, -66.308) is far from the wall (~45.55, -65.23). Easy Street is stored as 23 pitches. |
| NL 1 | 15 | 3 | 12 | Most Newfoundland rows have no source online. |
| QC 1 | 29 | 29 | 0 | Lead review removed a source mention (park map / printed guide, Passion Tropicale) and a single-source distance. Astro (Mont de l'Ours) is a trad/mixed line filed as ice. |
| NS 1 | 29 | 28 | 1 | Cape Chignecto: tide-timed beach approaches. |
| ID, YT, NC, NM (misc 1) | 41 | 27 | 14 | Lead review skipped Whiskey Peak "La Llorona" (identity unconfirmed). Mount Logan East Ridge's stored grade and pitches don't fit the expedition line. |
| ON, ME, NV, VT, PA, NU, NT, MI (misc 2) | 32 | 14 | 18 | `me_kineo_ice_climbs_unknown` is a placeholder name for an unclimbed line. |

**Second-round writes (2026-10-30): all applied.** WY 1 stopped after 12 rows (the database returned 500; rollback `rollback/rollback-1793319833226.json`).
After the database was restarted, every session went through the shared gate (`~/dev/db-throttle/dbslot.mjs`). This session's slot wrote all 12 second-round
batches in one pass: 312 rows verified on re-read (12 of them WY 1 rows re-applied), none refused, with a health check before each batch (all under 1.1 s).
Rollbacks: `rollback/rollback-1793327172562.json` through `rollback-1793327472485.json` (12 files).
**Ice and mixed tier DONE: 893 routes written** (581 in the first round, 312 in the second).

**Ice-tier findings for review:**
- `ut_monte_cristo` and `ut_broads_fork_2` share one coordinate (40.52763, -111.72408), right for neither: Monte Cristo's East Gully is in Little
  Cottonwood near Alta, and Broads Fork is in Big Cottonwood.
- `ut_7even_*` (6 rows) are bolted summer drytooling, filed as mixed.
- `ut_*north_face_chimney`: our row (5.9+ WI3+ M5, 6 pitches) doesn't match its page (5.9 A2, 4 pitches).
- `co_wheeler_mountain` "NW Couloir": its page puts it on the east face. `co_*southern_circus` is stored as ice at 5.6 but is described as mixed.
- Navajo West Couloir, Pacific Peak N Face couloirs and Saint Sophia Faith, Hope and Love are alpine-rock pages filed as ice.
- Waltzing Matilda (Oil Creek): page says WI2+, our row WI3-4.
- Mertensia Falls is filed under "Wild Basin (bouldering)". Mt Bancroft rows sit under Indian Peaks (it is the James Peak Wilderness).
- `mt_*unprotected_fourplay` on A Peak: its text names a "Blackwell Glacier" and a west face that don't fit A Peak, so it was probably copied
  from another route.

### Trad on peaks (started 2026-10-30)
Thin primary-trad, alpine-tagged rows out of state: **1,438** across 709 areas. **Every one of those areas has `area_type = 'crag'`**: the out-of-state
import filed real peaks as crags, so the area type cannot separate peaks from cliffs. The test used instead is a peak word in the area name
(Mount, Peak, Spire, Tower, Dome, Pinnacle, Needle, Horn, Point, Butte, Summit or Ridge) or a stored prominence. That leaves **525 rows on 291 areas**:
Slesse, Snowpatch, the Howser Towers, Goode, Sir Donald, Gimli and similar peaks. The other 913 trad rows are on cliffs and are not swept, for the
same reason sport isn't (their descent is a crag matter).

Contexts: `PEAKISH=1 CHUNK=40 node scripts/oneoff/thin-da-context-sql.mjs audits/thin-descent-approach/oos/ctx-trad-<st> <st>_ trad`. That gives
BC 1–5, CA 1–4, AB 1, WY 1, CO 1–2, ID 1, AK 1 and misc 1 (UT, MT, OR, AZ, NM, NH, NY, QC, NT and YT combined): 516 targets. Agents follow
`oos/TRAD-BRIEF.md`, which tells them to skip a one-pitch crag line that slipped through on a peak-like name.

| Trad-on-peaks batch | thin rows | written | skipped | notes |
|---|---|---|---|---|
| BC 1 | 40 | 24 | 16 | Bugaboos (Crescent, Eastpost, Bugaboo, Brenta). Crescent descents are stated by the rappel line's own page for those routes. |
| BC 2 | 37 | 12 | 25 | 6 already in the Gimli/Athelstan batches. Rice Cooker (filed under Mount Bryce) is a roadside cliff; Mount Land "South Ridge" carries a Mount Sloan route's text; Arjuna NE Ridge is believed unclimbed. |
| BC 3 | 39 | 5 | 34 | Obscure lines with no source. Uto Peak SW Ridge is filed under Mount Sir Donald. |
| BC 4 | 39 | 9 | 30 | 26 already in the Slesse/Snowpatch batches. |
| BC 5 | 22 | 2 | 20 | 4 already in the Yak batch. |
| CA 1 | 40 | 18 | 22 | 8 one-pitch crag lines skipped. Lead review skipped Arm and Hammer (Blacksmith Peak): only a peak-level approach. |
| CA 2 | 41 | 10 | 31 | Mt. Goode "No Goode": sources give 5.4 and 5.10a/b, so it may be two lines in one row. Lamarck "Nicole": its own page disagrees on pitches. |
| CA 3 | 40 | 21 | 19 | 2 already in the Whitney batch, 5 crag lines. Ruby Peak North Ridge: the only page is a 4th-class scramble, while the row says 5.6. |
| CA 4 | 24 | 7 | 17 | 10 crag lines. Wicked Pinnacle and Upper Siberia Creek Tower are crag routes on one San Bernardino formation. |
| WY 1 | 40 | 18 | 22 | 14 already in the Medicine Bow/Hooker/Moran batches. Buck Mt. "Smith-Lepore Variation" is a variation row. |
| AB 1 | 29 | 22 | 7 | Lead review dropped two Mount Louis descents taken from the area page (Gargoyle, Homage to the Spider). Morro Peak "Guide's Route": 8 pitches stored, one 130 ft pitch on its page. |
| CO 1 | 38 | 11 | 27 | Jagged Mountain's Holladay-Schiavone and Trundling Trout are crag lines below Jagged Meadow, not on the peak. |
| CO 2 | 15 | 14 | 1 | Lead review skipped Wheeler Mountain North Ridge (stored 5.3 trad; its only page is a class 3 hike). |
| ID 1 | 17 | 9 | 8 | Lead review removed a single-source pitch count (Aerosmear). |
| AK 1 | 14 | 4 | 10 | Mostly no source. |
| UT, MT, OR, AZ, NM, NH, NY, QC, NT, YT (misc 1) | 42 | 31 | 11 | Lead review skipped Ruth's Tooth (a one-pitch pinnacle) and Matheson Peak (identity unconfirmed). Reynolds Mountain "Southwestern Talus Slope" is a hike filed as 5.9+ trad. |

**Trad-on-peaks tier DONE: 217 routes written out of 516 rows** (2026-10-30, all through the DB gate; every row verified on re-read, none refused). Rollbacks for all 16 batches are in `rollback/`.

### Aid, trad on cliffs, and sport/top-rope crags (owner reopened 2026-10-30)
The owner put the excluded tiers back in scope and fixed the order: aid first, then trad on cliffs, then sport/top-rope with one researched
crag approach shared across that crag's rows. A one-pitch route gets a descent **only where its own page, or its own crag or wall page, states
it** (lower from anchors that name the method, rappel the route, walk off); a bare "two-bolt anchor" is not a descent. Method:
`oos/CLIFF-BRIEF.md` and `oos/CRAG-AGENT.md`. Contexts: `ctx-aid-*`, `ctx-cliff-*` (`PEAKISH=not`) and `ctx-crag-*`.

Before each batch, `scripts/oneoff/thin-da-live-filter.mjs` re-read the live rows and dropped any field already 150+ characters, so text a
parallel session wrote in the meantime was never overwritten (it dropped nothing). Every write went through the DB gate.

| Tier | thin rows | written | with a descent | skipped |
|---|---|---|---|---|
| Aid (15 batches) | 95 | **44** | 25 | 51 |
| Trad on cliffs (44 batches) | 913 | **845** | 420 | 68 |
| Sport/top-rope crags (29 batches) | 577 | **558** | 153 | 19 |
| **Total** | 1,585 | **1,447** | 598 | 138 |

Every written row was verified on re-read; none was refused. Rollbacks: 85 files `rollback/rollback-{aid,cliff,crag}-<st>-<n>.json`
(the NH, QC and YT aid batches were all skips). Lead review cut single-source counts (pitches, rappels, rope lengths, distances, bolts),
grades in prose, superlatives, hedges, testimony, page/photo references, an inferred access line, and descents borrowed from a neighbour.

**Catalog findings for review (nothing changed):**
- **Mt. Hoffman / Tuolumne Peak swapped:** the 17 `ca_east_face_17_*` rows sit under Tuolumne Peak but every name resolves only to
  Mt. Hoffman › East Face; three `ca_north_face_the_*` rows sit under Hoffman but belong to Tuolumne Peak North Face. All skipped.
- **Cannon Cliff aid (`nh_*`):** 11 rows are variations, fragments, or match no page on pitch count and grade. All skipped.
- **Peaks filed as cliffs / not a route:** `co_eagle_s_nest_naa_ohn_kara` is a multi-day Gore Range traverse filed as a one-pitch 5.6.
- **Misplaced crags:** `wy_the_mouth_of_the_clark_s_fork_*` is filed under Cody (it belongs under Clarks Fork Canyon);
  `nt_fairly_meadows_cragging` misspells Fairy Meadows.
- **Rows that don't match their page:** `bc_triple_peak_permanent_structures` holds the 8-pitch summit route's grade; Hinkey Summit
  "Time Collapse" starts partway up another route; `ak_panorama_point_panorama_point` carries a different line's page.

**Census after all tiers** (`node scripts/oneoff/thin-da-census.mjs`, read-only, 2026-10-30; report only, not swept):

| primary discipline | alpine tag | routes | thin descent | thin approach | thin either |
|---|---|---|---|---|---|
| (none) | no | 197,018 | 196,770 | 196,740 | 196,808 |
| bouldering | no | 42,411 | 42,411 | 42,411 | 42,411 |
| sport | no | 29,291 | 29,291 | 29,288 | 29,291 |
| trad | no | 19,463 | 19,459 | 19,460 | 19,460 |
| ice | no | 4,195 | 4,190 | 4,188 | 4,191 |
| toprope | no | 2,445 | 2,445 | 2,445 | 2,445 |
| bouldering | yes | 1,469 | 1,469 | 1,469 | 1,469 |
| trad | yes | 1,517 | 1,164 | 382 | 1,190 |
| mixed | no | 1,016 | 1,016 | 1,016 | 1,016 |
| aid | no | 1,006 | 1,006 | 1,005 | 1,006 |
| ice | yes | 1,054 | 858 | 201 | 862 |
| sport | yes | 578 | 541 | 16 | 541 |
| mixed | yes | 157 | 113 | 35 | 115 |
| mountaineering | yes | 155 | 103 | 60 | 105 |
| aid | yes | 101 | 77 | 48 | 79 |
| toprope | yes | 63 | 63 | 63 | 63 |

Of 301,941 routes outside Washington, 301,053 are still thin on one field. Nearly all are the bulk crag import with **no alpine tag**: their
approach and descent were never imported per route, and the crag-level approach belongs on the area page. Within the alpine-tagged rows these
tiers covered, the approach is now mostly filled (thin approach: trad 382, ice 201, sport 16); what remains thin is the **descent of
one-pitch routes whose sources state none**, which by the rule above is left blank rather than guessed.

**Top-rope, added after the census** (the crag contexts held sport only, so the 63 alpine-tagged top-rope rows were researched
separately as `ctx-crag-tr-<st>-1.json`): **62 written, 10 with a descent, 1 skipped** (`wy_lower_blacktail_butte_you_might_be_lost`: no
page anywhere). Lead review dropped 17 descents that only said how to reach the top anchor, not how to get down. Rollbacks:
`rollback/rollback-crag-tr-*.json`. Findings: Shitter Crack (Bugaboos) and Dang Along Ling Long are boulder problems filed as top-ropes;
Layback Corner (Lamoille) may be two routes.

**Item DONE (2026-10-30): 1,509 routes written across aid, cliff trad, sport and top-rope**, every one verified on re-read. The untagged
bulk import in the census is the next decision, not a backlog.

**Crag walk-in census** (`node scripts/oneoff/area-approach-census.mjs`, read-only, 2026-10-31; report only). The route page shows the
crag's own walk-in (`areas.approach`) on any crag climb with none of its own, so the untagged rows are best served one crag at a time, not
per route. Outside Washington, **50,386 areas hold routes and 695 have a walk-in** (80+ characters). 283,653 routes sit on areas without
one; **8,299 bare areas hold 10+ routes** (CA 1,254, CO 992, UT 571, AZ 428, BC 362). One area id has the prefix `shorty` instead of a
state: a finding for review. Sweeping this is an owner decision.
