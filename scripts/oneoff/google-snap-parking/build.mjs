// Step 5: the evidence each judge reads. Targets are grouped by parent area + road-snap cell (~100 m), so the walls of
// one crag that the directions take to the same road point are judged once. Each group carries: the road point
// (road name, how far and which way from the crag), every mapped lot/trailhead within 200 m of it, the other mapped
// lots within 1.5 km of the crag, our own parking note, and Mountain Project's Getting There text for the areas and
// the walls beneath them. Groups with nothing to cross-reference are recorded, not judged:
//   far     — the crag is more than 1.5 km from any drivable road: the road end is not the way in;
//   nothing — no mapped lot at the road point AND no text describing parking.
// Usage: node build.mjs <workDir>   (writes groups.json, ledger.json, batches/bNNN.json)
import fs from 'node:fs';
const W = process.argv[2]; if (!W) throw new Error('usage: node build.mjs <workDir>');
const MPT = '/Users/nathanbarber/dev/mp-data/_mp/_text/';
const areas = JSON.parse(fs.readFileSync(W + '/areas.json')); const byId = new Map(areas.map((a) => [a.id, a]));
const targets = JSON.parse(fs.readFileSync(W + '/targets.json'));
const snap = JSON.parse(fs.readFileSync(W + '/snap.json'));
import { createHash } from 'node:crypto';
const G = 0.5;
const tilesFor = (la, ln, r) => { const out = []; const dla = r / 111, dln = r / (111 * Math.cos(la * Math.PI / 180));
  for (let a = Math.floor((la - dla) / G); a <= Math.floor((la + dla) / G); a++) for (let b = Math.floor((ln - dln) / G); b <= Math.floor((ln + dln) / G); b++) out.push(a + '_' + b); return out; };
const have = new Set(fs.existsSync(W + '/tiles') ? fs.readdirSync(W + '/tiles').map((f) => f.replace('.json', '')) : []);
const lotMap = new Map(); for (const k of have) for (const x of JSON.parse(fs.readFileSync(W + '/tiles/' + k + '.json'))) lotMap.set(x.osm, x);
// US: whole-state lot lists read from Geofabrik extracts (pbf-lots.mjs) -> <workDir>/pbf-lots/<state>.json
const haveState = new Set(fs.existsSync(W + '/pbf-lots') ? fs.readdirSync(W + '/pbf-lots').filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')) : []);
for (const k of haveState) for (const x of JSON.parse(fs.readFileSync(W + '/pbf-lots/' + k + '.json'))) lotMap.set(x.osm, x);
const ready = (a, s, t) => { const p = String(a.path || '').split('.');
  if (p[0] === 'usa') return haveState.has(p[1]);
  return [...tilesFor(s.lat, s.lng, 0.45), ...tilesFor(t.lat, t.lng, 1.5)].every((k) => have.has(k)); };
const lots = [...lotMap.values()].filter((x) => !['private', 'no', 'customers', 'permit', 'delivery'].includes(x.t.access));
// judged already (out/*.json) -> never re-batched
const judged = new Set(); if (fs.existsSync(W + '/out')) for (const f of fs.readdirSync(W + '/out')) try { for (const v of JSON.parse(fs.readFileSync(W + '/out/' + f))) judged.add(v.gid); } catch { /* partial */ }
const areaMp = JSON.parse(fs.readFileSync(W + '/area-mp.json'));
const kids = new Map(); for (const a of areas) { if (!kids.has(a.parent_id)) kids.set(a.parent_id, []); kids.get(a.parent_id).push(a.id); }
const km = (a, b, c, d) => { const R = 6371, x = (c - a) * Math.PI / 180, y = (d - b) * Math.PI / 180; const h = Math.sin(x / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const brg = (a, b, c, d) => { const y = Math.sin((d - b) * Math.PI / 180) * Math.cos(c * Math.PI / 180), x = Math.cos(a * Math.PI / 180) * Math.sin(c * Math.PI / 180) - Math.sin(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.cos((d - b) * Math.PI / 180); const t = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(t / 45) % 8]; };
// spatial index of lots, 0.02° cells
const cell = new Map(); const ck = (la, ln) => Math.floor(la / 0.02) + '_' + Math.floor(ln / 0.02);
for (const x of lots) { const k = ck(x.lat, x.lng); if (!cell.has(k)) cell.set(k, []); cell.get(k).push(x); }
const near = (la, ln, maxKm) => { const out = []; const i = Math.floor(la / 0.02), j = Math.floor(ln / 0.02); const r = Math.ceil(maxKm / 1.5) + 1;
  for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (const x of cell.get((i + a) + '_' + (j + b)) || []) { const d = km(la, ln, x.lat, x.lng); if (d <= maxKm) out.push([x, d]); }
  return out.sort((p, q) => p[1] - q[1]); };
const PARK = /\b(park|parks|parked|parking|lot|pull[- ]?out|pull[- ]?off|turn[- ]?out|trailhead|trail head|shoulder|gate|campground|day[- ]use|picnic|leave (?:your|the) car|drive|road|hwy|highway|mile ?marker|mm)\b/i;
const sents = (t) => String(t || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z0-9"(])/).filter((s) => PARK.test(s)).map((s) => s.slice(0, 300));
const mpText = (id) => { const out = []; for (const m of areaMp[id] || []) { try { const j = JSON.parse(fs.readFileSync(MPT + m + '.json')); if (j['Getting There']) out.push(j['Getting There'].replace(/\s+/g, ' ').slice(0, 900)); out.push(...sents(j.Description).slice(0, 4)); } catch { /* none */ } } return out; };
const crumb = (a) => { const n = []; for (let p = byId.get(a.parent_id), d = 0; p && d < 3; d++, p = byId.get(p.parent_id)) n.unshift(p.name); return n.join(' > '); };
const ledger = []; const groups = new Map();
for (const t of targets) {
  const s = snap[t.id], a = byId.get(t.id);
  if (!s) { ledger.push({ id: t.id, status: 'no-snap' }); continue; }
  if (s.m > 1500) { ledger.push({ id: t.id, status: 'far', m: s.m }); continue; }
  if (!ready(a, s, t)) { ledger.push({ id: t.id, status: 'pending' }); continue; }
  const k = a.parent_id + '|' + s.lat.toFixed(3) + ',' + s.lng.toFixed(3);
  if (!groups.has(k)) groups.set(k, { snap: s, members: [] });
  groups.get(k).members.push(a);
}
const out = [];
for (const [gkey, g] of groups) {
  const s = g.snap, a0 = g.members[0];
  const atSnap = near(s.lat, s.lng, 0.2).slice(0, 4);
  const atIds = new Set(atSnap.map(([x]) => x.osm));
  const alt = near(a0.lat, a0.lng, 1.5).filter(([x]) => !atIds.has(x.osm)).slice(0, 5);
  const own = []; const seenT = new Set();
  for (const m of g.members) for (const x of mpText(m.id)) if (!seenT.has(x)) { seenT.add(x); own.push('[' + m.name + '] ' + x); }
  const below = []; for (const m of g.members) for (const k of (kids.get(m.id) || []).slice(0, 30)) for (const x of mpText(k)) if (!seenT.has(x) && below.length < 5) { seenT.add(x); below.push('[wall ' + byId.get(k).name + '] ' + x.slice(0, 400)); }
  const sib = []; if (!own.length) for (const k of (kids.get(a0.parent_id) || []).slice(0, 40)) { if (g.members.some((m) => m.id === k)) continue; for (const x of mpText(k)) { const ss = sents(x).slice(0, 2).join(' '); if (ss && !seenT.has(ss) && sib.length < 4) { seenT.add(ss); sib.push('[neighbour ' + byId.get(k).name + '] ' + ss); } } }
  const notes = [...new Set(g.members.map((m) => m.parking_note).filter(Boolean))];
  const text = [...own, ...below, ...sib];
  const lot = (x, d, c) => ({ c, name: x.t.name || null, kind: x.t.highway === 'trailhead' ? 'trailhead' : 'parking', access: x.t.access || null, fee: x.t.fee || null, operator: x.t.operator || null,
    m_from_road_point: Math.round(km(s.lat, s.lng, x.lat, x.lng) * 1000), km_from_crag: +km(a0.lat, a0.lng, x.lat, x.lng).toFixed(2), dir_from_crag: brg(a0.lat, a0.lng, x.lat, x.lng), _lat: x.lat, _lng: x.lng, _osm: x.osm });
  const cands = [...atSnap.map(([x, d], i) => lot(x, d, i)), ...alt.map(([x, d], i) => lot(x, d, atSnap.length + i))];
  if (!atSnap.length && !text.length && !notes.length) { for (const m of g.members) ledger.push({ id: m.id, status: 'nothing', road: s.road, m: s.m }); continue; }
  // No mapped lot at the road end: only a ROADSIDE pin is possible, and JUDGE.md allows it only within 600 m of the
  // crag with the area's own text (not a neighbour's) describing the parking.
  if (!atSnap.length && (s.m > 600 || !own.length && !notes.length)) { for (const m of g.members) ledger.push({ id: m.id, status: 'no-lot-far-or-no-own-text', road: s.road, m: s.m }); continue; }
  const gid = 'g' + createHash('sha1').update(gkey).digest('hex').slice(0, 10);
  out.push({ gid, areas: g.members.map((m) => ({ id: m.id, name: m.name, type: m.area_type, under: crumb(m), lat: m.lat, lng: m.lng })),
    road_point: { road: s.road || '(unnamed road)', m_from_crag: s.m, dir_from_crag: brg(a0.lat, a0.lng, s.lat, s.lng), lat: s.lat, lng: s.lng },
    lots_at_road_point: cands.filter((c) => atIds.has(c._osm)).length, cands, our_note: notes, text });
}
fs.writeFileSync(W + '/groups.json', JSON.stringify(out));
fs.writeFileSync(W + '/ledger.json', JSON.stringify(ledger));
fs.mkdirSync(W + '/batches', { recursive: true });
const queued = new Set(); for (const f of fs.readdirSync(W + '/batches')) for (const g of JSON.parse(fs.readFileSync(W + '/batches/' + f))) queued.add(g.gid);
const fresh = out.filter((g) => !judged.has(g.gid) && !queued.has(g.gid));
let bn = fs.readdirSync(W + '/batches').length;
const strip = (g) => ({ ...g, areas: g.areas.map(({ lat, lng, ...r }) => r), road_point: { ...g.road_point, lat: undefined, lng: undefined }, cands: g.cands.map(({ _lat, _lng, _osm, ...r }) => r) });
const B = 50; for (let i = 0; i < fresh.length; i += B) fs.writeFileSync(W + '/batches/b' + String(bn++).padStart(4, '0') + '.json', JSON.stringify(fresh.slice(i, i + B).map(strip), null, 1));
const st = {}; for (const l of ledger) st[l.status] = (st[l.status] || 0) + 1;
console.log({ groups: out.length, areasInGroups: out.reduce((n, g) => n + g.areas.length, 0), withLotAtRoad: out.filter((g) => g.lots_at_road_point).length, withText: out.filter((g) => g.text.length).length, ledger: st, newGroups: fresh.length, batches: bn });
