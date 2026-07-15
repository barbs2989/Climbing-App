import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

const peaks = ['wa_mount_adams', 'wa_mount_baker', 'wa_mount_shuksan'];

console.log('=== CHECKING PEAK AREAS ===\n');

for (const peakId of peaks) {
  const { data: area } = await supabase
    .from('areas')
    .select('id, name, parent_id')
    .eq('id', peakId)
    .single();
  
  if (area) {
    console.log(`✓ ${peakId}: ${area.name} (parent: ${area.parent_id})`);
  } else {
    console.log(`✗ ${peakId}: AREA NOT FOUND`);
  }
}

console.log('\n=== WA ROUTES TOTAL ===');
const { count } = await supabase
  .from('routes')
  .select('*', { count: 'exact', head: true })
  .ilike('area_id', 'wa_%');

console.log(`Total WA routes: ${count}`);
