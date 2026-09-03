// IS THE PTARMIGAN TRAVERSE'S TRACK A RECORDING, OR ITS OWN WAYPOINTS JOINED UP?
//
// The Cache Col repair moved a pin from 0 m off this route's track to 1,133 m off it. That is
// either evidence the repair is WRONG — a real GPS recording is a stronger record of where a party
// actually crossed than any gazetteer — or it is nothing at all, because 201 of 580 WA routes store
// a polyline whose every vertex IS one of that route's own waypoints. In the second case the pin was
// at 0 m BY CONSTRUCTION: the line was drawn through the wrong pin, so it corroborates nothing.
//
// Decide it by asking how many of the track's vertices are waypoints, and how many are not.
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const ID = process.argv[2] || "wa_ptarmigan_traverse";
const T = Math.PI / 180;
const metres = (a, b) => 2 * 6371000 * Math.asin(Math.sqrt(
  Math.sin((b.lat - a.lat) * T / 2) ** 2 +
  Math.cos(a.lat * T) * Math.cos(b.lat * T) * Math.sin((b.lng - a.lng) * T / 2) ** 2));

const H = headers(requireServiceKey());
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints,gpx&id=eq.${ID}`, { headers: H });
const [row] = await r.json();
if (!row) { console.log("no row"); process.exit(1); }

const wps = (row.waypoints || []).map((w) => ({ name: w.name, lat: Number(w.lat), lng: Number(w.lng) }))
  .filter((w) => Number.isFinite(w.lat) && Number.isFinite(w.lng));
const raw = row.gpx || [];
const pts = raw.map((p) => ({ lat: Number(p.lat ?? p[0]), lng: Number(p.lng ?? p[1]) }))
  .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

console.log(`${row.id} — ${row.name}`);
console.log(`  ${wps.length} placed waypoints, ${pts.length} track points`);
if (!pts.length) { console.log("  no track"); process.exit(0); }

// how many vertices sit on a waypoint (1 m), and how many waypoints are hit?
let onWp = 0; const hit = new Set();
for (const p of pts) {
  let best = Infinity, bi = -1;
  wps.forEach((w, i) => { const d = metres(p, w); if (d < best) { best = d; bi = i; } });
  if (best <= 1) { onWp++; hit.add(bi); }
}
console.log(`  vertices sitting ON a waypoint (<=1 m): ${onWp}/${pts.length}`);
console.log(`  distinct waypoints the track passes exactly through: ${hit.size}/${wps.length}`);
for (const i of [...hit].sort((a, b) => a - b)) console.log(`     ${wps[i].name}`);

// vertex spacing separates a recording (dense, regular) from a sketched polyline
const gaps = [];
for (let i = 1; i < pts.length; i++) gaps.push(metres(pts[i - 1], pts[i]));
gaps.sort((a, b) => a - b);
const q = (f) => Math.round(gaps[Math.floor((gaps.length - 1) * f)]);
console.log(`  vertex spacing: p10 ${q(0.1)} m, p50 ${q(0.5)} m, p90 ${q(0.9)} m, max ${Math.round(gaps[gaps.length - 1])} m`);

const frac = onWp / pts.length;
console.log(`\n  -> ${frac >= 0.5
  ? "MOSTLY ITS OWN WAYPOINTS. The line was drawn THROUGH the pins, so 'on track' is by construction."
  : frac > 0 ? "a real line that also passes through some of its pins — read the spacing."
  : "no vertex is on a waypoint: an independent line."}`);
