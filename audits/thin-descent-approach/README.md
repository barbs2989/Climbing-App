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

**Ice tier, what's left:** contexts for WY, CA, NB and the small states and provinces (qc, ns, nl, id, yt, nc, nm, on, me, nv, vt, pa, nu, nt, mi).
Their SQL timed out while the database was degraded. Build them with `CHUNK=40 node scripts/oneoff/thin-da-context-sql.mjs audits/thin-descent-approach/oos/ctx-ice-<st> <st>_ ice,mixed`.

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
