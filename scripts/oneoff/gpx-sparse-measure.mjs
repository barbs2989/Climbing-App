// Drawn tracks by point count and median vertex spacing: is a "recorded track" dense enough to be one?
// Read-only. Usage: node scripts/oneoff/gpx-sparse-measure.mjs [out.json]
import fs from "fs";
import { selectAll } from "../lib/supabase-env.mjs";
import { haversineM } from "../audit-track-completeness.mjs";
import { recordedTrackPts } from "../../lib/track.js";

const rows = (await selectAll("routes", "id,name,gpx,waypoints", "gpx=not.is.null", { pageSize: 200 }))
  .filter(r => Array.isArray(r.gpx) && r.gpx.length > 1 && recordedTrackPts(r.gpx, r.waypoints));
const res = rows.map(r => {
  const g = r.gpx.map(p => [p[0], p[1]]);
  const seg = g.slice(1).map((p, i) => haversineM(g[i], p)).sort((a, b) => a - b);
  return { id: r.id, n: g.length, medSpacingM: Math.round(seg[Math.floor(seg.length / 2)]), lenKm: +(seg.reduce((s, x) => s + x, 0) / 1000).toFixed(1) };
}).sort((a, b) => a.n - b.n);
const bins = [[2, 9], [10, 19], [20, 49], [50, 99], [100, 1e9]];
for (const [lo, hi] of bins) { const b = res.filter(r => r.n >= lo && r.n <= hi); console.log(`${lo}-${hi} pts: ${b.length}  median spacing ${b.length ? b.map(r => r.medSpacingM).sort((x, y) => x - y)[Math.floor(b.length / 2)] : "-"} m`); }
console.log("first 40 by point count:", res.slice(0, 40).map(r => `${r.n}pt/${r.medSpacingM}m`).join(" "));
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(res, null, 1));
