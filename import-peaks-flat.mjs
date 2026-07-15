import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

const data = JSON.parse(fs.readFileSync('/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/MISSING_MAJOR_PEAKS_FLATTENED.json', 'utf-8'));

console.log('Verifying area_ids exist...\n');

// Check which areas exist
const areaIds = ['wa_rainier', 'wa_adams', 'wa_stuart'];
for (const aid of areaIds) {
  const { data: area, error } = await supabase
    .from('areas')
    .select('id, name')
    .eq('id', aid)
    .single();
  
  if (error) {
    console.log(`✗ ${aid}: not found`);
  } else {
    console.log(`✓ ${aid}: ${area.name}`);
  }
}

console.log('\nInserting 7 routes...\n');

let inserted = 0;
let failed = 0;
const failed_routes = [];

for (const route of data) {
  const { error } = await supabase
    .from('routes')
    .insert([route]);
  
  if (error) {
    if (error.message.includes('duplicate')) {
      console.log(`⊘ ${route.id}: already exists`);
    } else {
      console.error(`✗ ${route.id}: ${error.message}`);
      failed++;
      failed_routes.push(route.id);
    }
  } else {
    console.log(`✓ ${route.id}: ${route.name}`);
    inserted++;
  }
}

console.log(`\n=== COMPLETE ===`);
console.log(`Inserted: ${inserted}/7`);
console.log(`Failed: ${failed}/7\n`);

if (failed_routes.length > 0) {
  console.log('Failed routes:', failed_routes.join(', '));
}
