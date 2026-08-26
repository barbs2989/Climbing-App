#!/usr/bin/env node
// How far does the foreign-approach_logistics contamination go?
//
// ar_cutthroat (Arkansas sport 5.11d) and az_cutthroat_trout (Arizona trad 5.9+) both carry
// approach_logistics describing WASHINGTON's Cutthroat Peak: a peak coordinate 10 m from
// wa_cutthroat_peak and a trailhead of "Pacific Crest Trailhead at Rainy Pass" on SR-20. The only
// thing they share with it is the word "Cutthroat" in the ROUTE name — the `a name is not an
// identity` class this catalog keeps paying for, landing on approach_logistics this time.
//
// Two questions: how much of each blob is foreign, and does the same blob appear elsewhere?
import { selectAll } from "../lib/supabase-env.mjs";

const state = (p) => String(p || "").split(".")[1] || "?";

const rows = await selectAll("routes", "id,name,area_id,approach_logistics",
  "approach_logistics.not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes."); process.exit(1); }
const areaIds = [...new Set(rows.map((r) => r.area_id).filter(Boolean))];
const areas = [];
for (let i = 0; i < areaIds.length; i += 300) {
  areas.push(...await selectAll("areas", "id,name,lat,lng,path", `id=in.(${areaIds.slice(i, i + 300).join(",")})`, { pageSize: 1000 }));
}
const byId = new Map(areas.map((a) => [a.id, a]));

console.log("── the two contaminated blobs, in full:\n");
for (const id of ["ar_cutthroat", "az_cutthroat_trout"]) {
  const r = rows.find((x) => x.id === id);
  if (!r) { console.log(`  (${id} not found)`); continue; }
  const a = byId.get(r.area_id) || {};
  console.log(`  ${id}  "${r.name}"   area ${a.name} (${state(a.path)})`);
  for (const [k, v] of Object.entries(r.approach_logistics || {})) {
    console.log(`      ${k.padEnd(20)} ${typeof v === "string" ? JSON.stringify(v.slice(0, 110)) : JSON.stringify(v)}`);
  }
  console.log("");
}

// Does any OTHER route carry the same trailhead string while sitting outside Washington?
const TH = "Pacific Crest Trailhead at Rainy Pass";
const sharing = rows.filter((r) => (r.approach_logistics || {}).trailhead === TH);
console.log(`── ${sharing.length} route(s) carry the trailhead "${TH}":`);
for (const r of sharing) {
  const a = byId.get(r.area_id) || {};
  const st = state(a.path);
  console.log(`   ${st === "washington" ? "  " : "**"} ${r.id.padEnd(34)} ${st.padEnd(12)} ${a.name}`);
}

// General form: a logistics blob whose peak coordinate is in a different STATE from its area.
console.log(`\n── every route whose stored peak coordinate is far from its own area:`);
const m = (p, q) => {
  const R = 6371, t = Math.PI / 180;
  const dla = (q.lat - p.lat) * t, dln = (q.lng - p.lng) * t;
  const h = Math.sin(dla / 2) ** 2 + Math.cos(p.lat * t) * Math.cos(q.lat * t) * Math.sin(dln / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
let n = 0;
for (const r of rows) {
  const al = r.approach_logistics || {};
  const la = Number(al.peakLat), ln = Number(al.peakLng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) continue;
  const a = byId.get(r.area_id);
  if (!a || a.lat == null) continue;
  const km = m({ lat: la, lng: ln }, { lat: Number(a.lat), lng: Number(a.lng) });
  if (km > 50) { n++; console.log(`   ${km.toFixed(0).padStart(5)} km  ${r.id.padEnd(34)} area ${a.name} (${state(a.path)})`); }
}
if (!n) console.log("   (none over 50 km)");
