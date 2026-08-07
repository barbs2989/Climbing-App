import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import ws from 'ws';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { realtime: { transport: ws } });

console.log('=== PHASE 2: HIGH-RISK ALPINE IMPORT ===\n');

const ROUTES_FILE = process.argv[2] || '/tmp/phase2-alpine-routes.json';

if (!fs.existsSync(ROUTES_FILE)) {
  console.log(`Waiting for data file: ${ROUTES_FILE}`);
  process.exit(0);
}

const routes = JSON.parse(fs.readFileSync(ROUTES_FILE, 'utf-8'));
const withHazards = Array.isArray(routes) ? routes.filter(r => r.watch_out) : [];

console.log(`Routes to import: ${withHazards.length}\n`);

let updated = 0;

(async () => {
  for (const route of withHazards) {
    const watchOut = Array.isArray(route.watch_out) ? route.watch_out.join('\n') : route.watch_out;
    
    // Try direct ID match first
    let { data: existing } = await supabase.from('routes').select('id').eq('id', route.id).limit(1);
    
    if (!existing || existing.length === 0) {
      // Fallback: name-based matching
      ({ data: existing } = await supabase
        .from('routes')
        .select('id')
        .ilike('name', `%${route.name}%`)
        .ilike('area_id', 'wa_%')
        .limit(1));
    }
    
    if (existing && existing.length > 0) {
      const { error } = await supabase.from('routes').update({ watch_out: watchOut }).eq('id', existing[0].id);
      if (!error) {
        console.log(`✓ ${route.name}: updated`);
        updated++;
      }
    }
  }
  
  console.log(`\nImport complete: ${updated}/${withHazards.length} updated`);
  process.exit(0);
})();
