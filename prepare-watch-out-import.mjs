import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== PREPARE WATCH_OUT IMPORT ===\n');

/**
 * Fuzzy match route name to database ID
 * Takes route name (e.g. "Early Winter Couloir") and area info,
 * matches to database route by name similarity
 */
async function matchRouteToId(routeName, areaInfo) {
  try {
    // Exact match first
    const { data: exact } = await supabase
      .from('routes')
      .select('id, name, area_id, areas(name, region)')
      .ilike('name', `%${routeName}%`)
      .limit(10);

    if (exact && exact.length > 0) {
      // If we have area info, prefer matching area
      if (areaInfo) {
        const areaMatches = exact.filter(r => {
          const areaName = r.areas?.name || '';
          return areaInfo.toLowerCase().includes(areaName.toLowerCase()) ||
                 areaName.toLowerCase().includes(areaInfo.toLowerCase());
        });
        if (areaMatches.length > 0) {
          return areaMatches[0].id;
        }
      }
      // Otherwise return first match
      return exact[0].id;
    }
  } catch (e) {
    console.error(`Error matching route "${routeName}":`, e.message);
  }
  return null;
}

/**
 * Validate watch_out format
 */
function validateWatchOut(watchOut) {
  if (!Array.isArray(watchOut)) {
    return false;
  }
  return watchOut.every(item => typeof item === 'string' && item.trim().length > 0);
}

/**
 * Process research data file and create import JSON
 * Input file should be JSON with research results from agents
 */
async function processResearchData(inputFile) {
  if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    return [];
  }

  let researchData = [];
  try {
    const content = fs.readFileSync(inputFile, 'utf-8');
    researchData = JSON.parse(content);
  } catch (e) {
    console.error(`Error parsing input file: ${e.message}`);
    return [];
  }

  if (!Array.isArray(researchData)) {
    console.error('Input file must contain a JSON array');
    return [];
  }

  console.log(`Processing ${researchData.length} routes from research data...\n`);

  const importData = [];
  const unmatched = [];
  let processed = 0;
  let validated = 0;

  for (const route of researchData) {
    processed++;

    // Validate watch_out format
    if (!validateWatchOut(route.watch_out)) {
      console.warn(`✗ ${route.name}: invalid watch_out format`);
      continue;
    }

    // Match to database ID
    const routeId = await matchRouteToId(route.name, route.area);
    if (!routeId) {
      unmatched.push(route);
      console.warn(`? ${route.name} (${route.area}) - no match found`);
      continue;
    }

    validated++;
    importData.push({
      id: routeId,
      name: route.name,
      area: route.area,
      watch_out: route.watch_out
    });

    console.log(`✓ ${route.name} → ${routeId}`);
  }

  console.log(`\n=== PROCESSING SUMMARY ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Validated & matched: ${validated}`);
  console.log(`Unmatched: ${unmatched.length}`);

  if (unmatched.length > 0) {
    console.log(`\nUnmatched routes (may need manual lookup):`);
    unmatched.forEach(r => {
      console.log(`  - ${r.name} (${r.area})`);
    });
  }

  return importData;
}

/**
 * Save import data to file ready for database import
 */
async function saveImportFile(data, outputFile) {
  const importJson = data.map(item => ({
    id: item.id,
    watch_out: item.watch_out
  }));

  fs.writeFileSync(outputFile, JSON.stringify(importJson, null, 2));
  console.log(`\nSaved ${importJson.length} routes to: ${outputFile}`);

  // Show preview
  console.log(`\nPreview (first 3 routes):`);
  importJson.slice(0, 3).forEach((r, i) => {
    console.log(`  ${i+1}. ${r.id}`);
    console.log(`     Hazards: ${r.watch_out.length} items`);
  });
}

/**
 * Main workflow
 */
async function main() {
  // For now, just show the structure
  // This will be called after research agents complete
  console.log('Workflow ready to process research data');
  console.log('\nUsage:');
  console.log('  node prepare-watch-out-import.mjs <input-file> <output-file>');
  console.log('\nInput file format: JSON array of { name, area, grade, watch_out[] }');
  console.log('Output file: JSON array ready for import-watch-out.mjs');
  console.log('\nExample input:');
  console.log(JSON.stringify([
    {
      name: "Early Winter Couloir",
      area: "Early Winters Spire",
      grade: "AI3",
      watch_out: ["Avalanche hazard", "Serac exposure", "No descent anchors"]
    }
  ], null, 2));
}

main();
