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

## Files
`BRIEF*.md` (the three agent briefs) · `chunks/` + `out/` (first pass, 20 chunks) · `chunks2/` + `out2/`
(second pass, 23 chunks) · `gnis.json` · `verified.json` · `batch.json` (exactly what was applied, with its
ledger) · `batch-skipped.json`.
