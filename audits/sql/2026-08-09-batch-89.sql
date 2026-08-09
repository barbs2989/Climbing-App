-- WA alpine audit -- batch 89 (pass 2) -- 2026-08-09
-- Routes: wa_mount_shuksan_price_glacier, wa_mount_shuksan_sulphide_glacier,
--         wa_mount_shuksan_white_salmon_glacier, wa_mount_spickard_silver_glacier,
--         wa_mount_spickard_southwest, wa_mount_st_helens_monitor_ridge,
--         wa_mount_st_helens_worm_flows, wa_mount_steel_first_divide
-- Researched via 4 parallel agents grouped by peak (Shuksan x3; Spickard x2; St Helens x2;
-- Steel x1). WebFetch was blocked by the network egress proxy for every domain tried again this
-- run; findings lean on cross-corroborated WebSearch snippets citing WTA, USFS, NPS, Mount St.
-- Helens Institute, USGS CVO, Mountaineers.org, SummitPost, Wikipedia/USGS GNIS, trailcatjim.com,
-- havetent.com and similar trip-report sites, same standard as prior batches.
-- Silver Glacier (Spickard): no confirmed errors -- only a length_m/pitch-distance semantics
-- question, flagged below, not fixed here.

-- wa_mount_shuksan_price_glacier: descent described down-climbing the Price Glacier itself
-- ("retrace ascent route via ice climbing down the 40-50 degree slopes"), contradicting this same
-- row's own descent_text ("The standard descent is NOT back to the Ruth Creek car...") and
-- pro_tips ("Descend the Sulphide or Fisher Chimneys, never reverse the Price"). Pure internal
-- self-contradiction -- rewritten to summarize the route's own documented descent.
UPDATE routes SET descent = 'After summiting, downclimb/rappel the gully system off the pyramid''s west side onto Hell''s Highway, cross the Upper Curtis Glacier, and downclimb (or rappel, if icy) Winnie''s Slide to the top of the Fisher Chimneys, then descend the Chimneys to Lake Ann and out the Lake Ann Trail to the Mount Baker Highway/Artist Point trailhead -- a different trailhead from Ruth Creek, requiring a car shuttle. An alternative is to walk off down the Sulphide Glacier toward Baker Lake/Shannon Ridge, again exiting at a different trailhead. Never reverse the Price Glacier itself. Full descent typically 4-6 hours from the summit to the Fisher Chimneys, plus the hike out.'
WHERE id = 'wa_mount_shuksan_price_glacier'
  AND descent LIKE '%retrace ascent route via ice climbing down the 40-50 degree slopes%';

-- wa_mount_shuksan_price_glacier: loss_ft (6000) doesn't sum from this row's own
-- itinerary.days[].lossFt (0 + 2100 + 3700 = 5800); gain_ft (6000) already correctly matches the
-- day-by-day gain sum (2200 + 3800 + 0 = 6000), so only loss_ft was off.
UPDATE routes SET loss_ft = 5800
WHERE id = 'wa_mount_shuksan_price_glacier'
  AND loss_ft = 6000;

-- wa_mount_shuksan_sulphide_glacier: dist_km (8, one-way per app convention) doubles to only
-- 9.9 mi round trip, well short of the ~13-14 mi round trip given by multiple independent sources
-- (SummitPost, Alpine Ascents, Northwest Alpine Guides, Mountaineers.org, AllTrails).
UPDATE routes SET dist_km = 10.9
WHERE id = 'wa_mount_shuksan_sulphide_glacier'
  AND dist_km = 8;

-- wa_mount_shuksan_white_salmon_glacier: approach_logistics.peakLat/peakLng (48.8611,
-- -121.8194) sit ~14 miles west / ~2 miles north of Mount Shuksan's actual summit and disagree
-- with the same peak's correct coordinates (48.8315, -121.6032) as stored on the sibling
-- Price Glacier and Sulphide Glacier routes in this same batch/dataset.
UPDATE routes SET approach_logistics = jsonb_set(
    jsonb_set(approach_logistics, '{peakLat}', '48.8315'),
    '{peakLng}', '-121.6032'
  )
WHERE id = 'wa_mount_shuksan_white_salmon_glacier'
  AND (approach_logistics->>'peakLat')::numeric = 48.8611;

-- wa_mount_shuksan_white_salmon_glacier: waypoints[1] (the Mount Shuksan summit) gave elev 9127,
-- disagreeing with the well-established 9,131 ft figure already used for the identical summit on
-- this same peak's Price Glacier and Sulphide Glacier routes.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elev}', '9131')
WHERE id = 'wa_mount_shuksan_white_salmon_glacier'
  AND (waypoints->1->>'elev')::int = 9127;

-- wa_mount_shuksan_white_salmon_glacier: approach text and approach_logistics.trailhead
-- described the Lake Ann Trailhead / Austin Pass approach -- that is the Fisher Chimneys/Lake Ann
-- route's trailhead, not this route's. This row's own waypoints[0] ("White Salmon Road (hairpin)
-- TH", 48.8595/-121.648) and road field (SR-542 hairpin near milepost 51, FS-3075) already
-- correctly describe the actual White Salmon Road approach, so the approach/approach_logistics
-- fields directly contradicted the rest of the same row in addition to being wrong per USFS/
-- Mountaineers.org sourcing. Rewritten to match the row's own waypoints/road fields.
UPDATE routes SET
  approach = 'From the White Salmon Road pull-off (a hairpin switchback on SR-542, about 18 miles east of Glacier, just past milepost 51), descend into the White Salmon Creek drainage and climb through forest and open slopes to the toe of the White Salmon Glacier (~5,200 ft). Continue up the glacier past Winnie''s Slide and Hell''s Highway to reach the upper mountain below the summit pyramid.',
  approach_logistics = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(approach_logistics, '{trailhead}', '"White Salmon Road Trailhead (hairpin, FS-3075 off SR-542)"'),
        '{trailheadLat}', '48.8595'
      ),
      '{trailheadLng}', '-121.648'
    ),
    '{trailheadDirection}', '"Descend into the White Salmon Creek drainage, then climb to the White Salmon Glacier"'
  )
WHERE id = 'wa_mount_shuksan_white_salmon_glacier'
  AND approach_logistics->>'trailhead' = 'Lake Ann Trailhead (Austin Pass)';

-- wa_mount_spickard_southwest: corrections field claimed "'fa' has been left null rather than
-- guessed" but this row's own fa field is populated (Fred and Helmi Beckey, June 21, 1941),
-- externally corroborated (their Southwest Mox first ascent trip, immediately followed by this
-- climb). The corrections note was stale relative to the row's actual fa value.
UPDATE routes SET corrections = 'Sources vary slightly on summit elevation (8,979-8,983 ft across Wikipedia, WTA, and listsofjohn.com) -- this page uses 8,979 ft, the traditional Wikipedia figure (matches the given coordinates closely). The mountain''s overall first ascent (1904, Walter B. Reaburn) is well documented; the first ascent of this specific southwest line is credited to Fred and Helmi Beckey, June 21, 1941, made immediately after their first ascent of Northwest Mox -- corroborated across independent sources. Approach distance/gain figures also vary by source (5.5 mi/~3,400 ft to Ouzel Lake in older reports vs. ~8 mi/~7,000 ft total in a 2022 report) likely reflecting recent road-access degradation forcing earlier parking -- this page uses the more recent (2022) total-route figures.'
WHERE id = 'wa_mount_spickard_southwest'
  AND corrections LIKE '%so ''fa'' has been left null rather than guessed%';

-- wa_mount_spickard_southwest: waypoints[6] (the summit) gave elev 8983, disagreeing with this
-- same row's own high_point_ft (8979) and its own corrections field, which explicitly states
-- "this page uses 8,979 ft."
UPDATE routes SET waypoints = jsonb_set(waypoints, '{6,elev}', '8979')
WHERE id = 'wa_mount_spickard_southwest'
  AND (waypoints->6->>'elev')::int = 8983;

-- wa_mount_spickard_southwest: dist_km (13.7, one-way per app convention) doubles to ~17.0 mi
-- round trip, short of this same row's own waypoints[6].distMi (10.3 mi one-way to the summit)
-- and its own itinerary (day miles sum to 21.5 mi round trip; totalNote states "roughly 20 miles
-- ... round-trip"). Corrected to match the row's own one-way waypoint distance.
UPDATE routes SET dist_km = 16.6
WHERE id = 'wa_mount_spickard_southwest'
  AND dist_km = 13.7;

-- wa_mount_st_helens_monitor_ridge: fa listed as "Unknown (1853, pre-eruption south-side snow
-- route)" but the 1853 first ascent is well documented, not anonymous -- USGS CVO's "Cascade
-- Range Volcanoes First Ascents and Discoveries" credits Thomas J. Dryer (founder of The
-- Oregonian), John Wilson, and two others (Drew and Smith), Aug 26, 1853, corroborated
-- independently (Wild West History, AAC Publications).
UPDATE routes SET fa = 'Thomas J. Dryer, John Wilson, Drew & Smith -- Aug 26, 1853, pre-eruption south-side snow route'
WHERE id = 'wa_mount_st_helens_monitor_ridge'
  AND fa = 'Unknown (1853, pre-eruption south-side snow route)';

-- wa_mount_st_helens_monitor_ridge: beta described the 2.1-mile Loowit Trail junction as
-- "approximately 4,800 feet, gaining 1,000 feet," but this row's own waypoints[1] (that exact
-- junction, distMi 2.1) gives elev 4600 with its own note "after climbing 900 ft" -- the 4,800 ft
-- figure belongs to the following waypoint (Timberline / permit-zone boundary, distMi 2.25). The
-- two waypoints' figures were conflated in the prose.
UPDATE routes SET beta = 'Begin at Climbers'' Bivouac (3,700 ft) on Ptarmigan Trail #216A. Hike 2.1 miles through forest and meadows to the Loowit Trail junction at approximately 4,600 feet, gaining 900 feet. Above timberline, follow wooden cairn markers up rocky Monitor Ridge through boulder fields covered in abrasive ash pumice. The final section features sandy terrain nicknamed the ''Vertical Beach'' before reaching the crater rim at 8,363 feet.'
WHERE id = 'wa_mount_st_helens_monitor_ridge'
  AND beta LIKE '%Loowit Trail junction at approximately 4,800 feet, gaining 1,000 feet%';

-- wa_mount_st_helens_worm_flows: gain_ft (5563) contradicts this same row's own loss_ft (5700)
-- and itinerary.days[0].gainFt (5700) for a route explicitly reversed on descent -- gain and loss
-- must match on a same-path out-and-back. Mountaineers.org and independent sources describe the
-- climb as ascending "nearly 5,700 feet."
UPDATE routes SET gain_ft = 5700
WHERE id = 'wa_mount_st_helens_worm_flows'
  AND gain_ft = 5563;

-- wa_mount_st_helens_worm_flows: waypoints[0] (Marble Mountain Sno-Park trailhead) gave elev
-- 2680, contradicting this same row's own overview ("Marble Mountain Sno-Park (2,800 ft)") and
-- beta ("Start at Marble Mountain Sno-Park (2,800 ft)") text, and matching the exact arithmetic
-- behind the (now-corrected) gain_ft error (8363 - 2800 = 5563, i.e. gain_ft had been computed off
-- 2,680 ft, not the row's own stated 2,800 ft). WTA and independent trailhead sources confirm
-- 2,800 ft for Marble Mountain Sno-Park.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '2800')
WHERE id = 'wa_mount_st_helens_worm_flows'
  AND (waypoints->0->>'elev')::int = 2680;

-- wa_mount_st_helens_worm_flows: aspect (W) contradicts this same row's own face field ("Worm
-- Flows lava-flow ridge (south-southwest side)"); independent sources describe the slope as
-- south-facing, and a bearing computed from this row's own trailhead/summit coordinates puts the
-- ascent line facing south, not west.
UPDATE routes SET aspect = 'SW'
WHERE id = 'wa_mount_st_helens_worm_flows'
  AND aspect = 'W';

-- wa_mount_st_helens_worm_flows: seasonal_hazards.avalanche.zone ("Mount St. Helens (NWAC
-- forecast zone)") is not one of NWAC's actual published zone names and contradicts this same
-- row's own climate.forecastZone field, which already correctly reads "NWAC West Slopes South
-- zone covers Mount St. Helens avalanche and mountain weather forecasting."
UPDATE routes SET seasonal_hazards = jsonb_set(seasonal_hazards, '{avalanche,zone}', '"West Slopes South (NWAC forecast zone)"')
WHERE id = 'wa_mount_st_helens_worm_flows'
  AND seasonal_hazards->'avalanche'->>'zone' = 'Mount St. Helens (NWAC forecast zone)';

-- wa_mount_steel_first_divide: beta/approach/dist_km all cite 12.7 mi to First Divide from
-- Staircase, but WTA, ProTrails, and The Mountaineers' route page all independently give 13.1 mi
-- one-way. dist_km (20.4 = 12.7mi converted) is just a unit-converted copy of the same wrong
-- mileage; corrected to 21.1 (13.1 mi = 21.08 km).
UPDATE routes SET
  beta = REPLACE(beta, '12.7 mi,', '13.1 mi,'),
  approach = REPLACE(approach, '12.7 miles', '13.1 miles'),
  dist_km = 21.1
WHERE id = 'wa_mount_steel_first_divide'
  AND beta LIKE '%12.7 mi,%'
  AND approach LIKE '%12.7 miles%'
  AND dist_km = 20.4;
