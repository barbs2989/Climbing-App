-- WA alpine audit batch 178
-- Routes checked: wa_amphitheater_mountain_west_route, wa_andersons_thumb_standard,
-- wa_argonaut_peak_east_ridge, wa_argonaut_peak_northeast_couloir, wa_austera_peak,
-- wa_austera_peak_chockstone_route, wa_austera_peak_southwest_ridge, wa_bacon_peak_diobsud
--
-- NOTE: this file is ~5KB, over the SQL Editor's ~4KB safe-paste size (per
-- `npm run check:sql`). Paste and run each UPDATE statement individually rather than
-- pasting the whole file at once.

-- wa_amphitheater_mountain_west_route: gain_ft (3000) is provably below the floor set by
-- the route's own two waypoints -- Andrews Creek Trailhead (elev 3,050 ft) and Amphitheater
-- Mountain Summit (elev 8,358 ft, matching high_point_ft) -- which alone establish a net
-- rise of 5,308 ft. The route's own pitch_detail entry independently corroborates a much
-- larger figure, stating "3,700-5,550 ft of gain" just to reach Upper Cathedral Lake camp,
-- before any additional gain to the summit. No pitches (pitches is null/0, no roped
-- climbing) so no climbing-vertical credit applies. Set to the provable floor.
UPDATE routes SET gain_ft = 5308
WHERE id = 'wa_amphitheater_mountain_west_route' AND gain_ft = 3000;

-- wa_argonaut_peak_east_ridge: the Beverly Turnpike Trailhead waypoint is missing
-- elev/elevFt entirely, even though the route's own `approach` text states the trailhead
-- elevation directly: "Start at the Beverly Turnpike Trailhead at the end of FR-9737-112
-- (roughly 3,650 ft)." Filling the gap from the row's own already-stated fact.
UPDATE routes SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{4,elev}', '3650'),
  '{4,elevFt}', '3650'
)
WHERE id = 'wa_argonaut_peak_east_ridge'
  AND waypoints->4->>'name' = 'Beverly Turnpike Trailhead (#1391)'
  AND NOT (waypoints->4 ? 'elev');

-- wa_bacon_peak_diobsud: the Watson Lakes Trailhead waypoint carries two contradictory
-- elevations in the same object -- elev: 4300 and elevFt: 800 -- a ~5.4x mismatch. The
-- route's own `approach` text gives "the Watson Lakes Trailhead (~4,360 ft...)", matching
-- elev (4300) and not elevFt (800). Correcting elevFt to match the sourced value.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elevFt}', '4300')
WHERE id = 'wa_bacon_peak_diobsud'
  AND waypoints->0->>'name' = 'Watson Lakes Trailhead'
  AND (waypoints->0->>'elevFt')::numeric = 800
  AND (waypoints->0->>'elev')::numeric = 4300;

-- wa_andersons_thumb_standard: the Dosewallips Road washout parking waypoint carries the
-- same elev/elevFt contradiction (elev: 700, elevFt: 1600, a ~2.3x mismatch). Multiple
-- independent published sources (Mountaineers.org, trip-report aggregators) place the
-- washout trailhead at approximately 600 ft, matching elev (700) and not elevFt (1600).
-- Also cleans up a stale `note` field left over from an earlier, already-completed
-- coordinate fix: it describes "Current DB value (47.7413,-123.0474)" as misplaced, but
-- that value is no longer what is stored (the row's lat/lng, 47.740259/-123.065764, already
-- match approach_logistics.trailheadLat/Lng) -- the note is now stale documentation of a
-- problem that no longer exists in the row.
UPDATE routes SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{0,elevFt}', '700'),
  '{0,note}',
  '"This is the road-walk/bike start (car-accessible parking), not the historic Dosewallips trailhead itself, which sits roughly 5.5 miles further up the closed roadbed."'
)
WHERE id = 'wa_andersons_thumb_standard'
  AND waypoints->0->>'name' = 'Dosewallips Road washout parking (FR-2610)'
  AND (waypoints->0->>'elevFt')::numeric = 1600
  AND (waypoints->0->>'elev')::numeric = 700;

-- wa_andersons_thumb_standard: the final waypoint is labeled "Mount Anderson summit" at
-- 7,330 ft (lat 47.7211, lng -123.3317) -- this is genuinely Mount Anderson's own true
-- summit (confirmed via web search: Mount Anderson, WA is 7,330 ft), a DIFFERENT, taller,
-- more prominent peak than the route this waypoint is attached to. This route is "Anderson's
-- Thumb Standard Route" and the row's own high_point_ft is 6,785 ft -- 545 ft lower, and
-- the row's own `areas` table entry for wa_andersons_thumb already stores the correct,
-- distinct peak coordinate (lat 47.715925, lng -123.341845), matching this route's own
-- approach_logistics.peakLat/peakLng. The route's waypoint track was apparently terminated
-- at Mount Anderson's summit (a common staging/attempt point per this route's own `beta`
-- text) rather than at Anderson's Thumb's own top. Correcting the final waypoint to use the
-- area's own already-recorded peak coordinate and this route's own high_point_ft for
-- elevation, rather than inventing a new coordinate.
UPDATE routes SET waypoints = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(waypoints, '{6,lat}', '47.715925'),
      '{6,lng}', '-123.341845'
    ),
    '{6,elev}', '6785'
  ),
  '{6,elevFt}', '6785'
)
WHERE id = 'wa_andersons_thumb_standard'
  AND waypoints->6->>'name' = 'Mount Anderson summit'
  AND (waypoints->6->>'elev')::numeric = 7330;

UPDATE routes SET waypoints = jsonb_set(waypoints, '{6,name}', '"Anderson''s Thumb"')
WHERE id = 'wa_andersons_thumb_standard'
  AND waypoints->6->>'name' = 'Mount Anderson summit';
