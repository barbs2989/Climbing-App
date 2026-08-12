// A track that does not reach its own peak — which peak DOES it reach?
//
// probe-track-reaches-its-peak.mjs says a route's gpx never comes near the summit it is filed
// under. That is a hypothesis. This turns it into a claim with a name on it: search every WA
// peak for the one nearest the stray track's endpoint. If Curtis Ridge's track ends 300 m from
// some other summit, the track is that summit's and the diagnosis is settled; if the nearest
// peak is still kilometres away, the track belongs to nothing we hold and the honest answer is
// "unknown origin, delete it" rather than a reattribution nobody can support.
//
// Both ENDS are searched. A track is usually trailhead -> summit, but a copied one can be
// reversed, and an approach-only track ends at a camp rather than a top.
//
// Read-only. Prints; writes nothing.
// Usage: node scripts/oneoff/probe-whose-track-is-it.mjs <route_id> [route_id...]
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const ids = process.argv.slice(2);
if (!ids.length) { console.error("usage: probe-whose-track-is-it.mjs <route_id>..."); process.exit(1); }

const key = requireServiceKey();
const R = Math.PI / 180;
function hav(aLat, aLng, bLat, bLng) {
  const dLat = (bLat - aLat) * R, dLng = (bLng - aLng) * R;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * R) * Math.cos(bLat * R) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s));
}
const P = p => Array.isArray(p) ? [+p[0], +p[1]] : [+p.lat, +p.lng];

const areas = (await selectAll("areas", "id,name,lat,lng,area_type", "", { pageSize: 800, key }))
  .filter(a => a.lat != null && a.lng != null);
if (!areas.length) { console.error("read 0 areas — refusing to report"); process.exit(1); }
console.log(`peaks/areas with coordinates: ${areas.length}\n`);

function nearest(lat, lng, n = 3) {
  return areas.map(a => ({ a, d: hav(lat, lng, +a.lat, +a.lng) }))
    .sort((x, y) => x.d - y.d).slice(0, n);
}

for (const id of ids) {
  const [r] = await selectAll("routes", "id,name,area_id,gpx", `id=eq.${id}`, { pageSize: 5, key });
  if (!r) { console.log(`### ${id} — NO SUCH ROUTE\n`); continue; }
  const g = (Array.isArray(r.gpx) ? r.gpx : []).map(P).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
  console.log(`### ${r.id}  "${r.name}"  filed under ${r.area_id}  (${g.length} pts)`);
  if (g.length < 2) { console.log("   no usable track\n"); continue; }

  for (const [label, p] of [["track START", g[0]], ["track END", g[g.length - 1]]]) {
    console.log(`  ${label} ${p[0].toFixed(5)},${p[1].toFixed(5)} — nearest areas:`);
    for (const { a, d } of nearest(p[0], p[1])) {
      const own = a.id === r.area_id ? "  <-- its own peak" : "";
      console.log(`      ${String(Math.round(d)).padStart(6)} m  ${a.name} (${a.id}, ${a.area_type})${own}`);
    }
  }
  console.log("");
}
