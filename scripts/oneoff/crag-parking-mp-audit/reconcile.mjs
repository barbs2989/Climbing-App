// Final check of the crag-parking audit: every decided area's LIVE pin against its decision. Writes
// <out>.json with decisions still to apply, re-keyed on the live pin where an earlier pass already cleared it
// (a group re-resolved after an Overpass timeout can now be placed where it was first cleared).
// Usage: node scripts/oneoff/crag-parking-mp-audit/reconcile.mjs out.json decisions.json [decisions2.json ...]
import fs from "node:fs";
import { SUPABASE_URL, requireServiceKey, headers } from "../../lib/supabase-env.mjs";
const [outF, ...ins] = process.argv.slice(2);
const dec = new Map(); for (const f of ins) for (const d of JSON.parse(fs.readFileSync(f, "utf8"))) dec.set(d.id, d);
const key = requireServiceKey(), ids = [...dec.keys()], live = new Map();
for (let i = 0; i < ids.length; i += 100) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,parking_lat,parking_lng,parking_name,parking_note&id=in.(${ids.slice(i, i + 100).map(encodeURIComponent).join(",")})`, { headers: headers(key) });
  if (!r.ok) throw new Error(`read ${r.status}`); for (const row of await r.json()) live.set(row.id, row);
  await new Promise((s) => setTimeout(s, 500));
}
const t = { ok: 0, todo: 0, drifted: 0, missing: 0 }, todo = [];
for (const d of dec.values()) {
  const r = live.get(d.id); if (!r) { t.missing++; continue; }
  const want = d.new ? r.parking_lat === d.new.lat && r.parking_lng === d.new.lng && (r.parking_name || null) === (d.new.name || null) : r.parking_lat == null;
  if (want) { t.ok++; continue; }
  if (r.parking_lat === d.old.lat && r.parking_lng === d.old.lng) { todo.push(d); t.todo++; continue; }
  if (r.parking_lat == null && d.new) { todo.push({ ...d, old: { lat: null, lng: null, name: null } }); t.todo++; continue; }
  t.drifted++; console.log("drifted (someone else changed it):", d.id);
}
fs.writeFileSync(outF, JSON.stringify(todo, null, 1));
console.log(t);
