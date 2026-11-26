// Step 3: where does "Directions in Google Maps" to the CRAG COORDINATE end? A maps app given a bare lat,lng routes to
// the nearest point of the drivable road network. Google's own router cannot be queried in bulk (no key, and its terms
// forbid scraping), so this asks the open OSRM car router the same question: it snaps each coordinate to the nearest
// road a car may use and reports that point, the road's name and the snap distance. 100 coordinates per request
// (table service, one destination), paced 1.5 s apart, cached so a run resumes.
// Usage: node snap.mjs <workDir>   (reads targets.json [{id,lat,lng}], writes snap.json {id:{lat,lng,road,m}})
import fs from 'node:fs';
const W = process.argv[2]; if (!W) throw new Error('usage: node snap.mjs <workDir>');
const targets = JSON.parse(fs.readFileSync(W + '/targets.json'));
const F = W + '/snap.json';
const snap = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F)) : {};
const todo = targets.filter((t) => !snap[t.id]);
console.log('targets', targets.length, 'todo', todo.length);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < todo.length; i += 100) {
  const b = todo.slice(i, i + 100);
  const url = 'https://router.project-osrm.org/table/v1/driving/' + b.map((t) => (+t.lng).toFixed(6) + ',' + (+t.lat).toFixed(6)).join(';') +
    '?sources=' + b.map((_, k) => k).join(';') + '&destinations=0';
  let j = null;
  for (let a = 0; a < 4 && !j; a++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': 'crag-parking-audit/1.0' } }); if (r.ok) { const x = await r.json(); if (x.code === 'Ok') j = x; else console.log('code', x.code); } else console.log('HTTP', r.status); }
    catch (e) { console.log('net', e.message); }
    if (!j) await sleep(30000 * (a + 1));
  }
  if (!j) { console.log('giving up at', i); break; }
  b.forEach((t, k) => { const s = j.sources[k]; snap[t.id] = { lat: s.location[1], lng: s.location[0], road: s.name || '', m: Math.round(s.distance) }; });
  fs.writeFileSync(F, JSON.stringify(snap));
  if ((i / 100) % 20 === 0) console.log(new Date().toISOString(), i + b.length, '/', todo.length);
  await sleep(1500);
}
console.log('done', Object.keys(snap).length);
