-- wa_mount_index_north_face: approach_logistics.peakLat/peakLng stores 47.7745/-121.5809 --
-- that is Mount Index's MAIN summit coordinate (the wa_mount_index area row's own lat/lng),
-- not this route's own peak. The route climbs North Peak, a distinct sub-summit of the Index
-- massif whose own area row (wa_north_peak_2) already stores 47.78255/-121.58273, and whose
-- high_point_ft (5357) on this very route row already correctly reflects North Peak's lower
-- elevation rather than the main peak's 5991 ft -- so the row's own fields disagree with each
-- other. ListsOfJohn's independent coordinate for "Mount Index-North Peak" (47.78269,
-- -121.58248) confirms the area row's figure is right and approach_logistics is the stale one,
-- most likely copied from the parent Mount Index area before this route was filed under its
-- own sub-peak.
UPDATE routes
SET approach_logistics = jsonb_set(
      jsonb_set(approach_logistics, '{peakLat}', '47.78255'),
      '{peakLng}', '-121.58273'
    )
WHERE id = 'wa_mount_index_north_face'
  AND approach_logistics->>'peakLat' = '47.7745'
  AND approach_logistics->>'peakLng' = '-121.5809';
