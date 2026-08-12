-- WA Alpine Audit — Pass 1, Batch 31 — 2026-07-31
-- Peaks: Mount Seattle (Seattle Creek Basin Route), Mount Sefrit (Bloody Head
--        Couloir, Southwest Ridge), Mount Shuksan (Beckey-Schmidtke, Fisher
--        Chimneys, Hanging Glacier, North Face, Northwest Arete, Price
--        Glacier, Sulphide Glacier)

-- =========================================================================
-- Mount Seattle
-- =========================================================================

-- wa_mount_seattle_seattle_creek: grade/grade_system/grade_num/disciplines
-- were all null despite the row's own beta text already stating "Listed in
-- the Climber's Guide to the Olympic Mountains as 'Route 3, Grade I, Class 3
-- via Seattle Creek Basin'" and alpine_grade/commitment already populated
-- ("Grade I"/"I") -- the same enrichment-gap pattern already fixed on this
-- peak's own sibling Noyes Basin Route in batch 30, and on Mount Howard
-- (batch 26) and others. Filled from the row's own text, matching Noyes
-- Basin's grade_system/disciplines convention for this peak.
UPDATE routes
SET grade = 'Class 3',
    grade_system = 'class',
    grade_num = 3,
    disciplines = '["scrambling"]'::jsonb
WHERE id = 'wa_mount_seattle_seattle_creek'
  AND grade IS NULL
  AND grade_system IS NULL
  AND grade_num IS NULL
  AND disciplines IS NULL;

-- =========================================================================
-- Mount Sefrit
-- =========================================================================

-- wa_mount_sefrit_southwest_ridge: fa stored "1930 by Jim Irving and Brick
-- Spouse" (the mountain's overall FA), but this row's own `corrections`
-- field already explains why that's wrong for this specific route: "The
-- peak's first ascent (1930, Jim Irving and Brick Spouse) is documented for
-- the mountain overall but is not confirmed by any source as specifically
-- the Southwest Ridge/West Ridge line, so route-level 'fa' is left null
-- rather than assumed." The decision was written down but never applied to
-- the actual column -- same never-propagated-correction pattern as batches
-- 12/15/30. Cleared to match the row's own documented conclusion.
UPDATE routes
SET fa = NULL
WHERE id = 'wa_mount_sefrit_southwest_ridge'
  AND fa = '1930 by Jim Irving and Brick Spouse'
  AND corrections LIKE '%route-level ''fa'' is left null rather than assumed%';

-- =========================================================================
-- Mount Shuksan
-- =========================================================================

-- wa_mount_shuksan_north_face: waypoints[0] was "Heliotrope Ridge
-- Trailhead" (48.795,-121.66, 3400 ft) -- externally confirmed (WTA/USFS)
-- that Heliotrope Ridge Trailhead is Mount BAKER's Coleman/Deming Glacier
-- approach (~48.7953,-121.868, ~3700 ft), an entirely different mountain,
-- contradicting this row's own `approach`/`approach_logistics`/`road`
-- fields (all agreeing the real trailhead is the White Salmon day-lodge
-- area, FR-3075) and its own `face` field ("between the White Salmon and
-- Price Glacier cirques"). Fixed using this peak's sibling Hanging Glacier
-- route's own already-corrected waypoint for the same shared trailhead
-- ("White Salmon Road (hairpin) TH", 48.8595,-121.648, whose note literally
-- reads "Corrects existing DB value of Lake Ann TH"). Elevation set to
-- 3,500 ft, the externally-confirmed elevation of the White Salmon Day
-- Lodge / base area (mtbaker.us) at the same spot.
UPDATE routes
SET waypoints = jsonb_set(
                   jsonb_set(
                     jsonb_set(
                       jsonb_set(waypoints, '{0,lat}', '48.8595', false),
                       '{0,lng}', '-121.648', false),
                     '{0,elev}', '3500', false),
                   '{0,name}', '"White Salmon Road (hairpin) TH"', false),
    gpx = jsonb_set(gpx, '{0}', '[48.8595, -121.648]', false)
WHERE id = 'wa_mount_shuksan_north_face'
  AND waypoints->0->>'name' = 'Heliotrope Ridge Trailhead'
  AND (waypoints->0->>'lat')::numeric = 48.795
  AND (waypoints->0->>'lng')::numeric = -121.66;

-- wa_mount_shuksan_price_glacier: same "Heliotrope Ridge Trailhead"
-- contamination as North Face above (identical wrong lat/lng/elev,
-- byte-for-byte) -- but this route's own approach/approach_logistics agree
-- on a different, also-wrong-for-this-waypoint trailhead: the Nooksack
-- Cirque Trailhead (Trail #750) via Ruth Creek Road. Confirmed via this
-- peak's sibling Beckey-Schmidtke route, whose own approach text explicitly
-- states it shares "the same trailhead used for the neighboring Price
-- Glacier route" and whose waypoint for it (48.894,-121.651, elev 2200)
-- matches Price Glacier's own approach_logistics coordinates
-- (48.89401,-121.65259) almost exactly.
UPDATE routes
SET waypoints = jsonb_set(
                   jsonb_set(
                     jsonb_set(
                       jsonb_set(waypoints, '{0,lat}', '48.894', false),
                       '{0,lng}', '-121.651', false),
                     '{0,elev}', '2200', false),
                   '{0,name}', '"Nooksack Cirque Trailhead"', false),
    gpx = jsonb_set(gpx, '{0}', '[48.894, -121.651]', false)
WHERE id = 'wa_mount_shuksan_price_glacier'
  AND waypoints->0->>'name' = 'Heliotrope Ridge Trailhead'
  AND (waypoints->0->>'lat')::numeric = 48.795
  AND (waypoints->0->>'lng')::numeric = -121.66;

-- wa_mount_shuksan_hanging_glacier / wa_mount_shuksan_price_glacier /
-- wa_mount_shuksan_sulphide_glacier: access.notes carried the exact
-- "Mount Tom area, North Cascades." boilerplate junk clause already
-- identified as DB-wide copy-paste contamination in batch 15 (there
-- confirmed on 35 routes DB-wide, including a Wyoming route with no
-- possible North Cascades connection). Stripped the false clause rather
-- than fabricate a replacement, same as batch 15's fix.
UPDATE routes
SET access = jsonb_set(access, '{notes}', '"Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit."', false)
WHERE id = 'wa_mount_shuksan_hanging_glacier'
  AND access->>'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit. Mount Tom area, North Cascades.';

UPDATE routes
SET access = jsonb_set(access, '{notes}', '"Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit."', false)
WHERE id = 'wa_mount_shuksan_price_glacier'
  AND access->>'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit. Mount Tom area, North Cascades.';

UPDATE routes
SET access = jsonb_set(access, '{notes}', '"Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit."', false)
WHERE id = 'wa_mount_shuksan_sulphide_glacier'
  AND access->>'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit. Mount Tom area, North Cascades.';

-- wa_mount_shuksan_fisher_chimneys: waypoints[0] "Lake Ann Trailhead" was
-- stamped at (48.805,-121.66, 2800 ft) -- externally confirmed (WTA/USFS)
-- that the real Lake Ann Trailhead sits at Austin Pass on SR 542, ~4,700 ft,
-- roughly 5 km northwest of the stored point. This row's own
-- `approach_logistics` field already has the correct coordinates/elevation
-- (48.8500241,-121.6861633, "~1 mile below Artist Point, 4,770 ft") -- only
-- the waypoints/gpx entries were never updated to match.
UPDATE routes
SET waypoints = jsonb_set(
                   jsonb_set(
                     jsonb_set(waypoints, '{0,lat}', '48.8500241', false),
                     '{0,lng}', '-121.6861633', false),
                   '{0,elev}', '4770', false),
    gpx = jsonb_set(gpx, '{0}', '[48.8500241, -121.6861633]', false)
WHERE id = 'wa_mount_shuksan_fisher_chimneys'
  AND waypoints->0->>'name' = 'Lake Ann Trailhead'
  AND (waypoints->0->>'lat')::numeric = 48.805
  AND (waypoints->0->>'lng')::numeric = -121.66;

-- wa_mount_shuksan_fisher_chimneys: watch_out was stored as a single
-- newline-joined string instead of a JSON array like every other route's
-- watch_out field. lib/db.js's toArr() (dbRouteToCamel) only splits strings
-- on commas, not newlines, so the app renders this entire 12-item blob as
-- one giant run-on bullet instead of 12 distinct watch-out items -- a real
-- rendering bug, not just a style inconsistency. Converted to a proper JSON
-- array of the same 12 items, splitting on the existing newlines.
UPDATE routes
SET watch_out = '[
  "Steep and exposed terrain throughout - particularly dangerous during descent",
  "Exposed down climbing through chimney sections requiring rappel stations",
  "Active rockfall zones in off-route gullies - warning about ''moss or lichen covered rock'' indicates these trap hazards",
  "Large crevasses on Upper Curtis Glacier requiring standard glacier travel skills",
  "Moat hazard: ''Watch out for the moat'' near initial snow crossing",
  "Upper Curtis Glacier starts to break up late season - deteriorating conditions create hazards",
  "Late season when Winnie''s Slide becomes iced: may need ice screws and second tool",
  "Route-finding extremely difficult - ''People frequently report difficult route finding. Pay attention and don''t overthink it!''",
  "Multiple thin paths lead to cliff overlooks - serious hazard for disoriented parties",
  "Significant weather exposure on dramatic Upper Curtis Glacier crossing",
  "2-3 day commitment increases exposure risk",
  "Self-registration required at Glacier ranger station for multi-day attempts"
]'::jsonb
WHERE id = 'wa_mount_shuksan_fisher_chimneys'
  AND watch_out = '"Steep and exposed terrain throughout - particularly dangerous during descent\nExposed down climbing through chimney sections requiring rappel stations\nActive rockfall zones in off-route gullies - warning about ''moss or lichen covered rock'' indicates these trap hazards\nLarge crevasses on Upper Curtis Glacier requiring standard glacier travel skills\nMoat hazard: ''Watch out for the moat'' near initial snow crossing\nUpper Curtis Glacier starts to break up late season - deteriorating conditions create hazards\nLate season when Winnie''s Slide becomes iced: may need ice screws and second tool\nRoute-finding extremely difficult - ''People frequently report difficult route finding. Pay attention and don''t overthink it!''\nMultiple thin paths lead to cliff overlooks - serious hazard for disoriented parties\nSignificant weather exposure on dramatic Upper Curtis Glacier crossing\n2-3 day commitment increases exposure risk\nSelf-registration required at Glacier ranger station for multi-day attempts"'::jsonb;

-- wa_mount_shuksan_northwest_arete: `approach` and `approach_logistics` both
-- described the Nooksack Cirque Trail approach via Hannegan Pass Road (the
-- Ruth Creek/east side of the mountain, shared by Price Glacier/
-- Beckey-Schmidtke) -- but this route's own `face` field ("above the White
-- Salmon Glacier"), `road` field ("Park at the lower White Salmon Lodge
-- pull-off"), and `waypoints` entry (White Salmon Road hairpin TH) all
-- agree on the White Salmon side instead, and SummitPost's Northwest Arete
-- page independently confirms: "begin by parking at the lower White Salmon
-- lodge... following a dirt road up the White Salmon drainage." The
-- Nooksack Cirque narrative looks like contamination from a sibling Shuksan
-- route sharing that trailhead. Rewrote `approach` to match the
-- externally-confirmed White Salmon lodge approach (now consistent with
-- this row's own face/road/waypoints fields), and fixed the structured
-- approach_logistics trailhead fields to match.
UPDATE routes
SET approach = 'Two realistic approach options both start by parking at the lower White Salmon lodge on SR 542 (White Salmon Road, FR-3075) and following a dirt road up the White Salmon Creek drainage for under a mile. The more direct option drops off-trail across White Salmon Creek and climbs to the ridgecrest directly opposite the ski area, then follows the ridgecrest to the base of the mountain''s north side. The alternative continues up the road as far as it goes, then travels off-trail up the valley until open slopes allow access to the lower White Salmon Glacier. From there, gain the crest of the northwest arête itself -- a long, remote line combining bushwhacking, complex route-finding, runout and loose rock, moderate alpine ice, and extensive glacier travel.',
    approach_logistics = jsonb_set(
                            jsonb_set(
                              jsonb_set(
                                jsonb_set(approach_logistics, '{trailhead}', '"White Salmon Road (hairpin) TH / Lower White Salmon Lodge"', false),
                                '{trailheadLat}', '48.8595', false),
                              '{trailheadLng}', '-121.648', false),
                            '{trailheadDirection}', '"From the lower White Salmon lodge on SR-542 (White Salmon Road, FR-3075), via the old road into the White Salmon Creek drainage"', false)
WHERE id = 'wa_mount_shuksan_northwest_arete'
  AND approach = 'Approach via the Nooksack Cirque Trail, starting from the trailhead off Hannegan Pass Road. The trail follows the North Fork Nooksack River about 4.5 miles to its headwaters in the steep-walled cirque below Shuksan''s north/northwest side (best done late summer/fall when the river fords are low). From the cirque, continue onto glacier/rock terrain to gain the northwest arete itself -- a long, remote line with bushwhacking, routefinding, alpine ice, and glacier travel.';
