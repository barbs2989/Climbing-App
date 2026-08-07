#!/usr/bin/env node
/**
 * Phase 3 Tier 2 Ice Routes Consolidation
 * Merges ice route research data from Agent 4 into existing research
 * Generates migration SQL for hazard_tags update
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('='.repeat(80));
console.log('PHASE 3 TIER 2: ICE ROUTES HAZARD CONSOLIDATION');
console.log('Agent 4 - Ice & Mixed Alpine Climbing');
console.log('='.repeat(80));

// Load existing research data
const existingFiles = {
  comprehensive: 'research-data/comprehensive-ice-routes.json',
  icicleCreek: 'research-data/icicle_creek_ice_routes_hazards.json',
  otherAreas: 'research-data/other-wa-areas-hazards.json'
};

const existingData = {};
let existingRouteCount = 0;
let existingHazardCount = 0;

Object.entries(existingFiles).forEach(([key, filePath]) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    existingData[key] = Array.isArray(data) ? data : [];
    existingRouteCount += existingData[key].length;
    existingData[key].forEach(route => {
      if (route.watch_out && Array.isArray(route.watch_out)) {
        existingHazardCount += route.watch_out.length;
      }
    });
    console.log(`✓ Loaded ${key}: ${existingData[key].length} routes`);
  } catch (err) {
    console.log(`✗ Could not load ${key}: ${err.message}`);
    existingData[key] = [];
  }
});

console.log(`\nExisting data: ${existingRouteCount} routes, ${existingHazardCount} hazard entries\n`);

// Collect all existing routes for deduplication
const existingRouteNames = new Set();
Object.values(existingData).forEach(routes => {
  routes.forEach(route => {
    existingRouteNames.add((route.name || '').toLowerCase().trim());
  });
});

// Prepare new ice route data structure
const newIceRoutes = [
  // This will be populated by agent output or manual entry
  // Format:
  // {
  //   "name": "Route Name",
  //   "area": "Peak/Area",
  //   "grade": "WI3/AI4",
  //   "watch_out": ["hazard1", "hazard2", ...]
  // }
];

// Try to load agent output from research-data directory
const agentOutputFile = 'research-data/agent4-ice-routes-tier2.json';
if (fs.existsSync(agentOutputFile)) {
  try {
    const agentData = JSON.parse(fs.readFileSync(agentOutputFile, 'utf-8'));
    if (Array.isArray(agentData)) {
      newIceRoutes.push(...agentData);
      console.log(`✓ Loaded Agent 4 output: ${agentData.length} routes\n`);
    }
  } catch (err) {
    console.log(`✗ Could not load agent output: ${err.message}\n`);
  }
}

// Deduplicate: filter out routes already in existing data
const deduplicatedRoutes = newIceRoutes.filter(route => {
  const routeName = (route.name || '').toLowerCase().trim();
  const isDuplicate = existingRouteNames.has(routeName);
  if (isDuplicate) {
    console.log(`  ⚠ Skipping duplicate: ${route.name}`);
  }
  return !isDuplicate;
});

console.log(`\nNew routes after deduplication: ${deduplicatedRoutes.length}`);
console.log(`Total hazard entries: ${deduplicatedRoutes.reduce((sum, r) => sum + (r.watch_out?.length || 0), 0)}`);

// Write consolidated ice routes file
const consolidatedIceData = [
  ...existingData.comprehensive,
  ...existingData.icicleCreek,
  ...existingData.otherAreas.filter(r =>
    (r.area || '').toLowerCase().includes('snoqualmie') ||
    (r.area || '').toLowerCase().includes('north cascades') ||
    (r.area || '').toLowerCase().includes('rainier') ||
    (r.area || '').toLowerCase().includes('alpine lakes') ||
    (r.area || '').toLowerCase().includes('olympic') ||
    (r.area || '').toLowerCase().includes('cascade') ||
    (r.area || '').toLowerCase().includes('skagit')
  ),
  ...deduplicatedRoutes
];

fs.writeFileSync('research-data/phase3-tier2-consolidated-ice-routes.json', JSON.stringify(consolidatedIceData, null, 2));
console.log(`✓ Consolidated ice routes written to research-data/phase3-tier2-consolidated-ice-routes.json`);

// Generate migration SQL
const migrationSQL = generateMigrationSQL(deduplicatedRoutes);
const migrationFileName = `0045_phase3_tier2_ice_routes_hazards_${new Date().toISOString().split('T')[0]}.sql`;
fs.writeFileSync(`supabase/migrations/${migrationFileName}`, migrationSQL);
console.log(`✓ Migration SQL written to supabase/migrations/${migrationFileName}`);

// Summary report
console.log(`\n${'='.repeat(80)}`);
console.log('CONSOLIDATION SUMMARY');
console.log('='.repeat(80));
console.log(`Existing routes: ${existingRouteCount}`);
console.log(`New routes: ${deduplicatedRoutes.length}`);
console.log(`Total routes after consolidation: ${consolidatedIceData.length}`);
console.log(`Total hazard entries: ${consolidatedIceData.reduce((sum, r) => sum + (r.watch_out?.length || 0), 0)}`);
console.log(`\nReady to deploy: ${deduplicatedRoutes.length > 0 ? 'YES ✓' : 'NO'}`);

if (deduplicatedRoutes.length > 0) {
  console.log(`\nNext steps:`);
  console.log(`  1. Review supabase/migrations/${migrationFileName}`);
  console.log(`  2. Run: npm run migrate:dev (or manual Supabase SQL editor)`);
  console.log(`  3. Verify: npm run verify-hazard-import`);
}

process.exit(0);

/**
 * Generate migration SQL from routes
 */
function generateMigrationSQL(routes) {
  if (routes.length === 0) return '-- No new routes to add\n';

  const timestamp = new Date().toISOString().split('T')[0];
  const routeMatchers = routes.map(route => {
    // Create SQL ILIKE patterns for route matching
    const nameParts = route.name.split(/[\s\-\/]/);
    const patterns = nameParts
      .filter(p => p.length > 2)
      .map(p => `'%${p}%'`)
      .join(', ');

    const hazardArray = route.watch_out
      .map(h => `'${h.replace(/'/g, "''")}'`)
      .join(', ');

    return {
      route,
      patterns,
      hazards: `ARRAY[${hazardArray}]`
    };
  });

  let sql = `-- Phase 3 Tier 2: Ice Routes Hazard Enrichment
-- Agent 4 - Ice & Mixed Alpine Climbing
-- Generated ${timestamp}

-- Step 1: Verify hazard_tags column exists
ALTER TABLE routes
ADD COLUMN IF NOT EXISTS hazard_tags text[] DEFAULT '{}'::text[];

-- Step 2: Update routes with researched hazards
`;

  routeMatchers.forEach((rm, idx) => {
    const area = rm.route.area || '';
    sql += `
-- Route ${idx + 1}: ${rm.route.name} (${area})
UPDATE routes SET hazard_tags = array_distinct(array_cat(COALESCE(hazard_tags, '{}'::text[]), ${rm.hazards}))
WHERE lower(name) ILIKE ANY(ARRAY[${rm.patterns}])
  AND state = 'WA'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT unnest(hazard_tags) as tag) t
    WHERE t.tag = ANY(${rm.hazards})
  );
`;
  });

  sql += `

-- Step 3: Verification query
SELECT
  COUNT(*) as total_routes,
  COUNT(CASE WHEN hazard_tags IS NOT NULL AND array_length(hazard_tags, 1) > 0 THEN 1 END) as routes_with_hazards,
  ROUND(100.0 * COUNT(CASE WHEN hazard_tags IS NOT NULL AND array_length(hazard_tags, 1) > 0 THEN 1 END) / COUNT(*), 2) as coverage_pct
FROM routes
WHERE state = 'WA';

-- Phase 3 Tier 2 Summary
-- =====================
-- Routes researched: ${routes.length}
-- Total hazard entries: ${routes.reduce((sum, r) => sum + (r.watch_out?.length || 0), 0)}
-- Deployment date: ${timestamp}
-- Status: READY FOR PRODUCTION
`;

  return sql;
}
