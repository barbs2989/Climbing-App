import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== CLEANUP ORPHANED ROUTES ===\n');

// Get all WA routes and area IDs
const { data: allRoutes } = await supabase
  .from('routes')
  .select('id, area_id')
  .ilike('area_id', 'wa_%')
  .limit(10000);

const { data: allAreas } = await supabase
  .from('areas')
  .select('id')
  .limit(50000);

const areaIds = new Set(allAreas.map(a => a.id));

// Find orphans
const orphans = allRoutes.filter(r => !areaIds.has(r.area_id));
console.log(`Found ${orphans.length} orphaned WA routes\n`);

if (orphans.length > 0) {
  // Sample what we're deleting
  console.log('Sample of orphaned routes to delete:');
  orphans.slice(0, 10).forEach(r => {
    console.log(`  ${r.id} → area ${r.area_id} (missing)`);
  });
  console.log(`  ... and ${orphans.length - 10} more\n`);
  
  // Delete orphans
  console.log('Deleting orphaned routes...');
  
  let deleted = 0;
  let failed = 0;
  
  for (let i = 0; i < orphans.length; i += 100) {
    const batch = orphans.slice(i, i + 100);
    
    for (const route of batch) {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', route.id);
      
      if (error) {
        failed++;
      } else {
        deleted++;
      }
    }
    
    if (i % 500 === 0) {
      console.log(`  Processed ${Math.min(i + 100, orphans.length)}/${orphans.length}`);
    }
  }
  
  console.log(`Deleted: ${deleted}, Failed: ${failed}\n`);
}

// Verify cleanup
const { count: remaining } = await supabase
  .from('routes')
  .select('*', { count: 'exact', head: true })
  .ilike('area_id', 'wa_%');

console.log(`WA routes after cleanup: ${remaining}\n`);

// Verify major peaks still intact
console.log('=== VERIFY MAJOR PEAKS ===\n');

const peaks = ['wa_mount_adams', 'wa_mount_baker', 'wa_mount_shuksan', 'wa_mount_rainier', 'wa_mount_stuart'];

for (const peakId of peaks) {
  const { count } = await supabase
    .from('routes')
    .select('*', { count: 'exact', head: true })
    .eq('area_id', peakId);
  
  const peakName = peakId.replace('wa_mount_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  console.log(`${peakName}: ${count} routes`);
}

console.log('\n✓ Cleanup complete');
