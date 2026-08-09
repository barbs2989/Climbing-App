-- WA alpine audit -- batch 85 (pass 2) -- 2026-08-09
-- Routes: wa_mount_pilchuck_standard_route, wa_mount_price_hester_lake_route,
--         wa_mount_rahm_standard, wa_mount_rainier_curtis_ridge,
--         wa_mount_rainier_disappointment_cleaver, wa_mount_rainier_edmunds_headwall,
--         wa_mount_rainier_emmons_glacier, wa_mount_rainier_fuhrer_finger
-- Researched via 4 parallel agents grouped by peak (Pilchuck; Price+Rahm; Rainier x3; Rainier x2).

-- wa_mount_pilchuck_standard_route: permit field said a Discover Pass is required, but the
-- trailhead (FR 42) is Mt. Baker-Snoqualmie National Forest land, not Mount Pilchuck State
-- Park -- a Discover Pass is not valid at USFS fee sites (mtsgreenway.org; USFS trailhead
-- page). Same defect already fixed on this peak's East Ridge route in batch 84; this row's
-- own access.fees/passRequired/what_to_bring fields already correctly say Northwest Forest
-- Pass -- only the top-level `permit` field disagreed with its own access sub-object.
UPDATE routes SET permit = 'No climbing permit; a Northwest Forest Pass (or America the Beautiful interagency pass) is required to park at the FR 42 trailhead.'
WHERE id = 'wa_mount_pilchuck_standard_route'
  AND permit = 'No climbing permit; a Discover Pass is required to park on Washington State lands.';

-- wa_mount_pilchuck_standard_route: length_m (21) is off by ~200x against this row's own
-- dist_km (4.3, i.e. 4,300 m one-way), which matches WTA's independently reported 2.7 mi.
UPDATE routes SET length_m = 4300 WHERE id = 'wa_mount_pilchuck_standard_route' AND length_m = 21;

-- wa_mount_rahm (area): lat/lng (48.997115, -121.228755) sits ~150-170 m from the summit
-- coordinate given by Wikipedia/GNIS (48°59'51"N 121°13'51"W = 48.99750, -121.23083), which
-- this same route's own waypoints array already has correct for "Mount Rahm summit" --
-- only the area record's lat/lng was off.
UPDATE areas SET lat = 48.99750, lng = -121.23083
WHERE id = 'wa_mount_rahm' AND lat = 48.997115 AND lng = -121.228755;

-- wa_mount_rainier_curtis_ridge: gain_ft (7000) / loss_ft (9500) contradict this row's own
-- itinerary.days, which sum to gainFt 3600+5900=9500 and lossFt 4900+4400=9300 -- and the
-- itinerary's own totalNote already states "~9,500 ft gain". Looks like gain_ft/loss_ft were
-- transposed and loss_ft additionally drifted; corrected to match the itinerary sums.
UPDATE routes SET gain_ft = 9500 WHERE id = 'wa_mount_rainier_curtis_ridge' AND gain_ft = 7000;
UPDATE routes SET loss_ft = 9300 WHERE id = 'wa_mount_rainier_curtis_ridge' AND loss_ft = 9500;

-- wa_mount_rainier_curtis_ridge: dist_km (29.77, i.e. ~59.5 km / 37 mi round trip once the
-- app doubles it) is roughly double this row's own itinerary.days miles (6.5+5+5.5 = 17 mi
-- round trip = ~8.5 mi / 13.7 km one-way). Corrected to the one-way figure per app convention.
UPDATE routes SET dist_km = 13.7 WHERE id = 'wa_mount_rainier_curtis_ridge' AND dist_km = 29.77;

-- wa_mount_rainier_curtis_ridge: gpx track sits at lat ~47.44-47.48N / lng ~-121.74 to -121.77
-- -- roughly 40+ miles north of Rainier (near North Bend/Mt Si), contradicting this row's own
-- waypoints (46.85-46.90N) and its own data_quality.gaps entry stating "No public GPS track
-- found for this route." Contaminated track data cleared rather than left in place; no
-- correct track is available to substitute.
UPDATE routes SET gpx = NULL
WHERE id = 'wa_mount_rainier_curtis_ridge'
  AND gpx = '[[47.4405, -121.77], [47.452, -121.765], [47.47, -121.75], [47.48, -121.74], [47.4405, -121.77]]'::jsonb;

-- wa_mount_rainier_edmunds_headwall: waypoints[0] ("West Side Road gate / Dry Creek
-- Trailhead", approach via Westside Rd -> South Puyallup Trail -> Wonderland Trail) belongs
-- to a different route (west-side lines like Tahoma Glacier/Sunset Amphitheater), not Edmunds
-- Headwall. This same row's own `approach` text ("From Mowich Lake..."), `road` field
-- (Mowich Lake Road as primary access), and `approach_logistics` (Mowich Lake Trailhead,
-- 46.9336/-121.8654) all independently agree on Mowich Lake -- confirmed by wildsnow.com and
-- turns-all-year.com ski-descent trip reports. Corrected to match this row's own
-- approach_logistics; elevFt dropped rather than guessed since no verified figure was found
-- for the Mowich Lake trailhead itself.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0}',
  '{"lat":46.9336,"lng":-121.8654,"name":"Mowich Lake Trailhead","type":"Trailhead","note":"From Mowich Lake, traverse to the Edmunds / South Mowich Glaciers and the base of the headwall."}'::jsonb)
WHERE id = 'wa_mount_rainier_edmunds_headwall'
  AND waypoints->0->>'name' = 'West Side Road gate / Dry Creek Trailhead';

-- wa_mount_rainier_emmons_glacier: waypoints[1] ("Glacier Basin Camp Site Area") elev (6800)
-- contradicts this row's own `approach` text, which states Glacier Basin Campground sits at
-- 5,935 ft -- a figure independently matching WTA/Mountaineers.org route descriptions.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elev}', '5935')
WHERE id = 'wa_mount_rainier_emmons_glacier'
  AND waypoints->1->>'name' = 'Glacier Basin Camp Site Area'
  AND (waypoints->1->>'elev')::int = 6800;

-- wa_mount_rainier_emmons_glacier: trailhead elevation given three different values in this
-- same row -- waypoints[0].elev 4600, approach text "White River Campground (4,400 ft)",
-- road.driveNote "White River Campground at 4,260 ft." WTA and independent trip reports
-- consistently cite ~4,400 ft, matching the approach text; corrected the other two to agree.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '4400')
WHERE id = 'wa_mount_rainier_emmons_glacier'
  AND waypoints->0->>'name' = 'Glacier Basin Parking Area'
  AND (waypoints->0->>'elev')::int = 4600;

UPDATE routes SET road = jsonb_set(road, '{driveNote}',
  '"Access via SR 410 to the White River entrance; road to White River Campground at 4,400 ft."')
WHERE id = 'wa_mount_rainier_emmons_glacier'
  AND road->>'driveNote' = 'Access via SR 410 to the White River entrance; road to White River Campground at 4,260 ft.';

-- wa_mount_rainier_fuhrer_finger: fa omits a member of the first-ascent party. SummitPost's
-- and Mountainproject's Fuhrer Finger pages independently corroborate a five-person party
-- (Hans Fuhrer, Peyton Farrer, Joseph Hazard, Heinie Fuhrer, Thomas Hermans); the stored value
-- had only four names, missing Peyton Farrer.
UPDATE routes SET fa = 'Hans Fuhrer, Peyton Farrer, Joseph Hazard, Heinie Fuhrer, and Thomas Hermans, July 2, 1920'
WHERE id = 'wa_mount_rainier_fuhrer_finger'
  AND fa = 'Hans Fuhrer, Heine Fuhrer, Joseph Hazard, and Thomas Hermans, July 2, 1920';

-- wa_mount_rainier_fuhrer_finger: approach text states Camp Muir is at "10,080 ft," but
-- Wikipedia, AllTrails, and WTA all independently cite 10,188 ft.
UPDATE routes SET approach = replace(approach, 'Camp Muir (10,080 ft)', 'Camp Muir (10,188 ft)')
WHERE id = 'wa_mount_rainier_fuhrer_finger'
  AND approach LIKE '%Camp Muir (10,080 ft)%';
