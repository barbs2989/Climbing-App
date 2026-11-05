-- WA alpine audit batch 340 (pass 6)
-- Routes: wa_mount_blum_north_ridge, wa_mount_buckindy_scramble (clean),
--         wa_mount_cameron_standard (clean), wa_mount_carrie_standard,
--         wa_mount_challenger_challenger_glacier, wa_mount_chaval_north_ridge (clean),
--         wa_mount_christie_west, wa_mount_claywood_standard

-- =========================================================================
-- Mount Blum, North Ridge -- wa_mount_blum_north_ridge
-- =========================================================================
-- road.status and access.closures both give the Baker Lake Road (FR-11) Shannon Creek
-- Bridge closure an end date of "end of August 2026." The USFS's own alert page
-- (fs.usda.gov/r06/mbs/alerts/baker-lake-road-fsr11-closure-shannon-creek-bridge, found via
-- WebSearch snippet -- the page itself is egress-blocked in this environment but its
-- content is indexed) states construction began ~July 15, 2026 and is "expected to reopen
-- Sept 11" 2026, not end of August. Independently re-confirmed by this run (not just the
-- research agent) via a direct WebSearch on the alert's own title.
UPDATE routes
SET road = jsonb_set(
  road,
  '{status}',
  '"Closed as of ~July 15, 2026 at Shannon Creek Bridge (~MP 23.8) through the Baker River Trailhead for bridge repair -- the Forest Service''s alert gives an expected reopening around September 11, 2026."'::jsonb
)
WHERE id = 'wa_mount_blum_north_ridge'
  AND road->>'status' = 'Closed as of ~July 15, 2026 at Shannon Creek Bridge (~MP 23.8) through the Baker River Trailhead for bridge repair, expected through end of August 2026.';

UPDATE routes
SET access = jsonb_set(
  access,
  '{closures}',
  '"Baker Lake Road (FR-11) closed at Shannon Creek Bridge from roughly mid-July 2026 through the Forest Service''s stated expected reopening of September 11, 2026."'::jsonb
)
WHERE id = 'wa_mount_blum_north_ridge'
  AND access->>'closures' = 'Baker Lake Road (FR-11) closed at Shannon Creek Bridge roughly mid-July-end of August 2026.';

-- =========================================================================
-- Mount Challenger, Challenger Glacier -- wa_mount_challenger_challenger_glacier
-- =========================================================================
-- The headline `grade` field ("Class 3-4, Glacier, 5.6-5.7") disagrees with this row's own
-- `rock_grade` ("5.5"), `pitch_detail[0].grade` ("5.5", "low-5.5 moves"), and
-- `itinerary.days[1].note` ("a short 5.5 rock pitch to the true summit") -- three separate
-- fields on the row already agree on 5.5, and Mountain Project's Challenger Glacier route
-- page (via WebSearch) also gives the summit pitch as 5.5. Two more fields repeat the
-- outlying 5.6-5.7 figure (hazards[2], waypoints[7].note) and are fixed to match.
UPDATE routes
SET grade = 'Class 3-4, Glacier, 5.5'
WHERE id = 'wa_mount_challenger_challenger_glacier'
  AND grade = 'Class 3-4, Glacier, 5.6-5.7';

UPDATE routes
SET hazards = jsonb_set(
  hazards,
  '{2}',
  '"exposed, sometimes loose 5.5 summit block (an alternate notch line has loose, chossy rock)"'::jsonb
)
WHERE id = 'wa_mount_challenger_challenger_glacier'
  AND hazards->>2 = 'exposed, sometimes loose 5.6-5.7 summit block (an alternate notch line has loose, chossy rock)';

UPDATE routes
SET waypoints = jsonb_set(
  waypoints,
  '{7,note}',
  '"3rd/4th-class scramble off the glacier exits onto a short 5.5 pitch to the true east summit -- descend by downclimbing to the notch and making a single rappel."'::jsonb
)
WHERE id = 'wa_mount_challenger_challenger_glacier'
  AND waypoints #>> '{7,name}' = 'Mount Challenger (East Summit)'
  AND waypoints #>> '{7,note}' LIKE '%5.6-5.7 pitch%';

-- =========================================================================
-- Mount Christie, North Couloir / Christie Glacier -- wa_mount_christie_west
-- =========================================================================
-- This row's own `high_point_ft` (6181) is the one that's RIGHT -- it matches Wikipedia's
-- Mount Christie elevation of 6,181 ft (NAVD88). The three other places the elevation is
-- repeated all say 6,182 instead: this route's own `overview` prose ("Mount Christie
-- (6,182 ft)"), its own `waypoints[7]` summit point, and the parent `areas` row. All three
-- fixed to 6181 to match the row's own authoritative field and Wikipedia.
UPDATE routes
SET overview = replace(overview, 'Mount Christie (6,182 ft)', 'Mount Christie (6,181 ft)')
WHERE id = 'wa_mount_christie_west'
  AND overview LIKE '%Mount Christie (6,182 ft)%';

UPDATE routes
SET waypoints = jsonb_set(waypoints, '{7,elev}', '6181'::jsonb)
WHERE id = 'wa_mount_christie_west'
  AND waypoints #>> '{7,name}' = 'Mount Christie Summit'
  AND waypoints #>> '{7,elev}' = '6182';

UPDATE areas
SET elevation_ft = 6181
WHERE id = 'wa_mount_christie'
  AND elevation_ft = 6182;

-- =========================================================================
-- Mount Claywood, Standard Route -- wa_mount_claywood_standard
-- =========================================================================
-- waypoints[4] "Cameron Pass" (47.9485, -123.2591) is roughly 9 miles northeast of the real
-- Cameron Pass -- this route's neighbor wa_mount_cameron_standard has its own "Cameron Pass
-- snow slopes" waypoint at (47.825718, -123.358249), immediately adjacent to the Mount
-- Cameron summit (47.825825, -123.33409, matching areas340's coordinate for the peak),
-- which is where Wikipedia places Cameron Pass. Claywood's coordinate instead sits close to
-- the shared Obstruction Point Trailhead, suggesting a copy/entry error. Elevation (6448)
-- already matches the sibling row and is left as is -- only lat/lng are wrong.
UPDATE routes
SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{4,lat}', '47.825718'::jsonb),
  '{4,lng}', '-123.358249'::jsonb
)
WHERE id = 'wa_mount_claywood_standard'
  AND waypoints #>> '{4,name}' = 'Cameron Pass'
  AND waypoints #>> '{4,lat}' = '47.9485'
  AND waypoints #>> '{4,lng}' = '-123.2591';

-- =========================================================================
-- Mount Carrie, Standard Route -- wa_mount_carrie_standard
-- =========================================================================
-- access.rules scopes the bear-canister requirement to "the Sol Duc/Seven Lakes Basin
-- zone," but Olympic National Park expanded Animal Resistant Food Container requirements
-- park-wide across all Olympic Wilderness (confirmed via WebSearch of NPS's own
-- wilderness-food-storage page and the PNT.org summary of the policy change) -- this row's
-- zone-specific framing is stale next to the sibling wa_mount_christie_west row, which
-- already states the park-wide rule correctly.
UPDATE routes
SET access = jsonb_set(
  access,
  '{rules}',
  '"Bear canisters (Animal Resistant Food Containers) are required for food storage park-wide across Olympic Wilderness, not just the Sol Duc/Seven Lakes Basin zone (free rentals at the Port Angeles or Quinault Wilderness Information Centers). Groups of 7 or more must use designated group campsites."'::jsonb
)
WHERE id = 'wa_mount_carrie_standard'
  AND access->>'rules' = 'Bear canisters are required for food storage in the Sol Duc/Seven Lakes Basin zone (free rentals at the Port Angeles or Quinault Wilderness Information Centers); groups of 7 or more must use designated group campsites.';

-- =========================================================================
-- NOT fixed here (flagged for human review -- see audit log for detail):
-- =========================================================================
-- wa_mount_challenger_challenger_glacier: access.closures correctly states Whatcom Camp is
-- closed (2022 Chilliwack Complex fire damage, still in effect per current search results),
-- but this route's own itinerary.days[0], bivy, and waypoints all plan/name an overnight at
-- "Whatcom Pass camp" with no caveat -- an internal contradiction between the closure note
-- and the prescribed plan. Not fixed: resolving it means substituting a real, currently-open
-- alternate camp/itinerary, which needs a human with current trip-report knowledge, not a
-- guess. Also flagged: waypoints[0] Hannegan Pass Trailhead (48.9101, -121.5927) vs
-- approach_logistics' trailhead coordinate (48.9105, -121.5894) differ by ~0.15 mi -- both
-- within plausible trailhead-parking tolerance, not treated as an error.
--
-- wa_mount_claywood_standard: `pitch_detail`/`obj_haz` name "Hayden Pass" as the route's
-- col (matching the real 1920 first-ascent account found via search), while `beta`,
-- `approach`, `waypoints`, and `descent_text` all instead describe "Lost Pass" (5,570 ft) --
-- the two names are never reconciled anywhere on the row and no source found ties one
-- unambiguously to the modern standard route. Also: 6 of 8 `bivy` entries (Royal Lake,
-- Upper Royal Basin, Camp Handy, Boulder Shelter, Home Lake, Cedar Lake) describe the
-- Upper Dungeness/Needles-cluster approach, a different trailhead/drainage than this
-- route's own Obstruction Point Road start -- each entry is internally accurate but not
-- relevant to this route (same regional-cluster copy-paste pattern flagged on
-- wa_mount_barnes_scramble in batch 339); only "Cameron Basin" and "Dose Meadows" actually
-- serve this route and Cameron's. Too tangled to safely partial-fix. `fa` "Philip Rogers
-- and Winona Bailey, August 3, 1920" -- the outing and general Hayden Pass route are
-- corroborated, but no source ties these two specific people or that exact date to
-- Claywood's ascent specifically. Grand Pass waypoint coordinates differ ~1 mi from the
-- sibling wa_mount_cameron_standard row's own Grand Pass waypoint, with no source to say
-- which is more accurate.
--
-- wa_mount_carrie_standard: this row's own `corrections` field already flags an unresolved
-- mismatch between where sources place the Carrie Glacier (NE cirque) and the SW-ridge/
-- Catwalk line the route actually follows -- left as is, no new source found to resolve it.
--
-- wa_mount_christie_west: headline `grade` ("Class 2-3") does not reflect the mandatory
-- "loose, chossy... Class 4" step below the high col that this row's own
-- `climbing_route`/`hazards`/`descent_text` describe -- no `alpine_grade` is set either, and
-- no authoritative source was found to state a corrected headline grade. Also:
-- `approach_variants[0].notes` itself flags that the route's own `_west` id/name doesn't
-- match its actual north-facing couloir/aspect -- an internal naming inconsistency, not
-- something this pass can source a fix for.
--
-- wa_mount_chaval_north_ridge: no guidebook or trip-report source was found describing this
-- specific line (only the standard West Route is documented) -- grade, FA, hazards, and the
-- approach road name (Grade Creek Rd FR #2642/#2643) are all unconfirmable either way.
--
-- wa_mount_buckindy_scramble, wa_mount_cameron_standard: checked clean. Buckindy's own
-- `data_quality.gaps` already documents the elevation range disagreement across public
-- sources (7,279-7,352 ft) and states why 7,320 ft was chosen -- nothing new to add.
