#!/usr/bin/env node
// Two surfaces resolve "the trailhead" with OPPOSITE precedence — how many routes does that split?
//
// #1215 consolidated the two "Directions to…" buttons into trailheadPoint(), which takes the PIN
// first and falls back to approach_logistics. TrailheadCard — the Plan tab's directions control —
// was not converted and still resolves logistics FIRST, pin second. CLAUDE.md already records this
// as user-visible: "the trailhead you are sent to depends on which screen you are looking at."
//
// This measures it rather than restating it, because the trailhead sweep took the disagreeing
// population from 155 routes down to a handful and the count decides whether this is a live defect
// or a latent one.
import { selectAll } from "../lib/supabase-env.mjs";

const wpIs = (w, t) => w && String(w.type || "").toLowerCase() === String(t).toLowerCase();
const wpPlaced = (w) => {
  if (!w) return false;
  const { lat: a, lng: b } = w;
  if (a == null || b == null || a === "" || b === "") return false;
  return Number.isFinite(Number(a)) && Number.isFinite(Number(b));
};

// The map + both "Directions to…" buttons, as shipped.
function trailheadPoint(route) {
  const wps = route.waypoints || [], al = route.approachLogistics || {};
  const pin = wps.find((w) => wpIs(w, "Trailhead") && wpPlaced(w));
  if (pin) return { lat: Number(pin.lat), lng: Number(pin.lng), via: "pin" };
  if (wpPlaced({ lat: al.trailheadLat, lng: al.trailheadLng })) return { lat: Number(al.trailheadLat), lng: Number(al.trailheadLng), via: "logistics" };
  const named = wps.find((w) => wpPlaced(w) && /trailhead|parking|\bth\b/i.test(String(w.name || w.label || "")));
  return named ? { lat: Number(named.lat), lng: Number(named.lng), via: "named" } : null;
}

// TrailheadCard, verbatim from RouteDetail.jsx line ~872.
function trailheadCard(route) {
  const al = route.approachLogistics || {};
  const wp = (route.waypoints || []).find((w) => wpIs(w, "Trailhead")) || null;
  const lat = al.trailheadLat != null ? al.trailheadLat : (wp && wp.lat != null ? Number(wp.lat) : null);
  const lng = al.trailheadLng != null ? al.trailheadLng : (wp && wp.lng != null ? Number(wp.lng) : null);
  const hasCoord = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
  return hasCoord ? { lat: Number(lat), lng: Number(lng), via: al.trailheadLat != null ? "logistics" : "pin" } : null;
}

const m = (a, b) => {
  const R = 6371000, t = Math.PI / 180;
  const dla = (b.lat - a.lat) * t, dln = (b.lng - a.lng) * t;
  const h = Math.sin(dla / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dln / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const rows = await selectAll("routes", "id,name,waypoints,approach_logistics", "waypoints.not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes. Refusing to report a clean result about data this never saw."); process.exit(1); }

let both = 0, agree = 0;
const split = [], onlyOne = [];
for (const r of rows) {
  const route = { waypoints: r.waypoints, approachLogistics: r.approach_logistics };
  if (!Array.isArray(route.waypoints) || !route.waypoints.length) continue;
  const a = trailheadPoint(route), b = trailheadCard(route);
  if (!a && !b) continue;
  if (!a || !b) { onlyOne.push({ id: r.id, map: a && a.via, card: b && b.via }); continue; }
  both++;
  const d = m(a, b);
  if (d < 1) { agree++; continue; }
  split.push({ id: r.id, d, a, b });
}

console.log(`${both} routes where BOTH surfaces resolve a trailhead; ${agree} agree to within a metre.`);
console.log(`${split.length} SPLIT — the map/button and the Plan card send you to different places.`);
console.log(`${onlyOne.length} where only one surface resolves anything at all.\n`);
const ds=split.map(x=>x.d).sort((a,b)=>a-b);
console.log("distribution of the split, metres:");
for(const q of [0.5,0.75,0.9,0.95,0.97,0.98,0.99,1]) console.log(`   p${Math.round(q*100)}  ${Math.round(ds[Math.min(ds.length-1,Math.floor(ds.length*q))])}`);
console.log("\nevery split over 400 m:");
for(const x of split.filter(x=>x.d>400).sort((a,b)=>a.d-b.d)) console.log(`   ${Math.round(x.d)} m  ${x.id}`);
console.log("");
for (const s of []) {
  console.log(`  ${(s.d / 1000).toFixed(2)} km apart  ${s.id}`);
  console.log(`     map/button -> ${s.a.lat.toFixed(5)},${s.a.lng.toFixed(5)} (via ${s.a.via})`);
  console.log(`     Plan card  -> ${s.b.lat.toFixed(5)},${s.b.lng.toFixed(5)} (via ${s.b.via})`);
}
for (const o of onlyOne.slice(0, 15)) console.log(`  only one: ${o.id}  map=${o.map || "none"}  card=${o.card || "none"}`);
