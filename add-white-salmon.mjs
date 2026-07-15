import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

// Check existing route structure
const { data: sampleRoute } = await supabase
  .from('routes')
  .select('*')
  .eq('id', 'wa_mount_shuksan_price_glacier')
  .single();

console.log('Sample route structure (Price Glacier):');
console.log(JSON.stringify(sampleRoute, null, 2).slice(0, 500));

// Add White Salmon Glacier with same structure
const whiteSalmonRoute = {
  id: 'wa_mount_shuksan_white_salmon_glacier',
  name: 'White Salmon Glacier',
  area_id: 'wa_mount_shuksan',
  discipline: 'alpine',
  grade: 'Grade II, Easy Snow',
  description: 'Easy snow approach via White Salmon Glacier. Straightforward glacier climb with minimal technical difficulty. Gains 2,000 ft through moderate snow slopes.'
};

console.log('\nInserting White Salmon Glacier...');
const { error } = await supabase
  .from('routes')
  .insert([whiteSalmonRoute]);

if (error) {
  console.error(`Error: ${error.message}`);
} else {
  console.log('✓ Successfully added White Salmon Glacier');
  
  // Verify
  const { data: shuksan } = await supabase
    .from('routes')
    .select('name')
    .eq('area_id', 'wa_mount_shuksan');
  
  console.log(`\nMount Shuksan now has ${shuksan.length} routes:`);
  shuksan.forEach(r => console.log(`  - ${r.name}`));
}
