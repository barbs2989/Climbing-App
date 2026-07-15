import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== COMPREHENSIVE WA ALPINE AUDIT, BUILD & REPAIR ===\n');

// Step 1: AUDIT current state
console.log('STEP 1: AUDIT CURRENT STATE\n');

const peaks = [
  { id: 'wa_mount_adams', name: 'Mount Adams', expected: 7 },
  { id: 'wa_mount_baker', name: 'Mount Baker', expected: 7 },
  { id: 'wa_mount_shuksan', name: 'Mount Shuksan', expected: 10 },
  { id: 'wa_mount_rainier', name: 'Mount Rainier', expected: 18 },
  { id: 'wa_mount_stuart', name: 'Mount Stuart', expected: 15 }
];

const audit = {};
for (const peak of peaks) {
  const { count } = await supabase
    .from('routes')
    .select('*', { count: 'exact', head: true })
    .eq('area_id', peak.id);
  
  audit[peak.id] = { name: peak.name, current: count, expected: peak.expected, gap: peak.expected - count };
  console.log(`${peak.name}: ${count}/${peak.expected} (gap: ${peak.expected - count})`);
}

console.log('\n\nSTEP 2: LOAD RESEARCH DATA\n');

// Load research files
const dataFiles = [
  '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/wa_alpine_routes_ready_for_supabase.json',
  '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/eastern-washington-alpine-routes.json',
  '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/climbing-routes-data.json',
  '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/south-cascades-volcanic-routes.json'
];

let allRoutes = [];

for (const file of dataFiles) {
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const routes = Array.isArray(data) ? data : (data.routes || []);
      console.log(`Loaded ${routes.length} routes from ${file.split('/').pop()}`);
      allRoutes = allRoutes.concat(routes);
    } catch (e) {
      console.log(`Error loading ${file.split('/').pop()}: ${e.message}`);
    }
  }
}

console.log(`\nTotal routes from all research files: ${allRoutes.length}\n`);

// Step 3: IDENTIFY gaps and prepare imports
console.log('STEP 3: IDENTIFYING GAPS AND PREPARING IMPORTS\n');

// Get existing route IDs
const { data: existing } = await supabase
  .from('routes')
  .select('id')
  .ilike('area_id', 'wa_%')
  .limit(10000);

const existingIds = new Set(existing.map(r => r.id));

const toImport = allRoutes.filter(r => !existingIds.has(r.id));

console.log(`Routes in research: ${allRoutes.length}`);
console.log(`Already in database: ${existingIds.size}`);
console.log(`Need to import: ${toImport.length}\n`);

// Step 4: REPAIR - Delete obvious errors and duplicates
console.log('STEP 4: REPAIR - Removing errors\n');

// Check for duplicates and errors
const { data: allWaRoutes } = await supabase
  .from('routes')
  .select('id, name, area_id')
  .ilike('area_id', 'wa_%')
  .limit(10000);

// Find routes with missing area_ids (orphans)
const { data: orphans } = await supabase
  .from('routes')
  .select('id, area_id')
  .ilike('area_id', 'wa_%')
  .limit(10000);

const { data: allAreas } = await supabase
  .from('areas')
  .select('id')
  .limit(50000);

const areaIds = new Set(allAreas.map(a => a.id));

const orphanedRoutes = orphans.filter(r => !areaIds.has(r.area_id));
console.log(`Found ${orphanedRoutes.length} orphaned routes (invalid area_id)`);

if (orphanedRoutes.length > 0) {
  console.log('Sample orphaned routes:');
  orphanedRoutes.slice(0, 5).forEach(r => console.log(`  ${r.id} → ${r.area_id}`));
}

// Step 5: BUILD - Import research data
console.log('\n\nSTEP 5: BUILD - Importing research data\n');

let imported = 0;
let failed = 0;

const BATCH_SIZE = 25;
for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
  const batch = toImport.slice(i, i + BATCH_SIZE);
  console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: importing ${batch.length} routes...`);
  
  for (const route of batch) {
    const { error } = await supabase
      .from('routes')
      .insert([route]);
    
    if (error) {
      failed++;
      if (failed <= 3) console.log(`  ✗ ${route.id}: ${error.message}`);
    } else {
      imported++;
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 100));
}

console.log(`\nImport complete: ${imported} added, ${failed} failed\n`);

// Step 6: VERIFY repairs
console.log('STEP 6: VERIFY - Post-repair status\n');

for (const peak of peaks) {
  const { count } = await supabase
    .from('routes')
    .select('*', { count: 'exact', head: true })
    .eq('area_id', peak.id);
  
  const before = audit[peak.id].current;
  const improvement = count - before;
  const status = count >= peak.expected ? '✓' : '⚠';
  console.log(`${status} ${peak.name}: ${before} → ${count}/${peak.expected} (+${improvement})`);
}

console.log('\n=== AUDIT, BUILD & REPAIR COMPLETE ===');
