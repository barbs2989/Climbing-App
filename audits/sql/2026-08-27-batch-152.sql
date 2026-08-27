-- WA alpine audit — batch 152 (2026-08-27, pass 3)
-- Routes: wa_mount_shuksan_sulphide_glacier, wa_mount_shuksan_white_salmon_glacier,
-- wa_mount_spickard_silver_glacier, wa_mount_spickard_southwest,
-- wa_mount_st_helens_monitor_ridge, wa_mount_st_helens_worm_flows,
-- wa_mount_steel_first_divide, wa_mount_stuart_girth_pillar.
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention. Apply each UPDATE individually rather than
-- pasting the whole file at once.

-- =========================================================================
-- Mount Shuksan (wa_mount_shuksan) — wa_mount_shuksan_white_salmon_glacier
-- (White Salmon Glacier)
-- =========================================================================

-- bivy held 6 entries. Three (Sulphide Glacier camp, Sulphide Glacier high
-- camp, Shannon Ridge crest camps below the park boundary) describe the
-- SOUTH side of Shuksan -- FS Road 1152/Shannon Ridge Trail, the approach
-- for the wholly separate Sulphide Glacier route (this batch's sibling
-- wa_mount_shuksan_sulphide_glacier, whose own approach text and own
-- 3-entry bivy list is entirely about this south side and does not
-- reciprocally carry any White Salmon/Lake Ann/Fisher Chimneys entries).
-- White Salmon Glacier's own approach text is entirely NORTH side (Lake
-- Ann Trail over Austin Pass, SR-542) and shares nothing with Shannon
-- Ridge/FS 1152. Same audit:camp-route-fit corridor-zone-file
-- contamination CLAUDE.md documents (e.g. the Ellation/Ruth Mountain
-- summit camp case, and batch 148/150's wa_mount_pilchuck/wa_mount_seattle
-- fixes). The remaining 3 entries are genuinely this route's own: "Lake
-- Ann basin" is this route's own trailhead-area camp (explicitly serves
-- "both the Fisher Chimneys and the North Face" per its own note, and
-- Lake Ann Trail is this route's stated approach); "Fisher Chimneys
-- camps, White Salmon and above Winnie's Slide" sits at 6,800 ft and
-- names this route's own "Winnie's Slide" waypoint (also 6,800 ft) —
-- matching the route's own approach text ("high camp at ~6,500 ft on
-- moraine above White Salmon Glacier"); "North Face bivy" explicitly
-- states in its own note that "North Face parties share the early
-- approach with the White Salmon Glacier route ... before the two
-- diverge".
UPDATE routes SET bivy = jsonb_build_array(bivy->3, bivy->4, bivy->5)
WHERE id = 'wa_mount_shuksan_white_salmon_glacier'
  AND jsonb_array_length(bivy) = 6
  AND bivy->0->>'name' = 'Sulphide Glacier camp'
  AND bivy->1->>'name' = 'Shannon Ridge crest camps, below the park boundary'
  AND bivy->2->>'name' = 'Sulphide Glacier high camp'
  AND bivy->3->>'name' = 'Lake Ann basin';

-- Summit waypoint elev (9127) contradicted this row's own high_point_ft
-- (9131), the parent area's elevation_ft (9131, per areas.wa_mount_shuksan),
-- this batch's sibling wa_mount_shuksan_sulphide_glacier (9131), and the
-- externally-cited official figure. This is the identical 9127-vs-9131
-- defect batch 151's log already fixed on two other Shuksan routes
-- (Hanging Glacier, Northwest Arête) -- this route wasn't in that batch
-- so it carried the same defect forward.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{4,elev}', '9131')
WHERE id = 'wa_mount_shuksan_white_salmon_glacier'
  AND waypoints->4->>'name' = 'Mount Shuksan'
  AND waypoints->4->>'type' = 'Summit'
  AND (waypoints->4->>'elev')::numeric = 9127;

-- =========================================================================
-- Mount St. Helens (wa_mount_st_helens) — wa_mount_st_helens_monitor_ridge
-- (Monitor Ridge) and wa_mount_st_helens_worm_flows (Worm Flows)
-- =========================================================================

-- bivy held 7 entries on both rows, identical arrays. Five of them
-- (Snowgrass Flat area backcountry camps, Goat Lake basin, Dana Yelverton
-- Shelter site, Chambers Lake Campground, Conrad Meadows and Surprise
-- Lake/South Fork Tieton) describe camps in the GOAT ROCKS WILDERNESS near
-- Packwood/White Pass (accessed off US-12 and FR-21) -- explicitly, per
-- their own notes, staging for Old Snowy Mountain, Ives Peak and Gilbert
-- Peak, none of which is Mount St. Helens. Goat Rocks is a separate
-- wilderness area and mountain range roughly 60+ miles from St. Helens
-- (near Cougar, WA, off SR-503/FR-90), with no shared trailhead, road
-- system or drainage. Confirmed externally (Snowgrass Flat trailhead is
-- reached via US-12 + FR-21 near Packwood; Dana Yelverton Shelter/Old
-- Snowy is in Goat Rocks Wilderness). Textbook audit:camp-route-fit
-- corridor-zone-file contamination, same shape as the batch 148/150
-- Pilchuck/Seattle fixes but between two unrelated mountain ranges rather
-- than within one massif. The remaining 2 entries (Climbers Bivouac,
-- Marble Mountain Sno-Park) are this route's own actual trailheads,
-- named in both routes' own approach text.
UPDATE routes SET bivy = jsonb_build_array(bivy->5, jsonb_set(bivy->6, '{elev}', '2800'))
WHERE id = 'wa_mount_st_helens_monitor_ridge'
  AND jsonb_array_length(bivy) = 7
  AND bivy->0->>'name' = 'Snowgrass Flat area backcountry camps'
  AND bivy->1->>'name' = 'Goat Lake basin'
  AND bivy->2->>'name' = 'Dana Yelverton Shelter site'
  AND bivy->3->>'name' = 'Chambers Lake Campground'
  AND bivy->4->>'name' = 'Conrad Meadows and Surprise Lake, South Fork Tieton'
  AND bivy->5->>'name' = 'Climbers Bivouac'
  AND bivy->6->>'name' = 'Marble Mountain Sno-Park'
  AND (bivy->6->>'elev')::numeric = 2700;

-- Same Goat Rocks contamination, identical 7-entry array. Also folds in
-- the Marble Mountain Sno-Park elev fix (2700 -> 2800; see below for the
-- corroborating detail from this row's own waypoint/approach text).
UPDATE routes SET bivy = jsonb_build_array(bivy->5, jsonb_set(bivy->6, '{elev}', '2800'))
WHERE id = 'wa_mount_st_helens_worm_flows'
  AND jsonb_array_length(bivy) = 7
  AND bivy->0->>'name' = 'Snowgrass Flat area backcountry camps'
  AND bivy->1->>'name' = 'Goat Lake basin'
  AND bivy->2->>'name' = 'Dana Yelverton Shelter site'
  AND bivy->3->>'name' = 'Chambers Lake Campground'
  AND bivy->4->>'name' = 'Conrad Meadows and Surprise Lake, South Fork Tieton'
  AND bivy->5->>'name' = 'Climbers Bivouac'
  AND bivy->6->>'name' = 'Marble Mountain Sno-Park'
  AND (bivy->6->>'elev')::numeric = 2700;

-- wa_mount_st_helens_worm_flows's own trailhead waypoint ("Marble Mountain
-- Sno-Park") read elev 2680, disagreeing with this row's own approach text
-- ("From the Marble Mountain Sno-Park (2,800 ft) trailhead..."), disagreeing
-- with this row's own gain_ft (5563), which only reconciles with the
-- high_point_ft (8363) if the trailhead is 2,800 ft (8363-2800=5563 exactly;
-- 8363-2680=5683, a 120 ft/~2% shortfall against gain_ft as stored), and
-- disagreeing with external sources (WTA/USFS-derived: "the trailhead at
-- Marble Mountain Sno-Park has an elevation of 2,800 feet"). Corrected the
-- one outlier (the waypoint) to match the other three.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '2800')
WHERE id = 'wa_mount_st_helens_worm_flows'
  AND waypoints->0->>'name' = 'Marble Mountain Sno-Park'
  AND waypoints->0->>'type' = 'Trailhead'
  AND (waypoints->0->>'elev')::numeric = 2680;

-- =========================================================================
-- Mount Steel (wa_mount_steel) — wa_mount_steel_first_divide
-- (First Divide Route)
-- =========================================================================

-- bivy held 8 entries. The last ("Belview and the Six Ridge camps — for
-- Mount Olson only") explicitly disclaims relevance to this route in its
-- OWN stored text: "This entry exists for Mount Olson and for nothing
-- else in the zone" and "NOTHING ABOUT THIS SHARES GROUND WITH THE
-- SAWTOOTH OR FIRST DIVIDE PEAKS -- do not plan it as an add-on to a
-- Flapjack Lakes trip." Mount Steel is one of the First Divide peaks per
-- this same array's own "Home Sweet Home" entry ("the meadow camp under
-- First Divide for Steel and Hopper"). A self-disclaiming entry left in
-- this route's own bivy array is a data error the row itself states; no
-- external source needed. The other 7 entries are left alone -- several
-- explicitly name Steel ("Home Sweet Home", "Marmot Lake") and the rest
-- (Flapjack/Black-White Lakes, Camp Pleasant, Nine Stream, Duckabush
-- junction) sit on the same North Fork Skokomish corridor without
-- disclaiming relevance, so pruning them would be a judgment call rather
-- than a stated fact -- flagged for human review instead (see log).
UPDATE routes SET bivy = bivy - 7
WHERE id = 'wa_mount_steel_first_divide'
  AND jsonb_array_length(bivy) = 8
  AND bivy->7->>'name' = 'Belview and the Six Ridge camps — for Mount Olson only';

-- =========================================================================
-- Mount Spickard (wa_mount_spickard) — wa_mount_spickard_southwest
-- (Southwest Route / Silver Lake)
-- =========================================================================

-- Summit waypoint elev (8983) disagreed with this same row's own
-- high_point_ft (8979), with this batch's sibling
-- wa_mount_spickard_silver_glacier (high_point_ft 8979 AND its own summit
-- waypoint elev 8979 -- internally self-consistent), and with external
-- sources, where 8,979 ft is the traditional/most-cited summit elevation
-- (recent lidar analysis suggests 8,978 ft; no source supports 8,983 ft).
-- 8,983 ft appears only in areas.wa_mount_spickard.elevation_ft, which is
-- the likely source of the stray value on this one waypoint. Corrected to
-- 8979 to match this row's own high_point_ft and the corroborated sibling
-- route.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{6,elev}', '8979')
WHERE id = 'wa_mount_spickard_southwest'
  AND waypoints->6->>'name' = 'Mount Spickard'
  AND waypoints->6->>'type' = 'Summit'
  AND (waypoints->6->>'elev')::numeric = 8983;

-- verify: should return 0 rows
select id from routes
where id in (
  'wa_mount_shuksan_white_salmon_glacier', 'wa_mount_st_helens_monitor_ridge',
  'wa_mount_st_helens_worm_flows', 'wa_mount_steel_first_divide',
  'wa_mount_spickard_southwest'
)
and (
  bivy::text like '%Sulphide Glacier%' and id = 'wa_mount_shuksan_white_salmon_glacier'
  or bivy::text like '%Snowgrass Flat%'
  or bivy::text like '%Mount Olson only%'
  or waypoints::text like '%9127%'
  or (id = 'wa_mount_st_helens_worm_flows' and waypoints->0->>'elev' = '2680')
  or (id = 'wa_mount_spickard_southwest' and waypoints->6->>'elev' = '8983')
);
