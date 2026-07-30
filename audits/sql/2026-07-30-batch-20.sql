-- WA Alpine Audit — Pass 1, Batch 20 — 2026-07-30
-- Peaks: Lincoln Peak (North Ridge, X Couloir/Standard), Little Mac Spire
--        (Southwest Route), Little Sister (North Face, West Face), Little Tahoma
--        (Cowlitz/Ingraham Glaciers, East Shoulder), Luahna Peak (Southwest
--        Slope-Southeast Ridge)

-- =========================================================================
-- Lincoln Peak — North Ridge
-- =========================================================================

-- wa_lincoln_peak_north_ridge: high_point_ft stored as 9085, which matches
-- neither this route's own summit waypoint in the same row (elev/elevFt 9101,
-- explicitly cited to "GNIS Feature ID 1522127") nor ListsOfJohn.com's surveyed
-- figure of 9,101 ft for Lincoln Peak. Older secondary sources (AAC
-- Publications, WTA, general peakbagging summaries) round to "9,080+ ft" from
-- coarse contour-interval topo data, but none of the sources checked state
-- 9,085 specifically -- that figure appears to be a bad transcription from a
-- prior enrichment pass. Corrected to match GNIS/ListsOfJohn and this route's
-- own already-researched waypoint data.
UPDATE routes SET high_point_ft = 9101 WHERE id = 'wa_lincoln_peak_north_ridge';

-- =========================================================================
-- Lincoln Peak — X Couloir (Southwest Face) / Standard Route
-- =========================================================================

-- wa_lincoln_peak_standard: same high_point_ft correction as the North Ridge
-- route on this same peak (see above) -- this row's own summit waypoint
-- already cites elevFt 9101 (GNIS Feature ID 1522127), which ListsOfJohn.com
-- corroborates.
UPDATE routes SET high_point_ft = 9101 WHERE id = 'wa_lincoln_peak_standard';

-- =========================================================================
-- Little Tahoma Peak — East Shoulder
-- =========================================================================

-- wa_little_tahoma_east_shoulder: approach_logistics.trailhead/trailheadLat/
-- trailheadLng/trailheadDirection read "White River Trailhead (FR-6400, Lake
-- Wenatchee)" at 47.9628, -120.94501 -- an exact copy of Luahna Peak's
-- trailhead (wa_luahna_peak_southwest_slope_southeast_ridge's
-- approach_logistics carries the identical string/coordinates), a real
-- trailhead but ~130 mi away near Lake Wenatchee/Glacier Peak Wilderness, not
-- Mount Rainier. This same row's own approach/descent/waypoints/GPX text
-- already correctly describes and even documents the correction for the real
-- trailhead: Fryingpan Creek Trailhead off Sunrise/White River Road (WA-410),
-- ~2.9 mi past the White River entrance station (confirmed via NPS
-- "Summerland Trailhead" page, Mountaineers.org, and trailcatjim.com), whose
-- coordinates match this row's own recorded GPX track start (46.887973,
-- -121.610327). Propagated that already-verified trailhead into the
-- contaminated approach_logistics field.
UPDATE routes SET approach_logistics = approach_logistics || jsonb_build_object(
  'trailhead', 'Fryingpan Creek Trailhead (WA-410 / Sunrise Road)',
  'trailheadLat', 46.887973,
  'trailheadLng', -121.610327,
  'trailheadDirection', 'From the Fryingpan Creek Trailhead (~3,800 ft), about 2.9 mi past the White River entrance station on Sunrise/White River Road (WA-410), via the Wonderland Trail through Summerland'
)
WHERE id = 'wa_little_tahoma_east_shoulder';

-- =========================================================================
-- Little Tahoma Peak — Cowlitz/Ingraham Glaciers (South Face)
-- =========================================================================

-- wa_little_tahoma_cowlitz_ingraham_glaciers: access.notes read "Northwest
-- Forest Pass required ($5/day or $30/annual). No specific climbing permit.
-- Mount Tom area, North Cascades." -- contamination from an unrelated
-- USFS-managed area. This route is entirely inside Mount Rainier National
-- Park, as the same access object's own landManager field ("National Park
-- Service, Mount Rainier National Park") already states; a Northwest Forest
-- Pass (a USFS product) does not apply here, and Little Tahoma has nothing to
-- do with the Mount Tom area of the North Cascades. Corrected per NPS Mount
-- Rainier's actual climbing-permit policy -- a $82/person/year climbing
-- registration for travel above 10,000 ft or on any glacier, confirmed via
-- nps.gov and rmiguides.com, and already stated correctly on this same peak's
-- sibling East Shoulder route.
UPDATE routes SET access = access || jsonb_build_object(
  'notes', 'This is NPS land, not USFS -- a Northwest Forest Pass does not apply. A $82/person/year climbing registration is required for travel above 10,000 ft or on any glacier, and a separate wilderness permit is required for overnight camping.'
)
WHERE id = 'wa_little_tahoma_cowlitz_ingraham_glaciers';

-- =========================================================================
-- NOT fixed here (flagged for human review only — see audit log for detail):
--  - wa_little_mac_spire_southwest_route: fa "1969" and grade "II-III, 5.4"
--    are both already self-flagged in this row's own data_quality.gaps as
--    unconfirmed against a published source; this run's searches (Mountain
--    Project, SummitPost, CascadeClimbers) turned up general Southern Pickets
--    trip reports but nothing route-specific enough to confirm or refute
--    either value. Separately, this row's own "corrections" narrative field
--    contains a stale, self-contradictory note claiming the peak is "located
--    near Mac Peak in the Deception Lakes area" (Alpine Lakes Wilderness,
--    nowhere near the Southern Pickets) -- this contradicts the rest of the
--    row (and the area table: wa_little_mac_spire's parent is wa_picket_range
--    under wa_hwy20_ncnp, i.e. North Cascades NP, consistent with the
--    Goodell Creek/Terror Basin approach text). It reads like a leftover note
--    from an earlier, wrong research pass rather than a currently-served fact,
--    but a human should clean it out.
--  - wa_little_sister_west_face: fa "Darin Berdinka, June 21, 2013 (per
--    Mountain Project)" is broadly corroborated (Berdinka's 2013 Green Creek
--    Circuit first traverse did include a route up Little Sister's west side),
--    but sources found describe it as a "Northwest" line rather than
--    confirming the exact route name "West Face" -- not a clear enough
--    mismatch to call an error, but worth a human checking the live Mountain
--    Project listing directly.
--  - wa_little_sister_north_face / wa_little_sister_west_face: access.closures
--    cites a specific "FR 12 closing from MP 4.6 starting Aug 2026" -- plausible
--    (USFS has been progressively closing sections of the Middle Fork Nooksack
--    Rd/FR-12 for washouts in recent years) but this run could not
--    independently confirm that exact date/mile-marker with the Mount Baker
--    Ranger District; time-sensitive road status, left as-is.
--  - wa_little_tahoma_east_shoulder / wa_little_tahoma_cowlitz_ingraham_glaciers:
--    both routes' waypoints include a point at the identical rounded
--    coordinate (46.8884, -121.611) used for two different named features
--    (Summerland campsite at elev 5950 and the Fryingpan Creek/Summerland
--    Trailhead at elevFt 3816 on the East Shoulder route). Elevations and
--    descriptive notes are each individually correct, so this looks like a
--    coincidental rounding artifact rather than a wrong location, but a human
--    with a precise GPS track could tighten the trailhead coordinate to match
--    the route's own cited GPX start (46.887973, -121.610327) exactly.
-- =========================================================================

-- Verify afterward:
SELECT id, high_point_ft FROM routes WHERE id IN ('wa_lincoln_peak_north_ridge', 'wa_lincoln_peak_standard');

SELECT id, approach_logistics->>'trailhead' AS trailhead, approach_logistics->>'trailheadLat' AS trailhead_lat, approach_logistics->>'trailheadLng' AS trailhead_lng
FROM routes WHERE id = 'wa_little_tahoma_east_shoulder';

SELECT id, access->>'notes' AS access_notes FROM routes WHERE id = 'wa_little_tahoma_cowlitz_ingraham_glaciers';
