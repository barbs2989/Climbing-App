import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== PHASE 1: IMPORT MISSING PARENT AREAS ===\n');

// Get all areas currently in database
const { data: existingAreas } = await supabase
  .from('areas')
  .select('id')
  .limit(50000);

const existingIds = new Set(existingAreas.map(a => a.id));

// Get the fixes that failed
const fixes = JSON.parse(fs.readFileSync('/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/migration_parent_fixes.json', 'utf-8'));

// Identify missing parent_ids
const missingParents = new Set();
fixes.forEach(fix => {
  if (!existingIds.has(fix.correct_parent_id)) {
    missingParents.add(fix.correct_parent_id);
  }
});

console.log(`Missing parent areas to import: ${missingParents.size}`);
Array.from(missingParents).slice(0, 20).forEach(p => console.log(`  - ${p}`));

// Try to find these in catalog
const catalogPath = '/Users/nathanbarber/dev/Climbing-App/catalog/areas.json';
let catalogAreas = [];
if (fs.existsSync(catalogPath)) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  catalogAreas = catalog.areas || [];
  console.log(`\nLoaded ${catalogAreas.length} areas from catalog\n`);
} else {
  console.log('Catalog not found, using database-only approach\n');
}

// Match missing parents to catalog
const catalogMap = new Map(catalogAreas.map(a => [a.id, a]));
const toImport = [];

missingParents.forEach(parentId => {
  if (catalogMap.has(parentId)) {
    toImport.push(catalogMap.get(parentId));
  }
});

console.log(`Found ${toImport.length} missing parents in catalog\n`);

if (toImport.length > 0) {
  console.log('Importing missing parent areas...');
  
  let imported = 0;
  let failed = 0;
  
  for (let i = 0; i < toImport.length; i += 50) {
    const batch = toImport.slice(i, i + 50);
    
    for (const area of batch) {
      const { error } = await supabase
        .from('areas')
        .upsert({ id: area.id, name: area.name, parent_id: area.parent_id }, { onConflict: 'id' });
      
      if (error) {
        console.error(`  ✗ ${area.id}: ${error.message}`);
        failed++;
      } else {
        imported++;
      }
    }
  }
  
  console.log(`Imported: ${imported}, Failed: ${failed}\n`);
}

// Now retry the parent_id fixes
console.log('=== PHASE 2: RETRY PARENT_ID FIXES ===\n');

// Refresh existing areas
const { data: refreshedAreas } = await supabase
  .from('areas')
  .select('id')
  .limit(50000);

const refreshedIds = new Set(refreshedAreas.map(a => a.id));

let retryUpdated = 0;
let retryFailed = 0;
let retryNoChange = 0;
const retryFailures = [];

for (let i = 0; i < fixes.length; i += 50) {
  const batch = fixes.slice(i, i + 50);
  
  for (const fix of batch) {
    // Skip if no change
    if (fix.current_parent_id === fix.correct_parent_id) {
      retryNoChange++;
      continue;
    }
    
    // Skip if parent still doesn't exist
    if (!refreshedIds.has(fix.correct_parent_id)) {
      retryFailures.push({ id: fix.area_id, reason: `Parent ${fix.correct_parent_id} still missing` });
      retryFailed++;
      continue;
    }
    
    const { error } = await supabase
      .from('areas')
      .update({ parent_id: fix.correct_parent_id })
      .eq('id', fix.area_id);
    
    if (error) {
      retryFailures.push({ id: fix.area_id, reason: error.message });
      retryFailed++;
    } else {
      retryUpdated++;
    }
  }
}

console.log(`Updated: ${retryUpdated}`);
console.log(`No change: ${retryNoChange}`);
console.log(`Failed: ${retryFailed}\n`);

if (retryFailures.length > 0 && retryFailures.length <= 15) {
  console.log('Remaining failures:');
  retryFailures.forEach(f => console.log(`  - ${f.id}: ${f.reason}`));
}

console.log('\n=== FINAL VERIFICATION ===');
const { data: brokenCheck } = await supabase
  .from('areas')
  .select('id, parent_id')
  .not('parent_id', 'is', null)
  .limit(50000);

const finalIds = new Set(refreshedAreas.map(a => a.id));
const stillBroken = brokenCheck.filter(a => !finalIds.has(a.parent_id));

console.log(`Total areas checked: ${brokenCheck.length}`);
console.log(`Still broken: ${stillBroken.length}`);

if (stillBroken.length > 0) {
  console.log('\nRemaining broken parent links (sample):');
  stillBroken.slice(0, 10).forEach(a => console.log(`  ${a.id} → ${a.parent_id}`));
}
