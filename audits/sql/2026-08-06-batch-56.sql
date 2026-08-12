-- WA alpine audit -- pass 2, batch 5 (batch #56 overall) -- 2026-08-06
-- Routes: wa_boving_christensen (Prusik Peak), wa_boving_roofs (South Early Winters Spire),
--         wa_buckner_mountain_north_face / _southwest_face (Buckner Mountain),
--         wa_burgundy_spire_north_face (Burgundy Spire), wa_burnt_boot_peak_north_ridge
--         (Burnt Boot Peak), wa_cardinal_peak_nw_couloir_north_ridge (Cardinal Peak),
--         wa_cascade_peak_east_ridge (Cascade Peak), wa_castle_peak_tatoosh_southeast_face
--         (The Castle, Tatoosh Range), wa_cathedral_peak_pasayten_se_buttress (Cathedral
--         Peak, Pasayten)
-- Researched via 9 parallel agents, one per peak. See audits/wa-alpine-audit-log.md for
-- the full writeup. Every confirmed fix's current value was re-verified against a fresh
-- full-row fetch of the live DB before this file was written. All WHERE clauses include
-- the current (wrong) value as a safety check per project convention. Burnt Boot Peak and
-- Cathedral Peak Pasayten audited fully clean this batch -- no statements below for them.

-- =========================================================================
-- Prusik Peak (wa_boving_christensen) -- fa gave no year ("year not given by
-- available sources"), but the route's own overview field already states
-- "put up by Paul Boving and Matt Christensen in 1977" -- fa just never
-- picked it up. Confirmed via StephAbegg trip report and a CascadeClimbers.com
-- forum thread independently corroborating 1977.
-- =========================================================================
UPDATE routes SET fa = 'Paul Boving and Matt Christensen, 1977.'
WHERE id = 'wa_boving_christensen' AND fa = 'Paul Boving and Matt Christensen (year not given by available sources).';

-- =========================================================================
-- South Early Winters Spire (wa_boving_roofs) -- the Blue Lake Trailhead
-- waypoint's elevation (5,200 ft) contradicts this same route's own
-- approach_logistics.trailheadDirection text, which already correctly says
-- 5,400 ft -- WTA and The Mountaineers both list the trailhead at 5,400 ft.
-- =========================================================================
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '5400', false)
WHERE id = 'wa_boving_roofs' AND waypoints->0->>'elev' = '5200';

-- =========================================================================
-- Buckner Mountain (wa_buckner_mountain_southwest_face) -- access.notes gives
-- the 2026 NPS early-access lottery window as "Mar 2-13," off by one day.
-- WTA, Campflare, and iHeartPNW (all citing the NPS release) agree the actual
-- window is March 3-14, 2026.
-- =========================================================================
UPDATE routes SET access = jsonb_set(access, '{notes}',
  '"60% of sites (Boston Basin/Eldorado/Sulphide Glacier/etc.) are reservable in advance via Recreation.gov (2026 lottery Mar 3–14); the remaining 40% are walk-up, obtained in person the day before at the Wilderness Information Center in Marblemount."'::jsonb)
WHERE id = 'wa_buckner_mountain_southwest_face'
  AND access->>'notes' = '60% of sites (Boston Basin/Eldorado/Sulphide Glacier/etc.) are reservable in advance via Recreation.gov (2026 lottery Mar 2–13); the remaining 40% are walk-up, obtained in person the day before at the Wilderness Information Center in Marblemount.';

-- =========================================================================
-- Burgundy Spire (wa_burgundy_spire, area row) -- blurb calls Burgundy Spire
-- "the highest and most technically involved of the four Wine Spires."
-- Mountaineers.org's Wine Spires page and SummitPost's Chianti Spire page
-- both corroborate that Pernod Spire is the tallest of the four, with
-- Burgundy and Chianti roughly equal in elevation just below it.
-- =========================================================================
UPDATE areas SET blurb = 'Burgundy Spire is one of the four Wine Spires (Burgundy, Chianti, Pernod, and Chablis) that crown Silver Star Mountain''s long north ridge above Washington Pass, with Paisano Pinnacle guarding the approach notch -- Pernod is the tallest of the group, with Burgundy and Chianti roughly equal in elevation just below it. Reached via a long, steep climber''s trail to 7,770-ft Burgundy Col, its North Face (5.8, III) is the standard route and a well-regarded North Cascades alpine-rock outing; harder buttress/face variations (Action Potential 5.10c, Ultramega OK 5.11a) also depart from the same col.'
WHERE id = 'wa_burgundy_spire' AND blurb = 'Burgundy Spire is the highest and most technically involved of the four Wine Spires (Burgundy, Chianti, Pernod, and Chablis) that crown Silver Star Mountain''s long north ridge above Washington Pass, with Paisano Pinnacle guarding the approach notch. Reached via a long, steep climber''s trail to 7,770-ft Burgundy Col, its North Face (5.8, III) is the standard route and a well-regarded North Cascades alpine-rock outing; harder buttress/face variations (Action Potential 5.10c, Ultramega OK 5.11a) also depart from the same col.';

-- =========================================================================
-- Cardinal Peak (wa_cardinal_peak, area row) -- region says "Entiat
-- Mountains," but Cardinal Peak is the highest point of the distinct
-- Chelan Mountains subrange (the two ranges only merge further north).
-- AAC Publications titles its report "Cardinal Peak, Chelan Range"; Wikipedia
-- states Cardinal Peak is the Chelan Mountains' highest peak. (blurb has the
-- same underlying mischaracterization -- Chelan Mountains described as a
-- "subpart" of Entiat Mountains -- left flagged for an editorial rewrite
-- rather than patched here; see log.)
-- =========================================================================
UPDATE areas SET region = 'Chelan Mountains'
WHERE id = 'wa_cardinal_peak' AND region = 'Entiat Mountains';

-- =========================================================================
-- Cascade Peak (wa_cascade_peak, area row) -- blurb has the west/east
-- relationship to Johannesburg Mountain backwards: it says Cascade Peak
-- "sits just 0.53 mi west-southwest of... Johannesburg Mountain," but per
-- Wikipedia, Johannesburg Mountain is the nearest higher peak and lies
-- 0.53 mi WSW *of Cascade Peak* -- i.e. Cascade Peak is ESE of Johannesburg,
-- not the reverse. (The route's own deeper route-identity question flagged
-- in pass 1 batch 4 is still open -- see log; not resolved by this fix.)
-- =========================================================================
UPDATE areas SET blurb = replace(blurb,
  'It sits just 0.53 mi west-southwest of 8,200+ ft Johannesburg Mountain across the Cascade-Johannesburg (C-J) col',
  'Johannesburg Mountain (8,200+ ft) lies just 0.53 mi west-southwest, across the Cascade-Johannesburg (C-J) col')
WHERE id = 'wa_cascade_peak'
  AND blurb LIKE '%It sits just 0.53 mi west-southwest of 8,200+ ft Johannesburg Mountain across the Cascade-Johannesburg (C-J) col%';

-- =========================================================================
-- The Castle / Tatoosh Range (wa_castle_peak_tatoosh, area row) -- prominence_ft
-- is 239, but Wikipedia and Peakbagger-derived summaries agree on 200 ft.
-- Elevation (6,440 ft) and coordinates already match the DB exactly.
-- =========================================================================
UPDATE areas SET prominence_ft = 200
WHERE id = 'wa_castle_peak_tatoosh' AND prominence_ft = 239;

-- =========================================================================
-- The Castle (wa_castle_peak_tatoosh_southeast_face) -- the summit waypoint's
-- elevFt (6,640) contradicts this same record's own area.elevation_ft /
-- high_point_ft (6,440), both of which match Wikipedia.
-- =========================================================================
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '6440', false)
WHERE id = 'wa_castle_peak_tatoosh_southeast_face' AND waypoints->1->>'elevFt' = '6640';

-- =========================================================================
-- The Castle (wa_castle_peak_tatoosh_southeast_face) -- access._raw is
-- leftover contamination from an unrelated North Cascades peak record
-- (references 8,343 ft, "USFS Okanogan-Wenatchee NF - north Cascades Ranger
-- District," and Pasayten-style access routes -- none of which exist near
-- the Tatoosh Range) and directly contradicts this same record's correct
-- access.landManager ("NPS - Mount Rainier NP") and 6,440 ft elevation.
-- Confirmed The Castle is NPS/Mount Rainier NP land, not USFS.
-- =========================================================================
UPDATE routes SET access = access - '_raw'
WHERE id = 'wa_castle_peak_tatoosh_southeast_face' AND access ? '_raw';

-- =========================================================================
-- The Castle (wa_castle_peak_tatoosh_southeast_face) -- road.name says
-- "Eagle Peak Trailhead, Longmire," a real but unrelated Longmire-area
-- trailhead. This record's own driveNote/approach/waypoints all correctly
-- describe the Reflection Lakes / Stevens Canyon Road (Pinnacle Peak
-- Trailhead) approach instead.
-- =========================================================================
UPDATE routes SET road = jsonb_set(road, '{name}', '"Pinnacle Peak Trailhead (Reflection Lakes, Stevens Canyon Road), Mount Rainier NP (Tatoosh Range access)"'::jsonb)
WHERE id = 'wa_castle_peak_tatoosh_southeast_face' AND road->>'name' = 'Eagle Peak Trailhead, Longmire, Mount Rainier NP (Tatoosh Range access)';

-- =========================================================================
-- The Castle (wa_castle_peak_tatoosh_southeast_face) -- approach_logistics
-- names "Snow Lake Trailhead" / "Unicorn Creek Basin," which is confirmed
-- (WTA/SummitPost/Willhite) as Unicorn Peak's approach -- a different Tatoosh
-- peak -- not Castle/Pinnacle's. Replaced with the Pinnacle Peak Trailhead
-- approach this record's own (correct) `approach` free-text field already
-- describes, using the record's own already-correct waypoint coordinates
-- for that same trailhead (46.7683, -121.73111) rather than the previous,
-- unverified 46.7678/-121.7076.
-- =========================================================================
UPDATE routes SET approach_logistics = '{"peakLat": 46.75745, "peakLng": -121.72859, "trailhead": "Pinnacle Peak Trailhead (Reflection Lakes, Stevens Canyon Road)", "trailheadLat": 46.7683, "trailheadLng": -121.73111, "trailheadDirection": "From the Pinnacle Peak Trailhead (Reflection Lakes, Stevens Canyon Road), hike the Pinnacle Peak Trail about 1.3 miles to the 5,920-ft saddle just south of Pinnacle Peak, then traverse climber''s-left (east) across Pinnacle''s south-facing scree/boulder field, staying around 6,000-6,200 ft, to the col between Pinnacle and Castle, and on to Castle''s south/southeast side."}'::jsonb
WHERE id = 'wa_castle_peak_tatoosh_southeast_face'
  AND approach_logistics = '{"peakLat": 46.75745, "peakLng": -121.72859, "trailhead": "Snow Lake Trailhead (Stevens Canyon Road, Mount Rainier NP)", "trailheadLat": 46.7678, "trailheadLng": -121.7076, "trailheadDirection": "From the Snow Lake Trailhead, follow the maintained Snow Lake Trail to its end, then leave the trail and climb talus slopes into Unicorn Creek Basin."}'::jsonb;

-- No confirmed errors on wa_buckner_mountain_north_face, wa_burnt_boot_peak_north_ridge,
-- or wa_cathedral_peak_pasayten_se_buttress this batch -- all audited clean against
-- external sources. See the log for fields flagged needs-human-verification
-- (unconfirmable or internally conflicting rather than confirmed-wrong) across this batch,
-- including a still-open route-identity question on Cascade Peak's East Ridge and a
-- possible group-size-limit error (6 vs 12) on both Buckner Mountain routes.
