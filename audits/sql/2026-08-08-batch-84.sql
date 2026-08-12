-- WA alpine audit -- batch 84 (pass 2) -- 2026-08-08
-- Routes: wa_mount_maude_r1, wa_mount_maude_r2, wa_mount_mystery_standard,
--         wa_mount_olympus_blue_glacier, wa_mount_olympus_west_ridge,
--         wa_mount_persis_the_hexorcist, wa_mount_persis_west_ridge,
--         wa_mount_pilchuck_east_ridge
-- Researched via 5 parallel agents grouped by peak.

-- wa_mount_maude_r1 (North Face): loss_ft (400) contradicted this same row's own
-- itinerary.days[0] (gainFt:6000, lossFt:6000 for a car-to-car loop back to the same
-- trailhead) and its own descent_text describing a return loop, not a one-way traverse.
-- Set to match the row's own gain_ft (already externally corroborated against AllTrails).
UPDATE routes SET loss_ft = 5580 WHERE id = 'wa_mount_maude_r1' AND loss_ft = 400;

-- wa_mount_maude_r1 (North Face): dist_km (6.4, i.e. 4 mi one-way per app convention)
-- undershoots the row's own waypoints (summit at distMi:8 one-way) and its own
-- itinerary.days[0].miles (14.3 mi round trip = 7.15 mi one-way), and AllTrails'
-- independently reported "Mount Maude via Phelps Creek Trail" (15.6 mi round trip =
-- 7.8 mi one-way = 12.55 km). 6.4 km looks like it was populated from a partial-approach
-- distance quoted in this row's own `approach` text rather than the full route length.
UPDATE routes SET dist_km = 12.5 WHERE id = 'wa_mount_maude_r1' AND dist_km = 6.4;

-- wa_mount_mystery_standard: itinerary.days[0].gainFt (3300) + days[1].gainFt (3600) sum to
-- 6900, contradicting this row's own top-level gain_ft (6700) and its own itinerary.sourceNote
-- citing a trailcatjim.com trip report for "23 mi/6,700 ft total." Mountaineers.org
-- independently confirms the Upper-Royal-Basin-to-summit leg (days[1]) at 3,600 ft, so the
-- error is in days[0]; corrected to 3100 so the gain total reconciles to 6700.
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,0,gainFt}', '3100')
WHERE id = 'wa_mount_mystery_standard' AND (itinerary->'days'->0->>'gainFt')::int = 3300;

-- Mirror fix on the return leg: days[1].lossFt (3600) + days[2].lossFt (3300) also sum to
-- 6900 against the same 6700 total; corrected days[2] to 3100 to match.
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,2,lossFt}', '3100')
WHERE id = 'wa_mount_mystery_standard' AND (itinerary->'days'->2->>'lossFt')::int = 3300;

-- wa_mount_mystery_standard: waypoints[1] ("Royal Basin Trail junction," distMi:1) has
-- elev:1900, a 700 ft drop from the 2600 ft trailhead in the first mile -- but every
-- surrounding waypoint ascends (2600 -> 3500 -> 5100 -> 6560...), and WTA's own Royal
-- Basin trail description states the first mile "gains a gentle 300 feet."
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elev}', '2900')
WHERE id = 'wa_mount_mystery_standard'
  AND waypoints->1->>'name' = 'Royal Basin Trail junction'
  AND (waypoints->1->>'elev')::int = 1900;

-- wa_mount_olympus_blue_glacier: road.status says the Upper Hoh Road "reopened it in May
-- 2026" after its Dec 2024 storm-damage closure. The actual reopening was May 8, 2025
-- (KOMO News, Washington State Standard, Peninsula Daily News), and this row's own sibling
-- route (wa_mount_olympus_west_ridge.road.status) already correctly says "restored as of
-- May 8, 2025."
UPDATE routes SET road = jsonb_set(road, '{status}',
  to_jsonb(replace(road->>'status', 'reopened it in May 2026', 'reopened it in May 2025')))
WHERE id = 'wa_mount_olympus_blue_glacier' AND road->>'status' LIKE '%reopened it in May 2026%';

-- wa_mount_olympus_blue_glacier: access.notes reads "Northwest Forest Pass required...
-- Mount Tom area, North Cascades" -- contaminated from an unrelated USFS peak/region. Olympus
-- is NPS-managed Olympic National Park; the correct entrance-fee/interagency-pass info is
-- already present in this same row's access.fees/parking_pass/passRequired fields.
UPDATE routes SET access = jsonb_set(access, '{notes}',
  '"No specific climbing permit beyond the standard NPS entrance fee and wilderness permit already listed above."')
WHERE id = 'wa_mount_olympus_blue_glacier'
  AND access->>'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit. Mount Tom area, North Cascades.';

-- wa_mount_olympus_blue_glacier: waypoints array had the Summit (distMi:22) at index 1,
-- before Glacier Meadows (distMi:17.5) at index 2 -- objectively out of ascending distMi
-- order (trailhead 0 -> Glacier Meadows 17.5 -> Snow Dome -> summit 22).
UPDATE routes SET waypoints = jsonb_build_array(waypoints->0, waypoints->2, waypoints->3, waypoints->1)
WHERE id = 'wa_mount_olympus_blue_glacier'
  AND waypoints->1->>'name' = 'Mount Olympus (West Peak)'
  AND jsonb_array_length(waypoints) = 4;

-- wa_mount_olympus_blue_glacier: length_m (122 = 400 ft) for a 1-pitch route contradicts
-- three of this same row's own fields describing the summit pitch as ~70-100 ft: rappels
-- ("~70 ft"), detailed_rack ("~100 ft summit pitch"), and pitch_detail[0] ("~100 ft
-- summit-pyramid pitch"). Corrected to the pitch_detail figure (~100 ft = ~30 m).
UPDATE routes SET length_m = 30 WHERE id = 'wa_mount_olympus_blue_glacier' AND length_m = 122;

-- wa_mount_olympus_west_ridge: length_m (543 = 1,781 ft) for a 7-pitch route contradicts the
-- sum of this row's own pitch_detail[].lengthM (35+20+30+25+20+25+30 = 185 m) and its own
-- descent_text ("the ridge itself gains roughly 600 ft over 7 pitches" = ~183 m). Corrected
-- to 185 to match both internal sources.
UPDATE routes SET length_m = 185 WHERE id = 'wa_mount_olympus_west_ridge' AND length_m = 543;

-- wa_mount_olympus_blue_glacier / wa_mount_olympus_west_ridge: dist_km (28, i.e. a 56 km /
-- 34.8 mi round trip per app convention) is well short of each route's own day-by-day
-- itinerary, which sums to 41.6 mi (Blue Glacier) / 42.6 mi (West Ridge) round trip --
-- matching each route's own itinerary.totalNote ("~41-44 mi"). 28 km is in fact just the
-- one-way distance to Glacier Meadows base camp (17.4 mi, matching the 17.5 mi waypoint);
-- the summit push beyond camp was never added in. Corrected to each route's own
-- itinerary-derived one-way distance.
UPDATE routes SET dist_km = 33.5 WHERE id = 'wa_mount_olympus_blue_glacier' AND dist_km = 28;
UPDATE routes SET dist_km = 34.3 WHERE id = 'wa_mount_olympus_west_ridge' AND dist_km = 28;

-- wa_mount_persis (area): prominence_ft (599) contradicted by Wikipedia, Peakbagger.com, and
-- Wikidata (Q49054004), which all independently converge on 544 ft (170 m) with parent peak
-- Mount Index. elevation_ft (5464) and lat/lng were separately verified correct.
UPDATE areas SET prominence_ft = 544 WHERE id = 'wa_mount_persis' AND prominence_ft = 599;

-- wa_mount_pilchuck_east_ridge: permit field said a Discover Pass is required, but this
-- route's own trailhead (Pinnacle Lake TH via FR 4020/4021) is Mt. Baker-Snoqualmie National
-- Forest land, not Mount Pilchuck State Park -- a Discover Pass is not valid at USFS fee
-- sites. This same row's own access.fees and access.passRequired fields already correctly
-- state a Northwest Forest Pass / interagency pass is needed; only the top-level `permit`
-- field disagreed with its own access sub-object.
UPDATE routes SET permit = 'No climbing permit. A Northwest Forest Pass (or America the Beautiful interagency pass) is required to park at the Pinnacle Lake Trailhead.'
WHERE id = 'wa_mount_pilchuck_east_ridge'
  AND permit LIKE '%Discover Pass is required to park on Washington State lands%';
