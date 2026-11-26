// Step 1 (DB, read-only): every area and every route's area_id, saved to <workDir> for the offline steps.
// Usage: node fetch.mjs <workDir>
import fs from 'node:fs';
import { selectAll, requireServiceKey } from '../../lib/supabase-env.mjs';
const W = process.argv[2]; if (!W) throw new Error('usage: node fetch.mjs <workDir>');
const key = requireServiceKey();
const t0 = Date.now();
const areas = await selectAll('areas', 'id,name,parent_id,path,area_type,lat,lng,parking_lat,parking_lng,parking_name,parking_note', '', { key, pageSize: 1000 });
fs.writeFileSync(W + '/areas.json', JSON.stringify(areas));
console.log('areas', areas.length, Date.now() - t0, 'ms');
const routes = await selectAll('routes', 'id,area_id', '', { key, pageSize: 1000 });
fs.writeFileSync(W + '/routes.json', JSON.stringify(routes.map((r) => [r.id, r.area_id])));
console.log('routes', routes.length, Date.now() - t0, 'ms');
