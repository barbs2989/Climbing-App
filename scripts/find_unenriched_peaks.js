#!/usr/bin/env node
/**
 * Find remaining unenriched WA alpine/scramble/mountaineering peaks in live database.
 * Compare enriched peaks (phase 1-2) against all WA peaks to identify gaps.
 * Usage: SUPABASE_SERVICE_KEY=... node scripts/find_unenriched_peaks.js
 */

import fs from 'fs';
import https from 'https';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable not set');
  process.exit(1);
}

const SUPABASE_URL = 'db.swwbvzvhndqpnqsblpov.supabase.co';

async function query(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('Finding unenriched WA alpine peaks...\n');

  // Get all WA alpine/scramble/mountaineering peaks
  const allPeaks = await query(
    `/rest/v1/areas?state=eq.WA&classification=in.(alpine,scramble,mountaineering)&type=in.(peak,crag,wall)&select=id,name,elevation_ft&order=name.asc&limit=500`
  );

  console.log(`Found ${allPeaks.length} WA alpine/scramble/mountaineering areas total\n`);

  // Load enriched peaks from phase 1+2
  let enrichedIds = new Set();
  try {
    const phase1 = JSON.parse(fs.readFileSync('enrichment-wip/findings_elevation_approach_2026_07_15.json', 'utf8'));
    phase1.forEach(p => enrichedIds.add(p.peakId?.toLowerCase()));
  } catch (e) {}

  try {
    const phase2 = JSON.parse(fs.readFileSync('enrichment-wip/findings_phase2_consolidated.json', 'utf8'));
    phase2.forEach(p => enrichedIds.add(p.peakId?.toLowerCase()));
  } catch (e) {}

  try {
    const phase2b1 = JSON.parse(fs.readFileSync('enrichment-wip/findings_phase2_batch1_extracted.json', 'utf8'));
    phase2b1.forEach(p => enrichedIds.add(p.peakId?.toLowerCase()));
  } catch (e) {}

  console.log(`Enriched in phase 1-2: ${enrichedIds.size} peaks\n`);

  // Find unenriched
  const unenriched = allPeaks.filter(p => !enrichedIds.has(p.id?.toLowerCase()));

  console.log(`Remaining unenriched: ${unenriched.length} peaks\n`);

  if (unenriched.length > 0) {
    console.log('First 20 unenriched peaks:');
    unenriched.slice(0, 20).forEach(p => {
      const routes = allPeaks.filter(a => a.parent_id === p.id).length;
      console.log(`  - ${p.name} (${p.elevation_ft} ft, ${routes} routes)`);
    });
  }

  // Save unenriched list
  fs.writeFileSync(
    'enrichment-wip/unenriched_peaks_live.json',
    JSON.stringify(unenriched.map(p => ({ id: p.id, name: p.name, elev: p.elevation_ft })), null, 2)
  );

  console.log(`\n✅ Saved: enrichment-wip/unenriched_peaks_live.json (${unenriched.length} peaks)`);
}

main().catch(console.error);
