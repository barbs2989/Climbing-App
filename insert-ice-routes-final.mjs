import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdW9maG9qaGJjcmNhaHVvdHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODM4Njc5NzcsImV4cCI6MTk5OTQ0Mzk3N30.7Cih20z7h3rR9DpEe5Yb8vL2Z5Q3m9K6Q7x8N2M3P4Q',
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
