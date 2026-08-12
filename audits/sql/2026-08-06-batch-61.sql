-- South Early Winters Spire, Dolphin Chimney: Blue Lake Trailhead waypoint elevation (5,200
-- ft) contradicts this same row's own approach_logistics.trailheadDirection ("~1.5 miles west
-- of Washington Pass, 5,400 ft") and multiple USFS/trip-report sources for the Blue Lake
-- Trailhead, both agreeing on 5,400 ft. Same Blue-Lake contamination family flagged on
-- sibling Washington Pass peaks in earlier batches.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '5400')
WHERE id = 'wa_dolphin_chimney' AND waypoints->0->>'name' = 'Blue Lake Trailhead' AND (waypoints->0->>'elev')::int = 5200;

-- Dorado Needle, Direct Southwest Buttress: approach_logistics stores the wrong Eldorado
-- Creek trailhead coordinates (48.49261,-121.11761); the correct trailhead position
-- (48.5136,-121.1964, Cascade River Road mile 20) is already used elsewhere on this same
-- row (its own first waypoint) and confirmed via WTA/USFS trailhead sourcing.
UPDATE routes SET approach_logistics = jsonb_set(jsonb_set(approach_logistics, '{trailheadLat}', '48.5136'), '{trailheadLng}', '-121.1964')
WHERE id = 'wa_direct_southwest_buttress' AND approach_logistics->>'trailheadLat' = '48.49261' AND approach_logistics->>'trailheadLng' = '-121.11761';

-- Dorado Needle, East Ridge / Inspiration Glacier: same wrong trailhead coordinates in
-- approach_logistics -- this route's own waypoints[1] was already corrected to the right
-- value in a prior pass, but approach_logistics was never updated to match, leaving the row
-- internally inconsistent about its own trailhead.
UPDATE routes SET approach_logistics = jsonb_set(jsonb_set(approach_logistics, '{trailheadLat}', '48.5136'), '{trailheadLng}', '-121.1964')
WHERE id = 'wa_dorado_needle_east_ridge' AND approach_logistics->>'trailheadLat' = '48.49261' AND approach_logistics->>'trailheadLng' = '-121.11761';

-- Dorado Needle, East Ridge / Inspiration Glacier: access.notes carries a stray, unrelated
-- "Mount Tom area, North Cascades." clause -- same copy-paste-boilerplate pattern flagged
-- DB-wide in pass-1 batch 15 (35 affected routes); stripped here the same way those fixes
-- stripped it, since nothing else in this row mentions Mount Tom.
UPDATE routes SET access = jsonb_set(access, '{notes}', '"Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit."')
WHERE id = 'wa_dorado_needle_east_ridge' AND access->>'notes' LIKE '%Mount Tom area%';

-- Dorado Needle, East Ridge / Inspiration Glacier: waypoints[1]'s own note field still
-- describes a coordinate fix as pending ("Existing DB value ... appears incorrect ...
-- recommend correcting") even though that same waypoint's lat/lng were already corrected in
-- a prior pass -- only approach_logistics (fixed above) still had the stale value. Rewriting
-- the stale note so a future pass doesn't re-flag this waypoint as broken.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,note}', '"Same trailhead used by the other Dorado Needle routes (mile 20, Cascade River Road)."')
WHERE id = 'wa_dorado_needle_east_ridge' AND waypoints->1->>'name' = 'Eldorado Trailhead (Cascade River Road)' AND waypoints->1->>'note' LIKE '%appears incorrect%';

-- Pernod Spire, Direct West Face: access.passRequired says "None", directly contradicting
-- this same row's access.parking_pass ("Northwest Forest Pass required at Washington Pass
-- Overlook, Blue Lake, and Cutthroat trailheads...") and access._raw.parking_pass -- an
-- internal self-contradiction; USFS Methow Valley Ranger District trailheads in this
-- corridor require a Northwest Forest Pass.
UPDATE routes SET access = jsonb_set(access, '{passRequired}', '"Northwest Forest Pass"')
WHERE id = 'wa_direct_west_face' AND access->>'passRequired' = 'None';

-- Dragontail Peak, Backbone Ridge: waypoints/gpx list "Aasgard Pass" twice at different
-- coordinates (index 2 and index 5), both tagged the same 7,841 ft elevation -- index 2's
-- coordinate (47.4748,-120.819) is ~620m off from Wikipedia's Aasgard Pass position
-- (47.48028,-120.82056), which index 5 already matches exactly. Corrected index 2 to match.
UPDATE routes SET waypoints = jsonb_set(jsonb_set(waypoints, '{2,lat}', '47.4803'), '{2,lng}', '-120.8206')
WHERE id = 'wa_dragontail_peak_backbone_ridge' AND waypoints->2->>'name' = 'Aasgard Pass' AND (waypoints->2->>'lat')::numeric = 47.4748;

UPDATE routes SET gpx = jsonb_set(jsonb_set(gpx, '{2,0}', '47.4803'), '{2,1}', '-120.8206')
WHERE id = 'wa_dragontail_peak_backbone_ridge' AND (gpx->2->>0)::numeric = 47.4748;

-- Dragontail Peak, Gerber-Sink: descent field is stale boilerplate ("using rappels and
-- downclimbing as necessary... multiple anchor points required") directly contradicting this
-- same row's own rappels field ("0") and its well-sourced descent_text, which explicitly
-- documents a walk-off/downclimb via Aasgard Pass with no rappels in any trip report found
-- (Jeff Hebert's account, cited in itinerary.sourceNote).
UPDATE routes SET descent = 'Exit the couloir unroped and descend via Aasgard Pass to Colchuck Lake — a walk-off/downclimb, not a rappel descent; no rappels are documented for a completed ascent.'
WHERE id = 'wa_dragontail_peak_r2' AND descent = 'Descend via established descent route, using rappels and downclimbing as necessary. Multiple anchor points and protection required. Route-finding is critical in poor visibility.';
