#!/usr/bin/env node
/**
 * Rebuild phase 3 batch file with actual database route IDs from Supabase.
 * Queries live database for routes on each phase 3 peak, then updates batch file.
 * Usage: SUPABASE_SERVICE_KEY=... node scripts/rebuild_phase3_batch.js
 */

import fs from 'fs';
import https from 'https';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable not set');
  process.exit(1);
}

const SUPABASE_URL = 'db.swwbvzvhndqpnqsblpov.supabase.co';
const PROJECT_ID = 'db.swwbvzvhndqpnqsblpov';

// Peak names and their expected DB area names
const PHASE3_PEAKS = [
  { batchName: 'Mount Goode', dbNames: ['Mount Goode', 'Mt Goode', 'Mt. Goode'] },
  { batchName: 'Mount Shuksan', dbNames: ['Mount Shuksan', 'Mt Shuksan', 'Mt. Shuksan'] },
  { batchName: 'Nooksack Tower', dbNames: ['Nooksack Tower'] },
  { batchName: 'Mount Terror', dbNames: ['Mount Terror', 'Mt Terror', 'Mt. Terror'] },
  { batchName: 'Mount Hinman', dbNames: ['Mount Hinman', 'Mt Hinman', 'Mt. Hinman'] },
  { batchName: 'Bonanza Peak', dbNames: ['Bonanza Peak'] },
  { batchName: 'Mount Jefferson', dbNames: ['Mount Jefferson', 'Mt Jefferson', 'Mt. Jefferson'] },
  { batchName: 'Dome Peak', dbNames: ['Dome Peak'] },
  { batchName: 'Colonial Peak', dbNames: ['Colonial Peak'] },
  { batchName: 'Mount Challenger', dbNames: ['Mount Challenger', 'Mt Challenger'] },
  { batchName: 'Mount Fury', dbNames: ['Mount Fury', 'Mt Fury'] },
  { batchName: 'Ingalls Peak', dbNames: ['Ingalls Peak'] },
  { batchName: 'Three Fingered Jack', dbNames: ['Three Fingered Jack', 'Three-Fingered Jack'] },
  { batchName: 'Mount Washington', dbNames: ['Mount Washington', 'Mt Washington'] },
  { batchName: 'Crooked Thumb Peak', dbNames: ['Crooked Thumb Peak'] },
  { batchName: 'North Twin Sister', dbNames: ['North Twin Sister'] },
  { batchName: 'South Twin Sister', dbNames: ['South Twin Sister'] },
  { batchName: 'Mount Brunswick', dbNames: ['Mount Brunswick', 'Mt Brunswick'] },
  { batchName: 'Cabin Creek Peak', dbNames: ['Cabin Creek Peak'] },
];

async function queryRoutes(peakName) {
  return new Promise((resolve, reject) => {
    const dbNames = PHASE3_PEAKS.find(p => p.batchName === peakName)?.dbNames || [peakName];

    // Query for routes on this peak - use OR to match any of the names
    const whereClause = dbNames.map(name => `name.eq.${encodeURIComponent(name)}`).join(',');
    const query = `?select=id,name,areas!inner(id,name)&areas.state=eq.WA&areas.name=in.(${dbNames.map(encodeURIComponent).join(',')})`;

    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/routes${query}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const routes = JSON.parse(data);
          resolve(routes.map(r => r.id));
        } catch (e) {
          resolve([]); // Empty if parse fails
        }
      });
    });

    req.on('error', () => resolve([])); // Return empty array on error
    req.end();
  });
}

async function main() {
  console.log('Rebuilding phase 3 batch with live database route IDs...\n');

  const batch = [];

  for (const peakInfo of PHASE3_PEAKS) {
    const peakName = peakInfo.batchName;
    const routeIds = await queryRoutes(peakName);

    console.log(`${peakName}: ${routeIds.length} routes found`);

    if (routeIds.length > 0) {
      batch.push({
        id: `wa_${peakName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`,
        name: peakName,
        routes: routeIds,
      });
    } else {
      console.warn(`  ⚠ No routes found for ${peakName}`);
    }
  }

  const outFile = 'enrichment-wip/phase3_batch_final_with_ids.json';
  fs.writeFileSync(outFile, JSON.stringify(batch, null, 2));

  console.log(`\n✅ Batch file updated: ${outFile}`);
  console.log(`   ${batch.length} peaks with ${batch.reduce((sum, p) => sum + p.routes.length, 0)} routes`);
  console.log(`\nNext: Regenerate workflow script and launch`);
}

main().catch(console.error);
