-- Batch 123 (pass 3): wa_direct_north_buttress, wa_direct_southwest_buttress,
-- wa_direct_west_face, wa_dirty_sanchez, wa_dolphin_chimney,
-- wa_dome_peak_dome_glacier, wa_dome_peak_indian_summer, wa_dorado_needle_east_ridge

-- wa_direct_north_buttress (Bear Mountain, Direct North Buttress):
-- `road` described "Depot Creek Road (BC) via Chilliwack River Road, from
-- Chilliwack, BC" -- but this row's own `approach` text, `approach_logistics`
-- (trailhead: "Hannegan Pass Trailhead (Trail #674, FR-32)") and its own `bivy`
-- entries all agree the approach is from the Hannegan Pass Trailhead on the US
-- side. Depot Creek Road is explicitly named in this same row's own bivy list as
-- the Redoubt/Spickard approach ("NOT reachable from the Hannegan Pass
-- trailhead -- it must never be treated as an alternative camp on that
-- approach"), a different peak pair entirely. Reconciled `road` to the
-- Hannegan Pass Trailhead / FR-32 approach the rest of the row already
-- describes.
UPDATE routes SET road = '{
  "name": "Hannegan Pass Trailhead, FR-32 (Ruth Creek Road)",
  "status": "Gravel Forest Service road to a trailhead, condition can vary season to season, check current Mt. Baker-Snoqualmie NF road status before a trip.",
  "driveNote": "From Glacier, WA on the Mt. Baker Highway (SR-542), turn onto Hannegan Road (FR-32) and follow it to its end at the Hannegan Pass Trailhead (~3,120 ft). From there, hike over Hannegan Pass and down the Chilliwack River Trail, leaving the maintained trail near the Copper Ridge junction to reach Bear Mountain''s west ridge.",
  "seasonalGate": "FR-32 and the Hannegan Pass Trail are typically snow-free and accessible mid-summer through early fall, check current conditions each season."
}'::jsonb
WHERE id = 'wa_direct_north_buttress';

-- wa_dorado_needle_east_ridge (East Ridge / Inspiration Glacier):
-- The first waypoint (the Eldorado Creek trailhead) carries a `note` that reads
-- "Existing DB value (48.492611,-121.117611) appears incorrect ... recommend
-- correcting to this value" -- but that "existing" value IS the value currently
-- stored in this same waypoint (48.49261,-121.11761, matching this row's own
-- approach_logistics.trailheadLat/Lng and the same trailhead used by
-- wa_direct_southwest_buttress). The note is stale scratch commentary left over
-- from an earlier correction pass and no longer describes anything true;
-- replaced with a plain, accurate note.
UPDATE routes SET waypoints = jsonb_set(
  waypoints,
  '{0}',
  (waypoints->0) - 'note' || '{"note": "Same Eldorado Creek trailhead used by the other Dorado Needle routes (Southwest Buttress, Direct Southwest Buttress, Northwest Ridge)."}'::jsonb
)
WHERE id = 'wa_dorado_needle_east_ridge';
