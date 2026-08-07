#!/usr/bin/env node
/**
 * IMPORT: Alpine Traverses Tier 2 Hazard Research (Phase 3)
 *
 * Agent 1 research: alpine traverses and multi-day expedition hazards
 * - High Route / Cascade Crest Traverse
 * - Enchantments Loop variants
 * - Ptarmigan Traverse
 * - Cascade Crest Traverse
 * - Picket Range Traverse
 * - Baker-Snoqualmie Traverse
 * - Four Pass Loop
 * - Glacier Peak Circumnavigation
 * - Mule Pass approaches
 * - Remote high passes
 */

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: ws }
});

// Input: Alpine traverse research data (JSON array of route objects with watch_out arrays)
const researchDataDir = './research-data/';

async function main() {
  console.log('='.repeat(80));
  console.log('ALPINE TRAVERSES TIER 2 - HAZARD IMPORT');
  console.log('='.repeat(80));
  console.log('');

  // Step 1: Load research data from research-data/ directory
  console.log('PHASE 1: LOADING RESEARCH DATA');
  console.log('-'.repeat(80));

  const researchFiles = fs.readdirSync(researchDataDir)
    .filter(f => f.includes('traverse') || f.includes('alpine-expedition'))
    .map(f => path.join(researchDataDir, f));

  let allResearchData = [];
  let totalHazards = 0;

  for (const file of researchFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const routes = Array.isArray(data) ? data : [data];
      allResearchData = allResearchData.concat(routes);
      const hazardCount = routes.reduce((sum, r) => sum + (r.hazards?.length || r.watch_out?.length || 0), 0);
      totalHazards += hazardCount;
      console.log(`✓ Loaded ${routes.length} routes from ${path.basename(file)}`);
    } catch (e) {
      console.log(`⚠ Skipped ${path.basename(file)}: ${e.message}`);
    }
  }

  console.log(`\n✓ Total routes loaded: ${allResearchData.length}`);
  console.log(`✓ Total hazards to import: ${totalHazards}`);

  // Step 2: Fetch existing routes from database
  console.log('\n' + 'PHASE 2: FETCHING DATABASE ROUTES');
  console.log('-'.repeat(80));

  const { data: dbRoutes, error: fetchError } = await supabase
    .from('routes')
    .select('id, name, watch_out, discipline')
    .limit(10000);

  if (fetchError) {
    console.error(`ERROR: ${fetchError.message}`);
    process.exit(1);
  }

  console.log(`✓ Fetched ${dbRoutes.length} routes from database`);

  // Build lookup by name (case-insensitive)
  const routesByName = {};
  dbRoutes.forEach(r => {
    const key = (r.name || '').toLowerCase().trim();
    if (key && !routesByName[key]) {
      routesByName[key] = r;
    }
  });

  // Step 3: Match research data to database routes and prepare updates
  console.log('\n' + 'PHASE 3: MATCHING AND MERGING');
  console.log('-'.repeat(80));

  const updates = [];
  const unmatched = [];

  allResearchData.forEach(researchRoute => {
    const searchKey = (researchRoute.name || '').toLowerCase().trim();
    const dbRoute = routesByName[searchKey];

    if (!dbRoute) {
      unmatched.push({
        name: researchRoute.name,
        area: researchRoute.area,
        hazardCount: researchRoute.hazards?.length || researchRoute.watch_out?.length || 0
      });
      return;
    }

    // Extract hazards (support both 'hazards' and 'watch_out' field names from research)
    const newHazards = researchRoute.watch_out || researchRoute.hazards || [];
    if (!Array.isArray(newHazards) || newHazards.length === 0) {
      return;
    }

    // Merge with existing watch_out
    const existing = Array.isArray(dbRoute.watch_out) ? dbRoute.watch_out : [];
    const merged = Array.from(new Set([...existing, ...newHazards]));

    if (merged.length > existing.length) {
      updates.push({
        id: dbRoute.id,
        name: dbRoute.name,
        discipline: dbRoute.discipline,
        newHazards: newHazards.length,
        totalHazards: merged.length,
        watchOut: merged
      });
    }
  });

  console.log(`✓ Matched: ${updates.length} routes`);
  console.log(`✓ Unmatched: ${unmatched.length} routes`);

  if (unmatched.length > 0) {
    console.log('\n⚠ Unmatched routes (may need manual intervention):');
    unmatched.forEach(u => {
      console.log(`  - ${u.name} (${u.area}) [${u.hazardCount} hazards]`);
    });
    fs.writeFileSync(
      './unmatched-alpine-traverses.json',
      JSON.stringify(unmatched, null, 2)
    );
    console.log('\nUnmatched routes saved to: unmatched-alpine-traverses.json');
  }

  // Step 4: Batch update database
  console.log('\n' + 'PHASE 4: UPDATING DATABASE');
  console.log('-'.repeat(80));

  let successCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('routes')
      .update({ watch_out: update.watchOut })
      .eq('id', update.id);

    if (updateError) {
      console.log(`✗ ${update.name}: ${updateError.message}`);
      errorCount++;
    } else {
      console.log(`✓ ${update.name}: ${update.newHazards} new hazards (${update.totalHazards} total)`);
      successCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(80));
  console.log(`✓ Successfully updated: ${successCount} routes`);
  console.log(`✗ Errors: ${errorCount}`);
  console.log(`⚠ Unmatched: ${unmatched.length}`);
  console.log(`\nTotal new hazards added: ${updates.reduce((sum, u) => sum + u.newHazards, 0)}`);

  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
