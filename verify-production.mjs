import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== VERIFYING PRODUCTION DATABASE ===\n');

const peaks = [
  { id: 'wa_mount_adams', name: 'Mount Adams' },
  { id: 'wa_mount_baker', name: 'Mount Baker' },
  { id: 'wa_mount_shuksan', name: 'Mount Shuksan' }
];

for (const peak of peaks) {
  const { data: routes, count } = await supabase
    .from('routes')
    .select('name, grade')
    .eq('area_id', peak.id);
  
  if (count > 0) {
    console.log(`✓ ${peak.name}: ${count} routes`);
    routes.slice(0, 5).forEach(r => console.log(`  - ${r.name} (${r.grade})`));
    if (count > 5) console.log(`  ... and ${count - 5} more`);
  } else {
    console.log(`✗ ${peak.name}: 0 routes`);
  }
  console.log();
}

// Check for White Salmon Glacier specifically
const { data: whiteSalmon } = await supabase
  .from('routes')
  .select('name, grade')
  .ilike('name', '%White Salmon%')
  .eq('area_id', 'wa_mount_shuksan');

console.log('White Salmon Glacier search:');
if (whiteSalmon && whiteSalmon.length > 0) {
  console.log('✓ Found:');
  whiteSalmon.forEach(r => console.log(`  ${r.name} (${r.grade})`));
} else {
  console.log('✗ Not found');
}
