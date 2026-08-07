#!/usr/bin/env node
/**
 * IMPORT: Climbing Research Hazards to Supabase
 *
 * Merges hazard data from Phases 5-10 climbing research into existing routes
 * by matching route names and appending to watch_out JSONB array.
 */

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: ws }
});

const deploymentFile = '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/supabase-climbing-routes-final.json';

console.log('='.repeat(80));
console.log('IMPORTING CLIMBING RESEARCH HAZARDS TO SUPABASE');
console.log('='.repeat(80));
console.log('');

if (!fs.existsSync(deploymentFile)) {
  console.error(`ERROR: Deployment file not found: ${deploymentFile}`);
  process.exit(1);
}

const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
console.log(`✓ Loaded ${Object.keys(deployment.hazards_by_route_id || {}).length} route-hazard mappings`);

async function importHazards() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 1: FETCHING EXISTING ROUTES');
    console.log('='.repeat(80));

    // Fetch all routes to find matches
    const { data: allRoutes, error: fetchError } = await supabase
      .from('routes')
      .select('id, name, watch_out')
      .limit(10000);

    if (fetchError) {
      console.error(`ERROR: ${fetchError.message}`);
      process.exit(1);
    }

    console.log(`✓ Fetched ${allRoutes.length} routes from database`);

    // Build name-based lookup
    const routesByName = {};
    allRoutes.forEach(r => {
      routesByName[r.name?.toLowerCase()] = r;
    });

    console.log('\n' + '='.repeat(80));
    console.log('PHASE 2: MATCH AND MERGE HAZARDS');
    console.log('='.repeat(80));

    const hazardsByRouteId = deployment.hazards_by_route_id || {};
    let matched = 0;
    let merged = 0;
    const updates = [];

    Object.entries(deployment.routes_to_insert || []).forEach((idx, route) => {
      if (!route || !route.name) return;

      const dbRoute = routesByName[route.name?.toLowerCase()];
      if (!dbRoute) return;

      matched++;

      // Get hazards for this route
      const routeHazards = hazardsByRouteId[route.id] || [];
      if (!routeHazards.length) return;

      // Merge into watch_out array
      const existing = Array.isArray(dbRoute.watch_out) ? dbRoute.watch_out : [];
      const combined = Array.from(new Set([...existing, ...routeHazards]));

      if (combined.length > existing.length) {
        updates.push({
          id: dbRoute.id,
          name: dbRoute.name,
          newHazards: routeHazards.length,
          totalHazards: combined.length
        });
        merged++;
      }
    });

    console.log(`\n✓ Matched: ${matched} routes`);
    console.log(`✓ Routes with new hazards: ${merged}`);

    if (updates.length === 0) {
      console.log('\nNo hazard updates needed (all routes already have data)');
      process.exit(0);
    }

    // Batch update watch_out fields
    console.log(`\nPerforming batch updates...`);

    for (const update of updates.slice(0, 50)) {
      const route = allRoutes.find(r => r.id === update.id);
      if (!route) continue;

      const existing = Array.isArray(route.watch_out) ? route.watch_out : [];
      const routeHazards = hazardsByRouteId[
        deployment.routes_to_insert.find(r => r.name === route.name)?.id
      ] || [];

      const combined = Array.from(new Set([...existing, ...routeHazards]));

      const { error: updateError } = await supabase
        .from('routes')
        .update({ watch_out: combined })
        .eq('id', update.id);

      if (updateError) {
        console.log(`  ✗ ${update.name}: ${updateError.message}`);
      } else {
        console.log(`  ✓ ${update.name}: ${update.newHazards} new hazards`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('IMPORT COMPLETE');
    console.log('='.repeat(80));
    console.log(`\n✓ Hazard data merged into ${Math.min(50, updates.length)} routes`);
    console.log(`✓ Total hazards indexed: ${Object.values(hazardsByRouteId).flat().length}`);

    process.exit(0);
  } catch (err) {
    console.error('FATAL ERROR:', err);
    process.exit(1);
  }
}

importHazards();
