-- WA alpine route audit — pass 7, batch 423
-- Routes: wa_mount_adams_adams_glacier, wa_mount_adams_avalanche_white_salmon_glaciers,
--   wa_mount_adams_lava_glacier_headwall, wa_mount_adams_lyman_glacier,
--   wa_mount_adams_mazama_glacier_headwall, wa_mount_adams_north_ridge,
--   wa_mount_adams_northwest_ridge, wa_mount_adams_pinnacle_glacier_headwall,
--   wa_mount_adams_south_climb, wa_mount_adams_wilson_glacier_headwall
-- All statements guarded on the row's current stored value, so a concurrent edit or a
-- re-run after this has already applied is a safe no-op rather than a silent overwrite.

BEGIN;

-- Wilson Glacier Headwall: access.land_manager said "U.S. Forest Service" and
-- access.parking_pass said "Northwest Forest Pass" -- both contradicted by this SAME
-- row's own access.landManager ("Yakama Nation (Tract D, eastern Mount Adams)"),
-- access.closures ("Yakama Nation Tract D is largely closed to public recreation...")
-- and access.overnight_permit fields, which correctly place this route on tribal land.
-- Wikipedia's Wilson Glacier (Mount Adams) article confirms the glacier "lies on the
-- east slopes of Mount Adams," and the Forest Service's own Mt. Adams wilderness page
-- states the east-side portion of the mountain is managed by the Yakama Nation, not
-- Gifford Pinchot National Forest -- a Northwest Forest Pass has no standing there.
-- access.land_manager and access.parking_pass look like leftover copies of the generic
-- Forest-Service-land template shared by this area's other, non-Yakama routes (the
-- row's own access.rules field even says, of the OTHER routes, "the standard South
-- Climb/Cold Springs route stays on Forest Service land and does not [cross Yakama
-- land]" -- true of those routes, not of this one). Correcting only the two
-- self-contradictory keys; the longer prose fields were left alone.
UPDATE routes
SET access = jsonb_set(
  jsonb_set(access, '{land_manager}', to_jsonb('Yakama Nation (Tract D, eastern Mount Adams)'::text)),
  '{parking_pass}',
  to_jsonb('Yakama Nation Tract D permit, purchased at the fee station where the road enters the reservation -- a Northwest Forest Pass does not apply here'::text)
)
WHERE id = 'wa_mount_adams_wilson_glacier_headwall'
  AND access->>'land_manager' = 'U.S. Forest Service'
  AND access->>'landManager' = 'Yakama Nation (Tract D, eastern Mount Adams)'
  AND access->>'parking_pass' = 'Northwest Forest Pass';

COMMIT;
