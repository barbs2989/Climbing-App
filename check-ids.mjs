import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

// Check a sample of IDs from hazard files
const hazardData = JSON.parse(fs.readFileSync('/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/wa-ice-alpine-hazards.json', 'utf-8'));

const sampleIds = hazardData.slice(0, 5).map(r => r.id);
console.log('Sample IDs from hazard file:');
sampleIds.forEach(id => console.log(`  ${id}`));

console.log('\nChecking if they exist in database:\n');

for (const id of sampleIds) {
  const { data: route, error } = await supabase
    .from('routes')
    .select('id, name')
    .eq('id', id)
    .single();
  
  if (error || !route) {
    console.log(`✗ ${id}: NOT FOUND`);
  } else {
    console.log(`✓ ${id}: ${route.name}`);
  }
}

// Try finding actual ice routes
console.log('\n\nSearching for actual ice routes in database:\n');

const { data: iceRoutes } = await supabase
  .from('routes')
  .select('id, name, discipline')
  .ilike('area_id', 'wa_%')
  .eq('discipline', 'ice')
  .limit(5);

if (iceRoutes && iceRoutes.length > 0) {
  console.log('Sample ice routes in database:');
  iceRoutes.forEach(r => {
    console.log(`  ${r.id}: ${r.name}`);
  });
} else {
  console.log('No ice routes found with discipline="ice"');
}

// Check all disciplines
const { data: allDisciplines } = await supabase
  .from('routes')
  .select('discipline')
  .ilike('area_id', 'wa_%')
  .limit(1);

if (allDisciplines && allDisciplines[0]) {
  console.log(`\nSample discipline value: ${allDisciplines[0].discipline}`);
}
