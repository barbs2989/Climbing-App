// Step 4: which MAPPED parking lots and trailheads lie where the directions end? Every OpenStreetMap
// amenity=parking / highway=trailhead in the 0.5° tiles covering 450 m around each target's road-snap point (the
// place Google's directions end) and 1.5 km around the crag (the alternatives a judge must weigh). Targets more than
// 1.5 km from any road are left out (the road end is then not the way in). Tiles are fetched densest first, one bbox
// query each (Overpass `around` unions of the same points ran ~2 min a request), so build.mjs can judge the finished
// regions while the rest download. A 200 with a `remark` (Overpass's timeout signature) is a failure. Resumable.
// --shard=k/n runs n copies, each taking every n-th tile and starting on its own mirror.
// --targets=file.json limits it to a subset (Canada: the US comes from Geofabrik extracts, pbf-lots.mjs).
// Usage: node lots.mjs <workDir> [--shard=k/n] [--targets=file.json]   (reads targets.json + snap.json, writes tiles/<a>_<b>.json)
import fs from 'node:fs';
const W = process.argv[2]; if (!W) throw new Error('usage: node lots.mjs <workDir>');
const EPS = ['https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const G = 0.5;
const shard = (process.argv.find((a) => a.startsWith('--shard=')) || '--shard=0/1').slice(8).split('/').map(Number);
export const tilesFor = (la, ln, r) => { const out = []; const dla = r / 111, dln = r / (111 * Math.cos(la * Math.PI / 180));
  for (let a = Math.floor((la - dla) / G); a <= Math.floor((la + dla) / G); a++) for (let b = Math.floor((ln - dln) / G); b <= Math.floor((ln + dln) / G); b++) out.push(a + '_' + b); return out; };
const tf = (process.argv.find((a) => a.startsWith('--targets=')) || '--targets=targets.json').slice(10);
const targets = JSON.parse(fs.readFileSync(W + '/' + tf));
const snap = JSON.parse(fs.readFileSync(W + '/snap.json'));
fs.mkdirSync(W + '/tiles', { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const need = new Map();
for (const t of targets) { const s = snap[t.id]; if (!s || s.m > 1500) continue;
  for (const k of new Set([...tilesFor(s.lat, s.lng, 0.45), ...tilesFor(t.lat, t.lng, 1.5)])) need.set(k, (need.get(k) || 0) + 1); }
const order = [...need.entries()].sort((x, y) => y[1] - x[1]).map(([k]) => k).filter((k, i) => i % shard[1] === shard[0] && !fs.existsSync(W + '/tiles/' + k + '.json'));
console.log('tiles', need.size, 'todo', order.length);
const keep = ['name', 'access', 'fee', 'amenity', 'highway', 'parking', 'operator', 'capacity', 'description', 'note'];
let ep = shard[0], n = 0;
for (const k of order) {
  const [a, b] = k.split('_').map(Number);
  const bb = `${(a * G).toFixed(2)},${(b * G).toFixed(2)},${((a + 1) * G).toFixed(2)},${((b + 1) * G).toFixed(2)}`;
  const q = `[out:json][timeout:300][maxsize:536870912];(nwr["amenity"="parking"](${bb});nwr["highway"="trailhead"](${bb}););out center tags;`;
  let els = null;
  for (let t = 0; t < 8 && !els; t++) {
    const E = EPS[ep % EPS.length];
    try {
      const r = await fetch(E, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'climbing-app-parking-audit' }, signal: AbortSignal.timeout(330000) });
      if (r.status === 200) { const j = await r.json(); if (j.remark) console.log('remark', j.remark.slice(0, 80)); else els = j.elements || []; }
      else if (t > 2) console.log('HTTP', r.status, E);
    } catch (e) { if (t > 2) console.log('net', e.message, E); }
    if (!els) { ep++; await sleep(5000 * (t + 1)); }
  }
  if (!els) { console.log('FAILED tile', k); continue; }
  fs.writeFileSync(W + '/tiles/' + k + '.json', JSON.stringify(els.map((x) => ({ osm: x.type[0] + x.id, lat: x.lat ?? x.center?.lat, lng: x.lon ?? x.center?.lon, t: Object.fromEntries(keep.filter((kk) => x.tags && x.tags[kk]).map((kk) => [kk, x.tags[kk]])) })).filter((x) => x.lat != null)));
  if (++n % 20 === 0) console.log(new Date().toISOString(), n, '/', order.length);
  await sleep(800);
}
console.log('DONE', n);
