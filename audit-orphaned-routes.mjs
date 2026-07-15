import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== ORPHANED ROUTES AUDIT ===\n');

// Find orphaned routes (area_id doesn't exist in areas table)
const { data: allRoutes, error: routesError } = await supabase
  .from('routes')
  .select('id, name, area_id, discipline')
  .limit(10000);

const { data: allAreas } = await supabase
  .from('areas')
  .select('id')
  .limit(10000);

const areaIds = new Set(allAreas.map(a => a.id));

const orphanedRoutes = allRoutes.filter(r => !areaIds.has(r.area_id));

console.log(`Total routes: ${allRoutes.length}`);
console.log(`Total areas: ${allAreas.length}`);
console.log(`Orphaned routes: ${orphanedRoutes.length} (${((orphanedRoutes.length/allRoutes.length)*100).toFixed(1)}%)\n`);

// Sample orphaned routes by state
const byState = {};
orphanedRoutes.forEach(r => {
  const state = r.area_id?.split('_')[0] || 'unknown';
  if (!byState[state]) byState[state] = [];
  byState[state].push(r);
});

console.log('Orphaned routes by state:');
Object.entries(byState).sort((a, b) => b[1].length - a[1].length).slice(0, 15).forEach(([state, routes]) => {
  console.log(`  ${state.toUpperCase()}: ${routes.length} routes`);
});

// Sample orphaned area_ids (what areas they reference)
console.log('\nSample orphaned area_ids referenced:');
const uniqueOrphanAreas = [...new Set(orphanedRoutes.map(r => r.area_id))].slice(0, 20);
uniqueOrphanAreas.forEach(areaId => {
  const count = orphanedRoutes.filter(r => r.area_id === areaId).length;
  const sample = orphanedRoutes.find(r => r.area_id === areaId);
  console.log(`  ${areaId}: ${count} routes (e.g., "${sample.name}")`);
});

// Check WA-specific orphans
console.log('\n=== WASHINGTON ALPINE ROUTES STATUS ===');
const waRoutes = allRoutes.filter(r => r.area_id?.startsWith('wa_'));
const waOrphans = waRoutes.filter(r => !areaIds.has(r.area_id));

console.log(`WA routes total: ${waRoutes.length}`);
console.log(`WA orphaned: ${waOrphans.length}`);
console.log(`WA connected: ${waRoutes.length - waOrphans.length}`);

if (waOrphans.length > 0) {
  console.log('\nWA orphaned area_ids:');
  const uniqueWaOrphans = [...new Set(waOrphans.map(r => r.area_id))];
  uniqueWaOrphans.forEach(areaId => {
    const count = waOrphans.filter(r => r.area_id === areaId).length;
    const sample = waOrphans.find(r => r.area_id === areaId);
    console.log(`  ${areaId}: ${count} routes (e.g., "${sample.name}")`);
  });
}
