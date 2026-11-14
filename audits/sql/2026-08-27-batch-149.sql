-- WA alpine audit batch 149 (2026-08-27)
-- Batch: wa_mount_rainier_fuhrer_thumb, wa_mount_rainier_gibraltar_ledges,
--        wa_mount_rainier_ingraham_direct, wa_mount_rainier_kautz_glacier,
--        wa_mount_rainier_kautz_headwall, wa_mount_rainier_liberty_ridge,
--        wa_mount_rainier_mowich_face, wa_mount_rainier_nisqually_icefall

-- Fix 1: wa_mount_rainier_liberty_ridge -- waypoints[1..3] ("Mowich Lake Camp",
-- "Puyallup Winthrop Junction Camp", "Puyallup Glacier Serac Zone") and the entire
-- gpx track sit near Mowich Lake and the Puyallup Glacier on Rainier's NW side
-- (gpx starts at 46.95,-121.82, ~4 km from Mowich Face's own Mowich Lake Trailhead
-- waypoint in this same batch). Liberty Ridge is a north-side route: its own
-- approach/approach_variants/descent_text/approach_logistics are all internally
-- consistent and describe ONLY the White River Campground -> Glacier Basin Trail ->
-- St. Elmo Pass -> lower Winthrop Glacier -> Curtis Ridge -> Carbon Glacier corridor,
-- with no mention of Mowich Lake or the Puyallup Glacier anywhere in the row.
-- External sources (Mountaineers.org, SummitPost, AAC route history) confirm this is
-- the standard approach, with Ipsut Creek/Carbon River as the only documented
-- alternate (used when White River Road is gated) -- no source describes a Mowich- or
-- Puyallup-side approach to Liberty Ridge; those areas serve the unrelated Mowich
-- Face and Sunset Ridge routes. The app's own audit:waypoints tool independently
-- confirms both the trailhead (10,428 m off this gpx track) and the summit (663 m off
-- the track's end) are far from the recorded line -- consistent with the whole track
-- being foreign rather than a partial/truncated recording of the real route.
-- Removing the three contaminated waypoints and replacing the gpx with the two
-- endpoints that ARE corroborated by the row's own prose (White River trailhead,
-- Liberty Cap summit), matching this catalog's existing convention for routes with no
-- verified intermediate track (e.g. this same batch's Fuhrer Thumb and Kautz
-- Headwall). Flagged, not attempted here: a fuller waypoint chain (St. Elmo Pass,
-- Curtis Ridge, Carbon Glacier toe, Thumb Rock) would need real GPS/survey data this
-- audit has no access to -- left for a human with route-specific track data, same as
-- the wa_mount_rahm_standard gpx flag in batch 148.
UPDATE routes SET
  waypoints = '[{"lat": 46.9024, "lng": -121.6438, "elev": 4800, "name": "White River Campground (Glacier Basin Trailhead)", "type": "Trailhead", "distMi": 0}, {"lat": 46.8658, "lng": -121.7817, "elev": 14112, "name": "Liberty Cap", "type": "Summit", "distMi": 15}]'::jsonb,
  gpx = '[[46.9024, -121.6438], [46.8658, -121.7817]]'::jsonb
  WHERE id = 'wa_mount_rainier_liberty_ridge';

-- Fix 2: wa_mount_rainier_kautz_headwall -- waypoints[0] was internally
-- self-contradictory: name="Paradise (Skyline Trail)" while its own note field says
-- "Distinct from Paradise lot", elev=3600 (nowhere near Paradise's real ~5,400 ft),
-- but lat/lng (46.78669,-121.73454) were Paradise's real coordinates (identical to
-- the Paradise waypoints on every other route in this batch). The row's own approach
-- text names the actual alternate as "the Comet Falls/Van Trump Park approach from
-- the Comet Falls Trailhead (~3,650 ft)", and this route's own gpx track already
-- starts at [46.779,-121.7823] -- which matches Comet Falls Trailhead's real,
-- externally-published coordinates (46.7790,-121.7823, elevation 3,650 ft per
-- NPS/WTA) almost exactly. Correcting the waypoint's coordinates to match its own gpx
-- track and the external source, and renaming it out of the self-contradiction.
UPDATE routes SET waypoints = jsonb_set(
    jsonb_set(
      jsonb_set(waypoints, '{0,lat}', '46.779', false),
      '{0,lng}', '-121.7823', false),
    '{0,name}', '"Comet Falls Trailhead (Van Trump Park approach)"', false)
  WHERE id = 'wa_mount_rainier_kautz_headwall';
