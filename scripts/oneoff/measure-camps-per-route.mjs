// How many camps does each route's CAMPING & BIVY panel list? (bivy store + Campsite waypoints)
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
import fs from "node:fs";
const key = requireServiceKey();
const rows = await selectAll("routes", "id,name,area_id,discipline,bivy,waypoints,access", "bivy=not.is.null", { key, pageSize: 500 });
const hist = {}; const out = [];
for (const r of rows) {
  const bivy = Array.isArray(r.bivy) ? r.bivy : [];
  const names = new Set(bivy.map(b => String(b?.name || "").trim().toLowerCase()));
  const wps = (Array.isArray(r.waypoints) ? r.waypoints : []).filter(w => /camp/i.test(String(w?.type || "")) && !names.has(String(w?.name || "").trim().toLowerCase()));
  const n = bivy.length + wps.length;
  hist[n] = (hist[n] || 0) + 1;
  out.push({ id: r.id, name: r.name, area_id: r.area_id, n, bivy: bivy.length, wp: wps.length, accessKeys: r.access ? Object.keys(r.access) : [] });
}
console.log("routes with bivy:", rows.length);
console.log("sites-per-route histogram:", hist);
const tot = out.reduce((a, b) => a + b.n, 0); console.log("total sites:", tot, "mean", (tot / rows.length).toFixed(1));
const ak = {}; out.forEach(o => o.accessKeys.forEach(k => ak[k] = (ak[k] || 0) + 1)); console.log("access keys:", ak);
const sigs = {}; rows.forEach(r => { const s = JSON.stringify(r.bivy); sigs[s] = (sigs[s] || 0) + 1; }); console.log("distinct bivy arrays:", Object.keys(sigs).length);
fs.writeFileSync(process.argv[2] || "/dev/null", JSON.stringify(rows));
