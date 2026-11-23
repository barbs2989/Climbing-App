# Trailhead + summit research for peak routes whose map showed neither (2026-11-18)

Owner, 2026-11-18: Golden Horn's Northeast Arête map "looks like a sport or bouldering route" →
"do research on the rest that are still open" → "use more agents" → "i give you permission to use all
sources". The worklist was `audit:map-discipline`: 434 SUMMIT_ONLY peak routes (a summit, no trailhead)
and 53 NO_SUMMIT (pins, none at the summit), 487 routes on 376 peaks in 10 states.

## Applied (already live; every row re-read: 168 of 168 landed)
- **156 trailheads** written to `routes.approach_logistics` (`trailhead`, `trailheadLat`, `trailheadLng`),
  merged into what the row held. The map draws them beside the summit (#3441). By state: CA 63, WA 68,
  CO 28, NY 6, OR 2, NH 1 (summit-pin-only entries are in the same counts).
  - **36 locked** (`agree-2`): two publishers within 50 m (USFS, NPS, OSM, WTA, climb13ers, climber.org…).
  - **120 unconfirmed** (`single-source`): one land-manager or OSM point. A later pass can lock them.
- **12 Summit pins** added to `routes.waypoints` at the USGS GNIS summit point, each within 50 m of the
  stored peak coordinate, and only where the route's own text says it reaches the summit. Ledger level
  `unconfirmed`. Three were dropped by hand because the route tops out on a SUB-summit (Silver Star NE
  Ridge = west summit; Three Queens Middle and West Peaks).
- One ledger evidence row per write in `route_field_evidence` (168).

## The rules every write passed (`verify.mjs`, `build-batch.mjs` in the job; outputs here)
1. Trailhead identified from the route's own text, a page about the route, or a page about that side of
   the peak (`identifiedBy` in each output). Never from a sibling route alone, never a search summary.
2. Placed by a land-manager point (USFS EDW recreation sites, NPS POIs, a state agency) or an OSM
   trailhead/parking node, within 30 km of the peak. Mountain Project / OpenBeta / Hiking Project
   coordinates were never used. A page-printed coordinate alone (WTA, climb13ers, a blog) only corroborates.
3. Held if the agent itself called the identification inferred / weak / moderate / conflicting, or two
   placements of the same named trailhead disagree by more than 300 m.
4. Skipped at write time if the row already had a trailhead coordinate or Summit pin, its stored trailhead
   name differed, or its `area_id` did not match (`batch-skipped.json`: Mount Crowder NE Ridge — its text
   says there is no separate trailhead; Tenpeak North Couloir; Poltergeist Pinnacle).

## Still open
- **Held, 180** (`verified.json` → `hold`, with reasons): 83 have a named trailhead but no coordinate
  (an OSM name match will place most: the OSM pull reached only 7 of 65 map cells because every Overpass
  mirror was timing out); 77 weak identifications; 32 placed only by a non-land-manager page; 7 conflicts.
- **Stuck, 109** (`verified.json` → `stuck`): no page names a trailhead, or the peak has two or more
  equally standard starts and nothing says which this route uses (e.g. Merced, Fiske, Gibbs, Trojan).
- **Summit not pinned, 36**: the route tops out on a sub-summit or col, it is unknown, or no USGS summit
  sits within 50 m of the stored peak coordinate (East Twin Needle, Lemah Two, Little Sister, Lexington
  Tower, Swiss Peak, The Monk, Main Peak, both North Peaks; Esmeralda 1.7 km and Storm King 0.55 km off).

## Findings outside the brief (not fixed here)
- Rainier routes filed under `wa_glacier_peak_…` ids (South Tahoma Headwall, Tahoma Cleaver).
- Chimney Rock's "West Face" row describes the South Peak via the East Gully.
- North Peak (`wa_north_peak_2`) sits ~9 km from the Bachelor Creek area its own West Face text describes.
- Stored class 2 vs reports' class 3 on Gray Peak (West Ridge) and Giraud Peak (SE face).
- Crater Mountain "Appassionata Smothered In Smoke" reads like a crag face filed on a peak.

## Sources and blocks
Worked: USFS / NPS / NYSDEC pages and data, USGS GNIS, 14ers.com, climb13ers, climber.org trip reports and
driving GPX, snwburd.com, WTA hike pages, the Mountaineers (in Chrome), Wikipedia, AAC articles, trip
blogs. Blocked: SummitPost (403 everywhere), Peakbagger (bot check, never solved), AllTrails and
listsofjohn (403), CascadeClimbers (403 except some Chrome reads). The session's shared web-search budget
ran out during the second pass, which is most of why the 109 stuck routes are stuck.

## Second batch (same day, after Peakbagger opened)
Owner: "try peakbagger again", "keep going", "use more agents". Peakbagger loaded without its bot check.
- **Third pass:** 17 agent chunks (`chunks4/`, `out4/`, `BRIEF4.md`) on the 207 stuck or weakly
  identified routes. Agents' own Chrome tabs could not run page scripts, so they used WebFetch
  (climber.org, 14ers, climb13ers, WTA, Wikipedia, Nominatim). Several carried earlier answers forward
  and relabelled them "found"; the verifier only takes a third-pass answer that adds a new page or a new
  placement more than 50 m from any earlier one.
- **Peakbagger ascent scrape** (in one tab, ~240 peaks attempted, 38 read before the site slowed to
  ~7 s a page): too thin to use. Most peaks had 1-3 ascents naming a Start Trailhead, often disagreeing,
  so no peak met the 3-named / 60%-agree bar. Not used for any write.
- **Applied: 5 trailheads** (`batch2.json`, every row re-read, 5 of 5 landed): Cronin Peak North Ridge
  (Baldwin Creek, locked), Phoenix Peak South Ridge (East Willow Creek lower lot, locked), Cadet Peak NE
  Ridge (Bedal Creek), Hozomeen South Peak Southwest Route (Hozomeen Lake / Willow Lake trailhead),
  Mount Hinman West Route (Necklace Valley). Dropped by hand: Himmelhorn Stonehenge (placed on the Goodell
  Creek campground, not a trailhead lot). Hinman's evidence went in as a ledger-only entry because
  enrich:apply's whole-object re-read compare reports a MISMATCH when jsonb reorders the object's keys,
  although every key and value matched.
- **Audit after both batches:** TRAILHEAD_AND_SUMMIT 750 → 918, SUMMIT_ONLY 434 → 278, NO_SUMMIT 53 → 41.
- **Still open:** 134 held, 149 stuck (`verified.json`). What would move them: OSM placements once the
  Overpass servers recover (83 hold only for a coordinate), and SummitPost (still 403).

## Third batch (same day): OSM placements via Nominatim
Owner: "keep going". The Overpass servers stayed down, but Nominatim answered. One query per held route
(its named trailhead, inside a box around the peak, 1.5 s apart; trailhead / parking features only) found
OSM features for 26 of 103 routes (`osm-names.json`). Matching now compares our name's MAIN part
("The Garden Trailhead (Keene Valley)" → "The Garden Trailhead"; "Silver Creek/Grizzly Gulch" → "Silver
Creek"), so a true name match is no longer refused for a parenthetical; true mismatches stay held (Crown
Valley vs Rancheria, Big Meadow vs Manter Meadow, St. Huberts vs Roaring Brook, Holden vs 10 Mile Falls).
- **Applied: 13 trailheads** (`batch3.json`, 13 of 13 re-read): Kite Lake (Buckskin, Democrat, Lincoln),
  Silver Creek (Redcloud, Sunshine, UN 13,820, UN 13,838), Argentine Pass (Edwards), The Garden (Basin,
  Haystack, Saddleback), Rancheria (Tunemah, locked), Riley Camp (Adams Pinnacle Glacier Headwall, locked).
  Every one is an OSM trailhead node or parking area carrying that exact name.
- Held by hand again: Himmelhorn Stonehenge / Wild Hair Crack (the only OSM point is the Goodell Creek
  campground). Adams's evidence went in ledger-only for the jsonb key-order MISMATCH noted above.
- **Audit after three batches:** TRAILHEAD_AND_SUMMIT 750 → 931, SUMMIT_ONLY 434 → 265, NO_SUMMIT 53 → 41.

## Files
`BRIEF*.md` (the three agent briefs) · `chunks/` + `out/` (first pass, 20 chunks) · `chunks2/` + `out2/`
(second pass, 23 chunks) · `gnis.json` · `verified.json` · `batch.json` (exactly what was applied, with its
ledger) · `batch-skipped.json`.

## Lincoln Peak X Couloir: written, then reverted (owner's choice)
The owner chose Heliotrope Ridge Trailhead for `wa_lincoln_peak_standard` (its own text names the FR-38
road end; Wikipedia names Heliotrope Ridge). It was written and locked (USFS + OSM node 4939697885, 7 m
apart). Reading the row back showed its driving directions, road card and approach text all describe FR-38,
so the page contradicted itself. The owner chose to revert: the record is back to "NF-38 (Forest Service
Road 38) / Middle Fork Nooksack" with no pin coordinate, and the evidence row was deleted (none left).
To pin Heliotrope properly, the directions, road and approach must be researched and rewritten with it,
or Heliotrope added as a second way in (`approach_variants`).
**Lesson: before writing a trailhead that differs from the stored one, read every field that describes
the drive (approach_logistics.trailheadDirection, road, approach); a pin alone can make the page lie.**

## Fourth batch: pass 5 (fresh web-search budget) on the 270 still open
Owner: "continue". 25 Sonnet agents (`BRIEF5.md`, `chunks5/` → `out5/`), at most 2 searches per peak, WebFetch
only. SummitPost, the Mountaineers, CascadeClimbers and Wenatchee Outdoors answered 403 throughout.
Agents named a start for about 150 of the 270, but most rest on one page, are flagged weak by the agent
itself, or carry only a tourism / climb13ers / climber.org GPX coordinate; verify still requires a USFS,
NPS, state-agency or OSM point. Nominatim, rerun for the new names (cache now keyed on the NAME, so a renamed
trailhead is looked up again), added only 9 points.
- **Applied: 7 trailheads + 1 summit pin** (`batch5.json`, 8 of 8 re-read): Onion Valley (Deerhorn NE
  Buttress, locked), Stuart Lake (Dragontail NW Face, locked), South Lake (Giraud, locked), Sawtooth / Mineral
  King (Eisen), Lassen Peak Trailhead (Lassen), Roads End (Thunder Col + East Ridge), AMR lot (Colvin Gill
  Brook); USGS Mount Rahm summit on the Custer-Rahm Traverse.
- Released by hand (`scripts/build-batch.mjs` RELEASE): Thunder (note said "upgraded FROM inferred" and
  tripped the weak-word filter), Lassen (park's own page), Giraud (the name matcher reduced "South Lake" to
  "lake" and matched Red Lake / Lake Sabrina — a matcher flaw to fix if this runs again), Colvin (the
  "conflict" was a page's summit elevation, not the trailhead).
- Held by hand: every Goodell Creek start (East Twin / West Twin Needle, East McMillan, Chopping Block —
  same campground point as Himmelhorn), Earl Peak (two points 2 km apart), Mount Baldwin (USFS + OSM agree at
  the lake-side start, 550 m from the signed lot), Mount Stuart Direct North Ridge (its stored trip plan and
  location text start at Esmeralda — the Lincoln Peak trap).
- Read before applying: `scripts/drivecheck.mjs` greps every column of each batch row for trailhead / road /
  parking text, so no pin contradicts stored drive prose.
- Worth an owner look: `wa_glacier_peak_south_tahoma_headwall` and `wa_glacier_peak_tahoma_cleaver` are
  Mount Rainier routes (Westside Road start) whose ids say Glacier Peak — possibly misfiled.
- **Audit now:** SUMMIT_ONLY 261, NO_SUMMIT 40, CRAG_SUMMIT 0.
- What is left is mostly genuine: two or more equally used starts, or the only page that would settle it
  blocks fetching. Another search pass would mostly re-find the same pages.

## Fifth batch: sibling trailheads (no web search)
`scripts/siblings.mjs` lists, for each open peak route, every distinct trailhead its sibling routes on the same peak
already pin (clustered within 300 m), and whether the route's OWN stored text names one of them as a phrase. 148
open routes have a sibling trailhead; the own text names exactly one for 48, several for 10, none for 90.
Read by hand (`scripts/ctx.mjs` prints the sentence): accepted only where the stored trailhead name IS the sibling's,
or the route's own approach / trip plan starts there. Rejected: text names it only as a descent, bivy or "either X
or Y" option (Dome, American Border, Enchantment, Esmeralda, North Star), names a different start (Diamond: Pioneer
Gulch; Triumph West: explicitly NOT Thornton Lakes; Sefrit, Rock Mountain, Tooth and Claw, Persis, Crowder), the
point is a campground (Hozomeen x3, every Goodell route), or the owner reverted it (Lincoln). Old Guard held.
- 22 accepted; on re-read 19 already carried a trailhead pin written by a parallel session, so **2 written**
  (`batch-sib.json`, re-read): Cold Springs for Adams Avalanche/White Salmon Glaciers (USFS South Climb Trailhead
  16 m away cited as official evidence) and Ross Dam for Fury East Direct (sibling pin only; unconfirmed).
- **Audit now:** SUMMIT_ONLY 259, NO_SUMMIT 40, CRAG_SUMMIT 0.

## Official-dataset and Photon pass (2026-11-18)

- `scripts/official-match.mjs`: matched held trailhead names against the USFS and NPS dumps within 30 km of
  the peak, with every word of the name required. 2 matches, both rejected on reading.
- `scripts/photon.mjs`: Photon (OSM) search for the 68 held routes that have no point, or only a
  non-land-manager point. One query at a time, 1.5 s apart. 4 matches, all to OSM "Upper Works Parking Area"
  (way 1082600068).
- Read by hand (`scripts/ctx.mjs`): the Mount Marshall (Herbert Brook) and Mount Redfield (Uphill Brook)
  routes follow the Calamity Brook trail, which leaves from the Upper Works lot. Both are **written**
  (`batch-uw.json`, unconfirmed, verified on re-read). No other column on either row describes the drive.
- Rejected: Panther Peak (Panther Brook) and Couchsachraga (Santanoni ridge). Their stored description says
  "Starts at Upper Works", but the trails it names (Bradley Pond trail, Santanoni Express) start at the
  separate Santanoni / Bradley Pond trailhead on the same road. The stored text contradicts itself; it needs
  an owner or prose fix before a pin.
- **Audit now:** SUMMIT_ONLY 258, NO_SUMMIT 40, CRAG_SUMMIT 0.

## Multi-start pass (2026-11-18, 8 agents, `BRIEF6.md`)

38 routes: the 36 stuck because two or more starts are in use, plus Panther and Couchsachraga. A start counted
only if an authoritative page names it standard for this route, or three opened trip reports show a clear
majority. 11 got an answer, 27 stay stuck (`out6/`).

- **Written (4, `batch-r6.json`, unconfirmed, verified on re-read):** Lippincott Mountain (NPS Sawtooth,
  Mineral King), Mount Corcoran (USFS Meysan Lake TH), Chianti Spire North Face (USFS Burgundy Col site at
  the SR 20 pullout; ground 4,305 ft against the stored 4,250 ft), Culebra Peak NW Ridge (Cielo Vista Ranch
  gate; 14ers.com and climb13ers agree). Each row was read for drive text first; none conflicts.
- **Answered but not pinned:**
  - Panther and Couchsachraga: Santanoni Range (Bradley Pond) trailhead on Santanoni Road, three pages each.
    No official or OSM trailhead point (Photon finds only the trail and the pond). Stored "Starts at Upper
    Works" is wrong for both.
  - Mount Rainier East Success Couloir: Paradise in three of four opened reports (mostly ski trips). The NPS
    list has no Paradise trailhead point. Held for the owner.
  - Lincoln Peak standard: FR-38 in three reports; parking is an unsigned switchback near mile 12.3 with no
    coordinate. The row already names FR-38; no pin.
  - Mount Ballard East Face: locked gate on the Slate Creek road in three reports; no coordinate.
  - Spanish Needle North Ridge: PCT at Canebrake Road, called standard by one report; the only coordinate is
    Chimney Creek Campground (never pin a campground).
  - Angora Mountain: Lewis Camp 3 pages to 2; too thin.
- North Peak Southeast Buttress: Mountain Project's North Peak sits about 28 km from the catalog's coordinate;
  the peak may be misidentified.
- **Audit now:** SUMMIT_ONLY 254, NO_SUMMIT 40, CRAG_SUMMIT 0.

## New York state parking layer (2026-11-18)

A new official source: NYSDEC's `NYS_State_Land_Assets` PARKING layer (services6.arcgis.com, layer 38; 270
points in the High Peaks box, `nydec-parking.json`). DEC's Giant Mountain page prints the same Roaring Brook
Falls coordinate, so the layer is the land manager's own. 21 held New York routes written
(`batch-ny.json`, all unconfirmed, verified on re-read). Each row's own text names the start.

- DEC layer points: Seward Trailhead on Coreys Road (DEC calls the lot "Ampersand Parking Lot"; a tourism
  page's Coreys Road trailhead is 52 m away) for Donaldson, Emmons, Seward, Seymour; ASRC lot for Esther; Elk
  Lake for South Dix; AMR lot for Sawteeth and Upper Wolfjaw (same point as Colvin); Roaring Brook Falls for
  Rocky Peak Ridge via Giant; East River for Allen.
- Cliff: the OSM Upper Works lot, same as Marshall and Redfield (the DEC point is 330 m north of it).
- Adirondak Loj (private lot, not in the DEC layer): OSM High Peaks Information Center, with another site's
  lot coordinate 32 m away, for Gray, Iroquois, Skylight, Nye, Phelps, Street, Table Top.
- Santanoni Range: OSM "Bradley Pond Parking Area" (way 307706607), 6 m from the tourism coordinate, for
  Panther, Couchsachraga and Santanoni Express. Their descriptions still say "Starts at Upper Works,
  Newcomb"; the lot is on Upper Works Road 2 km short of the Upper Works lot. Prose fix still open.
- Photon finds a lot when asked for "<trail name> parking"; the earlier pass asked only for the agent's
  trailhead name.
- **Audit now:** SUMMIT_ONLY 233, NO_SUMMIT 40, CRAG_SUMMIT 0.

## Hand release of word-filter holds (2026-11-18)

49 routes were held ONLY because the research note contained a caution word. Read by hand: 12 have a
route-specific identification and an official point, and the caution word concerned something else (an
alternative for a different route, a placement distance, an unopened page). Written (`batch-rel.json`, all
unconfirmed, verified on re-read; each row read first, no conflicting drive text): Mount Bago (Onion
Valley), Mount Baxter (Baxter Pass), Mount Guyot (Cottonwood Pass), Red Peak (Mono Meadow), Rockhouse Peak
(South Manter Meadow, OSM), Vandever (Eagle-Mosquito), Needham (Sawtooth), Colosseum (Sawmill Pass), Castle
Peak via Castle Pass (Donner Summit PCT), Cathedral Peak CO (Cathedral Lake), Snowmass East Slopes (USFS
"Snowmass Trailhead", ground 8,427 ft against the route page's 8,400 ft), Little Annapurna South Face
(Ingalls Creek, from the route's own text).

Still held on reading: peak-level-only Washington answers (Chimney Rock x3, Colchuck Balanced Rock x2,
Hibox x2, Colchuck NE Gully, Mixup, Apex, Castle Peak Pasayten), notes that name a second start in use
(Black Mountain, Mokelumne, Striped, Red Kaweah, Twin Peaks, Hilgard, Joe Devel, Overcoat, Vermilion,
Clinton), campground points (Black Hawk, Katahdin Hunt Trail), and earlier hand holds.
- **Audit now:** SUMMIT_ONLY 221, NO_SUMMIT 40, CRAG_SUMMIT 0.

## Colorado, Maine and Overpass pass (2026-11-18)

Two more sources opened up:
- **14ers.com trailhead pages** (`trailhead.php?thparm=..`) print a coordinate and elevation; plain fetch works.
- **Overpass answers again when the request carries a client name** (a 406 without one). `scripts/op.mjs`
  asks for parking / trailhead / halt features within a radius of each stored point; `scripts/op2.mjs` does
  the same one route at a time with backoff. The 25 km name searches still failed (server at capacity).

Written (`batch-co.json` 19, `batch-op.json` 5; all unconfirmed, verified on re-read, rows read first):
- Needleton train stop (14ers + OSM halt within 21 m): Jupiter, Eolus NE Ridge, Sunlight South Face, Turret,
  Windom West Ridge.
- Lily Lake (14ers + mapped parking 14 m): California Peak South Ridge, Huerfano Peak.
- Mt. Princeton Road 2WD, Fourmile Creek (Sherman), upper Blue Lakes (Fletcher), Molas (Trinity), Montgomery
  Reservoir (Clinton), Rockdale (Emerald; single source), Cielo Vista gate (Red Mountain, as Culebra).
- Maine: Appalachian Trail lots on Route 27 (Crocker) and Route 4 (Saddleback, The Horn); the trailhead node
  at Katahdin Stream for the Hunt Trail (not the campground point 260 m north).
- Booker (Thunder Creek trailhead parking, WTA within 3 m), Taylor Dome (Big Meadow trailhead), Sawtooth Peak
  and Spanish Needle (PCT crossing of Canebrake Road, trail marker within 12 m of the driving guide's
  waypoint), Burgundy Spire Corkscrew (same pullout as Chianti).
- **Correction:** Snowmass East Slopes. The USFS "Snowmass Trailhead" point written in the hand-release pass
  is 570 m west of the road-end lot; 14ers and a mapped parking lot agree on 39.20016,-106.99414. Rewritten.
  Lesson: an elevation match does not confirm a point on flat valley ground; check for a mapped lot.

Held: Stewart Peak (page says Nutras Creek, row says Stewart Creek road), Dyer (two "Iowa Gulch" points
1.4 km apart), North Apostle (route-site point 4.5 km from the 14ers South Winfield lot), Atlantic (two
McCullough Gulch points 870 m apart), Casco / French, Half Peak, Jones / Niagara (one unmapped coordinate),
Vermilion (sources conflict), Spaulding / Sugarloaf (no mapped lot on Caribou Valley Road).
- **Audit now:** SUMMIT_ONLY 198, NO_SUMMIT 40, CRAG_SUMMIT 0.

## Photon retry for the ten untested routes (2026-11-23)

Overpass was down on every server tried (502 "at capacity", 504, timeout), so the ten routes whose name
search had failed went through Photon with several phrasings each (`scripts/photon3.mjs`).
- **Written (2, `batch-p3.json`, unconfirmed, verified on re-read):** San Joaquin Mountain via San Joaquin
  Ridge (Minaret Vista, where the ridge jeep road starts) and Mount Rose (the SR 431 pass point; the lot
  adjoins it, so pass-level).
- Storm King North Face already stores High Bridge, 70 m from the mapped campground point; nothing to do.
- No match: Foerster (Isberg), Owens (Indian Wells Canyon), Smith Mountain (Albanita), Spanish Mountain
  (Crown Valley), Stewart Peak (Nutras Creek), Diamond Peak OR (Pioneer Gulch), Sharkfin Tower (Boston
  Basin), Spaulding / Sugarloaf (Caribou Valley Road). These starts are unsigned or unmapped.
- **Audit now:** SUMMIT_ONLY 196, NO_SUMMIT 40, CRAG_SUMMIT 0.
- What is left (audit JSON, 196 open): 78 stuck with no settling page, 27 stuck after the multi-start pass,
  about 80 held (38 flagged weak, 17 with no placement, 21 with only a non-land-manager point, 9 with
  placements that disagree), and 7 never in a batch. Of those 7, three Washington Pass routes (Cutthroat
  "A Virtuous Circle", North Early Winter Spire "Constantino-Whitelaw", South Early Winters Spire "East
  Buttress Direct") have no approach text; searches found no page for the first two, and the one page opened
  for the third does not state where the party parked. Not pinned.

## Round 7: second online pass over the held, no-page and never-researched routes (2026-11-23)

165 routes in 19 chunks (`chunks7/`, brief `BRIEF7.md`, answers `out7/`): everything still open except the
27 multi-start routes researched the week before. Each agent got the earlier answer and was told to find a
page about the route itself. Archived or cached copies of sites that refuse automated access were not used.
- **Agents returned:** 70 with a named start, 95 stuck. Most of the 70 are peak-level or have no coordinate.
- **Written (27, unconfirmed, each verified on re-read):**
  - `batch-r7.json` (24). Official points: Devils Crag and Striped (South Lake, Taboose Pass), Disappointment
    (Big Pine Creek South Fork), Baldwin (Convict Lake), Maclure (NPS Dog Lake parking, the Lyell Canyon lot),
    McAdie and Tunnabora (Whitney Portal), Muah (Cottonwood Pass, Horseshoe Meadow), Red Kaweah (NPS
    Sawtooth), four Colchuck Lake routes (Stuart Lake), two Hibox routes (Rachel Lake), Dome Peak Indian
    Summer (Downey Creek), Chianti Lichen Bouquet (Burgundy Col pullout; the row's own text names it).
    Mapped points: Black Hawk (Kennedy Meadows Trailhead Parking, with a trailhead guidepost 47 m away),
    Mokelumne (Tanglefoot Trailhead node). Pins the catalog already stores on neighbours: Klawatti North
    Ridge (Eldorado Creek, 17 routes), Mixup (Cascade Pass, 16), Sharkfin Tower (Boston Basin, 10), Mount
    Rahm Custer traverse and Northwest Mox Northeast Ridge (Depot Creek Road washout, 4).
  - `batch-r7b.json` (2). Rainier Tahoma Cleaver and South Tahoma Headwall: both rows name the Dry Creek
    gate on Westside Road. The NPS "Westside Road Trailhead" point is 15 m from a mapped gate; the pin is the
    mapped lot just south of it. The existing drive directions on Tahoma Cleaver were kept.
  - `batch-r7c.json` (1). Spaulding Mountain: an unnamed mapped lot on Caribou Pond Road about 0.45 mi before
    the Appalachian Trail crossing, matching the page's "gate lot, then 0.5 mi to the trail". Photon had
    missed it because it has no name; Overpass around the crossing found it (`scripts/op7.mjs`).
- **Corrections to earlier notes:** the WTA coordinate carried for Klawatti (48.5136,-121.1964) is 6 km from
  the Eldorado lot the catalog stores, so it was not used. The USFS "Standup Creek Trailhead" point is 28 km
  from Earl Peak and is a different place.
- **Still held after this round, with the reason:**
  - One printed coordinate and no mapped lot within 400 m: Casco, French, Dyer, Half Peak, Horseshoe, Jones,
    Niagara, Owens Peak, Pyramid Peak, Earl Peak. Atlantic has a mapped lot 154 m from the printed point but
    the pages say parking there is restricted. North Apostle: nearest mapped feature is a gate 395 m away.
  - Two candidate points: Recess Peak (Bear Ridge Trailhead node, and the Bear Ridge Cutoff lot 870 m away).
  - Two starts in use: Vermilion Southeast Ridge (Hope Lake and Ice Lake Basin both reach the same saddle),
    Mount Stuart Direct North Ridge (Stuart Lake and Esmeralda), Sugarloaf (Caribou Pond Road and Route 27).
  - Named start with no coordinate from any allowed or mapped source: Smith Mountain, Spanish Mountain,
    Granite Chief, Lamont, Pinchot, Stewart Peak (Nutras Creek), Diamond Peak (Pioneer Gulch), Garfield South
    Route and Leaning Spire, Cutthroat The Swarm, Hozomeen Southeast Buttress, Ruby Mountain, Lincoln.
  - Weak, peak-level or single trip report: Ossa, Wheel, Pettit, Sirretta, North Maggie (the only points are
    a campground), Apex Buttress, Persis Hexorcist (row names a different drainage), Rock Mountain, Liberty
    Bell Barber Pole.
  - Goodell Creek routes (Himmelhorn x2, Chopping Block x2, Pyramid, West Twin Needle): held by rule.
- **Possible misfiling found:** an American Alpine Journal report puts Constantino-Whitelaw on the South
  Early Winter Spire, not the North. Crater Mountain "Appassionata / Smothered in Smoke" reads like a crag
  face. Neither was changed.
- **Audit:** SUMMIT_ONLY 170, NO_SUMMIT 40, CRAG_SUMMIT 0, measured after `batch-r7b.json`. The Spaulding pin
  was written afterwards and verified on re-read; the audit rerun behind it was still queued for the
  database when this was recorded, so the expected count of 169 is not yet measured.

### Round 7 follow-up (2026-11-23)

- **Audit, measured:** SUMMIT_ONLY 167, NO_SUMMIT 40, CRAG_SUMMIT 0 (196 before the round; 30 writes).
- **Written (2 more, `batch-r7d.json`, unconfirmed, verified on re-read):** Rock Mountain Northeast Ridge (USFS
  Merritt Lake Trailhead; the row names that trailhead at about 2,950 ft, the ground at the point is 3,027 ft,
  and the catalog stores the same lot on the Mount Howard routes the traverse crosses) and Cutthroat "The
  Swarm" (the climbers' pullout the catalog stores on the North Ridge; the row says to begin as for that route).
- **Checked and left held:** 14ers.com lists only fourteener trailheads, so it gives no second publisher for
  South Halfmoon, Burns Gulch, Carson Pass or the Horseshoe turnoff. Overpass around the driving-guide
  waypoints for Lamont, Sirretta and Owens Peak found no lot, trailhead or sign within 400 m
  (`scripts/op7b.mjs`).
- **Catalog pins exist for peaks whose stuck routes have no approach text at all:** Chair Peak (Alpental),
  Mount Johnson (Upper Dungeness), Chimney Rock (Pete Lake), North Early Winter Spire (Blue Lake), Red
  Mountain (PCT at Snoqualmie Pass), Mount Hinman (Necklace Valley). Pinning those 20 or so routes would be
  peak-level inference with no page and no row text behind it, so they were not written. This is an owner
  decision: "same lot as the peak's other routes" is cheap to apply if wanted.

### Round 8: official trail lines and mapped trail ends (2026-11-23)

New method: compare the start a page names with where the trail itself begins. Two sources were used. The
USFS `EDW_TrailNFSPublish_01` layer gives each official trail line and its end points (`scripts/usfstrail.mjs`).
OSM trail and road geometry gives where each mapped trail begins (`scripts/opgeom.mjs`). A published
coordinate within about 35 m of a mapped trail start counts as a second, independent placement.
- **Written (7, unconfirmed, verified on re-read):**
  - `batch-r7e.json`: Granite Chief (official trail start; a mapped lot is 20 m away) and Diamond Peak
    Southwest Ridge (official Pioneer Gulch trail start on Rockpile Road; the row names this trailhead).
  - `batch-r7f.json`:
    - Lamont Peak: driving-guide waypoint 6 m from the mapped Lamont Peak trail start.
    - Owens Peak: hundredpeaks coordinate 17 m from the mapped Owens Peak Trail end.
    - Pyramid Peak via Rocky Canyon: published pullout 34 m from the mapped Pyramid Peak Trail start.
    - Casco and French: the printed South Halfmoon coordinate is 7 m from where the mapped South Halfmoon
      road leaves Halfmoon Road.
- **Audit, measured:** SUMMIT_ONLY 160, NO_SUMMIT 40.
- **Checked and still held:**
  - Half Peak and Horseshoe: 23 m from a mapped road, but on the road, with no lot or trailhead there.
  - Jones and Niagara: 171 m from the Burns Gulch road end.
  - Dyer, North Apostle and Atlantic: 0.5 to 1.4 km from any mapped trail.
  - North Maggie: 161 m from the trail start, which sits in a campground.
  - Ossa: the trail is mapped, but the route is still only a peak-level answer.
  - Sirretta: the official trail begins 0.86 km from the driving-guide point.

### Round 9: peaks where every pinned route shares one lot (2026-11-23)

Owner asked for the recommended option. `scripts/uni8.mjs` grouped the 160 open routes by peak and compared
the trailhead pins the peak's other routes already carry. 34 peaks were unanimous (every pin within 150 m),
10 split, 78 had no pinned neighbour. A route was written only when all of these held: at least three
neighbouring routes share the lot, no page or row text names another start for the peak or that side of it,
and the route is not a Goodell Creek route. Each write cites one opened page that starts at that lot.
- **Written (6, unconfirmed, verified on re-read, `batch-r9.json`):** Chair Peak South Ridge and Southeast
  Face (Alpental, 5 neighbours), Chimney Rock North, Northeast and Northwest Ridges (Pete Lake, 3
  neighbours), Colchuck Peak South Face (Stuart Lake, 7 neighbours).
- **Unanimous but left held:**
  - Chimney Rock's two south-side lines: Rachel Lake is a possible start.
  - Second start known: Big Snow, Castle Peak (Pasayten), Little Big Chief, Dragontail Boving Route, and
    Cutthroat "A Virtuous Circle" (north side, Cutthroat Lake trail).
  - Red Mountain east side: no page covers that side.
  - Fewer than three neighbours: every peak with one or two.
- **Audit, measured:** SUMMIT_ONLY 154, NO_SUMMIT 40.

### Round 10: climber.org trip reports per peak; owner lowers the bar to two sources (2026-11-23)

Owner: "feel free to use 2 sources instead of 3". A start now counts when two independent opened sources
agree and no other opened source names a different start, or the agreeing sources are a clear majority.
`scripts/crtally.mjs` pulled every climber.org trip report the site indexes for each open California
peak (`reports/ByPeak<L>.html`, 49 peaks). Each report's "Trailhead:" header and its first trailhead
mention were then read.
- **Written (3, unconfirmed, verified on re-read):**
  - `batch-r10.json`: Black Mountain (Baxter Pass; 3 independent reports, official point) and Mount McGee
    (North Lake; 3 reports, official point).
  - `batch-r10b.json`: Mount Hilgard. Three reports name "Trailhead: Bear Creek Diversion Dam" and one
    starts at Pine Creek. Pinned at the mapped Bear Creek Trailhead at the end of the 4WD Bear Diversion
    Road, where a trailhead, a board and a guidepost sit within 5 m. The official "Bear Creek Trailhead"
    point is 200 m away and confirms the name.
- **Checked and held:**
  - Silver Peak: all 4 reports start at Onion Spring by Lake Edison, but three map points lie up to 1.2 km
    apart.
  - Sirretta: the reports agree on the Sirretta trailhead at the northwest end of Big Meadow. The driving
    guide's point (7,822 ft, matching its "7800") is 860 m from where the official and mapped trail lines
    begin (7,957 ft).
  - Recess: Bear Creek Diversion Dam in three reports vs Bear Ridge on two route pages.
  - Wheel: the South Lake reports are long traverses, not starts for the peak.
  - Young and Hale: two reports, but both describe the same 1998 trip.
  - Split between starts: Gemini, Davis, Electra, Rodgers, Observation, Dicks, Pinchot, Goddard, Barnard,
    and the other multi-start peaks.
  - Name collisions make the index unusable for Mount Florence (Florence Peak) and Spanish Mountain
    (Spanish Needle).
- **Audit:** the rerun hit HTTP 500 twice and stopped under the throttle rule. Expected count is 151
  (154 less these 3); it has not been measured yet.

### Round 11: agents under the two-source rule (2026-11-23)

The open routes were sorted by what blocks them: 84 had no named start, 30 were multi-start, 28 had a
named start but no point or only a weak identification, and 9 are Goodell Creek. The first two groups went
to 11 Sonnet agents (`BRIEF8.md`, `chunks8/`, `out8/`). Each agent got the two-source rule and the list of
sites that answer. Results: 14 found, 99 stuck.
- **Written (10, unconfirmed, verified on re-read, `batch-r11.json`), each with two agreeing sources:**
  - At official points:
    - Mount Hale and Mount Newcomb Southwest Slope: Whitney Portal.
    - Volunteer Peak: Robinson Creek Trailhead at Twin Lakes. The first name match was a Washington trailhead
      with the same name; it was caught and corrected to the California point before writing.
    - Black Giant West Slope: Lake Sabrina.
    - Goat Mountain Eastern Route: Goat Mountain Trailhead.
    - Iron Cap Northeast Shoulder: Necklace Valley.
    - Hozomeen West Face: NPS Skyline II.
  - At pins the catalog already stores:
    - Liberty Bell "The Barber Pole": the SR-20 hairpin pullout, where 10 Liberty Bell east-face routes
      start.
    - Southeast Mox Beckey Route: the Depot Creek Road washout.
    - Rainier East Success Couloir: Paradise (8 routes). This settles one of the owner's hand-placement
      items.
  - Every pin is 1 to 18 km from its peak.
- **Found but not written:**
  - A source disagrees: Angora (Lewis Camp vs Mineral King / Lloyd Meadows), Merced (Quartz Mountain vs
    Glacier Point / Yosemite Valley), Rodgers (Rush Creek vs Agnew Meadows), Silver Peak (Lake Edison vs
    Onion Spring).
  - Start named, no placement: Cartago (only the driving-guide waypoint, with no mapped lot), Bolton Brown
    (McMurry Meadows, nothing mapped), Mount Ballard (Slate Creek road gate; the road is mapped, the gate is
    not, so it stays on the hand-place list).
- **Audit, measured:** SUMMIT_ONLY 141, NO_SUMMIT 40, TRAILHEAD_AND_SUMMIT 1060.

### Round 12: sources re-read under the two-source rule, then shared lots (2026-11-23)

No agents this round. Two things were done from the database and pages already opened, plus two new searches.
- **Two held routes now meet the two-source rule (`batch-r12.json`, official USFS points):**
  - Angora Mountain: Lewis Camp. Two opened reports (climber.org 1996/89, themtsarecalling) start there. The
    one different start (wacziarg, Lloyd Meadows) climbed a different line, a northwest-slope variant.
  - Merced Peak: Quartz Mountain. Two opened reports (climber.org 2004/1314, themtsarecalling) start there.
    The Glacier Point and Yosemite starts came only from Wikipedia and search summaries, for other lines.
  - Still held: Rodgers (2 Rush Creek vs 1 Agnew Meadows; the official "Rush Creek Trailhead" is a different
    Rush Creek about 30 km south) and Silver Peak (2 vs 1, no point for the Lake Edison start).
- **Shared lots (`batch-r12b.json`, 10 routes).** For each stuck route, the other pinned routes on its peak
  were listed (`scripts/sib12.mjs`). A route was pinned where every pinned route on the peak uses one lot and
  no opened page names another start, or where routes on the same face share a lot:
  - Chimney Rock Southeast Ridge and Southeast Shoulder: Pete Lake (6 routes; USFS point).
  - Dragontail Boving Route: Stuart Lake (16 routes; USFS point).
  - Big Snow Sasquatch's Breath: Dingford Creek (3 routes; USFS point; turns-all-year 2008 via Dingford).
  - Little Big Chief Southwest Face: Dingford Creek (3 routes; USFS point).
  - Red Mountain (Snoqualmie) East Face, East Ridge, Southeast Face: PCT Snoqualmie North lot (3 routes;
    USFS point).
  - Rainier North Mowich Icefall: Mowich Lake, where all four Mowich-side routes start (turns-all-year 2012
    Mowich Face circuit).
  - SEWS "East Buttress Direct": the SR-20 hairpin. Its twin "Direct East Buttress" (same line, 5.11a)
    stores the hairpin and its own text says to park there. The two rows look like a duplicate; not merged.
  - Not pinned: Castle Peak (an opened page names a Manning Park start), Middle Peak (a second lot, High
    Bridge), Witches Tower and Mount Hinman (only 2 pinned siblings).
- The Sierra Peaks pages on climber.org (`data/SierraPeaks/<region>/<n>.html`) were checked as a new source.
  They give elevation and UTM only, no trailhead.
- **Audit, measured:** SUMMIT_ONLY 129, NO_SUMMIT 40, TRAILHEAD_AND_SUMMIT 1072.

### Round 13: OSM placement and climber.org report headers (2026-11-23)

No agents. Two written (`batch-r13.json`, unconfirmed, verified on re-read):
- Spanish Mountain North Ridge: Crown Valley Trailhead, placed at OSM node 1527888043 (`highway=trailhead`,
  name "Rancheria Trailhead", alt_name "Crown Valley Trailhead"; confirmed through the OSM API). Two
  independent reports start there and take the saddle north of Geraldine Lakes (Burd spanish_1, climber.org
  2006/1581). The one other report (1995/68) climbed the west side from the Spanish OHV trail.
- Dicks Peak: Glen Alpine Trailhead (USFS point). Four reports by four authors start there (climber.org
  2009/1713, 2003/1136, 2001/833, 2001/745); one (2001/780) started at Eagle Falls.

`scripts/cr2.mjs` reads each stuck California peak's climber.org reports and prints the report's own
"Peaks:" and "Trailhead:" header lines. Held after reading:
- Mount Florence: our peak is the Yosemite one (37.74 N). Most climber.org reports are for Florence Peak
  in Mineral King, a different peak; only one report is about ours.
- Split starts: Trojan and Barnard (George Creek vs Shepherd Pass/Cottonwood), Gemini (Bear Creek
  Diversion Dam vs Florence Lake), Electra, Pyramid Peak South (Road's End vs Taboose Pass), Moses, Silver
  Peak (Lake Edison 2 vs Onion Springs 1; the Wrights Lake and Squaw Valley reports are other Silver Peaks).
- No placement: Pinchot (the climber.org driving GPX has ARMSCN, Armstrong Canyon road end
  36.94505,-118.35353, but OSM maps no lot there), Bolton Brown (Burd parked in McMurry Meadows on the road,
  not at the mapped Birch Lake Trailhead), Smith, Stewart, Earl and Persis (no mapped lot near the
  published points), Sugarloaf (OSM lot 700 m from the published point, and the Route 27 start is still
  named).
- **Audit, measured:** SUMMIT_ONLY 127, NO_SUMMIT 40, TRAILHEAD_AND_SUMMIT 1074.
