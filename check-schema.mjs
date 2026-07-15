import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

// Get routes table columns
console.log('Routes table schema:\n');
const { data: schema } = await supabase
  .from('routes')
  .select('*')
  .limit(1);

if (schema && schema[0]) {
  const cols = Object.keys(schema[0]);
  console.log(cols.join('\n'));
}

// Find major peak areas
console.log('\n\n=== SEARCHING FOR RAINIER/ADAMS/STUART AREAS ===\n');

const peaks = ['Rainier', 'Adams', 'Stuart'];
for (const peak of peaks) {
  const { data: areas } = await supabase
    .from('areas')
    .select('id, name, parent_id, area_type')
    .ilike('name', `%${peak}%`)
    .limit(5);
  
  if (areas && areas.length > 0) {
    console.log(`${peak}:`);
    areas.forEach(a => {
      console.log(`  ${a.id} (${a.area_type}): ${a.name} [parent: ${a.parent_id}]`);
    });
  } else {
    console.log(`${peak}: no areas found`);
  }
  console.log();
}
