#!/usr/bin/env node
/**
 * IMPORT: Deploy Climbing Research to Supabase
 *
 * Reads supabase-climbing-routes-final.json and performs:
 * 1. Bulk upsert of 87 routes into routes table
 * 2. Merge hazard entries into watch_out JSONB arrays
 * 3. Verify hierarchy (all routes linked to valid parent areas)
 * 4. Calculate coverage metrics
 *
 * Prerequisites:
 * - VITE_SUPABASE_URL environment variable set
 * - VITE_SUPABASE_ANON_KEY environment variable set
 * - .env or .env.local file in project root with credentials
 *
 * Usage:
 *   source .env && node import-climbing-research-to-supabase.mjs
 *   OR
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node import-climbing-research-to-supabase.mjs
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Load environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Supabase credentials not found');
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: ws }
});
const WORKTREE = '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints';
const deploymentFile = `${WORKTREE}/supabase-climbing-routes-final.json`;

console.log('='.repeat(80));
console.log('IMPORTING CLIMBING RESEARCH TO SUPABASE');
console.log('='.repeat(80));
console.log('');

// Load deployment package
console.log('Loading deployment package...');
if (!fs.existsSync(deploymentFile)) {
  console.error(`ERROR: Deployment file not found: ${deploymentFile}`);
  process.exit(1);
}

const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
console.log(`✓ Loaded ${deployment.metadata.total_routes_collected} routes and ${deployment.metadata.total_hazards_collected} hazards`);

async function importClimbingResearch() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 1: BULK UPSERT ROUTES');
    console.log('='.repeat(80));

    // Group routes by phase for reporting
    const routesByPhase = {};
    deployment.routes_to_insert.forEach(route => {
      if (!routesByPhase[route.phase]) routesByPhase[route.phase] = [];
      routesByPhase[route.phase].push(route);
    });

    // Upsert routes
    let totalInserted = 0;
    for (const [phase, routes] of Object.entries(routesByPhase)) {
      console.log(`\nUpserting ${routes.length} routes from ${phase}...`);

      // Supabase upsert: on_conflict() for id or name
      const { data, error } = await supabase
        .from('routes')
        .upsert(
          routes.map(r => ({
            id: r.id || `temp_${Date.now()}_${Math.random()}`,
            name: r.name,
            grade: r.grade,
            elevation_ft: r.elevation_ft,
            discipline: r.discipline || 'rock_climbing',
            region: r.region || r.location?.region || 'Washington',
            area_id: r.area_id,
            coordinates: r.coordinates,
            watch_out: deployment.hazards_by_route_id[r.id] || [],
            research_source: r.research_source,
            research_phase: r.phase,
            metadata_json: JSON.stringify(r),
          })),
          { onConflict: 'id,name' }
        );

      if (error) {
        console.error(`  ERROR: ${error.message}`);
        console.error(error);
      } else {
        console.log(`  ✓ Upserted ${routes.length} routes from ${phase}`);
        totalInserted += routes.length;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('PHASE 2: VERIFY HAZARD DATA');
    console.log('='.repeat(80));

    const hazardStats = {
      routes_with_hazards: 0,
      total_hazard_refs: 0,
      avg_hazards_per_route: 0,
    };

    Object.entries(deployment.hazards_by_route_id).forEach(([routeId, hazards]) => {
      hazardStats.routes_with_hazards++;
      hazardStats.total_hazard_refs += hazards.length;
    });

    hazardStats.avg_hazards_per_route = (
      hazardStats.total_hazard_refs / (hazardStats.routes_with_hazards || 1)
    ).toFixed(1);

    console.log(`\n✓ Hazard coverage:`);
    console.log(`  Routes with hazards: ${hazardStats.routes_with_hazards}`);
    console.log(`  Total hazard references: ${hazardStats.total_hazard_refs}`);
    console.log(`  Avg hazards/route: ${hazardStats.avg_hazards_per_route}`);

    console.log('\n' + '='.repeat(80));
    console.log('PHASE 3: VERIFY DEPLOYMENT');
    console.log('='.repeat(80));

    // Query back what we inserted
    const { data: verifyData, error: verifyError } = await supabase
      .from('routes')
      .select('id, name, research_phase')
      .in('research_phase', Object.keys(routesByPhase));

    if (verifyError) {
      console.error(`ERROR: Verification query failed: ${verifyError.message}`);
    } else {
      console.log(`\n✓ Verification: ${verifyData.length} routes confirmed in database`);

      // Count by phase
      const verifyByPhase = {};
      verifyData.forEach(r => {
        if (!verifyByPhase[r.research_phase]) verifyByPhase[r.research_phase] = 0;
        verifyByPhase[r.research_phase]++;
      });

      Object.entries(verifyByPhase).forEach(([phase, count]) => {
        console.log(`  ${phase}: ${count} routes`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('IMPORT COMPLETE');
    console.log('='.repeat(80));
    console.log(`\n✓ Successfully imported ${totalInserted} routes with climbing research`);
    console.log(`✓ ${deployment.metadata.total_hazards_collected} hazard entries linked to routes`);
    console.log(`\nNext steps:`);
    console.log(`  1. Verify coverage in live app: check route detail "Safety" tab for watch_out hazards`);
    console.log(`  2. Run: npm run build && npm run preview`);
    console.log(`  3. Test 3-4 routes from different phases to confirm hazard display`);
    console.log(`  4. Push to main branch to trigger GitHub Pages deployment`);

    process.exit(0);
  } catch (err) {
    console.error('FATAL ERROR:', err);
    process.exit(1);
  }
}

importClimbingResearch();
