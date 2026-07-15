import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== CONSOLIDATE HAZARD RESEARCH DATA ===\n');

/**
 * Load all research result files
 */
function loadAllResearchFiles(researchDir) {
  const files = fs.readdirSync(researchDir).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} research data files in ${researchDir}\n`);

  const allRoutes = [];
  const sources = {};

  files.forEach(file => {
    const filePath = path.join(researchDir, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(content)) {
        allRoutes.push(...content);
        sources[file] = content.length;
        console.log(`✓ Loaded ${content.length} routes from ${file}`);
      }
    } catch (e) {
      console.error(`✗ Error loading ${file}: ${e.message}`);
    }
  });

  return { allRoutes, sources };
}

/**
 * Fuzzy match route to database ID
 */
async function matchRoute(route) {
  try {
    // Build search query
    let query = supabase
      .from('routes')
      .select('id, name, area_id, discipline, ice_grade, alpine_grade, areas(name, region)');

    // Filter by discipline if provided
    if (route.discipline) {
      query = query.eq('discipline', route.discipline);
    }

    // Filter by area if provided
    if (route.area) {
      query = query.ilike('areas.name', `%${route.area}%`);
    }

    // Search by name
    const { data } = await query.ilike('name', `%${route.name}%`).limit(20);

    if (!data || data.length === 0) {
      return null;
    }

    // Prefer exact name match
    const exact = data.find(r => r.name.toLowerCase() === route.name.toLowerCase());
    if (exact) return exact;

    // Prefer area match
    if (route.area) {
      const areaMatch = data.find(r => {
        const areaName = r.areas?.name || '';
        return areaName.toLowerCase().includes(route.area.toLowerCase());
      });
      if (areaMatch) return areaMatch;
    }

    // Return first match
    return data[0];
  } catch (e) {
    console.error(`Error matching "${route.name}": ${e.message}`);
    return null;
  }
}

/**
 * Validate watch_out format
 */
function isValidWatchOut(watchOut) {
  return Array.isArray(watchOut) &&
    watchOut.length > 0 &&
    watchOut.every(item => typeof item === 'string' && item.trim().length > 0);
}

/**
 * Process and deduplicate routes
 */
async function processRoutes(routes) {
  console.log(`\nProcessing ${routes.length} total routes...\n`);

  const processed = new Map(); // By route name + area
  const results = [];
  const unmatched = [];
  const invalid = [];

  for (const route of routes) {
    // Validate watch_out
    if (!isValidWatchOut(route.watch_out)) {
      invalid.push(route);
      continue;
    }

    // Skip duplicates (same name + area)
    const key = `${route.name}|${route.area || ''}`;
    if (processed.has(key)) {
      console.log(`ℹ Skipping duplicate: ${route.name}`);
      continue;
    }

    // Match to database
    const dbRoute = await matchRoute(route);
    if (!dbRoute) {
      unmatched.push(route);
      console.log(`? ${route.name} (${route.area}) - no database match`);
      continue;
    }

    processed.set(key, dbRoute.id);
    results.push({
      id: dbRoute.id,
      name: route.name,
      dbName: dbRoute.name,
      area: route.area,
      dbArea: dbRoute.areas?.name,
      grade: route.grade,
      discipline: dbRoute.discipline,
      watch_out: route.watch_out
    });

    console.log(`✓ ${route.name} → ${dbRoute.id}`);
  }

  console.log(`\n=== CONSOLIDATION SUMMARY ===`);
  console.log(`Total input routes: ${routes.length}`);
  console.log(`Valid + matched: ${results.length}`);
  console.log(`Unmatched: ${unmatched.length}`);
  console.log(`Invalid format: ${invalid.length}`);

  return { results, unmatched, invalid };
}

/**
 * Save consolidated data for import
 */
async function saveConsolidated(results, outputFile) {
  // Create import-ready format
  const importData = results.map(r => ({
    id: r.id,
    watch_out: r.watch_out
  }));

  fs.writeFileSync(outputFile, JSON.stringify(importData, null, 2));

  console.log(`\nSaved ${importData.length} routes to ${outputFile}`);
  console.log(`Ready for import with: node import-watch-out.mjs`);

  // Create detailed report
  const reportFile = outputFile.replace('.json', '-report.txt');
  const report = results.map(r => {
    return `${r.dbName} (${r.id})
  Area: ${r.dbArea}
  Grade: ${r.grade}
  Discipline: ${r.discipline}
  Hazards: ${r.watch_out.length} items
  ---`;
  }).join('\n\n');

  fs.writeFileSync(reportFile, report);
  console.log(`Detailed report: ${reportFile}`);
}

/**
 * Main workflow
 */
async function main() {
  const researchDir = '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/research-data';
  const outputDir = '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints';

  // Create research directory if it doesn't exist
  if (!fs.existsSync(researchDir)) {
    fs.mkdirSync(researchDir, { recursive: true });
    console.log(`Created research directory: ${researchDir}`);
    console.log(`Place research JSON files here to consolidate\n`);
    return;
  }

  // Load research files
  const { allRoutes, sources } = loadAllResearchFiles(researchDir);

  if (allRoutes.length === 0) {
    console.log('No research files found. Place JSON research results in:');
    console.log(researchDir);
    return;
  }

  // Process routes
  const { results, unmatched, invalid } = await processRoutes(allRoutes);

  // Save consolidated data
  const outputFile = path.join(outputDir, 'wa-ice-alpine-import.json');
  await saveConsolidated(results, outputFile);

  // Summary by area
  console.log(`\n=== BY AREA ===`);
  const byArea = {};
  results.forEach(r => {
    const area = r.dbArea || r.area || 'Unknown';
    if (!byArea[area]) byArea[area] = 0;
    byArea[area]++;
  });

  Object.entries(byArea).sort((a, b) => b[1] - a[1]).forEach(([area, count]) => {
    console.log(`  ${area}: ${count} routes`);
  });

  // Summary by discipline
  console.log(`\n=== BY DISCIPLINE ===`);
  const byDiscipline = {};
  results.forEach(r => {
    const disc = r.discipline || 'unknown';
    if (!byDiscipline[disc]) byDiscipline[disc] = 0;
    byDiscipline[disc]++;
  });

  Object.entries(byDiscipline).sort((a, b) => b[1] - a[1]).forEach(([disc, count]) => {
    console.log(`  ${disc}: ${count} routes`);
  });

  console.log(`\n=== NEXT STEPS ===`);
  console.log(`1. Review the detailed report: ${outputFile.replace('.json', '-report.txt')}`);
  console.log(`2. Check unmatched routes manually (if any)`);
  console.log(`3. Run: node import-watch-out.mjs`);
  console.log(`4. Verify coverage: node query_ice_routes.mjs`);
}

main().catch(console.error);
