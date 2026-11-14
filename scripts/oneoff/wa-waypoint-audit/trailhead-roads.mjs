// A trailhead is where a car parks, so a Trailhead pin with NO road within 150 m (OpenStreetMap,
// any highway=* way, or a parking amenity) is a candidate for a misplaced pin. OSM is only the
// screen here; nothing is written from it. Read-only.
//   node scripts/oneoff/wa-waypoint-audit/trailhead-roads.mjs SNAPSHOT.json OUT.json
import fs from "fs";
const [, , SNAP, OUT] = process.argv;
const rows = JSON.parse(fs.readFileSync(SNAP, "utf8")).filter(r => ["alpine", "mountaineering", "scrambling"].includes(r.discipline));
const pts = new Map();
for (const r of rows) for (const [i, w] of (r.waypoints || []).entries()) {
  if (!/trailhead/i.test(w.type || "") || w.lat == null || w.lng == null) continue;
  const k = `${(+w.lat).toFixed(5)},${(+w.lng).toFixed(5)}`;
  if (!pts.has(k)) pts.set(k, { lat: +w.lat, lng: +w.lng, pins: [] });
  pts.get(k).pins.push({ id: r.id, i, name: w.name, elev: w.elev ?? null });
}
const RADIUS = 150;
const START = +((process.argv.find(a => a.startsWith("--start=")) || "=0").split("=")[1]);
const list = [...pts.values()].slice(START);
const OVERPASS = "https://overpass-api.de/api/interpreter";
async function batch(group) {
  // One query per batch: for each point, count roads/tracks/paths-for-cars and parking nearby.
  const q = `[out:json][timeout:120];(${group.map((p, n) => `way(around:${RADIUS},${p.lat},${p.lng})[highway~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|track|road|living_street)"];node(around:${RADIUS},${p.lat},${p.lng})[amenity=parking];way(around:${RADIUS},${p.lat},${p.lng})[amenity=parking];`).join("")});out center tags;`;
  for (let t = 0; t < 4; t++) {
    try {
      const r = await fetch(OVERPASS, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "ClimbMatch-waypoint-audit/1.0", "Accept": "application/json" }, signal: AbortSignal.timeout(180000) });
      if (r.ok) return (await r.json()).elements;
      console.error("overpass", r.status);
    } catch (e) { console.error("overpass", e.message); }
    await new Promise(s => setTimeout(s, 15000 * (t + 1)));
  }
  return null;
}
const R = 6371000, rad = Math.PI / 180;
const m = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));
// A batched "around" union cannot say WHICH point a way matched, so each element is assigned to
// the points it is near by its geometry: centre for ways, position for nodes. A long way's centre
// can sit far from the point it passes, so a point with no hit is re-asked ALONE before it is
// reported. That keeps the false-alarm direction cheap and the false-pass direction impossible.
const res = [];
for (let s = 0; s < list.length; s += 20) {
  const group = list.slice(s, s + 20);
  const els = await batch(group);
  if (!els) { console.log("Overpass unavailable; stopping at", s); break; }
  for (const p of group) {
    let hit = els.some(e => { const c = e.center || (e.lat != null ? { lat: e.lat, lon: e.lon } : null); return c && m(p, { lat: c.lat, lng: c.lon }) <= RADIUS; });
    if (!hit) { const one = await batch([p]); hit = one == null ? null : one.length > 0; await new Promise(z => setTimeout(z, 2000)); }
    res.push({ ...p, nearRoad: hit });
  }
  console.log(`${Math.min(s + 20, list.length)}/${list.length}`);
  await new Promise(z => setTimeout(z, 5000));
}
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
const far = res.filter(r => r.nearRoad === false);
console.log(res.length, "trailhead coordinates screened;", far.length, `with no road or parking within ${RADIUS} m;`, res.filter(r => r.nearRoad == null).length, "unanswered");
for (const f of far) console.log(f.lat, f.lng, "|", f.pins.map(p => `${p.id}#${p.i} ${p.name}`).join(" ; "));
