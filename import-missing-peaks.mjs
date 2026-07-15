import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== IMPORTING MISSING MAJOR PEAK ROUTES ===\n');

const dataFile = '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/MISSING_MAJOR_PEAK_ROUTES.json';

if (!fs.existsSync(dataFile)) {
  console.error(`File not found: ${dataFile}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
const routes = Array.isArray(data) ? data : data.routes || [];

console.log(`Loaded ${routes.length} routes\n`);

let inserted = 0;
let failed = 0;

for (const route of routes) {
  const { error } = await supabase
    .from('routes')
    .insert([route]);
  
  if (error) {
    if (error.message.includes('duplicate')) {
      console.log(`⊘ ${route.id}: already exists`);
    } else {
      console.error(`✗ ${route.id}: ${error.message}`);
      failed++;
    }
  } else {
    console.log(`✓ ${route.id}: ${route.name}`);
    inserted++;
  }
}

console.log(`\n=== COMPLETE ===`);
console.log(`Inserted: ${inserted}`);
console.log(`Failed: ${failed}\n`);

// Verify
const { count: totalWa } = await supabase
  .from('routes')
  .select('*', { count: 'exact', head: true })
  .ilike('area_id', 'wa_%');

console.log(`Total WA routes: ${totalWa}`);
