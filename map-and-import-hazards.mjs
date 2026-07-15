import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

const master = JSON.parse(fs.readFileSync('/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/wa_ice_routes_master.json', 'utf-8'));

console.log(`=== MAPPING ${master.routes.length} ROUTES TO DATABASE IDs ===\n`);

let mapped = 0;
let notfound = 0;
let updated = 0;

const results = [];

for (const hazardRoute of master.routes) {
  const routeName = hazardRoute.route_name;
  const areaName = hazardRoute.area;
  
  // Search for matching route in database
  const { data: routes } = await supabase
    .from('routes')
    .select('id, name, area_id')
    .ilike('name', `%${routeName}%`)
    .ilike('area_id', 'wa_%')
    .limit(5);
  
  if (routes && routes.length > 0) {
    const route = routes[0];
    
    const watchOut = hazardRoute.watch_out.join('\n');
    
    const { error } = await supabase
      .from('routes')
      .update({ watch_out: watchOut })
      .eq('id', route.id);
    
    if (!error) {
      console.log(`✓ ${routeName} → ${route.id}`);
      mapped++;
      updated++;
    } else {
      console.log(`✗ ${routeName} → ${route.id}: ${error.message}`);
    }
  } else {
    console.log(`⊘ ${routeName}: not found in database`);
    notfound++;
  }
}

console.log(`\n=== RESULTS ===`);
console.log(`Mapped: ${mapped}`);
console.log(`Not found: ${notfound}`);
console.log(`Updated: ${updated}\n`);

// Check coverage
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
console.log(`Hazard coverage: ${withHazard}/${totalWa} (${pct}%)`);
