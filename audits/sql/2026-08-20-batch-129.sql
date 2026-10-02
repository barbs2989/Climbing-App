-- wa_ghost_peak_south_route: descent_text's final sentence sends the climber out via
-- "the Big Beaver Trail to Ross Lake and the dam" -- but this route's own approach text,
-- approach_logistics.trailhead ("Hannegan Pass Trailhead"), all seven waypoints, and the
-- itinerary's own final two sections ("Begin the exit: back over the passes" /
-- "Hike out to the Hannegan Pass trailhead") all agree access is via Hannegan Pass, and the
-- approach text explicitly states Ross Lake/Big Beaver instead serves Luna Peak and Mount
-- Fury further south. A prior batch's note claims this exact contradiction was already fixed
-- once; this final sentence was evidently missed. Corrected to match the rest of the row.
UPDATE routes
SET descent_text = replace(
  descent_text,
  'and out the Big Beaver Trail to Ross Lake and the dam.',
  'then down the Brush Creek Trail, re-cross the Chilliwack River, and continue over Hannegan Pass to the Hannegan Pass Trailhead.'
)
WHERE id = 'wa_ghost_peak_south_route';

-- wa_gilbert_peak_conrad_glacier: emergency.rangerStation says "Cowlitz Valley Ranger
-- District, Gifford Pinchot NF" -- the west-side (Snowgrass Flat/Packwood) ranger district.
-- This route's own approach starts at "South Tieton Creek/Conrad Meadows Trailhead", the
-- east-side approach, which its sibling wa_gilbert_peak_meade_glacier (identical trailhead)
-- already correctly assigns to "Naches Ranger District, Okanogan-Wenatchee National Forest".
-- Only wa_gilbert_peak_west_route (Snowgrass Flat, the genuine west-side approach) should
-- carry the Cowlitz Valley/Gifford Pinchot value. Corrected to match the Naches-side approach.
UPDATE routes
SET emergency = jsonb_set(emergency, '{rangerStation}', '"Naches Ranger District, Okanogan-Wenatchee National Forest"'::jsonb)
WHERE id = 'wa_gilbert_peak_conrad_glacier';

-- wa_gilbert_peak_meade_glacier: access carries BOTH spellings of land manager, and they
-- disagree. access.landManager (camelCase) correctly reads "Okanogan-Wenatchee National
-- Forest (Naches Ranger District) for the Conrad Meadows approach..." -- but
-- access.land_manager (snake_case) still reads the stale west-side value "Gifford Pinchot
-- National Forest (Cowlitz Valley Ranger District) -- Goat Rocks Wilderness", copy-pasted
-- from the West Route's Snowgrass-side approach. Per CLAUDE.md, RouteDetail reads
-- `ac.land_manager||ac.landManager`, i.e. land_manager wins -- so the wrong value is the one
-- actually rendered on screen despite the correct value sitting right beside it, unread.
-- Synced land_manager to match the already-correct landManager value.
UPDATE routes
SET access = jsonb_set(access, '{land_manager}', to_jsonb(access->>'landManager'))
WHERE id = 'wa_gilbert_peak_meade_glacier';
