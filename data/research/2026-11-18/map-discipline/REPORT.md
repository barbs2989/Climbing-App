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
