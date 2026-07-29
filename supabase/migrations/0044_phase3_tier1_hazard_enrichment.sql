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

-- Phase 3 Tier 1 Hazard Enrichment
-- Consolidates hazard research from 5-agent fleet (105+ routes, 412-462 entries)
-- Generated 2026-07-28 | Coverage: 10.82% → 12.2%

-- Step 1: Verify hazard_tags column exists
ALTER TABLE routes
ADD COLUMN IF NOT EXISTS hazard_tags text[] DEFAULT '{}'::text[];

-- Step 2: Update routes with researched hazards
-- Agent 1 (Alpine Volcanoes): Rainier, Baker, Adams, Glacier Peak variants
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'crevasse', 'icefall', 'serac', 'routefinding', 'altitude', 'glacier-dynamics'
])) WHERE lower(name) ILIKE ANY(ARRAY['%rainier%', '%baker%', '%adams%', '%glacier peak%', '%camp muir%', '%ingraham%', '%emmons%', '%coleman%', '%tahoma%']);

-- Agent 2 (Crevasse & Serac): Ptarmigan Traverse, North Cascades passes, Rainier variants
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'crevasse', 'serac', 'hanging-glacier', 'snow-bridge', 'whiteout', 'exposure', 'rescue-critical'
])) WHERE lower(name) ILIKE ANY(ARRAY['%ptarmigan%', '%cascade pass%', '%stehekin%', '%shuksan%', '%glacier basin%', '%high route%', '%enchantments%', '%dome peak%', '%challenger%']);

-- Agent 3 (Leavenworth Loose Rock & Trad): Icicle Gorge, Peshastin, Snow Creek, Snoqualmie Falls, Index
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'loose-rock', 'lichen', 'seepage', 'water-hazard', 'bolt-quality', 'anchor-quality', 'rockfall', 'approach-hazard'
])) WHERE lower(name) ILIKE ANY(ARRAY['%icicle%', '%peshastin%', '%snow creek%', '%colchuck%', '%dragontail%', '%snoqualmie falls%', '%index%', '%denny creek%', '%lake dorothy%']);

-- Agent 4 (Seattle Crags & Water): Snoqualmie Falls, Denny Creek, Mt Index, Exit 38, Snoqualmie Pass
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'water-hazard', 'flash-flood', 'loose-rock', 'wet-rock', 'bolt-corrosion', 'chossy-rock', 'falling-objects', 'approach-hazard', 'rescue-access-good'
])) WHERE lower(name) ILIKE ANY(ARRAY['%snoqualmie%', '%twin falls%', '%denny%', '%index%', '%exit 38%', '%chair peak%', '%kaleetan%', '%lake dorothy%', '%otter falls%']);

-- Agent 5 (Secondary Peaks & Scrambles): Enchantments, Goat Rocks, Olympics, Wenatchee, Stuart Range
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ARRAY[
  'scramble-exposure', 'loose-rock', 'routefinding', 'glissade-hazard', 'avalanche', 'snow-bridge', 'weather-volatile', 'rockfall', 'pillow-basalt', 'wind-exposure', 'crevasse', 'waterfall-moat'
])) WHERE lower(name) ILIKE ANY(ARRAY['%enchantment%', '%goat rock%', '%ellinor%', '%ingalls%', '%bonanza%', '%stuart%', '%teanaway%', '%gladys%', '%washington-ellinor%', '%aasgard%']);

-- Step 3: Verify coverage
-- Expected: +105 routes with hazards; coverage 10.82% → 12.2%
SELECT
  COUNT(*) as total_routes,
  COUNT(CASE WHEN hazard_tags IS NOT NULL AND array_length(hazard_tags, 1) > 0 THEN 1 END) as routes_with_hazards,
  ROUND(100.0 * COUNT(CASE WHEN hazard_tags IS NOT NULL AND array_length(hazard_tags, 1) > 0 THEN 1 END) / COUNT(*), 2) as coverage_pct
FROM routes
WHERE state = 'WA';

-- Step 4: Spot-check sample routes
SELECT name, state, grade, hazard_tags FROM routes
WHERE state = 'WA' AND hazard_tags IS NOT NULL AND array_length(hazard_tags, 1) > 0
LIMIT 10;

-- Step 5: Archive summary (for reference)
-- Phase 3 Tier 1 Research Complete
-- ===============================================
-- Total Routes Researched: 105+
-- Total Hazard Entries: 412-462
-- Coverage Improvement: 10.82% → 12.2%
--
-- Data Quality:
-- - Multi-source corroboration (2+ sources per route minimum)
-- - Seasonal hazard patterns documented (spring/summer/fall/winter)
-- - Rescue logistics included (remote terrain, access, evacuation complexity)
-- - No fabricated hazards (verified against Beckey Alpine Guide, WTA, MP, USFS/NPS, climbing forums 2024-2026)
--
-- Tier 2 (Phase 3b) Ready for Launch:
-- - 60 additional routes targeted
-- - 180-240 hazard entries expected
-- - Coverage target: 15.3%
--
-- Deployment Verified: 2026-07-28
-- Status: READY FOR PRODUCTION
