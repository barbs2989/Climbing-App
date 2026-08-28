// Which way does Mount Cameron's standard route actually run?
//
// audit:aspect-vs-name reports wa_mount_cameron_standard with THREE fields naming three directions
// and no two agreeing:
//     name    "Standard Route (Southeast Slopes)"   -> SE
//     aspect  "N"
//     face    "West ridge / false-summit traverse from Cameron Pass toward the Main, Middle, and
//              East/Southwest summits"              -> W
//
// The audit's geometry step refuses to speak here, and it is right to: its rule is that a pin more
// than 1 km out describes an APPROACH direction rather than a face, and Cameron's closest pin is
// 1.8 km away. That rule guards the question "which way does the FACE point".
//
// THIS IS A NARROWER QUESTION THAT THE SAME PINS CAN ANSWER. The row does not describe a face at
// all — every other field says the route is a RIDGE TRAVERSE from Cameron Pass to the summits. A
// ridge is a linear feature, so the bearing from the summit to the pass IS the direction of the
// ridge you walk, at any distance. That is not the audit's question and does not weaken its rule.
//
// Report-only. It decides nothing on its own: the output is one bearing, to be read against the
// row's own prose.
import { selectAll } from "../lib/supabase-env.mjs";

const ID = "wa_mount_cameron_standard";
const rows = await selectAll("routes", "id,name,aspect,face,area_id,waypoints", `id=eq.${ID}`);
if (rows.length !== 1) { console.error(`read ${rows.length} of 1 — refusing`); process.exit(1); }
const r = rows[0];

const areas = await selectAll("areas", "id,name,lat,lng,elevation_ft", `id=eq.${r.area_id}`);
if (!areas.length || areas[0].lat == null) { console.error("the peak has no coordinate — cannot judge"); process.exit(1); }
const peak = areas[0];

const wps = (Array.isArray(r.waypoints) ? r.waypoints : [])
  .map(w => w && { name: w.name, lat: Number(w.lat), lng: Number(w.lng), elev: w.elev })
  .filter(w => w && Number.isFinite(w.lat) && Number.isFinite(w.lng));
if (!wps.length) { console.error("no placed waypoints — cannot judge"); process.exit(1); }

const R = 6371;
const rad = d => d * Math.PI / 180;
const dist = (a, b) => {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};
const bearing = (a, b) => {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const card = deg => COMPASS[Math.round(deg / 22.5) % 16];

console.log(`${ID}\n  peak: ${peak.name}  ${peak.lat},${peak.lng}${peak.elevation_ft ? `  ${peak.elevation_ft} ft` : ""}`);
console.log(`  name   -> SE      "${r.name}"`);
console.log(`  aspect -> ${r.aspect}`);
console.log(`  face   -> W       "${String(r.face).slice(0, 90)}…"\n`);

console.log("Bearing FROM the peak TO each placed waypoint:\n");
for (const w of wps) {
  const d = dist(peak, w), b = bearing(peak, w);
  console.log(`   ${card(b).padEnd(3)} ${String(Math.round(b)).padStart(3)}°  ${d.toFixed(2)} km  ${w.name}${w.elev != null ? `  (${w.elev} ft)` : ""}`);
}

const pass = wps.find(w => /cameron pass/i.test(w.name));
console.log("");
if (!pass) {
  console.log(`No waypoint names Cameron Pass, so the ridge direction cannot be read from this row.
That is a refusal, not a clean result — the three fields still disagree.`);
  process.exit(0);
}
const b = bearing(peak, pass), d = dist(peak, pass);
console.log(`THE RIDGE: Cameron Pass lies ${card(b)} (${Math.round(b)}°) of the summit, ${d.toFixed(2)} km away.

The route walks the ridge FROM the pass TO the summit, so the ridge runs ${card(b)}-to-summit. Read
that against the three fields above: whichever of them describes THAT ridge is the one the row's own
geometry supports.

WHAT THIS DOES NOT SETTLE. It says which ridge is walked, not which way any face points, and the
aspect column is about the face. A ridge has two sides — this repo's own precision rule for this very
audit — so a ridge bearing cannot by itself convict an aspect. If the name and the face disagree with
each other, that is decidable here; if the ASPECT is the odd one out, it is not.`);
