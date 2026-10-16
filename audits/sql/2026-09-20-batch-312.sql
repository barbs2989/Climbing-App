-- WA alpine audit batch 312 (pass 6)
-- Routes: wa_boston_peak_southeast_face, wa_boving_christensen,
--         wa_boving_roofs, wa_buckner_mountain_north_face,
--         wa_buckner_mountain_southwest_face, wa_burgundy_spire_north_face,
--         wa_burnt_boot_peak_north_ridge,
--         wa_cardinal_peak_nw_couloir_north_ridge

-- =========================================================================
-- Boving-Christensen (Prusik Peak) -- wa_boving_christensen
-- =========================================================================
-- bivy carried 6 entries sharing the whole Core/Colchuck Enchantments
-- corridor: the first two ("Colchuck Lake designated campsites," "Talus
-- and boulder bivies below Dragontail's north side") are the row's own
-- text naming them as the basecamp for "Backbone Ridge, Serpentine Arete
-- and Colchuck Balanced Rock" -- all Colchuck/Dragontail Peak routes, not
-- Prusik -- and the last ("Bridge Creek and Eightmile campgrounds") is
-- framed the same way ("most parties on Backbone Ridge, Serpentine Arete
-- or Colchuck Balanced Rock end up sleeping down on Icicle Creek Road").
-- The middle three all explicitly name Prusik: "Perfection Lake and
-- Inspiration Lake basin camps" ("the natural base for Prusik Peak's West
-- Ridge and South Face" -- this route's own face), "Gnome Tarn" ("sits
-- almost directly under Prusik's south side... South Face routes and the
-- West Ridge" -- matches this route's own itinerary, which camps at Gnome
-- Tarn), and "Shield Lake, north of Prusik Pass" (serves Prusik's West
-- Ridge). Pruned to the three that name this route's own peak, matching
-- the established audit:camp-route-fit corridor-contamination pattern.
UPDATE routes SET bivy = jsonb_build_array(bivy->2, bivy->3, bivy->4)
  WHERE id = 'wa_boving_christensen'
  AND jsonb_array_length(bivy) = 6
  AND bivy->0->>'name' = 'Colchuck Lake designated campsites'
  AND bivy->2->>'name' = 'Perfection Lake and Inspiration Lake basin camps'
  AND bivy->3->>'name' = 'Gnome Tarn'
  AND bivy->4->>'name' = 'Shield Lake, north of Prusik Pass'
  AND bivy->5->>'name' = 'Bridge Creek and Eightmile campgrounds, Icicle Creek Road';

-- fa contradicted the row's own overview: fa said "(year not given by
-- available sources)" while overview stated "put up by Paul Boving and
-- Matt Christensen in 1977 using nuts and hexes" -- an internal
-- contradiction about the same fact. Confirmed 1977 via WebSearch
-- (stephabegg.com trip report -- "Boving and Christensen climbed these
-- pitches entirely with nuts and hexes during their first ascent in
-- 1977" -- corroborated independently by cascadeclimbers.com's profile of
-- Matt Christensen). overview's 1977 was correct; fa was the stale half.
UPDATE routes SET fa = 'Paul Boving and Matt Christensen, 1977 (climbed with nuts and hexes, per stephabegg.com trip report and cascadeclimbers.com).'
  WHERE id = 'wa_boving_christensen'
  AND fa = 'Paul Boving and Matt Christensen (year not given by available sources).';

-- =========================================================================
-- Boving Roofs (South Early Winters Spire) -- wa_boving_roofs
-- =========================================================================
-- Verified clean: bivy (4 entries -- Blue Lake trailhead roadside bivy,
-- Liberty Bell basin dispersed sites, Lone Fir Campground, Klipchuck
-- Campground) is entirely the shared Blue Lake/Washington Pass corridor
-- appropriate for this South Early Winters Spire route, no contamination.
-- fa (Paul Boving and Steve Pollock) plausible and left as-is; South
-- Early Winters Spire true-summit elevation (7,807 ft, waypoint and
-- high_point_ft) consistent throughout. No fix.

-- =========================================================================
-- Buckner Mountain, North Face -- wa_buckner_mountain_north_face
-- =========================================================================
-- Verified clean via external corroboration: high_point_ft 9,114 ft
-- matches Wikipedia (Buckner is the third-highest peak in North Cascades
-- NP, 14th-highest in WA, southwest/true summit 9,114 ft per Peakbagger
-- pixel analysis vs 9,112 ft northeast summit -- exactly matching this
-- row's own overview text on the two-summits-nearly-equal-height point).
-- bivy (Boston Basin high camp, Boston Glacier bivy, Sahale-Boston col
-- bivy) and descent_text are internally consistent with the row's own
-- waypoints (Cascade Pass, Sahale Glacier Camp, Sahale-Boston col) and
-- with the sibling Southwest Face route below. No fix.

-- =========================================================================
-- Buckner Mountain, Southwest Face / Southwest Slopes
-- wa_buckner_mountain_southwest_face
-- =========================================================================
-- Verified clean: high_point_ft 9,114 ft matches Wikipedia (see North
-- Face route above); fa (Lewis Ryan, August 1, 1901, hedged as
-- "historically presumed... exact line... not explicitly documented") is
-- appropriately cautious; bivy (Sahale Glacier Camp, Upper Horseshoe
-- Basin bivy) both explicitly serve this route's own southwest-side
-- approach and are consistent with its own waypoints/descent_text. No fix.

-- =========================================================================
-- Burgundy Spire, North Face -- wa_burgundy_spire_north_face
-- =========================================================================
-- Verified clean: fa (Fred Beckey party, 1953) matches WebSearch results
-- (Burgundy Spire's first ascent by Beckey and party in 1953). The row's
-- own data_quality field already discloses the 8,400 ft (climbing
-- literature) vs 8,492 ft (LIDAR/peakbagger) elevation discrepancy
-- honestly rather than picking one silently, and corrections already
-- documents an earlier stale note being removed. bivy's two "EAST side,
-- Silver Star only" entries explicitly disclose they are for a different
-- (though geographically adjacent, same-massif) objective ("it is no use
-- for the Wine Spires on the west side") rather than silently misleading
-- -- unlike the corridor-contamination pattern seen elsewhere, this is
-- labeled context about the same Silver Star Mountain massif the Wine
-- Spires sit on, not a foreign, unrelated peak. Left as-is. No fix.

-- =========================================================================
-- Burnt Boot Peak, North Ridge -- wa_burnt_boot_peak_north_ridge
-- =========================================================================
-- bivy carried the same 9-entry Alpine-Lakes-Wilderness-corridor list
-- documented in batch 311 for the Big Snow Mountain routes (Pete
-- Lake/Lemah Meadows, Chimney Glacier basin, Escondido Ridge tarns,
-- Waptus/Spade Lake, Park Lakes Basin, Hardscrabble Horse Camp, Upper
-- Hardscrabble Lake, Williams Lake, Peggy's Pond/Cathedral Pass) -- for
-- Lemah Mountain, Chimney Rock, Little Big Chief Mountain, Three Queens,
-- Big Snow Mountain, Iron Cap Mountain and Cathedral Rock, none of them
-- Burnt Boot Peak. Only one entry names this route's own peak:
-- "Hardscrabble Horse Camp, Middle Fork Snoqualmie" states outright
-- "BURNT BOOT PEAK is climbed from here by fording the Middle Fork...
-- and then working up the northwest side to the gully system" -- matching
-- this route's own approach_logistics trailhead (Dutch Miller Gap /
-- Middle Fork Snoqualmie Road). "Upper Hardscrabble Lake" (kept for the
-- sibling Big Snow Mountain routes in batch 311) is explicitly that
-- peak's camp, not Burnt Boot's, so it is pruned here too. Pruned 9 -> 1.
UPDATE routes SET bivy = jsonb_build_array(bivy->5)
  WHERE id = 'wa_burnt_boot_peak_north_ridge'
  AND jsonb_array_length(bivy) = 9
  AND bivy->0->>'name' = 'Pete Lake and the Lemah Meadows camps'
  AND bivy->5->>'name' = 'Hardscrabble Horse Camp, Middle Fork Snoqualmie'
  AND bivy->8->>'name' = 'Peggy''s Pond and Squaw Lake, Cathedral Pass';

-- Elevation cross-check: high_point_ft (6,540 ft) matches Wikipedia's
-- current figure; the row's own beta field quotes a 1970s first-ascent
-- note verbatim referring to "P 6480, now officially Burnt Boot Peak" --
-- WebSearch confirms 6,480 ft was an earlier/historical designation later
-- revised to the modern 6,540 ft figure this row correctly uses elsewhere.
-- Not a contradiction; the historical quote is accurate as a quote. No fix.

-- =========================================================================
-- Cardinal Peak, Northwest Couloir-North Ridge
-- wa_cardinal_peak_nw_couloir_north_ridge
-- =========================================================================
-- bivy carried a 7-entry Entiat/Chelan-Mountains-crest zone list (Cottonwood
-- Camp/Entiat River road campgrounds, Myrtle Lake and Cow Creek Meadows,
-- Larch Lakes meadow camps, Snow Brushy Creek junction camps, Entiat
-- Meadows, Fox Camp, and the Emerald/Saska basin at Milham Pass) covering
-- camps for Fifth of July Mountain, Mount Fernow and Spectacle Buttes, all
-- reached from the DIFFERENT main-stem Entiat River trailhead -- the row's
-- own "Fox Camp" entry explicitly warns of this: "Note this is a different
-- spur road and a different trailhead from the Entiat River trail at the
-- end of the valley, and the two are easy to confuse when planning." Only
-- two entries serve this route's own North Fork Entiat Trailhead approach
-- to Cardinal Peak: "Fox Camp, North Fork Entiat trail" ("Every one of
-- Cardinal, Emerald, Saska and Pinnacle Mountain is reachable from here")
-- and "The basin between Emerald and Saska, and Milham Pass" ("This is
-- where a party stages to link Cardinal, Emerald, Saska and Pinnacle
-- Mountain... Cardinal is the highest of the group and the furthest").
-- Pruned 7 -> 2, matching the established corridor-contamination pattern.
UPDATE routes SET bivy = jsonb_build_array(bivy->5, bivy->6)
  WHERE id = 'wa_cardinal_peak_nw_couloir_north_ridge'
  AND jsonb_array_length(bivy) = 7
  AND bivy->0->>'name' = 'Cottonwood Camp and the Entiat River road campgrounds'
  AND bivy->5->>'name' = 'Fox Camp, North Fork Entiat trail'
  AND bivy->6->>'name' = 'The basin between Emerald and Saska, and Milham Pass';

-- access.closures was null despite an active, currently-in-effect
-- closure covering this route's own approach. WebSearch (corroborated
-- across the Forest Service's own alert page, InciWeb, Chelan County's
-- notification page, and independent local news -- KIRO 7, Cashmere
-- Valley Record, deeparrival.com) confirms the Little Giant Fire closure
-- order (Okanogan-Wenatchee NF closure order 06-17-07-2026-40, updated
-- Sept 4, 2026) covers the Wenatchee River, Entiat and Chelan Ranger
-- Districts and explicitly includes the North Fork Entiat Trailhead and
-- Fox Creek Campground (this route's own trailhead and "Fox Camp," kept
-- above) -- effective Sept 3, 2026 through Oct 31, 2026 unless rescinded
-- sooner. Dated per audit:expiring-closures convention ("date it or drop
-- the claim") rather than an open-ended claim; today's audit date
-- (2026-09-20) falls inside the stated window, so this is a live,
-- route-relevant safety gap being filled, not a stale one being caught.
UPDATE routes SET access = jsonb_set(access, '{closures}',
  '"The North Fork Entiat Trailhead and Fox Camp (this route''s own approach) fall within the Little Giant Fire closure order (Okanogan-Wenatchee NF, closure order 06-17-07-2026-40, Wenatchee River/Entiat/Chelan Ranger Districts), effective Sept 3, 2026 through Oct 31, 2026 unless rescinded sooner. Confirm current status with the Entiat Ranger District (509-784-4700) before a fall 2026 trip."'::jsonb)
  WHERE id = 'wa_cardinal_peak_nw_couloir_north_ridge'
  AND access->>'closures' IS NULL
  AND access->>'landManager' = 'Okanogan-Wenatchee National Forest, Entiat Ranger District';

-- =========================================================================
-- Boston Peak, Southeast Face -- wa_boston_peak_southeast_face
-- =========================================================================
-- Verified clean: high_point_ft 8,894 ft and fa party (Calder Bressler,
-- Ray Clough, Bill Cox, Tom Myers, 1938) both match Wikipedia exactly.
-- The internal coherence issue this route carried in an earlier pass
-- (batch 4's note on wa_cascade_peak_east_ridge/wa_boston_peak_southwest_
-- face conflation) does not apply here -- this row (Southeast Face) reads
-- coherently throughout (overview/beta/descent_text/approach_variants/
-- climbing_route/waypoints all agree on the Quien Sabe Glacier -> Sahale-
-- Boston col -> southeast-side ledges line) and appears to have been
-- corrected in a prior batch. bivy (Boston Basin high camp, Boston Basin
-- low camp) is scoped correctly to this route's own approach. No fix.
