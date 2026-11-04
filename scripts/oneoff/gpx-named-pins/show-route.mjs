// Print a route's pins, its stored track's shape and its approach prose (read-only), to judge
// whether the recording fits the route the page describes.  node show-route.mjs <id> [...]
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
const R = 6371, rad = Math.PI / 180;
const km = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(Math.sin((b[0] - a[0]) * rad / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin((b[1] - a[1]) * rad / 2) ** 2)));
for (const id of process.argv.slice(2)) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=id,name,description,approach,approach_logistics,descent_text,waypoints,gpx`, { headers: headers(anonKey()) });
  const [row] = await r.json();
  console.log("\n=====", id, row.name);
  for (const k of ["approach", "approach_logistics", "descent_text"]) console.log(`-- ${k}:`, String(row[k] ?? "").slice(0, 900));
  for (const [i, w] of (row.waypoints || []).entries()) console.log("  pin", i, w.type, w.name, w.lat, w.lng, w.elev ?? "");
  const g = (row.gpx || []).map(p => Array.isArray(p) ? p : [p.lat, p.lng]);
  console.log("  track pts", g.length);
  const step = Math.max(1, Math.floor(g.length / 12));
  for (let i = 0; i < g.length; i += step) console.log("   ", i, g[i][0].toFixed(5), g[i][1].toFixed(5));
  if (g.length) console.log("    last", g[g.length - 1][0].toFixed(5), g[g.length - 1][1].toFixed(5));
  const s = (row.waypoints || []).find(w => w.type === "Summit");
  if (s && g.length) console.log("  nearest track vertex to summit pin, m:", Math.round(Math.min(...g.map(p => km(p, [s.lat, s.lng]))) * 1000));
}
