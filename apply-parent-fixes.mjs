import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== APPLYING 578 PARENT LINK REPAIRS ===\n');

const fixes = JSON.parse(fs.readFileSync('/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/migration_parent_fixes.json', 'utf-8'));

console.log(`Total fixes to apply: ${fixes.length}\n`);

// Separate by confidence level
const highConf = fixes.filter(f => f.confidence === 'high');
const mediumConf = fixes.filter(f => f.confidence === 'medium');
const lowConf = fixes.filter(f => f.confidence === 'low');

console.log(`High confidence: ${highConf.length}`);
console.log(`Medium confidence: ${mediumConf.length}`);
console.log(`Low confidence: ${lowConf.length}\n`);

let updated = 0;
let failed = 0;
let noChange = 0;
const failedAreas = [];

// Process in batches
const BATCH_SIZE = 50;

console.log('Applying fixes in batches...\n');

for (let i = 0; i < fixes.length; i += BATCH_SIZE) {
  const batch = fixes.slice(i, i + BATCH_SIZE);
  console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} areas)...`);
  
  for (const fix of batch) {
    // Only update if different
    if (fix.current_parent_id === fix.correct_parent_id) {
      noChange++;
      continue;
    }
    
    const { error } = await supabase
      .from('areas')
      .update({ parent_id: fix.correct_parent_id })
      .eq('id', fix.area_id);
    
    if (error) {
      console.error(`  ✗ ${fix.area_id}: ${error.message}`);
      failed++;
      failedAreas.push({ id: fix.area_id, error: error.message });
    } else {
      updated++;
    }
  }
  
  if (i + BATCH_SIZE < fixes.length) {
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

console.log(`\n=== MIGRATION COMPLETE ===`);
console.log(`Updated: ${updated} areas`);
console.log(`No change needed: ${noChange} areas`);
console.log(`Failed: ${failed} areas`);

if (failedAreas.length > 0 && failedAreas.length <= 10) {
  console.log(`\nFailed areas:`);
  failedAreas.forEach(f => {
    console.log(`  - ${f.id}: ${f.error}`);
  });
}

// Verify repairs
console.log('\n=== VERIFICATION ===');
const { count: stillBroken } = await supabase
  .from('areas')
  .select('*', { count: 'exact', head: true })
  .not('parent_id', 'is', null);

const { data: brokenLinks } = await supabase
  .from('areas')
  .select('id, parent_id')
  .not('parent_id', 'is', null)
  .limit(1000);

// Get all areas
const { data: allAreas } = await supabase
  .from('areas')
  .select('id')
  .limit(50000);

const areaIds = new Set(allAreas.map(a => a.id));

const remainingBroken = brokenLinks.filter(a => !areaIds.has(a.parent_id));

console.log(`Total areas with parent_id: ${stillBroken}`);
console.log(`Remaining broken parent links (sample of 1000): ${remainingBroken.length}`);

if (updated === 0 && failed === 0) {
  console.log(`\n✓ All ${fixes.length} areas already had correct parent_ids!`);
} else if (failed === 0) {
  console.log(`\n✓ Successfully updated ${updated} parent links with zero failures!`);
} else {
  console.log(`\n⚠ Updated ${updated} areas but ${failed} failed`);
}
