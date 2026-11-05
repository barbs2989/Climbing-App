-- WA alpine audit batch 341 (pass 6)
-- Routes: wa_mount_constance_finger_traverse (flagged only), wa_mount_constance_west_arete (flagged only),
--         wa_mount_crowder_northeast_ridge (flagged only), wa_mount_crowder_southwest_route (fix),
--         wa_mount_cruiser_nw_face_corner (fix), wa_mount_cruiser_south_corner (fix),
--         wa_mount_custer_standard (flagged only), wa_mount_daniel_daniel_glacier (clean)

-- =========================================================================
-- Mount Crowder, Southwest Route -- wa_mount_crowder_southwest_route
-- =========================================================================
-- The row contradicts itself: `fa` credits this route with the peak's 1962 first ascent
-- (Cal Magnusson, Jack Ardussi, Don Mech, Don Schmechel, as "Old Brownie"), while the row's
-- own `corrections` field says in plain language that this 1962 ascent "climbed the NE Ridge
-- line, not this Southwest Route/SW Flank -- so no 'fa' credit is attached to this route
-- entry; the FA belongs to a different, undocumented-here route." The sibling
-- wa_mount_crowder_northeast_ridge route already carries fa = NULL, so the credit isn't even
-- duplicated there -- it's simply misfiled on this row, contradicting the row's own recorded
-- reasoning. Nulling it out per that reasoning rather than moving it to the NE Ridge route,
-- since no source reached in this pass independently confirms which flank the 1962 party
-- actually climbed (AAC Publications' Northern Pickets history corroborates the 1962 FA of
-- the peak itself but not which face/ridge).
UPDATE routes
SET fa = NULL
WHERE id = 'wa_mount_crowder_southwest_route'
  AND fa = 'Cal Magnusson, Jack Ardussi, Don Mech, and Don Schmechel, 1962 (first ascent of the peak)';

-- =========================================================================
-- Mount Cruiser, Northwest Face Corner -- wa_mount_cruiser_nw_face_corner
-- =========================================================================
-- This row was never refreshed after Forest Road 24 / the Staircase entrance reopened.
-- USFS Olympic National Forest's own release ("Olympic National Forest & Park to Reopen
-- FS-24, Lake Cushman Recreation Sites, and Staircase Area") together with contemporaneous
-- KING5 and myclallamcounty.com coverage confirm FS-24 and the Staircase developed
-- area/entrance reopened July 8, 2026. The sibling wa_mount_cruiser_south_corner route
-- (access_checked_at 2026-08-27) already reflects this; this row's road.status and
-- access.closures still describe the road/entrance itself as closed. The North Fork
-- Skokomish River Trail and Flapjack Lakes Trail beyond the entrance remain closed with no
-- stated reopening date -- that practical bottom line (no current legal approach to Cruiser
-- via Flapjack Lakes) is preserved, only the road/entrance status is corrected.
UPDATE routes
SET road = jsonb_set(
  road,
  '{status}',
  '"Open -- FS-24 and the Staircase entrance reopened 8 July 2026 after the 2025 Bear Gulch Fire closure. The North Fork Skokomish River Trail and Flapjack Lakes Trail beyond Staircase remain closed with no stated reopening date. Verify before driving out."'::jsonb
)
WHERE id = 'wa_mount_cruiser_nw_face_corner'
  AND road->>'status' = 'Closed as of 2026 due to the Bear Gulch Fire closure order (FR 24 gated near milepost 10.5–14.5; the Staircase entrance is also closed) — verify current status before driving out.';

UPDATE routes
SET access = jsonb_set(
  access,
  '{closures}',
  '"The Staircase entrance and Lake Cushman Rd/FS-24 reopened July 8, 2026, but the North Fork Skokomish River Trail, Flapjack Lakes Trail, and the nearby Mildred Lakes Trail (an alternate approach) remain CLOSED with no stated reopening date following the 2025 Bear Gulch Fire (rockfall/treefall/landslide hazard in the burn scar). There is currently no legal approach to Mount Cruiser via Flapjack Lakes -- check NPS Olympic 'Fire Conditions and Updates' and Olympic National Forest alerts before planning a trip."'::jsonb
)
WHERE id = 'wa_mount_cruiser_nw_face_corner'
  AND access->>'closures' = 'IMPORTANT (current as of mid-2026): the entire standard approach — Staircase entrance, North Fork Skokomish River Trail, Flapjack Lakes Trail, and the nearby Mildred Lakes Trail (an alternate approach) — is closed following the 2025 Bear Gulch Fire on the slopes above Lake Cushman (fire fully contained Nov 12, 2025, but rockfall/treefall/landslide hazard remains in the burn scar). NPS and Olympic National Forest closure orders remain in effect (through at least Oct 1, 2026 per USFS order 06-09-25-11); Lake Cushman Rd/Forest Road 24 access is also closed. There is currently no legal approach to Mount Cruiser via Flapjack Lakes — check NPS Olympic ''Fire Conditions and Updates'' and Olympic National Forest alerts before planning a trip.';

UPDATE routes
SET waypoints = jsonb_set(
  waypoints,
  '{0,note}',
  '"Approach via Flapjack Lakes Trail to Gladys Divide/Needle Pass. Note: the Staircase entrance/FS-24 reopened July 8, 2026, but the Flapjack Lakes Trail beyond it remains closed post-2025 Bear Gulch Fire."'::jsonb
)
WHERE id = 'wa_mount_cruiser_nw_face_corner'
  AND waypoints->0->>'note' = 'Approach via Flapjack Lakes Trail to Gladys Divide/Needle Pass. Note: Staircase area is currently closed post-2025 Bear Gulch Fire.';

UPDATE routes
SET access_checked_at = '2026-09-25T12:00:00+00:00'
WHERE id = 'wa_mount_cruiser_nw_face_corner'
  AND access_checked_at IS NULL;

-- =========================================================================
-- Mount Cruiser, South Corner -- wa_mount_cruiser_south_corner
-- =========================================================================
-- Two leftover stale items on an otherwise already-refreshed row (access_checked_at
-- 2026-08-27, and its road.status/access.closures already correctly describe the July 8,
-- 2026 FS-24 reopening -- so no changes needed there). First, this route's waypoints[0]
-- note still carries the same pre-reopening "Staircase area is currently closed" text as
-- its sibling above, contradicting this row's own (correct) road.status. Second, the
-- access._raw block is a stale, unrefreshed ingest leftover whose permit_cost figure
-- ($10 park entry + $5 group fee + $2/night camping) doesn't match -- and is superseded by
-- -- the correct, already-present access.parking_pass ($30/vehicle 7-day / $55 annual) and
-- the $6 Recreation.gov reservation fee + $8/person/night backcountry camping fee cited on
-- the sibling route, both confirmed current via NPS's entrance-fee and Olympic wilderness
-- fee schedules.
UPDATE routes
SET waypoints = jsonb_set(
  waypoints,
  '{0,note}',
  '"Approach via Flapjack Lakes Trail to Gladys Divide/Needle Pass. Note: the Staircase entrance/FS-24 reopened July 8, 2026, but the Flapjack Lakes Trail beyond it remains closed post-2025 Bear Gulch Fire."'::jsonb
)
WHERE id = 'wa_mount_cruiser_south_corner'
  AND waypoints->0->>'note' = 'Approach via Flapjack Lakes Trail to Gladys Divide/Needle Pass. Note: Staircase area is currently closed post-2025 Bear Gulch Fire.';

UPDATE routes
SET access = jsonb_set(
  access,
  '{_raw,permit_cost}',
  '"$30/vehicle or $15/person 7-day Olympic NP entrance fee. Overnight backcountry camping requires a $6 Recreation.gov reservation fee plus $8/person/night (16+, free under 16)."'::jsonb
)
WHERE id = 'wa_mount_cruiser_south_corner'
  AND access->'_raw'->>'permit_cost' = '$10 park entry fee (7 days) + $5 group fee + $2 per night camping';
