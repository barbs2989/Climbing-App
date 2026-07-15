import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== IMPORTING 13 PARENT AREAS (CORRECT COLUMNS) ===\n');

const parentAreas = JSON.parse(fs.readFileSync('/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/MISSING_PARENT_AREAS_FOR_IMPORT_VERIFIED.json', 'utf-8'));

let parentImported = 0;
let parentFailed = 0;

for (const area of parentAreas) {
  const { error } = await supabase
    .from('areas')
    .upsert({
      id: area.id,
      name: area.name,
      parent_id: area.parent_id
    }, { onConflict: 'id' });
  
  if (error) {
    console.error(`✗ ${area.id}: ${error.message}`);
    parentFailed++;
  } else {
    console.log(`✓ ${area.id}: ${area.name}`);
    parentImported++;
  }
}

console.log(`\nParent areas imported: ${parentImported}\n`);

// Verify parents exist
const { data: importedAreas } = await supabase
  .from('areas')
  .select('id')
  .in('id', parentAreas.map(a => a.id));

console.log(`Verified in database: ${importedAreas.length}/${parentAreas.length}\n`);

// Now retry all 578 fixes
console.log('=== RETRYING 578 PARENT_ID FIXES ===\n');

const fixes = JSON.parse(fs.readFileSync('/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/migration_parent_fixes.json', 'utf-8'));

const { data: allAreas } = await supabase
  .from('areas')
  .select('id')
  .limit(50000);

const existingIds = new Set(allAreas.map(a => a.id));

let updated = 0;
let failed = 0;
let noChange = 0;
const failures = [];

for (let i = 0; i < fixes.length; i += 50) {
  const batch = fixes.slice(i, i + 50);
  
  for (const fix of batch) {
    if (fix.current_parent_id === fix.correct_parent_id) {
      noChange++;
      continue;
    }
    
    if (!existingIds.has(fix.correct_parent_id)) {
      failures.push(fix.area_id);
      failed++;
      continue;
    }
    
    const { error } = await supabase
      .from('areas')
      .update({ parent_id: fix.correct_parent_id })
      .eq('id', fix.area_id);
    
    if (error) {
      failures.push(fix.area_id);
      failed++;
    } else {
      updated++;
    }
  }
}

console.log(`Results:`);
console.log(`  Updated: ${updated}`);
console.log(`  No change: ${noChange}`);
console.log(`  Failed: ${failed}\n`);

// Final verification
const { data: finalAreas } = await supabase
  .from('areas')
  .select('id')
  .limit(50000);

const finalIds = new Set(finalAreas.map(a => a.id));

const { data: brokenLinks } = await supabase
  .from('areas')
  .select('id, parent_id')
  .not('parent_id', 'is', null)
  .limit(50000);

const stillBroken = brokenLinks.filter(a => !finalIds.has(a.parent_id));

console.log('=== VERIFICATION ===');
console.log(`Total areas with parent: ${brokenLinks.length}`);
console.log(`Remaining broken: ${stillBroken.length}`);
console.log(`Fixed: ${brokenLinks.length - stillBroken.length}`);
console.log(`Success rate: ${(((brokenLinks.length - stillBroken.length) / brokenLinks.length) * 100).toFixed(1)}%\n`);

if (stillBroken.length <= 20) {
  console.log('All remaining broken links:');
  stillBroken.forEach(a => console.log(`  ${a.id} → ${a.parent_id}`));
} else {
  console.log('Sample of remaining broken links:');
  stillBroken.slice(0, 15).forEach(a => console.log(`  ${a.id} → ${a.parent_id}`));
  console.log(`  ... and ${stillBroken.length - 15} more`);
}
