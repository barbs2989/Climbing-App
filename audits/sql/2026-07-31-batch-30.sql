-- WA Alpine Audit — Pass 1, Batch 30 — 2026-07-31
-- Peaks: Mount Rainier (Kautz Headwall, Liberty Ridge, Mowich Face,
--        Nisqually Icefall, Ptarmigan Ridge, Sunset Ridge, Tahoma Glacier,
--        Willis Wall), Mount Redoubt (South Face / Redoubt Glacier),
--        Mount Seattle (Noyes Basin Route)

-- =========================================================================
-- Mount Rainier
-- =========================================================================

-- wa_mount_rainier_kautz_headwall: fa field verbatim described "the first
-- ascent of the Kautz Glacier route" (Fuhrer/Fuhrer/Toll/Myers, 1920) --
-- that FA belongs to the standard Kautz Glacier route (already corrected in
-- batch 29), not this distinct, harder ice-headwall variation that departs
-- from Camp Hazard. No source found (Mountaineers.org, SummitPost, AAC,
-- NPS) documents a separate first-ascent party/date for the Headwall
-- variation specifically -- cleared rather than guess. Also had the same
-- stale pre-2024-survey summit figure as batch 29's Kautz Glacier fix
-- (14410/14411 vs. the area's already-corrected 14406 NAVD88); this route
-- approaches from the same south-side line as its sibling and reaches the
-- true summit, so fixed the same way.
UPDATE routes
SET fa = NULL
WHERE id = 'wa_mount_rainier_kautz_headwall'
  AND fa = 'Hans Fuhrer, Heinie Fuhrer, Roger Toll, and Harry Myers, June 26–28, 1920 (first ascent of the Kautz Glacier route).';

UPDATE routes
SET high_point_ft = 14406,
    waypoints = jsonb_set(waypoints, '{1,elevFt}', '14406', false)
WHERE id = 'wa_mount_rainier_kautz_headwall'
  AND high_point_ft = 14410
  AND waypoints->1->>'name' = 'Columbia Crest (true summit)'
  AND (waypoints->1->>'elevFt')::numeric = 14411;

-- wa_mount_rainier_liberty_ridge: fa garbled the second and third climbers
-- into one duplicated, parenthetical mess ("Will (Arnold) Borrow
-- (Campbell), and Arnold Campbell"). Confirmed via the AAC's own 1936
-- publication ("The First Ascent of Mt. Rainier by Way of Liberty Ridge on
-- Willis Wall", Sept 28-Oct 1 1935) and Mountaineers/Filson retrospectives:
-- the party was Ome Daiber, Will Borrow, and Arnold Campbell. Fixed the
-- names and added the AAC-sourced exact date range.
UPDATE routes
SET fa = 'Ome Daiber, Will Borrow, and Arnold Campbell, September 28-October 1, 1935 (first ascent from the Carbon River, finishing at Paradise, ~52 hours car-to-summit); second ascent not until 1955 (Dave Mahre, Marcel Schuster, Mike McGuire, Gene Prater)'
WHERE id = 'wa_mount_rainier_liberty_ridge'
  AND fa = 'Ome Daiber, Will (Arnold) Borrow (Campbell), and Arnold Campbell, September 1935 (first ascent from the Carbon River, finishing at Paradise, ~52 hours car-to-summit); second ascent not until 1955 (Dave Mahre, Marcel Schuster, Mike McGuire, Gene Prater)';

-- wa_mount_rainier_liberty_ridge: high_point_ft stored the true-summit
-- figure (14410), contradicting the route's own waypoint, which already
-- correctly names its top-out as "Liberty Cap" at 14112 ft. Multiple
-- external sources (IMG, SummitPost, spokalpine.com trip report)
-- independently confirm Liberty Ridge's defined/technical climbing ends at
-- Liberty Cap (14,112 ft) -- reaching the true summit requires an
-- additional, separate traverse across the crater plateau. Fixed to match
-- the route's own waypoint and the external consensus.
UPDATE routes
SET high_point_ft = 14112
WHERE id = 'wa_mount_rainier_liberty_ridge'
  AND high_point_ft = 14410
  AND waypoints->4->>'name' = 'Liberty Cap'
  AND (waypoints->4->>'elev')::numeric = 14112;

-- wa_mount_rainier_nisqually_icefall: high_point_ft (14410) contradicted
-- this row's own waypoint, which already reads "Columbia Crest" at 14406 --
-- the same self-contradiction pattern fixed on six other Rainier routes in
-- batch 29 (waypoint updated in a prior pass, top-level column missed).
-- This route approaches from the south (Nisqually Glacier icefall near the
-- Muir/Ingraham side) and reaches the true summit, consistent with the
-- area row's already-corrected 14406 ft (Aug 2024 GPS survey).
UPDATE routes
SET high_point_ft = 14406
WHERE id = 'wa_mount_rainier_nisqually_icefall'
  AND high_point_ft = 14410
  AND waypoints->1->>'name' = 'Columbia Crest'
  AND (waypoints->1->>'elevFt')::numeric = 14406;

-- wa_mount_rainier_ptarmigan_ridge: same Liberty-Cap-vs-true-summit issue as
-- Liberty Ridge above. This row's own waypoint already says "Liberty Cap
-- (commonly the route's summit point)" at 14112 ft, and an external source
-- (Mountain Project / route descriptions) confirms Ptarmigan Ridge reaches
-- Liberty Cap Glacier, with the true summit (Columbia Crest/SW Rim) an
-- optional separate traverse across the crater plateau -- high_point_ft
-- (14410) was the sole outlier on this row. Fixed to 14112.
UPDATE routes
SET high_point_ft = 14112
WHERE id = 'wa_mount_rainier_ptarmigan_ridge'
  AND high_point_ft = 14410
  AND waypoints->2->>'name' = 'Liberty Cap (commonly the route''s summit point)'
  AND (waypoints->2->>'elevFt')::numeric = 14112;

-- wa_mount_rainier_tahoma_glacier: same stale pre-2024-survey summit figure
-- as batch 29's fixes (14410/14411 vs. the area's corrected 14406). This
-- west-side route reaches the true summit (SW Rim), not Liberty Cap.
UPDATE routes
SET high_point_ft = 14406,
    waypoints = jsonb_set(waypoints, '{1,elevFt}', '14406', false)
WHERE id = 'wa_mount_rainier_tahoma_glacier'
  AND high_point_ft = 14410
  AND waypoints->1->>'name' = 'Columbia Crest (true summit)'
  AND (waypoints->1->>'elevFt')::numeric = 14411;

-- wa_mount_rainier_willis_wall: same Liberty-Cap-vs-true-summit issue as
-- Liberty Ridge/Ptarmigan Ridge above. This row's own waypoint already
-- reads "Liberty Cap (route finishes here)" at 14112 ft -- explicit and
-- unambiguous -- while high_point_ft still stored the true-summit figure
-- (14410). Fixed to match the row's own waypoint.
UPDATE routes
SET high_point_ft = 14112
WHERE id = 'wa_mount_rainier_willis_wall'
  AND high_point_ft = 14410
  AND waypoints->2->>'name' = 'Liberty Cap (route finishes here)'
  AND (waypoints->2->>'elevFt')::numeric = 14112;

-- =========================================================================
-- Mount Redoubt
-- =========================================================================

-- wa_mount_redoubt (area): elevation_ft stored 8963, but this peak's own
-- route (South Face / Redoubt Glacier) already has high_point_ft = 8969,
-- and that route's own `corrections` field documents a prior research pass
-- that explicitly settled on "8,969 ft (traditional/most-cited figure
-- across Wikipedia, Peakbagger, PeakVisor, and multiple trip reports)" --
-- the conclusion was written down but never applied to the area row.
-- Independently confirmed via Wikipedia (8,969 ft) this pass. Fixed the
-- area to match its own route's already-researched figure.
UPDATE areas
SET elevation_ft = 8969
WHERE id = 'wa_mount_redoubt'
  AND elevation_ft = 8963;

-- =========================================================================
-- Mount Seattle
-- =========================================================================

-- wa_mount_seattle_noyes_basin: grade/grade_system/grade_num/disciplines
-- were all null despite the row's own beta text already stating the route
-- is "Listed in the Climber's Guide to the Olympic Mountains as 'Route 1,
-- Grade I, Class 3 via Noyes Basin'" and alpine_grade/commitment already
-- populated ("Grade I"/"I") -- same enrichment-gap pattern fixed on Mount
-- Howard (batch 26) and others. Filled from the row's own text, matching
-- the sibling South Slopes (Standard) route's grade_system/disciplines
-- convention for this peak.
UPDATE routes
SET grade = 'Class 3',
    grade_system = 'class',
    grade_num = 3,
    disciplines = '["scrambling"]'::jsonb
WHERE id = 'wa_mount_seattle_noyes_basin'
  AND grade IS NULL
  AND grade_system IS NULL
  AND grade_num IS NULL
  AND disciplines IS NULL;
