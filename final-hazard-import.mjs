import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== FINAL HAZARD DOCUMENTATION IMPORT WORKFLOW ===\n');

/**
 * Load and consolidate all research data
 */
async function consolidateResearch() {
  const researchDir = '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/research-data';

  // Create directory if needed
  if (!fs.existsSync(researchDir)) {
    fs.mkdirSync(researchDir, { recursive: true });
    console.log('Research directory created. Place JSON files from agents here.');
    return [];
  }

  const files = fs.readdirSync(researchDir).filter(f => f.endsWith('.json'));
  let allRoutes = [];

  console.log(`Loading ${files.length} research files...\n`);

  files.forEach(file => {
    const filePath = path.join(researchDir, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(content)) {
        allRoutes = allRoutes.concat(content);
        console.log(`✓ Loaded ${content.length} routes from ${file}`);
      }
    } catch (e) {
      console.error(`✗ Error loading ${file}: ${e.message}`);
    }
  });

  return allRoutes;
}

/**
 * Match research routes to database IDs
 */
async function matchRoutesToDatabase(routes) {
  console.log(`\nMatching ${routes.length} research routes to database...\n`);

  const matched = [];
  const unmatched = [];

  for (const route of routes) {
    try {
      // Exact name match
      let query = supabase.from('routes').select('id, name, discipline');

      if (route.discipline) {
        query = query.eq('discipline', route.discipline);
      }

      if (route.area) {
        // Try area-based search
        query = query.ilike('areas.name', `%${route.area}%`);
      }

      const { data } = await query.ilike('name', `%${route.name}%`).limit(5);

      if (data && data.length > 0) {
        // Prefer exact match
        const exact = data.find(r => r.name.toLowerCase() === route.name.toLowerCase());
        const result = exact || data[0];

        matched.push({
          id: result.id,
          name: route.name,
          watch_out: route.watch_out,
          dbName: result.name
        });
        console.log(`✓ ${route.name} → ${result.id}`);
      } else {
        unmatched.push(route);
        console.log(`? ${route.name} (${route.area}) - no match`);
      }
    } catch (e) {
      unmatched.push(route);
      console.error(`✗ Error matching ${route.name}: ${e.message}`);
    }
  }

  console.log(`\n=== MATCHING SUMMARY ===`);
  console.log(`Matched: ${matched.length}`);
  console.log(`Unmatched: ${unmatched.length}`);

  return { matched, unmatched };
}

/**
 * Import matched routes to database
 */
async function importToDatabase(routes) {
  console.log(`\nImporting ${routes.length} routes with watch_out documentation...\n`);

  let updated = 0;
  let failed = 0;
  const failures = [];

  for (const route of routes) {
    const { error } = await supabase
      .from('routes')
      .update({ watch_out: route.watch_out })
      .eq('id', route.id);

    if (error) {
      failed++;
      failures.push({ id: route.id, error: error.message });
      console.log(`✗ ${route.id}: ${error.message}`);
    } else {
      updated++;
      console.log(`✓ Updated ${route.dbName || route.id}`);
    }
  }

  console.log(`\n=== IMPORT SUMMARY ===`);
  console.log(`Successfully updated: ${updated}`);
  console.log(`Failed: ${failed}`);

  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  ${f.id}: ${f.error}`));
  }

  return updated;
}

/**
 * Verify import coverage
 */
async function verifyImport() {
  console.log('\n=== VERIFYING IMPORT COVERAGE ===\n');

  try {
    // Ice routes
    const { data: iceRoutes } = await supabase
      .from('routes')
      .select('id', { count: 'exact' })
      .eq('discipline', 'ice')
      .not('watch_out', 'is', null);

    const { count: totalIce } = await supabase
      .from('routes')
      .select('*', { count: 'exact', head: true })
      .eq('discipline', 'ice');

    console.log(`Ice routes: ${iceRoutes?.length || 0}/${totalIce} (${((iceRoutes?.length || 0) / (totalIce || 1) * 100).toFixed(1)}%)`);

    // Alpine routes
    const { data: alpineRoutes } = await supabase
      .from('routes')
      .select('id', { count: 'exact' })
      .eq('discipline', 'alpine')
      .not('watch_out', 'is', null);

    const { count: totalAlpine } = await supabase
      .from('routes')
      .select('*', { count: 'exact', head: true })
      .eq('discipline', 'alpine');

    console.log(`Alpine routes: ${alpineRoutes?.length || 0}/${totalAlpine} (${((alpineRoutes?.length || 0) / (totalAlpine || 1) * 100).toFixed(1)}%)`);

  } catch (e) {
    console.error('Verification error:', e.message);
  }
}

/**
 * Main workflow
 */
async function main() {
  console.log('=== IMPORT WORKFLOW ===\n');
  console.log('Steps:');
  console.log('1. Place research JSON files in: research-data/');
  console.log('2. Run: node final-hazard-import.mjs');
  console.log('3. Monitor import progress');
  console.log('4. Verify coverage with query_ice_routes.mjs\n');

  // Check if research data directory exists and has files
  const researchDir = '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/research-data';
  if (!fs.existsSync(researchDir) || fs.readdirSync(researchDir).length === 0) {
    console.log('Waiting for research data...');
    console.log(`Research data directory: ${researchDir}`);
    console.log('Will process files once they appear.\n');

    // Show expected structure
    console.log('Expected research file format:');
    console.log(JSON.stringify([
      {
        name: 'Route Name',
        area: 'Area Name',
        grade: 'Grade',
        discipline: 'ice',
        watch_out: [
          'Hazard 1',
          'Hazard 2'
        ]
      }
    ], null, 2));
    return;
  }

  // Run full workflow
  const researchRoutes = await consolidateResearch();

  if (researchRoutes.length > 0) {
    const { matched, unmatched } = await matchRoutesToDatabase(researchRoutes);

    if (matched.length > 0) {
      const imported = await importToDatabase(matched);
      await verifyImport();

      // Save unmatched for manual review
      if (unmatched.length > 0) {
        const unmatchedFile = path.join(researchDir, '..', 'unmatched-routes.json');
        fs.writeFileSync(unmatchedFile, JSON.stringify(unmatched, null, 2));
        console.log(`\nUnmatched routes saved to: ${unmatchedFile}`);
      }
    }
  }
}

main().catch(console.error);
