-- WA alpine audit, pass 3, batch 158
-- Routes: wa_northwest_ridge_2 (Boston Peak), wa_nw_face_var_remsberg_variation
-- (Liberty Bell Mountain), wa_nw_ridge_2 (Colchuck Balanced Rock),
-- wa_old_guard_peak_east_side_route / wa_old_guard_peak_southwest_route
-- (Old Guard Peak), wa_old_snowy_mountain_r1 (Old Snowy Mountain),
-- wa_olympus_blue_glacier_east_ramps / wa_olympus_summit_block_west_edge
-- (Mount Olympus).
-- Each statement is guarded on the exact current stored value so it is a
-- no-op (0 rows) rather than a silent overwrite if the row has since changed.

-- wa_nw_face_var_remsberg_variation (Liberty Bell Mountain): the trailhead
-- waypoint's elev (5200 ft) contradicts this same row's own
-- approach_logistics.trailheadDirection text ("...5,400 ft"). Corroborated
-- externally: The Mountaineers' Blue Lake (Washington Pass) trail page gives
-- the Blue Lake Trailhead parking area as 5,400 ft. Net-rise math is
-- unaffected either way (gain_ft 2520 still exceeds the corrected net rise
-- of 2320 ft, same "planner never understates a climb" invariant CLAUDE.md
-- documents for check:gain-floor-stated).
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '5400')
WHERE id = 'wa_nw_face_var_remsberg_variation'
  AND waypoints->0->>'name' = 'Blue Lake Trailhead'
  AND (waypoints->0->>'elev')::numeric = 5200;

-- wa_northwest_ridge_2 (Boston Peak): the "Lower Boston Basin Camp" waypoint
-- (type Campsite) is stored at 5700 ft, contradicting this same row's own
-- access._raw.special_requirements text, which states Boston Basin's two
-- designated campsites are "low camp (~5,300 ft) and high camp (~6,400 ft)".
-- Corroborated externally (SummitPost "Boston Basin: Logistical Centers",
-- and NPS-derived trip summaries): Boston Basin low camp sits at ~5,300 ft,
-- high camp at ~6,400 ft (matching the separate "Western edge of Quien Sabe
-- Glacier" waypoint already stored at 6400). The waypoint's name explicitly
-- identifies it as the designated low camp, so it should carry the low-camp
-- elevation, not an unrelated figure.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{3,elev}', '5300')
WHERE id = 'wa_northwest_ridge_2'
  AND waypoints->3->>'name' = 'Lower Boston Basin Camp'
  AND waypoints->3->>'type' = 'Campsite'
  AND (waypoints->3->>'elev')::numeric = 5700;

-- wa_northwest_ridge_2 (Boston Peak): descent_text and rappels both point a
-- climber toward a "Southwest Face" descent route that does not exist on
-- this peak. Boston Peak's only routes on file are this ridge,
-- wa_boston_peak_west_face (West Face, no descent beta on file), and
-- wa_boston_peak_southeast_face (Southeast Face) -- and the Southeast Face
-- row's own rappels/descent_text ("3 x 25-30m rappels to snow"; "Three
-- rappels down the southeast/east face bring you back to the snow at the
-- head of the Boston Glacier, near the base of the Sahale-Boston col") is
-- word-for-word the route being described here ("3 rappels down the
-- southeast/east face on fixed slings to the Boston Glacier"). Corrects the
-- route name from Southwest to Southeast, and aligns the rappels summary
-- with the sibling route's authoritative rappel count/destination rather
-- than the vague, inconsistent "3-5... south-face... Boston-Sahale col"
-- text.
UPDATE routes
SET descent_text = replace(
      descent_text,
      'the Southwest Face''s established rappel line',
      'the Southeast Face''s established rappel line'
    )
WHERE id = 'wa_northwest_ridge_2'
  AND descent_text LIKE '%the Southwest Face''s established rappel line%';

UPDATE routes
SET rappels = '3 rappels down the Southeast Face route (fixed slings/natural anchors, not bolts) to the head of the Boston Glacier near the Sahale-Boston col -- see wa_boston_peak_southeast_face, the only documented descent off this peak'
WHERE id = 'wa_northwest_ridge_2'
  AND rappels = '3–5 rappels down the standard south-face route, threading around several gendarmes back toward the Boston–Sahale col';

-- wa_old_snowy_mountain_r1 (Old Snowy Mountain): access.fees claims a
-- Northwest Forest Pass / day fee is "required at the Snowgrass Flats
-- (Trail #96) trailhead", directly contradicting this same row's own
-- access.parking_pass field ("Not required at Snowgrass Flat; required at
-- Berry Patch trailhead"). Corroborated externally (WTA and USFS Gifford
-- Pinchot NF Trail #96 Snowgrass pages): no Northwest Forest Pass is
-- required at the Snowgrass Flats trailhead itself (only the free
-- self-issued wilderness permit); the pass is required at the nearby
-- overflow trailhead, Berry Patch.
UPDATE routes
SET access = jsonb_set(
      access,
      '{fees}',
      '"No fee/pass required at the Snowgrass Flats (Trail #96) trailhead itself -- only the free self-issued Goat Rocks Wilderness permit. A Northwest Forest Pass ($5/day or $30/year) is required at the overflow Berry Patch trailhead, payable by cash/check envelope, Recreation.gov Scan & Pay, or a valid Recreation Pass."'::jsonb
    )
WHERE id = 'wa_old_snowy_mountain_r1'
  AND access->>'fees' = '$5 per vehicle per day, or a $30 annual Northwest Forest Pass, required at the Snowgrass Flats (Trail #96) trailhead; payable by cash/check envelope, Recreation.gov Scan & Pay, or a valid Recreation Pass.';

-- wa_old_guard_peak_southwest_route (Old Guard Peak): access.land_manager
-- and access.parking_pass both carry literal stray leading/trailing
-- double-quote characters baked into the string value itself -- a
-- copy-paste/escaping artifact from the prior correction recorded in this
-- row's own `corrections` field ("2026-07-31: access.land_manager
-- corrected from... to..."). As stored, the app would render these two
-- fields wrapped in literal quotation marks on screen. Strips the stray
-- quotes; the underlying text is unchanged and matches this row's own
-- already-correct landManager/passRequired fields.
UPDATE routes
SET access = jsonb_set(
      access,
      '{land_manager}',
      to_jsonb(trim(both '"' from access->>'land_manager'))
    )
WHERE id = 'wa_old_guard_peak_southwest_route'
  AND access->>'land_manager' = '"Okanogan-Wenatchee National Forest (Chelan Ranger District) — Glacier Peak Wilderness"';

UPDATE routes
SET access = jsonb_set(
      access,
      '{parking_pass}',
      to_jsonb(trim(both '"' from access->>'parking_pass'))
    )
WHERE id = 'wa_old_guard_peak_southwest_route'
  AND access->>'parking_pass' = '"No Northwest Forest Pass needed for wilderness travel; NPS wilderness permit only required if camping within the park (north of Cache Col). (The Mountain Loop Highway trailhead reference previously here was boilerplate from an unrelated Mt. Baker-Snoqualmie NF corridor and did not apply to this route.)"';

-- wa_olympus_blue_glacier_east_ramps (Mount Olympus): access.notes has the
-- same stray-quote artifact as above (same class of defect, different row
-- and column -- this row's own `corrections` field records an earlier,
-- unrelated copy-paste-contamination fix having been applied to this row on
-- 2026-07-31, from the same "batch 15" DB-wide cleanup this file's
-- corrections history references).
UPDATE routes
SET access = jsonb_set(
      access,
      '{notes}',
      to_jsonb(trim(both '"' from access->>'notes'))
    )
WHERE id = 'wa_olympus_blue_glacier_east_ramps'
  AND access->>'notes' = '"Olympic National Park entrance fee applies (see parking_pass); no specific climbing permit beyond the standard overnight wilderness permit noted above."';

-- wa_nw_ridge_2 (Colchuck Balanced Rock): gain_ft (4760) is physically
-- impossible given this same row's own trailhead waypoint (Stuart Lake
-- Trailhead, 3400 ft) and summit waypoint/high_point_ft/area.elevation_ft
-- (8240 ft, externally corroborated exactly via Wikipedia's Colchuck
-- Balanced Rock article) -- a party starting at 3,400 ft and finishing on
-- an 8,240 ft summit has gained at least 4,840 ft, 80 ft more than stored,
-- regardless of route wiggles (gain can only be understated by such a
-- floor violation, never overstated by one -- see CLAUDE.md's
-- check:gain-floor-stated/audit:gain doctrine). pitches=0 on this row, so
-- no pitches x 35m climbing-vertical credit applies to reduce the floor.
-- Raises gain_ft to the physical minimum and removes the now-contradicted
-- "roughly 4,760 ft of total gain" trip-report figure from the approach
-- prose (replaced with the net-rise arithmetic honestly stated as a floor,
-- consistent with this dataset's existing "at least" hedging style
-- elsewhere), while leaving the unrelated 12-hour/round-trip-distance
-- clauses untouched.
UPDATE routes
SET gain_ft = 4840
WHERE id = 'wa_nw_ridge_2'
  AND gain_ft = 4760;

UPDATE routes
SET approach = replace(
      approach,
      $q$One documented ascent clocked roughly 4,760 ft of total gain and a 12-hour car-to-car day, consistent with the route's ~18.5 km round-trip distance.$q$,
      $q$Trailhead-to-summit net rise is at least 4,840 ft (3,400 ft trailhead to the 8,240 ft summit) — one documented ascent logged a 12-hour car-to-car day, consistent with the route's ~18.5 km round-trip distance.$q$
    )
WHERE id = 'wa_nw_ridge_2'
  AND approach LIKE '%One documented ascent clocked roughly 4,760 ft of total gain%';
