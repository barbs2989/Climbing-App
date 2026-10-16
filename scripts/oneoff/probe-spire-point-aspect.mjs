#!/usr/bin/env node
// wa_spire_point_southwest_face: name says SW, aspect says E. audit:aspect-name now reports that
// the row's own pins put the climb WSW of the summit. Before changing a field that drives the
// sun/shade readout, assemble every INDEPENDENT record — `face` is not one, because it and
// `aspect` come from the same enrichment and their agreeing is one claim counted twice.
import { selectAll } from "../lib/supabase-env.mjs";

const [r] = await selectAll("routes",
  "id,name,aspect,face,area_id,waypoints,approach,overview,beta,descent_text,climbing_route,best_season,season",
  "id=eq.wa_spire_point_southwest_face", { pageSize: 10 });
if (!r) { console.error("FAIL — route not found."); process.exit(1); }
const [area] = await selectAll("areas", "id,name,lat,lng", `id=eq.${r.area_id}`, { pageSize: 10 });

console.log(`${r.id}  "${r.name}"`);
console.log(`   aspect ${JSON.stringify(r.aspect)}   face ${JSON.stringify(r.face)}   (same enrichment — ONE claim, not two)`);
console.log(`   area   ${area && area.name}  ${area && area.lat},${area && area.lng}\n`);

// 1. PROSE — written by a different pass from aspect/face. Which directions does it name?
const DIRS = /\b(north|south|east|west|northeast|northwest|southeast|southwest|N|S|E|W|NE|NW|SE|SW)\b/gi;
console.log("1. what the PROSE says (an independent record):");
for (const k of ["overview", "approach", "beta", "climbing_route", "descent_text"]) {
  const v = r[k];
  if (typeof v !== "string" || !v.trim()) continue;
  const hits = [...new Set((v.match(DIRS) || []).map((x) => x.toUpperCase()))];
  console.log(`   ${k.padEnd(15)} directions: ${hits.join(", ") || "(none)"}`);
  console.log(`      ${v.replace(/\s+/g, " ").slice(0, 230)}`);
}

// 2. GEOMETRY — the pins, relative to the SUMMIT pin specifically.
const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const R = Math.PI / 180;
const km = (p, q) => 2 * 6371 * Math.asin(Math.sqrt(Math.sin((q.lat - p.lat) * R / 2) ** 2 + Math.cos(p.lat * R) * Math.cos(q.lat * R) * Math.sin((q.lng - p.lng) * R / 2) ** 2));
const brg = (p, q) => { const y = Math.sin((q.lng - p.lng) * R) * Math.cos(q.lat * R);
  const x = Math.cos(p.lat * R) * Math.sin(q.lat * R) - Math.sin(p.lat * R) * Math.cos(q.lat * R) * Math.cos((q.lng - p.lng) * R);
  return (Math.atan2(y, x) / R + 360) % 360; };
const C16 = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
const wps = (r.waypoints || []).map((w) => ({ ...w, lat: num(w && w.lat), lng: num(w && w.lng) })).filter((w) => w.lat != null);
// The TRUE summit pin, not merely a name containing "summit".
const summit = wps.find((w) => String(w.type || "").toLowerCase() === "summit");
console.log(`\n2. GEOMETRY, measured from the Summit-typed pin (${summit ? summit.name : "none"}):`);
if (summit) for (const w of wps) {
  if (w === summit) continue;
  const d = km(summit, w);
  console.log(`   ${C16[Math.round(brg(summit, w) / 22.5) % 16].padEnd(4)} ${String(Math.round(d * 1000)).padStart(6)} m   [${String(w.type || "?").padEnd(10)}] ${w.name}`);
}

// 3. THE PEAK'S OTHER ROUTES — a fourth record.
const sibs = await selectAll("routes", "id,name,aspect,face", `area_id=eq.${r.area_id}`, { pageSize: 100 });
console.log(`\n3. the ${sibs.length} route(s) on this area:`);
for (const s of sibs) console.log(`   ${s.id.padEnd(40)} aspect=${JSON.stringify(s.aspect)}  ${String(s.name).slice(0, 34)}`);
