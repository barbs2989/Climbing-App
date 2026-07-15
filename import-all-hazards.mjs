import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

const files = [
  'wa-ice-alpine-hazards.json',
  'icicle_creek_ice_routes_hazards.json',
  'icicle_creek_expansion_ice_routes_hazards.json',
  'snoqualmie_pass_ice_routes_hazards.json',
  'tumwater_canyon_other_wa_ice_routes_hazards.json'
];

let totalUpdated = 0;
let totalFailed = 0;

for (const file of files) {
  const path = `/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/${file}`;
  
  if (!fs.existsSync(path)) {
    console.log(`⊘ ${file}: not found`);
    continue;
  }
  
  const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
  const routes = Array.isArray(data) ? data : data.routes || data.hazards || [];
  
  console.log(`\n${file} (${routes.length} routes):`);
  
  let updated = 0;
  for (const route of routes) {
    if (!route.id) continue;
    
    const watchOut = Array.isArray(route.watch_out) 
      ? route.watch_out.join('\n')
      : route.watch_out;
    
    const { error } = await supabase
      .from('routes')
      .update({ watch_out: watchOut })
      .eq('id', route.id);
    
    if (!error) {
      updated++;
    }
  }
  
  console.log(`  Updated: ${updated}/${routes.length}`);
  totalUpdated += updated;
}

console.log(`\n=== TOTAL ===`);
console.log(`Updated: ${totalUpdated} routes\n`);

// Check new coverage
const { count: withHazard } = await supabase
  .from('routes')
  .select('*', { count: 'exact', head: true })
  .ilike('area_id', 'wa_%')
  .not('watch_out', 'is', null);

const { count: totalWa } = await supabase
  .from('routes')
  .select('*', { count: 'exact', head: true })
  .ilike('area_id', 'wa_%');

const pct = ((withHazard / totalWa) * 100).toFixed(1);
console.log(`Hazard coverage now: ${withHazard}/${totalWa} (${pct}%)`);
