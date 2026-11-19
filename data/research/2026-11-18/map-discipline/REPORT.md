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
