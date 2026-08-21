#!/usr/bin/env node
// Is #1215's trailheadPoint() defect LIVE, or only latent?
//
// It re-introduces the placement test #1183 consolidated: `w.lat!=null&&w.lng!=null` for the pin,
// and `w.lat!=null` alone — no lng at all — for the name-matched fallback. Two shapes break it:
//   - an EMPTY STRING coordinate ("" != null is true) -> returns {lat:"",lng:""}, and because it
//     returns EARLY it SHADOWS the approach_logistics coordinate the function exists to reach.
//   - a lat with no lng -> destination=47.5,undefined
//
// Latent and live want different urgency, and this repo insists on knowing which.
import { selectAll } from "../lib/supabase-env.mjs";

const wpIs = (w, t) => w && String(w.type || "").toLowerCase() === String(t).toLowerCase();
const live = (w) => { const { lat: a, lng: b } = w || {}; return a != null && b != null; };
const wpPlaced = (w) => {
  if (!w) return false;
  const { lat: a, lng: b } = w;
  if (a == null || b == null || a === "" || b === "") return false;
  return Number.isFinite(Number(a)) && Number.isFinite(Number(b));
};

const rows = await selectAll("routes", "id,name,waypoints,approach_logistics",
  "waypoints.not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes. Refusing to report a clean result about data this never saw."); process.exit(1); }

let scanned = 0;
const shadowed = [], partial = [], disagree = [];
for (const r of rows) {
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  if (!wps.length) continue;
  scanned++;
  const al = r.approach_logistics || {};

  // The pin branch: what the merged code accepts vs what the shared predicate accepts.
  const pin = wps.find((w) => wpIs(w, "Trailhead") && live(w));
  if (pin && !wpPlaced(pin)) {
    disagree.push({ id: r.id, why: "pin accepted by the merged test, refused by wpPlaced", pin: { lat: pin.lat, lng: pin.lng } });
    if (al.trailheadLat != null && al.trailheadLng != null) {
      shadowed.push({ id: r.id, pin: { lat: pin.lat, lng: pin.lng }, al: { lat: al.trailheadLat, lng: al.trailheadLng } });
    }
  }
  // The name-matched fallback checks lat only.
  const named = wps.find((w) => w && w.lat != null && /trailhead|parking|\bth\b/i.test(String(w.name || w.label || "")));
  if (named && named.lng == null) partial.push({ id: r.id, name: named.name, lat: named.lat });
}

console.log(`${scanned} routes with waypoints scanned.\n`);
console.log(`pin accepted by the merged test but refused by wpPlaced : ${disagree.length}`);
console.log(`...of those, SHADOWING a real approach_logistics coord  : ${shadowed.length}`);
console.log(`name-matched fallback with a lat and NO lng             : ${partial.length}\n`);
for (const x of shadowed.slice(0, 20)) console.log(`  SHADOWED ${x.id}  pin=${JSON.stringify(x.pin)}  logistics=${JSON.stringify(x.al)}`);
for (const x of disagree.slice(0, 20)) console.log(`  disagree ${x.id}  ${x.why}  ${JSON.stringify(x.pin)}`);
for (const x of partial.slice(0, 20)) console.log(`  partial  ${x.id}  "${x.name}"  lat=${x.lat} lng=missing`);

if (!disagree.length && !partial.length) {
  console.log("LATENT, not live: no route in the catalog today reaches either shape.");
  console.log("That is a fact about today's data, not about the predicate — contributed rows store");
  console.log("lat/lng as STRINGS, so the first contributed trailhead can create one.");
}
