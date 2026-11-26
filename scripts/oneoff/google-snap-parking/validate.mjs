// How good is "the lot where Google's directions end" as a parking guess? Measured against crags that ALREADY carry a
// parking pin (researched, then audited against Mountain Project's Getting There in #3955): snap each such crag's
// coordinate to the road the same way snap.mjs does, take the mapped lots within 200 m of that point, and ask whether
// the nearest is the pin (within 100 m). Read-only; prints rates per state processed so far.
// Usage: node validate.mjs <workDir> [--n=1500]   (snaps a sample into validate-snap.json, cached)
import fs from 'node:fs';
const W = process.argv[2];
const N = +((process.argv.find((a) => a.startsWith('--n=')) || '--n=1500').slice(4));
const areas = JSON.parse(fs.readFileSync(W + '/areas.json'));
const placed = (a, b) => a != null && b != null && isFinite(+a) && isFinite(+b);
const km = (a, b, c, d) => { const R = 6371, x = (c - a) * Math.PI / 180, y = (d - b) * Math.PI / 180; const h = Math.sin(x / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
// one representative per distinct pin (copies down a subtree would count one decision many times)
const seenPin = new Set(); const pool = [];
for (const a of areas) { if ((a.area_type !== 'crag' && a.area_type !== 'wall') || !placed(a.lat, a.lng) || !placed(a.parking_lat, a.parking_lng) || !String(a.path).startsWith('usa.')) continue;
  const k = (+a.parking_lat).toFixed(4) + ',' + (+a.parking_lng).toFixed(4); if (seenPin.has(k)) continue; seenPin.add(k); pool.push(a); }
let x = 7; const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
const sample = pool.map((a) => [rnd(), a]).sort((p, q) => p[0] - q[0]).slice(0, N).map(([, a]) => a);
const F = W + '/validate-snap.json'; const snap = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F)) : {};
const todo = sample.filter((a) => !snap[a.id]);
for (let i = 0; i < todo.length; i += 100) {
  const b = todo.slice(i, i + 100);
  const url = 'https://router.project-osrm.org/table/v1/driving/' + b.map((t) => (+t.lng).toFixed(6) + ',' + (+t.lat).toFixed(6)).join(';') + '?sources=' + b.map((_, k) => k).join(';') + '&destinations=0';
  const j = await (await fetch(url, { headers: { 'User-Agent': 'crag-parking-audit/1.0' } })).json();
  b.forEach((t, k) => { const s = j.sources[k]; snap[t.id] = { lat: s.location[1], lng: s.location[0], road: s.name || '', m: Math.round(s.distance) }; });
  fs.writeFileSync(F, JSON.stringify(snap)); await new Promise((r) => setTimeout(r, 1500));
}
const st = new Set(fs.readdirSync(W + '/pbf-lots').filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')));
const lots = []; for (const s of st) lots.push(...JSON.parse(fs.readFileSync(W + '/pbf-lots/' + s + '.json')).filter((l) => !['private', 'no', 'customers'].includes(l.t.access)));
const cell = new Map(); for (const l of lots) { const k = Math.floor(l.lat / 0.02) + '_' + Math.floor(l.lng / 0.02); if (!cell.has(k)) cell.set(k, []); cell.get(k).push(l); }
const near = (la, ln, r) => { const o = []; const i = Math.floor(la / 0.02), j = Math.floor(ln / 0.02); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const l of cell.get((i + a) + '_' + (j + b)) || []) { const d = km(la, ln, l.lat, l.lng); if (d <= r) o.push([l, d]); } return o.sort((p, q) => p[1] - q[1]); };
const r = { inStates: 0, far: 0, lotAtSnap: 0, agree: 0, pinNearSnap: 0 };
for (const a of sample) { const s = snap[a.id]; if (!s || !st.has(String(a.path).split('.')[1])) continue; r.inStates++;
  if (km(s.lat, s.lng, +a.parking_lat, +a.parking_lng) <= 0.2) r.pinNearSnap++;
  if (s.m > 1500) { r.far++; continue; }
  const at = near(s.lat, s.lng, 0.2); if (!at.length) continue; r.lotAtSnap++;
  if (km(at[0][0].lat, at[0][0].lng, +a.parking_lat, +a.parking_lng) <= 0.1) r.agree++; }
console.log({ states: st.size, ...r, agreeRate: r.lotAtSnap ? +(r.agree / r.lotAtSnap).toFixed(3) : null, pinWithin200mOfRoadEnd: r.inStates ? +(r.pinNearSnap / r.inStates).toFixed(3) : null });
