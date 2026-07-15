import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

const routesToCheck = [
  { peak: 'Mount Adams', name: 'Adams Glacier', area_id: 'wa_mount_adams' },
  { peak: 'Mount Baker', name: 'Boulder-Park Cleaver', area_id: 'wa_mount_baker' },
  { peak: 'Mount Shuksan', name: 'Price Glacier', area_id: 'wa_mount_shuksan' },
  { peak: 'Mount Shuksan', name: 'Beckey-Schmidtke', area_id: 'wa_mount_shuksan' },
  { peak: 'Mount Shuksan', name: 'White Salmon Glacier', area_id: 'wa_mount_shuksan' },
  { peak: 'Mount Shuksan', name: 'Fisher Chimneys', area_id: 'wa_mount_shuksan' }
];

console.log('=== VERIFYING ROUTES IN DATABASE ===\n');

for (const route of routesToCheck) {
  // Search by name
  const { data: byName } = await supabase
    .from('routes')
    .select('id, name, area_id, grade')
    .ilike('name', `%${route.name}%`)
    .limit(5);

  if (byName && byName.length > 0) {
    console.log(`✓ ${route.peak}: ${route.name}`);
    byName.forEach(r => {
      console.log(`  Found: ${r.name} (${r.area_id}, grade: ${r.grade})`);
    });
  } else {
    console.log(`✗ ${route.peak}: ${route.name} - NOT FOUND`);
  }
}

// Also check total route counts for each peak
console.log('\n=== ROUTE COUNTS BY PEAK ===');
const peaks = ['wa_mount_adams', 'wa_mount_baker', 'wa_mount_shuksan'];

for (const peakId of peaks) {
  const { count } = await supabase
    .from('routes')
    .select('*', { count: 'exact', head: true })
    .eq('area_id', peakId);
  
  const { data: routes } = await supabase
    .from('routes')
    .select('name')
    .eq('area_id', peakId);
  
  console.log(`\n${peakId}: ${count} routes`);
  routes.forEach(r => console.log(`  - ${r.name}`));
}
