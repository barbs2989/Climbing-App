import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== PHASE 1: IMPORT 13 VERIFIED PARENT AREAS ===\n');

const parentAreas = JSON.parse(fs.readFileSync('/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/MISSING_PARENT_AREAS_FOR_IMPORT_VERIFIED.json', 'utf-8'));

let parentImported = 0;
let parentFailed = 0;

for (const area of parentAreas) {
  const { error } = await supabase
    .from('areas')
    .upsert({
      id: area.id,
      name: area.name,
      parent_id: area.parent_id,
      area_type: area.area_type,
      latitude: area.latitude,
      longitude: area.longitude,
      elevation_ft: area.elevation_ft
    }, { onConflict: 'id' });
  
  if (error) {
    console.error(`✗ ${area.id}: ${error.message}`);
    parentFailed++;
  } else {
    console.log(`✓ ${area.id}: ${area.name}`);
    parentImported++;
  }
}

console.log(`\nParent areas imported: ${parentImported}, Failed: ${parentFailed}\n`);

// Now retry all 578 fixes
console.log('=== PHASE 2: RETRY ALL 578 PARENT_ID FIXES ===\n');

const fixes = JSON.parse(fs.readFileSync('/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/migration_parent_fixes.json', 'utf-8'));

// Get current areas
const { data: currentAreas } = await supabase
  .from('areas')
  .select('id')
  .limit(50000);

const currentIds = new Set(currentAreas.map(a => a.id));

let updated = 0;
let failed = 0;
let noChange = 0;
const failures = [];

for (let i = 0; i < fixes.length; i += 50) {
  const batch = fixes.slice(i, i + 50);
  
  for (const fix of batch) {
    // Skip if no change
    if (fix.current_parent_id === fix.correct_parent_id) {
      noChange++;
      continue;
    }
    
    // Skip if parent still doesn't exist
    if (!currentIds.has(fix.correct_parent_id)) {
      failures.push({ id: fix.area_id, reason: `Parent ${fix.correct_parent_id} not found` });
      failed++;
      continue;
    }
    
    const { error } = await supabase
      .from('areas')
      .update({ parent_id: fix.correct_parent_id })
      .eq('id', fix.area_id);
    
    if (error) {
      failures.push({ id: fix.area_id, reason: error.message });
      failed++;
    } else {
      updated++;
    }
  }
  
  if (i % 100 === 0) {
    console.log(`  Processed ${Math.min(i + 50, fixes.length)}/${fixes.length}`);
  }
}

console.log(`\nResults:`);
console.log(`  Updated: ${updated}`);
console.log(`  No change needed: ${noChange}`);
console.log(`  Failed: ${failed}\n`);

if (failures.length > 0) {
  console.log(`Failed areas (${failures.length} total):`);
  failures.slice(0, 20).forEach(f => console.log(`  - ${f.id}: ${f.reason}`));
  if (failures.length > 20) console.log(`  ... and ${failures.length - 20} more`);
}

// Final verification
console.log('\n=== FINAL VERIFICATION ===');
const { data: allAreas } = await supabase
  .from('areas')
  .select('id')
  .limit(50000);

const finalIds = new Set(allAreas.map(a => a.id));

const { data: brokenLinks } = await supabase
  .from('areas')
  .select('id, parent_id')
  .not('parent_id', 'is', null)
  .limit(50000);

const stillBroken = brokenLinks.filter(a => !finalIds.has(a.parent_id));

console.log(`Total areas with parent_id: ${brokenLinks.length}`);
console.log(`Remaining broken parent links: ${stillBroken.length}`);
console.log(`Success rate: ${(((brokenLinks.length - stillBroken.length) / brokenLinks.length) * 100).toFixed(1)}%`);

if (stillBroken.length > 0) {
  console.log(`\nRemaining broken (sample):`);
  stillBroken.slice(0, 10).forEach(a => {
    console.log(`  ${a.id} → ${a.parent_id}`);
  });
}
