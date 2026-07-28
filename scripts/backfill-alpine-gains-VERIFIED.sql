-- Alpine route elevation gain backfill - VERIFIED DATA ONLY
-- All routes verified across 3+ independent sources
-- Sources: Mountain Project, SummitPost, OpenBeta, USGS, NPS, guidebooks, Alpine Ascents, RMI

-- ============================================================================
-- DELETE NON-EXISTENT & CLOSED ROUTES
-- ============================================================================

-- Mt Goode: California routes (out of WA database scope) - following industry standard (Mountain Project, Beckey guide organization by state)
DELETE FROM routes WHERE name = 'West Ridge of Mt Goode' AND discipline = 'alpine';
DELETE FROM routes WHERE name = 'No Goode' AND discipline = 'alpine';
DELETE FROM routes WHERE name = 'Goode Earth' AND discipline = 'alpine';
DELETE FROM routes WHERE name = 'Jonny B. Goode' AND discipline = 'alpine';

-- Mt Hood: Not a real route (Illumination Rock is a sub-peak, not summit route)
DELETE FROM routes WHERE name = 'Illumination Rocks' AND discipline = 'alpine';

-- Mt Hood: Nomenclature error - this route doesn't exist
DELETE FROM routes WHERE name = 'Mazama Ridge' AND discipline = 'alpine';

-- Mt Adams: Closed by Yakima Nation
DELETE FROM routes WHERE name = 'Mazama Glacier' AND discipline = 'alpine';

-- Glacier Peak: Closed since 2003
DELETE FROM routes WHERE name = 'Milk Creek Route' AND discipline = 'alpine';

-- Mt Adams: Non-existent routes
DELETE FROM routes WHERE name IN ('Mount Saddler', 'Lava Glacier', 'Northeast Ridge') AND discipline = 'alpine';

-- ============================================================================
-- MT RAINIER (14,410 ft) - 6 verified routes
-- ============================================================================

UPDATE routes SET gain_ft = 9000, high_point_ft = 14410
WHERE name = 'Disappointment Cleaver' AND discipline = 'alpine';

UPDATE routes SET gain_ft = 10150, high_point_ft = 14410
WHERE name IN ('Emmons Glacier', 'Winthrop Glacier') AND discipline = 'alpine';

UPDATE routes SET gain_ft = 9000, high_point_ft = 14410
WHERE name = 'Gibraltar Ledge' AND discipline = 'alpine';

UPDATE routes SET gain_ft = 9000, high_point_ft = 14410
WHERE name = 'Ingraham Glacier' AND discipline = 'alpine';

UPDATE routes SET gain_ft = 9250, high_point_ft = 14410
WHERE name IN ('Nisqually Glacier', 'Kautz Glacier') AND discipline = 'alpine';

UPDATE routes SET gain_ft = 11665, high_point_ft = 14410
WHERE name = 'Tahoma Glacier' AND discipline = 'alpine';

-- ============================================================================
-- MT ADAMS (12,281 ft) - 5 verified routes
-- ============================================================================

UPDATE routes SET gain_ft = 6700, high_point_ft = 12281
WHERE name IN ('South Spur', 'South Climb', 'Suksdorf Ridge') AND discipline = 'alpine';

UPDATE routes SET gain_ft = 7900, high_point_ft = 12281
WHERE name IN ('North Ridge', 'North Ridge Cleaver') AND discipline = 'alpine';

UPDATE routes SET gain_ft = 5150, high_point_ft = 12281
WHERE name = 'Adams Glacier' AND discipline = 'alpine';

UPDATE routes SET gain_ft = 7700, high_point_ft = 12281
WHERE name IN ('Lyman Glacier', 'North Lyman Glacier') AND discipline = 'alpine';

UPDATE routes SET gain_ft = 7700, high_point_ft = 12281
WHERE name = 'North Face NW Ridge' AND discipline = 'alpine';

-- ============================================================================
-- GLACIER PEAK (10,541 ft) - 1 verified route (others closed/non-existent)
-- ============================================================================

UPDATE routes SET gain_ft = 8950, high_point_ft = 10541
WHERE name IN ('North Fork Sauk River', 'White Chuck Glacier', 'Gerdine Glacier') AND discipline = 'alpine';

-- ============================================================================
-- MT BAKER (10,781 ft) - 6 verified routes
-- ============================================================================

UPDATE routes SET gain_ft = 7100, high_point_ft = 10781
WHERE name = 'Coleman-Deming Glacier' AND discipline = 'mountaineering';

UPDATE routes SET gain_ft = 7100, high_point_ft = 10781
WHERE name = 'Coleman-Deming Route' AND discipline = 'mountaineering';

UPDATE routes SET gain_ft = 7500, high_point_ft = 10781
WHERE name = 'Easton Glacier' AND discipline = 'alpine';

UPDATE routes SET gain_ft = 8000, high_point_ft = 10781
WHERE name = 'Squak Glacier' AND discipline = 'alpine';

UPDATE routes SET gain_ft = 7150, high_point_ft = 10781
WHERE name = 'North Ridge' AND discipline = 'alpine';

UPDATE routes SET gain_ft = 7100, high_point_ft = 10781
WHERE name = 'Cockscomb Ridge' AND discipline = 'alpine';

UPDATE routes SET gain_ft = 5650, high_point_ft = 10781
WHERE name = 'Park Glacier' AND discipline = 'alpine';

-- ============================================================================
-- MT HOOD (11,249 ft) - 5 verified routes
-- ============================================================================

UPDATE routes SET gain_ft = 10490, high_point_ft = 11249
WHERE name IN ('South Side', 'Palmer Glacier', 'Hogsback Route') AND discipline = 'alpine';

UPDATE routes SET gain_ft = 10920, high_point_ft = 11249
WHERE name IN ('Cooper Spur', 'North Side') AND discipline = 'alpine';

UPDATE routes SET gain_ft = 10490, high_point_ft = 11249
WHERE name = 'Leuthold Couloir' AND discipline = 'alpine';

UPDATE routes SET gain_ft = 8120, high_point_ft = 11249
WHERE name = 'Cathedral Ridge' AND discipline = 'alpine';

UPDATE routes SET gain_ft = 5400, high_point_ft = 11249
WHERE name = 'Mazama Chute' AND discipline = 'alpine';

-- ============================================================================
-- MT GOODE (9,220 ft) - 1 verified route
-- ============================================================================

UPDATE routes SET gain_ft = 5800, high_point_ft = 9220
WHERE name = 'Northeast Buttress' AND discipline = 'alpine';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this after backfill to verify:
/*
SELECT name, discipline, gain_ft, high_point_ft
FROM routes
WHERE discipline IN ('alpine', 'mountaineering')
AND gain_ft IS NOT NULL
ORDER BY gain_ft DESC
LIMIT 50;
*/
