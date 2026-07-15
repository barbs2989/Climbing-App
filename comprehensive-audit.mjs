import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== COMPREHENSIVE DATABASE AUDIT ===\n');

// 1. ORPHANED ROUTES - routes with area_id that don't exist
console.log('CHECKING FOR ORPHANED ROUTES...');
const { data: allRouteAreas, error: routeError } = await supabase
  .from('routes')
  .select('area_id')
  .limit(1);

const { data: uniqueAreaIds } = await supabase
  .rpc('get_unique_route_area_ids');

let orphanedCount = 0;
let totalRoutes = 0;

// Get all unique area_ids from routes
const { data: routeSample } = await supabase
  .from('routes')
  .select('area_id')
  .limit(50000);

const routeAreaIds = new Set(routeSample.map(r => r.area_id));

// Get all area IDs
const { data: allAreas } = await supabase
  .from('areas')
  .select('id')
  .limit(50000);

const existingAreaIds = new Set(allAreas.map(a => a.id));

// Check which route area_ids don't exist
const orphanedAreaIds = Array.from(routeAreaIds).filter(areaId => !existingAreaIds.has(areaId));

if (orphanedAreaIds.length > 0) {
  console.log(`✗ ORPHANED: ${orphanedAreaIds.length} unique area_ids referenced by routes don't exist in areas table`);
  orphanedAreaIds.slice(0, 10).forEach(id => console.log(`  - ${id}`));
} else {
  console.log(`✓ No orphaned routes found (all route area_ids exist in areas table)`);
}

// 2. BROKEN PARENT LINKS - areas whose parent_id doesn't exist
console.log('\nCHECKING FOR BROKEN PARENT LINKS...');
const { data: areasWithParents } = await supabase
  .from('areas')
  .select('id, parent_id')
  .not('parent_id', 'is', null)
  .limit(50000);

const brokenParents = areasWithParents.filter(a => !existingAreaIds.has(a.parent_id));

if (brokenParents.length > 0) {
  console.log(`✗ BROKEN PARENTS: ${brokenParents.length} areas reference non-existent parents`);
  brokenParents.slice(0, 10).forEach(a => console.log(`  - ${a.id} → parent ${a.parent_id}`));
} else {
  console.log(`✓ No broken parent links found`);
}

// 3. ROUTE COUNT MISMATCHES
console.log('\nCHECKING ROUTE COUNT AGGREGATION...');
const { data: mismatchSample } = await supabase
  .from('areas')
  .select('id, name, route_count')
  .gt('route_count', 0)
  .limit(100);

let countMismatches = 0;
const mismatchExamples = [];

for (const area of mismatchSample) {
  const { count: actualCount } = await supabase
    .from('routes')
    .select('*', { count: 'exact', head: true })
    .eq('area_id', area.id);
  
  if (actualCount !== area.route_count) {
    countMismatches++;
    if (mismatchExamples.length < 5) {
      mismatchExamples.push({ id: area.id, declared: area.route_count, actual: actualCount });
    }
  }
}

if (countMismatches > 0) {
  console.log(`✗ ROUTE COUNT MISMATCHES: ${countMismatches}/${mismatchSample.length} areas have incorrect route_count`);
  mismatchExamples.forEach(e => {
    console.log(`  - ${e.id}: declared=${e.declared}, actual=${e.actual}`);
  });
} else {
  console.log(`✓ No route count mismatches in sample`);
}

// 4. WA ALPINE/MOUNTAINEERING ROUTES SUMMARY
console.log('\n=== WA ALPINE/MOUNTAINEERING ROUTES ===');
const { count: alpineCount } = await supabase
  .from('routes')
  .select('*', { count: 'exact', head: true })
  .eq('discipline', 'alpine');

const { count: mountaineeringCount } = await supabase
  .from('routes')
  .select('*', { count: 'exact', head: true })
  .eq('discipline', 'mountaineering');

const waAlpineRoutes = routeSample.filter(r => r.area_id?.startsWith('wa_'));

console.log(`Total alpine routes (discipline='alpine'): ${alpineCount}`);
console.log(`Total mountaineering routes (discipline='mountaineering'): ${mountaineeringCount}`);
console.log(`WA routes in sample: ${waAlpineRoutes.length}`);

// 5. MAJOR PEAKS VERIFICATION
console.log('\n=== MAJOR PEAKS DATA VERIFICATION ===');
const peaks = [
  { id: 'wa_mount_rainier', expected: 18 },
  { id: 'wa_mount_adams', expected: 11 },
  { id: 'wa_mount_baker', expected: 9 },
  { id: 'wa_mount_shuksan', expected: 13 },
  { id: 'wa_mount_stuart', expected: 15 }
];

for (const peak of peaks) {
  const { count: actualRoutes } = await supabase
    .from('routes')
    .select('*', { count: 'exact', head: true })
    .eq('area_id', peak.id);
  
  const { data: peakArea } = await supabase
    .from('areas')
    .select('id, name, parent_id, elevation_ft')
    .eq('id', peak.id)
    .single();
  
  if (peakArea) {
    const match = actualRoutes === peak.expected ? '✓' : `✗ (expected ${peak.expected})`;
    console.log(`${match} ${peakArea.name}: ${actualRoutes} routes, parent=${peakArea.parent_id}`);
  } else {
    console.log(`✗ ${peak.id} - AREA NOT FOUND`);
  }
}

// 6. DISCIPLINE CLASSIFICATION CHECK
console.log('\n=== DISCIPLINE DISTRIBUTION ===');
const disciplines = ['alpine', 'mountaineering', 'rock', 'ice', 'mixed', 'bouldering', 'scrambling'];

for (const disc of disciplines) {
  const { count } = await supabase
    .from('routes')
    .select('*', { count: 'exact', head: true })
    .eq('discipline', disc);
  
  if (count > 0) {
    console.log(`  ${disc}: ${count}`);
  }
}

console.log('\n=== AUDIT COMPLETE ===');
