import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== PERMIT DATA → ROUTE INTEGRATION ===\n');

// Load permit data
const permitFile = '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/wa_alpine_permits_and_access.json';

if (!fs.existsSync(permitFile)) {
  console.error(`Permit file not found: ${permitFile}`);
  process.exit(1);
}

const permitData = JSON.parse(fs.readFileSync(permitFile, 'utf-8'));
const peaks = permitData.peaks || [];

console.log(`Loaded permit data for ${peaks.length} peaks\n`);

// Extract peak ID to permit info mapping
const peakPermits = {};
peaks.forEach(peak => {
  peakPermits[peak.peak_id] = {
    land_manager: peak.land_manager?.agency || 'Unknown',
    permits: peak.permits || [],
    parking: peak.parking || null,
    seasonal: peak.seasonal_access || null,
    group_limits: peak.group_size_limits || null,
    notes: peak.special_requirements || null
  };
});

console.log(`Extracted permit info for: ${Object.keys(peakPermits).join(', ')}\n`);

// Format as access field for each peak's routes
let updated = 0;
let failed = 0;

for (const [peakId, permitInfo] of Object.entries(peakPermits)) {
  // Build access object
  const access = {
    land_manager: permitInfo.land_manager,
    permit: permitInfo.permits[0]?.name || 'Self-issue permit',
    fees: permitInfo.permits[0]?.cost_per_person || 'Free',
    parking_pass: permitInfo.parking?.pass_type || 'Northwest Forest Pass',
    seasonal: permitInfo.seasonal,
    group_limit: permitInfo.group_limits?.max_unguided || 12,
    notes: permitInfo.notes
  };

  // Update all routes for this peak
  const { error } = await supabase
    .from('routes')
    .update({ access })
    .eq('area_id', peakId);

  if (error) {
    console.error(`✗ ${peakId}: ${error.message}`);
    failed++;
  } else {
    console.log(`✓ ${peakId}: permit info added`);
    updated++;
  }
}

console.log(`\n=== COMPLETE ===`);
console.log(`Updated: ${updated} peaks`);
console.log(`Failed: ${failed}\n`);

// Verify
const { count: withAccess } = await supabase
  .from('routes')
  .select('*', { count: 'exact', head: true })
  .ilike('area_id', 'wa_%')
  .not('access', 'is', null);

const { count: totalWa } = await supabase
  .from('routes')
  .select('*', { count: 'exact', head: true })
  .ilike('area_id', 'wa_%');

const coverage = ((withAccess / totalWa) * 100).toFixed(1);
console.log(`Access data coverage: ${withAccess}/${totalWa} WA routes (${coverage}%)`);
