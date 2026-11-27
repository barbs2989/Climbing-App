// Splits the camp-nights census (census-camp-nights.mjs --out) into research batches of ~N routes,
// whole peaks only, in ltree path order so neighbouring peaks (shared approaches) land together.
// Each input file is what a research agent reads: the trip plan and the camps on file, trimmed.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";
const [censusPath, outDir, perArg] = process.argv.slice(2);
const PER = Number(perArg || 18);
const rows = JSON.parse(readFileSync(censusPath, "utf8"));
const ids = [...new Set(rows.map(r => r.area_id))];
const paths = {};
for (let i = 0; i < ids.length; i += 80) {
  const q = `${SUPABASE_URL}/rest/v1/areas?select=id,name,path&id=in.(${ids.slice(i, i + 80).map(encodeURIComponent).join(",")})`;
  const res = await fetch(q, { headers: headers(requireServiceKey()) });
  (await res.json()).forEach(a => { paths[a.id] = a; });
  await new Promise(r => setTimeout(r, 1000));
}
const by = {};
rows.forEach(r => { (by[r.area_id] = by[r.area_id] || []).push(r); });
const order = ids.sort((a, b) => String(paths[a]?.path || a).localeCompare(String(paths[b]?.path || b)));
const cut = s => { s = String(s == null ? "" : s); return s.length > 320 ? s.slice(0, 320) + "…" : s; };
const slim = r => ({
  id: r.id, name: r.name, discipline: r.discipline, peak: paths[r.area_id]?.name || r.area_id, area_id: r.area_id,
  path: paths[r.area_id]?.path || null,
  trip_plan: { totalNote: r.itinerary.totalNote || null, days: r.itinerary.days.map(d => ({ n: d.n, title: d.title, objective: d.objective, miles: d.miles, gainFt: d.gainFt, note: cut(d.note) })) },
  camps_on_file: (Array.isArray(r.bivy) ? r.bivy : []).filter(b => b && b.role !== "hidden").map(b => ({ name: b.name, elev_ft: b.elev ?? (b.elevM != null ? Math.round(b.elevM * 3.28084) : null), type: b.type || null, role: b.role || null, notes: cut(b.notes) })),
  campsite_pins: (Array.isArray(r.waypoints) ? r.waypoints : []).filter(w => w && /camp/i.test(String(w.type || ""))).map(w => ({ name: w.name, elev: w.elev ?? null, distMi: w.distMi ?? null })),
});
mkdirSync(outDir, { recursive: true });
let batch = [], n = 0;
const flush = () => { if (!batch.length) return; n++; writeFileSync(`${outDir}/b${String(n).padStart(2, "0")}.json`, JSON.stringify(batch, null, 1)); batch = []; };
for (const a of order) { if (batch.length && batch.length + by[a].length > PER) flush(); by[a].forEach(r => batch.push(slim(r))); }
flush();
console.log(n, "batches from", rows.length, "routes");
