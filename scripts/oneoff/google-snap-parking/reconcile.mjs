// Re-read every decided area live and record exactly which pins are now in the database (an apply run can stop part
// way when dbslot says the database is slow). Writes <workDir>/applied/applied.json (decisions that hold) and
// <recordFile> (the same, committed: id, pin, kind, the judge's reason).
// Usage: node reconcile.mjs <workDir> <recordFile> <decisions.json>...
import fs from 'node:fs';
import { SUPABASE_URL, requireServiceKey, headers } from '../../lib/supabase-env.mjs';
const [W, REC, ...files] = process.argv.slice(2);
const key = requireServiceKey();
const byId = new Map(); for (const f of files) for (const d of JSON.parse(fs.readFileSync(f))) byId.set(d.id, d);
const prev = fs.existsSync(REC) ? JSON.parse(fs.readFileSync(REC)) : []; for (const d of prev) if (!byId.has(d.id)) byId.set(d.id, { ...d, new: { lat: d.lat, lng: d.lng, name: d.name } });
const ids = [...byId.keys()]; const live = new Map();
for (let i = 0; i < ids.length; i += 100) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,parking_lat,parking_lng,parking_name&id=in.(${ids.slice(i, i + 100).map(encodeURIComponent).join(',')})`, { headers: headers(key) });
  if (!r.ok) throw new Error('read ' + r.status); for (const x of await r.json()) live.set(x.id, x);
  await new Promise((res) => setTimeout(res, 300));
}
const held = [], other = { notYet: 0, different: 0, gone: 0 };
for (const d of byId.values()) { const x = live.get(d.id); if (!x) { other.gone++; continue; }
  if (x.parking_lat === d.new.lat && x.parking_lng === d.new.lng) held.push(d); else if (x.parking_lat == null) other.notYet++; else other.different++; }
fs.mkdirSync(W + '/applied', { recursive: true });
fs.writeFileSync(W + '/applied/applied.json', JSON.stringify(held));
fs.writeFileSync(REC, JSON.stringify(held.sort((a, b) => a.id.localeCompare(b.id)).map(({ id, new: n, kind, why }) => ({ id, lat: n.lat, lng: n.lng, name: n.name, kind, why })), null, 0).replace(/\},\{/g, '},\n{'));
console.log({ decided: byId.size, written: held.length, ...other });
