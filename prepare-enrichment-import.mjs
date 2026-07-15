#!/usr/bin/env node
/**
 * Prepare to import enriched climbing data (GPS, descriptions, hazards, beta)
 * This script will be run once wa-enrich-batch skill completes with results
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

async function importEnrichedData(resultsFile) {
  console.log('=== IMPORTING ENRICHED CLIMBING DATA ===\n');

  if (!fs.existsSync(resultsFile)) {
    console.error(`Error: Results file not found: ${resultsFile}`);
    process.exit(1);
  }

  // Load enriched results
  console.log(`Loading enriched data from: ${resultsFile}`);
  const enrichedData = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));

  if (!enrichedData.routes || !Array.isArray(enrichedData.routes)) {
    console.error('Invalid results format: expected { routes: [...] }');
    process.exit(1);
  }

  console.log(`Loaded ${enrichedData.routes.length} enriched routes\n`);

  // Filter to only routes not in original catalog
  const catalogData = JSON.parse(
    fs.readFileSync('/Users/nathanbarber/dev/Climbing-App/catalog/wa-alpine/routes.json', 'utf-8')
  );
  const catalogIds = new Set(catalogData.routes.map(r => r.id));

  const routesToUpdate = enrichedData.routes.filter(r => !catalogIds.has(r.id));
  console.log(`Routes to enrich (not in catalog): ${routesToUpdate.length}\n`);

  // Batch update
  console.log('Importing enriched data to Supabase...\n');
  let updated = 0;
  let failed = 0;
  const failedRoutes = [];

  const BATCH_SIZE = 25;
  for (let i = 0; i < routesToUpdate.length; i += BATCH_SIZE) {
    const batch = routesToUpdate.slice(i, i + BATCH_SIZE);
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} routes)...`);

    for (const route of batch) {
      try {
        const updateData = {};
        const fieldsToUpdate = [
          'description', 'overview', 'beta', 'hazards', 'gear', 'approach', 'descent',
          'waypoints', 'gpx', 'lat', 'lng', 'pitches', 'fa', 'turnaround', 'elevation_gain'
        ];

        fieldsToUpdate.forEach(field => {
          if (route[field] !== null && route[field] !== undefined && route[field] !== '') {
            updateData[field] = route[field];
          }
        });

        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase
            .from('routes')
            .update(updateData)
            .eq('id', route.id);

          if (error) {
            console.error(`    ✗ ${route.id}: ${error.message}`);
            failed++;
            failedRoutes.push({ id: route.id, error: error.message });
          } else {
            updated++;
          }
        }
      } catch (e) {
        console.error(`    ✗ ${route.id}: ${e.message}`);
        failed++;
        failedRoutes.push({ id: route.id, error: e.message });
      }
    }

    if (i + BATCH_SIZE < routesToUpdate.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Summary
  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Updated: ${updated} routes`);
  console.log(`Failed: ${failed} routes`);

  if (failedRoutes.length > 0 && failedRoutes.length <= 10) {
    console.log(`\nFailed routes:`);
    failedRoutes.forEach(f => {
      console.log(`  - ${f.id}: ${f.error}`);
    });
  }

  if (failed === 0) {
    console.log(`\n✓ All ${routesToUpdate.length} routes enriched successfully!`);
  }

  return { updated, failed, totalRoutes: routesToUpdate.length };
}

// Main
const resultsFile = process.argv[2] || '/tmp/enriched-routes-results.json';
importEnrichedData(resultsFile).catch(console.error);
