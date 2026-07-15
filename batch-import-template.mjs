import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ofuofhojhbcrcahuotya.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

const dataFile = process.argv[2];
const field = process.argv[3] || 'watch_out';
const dryRun = process.argv.includes('--dry-run');

if (!dataFile) {
  console.error('Usage: node batch-import-template.mjs <data.json> [field] [--dry-run]');
  process.exit(1);
}

if (!fs.existsSync(dataFile)) {
  console.error(`File not found: ${dataFile}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
const routes = Array.isArray(data) ? data : data.routes || [];

console.log(`\n=== BATCH IMPORT: ${field.toUpperCase()} DATA ===`);
console.log(`File: ${dataFile}`);
console.log(`Routes: ${routes.length}`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE IMPORT'}\n`);

let updated = 0;
let failed = 0;
let skipped = 0;

for (const route of routes) {
  const value = route[field];
  
  if (!value) {
    skipped++;
    continue;
  }
  
  if (dryRun) {
    updated++;
    console.log(`[DRY] ${route.id}: +${field.length} chars`);
    continue;
  }
  
  const updateData = {};
  updateData[field] = value;
  
  const { error } = await supabase
    .from('routes')
    .update(updateData)
    .eq('id', route.id);
  
  if (error) {
    failed++;
    console.error(`✗ ${route.id}: ${error.message}`);
  } else {
    updated++;
    console.log(`✓ ${route.id}`);
  }
}

console.log(`\n=== COMPLETE ===`);
console.log(`Updated: ${updated}`);
console.log(`Skipped: ${skipped}`);
console.log(`Failed: ${failed}\n`);

if (!dryRun) {
  // Verify coverage
  const { count: withField } = await supabase
    .from('routes')
    .select('*', { count: 'exact', head: true })
    .not(field, 'is', null)
    .ilike('area_id', 'wa_%');

  const { count: totalWa } = await supabase
    .from('routes')
    .select('*', { count: 'exact', head: true })
    .ilike('area_id', 'wa_%');

  const coverage = ((withField / totalWa) * 100).toFixed(1);
  console.log(`Coverage: ${withField}/${totalWa} WA routes with ${field} (${coverage}%)`);
}
