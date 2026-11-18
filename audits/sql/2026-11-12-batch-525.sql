-- wa_mount_st_helens_monitor_ridge: access.fees describes parking at "Marble Mountain
-- Sno-Park during the winter Sno-Park season" -- that is the trailhead and fee for this
-- catalog's OWN sibling route, wa_mount_st_helens_worm_flows (the winter/spring route), not
-- Monitor Ridge. Monitor Ridge's actual trailhead is Climbers Bivouac (confirmed by this same
-- row's own `road` field: "FR 81 / FR 830 to Climbers Bivouac", and its own `parking_pass`
-- field, which already correctly states the Climbers Bivouac fee). The Forest Service's
-- Climbers Bivouac page and Recreation.gov's trailhead listing confirm the fee there is
-- $5/vehicle/day (or a Northwest Forest/Interagency Pass), waived on the date of a valid
-- climbing permit -- not a Washington Sno-Park permit, which only applies at Marble Mountain
-- Sno-Park for the winter approach. This is a copy-paste duplication from the Worm Flows row,
-- not a sourcing dispute: the row contradicts its own `parking_pass` field.
UPDATE routes
SET access = jsonb_set(
  access,
  '{fees}',
  to_jsonb('A $5/vehicle/day fee (or a Northwest Forest / Interagency Pass) is required to park at Climbers Bivouac, waived on the date of a valid climbing permit. (This is distinct from the Washington Sno-Park permit needed at Marble Mountain Sno-Park for the winter Worm Flows route -- that trailhead does not apply to Monitor Ridge.)'::text)
)
WHERE id = 'wa_mount_st_helens_monitor_ridge'
  AND access->>'fees' = 'A Washington Sno-Park permit (or Forest Service equivalent) is required to park at Marble Mountain Sno-Park during the winter Sno-Park season.';
