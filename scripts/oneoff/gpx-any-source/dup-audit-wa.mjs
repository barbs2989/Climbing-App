// Read-only: duplicates in everything a Peakbagger pass touched, and on those peaks.
// Usage: node dup-audit-wa.mjs [rollback timestamp prefix regex, default the WA run's 17938[1-9][0-9]; OR 2026-11-05: 179390]
import fs from "fs";
import { selectAll } from "../../lib/supabase-env.mjs";
const STAMP = process.argv[2] || "17938[1-9][0-9]";
const RB = fs.readdirSync("scripts").filter(f => new RegExp("^rollback-(gpx-any-source-[a-z-]+-|fkt-gpx-tracks-)" + STAMP).test(f));
const touched = new Set(RB.flatMap(f => JSON.parse(fs.readFileSync("scripts/" + f, "utf8")).rows.map(r => r.id)));
const ids = [...touched];
const rows = [];
for (let i = 0; i < ids.length; i += 40) rows.push(...await selectAll("routes", "id,area_id", `id=in.(${ids.slice(i, i + 40).map(encodeURIComponent).join(",")})`, { pageSize: 1000 }));
const areas = [...new Set(rows.map(r => r.area_id))];
const all = [];
const COLS = "id,area_id,name,waypoints,gpx,hazards,obj_haz,watch_out,pro_tips,what_to_bring,gear,features,pro_needs,overview,beta,approach,descent_text,turnaround,bail,seasonal_guidance,climate";
for (let i = 0; i < areas.length; i += 6) all.push(...await selectAll("routes", COLS, `area_id=in.(${areas.slice(i, i + 6).map(encodeURIComponent).join(",")})`, { pageSize: 1000 }));
console.log(`rollbacks ${RB.length}, touched ${touched.size}, peaks ${areas.length}, routes on them ${all.length}`);
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const nameKey = s => norm(s).replace(/\b(the|route|via|standard)\b/g, "").replace(/\s+/g, " ").trim();
const hav = (a, b, c, d) => { const R = 6371000, t = x => x * Math.PI / 180; const h = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const sentences = s => String(s).split(/(?<=[.!?])\s+/).map(norm).filter(x => x.split(" ").length >= 5);
const out = [];
const LISTS = ["hazards", "obj_haz", "watch_out", "pro_tips", "what_to_bring", "gear", "features", "pro_needs"];
const TEXT = ["overview", "beta", "approach", "descent_text", "turnaround", "bail"];
for (const r of all) {
  const T = touched.has(r.id) ? "*" : " ";
  // waypoints
  const w = Array.isArray(r.waypoints) ? r.waypoints : [];
  const summits = w.filter(x => /summit/i.test(x.type || ""));
  if (summits.length > 1) out.push(`${T} ${r.id}: ${summits.length} Summit pins`);
  for (let i = 0; i < w.length; i++) for (let j = i + 1; j < w.length; j++) {
    const a = w[i], b = w[j];
    if ([a.lat, a.lng, b.lat, b.lng].some(x => x == null || x === "" || !Number.isFinite(+x))) continue;
    const d = hav(+a.lat, +a.lng, +b.lat, +b.lng);
    if ((a.type || "") === (b.type || "") && (d < 50 || (a.name && norm(a.name) === norm(b.name))))
      out.push(`${T} ${r.id}: pins ${i}/${j} "${a.name}" & "${b.name}" (${a.type}) ${Math.round(d)} m apart`);
  }
  // list items
  for (const k of LISTS) { const v = r[k]; if (!Array.isArray(v)) continue;
    const seen = new Map(); v.forEach((x, i) => { const key = norm(typeof x === "string" ? x : JSON.stringify(x)); if (seen.has(key)) out.push(`${T} ${r.id}: ${k}[${seen.get(key)}] == [${i}]`); else seen.set(key, i); });
    // one item contained in another
    const s = v.map(x => norm(typeof x === "string" ? x : x?.text || x?.name || JSON.stringify(x)));
    s.forEach((a, i) => s.forEach((b, j) => { if (i !== j && a.length > 25 && b.length > a.length && b.includes(a)) out.push(`${T} ${r.id}: ${k}[${i}] contained in [${j}]`); }));
  }
  // repeated sentences inside each text field, and across text fields
  const where = new Map();
  for (const k of TEXT) { if (typeof r[k] !== "string") continue; for (const s of sentences(r[k])) { const key = s; if (where.has(key)) out.push(`${T} ${r.id}: sentence repeated in ${where.get(key)} & ${k}: "${s.slice(0, 70)}"`); else where.set(key, k); } }
  // monthBreakdown-like json
  for (const k of ["seasonal_guidance", "climate"]) { const v = r[k]; if (!v || typeof v !== "object") continue;
    const walk = (o, p) => { if (typeof o === "string") { const ss = sentences(o); const seen = new Set(); for (const s of ss) { if (seen.has(s)) out.push(`${T} ${r.id}: ${p} repeats "${s.slice(0, 60)}"`); seen.add(s); } } else if (o && typeof o === "object") for (const [kk, vv] of Object.entries(o)) walk(vv, p + "." + kk); };
    walk(v, k);
    if (v.monthBreakdown) { const ks = Object.keys(v.monthBreakdown).map(x => x.toLowerCase().slice(0, 3)); const dk = ks.filter((x, i) => ks.indexOf(x) !== i); if (dk.length) out.push(`${T} ${r.id}: monthBreakdown has two keys for ${dk}`); }
  }
}
// duplicate routes on one peak: same name key, or identical gpx
const byArea = new Map(); for (const r of all) (byArea.get(r.area_id) || byArea.set(r.area_id, []).get(r.area_id)).push(r);
for (const [a, rs] of byArea) {
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    const x = rs[i], y = rs[j], tt = touched.has(x.id) || touched.has(y.id) ? "*" : " ";
    if (nameKey(x.name) === nameKey(y.name)) out.push(`${tt} SAME NAME on ${a}: ${x.id} "${x.name}" / ${y.id} "${y.name}"`);
    if (Array.isArray(x.gpx) && x.gpx.length > 20 && JSON.stringify(x.gpx) === JSON.stringify(y.gpx)) out.push(`${tt} SAME TRACK on ${a}: ${x.id} / ${y.id} (${x.gpx.length} pts)`);
  }
}
// same recorded track on two different peaks
const tk = new Map(); for (const r of all) if (Array.isArray(r.gpx) && r.gpx.length > 20) { const k = JSON.stringify(r.gpx.slice(0, 5)) + r.gpx.length; (tk.get(k) || tk.set(k, []).get(k)).push(r); }
for (const rs of tk.values()) if (new Set(rs.map(r => r.area_id)).size > 1) out.push(`* SAME TRACK across peaks: ${rs.map(r => r.id + "@" + r.area_id).join(", ")}`);
console.log(out.length ? out.join("\n") : "no duplicates found");
console.log(`findings ${out.length} (* = a route this pass touched)`);
