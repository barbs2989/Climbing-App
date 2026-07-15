import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

const routes = JSON.parse(fs.readFileSync('/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/MISSING_MAJOR_PEAKS_FIXED.json', 'utf-8'));

console.log(`=== IMPORTING ${routes.length} MAJOR PEAK ROUTES ===\n`);

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
console.log(`Inserted: ${inserted}/${routes.length}`);

if (failed === 0) {
  console.log(`✓ All major peak routes added successfully!\n`);
  
  // Verify counts
  const { count: waTotal } = await supabase
    .from('routes')
    .select('*', { count: 'exact', head: true })
    .ilike('area_id', 'wa_%');
  
  console.log(`Total WA routes now: ${waTotal}`);
}
