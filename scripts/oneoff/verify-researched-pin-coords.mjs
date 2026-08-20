// A researched coordinate is only a repair if it AGREES WITH AN INDEPENDENT RECORD.
//
// Looking up "Cutthroat Pass" and typing the answer in would replace one unverified
// coordinate with another. The bar used everywhere else in this work is higher and costs
// nothing extra: substitute the researched value and ask whether the pin now lands on the
// route's own recorded track. A published coordinate agreeing with a gpx line nobody
// consulted while publishing it is not something a wrong answer does by luck.
//
// A researched coordinate that does NOT land on the track is reported and NOT written. That
// case is real and it is not a failure of the research — it usually means the pin names a
// feature on a DIFFERENT approach to the same peak (the Chikamin/Colchuck pattern), and the
// honest repair there is to leave it alone.
//
// Read-only. --apply lives in the sibling fix script, not here.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

/* Each entry: the route, the pin's exact stored name, the researched coordinate, and where
   it came from. The source is recorded because a coordinate with no provenance is exactly
   what this whole exercise exists to remove. */
export const RESEARCHED = [
  { id: "wa_tower_mountain_southwest_route", wp: "Cutthroat Pass", lat: 48.5545805, lng: -120.7001052, src: "USGS GNIS via topozone (gap: Cutthroat Pass, Skagit County)" },
  { id: "wa_argonaut_peak_east_ridge", wp: "Long's Pass", lat: 47.4492844, lng: -120.9250885, src: "USGS GNIS via topozone (gap: Longs Pass, Chelan County)" },
];

const k = anonKey();
const R = 6371000, toR = (d) => (d * Math.PI) / 180;
function hvM(a, b) {
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const pt = (p) => Array.isArray(p) ? { lat: Number(p[0]), lng: Number(p[1]) } : null;
const nearest = (p, track) => { let b = Infinity; for (const q of track) { const d = hvM(p, q); if (d < b) b = d; } return b; };
const TOL = { Trailhead: 120, Summit: 120, Junction: 120, Topout: 120, Water: 400, Campsite: 500, Hazard: 600 };
const tolOf = (t) => TOL[t] ?? 250;

const ids = [...new Set(RESEARCHED.map((r) => r.id))];
const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints,gpx&id=in.(${ids.join(",")})`, { headers: headers(k) })).json();

export const verdicts = [];
for (const r of RESEARCHED) {
  const row = rows.find((x) => x.id === r.id);
  if (!row) { console.log(`### ${r.id}: route not found`); continue; }
  const track = (Array.isArray(row.gpx) ? row.gpx : []).map(pt).filter(Boolean);
  const w = (row.waypoints || []).find((x) => x && x.name === r.wp);
  if (!w) { console.log(`### ${r.id}: no waypoint named "${r.wp}" — refusing`); continue; }
  const tol = tolOf(String(w.type));
  const before = nearest({ lat: Number(w.lat), lng: Number(w.lng) }, track);
  const after = nearest({ lat: r.lat, lng: r.lng }, track);
  const moved = hvM({ lat: Number(w.lat), lng: Number(w.lng) }, { lat: r.lat, lng: r.lng });
  const proven = after <= tol && after * 5 < before;
  verdicts.push({ ...r, type: w.type, tol, before: Math.round(before), after: Math.round(after), moved: Math.round(moved), proven });
  console.log(`### ${r.id} — [${w.type}] "${r.wp}"`);
  console.log(`     stored ${w.lat},${w.lng}  ->  researched ${r.lat},${r.lng}   (moves the pin ${Math.round(moved)} m)`);
  console.log(`     distance to this route's own track: ${Math.round(before)} m  ->  ${Math.round(after)} m   (tolerance ${tol} m)`);
  console.log(`     ${proven ? "PROVEN — the researched coordinate lands on the track; safe to write" : "NOT PROVEN — do not write. The pin likely names a feature on a different approach."}`);
  console.log(`     source: ${r.src}\n`);
}
console.log(`${verdicts.filter((v) => v.proven).length} of ${verdicts.length} researched coordinate(s) proven against the route's own track.`);
