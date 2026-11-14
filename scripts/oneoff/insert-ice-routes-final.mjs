import "../lib/load-env.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import ws from 'ws';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  requireServiceKey(),
  { realtime: { transport: ws } }
);

console.log('=== INSERT ICE ROUTES PHASE 2 ===\n');

const dataFile = '/tmp/wa_ice_climbing_complete_hazard_documentation.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
const routes = Array.isArray(data) ? data : data.routes || data;

console.log(`Preparing ${routes.length} ice routes for insertion\n`);

// Area mappings
const areaMap = {
  'Snoqualmie Pass': 'wa_snoqualmie_pass',
  'Tumwater Canyon': 'wa_tumwater_canyon',
  'Banks Lake': 'wa_banks_lake',
  'North Cascades': 'wa_north_cascades'
};

let inserted = 0;

(async () => {
  for (const route of routes) {
    if (!route.area) continue;
    
    const areaId = areaMap[route.area] || `wa_${route.area.toLowerCase().replace(/\s+/g, '_')}`;
    
    const newRoute = {
      id: route.id,
      name: route.name,
      area_id: areaId,
      discipline: 'ice',
      grade: route.grade,
      watch_out: Array.isArray(route.watch_out) ? route.watch_out.join('\n') : route.watch_out
    };
    
    const { error } = await supabase.from('routes').insert([newRoute]);
    
    if (!error) {
      console.log(`✓ ${route.name} (${route.grade})`);
      inserted++;
    }
  }
  
  console.log(`\n✓ Inserted: ${inserted}/${routes.length}`);
  
  const { count: totalWa } = await supabase
    .from('routes')
    .select('*', { count: 'exact', head: true })
    .ilike('area_id', 'wa_%');
  
  console.log(`Total WA routes: ${totalWa}\n`);
  process.exit(0);
})();
