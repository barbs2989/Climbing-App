import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== CAREFUL DATABASE AUDIT ===\n');

// Get counts
const { count: totalAreas } = await supabase
  .from('areas')
  .select('*', { count: 'exact', head: true });

const { count: totalRoutes } = await supabase
  .from('routes')
  .select('*', { count: 'exact', head: true });

console.log(`Total areas in database: ${totalAreas}`);
console.log(`Total routes in database: ${totalRoutes}\n`);

// Check for areas WITH parent_id
const { data: areasWithParent, count: withParentCount } = await supabase
  .from('areas')
  .select('*', { count: 'exact' })
  .not('parent_id', 'is', null)
  .limit(10);

console.log(`Areas WITH parent_id: ${withParentCount}`);
if (areasWithParent && areasWithParent.length > 0) {
  console.log('Sample:');
  areasWithParent.slice(0, 3).forEach(a => {
    console.log(`  ${a.id}: parent=${a.parent_id}`);
  });
}

// Check for areas WITHOUT parent_id (root level)
const { data: areasNoParent, count: noParentCount } = await supabase
  .from('areas')
  .select('*', { count: 'exact' })
  .is('parent_id', null)
  .limit(20);

console.log(`\nAreas WITHOUT parent_id (root level): ${noParentCount}`);
if (areasNoParent && areasNoParent.length > 0) {
  console.log('Sample:');
  areasNoParent.slice(0, 10).forEach(a => {
    console.log(`  ${a.id}: ${a.name}`);
  });
}

// Check specific alpine peaks
console.log('\n=== CHECKING SPECIFIC ALPINE PEAKS ===');
const peaks = ['wa_mount_rainier', 'wa_mount_adams', 'wa_mount_baker', 'wa_dragontail_peak', 'wa_mount_stuart'];

for (const peakId of peaks) {
  const { data: peak } = await supabase
    .from('areas')
    .select('id, name, parent_id, elevation_ft')
    .eq('id', peakId)
    .single();
  
  if (peak) {
    console.log(`✓ ${peakId}`);
    console.log(`  Name: ${peak.name}`);
    console.log(`  Parent: ${peak.parent_id}`);
    console.log(`  Elevation: ${peak.elevation_ft} ft`);
  } else {
    console.log(`✗ ${peakId} - NOT FOUND`);
  }
}

// Check WA routes specifically
console.log('\n=== WA ALPINE/MOUNTAINEERING ROUTES ===');
const { data: waRoutes, count: waCount } = await supabase
  .from('routes')
  .select('id, area_id, discipline', { count: 'exact' })
  .eq('discipline', 'alpine')
  .limit(20);

console.log(`Alpine routes (discipline=alpine): ${waCount}`);

// Check by area_id
const { data: routesByArea } = await supabase
  .from('routes')
  .select('id')
  .eq('area_id', 'wa_mount_rainier')
  .limit(50);

console.log(`\nRoutes with area_id=wa_mount_rainier: ${routesByArea?.length || 0}`);

// Check if area exists for those routes
const { data: rainierArea } = await supabase
  .from('areas')
  .select('id, name, parent_id')
  .eq('id', 'wa_mount_rainier')
  .single();

console.log(`\nArea wa_mount_rainier exists: ${rainierArea ? 'YES' : 'NO'}`);
if (rainierArea) {
  console.log(`  Name: ${rainierArea.name}`);
  console.log(`  Parent: ${rainierArea.parent_id}`);
}

// Check rock climbing areas
console.log('\n=== ROCK CLIMBING AREAS (SAMPLE) ===');
const { data: rockAreas } = await supabase
  .from('areas')
  .select('id, name, parent_id')
  .ilike('id', 'wa_roadside%')
  .limit(10);

if (rockAreas && rockAreas.length > 0) {
  console.log(`Found ${rockAreas.length} "roadside" areas:`);
  rockAreas.forEach(a => {
    console.log(`  ${a.id}: parent=${a.parent_id}`);
  });
} else {
  console.log('No roadside areas found');
}
