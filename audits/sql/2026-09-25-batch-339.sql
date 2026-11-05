-- WA alpine audit batch 339 (pass 6)
-- Routes: wa_mount_baker_boulder_park_cleaver, wa_mount_baker_cockscomb_ridge,
--         wa_mount_baker_coleman_deming, wa_mount_baker_coleman_headwall (clean),
--         wa_mount_baker_easton_glacier, wa_mount_barnes_scramble,
--         wa_mount_berge_east_ridge, wa_mount_bigelow_tribute_to_richard

-- =========================================================================
-- Mount Baker, Cockscomb Ridge -- wa_mount_baker_cockscomb_ridge
-- =========================================================================
-- Trailhead contamination, same pattern as batch 325's Glacier Peak fix: this row's
-- `road` and waypoints[1]-[3] all describe the real approach (Glacier Creek Road/FR-39 to
-- the Heliotrope Ridge Trailhead, then Heliotrope Ridge Camp -> Cockscomb Ridge
-- Base/Roosevelt Glacier junction -> Cockscomb Tower -> summit -- a smooth, monotonic
-- lat/lng progression toward the summit), but waypoints[0] and `approach_logistics`
-- instead name Artist Point / the Ptarmigan Ridge Trailhead (48.8465, -121.6927) -- a
-- real Baker trailhead, but for the mountain's EAST side (Park Glacier/Ptarmigan Ridge
-- country), roughly 13 km from Heliotrope Ridge Camp and on the wrong side of the
-- summit's own longitude to connect to it. Swapping waypoints[0] for the Heliotrope Ridge
-- Trailhead restores a monotonic lat/lng chain from trailhead to summit; the corrected
-- coordinates and elevation range are taken directly from this route's own sibling
-- wa_mount_baker_coleman_headwall, which shares the identical Heliotrope Ridge Trailhead
-- (confirmed via the AAJ first-ascent account and Mountain Project, both of which put
-- Cockscomb Ridge's approach via Heliotrope Ridge / the Coleman-Roosevelt col, not Artist
-- Point).
--
-- `road.status`/`driveNote` also still describe the FR-39/Glacier Creek Road washout as
-- an open, in-progress closure ("Repairs scheduled to begin after July 15, 2026,
-- targeting reopening by late September 2026"). The sibling wa_mount_baker_coleman_headwall
-- row already carries the corrected text: the U.S. Forest Service announced on 20 August
-- 2026 that repairs were complete and the road is open to the trailhead again (Cascadia
-- Daily News, 2026-08-20; also reported by Whatcom News and the Spokesman-Review).
-- Updated to match.
UPDATE routes
SET waypoints = jsonb_set(
  waypoints,
  '{0}',
  '{"lat": 48.80201, "lng": -121.89597, "elev": 3437, "name": "Heliotrope Ridge Trailhead", "type": "Trailhead", "distMi": 0, "directions": "The trailhead sits at roughly 3,400 to 3,700 ft on Glacier Creek Road 39. Check the road status before committing -- a past washout has required parties to add extra miles on foot or bike before reaching the sign-in kiosk."}'::jsonb
)
WHERE id = 'wa_mount_baker_cockscomb_ridge'
  AND waypoints #>> '{0,name}' = 'Artist Point (Ptarmigan Ridge Trailhead)';

UPDATE routes
SET approach_logistics = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(approach_logistics, '{trailhead}', '"Heliotrope Ridge Trailhead (Trail #677, FR-39)"'::jsonb),
      '{trailheadLat}', '48.80201'::jsonb
    ),
    '{trailheadLng}', '-121.89597'::jsonb
  ),
  '{trailheadDirection}', '"From the Heliotrope Ridge Trailhead on Glacier Creek Road FR-39 (~3,700 ft), via Trail #677"'::jsonb
)
WHERE id = 'wa_mount_baker_cockscomb_ridge'
  AND approach_logistics->>'trailhead' = 'Artist Point (Ptarmigan Ridge Trailhead)';

UPDATE routes
SET road = '{
  "name": "Glacier Creek Road (FR 39) to Heliotrope Ridge Trailhead",
  "status": "Washed out roughly 5 miles below the trailhead by the December 2025 flood -- the Forest Service announced on 20 August 2026 that repairs are complete and vehicles can again reach the Heliotrope Ridge trailhead.",
  "driveNote": "While the washout was open the road was passable beyond it only on foot or bike, adding about 9 miles and 2,000 ft round trip -- that closure was lifted on 20 August 2026."
}'::jsonb
WHERE id = 'wa_mount_baker_cockscomb_ridge'
  AND road->>'status' LIKE 'Closed to vehicles at the Glacier Creek bridge (~MP 3.0)%';

-- =========================================================================
-- Mount Baker, Coleman-Deming Glacier -- wa_mount_baker_coleman_deming
-- =========================================================================
-- Same stale Glacier Creek Road washout narrative as Cockscomb Ridge above, in three
-- separate fields on this row. The sibling wa_mount_baker_coleman_headwall route (same
-- trailhead) already carries the corrected text confirming the FS's 20 August 2026
-- reopening announcement (Cascadia Daily News, Whatcom News, Spokesman-Review).
UPDATE routes
SET road = '{
  "name": "Glacier Creek Road (FR 39) to Heliotrope Ridge Trailhead",
  "status": "Washed out roughly 5 miles below the trailhead by the December 2025 flood (a repeat of a 2021 washout) -- the Forest Service announced on 20 August 2026 that repairs are complete and vehicles can again reach the Heliotrope Ridge trailhead.",
  "driveNote": "While the washout was open the road was passable beyond it only on foot or bike, adding about 9 miles and 2,000 ft round trip to this already-popular route -- that closure was lifted on 20 August 2026.",
  "seasonalGate": "When intact, typically drivable late May through October."
}'::jsonb
WHERE id = 'wa_mount_baker_coleman_deming'
  AND road->>'status' LIKE 'Closed to vehicles at the Glacier Creek bridge (roughly MP 3.0%';

UPDATE routes
SET approach_logistics = jsonb_set(
  approach_logistics,
  '{seasonalNotes}',
  '"Open May-Sep -- FS 39 reopened to vehicles 20 August 2026 after washout repairs"'::jsonb
)
WHERE id = 'wa_mount_baker_coleman_deming'
  AND approach_logistics->>'seasonalNotes' = 'Open May-Sep; FS 39 closed to vehicles through Oct 2026 (washouts); pedestrians OK';

UPDATE routes
SET waypoints = jsonb_set(
  waypoints,
  '{0,directions}',
  '"From the Mount Baker Highway (SR 542), turn onto Glacier Creek Road (FS 39) and follow it to the Heliotrope Ridge trailhead for Trail #677, at roughly 3,700 ft. The road was closed to vehicles by a December 2025 washout but the Forest Service reopened it on 20 August 2026. When it is drivable, parking is limited and fills at weekends, and costs $5 a day or $30 for an annual pass. The wilderness permit is free and self-issued. Glacier is the nearest supplies at 12 miles, with fuel in Maple Falls at 20 miles."'::jsonb
)
WHERE id = 'wa_mount_baker_coleman_deming'
  AND waypoints #>> '{0,directions}' LIKE '%FS 39 is closed to vehicles through October 2026 after washouts%';

-- =========================================================================
-- Mount Baker, Boulder-Park Cleaver -- wa_mount_baker_boulder_park_cleaver
-- =========================================================================
-- waypoints[1] ("High Camp below Boulder-Park Cleaver", 48.79/-121.84/8000 ft) and the
-- 3-point `gpx` line built around it place the camp northwest of the summit (-121.8145),
-- on the opposite side of the mountain from both this route's own trailhead (Boulder
-- Ridge, 48.735/-121.710, on the east side) and the Boulder/Park glaciers the camp is
-- named for (roughly 48.77-48.79/-121.80, per Wikipedia's Boulder Glacier and Park
-- Glacier coordinates) -- a route between two east-side glaciers has no reason to swing
-- 11+ km northwest before returning to the summit. Removed rather than replaced: there is
-- no record on this row of the camp's real position, and inventing one would mean
-- fabricating a coordinate. The trailhead and summit waypoints, which are consistent with
-- the sibling wa_mount_baker_boulder_glacier route sharing the same trailhead, are
-- untouched.
UPDATE routes
SET waypoints = (
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(waypoints) elem
  WHERE elem->>'name' != 'High Camp below Boulder-Park Cleaver'
),
    gpx = NULL
WHERE id = 'wa_mount_baker_boulder_park_cleaver'
  AND waypoints @> '[{"name": "High Camp below Boulder-Park Cleaver", "lat": 48.79, "lng": -121.84}]'::jsonb
  AND gpx = '[[48.805, -121.85], [48.79, -121.84], [48.777, -121.813]]'::jsonb;

-- =========================================================================
-- Mount Baker, Easton Glacier -- wa_mount_baker_easton_glacier
-- =========================================================================
-- waypoints[1] ("Sandy Camp / Railroad Grade Camp", 48.7985/-121.88/5900 ft) sits 5.2 km
-- from the nearest point on this route's own 795-point `gpx` track (which runs
-- 48.705-48.777 N, -121.812 to roughly -121.84 W -- the south-side Railroad Grade), and
-- west of the north-side Heliotrope Ridge routes' territory instead. Removed rather than
-- replaced, same reasoning as the Boulder-Park Cleaver fix above: this row has no record
-- of the camp's real position along its own gpx track. Trailhead and summit waypoints,
-- consistent with the route's own gpx track, are untouched.
UPDATE routes
SET waypoints = (
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(waypoints) elem
  WHERE elem->>'name' != 'Sandy Camp / Railroad Grade Camp'
)
WHERE id = 'wa_mount_baker_easton_glacier'
  AND waypoints @> '[{"name": "Sandy Camp / Railroad Grade Camp", "lat": 48.7985, "lng": -121.88}]'::jsonb;

-- =========================================================================
-- NOT fixed here (flagged for human review -- see audit log for detail):
-- =========================================================================
-- wa_mount_baker_coleman_headwall: waypoints[0].elev (3437) and approach_logistics'
-- "~3,700 ft" both fall inside this row's own waypoints[0].directions range ("roughly
-- 3,400 to 3,700 ft") -- internally consistent, not an error. (An earlier pass of this
-- audit flagged 3437 vs "should be 3700" from a web-search snippet; that snippet
-- conflicted with a second search giving 4,978-5,899 ft for the same trailhead, and
-- fs.usda.gov itself is blocked by this environment's egress proxy, so neither number is
-- independently confirmable -- this row's own internally-consistent range is left as is.)
-- Also flagged, not fixed: `alpine_grade` "Grade IV" vs this row's own `grade` "III+".
--
-- wa_mount_baker_cockscomb_ridge: waypoints[2]/[3] ("Cockscomb Ridge Base", "Cockscomb
-- Tower") were NOT touched -- unlike waypoints[0], they form a geometrically consistent
-- chain with the corrected trailhead and the summit, so the possible small position error
-- a prior pass of this audit raised (relative to the Roosevelt Glacier's own Wikipedia
-- coordinate) needs a map to resolve, not a database fix. Also: `fa` "Joe Morovits and
-- party, July 2, 1894" is unconfirmed (only source found credits Morovits with a solo
-- Park Glacier Headwall ascent in 1892); `commitment` "I" contradicts `alpine_grade`
-- "Grade II"; `descent` sends parties out via Ptarmigan Ridge/Artist Point while Mountain
-- Project describes a Coleman-Deming descent -- all need a human with a guidebook.
--
-- wa_mount_baker_boulder_park_cleaver: `fa` "Joe Morovits and party, July 2, 1894" is
-- unconfirmed, same caveat as Cockscomb Ridge above; `commitment` "I" contradicts
-- `alpine_grade` "Grade II".
--
-- wa_mount_baker_easton_glacier: `alpine_grade` "Grade I" contradicts this row's own
-- `grade` "Grade II glacier climb".
--
-- wa_mount_barnes_scramble (Elwha Basin Scramble): this route's own fields disagree with
-- each other about which trailhead it starts from -- `gpx` is the Elwha River trail from
-- Whiskey Bend and never comes within 6.4 km of the summit, while `waypoints`,
-- `approach_logistics`, `beta`, and `pitch_detail` all describe a Sol Duc/Heart
-- Lake/High Divide approach, and `bivy` lists Graves Creek/Enchanted Valley camps that
-- belong to neither. waypoints[3] "The Catwalk (Cat Peak-Mt. Carrie arete)" also breaks
-- the route's own distMi ordering: at distMi 12 it sits WEST of the distMi-7.85 Heart
-- Lake waypoint, when the route is otherwise heading east toward the summit. This is too
-- large and tangled a contamination to safely partial-fix (unlike the single wrong
-- waypoints above) without a human deciding which of the two approaches the row's other
-- prose fields (permit, hazards, itinerary, access) actually belong to. `high_point_ft`
-- 5987 and the summit waypoint's own coordinates are correct (Wikipedia). Also flagged:
-- `access.closures`/`road.driveNote` date the Olympic Hot Springs Road washout to
-- "since Sept 2024"; sources found describe repeated washouts since 2015/2017, so the
-- 2024 date may be a misread "as of" date, but the NPS page itself is blocked by this
-- environment's egress proxy and could not be read directly.
--
-- wa_mount_berge_east_ridge: `high_point_ft` 7948 (matching the parent area row) is
-- contradicted by conflicting outside figures (Wikipedia/ListsOfJohn ~7951, a WTA trip
-- report ~7953) with no way to tell which source Beckey's guide or the USGS map would
-- back -- flagged, not fixed, per this audit's rule against guessing when sources
-- disagree.
--
-- wa_mount_bigelow_tribute_to_richard: `beta` states "No pitch count, protection
-- details, or topo are available", which contradicts this row's own detailed 4-entry
-- `pitch_detail` -- flagged since the first-ascent trip report could not be read directly
-- (cascadeclimbers.com blocked by this environment's egress proxy) to resolve which field
-- is right. Also: the Upper Eagle Lake junction distance (this row: ~5.9 mi) vs. Forest
-- Service (5.7 mi) vs. WTA (6.3 mi) is a small, three-way disagreement, not fixed.
-- `access.passRequired`/`access.fees` are null though the Forest Service names an
-- accepted pass at this trailhead -- a missing value, not a wrong one, left for a human
-- to fill in rather than guess the exact wording.
