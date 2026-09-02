-- WA alpine audit batch 174 (pass 3)

-- wa_trapper_mountain_south_slopes: dist_km stored 30.58, which is the ROUND-TRIP
-- distance in km (30.58 km = 19.00 mi exactly). The app's own convention is that
-- dist_km holds the ONE-WAY distance and doubles it for display (per CLAUDE.md's
-- audit:distances note on this exact defect class: "the tell -- only the doubled
-- figure lands on a whole number of miles"). This row's own waypoint chain gives
-- the ground truth directly: cumulative distMi to the summit is 9.5 mi one-way
-- (Trailhead 0 -> Trapper Lake 7.5 -> south basin 8.3 -> talus benches 9.0 ->
-- summit 9.5). 9.5 mi = 15.29 km. Correcting to the one-way figure so the app's
-- distKm*2 display renders the correct 19.0 mi round trip instead of 38.0.
UPDATE routes
SET dist_km = 15.29
WHERE id = 'wa_trapper_mountain_south_slopes'
  AND dist_km = 30.58;

-- wa_traverse_of_mount_index: access.permitZone and access._raw.land_manager both
-- claim this route (Mount Index, near the town of Index off US-2, Lake Serene
-- Trailhead) is on North Cascades National Park land "(presumed)" -- contradicted
-- by the route's own correct sibling fields two keys away (access.landManager /
-- access.land_manager: "Mount Baker-Snoqualmie National Forest (Skykomish Ranger
-- District)") and by external sources (Mountaineers.org, WA DNR): Mount Index is
-- USFS land, Skykomish Ranger District, not inside NCNP -- the nearest NPS unit is
-- ~40 miles north. Clearing the false NPS claim rather than guessing a replacement
-- permit process for the _raw sub-object (the row's own _raw.note already says
-- "Limited specific information available"), matching the precedent in
-- audits/sql/2026-07-29-batch-15.sql of stripping a false land-manager clause.
UPDATE routes
SET access = jsonb_set(
      jsonb_set(access, '{permitZone}', '"Mount Baker-Snoqualmie National Forest (Skykomish Ranger District)"'::jsonb),
      '{_raw,land_manager}',
      '"Mount Baker-Snoqualmie National Forest (Skykomish Ranger District), not North Cascades National Park -- see access.landManager"'::jsonb)
WHERE id = 'wa_traverse_of_mount_index'
  AND access->>'permitZone' = 'North Cascades National Park'
  AND access->'_raw'->>'land_manager' = 'National Park Service - North Cascades National Park (presumed)';

-- wa_ultramega_ok: fa spelled the first ascentionist's surname "Mark Allen" --
-- corroborated sources (SummitPost, CascadeClimbers.com trip report, Mountain
-- Project user search) consistently spell it "Mark Allan" (two Ls). Tom Smith and
-- the 2004 date are unaffected.
UPDATE routes
SET fa = 'Mark Allan and Tom Smith, 2004'
WHERE id = 'wa_ultramega_ok'
  AND fa = 'Mark Allen and Tom Smith, 2004';
