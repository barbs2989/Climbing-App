#!/usr/bin/env node
// audit:aspect-name is report-only because "which one is wrong is NOT decidable from the columns".
// That is true of NAME vs ASPECT alone — but the row usually holds a THIRD record neither is
// derived from: its own pins. Which side of the summit does the route actually start on?
//
// That is exactly how CLAUDE.md records wa_little_annapurna_south_slopes being settled: "the row's
// own 'base of south slopes' waypoint sat NORTH of the summit". If the geometry can speak for the
// four current findings, the audit stops being report-only for them.
//
// `face` is deliberately NOT treated as independent evidence: it and `aspect` are written by the
// same enrichment, so agreeing is one claim counted twice.
import { selectAll } from "../lib/supabase-env.mjs";

const IDS = ["wa_himmelhorn_southeast_route", "wa_mount_cameron_standard",
             "wa_spire_point_southwest_face", "wa_tye_peak_e_route"];
const rows = await selectAll("routes", "id,name,aspect,face,area_id,waypoints",
  `id=in.(${IDS.join(",")})`, { pageSize: 20 });
if (rows.length !== IDS.length) { console.error(`FAIL — expected ${IDS.length} rows, got ${rows.length}.`); process.exit(1); }
const areas = await selectAll("areas", "id,name,lat,lng",
  `id=in.(${[...new Set(rows.map((r) => r.area_id))].join(",")})`, { pageSize: 20 });
const byId = new Map(areas.map((a) => [a.id, a]));

const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const bearing = (from, to) => {
  const R = Math.PI / 180;
  const y = Math.sin((to.lng - from.lng) * R) * Math.cos(to.lat * R);
  const x = Math.cos(from.lat * R) * Math.sin(to.lat * R) - Math.sin(from.lat * R) * Math.cos(to.lat * R) * Math.cos((to.lng - from.lng) * R);
  return (Math.atan2(y, x) / R + 360) % 360;
};
const pt = (d) => COMPASS[Math.round(d / 22.5) % 16];
const KM = (p, q) => { const R = 6371, t = Math.PI / 180;
  const dla = (q.lat - p.lat) * t, dln = (q.lng - p.lng) * t;
  return 2 * R * Math.asin(Math.sqrt(Math.sin(dla / 2) ** 2 + Math.cos(p.lat * t) * Math.cos(q.lat * t) * Math.sin(dln / 2) ** 2)); };

for (const r of rows) {
  const a = byId.get(r.area_id);
  console.log(`════ ${r.id}   "${r.name}"`);
  console.log(`   aspect ${JSON.stringify(r.aspect)}   face ${JSON.stringify(String(r.face || "").slice(0, 70))}`);
  console.log(`   area   ${a && a.name}  ${a && a.lat},${a && a.lng}`);
  const wps = (r.waypoints || []).map((w) => ({ ...w, lat: num(w && w.lat), lng: num(w && w.lng) })).filter((w) => w.lat != null);
  if (!wps.length) { console.log("   NO placed pins — the geometry cannot speak for this row.\n"); continue; }

  // The summit pin is the anchor if the row has one; otherwise the area coordinate.
  const summit = wps.find((w) => /summit|topout/i.test(String(w.type || "") + String(w.name || "")))
    || (a && a.lat != null ? { lat: Number(a.lat), lng: Number(a.lng), name: `${a.name} (area coord)` } : null);
  if (!summit) { console.log("   no summit anchor.\n"); continue; }
  console.log(`   anchor ${summit.name}`);
  for (const w of wps) {
    if (w === summit) continue;
    const d = KM(summit, w);
    if (d < 0.02) continue;   // the same point says nothing about a side
    console.log(`      ${pt(bearing(summit, w)).padEnd(4)} of the summit, ${d.toFixed(2)} km   [${String(w.type || "?").padEnd(9)}] ${w.name}`);
  }
  console.log("");
}
