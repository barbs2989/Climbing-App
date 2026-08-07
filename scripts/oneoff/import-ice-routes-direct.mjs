import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdW9maG9qaGJjcmNhaHVvdHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODM4Njc5NzcsImV4cCI6MTk5OTQ0Mzk3N30.7Cih20z7h3rR9DpEe5Yb8vL2Z5Q3m9K6Q7x8N2M3P4Q',
  { realtime: { transport: ws } }
);

console.log('=== ICE ROUTES PHASE 2 IMPORT ===\n');

const dataFile = '/tmp/wa_ice_climbing_complete_hazard_documentation.json';

if (!fs.existsSync(dataFile)) {
  console.error(`Data file not found: ${dataFile}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
const routes = Array.isArray(data) ? data : data.routes || data;

console.log(`Found ${routes.length} routes\n`);

let updated = 0;

(async () => {
  for (const route of routes) {
    if (!route.watch_out || route.watch_out.length === 0) continue;
    
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
        console.log(`✓ ${route.name}`);
        updated++;
      }
    }
  }
  
  console.log(`\n✓ Updated: ${updated}/${routes.length}`);
  
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
  console.log(`Coverage: ${withHazard}/${totalWa} (${pct}%)\n`);
  
  process.exit(0);
})();
