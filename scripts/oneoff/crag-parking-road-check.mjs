#!/usr/bin/env node
// Stage-3 helper for the crag PARKING research (0255): which mapped lot sits on the road the text names?
// A brief offers every lot near a crag; when a page says "end of 24th St, left on Valley View" the researcher must
// pick the lot ON that road. Research batch 3 picked by guess three times and was wrong each time (Dogtown 1.2 km,
// Mormon Trail 0.7 km, Pima Canyon 1 km off the road) — this prints every mapped segment of the named road, its end
// points, and each candidate lot's distance to it, so the pick rests on the road geometry instead.
// Usage: node scripts/oneoff/crag-parking-road-check.mjs "<south,west,north,east>" "<road name regex>" A:<lat>,<lng> [B:<lat>,<lng> ...]
const [bb, re, ...lots] = process.argv.slice(2);
if (!bb || !re || !lots.length) { console.error('usage: crag-parking-road-check.mjs "<s,w,n,e>" "<name regex>" A:<lat>,<lng> ...'); process.exit(2); }
const q = `[out:json][timeout:60];way[highway][name~"${re}",i](${bb});out geom tags;`;
const MIRRORS = ["https://overpass.private.coffee/api/interpreter", "https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
let els = null;
for (let k = 0; k < 6 && !els; k++) {
  try { const r = await fetch(MIRRORS[k % 3], { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "User-Agent": "ClimbMatch-parking-brief/1.0", "Content-Type": "application/x-www-form-urlencoded" } }); /* no UA = 406 */
    if (r.ok) els = (await r.json()).elements; } catch {}
  if (!els) await new Promise((z) => setTimeout(z, 4000 * (k + 1)));
}
if (!els) { console.log("Overpass unreachable"); process.exit(1); }
const km = (a, b, c, e) => { const x = (c - a) * Math.PI / 180, y = (e - b) * Math.PI / 180; const h = Math.sin(x / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)); };
const L = lots.map((s) => { const [id, ll] = s.split(":"); const [lat, lng] = ll.split(",").map(Number); return { id, lat, lng }; });
if (!els.length) console.log("no road of that name in the box");
for (const w of els) {
  const g = w.geometry, a = g[0], z = g[g.length - 1];
  const near = L.map((l) => `${l.id} ${Math.min(...g.map((p) => km(l.lat, l.lng, p.lat, p.lon))).toFixed(2)}km`).join(", ");
  console.log(`${w.tags.name} [${w.tags.highway}${w.tags.access ? " access=" + w.tags.access : ""}] ${a.lat.toFixed(4)},${a.lon.toFixed(4)} -> ${z.lat.toFixed(4)},${z.lon.toFixed(4)} | nearest: ${near}`);
}
