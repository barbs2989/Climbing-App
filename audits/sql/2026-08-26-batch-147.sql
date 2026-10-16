-- Batch 147 (pass 3, 2026-08-26)
-- Routes: Mount Logan (Douglas Glacier), Mount Mathias (Bailey Range Scramble), Mount Maude
-- (North Face, Entiat Ice Fall), Mount Mystery (Standard Scramble), Mount Olympus (Blue
-- Glacier, West Ridge), Mount Persis (The Hexorcist, West Ridge), Mount Pilchuck (East
-- Ridge / Iodine Gulch-Bathtub Lakes).

-- wa_mount_mathias_scramble: waypoints[0] is internally self-contradictory. Its own note
-- reads "start of the Sol Duc/High Divide approach into the Bailey Range" and its name says
-- "Hoh River Trailhead (Hoh Rain Forest Visitor Center)" -- but its stored coordinates
-- (47.86028,-123.93472) are the real Hoh River Trailhead's, identical to the coordinate this
-- same batch's wa_mount_olympus_blue_glacier/wa_mount_olympus_west_ridge rows correctly use
-- for that trailhead, at elevation 578 ft. The waypoint's own stated elevation (1950 ft) does
-- not match the Hoh trailhead at all; it closely matches the real Sol Duc Falls Trailhead
-- (elevation ~1,882-1,950 ft per NPS/trip-report sources, coordinates ~47.955249,-123.835839),
-- which is the documented start of the Bailey Range Traverse approach this waypoint's own note
-- describes (Sol Duc -> Heart Lake -> High Divide near Bogachiel Peak -> Eleven Bull Basin --
-- exactly the route this row's remaining six waypoints trace). The row's own gain_ft (6130)
-- also only reconciles with the waypoint elevation profile if this first waypoint sits at
-- ~1950 ft, corroborating that the elevation is right and only the name/coordinates are wrong.
-- Corrected the name and coordinates to the Sol Duc Falls Trailhead the waypoint's own note
-- already claims to be; left elevation, note, type and distMi untouched.
-- (Separately, flagged but not fixed: this row's `approach`/`beta`/`approach_logistics` text
-- describe reaching Mount Mathias via a completely different corridor -- the Hoh River Trail,
-- Blue Glacier, Snow Dome and Hoh Glacier -- with no mention anywhere of Sol Duc, High Divide,
-- Eleven Bull Basin, Ferry Basin, Blizzard Pass or Camp Pan, all of which the `waypoints` array
-- names in detail. Both are real, documented ways parties reach Mathias (a direct Hoh Glacier
-- approach, and the full Bailey Range Traverse from Sol Duc), but this single row currently
-- presents them as one undifferentiated route/approach. Reconciling that is an editorial
-- decision about which approach (or both) this row should document, not a database typo --
-- needs human judgment, not left to a batch SQL fix.)
UPDATE routes
SET waypoints = jsonb_set(
  jsonb_set(
    jsonb_set(waypoints, '{0,lat}', '47.955249'),
    '{0,lng}', '-123.835839'
  ),
  '{0,name}', '"Sol Duc Trailhead (Sol Duc Falls Trailhead)"'
)
WHERE id = 'wa_mount_mathias_scramble'
  AND waypoints->0->>'name' = 'Hoh River Trailhead (Hoh Rain Forest Visitor Center)'
  AND (waypoints->0->>'lat')::numeric = 47.86028
  AND (waypoints->0->>'lng')::numeric = -123.93472;
