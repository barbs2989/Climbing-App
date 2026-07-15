import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

const routes = JSON.parse(fs.readFileSync('/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/wa-ice-alpine-import.json', 'utf-8'));

console.log(`=== IMPORTING HAZARD DATA FOR ${routes.length} ROUTES ===\n`);

let updated = 0;
let notfound = 0;
let failed = 0;

for (const route of routes) {
  const watchOut = Array.isArray(route.watch_out) 
    ? route.watch_out.join('\n')
    : route.watch_out;
  
  const { error } = await supabase
    .from('routes')
    .update({ watch_out: watchOut })
    .eq('id', route.id);
  
  if (error) {
    if (error.message.includes('PGRST116')) {
      console.log(`⊘ ${route.id}: route not found in database`);
      notfound++;
    } else {
      console.error(`✗ ${route.id}: ${error.message}`);
      failed++;
    }
  } else {
    console.log(`✓ ${route.id}: ${route.watch_out.length} hazards`);
    updated++;
  }
}

console.log(`\n=== COMPLETE ===`);
console.log(`Updated: ${updated}/${routes.length}`);
console.log(`Not found: ${notfound}`);
console.log(`Failed: ${failed}\n`);

// Check coverage
const { data: withWatchOut } = await supabase
  .from('routes')
  .select('id', { count: 'exact' })
  .not('watch_out', 'is', null)
  .ilike('area_id', 'wa_%');

const { data: allRoutes } = await supabase
  .from('routes')
  .select('id', { count: 'exact' })
  .ilike('area_id', 'wa_%');

const coverage = ((withWatchOut?.length || 0) / (allRoutes?.length || 1) * 100).toFixed(1);
console.log(`Hazard coverage: ${withWatchOut?.length || 0}/${allRoutes?.length || 0} WA routes (${coverage}%)`);
