import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import ws from 'ws';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { realtime: { transport: ws } });

console.log('=== PHASE 2: ICE ROUTES IMPORT ===\n');

// This script will be run after ice routes agent completes
// Data file location: will be provided by agent output
// Expected format: array of { id, name, area, grade, watch_out: [...] }

const ROUTES_FILE = process.argv[2] || '/tmp/phase2-ice-routes.json';

if (!fs.existsSync(ROUTES_FILE)) {
  console.log(`Waiting for data file: ${ROUTES_FILE}`);
  console.log('Agent still running. Will execute automatically on completion.');
  process.exit(0);
}

const routes = JSON.parse(fs.readFileSync(ROUTES_FILE, 'utf-8'));
const withHazards = Array.isArray(routes) ? routes.filter(r => r.watch_out && r.watch_out.length > 0) : [];

console.log(`Routes with hazards: ${withHazards.length}\n`);

let matched = 0, updated = 0, notfound = 0;

(async () => {
  for (const route of withHazards) {
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
  
  console.log(`\nImport complete: ${updated}/${withHazards.length} updated, ${notfound} not found`);
  process.exit(0);
})();
