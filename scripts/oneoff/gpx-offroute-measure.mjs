// Off-route waypoints: each pin's distance to the route's own recorded track (the line the map draws).
// Read-only. Usage: node scripts/oneoff/gpx-offroute-measure.mjs <out.json>
import fs from "fs";
import { selectAll } from "../lib/supabase-env.mjs";
import { assessTrack, haversineM } from "../audit-track-completeness.mjs";
import { recordedTrackPts } from "../../lib/track.js";

const rows = (await selectAll("routes", "id,name,gpx,waypoints,approach_variants", "gpx=not.is.null", { pageSize: 200 }))
  .filter(r => Array.isArray(r.gpx) && r.gpx.length > 1 && recordedTrackPts(r.gpx, r.waypoints));
const out = [];
for (const r of rows) {
  const a = assessTrack(r.gpx, r.waypoints);
  const pts = r.gpx.map(p => [p[0], p[1]]);
  (r.waypoints || []).forEach((w, i) => {
    if (w.lat == null || w.lng == null) return;
    const d = Math.min(...pts.map(q => haversineM(q, [w.lat, w.lng])));
    out.push({ id: r.id, name: r.name, complete: a.complete, problems: a.problems, i, wp: w.name, type: w.type, offM: Math.round(d), variants: Array.isArray(r.approach_variants) ? r.approach_variants.length : 0 });
  });
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
const c = out.filter(o => o.complete);
console.log("drawn tracks", rows.length, "complete", new Set(c.map(o => o.id)).size, "pins on complete", c.length,
  ">300", c.filter(o => o.offM > 300).length, ">500", c.filter(o => o.offM > 500).length, ">1000", c.filter(o => o.offM > 1000).length);
const o = out.filter(o => !o.complete);
console.log("pins on drawn-but-incomplete", o.length, ">500", o.filter(x => x.offM > 500).length);
