import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import ws from 'ws';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { realtime: { transport: ws } });

console.log('=== PHASE 2: ICE ROUTES IMPORT (46 ROUTES) ===\n');

const dataFile = '/tmp/wa_ice_climbing_complete_hazard_documentation.json';

if (!fs.existsSync(dataFile)) {
  console.error(`Data file not found: ${dataFile}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
const routes = Array.isArray(data) ? data : data.routes || data;

console.log(`Importing ${routes.length} ice routes\n`);

let matched = 0, updated = 0, notfound = 0;

(async () => {
  for (const route of routes) {
    if (!route.watch_out || route.watch_out.length === 0) continue;
    
    // Name-based matching
    const { data: dbRoutes } = await supabase
      .from('routes')
      .select('id')
      .ilike('name', `%${route.name}%`)
      .ilike('area_id', 'wa_%')
      .limit(1);
    
    if (dbRoutes && dbRoutes.length > 0) {
      const watchOut = Array.isArray(route.watch_out) ? route.watch_out.join('\n') : route.watch_out;
      const { error } = await supabase.from('routes').update({ watch_out: watchOut }).eq('id', dbRoutes[0].id);
      
      if (!error) {
        console.log(`✓ ${route.name}: ${route.watch_out.length} hazards`);
        updated++;
      }
      matched++;
    } else {
      notfound++;
    }
  }
  
  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Matched: ${matched}/${routes.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Not found: ${notfound}\n`);
  
  // Coverage check
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
  
  process.exit(0);
})();
