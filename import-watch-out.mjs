import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== IMPORTING WATCH_OUT HAZARD DATA ===\n');

// Load watch_out data
const dataFile = '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/wa-ice-alpine-import.json';

if (!fs.existsSync(dataFile)) {
  console.error(`File not found: ${dataFile}`);
  process.exit(1);
}

const routes = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
console.log(`Loaded ${routes.length} routes with watch_out data\n`);

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
  } else {
    updated++;
    console.log(`✓ ${route.id}`);
  }
}

console.log(`\n=== IMPORT COMPLETE ===`);
console.log(`Updated: ${updated}`);
console.log(`Failed: ${failed}\n`);

if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  ${f.id}: ${f.error}`));
}

// Verify coverage
const { count: withWatchOut } = await supabase
  .from('routes')
  .select('*', { count: 'exact', head: true })
  .not('watch_out', 'is', null)
  .ilike('area_id', 'wa_%');

const { count: totalWa } = await supabase
  .from('routes')
  .select('*', { count: 'exact', head: true })
  .ilike('area_id', 'wa_%');

const coverage = ((withWatchOut / totalWa) * 100).toFixed(1);
console.log(`\nNew watch_out coverage: ${withWatchOut}/${totalWa} (${coverage}%)`);
