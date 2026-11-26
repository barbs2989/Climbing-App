// Put back pins from a rollback JSON (rows as they were before a write), only where the row is now EMPTY — so a
// pin anyone set since is never overwritten. Written after withdraw.mjs, fed a decision list that left out every
// already-written id, started clearing pins a second opinion had NOT withdrawn (stopped by hand).
// Usage: node restore.mjs <rollback.json> [--dry]
import fs from 'node:fs';
import { patchRow, SUPABASE_URL, requireServiceKey, headers } from '../../lib/supabase-env.mjs';
const rows = JSON.parse(fs.readFileSync(process.argv[2])).filter((r) => r.parking_lat != null);
const dry = process.argv.includes('--dry'); const key = requireServiceKey();
const live = new Map();
for (let i = 0; i < rows.length; i += 100) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,parking_lat&id=in.(${rows.slice(i, i + 100).map((x) => encodeURIComponent(x.id)).join(',')})`, { headers: headers(key) });
  for (const x of await r.json()) live.set(x.id, x);
}
const todo = rows.filter((r) => live.get(r.id) && live.get(r.id).parking_lat == null);
console.log('rollback rows', rows.length, 'now empty (to restore)', todo.length);
if (dry) process.exit(0);
let n = 0;
for (const r of todo) { await patchRow('areas', r.id, { parking_lat: r.parking_lat, parking_lng: r.parking_lng, parking_name: r.parking_name }, { filter: 'parking_lat=is.null' }); n++; }
console.log('restored', n);
