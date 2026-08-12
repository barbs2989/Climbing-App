-- WA alpine audit -- batch 93 (pass 2) -- 2026-08-09
-- Routes: wa_nooksack_tower_beckey_route, wa_nooksack_tower_south_face (Nooksack Tower),
--         wa_north_face_3 (Lexington Tower), wa_north_face_var_right_directisimo (Concord Tower),
--         wa_north_face_left_buttress (Castle Peak), wa_north_gardner_mountain_nw_couloir,
--         wa_north_ridge_2 (Whatcom Peak), wa_north_ridge_3 (Cutthroat Peak)
-- Researched via 4 parallel agents grouped by peak (Nooksack Tower x2; Lexington+Concord;
-- Castle Peak+North Gardner; Whatcom+Cutthroat). WebFetch to nps.gov/mountainproject.com/
-- summitpost.org/mountaineers.org/wikipedia.org/theCrag/AAC Publications was blocked by this
-- session's egress proxy, same as every recent batch, so findings rest on WebSearch result
-- snippets rather than full-page reads throughout; noted per item where it limits confidence.

-- wa_nooksack_tower_beckey_route + wa_nooksack_tower_south_face: both routes' first waypoint
-- (and matching first gpx point), labelled "Nooksack Cirque Trailhead", is stored at
-- (48.8899, -121.6749) -- about a mile from the real trailhead. Each row's own
-- approach_logistics.trailheadLat/trailheadLng field already carries the correct value
-- (48.89401, -121.65259), independently confirmed against Trailforks (48.89411, -121.65268).
-- The waypoint/gpx were never updated to match when approach_logistics was populated.
UPDATE routes
SET
  waypoints = jsonb_set(
                jsonb_set(waypoints, '{0,lat}', '48.89401'::jsonb, false),
                '{0,lng}', '-121.65259'::jsonb, false
              ),
  gpx = jsonb_set(
          jsonb_set(gpx, '{0,0}', '48.89401'::jsonb, false),
          '{0,1}', '-121.65259'::jsonb, false
        )
WHERE id = 'wa_nooksack_tower_beckey_route'
  AND waypoints #>> '{0,lat}' = '48.8899'
  AND waypoints #>> '{0,lng}' = '-121.6749'
  AND gpx #>> '{0,0}' = '48.8899'
  AND gpx #>> '{0,1}' = '-121.6749';

UPDATE routes
SET
  waypoints = jsonb_set(
                jsonb_set(waypoints, '{0,lat}', '48.89401'::jsonb, false),
                '{0,lng}', '-121.65259'::jsonb, false
              ),
  gpx = jsonb_set(
          jsonb_set(gpx, '{0,0}', '48.89401'::jsonb, false),
          '{0,1}', '-121.65259'::jsonb, false
        )
WHERE id = 'wa_nooksack_tower_south_face'
  AND waypoints #>> '{0,lat}' = '48.8899'
  AND waypoints #>> '{0,lng}' = '-121.6749'
  AND gpx #>> '{0,0}' = '48.8899'
  AND gpx #>> '{0,1}' = '-121.6749';

-- wa_north_face_var_right_directisimo (Concord Tower): length_m (91) contradicts this same
-- row's own pitch_detail (25+50+45 = 120m) AND its own itinerary.sourceNote, which explicitly
-- cites "120 m, 3 pitches, 5.8 ... from the SuperTopo North Face Directismo page." 91 is the
-- exact length_m of sibling route wa_north_face_3 (Lexington Tower's North Face) -- looks like
-- a copy/template value that was never updated for this route.
UPDATE routes SET length_m = 120
WHERE id = 'wa_north_face_var_right_directisimo'
  AND length_m = 91;

-- wa_north_face_var_right_directisimo (Concord Tower): waypoints[0].elev (Blue Lake
-- Trailhead) is stored as 5200, contradicting external sources (Mountaineers.org/WTA give
-- 5,400 ft), this same route's own approach text ("~5,400 ft"), and the identical trailhead
-- point correctly stored as 5400 on sibling route wa_north_face_3.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '5400'::jsonb, false)
WHERE id = 'wa_north_face_var_right_directisimo'
  AND waypoints #>> '{0,name}' = 'Blue Lake Trailhead'
  AND waypoints #>> '{0,elev}' = '5200';

-- wa_north_face_left_buttress ("Fight or Flight", Castle Peak, Pasayten Wilderness): the
-- `road` field describes Stehekin ferry/floatplane access and a Bridge Creek Trailhead --
-- unrelated content contaminated in from a different, Lake Chelan-area route/peak. This
-- remote Canada-border peak's own `approach` field (already verified correct) describes
-- access via BC Hwy 3/Manning Provincial Park or SR-20 to the Ross Dam Trailhead; nothing in
-- any source connects Castle Peak to Stehekin. Corrected value is built from this row's own
-- already-verified approach text, not fabricated.
UPDATE routes
SET road = '{
  "name": "BC Hwy 3 to E.C. Manning Provincial Park, or SR-20 to the Ross Dam Trailhead",
  "status": "No road reaches the peak itself -- access is by trail/cross-country from either the Manning Park (Canada) side or the Ross Lake (US) side.",
  "driveNote": "From Canada: BC Hwy 3 to Manning Park, then the Monument 78/Windy Joe trailhead. From the US: SR-20 to the Ross Dam Trailhead near milepost 134, then trail/boat travel up Ross Lake to Lightning Creek."
}'::jsonb
WHERE id = 'wa_north_face_left_buttress'
  AND road ->> 'name' LIKE 'Stehekin%';

-- wa_north_gardner_mountain_nw_couloir: approach_logistics.trailhead/trailheadLat/trailheadLng
-- point to "Wolf Creek Trailhead" -- the approach for North Gardner's separate STANDARD south
-- route via Gardner Meadows (confirmed via WTA/Willhiteweb/trailcatjim/AllTrails), not this
-- route. This route's own name, approach, beta, bail and waypoints[0] all describe the Cedar
-- Creek Trailhead exclusively -- the route is literally named "...(Cedar Creek approach)".
-- approach_logistics appears to have been copied from North Gardner's other route record.
UPDATE routes
SET approach_logistics = jsonb_set(
      jsonb_set(
        jsonb_set(approach_logistics, '{trailhead}', '"Cedar Creek Trailhead"'::jsonb),
        '{trailheadLat}', '48.5792'::jsonb
      ),
      '{trailheadLng}', '-120.4787'::jsonb
    ) || '{"trailheadDirection": "From Winthrop, WA, drive Highway 20 west about 18 miles to the Cedar Creek Trailhead (USFS Trail #476), near milepost 175-176 west of Winthrop."}'::jsonb
WHERE id = 'wa_north_gardner_mountain_nw_couloir'
  AND approach_logistics ->> 'trailhead' = 'Wolf Creek Trailhead';

-- wa_whatcom_peak (areas table, not a route): the area row's lat/lng (48.8576357,
-- -121.373549) sits about 0.42 mi from the Wikipedia/GNIS-cited summit coordinate
-- (48.85611, -121.38250) -- well outside plausible summit-labeling noise for a single-summit
-- peak. wa_north_ridge_2's own summit waypoint (48.8561, -121.3825) already has the correct
-- value; only the parent area row is wrong. Surfaced by the requested route-vs-area
-- cross-check, not one of the two routes assigned, but real and easy to fix.
UPDATE areas
SET lat = 48.85611,
    lng = -121.38250
WHERE id = 'wa_whatcom_peak'
  AND lat = 48.8576357
  AND lng = -121.373549;

-- verify: each should return exactly the corrected value, none of the old wrong ones
select id, waypoints#>>'{0,lat}' as w0_lat, waypoints#>>'{0,lng}' as w0_lng, gpx#>>'{0,0}' as gpx0_lat, gpx#>>'{0,1}' as gpx0_lng from routes where id in ('wa_nooksack_tower_beckey_route','wa_nooksack_tower_south_face');
select id, length_m, waypoints#>>'{0,elev}' as w0_elev from routes where id = 'wa_north_face_var_right_directisimo';
select id, road from routes where id = 'wa_north_face_left_buttress';
select id, approach_logistics from routes where id = 'wa_north_gardner_mountain_nw_couloir';
select id, lat, lng from areas where id = 'wa_whatcom_peak';
