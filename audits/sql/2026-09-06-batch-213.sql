-- Batch 213 (pass 4): wa_mount_rainier_emmons_glacier .. wa_mount_rainier_liberty_ridge
-- Verified against: this row's own internal waypoint/approach-text data (the primary
-- evidence for four of the six fixes below), cross-checked with WebSearch synthesis of
-- The Mountaineers' Paradise-area route reviews, WTA's Camp Muir page, and general trip
-- report / guide-service (RMI/Alpine Ascents) route-mileage figures for Mount Rainier's
-- Emmons-Winthrop, Ingraham Direct, Kautz Glacier, Fuhrer Finger and Liberty Ridge routes.
--
-- NOTE: string/jsonb literals below deliberately avoid embedded semicolons -- the
-- checker (scripts/check-sql-targets.mjs) splits statements on bare ";".

-- wa_mount_rainier_emmons_glacier: the `waypoints` entry "Glacier Basin Camp Site Area"
-- stores elev 6800, contradicting this same row's own `approach` text two sentences
-- earlier ("the Glacier Basin Trail climbs 3.5 miles ... to Glacier Basin Campground
-- (5,935 ft)"). WebSearch of WTA's route description independently confirms Glacier
-- Basin sits at 5,935 ft. Corrected the waypoint to match the row's own prose and the
-- external figure.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elev}', '5935'::jsonb)
WHERE id = 'wa_mount_rainier_emmons_glacier'
  AND waypoints->1->>'name' = 'Glacier Basin Camp Site Area'
  AND (waypoints->1->>'elev')::numeric = 6800;

-- wa_mount_rainier_ingraham_direct: dist_km stored as 6.8 km (4.2 mi one-way), but this
-- row's own `waypoints` array lists the Summit at distMi 8 (i.e. this route's own data
-- says the one-way distance is 8 miles). A route's own last waypoint cannot be farther
-- from the trailhead than the route's stated total length. 8 mi = 12.87 km, consistent
-- with WebSearch synthesis of The Mountaineers' Disappointment Cleaver route review
-- (which Ingraham Direct shares almost all of its approach with): "about 7.4 miles one
-- way with 9,000 ft elevation gain" -- also matching this row's own gain_ft (9000).
UPDATE routes
SET dist_km = 12.9
WHERE id = 'wa_mount_rainier_ingraham_direct'
  AND dist_km = 6.8
  AND waypoints->2->>'name' = 'Columbia Crest / SW Crater Rim'
  AND (waypoints->2->>'distMi')::numeric = 8;

-- wa_mount_rainier_kautz_glacier: the `waypoints` entry "Camp Hazard" stores elev 12500,
-- contradicting this same row's own `approach` text ("established high camps continue
-- at Camp Hazard (10,800 ft, at the base of the Turtle Snowfield ...)"). Corrected the
-- waypoint to match the row's own prose.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{3,elev}', '10800'::jsonb)
WHERE id = 'wa_mount_rainier_kautz_glacier'
  AND waypoints->3->>'name' = 'Camp Hazard'
  AND (waypoints->3->>'elev')::numeric = 12500;

-- wa_mount_rainier_kautz_glacier: dist_km stored as 19 km (11.8 mi one-way), but this
-- row's own `waypoints` array lists the Summit at distMi 13 (13 mi = 20.92 km).
-- Corrected to match the route's own stated one-way distance.
UPDATE routes
SET dist_km = 20.9
WHERE id = 'wa_mount_rainier_kautz_glacier'
  AND dist_km = 19
  AND waypoints->4->>'name' = 'Columbia Crest'
  AND (waypoints->4->>'distMi')::numeric = 13;

-- wa_mount_rainier_kautz_headwall: the `waypoints` trailhead entry is named "Paradise
-- (Skyline Trail)" but carries lat/lng (46.78669, -121.73454) copy-pasted verbatim from
-- the real Paradise trailhead (identical to this route's own Paradise Parking Area
-- coordinate used elsewhere in the catalog, e.g. wa_mount_rainier_kautz_glacier's
-- Trailhead) -- while its own `elev` (3600) and its own `note` field explicitly say
-- "Distinct from Paradise lot; route goes via Van Trump Park". Both the elevation and
-- the note describe the Comet Falls/Van Trump Park Trailhead this row's `approach` text
-- names as the alternative start; WebSearch of WTA's Comet Falls page gives that
-- trailhead's coordinates as 46.7790, -121.7823 at 3,650 ft, matching this row's stated
-- elevation almost exactly. Corrected the lat/lng/name to the real Comet Falls
-- Trailhead; elev/note/type were already correct and are unchanged.
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(
        jsonb_set(waypoints, '{0,lat}', '46.779'::jsonb),
        '{0,lng}', '-121.7823'::jsonb
      ),
      '{0,name}', '"Comet Falls Trailhead"'::jsonb
    )
WHERE id = 'wa_mount_rainier_kautz_headwall'
  AND waypoints->0->>'name' = 'Paradise (Skyline Trail)'
  AND (waypoints->0->>'lat')::numeric = 46.78669;

-- wa_mount_rainier_fuhrer_finger: dist_km stored as 24.94 km (15.5 mi one-way) --
-- longer one-way than every other route in this batch, including Emmons-Winthrop (a
-- much longer, more circuitous route via a different side of the mountain). This
-- contradicts WebSearch synthesis of multiple independent sources (Mazamas, Mountaineers)
-- describing Fuhrer Finger as "one of the shortest routes on Rainier" that "a very fast
-- party can climb ... in one day from Paradise", with one source giving "the loop is 14
-- miles" (round trip), i.e. ~7 mi one-way = 11.27 km. Corrected to that figure.
UPDATE routes
SET dist_km = 11.3
WHERE id = 'wa_mount_rainier_fuhrer_finger'
  AND dist_km = 24.94;

-- wa_mount_rainier_liberty_ridge: three of the five `waypoints` entries are wholesale
-- contamination from an entirely different, unrelated approach on the opposite
-- (northwest/west) side of the mountain: "Mowich Lake Camp" (near Mowich Lake, the
-- trailhead for the Mowich Face/Ptarmigan Ridge routes on Rainier's NW side), "Puyallup
-- Winthrop Junction Camp" and "Puyallup Glacier Serac Zone" (the Puyallup Glacier sits
-- on Rainier's west side, serving the Sunset Ridge/Mowich Face approaches). None of
-- these three names, nor "Puyallup", "Mowich", or any point on that side of the
-- mountain, appear anywhere in this row's own `approach`, `beta`, or `overview` text,
-- which instead describes (and only describes) the real Liberty Ridge approach: White
-- River Campground -> Glacier Basin Trail -> St. Elmo Pass -> lower Winthrop Glacier ->
-- Curtis Ridge -> Carbon Glacier -> ridge base. The distMi values on the contaminated
-- points are also geometrically impossible (e.g. "Mowich Lake Camp" at distMi 0.5,
-- though Mowich Lake sits roughly 13 km/8 mi from White River Campground by any path).
-- Removed the three contaminated waypoints rather than inventing replacement
-- coordinates for the real intermediate camps (St. Elmo Pass / Curtis Ridge / Carbon
-- Glacier base), which were not independently verified. Also corrected the trailhead's
-- own elev (4800 -> 4400 ft): WebSearch of multiple sources (Alpine Ascents, WTA-style
-- route descriptions) independently states White River Campground sits at 4,400 ft,
-- which is also the exact trailhead elevation implied by this row's own gain_ft (9708)
-- against its own Summit elevation (14112): 14112 - 9708 = 4404, matching 4,400 ft and
-- not the waypoint's stored 4,800 ft. The Summit waypoint's distMi (15) was cleared
-- (set to null) since it was computed along the now-removed, contaminated path and can
-- no longer be trusted as a distance figure for the real route.
UPDATE routes
SET waypoints = jsonb_build_array(
      jsonb_set(waypoints->0, '{elev}', '4400'::jsonb),
      jsonb_set(waypoints->4, '{distMi}', 'null'::jsonb)
    )
WHERE id = 'wa_mount_rainier_liberty_ridge'
  AND jsonb_array_length(waypoints) = 5
  AND waypoints->0->>'name' = 'White River Campground (Glacier Basin Trailhead)'
  AND waypoints->1->>'name' = 'Mowich Lake Camp'
  AND waypoints->2->>'name' = 'Puyallup Winthrop Junction Camp'
  AND waypoints->3->>'name' = 'Puyallup Glacier Serac Zone'
  AND waypoints->4->>'name' = 'Liberty Cap';
