// Print one route's waypoints, its gpx endpoints, and its area's own coordinate, so a human
// can see which of the three disagrees. The audit says a pin is off its line; this says what
// the line actually IS.
//
// Read-only. Usage: node scripts/oneoff/inspect-route-geometry.mjs <route_id> [route_id...]
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const ids = process.argv.slice(2);
if (!ids.length) { console.error("usage: inspect-route-geometry.mjs <route_id>..."); process.exit(1); }

const key = requireServiceKey();
const R = Math.PI / 180;
function hav(a, b) {
  const dLat = (b[0] - a[0]) * R, dLng = (b[1] - a[1]) * R;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * R) * Math.cos(b[0] * R) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s));
}
const pt = g => Array.isArray(g) ? [+g[0], +g[1]] : [+g.lat, +g.lng];

for (const id of ids) {
  const [r] = await selectAll("routes", "id,name,area_id,gpx,waypoints,approach,descent_text",
    `id=eq.${id}`, { pageSize: 5, key });
  if (!r) { console.log(`\n### ${id} — NO SUCH ROUTE`); continue; }
  // `areas` keys on `id`, NOT `area_id` — the column routes.area_id points AT. Asking for
  // areas.area_id is a 42703, and it is the same mistake check:sql's areas mode shipped with.
  // selectAll keysets on `id`, so `id` must be in the select list too.
  const [a] = await selectAll("areas", "id,name,lat,lng,area_type", `id=eq.${r.area_id}`,
    { pageSize: 5, key });

  console.log(`\n### ${r.id}  "${r.name}"`);
  console.log(`area: ${r.area_id}  "${a ? a.name : "?"}"  ${a ? `${a.lat},${a.lng}` : "no coords"}`);

  const g = Array.isArray(r.gpx) ? r.gpx : [];
  console.log(`gpx: ${g.length} pts`);
  if (g.length) {
    const first = pt(g[0]), last = pt(g[g.length - 1]);
    console.log(`   start ${first[0].toFixed(5)},${first[1].toFixed(5)}   end ${last[0].toFixed(5)},${last[1].toFixed(5)}`);
    console.log(`   start->end straight line ${Math.round(hav(first, last))} m`);
    if (a && a.lat != null) {
      console.log(`   area is ${Math.round(hav([+a.lat, +a.lng], first))} m from track START, ` +
                  `${Math.round(hav([+a.lat, +a.lng], last))} m from track END`);
    }
  }

  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  console.log(`waypoints: ${wps.length}`);
  wps.forEach((w, i) => {
    const has = Number.isFinite(+w.lat) && Number.isFinite(+w.lng);
    let d = "";
    if (has && a && a.lat != null) d = `  ${Math.round(hav([+w.lat, +w.lng], [+a.lat, +a.lng]))} m from area`;
    console.log(`  [${i}] ${w.type || "?"} — ${w.name || "(unnamed)"}  ` +
                (has ? `${(+w.lat).toFixed(5)},${(+w.lng).toFixed(5)}` : "NO COORDINATE") + d);
  });
}
