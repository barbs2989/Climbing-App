import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== IMPORTING 327 WA ALPINE/MOUNTAINEERING ROUTES ===\n');

// Load catalog routes
const catalogPath = '/Users/nathanbarber/dev/Climbing-App/catalog/wa-alpine/routes.json';
if (!fs.existsSync(catalogPath)) {
  console.error('Catalog not found at', catalogPath);
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
const routes = catalog.routes || [];

console.log(`Loaded ${routes.length} routes from catalog\n`);

// Get existing routes
const { data: existing } = await supabase
  .from('routes')
  .select('id')
  .ilike('area_id', 'wa_%')
  .limit(5000);

const existingIds = new Set(existing.map(r => r.id));

console.log(`Existing WA routes in database: ${existingIds.size}\n`);

// Filter to new routes
const toImport = routes.filter(r => !existingIds.has(r.id));
console.log(`Routes to import: ${toImport.length}\n`);

// Batch import
let imported = 0;
let failed = 0;
const failedRoutes = [];

const BATCH_SIZE = 50;
for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
  const batch = toImport.slice(i, i + BATCH_SIZE);
  console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toImport.length / BATCH_SIZE)} (${batch.length} routes)...`);
  
  for (const route of batch) {
    const { error } = await supabase
      .from('routes')
      .insert([route]);
    
    if (error) {
      console.error(`  ✗ ${route.id}: ${error.message}`);
      failed++;
      failedRoutes.push({ id: route.id, error: error.message });
    } else {
      imported++;
    }
  }
  
  if (i + BATCH_SIZE < toImport.length) {
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

console.log(`\n=== IMPORT COMPLETE ===`);
console.log(`Imported: ${imported}`);
console.log(`Failed: ${failed}`);
console.log(`Total in catalog: ${routes.length}`);

if (failedRoutes.length > 0 && failedRoutes.length <= 15) {
  console.log(`\nFailed routes:`);
  failedRoutes.forEach(f => console.log(`  ${f.id}: ${f.error}`));
}

// Verify
const { data: allWa } = await supabase
  .from('routes')
  .select('area_id')
  .ilike('area_id', 'wa_%')
  .limit(5000);

console.log(`\nWA routes now in database: ${allWa.length}`);
