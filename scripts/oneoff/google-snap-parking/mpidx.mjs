// Step 0: MP area id -> OUR route ids, read from the route tables on cached MP area pages and the MP route id ->
// our route id maps. Lets an area of ours find the Mountain Project "Getting There" text for itself and its walls.
// Usage: node mpidx.mjs <workDir>   (writes <workDir>/mp-area-routes.json; MP text is never committed)
import fs from 'node:fs';
const W = process.argv[2]; if (!W) throw new Error('usage: node mpidx.mjs <workDir>');
const P = '/Users/nathanbarber/dev/mp-fresh/_pages/', T = '/Users/nathanbarber/dev/mp-data/_mp/_text/';
const map = {};
for (const d of ['/Users/nathanbarber/dev/mp-data/_mp/_map/', '/Users/nathanbarber/dev/mp-fresh/_map/'])
  for (const f of fs.readdirSync(d)) try { Object.assign(map, JSON.parse(fs.readFileSync(d + f))); } catch { /* skip */ }
const out = {}; let n = 0, withR = 0;
for (const f of fs.readdirSync(P)) {
  const id = f.replace('.html', ''); if (!fs.existsSync(T + id + '.json')) continue; n++;
  const h = fs.readFileSync(P + f, 'utf8');
  const r = [...new Set([...h.matchAll(/Route-(\d+)/g)].map((m) => m[1]))].map((x) => map[x]).filter(Boolean);
  if (r.length) { withR++; out[id] = r; }
}
fs.writeFileSync(W + '/mp-area-routes.json', JSON.stringify(out));
console.log({ mapSize: Object.keys(map).length, n, withR });
