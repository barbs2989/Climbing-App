-- Batch 225 (pass 4), 2026-09-07
-- wa_rapple_grapple, wa_raven_ridge_southeast_ridge_crater_lake, wa_remmel_mountain_nw_ridge,
-- wa_ridge_traverse_from_east_fury, wa_robinson_mountain_north_couloir,
-- wa_rock_mountain_northeast_ridge, wa_ruth_icy_traverse, wa_ruth_mountain_south_slopes

-- wa_rapple_grapple: waypoints[0] ("Blue Lake Trailhead") stored elev 5200, but this same row's
-- own bivy[0] ("Blue Lake trailhead roadside bivy," identical location) already says 5400, and
-- an identical-coordinate waypoint was already corrected to 5400 for two sibling Liberty Bell
-- routes in batch 220 (wa_north_face_3, wa_north_face_var_right_directisimo). External: The
-- Mountaineers / WTA both give Blue Lake Trailhead as 5,400 ft. (Note for a future batch: the
-- same wrong 5200 value is still present on ~15+ other routes sharing this coordinate across
-- several Liberty Bell/Washington Pass-group areas -- out of scope for this batch since those
-- routes are filed under different area_ids and most are due up in later batches of this pass.)
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '5400')
WHERE id = 'wa_rapple_grapple'
  AND waypoints->0->>'name' = 'Blue Lake Trailhead'
  AND (waypoints->0->>'elev')::int = 5200;

-- wa_ridge_traverse_from_east_fury: overview said "East Fury (8,280 ft)," which disagrees with
-- this catalog's own area record for the same peak (areas.wa_mount_fury_east.elevation_ft =
-- 8356) and with the externally published theodolite/LIDAR re-survey (AAC Publications /
-- Country Highpoints: East Fury 8,356 ft +/-8 ft, actually the highest of the Fury massif and
-- of nearby Luna Peak, revising the older USGS-map-derived figures). West Fury's stated
-- elevation in the same sentence (8,305 ft) already agrees with the area table (8,303 ft) to
-- within ordinary survey rounding and was left alone.
UPDATE routes
SET overview = replace(overview, 'East Fury (8,280 ft)', 'East Fury (8,356 ft)')
WHERE id = 'wa_ridge_traverse_from_east_fury'
  AND overview LIKE '%East Fury (8,280 ft)%';

-- wa_ridge_traverse_from_east_fury: `approach` field's tail described reaching "Beaver Pass"
-- then diverging onto "Wiley Ridge or over Whatcom Pass/Easy Ridge/Perfect Pass" to "the
-- crevassed Challenger Glacier" -- that is Mount Challenger's approach (a different peak in the
-- Northern Pickets, reached from a Beaver Pass/Whatcom Pass corridor well past this route's own
-- turnoff), and it contradicts every other field on this same row: the waypoints (Access Creek
-- Junction, Access Col, Luna Col), descent_text, itinerary, road, and emergency notes all
-- describe only the Access Creek/Luna Col approach, with no mention of Challenger Glacier
-- anywhere else in the row. A sibling route on the same peak (wa_mount_fury_east_north_buttress)
-- separately and correctly documents the Whatcom Pass/Challenger Glacier line as a *different,
-- historical* alternate approach used once by "Alan Kearney's party" coming from Canada -- not
-- the standard way in. External sources (WTA, trailcatjim.com, stevensong.com trip reports) all
-- describe the standard/only approach to East Fury/West Fury as Ross Lake -> Big Beaver Trail ->
-- Access Creek -> Access Col -> Luna Col, with no mention of Beaver Pass or Challenger Glacier.
-- Truncates/re-homes the erroneous tail using this row's own waypoint names and elevations
-- (Access Col 6,800 ft, Luna Col 7,200 ft) -- nothing researched or invented.
UPDATE routes
SET approach = 'Drive SR-20 (North Cascades Highway) to the Ross Dam Trailhead, then descend roughly 15-20 minutes to Ross Lake, where most parties arrange a paid water taxi from Ross Lake Resort (or paddle/walk) to the Big Beaver Trail landing rather than hiking the long lakeshore trail. From Big Beaver Landing, follow the Big Beaver Trail to the Access Creek Junction, then leave the trail and bushwhack up Access Creek to Access Col (6,800 ft) and over to Luna Col (7,200 ft) below the Fury massif -- a genuine multi-day mountaineering expedition into one of the most remote, weather-exposed corners of the North Cascades, with essentially no bailout options once committed.'
WHERE id = 'wa_ridge_traverse_from_east_fury'
  AND approach = 'Drive SR-20 (North Cascades Highway) to the Ross Dam Trailhead, then descend roughly 15-20 minutes to Ross Lake, where most parties arrange a paid water taxi from Ross Lake Resort (or paddle/walk) to the Big Beaver Trail landing rather than hiking the long lakeshore trail. From Big Beaver Landing it''s about 13-14 miles of trail up the Big Beaver valley to Beaver Pass, a full day''s hike with a loaded pack. From there, routes diverge onto Wiley Ridge or over Whatcom Pass/Easy Ridge/Perfect Pass to gain the upper basins beneath the Challenger Glacier, with substantial off-trail travel through brush, talus, and heather slopes. The final push crosses the crevassed Challenger Glacier to a short summit rock pitch; this is a genuine multi-day (5+ days) glacier mountaineering expedition into one of the most remote, weather-exposed corners of the North Cascades, with essentially no bailout options once committed.';

-- wa_ruth_icy_traverse: approach_logistics.trailheadDirection ended mid-sentence, "...Hannegan
-- Pass (5,066 ft, ~4 miles, ~2,000 ft gain), then " with nothing after "then". Trims the
-- dangling incomplete clause so the field ends as a complete sentence; nothing invented, and the
-- full correct continuation already exists elsewhere on this same row (approach,
-- approach_variants, descent_text).
UPDATE routes
SET approach_logistics = jsonb_set(
  approach_logistics,
  '{trailheadDirection}',
  '"Shares its trailhead and lower approach with the South Slopes/Ruth Glacier route: Hannegan Pass Trail #674 from the Hannegan Pass Trailhead (end of FR-32) up the Ruth Creek valley to Hannegan Pass (5,066 ft, ~4 miles, ~2,000 ft gain)."'::jsonb
)
WHERE id = 'wa_ruth_icy_traverse'
  AND approach_logistics->>'trailheadDirection' = 'Shares its trailhead and lower approach with the South Slopes/Ruth Glacier route: Hannegan Pass Trail #674 from the Hannegan Pass Trailhead (end of FR-32) up the Ruth Creek valley to Hannegan Pass (5,066 ft, ~4 miles, ~2,000 ft gain), then ';

-- wa_ruth_mountain_south_slopes: approach_logistics.trailheadDirection ended mid-word, "...end of
-- FR-32, ~5.3 miles off Mt." Completes the sentence by re-homing the identical opening clause
-- already present in this same row's own `approach` field ("...off Mt. Baker Highway/SR 542)
-- follow Hannegan Pass Trail #674 up the Ruth Creek valley to Hannegan Pass (5,066 ft)."); nothing
-- researched or invented.
UPDATE routes
SET approach_logistics = jsonb_set(
  approach_logistics,
  '{trailheadDirection}',
  '"From the Hannegan Pass Trailhead (end of FR-32, ~5.3 miles off Mt. Baker Highway/SR 542) follow Hannegan Pass Trail #674 up the Ruth Creek valley to Hannegan Pass (5,066 ft)."'::jsonb
)
WHERE id = 'wa_ruth_mountain_south_slopes'
  AND approach_logistics->>'trailheadDirection' = 'From the Hannegan Pass Trailhead (end of FR-32, ~5.3 miles off Mt.';

-- wa_remmel_mountain_nw_ridge: approach_logistics named "Andrews Creek Trailhead (Trail #504)"
-- as the trailhead, but this route's own waypoints[0] ("Thirtymile Trailhead," with its own note
-- "this is the line of the 2011 ascent"), beta, and itinerary all describe the Chewuch River
-- Trail #510 / Remmel Lake / Four Point Lake approach for the documented Aug 10, 2011 NW Ridge
-- ascent (fa field). External sources (trailcatjim.com, hike2hike.com) confirm the Andrews Creek
-- Trailhead reaches Remmel's summit via a separate, less-used line (Andrews Pass and Class-3
-- west-facing gullies, "not popular anymore due to years of heavy wildfire damage"), while "the
-- now-standard way up Remmel is from the Thirtymile Trailhead" with a bivy at Four Point Lake --
-- exactly what this row's own waypoints describe. Corrects trailhead/coordinates/direction to
-- match this row's own (already-present) Thirtymile Trailhead waypoint; the generic `road` field,
-- which correctly lists both trailheads as general access options for the peak, is untouched.
UPDATE routes
SET approach_logistics = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        approach_logistics,
        '{trailhead}',
        '"Thirtymile Trailhead (Chewuch River Trail #510)"'::jsonb
      ),
      '{trailheadLat}',
      '48.8231'::jsonb
    ),
    '{trailheadLng}',
    '-120.0197'::jsonb
  ),
  '{trailheadDirection}',
  '"From the Thirtymile Trailhead, via Chewuch River Trail #510 along the Chewuch River to Remmel Lake, then off-trail south (~2 miles bushwhack) to the NW Ridge -- this is the line of the 2011 ascent."'::jsonb
)
WHERE id = 'wa_remmel_mountain_nw_ridge'
  AND approach_logistics->>'trailhead' = 'Andrews Creek Trailhead (Trail #504)';

-- access_checked_at stamped for all 8 routes reviewed this batch (external sources cross-checked
-- 2026-09-07 -- Raven Ridge's high point being locally named "Corax Peak" at 8,572 ft (peakery,
-- Wikipedia, listsofjohn) corroborated exactly against this row's own waypoint naming; Robinson
-- Mountain's remoteness/approach-corridor and Rock Mountain's Nason Ridge traverse structure read
-- against trip-report sources with no discrepancies found; Remmel Mountain's Aug 10, 2011 NW
-- Ridge first-ascent date corroborated via SummitPost's climbers' log. wa_rapple_grapple's
-- first-ascent attribution to Bryan Burdo with no confirmable year, and Icy Peak's exact
-- elevation/prominence, remain documented data gaps rather than errors -- a prior research pass
-- already searched and could not find either, and nothing found this session changes that.
UPDATE routes
SET access_checked_at = '2026-09-07T12:00:00+00:00'
WHERE id IN (
  'wa_rapple_grapple',
  'wa_raven_ridge_southeast_ridge_crater_lake',
  'wa_remmel_mountain_nw_ridge',
  'wa_ridge_traverse_from_east_fury',
  'wa_robinson_mountain_north_couloir',
  'wa_rock_mountain_northeast_ridge',
  'wa_ruth_icy_traverse',
  'wa_ruth_mountain_south_slopes'
);
