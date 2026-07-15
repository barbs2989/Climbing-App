import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== FIXING ROUTES ===\n');

// 1. Delete Mount Adams duplicate
console.log('1. Deleting Mount Adams duplicate: "South Climb (South Spur)"');
const { error: deleteError } = await supabase
  .from('routes')
  .delete()
  .eq('id', 'wa_mount_adams_south_climb');

if (deleteError) {
  console.error(`✗ Error: ${deleteError.message}`);
} else {
  console.log('✓ Deleted wa_mount_adams_south_climb\n');
}

// 2. Delete Mount Adams circumnavigation (non-technical)
console.log('2. Deleting Mount Adams circumnavigation (non-technical trek)');
const { error: circumError } = await supabase
  .from('routes')
  .delete()
  .eq('id', 'wa_mount_adams_circumnavigation');

if (circumError) {
  console.error(`✗ Error: ${circumError.message}`);
} else {
  console.log('✓ Deleted wa_mount_adams_circumnavigation\n');
}

// 3. Add White Salmon Glacier to Mount Shuksan
console.log('3. Adding White Salmon Glacier to Mount Shuksan');
const whiteSalmonRoute = {
  id: 'wa_mount_shuksan_white_salmon_glacier',
  name: 'White Salmon Glacier',
  area_id: 'wa_mount_shuksan',
  discipline: 'alpine',
  grade: 'Grade II, Easy Snow',
  type: 'alpine',
  description: 'Easy snow approach to Mount Shuksan via White Salmon Glacier. Straightforward glacier climb with minimal technical difficulty, suitable for snow climbers. Access via White Salmon Glacier from the north, gaining 2,000 ft of elevation through moderate snow slopes.',
  hazards: ['Crevasses (mid to late season)', 'Seracs', 'Whiteouts in poor weather'],
  gear: ['Crampons', 'Ice axe', 'Rope (optional for early season)', 'Helmet'],
  approach: 'White Salmon Glacier approach from park boundary. Approach time varies by route start, typically 2-3 hours from trailhead.',
  approach_time_hrs: 2.5,
  summit_time_hrs: 4,
  descent_time_hrs: 2,
  total_time_hrs: 8.5,
  best_season: 'June through September',
  first_ascent: 'Early ascents via Shuksan standard routes',
  notes: 'One of the easier approaches to Shuksan summit. Popular with intermediate snow climbers.'
};

const { error: insertError } = await supabase
  .from('routes')
  .insert([whiteSalmonRoute]);

if (insertError) {
  console.error(`✗ Error: ${insertError.message}`);
} else {
  console.log('✓ Added White Salmon Glacier\n');
}

// Verify results
console.log('=== VERIFICATION ===\n');

const { data: adamsBefore } = await supabase
  .from('routes')
  .select('name')
  .eq('area_id', 'wa_mount_adams');

const { data: shuksanAfter } = await supabase
  .from('routes')
  .select('name')
  .eq('area_id', 'wa_mount_shuksan');

console.log(`Mount Adams now has ${adamsBefore.length} routes (was 9)`);
adamsBefore.forEach(r => console.log(`  - ${r.name}`));

console.log(`\nMount Shuksan now has ${shuksanAfter.length} routes (was 9)`);
shuksanAfter.forEach(r => console.log(`  - ${r.name}`));
