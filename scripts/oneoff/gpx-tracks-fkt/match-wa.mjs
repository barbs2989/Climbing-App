// Match the Washington FKT tracks to WA routes by GEOMETRY. Read-only, no database.
//   round   — starts AND ends within 300 m of a Trailhead pin and passes within 300 m of the Summit
//   oneway  — starts within 300 m of a Trailhead pin and passes within 300 m of the Summit
// Geometry only says the track visits the same two points. Whether it is the same ROUTE is decided
// afterwards, by research (owner, 2026-10-29: "make sure the route is the same").
// Usage: node match-wa.mjs <tracks.json>   -> research-data/gpx-tracks-fkt-wa-2026-10-29/candidates.json
import fs from "fs";
import { haversineM } from "./rule.mjs";
const D = process.env.FKT_DIR || "research-data/gpx-tracks-fkt-wa-2026-10-29";   // FKT_DIR: another state set
const targets = JSON.parse(fs.readFileSync(`${D}/targets.json`, "utf8"));
const tracks = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const TOL = 300, PAD = 0.01;
const minTo = (pts, p) => { let m = Infinity, at = -1; pts.forEach((q, i) => { const d = haversineM(q, p); if (d < m) { m = d; at = i; } }); return { m, at }; };
for (const t of tracks) {
  let a = 90, b = -90, c = 180, d = -180;
  for (const p of t.pts) { if (p[0] < a) a = p[0]; if (p[0] > b) b = p[0]; if (p[1] < c) c = p[1]; if (p[1] > d) d = p[1]; }
  t.box = [a, b, c, d];
}
const out = [];
for (const r of targets) {
  const th = r.waypoints.filter(w => /trailhead/i.test(w.type || "")).map(w => [w.lat, w.lng]);
  const sm = r.waypoints.filter(w => /summit/i.test(w.type || "")).map(w => [w.lat, w.lng]);
  const inBox = t => [...th, ...sm].every(p => p[0] >= t.box[0] - PAD && p[0] <= t.box[1] + PAD && p[1] >= t.box[2] - PAD && p[1] <= t.box[3] + PAD);
  for (const t of tracks.filter(inBox)) {
    const startM = Math.min(...th.map(p => haversineM(t.pts[0], p)));
    const endM = Math.min(...th.map(p => haversineM(t.pts.at(-1), p)));
    const s = sm.map(p => minTo(t.pts, p)).reduce((x, y) => x.m <= y.m ? x : y);
    if (startM > TOL || s.m > TOL) continue;
    // a track whose summit visit is its LAST point and that ends at the trailhead is not possible;
    // one that ends far from the trailhead is one-way
    if (endM > TOL) continue;   // owner: only the full trailhead -> summit -> trailhead route, never one-way
    out.push({ id: r.id, name: r.name, discipline: r.discipline, slug: t.slug, fktTitle: t.title, tier: endM <= TOL ? "round" : "oneway",
      startM: Math.round(startM), endM: Math.round(endM), summitM: Math.round(s.m), points: t.pts.length });
  }
}
fs.writeFileSync(`${D}/candidates.json`, JSON.stringify(out, null, 1));
const ids = new Set(out.map(o => o.id));
console.log(`targets ${targets.length}; tracks ${tracks.length}; pairs ${out.length} (round ${out.filter(o => o.tier === "round").length}, oneway ${out.filter(o => o.tier === "oneway").length}); routes ${ids.size}`);
