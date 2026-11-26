// Step 7: judges' verdicts (out/*.json) -> decisions for apply.mjs. Only `lot` and `roadside` become pins:
//   lot      -> the mapped lot's coordinate (cands[c]); refused when the lot is > 2 km from the crag;
//   roadside -> the road point itself; refused when the road point is > 600 m from the crag.
// A label is refused when it names a source, is over 60 characters, or is shouted (ALL CAPS). Areas the judge listed
// in `drop` are left out.
// Usage: node assemble.mjs <workDir> <out decisions.json>
import fs from 'node:fs';
const [W, OUT] = process.argv.slice(2);
const groups = new Map(JSON.parse(fs.readFileSync(W + '/groups.json')).map((g) => [g.gid, g]));
// groups.json is rebuilt per run and only holds the groups built that run; older ones live in groups-all.json
if (fs.existsSync(W + '/groups-all.json')) for (const g of JSON.parse(fs.readFileSync(W + '/groups-all.json'))) if (!groups.has(g.gid)) groups.set(g.gid, g);
fs.writeFileSync(W + '/groups-all.json', JSON.stringify([...groups.values()]));
const km = (a, b, c, d) => { const R = 6371, x = (c - a) * Math.PI / 180, y = (d - b) * Math.PI / 180; const h = Math.sin(x / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const SRC = /mountain ?project|\bmp\b|guidebook|openstreetmap|\bosm\b|google|supertopo|thecrag|summitpost|according|per the/i;
// A second-opinion pass (recheck-out/*.json, same verdict shape) overrides the first verdict for its gid.
const over = new Map(); if (fs.existsSync(W + '/recheck-out')) for (const f of fs.readdirSync(W + '/recheck-out')) for (const v of JSON.parse(fs.readFileSync(W + '/recheck-out/' + f))) over.set(v.gid, v);
const stats = { verdicts: 0, lot: 0, roadside: 0, no: 0, unsure: 0, refused: 0, missingGroup: 0 }; const dec = [], refused = [];
for (const f of fs.readdirSync(W + '/out').filter((x) => x.endsWith('.json'))) {
  let vs; try { vs = JSON.parse(fs.readFileSync(W + '/out/' + f)); } catch { console.log('unreadable', f); continue; }
  for (const v0 of vs) {
    const v = over.get(v0.gid) || v0;
    stats.verdicts++; stats[v.v] = (stats[v.v] || 0) + 1;
    if (v.v !== 'lot' && v.v !== 'roadside') continue;
    // A roadside pin is written only after its second opinion (recheck.mjs) agreed: the first pass's roadside
    // verdicts were the weakest (17 of the first 33 were downgraded).
    if (v.v === 'roadside' && !over.has(v.gid)) { stats.roadsidePendingRecheck = (stats.roadsidePendingRecheck || 0) + 1; continue; }
    const g = groups.get(v.gid); if (!g) { stats.missingGroup++; continue; }
    const name = String(v.name || '').trim().replace(/\s+/g, ' ');
    const bad = (why) => { stats.refused++; refused.push({ gid: v.gid, why, name }); };
    if (!name || name.length > 60) { bad('label length'); continue; }
    if (SRC.test(name)) { bad('source in label'); continue; }
    if (name.length > 6 && name === name.toUpperCase()) { bad('shouted'); continue; }
    let lat, lng;
    if (v.v === 'lot') { const c = g.cands.find((x) => x.c === v.c); if (!c) { bad('no such cand'); continue; } lat = c._lat; lng = c._lng; }
    else { if (g.road_point.m_from_crag > 600) { bad('roadside > 600 m'); continue; } lat = g.road_point.lat; lng = g.road_point.lng; }
    const drop = new Set(v.drop || []);
    for (const a of g.areas) {
      // Already-written areas STAY in the list (apply.mjs skips them on its null guard): withdraw.mjs reads this list
      // as "what is still supported", and a list without them once started clearing good pins (restored, restore.mjs).
      if (drop.has(a.id)) continue;
      if (km(a.lat, a.lng, lat, lng) > 2) { bad('> 2 km from ' + a.id); continue; }
      dec.push({ id: a.id, new: { lat: +(+lat).toFixed(7), lng: +(+lng).toFixed(7), name }, kind: v.v, why: v.why });
    }
  }
}
fs.writeFileSync(OUT, JSON.stringify(dec, null, 1));
console.log(stats, 'decisions', dec.length, 'refused', refused.slice(0, 10));
