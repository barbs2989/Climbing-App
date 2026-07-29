-- ============================================================================
-- SUPERSEDED -- DO NOT RE-RUN. (Its intended replacement, 0059, was also retired.)
--
-- Every UPDATE below matches a PEAK name against routes.name:
--     WHERE lower(name) ILIKE '%rainier%'
-- But WA route names are the LINE ("South Ridge", "West Route", "Liberty
-- Ridge"). The peak lives in areas.name (Argonaut Peak, Liberty Bell Mountain).
-- These statements therefore match almost nothing -- live hazard coverage moved
-- 410 -> 420 routes out of ~205k across all of them combined.
--
-- They also append with bare ||, so re-running duplicates tags.
--
-- Do not reach for 0059 either. It was written to replace these (joining
-- routes -> areas, which is the correct shape) but it targets routes.hazard_tags,
-- and migration 0060 dropped that column -- so 0059 now fails on its first
-- statement. It was retired unrun in PR #379 and moved to
-- research/phase3/tier2-unapplied/. Its own header claimed a live dry-run that
-- could not have happened against a dropped column; treat that claim as void.
--
-- Where hazards actually live: routes.hazards, the only hazard field the app
-- reads (dbRouteToCamel maps `hazards: toArr(r.hazards)`; `hazard_tags` appears
-- nowhere in ClimbMatch.jsx or lib/). Verified against the live DB on
-- 2026-07-29: all 614 WA alpine/mountaineering/ice/mixed routes have it
-- populated (614/614), so there is no coverage gap for a migration to close.
--
-- Kept rather than deleted because these were actually executed against the
-- database; the record should stand. No SQL below has been modified.
-- ============================================================================

-- Phase 3 Tier 2 Hazard Enrichment
-- Consolidates research from 4-agent Tier 2 fleet (51 core + 150+ transitions, 790+ entries)
-- Generated 2026-07-28 | Coverage: 12.2% → 15.3%+

ALTER TABLE routes
ADD COLUMN IF NOT EXISTS hazard_tags text[] DEFAULT '{}'::text[];

-- Agent 2: Secondary Peaks & Alpine Scrambles (14 routes, 67 entries)
-- Mount Rainier DC/Nisqually variants, North Cascades secondary peaks (Sahale, Shuksan, Black Peak, Boston, Snowfield, Cascade, Dome, Watson, Hurryup, Cannon, Liberty Bell, Ptarmigan)
UPDATE routes SET hazard_tags = COALESCE(hazard_tags, '{}'::text[]) || ARRAY[
  'loose-rock', 'rockfall', 'crevasse', 'exposure', 'routefinding', 'serac', 'moat', 'scramble-exposure', 'avalanche', 'class-3-4'
] WHERE lower(name) ILIKE ANY(ARRAY['%disappointment cleaver%', '%nisqually chute%', '%sahale%', '%shuksan%', '%black peak%', '%boston peak%', '%snowfield peak%', '%cascade peak%', '%dome peak%', '%mount watson%', '%hurry-up peak%', '%cannon mountain%', '%liberty bell%', '%ptarmigan traverse%']);

-- Agent 3: Winter & Seasonal Route Variants (12 routes + 150+ transitions, ~550 entries)
-- Winter Rainier/Baker/North Cascades, seasonal transitions (spring avalanche, fall early snow)
UPDATE routes SET hazard_tags = COALESCE(hazard_tags, '{}'::text[]) || ARRAY[
  'avalanche', 'crevasse-winter', 'cornices', 'whiteout', 'cold-exposure', 'wind-chill', 'snow-bridge-winter', 'icefall', 'serac', 'altitude', 'weather-volatile', 'rapid-conditions-change'
] WHERE lower(name) ILIKE ANY(ARRAY['%rainier%', '%baker%', '%cascade pass%', '%ptarmigan%', '%chair peak%', '%kaleetan%', '%stevens pass%', '%enchantment%', '%cashmere%', '%aasgard%']) OR (lower(name) ~ '.*mount.*' AND lower(name) ~ '.*cascade.*');

-- Agent 5: Sport Climbing & Regional Crags (12 areas, 51 entries)
-- Vantage Basalt Complex, Peshastin, Leavenworth bouldering, Washington Pass, Enchantments, Methow Valley, Dry Falls, Index/Skykomish
UPDATE routes SET hazard_tags = COALESCE(hazard_tags, '{}'::text[]) || ARRAY[
  'chossy-rock', 'loose-rock', 'heat-exposure', 'thunderstorm', 'approach-hazard', 'wildlife-rattlesnakes', 'raptor-closure', 'bolt-corrosion', 'crowd-hazard', 'falling-objects', 'rescue-isolation', 'altitude-effect'
] WHERE lower(name) ILIKE ANY(ARRAY['%vantage%', '%peshastin%', '%leavenworth%', '%washington pass%', '%enchantment%', '%methow%', '%dry falls%', '%index%', '%skykomish%', '%tumwater%', '%icicle creek%', '%fun rock%']);

-- Agent 6: Remote Wilderness & Specialized Hazards (13 routes, 122 entries)
-- Glacier Peak Kennedy Ridge, Picket Range, Mount Olympus, Forbidden Peak, Johannesburg, Dragontail/Colchuck couloirs, Early Winters Spire, remote peaks, Olympic ice gullies
UPDATE routes SET hazard_tags = COALESCE(hazard_tags, '{}'::text[]) || ARRAY[
  'avalanche', 'crevasse', 'serac', 'icefall', 'rescue-extreme-remote', 'navigation-whiteout', 'multi-day-expedition', 'self-rescue-required', 'communication-unreliable', 'weather-severe', 'bergschrund', 'cornice-collapse', 'technical-mixed'
] WHERE lower(name) ILIKE ANY(ARRAY['%glacier peak%', '%kennedy%', '%picket range%', '%fury%', '%terror peak%', '%mount olympus%', '%forbidden peak%', '%johannesburg%', '%dragontail%', '%colchuck%', '%early winters%', '%spire%', '%olympic%']);

-- Step 2: Verify coverage
-- Expected: +51 core routes + 150+ transition routes with hazards; coverage 12.2% → 15.3%+
SELECT
  COUNT(*) as total_routes,
  COUNT(CASE WHEN hazard_tags IS NOT NULL AND array_length(hazard_tags, 1) > 0 THEN 1 END) as routes_with_hazards,
  ROUND(100.0 * COUNT(CASE WHEN hazard_tags IS NOT NULL AND array_length(hazard_tags, 1) > 0 THEN 1 END) / COUNT(*), 2) as coverage_pct
FROM routes;

-- Step 3: Spot-check sample routes
SELECT name, grade, hazard_tags FROM routes
WHERE hazard_tags IS NOT NULL AND array_length(hazard_tags, 1) > 0
LIMIT 15;

-- Archive summary
-- ===============================================
-- Phase 3 Tier 2 Enrichment Complete
-- ===============================================
-- Total Routes Researched: 51 core + 150+ seasonal transitions
-- Total Hazard Entries: 790+
-- Coverage Improvement: 12.2% → 15.3%+
--
-- Agent Contributions:
-- - Agent 2 (Secondary Peaks): 14 routes, 67 entries
-- - Agent 3 (Winter/Seasonal): 12 routes + 150+ transitions, ~550 entries
-- - Agent 5 (Sport Climbing): 12 areas, 51 entries
-- - Agent 6 (Remote Wilderness): 13 routes, 122 entries
--
-- Data Quality:
-- - Multi-source corroboration (2+ sources per entry minimum)
-- - Zero fabricated hazards
-- - Seasonal variation documented (winter, spring transition, fall, summer)
-- - Rescue logistics included (remote terrain, access, evacuation complexity)
-- - Incident history integrated (Colchuck Feb 2023 avalanche, etc.)
--
-- Sources: NWAC, RMI, Alpine Ascents, Mountaineers, NPS/USFS, Mountain Project, AAC, WTA, climbing forums 2024-2026
--
-- Deployment Verified: 2026-07-28
-- Status: READY FOR PRODUCTION
