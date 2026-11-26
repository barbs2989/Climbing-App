// Step 2: the TARGETS — every crag or wall with a coordinate whose climbs' "Directions" button has no parking pin to
// drive to (no pin of its own, none on a crag above it within the 4-deep crag chain lib/areaInherit.js reads), so the
// button sends the climber to the crag coordinate and the maps app picks the road end. Also maps each area to the
// Mountain Project area(s) whose climbs it holds, for the cross-reference.
// Usage: node targets.mjs <workDir>   (reads areas.json, routes.json, mp-area-routes.json; writes targets.json, area-mp.json)
import fs from 'node:fs';
const W = process.argv[2]; if (!W) throw new Error('usage: node targets.mjs <workDir>');
const areas = JSON.parse(fs.readFileSync(W + '/areas.json'));
const routes = JSON.parse(fs.readFileSync(W + '/routes.json'));
const mpAR = JSON.parse(fs.readFileSync(W + '/mp-area-routes.json'));
const byId = new Map(areas.map((a) => [a.id, a]));
const placed = (a, b) => a != null && b != null && isFinite(+a) && isFinite(+b);
const rArea = new Map(routes); const nR = new Map();
for (const [, a] of routes) nR.set(a, (nR.get(a) || 0) + 1);
// subtree route counts
const kids = new Map(); for (const a of areas) { if (!kids.has(a.parent_id)) kids.set(a.parent_id, []); kids.get(a.parent_id).push(a.id); }
const sub = new Map(); const subOf = (id) => { if (sub.has(id)) return sub.get(id); let n = nR.get(id) || 0; for (const k of kids.get(id) || []) n += subOf(k); sub.set(id, n); return n; };
// MP area -> our area (majority of its mapped climbs)
const areaMp = {};
for (const [mp, rids] of Object.entries(mpAR)) {
  const c = new Map(); for (const r of rids) { const a = rArea.get(r); if (a) c.set(a, (c.get(a) || 0) + 1); }
  const best = [...c.entries()].sort((x, y) => y[1] - x[1])[0]; if (!best) continue;
  (areaMp[best[0]] ||= []).push(mp);
}
fs.writeFileSync(W + '/area-mp.json', JSON.stringify(areaMp));
const effPin = (a) => {
  if (placed(a.parking_lat, a.parking_lng)) return 'own';
  if (a.area_type !== 'crag' && a.area_type !== 'wall') return null;
  for (let d = 0, p = byId.get(a.parent_id); p && d < 4; d++, p = byId.get(p.parent_id)) {
    if (p.area_type !== 'crag') break;
    if (placed(p.parking_lat, p.parking_lng)) return 'up';
    if (p.parking_note && String(p.parking_note).trim()) return { note: p }; // the inherited note comes WITHOUT a pin
  }
  return null;
};
const stats = { cragWall: 0, withClimbs: 0, own: 0, up: 0, upnote: 0, noCoord: 0, targets: 0 };
const out = [], seen = new Set();
for (const a of areas) {
  if (a.area_type !== 'crag' && a.area_type !== 'wall') continue; stats.cragWall++;
  if (!subOf(a.id)) continue; stats.withClimbs++;
  const e = effPin(a); if (e === 'own' || e === 'up') { stats[e]++; continue; }
  // A climb here shows a crag's NOTE without a pin. A pin on the wall would REPLACE that note on its climbs
  // (parkingOf: own facts win), so the candidate is the note-holding crag itself: its note and pin stay together.
  const t = e && e.note ? e.note : a;
  if (e && e.note) stats.upnote++;
  if (seen.has(t.id)) continue; seen.add(t.id);
  if (!placed(t.lat, t.lng)) { stats.noCoord++; continue; }
  stats.targets++;
  out.push({ id: t.id, lat: +t.lat, lng: +t.lng });
}
fs.writeFileSync(W + '/targets.json', JSON.stringify(out));
console.log(stats, 'areas with MP text', Object.keys(areaMp).length);
