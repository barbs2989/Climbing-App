// Step 1 without a DB slot: read every area and every route's area_id from the app's nightly static catalog snapshot
// (the offline download the Climbs tab uses, published at <pages>/states/). The writes re-read each row live before
// changing it, so a night-old snapshot only decides what to LOOK at.
// Usage: node from-snapshot.mjs <workDir>   (writes areas.json, routes.json)
import fs from 'node:fs';
import zlib from 'node:zlib';
const W = process.argv[2]; if (!W) throw new Error('usage: node from-snapshot.mjs <workDir>');
const BASE = 'https://barbs2989.github.io/Climbing-App/states/';
const idx = await (await fetch(BASE + 'index.json')).json();
const areas = new Map(), routes = [];
fs.mkdirSync(W + '/snapshot', { recursive: true });
for (const s of Object.values(idx.states)) for (const p of s.parts) {
  const f = W + '/snapshot/' + p.file;
  if (!fs.existsSync(f)) { const r = await fetch(BASE + p.file); if (!r.ok) throw new Error(p.file + ' HTTP ' + r.status); fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); }
  const j = JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
  for (const a of j.areas || []) areas.set(a.id, a);
  for (const r of j.routes || []) routes.push([r.id, r.area_id]);
}
fs.writeFileSync(W + '/areas.json', JSON.stringify([...areas.values()].map(({ id, name, parent_id, path, area_type, lat, lng, parking_lat, parking_lng, parking_name, parking_note }) => ({ id, name, parent_id, path, area_type, lat, lng, parking_lat, parking_lng, parking_name, parking_note }))));
fs.writeFileSync(W + '/routes.json', JSON.stringify(routes));
console.log('areas', areas.size, 'routes', routes.length);
