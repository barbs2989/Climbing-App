import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

// Check for Dragontail in areas
const { data: dragontailArea, error: areaError } = await supabase
  .from('areas')
  .select('*')
  .ilike('name', '%dragontail%')
  .limit(10);

console.log('=== DRAGONTAIL AREAS ===');
if (areaError) console.error('Error:', areaError.message);
if (dragontailArea && dragontailArea.length > 0) {
  dragontailArea.forEach(a => {
    console.log(`✓ ${a.id}: ${a.name}`);
  });
} else {
  console.log('✗ No Dragontail areas found');
}

// Check for Dragontail in routes
const { data: dragontailRoutes, error: routeError } = await supabase
  .from('routes')
  .select('id, name, area_id, discipline')
  .ilike('name', '%dragontail%')
  .limit(20);

console.log('\n=== DRAGONTAIL ROUTES ===');
if (routeError) console.error('Error:', routeError.message);
if (dragontailRoutes && dragontailRoutes.length > 0) {
  console.log(`✓ Found ${dragontailRoutes.length} routes:`);
  dragontailRoutes.forEach(r => {
    console.log(`  ${r.id}: ${r.name} (area: ${r.area_id})`);
  });
} else {
  console.log('✗ No Dragontail routes found');
}

// Check Stuart Range area
const { data: stuart, error: stuartError } = await supabase
  .from('areas')
  .select('id, name, parent_id')
  .eq('id', 'wa_stuart_range')
  .single();

console.log('\n=== STUART RANGE ===');
if (stuartError) console.error('Error:', stuartError.message);
if (stuart) {
  console.log(`✓ ${stuart.id}: ${stuart.name}`);
  
  // Get all areas under Stuart Range
  const { data: stuartPeaks } = await supabase
    .from('areas')
    .select('id, name')
    .eq('parent_id', 'wa_stuart_range');
  
  console.log(`Peaks under Stuart Range (${stuartPeaks.length}):`);
  stuartPeaks.forEach(p => console.log(`  - ${p.id}: ${p.name}`));
}
