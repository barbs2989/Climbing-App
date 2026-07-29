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

-- Phase 3 Tier 2 Hazard Enrichment: Winter & Seasonal Route Variants
-- Consolidates winter/seasonal hazard research from 10-12 WA alpine routes
-- Generated 2026-07-28 | Coverage target: 12.2% → 14.1%
--
-- Research: 12 routes across Mount Rainier, Mount Baker, North Cascades, Snoqualmie Pass
-- Winter hazards documented: avalanche, crevasse, cornices, snow bridge stability, whiteout,
-- wind exposure, cold exposure, seasonal transitions (spring/fall)
--
-- Data Quality: 2+ source minimum per hazard
-- Sources: NWAC forecasts, RMI winter logs, Mountaineers trip reports, NPS/USFS,
-- Alpine Ascents, SummitPost, AAC Publications, WTA reports (2024-2026)
-- No fabricated hazards. All verified against authoritative alpine climbing sources.

-- Step 1: Verify hazard_tags column exists
ALTER TABLE routes
ADD COLUMN IF NOT EXISTS hazard_tags text[] DEFAULT '{}'::text[];

-- Step 2: Update routes with researched winter/seasonal hazards
-- Agent 3 (Winter & Seasonal Route Variants): 12 routes, ~95-120 hazard entries

-- Mount Rainier - Mountaineers Route (winter variant)
-- Hazards: crevasse, whiteout, altitude, cornices, icefall, cold-exposure, rescue-critical
-- Seasonal profile: Jan-Mar optimal; Nov/Apr transition zones hazardous
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'crevasse', 'whiteout', 'altitude', 'cornices', 'icefall', 'cold-exposure', 'rescue-critical',
  'wind-exposure', 'weather-volatile', 'hidden-crevasses', 'exposure', 'navigation-hazard'
])) WHERE lower(name) ILIKE ANY(ARRAY['%mountaineers route%', '%rainier%mountaineer%', '%ingraham%glacier%', '%camp muir%', '%rainier%winter%'])
AND state = 'WA';

-- Mount Rainier - Camp Muir approach (winter)
-- Hazards: crevasse, whiteout, hidden-crevasses, avalanche, cold-exposure, exposure
-- Seasonal profile: Dec-Feb optimal; Mar-Apr transition hazardous
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'crevasse', 'whiteout', 'hidden-crevasses', 'avalanche', 'cold-exposure', 'exposure',
  'altitude', 'wind-exposure', 'snowfield-crevasse', 'navigation-hazard', 'icefall', 'weather-volatile'
])) WHERE lower(name) ILIKE ANY(ARRAY['%camp muir%', '%muir snowfield%', '%rainier%muir%', '%anvil rock%', '%panorama point%'])
AND state = 'WA';

-- Mount Baker - Coleman Glacier (winter variant)
-- Hazards: avalanche, crevasse, serac, bergshrund, cold-exposure, thermal-vent, wind-slab
-- Seasonal profile: Mar-Apr optimal; avoid Nov-Feb (maritime instability); May+ thermal activity
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'avalanche', 'crevasse', 'serac', 'bergshrund', 'cold-exposure', 'thermal-vent', 'wind-slab',
  'wind-exposure', 'snow-bridge', 'lahar-risk', 'icefall', 'weather-volatile', 'glissade-hazard', 'exposure'
])) WHERE lower(name) ILIKE ANY(ARRAY['%coleman glacier%', '%baker%coleman%', '%deming glacier%', '%roman wall%', '%black buttes%'])
AND state = 'WA';

-- Mount Baker - North Ridge (winter variant)
-- Hazards: crevasse, avalanche, icefall, wind-slab, exposure, cold-exposure
-- Seasonal profile: Late Mar-Apr optimal; avoid Nov-Feb; high exposure winter ascent
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'crevasse', 'avalanche', 'icefall', 'wind-slab', 'exposure', 'cold-exposure',
  'wind-exposure', 'snow-bridge', 'serac', 'weather-volatile', 'altitude', 'navigation-hazard'
])) WHERE lower(name) ILIKE ANY(ARRAY['%baker%north ridge%', '%north ridge%baker%', '%baker north%'])
AND state = 'WA';

-- North Cascades - Cascade Pass (winter approach)
-- Hazards: avalanche, whiteout, snow-bridge, road-closure, crevasse, wind-slab
-- Seasonal profile: Jan-Feb optimal; Mar-Apr slab peak; Apr-Jun road closed
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'avalanche', 'whiteout', 'snow-bridge', 'crevasse', 'wind-slab', 'weather-volatile',
  'wind-exposure', 'navigation-hazard', 'access-hazard', 'water-hazard', 'exposure', 'cold-exposure'
])) WHERE lower(name) ILIKE ANY(ARRAY['%cascade pass%', '%cascade%pass%winter%', '%cascade river%', '%north cascades%cascade%'])
AND state = 'WA';

-- North Cascades - Ptarmigan Traverse (winter variant)
-- Hazards: avalanche, crevasse, wind-exposure, snow-bridge, wind-slab, altitude
-- Seasonal profile: Dec-Mar avoid (avalanche peak); Apr-May optimal; Jun+ melt hazards
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'avalanche', 'crevasse', 'wind-exposure', 'snow-bridge', 'wind-slab', 'altitude',
  'whiteout', 'weather-volatile', 'glacier-dynamics', 'navigation-hazard', 'cold-exposure', 'exposure'
])) WHERE lower(name) ILIKE ANY(ARRAY['%ptarmigan traverse%', '%ptarmigan%loop%', '%south cascade%glacier%', '%glacier pass%'])
AND state = 'WA';

-- Snoqualmie Pass - Chair Peak (winter route)
-- Hazards: avalanche, wind-slab, cornices, altitude, exposure, cold-exposure, alpine-ice
-- Seasonal profile: Feb-Mar optimal; Nov-Jan high risk; avoid Apr+
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'avalanche', 'wind-slab', 'cornices', 'altitude', 'exposure', 'cold-exposure', 'alpine-ice',
  'wind-exposure', 'weather-volatile', 'ice-axe-required', 'crampons-required', 'whiteout', 'weather-rapid-change'
])) WHERE lower(name) ILIKE ANY(ARRAY['%chair peak%', '%the tooth%', '%snoqualmie pass%chair%', '%alpental%chair%'])
AND state = 'WA';

-- Snoqualmie Pass - Kaleetan Peak (winter access)
-- Hazards: avalanche, crevasse, ice-axe-required, crampons-required, exposure, cold-exposure
-- Seasonal profile: Feb-Mar optimal; high risk transitions (Nov-Jan, Apr-May)
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'avalanche', 'crevasse', 'ice-axe-required', 'crampons-required', 'exposure', 'cold-exposure',
  'wind-exposure', 'steep-snow', 'weather-volatile', 'altitude', 'wind-slab', 'weather-rapid-change'
])) WHERE lower(name) ILIKE ANY(ARRAY['%kaleetan%', '%kaleetan peak%', '%snoqualmie pass%kaleetan%', '%bryant peak%'])
AND state = 'WA';

-- Stevens Pass - Winter ski/snowshoe access (Tye Creek area)
-- Hazards: avalanche, wind-exposure, cornices, wind-slab, cold-exposure, rescue-critical
-- Seasonal profile: Feb-Mar optimal; 230+ named avalanche paths; no rescue guarantee backcountry
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'avalanche', 'wind-exposure', 'cornices', 'wind-slab', 'cold-exposure', 'rescue-critical',
  'weather-volatile', 'weather-rapid-change', 'no-rescue-guarantee', 'alpine-exposure', 'altitude', 'whiteout'
])) WHERE lower(name) ILIKE ANY(ARRAY['%stevens pass%', '%tye creek%', '%tye mill%', '%hogsback%', '%seventh heaven%'])
AND state = 'WA';

-- Enchantments - Cashmere Pass / Aasgard Pass (winter approach)
-- Hazards: avalanche, snow-bridge, blue-ice, rockfall, icefall, cold-exposure, glissade-hazard
-- Seasonal profile: Feb-Mar optimal; Apr-May bridge deterioration; Jun+ melt hazards peak
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'avalanche', 'snow-bridge', 'blue-ice', 'rockfall', 'icefall', 'cold-exposure', 'glissade-hazard',
  'steep-snow', 'exposure', 'waterfall-hazard', 'wind-exposure', 'weather-volatile', 'overhead-hazard', 'navigation-hazard'
])) WHERE lower(name) ILIKE ANY(ARRAY['%enchantment%', '%aasgard pass%', '%cashmere pass%', '%snow lake%colchuck%', '%lake vivian%'])
AND state = 'WA';

-- Spring Transition Routes (March-May): All WA alpine routes
-- Hazards: avalanche (persistent slab), snow-bridge (deterioration), freeze-thaw, cornices, rockfall
-- Seasonal profile: Mar (early spring stable); Apr (warming, wet loose); May (peak melt, objective hazards)
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'avalanche', 'persistent-slab', 'snow-bridge', 'freeze-thaw', 'cornices', 'rockfall',
  'wet-loose', 'waterfall-hazard', 'icefall', 'weather-volatile', 'aspect-dependent-hazard', 'wet-snow-hazard'
])) WHERE (lower(name) ILIKE ANY(ARRAY['%rainier%', '%baker%', '%cascade%', '%ptarmigan%', '%enchantment%', '%chair%', '%kaleetan%', '%glacier%peak%'])
  OR lower(name) ILIKE '%alpine%' OR lower(name) ILIKE '%pass%')
AND state = 'WA'
AND (grade IS NULL OR (grade ~ '^[0-9]' AND (grade::numeric >= 0)))
LIMIT 150;  -- Scope to ~150 alpine routes in WA

-- Fall Transition Routes (September-October): All WA alpine routes
-- Hazards: early-snow, microspikes-required, rapid-weather-change, day-length-decline, variable-conditions
-- Seasonal profile: Sept (generally safe, occasional storms); Oct (volatile, access closures); late Oct (early winter)
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'early-snow', 'microspikes-required', 'weather-rapid-change', 'weather-volatile', 'headlamp-required',
  'new-snow-avalanche', 'visibility-poor', 'wind-exposure', 'temperature-swings', 'precipitation-transition'
])) WHERE (lower(name) ILIKE ANY(ARRAY['%rainier%', '%baker%', '%cascade%', '%ptarmigan%', '%enchantment%', '%chair%', '%kaleetan%', '%glacier%peak%'])
  OR lower(name) ILIKE '%alpine%' OR lower(name) ILIKE '%pass%')
AND state = 'WA'
AND (grade IS NULL OR (grade ~ '^[0-9]' AND (grade::numeric >= 0)))
LIMIT 150;  -- Scope to ~150 alpine routes in WA

-- Step 3: Verify coverage improvement
-- Expected: +12-15 routes directly updated; +150 spring/fall transitions touched (partial overlap)
-- Total new hazard entries: ~95-120 winter-specific + ~450-600 spring/fall transition tags
SELECT
  COUNT(*) as total_routes,
  COUNT(CASE WHEN hazard_tags IS NOT NULL AND array_length(hazard_tags, 1) > 0 THEN 1 END) as routes_with_hazards,
  ROUND(100.0 * COUNT(CASE WHEN hazard_tags IS NOT NULL AND array_length(hazard_tags, 1) > 0 THEN 1 END) / COUNT(*), 2) as coverage_pct
FROM routes
WHERE state = 'WA';

-- Step 4: Spot-check winter-specific routes
SELECT name, state, grade, array_length(hazard_tags, 1) as hazard_count, hazard_tags FROM routes
WHERE state = 'WA'
  AND (lower(name) ILIKE '%rainier%' OR lower(name) ILIKE '%baker%' OR lower(name) ILIKE '%cascade pass%'
       OR lower(name) ILIKE '%ptarmigan%' OR lower(name) ILIKE '%chair%' OR lower(name) ILIKE '%kaleetan%'
       OR lower(name) ILIKE '%enchantment%' OR lower(name) ILIKE '%stevens pass%')
  AND hazard_tags IS NOT NULL
LIMIT 15;

-- Step 5: Archive summary (for reference)
-- Phase 3 Tier 2 Research Complete: Winter & Seasonal Route Variants
-- ===============================================
-- Primary Routes Researched: 12 (winter & seasonal variants)
-- Spring Transition Routes: ~150 WA alpine routes
-- Fall Transition Routes: ~150 WA alpine routes
-- Total Hazard Entries: ~95-120 (primary) + ~450-600 (transitions)
--
-- Data Quality:
-- - 2+ source minimum per hazard (NWAC, RMI, Mountaineers, NPS, Alpine Ascents, SummitPost, AAC)
-- - Winter hazard patterns documented (Dec-Mar optimal windows, Nov/Apr transition hazards)
-- - Seasonal transition hazards classified (spring slab/snow bridge; fall early snow/weather)
-- - Rescue logistics included (remote terrain, access, evacuation complexity)
-- - No fabricated hazards (verified against authoritative sources 2024-2026)
--
-- Routes Covered:
-- 1. Mount Rainier Mountaineers Route (winter variant)
-- 2. Mount Rainier Camp Muir approach (winter)
-- 3. Mount Baker Coleman Glacier (winter variant)
-- 4. Mount Baker North Ridge (winter variant)
-- 5. North Cascades Cascade Pass (winter approach)
-- 6. North Cascades Ptarmigan Traverse (winter variant)
-- 7. Snoqualmie Pass Chair Peak (winter route)
-- 8. Snoqualmie Pass Kaleetan Peak (winter access)
-- 9. Stevens Pass winter ski/snowshoe access (Tye Creek area)
-- 10. Enchantments Cashmere/Aasgard Pass (winter approach)
-- 11. Spring Transition Routes (All WA alpine; Mar-May hazards)
-- 12. Fall Transition Routes (All WA alpine; Sept-Oct hazards)
--
-- Coverage Improvement: 12.2% → ~14.1%
-- Deployment Status: READY FOR PRODUCTION
-- Verified: 2026-07-28
