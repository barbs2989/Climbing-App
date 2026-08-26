#!/usr/bin/env node
// Does the SHIPPED TrailheadCard now resolve the same destination as the map and both buttons?
//
// The resolution lines are EXTRACTED FROM RouteDetail.jsx with ANCHOR LOST, and trailheadPoint()
// and wpPlaced() are extracted from ClimbMatchCore.jsx the same way. Re-typing them here would
// measure a fossil: the probe would agree with itself whatever the app did. The pre-change
// expression IS re-typed, which is correct — the original is gone, so a copy is the only second
// opinion available.
import { readFileSync } from "node:fs";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = new URL("../..", import.meta.url).pathname;
const core = readFileSync(ROOT + "ClimbMatchCore.jsx", "utf8");
const rd = readFileSync(ROOT + "RouteDetail.jsx", "utf8");

const braceBlock = (src, head, label) => {
  const i = src.indexOf(head);
  if (i < 0) { console.error(`ANCHOR LOST — \`${head}\` (${label}) is gone; nothing below was checked.`); process.exit(1); }
  let d = 0, j = src.indexOf("{", i);
  for (; j < src.length; j++) { if (src[j] === "{") d++; else if (src[j] === "}") { d--; if (!d) break; } }
  return src.slice(i, j + 1);
};

// The card's resolution: from `const al=` down to the elevation line.
const cardStart = rd.indexOf("function TrailheadCard({route,onEdit})");
if (cardStart < 0) { console.error("ANCHOR LOST — TrailheadCard is gone."); process.exit(1); }
const elevAnchor = rd.indexOf("const elev=", cardStart);
const elevEnd = rd.indexOf("\n", elevAnchor);
const alAnchor = rd.indexOf("const al=route.approachLogistics||{};", cardStart);
if (elevAnchor < 0 || alAnchor < 0 || elevEnd < 0) { console.error("ANCHOR LOST — the card's resolution lines moved."); process.exit(1); }
const cardBody = rd.slice(alAnchor, elevEnd);
if (!/trailheadPoint\(/.test(cardBody)) { console.error("FAIL — TrailheadCard does not call trailheadPoint(); the consolidation is not in place."); process.exit(1); }

const src = [
  braceBlock(core, "export function wpPlaced(", "wpPlaced"),
  braceBlock(core, "function trailheadPoint(route){", "trailheadPoint"),
].join("\n").replace(/^export /gm, "");

const after = new Function(`
  ${src}
  const wpIs=(w,t)=>w&&String(w.type||"").toLowerCase()===String(t).toLowerCase();
  const distMiles=(a,b)=>{const R=3958.8,t=Math.PI/180;const dla=(b.lat-a.lat)*t,dln=(b.lng-a.lng)*t;
    const h=Math.sin(dla/2)**2+Math.cos(a.lat*t)*Math.cos(b.lat*t)*Math.sin(dln/2)**2;
    return 2*R*Math.asin(Math.sqrt(h));};
  return function(route){
    ${cardBody}
    return {name,lat,lng,hasCoord,elev};
  };
`)();

// The pre-change card, verbatim from 0c0cf1a.
const wpIs = (w, t) => w && String(w.type || "").toLowerCase() === String(t).toLowerCase();
function before(route) {
  const al = route.approachLogistics || {};
  const wp = (route.waypoints || []).find(w => wpIs(w, "Trailhead")) || null;
  const name = al.trailhead || (wp && wp.name) || null;
  const lat = al.trailheadLat != null ? al.trailheadLat : (wp && wp.lat != null ? Number(wp.lat) : null);
  const lng = al.trailheadLng != null ? al.trailheadLng : (wp && wp.lng != null ? Number(wp.lng) : null);
  const hasCoord = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
  const elev = (wp && wp.elev != null) ? wp.elev : null;
  return { name, lat, lng, hasCoord, elev };
}
// The map + both buttons, extracted, so "do they agree" is asked of the real thing.
const mapPoint = new Function(`${src}\nconst wpIs=(w,t)=>w&&String(w.type||"").toLowerCase()===String(t).toLowerCase();\nreturn trailheadPoint;`)();

const m = (a, b) => {
  const R = 6371000, t = Math.PI / 180;
  const dla = (b.lat - a.lat) * t, dln = (b.lng - a.lng) * t;
  const h = Math.sin(dla / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dln / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const rows = await selectAll("routes", "id,waypoints,approach_logistics", "waypoints.not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes. Refusing to report a clean result about data this never saw."); process.exit(1); }

let cards = 0, split = 0, moved = 0, renamed = 0, lostCard = 0, lostCoord = 0, elevGone = 0;
const names = [];
for (const r of rows) {
  const route = { waypoints: r.waypoints, approachLogistics: r.approach_logistics };
  if (!Array.isArray(route.waypoints) || !route.waypoints.length) continue;
  const b = before(route), a = after(route), mp = mapPoint(route);
  if (b.name || b.hasCoord) cards++;
  if ((b.name || b.hasCoord) && !(a.name || a.hasCoord)) lostCard++;
  if (b.hasCoord && !a.hasCoord) lostCoord++;
  if (b.elev != null && a.elev == null) elevGone++;
  if (b.name !== a.name) { renamed++; if (names.length < 8) names.push({ id: r.id, b: b.name, a: a.name }); }
  if (b.hasCoord && a.hasCoord && m({ lat: Number(b.lat), lng: Number(b.lng) }, { lat: a.lat, lng: a.lng }) >= 1) moved++;
  // THE POINT OF THE CHANGE: card and map must now name the same destination.
  if (a.hasCoord && mp && m({ lat: a.lat, lng: a.lng }, mp) >= 1) split++;
}

console.log(`${cards} routes render a TRAILHEAD card.\n`);
console.log(`card vs map/button SPLIT after the change : ${split}   (must be 0 — that is the defect)`);
console.log(`coordinate moved                          : ${moved}`);
console.log(`displayed name changed                    : ${renamed}`);
console.log(`elevation tile dropped                    : ${elevGone}`);
console.log(`card lost entirely                        : ${lostCard}   (must be 0)`);
console.log(`coordinate lost                           : ${lostCoord}   (must be 0)\n`);
for (const n of names) console.log(`  name  ${n.id}\n          before ${JSON.stringify(n.b)}\n          after  ${JSON.stringify(n.a)}`);
process.exitCode = (split || lostCard || lostCoord) ? 1 : 0;
