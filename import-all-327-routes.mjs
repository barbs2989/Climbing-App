#!/usr/bin/env node
/**
 * Import all 327 WA alpine/mountaineering routes to Supabase
 *
 * Process:
 * 1. Load research results (121 areas with permit data)
 * 2. Load catalog wa-alpine routes.json (327 routes)
 * 3. Merge permit data into route metadata
 * 4. Query Supabase for existing route IDs
 * 5. Filter to new routes only (dedup)
 * 6. Batch upsert to Supabase
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import ws from 'ws';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error('Error: Set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Use service key (bypasses RLS policies for writes)
const supabase = createClient(url, serviceKey, { realtime: { transport: ws } });

async function importAllRoutes() {
  console.log('=== IMPORTING ALL 327 WA ALPINE/MOUNTAINEERING ROUTES ===\n');

  // 1. Load research results (from workflow output)
  console.log('Loading research results...');
  const researchOutput = JSON.parse(
    fs.readFileSync('/private/tmp/claude-501/-Users-nathanbarber-dev-Climbing-App/c80fcaa9-99ef-43a9-91ea-2dcbfab0f22e/tasks/wvbh48jc8.output', 'utf-8')
  );

  // Flatten research results: area_id -> access data
  const researchByArea = {};
  researchOutput.result.results.forEach(batch => {
    if (batch.areas) {
      batch.areas.forEach(area => {
        researchByArea[area.area_id] = {
          area_name: area.area_name,
          access: area.access
        };
      });
    }
  });

  console.log(`  Loaded research for ${Object.keys(researchByArea).length} areas\n`);

  // 2. Load catalog routes
  console.log('Loading catalog routes...');
  const catalogData = JSON.parse(
    fs.readFileSync('/Users/nathanbarber/dev/Climbing-App/catalog/wa-alpine/routes.json', 'utf-8')
  );
  const catalogRoutes = catalogData.routes || [];
  console.log(`  Loaded ${catalogRoutes.length} routes from catalog\n`);

  // 3. Normalize research data to match route access field structure
  console.log('Normalizing research data...');
  Object.entries(researchByArea).forEach(([areaId, data]) => {
    if (!data.access) {
      // Missing research data - use default
      data.access = {
        landManager: 'N/A',
        permit: 'N/A',
        fees: 'N/A',
        passRequired: 'N/A',
        closures: 'N/A',
        permitZone: 'N/A'
      };
    } else {
      const acc = data.access;
      // Convert research format to standardized access format
      data.access = {
        landManager: acc.land_manager || 'N/A',
        permit: acc.permit_type || 'N/A',
        fees: acc.permit_cost_structure || 'N/A',
        passRequired: acc.parking_pass_required || 'None',
        closures: acc.seasonal_closure_dates || 'N/A',
        permitZone: acc.wilderness_zone || 'N/A',
        // Keep additional research details
        _raw: acc
      };
    }
  });

  // 4. Query existing routes in Supabase
  console.log('Querying existing routes in Supabase...');
  const PAGE = 5000;
  let from = 0;
  const existingRouteIds = new Set();

  for (;;) {
    const { data, error } = await supabase
      .from('routes')
      .select('id')
      .range(from, from + PAGE - 1);

    if (error) {
      console.error('Error querying routes:', error);
      process.exit(1);
    }

    if (!data || !data.length) break;
    data.forEach(r => existingRouteIds.add(r.id));
    from += PAGE;
  }

  console.log(`  Found ${existingRouteIds.size} existing routes in Supabase\n`);

  // 5. Prepare routes for import (merge catalog + research)
  console.log('Preparing routes for import...');
  const routesToImport = [];
  const routesSkipped = [];

  catalogRoutes.forEach(route => {
    if (existingRouteIds.has(route.id)) {
      routesSkipped.push({
        id: route.id,
        name: route.name,
        reason: 'already_exists'
      });
    } else {
      // Merge research data into route
      const researchData = researchByArea[route.area_id];
      if (researchData) {
        route.access = researchData.access;
      } else {
        // No research data for this area, but route is new - use placeholder
        route.access = {
          landManager: 'N/A',
          permit: 'N/A',
          fees: 'N/A',
          passRequired: 'N/A',
          closures: 'N/A',
          permitZone: 'N/A'
        };
      }
      routesToImport.push(route);
    }
  });

  console.log(`  Routes to import: ${routesToImport.length}`);
  console.log(`  Routes already exist (skipped): ${routesSkipped.length}\n`);

  // 6. Batch upsert to Supabase
  console.log('Upserting to Supabase...\n');
  const BATCH_SIZE = 50;
  let imported = 0;
  let failed = 0;
  const failedRoutes = [];

  for (let i = 0; i < routesToImport.length; i += BATCH_SIZE) {
    const batch = routesToImport.slice(i, i + BATCH_SIZE);
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} routes)...`);

    for (const route of batch) {
      try {
        const { error } = await supabase
          .from('routes')
          .upsert(
            {
              id: route.id,
              area_id: route.area_id,
              name: route.name,
              discipline: route.discipline,
              grade: route.grade,
              grade_system: route.grade_system,
              grade_num: route.grade_num,
              pitches: route.pitches,
              access: route.access,
              // Include other fields from catalog
              ...Object.keys(route).reduce((acc, key) => {
                if (!['id', 'area_id', 'name', 'discipline', 'grade', 'grade_system', 'grade_num', 'pitches', 'access'].includes(key)) {
                  acc[key] = route[key];
                }
                return acc;
              }, {})
            },
            { onConflict: 'id' }
          );

        if (error) {
          console.error(`    ✗ ${route.id}: ${error.message}`);
          failed++;
          failedRoutes.push({ id: route.id, error: error.message });
        } else {
          imported++;
        }
      } catch (e) {
        console.error(`    ✗ ${route.id}: ${e.message}`);
        failed++;
        failedRoutes.push({ id: route.id, error: e.message });
      }
    }

    if (i + BATCH_SIZE < routesToImport.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // 7. Summary
  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Imported (new): ${imported}`);
  console.log(`Skipped (existing): ${routesSkipped.length}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total routes in catalog: ${catalogRoutes.length}`);
  console.log(`Expected in Supabase after import: ${existingRouteIds.size + imported}`);

  if (failedRoutes.length > 0) {
    console.log(`\nFailed routes:`);
    failedRoutes.slice(0, 10).forEach(f => {
      console.log(`  - ${f.id}: ${f.error}`);
    });
    if (failedRoutes.length > 10) {
      console.log(`  ... and ${failedRoutes.length - 10} more`);
    }
    process.exit(1);
  }

  console.log(`\n✓ All 327 routes processed successfully!`);
  console.log(`  ${imported} new routes added to Supabase`);
  console.log(`  ${routesSkipped.length} routes already existed (not duplicated)`);
}

importAllRoutes().catch(console.error);
