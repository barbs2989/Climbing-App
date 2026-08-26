#!/usr/bin/env node
// Does routing every trailheadPoint() branch through wpPlaced() change what any route resolves to?
//
// The reference is a VERBATIM copy of the pre-change expression — correct here, because the
// original is gone and a copy is the only second opinion available. The function UNDER TEST is
// EXTRACTED FROM SOURCE with ANCHOR LOST, because a copy of that would agree with itself whatever
// the app did. Same split #1215's own equivalence probe used.
import { readFileSync } from "node:fs";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = new URL("../..", import.meta.url).pathname;
const core = readFileSync(ROOT + "ClimbMatchCore.jsx", "utf8");

const lift = (name, head) => {
  const i = core.indexOf(head);
  if (i < 0) { console.error(`ANCHOR LOST — \`${head}\` is gone; nothing below was checked.`); process.exit(1); }
  let d = 0, j = core.indexOf("{", i);
  const start = j;
  for (; j < core.length; j++) { if (core[j] === "{") d++; else if (core[j] === "}") { d--; if (!d) break; } }
  return core.slice(i, j + 1);
};

const src = [lift("wpPlaced", "export function wpPlaced("), lift("trailheadPoint", "function trailheadPoint(route){")]
  .join("\n").replace(/^export /gm, "");
const mk = new Function(`${src}\nconst wpIs=(w,t)=>w&&String(w.type||"").toLowerCase()===String(t).toLowerCase();\nreturn trailheadPoint;`);
const now = mk();

// The pre-change function, verbatim from d50b88a.
const wpIs = (w, t) => w && String(w.type || "").toLowerCase() === String(t).toLowerCase();
function before(route) {
  if (!route) return null;
  const wps = route.waypoints || [], al = route.approachLogistics || {};
  const pin = wps.find(w => wpIs(w, "Trailhead") && w.lat != null && w.lng != null);
  if (pin) return { lat: pin.lat, lng: pin.lng, name: pin.name || pin.label || "Trailhead", derived: false };
  if (al.trailheadLat != null && al.trailheadLng != null) return { lat: al.trailheadLat, lng: al.trailheadLng, name: al.trailhead || "Trailhead", derived: true };
  const named = wps.find(w => w && w.lat != null && /trailhead|parking|\bth\b/i.test(String(w.name || w.label || "")));
  return named ? { lat: named.lat, lng: named.lng, name: named.name || named.label || "Trailhead", derived: false } : null;
}

const rows = await selectAll("routes", "id,waypoints,approach_logistics", "waypoints.not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes. Refusing to report a clean result about data this never saw."); process.exit(1); }

let compared = 0, differ = 0, resolved = 0;
for (const r of rows) {
  // dbRouteToCamel's spelling: the app sees approachLogistics, not approach_logistics.
  const route = { waypoints: r.waypoints, approachLogistics: r.approach_logistics };
  if (!Array.isArray(route.waypoints) || !route.waypoints.length) continue;
  compared++;
  const a = before(route), b = now(route);
  if (a) resolved++;
  const same = JSON.stringify(a) === JSON.stringify(b);
  if (!same) { differ++; if (differ <= 20) console.log(`DIFFERS ${r.id}\n   before ${JSON.stringify(a)}\n   after  ${JSON.stringify(b)}`); }
}
console.log(`\n${compared} routes compared; ${resolved} resolve to a trailhead at all.`);
console.log(`${differ} differ.`);

// Synthetic cases: the whole reason for the change is data the catalog does not hold YET.
console.log(`\nthe shapes the catalog does not hold today:\n`);
const cases = [
  ["empty-string pin, real logistics coord behind it",
   { waypoints: [{ type: "Trailhead", name: "TH", lat: "", lng: "" }], approachLogistics: { trailheadLat: 47.5, trailheadLng: -121.4, trailhead: "Real TH" } }],
  ["name-matched pin with a lat and no lng",
   { waypoints: [{ type: "Junction", name: "Parking area", lat: 47.5 }], approachLogistics: {} }],
  ["logistics coordinate stored as an empty string",
   { waypoints: [], approachLogistics: { trailheadLat: "", trailheadLng: "", trailhead: "TH" } }],
  ["a genuinely placed pin — must be unchanged",
   { waypoints: [{ type: "Trailhead", name: "TH", lat: 47.5, lng: -121.4 }], approachLogistics: {} }],
];
for (const [label, route] of cases) {
  console.log(`  ${label}`);
  console.log(`     before ${JSON.stringify(before(route))}`);
  console.log(`     after  ${JSON.stringify(now(route))}\n`);
}
process.exitCode = differ ? 1 : 0;
