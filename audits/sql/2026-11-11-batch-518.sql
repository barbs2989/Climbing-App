-- wa_mount_ellinor_southeast_chute: high_point_ft is NULL, though the route's own summit
-- waypoint, WTA, and SummitPost all give 5,944 ft for Mount Ellinor's summit.
UPDATE routes
SET high_point_ft = 5944
WHERE id = 'wa_mount_ellinor_southeast_chute';

-- wa_mount_ellinor_southeast_chute: the upper-trailhead waypoint is labeled "(NFR 24)", but FR 24
-- is only the shared first 1.6 mi leg common to BOTH trailheads -- it doesn't identify this one.
-- This row's own approach text, the USFS trailhead page, and WTA all agree the upper trailhead
-- sits at the end of spur road FR 2419-014, off FR 2419.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,name}', '"Mount Ellinor Upper Trailhead (FR 2419-014)"')
WHERE id = 'wa_mount_ellinor_southeast_chute'
  AND waypoints->1->>'name' = 'Mount Ellinor Upper Trailhead (NFR 24)';

-- wa_mount_fairchild_standard: the overview text and the summit waypoint both say "6,899 ft" for
-- Mount Fairchild's elevation, but no source corroborates that figure (TopoZone ~6,913 ft,
-- TopoQuest/MyTopo ~6,916 ft, Peakbagger/ListsOfJohn 6,925 ft). Wikipedia's documented figure is
-- 6,900 ft, which is what this row's own high_point_ft column already stores -- so the prose and
-- waypoint are the inconsistent fields, not the column.
UPDATE routes
SET overview = replace(overview, '(6,899 ft)', '(6,900 ft)')
WHERE id = 'wa_mount_fairchild_standard'
  AND overview LIKE '%(6,899 ft)%';

UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(waypoints, '{7,elev}', '6900'),
      '{7,directions}',
      to_jsonb(replace(waypoints->7->>'directions', '6,899 ft', '6,900 ft'))
    )
WHERE id = 'wa_mount_fairchild_standard'
  AND waypoints->7->>'name' = 'Mount Fairchild'
  AND (waypoints->7->>'elev')::int = 6899;

-- wa_mount_fricaba_standard: overview claims Fricaba is "the highest point in both" Olympic
-- National Park and the Buckhorn Wilderness. The Buckhorn Wilderness half is correct, but the
-- National Park half is false on its face -- Mount Olympus (7,980 ft), well inside Olympic
-- National Park, is far higher than Fricaba (7,139 ft) and is the park's actual high point.
-- Wikipedia's actual claim is that Fricaba is the high point of the Buckhorn Wilderness and the
-- surrounding Olympic National Forest, not the Park.
UPDATE routes
SET overview = replace(
      overview,
      'Olympic National Park and the Buckhorn Wilderness of Olympic National Forest — it is the highest point in both.',
      'Olympic National Park and the Buckhorn Wilderness of Olympic National Forest — it is the highest point of both the wilderness and the surrounding national forest.'
    )
WHERE id = 'wa_mount_fricaba_standard'
  AND overview LIKE '%it is the highest point in both.%';
