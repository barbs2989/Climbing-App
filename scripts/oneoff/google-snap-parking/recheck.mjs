// Second opinion on every ROADSIDE verdict judged before JUDGE.md's roadside rule was tightened (batches < --before),
// and on any later one when --all is given: writes recheck/rNN.json (the group + the first judge's reason) for a judge
// reading JUDGE.md again; its answers go to recheck-out/rNN.json and override the first verdict in assemble.mjs.
// Usage: node recheck.mjs <workDir> [--before=10] [--all]
import fs from 'node:fs';
const W = process.argv[2];
const before = +((process.argv.find((a) => a.startsWith('--before=')) || '--before=10').slice(9));
const all = process.argv.includes('--all');
const groups = new Map(JSON.parse(fs.readFileSync(W + '/groups-all.json')).map((g) => [g.gid, g]));
fs.mkdirSync(W + '/recheck', { recursive: true }); fs.mkdirSync(W + '/recheck-out', { recursive: true });
const queued = new Set(); for (const f of fs.readdirSync(W + '/recheck')) for (const g of JSON.parse(fs.readFileSync(W + '/recheck/' + f))) queued.add(g.gid);
const items = [];
for (const f of fs.readdirSync(W + '/out').sort()) {
  const n = +f.slice(1, 5); if (!all && n >= before) continue;
  for (const v of JSON.parse(fs.readFileSync(W + '/out/' + f))) {
    if (v.v !== 'roadside' || queued.has(v.gid)) continue;
    const g = groups.get(v.gid); if (!g) continue;
    items.push({ ...g, areas: g.areas.map(({ lat, lng, ...r }) => r), road_point: { ...g.road_point, lat: undefined, lng: undefined }, cands: g.cands.map(({ _lat, _lng, _osm, ...r }) => r), first_judge: { v: v.v, name: v.name, why: v.why } });
  }
}
let k = fs.readdirSync(W + '/recheck').length;
for (let i = 0; i < items.length; i += 50) fs.writeFileSync(W + '/recheck/r' + String(k++).padStart(2, '0') + '.json', JSON.stringify(items.slice(i, i + 50), null, 1));
console.log('recheck items', items.length);
