import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== THOROUGH ROUTE VERIFICATION ===\n');

// Check each peak's complete route list
const peaks = [
  { id: 'wa_mount_adams', name: 'Mount Adams' },
  { id: 'wa_mount_baker', name: 'Mount Baker' },
  { id: 'wa_mount_shuksan', name: 'Mount Shuksan' }
];

for (const peak of peaks) {
  console.log(`\n${peak.name.toUpperCase()} (${peak.id}):`);
  
  const { data: routes, count } = await supabase
    .from('routes')
    .select('id, name, grade')
    .eq('area_id', peak.id);
  
  console.log(`Total: ${count} routes\n`);
  
  if (routes && routes.length > 0) {
    routes.forEach((r, i) => {
      console.log(`${i + 1}. ${r.name}`);
      console.log(`   ID: ${r.id}`);
      console.log(`   Grade: ${r.grade}`);
    });
  }
}

// Now check for specific routes we thought were missing
console.log('\n\n=== SPECIFIC ROUTE CHECKS ===\n');

const toCheck = [
  { search: 'Adams Glacier', peak: 'wa_mount_adams' },
  { search: 'Boulder', peak: 'wa_mount_baker' },
  { search: 'White Salmon', peak: 'wa_mount_shuksan' },
  { search: 'Price Glacier', peak: 'wa_mount_shuksan' },
  { search: 'Beckey', peak: 'wa_mount_shuksan' },
  { search: 'Fisher', peak: 'wa_mount_shuksan' }
];

for (const check of toCheck) {
  const { data } = await supabase
    .from('routes')
    .select('name, grade')
    .eq('area_id', check.peak)
    .ilike('name', `%${check.search}%`);
  
  if (data && data.length > 0) {
    console.log(`✓ "${check.search}" found:`);
    data.forEach(d => console.log(`  - ${d.name} (${d.grade})`));
  } else {
    console.log(`✗ "${check.search}" NOT FOUND`);
  }
  console.log();
}
